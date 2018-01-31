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

      if (!username || username.length == 0 || !password || password.length == 0) {
        var buffer = Buffer.alloc(8);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer.writeInt32LE(0, 4);
        socket.write(buffer);
        return;
      }

      DB.login(username, password, function(result) {
        var buffer = Buffer.alloc(8);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer.writeInt32LE(result ? 1 : 0, 4);
        socket.write(buffer);
        if (result) {
          console.log(result, 'logged in');
          clients[socket].username = result;
        }
      });
    }

    else if (ServerType[id] == 'REGISTER') {
      var username = readString(data);
      var password = readString(data);
      if (username && password && username.length > 0 && password.length > 0)
      {
        DB.createUser(username, password, function(result) {
          var buffer = Buffer.alloc(5);
          buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
          buffer[4] = result ? 1 : 0;
          socket.write(buffer);
          if (result) {
            console.log(result, 'registered');
            clients[socket].username = result;
          }
        });
      }
      else {
        var buffer = Buffer.alloc(5);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer[4] = 0;
        socket.write(buffer);
      }
    }

    else if (ServerType[id] == 'CREATE_GAME') {
      var colour = readInt(data); // 0 = blue, 1 = white
      if (colour != 0 && colour != 1)
        return;
      DB.createGame(clients[socket].username, colour, function(gameId) {
        var buffer = Buffer.alloc(18);
        buffer.writeInt32LE(ClientType.indexOf('GAME_CREATED'), 0);
        if (gameId) {
          buffer.writeInt32LE(10, 4);
          buffer.write(gameId, 8, 10, 'ascii');
          console.log('game created:', gameId)
        }
        socket.write(buffer);
      });
    }

    else if (ServerType[id] == 'REQUEST_GAMES') {
      DB.GetUserGames(clients[socket].username, function(gamesList) {
        console.log('Games List:', gamesList);
          var buffer = Buffer.alloc(8 + (gamesList ? gamesList.length : 0));
          buffer.writeInt32LE(ClientType.indexOf('GAME_LIST'), 0);
        if (gamesList) {
          buffer.writeInt32LE(gamesList.length, 4);
          buffer.write(gamesList, 8, gamesList.length, 'ascii');
        }
        else
          buffer.writeInt32LE(0, 4);

        socket.write(buffer);
      });
    }

    else if (ServerType[id] == 'JOIN_RESUME_GAME') {
      var gameId = readString(data);
      if (gameId) {
        DB.GetGame(gameId, clients[socket].username, function(success, board, turn, blue, white) {
          console.log('success', success);
          if (success && board.length == 99) {
            console.log('board', board);
            console.log('turn', turn);
            console.log('blue', blue);
            console.log('white', white);
            var buffer = Buffer.alloc(120 + blue.length + white.length);
            buffer.writeInt32LE(ClientType.indexOf('GAME_STATE'), 0);
            buffer[4] = 1;
            buffer.writeInt32LE(99, 5);
            buffer.write(board, 9, 99, 'ascii');
            buffer.writeInt32LE(turn, 108);
            buffer.writeInt32LE(blue.length, 112);
            buffer.write(blue, 116, blue.length, 'ascii');
            buffer.writeInt32LE(white.length, 116 + blue.length);
            buffer.write(white, 120 + blue.length, white.length, 'ascii');
            socket.write(buffer);
          } else {
            var buffer = Buffer.alloc(5);
            buffer.writeInt32LE(ClientType.indexOf('GAME_STATE'), 0);
            buffer[4] = 0;
            socket.write(buffer);
          }
        });
      }
    }

    else if (ServerType[id] == 'MOVE') {

    }

    else if (ServerType[id] == 'SURRENDER') {

    }
  });

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

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    clients.splice(clients.indexOf(socket), 1);
  });

  socket.on('error', function () {
    clients.splice(clients.indexOf(socket), 1);
  });
}).listen(5000);

console.log('Checkers server running at port 5000');