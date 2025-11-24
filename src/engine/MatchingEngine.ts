import { Order, Trade, OrderSide, OrderType, OrderStatus } from '../types/order';
import { OrderModel } from '../models/OrderModel';
import { TradeModel } from '../models/TradeModel';
import logger from '../utils/logger';

export class MatchingEngine {
  /**
   * Process a new order and match it against existing orders
   */
  async processOrder(order: Order): Promise<{ order: Order; trades: Trade[] }> {
    logger.info(`Processing order: ${order.id}`, { order });

    // Validate order
    this.validateOrder(order);

    // For LIMIT orders, check if price is set
    if (order.type === OrderType.LIMIT && !order.price) {
      throw new Error('LIMIT orders must have a price');
    }

    // For MARKET orders, we need to match immediately
    if (order.type === OrderType.MARKET) {
      return this.processMarketOrder(order);
    }

    // For LIMIT orders, we match against the order book
    if (order.type === OrderType.LIMIT) {
      return this.processLimitOrder(order);
    }

    // For STOP and STOP_LIMIT orders, we add them to pending (would need price monitoring)
    if (order.type === OrderType.STOP || order.type === OrderType.STOP_LIMIT) {
      logger.info(`STOP order ${order.id} added to pending (price monitoring not implemented)`);
      return { order, trades: [] };
    }

    throw new Error(`Unsupported order type: ${order.type}`);
  }

  /**
   * Process a MARKET order - matches immediately at best available price
   */
  private async processMarketOrder(order: Order): Promise<{ order: Order; trades: Trade[] }> {
    const trades: Trade[] = [];
    let remainingQuantity = order.quantity;
    let updatedOrder = order;

    // Get opposite side orders sorted by price
    const oppositeSide = order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
    const matchingOrders = await this.getMatchingOrders(order.symbol, oppositeSide, order.type);

    for (const matchOrder of matchingOrders) {
      if (remainingQuantity <= 0) break;

      const matchQuantity = Math.min(remainingQuantity, matchOrder.quantity - matchOrder.filledQuantity);
      const matchPrice = matchOrder.price || 0; // For market orders, use the limit price of the match

      if (matchQuantity > 0) {
        const trade = await this.executeTrade(order, matchOrder, matchQuantity, matchPrice);
        trades.push(trade);
        remainingQuantity -= matchQuantity;
      }
    }

    // Update order status
    if (remainingQuantity === 0) {
      updatedOrder = await OrderModel.updateStatus(order.id, OrderStatus.FILLED, order.quantity) || order;
    } else if (trades.length > 0) {
      updatedOrder = await OrderModel.updateStatus(
        order.id,
        OrderStatus.PARTIALLY_FILLED,
        order.quantity - remainingQuantity
      ) || order;
    } else {
      // No matches found - reject market order
      updatedOrder = await OrderModel.updateStatus(order.id, OrderStatus.REJECTED) || order;
      logger.warn(`Market order ${order.id} rejected - no matching orders found`);
    }

    return { order: updatedOrder, trades };
  }

  /**
   * Process a LIMIT order - matches if price conditions are met
   */
  private async processLimitOrder(order: Order): Promise<{ order: Order; trades: Trade[] }> {
    const trades: Trade[] = [];
    let remainingQuantity = order.quantity;
    let updatedOrder = order;

    if (!order.price) {
      throw new Error('LIMIT order must have a price');
    }

    // Get opposite side orders that can match
    const oppositeSide = order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
    const matchingOrders = await this.getMatchingOrders(order.symbol, oppositeSide, OrderType.LIMIT);

    for (const matchOrder of matchingOrders) {
      if (remainingQuantity <= 0) break;
      if (!matchOrder.price) continue;

      // Check if prices match
      const canMatch =
        order.side === OrderSide.BUY
          ? matchOrder.price <= order.price // Buy order matches if sell price is <= buy price
          : matchOrder.price >= order.price; // Sell order matches if buy price is >= sell price

      if (!canMatch) continue;

      const matchQuantity = Math.min(
        remainingQuantity,
        matchOrder.quantity - matchOrder.filledQuantity
      );
      const matchPrice = this.determineTradePrice(order, matchOrder);

      if (matchQuantity > 0) {
        const trade = await this.executeTrade(order, matchOrder, matchQuantity, matchPrice);
        trades.push(trade);
        remainingQuantity -= matchQuantity;
      }
    }

    // Update order status
    if (remainingQuantity === 0) {
      updatedOrder = await OrderModel.updateStatus(order.id, OrderStatus.FILLED, order.quantity) || order;
    } else if (trades.length > 0) {
      updatedOrder = await OrderModel.updateStatus(
        order.id,
        OrderStatus.PARTIALLY_FILLED,
        order.quantity - remainingQuantity
      ) || order;
    } else {
      // No matches - order remains PENDING
      logger.info(`Limit order ${order.id} added to order book (no immediate matches)`);
    }

    return { order: updatedOrder, trades };
  }

