var sprintf = require("sprintf-js").sprintf;

function TeamController() {
    this.slackClient = undefined;
    this.team_id = undefined;
    this.bot_token = undefined;
    this.db = undefined;
    this.matches = undefined;
    this.users = undefined;
}

TeamController.prototype.init = function(slackClient, team_id, bot_token, db) {
    this.slackClient = slackClient;
    this.team_id = team_id;
    this.bot_token = bot_token;
    this.db = db;
    this.users = {};
    this.matches = [];

    // load all the matchers and users for this team

    var self = this;
    return new Promise(function(resolve, reject) {
        self.db.getSubstitutions(self.team_id).then(function(res) {
            for (let match of res){
                self.matches.push(
                    {
                        'regex': new RegExp(match['regex_match'], 'gi'),
                        'alert': match['alert'],
                        'replacements': match['replacements'].split(",")
                    });
            }
        }).then(function(){
            return self.db.getUserTokensForTeam(self.team_id).then(function(res) {
                for (let user of res){
                    self.users[user['user_id']] = user;
                }
            }).then(function() { resolve(); });
        }).then(function() { resolve(); });
    });
};

TeamController.prototype.start = function() {
    console.log(sprintf('starting (%s)', this.team_id));
    this.rtm = new this.slackClient.RtmClient(this.bot_token, { logLevel: 'warning' });

    this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.CONNECTING, function() {
        console.log('connecting');
    });

    this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, (data) => {
        console.log('unable to rtm.start: ' + data);
    });

    this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
        console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
    });

    var self = this;
    this.rtm.on(this.slackClient.RTM_EVENTS.MESSAGE, function(m) { self.handleMessage(m); });

    this.rtm.start();

    this.web = new this.slackClient.WebClient(this.bot_token, { logLevel: 'warning' });
};

TeamController.prototype.handleMessage = function(m) {
    if (m.type != 'message') {
        return;
    }

    if (!(m.user in this.users)) {
        return;
    }

    for (let match of this.matches) {
        if (match.regex.exec(m.text)) {
            attachments = [
                {
                    text: "Choose a replacement",
                    callback_id: sprintf("%s-%s-%s", m.team, m.user, m.ts),
                    color: "#3AA3E3",
                    attachment_type: "default",
                    actions: [],
                }
            ];

            for (let replacement of match.replacements){
                var newString = m.text.replace(match.regex, replacement);
                attachments[0].actions.push({name: 'replacement', text: replacement, type: 'button', value: newString});
            }

            attachments[0].actions.push({name: 'ignore', text: 'Ignore', type: 'button', value: 0, style: 'danger'});
            this.web.chat.postEphemeral(m.channel, match.alert, m.user, { attachments: attachments });
        }
    }
};

TeamController.prototype.replace = function(user_id, channel_id, ts, replacement) {
    console.log("user: ", this.users[user_id]);
    var web_user = new this.slackClient.WebClient(this.users[user_id].token, { logLevel: 'warning' });
    web_user.chat.update(payload.callback_id, , replacement, {}, (err, info) => {
        if (err){
            console.log('An error occurred while updating: ' + err);
        }
    });
}

exports.TeamController = TeamController;
