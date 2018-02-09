const NET = require('net');
const DB = require('./aws.js');
const RULES = require('./rules.js');
const DEBUG = true;

//var ServerType = ['LOGIN', 'REGISTER', 'CREATE_GAME', 'REQUEST_GAMES', 'JOIN_RESUME_GAME', 'MOVE', 'SURRENDER'];
const ServerType = {
  LOGIN: 0,
  REGISTER: 1,
  CREATE_GAME: 2,
  REQUEST_GAMES: 3,
  JOIN_RESUME_GAME: 4,
  MOVE: 5,
  SURRENDER: 6
};
//var ClientType = ['LOGIN_RESULT', 'GAME_CREATED', 'GAME_LIST', 'GAME_STATE', 'MOVE_RESULT', 'GAME_UPDATE'];
const ClientType = {
  LOGIN_RESULT: 0,
  GAME_CREATED: 1,
  GAME_LIST: 2,
  GAME_STATE: 3,
  MOVE_RESULT: 4,
  GAME_UPDATE: 5
};

// Keep track of the chat clients
var clients = {};
var sockets = [];

// Start a TCP Server
var server = NET.createServer(function(socket) {
  // Put this new client in the list
  clients[socket.remoteAddress] = { username: '', offset: 0, gameId: null };
  sockets.push(socket);
  console.log('client connected: ' + socket.remoteAddress);

  // Handle incoming messages from clients.
  socket.on('data', function(data) {
    clients[socket.remoteAddress].offset = 0;
    var id = readInt(data);

    if (DEBUG)
      console.log('Msg:', id);

    if (id == ServerType.LOGIN) {
      var username = readString(data);
      var password = readString(data);
      clients[socket.remoteAddress].offset = 0;

      if (!username || username.length == 0 || !password || password.length == 0)
        return basicFail(socket, ClientType.LOGIN_RESULT, 'Unable to login');

      DB.login(username, password, function(err, username) {
        if (err)
          basicFail(socket, ClientType.LOGIN_RESULT, err);
        else {
          var buffer = Buffer.alloc(5);
          writeInt(socket, buffer, ClientType.LOGIN_RESULT);
          writeBool(socket, buffer, true);
          socket.write(buffer);
          console.log(username, 'logged in');
          clients[socket.remoteAddress].username = username;
        }
      });
    }

    else if (id == ServerType.REGISTER) {
      var username = readString(data);
      var password = readString(data);
      clients[socket.remoteAddress].offset = 0;

      if (!username || username.length == 0 || !password || password.length == 0)
        return basicFail(socket, ClientType.LOGIN_RESULT, 'Unable to register');

      DB.createUser(username, password, function(err, username) {
        if (err)
          basicFail(socket, ClientType.LOGIN_RESULT, err);
        else {
          var buffer = Buffer.alloc(5);
          writeInt(socket, buffer, ClientType.LOGIN_RESULT);
          writeBool(socket, buffer, true);
          socket.write(buffer);
          console.log(username, 'registered');
          clients[socket.remoteAddress].username = username;
        }
      });
    }

    else if (id == ServerType.CREATE_GAME) {
      var colour = readInt(data); // 0 = blue, 1 = white
      clients[socket.remoteAddress].offset = 0;

      if (colour != 0 && colour != 1)
        return basicFail(socket, ClientType.GAME_CREATED, 'Unable to register');
        
      DB.createGame(clients[socket.remoteAddress].username, colour, function(err, gameId) {
        if (err)
          basicFail(socket, ClientType.GAME_CREATED, err);
        else {
          var buffer = Buffer.alloc(14);
          writeInt(socket, buffer, ClientType.GAME_CREATED);
          writeBool(socket, buffer, true);
          writeString(socket, buffer, gameId);
          socket.write(buffer);
          console.log('game created:', gameId)
          clients[socket.remoteAddress].gameId = gameId;
        }
      });
    }

    else if (id == ServerType.REQUEST_GAMES) {
      clients[socket.remoteAddress].offset = 0;
      DB.getUserGames(clients[socket.remoteAddress].username, function(err, gamesList) {
        if (err)
          basicFail(socket, ClientType.GAME_LIST, err);
        else {
          var buffer = Buffer.alloc(9 + (gamesList ? gamesList.length : 0));
          writeInt(socket, buffer, ClientType.GAME_LIST);
          writeBool(socket, buffer, true);
          writeString(socket, buffer, gamesList);
          socket.write(buffer);
        }
      });
    }

    else if (id == ServerType.JOIN_RESUME_GAME) {
      var gameId = readString(data);
      clients[socket.remoteAddress].offset = 0;

      if (gameId) {
        DB.getGame(gameId, clients[socket.remoteAddress].username, function(err, board, turn, blue, white, winner) {
          if (err || board.length != 99)
            basicFail(socket, ClientType.GAME_STATE, err ? err : 'Unable to get game data');
          else {
            var buffer = Buffer.alloc(124 + blue.length + white.length);
            writeInt(socket, buffer, ClientType.GAME_STATE);
            writeBool(socket, buffer, true);
            writeString(socket, buffer, board);
            writeInt(socket, buffer, turn);
            writeString(socket, buffer, blue);
            writeString(socket, buffer, white);
            writeInt(socket, buffer, winner);
            socket.write(buffer);
            clients[socket.remoteAddress].gameId = gameId;
          }
        });
      }
      else
        basicFail(socket, ClientType.GAME_STATE, 'Invalid, game ID');
    }

    else if (id == ServerType.MOVE) {
      var tile = readInt(data);
      var moveCount = readInt(data);
      var moves = [];
      for (var i = 0; i < moveCount; i++)
        moves.push(readInt(data));

      if (DEBUG)
        console.log('move - tile:', tile, 'moves:', moves)
      
      clients[socket.remoteAddress].offset = 0;

      if (clients[socket.remoteAddress].gameId == null)
        return basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Not in a game');

      DB.getGame(clients[socket.remoteAddress].gameId, clients[socket.remoteAddress].username, function(err, board, turn, blue, white, winner) {
        if (err || board.length != 99)
          basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Unable to get game data');
        else {
          if (winner != -1)
            return basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Game is over');

          var playerNumber = -1;
          if (blue == clients[socket.remoteAddress].username)
            playerNumber = 0;
          else if (white == clients[socket.remoteAddress].username)
            playerNumber = 1;
          else
            basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'User not in game');

          var result = RULES.move(board, playerNumber, turn, tile, moves);
          if (result.success) {
            turn = 1 - turn;
            DB.updateGame(clients[socket.remoteAddress].gameId, result.board, turn, result.winner, function(err) {
              if (err)
                basicFail(socket, ClientType.MOVE_RESULT, err ? err : 'Unable to get game data');
              else {
                var buffer = Buffer.alloc(9);
                writeInt(socket, buffer, ClientType.MOVE_RESULT);
                writeBool(socket, buffer, true);
                writeInt(socket, buffer, result.winner);
                socket.write(buffer);

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

    }
  });

  function readInt(buffer) {
    if (clients[socket.remoteAddress].offset + 4 <= buffer.length) {
      var data = buffer.readInt32LE(clients[socket.remoteAddress].offset);
      clients[socket.remoteAddress].offset += 4;
      return data;
    }
    else
      return null;
  }

  function readString(buffer) {
    var length = readInt(buffer);
    if (length)
      if (clients[socket.remoteAddress].offset + length <= buffer.length) {
        var data = buffer.toString('ascii', clients[socket.remoteAddress].offset, clients[socket.remoteAddress].offset + length);
        clients[socket.remoteAddress].offset += length;
        return data;
      }

    return null;
  }

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

function writeInt(socket, buffer, data) {
  var offset = clients[socket.remoteAddress].offset;
  buffer.writeInt32LE(data, offset);
  clients[socket.remoteAddress].offset += 4;
}

function writeString(socket, buffer, data) {
  writeInt(socket, buffer, data ? data.length : 0);
  var offset = clients[socket.remoteAddress].offset;
  if (data)
    buffer.write(data, offset, data.length, 'ascii');

  clients[socket.remoteAddress].offset += data ? data.length : 0;
}

function writeBool(socket, buffer, data) {
  var offset = clients[socket.remoteAddress].offset;
  if (data == true)
    buffer[offset] = 1;
  else if (data == false)
    buffer[offset] = 0;

  clients[socket.remoteAddress].offset += 1;
}

function basicFail(socket, clientType, err) {
  var buffer = Buffer.alloc(9 + err.length);
  writeInt(socket, buffer, clientType)
  writeBool(socket, buffer, false);
  writeString(socket, buffer, err);
  socket.write(buffer);
}

function announceMove(username, gameId) {
  for (var i = 0; i < sockets.length; i++)
    if (clients[sockets[i].remoteAddress].username == username) {
      clients[sockets[i].remoteAddress].offset = 0;
      var buffer = Buffer.alloc(13);
      writeInt(sockets[i], buffer, ClientType.GAME_UPDATE);
      writeString(sockets[i], buffer, gameId);
      sockets[i].write(buffer);
      console.log('announced update to', clients[sockets[i].remoteAddress].username, 'for', gameId);
      break;
    }
}

console.log('Checkers server running at port 5000');