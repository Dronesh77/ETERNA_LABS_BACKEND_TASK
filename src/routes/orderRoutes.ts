import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

const router = Router();
const orderController = new OrderController();

// Order routes
router.post('/orders', orderController.createOrder);
router.get('/orders/pending', orderController.getPendingOrders);
router.get('/orders/:id', orderController.getOrder);
router.delete('/orders/:id', orderController.cancelOrder);
router.get('/users/:userId/orders', orderController.getOrdersByUser);
router.get('/orderbook/:symbol', orderController.getOrderBook);
router.get('/queue/status', orderController.getQueueStatus);

export default router;

