// Imports
const express = require('express');
const cors = require('cors');
const http = require('http');
const app = express();
const {Server} = require('socket.io');
const cron = require('node-cron');
const path = require('path');

//---------------------------- CONSTANTS ----------------------------
const CRON = {
  EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_MINUTE: '* * * * *',
  EVERY_SECOND: '* * * * * *',
  EVERY_5_SECONDS: '*/5 * * * * *',
  EVERY_10_SECONDS: '*/10 * * * * *',
  EVERY_15_SECONDS: '*/15 * * * * *',
  EVERY_30_SECONDS: '*/30 * * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
};

const RESERVED_ROOMS = [
  'admin--stats-5454',
  'toggleadmin',
  'removeuser',
  'rooms',
  'checkrooms',
  'checkuserexists',
  'favicon.ico',
  'robots.txt',
];

//---------------------------- VARIABLES ----------------------------
var publicFolder = path.join(__dirname, 'public');
const server = http.createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});
let rooms = [];
const maxUsersTop = 6;
const maxUsersLeft = 6;
const maxUsersRight = 6;
const maxUsersBottom = 6;

//---------------------------- SERVER CONFIG ----------------------------
app.use(cors());
app.use(express.json());
app.use(express.static('build'));
app.use('/', express.static(publicFolder));

//---------------------------- ENDPOINTS ----------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/view/create-room.html'));
});

app.get('/admin--stats-5454', (req, res) => {
  res.sendFile(path.join(__dirname, '/view/stats.html'));
});

app.get('/checkRooms', (req, res) => {
  if (RESERVED_ROOMS.includes(req.query.room) || rooms.find(
      r => r.room === req.query.room)) {
    return res.status(200).json({exists: true});
  } else {
    return res.status(200).json({exists: false});
  }
});

app.get('/checkUserExists', (req, res) => {
  const roomIndex = rooms.findIndex(r => r.room === req.query.room);
  if (roomIndex === -1) {
    return res.status(200).json({exists: false});
  }
  const user = rooms[roomIndex].users.find(u => u.user === req.query.user);
  if (user) {
    return res.status(200).json({exists: true});
  } else {
    return res.status(200).json({exists: false});
  }
});

