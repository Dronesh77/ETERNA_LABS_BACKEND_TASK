# Order Execution Engine

A high-performance order execution engine for trading systems that matches buy and sell orders efficiently using price-time priority.

## Features

- **Order Types**: Support for MARKET, LIMIT, STOP, and STOP_LIMIT orders
- **Order Matching**: Automatic matching of buy and sell orders based on price-time priority
- **Order Book**: Real-time order book visualization for any trading pair
- **Trade Execution**: Automatic trade execution when orders match
- **REST API**: Comprehensive RESTful API for order management
- **WebSocket Support**: Real-time order status updates via WebSocket (pending → routing → confirmed)
- **Solana Integration**: Execute orders on Solana blockchain with transaction proof
- **DEX Routing**: Intelligent routing across multiple Solana DEXs using Jupiter Aggregator
- **Order Queue**: Concurrent processing of multiple orders with queue management
- **Database**: PostgreSQL for persistent storage
- **Logging**: Comprehensive logging with Winston
- **Type Safety**: Full TypeScript support

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Testing**: Jest
- **Logging**: Winston

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Eterna_Labs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database connection:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_engine
DB_USER=postgres
DB_PASSWORD=postgres
```

4. Set up the database:
```bash
# Option 1: Using the setup script (recommended)
npm run setup:db

# Option 2: Run migration for new features
npm run migrate

# Option 3: Using the shell script
./setup-db.sh

# Option 4: Manual setup
createdb order_engine
psql order_engine < src/database/schema.sql
```

5. Build the project:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

For development with hot reload:
```bash
npm run dev
```

## API Endpoints

### Orders

#### Create Order
```http
POST /api/v1/orders
Content-Type: application/json

{
  "userId": "user123",
  "symbol": "BTC/USD",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 10,
  "price": 50000,
  "timeInForce": "GTC"
}
```

#### Get Order by ID
```http
GET /api/v1/orders/:id
```

#### Get Orders by User
```http
GET /api/v1/users/:userId/orders
```

#### Cancel Order
```http
DELETE /api/v1/orders/:id
```

#### Get Pending Orders
```http
GET /api/v1/orders/pending?symbol=BTC/USD
```

#### Get Order Book
```http
GET /api/v1/orderbook/:symbol
```

### Trades

#### Get Recent Trades
```http
GET /api/v1/trades?limit=100
```

#### Get Trades by Symbol
```http
GET /api/v1/trades/symbol/:symbol?limit=100
```

#### Get Trades by Order ID
```http
GET /api/v1/trades/order/:orderId
```

### Health Check
```http
GET /health
```

## Order Types

### MARKET
Executes immediately at the best available price. No price required.

### LIMIT
Executes only at the specified price or better. Price is required.

### STOP
Becomes a market order when the stop price is reached. Stop price is required.

### STOP_LIMIT
Becomes a limit order when the stop price is reached. Both stop price and limit price are required.

## Order Sides

- **BUY**: Buy order (bid)
- **SELL**: Sell order (ask)

## Order Status

- **PENDING**: Order is waiting to be processed
- **ROUTING**: Finding best DEX route for execution
- **ROUTED**: Route found, preparing transaction
- **CONFIRMED**: Transaction confirmed on Solana blockchain
- **PARTIALLY_FILLED**: Order has been partially executed
- **FILLED**: Order has been completely executed
- **CANCELLED**: Order has been cancelled
- **REJECTED**: Order was rejected (e.g., routing or execution failed)

## Time in Force

- **GTC** (Good Till Cancel): Order remains active until cancelled
- **IOC** (Immediate or Cancel): Order must be filled immediately or cancelled
- **FOK** (Fill or Kill): Order must be filled completely or cancelled

## Matching Logic

The engine uses **price-time priority**:

1. **Price Priority**: Better prices are matched first
   - For BUY orders: Higher prices have priority
   - For SELL orders: Lower prices have priority

2. **Time Priority**: Among orders with the same price, earlier orders are matched first

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Project Structure

```
src/                  # TypeScript source code (edit files here)
├── controllers/      # Request handlers
├── database/         # Database connection and schema
├── engine/          # Order matching engine
├── middleware/      # Express middleware
├── models/          # Data models
├── routes/          # API routes
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point

