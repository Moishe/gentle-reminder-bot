function DB() {
  this.client = undefined;
  this.sprintf = require("sprintf-js").sprintf;
  console.log(this.sprintf('hello %s', 'world'));
}

DB.prototype.init = function(databaseUrl) {
  const { Client } = require('pg');

  this.client = new Client({
    connectionString: databaseUrl,
    ssl: true,
  });

  this.client.connect();
};

DB.prototype.getBotTokens = function() {
  console.log('getting bot tokens');
  var self = this;
  return new Promise(function(resolve, reject) {
    self.client.query('SELECT team_id, token FROM bot_tokens', (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(res.rows);
    });
  });

};

DB.prototype.getUserTokensForTeam = function(team_id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    query = self.sprintf("SELECT team_id, user_id, token FROM user_tokens WHERE team_id='%s';", team_id);
    self.client.query(query, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(res.rows);
    })
  });
};

DB.prototype.getSubstitutions = function(team_id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    query = self.sprintf("SELECT team_id, regex_match, replacements FROM substitutions WHERE team_id='%s';", team_id);
    self.client.query(query, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(res.rows);
    })
  });
};

exports.DB = DB;
