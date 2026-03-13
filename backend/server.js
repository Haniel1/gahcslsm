/**
 * Auto Trading Bot Main Server
 * Handles auto trading logic, simulation mode, and API endpoints
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const IndodaxClient = require('./indodax');
const TechnicalAnalysis = require('./trading-strategy');
const TelegramNotifier = require('./telegram');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize services
const isSimulation = process.env.ENABLE_SIMULATION === 'true';
const indodax = new IndodaxClient(
  process.env.INDODAX_API_KEY,
  process.env.INDODAX_SECRET_KEY,
  isSimulation
);
const ta = new TechnicalAnalysis();
const telegram = new TelegramNotifier(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);

// Trading configuration based on user requirements
const COIN_ALLOCATIONS = {
  core: ['btc', 'eth', 'sol', 'bnb', 'link'], // 5 main coins - 400k each
  satellite: ['icp'], // Specific coin - 200k
  reserve: 100000 // Reserve balance
};

const INITIAL_CAPITAL_PER_COIN = parseInt(process.env.INITIAL_CAPITAL_PER_COIN) || 1000000;
const ENABLE_AUTO_TRADING = process.env.ENABLE_AUTO_TRADING === 'true';

// State management
let tradingState = {
  isActive: false,
  positions: {},
  coinBalances: {},
  signals: [],
  trades: [],
  lastUpdate: Date.now()
};

// Initialize coin balances
function initializeCoinBalances() {
  const balances = {};
  
  // Core coins - 400k each
  COIN_ALLOCATIONS.core.forEach(coin => {
    balances[coin] = {
      capital: 400000,
      currentBalance: 400000,
      position: null,
      pnl: 0,
      trades: []
    };
  });
  
  // Satellite coins - 200k each
  COIN_ALLOCATIONS.satellite.forEach(coin => {
    balances[coin] = {
      capital: 200000,
      currentBalance: 200000,
      position: null,
      pnl: 0,
      trades: []
    };
  });
  
  return balances;
}

tradingState.coinBalances = initializeCoinBalances();

/**
 * Fetch candlestick data for a pair
 */
async function getCandles(pair, timeframe) {
  try {
    // For now, we'll simulate candle data since Indodax doesn't have direct candle API
    // In production, you'd aggregate trade data into candles
    const ticker = await indodax.getTicker(pair);
    
    // Generate simulated candles based on current price
    const basePrice = parseFloat(ticker.ticker.last);
    const candles = [];
    const now = Date.now();
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1-minute candles
      const volatility = basePrice * 0.002; // 0.2% volatility
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = basePrice + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 10;
      
      candles.push([timestamp, open, high, low, close, volume]);
    }
    
    return candles;
  } catch (error) {
    console.error(`Error fetching candles for ${pair}:`, error.message);
    return [];
  }
}

/**
 * Aggregate candles to higher timeframe
 */
function aggregateCandles(candles, targetTimeframe) {
  // Simplified aggregation - in production, implement proper OHLCV aggregation
  return candles;
}

/**
 * Execute trade based on signal
 */
async function executeTrade(signal, pair, coinData) {
  if (!signal || signal.action === 'HOLD') return null;
  
  const coin = pair.split('_')[0];
  const currentPrice = parseFloat((await indodax.getTicker(pair)).ticker.last);
  
  // Calculate position size based on available balance
  const availableBalance = coinData.currentBalance;
  const positionSize = availableBalance * 0.95; // Use 95% of available balance
  const amount = positionSize / currentPrice;
  
  if (amount <= 0) {
    console.log(`Insufficient balance for ${pair}`);
    return null;
  }
  
  try {
    // Place order
    const orderType = signal.action.toLowerCase();
    const order = await indodax.placeOrder(pair, orderType, currentPrice, amount);
    
    if (order && (order.success || order.order)) {
      const executedOrder = order.order || order;
      
      // Update position state
      tradingState.positions[coin] = {
        type: signal.action,
        entryPrice: currentPrice,
        amount,
        stopLoss: signal.sl,
        takeProfit: signal.tp,
        openedAt: Date.now(),
        orderId: executedOrder.id
      };
      
      // Record trade
      const trade = {
        pair,
        type: signal.action,
        price: currentPrice,
        amount,
        sl: signal.sl,
        tp: signal.tp,
        timestamp: Date.now(),
        isSimulation
      };
      
      tradingState.trades.push(trade);
      coinData.trades.push(trade);
      
      // Send notifications
      await telegram.sendTradingSignal(signal, pair);
      await telegram.sendOrderExecution(executedOrder, pair, isSimulation);
      
      console.log(`Executed ${signal.action} order for ${pair} at ${currentPrice}`);
      return executedOrder;
    }
  } catch (error) {
    console.error(`Error executing trade for ${pair}:`, error.message);
  }
  
  return null;
}

