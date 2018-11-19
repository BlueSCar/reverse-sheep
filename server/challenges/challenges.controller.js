module.exports = (db) => {
    let getCurrentResponses = async (userId) => {
        return await db.any(`
            WITH user_responses AS (
                SELECT r.id AS round_id, c.id as challenge_id, cr.id as response_id, cr.text as response_text, ucr.id as user_challenge_response_id
                FROM "user" u
                    INNER JOIN user_challenge_response ucr ON u.id = ucr.user_id
                    INNER JOIN challenge_response cr ON ucr.challenge_response_id = cr.id
                    INNER JOIN challenge c ON cr.challenge_id = c.id
                    INNER JOIN round r ON c.round_id = r.id
                WHERE u.id = $1
            )
            SELECT r.id as round_id, r.week as week, c.id as challenge_id, c.text as challenge_text, ur.response_id as user_response_id, ur.response_text as user_response_text, ur.user_challenge_response_id as user_challenge_response_id
            FROM round r
                INNER JOIN challenge c ON r.id = c.round_id
                LEFT JOIN user_responses ur ON r.id = ur.round_id AND c.id = ur.challenge_id
            WHERE r.week = (SELECT MIN(week) FROM round WHERE deadline > (now() at time zone 'utc'))
	    ORDER BY c.id
    `, [userId]);
    };

    return {
        getChallengeWeeks: async (req, res) => {
            if (req.isAuthenticated()) {
                let where = '';
                if (req.query && req.query.username && req.query.username.toLowerCase() != 'me') {
                    where = `WHERE deadline < (now() at time zone 'utc')`;
                }

                let weeks = await db.any(`
                    SELECT DISTINCT week
                    FROM round
                    ${where}
                    ORDER BY week DESC
                `).catch(err => {
                    console.error(err);
                    res.sendStatus(500);
                });

                res.send(weeks);
            } else {
                res.sendStatus(403);
            }
        },
        getScoreboard: async (req, res) => {
            if (req.isAuthenticated()) {
                let scoreboard = [];

                if (req.query.week) {
                    scoreboard = await db.any(`
                        with user_selections as (
                            select u.id as user_id, c.id as challenge_id, cr.points as points
                            from "user" u
                                inner join user_challenge_response ucr on u.id = ucr.user_id
                                inner join challenge_response cr on ucr.challenge_response_id = cr.id
                                inner join challenge c on cr.challenge_id = c.id and c.round_id = $1
                        ), challenges as (
                            select c.id, (
                                max(cr.points) + count(cr.id)
                            ) as points
                            from challenge c
                                inner join challenge_response cr on c.id = cr.challenge_id
                            where cr.correct = true and c.round_id = $1
                            group by c.id
                        )
                        select u.username, SUM(COALESCE(us.points, c.points)) as points
                        from challenges c
                            inner join "user" u on 1=1
                            left join user_selections us on us.user_id = u.id and us.challenge_id = c.id
                        group by u.username
                        order by points, u.username                          
        `, [req.query.week]);


                    for (let score of scoreboard) {
                        score.rank = scoreboard.filter(s => s.points * 1.0 < score.points * 1.0).length + 1;
                    }

                    res.send({
                        username: req.user.username,
                        scoreboard
                    });
                } else {
                    scoreboard = await db.any(`
                        with user_selections as (
                            select u.id as user_id, c.id as challenge_id, cr.points as points
                            from "user" u
                                inner join user_challenge_response ucr on u.id = ucr.user_id
                                inner join challenge_response cr on ucr.challenge_response_id = cr.id
                                inner join challenge c on cr.challenge_id = c.id
                        ), challenges as (
                            select c.id, (
                                max(cr.points) + count(cr.id)
                            ) as points
                            from challenge c
                                inner join challenge_response cr on c.id = cr.challenge_id
                            where cr.correct = true
                            group by c.id
                        )
                        select u.username, SUM(COALESCE(us.points, c.points)) as points
                        from challenges c
                            inner join "user" u on 1=1
                            left join user_selections us on us.user_id = u.id and us.challenge_id = c.id
                        group by u.username
                        order by points, u.username                                
        `);

                    for (let score of scoreboard) {
                        score.rank = scoreboard.filter(s => s.points * 1.0 < score.points * 1.0).length + 1;
                    }

                    res.send({
                        username: req.user.username,
                        scoreboard
                    });
                }
            } else {
                res.sendStatus(403);
            }
        },
        getCurrentChallenges: async (req, res) => {
            if (req.isAuthenticated()) {
                let challenges = await getCurrentResponses(req.user.id);

                let challengeResponses = await db.any(`
                    SELECT c.id as challenge_id, cr.id as response_id, cr.text as response_text
                    FROM round r
                        INNER JOIN challenge c ON r.id = c.round_id
                        INNER JOIN challenge_response cr ON c.id = cr.challenge_id and (cr.locked is null or cr.locked > (now() at time zone 'utc'))
                    WHERE r.week = (SELECT MAX(week) FROM round WHERE deadline > (now() at time zone 'utc'))
                    ORDER BY c.id, cr.id
                `);

                if (challenges.length) {
                    res.send({
                        user: {
                            id: req.user.id,
                            username: req.user.username
                        },
                        roundId: challenges[0].round_id,
                        week: challenges[0].week,
                        challenges: challenges.map(c => {
                            return {
                                id: c.challenge_id,
                                text: c.challenge_text,
                                userResponse: {
                                    id: c.user_response_id,
                                    text: c.user_response_text
                                },
                                responses: challengeResponses
                                    .filter(cr => cr.challenge_id == c.challenge_id)
                                    .map(cr => {
                                        return {
                                            id: cr.response_id,
                                            text: cr.response_text
                                        }
                                    })
                            }
                        })
                    });
                } else {
                    res.send({
                        user: {
                            id: req.user.id,
                            username: req.user.username
                        }
                    });
                }
            } else {
                res.sendStatus(401);
            }
        },
        submitUserResponses: async (req, res) => {
            if (req.isAuthenticated()) {
                let currentResponses = await getCurrentResponses(req.user.id);
                let submittedResponses = currentResponses.filter(r => {
                    return req.body.responses.find(ur => ur.id == r.challenge_id && ur.responseId != null) != null;
                });

                if (submittedResponses.length) {
                    await db.tx(async t => {
                        await t.batch([
                            ...submittedResponses.map(sr => {
                                let submitted = req.body.responses.find(ur => ur.id == sr.challenge_id && ur.responseId != null);

                                if (sr.user_challenge_response_id == null) {
                                    return t.none(`
                                                INSERT INTO user_challenge_response (user_id, challenge_response_id)
                                                VALUES ($1, $2)
                                            `, [req.user.id, submitted.responseId]);
                                } else {
                                    return t.none(`
                                                UPDATE user_challenge_response
                                                SET challenge_response_id = $1
                                                WHERE id = $2
                                            `, [submitted.responseId, sr.user_challenge_response_id]);
                                }
                            })
                        ]);

                        return Promise.resolve();
                    }).catch(err => {
                        console.error(err);
                        res.sendStatus(500);
                    });
                }

                res.sendStatus(200);
            } else {
                res.sendStatus(401);
            }
        },
        getUserResponses: async (req, res) => {
            if (req.isAuthenticated()) {
                let params = [req.query.week];
                let where = `WHERE c.week = $1 AND LOWER(u.username) = LOWER($2)`

                if (req.query.username.toLowerCase() != 'me') {
                    params.push(req.query.username);
                    where += ` AND c.deadline < (now() at time zone 'utc')`;
                } else {
                    params.push(req.user.username);
                }

                let responses = await db.any(`
                    with user_selections as (
                        select u.id as user_id, c.id as challenge_id, cr.id as response_id, cr.text, cr.points as points
                        from "user" u
                            inner join user_challenge_response ucr on u.id = ucr.user_id
                            inner join challenge_response cr on ucr.challenge_response_id = cr.id
                            inner join challenge c on cr.challenge_id = c.id
                    ), challenges as (
                        select r.week, r.deadline, c.id, c.text, (
                            max(cr.points) + count(cr.id)
                        ) as points
                        from challenge c
                            inner join challenge_response cr on c.id = cr.challenge_id
                            inner join round r on c.round_id = r.id
                        where cr.correct = true
                        group by r.week, r.deadline, c.id
                    ), responses as (
                        select cr.id, cr.correct, count(*) as picked
                        from challenge_response cr
                            inner join user_challenge_response ucr on cr.id = ucr.challenge_response_id
                        group by cr.id
                    )
                    select u.username, c.id, c.text as challenge, us.text as response, coalesce(us.points, c.points) as points, r.correct, r.picked
                    from challenges c
                        inner join "user" u on 1=1
                        left join user_selections us on us.user_id = u.id and us.challenge_id = c.id
                        left join responses r on us.response_id = r.id
                    ${where}
                    order by c.id                            
                `, params);
                res.send({
                    username: responses.length > 0 ? responses[0].username : '',
                    responses: responses
                });
            } else {
                res.sendStatus(403);
            }
        },
        getAces: async (req, res) => {
            if (req.isAuthenticated()) {
                let results = await db.any(`
                    WITH aces AS (
                        SELECT r.week, c.id as challenge_id, c.text as challenge, cr.id AS response_id, cr.text as response, COUNT(*)
                        FROM round r
                            INNER JOIN challenge c ON r.id = c.round_id
                            INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                            INNER JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                            INNER JOIN "user" u ON ucr.user_id = u.id
                        WHERE cr.correct = true
                        GROUP BY r.week, c.id, c.text, cr.id, cr.text
                        HAVING COUNT(*) = 1
                    )
                    SELECT u.username, a.week, a.challenge, a.response
                    FROM aces a
                        INNER JOIN user_challenge_response ucr ON a.response_id = ucr.challenge_response_id
                        INNER JOIN "user" u ON ucr.user_id = u.id
                    ORDER BY a.week, a.challenge_id, u.username
                `);

                let rounds = [];
                let weeks = Array.from(new Set(results.map(r => r.week)));

                for (let week of weeks) {
                    let round = {
                        week,
                        challenges: []
                    };

                    let challenges = Array.from(new Set(results.filter(r => r.week == week).map(r => r.challenge)));
                    for (let challenge of challenges) {
                        let roundChallenge = {
                            challenge,
                            aces: results.filter(r => r.week == week && r.challenge == challenge).map(r => {
                                return {
                                    username: r.username,
                                    response: r.response
                                };
                            })
                        }

                        round.challenges.push(roundChallenge);
                    }

                    rounds.push(round);
                }

                res.send(rounds);
            } else {
                res.sendStatus(401);
            }
        }
    };
}