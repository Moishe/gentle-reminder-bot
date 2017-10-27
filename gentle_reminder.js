// In the future we should serve a pretty webpage with user stats!
// For now we have a simple app that doesn't do anything but listen
// and serve a dummy webpage

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const _ = require('lodash');

function connect_db(){
  const { Client } = require('pg');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  client.connect();

  var create_table_queries = [
    `CREATE TABLE IF NOT EXISTS rtm_tokens (
      team_id VARCHAR(64) NOT NULL,
      token VARCHAR(1024) NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS web_tokens (
      team_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      token VARCHAR(1024) NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS substitutions (
      team_id VARCHAR(64) NOT NULL,
      regex_match VARCHAR(128) NOT NULL,
      replace VARCHAR(128) NOT NULL
    );`,
  ];

  for (let create_table_query of create_table_queries){
    client.query(create_table_query, (err, res) => {
      if (err) throw err;
      console.log(res);
    });
  }

};

connect_db();

var http_port = process.env.PORT || '8080';
var bot_name = process.env.BOT_NAME ||'gentle-reminder';
var slackRtmToken = process.env.SLACK_RTM_TOKEN;
var slackWebToken = process.env.SLACK_WEB_TOKEN;
var slackClient = require('@slack/client');

var app = express();

if (process.env.PROXY_URI) {
  app.use(process.env.PROXY_URI), {
    forwardPath: function(req, res) { return require('url').parse(req.url).path }
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) { res.send('\n 😻😻 ' + bot_name + ' 😻😻 \n'); });

var gentleReminder = new GentleReminder();

app.post('/interactive', function(req, res) {
  payload = JSON.parse(req.body.payload);
  response = gentleReminder.replace(payload);
  res.send(response);
});

app.use(express.static(__dirname + '/assets'));


app.listen(http_port, function(err) {
  if (err) {
    throw err;
  }

  console.log('Listening on ' + http_port);

  gentleReminder.init(slackClient, slackRtmToken, slackWebToken);
  gentleReminder.start();
});

function GentleReminder() {
  this.slackClient = undefined;
  this.rtmToken = undefined;
  this.webToken = undefined;
  this.rtm = undefined;
}

GentleReminder.prototype.init = function(slackClient, rtmToken, webToken){
  console.log("initializing.");
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

GentleReminder.prototype.start = function() {
  console.log("starting");
  this.rtm.start();

  var self = this;
  this.rtm.on(this.slackClient.RTM_EVENTS.MESSAGE, function(m) {
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

GentleReminder.prototype.replace = function(payload) {
  console.log(JSON.stringify(payload.actions[0]));
  if (payload.actions[0].name != 'ignore'){
    return "Okay, ignored.";
  }
  this.web_user.chat.update(payload.callback_id, payload.channel.id, payload.actions[0].value, {}, (err, info) => {
    if (err){
      console.log('An error occurred while updating: ' + err);
    }
  });
  return "Thank you! Replaced.";
};