/**
 * Check and close positions based on TP/SL
 */
async function managePositions() {
  for (const [coin, coinData] of Object.entries(tradingState.coinBalances)) {
    if (!coinData.position) continue;
    
    const pair = `${coin}_idr`;
    try {
      const ticker = await indodax.getTicker(pair);
      const currentPrice = parseFloat(ticker.ticker.last);
      const position = coinData.position;
      
      let shouldClose = false;
      let closeReason = '';
      
      // Check Take Profit
      if (position.type === 'BUY' && currentPrice >= position.takeProfit) {
        shouldClose = true;
        closeReason = 'Take Profit';
      } else if (position.type === 'SELL' && currentPrice <= position.takeProfit) {
        shouldClose = true;
        closeReason = 'Take Profit';
      }
      
      // Check Stop Loss
      if (position.type === 'BUY' && currentPrice <= position.stopLoss) {
        shouldClose = true;
        closeReason = 'Stop Loss';
      } else if (position.type === 'SELL' && currentPrice >= position.stopLoss) {
        shouldClose = true;
        closeReason = 'Stop Loss';
      }
      
      if (shouldClose) {
        // Close position
        const closeType = position.type === 'BUY' ? 'sell' : 'buy';
        const closeOrder = await indodax.placeOrder(pair, closeType, currentPrice, position.amount);
        
        // Calculate PnL
        const pnl = position.type === 'BUY' 
          ? (currentPrice - position.entryPrice) * position.amount
          : (position.entryPrice - currentPrice) * position.amount;
        
        const pnlPercentage = (pnl / (position.entryPrice * position.amount)) * 100;
        
        // Update balance
        coinData.currentBalance += pnl;
        coinData.pnl += pnl;
        
        // Send notification
        const pnlType = pnl > 0 ? 'PROFIT' : 'LOSS';
        await telegram.sendPnLNotification(pair, pnl, pnlPercentage, pnlType);
        
        // Clear position
        tradingState.positions[coin] = null;
        coinData.position = null;
        
        console.log(`Closed ${pair} position: ${closeReason}, PnL: ${pnl}`);
      }
    } catch (error) {
      console.error(`Error managing position for ${coin}:`, error.message);
    }
  }
}

/**
 * Main trading loop
 */
async function tradingLoop() {
  if (!tradingState.isActive) return;
  
  console.log('Running trading loop...');
  
  for (const [coin, coinData] of Object.entries(tradingState.coinBalances)) {
    const pair = `${coin}_idr`;
    
    try {
      // Get candle data
      const h4Candles = await getCandles(pair, '4h');
      const m15Candles = await getCandles(pair, '15m');
      
      if (h4Candles.length === 0 || m15Candles.length === 0) continue;
      
      // Generate signal
      const signal = ta.generateSignal(h4Candles, m15Candles);
      
      // Store signal
      tradingState.signals.unshift({
        pair,
        signal,
        timestamp: Date.now(),
        h4Trend: ta.determineTrend(h4Candles)
      });
      
      // Keep only last 100 signals
      if (tradingState.signals.length > 100) {
        tradingState.signals.pop();
      }
      
      // Execute trade if signal is strong enough and no existing position
      if (signal.action !== 'HOLD' && !coinData.position && ENABLE_AUTO_TRADING) {
        if (signal.confidence > 0.5) {
          await executeTrade(signal, pair, coinData);
        }
      }
    } catch (error) {
      console.error(`Error processing ${pair}:`, error.message);
    }
  }
  
  // Manage existing positions
  await managePositions();
  
  tradingState.lastUpdate = Date.now();
}

