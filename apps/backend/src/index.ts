import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error';

import projectRoutes from './routes/project.routes';
import buildRoutes from './routes/build.routes';
import adminRoutes from './routes/admin.routes';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { getHealth, getDebug, getQueueDebug } from './controllers/health.controller';
import { validateEnv } from './config/validate-env';
import { verifyAndAutoStartRedis } from './utils/redis-check';
import { startStaleBuildCleaner } from './controllers/build.controller';

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time build updates
const io = new SocketIO(httpServer, {
  cors: {
    origin: env.APP_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to controllers
app.set('io', io);

// ============================================================
// Middleware
// ============================================================

app.use(requestIdMiddleware);
app.use(requestLogger);

// Security
app.use(helmet());
app.use(cors({
  origin: env.APP_URL,
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// Routes
// ============================================================

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Running Successfully"
  });
});

// Health & Debug checks
app.get('/health', getHealth);
app.get('/api/health', getHealth);
app.get('/debug', getDebug);
app.get('/api/debug', getDebug);
app.get('/queue/debug', getQueueDebug);
app.get('/api/queue/debug', getQueueDebug);

// API routes

app.use('/api/projects', projectRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/admin', adminRoutes);

// Static file serving for build artifacts (temporary downloads)
app.use('/downloads', express.static('tmp/downloads'));

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

// ============================================================
// Socket.IO Events
// ============================================================

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);

  socket.on('build:join', (buildId: string) => {
    socket.join(`build:${buildId}`);
    logger.debug(`Socket ${socket.id} joined build room: ${buildId}`);
  });

  socket.on('build:leave', (buildId: string) => {
    socket.leave(`build:${buildId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// ============================================================
// Start Server
// ============================================================

// Run synchronous env validation first
validateEnv();

// Run async Redis validation, then bind HTTP listener
verifyAndAutoStartRedis().then(() => {
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 AppForge API running on port ${env.PORT}`);
    logger.info(`📦 Environment: ${env.NODE_ENV}`);
    logger.info(`🌐 Frontend URL: ${env.APP_URL}`);
    
    // Start background stale build cleaner
    startStaleBuildCleaner();
  });
}).catch((err) => {
  logger.error('❌ Failed to run startup checks:', err);
  process.exit(1);
});

export { app, httpServer, io };
