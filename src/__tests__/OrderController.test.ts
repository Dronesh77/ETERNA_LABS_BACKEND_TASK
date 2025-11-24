import { Request, Response } from 'express';
import { OrderController } from '../controllers/OrderController';
import { OrderModel } from '../models/OrderModel';
import { MatchingEngine } from '../engine/MatchingEngine';
import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/OrderModel');
jest.mock('../engine/MatchingEngine');

describe('OrderController', () => {
  let orderController: OrderController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    orderController = new OrderController();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        userId: 'user1',
        symbol: 'BTC/USD',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 10,
        price: 50000,
      };

      const createdOrder: Order = {
        id: uuidv4(),
        userId: orderData.userId,
        symbol: orderData.symbol,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: orderData.quantity,
        price: orderData.price,
        filledQuantity: 0,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeInForce: 'GTC',
      };

      (OrderModel.create as jest.Mock).mockResolvedValue(createdOrder);
      (MatchingEngine.prototype.processOrder as jest.Mock).mockResolvedValue({
        order: createdOrder,
        trades: [],
      });

      mockRequest.body = orderData;

      await orderController.createOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.any(Object),
          trades: expect.any(Array),
          message: 'Order created successfully',
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        userId: 'user1',
        // Missing other required fields
      };

      await orderController.createOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Missing required fields'),
        })
      );
    });
  });

  describe('getOrder', () => {
    it('should return order by ID', async () => {
      const orderId = uuidv4();
      const order: Order = {
        id: orderId,
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

      (OrderModel.findById as jest.Mock).mockResolvedValue(order);
      mockRequest.params = { id: orderId };

      await orderController.getOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(order);
    });

    it('should return 404 if order not found', async () => {
      (OrderModel.findById as jest.Mock).mockResolvedValue(null);
      mockRequest.params = { id: uuidv4() };

      await orderController.getOrder(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Order not found',
        })
      );
    });
  });
});

