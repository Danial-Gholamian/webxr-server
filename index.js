//index.js in fly.io
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false
  }
});

const users = {};

io.on('connection', socket => {
  console.log('User connected:', socket.id);

    socket.on('user-join', ({ id, name }) => {
    users[socket.id] = { id, name };
    console.log(`User joined: ${name} (${id})`);

    // Broadcast updated list to all clients
    io.emit('user-list', 
      Object.entries(users).map(([socketId, user]) => ({
        socketId,
        name: user.name
      }))
    );
  });

  // Store avatar data
  socket.on('user-update', data => {
    if (users[socket.id]) {
      users[socket.id] = {
        ...users[socket.id],  // keeps id and name
        ...data               // adds head, left, right, etc.
      };
    }

    socket.broadcast.emit('user-update', { id: socket.id, ...data });
  });


  // Handle node selection with acknowledgment
  socket.on('node-select', ({ nodeId, mode }, ack) => {
    console.log(`Node selected by ${socket.id}:`, nodeId, mode);
    socket.broadcast.emit('node-select', { nodeId, mode });
    if (typeof ack === 'function') ack(true); // Proper ack check
  });

  //Period change

  socket.on('period-change', (period) => {
  socket.broadcast.emit('period-change', period);
  });

  
  // Graph reset
  socket.on('graph-reset', (_, ack) => {
    console.log(`Graph reset by ${socket.id}`);
    socket.broadcast.emit('graph-reset');
    if (typeof ack === 'function') ack(true);
  });

  // Group selection
  socket.on('group-select', ({ groupName }) => {
    console.log(`Group selected by ${socket.id}:`, groupName);
    socket.broadcast.emit('group-select', { groupName });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete users[socket.id];

    // Update others
    socket.broadcast.emit('user-disconnect', socket.id);
    io.emit('user-list', 
      Object.entries(users).map(([socketId, user]) => ({
        socketId,
        name: user.name
      }))
    );

  });

  socket.on('webrtc-offer', ({ targetId, offer }) => {
  io.to(targetId).emit('webrtc-offer', { sourceId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc-answer', { sourceId: socket.id, answer });
  });

  socket.on('webrtc-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc-candidate', { sourceId: socket.id, candidate });
  });

  socket.emit(
  'user-list',
    Object.entries(users).map(([socketId, user]) => ({
      socketId,
      name: user.name
    }))
  );


  socket.on('period-stack-toggle', ({ visible }) => {
  console.log(`Period stack toggle from ${socket.id}:`, visible);
  socket.broadcast.emit('period-stack-toggle', { visible });
  });

});


const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});


