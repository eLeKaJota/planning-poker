// Imports
const express = require('express');
const cors = require('cors');
const http = require('http');
const app = express();
const {Server} = require('socket.io');
const path = require('path');
var publicFolder = path.join(__dirname, 'public');
const server = http.createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});
app.use(cors());
app.use(express.json());
app.use(express.static('build'));
app.use('/', express.static(publicFolder));

let rooms = [];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/view/create-room.html'));
});

app.get('/room/:name', (req, res) => {
  return res.sendFile(path.join(__dirname, '/view/room.html'));
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    console.log('user disconnected');
    const roomIndex = rooms.findIndex(
        r => r.users.find(u => u.id === socket.id));
    if (roomIndex !== -1) {
      const userIndex = rooms[roomIndex].users.findIndex(
          u => u.id === socket.id);
      rooms[roomIndex].users.splice(userIndex, 1);
      if (rooms[roomIndex].users.length === 0) {
        rooms.splice(roomIndex, 1);
      }
      io.to(rooms[roomIndex].room).emit('users', rooms[roomIndex].users);
    }
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    rooms.push({room, users: []});
    const roomIndex = rooms.findIndex(r => r.room === room);
    io.to(room).emit('users', rooms[roomIndex].users);
  });

  socket.on('newUser', ({room, user}) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    rooms[roomIndex].users.push({id: socket.id, room, user});
    io.to(room).emit('users', rooms[roomIndex].users);
  });

  socket.on('vote', ({room, vote, user}) => {
    io.to(room).emit('vote', {vote, user});
  });
});

server.listen(3000, () => {
  console.log(`Server is running. http://localhost:${3000}`);
});
