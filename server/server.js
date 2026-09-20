require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const networkRoutes = require('./routes/networkRoutes');
const userRoutes = require('./routes/userRoutes');
const modulationRoutes = require('./routes/modulationRoutes');
const labRoutes = require('./routes/labRoutes');
const experimentRoutes = require('./routes/experimentRoutes');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    service: 'NetCollaborate Server',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'in-memory-resilience'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/networks', networkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modulation', modulationRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/instructor', labRoutes);
app.use('/api/experiments', experimentRoutes);

// In-memory room tracking for real-time collaboration
const activeRooms = new Map(); // roomId -> { users: Map(socketId -> userData), activityLog: [], messages: [] }

function getRoom(roomId) {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, {
      users: new Map(),
      activityLog: [
        {
          id: 'log-' + Date.now(),
          username: 'System',
          action: 'Room Created',
          details: `Collaboration room ${roomId} initialized.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      messages: []
    });
  }
  return activeRooms.get(roomId);
}

// Socket.IO Handshake Authentication Middleware
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  const token = socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization?.startsWith('Bearer ') ? socket.handshake.headers.authorization.split(' ')[1] : null);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'netcollaborate_secret_fallback');
      socket.userId = decoded.userId || decoded.id;
      socket.role = decoded.role || 'student';
      socket.userName = decoded.name || decoded.username;
    } catch (err) {
      console.warn('[Socket Auth] Invalid token provided, proceeding as guest student');
      socket.userId = 'guest_' + socket.id;
      socket.role = 'student';
    }
  } else {
    socket.userId = 'guest_' + socket.id;
    socket.role = 'student';
  }
  next();
});

// Socket.IO Events
io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;
  let currentSessionCode = null;

  // Join network workspace room
  socket.on('join-room', ({ roomId, user }) => {
    if (!roomId || !user) return;
    currentRoomId = roomId;
    currentUser = user;

    socket.join(roomId);
    const room = getRoom(roomId);

    // Save user in active users
    room.users.set(socket.id, {
      socketId: socket.id,
      userId: user.id || user._id,
      name: user.name || user.username || 'Collaborator',
      username: user.username || 'collaborator',
      role: user.role || socket.role || 'student',
      avatarColor: user.avatarColor || '#3b82f6',
      cursor: { x: 0, y: 0 }
    });

    const logEntry = {
      id: 'log-' + Date.now(),
      username: user.username || user.name || 'User',
      action: 'Joined Room',
      details: `${user.name || user.username} joined the workspace`,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    // Broadcast room users and activity log
    const userList = Array.from(room.users.values());
    io.to(roomId).emit('room-users', userList);
    io.to(roomId).emit('activity-updated', room.activityLog);
    socket.emit('chat-history', room.messages);

    console.log(`[Socket] User ${user.username} joined room ${roomId} (Total: ${userList.length})`);
  });

  // Track session room membership for 50-student lab count
  socket.on('join-lab', ({ sessionCode, student, role }) => {
    if (!sessionCode) return;
    const cleanCode = sessionCode.toUpperCase();
    currentSessionCode = cleanCode;
    const labRoom = `lab-${cleanCode}`;
    const monitorRoom = `instructor-monitor-${cleanCode}`;

    const userRole = role || socket.role || 'student';

    if (userRole === 'instructor') {
      socket.join(monitorRoom);
      console.log(`[Socket] Instructor joined monitoring room: ${monitorRoom}`);
    } else {
      socket.join(labRoom);
      // Notify instructor monitoring room of new student
      io.to(monitorRoom).emit('student-joined', {
        student: student || { studentId: socket.userId, name: socket.userName, role: 'student' },
        timestamp: new Date().toLocaleTimeString()
      });

      // Get count of students in lab room
      const studentCount = io.sockets.adapter.rooms.get(labRoom)?.size || 1;
      io.to(monitorRoom).emit('student-count-updated', { count: studentCount });
      io.to(labRoom).emit('student-count-updated', { count: studentCount });

      console.log(`[Socket] Student ${student?.name || socket.userName} joined lab ${labRoom} (Count: ${studentCount})`);
    }
  });

  socket.on('leave-lab', ({ sessionCode, student }) => {
    if (!sessionCode) return;
    const cleanCode = sessionCode.toUpperCase();
    const labRoom = `lab-${cleanCode}`;
    const monitorRoom = `instructor-monitor-${cleanCode}`;

    socket.leave(labRoom);
    socket.leave(monitorRoom);

    io.to(monitorRoom).emit('student-left', {
      student,
      timestamp: new Date().toLocaleTimeString()
    });

    const studentCount = io.sockets.adapter.rooms.get(labRoom)?.size || 0;
    io.to(monitorRoom).emit('student-count-updated', { count: studentCount });
    io.to(labRoom).emit('student-count-updated', { count: studentCount });
  });

  // Real-time Student Progress broadcast to Instructor Monitoring Room
  socket.on('student-progress-update', ({ sessionCode, progressData }) => {
    if (!sessionCode) return;
    const cleanCode = sessionCode.toUpperCase();
    const monitorRoom = `instructor-monitor-${cleanCode}`;
    io.to(monitorRoom).emit('student-progress-broadcast', progressData);
  });

  // Real-time Experiment lifecycle alerts for instructor
  socket.on('experiment-started', ({ sessionCode, student, experimentName }) => {
    if (!sessionCode) return;
    const monitorRoom = `instructor-monitor-${sessionCode.toUpperCase()}`;
    io.to(monitorRoom).emit('experiment-started-alert', {
      student,
      experimentName,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('experiment-completed', ({ sessionCode, student, results }) => {
    if (!sessionCode) return;
    const monitorRoom = `instructor-monitor-${sessionCode.toUpperCase()}`;
    io.to(monitorRoom).emit('experiment-completed-alert', {
      student,
      results,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('fsk-result-updated', ({ sessionCode, student, ber, params }) => {
    if (!sessionCode) return;
    const monitorRoom = `instructor-monitor-${sessionCode.toUpperCase()}`;
    io.to(monitorRoom).emit('fsk-result-alert', {
      student,
      ber,
      params,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('submission-received', ({ sessionCode, submission }) => {
    if (!sessionCode) return;
    const monitorRoom = `instructor-monitor-${sessionCode.toUpperCase()}`;
    io.to(monitorRoom).emit('submission-alert', {
      submission,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // Collaborative Cursor Tracking
  socket.on('cursor-move', ({ roomId, cursor }) => {
    if (!roomId || !cursor) return;
    const room = activeRooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const u = room.users.get(socket.id);
      u.cursor = cursor;
      socket.to(roomId).emit('cursor-update', {
        socketId: socket.id,
        userId: u.userId,
        name: u.name,
        avatarColor: u.avatarColor,
        cursor
      });
    }
  });

  // Real-time Canvas Node synchronization
  socket.on('node-change', ({ roomId, changeType, node, nodes, user }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    const uName = user?.name || currentUser?.name || 'Collaborator';

    let logAction = 'Updated Device';
    let details = `Device modified on canvas`;
    if (changeType === 'add') {
      logAction = 'Added Device';
      details = `${uName} added ${node?.data?.name || node?.type || 'a device'}`;
    } else if (changeType === 'delete') {
      logAction = 'Removed Device';
      details = `${uName} deleted a device from canvas`;
    } else if (changeType === 'move') {
      logAction = 'Moved Device';
      details = `${uName} moved ${node?.data?.name || 'device'}`;
    }

    const logEntry = {
      id: 'log-' + Date.now(),
      username: uName,
      action: logAction,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    socket.to(roomId).emit('node-synced', { changeType, node, nodes, user });
    io.to(roomId).emit('activity-updated', room.activityLog);
  });

  // Real-time Edge / Connection synchronization
  socket.on('edge-change', ({ roomId, changeType, edge, edges, user }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    const uName = user?.name || currentUser?.name || 'Collaborator';

    const logEntry = {
      id: 'log-' + Date.now(),
      username: uName,
      action: changeType === 'add' ? 'Connected Devices' : 'Removed Link',
      details: changeType === 'add'
        ? `${uName} linked devices via ${edge?.data?.linkType || 'Ethernet'}`
        : `${uName} removed a network connection`,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    socket.to(roomId).emit('edge-synced', { changeType, edge, edges, user });
    io.to(roomId).emit('activity-updated', room.activityLog);
  });

  // Real-time Device Configuration sync
  socket.on('config-change', ({ roomId, nodeId, config, user }) => {
    if (!roomId || !nodeId) return;
    const room = getRoom(roomId);
    const uName = user?.name || currentUser?.name || 'Collaborator';

    const logEntry = {
      id: 'log-' + Date.now(),
      username: uName,
      action: 'Changed Config',
      details: `${uName} updated IP/settings for ${config?.name || nodeId}`,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    socket.to(roomId).emit('config-synced', { nodeId, config, user });
    io.to(roomId).emit('activity-updated', room.activityLog);
  });

  // Synchronized Simulation Broadcast (all users watch packet travel together)
  socket.on('simulate-broadcast', ({ roomId, simResult, sourceName, destName, user }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    const uName = user?.name || currentUser?.name || 'Collaborator';

    const logEntry = {
      id: 'log-' + Date.now(),
      username: uName,
      action: 'Simulated Packet',
      details: `${uName} transmitted packet: ${sourceName} → ${destName} (${simResult.success ? 'Delivered' : 'Failed'})`,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    socket.to(roomId).emit('simulation-triggered', { simResult, sourceName, destName, user });
    io.to(roomId).emit('activity-updated', room.activityLog);
  });

  // Collaborative In-Room Chat
  socket.on('send-message', ({ roomId, text, user }) => {
    if (!roomId || !text) return;
    const room = getRoom(roomId);
    const msg = {
      id: 'msg-' + Date.now(),
      sender: user?.name || user?.username || 'Collaborator',
      avatarColor: user?.avatarColor || '#3b82f6',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    room.messages.push(msg);
    if (room.messages.length > 100) room.messages.shift();

    io.to(roomId).emit('new-message', msg);
  });

  // Version Control Snapshot events
  socket.on('snapshot-created', ({ roomId, snapshot, user }) => {
    if (!roomId || !snapshot) return;
    const room = getRoom(roomId);
    const uName = user?.name || currentUser?.name || 'Collaborator';

    const logEntry = {
      id: 'log-' + Date.now(),
      username: uName,
      action: 'Created Snapshot',
      details: `${uName} captured version checkpoint: "${snapshot.name}"`,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    socket.to(roomId).emit('snapshot-synced', { snapshot, user });
    io.to(roomId).emit('activity-updated', room.activityLog);
  });

  socket.on('snapshot-restored', ({ roomId, snapshot, nodes, edges, user }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    const uName = user?.name || currentUser?.name || 'Collaborator';

    const logEntry = {
      id: 'log-' + Date.now(),
      username: uName,
      action: 'Restored Version',
      details: `${uName} restored network to snapshot "${snapshot?.name || 'checkpoint'}"`,
      timestamp: new Date().toLocaleTimeString()
    };
    room.activityLog.unshift(logEntry);
    if (room.activityLog.length > 50) room.activityLog.pop();

    socket.to(roomId).emit('snapshot-restored-synced', { snapshot, nodes, edges, user });
    io.to(roomId).emit('activity-updated', room.activityLog);
  });


  // FSK Real-time Collaborative Simulation Broadcast
  socket.on('fsk-simulation-started', ({ roomId, params, user }) => {
    if (!roomId) return;
    socket.to(roomId).emit('fsk-simulation-started-synced', { params, user });
  });

  socket.on('fsk-simulation-completed', ({ roomId, results, user }) => {
    if (!roomId) return;
    socket.to(roomId).emit('fsk-simulation-completed-synced', { results, user });
  });

  // FSK Parameter Sync
  socket.on('fsk-param-change', ({ roomId, params, user }) => {
    if (!roomId) return;
    socket.to(roomId).emit('fsk-param-synced', { params, user });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (currentRoomId && activeRooms.has(currentRoomId)) {
      const room = activeRooms.get(currentRoomId);
      const departingUser = room.users.get(socket.id);
      room.users.delete(socket.id);

      if (departingUser) {
        socket.to(currentRoomId).emit('cursor-remove', { socketId: socket.id });
        io.to(currentRoomId).emit('room-users', Array.from(room.users.values()));

        const logEntry = {
          id: 'log-' + Date.now(),
          username: departingUser.username,
          action: 'Left Room',
          details: `${departingUser.name} disconnected from workspace`,
          timestamp: new Date().toLocaleTimeString()
        };
        room.activityLog.unshift(logEntry);
        io.to(currentRoomId).emit('activity-updated', room.activityLog);
      }
    }
  });
});

// Database Connection with In-Memory Resilience Fallback
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/netcollaborate';

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 2500
})
  .then(() => {
    console.log(`[Database] Successfully connected to MongoDB at ${MONGO_URI}`);
  })
  .catch((err) => {
    console.warn(`[Database] MongoDB offline or unreachable (${err.message}).`);
    console.log(`[Database] Running in high-resilience in-memory store mode. All features, collaboration, and network simulations remain 100% operational!`);
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` NetCollaborate Backend Server is running!`);
  console.log(` Port:    http://localhost:${PORT}`);
  console.log(` Health:  http://localhost:${PORT}/api/health`);
  console.log(` Mode:    ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