dist/                 # Compiled JavaScript (auto-generated, don't edit)
                     # Created by: npm run build
                     # Ignored by git (see .gitignore)
```

### Understanding `src/` vs `dist/`

- **`src/`**: Your TypeScript source code - **This is where you write code**
- **`dist/`**: Compiled JavaScript - **Auto-generated by `npm run build`**
- **Both are needed**: `src/` for development, `dist/` for running the app
- **`dist/` is in `.gitignore`**: It's regenerated automatically, so it's not committed to git

## Database Schema

### Orders Table
- `id`: UUID (Primary Key)
- `user_id`: User identifier
- `symbol`: Trading pair (e.g., BTC/USD)
- `side`: BUY or SELL
- `type`: MARKET, LIMIT, STOP, or STOP_LIMIT
- `quantity`: Order quantity
- `price`: Limit price (for LIMIT orders)
- `stop_price`: Stop price (for STOP orders)
- `filled_quantity`: Amount already filled
- `status`: Current order status
- `time_in_force`: GTC, IOC, or FOK
- `created_at`: Order creation timestamp
- `updated_at`: Last update timestamp

### Trades Table
- `id`: UUID (Primary Key)
- `buy_order_id`: Reference to buy order
- `sell_order_id`: Reference to sell order
- `symbol`: Trading pair
- `quantity`: Trade quantity
- `price`: Execution price
- `timestamp`: Trade execution time

## Logging

Logs are written to:
- `logs/error.log`: Error logs
- `logs/combined.log`: All logs

Log level can be configured via `LOG_LEVEL` environment variable.

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error

## Performance Considerations

- Database indexes on frequently queried columns
- Efficient order matching algorithm
- Connection pooling for database
- Async/await for non-blocking operations

## WebSocket API

Connect to `ws://localhost:3000/ws` to receive real-time order status updates.

### Message Format

```json
{
  "type": "order_update",
  "orderId": "uuid",
  "status": "ROUTING",
  "message": "Finding best DEX route...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "routingDecision": { ... }
  }
}
```

### Status Flow

For Solana MARKET orders:
1. **PENDING** → Order created
2. **ROUTING** → Finding best DEX route
3. **ROUTED** → Route found, preparing transaction
4. **CONFIRMED** → Transaction confirmed on Solana
5. **FILLED** → Order completed

## Solana Integration

The system supports executing orders on the Solana blockchain:

- **DEX Routing**: Uses Jupiter Aggregator API to find best routes across multiple DEXs (Raydium, Orca, Serum, etc.)
- **Transaction Execution**: Executes swaps on Solana and provides transaction signatures
- **Explorer Links**: Returns Solana Explorer links for transaction verification
- **Supported Pairs**: SOL/USDC, SOL/USDT, BTC/SOL, ETH/SOL, and more

### Environment Variables

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # or devnet
SOLANA_NETWORK=mainnet  # or devnet
```

## DEX Routing

The system intelligently routes orders across multiple Solana DEXs:

- **Jupiter Aggregator**: Aggregates liquidity from multiple DEXs
- **Best Price Selection**: Chooses route with best output amount and lowest price impact
- **Routing Decisions**: Logged in console and stored in database
- **Multiple Routes**: Evaluates alternative routes for comparison

## Queue Management

Orders are processed concurrently with configurable limits:

- **Concurrent Processing**: Process up to 5 orders simultaneously (configurable)
- **Queue Status**: Monitor queue via `/api/v1/queue/status` endpoint
- **WebSocket Updates**: Real-time status updates for all queued orders

### Queue Status Endpoint

```http
GET /api/v1/queue/status
```

Response:
```json
{
  "queue": {
    "queueSize": 2,
    "processing": 3,
    "processingIds": ["order-1", "order-2", "order-3"]
  },
  "websocket": {
    "connectedClients": 5
  }
}
```

## Future Enhancements

- Order depth visualization
- Advanced order types (Iceberg, TWAP, etc.)
- Multi-symbol support with better indexing
- Redis caching for order book
- Rate limiting and authentication
- Order history and analytics
- Real Solana wallet integration (currently uses mock signatures for demo)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions, please open an issue on the repository.

