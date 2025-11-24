import { DEXRouterService } from '../services/DEXRouterService';
import { OrderSide } from '../types/order';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DEXRouterService', () => {
  let dexRouterService: DEXRouterService;

  beforeEach(() => {
    dexRouterService = new DEXRouterService();
    jest.clearAllMocks();
  });

  describe('getTokenMint', () => {
    it('should return correct mint address for SOL', () => {
      const mint = dexRouterService.getTokenMint('SOL');
      expect(mint).toBe('So11111111111111111111111111111111111111112');
    });

    it('should return correct mint address for USDC', () => {
      const mint = dexRouterService.getTokenMint('USDC');
      expect(mint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    it('should return symbol if not found', () => {
      const mint = dexRouterService.getTokenMint('UNKNOWN');
      expect(mint).toBe('UNKNOWN');
    });
  });

  describe('parseSymbol', () => {
    it('should parse BUY order correctly', () => {
      const result = dexRouterService.parseSymbol('SOL/USDC', OrderSide.BUY);
      expect(result.inputMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
      expect(result.outputMint).toBe('So11111111111111111111111111111111111111112'); // SOL
    });

    it('should parse SELL order correctly', () => {
      const result = dexRouterService.parseSymbol('SOL/USDC', OrderSide.SELL);
      expect(result.inputMint).toBe('So11111111111111111111111111111111111111112'); // SOL
      expect(result.outputMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
    });
  });

  describe('getQuote', () => {
    it('should get quote from Jupiter API', async () => {
      const mockResponse = {
        data: {
          inAmount: '1000000000', // 1 SOL in lamports
          outAmount: '150000000', // 150 USDC (example)
          priceImpactPct: '0.5',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const routes = await dexRouterService.getQuote(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        1,
        OrderSide.BUY
      );

      expect(routes).toHaveLength(1);
      expect(routes[0].inputAmount).toBe(1);
      expect(routes[0].outputAmount).toBe(0.15);
      expect(routes[0].dex).toBe('Jupiter Aggregator');
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(
        dexRouterService.getQuote(
          'So11111111111111111111111111111111111111112',
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          1,
          OrderSide.BUY
        )
      ).rejects.toThrow();
    });
  });

  describe('findBestRoute', () => {
    it('should find best route', async () => {
      const mockResponse = {
        data: {
          inAmount: '1000000000',
          outAmount: '150000000',
          priceImpactPct: '0.5',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const decision = await dexRouterService.findBestRoute(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        1,
        OrderSide.BUY
      );

      expect(decision.selectedRoute).toBeDefined();
      expect(decision.routingReason).toBeDefined();
      expect(decision.timestamp).toBeDefined();
    });
  });
});

