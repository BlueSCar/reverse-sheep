module.exports = (db) => {
    return {
        getCurrentChallenges: async (req, res) => {
            if (req.isAuthenticated()) {
                let challenges = await db.any(`
                    WITH user_responses AS (
                        SELECT r.id AS round_id, c.id as challenge_id, cr.id as response_id, cr.text as response_text
                        FROM "user" u
                            INNER JOIN user_challenge_response ucr ON u.id = ucr.user_id
                            INNER JOIN challenge_response cr ON ucr.challenge_response_id = cr.id
                            INNER JOIN challenge c ON cr.challenge_id = c.id
                            INNER JOIN round r ON c.round_id = r.id
                        WHERE u.id = $1
                    )
                    SELECT r.id as round_id, r.week as week, c.id as challenge_id, c.text as challenge_text, ur.response_id as user_response_id, ur.response_text as user_response_text
                    FROM round r
                        INNER JOIN challenge c ON r.id = c.round_id
                        LEFT JOIN user_responses ur ON r.id = ur.round_id AND c.id = ur.challenge_id
                    WHERE r.week = (SELECT MAX(week) FROM round WHERE deadline > (now() at time zone 'utc'))
                `, [req.user.id]);

                let challengeResponses = await db.any(`
                    SELECT c.id as challenge_id, cr.id as response_id, cr.text as response_text
                    FROM round r
                        INNER JOIN challenge c ON r.id = c.round_id
                        INNER JOIN challenge_response cr ON c.id = cr.challenge_id
                    WHERE r.week = (SELECT MAX(week) FROM round WHERE deadline > (now() at time zone 'utc'))
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
        }
    };
}