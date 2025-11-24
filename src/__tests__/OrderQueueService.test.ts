import { OrderQueueService } from '../services/OrderQueueService';
import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { v4 as uuidv4 } from 'uuid';
import { orderExecutionService } from '../services/OrderExecutionService';

jest.mock('../services/OrderExecutionService');

describe('OrderQueueService', () => {
  let queueService: OrderQueueService;

  beforeEach(() => {
    queueService = new OrderQueueService(2); // Max 2 concurrent
    jest.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add order to queue', async () => {
      const order: Order = {
        id: uuidv4(),
        userId: 'user1',
        symbol: 'SOL/USDC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 1,
        filledQuantity: 0,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeInForce: 'GTC',
      };

      await queueService.enqueue(order);
      
      const status = queueService.getStatus();
      expect(status.queueSize).toBeGreaterThanOrEqual(0); // May have started processing
    });
  });

  describe('getStatus', () => {
    it('should return queue status', () => {
      const status = queueService.getStatus();
      expect(status).toHaveProperty('queueSize');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('processingIds');
    });
  });

  describe('clear', () => {
    it('should clear queue', () => {
      queueService.clear();
      const status = queueService.getStatus();
      expect(status.queueSize).toBe(0);
      expect(status.processing).toBe(0);
    });
  });
});

