require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const cron = require('node-cron');

const db = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');
const sosRoutes = require('./routes/sos');
const notificationRoutes = require('./routes/notifications');
const donationRoutes = require('./routes/donations');
const bloodBankRoutes = require('./routes/bloodBanks');
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');
const { setupSocketHandlers } = require('./socket/handlers');
const { checkEligibilityReminders, expireOldRequests } = require('./jobs/scheduler');
const { errorHandler } = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET','POST'] }
});
setupSocketHandlers(io);
app.set('io', io);

// ── Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/donors',        donorRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/sos',           sosRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/donations',     donationRoutes);
app.use('/api/blood-banks',   bloodBankRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/ai',            aiRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Scheduled Jobs ──────────────────────────────────────────
cron.schedule('0 9 * * *',  checkEligibilityReminders); // Daily 9am
cron.schedule('0 * * * *',  expireOldRequests);          // Every hour

// ── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🩸 LifeDrop server running on port ${PORT}`));

module.exports = { app, server };
