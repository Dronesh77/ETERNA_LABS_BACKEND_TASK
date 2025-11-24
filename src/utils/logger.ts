import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const logLevel = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'order-execution-engine' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // Safely stringify meta, handling circular references
          let metaString = '';
          if (Object.keys(meta).length) {
            try {
              metaString = JSON.stringify(meta, null, 2);
            } catch (error) {
              // Handle circular references by extracting safe properties
              const safeMeta: any = {};
              for (const [key, value] of Object.entries(meta)) {
                if (typeof value === 'object' && value !== null) {
                  // Extract safe properties from error objects
                  if (value instanceof Error) {
                    safeMeta[key] = {
                      message: value.message,
                      stack: value.stack,
                      name: value.name,
                    };
                  } else {
                    try {
                      JSON.stringify(value);
                      safeMeta[key] = value;
                    } catch {
                      safeMeta[key] = '[Circular or non-serializable]';
                    }
                  }
                } else {
                  safeMeta[key] = value;
                }
              }
              metaString = JSON.stringify(safeMeta, null, 2);
            }
          }
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        })
      ),
    })
  );
}

export default logger;

