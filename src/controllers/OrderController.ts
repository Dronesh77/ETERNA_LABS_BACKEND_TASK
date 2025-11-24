import { Request, Response } from 'express';
import { OrderModel } from '../models/OrderModel';
import { MatchingEngine } from '../engine/MatchingEngine';
import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { orderQueueService } from '../services/OrderQueueService';
import { webSocketService } from '../services/WebSocketService';
import logger from '../utils/logger';

export class OrderController {
  private matchingEngine: MatchingEngine;

  constructor() {
    this.matchingEngine = new MatchingEngine();
  }

  /**
   * Create a new order
   */
  createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, symbol, side, type, quantity, price, stopPrice, timeInForce } = req.body;

      // Validate required fields
      if (!userId || !symbol || !side || !type || !quantity) {
        res.status(400).json({
          error: 'Missing required fields: userId, symbol, side, type, quantity',
        });
        return;
      }

      // Validate side
      if (!Object.values(OrderSide).includes(side)) {
        res.status(400).json({ error: 'Invalid side. Must be BUY or SELL' });
        return;
      }

      // Validate type
      if (!Object.values(OrderType).includes(type)) {
        res.status(400).json({
          error: 'Invalid type. Must be MARKET, LIMIT, STOP, or STOP_LIMIT',
        });
        return;
      }

      // Create order object
      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'filledQuantity' | 'status'> = {
        userId,
        symbol: symbol.toUpperCase(),
        side: side as OrderSide,
        type: type as OrderType,
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        timeInForce: timeInForce || 'GTC',
        walletAddress: req.body.walletAddress || undefined,
      };

      // Create order in database
      const order = await OrderModel.create(orderData);

      // Send initial status update via WebSocket
      webSocketService.broadcastOrderUpdate({
        orderId: order.id,
        status: OrderStatus.PENDING,
        message: 'Order created, starting execution...',
        timestamp: new Date().toISOString(),
      });

      // For MARKET orders on Solana pairs, use DEX routing and execution
      // For other orders, use traditional matching engine
      const isSolanaOrder = order.symbol.includes('SOL') || order.symbol.includes('/');
      
      if (isSolanaOrder && order.type === OrderType.MARKET) {
        // Execute via DEX routing and Solana
        // Add to queue for processing
        orderQueueService.enqueue(order).catch((error) => {
          logger.error(`Error queuing order ${order.id}:`, error);
        });

        res.status(201).json({
          order,
          message: 'Order created and queued for DEX execution',
          executionMode: 'DEX_ROUTING',
          queueStatus: orderQueueService.getStatus(),
        });
      } else {
        // Use traditional matching engine
      const result = await this.matchingEngine.processOrder(order);

      res.status(201).json({
        order: result.order,
        trades: result.trades,
        message: 'Order created successfully',
          executionMode: 'TRADITIONAL_MATCHING',
      });
      }
    } catch (error: any) {
      logger.error('Error creating order:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get order by ID
   */
  getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await OrderModel.findById(id);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      res.json(order);
    } catch (error: any) {
      logger.error('Error fetching order:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get orders by user ID
   */
  getOrdersByUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const orders = await OrderModel.findByUserId(userId);

      res.json({ orders, count: orders.length });
    } catch (error: any) {
      logger.error('Error fetching user orders:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Cancel an order
   */
  cancelOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await OrderModel.findById(id);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (order.status === OrderStatus.FILLED) {
        res.status(400).json({ error: 'Cannot cancel a filled order' });
        return;
      }

      if (order.status === OrderStatus.CANCELLED) {
        res.status(400).json({ error: 'Order is already cancelled' });
        return;
      }

      const cancelledOrder = await OrderModel.cancelOrder(id);

      res.json({
        order: cancelledOrder,
        message: 'Order cancelled successfully',
      });
    } catch (error: any) {
      logger.error('Error cancelling order:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get order book for a symbol
   */
  getOrderBook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.params;
      const orderBook = await this.matchingEngine.getOrderBook(symbol.toUpperCase());

      res.json({
        symbol: symbol.toUpperCase(),
        bids: orderBook.bids,
        asks: orderBook.asks,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching order book:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get pending orders
   */
  getPendingOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.query;
      const orders = await OrderModel.getPendingOrders(symbol as string | undefined);

      res.json({ orders, count: orders.length });
    } catch (error: any) {
      logger.error('Error fetching pending orders:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get queue status
   */
  getQueueStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = orderQueueService.getStatus();
      res.json({
        queue: status,
        websocket: {
          connectedClients: webSocketService.getClientCount(),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching queue status:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };
}

