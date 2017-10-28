// 3rd party includes

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const _ = require('lodash');

// Local classes

const Controller = require('./controller.js');
const DB = require('./db.js');

var http_port = process.env.PORT || '8080';
var bot_name = process.env.BOT_NAME ||'gentle-reminder';
var databaseUrl = process.env.DATABASE_URL;
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

var controller = new Controller.Controller();
var db = new DB.DB();

app.post('/interactive', function(req, res) {
  payload = JSON.parse(req.body.payload);
  console.log("payload: ", req.body.payload);
  response = controller.replace(payload);
  res.send(response);
});

app.use(express.static(__dirname + '/assets'));


app.listen(http_port, function(err) {
  if (err) {
    throw err;
  }

  console.log('Listening on ' + http_port);

  db.init(databaseUrl);

  controller.init(slackClient, db).then(function() { controller.start(); });
});
