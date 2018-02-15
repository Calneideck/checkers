const NET = require('net');
const DB = require('./aws.js');
const RULES = require('./rules.js');
const DEBUG = true;

const ServerType = {
  LOGIN: 0,
  REGISTER: 1,
  CREATE_GAME: 2,
  REQUEST_GAMES: 3,
  JOIN_RESUME_GAME: 4,
  MOVE: 5,
  SURRENDER: 6,
  LEAVE_GAME: 7
};
const ClientType = {
  LOGIN_RESULT: 0,
  GAME_CREATED: 1,
  GAME_LIST: 2,
  GAME_STATE: 3,
  MOVE_RESULT: 4,
  GAME_UPDATE: 5,
  SURRENDER_RESULT: 6,
  LEAVE_GAME_RESULT: 7
};

// Keep track of the chat clients
var clients = {};
var sockets = [];

// Start a TCP Server
var server = NET.createServer(function(socket) {
  // Put this new client in the list
  clients[socket.remoteAddress] = { username: null, gameId: null };
  sockets.push(socket);
  console.log('client connected: ' + socket.remoteAddress);

  // Handle incoming messages from clients.
  socket.on('data', function(data) {
    var obj = { offset: 0 };
    var id = readInt(socket, data, obj);

    if (DEBUG)
      console.log('Msg:', idStringFromNumber(id));

    if (id == ServerType.LOGIN) {
      var username = readString(socket, data, obj);
      var password = readString(socket, data, obj);

      if (!username || username.length == 0 || !password || password.length == 0)
        return basicFail(socket, ClientType.LOGIN_RESULT, 'Unable to login');

      DB.login(username, password, function(err, username) {
        if (err)
          basicFail(socket, ClientType.LOGIN_RESULT, err);
        else {
          var buffer = Buffer.alloc(5);
          obj.offset = 0;
          writeInt(socket, buffer, obj, ClientType.LOGIN_RESULT);
          writeBool(socket, buffer, obj, true);
          socket.write(buffer);
          console.log(username, 'logged in');
          clients[socket.remoteAddress].username = username;
        }
      });
    }

    else if (id == ServerType.REGISTER) {
      var username = readString(socket, data, obj);
      var password = readString(socket, data, obj);

      if (!username || username.length == 0 || !password || password.length == 0)
        return basicFail(socket, ClientType.LOGIN_RESULT, 'Unable to register');

      DB.createUser(username, password, function(err, username) {
        if (err)
          basicFail(socket, ClientType.LOGIN_RESULT, err);
        else {
          var buffer = Buffer.alloc(5);
          obj.offset = 0;
          writeInt(socket, buffer, obj, ClientType.LOGIN_RESULT);
          writeBool(socket, buffer, obj, true);
          socket.write(buffer);
          console.log(username, 'registered');
          clients[socket.remoteAddress].username = username;
        }
      });
    }

    else if (id == ServerType.CREATE_GAME) {
      var colour = readInt(socket, data, obj); // 0 = blue, 1 = white

      if (colour != 0 && colour != 1)
        return basicFail(socket, ClientType.GAME_CREATED, 'Colour not specified');

      if (clients[socket.remoteAddress].username == null)
        return basicFail(socket, ClientType.GAME_CREATED, 'You must be logged in to do that');
        
      DB.createGame(clients[socket.remoteAddress].username, colour, function(err, gameId) {
        if (err)
          basicFail(socket, ClientType.GAME_CREATED, err);
        else {
          var buffer = Buffer.alloc(14);
          obj.offset = 0;
          writeInt(socket, buffer, obj, ClientType.GAME_CREATED);
          writeBool(socket, buffer, obj, true);
          writeString(socket, buffer, obj, gameId);
          socket.write(buffer);
          console.log('game created:', gameId)
          clients[socket.remoteAddress].gameId = gameId;
        }
      });
    }

    else if (id == ServerType.REQUEST_GAMES) {
      if (clients[socket.remoteAddress].username == null)
        return basicFail(socket, ClientType.GAME_LIST, 'You must be logged in to do that');

      DB.getUserGames(clients[socket.remoteAddress].username, function(err, gamesList) {
        if (err)
          basicFail(socket, ClientType.GAME_LIST, err);
        else {
          var buffer = Buffer.alloc(9 + (gamesList ? gamesList.length : 0));
          obj.offset = 0;
          writeInt(socket, buffer, obj, ClientType.GAME_LIST);
          writeBool(socket, buffer, obj, true);
          writeString(socket, buffer, obj, gamesList);
          socket.write(buffer);
        }
      });
    }

    else if (id == ServerType.JOIN_RESUME_GAME) {
      var gameId = readString(socket, data, obj);

      if (clients[socket.remoteAddress].username == null)
        return basicFail(socket, ClientType.GAME_STATE, 'You must be logged in to do that');

      if (gameId) {
        gameId = gameId.toUpperCase();
        DB.getGame(gameId, clients[socket.remoteAddress].username, function(err, board, turn, blue, white, winner) {
          if (err || board.length != 99)
            basicFail(socket, ClientType.GAME_STATE, err ? err : 'Unable to get game data');
          else {
            var buffer = Buffer.alloc(124 + blue.length + white.length);
            obj.offset = 0;
            writeInt(socket, buffer, obj, ClientType.GAME_STATE);
            writeBool(socket, buffer, obj, true);
            writeString(socket, buffer, obj, board);
            writeInt(socket, buffer, obj, turn);
            writeString(socket, buffer, obj, blue);
            writeString(socket, buffer, obj, white);
            writeInt(socket, buffer, obj, winner);
            socket.write(buffer);
            clients[socket.remoteAddress].gameId = gameId;
          }
        });
      }
      else
        basicFail(socket, ClientType.GAME_STATE, 'Invalid, game ID');
    }

    else if (id == ServerType.MOVE) {
      var tile = readInt(socket, data, obj);
      var moveCount = readInt(socket, data, obj);
      var moves = [];
      for (var i = 0; i < moveCount; i++)
        moves.push(readInt(socket, data, obj));

      if (clients[socket.remoteAddress].username == null)
        return basicFail(socket, ClientType.MOVE_RESULT, 'You must be logged in to do that');
      
      if (clients[socket.remoteAddress].gameId == null)
        return basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Not in a game');

      // get game information
      DB.getGame(clients[socket.remoteAddress].gameId, clients[socket.remoteAddress].username, function(err, board, turn, blue, white, winner) {
        if (err || board.length != 99)
          basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Unable to get game data');
        else {
          if (winner != -1)
            return basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Game is over');

          // Set player number from username
          var playerNumber = -1;
          if (blue == clients[socket.remoteAddress].username)
            playerNumber = 0;
          else if (white == clients[socket.remoteAddress].username)
            playerNumber = 1;
          else
            basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Not in game');

          // Make the move
          var result = RULES.move(board, playerNumber, turn, tile, moves);
          if (result.success) {
            turn = 1 - turn;
            // Update the game
            DB.updateGame(clients[socket.remoteAddress].gameId, result.board, turn, result.winner, function(err) {
              if (err)
                basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Unable to get game data');
              else {
                var buffer = Buffer.alloc(9);
                obj.offset = 0;
                writeInt(socket, buffer, obj, ClientType.MOVE_RESULT);
                writeBool(socket, buffer, obj, true);
                writeInt(socket, buffer, obj, result.winner);
                socket.write(buffer);

                // Let opponent know it's their turn
                var otherUser = turn == 0 ? blue : white;
                if (otherUser)
                  announceMove(otherUser, clients[socket.remoteAddress].gameId);
              }
            });
          }
          else
            basicFail(socket, ClientType.MOVE_RESULT, 'Invalid move');
        }
      });
    }

    else if (id == ServerType.SURRENDER) {
      if (clients[socket.remoteAddress].username == null)
        return basicFail(socket, ClientType.SURRENDER_RESULT, 'You must be logged in to do that');
      
      if (clients[socket.remoteAddress].gameId == null)
        return basicFail(socket, ClientType.SURRENDER_RESULT, err ? err : 'Not in a game');

      DB.surrender(clients[socket.remoteAddress].gameId, clients[socket.remoteAddress].username, function(err) {
        if (err)
          basicFail(socket, ClientType.SURRENDER_RESULT, err);
        else {
          var buffer = Buffer.alloc(5);
          obj.offset = 0;
          writeInt(socket, buffer, obj, ClientType.SURRENDER_RESULT);
          writeBool(socket, buffer, obj, true);
          socket.write(buffer);
        }
      });
    }

    else if (id == ServerType.LEAVE_GAME) {
      if (clients[socket.remoteAddress].username == null)
        return basicFail(socket, ClientType.LEAVE_GAME_RESULT, 'You must be logged in to do that');
      
      if (clients[socket.remoteAddress].gameId == null)
        return basicFail(socket, ClientType.LEAVE_GAME_RESULT, err ? err : 'Not in a game');

      DB.leaveGame(clients[socket.remoteAddress].gameId, clients[socket.remoteAddress].username, function(err) {
        if (err)
          basicFail(sockket, ClientType.LEAVE_GAME_RESULT, err);
        else {
          var buffer = Buffer.alloc(5);
          obj.offset = 0;
          writeInt(socket, buffer, obj, ClientType.LEAVE_GAME_RESULT);
          writeBool(socket, buffer, obj, true);
          socket.write(buffer);
        }
      });
    }
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    console.log(socket.remoteAddress, 'left');
    delete clients[socket.remoteAddress];
    sockets.splice(sockets.indexOf(socket), 1);
  });

  socket.on('error', function () {
    console.log(socket.remoteAddress, 'left (error)');
    delete clients[socket.remoteAddress];
    sockets.splice(sockets.indexOf(socket), 1);
  });
}).listen(5000);

