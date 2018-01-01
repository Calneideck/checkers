const NET = require('net');
const DB = require('./aws.js')

var ServerType = ['LOGIN', 'REGISTER', 'CREATE_GAME', 'JOIN_GAME', 'MOVE', 'SURRENDER'];
var ClientType = ['LOGIN_RESULT', 'GAME_CREATED', 'GAME_STATE'];

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

      if (username.length == 0 || password.length == 0) {
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
      DB.createUser(username, password, function(result) {
        var buffer = Buffer.alloc(8);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer.writeInt32LE(result ? 1 : 0, 4);
        socket.write(buffer);
        if (result) {
          console.log(result, 'registered');
          clients[socket].username = result;
        }
      });
    }

    else if (ServerType[id] == 'CREATE_GAME') {
      var colour = readInt(data); // 0 = blue, 1 = white
      if (colour != 0 && colour != 1)
        return;
      console.log('colour:', colour);
      console.log(clients[socket].username);
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

    else if (ServerType[id] == 'JOIN_GAME') {

    }

    else if (ServerType[id] == 'MOVE') {

    }

    else if (ServerType[id] == 'SURRENDER') {

    }
  });

  function readInt(buffer) {
    var data = buffer.readInt32LE(clients[socket].offset);
    clients[socket].offset += 4;
    return data;
  }

  function readString(buffer) {
    var length = readInt(buffer);
    var data = buffer.toString('utf8', clients[socket].offset, clients[socket].offset + length);
    clients[socket].offset += length;
    return data;
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