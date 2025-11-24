import { MatchingEngine } from '../engine/MatchingEngine';
import { OrderModel } from '../models/OrderModel';
import { TradeModel } from '../models/TradeModel';
import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { v4 as uuidv4 } from 'uuid';

// Mock the models
jest.mock('../models/OrderModel');
jest.mock('../models/TradeModel');

describe('MatchingEngine', () => {
  let matchingEngine: MatchingEngine;

  beforeEach(() => {
    matchingEngine = new MatchingEngine();
    jest.clearAllMocks();
  });

  describe('processOrder', () => {
    it('should process a LIMIT buy order and match with a sell order', async () => {
      const buyOrder: Order = {
        id: uuidv4(),
        userId: 'user1',
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 10,
        price: 50000,
        filledQuantity: 0,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeInForce: 'GTC',
      };

      const sellOrder: Order = {
        id: uuidv4(),
        userId: 'user2',
        symbol: 'BTC/USD',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        quantity: 10,
        price: 49000,
        filledQuantity: 0,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeInForce: 'GTC',
      };

      (OrderModel.findBySymbol as jest.Mock).mockResolvedValue([sellOrder]);
      (OrderModel.updateStatus as jest.Mock).mockImplementation((id, status, filled) => {
        return Promise.resolve({ ...buyOrder, status, filledQuantity: filled || 0 });
      });
      (TradeModel.create as jest.Mock).mockResolvedValue({
        id: uuidv4(),
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        symbol: 'BTC/USD',
        quantity: 10,
        price: 49000,
        timestamp: new Date(),
      });

      const result = await matchingEngine.processOrder(buyOrder);

      expect(result.trades).toHaveLength(1);
      expect(result.order.status).toBe(OrderStatus.FILLED);
    });

    it('should reject a LIMIT order without price', async () => {
      const order: Order = {
        id: uuidv4(),
        userId: 'user1',
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 10,
        filledQuantity: 0,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeInForce: 'GTC',
      };

      await expect(matchingEngine.processOrder(order)).rejects.toThrow(
        'LIMIT orders must have a price'
      );
    });
  });
});

