var sprintf = require("sprintf-js").sprintf;

var TeamController = require('./team_controller.js');

function Controller() {
    this.teamControllers = [];
    this.slackClient = undefined;
    this.db = undefined;
}

Controller.prototype.init = function(slackClient, db){
  console.log("initializing.");

  this.slackClient = slackClient;
  this.db = db;

  // Get all the teams that this app is associated with, and create and initialize
  // team controllers for each of them.

  var self = this;
  return new Promise(function(resolve, reject) {
    db.getBotTokens().then(function(res) {
      return res.reduce(function(sequence, row){
        tc = new TeamController.TeamController();
        return sequence.then(function(){
          self.teamControllers[row['team_id']] = tc;
          return tc.init(self.slackClient, row['team_id'], row['token'], db);
        })
      }, Promise.resolve());
    }).then(function(){ resolve(); });
  });
};

Controller.prototype.start = function() {
  var self = this;
  Object.keys(this.teamControllers).forEach(function(key) {
    console.log('key: ' + key);
    self.teamControllers[key].start();
  });
};

Controller.prototype.replace = function(payload) {
  if (payload.actions[0].name == 'ignore'){
    return "Okay, ignored.";
  }

  [team_id, user_id, ts] = payload.callback_id.split("-");

  console.log(sprintf("Would replace with '%s' on team %s, user %s and ts %s", payload.actions[0].value, team_id, user_id, ts));

  if (team in this.teamControllers){
    this.teamControllers[team].replace(user, payload.channel.id, ts, payload.actions[0].value);
  }else{
    console.log('Team not found in team controllers');
  }

  return "Thank you! Replaced.";
};

exports.Controller = Controller;
