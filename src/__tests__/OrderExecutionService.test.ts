import { OrderExecutionService } from '../services/OrderExecutionService';
import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { OrderModel } from '../models/OrderModel';
import { dexRouterService } from '../services/DEXRouterService';
import { solanaService } from '../services/SolanaService';
import { webSocketService } from '../services/WebSocketService';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../models/OrderModel');
jest.mock('../services/DEXRouterService');
jest.mock('../services/SolanaService');
jest.mock('../services/WebSocketService');

describe('OrderExecutionService', () => {
  let orderExecutionService: OrderExecutionService;
  let mockOrder: Order;

  beforeEach(() => {
    orderExecutionService = new OrderExecutionService();
    mockOrder = {
      id: uuidv4(),
      userId: 'user1',
      symbol: 'SOL/USDC',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 1,
      filledQuantity: 0,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeInForce: 'GTC',
    };
    jest.clearAllMocks();
  });

  describe('executeOrder', () => {
    it('should execute order flow: PENDING → ROUTING → ROUTED → CONFIRMED → FILLED', async () => {
      const mockRoutingDecision = {
        selectedRoute: {
          dex: 'Jupiter Aggregator',
          inputAmount: 1,
          outputAmount: 150,
          priceImpact: 0.5,
        },
        routingReason: 'Best route selected',
        timestamp: new Date().toISOString(),
      };

      const mockTransactionResult = {
        signature: 'test-signature-123',
        explorerUrl: 'https://solscan.io/tx/test-signature-123',
        confirmed: true,
      };

      (dexRouterService.parseSymbol as jest.Mock).mockReturnValue({
        inputMint: 'USDC',
        outputMint: 'SOL',
      });

      (dexRouterService.findBestRoute as jest.Mock).mockResolvedValue(mockRoutingDecision);
      (solanaService.executeSwap as jest.Mock).mockResolvedValue(mockTransactionResult);
      (OrderModel.updateStatus as jest.Mock).mockResolvedValue(mockOrder);
      (OrderModel.updateTransactionDetails as jest.Mock).mockResolvedValue(mockOrder);
      (OrderModel.findById as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.FILLED,
        transactionSignature: mockTransactionResult.signature,
        explorerUrl: mockTransactionResult.explorerUrl,
      });

      const result = await orderExecutionService.executeOrder(mockOrder);

      // Verify status updates were called
      expect(OrderModel.updateStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatus.ROUTING,
        undefined
      );
      expect(OrderModel.updateStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatus.ROUTED,
        undefined
      );
      expect(OrderModel.updateStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatus.CONFIRMED,
        undefined
      );
      expect(OrderModel.updateStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatus.FILLED,
        undefined
      );

      // Verify WebSocket broadcasts
      expect(webSocketService.broadcastOrderUpdate).toHaveBeenCalled();

      expect(result.status).toBe(OrderStatus.FILLED);
    });

    it('should handle errors and set status to REJECTED', async () => {
      (dexRouterService.parseSymbol as jest.Mock).mockReturnValue({
        inputMint: 'USDC',
        outputMint: 'SOL',
      });

      (dexRouterService.findBestRoute as jest.Mock).mockRejectedValue(
        new Error('Routing failed')
      );
      (OrderModel.updateStatus as jest.Mock).mockResolvedValue(mockOrder);

      await expect(orderExecutionService.executeOrder(mockOrder)).rejects.toThrow();

      expect(OrderModel.updateStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatus.REJECTED,
        undefined
      );
    });
  });
});

