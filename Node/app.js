const NET = require('net');
const DB = require('./aws.js')

var ServerType = ['LOGIN', 'REGISTER', 'CREATE_GAME', 'REQUEST_GAMES', 'JOIN_RESUME_GAME', 'MOVE', 'SURRENDER'];
var ClientType = ['LOGIN_RESULT', 'GAME_CREATED', 'GAME_LIST', 'GAME_STATE'];

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
NET.createServer(function(socket) {
  // Put this new client in the list
  clients[socket] = {username: '', offset: 0};
  console.log('client connected: ' + socket.remoteAddress);

  // Handle incoming messages from clients.
  socket.on('data', function(data) {
    clients[socket].offset = 0;
    var id = readInt(data);

    if (ServerType[id] == 'LOGIN') {
      var username = readString(data);
      var password = readString(data);
      clients[socket].offset = 0;

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
          clients[socket].username = username;
        }
      });
    }

    else if (ServerType[id] == 'REGISTER') {
      var username = readString(data);
      var password = readString(data);
      clients[socket].offset = 0;

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
          clients[socket].username = username;
        }
      });
    }

    else if (ServerType[id] == 'CREATE_GAME') {
      var colour = readInt(data); // 0 = blue, 1 = white
      clients[socket].offset = 0;

      if (colour != 0 && colour != 1)
        return basicFail(socket, 'GAME_CREATED', 'Unable to register');
        
      DB.createGame(clients[socket].username, colour, function(err, gameId) {
        if (err)
          basicFail(socket, 'GAME_CREATED', err);
        else {
          var buffer = Buffer.alloc(14);
          writeInt(socket, buffer, ClientType.indexOf('GAME_CREATED'));
          writeBool(socket, buffer, true);
          writeString(socket, buffer, gameId);
          socket.write(buffer);
          console.log('game created:', gameId)
        }
      });
    }

    else if (ServerType[id] == 'REQUEST_GAMES') {
      clients[socket].offset = 0;
      DB.getUserGames(clients[socket].username, function(err, gamesList) {
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
      clients[socket].offset = 0;

      if (gameId) {
        DB.getGame(gameId, clients[socket].username, function(err, board, turn, blue, white) {
          if (err || board.length != 99)
            basicFail(socket, 'GAME_STATE', err ? err : 'Unable to get game data');
          else {
            console.log('board', board);
            console.log('turn', turn);
            console.log('blue', blue);
            console.log('white', white);
            var buffer = Buffer.alloc(120 + blue.length + white.length);
            writeInt(socket, buffer, ClientType.indexOf('GAME_STATE'));
            writeBool(socket, buffer, true);
            writeString(socket, buffer, board);
            writeInt(socket, buffer, turn);
            writeString(socket, buffer, blue);
            writeString(socket, buffer, white);
            socket.write(buffer);
          }
        });
      }
      else
        basicFail(socket, 'GAME_STATE', 'Invalid, game ID');
    }

    else if (ServerType[id] == 'MOVE') {

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
    if (clients[socket].offset + 4 <= buffer.length) {
      var data = buffer.readInt32LE(clients[socket].offset);
      clients[socket].offset += 4;
      return data;
    }
    else
      return null;
  }

  function readString(buffer) {
    var length = readInt(buffer);
    if (length)
      if (clients[socket].offset + length <= buffer.length) {
        var data = buffer.toString('utf8', clients[socket].offset, clients[socket].offset + length);
        clients[socket].offset += length;
        return data;
      }

    return null;
  }

  function writeInt(socket, buffer, data) {
    var offset = clients[socket].offset;
    buffer.writeInt32LE(data, offset);
    clients[socket].offset += 4;
  }

  function writeString(socket, buffer, data) {
    writeInt(socket, buffer, data ? data.length : 0);
    var offset = clients[socket].offset;
    if (data)
      buffer.write(data, offset, data.length, 'ascii');

    clients[socket].offset += data ? data.length : 0;
  }

  function writeBool(socket, buffer, data) {
    var offset = clients[socket].offset;
    if (data == true)
      buffer[offset] = 1;
    else if (data == false)
      buffer[offset] = 0;

    clients[socket].offset += 1;
  }

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    clients.splice(clients.indexOf(socket), 1);
  });

  socket.on('error', function () {
    clients.splice(clients.indexOf(socket), 1);
  });
}).listen(5000);

console.log('Checkers server running at port 5000');