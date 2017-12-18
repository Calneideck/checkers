const net = require('net');
const aws = require('aws-sdk');

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
net.createServer(function (socket) {
  // Put this new client in the list
  clients.push(socket);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    clients.splice(clients.indexOf(socket), 1);
  });

  socket.on('error', function() {
    clients.splice(clients.indexOf(socket), 1);
  });
}).listen(5000);

console.log("Checkers server running at port 5000");