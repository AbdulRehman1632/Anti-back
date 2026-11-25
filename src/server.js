import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, isMongoConnected } from './config/db.js';
import { initSocket } from './sockets/socketHandler.js';

import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import userRoutes from './routes/userRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import customFieldRoutes from './routes/customFieldRoutes.js';
import lifecycleRoutes from './routes/lifecycleRoutes.js';
import callRoutes from './routes/callRoutes.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

initSocket(httpServer);

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, '') : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (
        !clientUrl ||
        origin === clientUrl ||
        origin.startsWith('http://localhost') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, origin);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB connectivity for serverless cold starts
app.use(async (req, res, next) => {
  if (!isMongoConnected) {
    try {
      await connectDB();
    } catch (e) {}
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Devdrip Enterprise CRM & Workspace Engine',
    version: '1.0.0',
    mongoConnected: isMongoConnected,
    storageMode: isMongoConnected ? 'MongoDB Replica' : 'In-Memory Enterprise Store',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});


app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/lifecycle-stages', lifecycleRoutes);
app.use('/api/calls', callRoutes);


app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

// Connect to Database & Start Server
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Devdrip CRM Server running on port ${PORT}`);
    console.log(`📡 WebSocket & WebRTC Signaling active on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  });
});

export default app;
