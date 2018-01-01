const AWS = require('aws-sdk');
const DB = new AWS.DynamoDB({ region: 'ap-southeast-2' });
var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '2', '3', '4', '5', '6', '7', '8', '9'];

module.exports = {
    login: function(username, password, callback) {
        username = username.toLowerCase();
        var params = {
            Key: {
                'username': { S: username }
            },
            ProjectionExpression: 'password',
            TableName: 'checkers_users'
        };
        DB.getItem(params, function (err, data) {
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
        if (username.length == 0 || username.length > 20) {
            return done(null);
        }

        checkUser(username, function (err, user_result) {
            if (err)
                return done(null);

            if (user_result) {
                console.log('user already exists');
                return done(null);
            }

            var params = {
                Item: {
                    'username': { S: username },
                    'password': { S: password }
                },
                TableName: 'checkers_users'
            };
            DB.putItem(params, function (err, data) {
                if (err) {
                    console.log(err);
                    done(null);
                }
                else
                    done(username);
            });
        });
    },

    createGame: function (username, colour, done) {
        var board = createBoard();
        var params = {
            Item: {
                'game_id': { S: '0000000000' },
                'turn': { S: '0' },
                'board': { S: board }
            },
            TableName: 'checkers_games'
        };
        if (colour == 0) {
            params.Item.blue = {};
            params.Item.blue.S = username;
        }
        else if (colour == 1) {
            params.Item.white = {};
            params.Item.white.S = username;
        }

        var gameId = getGameID();
        // Check if game already exists with this id
        checkGame(gameId, function(err, result) {
            if (err)
                return done(null);

            if (result) {
                module.exports.createGame(username, colour, done);
                return;
            }

            params.Item.game_id.S = gameId;
            // Create the game in the game table
            DB.putItem(params, function (err, data) {
                if (err) {
                    console.log('createGame', err);
                    done(null);
                }
                else {
                    // Get 'games' attribute in users table
                    var params = {
                        Key: {
                            'username': { S: username }
                        },
                        ProjectionExpression: 'games',
                        TableName: 'checkers_users'
                    };
                    DB.getItem(params, function (err, data) {
                        if (err || Object.getOwnPropertyNames(data).length == 0) {
                            if (err)
                                console.log('createGameGetUser:', err);
            
                            done(null);
                        }
                        else {
                            // Update 'games' attribute in users table
                            var games = gameId;
                            if (data.Item.games) {
                                games = data.Item.games.S.split(',');
                                games.push(gameId);
                                games = games.join(',');
                            }
                            var params = {
                                Key: {
                                    'username': { S: username }
                                },
                                TableName: 'checkers_users',
                                UpdateExpression: 'set games = :games',
                                ExpressionAttributeValues: { 
                                    ':games': { S: games}
                                }
                            };
                            DB.updateItem(params, function(err, data) {
                                if (err) {
                                    console.log('createGameUpdateUser:', err);
                                    done(null);
                                }
                                else
                                    done(gameId);
                            });
                        }
                    });
                }
            });
        });
    }
}

function checkUser(username, callback) {
    var params = {
        Key: {
            'username': { S: username }
        },
        TableName: 'checkers_users'
    };
    DB.getItem(params, function (err, data) {
        if (err || Object.getOwnPropertyNames(data).length == 0) {
            if (err)
                console.log(err);

            callback(err, null);
        }
        else
            callback(err, data.Item.username.S);
    });
}

function checkGame(gameId, callback) {
    var params = {
        Key: {
            'game_id': { S: gameId }
        },
        TableName: 'checkers_games'
    };
    DB.getItem(params, function (err, data) {
        if (err || Object.getOwnPropertyNames(data).length == 0) {
            if (err)
                console.log('checkGame', err);

            callback(err, null);
        }
        else
            callback(err, data.Item.game_id.S);
    });
}

function getGameID() {
    var id = '';
    for (var i = 0; i < 10; i++)
        id += chars[Math.floor(Math.random() * chars.length)].toUpperCase();

    return id;
}

function createBoard() {
    var board = [];
    for (var i = 0; i < 20; i++)
        board.push(1);
    for (var i = 0; i < 10; i++)
        board.push(0);
    for (var i = 0; i < 20; i++)
        board.push(3);

    var boardString = board.join(',');
    return boardString;
}