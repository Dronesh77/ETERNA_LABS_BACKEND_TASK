import { Order } from '../types/order';
import { orderExecutionService } from './OrderExecutionService';
import logger from '../utils/logger';

/**
 * Order Queue Service for processing multiple orders concurrently
 */
export class OrderQueueService {
  private queue: Order[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add order to queue
   */
  async enqueue(order: Order): Promise<void> {
    this.queue.push(order);
    logger.info(`Order ${order.id} added to queue. Queue size: ${this.queue.length}`);
    this.processQueue();
  }

  /**
   * Process queue with concurrency limit
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const order = this.queue.shift();
      if (!order) break;

      if (this.processing.has(order.id)) {
        continue; // Already processing
      }

      this.processing.add(order.id);
      
      // Process order asynchronously
      this.processOrder(order)
        .then(() => {
          this.processing.delete(order.id);
          logger.info(`Order ${order.id} processed. Remaining in queue: ${this.queue.length}`);
          // Continue processing queue
          this.processQueue();
        })
        .catch((error) => {
          this.processing.delete(order.id);
          logger.error(`Error processing order ${order.id}:`, error);
          // Continue processing queue
          this.processQueue();
        });
    }
  }

  /**
   * Process a single order
   */
  private async processOrder(order: Order): Promise<void> {
    try {
      logger.info(`Processing order from queue: ${order.id}`);
      await orderExecutionService.executeOrder(order, order.walletAddress);
      logger.info(`Order ${order.id} completed successfully`);
    } catch (error: any) {
      logger.error(`Failed to process order ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { queueSize: number; processing: number; processingIds: string[] } {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      processingIds: Array.from(this.processing),
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
    logger.info('Order queue cleared');
  }
}

export const orderQueueService = new OrderQueueService(5); // Process up to 5 orders concurrently

