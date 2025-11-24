import logger from '../utils/logger';
import { OrderSide, Order } from '../types/order';

export interface Route {
  dex: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  route?: any;
  estimatedGas?: number;
}

export interface RoutingDecision {
  selectedRoute: Route;
  alternativeRoutes: Route[];
  routingReason: string;
  timestamp: string;
}

/**
 * Mock DEX Router Service
 * Simulates routing across multiple Solana DEXs (Raydium, Meteora, etc.)
 */
export class DEXRouterService {
  constructor() {
    // Mock implementation for demo purposes
  }

  /**
   * Get Raydium quote (mock implementation)
   */
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Route> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Mock base price (e.g., 1 SOL = 150 USDC)
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const priceWithVariance = basePrice * (0.98 + Math.random() * 0.04); // 2% variance
    const outputAmount = amount * priceWithVariance;
    const fee = 0.003; // 0.3% fee

    logger.info(`Raydium quote: ${amount} ${tokenIn} → ${outputAmount.toFixed(6)} ${tokenOut}`, {
      dex: 'Raydium',
      inputAmount: amount,
      outputAmount,
      fee,
    });

    return {
      dex: 'Raydium',
      inputAmount: amount,
      outputAmount,
      priceImpact: Math.random() * 0.5, // 0-0.5% price impact
      fee,
    };
  }

  /**
   * Get Meteora quote (mock implementation)
   */
  async getMeteorQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Route> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Mock base price with different variance
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const priceWithVariance = basePrice * (0.97 + Math.random() * 0.05); // 3% variance
    const outputAmount = amount * priceWithVariance;
    const fee = 0.002; // 0.2% fee

    logger.info(`Meteora quote: ${amount} ${tokenIn} → ${outputAmount.toFixed(6)} ${tokenOut}`, {
      dex: 'Meteora',
      inputAmount: amount,
      outputAmount,
      fee,
    });

    return {
      dex: 'Meteora',
      inputAmount: amount,
      outputAmount,
      priceImpact: Math.random() * 0.6, // 0-0.6% price impact
      fee,
    };
  }

  /**
   * Get base price for token pair
   */
  private getBasePrice(tokenIn: string, tokenOut: string): number {
    // Mock prices
    const prices: Record<string, number> = {
      'SOL/USDC': 150,
      'USDC/SOL': 1 / 150,
      'SOL/USDT': 150,
      'USDT/SOL': 1 / 150,
      'BTC/SOL': 0.01,
      'SOL/BTC': 100,
      'ETH/SOL': 0.05,
      'SOL/ETH': 20,
    };

    const key = `${tokenIn}/${tokenOut}`;
    return prices[key] || 1; // Default to 1:1 if not found
  }

  /**
   * Get quotes from multiple DEXs
   */
  async getQuotes(
    inputMint: string,
    outputMint: string,
    amount: number,
    side: OrderSide
  ): Promise<Route[]> {
    try {
      const tokenIn = this.getTokenSymbol(inputMint);
      const tokenOut = this.getTokenSymbol(outputMint);

      logger.info(`Getting quotes from multiple DEXs`, {
        tokenIn,
        tokenOut,
        amount,
        side,
      });

      // Get quotes from multiple DEXs in parallel
      const [raydiumQuote, meteoraQuote] = await Promise.all([
        this.getRaydiumQuote(tokenIn, tokenOut, amount),
        this.getMeteorQuote(tokenIn, tokenOut, amount),
      ]);

      return [raydiumQuote, meteoraQuote];
    } catch (error: any) {
      // Extract safe error message to avoid circular reference
      const errorMessage = error?.message || String(error);
      logger.error('Error getting quotes:', { error: errorMessage });
      throw new Error(`Failed to get DEX quotes: ${errorMessage}`);
    }
  }

  /**
   * Find best route across multiple DEXs
   */
  async findBestRoute(
    inputMint: string,
    outputMint: string,
    amount: number,
    side: OrderSide
  ): Promise<RoutingDecision> {
    try {
      logger.info(`Finding best route for ${side} order`, {
        inputMint,
        outputMint,
        amount,
      });

      // Get quotes from multiple DEXs
      const routes = await this.getQuotes(inputMint, outputMint, amount, side);

      if (routes.length === 0) {
        throw new Error('No routes found');
      }

      // Select best route based on effective output (output - fees)
      const bestRoute = routes.reduce((best, current) => {
        const bestEffective = best.outputAmount * (1 - best.fee);
        const currentEffective = current.outputAmount * (1 - current.fee);

        // Prefer route with better effective output
        if (currentEffective > bestEffective) {
          return current;
        }
        // If effective output is similar, prefer lower price impact
        if (
          Math.abs(currentEffective - bestEffective) < 0.01 &&
          current.priceImpact < best.priceImpact
        ) {
          return current;
        }
        return best;
      });

      const routingReason = `Selected ${bestRoute.dex} route: ${bestRoute.outputAmount.toFixed(6)} output (${(bestRoute.fee * 100).toFixed(2)}% fee, ${bestRoute.priceImpact.toFixed(2)}% impact)`;

      logger.info('Best route selected:', {
        dex: bestRoute.dex,
        inputAmount: bestRoute.inputAmount,
        outputAmount: bestRoute.outputAmount,
        fee: bestRoute.fee,
        priceImpact: bestRoute.priceImpact,
        reason: routingReason,
      });

      return {
        selectedRoute: bestRoute,
        alternativeRoutes: routes.filter((r) => r !== bestRoute),
        routingReason,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Extract safe error message to avoid circular reference
      const errorMessage = error?.message || String(error);
      logger.error('Error finding best route:', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Execute swap on selected DEX (mock implementation)
   */
  async executeSwap(dex: string, order: Order): Promise<{ txHash: string; executedPrice: number }> {
    // Simulate execution delay (2-3 seconds)
    const delay = 2000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const txHash = this.generateMockTxHash();
    const basePrice = this.getBasePrice(
      this.getTokenSymbol(order.symbol.split('/')[0]),
      this.getTokenSymbol(order.symbol.split('/')[1])
    );
    const executedPrice = basePrice * (0.99 + Math.random() * 0.02); // Slight variance

    logger.info(`Swap executed on ${dex}`, {
      orderId: order.id,
      dex,
      txHash,
      executedPrice,
    });

    return { txHash, executedPrice };
  }

  /**
   * Generate mock transaction hash
   */
  private generateMockTxHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get token symbol from mint address
   */
  private getTokenSymbol(mint: string): string {
    const mintToSymbol: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': 'BTC',
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
    };
    return mintToSymbol[mint] || mint.substring(0, 8);
  }

  /**
   * Get Solana token mint addresses for common tokens
   */
  getTokenMint(symbol: string): string {
    const tokenMints: Record<string, string> = {
      SOL: 'So11111111111111111111111111111111111111112',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      BTC: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', // BTC on Solana (wrapped)
      ETH: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH on Solana (wrapped)
    };

    return tokenMints[symbol.toUpperCase()] || symbol; // Return symbol if not found (assume it's already a mint address)
  }

  /**
   * Parse trading pair symbol to input/output mints
   */
  parseSymbol(symbol: string, side: OrderSide): { inputMint: string; outputMint: string } {
    // Format: "SOL/USDC" or "BTC/SOL"
    const [base, quote] = symbol.split('/').map((s) => s.trim());

    if (side === OrderSide.BUY) {
      // Buying base with quote (e.g., buying SOL with USDC)
      return {
        inputMint: this.getTokenMint(quote),
        outputMint: this.getTokenMint(base),
      };
    } else {
      // Selling base for quote (e.g., selling SOL for USDC)
      return {
        inputMint: this.getTokenMint(base),
        outputMint: this.getTokenMint(quote),
      };
    }
  }
}

export const dexRouterService = new DEXRouterService();

