// In the future we should serve a pretty webpage with user stats!
// For now we have a simple app that doesn't do anything but listen
// and serve a dummy webpage

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const _ = require('lodash');

var http_port = process.env.PORT || '8080';
var bot_name = process.env.BOT_NAME ||'catbot';
var slackToken = process.env.SLACK_API_TOKEN;
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

  gentleReminder.init(slackClient, slackToken);
  gentleReminder.start();
});

function GentleReminder() {
  console.log("constructing.");

  this.slackClient = undefined;

  this.token = undefined;

  this.rtm = undefined;

  this.commonStorage = undefined;
  this.userStorage = undefined;
  this.moduleStorage = undefined;

  this.DEFAULT_MODULE_NAME = 'default';

  console.log("constructed.");
}

GentleReminder.prototype.init = function(slackClient, token){
  console.log("initializing.");
  this.slackClient = slackClient;
  this.token = token;

  this.rtm = new this.slackClient.RtmClient(this.token, { logLevel: 'warning' });

  this.rtm.on(this.slackClient.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    for (const c of rtmStartData.channels) {
      if (c.is_member && c.name ==='general') { channel = c.id }
    }
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
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
    console.log(m);
  });
  this.rtm.on(this.slackClient.RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
    // TODO
  });

  this.rtm.on(this.slackClient.RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
    // TODO
  });
  console.log("started");
};
