// 3rd party includes

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const _ = require('lodash');

// Local classes

const Controller = require('./controller.js');

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

var controller = new Controller.Controller();

app.post('/interactive', function(req, res) {
  payload = JSON.parse(req.body.payload);
  response = controller.replace(payload);
  res.send(response);
});

app.use(express.static(__dirname + '/assets'));


app.listen(http_port, function(err) {
  if (err) {
    throw err;
  }

  console.log('Listening on ' + http_port);

  controller.init(slackClient, slackRtmToken, slackWebToken);
  controller.start();
});
