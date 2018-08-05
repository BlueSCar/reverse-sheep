module.exports = (app, db) => {
    const controller = require('./challenges.controller')(db);

    app.route('/api/challenges').get(controller.getCurrentChallenges);
    app.route('/api/responses')
        .get(controller.getUserResponses)
        .post(controller.submitUserResponses);
    app.route('/api/weeks').get(controller.getChallengeWeeks);
    app.route('/api/scoreboard').get(controller.getScoreboard);
}