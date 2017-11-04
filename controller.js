var sprintf = require("sprintf-js").sprintf;

var TeamController = require('./team_controller.js');

function Controller() {
    this.teamControllers = [];
    this.slackClient = undefined;
    this.db = undefined;
}

Controller.prototype.init = function(slackClient, db){
    console.log("initializing.");

    this.slackClient = slackClient;
    this.db = db;

    // Get all the teams that this app is associated with, and create and initialize
    // team controllers for each of them.

    var self = this;
    return new Promise(function(resolve, reject) {
        db.getBotTokens().then(function(res) {
            return res.reduce(function(sequence, row){
                var tc = new TeamController.TeamController();
                return sequence.then(function(){
                    if (row['team_id'][0] == 'T'){
                        self.teamControllers[row['team_id']] = tc;
                        return tc.init(self.slackClient, row['team_id'], row['token'], db);
                    }
                })
            }, Promise.resolve());
        }).then(function(){ resolve(); });
    });
};

Controller.prototype.start = function() {
    var self = this;
    Object.keys(this.teamControllers).forEach(function(key) {
        self.teamControllers[key].start();
    });
};

Controller.prototype.replace = function(payload) {
    if (payload.actions[0].name == 'ignore'){
        return "Okay, ignored.";
    }

    var [team_id, user_id, ts] = payload.callback_id.split("-");

    if (team_id in this.teamControllers){
        this.teamControllers[team_id].replace(user_id, payload.channel.id, ts, payload.actions[0].value);
    }else{
        console.log('Team not found in team controllers');
    }

    return "Thank you! Replaced.";
};

Controller.prototype.handleOAuthUserCallback = function(team, user, code, state, redirect_uri) {
    if (team in this.teamControllers) {
        this.teamControllers[team].handleOAuthCallback(user, code, state, redirect_uri);
    } else {
        console.log('Team not found in team controllers.');
    }
};

Controller.prototype.handleOAuthBotCallback = function(code, state, redirect_uri) {

    // Create a token-less web client just to make the oauth request
    var web = new this.slackClient.WebClient('', { logLevel: 'warning' });

    var self = this;
    return new Promise(function(resolve, reject) {
        web.oauth.access(process.env.CLIENT_ID, process.env.CLIENT_SECRET, code, { redirect_uri: redirect_uri },
            (err, info) => {
                if (err) {
                    console.log('oauth error', err);
                    return;
                }

                console.log('info', info);

                console.log('adding bot token');
                self.db.updateOrAddBotToken(info['team_id'], info['bot']['bot_access_token']).then(function(){
                    console.log('adding user token');
                    self.db.updateOrAddUserToken(self.team_id, info['user_id'], info['access_token']).then(function(){
                        console.log('creating team controller');
                        var tc = new TeamController.TeamController();
                        self.teamControllers[info['team_id']] = tc;
                        console.log('initializing team controller');
                        tc.init(self.slackClient, info['team_id'], info['bot']['bot_access_token'], self.db).then(function() {
                            console.log('starting team controller');
                            tc.start();
                            console.log('resolving.');
                            resolve(tc);
                        });
                    });
                });
            });
    });
};

exports.Controller = Controller;
