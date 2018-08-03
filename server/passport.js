module.exports = (passport, db) => {
  require('./strategies/discord')(passport, db);

  passport.serializeUser(async (user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      let user = null
      let userRecord = await db.oneOrNone(`
          SELECT id, username, discord_id as discord
          FROM "user"
          WHERE id = $1
      `, [id]);

      if (userRecord) {
        user = {
          id: userRecord.id,
          username: userRecord.username,
          discordId: userRecord.discord
        }
      }

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}