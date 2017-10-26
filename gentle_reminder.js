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

app.get('/', function(req, res) { res.send('\n 😻😻 ' + bot_name + ' 😻😻 \n') });
app.use(express.static(__dirname + '/assets'));


app.listen(http_port, function(err) {
  if (err) {
    throw err;
  }

  console.log('Listening on ' + http_port);

  var gentleReminder = new GentleReminder();

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
  this.web = new this.slackClient.WebClient(this.webToken, { logLevel: 'warning' });

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

  console.log("initialized.");
};

GentleReminder.prototype.start = function() {
  console.log("starting");
  this.rtm.start();

  var self = this;
  this.rtm.on(this.slackClient.RTM_EVENTS.MESSAGE, function(m) {
    if (m.type == 'message'){
        match = /guys/.exec(m.text);
        if (match){
          self.web.chat.postEphemeral(m.channel, "Yo", m.user, { as_user: true }, function(err, info){
            console.log(err);
            console.log(info);
          });
          self.web.chat.update(m.ts, m.channel, "edited", { as_user: true }, function(err, info){
            console.log(err);
            console.log(info);
          });
        }
    }
  });
  this.rtm.on(this.slackClient.RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
    // TODO
  });

  this.rtm.on(this.slackClient.RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
    // TODO
  });
  console.log("started");
};
