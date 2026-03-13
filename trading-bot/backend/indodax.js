import axios from 'axios';
import crypto from 'crypto';

const INDODAX_API_KEY = process.env.INDODAX_API_KEY;
const INDODAX_SECRET_KEY = process.env.INDODAX_SECRET_KEY;
const BASE_URL = 'https://indodax.com/api';

class IndodaxAPI {
  constructor() {
    this.apiKey = INDODAX_API_KEY;
    this.secretKey = INDODAX_SECRET_KEY;
  }

  generateSignature(path, body = '') {
    const timestamp = Date.now();
    const stringToSign = `${timestamp}${this.apiKey}${body}`;
    const signature = crypto.createHmac('sha512', this.secretKey)
                           .update(stringToSign)
                           .digest('hex');
    return { timestamp, signature };
  }

  async getTicker(pair) {
    try {
      const response = await axios.get(`${BASE_URL}/ticker/${pair}`);
      return response.data.ticker;
    } catch (error) {
      console.error(`Error getting ticker for ${pair}:`, error.message);
      throw error;
    }
  }

  async getOrderBook(pair) {
    try {
      const response = await axios.get(`${BASE_URL}/${pair}/depth`);
      return response.data;
    } catch (error) {
      console.error(`Error getting orderbook for ${pair}:`, error.message);
      throw error;
    }
  }

  async getTrades(pair) {
    try {
      const response = await axios.get(`${BASE_URL}/${pair}/trades`);
      return response.data.trades;
    } catch (error) {
      console.error(`Error getting trades for ${pair}:`, error.message);
      throw error;
    }
  }

  async getAccountInfo() {
    try {
      const path = '/api/v2/member/info';
      const body = '';
      const { timestamp, signature } = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        new URLSearchParams(body),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature,
            'X-INDODAX-TIMESTAMP': timestamp.toString()
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting account info:', error.response?.data || error.message);
      throw error;
    }
  }

  async getBalances() {
    try {
      const info = await this.getAccountInfo();
      return info.return.balance;
    } catch (error) {
      console.error('Error getting balances:', error.message);
      throw error;
    }
  }

  async createOrder(pair, type, price, amount) {
    try {
      const path = '/api/2.0/market';
      const body = `method=${type}&pair=${pair}&price=${price}&amount=${amount}`;
      const { timestamp, signature } = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        new URLSearchParams(body),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature,
            'X-INDODAX-TIMESTAMP': timestamp.toString()
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error.response?.data || error.message);
      throw error;
    }
  }

  async buy(pair, price, amount) {
    return this.createOrder(pair, 'buy', price, amount);
  }

  async sell(pair, price, amount) {
    return this.createOrder(pair, 'sell', price, amount);
  }

  async cancelOrder(orderId, pair, type) {
    try {
      const path = '/api/v2/order-cancel';
      const body = `order_id=${orderId}&pair=${pair}&type=${type}`;
      const { timestamp, signature } = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        new URLSearchParams(body),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature,
            'X-INDODAX-TIMESTAMP': timestamp.toString()
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling order:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOpenOrders(pair) {
    try {
      const path = '/api/v2/open-orders';
      const body = `pair=${pair}`;
      const { timestamp, signature } = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        new URLSearchParams(body),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature,
            'X-INDODAX-TIMESTAMP': timestamp.toString()
          }
        }
      );
      return response.data.return.orders;
    } catch (error) {
      console.error('Error getting open orders:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOrderHistory(pair) {
    try {
      const path = '/api/v2/history';
      const body = `pair=${pair}`;
      const { timestamp, signature } = this.generateSignature(path, body);
      
      const response = await axios.post(
        `https://indodax.com${path}`,
        new URLSearchParams(body),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-INDODAX-APIKEY': this.apiKey,
            'X-INDODAX-SIGNATURE': signature,
            'X-INDODAX-TIMESTAMP': timestamp.toString()
          }
        }
      );
      return response.data.return;
    } catch (error) {
      console.error('Error getting order history:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new IndodaxAPI();
