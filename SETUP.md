# Setup Guide

## Quick Start

### Option 1: Using Docker (Recommended)

1. **Start the services:**
```bash
docker-compose up -d
```

2. **Wait for database to be ready** (about 10 seconds)

3. **The application will automatically:**
   - Initialize the database schema
   - Start the API server on port 3000

4. **Test the API:**
```bash
curl http://localhost:3000/health
```

### Option 2: Manual Setup

1. **Install PostgreSQL:**
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`
   - Windows: Download from https://www.postgresql.org/download/

2. **Set up the database:**
```bash
# Easiest way - run the setup script
npm run setup:db

# Or use the shell script
./setup-db.sh

# Or manually
createdb order_engine
psql order_engine < src/database/schema.sql
```

3. **Install Node.js dependencies:**
```bash
npm install
```

4. **Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your database credentials
```

5. **Build the project:**
```bash
npm run build
```

6. **Start the server:**
```bash
npm start
```

For development with hot reload:
```bash
npm run dev
```

## Verify Installation

1. **Check health endpoint:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "order-execution-engine"
}
```

2. **Create a test order:**
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "symbol": "BTC/USD",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 1,
    "price": 50000
  }'
```

## Seed Sample Data (Optional)

To populate the database with sample orders:

```bash
npx ts-node src/scripts/seedData.ts
```

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
```bash
# macOS/Linux
pg_isready

# Or check service status
brew services list  # macOS
sudo systemctl status postgresql  # Linux
```

2. **Verify database exists:**
```bash
psql -l | grep order_engine
```

3. **Test connection:**
```bash
psql -h localhost -U postgres -d order_engine
```

### Port Already in Use

If port 3000 is already in use, change it in `.env`:
```
PORT=3001
```

### Build Errors

1. **Clear node_modules and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **Check TypeScript version:**
```bash
npx tsc --version
```

## Next Steps

- Read the [README.md](README.md) for API documentation
- Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for detailed endpoint documentation
- Run tests: `npm test`

