const DB = require('./db.js');
var db = new DB.DB();
db.init(process.env.DATABASE_URL);

var team_id = process.env.TEAM_ID;
var user_id = process.env.USER_ID;
var bot_token = process.env.BOT_TOKEN;
var user_token = process.env.USER_TOKEN;

db.updateOrAddUserToken(team_id, user_id, 'dummy').then(
    function(){
        return db.getUserTokensForTeam(team_id).then(function(res) {
            console.log(res);
            })
    }).then(
    function(){
        return db.updateOrAddUserToken(team_id, user_id, user_token).then(
            function(){
                return db.getUserTokensForTeam(team_id).then(function(res) {
                    console.log(res);
                    });
            });
    });

console.log('waiting');
