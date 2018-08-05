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
    `, [userId]);
    }

    return {
        getChallengeWeeks: async (req, res) => {
            if (req.isAuthenticated()) {
                let weeks = await db.any(`
                SELECT DISTINCT week
                FROM round
                WHERE deadline < (now() at time zone 'utc')
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
                if (req.query.week) {
                    let scoreboard = await db.any(`
                        SELECT u.username, COALESCE(SUM(cr.points),0)
                        FROM "user" u
                            INNER JOIN user_challenge_response ucr ON u.id = ucr.user_id
                            INNER JOIN challenge_response cr ON ucr.challenge_response_id = cr.id
                            INNER JOIN challenge c ON cr.challenge_id = c.id
                            INNER JOIN round r ON c.round_id = r.id
                        WHERE r.week = $1
                        GROUP BY u.username
                        ORDER BY COALESCE(SUM(cr.points), 0)
                    `, [req.query.week]);

                    res.send({
                        username: req.user.username,
                        scoreboard
                    });
                } else {
                    let scoreboard = await db.any(`
                        SELECT u.username, COALESCE(SUM(cr.points),0) as points
                        FROM "user" u
                            INNER JOIN user_challenge_response ucr ON u.id = ucr.user_id
                            INNER JOIN challenge_response cr ON ucr.challenge_response_id = cr.id
                        GROUP BY u.username
                        ORDER BY COALESCE(SUM(cr.points),0)
                    `);

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
                        INNER JOIN challenge_response cr ON c.id = cr.challenge_id
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
                    res.send(null);
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
        getUserResponses: (req, res) => {
            if (req.isAuthenticated()) {
                res.send([]);
            } else {
                res.sendStatus(403);
            }
        }
    };
}