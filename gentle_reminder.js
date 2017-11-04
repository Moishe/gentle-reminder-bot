// 3rd party includes

const _ = require('lodash');
const bodyParser = require('body-parser');
const express = require('express');
const mustacheExpress = require('mustache-express');
const proxy = require('express-http-proxy');
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

app.use(express.static('public'));

// Register '.mustache' extension with The Mustache Express
app.engine('mustache', mustacheExpress());

app.set('views', './views');
app.set('view engine', 'mustache');

app.get('/', function(req, res) {
    res.render('index.mustache', { title: 'hello' });
});

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

app.get('/test', function(req, res) {
    res.render('team_authed.mustache', {team: 'TEAM NAME'});
});

app.get('/oauth/:team/:user', function(req, res) {
    var path = url.parse(req.url).pathname;
    controller.handleOAuthUserCallback(req.params['team'], req.params['user'], req.query.code, req.query.state, "https://gentle-reminder.herokuapp.com" + path);

    res.render('user_authed.mustache');
});

app.get('/oauth', function(req, res) {
    var path = url.parse(req.url).pathname;
    controller.handleOAuthBotCallback(req.query.code, req.query.state, "https://gentle-reminder.herokuapp.com" + path).then(function(team_controller) {
        tc.getName().then(function(name) {
            res.render('team_authed.mustache', { team: name });
        });
    });
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
