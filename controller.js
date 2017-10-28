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

  var self = this;
  return new Promise(function(resolve, reject) {
    db.getBotTokens().then(function(res) {
      return res.reduce(function(sequence, row){
        tc = new TeamController.TeamController();
        return sequence.then(function(){
          self.teamControllers[row['team_id']] = tc;
          return tc.init(self.slackClient, row['team_id'], row['token'], res);
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
  this.web_user.chat.update(payload.callback_id, payload.channel.id, payload.actions[0].value, {}, (err, info) => {
    if (err){
      console.log('An error occurred while updating: ' + err);
    }
  });
  return "Thank you! Replaced.";
};

exports.Controller = Controller;
