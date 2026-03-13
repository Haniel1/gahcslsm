/**
 * Indodax API Client
 * Handles all interactions with Indodax exchange
 */
const crypto = require('crypto');
const axios = require('axios');

class IndodaxClient {
  constructor(apiKey, secretKey, isSimulation = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = 'https://indodax.com/api';
    this.isSimulation = isSimulation;
    this.simulationBalances = {};
    this.simulationOrders = [];
  }

  // Generate signature for authenticated requests
  generateSignature(path, body = '') {
    const timestamp = Date.now();
    const message = `${timestamp}${path}${body}`;
    return crypto.createHmac('sha512', this.secretKey).update(message).digest('hex');
  }

  // Get market tickers
  async getTickers() {
    try {
      const response = await axios.get(`${this.baseUrl}/tickers`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tickers:', error.message);
      throw error;
    }
  }

  // Get ticker for specific pair
  async getTicker(pair) {
    try {
      const response = await axios.get(`${this.baseUrl}/ticker/${pair}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ticker for ${pair}:`, error.message);
      throw error;
    }
  }

  // Get OHLCV candlestick data
  async getCandles(pair, timeframe = '1m', limit = 100) {
    try {
      // Indodax doesn't have direct candlestick API, we'll use trades
      const response = await axios.get(`${this.baseUrl}/${pair}/trades`, {
        params: { limit }
      });
      
      // Convert trades to candlestick format
      return this.convertTradesToCandles(response.data, timeframe);
    } catch (error) {
      console.error(`Error fetching candles for ${pair}:`, error.message);
      throw error;
    }
  }

  // Convert trades to candlestick data
  convertTradesToCandles(trades, timeframe) {
    if (!trades || trades.length === 0) return [];

    const candles = [];
    const timeframeMs = this.getTimeframeInMs(timeframe);
    
    // Group trades by timeframe
    const groupedTrades = {};
    
    trades.forEach(trade => {
      const timestamp = parseInt(trade.date) * 1000;
      const periodStart = Math.floor(timestamp / timeframeMs) * timeframeMs;
      
      if (!groupedTrades[periodStart]) {
        groupedTrades[periodStart] = {
          open: parseFloat(trade.price),
          high: parseFloat(trade.price),
          low: parseFloat(trade.price),
          close: parseFloat(trade.price),
          volume: parseFloat(trade.amount),
          timestamp: periodStart
        };
      } else {
        const candle = groupedTrades[periodStart];
        const price = parseFloat(trade.price);
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += parseFloat(trade.amount);
      }
    });

    // Convert to array and sort by timestamp
    Object.values(groupedTrades).forEach(candle => {
      candles.push([
        candle.timestamp,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume
      ]);
    });

    return candles.sort((a, b) => a[0] - b[0]);
  }

  getTimeframeInMs(timeframe) {
    const timeframes = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    return timeframes[timeframe] || timeframes['1m'];
  }

  // Get user balance
  async getBalance() {
    if (this.isSimulation) {
      return this.simulationBalances;
    }

    try {
      const path = '/api/v2/member/get_account_info';
      const body = '';
      const signature = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching balance:', error.message);
      throw error;
    }
  }

  // Place order
  async placeOrder(pair, type, price, amount) {
    if (this.isSimulation) {
      return this.simulateOrder(pair, type, price, amount);
    }

    try {
      const path = '/api/v2/order';
      const body = `pair=${pair}&type=${type}&price=${price}&amount=${amount}`;
      const signature = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error placing ${type} order for ${pair}:`, error.message);
      throw error;
    }
  }

  // Simulate order for simulation mode
  simulateOrder(pair, type, price, amount) {
    const orderId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const total = price * amount;
    
    // Initialize simulation balances if not exists
    if (!this.simulationBalances[pair.split('_')[0]]) {
      this.simulationBalances[pair.split('_')[0]] = 1000000; // Initial 1M IDR
    }
    if (!this.simulationBalances[pair.split('_')[1]]) {
      this.simulationBalances[pair.split('_')[1]] = 0;
    }

    const order = {
      id: orderId,
      pair,
      type,
      price,
      amount,
      total,
      status: 'open',
      timestamp: Date.now()
    };

    this.simulationOrders.push(order);
    
    // Immediately fill the order in simulation
    order.status = 'filled';
    order.filledAt = Date.now();
    
    if (type === 'buy') {
      this.simulationBalances[pair.split('_')[0]] -= total;
      this.simulationBalances[pair.split('_')[1]] += amount;
    } else {
      this.simulationBalances[pair.split('_')[1]] -= amount;
      this.simulationBalances[pair.split('_')[0]] += total;
    }

    return { success: true, order };
  }

  // Cancel order
  async cancelOrder(pair, orderId) {
    if (this.isSimulation) {
      return this.simulateCancelOrder(orderId);
    }

    try {
      const path = '/api/v2/order_cancel';
      const body = `pair=${pair}&order_id=${orderId}`;
      const signature = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error.message);
      throw error;
    }
  }

  simulateCancelOrder(orderId) {
    const orderIndex = this.simulationOrders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      this.simulationOrders[orderIndex].status = 'cancelled';
      return { success: true };
    }
    return { success: false, error: 'Order not found' };
  }

  // Get open orders
  async getOpenOrders(pair) {
    if (this.isSimulation) {
      return this.simulationOrders.filter(o => o.pair === pair && o.status === 'open');
    }

    try {
      const path = `/api/v2/open_orders`;
      const body = `pair=${pair}`;
      const signature = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching open orders for ${pair}:`, error.message);
      throw error;
    }
  }

  // Get simulation data
  getSimulationData() {
    return {
      balances: this.simulationBalances,
      orders: this.simulationOrders
    };
  }
}

module.exports = IndodaxClient;
