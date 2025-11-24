# Solana & DEX Integration Setup Guide

## Overview

This guide explains how the Solana blockchain integration and DEX routing work in the Order Execution Engine.

## Architecture

```
Order Request
    ↓
Order Created (PENDING)
    ↓
WebSocket: Status Update → ROUTING
    ↓
DEX Router Service (Jupiter API)
    ↓
Find Best Route Across DEXs
    ↓
WebSocket: Status Update → ROUTED
    ↓
Solana Service
    ↓
Execute Transaction on Solana
    ↓
WebSocket: Status Update → CONFIRMED
    ↓
Order Filled (FILLED)
```

## Components

### 1. WebSocket Service (`src/services/WebSocketService.ts`)

Provides real-time order status updates to connected clients.

**Connection**: `ws://localhost:3000/ws`

**Message Types**:
- `connected`: Initial connection confirmation
- `order_update`: Order status change
- `pong`: Response to ping (keepalive)

**Example Client**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'order_update') {
    console.log(`Order ${message.orderId}: ${message.status} - ${message.message}`);
  }
});
```

### 2. DEX Router Service (`src/services/DEXRouterService.ts`)

Routes orders across multiple Solana DEXs using Jupiter Aggregator API.

**Features**:
- Aggregates liquidity from multiple DEXs (Raydium, Orca, Serum, etc.)
- Finds best route based on output amount and price impact
- Supports common Solana tokens (SOL, USDC, USDT, BTC, ETH)

**Supported Trading Pairs**:
- SOL/USDC
- SOL/USDT
- BTC/SOL
- ETH/SOL
- And more (via Jupiter API)

**Example**:
```typescript
const routingDecision = await dexRouterService.findBestRoute(
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  1, // 1 SOL
  OrderSide.BUY
);
```

### 3. Solana Service (`src/services/SolanaService.ts`)

Executes transactions on the Solana blockchain.

**Features**:
- Connects to Solana RPC (mainnet or devnet)
- Executes swap transactions
- Returns transaction signatures and explorer links
- Tracks transaction confirmation status

**Configuration**:
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet
```

**Note**: Currently uses mock transaction signatures for demo purposes. In production, you would:
1. Get swap transaction from Jupiter API
2. Have user sign with their wallet
3. Send and confirm the transaction

### 4. Order Execution Service (`src/services/OrderExecutionService.ts`)

Orchestrates the complete order execution flow.

**Flow**:
1. Update status to ROUTING
2. Find best DEX route
3. Update status to ROUTED
4. Execute Solana transaction
5. Update status to CONFIRMED
6. Mark as FILLED

### 5. Order Queue Service (`src/services/OrderQueueService.ts`)

Manages concurrent order processing.

**Features**:
- Configurable concurrency limit (default: 5)
- Queue status monitoring
- Automatic processing

## API Usage

### Create Solana Order

```http
POST /api/v1/orders
Content-Type: application/json

{
  "userId": "user123",
  "symbol": "SOL/USDC",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 1,
  "walletAddress": "YourSolanaWalletAddress"
}
```

**Response**:
```json
{
  "order": {
    "id": "uuid",
    "status": "PENDING",
    "symbol": "SOL/USDC",
    ...
  },
  "message": "Order created and queued for DEX execution",
  "executionMode": "DEX_ROUTING",
  "queueStatus": {
    "queueSize": 0,
    "processing": 1,
    "processingIds": ["order-id"]
  }
}
```

### Monitor Order via WebSocket

Connect to `ws://localhost:3000/ws` and you'll receive updates:

```json
{
  "type": "order_update",
  "orderId": "uuid",
  "status": "ROUTING",
  "message": "Finding best DEX route...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

```json
{
  "type": "order_update",
  "orderId": "uuid",
  "status": "ROUTED",
  "message": "Route found: Selected route with 150.000000 output and 0.50% price impact",
  "timestamp": "2024-01-01T00:00:01.000Z",
  "data": {
    "routingDecision": {
      "selectedRoute": {
        "dex": "Jupiter Aggregator",
        "inputAmount": 1,
        "outputAmount": 150,
        "priceImpact": 0.5
      }
    }
  }
}
```

```json
{
  "type": "order_update",
  "orderId": "uuid",
  "status": "CONFIRMED",
  "message": "Transaction confirmed: abc123...",
  "timestamp": "2024-01-01T00:00:02.000Z",
  "data": {
    "transactionSignature": "abc123...",
    "explorerUrl": "https://solscan.io/tx/abc123..."
  }
}
```

### Get Order with Transaction Details

```http
GET /api/v1/orders/:id
```

**Response**:
```json
{
  "id": "uuid",
  "status": "FILLED",
  "transactionSignature": "abc123...",
  "explorerUrl": "https://solscan.io/tx/abc123...",
  "routingDecision": {
    "selectedRoute": {
      "dex": "Jupiter Aggregator",
      "inputAmount": 1,
      "outputAmount": 150,
      "priceImpact": 0.5
    },
    "routingReason": "Selected route with best output amount"
  },
  ...
}
```

### Get Queue Status

```http
GET /api/v1/queue/status
```

**Response**:
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

## Testing

### Submit Multiple Orders Simultaneously

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","symbol":"SOL/USDC","side":"BUY","type":"MARKET","quantity":1}'

# Terminal 2
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"user2","symbol":"SOL/USDC","side":"BUY","type":"MARKET","quantity":2}'

# Terminal 3
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"user3","symbol":"SOL/USDC","side":"BUY","type":"MARKET","quantity":0.5}'
```

### Monitor WebSocket Updates

```javascript
// test-websocket.js
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'order_update') {
    console.log(`\n📊 Order Update:`);
    console.log(`   Order ID: ${message.orderId}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Message: ${message.message}`);
    if (message.data?.explorerUrl) {
      console.log(`   Explorer: ${message.data.explorerUrl}`);
    }
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

Run: `node test-websocket.js`

## Logs

The system logs all routing decisions and execution steps:

```
[INFO] Finding best route for BUY order { inputMint: 'USDC', outputMint: 'SOL', amount: 1 }
[INFO] Quote obtained: 1 USDC → 0.006666 SOL
[INFO] Best route selected: { dex: 'Jupiter Aggregator', outputAmount: 0.006666, priceImpact: 0.5 }
[INFO] Executing swap on Solana
[INFO] Swap transaction executed { signature: 'abc123...', explorerUrl: 'https://solscan.io/tx/abc123...' }
```

## Production Considerations

1. **Real Wallet Integration**: Implement proper wallet signing using Solana wallet adapters
2. **Transaction Fees**: Account for Solana transaction fees
3. **Slippage Protection**: Configure appropriate slippage tolerance
4. **Error Handling**: Handle network errors, insufficient funds, etc.
5. **Rate Limiting**: Implement rate limiting for API and Jupiter API calls
6. **Monitoring**: Set up monitoring for queue depth, WebSocket connections, etc.

## Troubleshooting

### WebSocket Not Connecting
- Ensure server is running on port 3000
- Check firewall settings
- Verify WebSocket path: `ws://localhost:3000/ws`

### DEX Routing Fails
- Check internet connection
- Verify Jupiter API is accessible
- Check token mint addresses are correct

### Solana Transaction Fails
- Verify Solana RPC URL is correct
- Check network (mainnet vs devnet)
- Ensure sufficient balance for fees

