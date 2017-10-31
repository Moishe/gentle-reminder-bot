// 3rd party includes

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const _ = require('lodash');
const url = require('url');
const urlencode = require('urlencode');

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

    if (payload.token != process.env.VERIFICATION_TOKEN) {
        console.log('!!! invalid verification token received !!!');
    }

    response = controller.replace(payload);
    res.send(response);
});

app.get('/requestUserAuth/:team/:user', function(req, res) {
    var url = "https://slack.com/oauth/authorize" +
        "?client_id=" + urlencode(process.env.CLIENT_ID) +
        "&scope=chat:write:user%20bot" +
        "&redirect_uri=https://gentle-reminder.herokuapp.com/oauth/" + urlencode(req.params['team']) + "/" + urlencode(req.params['user']) +
        "&state=" + urlencode(req.params['user']) +
        "&team=" + urlencode(req.params['team']);

    res.redirect(url);
});

app.get('/oauth/:team/:user', function(req, res) {
    var path = url.parse(req.url).pathname;
    controller.handleOAuthCallback(req.params['team'], req.params['user'], req.query.code, req.query.state, "https://gentle-reminder.herokuapp.com" + path);
    res.send('ok');
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