  /**
   * Get orders that can potentially match
   */
  private async getMatchingOrders(
    symbol: string,
    side: OrderSide,
    type: OrderType
  ): Promise<Order[]> {
    const orders = await OrderModel.findBySymbol(symbol);
    return orders.filter(
      (o) =>
        o.side === side &&
        o.status !== OrderStatus.CANCELLED &&
        o.status !== OrderStatus.REJECTED &&
        o.status !== OrderStatus.FILLED &&
        (type === OrderType.MARKET || o.type === OrderType.LIMIT)
    );
  }

  /**
   * Execute a trade between two orders
   */
  private async executeTrade(
    order1: Order,
    order2: Order,
    quantity: number,
    price: number
  ): Promise<Trade> {
    logger.info(`Executing trade: ${quantity} @ ${price}`, {
      order1: order1.id,
      order2: order2.id,
    });

    // Determine buy and sell orders
    const buyOrder = order1.side === OrderSide.BUY ? order1 : order2;
    const sellOrder = order1.side === OrderSide.SELL ? order1 : order2;

    // Create trade record
    const trade = await TradeModel.create({
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      symbol: order1.symbol,
      quantity,
      price,
    });

    // Update both orders
    const buyFilled = buyOrder.filledQuantity + quantity;
    const sellFilled = sellOrder.filledQuantity + quantity;

    if (buyFilled >= buyOrder.quantity) {
      await OrderModel.updateStatus(buyOrder.id, OrderStatus.FILLED, buyFilled);
    } else {
      await OrderModel.updateStatus(buyOrder.id, OrderStatus.PARTIALLY_FILLED, buyFilled);
    }

    if (sellFilled >= sellOrder.quantity) {
      await OrderModel.updateStatus(sellOrder.id, OrderStatus.FILLED, sellFilled);
    } else {
      await OrderModel.updateStatus(sellOrder.id, OrderStatus.PARTIALLY_FILLED, sellFilled);
    }

    return trade;
  }

  /**
   * Determine the trade price based on order priority (price-time priority)
   */
  private determineTradePrice(order1: Order, order2: Order): number {
    // Price-time priority: use the price of the order that was placed first
    if (order1.createdAt < order2.createdAt) {
      return order1.price || order2.price || 0;
    }
    return order2.price || order1.price || 0;
  }

  /**
   * Validate order before processing
   */
  private validateOrder(order: Order): void {
    if (order.quantity <= 0) {
      throw new Error('Order quantity must be greater than 0');
    }

    if (order.type === OrderType.LIMIT && !order.price) {
      throw new Error('LIMIT orders must have a price');
    }

    if (order.type === OrderType.STOP && !order.stopPrice) {
      throw new Error('STOP orders must have a stop price');
    }

    if (order.type === OrderType.STOP_LIMIT && (!order.stopPrice || !order.price)) {
      throw new Error('STOP_LIMIT orders must have both stop price and limit price');
    }
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string): Promise<{ bids: any[]; asks: any[] }> {
    const orders = await OrderModel.findBySymbol(symbol);

    const bids = orders
      .filter((o) => o.side === OrderSide.BUY && o.status !== OrderStatus.FILLED)
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 20);

    const asks = orders
      .filter((o) => o.side === OrderSide.SELL && o.status !== OrderStatus.FILLED)
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .slice(0, 20);

    return { bids, asks };
  }
}

