import { query } from '../database/connection';
import { Trade } from '../types/order';

export class TradeModel {
  static async create(tradeData: Omit<Trade, 'id' | 'timestamp'>): Promise<Trade> {
    const result = await query(
      `INSERT INTO trades (buy_order_id, sell_order_id, symbol, quantity, price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        tradeData.buyOrderId,
        tradeData.sellOrderId,
        tradeData.symbol,
        tradeData.quantity,
        tradeData.price,
      ]
    );

    return this.mapRowToTrade(result.rows[0]);
  }

  static async findBySymbol(symbol: string, limit: number = 100): Promise<Trade[]> {
    const result = await query(
      `SELECT * FROM trades 
       WHERE symbol = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [symbol, limit]
    );
    return result.rows.map((row) => this.mapRowToTrade(row));
  }

  static async findByOrderId(orderId: string): Promise<Trade[]> {
    const result = await query(
      `SELECT * FROM trades 
       WHERE buy_order_id = $1 OR sell_order_id = $1
       ORDER BY timestamp DESC`,
      [orderId]
    );
    return result.rows.map((row) => this.mapRowToTrade(row));
  }

  static async getRecentTrades(limit: number = 100): Promise<Trade[]> {
    const result = await query(
      `SELECT * FROM trades 
       ORDER BY timestamp DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => this.mapRowToTrade(row));
  }

  private static mapRowToTrade(row: any): Trade {
    return {
      id: row.id,
      buyOrderId: row.buy_order_id,
      sellOrderId: row.sell_order_id,
      symbol: row.symbol,
      quantity: parseFloat(row.quantity),
      price: parseFloat(row.price),
      timestamp: row.timestamp,
    };
  }
}

