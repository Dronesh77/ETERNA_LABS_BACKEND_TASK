import { query } from '../database/connection';
import { Order, OrderStatus, OrderType, OrderSide } from '../types/order';

export class OrderModel {
  static async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'filledQuantity' | 'status'>): Promise<Order> {
    const result = await query(
      `INSERT INTO orders (user_id, symbol, side, type, quantity, price, stop_price, time_in_force, status, filled_quantity, wallet_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        orderData.userId,
        orderData.symbol,
        orderData.side,
        orderData.type,
        orderData.quantity,
        orderData.price || null,
        orderData.stopPrice || null,
        orderData.timeInForce,
        OrderStatus.PENDING,
        0,
        orderData.walletAddress || null,
      ]
    );

    return this.mapRowToOrder(result.rows[0]);
  }

  static async findById(id: string): Promise<Order | null> {
    const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToOrder(result.rows[0]);
  }

  static async findByUserId(userId: string): Promise<Order[]> {
    const result = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map((row) => this.mapRowToOrder(row));
  }

  static async findBySymbol(symbol: string): Promise<Order[]> {
    const result = await query(
      `SELECT * FROM orders 
       WHERE symbol = $1 
       AND status IN ('PENDING', 'PARTIALLY_FILLED')
       ORDER BY 
         CASE WHEN side = 'BUY' THEN price END DESC,
         CASE WHEN side = 'SELL' THEN price END ASC,
         created_at ASC`,
      [symbol]
    );
    return result.rows.map((row) => this.mapRowToOrder(row));
  }

  static async updateStatus(
    id: string,
    status: OrderStatus,
    filledQuantity?: number
  ): Promise<Order | null> {
    const updates: string[] = ['status = $2'];
    const values: any[] = [id, status];

    if (filledQuantity !== undefined) {
      updates.push('filled_quantity = $3');
      values.push(filledQuantity);
    }

    const result = await query(
      `UPDATE orders 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToOrder(result.rows[0]);
  }

  static async cancelOrder(id: string): Promise<Order | null> {
    return this.updateStatus(id, OrderStatus.CANCELLED);
  }

  static async updateTransactionDetails(
    id: string,
    transactionSignature: string,
    explorerUrl: string,
    routingDecision?: any
  ): Promise<Order | null> {
    const result = await query(
      `UPDATE orders 
       SET transaction_signature = $2, 
           explorer_url = $3, 
           routing_decision = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, transactionSignature, explorerUrl, routingDecision ? JSON.stringify(routingDecision) : null]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToOrder(result.rows[0]);
  }

  static async getPendingOrders(symbol?: string): Promise<Order[]> {
    let queryText = `SELECT * FROM orders 
                     WHERE status IN ('PENDING', 'PARTIALLY_FILLED', 'ROUTING', 'ROUTED')`;
    const params: any[] = [];

    if (symbol) {
      queryText += ' AND symbol = $1';
      params.push(symbol);
    }

    queryText += ' ORDER BY created_at ASC';

    const result = await query(queryText, params);
    return result.rows.map((row) => this.mapRowToOrder(row));
  }

  private static mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      symbol: row.symbol,
      side: row.side as OrderSide,
      type: row.type as OrderType,
      quantity: parseFloat(row.quantity),
      price: row.price ? parseFloat(row.price) : undefined,
      stopPrice: row.stop_price ? parseFloat(row.stop_price) : undefined,
      filledQuantity: parseFloat(row.filled_quantity),
      status: row.status as OrderStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timeInForce: row.time_in_force as 'GTC' | 'IOC' | 'FOK',
      transactionSignature: row.transaction_signature || undefined,
      explorerUrl: row.explorer_url || undefined,
      routingDecision: row.routing_decision || undefined,
      walletAddress: row.wallet_address || undefined,
    };
  }
}

