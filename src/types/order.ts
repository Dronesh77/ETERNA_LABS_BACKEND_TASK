export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP',
  STOP_LIMIT = 'STOP_LIMIT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ROUTING = 'ROUTING', // Finding best DEX route
  ROUTED = 'ROUTED', // Route found, preparing transaction
  CONFIRMED = 'CONFIRMED', // Transaction confirmed on blockchain
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // Required for LIMIT orders
  stopPrice?: number; // Required for STOP orders
  filledQuantity: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  timeInForce: 'GTC' | 'IOC' | 'FOK'; // Good Till Cancel, Immediate or Cancel, Fill or Kill
  // Solana/DEX related fields
  transactionSignature?: string; // Solana transaction signature
  explorerUrl?: string; // Solana Explorer link
  routingDecision?: any; // DEX routing decision details
  walletAddress?: string; // User's Solana wallet address
}

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  orderIds: string[];
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[]; // Buy orders sorted by price descending
  asks: OrderBookEntry[]; // Sell orders sorted by price ascending
}

