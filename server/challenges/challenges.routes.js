module.exports = (app, db) => {
    const controller = require('./challenges.controller')(db);

    app.route('/api/challenges').get(controller.getCurrentChallenges);
}