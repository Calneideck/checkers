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
                if (err) {
                    console.log('login: ', err);
                    callback('Could not login', null);
                }
                else
                    callback('Username or password incorrect', null);
            }
            // Compare hashes
            else if (data.Item.password.S.toLowerCase() == password.toLowerCase())
                callback(null, username);
            else
                callback('Username or password incorrect', null);
        });
    },

    createUser: function (username, password, callback) {
        username = username.toLowerCase();
        if (username.length == 0 || username.length > 20)
            return callback('Username must be between 1 and 20 characters', null);

        checkUser(username, function (err, user_result) {
            if (err) {
                console.log('createUserCheckUser: ', err);
                return callback('Unable to register', null);
            }

            if (user_result)
                return callback('Username is taken', null);

            var params = {
                Item: {
                    'username': { S: username },
                    'password': { S: password }
                },
                TableName: 'checkers_users'
            };
            DB.putItem(params, function (err, data) {
                if (err) {
                    console.log('createUserPutItem: ', err);
                    callback('Unable to register', null);
                }
                else
                    callback(null, username);
            });
        });
    },

    createGame: function (username, colour, callback) {
        var board = createBoard();
        var params = {
            Item: {
                'game_id': { S: '00000' },
                'turn': { S: '0' },
                'board': { S: board },
                'winner': { S: '-1' }
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
            if (err) {
                console.log('createGameCheckGameId: ', err);
                return callback('Unable to create game');
            }

            if (result)
                // gameId already exists so retry
                return module.exports.createGame(username, colour, callback);

            // All clear
            params.Item.game_id.S = gameId;
            // Create the game in the game table
            DB.putItem(params, function (err, data) {
                if (err) {
                    console.log('createGamePutItem', err);
                    callback('Unable to create game');
                }
                else
                    addUserToNewGame(callback, username, gameId);
            });
        });
    },

    getUserGames: function(username, callback) {
        username = username.toLowerCase();
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
                    console.log('getUserGames: ', err);

                callback('Unable to get games');
            }
            else if (data.Item.games)
                callback(null, data.Item.games.S);
            else
                callback(null, null);
        });
    },

    getGame: function(gameId, username, callback) {
        gameId = gameId.toUpperCase();
        username = username.toLowerCase();
        var params = {
            Key: {
                'game_id': { S: gameId }
            },
            ProjectionExpression: 'board, turn, blue, white, winner',
            TableName: 'checkers_games'
        };
        DB.getItem(params, function (err, data) {
            if (err || Object.getOwnPropertyNames(data).length == 0) {
                if (err)
                    console.log('getGame: ', err);

                callback('Game does not exist or unable to get data');
            }
            else {
                var blue = '';
                if (data.Item.blue)
                    blue = data.Item.blue.S;

                var white = '';
                if (data.Item.white)
                    white = data.Item.white.S;

                var board = data.Item.board.S;
                var turn = data.Item.turn.S;
                var winner = data.Item.winner.S;

                if (blue == username || white == username)
                    // user is in game already - all good
                    callback(null, board, turn, blue, white, winner);
                else if (blue == '')
                    addUserToExistingGame(callback, gameId, board, turn, username, white, winner, true);
                else if (white == '')
                    addUserToExistingGame(callback, gameId, board, turn, blue, username, winner, false);
                else
                    callback('Game is full', null, 0, null, null, -1);
            }
        });
    },

    updateGame: function(gameId, board, turn, winner, callback) {
        gameId = gameId.toUpperCase();
        var params = {
            Key: {
                'game_id': { S: gameId }
            },
            TableName: 'checkers_games',
            UpdateExpression: 'set board = :board, turn = :turn, winner = :winner',
            ExpressionAttributeValues: { 
                ':board': { S: board },
                ':turn': { S: turn.toString() },
                ':winner': { S: winner.toString() }
            }
        };
        DB.updateItem(params, function(err, data) {
            if (err) {
                console.log('updateGame:', err);
                callback('Unable to update game');
            }
            else
                callback(null);
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

function addUserToNewGame(callback, username, gameId) {
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

            callback('Unable to create game');
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
                    callback('Unable to create game');
                }
                else
                    callback(null, gameId);
            });
        }
    });
}

function addUserToExistingGame(callback, gameId, board, turn, blue, white, winner, updateBlue) {
    var params = {
        Key: {
            'game_id': { S: gameId }
        },
        TableName: 'checkers_games',
        UpdateExpression: updateBlue ? 'set blue = :blue' : 'set white = :white',
        ExpressionAttributeValues: updateBlue ? { 
            ':blue': { S: blue}
        } : {
            ':white': { S: white}
        }
    };

    var username = updateBlue ? blue : white;
    DB.updateItem(params, function(err, data) {
        if (err) {
            console.log('updateUsername: ', err);
            callback('Unable to get game data');
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
    
                    callback('Unable to get game data');
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
                            console.log('updateBlueUsernameGamesList: ', err);
                            callback('Unable to get game data');
                        }
                        else
                            callback(null, board, turn, blue, white, winner);
                    });
                }
            });
        }
    });
}

function getGameID() {
    var id = '';
    for (var i = 0; i < 5; i++)
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