function readInt(socket, buffer, obj) {
  if (obj.offset + 4 <= buffer.length) {
    var data = buffer.readInt32LE(obj.offset);
    obj.offset += 4;
    return data;
  }
  else
    return null;
}

function readString(socket, buffer, obj) {
  var length = readInt(socket, buffer, obj);
  if (length)
    if (obj.offset + length <= buffer.length) {
      var data = buffer.toString('ascii', obj.offset, obj.offset + length);
      obj.offset += length;
      return data;
    }

  return null;
}

function writeInt(socket, buffer, obj, data) {
  if (obj.offset + 3 < buffer.length) {
    buffer.writeInt32LE(data, obj.offset);
    obj.offset += 4;
  }
}

function writeString(socket, buffer, obj, data) {
  writeInt(socket, buffer, obj, data ? data.length : 0);
  if (data && (obj.offset + data.length <= buffer.length)) {
    buffer.write(data, obj.offset, data.length, 'ascii');
    obj.offset += data ? data.length : 0;
  }
}

function writeBool(socket, buffer, obj, data) {
  if (obj.offset < buffer.length) {
    if (data == true)
      buffer[obj.offset] = 1;
    else if (data == false)
      buffer[obj.offset] = 0;
  
    obj.offset += 1;
  }
}

function basicFail(socket, clientType, err) {
  var buffer = Buffer.alloc(9 + err.length);
  var obj = { offset: 0 };
  writeInt(socket, buffer, obj, clientType)
  writeBool(socket, buffer, obj, false);
  writeString(socket, buffer, obj, err);
  socket.write(buffer);
}

function announceMove(username, gameId) {
  for (var i = 0; i < sockets.length; i++)
    if (clients[sockets[i].remoteAddress].username == username) {
      var buffer = Buffer.alloc(13);
      var obj = { offset: 0 };
      writeInt(sockets[i], buffer, obj, ClientType.GAME_UPDATE);
      writeString(sockets[i], buffer, obj, gameId);
      sockets[i].write(buffer);
      console.log('announced update to', clients[sockets[i].remoteAddress].username, 'for', gameId);
      break;
    }
}

function idStringFromNumber(number) {
  for (var key in ServerType)
    if (ServerType[key] == number)
      return key.toString();

  return '';
}

console.log('Checkers server running at port 5000');