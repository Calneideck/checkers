const NET = require('net');
const DB = require('./aws.js');
const RULES = require('./rules.js');
const DEBUG = true;

var ServerType = ['LOGIN', 'REGISTER', 'CREATE_GAME', 'REQUEST_GAMES', 'JOIN_RESUME_GAME', 'MOVE', 'SURRENDER'];
var ClientType = ['LOGIN_RESULT', 'GAME_CREATED', 'GAME_LIST', 'GAME_STATE', 'MOVE_RESULT'];

// Keep track of the chat clients
var clients = {};

// Start a TCP Server
var server = NET.createServer(function(socket) {
  // Put this new client in the list
  clients[socket.remoteAddress] = { username: '', offset: 0, gameId: null };
  console.log('client connected: ' + socket.remoteAddress);

  // Handle incoming messages from clients.
  socket.on('data', function(data) {
    clients[socket.remoteAddress].offset = 0;
    var id = readInt(data);

    if (DEBUG)
      console.log('Msg:', ServerType[id]);

    if (ServerType[id] == 'LOGIN') {
      var username = readString(data);
      var password = readString(data);
      clients[socket.remoteAddress].offset = 0;

      if (!username || username.length == 0 || !password || password.length == 0)
        return basicFail(socket, 'LOGIN_RESULT', 'Unable to login');

      DB.login(username, password, function(err, username) {
        if (err)
          basicFail(socket, 'LOGIN_RESULT', err);
        else {
          var buffer = Buffer.alloc(5);
          writeInt(socket, buffer, ClientType.indexOf('LOGIN_RESULT'));
          writeBool(socket, buffer, true);
          socket.write(buffer);
          console.log(username, 'logged in');
          clients[socket.remoteAddress].username = username;
        }
      });
    }

    else if (ServerType[id] == 'REGISTER') {
      var username = readString(data);
      var password = readString(data);
      clients[socket.remoteAddress].offset = 0;

      if (!username || username.length == 0 || !password || password.length == 0)
        return basicFail(socket, 'LOGIN_RESULT', 'Unable to register');

      DB.createUser(username, password, function(err, username) {
        if (err)
          basicFail(socket, 'LOGIN_RESULT', err);
        else {
          var buffer = Buffer.alloc(5);
          writeInt(socket, buffer, ClientType.indexOf('LOGIN_RESULT'));
          writeBool(socket, buffer, true);
          socket.write(buffer);
          console.log(username, 'registered');
          clients[socket.remoteAddress].username = username;
        }
      });
    }

    else if (ServerType[id] == 'CREATE_GAME') {
      var colour = readInt(data); // 0 = blue, 1 = white
      clients[socket.remoteAddress].offset = 0;

      if (colour != 0 && colour != 1)
        return basicFail(socket, 'GAME_CREATED', 'Unable to register');
        
      DB.createGame(clients[socket.remoteAddress].username, colour, function(err, gameId) {
        if (err)
          basicFail(socket, 'GAME_CREATED', err);
        else {
          var buffer = Buffer.alloc(14);
          writeInt(socket, buffer, ClientType.indexOf('GAME_CREATED'));
          writeBool(socket, buffer, true);
          writeString(socket, buffer, gameId);
          socket.write(buffer);
          console.log('game created:', gameId)
          clients[socket.remoteAddress].gameId = gameId;
        }
      });
    }

    else if (ServerType[id] == 'REQUEST_GAMES') {
      clients[socket.remoteAddress].offset = 0;
      DB.getUserGames(clients[socket.remoteAddress].username, function(err, gamesList) {
        if (err)
          basicFail(socket, 'GAME_LIST', err);
        else {
          var buffer = Buffer.alloc(9 + (gamesList ? gamesList.length : 0));
          writeInt(socket, buffer, ClientType.indexOf('GAME_LIST'));
          writeBool(socket, buffer, true);
          writeString(socket, buffer, gamesList);
          socket.write(buffer);
        }
      });
    }

    else if (ServerType[id] == 'JOIN_RESUME_GAME') {
      var gameId = readString(data);
      clients[socket.remoteAddress].offset = 0;

      if (gameId) {
        DB.getGame(gameId, clients[socket.remoteAddress].username, function(err, board, turn, blue, white, winner) {
          if (err || board.length != 99)
            basicFail(socket, 'GAME_STATE', err ? err : 'Unable to get game data');
          else {
            var buffer = Buffer.alloc(124 + blue.length + white.length);
            writeInt(socket, buffer, ClientType.indexOf('GAME_STATE'));
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
        basicFail(socket, 'GAME_STATE', 'Invalid, game ID');
    }

    else if (ServerType[id] == 'MOVE') {
      var tile = readInt(data);
      var moveCount = readInt(data);
      var moves = [];
      for (var i = 0; i < moveCount; i++)
        moves.push(readInt(data));

      if (DEBUG)
        console.log('move - tile:', tile, 'moves:', moves)
      
      clients[socket.remoteAddress].offset = 0;

      if (clients[socket.remoteAddress].gameId == null)
        return basicFail(socket, 'MOVE_RESULT', err ? err : 'Not in a game');

      DB.getGame(clients[socket.remoteAddress].gameId, clients[socket.remoteAddress].username, function(err, board, turn, blue, white, winner) {
        if (err || board.length != 99)
          basicFail(socket, 'MOVE_RESULT', err ? err : 'Unable to get game data');
        else {
          if (winner != -1)
            return basicFail(socket, 'MOVE_RESULT', err ? err : 'Game is over');

          var playerNumber = -1;
          if (blue == clients[socket.remoteAddress].username)
            playerNumber = 0;
          else if (white == clients[socket.remoteAddress].username)
            playerNumber = 1;
          else
            basicFail(socket, 'MOVE_RESULT', err ? err : 'User not in game');

          var result = RULES.move(board, playerNumber, turn, tile, moves);
          if (result.success) {
            turn = 1 - turn;
            DB.updateGame(clients[socket.remoteAddress].gameId, result.board, turn, result.winner, function(err) {
              if (err)
                basicFail(socket, 'MOVE_RESULT', err ? err : 'Unable to get game data');
              else {
                var buffer = Buffer.alloc(9);
                writeInt(socket, buffer, ClientType.indexOf('MOVE_RESULT'));
                writeBool(socket, buffer, true);
                writeInt(socket, buffer, result.winner);
                socket.write(buffer);
              }
            });
          }
          else
            basicFail(socket, 'MOVE_RESULT', 'Invalid move');
        }
      });
    }

    else if (ServerType[id] == 'SURRENDER') {

    }
  });

  function basicFail(socket, clientType, err) {
    var buffer = Buffer.alloc(9 + err.length);
    writeInt(socket, buffer, ClientType.indexOf(clientType))
    writeBool(socket, buffer, false);
    writeString(socket, buffer, err);
    socket.write(buffer);
  }

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
        var data = buffer.toString('utf8', clients[socket.remoteAddress].offset, clients[socket.remoteAddress].offset + length);
        clients[socket.remoteAddress].offset += length;
        return data;
      }

    return null;
  }

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

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    console.log(socket.remoteAddress, 'left');
    delete clients[socket.remoteAddress];
  });

  socket.on('error', function () {
    console.log(socket.remoteAddress, 'left (error)');
    delete clients[socket.remoteAddress];
  });
}).listen(5000);

console.log('Checkers server running at port 5000');