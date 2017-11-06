var sprintf = require("sprintf-js").sprintf;

function TeamController() {
    this.slackClient = undefined;
    this.team_id = undefined;
    this.bot_token = undefined;
    this.db = undefined;
    this.name = undefined;
    this.matches = [
        {
            'regex': /guys/gi,
            'alert': "'Guys' isn't gender neutral, so if youre referring to a group of men and women, consider using something else.",
            'replacements': ["y'all",'comrades','folks']
        }
    ];
    this.users = undefined;

    this.commands = {
        'help': {
            help: 'Show this message',
            fn: TeamController.prototype.showHelp.bind(this),
        },
        'replacements': {
            help: 'Show the list of replacements this bot will suggest',
            fn: TeamController.prototype.showReplacements.bind(this),
        },
        'subscribe': {
            help: 'Subscribe to reminders',
            fn: TeamController.prototype.showSubscribeLink.bind(this),
        },
        'unsubscribe': {
            help: 'Unsubscribe from all reminders',
            fn: TeamController.prototype.handleUnsubscribe.bind(this),
        },
        'add': {
            help: 'Add a new reminder for your team',
            syntax: "  `add` _match_ _suggestion_,_suggestion_,_suggestion_,  eg. `add guys y'all, comrades, folks`",
            fn: TeamController.prototype.addReplacement.bind(this),
        },
    };
}

TeamController.prototype.init = function(slackClient, team_id, bot_token, db) {
    this.slackClient = slackClient;
    this.team_id = team_id;
    this.bot_token = bot_token;
    this.db = db;
    this.users = {};

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
    var self = this;

    this.rtm = new this.slackClient.RtmClient(this.bot_token, { logLevel: 'warning' });

    this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.CONNECTING, function() {
        console.log('connecting');
    });

    this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, (data) => {
        console.log('unable to rtm.start:', data);
    });

    this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
        self.name = rtmStartData.team.name;
        console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
    });

    var self = this;
    this.rtm.on(this.slackClient.RTM_EVENTS.MESSAGE, function(m) {
        self.handleMessage(m);
    });

    this.rtm.start();

    this.web = new this.slackClient.WebClient(this.bot_token, { logLevel: 'warning' });
};

TeamController.prototype.getName = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (!self.name) {
            self.web.team.info().then(function(info){
                resolve(info.team.name);
            });
        } else {
            resolve(self.name);
        }
    });
}

TeamController.prototype.handleMessage = function(m) {
    if (m.type != 'message') {
        return;
    }

    if (m.channel[0] == 'D'){
        return this.handleDirectMessage(m);
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

TeamController.prototype.handleDirectMessage = function(m){
    var args = m.text.split(' ');
    var command = command = args[0].toLowerCase();
    if (command in this.commands){
        this.commands[command].fn(m, args);
    }
};

TeamController.prototype.replace = function(user_id, channel_id, ts, replacement) {
    var web_user = new this.slackClient.WebClient(this.users[user_id].token, { logLevel: 'warning' });
    web_user.chat.update(ts, channel_id, replacement, {}, (err, info) => {
        if (err){
            console.log('An error occurred while updating: ' + err);
        }
    });
};

TeamController.prototype.generateAuthLinkForUser = function(team, user) {
    return "https://gentle-reminder.herokuapp.com/requestUserAuth/" + team + "/" + user;
};

TeamController.prototype.handleOAuthCallback = function(user, code, state, redirect_uri) {

    // Our sanity check is that the "state" variable that gets passed back to us is the user that requested
    // authentication. If that doesn't match the user that is being *granted* authentication, something is
    // amiss and we should bail!

    if (state != user){
        console.log(sprintf('User (%s) does not match state (%s), aborting.', user, state));
        return;
    }

    var self = this;
    this.web.oauth.access(process.env.CLIENT_ID, process.env.CLIENT_SECRET, code, { redirect_uri: redirect_uri },
        (err, info) => {
            if (err) {
                console.log('oauth error', err);
                return;
            }

            console.log('info', info);

            // success! Store the new token in the db (either updating an existing row or creating a new one)

            if (self.team_id != info['team_id']) {
                console.log('Team does not match; ignoring');
            }

            self.db.updateOrAddUserToken(self.team_id, info['user_id'], info['access_token']).then(function(){
                self.users[user] = {'team_id': self.team_id, 'user_id': info['user_id'], 'token': info['access_token']};
            });
        });
    return;
};

TeamController.prototype.showHelp = function(m, args) {
    var helptext = "Welcome to the Gentle Reminder bot. You can send this bot a message via DM.\n";
    helptext += "Be sure to invite the bot (with `/invite @gentle-reminder`) to any channels in which you'd like reminders.\n\n";
    helptext += "*Commands:*\n";

    for (let command in this.commands) {
        helptext += "\t`" + command + "`: " + this.commands[command].help + "\n";

        if ('syntax' in this.commands[command]) {
            helptext += "\t\t" + this.commands[command].syntax + "\n";
        }
    }

    this.web.chat.postMessage(m.channel, helptext, {});
};

TeamController.prototype.showReplacements = function(m, args) {
    var message = '';
    for (let match of this.matches) {
        message += sprintf("The regex: *%s* can be replaced with these suggestions: _%s_\n",
            match.regex, match.replacements.join(', '));
    }

    this.web.chat.postMessage(m.channel, message);
};

TeamController.prototype.showSubscribeLink = function(m, args) {
    this.db.showUsers(m.team);

    if (m.user in this.users && !args.includes('force')) {
        this.web.chat.postMessage(m.channel, "You're already subscribed to gentle reminders! Thank you ❤️", { parse: 'full' });
        return;
    }

    var message =
        "To receive gentle reminders, please follow this link to authorize the gentle reminder bot to edit messages " +
        "on your behalf (after providing you an opportunity to choose a replacement, or ignore the suggestion). " +
        this.generateAuthLinkForUser(m.team, m.user);

    this.web.chat.postMessage(m.channel, message);
};

TeamController.prototype.addReplacement = function(m, args) {
    // TODO: implement this
};

TeamController.prototype.handleUnsubscribe = function(m, args) {
    this.db.removeUser(m.team, m.user);
    delete this.users[m.user];

    this.web.chat.postMessage(m.channel, "Thanks for using the gentle reminder bot! You are now unsubsubscribed; you can send `subscribe` to this bot anytime to re-subscribe.");
};

exports.TeamController = TeamController;
