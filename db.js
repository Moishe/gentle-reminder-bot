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

DB.prototype.updateOrAddBotToken = function(team, token) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var query = self.sprintf(`
            WITH updated_tokens (team_id, token) as (
                values
                     ('%s', '%s')
            ),
            upsert as
            (
                update bot_tokens
                    set token = updated_tokens.token
                FROM updated_tokens
                WHERE bot_tokens.team_id = updated_tokens.team_id
                RETURNING bot_tokens.*
            )
            INSERT INTO bot_tokens (team_id, token)
            SELECT team_id, token
            FROM updated_tokens
            WHERE NOT EXISTS (SELECT 1
                FROM upsert up
                WHERE up.team_id = updated_tokens.team_id)
        `, team, token);

        self.client.query(query, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
};

DB.prototype.updateOrAddUserToken = function(team, user, token) {
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
        `, team, user, token);

        self.client.query(query, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
};

DB.prototype.removeUser = function(team, user) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var query = self.sprintf(`
            DELETE FROM user_tokens WHERE team_id='%s' AND user_id='%s'
        `, team, user);

        self.client.query(query, (err, res) => {
            if (err) {
                console.log('error: ', err);
                reject(err);
                return;
            }

            resolve();
        });
    });
};

DB.prototype.removeAllUsersForTeam = function(team) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var query = self.sprintf(`
            DELETE FROM user_tokens WHERE team_id='%s'
        `, team);

        self.client.query(query, (err, res) => {
            if (err) {
                console.log('error: ', err);
                reject(err);
                return;
            }

            console.log(res);
            resolve();
        });
    });
};

DB.prototype.showUsers = function(team) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var query = self.sprintf(`
            SELECT * FROM user_tokens WHERE team_id='%s'
        `, team);

        self.client.query(query, (err, res) => {
            if (err) {
                console.log('error: ', err);
                reject(err);
                return;
            }

            resolve();
        });
    });
};

DB.prototype.removeTeam = function(team) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var query = self.sprintf(`
            DELETE FROM bot_tokens WHERE team_id='%s'
        `, team);

        self.client.query(query, (err, res) => {
            if (err) {
                console.log('error: ', err);
                reject(err);
                return;
            }

            console.log(res);
            resolve();
        });
    });
};

exports.DB = DB;
