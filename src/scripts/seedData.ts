/**
 * Seed script to populate database with sample data
 * Run with: npx ts-node src/scripts/seedData.ts
 */

import { OrderModel } from '../models/OrderModel';
import { MatchingEngine } from '../engine/MatchingEngine';
import { OrderSide, OrderType } from '../types/order';
// Database initialization is done via npm run setup:db
import logger from '../utils/logger';

const matchingEngine = new MatchingEngine();

async function seedData() {
  try {
    // Database should already be set up via npm run setup:db
    logger.info('Starting seed...');

    // Sample orders
    const orders = [
      {
        userId: 'user1',
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 10,
        price: 50000,
        timeInForce: 'GTC' as const,
      },
      {
        userId: 'user2',
        symbol: 'BTC/USD',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        quantity: 5,
        price: 51000,
        timeInForce: 'GTC' as const,
      },
      {
        userId: 'user3',
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 15,
        price: 49000,
        timeInForce: 'GTC' as const,
      },
      {
        userId: 'user4',
        symbol: 'ETH/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 100,
        price: 3000,
        timeInForce: 'GTC' as const,
      },
      {
        userId: 'user5',
        symbol: 'ETH/USD',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        quantity: 50,
        price: 3100,
        timeInForce: 'GTC' as const,
      },
    ];

    logger.info(`Creating ${orders.length} sample orders...`);

    for (const orderData of orders) {
      const order = await OrderModel.create(orderData);
      logger.info(`Created order: ${order.id} - ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);
      
      // Process order through matching engine
      const result = await matchingEngine.processOrder(order);
      if (result.trades.length > 0) {
        logger.info(`Order ${order.id} matched with ${result.trades.length} trades`);
      }
    }

    logger.info('Seed data created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();