// Start trading loop every 5 minutes
setInterval(tradingLoop, 5 * 60 * 1000);

// API Routes

// Get trading state
app.get('/api/state', (req, res) => {
  res.json({
    isActive: tradingState.isActive,
    isSimulation,
    enableAutoTrading: ENABLE_AUTO_TRADING,
    positions: tradingState.positions,
    coinBalances: tradingState.coinBalances,
    lastUpdate: tradingState.lastUpdate
  });
});

// Get signals
app.get('/api/signals', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(tradingState.signals.slice(0, limit));
});

// Get trades history
app.get('/api/trades', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(tradingState.trades.slice(-limit));
});

// Toggle auto trading
app.post('/api/toggle-trading', (req, res) => {
  tradingState.isActive = !tradingState.isActive;
  
  telegram.sendStatusUpdate({
    mode: isSimulation ? 'SIMULATION' : 'LIVE',
    activeCoins: [...COIN_ALLOCATIONS.core, ...COIN_ALLOCATIONS.satellite],
    totalBalance: Object.values(tradingState.coinBalances).reduce((sum, c) => sum + c.currentBalance, 0),
    openPositions: Object.values(tradingState.positions).filter(p => p !== null).length,
    message: tradingState.isActive ? 'Trading started' : 'Trading stopped'
  });
  
  res.json({ isActive: tradingState.isActive });
});

// Add new coin to monitoring
app.post('/api/add-coin', (req, res) => {
  const { coin, capital } = req.body;
  
  if (!coin) {
    return res.status(400).json({ error: 'Coin symbol required' });
  }
  
  const coinLower = coin.toLowerCase();
  
  if (!tradingState.coinBalances[coinLower]) {
    tradingState.coinBalances[coinLower] = {
      capital: capital || INITIAL_CAPITAL_PER_COIN,
      currentBalance: capital || INITIAL_CAPITAL_PER_COIN,
      position: null,
      pnl: 0,
      trades: []
    };
    
    res.json({ success: true, message: `Added ${coin} to monitoring` });
  } else {
    res.json({ success: false, message: 'Coin already being monitored' });
  }
});

// Get chart data
app.get('/api/chart/:pair', async (req, res) => {
  const { pair } = req.params;
  const { timeframe = '1h', limit = 100 } = req.query;
  
  try {
    const candles = await getCandles(pair, timeframe);
    res.json({ candles: candles.slice(-limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get indicators for a pair
app.get('/api/indicators/:pair', async (req, res) => {
  const { pair } = req.params;
  
  try {
    const h4Candles = await getCandles(pair, '4h');
    const m15Candles = await getCandles(pair, '15m');
    
    if (h4Candles.length === 0 || m15Candles.length === 0) {
      return res.status(404).json({ error: 'No data available' });
    }
    
    const closes = m15Candles.map(c => c[4]);
    const rsi = ta.calculateRSI(closes);
    const atr = ta.calculateATR(m15Candles);
    const bb = ta.calculateBollingerBands(closes);
    const h4Trend = ta.determineTrend(h4Candles);
    const support = ta.findSupport(m15Candles);
    const resistance = ta.findResistance(m15Candles);
    const volumeAnalysis = ta.analyzeVolume(m15Candles);
    
    res.json({
      pair,
      h4Trend,
      indicators: {
        rsi,
        atr,
        bollingerBands: bb,
        support,
        resistance,
        volume: volumeAnalysis
      },
      currentPrice: closes[closes.length - 1],
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Trading bot server running on port ${PORT}`);
  console.log(`Mode: ${isSimulation ? 'SIMULATION' : 'LIVE'}`);
  console.log(`Auto Trading: ${ENABLE_AUTO_TRADING ? 'ENABLED' : 'DISABLED'}`);
  
  // Send startup notification
  telegram.sendStatusUpdate({
    mode: isSimulation ? 'SIMULATION' : 'LIVE',
    activeCoins: [...COIN_ALLOCATIONS.core, ...COIN_ALLOCATIONS.satellite],
    totalBalance: Object.values(tradingState.coinBalances).reduce((sum, c) => sum + c.currentBalance, 0),
    openPositions: 0,
    message: 'Bot server started successfully'
  });
});

module.exports = app;
