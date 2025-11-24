import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from '../utils/logger';
import { OrderStatus } from '../types/order';

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
  data?: any;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket client connected');
      this.clients.add(ws);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established',
          timestamp: new Date().toISOString(),
        })
      );

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          logger.debug('WebSocket message received:', data);
          
          // Handle ping/pong for keepalive
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });
    });

    logger.info('WebSocket server initialized on /ws');
  }

  /**
   * Broadcast order status update to all connected clients
   */
  broadcastOrderUpdate(update: OrderStatusUpdate): void {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    const message = JSON.stringify({
      type: 'order_update',
      ...update,
    });

    logger.info(`Broadcasting order update: ${update.orderId} - ${update.status}`, {
      orderId: update.orderId,
      status: update.status,
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        // Remove dead connections
        this.clients.delete(client);
      }
    });
  }

  /**
   * Send order status update to specific client (if we implement user-specific connections)
   */
  sendToClient(client: WebSocket, update: OrderStatusUpdate): void {
    if (client.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'order_update',
        ...update,
      });
      client.send(message);
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      logger.info('WebSocket server closed');
    }
  }
}

export const webSocketService = new WebSocketService();

