function DB() {
  this.client = undefined;
}

DB.prototype.init = function() {
  const { Client } = require('pg');

  this.client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  this.client.connect();

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
    this.client.query(create_table_query, (err, res) => {
      if (err) throw err;
      console.log(res);
    });
  }
};

exports.DB = DB;