app.post('/toggleAdmin', (req, res) => {
  const roomIndex = rooms.findIndex(r => r.room === req.body.room);
  const userIndex = rooms[roomIndex].users.findIndex(
      u => u.id === req.body.userId);
  rooms[roomIndex].users[userIndex].admin = !rooms[roomIndex].users[userIndex].admin;
  io.to(req.body.room).
      emit('users',
          {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  return res.status(200).json(rooms[roomIndex].users);
});

app.post('/removeUser', (req, res) => {
  const roomIndex = rooms.findIndex(r => r.room === req.body.room);
  const userIndex = rooms[roomIndex].users.findIndex(
      u => u.id === req.body.userId);
  rooms[roomIndex].users.splice(userIndex, 1);
  io.to(req.body.userId).
      emit('disconnected', 'El administrador de la sala te ha expulsado.');
  if (rooms[roomIndex].users.length === 0) {
    rooms.splice(roomIndex, 1);
  } else {
    io.to(req.body.room).
        emit('users',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  }
  return res.status(200).json({message: 'Usuario eliminado correctamente.'});
});

app.post('/removeRoom', (req, res) => {
  const roomIndex = rooms.findIndex(r => r.room === req.body.room);
  rooms[roomIndex].users.forEach(u => {
    io.to(u.id).emit('disconnected', 'La sala ha sido eliminada.');
  });
  rooms.splice(roomIndex, 1);
  return res.status(200).json({message: 'Sala eliminada correctamente.'});

});

app.get('/rooms', (req, res) => {
  res.status(200).json(rooms);
});

app.get('/:name', (req, res) => {
  return res.sendFile(path.join(__dirname, '/view/room.html'));
});

//---------------------------- CRON JOBS ----------------------------
cron.schedule(CRON.EVERY_15_MINUTES, () => {
  removeEmptyRooms();
});

//---------------------------- FUNCTIONS ----------------------------
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

const firstUserAdmin = (room) => {
  const roomIndex = rooms.findIndex(r => r.room === room);
  return rooms[roomIndex].users.length === 0;
};

const sendAdminToFirstUser = (room) => {
  const roomIndex = rooms.findIndex(r => r.room === room);
  rooms[roomIndex].users[0].admin = true;
};

const maxUsersInRoom = (room) => {
  const roomIndex = rooms.findIndex(r => r.room === room);
  const users = rooms[roomIndex].users;
  const maxUsers = maxUsersTop + maxUsersLeft + maxUsersRight + maxUsersBottom;
  return users.length >= maxUsers;
};

const checkUserExists = (room, user) => {
  const roomIndex = rooms.findIndex(r => r.room === room);
  return rooms[roomIndex].users.find(u => u.user === user);
};

const removeEmptyRooms = () => {
  let emptyRooms = rooms.filter(r => r.empty);
  if (emptyRooms.length) {
    logger('Se han eliminado las siguientes salas por inactividad:', 'red');
    emptyRooms.forEach(r => {
      logger(r.room, 'red');
    });
    emptyRooms = [];
  }
  rooms = rooms.filter(r => !r.empty);
  rooms.forEach(r => {
    if (r.users.length === 0) {
      r.empty = true;
    }
  });
  let newEmptyRooms = rooms.filter(r => r.empty);
  if (newEmptyRooms.length) {
    logger('Las siguientes salas se eliminarán por inactividad en 15 minutos:',
        'yellow');
    newEmptyRooms.forEach(r => {
      logger(r.room, 'yellow');
    });
    newEmptyRooms = [];
  }
};

const logger = (message, color) => {
  let colorSelected = 37;
  switch (color) {
    case 'red':
      colorSelected = 31;
      break;
    case 'green':
      colorSelected = 32;
      break;
    case 'yellow':
      colorSelected = 33;
      break;
    case 'blue':
      colorSelected = 34;
      break;
    case 'magenta':
      colorSelected = 35;
      break;
    case 'cyan':
      colorSelected = 36;
      break;
    case 'white':
      colorSelected = 37;
      break;
    default:
      colorSelected = 37;
      break;
  }
  console.log(
      '\x1b[' + colorSelected + 'm%s\x1b[0m',
      new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - ' +
      message,
  );
};

//---------------------------- SOCKETS ----------------------------
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    const roomIndex = rooms.findIndex(
        r => r.users.find(u => u.id === socket.id));
    if (roomIndex !== -1) {
      const userIndex = rooms[roomIndex].users.findIndex(
          u => u.id === socket.id);
      const user = rooms[roomIndex].users[userIndex];
      rooms[roomIndex].users.splice(userIndex, 1);
      if (user.admin && rooms[roomIndex].users.length > 0) {
        sendAdminToFirstUser(user.room);
      }
      if (rooms[roomIndex].users.length === 0) {
        rooms.splice(roomIndex, 1);
      }
      try {
        if (rooms[roomIndex]) {
          io.to(rooms[roomIndex].room).
              emit('users',
                  {
                    users: rooms[roomIndex].users,
                    reveal: rooms[roomIndex].reveal,
                  });
        }
      } catch (e) {
        console.log(e);
      }
    }
  });

  socket.on('joinRoom', (room) => {
    if (RESERVED_ROOMS.includes(room)) {
      return;
    }
    socket.join(room);
    let roomIndex = rooms.findIndex(r => r.room === room);
    if (roomIndex === -1) {
      rooms.push({room, users: [], reveal: false});
      roomIndex = rooms.findIndex(r => r.room === room);
    }
    io.to(room).
        emit('users',
            {users: rooms[roomIndex].users, reveal: rooms[roomIndex].reveal});
  });

  socket.on('newUser', ({room, user}) => {
    const roomIndex = rooms.findIndex(r => r.room === room);
    if (maxUsersInRoom(room)) {
      return;
    }
    if (checkUserExists(room, user)) {
      console.log('User already exists', user.user);
      user = `${user}*`;
    }
    const seat = assignSeat(room);
    rooms[roomIndex].users.push({
      id: socket.id,
      room,
      user,
      vote: '',
      seat,
      admin: firstUserAdmin(room),
    });
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

//---------------------------- SERVER INIT ----------------------------
server.listen(3000, () => {
  console.log(`Server is running.`);
});
