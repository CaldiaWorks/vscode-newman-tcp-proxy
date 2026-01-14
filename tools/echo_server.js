const net = require('net');

const port = 9000;
const server = net.createServer((socket) => {
  console.log('Client connected');
  socket.write('Echo Server: Connected\n');
  socket.on('data', (data) => {
    console.log('Received:', data.toString());
    socket.write(data);
  });
  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => {
  console.log('Echo Server listening on port ' + port);
});
