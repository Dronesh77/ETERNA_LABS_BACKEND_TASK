import { WebSocketService, OrderStatusUpdate } from '../services/WebSocketService';
import { OrderStatus } from '../types/order';
import { createServer } from 'http';

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let server: any;

  beforeEach(() => {
    webSocketService = new WebSocketService();
    server = createServer();
  });

  afterEach(() => {
    webSocketService.close();
    server.close();
  });

  describe('initialize', () => {
    it('should initialize WebSocket server', () => {
      webSocketService.initialize(server);
      expect(webSocketService.getClientCount()).toBe(0);
    });
  });

  describe('broadcastOrderUpdate', () => {
    it('should broadcast order update', () => {
      webSocketService.initialize(server);
      
      const update: OrderStatusUpdate = {
        orderId: 'test-order-123',
        status: OrderStatus.ROUTING,
        message: 'Finding best route',
        timestamp: new Date().toISOString(),
      };

      // Should not throw error even with no clients
      expect(() => webSocketService.broadcastOrderUpdate(update)).not.toThrow();
    });
  });

  describe('getClientCount', () => {
    it('should return 0 when no clients connected', () => {
      webSocketService.initialize(server);
      expect(webSocketService.getClientCount()).toBe(0);
    });
  });
});

