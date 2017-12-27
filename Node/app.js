const NET = require('net');
const DB = require('./aws.js')

var ServerType = ['LOGIN', 'REGISTER', 'CREATE_GAME', 'JOIN_GAME', 'MOVE', 'SURRENDER'];
var ClientType = ['LOGIN_RESULT', 'GAME_STATE'];

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
NET.createServer(function (socket) {
  var offset = 0;
  var username = null;

  // Put this new client in the list
  clients.push(socket);
  console.log('client connected: ' + socket.remoteAddress);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    offset = 0;
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

      DB.login(username, password, function (result) {
        var buffer = Buffer.alloc(8);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer.writeInt32LE(result ? 1 : 0, 4);
        socket.write(buffer);
        console.log(result);
        if (result) {
          console.log(result, 'logged in');
          username = result;
        }
      });
    }

    else if (ServerType[id] == 'REGISTER') {
      var username = readString(data);
      var password = readString(data);
      console.log('username:', username, 'password:', password);
      DB.createUser(username, password, function (result) {
        var buffer = Buffer.alloc(8);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer.writeInt32LE(result ? 1 : 0, 4);
        socket.write(buffer);
      });
    }

    else if (ServerType[id] == 'CREATE_GAME') {

    }

    else if (ServerType[id] == 'JOIN_GAME') {

    }

    else if (ServerType[id] == 'MOVE') {

    }

    else if (ServerType[id] == 'SURRENDER') {

    }
  });

  function readInt(buffer) {
    var data = buffer.readInt32LE(offset);
    offset += 4;
    return data;
  }

  function readString(buffer) {
    var length = readInt(buffer);
    var data = buffer.toString('utf8', offset, offset + length);
    offset += length;
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