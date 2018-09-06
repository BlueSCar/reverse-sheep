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
    }

    return {
        getChallengeWeeks: async (req, res) => {
            if (req.isAuthenticated()) {
                let weeks = await db.any(`
                SELECT DISTINCT week
                FROM round
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
                        WITH scores AS (
                            WITH max_scores AS (
                                WITH response_counts AS (
                                    SELECT c.id as challenge_id, cr.id as response_id, COALESCE(cr.correct, false) as correct, COUNT(ucr.id) AS total
                                    FROM round r
                                        INNER JOIN challenge c ON r.id = c.round_id
                                        INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                        LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                                    WHERE r.week = $1
                                    GROUP BY c.id, cr.id, cr.correct
                                )
                                SELECT c.id, (COALESCE(MAX(rc.total) FILTER(WHERE rc.correct), 0) + COUNT(*) FILTER(WHERE cr.correct)) as max_score
                                FROM challenge c
                                    INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                    INNER JOIN response_counts rc ON cr.id = rc.response_id
                                GROUP BY c.id
                            )
                            SELECT c.id as challenge_id, cr.id as response_id, ms.max_score as max_score, CASE WHEN cr.correct THEN COUNT(ucr.id) ELSE ms.max_score END AS score
                            FROM round r
                                INNER JOIN challenge c ON r.id = c.round_id
                                INNER JOIN max_scores ms ON c.id = ms.id
                                INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                            WHERE r.week = $1
                            GROUP BY c.id, cr.id, ms.max_score
                        ), user_responses AS (
                            SELECT c.id as challenge_id, cr.id as response_id, ucr.user_id as user_id
                            FROM round r
                                INNER JOIN challenge c ON r.id = c.round_id
                                INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                            WHERE r.week = $1
                        )
                        SELECT u.username, SUM(COALESCE(CASE WHEN s.score IS NOT NULL THEN s.score ELSE (SELECT max_score FROM scores WHERE challenge_id = c.id LIMIT 1) END, 0)) AS points
                        FROM round r
                            INNER JOIN challenge c ON r.id = c.round_id
                            INNER JOIN "user" u ON 1=1
                            LEFT JOIN user_responses ur ON c.id = ur.challenge_id AND u.id = ur.user_id
                            LEFT JOIN scores s ON s.response_id = ur.response_id
                        GROUP BY u.username
                        ORDER BY points, u.username
                    `, [req.query.week]);


		    for (let score of scoreboard) {
			score.rank = scoreboard.filter(s => s.points * 1.0 < score.points * 1.0).length  + 1;
		    }

                    res.send({
                        username: req.user.username,
                        scoreboard
                    });
                } else {
                    scoreboard = await db.any(`
                        WITH scores AS (
                            WITH max_scores AS (
                                WITH response_counts AS (
                                    SELECT c.id as challenge_id, cr.id as response_id, COALESCE(cr.correct, false) as correct, COUNT(ucr.id) AS total
                                    FROM round r
                                        INNER JOIN challenge c ON r.id = c.round_id
                                        INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                        LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                                    WHERE r.deadline < (now() at time zone 'utc')
                                    GROUP BY c.id, cr.id, cr.correct
                                )
                                SELECT c.id, (COALESCE(MAX(rc.total) FILTER(WHERE rc.correct), 0) + COUNT(*) FILTER(WHERE cr.correct)) as max_score
                                FROM challenge c
                                    INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                    INNER JOIN response_counts rc ON cr.id = rc.response_id
                                GROUP BY c.id
                            )
                            SELECT c.id as challenge_id, cr.id as response_id, ms.max_score as max_score, CASE WHEN cr.correct THEN COUNT(ucr.id) ELSE ms.max_score END AS score
                            FROM round r
                                INNER JOIN challenge c ON r.id = c.round_id
                                INNER JOIN max_scores ms ON c.id = ms.id
                                INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                            WHERE r.deadline < (now() at time zone 'utc')
                            GROUP BY c.id, cr.id, ms.max_score
                        ), user_responses AS (
                            SELECT c.id as challenge_id, cr.id as response_id, ucr.user_id as user_id
                            FROM round r
                                INNER JOIN challenge c ON r.id = c.round_id
                                INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                            WHERE r.deadline < (now() at time zone 'utc')
                        )
                        SELECT u.username, SUM(COALESCE(CASE WHEN s.score IS NOT NULL THEN s.score ELSE (SELECT max_score FROM scores WHERE challenge_id = c.id LIMIT 1) END, 0)) AS points
                        FROM round r
                            INNER JOIN challenge c ON r.id = c.round_id
                            INNER JOIN "user" u ON 1=1
                            LEFT JOIN user_responses ur ON c.id = ur.challenge_id AND u.id = ur.user_id
                            LEFT JOIN scores s ON s.response_id = ur.response_id
                        GROUP BY u.username
                        ORDER BY points, u.username
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
                let responses = await db.any(`
                    WITH scores AS (
                        WITH max_scores AS (
                            WITH response_counts AS (
                                SELECT c.id as challenge_id, cr.id as response_id, COALESCE(cr.correct, false) as correct, COUNT(ucr.id) AS total
                                FROM round r
                                    INNER JOIN challenge c ON r.id = c.round_id
                                    INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                    LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                                WHERE r.week = $1
                                GROUP BY c.id, cr.id, cr.correct
                            )
                            SELECT c.id, (COALESCE(MAX(rc.total) FILTER(WHERE rc.correct), 0) + COUNT(*) FILTER(WHERE cr.correct)) as max_score
                            FROM challenge c
                                INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                                INNER JOIN response_counts rc ON cr.id = rc.response_id
                            GROUP BY c.id
                        )
                        SELECT c.id as challenge_id, cr.id as response_id, ms.max_score as max_score, CASE WHEN cr.correct THEN COUNT(ucr.id) ELSE ms.max_score END AS score, COUNT(ucr.id) AS users
                        FROM round r
                            INNER JOIN challenge c ON r.id = c.round_id
                            INNER JOIN max_scores ms ON c.id = ms.id
                            INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                            LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                        WHERE r.week = $1
                        GROUP BY c.id, cr.id, ms.max_score
                    ), user_responses AS (
                        SELECT c.id as challenge_id, cr.id as response_id, cr.correct, ucr.user_id as user_id, cr.text as text
                        FROM round r
                            INNER JOIN challenge c ON r.id = c.round_id
                            INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                            LEFT JOIN user_challenge_response ucr ON cr.id = ucr.challenge_response_id
                        WHERE r.week = $1
                    )
                    SELECT c.id, c.text as challenge, ur.text as response, COALESCE(CASE WHEN s.score IS NOT NULL THEN s.score ELSE (SELECT max_score FROM scores WHERE challenge_id = c.id LIMIT 1) END, 0) AS points, ur.correct, CASE WHEN deadline < (now() at time zone 'utc') THEN s.users ELSE null END AS picked
                    FROM round r
                        INNER JOIN challenge c ON r.id = c.round_id
                        INNER JOIN "user" u ON 1=1
                        LEFT JOIN user_responses ur ON c.id = ur.challenge_id AND u.id = ur.user_id
                        LEFT JOIN scores s ON s.response_id = ur.response_id
                    WHERE r.week = $1 AND u.id = $2
                    GROUP BY c.id, c.text, s.score, ur.correct, ur.text, r.deadline, s.users
                    ORDER BY c.id
                `, [req.query.week, req.user.id]);
                res.send({
                    username: req.user.username,
                    responses: responses
                });
            } else {
                res.sendStatus(403);
            }
        }
    };
}
