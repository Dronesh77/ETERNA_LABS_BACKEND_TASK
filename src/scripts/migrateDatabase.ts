import { query } from '../database/connection';
import logger from '../utils/logger';

/**
 * Migration script to add new columns for Solana/DEX integration
 */
async function migrateDatabase() {
  try {
    logger.info('Starting database migration...');

    // Add new columns if they don't exist
    await query(`
      DO $$ 
      BEGIN
        -- Add transaction_signature column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='orders' AND column_name='transaction_signature') THEN
          ALTER TABLE orders ADD COLUMN transaction_signature VARCHAR(255);
          RAISE NOTICE 'Added transaction_signature column';
        END IF;

        -- Add explorer_url column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='orders' AND column_name='explorer_url') THEN
          ALTER TABLE orders ADD COLUMN explorer_url TEXT;
          RAISE NOTICE 'Added explorer_url column';
        END IF;

        -- Add routing_decision column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='orders' AND column_name='routing_decision') THEN
          ALTER TABLE orders ADD COLUMN routing_decision JSONB;
          RAISE NOTICE 'Added routing_decision column';
        END IF;

        -- Add wallet_address column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='orders' AND column_name='wallet_address') THEN
          ALTER TABLE orders ADD COLUMN wallet_address VARCHAR(255);
          RAISE NOTICE 'Added wallet_address column';
        END IF;
      END $$;
    `);

    // Update status check constraint to include new statuses
    await query(`
      DO $$
      BEGIN
        -- Drop old constraint if it exists
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        
        -- Add new constraint with all statuses
        ALTER TABLE orders ADD CONSTRAINT orders_status_check 
          CHECK (status IN ('PENDING', 'ROUTING', 'ROUTED', 'CONFIRMED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED'));
      END $$;
    `);

    logger.info('Database migration completed successfully');
  } catch (error: any) {
    logger.error('Database migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateDatabase;

