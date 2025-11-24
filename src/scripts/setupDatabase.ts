/**
 * Database Setup Script
 * This script creates the database and initializes the schema
 * Run with: npm run setup:db
 * Or: npx ts-node src/scripts/setupDatabase.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('\n❌ ERROR: .env file not found!');
  console.error('\nPlease create a .env file with your database credentials.');
  console.error('You can copy from env.example:');
  console.error('  cp env.example .env');
  console.error('\nThen edit .env with your PostgreSQL credentials.\n');
  process.exit(1);
}

dotenv.config();

// Build config - for trust authentication, don't set password if empty
const baseConfig: any = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default postgres DB first
  user: process.env.DB_USER || 'postgres',
};

// Only set password if it's provided and not empty
// For trust authentication, leave password undefined
const dbPassword = process.env.DB_PASSWORD?.trim();
if (dbPassword && dbPassword !== '') {
  baseConfig.password = dbPassword;
} else {
  // Trust authentication - no password needed
  logger.info('Using trust authentication (no password required)');
}

const config = baseConfig;
const dbName = process.env.DB_NAME || 'order_engine';

async function setupDatabase() {
  const adminPool = new Pool(config);
  let client: any = null;
  let targetPool: any = null;
  let targetClient: any = null;

  try {
    logger.info('Starting database setup...');
    logger.info(`Database name: ${dbName}`);
    logger.info(`Host: ${config.host}:${config.port}`);

    // Connect to postgres database
    client = await adminPool.connect();
    logger.info('Connected to PostgreSQL server');

    // Check if database exists
    const dbCheckResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheckResult.rows.length === 0) {
      logger.info(`Creating database: ${dbName}`);
      // Terminate existing connections to the database if any
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`CREATE DATABASE ${dbName}`);
      logger.info(`Database ${dbName} created successfully`);
    } else {
      logger.info(`Database ${dbName} already exists`);
    }

    // Release admin connection
    client.release();
    client = null; // Mark as released to prevent double-release

    // Connect to the target database
    const targetConfig = {
      ...config,
      database: dbName,
    };
    targetPool = new Pool(targetConfig);
    targetClient = await targetPool.connect();

    try {
      logger.info(`Connecting to database: ${dbName}`);

      // Read and execute schema file
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      logger.info(`Reading schema from: ${schemaPath}`);

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at: ${schemaPath}`);
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');
      logger.info('Executing schema...');

      // Smart SQL statement splitter that handles dollar-quoted strings
      function splitSQLStatements(sql: string): string[] {
        const statements: string[] = [];
        let currentStatement = '';
        let inDollarQuote = false;
        let dollarTag = '';
        let i = 0;

        while (i < sql.length) {
          const char = sql[i];
          const nextChar = sql[i + 1];

          // If we're inside a dollar-quoted string, check for closing tag first
          if (inDollarQuote) {
            // Check if we've reached the closing tag
            if (sql.substring(i).startsWith(dollarTag)) {
              // End of dollar-quoted string
              currentStatement += dollarTag;
              i += dollarTag.length;
              inDollarQuote = false;
              dollarTag = '';
              continue;
            }
            // Otherwise, add character as-is
            currentStatement += char;
            i++;
            continue;
          }

          // Check for opening dollar-quoted strings ($$ or $tag$)
          if (char === '$') {
            // Find the closing $ to determine the tag
            let j = i + 1;
            let tag = '$';
            while (j < sql.length && sql[j] !== '$') {
              tag += sql[j];
              j++;
            }
            if (j < sql.length) {
              tag += '$';
              dollarTag = tag;
              inDollarQuote = true;
              currentStatement += tag;
              i = j + 1;
              continue;
            }
          }

          // Check for semicolon (statement terminator) - but only outside dollar quotes
          if (char === ';' && !inDollarQuote) {
            const trimmed = currentStatement.trim();
            // Skip empty statements and comments
            if (trimmed.length > 0 && !trimmed.startsWith('--')) {
              statements.push(trimmed);
            }
            currentStatement = '';
            i++;
            continue;
          }

          // Skip single-line comments (--), but only outside dollar quotes
          if (char === '-' && nextChar === '-' && !inDollarQuote) {
            // Skip to end of line
            while (i < sql.length && sql[i] !== '\n') {
              i++;
            }
            continue;
          }

          currentStatement += char;
          i++;
        }

        // Add the last statement if it exists
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('--')) {
          statements.push(trimmed);
        }

        return statements.filter(s => s.length > 0);
      }

      const statements = splitSQLStatements(schema);
      logger.info(`Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            // Add semicolon back for execution
            await targetClient.query(statement + ';');
            logger.debug(`✓ Executed statement ${i + 1}/${statements.length}`);
          } catch (stmtError: any) {
            // Ignore "already exists" errors (tables, indexes, functions, triggers)
            if (
              stmtError.message.includes('already exists') ||
              stmtError.code === '42P07' || // duplicate_table
              stmtError.code === '42710' || // duplicate_object
              stmtError.code === '42723'    // duplicate_function
            ) {
              logger.debug(`⊘ Skipped (already exists): statement ${i + 1}`);
            } else {
              logger.error(`✗ Failed on statement ${i + 1}/${statements.length}`);
              logger.error(`Error: ${stmtError.message}`);
              logger.error(`Code: ${stmtError.code}`);
              logger.error(`Statement preview: ${statement.substring(0, 150)}...`);
              throw stmtError;
            }
          }
        }
      }

      logger.info('Schema executed successfully');

      // Verify tables were created
      const tablesResult = await targetClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      logger.info('Created tables:');
      tablesResult.rows.forEach((row: { table_name: string }) => {
        logger.info(`  - ${row.table_name}`);
      });

      // Verify indexes
      const indexesResult = await targetClient.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY indexname
      `);

      if (indexesResult.rows.length > 0) {
        logger.info('Created indexes:');
        indexesResult.rows.forEach((row: { indexname: string }) => {
          logger.info(`  - ${row.indexname}`);
        });
      }

      logger.info('✅ Database setup completed successfully!');
      logger.info(`\nYou can now start the application with: npm start`);

    } finally {
      // Note: targetClient and targetPool cleanup is handled in outer finally block
      // to avoid double-release issues
    }

  } catch (error: any) {
    logger.error('❌ Database setup failed:', error);
    
    // Provide helpful error messages for common issues
    if (error.code === '28P01') {
      logger.error('\n🔐 Authentication Error:');
      logger.error('   The PostgreSQL password is incorrect.');
      logger.error('\n   Solutions:');
      logger.error('   1. Check your .env file has the correct DB_PASSWORD');
      logger.error('   2. Verify your PostgreSQL password with: psql -U postgres');
      logger.error('   3. If you forgot your password, reset it or create a new user');
      logger.error(`\n   Current config: user="${config.user}", host="${config.host}:${config.port}"`);
    } else if (error.code === '28000') {
      logger.error('\n👤 User/Role Error:');
      logger.error(`   The PostgreSQL user "${config.user}" does not exist.`);
      logger.error('\n   Solutions:');
      logger.error('   1. Create the postgres user:');
      logger.error(`      psql -h ${config.host} -U ${process.env.USER || 'your_username'} -d postgres -c "CREATE USER postgres WITH SUPERUSER;"`);
      logger.error('   2. Or update your .env file to use your system username:');
      logger.error(`      DB_USER=${process.env.USER || 'your_username'}`);
      logger.error('   3. To see existing users, run:');
      logger.error(`      psql -h ${config.host} -d postgres -c "\\du"`);
    } else if (error.code === '42P01') {
      logger.error('\n📋 Schema Error:');
      logger.error(`   ${error.message}`);
      logger.error('\n   This usually means a table or relation is referenced before it exists.');
      logger.error('   Solutions:');
      logger.error('   1. Check the schema.sql file for correct statement order');
      logger.error('   2. Make sure CREATE TABLE statements come before any references');
      logger.error('   3. Try dropping and recreating the database:');
      logger.error(`      psql -h ${config.host} -U ${config.user} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`);
      logger.error(`      Then run: npm run setup:db`);
    } else if (error.code === '42601') {
      logger.error('\n📝 SQL Syntax Error:');
      logger.error(`   ${error.message}`);
      if (error.message.includes('dollar-quoted')) {
        logger.error('\n   This error is related to dollar-quoted strings ($$ ... $$) in SQL functions.');
        logger.error('   The schema parser should handle this automatically.');
        logger.error('   If this persists, check the schema.sql file for proper dollar-quote syntax.');
      }
      logger.error('\n   Solutions:');
      logger.error('   1. Check the schema.sql file for syntax errors');
      logger.error('   2. Verify all dollar-quoted strings are properly closed');
      logger.error('   3. Try running the schema manually:');
      logger.error(`      psql -h ${config.host} -U ${config.user} -d ${dbName} -f src/database/schema.sql`);
    } else if (error.code === 'ECONNREFUSED') {
      logger.error('\n🔌 Connection Error:');
      logger.error('   Cannot connect to PostgreSQL server.');
      logger.error('\n   Solutions:');
      logger.error('   1. Make sure PostgreSQL is running');
      logger.error('   2. If you just changed pg_hba.conf, restart PostgreSQL:');
      logger.error('      brew services restart postgresql (on macOS)');
      logger.error('      or: sudo systemctl restart postgresql (on Linux)');
      logger.error('   3. Check DB_HOST and DB_PORT in your .env file');
    } else if (error.message) {
      logger.error(`\n   Error details: ${error.message}`);
    }
    
    process.exit(1);
  } finally {
    // Clean up target client and pool if they exist
    if (targetClient) {
      try {
        targetClient.release();
      } catch (e) {
        // Ignore if already released
      }
    }
    if (targetPool) {
      try {
        await targetPool.end();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Clean up admin client and pool
    if (client) {
      try {
        client.release();
      } catch (e) {
        // Ignore if already released
      }
    }
    try {
      await adminPool.end();
    } catch (e) {
      // Ignore errors
    }
  }
}

// Run the setup
setupDatabase().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});

