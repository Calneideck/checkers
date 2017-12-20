const NET = require('net');
const AWS = require('aws-sdk');

var ServerType = ['LOGIN', 'REGISTER', 'CREATE_GAME', 'JOIN_GAME', 'MOVE', 'SURRENDER'];
var ClientType = ['LOGIN_RESULT', 'GAME_STATE'];

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
NET.createServer(function (socket) {
  var offset = 0; 

  // Put this new client in the list
  clients.push(socket);
  console.log('client connected: ' + socket.remoteAddress);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    offset = 0;
    var id = readInt(data);

    if (ServerType[id] == 'REGISTER') {
      var username = readString(data);
      var password = readString(data);
      console.log('username:', username, 'password:', password);
      createUser(username, password, function (result) {
        var buffer = Buffer.alloc(8);
        buffer.writeInt32LE(ClientType.indexOf('LOGIN_RESULT'), 0);
        buffer.writeInt32LE(result ? 1 : 0, 4);
        socket.write(buffer);
      });
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
};

function createUser(username, password, done) {
  findOne(username, function (err, user_result) {
    if (err)
      return done(false);

    if (user_result) {
      console.log('user already exists');
      return done(false);
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
      if (err)
      {
        console.log(err);
        return done(false);
      }
      else
        done(true);
    });
  });
};