import { Order, OrderStatus } from '../types/order';
import { OrderModel } from '../models/OrderModel';
import { dexRouterService } from './DEXRouterService';
import { solanaService } from './SolanaService';
import { webSocketService, OrderStatusUpdate } from './WebSocketService';
import logger from '../utils/logger';

/**
 * Order Execution Service that orchestrates the complete order flow:
 * PENDING → ROUTING → ROUTED → CONFIRMED → FILLED
 */
export class OrderExecutionService {
  /**
   * Execute order with DEX routing and Solana transaction
   */
  async executeOrder(order: Order, _walletAddress?: string): Promise<Order> {
    try {
      logger.info(`Starting order execution for order ${order.id}`, {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
      });

      // Step 1: Update status to ROUTING and notify via WebSocket
      await this.updateOrderStatus(order.id, OrderStatus.ROUTING, 'Finding best DEX route...', {
        orderId: order.id,
      });

      // Step 2: Find best DEX route
      const { inputMint, outputMint } = dexRouterService.parseSymbol(order.symbol, order.side);
      const routingDecision = await dexRouterService.findBestRoute(
        inputMint,
        outputMint,
        order.quantity,
        order.side
      );

      logger.info('Best route found', {
        orderId: order.id,
        route: routingDecision.selectedRoute.dex,
        outputAmount: routingDecision.selectedRoute.outputAmount,
        priceImpact: routingDecision.selectedRoute.priceImpact,
      });

      // Step 3: Update status to ROUTED
      await this.updateOrderStatus(
        order.id,
        OrderStatus.ROUTED,
        `Route found: ${routingDecision.routingReason}`,
        {
          routingDecision,
        }
      );

      // Step 4: Execute swap on selected DEX
      const swapResult = await dexRouterService.executeSwap(
        routingDecision.selectedRoute.dex,
        order
      );

      // Generate Solana explorer URL
      const explorerUrl = solanaService.getExplorerUrl(swapResult.txHash);

      logger.info('Swap executed', {
        orderId: order.id,
        dex: routingDecision.selectedRoute.dex,
        txHash: swapResult.txHash,
        executedPrice: swapResult.executedPrice,
        explorerUrl,
      });

      // Step 5: Update order with transaction details
      await OrderModel.updateTransactionDetails(
        order.id,
        swapResult.txHash,
        explorerUrl,
        routingDecision
      );

      // Step 6: Update status to CONFIRMED
      await this.updateOrderStatus(
        order.id,
        OrderStatus.CONFIRMED,
        `Transaction confirmed on ${routingDecision.selectedRoute.dex}: ${swapResult.txHash}`,
        {
          transactionSignature: swapResult.txHash,
          explorerUrl,
          executedPrice: swapResult.executedPrice,
        }
      );

      // Step 7: Mark as FILLED (since we executed on-chain)
      await this.updateOrderStatus(
        order.id,
        OrderStatus.FILLED,
        'Order filled successfully on Solana',
        {
          filledQuantity: order.quantity,
        }
      );

      const finalOrder = await OrderModel.findById(order.id);
      return finalOrder!;
    } catch (error: any) {
      // Extract safe error message to avoid circular reference
      const errorMessage = error?.message || String(error);
      logger.error(`Error executing order ${order.id}:`, { error: errorMessage });
      
      // Update status to REJECTED on error
      await this.updateOrderStatus(
        order.id,
        OrderStatus.REJECTED,
        `Order execution failed: ${errorMessage}`,
        { error: errorMessage }
      );

      throw error;
    }
  }

  /**
   * Update order status and broadcast via WebSocket
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      await OrderModel.updateStatus(orderId, status, undefined);

      const update: OrderStatusUpdate = {
        orderId,
        status,
        message,
        timestamp: new Date().toISOString(),
        data,
      };

      // Broadcast status update via WebSocket
      webSocketService.broadcastOrderUpdate(update);

      logger.info(`Order status updated: ${orderId} → ${status}`, {
        orderId,
        status,
        message,
      });
    } catch (error: any) {
      // Extract safe error message to avoid circular reference
      const errorMessage = error?.message || String(error);
      logger.error(`Error updating order status for ${orderId}:`, { error: errorMessage });
      throw error;
    }
  }
}

export const orderExecutionService = new OrderExecutionService();

