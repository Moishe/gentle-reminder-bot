function DB() {
  this.client = undefined;
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
  self = this;
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

};

DB.prototype.getSubstitutions = function(team_id, user_id) {
};

exports.DB = DB;
