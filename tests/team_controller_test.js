var TeamController = require('../team_controller.js');
var DB = require('../DB.js');

var tc = new TeamController.TeamController();

tc.web = {};
tc.web.oauth = {};

tc.web.oauth.access = function(clientid, clientsecret, code, opts, cb) {
    cb(undefined, { hello: 'world' });
};

tc.db = new DB.DB();

tc.handleOAuthCallback('1', '2', 'foo', 'bar');
