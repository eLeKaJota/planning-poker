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
const maxUsersTop = 6;
const maxUsersLeft = 10;
const maxUsersRight = 10;
const maxUsersBottom = 6;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/view/create-room.html'));
});

app.get('/:name', (req, res) => {
  return res.sendFile(path.join(__dirname, '/view/room.html'));
});

const assignSeat = (room) => {
  const roomIndex = rooms.findIndex(r => r.room === room);
  const users = rooms[roomIndex].users;
  const usersTop = users.filter(u => u.seat === 'top');
  const usersLeft = users.filter(u => u.seat === 'left');
  const usersRight = users.filter(u => u.seat === 'right');
  const usersBottom = users.filter(u => u.seat === 'bottom');

  if (users.length === 0) {
    return 'bottom';
  } else if (users.length === 1) {
    return 'top';
  } else if (users.length === 2) {
    return 'left';
  } else {
    if (usersTop.length <= usersLeft.length &&
        usersTop.length <= usersRight.length &&
        usersTop.length <= usersBottom.length) {
      if (usersTop.length < maxUsersTop) {
        return 'top';
      } else if (usersLeft.length < maxUsersLeft) {
        return 'left';
      } else if (usersRight.length < maxUsersRight) {
        return 'right';
      } else if (usersBottom.length < maxUsersBottom) {
        return 'bottom';
      } else {
        return 'no-seat';
      }
    } else if (usersLeft.length <= usersTop.length &&
        usersLeft.length <= usersRight.length &&
        usersLeft.length <= usersBottom.length) {
      if (usersLeft.length < maxUsersLeft) {
        return 'left';
      } else if (usersTop.length < maxUsersTop) {
        return 'top';
      } else if (usersRight.length < maxUsersRight) {
        return 'right';
      } else if (usersBottom.length < maxUsersBottom) {
        return 'bottom';
      } else {
        return 'no-seat';
      }
    } else if (usersRight.length <= usersTop.length &&
        usersRight.length <= usersLeft.length &&
        usersRight.length <= usersBottom.length) {
      if (usersRight.length < maxUsersRight) {
        return 'right';
      } else if (usersTop.length < maxUsersTop) {
        return 'top';
      } else if (usersLeft.length < maxUsersLeft) {
        return 'left';
      } else if (usersBottom.length < maxUsersBottom) {
        return 'bottom';
      } else {
        return 'no-seat';
      }
    } else {
      if (usersBottom.length < maxUsersBottom) {
        return 'bottom';
      } else if (usersTop.length < maxUsersTop) {
        return 'top';
      } else if (usersLeft.length < maxUsersLeft) {
        return 'left';
      } else if (usersRight.length < maxUsersRight) {
        return 'right';
      } else {
        return 'no-seat';
      }
    }
  }
};

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
      io.to(rooms[roomIndex].room).
          emit('users',
              {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
    }
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    rooms.push({room, users: [], reveal: false});
    const roomIndex = rooms.findIndex(r => r.room === room);
    io.to(room).
        emit('users',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  });

  socket.on('newUser', ({room, user}) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    const seat = assignSeat(room);
    rooms[roomIndex].users.push({id: socket.id, room, user, vote: '', seat});
    io.to(room).
        emit('users',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  });

  socket.on('vote', ({room, vote}) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    const userIndex = rooms[roomIndex].users.findIndex(
        u => u.id === socket.id);
    rooms[roomIndex].users[userIndex].vote = vote;
    io.to(room).
        emit('users',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  });

  socket.on('reveal', (room) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    rooms[roomIndex].reveal = true;
    io.to(room).emit('reveal', rooms[roomIndex].reveal);
  });

  socket.on('reset', (room) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    rooms[roomIndex].users.forEach(u => u.vote = '');
    rooms[roomIndex].reveal = false;
    io.to(room).
        emit('reset',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  });

  socket.on('sitted', (room) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    io.to(room).
        emit('sitted',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  });

});

server.listen(3000, () => {
  console.log(`Server is running. http://localhost:${3000}`);
});
