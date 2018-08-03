(async () => {
    require('dotenv').config();

    const port = process.env.PORT;

    const passport = require('passport');
    const db = require('./server/database')(require('bluebird'), require('pg-promise'));
    const passportConfig = require('./server/passport')(passport, db);
    const express = require('./server/express');
    const app = express(db, passport);

    app.listen(port, console.log(`Listening on port ${port}`));
})().catch(err => {
    console.error(err);
});