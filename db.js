function DB() {
    this.client = undefined;
    this.sprintf = require("sprintf-js").sprintf;
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
        query = self.sprintf("SELECT team_id, alert, regex_match, replacements FROM substitutions WHERE team_id='%s';", team_id);
        self.client.query(query, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(res.rows);
        })
    });
};

DB.prototype.updateOrAddToken = function(team, user, token) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var query = self.sprintf(`
            WITH updated_tokens (team_id, user_id, token) as (
                values
                     ('%s', '%s', '%s')
            ),
            upsert as
            (
                update user_tokens
                    set token = updated_tokens.token
                FROM updated_tokens
                WHERE user_tokens.team_id = updated_tokens.team_id AND user_tokens.user_id = updated_tokens.user_id
                RETURNING user_tokens.*
            )
            INSERT INTO user_tokens (team_id, user_id, token)
            SELECT team_id, user_id, token
            FROM updated_tokens
            WHERE NOT EXISTS (SELECT 1
                FROM upsert up
                WHERE up.team_id = updated_tokens.team_id AND up.user_id = updated_tokens.user_id)
        `, team,user, token);

        console.log(query);

        self.client.query(query, (err, res) => {
            console.log('query', err, res);
            if (err) {
                reject(err);
                return;
            }

            resolve(res.rows);
        });
    });
};

exports.DB = DB;
