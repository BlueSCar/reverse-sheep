const DiscordStrategy = require('passport-discord');
const appId = process.env.DISCORD_APP_ID;
const secret = process.env.DISCORD_SECRET;
const host = process.env.HOST;
const guildId = process.env.GUILD_ID;

module.exports = (passport, db) => {
    passport.use(new DiscordStrategy({
        clientID: appId,
        clientSecret: secret,
        callbackURL: `http://${host}/auth/discord/callback`,
        scope: 'identify guilds',
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        process.nextTick(async () => {
            try {
                let user = null;
                if (!req.user) {
                    user = await db.oneOrNone(`
                        SELECT id, username, discord_id as discord, is_member as member
                        FROM "user"
                        WHERE discord_id = $1
                    `, [profile.id]);

                    let member = profile.guilds.find(g => g.id == guildId) != null;
                    if (user && (user.username != profile.username || user.member != member)) {
                        await db.none(`
                            UPDATE "user"
                            SET username = $1,
                                is_member = $2
                            WHERE discord_id = $3
                        `, [profile.username, member, profile.id]);

                        user.username = profile.username;
                        user.discord = profile.id;
                        user.member = member;
                    } else if (!user) {
                        await db.none(`
                            INSERT INTO "user" (username, discord_id, is_member)
                            VALUES ($1, $2, $3)
                        `, [profile.username, profile.id, member]);

                        user = await db.oneOrNone(`
                            SELECT id, username, discord_id as discord, is_member as member
                            FROM "user"
                            WHERE discord_id = $1
                        `, [profile.id]);
                    }
                } else {
                    user = await db.oneOrNone(`
                        SELECT id, username, discord_id as discord, is_member as member
                        FROM "user"
                        WHERE id = $1
                    `, [req.user.id]);

                    let member = profile.guilds.find(g => g.id == guildId) != null;

                    if (user && (user.discord != profile.id || user.username != profile.username || user.member != member)) {
                        await db.none(`
                            UPDATE "user"
                            SET username = $1,
                                discord_id = $2,
                                is_member = $3
                            WHERE id = $4
                        `, [profile.username, profile.id, member, req.user.id]);

                        user.username = profile.username;
                        user.discord = profile.id;
                        user.member = member;
                    } else if (!user) {
                        await db.none(`
                            INSERT INTO "user" (username, discord_id, is_member)
                            VALUES ($1, $2)
                        `, [profile.username, profile.id, member]);

                        user = await db.oneOrNone(`
                            SELECT id, username, discord_id as discord, is_member as member
                            FROM "user"
                            WHERE discord_id = $1
                        `, [profile.id]);
                    }
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        });
    }));
}