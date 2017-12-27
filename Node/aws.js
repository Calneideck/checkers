const AWS = require('aws-sdk');
var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '2', '3', '4', '5', '6', '7', '8', '9'];

module.exports = {
    login: function(username, password, callback) {
        username = username.toLowerCase();
        var db = new AWS.DynamoDB({ region: 'ap-southeast-2' });
        var params = {
            Key: {
                "username": { S: username }
            },
            ProjectionExpression: "password",
            TableName: 'checkers_users'
        };
        db.getItem(params, function (err, data) {
            if (err || Object.getOwnPropertyNames(data).length == 0) {
                if (err)
                    console.log(err);

                callback(null);
            }
            else if (data.Item.password.S.toLowerCase() == password.toLowerCase())
                callback(username);
            else
                callback(null);
        });
    },

    createUser: function (username, password, done) {
        username = username.toLowerCase();
        findOne(username, function (err, user_result) {
            if (err)
                return done(null);

            if (user_result) {
                console.log('user already exists');
                return done(null);
            }

            var db = new AWS.DynamoDB({ region: 'ap-southeast-2' });
            var params = {
                Item: {
                    'username': { S: username },
                    'password': { S: password }
                },
                TableName: 'checkers_users'
            };
            db.putItem(params, function (err, data) {
                if (err) {
                    console.log(err);
                    done(null);
                }
                else
                    done(username);
            });
        });
    },

    createGame: function (username) {
        var db = new AWS.DynamoDB({ region: 'ap-southeast-2' });
        var params = {
            Item: {
                'id': { S: id },
                'blue': { S: username }
            },
            TableName: 'checkers_games'
        };
        db.putItem(params, function (err, data) {
            if (err) {
                console.log(err);
                done(null);
            }
            else
                done(username);
        });
    },
}

function findOne(username, callback) {
    var db = new AWS.DynamoDB({ region: 'ap-southeast-2' });
    var params = {
        Key: {
            "username": { S: username }
        },
        TableName: 'checkers_users'
    };
    db.getItem(params, function (err, data) {
        if (err || Object.getOwnPropertyNames(data).length == 0) {
            if (err)
                console.log(err);

            callback(err, null);
        }
        else
            callback(err, data.Item.username.S);
    });
}

function getGameID() {
    var id = '';
    for (var i = 0; i < 10; i++)
        id += chars[Math.ceil(Math.random() * chars.length)].toUpperCase();

    return id;
}