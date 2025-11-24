import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import orderRoutes from './routes/orderRoutes';
import tradeRoutes from './routes/tradeRoutes';
import { errorHandler } from './middleware/errorHandler';
import { webSocketService } from './services/WebSocketService';
import logger from './utils/logger';

dotenv.config();

const app: Application = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'order-execution-engine',
  });
});

// API Routes
app.use('/api/v1', orderRoutes);
app.use('/api/v1', tradeRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const { query } = await import('./database/connection');
    await query('SELECT 1');
    logger.info('Database connection verified');

    // Initialize WebSocket server
    webSocketService.initialize(server);
    logger.info('WebSocket server initialized');

    server.listen(PORT, () => {
      logger.info(`Order Execution Engine server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Make sure the database is set up. Run: npm run setup:db');
    process.exit(1);
  }
};

startServer();

export default app;

