import { Request, Response } from 'express';
import { TradeModel } from '../models/TradeModel';
import logger from '../utils/logger';

export class TradeController {
  /**
   * Get trades by symbol
   */
  getTradesBySymbol = async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const trades = await TradeModel.findBySymbol(symbol.toUpperCase(), limit);

      res.json({
        symbol: symbol.toUpperCase(),
        trades,
        count: trades.length,
      });
    } catch (error: any) {
      logger.error('Error fetching trades:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get trades by order ID
   */
  getTradesByOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const trades = await TradeModel.findByOrderId(orderId);

      res.json({ trades, count: trades.length });
    } catch (error: any) {
      logger.error('Error fetching order trades:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  /**
   * Get recent trades
   */
  getRecentTrades = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const trades = await TradeModel.getRecentTrades(limit);

      res.json({ trades, count: trades.length });
    } catch (error: any) {
      logger.error('Error fetching recent trades:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };
}

