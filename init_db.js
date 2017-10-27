const { Client } = require('pg');
var sprintf = require("sprintf-js").sprintf;

var client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();

var team_id = process.env.TEAM_ID;
var user_id = process.env.USER_ID;
var bot_token = process.env.BOT_TOKEN;
var user_token = process.env.USER_TOKEN;

client.query(
    `CREATE TABLE IF NOT EXISTS bot_tokens (
        team_id VARCHAR(64) NOT NULL PRIMARY KEY,
        token VARCHAR(1024) NOT NULL
    );`,
    (err, res) => {
        if (err) throw err;
        console.log(res);

        if (team_id && bot_token){
            var delete_query = sprintf("DELETE FROM bot_tokens WHERE team_id='%s';", team_id);

            client.query(delete_query, (err, res) => {
                if (err) throw err;
                console.log(res);

                var insert_query = sprintf("INSERT INTO bot_tokens(team_id, token) VALUES('%s', '%s');", team_id, bot_token);
                client.query(insert_query, (err, res) => {
                    if (err) throw err;
                    console.log(res);
                });
            });
        }
});

client.query(
    `CREATE TABLE IF NOT EXISTS user_tokens (
        team_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        token VARCHAR(1024) NOT NULL,
        PRIMARY KEY (team_id, user_id)
    );`,
    (err, res) => {
        if (err) throw err;
        console.log(res);

        if (team_id && user_token) {
            var delete_query = sprintf("DELETE FROM user_tokens WHERE team_id='%s';", team_id);

            client.query(delete_query, (err, res) => {
                if (err) throw err;
                console.log(res);

                var insert_query = sprintf("INSERT INTO user_tokens(team_id, user_id, token) VALUES('%s', '%s', '%s');", team_id, user_id, user_token);
                console.log('insert: ' + insert_query);
                client.query(insert_query, (err, res) => {
                    if (err) throw err;
                    console.log(res);
                });
            });
        }
});

/*    `CREATE TABLE IF NOT EXISTS substitutions (
        id serial PRIMARY KEY,
        team_id VARCHAR(64) NOT NULL,
        regex_match VARCHAR(128) NOT NULL,
        replace VARCHAR(128) NOT NULL
    );`,
];

for (let create_table_query of create_table_queries) {
    client.query(create_table_query, (err, res) => {
        if (err) throw err;
        console.log(res);
    });
}
*/
// add the default bot token
