import { Router } from 'express';
import { TradeController } from '../controllers/TradeController';

const router = Router();
const tradeController = new TradeController();

// Trade routes
router.get('/trades', tradeController.getRecentTrades);
router.get('/trades/symbol/:symbol', tradeController.getTradesBySymbol);
router.get('/trades/order/:orderId', tradeController.getTradesByOrder);

export default router;

