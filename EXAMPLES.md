# API Usage Examples

This document provides practical examples of using the Order Execution Engine API.

## Prerequisites

- Server running on `http://localhost:3000`
- `curl` or any HTTP client (Postman, Insomnia, etc.)

## Example 1: Create and Match Orders

### Step 1: Create a BUY order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice",
    "symbol": "BTC/USD",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 10,
    "price": 50000,
    "timeInForce": "GTC"
  }'
```

**Response:**
```json
{
  "order": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "alice",
    "symbol": "BTC/USD",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 10,
    "price": 50000,
    "filledQuantity": 0,
    "status": "PENDING",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "timeInForce": "GTC"
  },
  "trades": [],
  "message": "Order created successfully"
}
```

### Step 2: Create a matching SELL order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "bob",
    "symbol": "BTC/USD",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": 10,
    "price": 49000,
    "timeInForce": "GTC"
  }'
```

**Response:**
```json
{
  "order": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "userId": "bob",
    "symbol": "BTC/USD",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": 10,
    "price": 49000,
    "filledQuantity": 10,
    "status": "FILLED",
    ...
  },
  "trades": [
    {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "buyOrderId": "123e4567-e89b-12d3-a456-426614174000",
      "sellOrderId": "223e4567-e89b-12d3-a456-426614174001",
      "symbol": "BTC/USD",
      "quantity": 10,
      "price": 49000,
      "timestamp": "2024-01-01T10:00:05.000Z"
    }
  ],
  "message": "Order created successfully"
}
```

### Step 3: Check the order book
```bash
curl http://localhost:3000/api/v1/orderbook/BTC/USD
```

### Step 4: View executed trades
```bash
curl http://localhost:3000/api/v1/trades/symbol/BTC/USD
```

---

## Example 2: Partial Order Filling

### Create a large BUY order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "charlie",
    "symbol": "ETH/USD",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 100,
    "price": 3000
  }'
```

### Create a smaller SELL order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "diana",
    "symbol": "ETH/USD",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": 30,
    "price": 2900
  }'
```

The BUY order will be partially filled (30 out of 100), and the SELL order will be fully filled.

---

## Example 3: Market Orders

### Create a MARKET BUY order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "eve",
    "symbol": "BTC/USD",
    "side": "BUY",
    "type": "MARKET",
    "quantity": 5
  }'
```

Market orders execute immediately at the best available price from the order book.

---

## Example 4: Order Management

### Get order by ID
```bash
curl http://localhost:3000/api/v1/orders/{order-id}
```

### Get all orders for a user
```bash
curl http://localhost:3000/api/v1/users/alice/orders
```

### Cancel an order
```bash
curl -X DELETE http://localhost:3000/api/v1/orders/{order-id}
```

### Get pending orders
```bash
curl http://localhost:3000/api/v1/orders/pending

# Filter by symbol
curl http://localhost:3000/api/v1/orders/pending?symbol=BTC/USD
```

---

## Example 5: Trade History

### Get recent trades
```bash
curl http://localhost:3000/api/v1/trades?limit=50
```

### Get trades for a symbol
```bash
curl http://localhost:3000/api/v1/trades/symbol/BTC/USD?limit=100
```

### Get trades for a specific order
```bash
curl http://localhost:3000/api/v1/trades/order/{order-id}
```

---

## Example 6: Complete Trading Scenario

```bash
# 1. Alice wants to buy 10 BTC at $50,000
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice",
    "symbol": "BTC/USD",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 10,
    "price": 50000
  }'

# 2. Bob wants to sell 5 BTC at $49,000 (matches partially)
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "bob",
    "symbol": "BTC/USD",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": 5,
    "price": 49000
  }'

# 3. Check order book
curl http://localhost:3000/api/v1/orderbook/BTC/USD

# 4. Charlie wants to sell 5 BTC at $48,000 (completes Alice's order)
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "charlie",
    "symbol": "BTC/USD",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": 5,
    "price": 48000
  }'

# 5. View all trades
curl http://localhost:3000/api/v1/trades/symbol/BTC/USD

# 6. Check Alice's orders
curl http://localhost:3000/api/v1/users/alice/orders
```

---

## Error Handling Examples

### Missing required field
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice",
    "symbol": "BTC/USD",
    "side": "BUY"
  }'
```

**Response (400):**
```json
{
  "error": "Missing required fields: userId, symbol, side, type, quantity"
}
```

### Invalid order type
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice",
    "symbol": "BTC/USD",
    "side": "BUY",
    "type": "INVALID",
    "quantity": 10
  }'
```

**Response (400):**
```json
{
  "error": "Invalid type. Must be MARKET, LIMIT, STOP, or STOP_LIMIT"
}
```

### Order not found
```bash
curl http://localhost:3000/api/v1/orders/invalid-id
```

**Response (404):**
```json
{
  "error": "Order not found"
}
```

---

## Using with JavaScript/TypeScript

```typescript
// Create an order
const createOrder = async (orderData: any) => {
  const response = await fetch('http://localhost:3000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  return response.json();
};

// Get order book
const getOrderBook = async (symbol: string) => {
  const response = await fetch(`http://localhost:3000/api/v1/orderbook/${symbol}`);
  return response.json();
};

// Usage
const order = await createOrder({
  userId: 'user123',
  symbol: 'BTC/USD',
  side: 'BUY',
  type: 'LIMIT',
  quantity: 10,
  price: 50000,
});

const orderBook = await getOrderBook('BTC/USD');
console.log(orderBook);
```

---

## Using with Python

```python
import requests

# Create an order
def create_order(order_data):
    response = requests.post(
        'http://localhost:3000/api/v1/orders',
        json=order_data
    )
    return response.json()

# Get order book
def get_order_book(symbol):
    response = requests.get(
        f'http://localhost:3000/api/v1/orderbook/{symbol}'
    )
    return response.json()

# Usage
order = create_order({
    'userId': 'user123',
    'symbol': 'BTC/USD',
    'side': 'BUY',
    'type': 'LIMIT',
    'quantity': 10,
    'price': 50000
})

order_book = get_order_book('BTC/USD')
print(order_book)
```

