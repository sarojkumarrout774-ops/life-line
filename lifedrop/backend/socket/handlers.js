const jwt = require('jsonwebtoken');

function setupSocketHandlers(io) {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.userId}`);

    // Join personal room for targeted notifications
    socket.join(socket.userId);

    // Join blood-group room for SOS broadcasts
    socket.on('join_blood_group', (bloodGroup) => {
      socket.join(`blood_${bloodGroup}`);
    });

    // Join request room for real-time updates
    socket.on('join_request', (requestId) => {
      socket.join(`request_${requestId}`);
    });

    socket.on('leave_request', (requestId) => {
      socket.leave(`request_${requestId}`);
    });

    // Typing indicator for chat
    socket.on('typing', ({ toUserId }) => {
      io.to(toUserId).emit('user_typing', { fromUserId: socket.userId });
    });

    // Location update (for real-time donor tracking)
    socket.on('location_update', ({ lat, lng }) => {
      socket.broadcast.emit('donor_location', {
        userId: socket.userId,
        lat,
        lng,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });
}

module.exports = { setupSocketHandlers };
