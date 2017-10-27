function Controller() {
  this.slackClient = undefined;
  this.rtmToken = undefined;
  this.webToken = undefined;
  this.rtm = undefined;
}

Controller.prototype.init = function(slackClient, rtmToken, webToken, db){
  console.log("initializing.");

  db.getBotTokens().then(console.log);

  this.slackClient = slackClient;
  this.rtmToken = rtmToken;
  this.webToken = webToken;

  this.rtm = new this.slackClient.RtmClient(this.rtmToken, { logLevel: 'warning' });
  this.web = new this.slackClient.WebClient(this.rtmToken, { logLevel: 'warning' });
  this.web_user = new this.slackClient.WebClient(this.webToken, { logLevel: 'warning' });

  this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.CONNECTING, function() {
    console.log('connecting');
  });

  this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, (data) => {
    console.log('unable to rtm.start: ' + data);
  });

  this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
    for (const c of rtmStartData.channels) {
      console.log('  joined channel ' + c.name);
    }
  });

  this.channelRe = /#.*/;
  this.userRe = /<@[UW][A-Za-z0-9]+>/;

  this.matches = [
    {
      regex: /guys/gi,
      alert: "'Guys' isn't gender neutral, so if you're referring to a group of men and women, consider using something else.",
      replacements: ["y'all", "comrades", "folks"],
    },
  ];

  console.log("initialized.");
};

Controller.prototype.start = function() {
  console.log("starting");
  this.rtm.start();

  var self = this;
  this.rtm.on(this.slackClient.RTM_EVENTS.MESSAGE, function(m) {
    console.log(m);
    if (m.type == 'message'){
      for (let match of self.matches){
        if (match.regex.exec(m.text)){
          attachments = [{
            text: "Choose a replacement",
            callback_id: m.ts,
            color: "#3AA3E3",
            attachment_type: "default",
            actions: [],
          }];

          for (let replacement of match.replacements){
            var newString = m.text.replace(match.regex, replacement);
            attachments[0].actions.push({name: 'replacement', text: replacement, type: 'button', value: newString});
          }
          attachments[0].actions.push({name: 'ignore', text: 'Ignore', type: 'button', value: 0, style: 'danger'});
          console.log(attachments);
          self.web.chat.postEphemeral(m.channel, match.alert, m.user, { attachments: attachments });
        }
      }
    }
  });
  console.log("started");
};

Controller.prototype.replace = function(payload) {
  if (payload.actions[0].name == 'ignore'){
    return "Okay, ignored.";
  }
  this.web_user.chat.update(payload.callback_id, payload.channel.id, payload.actions[0].value, {}, (err, info) => {
    if (err){
      console.log('An error occurred while updating: ' + err);
    }
  });
  return "Thank you! Replaced.";
};

exports.Controller = Controller;
