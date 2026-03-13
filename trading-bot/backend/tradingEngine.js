import db from './database.js';
import indodax from './indodax.js';
import telegram from './telegram.js';
import technicalAnalysis from './technicalAnalysis.js';

class TradingEngine {
  constructor() {
    this.activeTrades = new Map();
    this.isRunning = false;
    this.checkInterval = null;
  }

  /**
   * Start the auto trading engine
   */
  start() {
    if (this.isRunning) {
      console.log('Trading engine already running');
      return;
    }

    this.isRunning = true;
    console.log('Trading engine started');
    
    // Check for signals every 5 minutes
    this.checkInterval = setInterval(() => {
      this.analyzeMarket();
    }, 5 * 60 * 1000);

    // Check open trades every minute
    setInterval(() => {
      this.checkOpenTrades();
    }, 60 * 1000);
  }

  /**
   * Stop the auto trading engine
   */
  stop() {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Trading engine stopped');
  }

  /**
   * Analyze market for all active coins
   */
  async analyzeMarket() {
    if (!this.isRunning) return;

    try {
      const coins = db.prepare('SELECT * FROM coins WHERE is_active = 1').all();
      
      for (const coin of coins) {
        await this.analyzeCoin(coin);
      }
    } catch (error) {
      console.error('Error analyzing market:', error.message);
      await telegram.sendError(`Market analysis error: ${error.message}`);
    }
  }

  /**
   * Analyze a single coin
   */
  async analyzeCoin(coin) {
    try {
      const pair = `${coin.symbol}idr`;
      
      // Get current price
      const ticker = await indodax.getTicker(pair);
      const currentPrice = parseFloat(ticker.last);
      
      // Get historical data (simulate with multiple API calls in production)
      const prices = await this.getHistoricalPrices(pair, 200);
      const volumes = await this.getHistoricalVolumes(pair, 200);
      
      if (prices.length < 200) {
        console.log(`Insufficient data for ${coin.symbol}`);
        return;
      }

      // Multi-timeframe analysis
      const h4Prices = prices.slice(-96); // 96 candles of 15min = 24 hours ~ H4 context
      const h1Prices = prices.slice(-24); // 24 candles of 15min = 6 hours ~ H1
      const m15Prices = prices;

      // Determine H4 trend
      const trendH4 = technicalAnalysis.getTrendH4(h4Prices, 50);
      
      // Calculate indicators
      const rsi = technicalAnalysis.calculateRSI(m15Prices, 14);
      const atr = technicalAnalysis.calculateATR(
        m15Prices.map((_, i) => Math.max(...m15Prices.slice(i, i+14))),
        m15Prices.map((_, i) => Math.min(...m15Prices.slice(i, i+14))),
        m15Prices.slice(-14)
      );
      
      // Find support and resistance
      const supportLevel = technicalAnalysis.findSupportLevel(m15Prices, 20);
      const resistanceLevel = technicalAnalysis.findResistanceLevel(m15Prices, 20);
      
      // Volume analysis
      const recentVolumes = volumes.slice(-10);
      const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const currentVolume = recentVolumes[recentVolumes.length - 1];
      const volumeChange = (currentVolume - avgVolume) / avgVolume;
      
      // Check for accumulation/distribution
      const isAccumulation = technicalAnalysis.isAccumulationPhase(m15Prices, volumes);
      const isDistribution = technicalAnalysis.isDistributionPhase(m15Prices, volumes);
      
      // Generate signal based on strategy
      let signal = null;
      
      if (trendH4 === 'BULLISH') {
        // Look for buy opportunities at support
        const nearSupport = currentPrice <= supportLevel * 1.02; // Within 2% of support
        const rsiOversold = rsi < 30 || rsi < 40;
        const volumeConfirmed = volumeChange > 0 || isAccumulation;
        
        if (nearSupport && rsiOversold && volumeConfirmed) {
          const sl = technicalAnalysis.calculateStopLoss(currentPrice, atr, 'buy', 2);
          const tp = technicalAnalysis.calculateTakeProfit(currentPrice, sl, 'buy', 2);
          
          if (sl && tp && technicalAnalysis.validateRiskReward(currentPrice, sl, tp, 'buy', 2)) {
            signal = {
              type: 'BUY',
              coinId: coin.id,
              symbol: coin.symbol,
              price: currentPrice,
              tp: tp,
              sl: sl,
              reason: `Bullish trend + Support bounce + RSI ${rsi.toFixed(2)} + Volume confirmed`,
              timeframe: 'M15',
              trendH4: trendH4,
              supportLevel: supportLevel,
              resistanceLevel: resistanceLevel,
              rsiValue: rsi,
              volumeConfirmed: volumeConfirmed
            };
          }
        }
      } else if (trendH4 === 'BEARISH') {
        // Look for sell opportunities at resistance
        const nearResistance = currentPrice >= resistanceLevel * 0.98; // Within 2% of resistance
        const rsiOverbought = rsi > 70 || rsi > 60;
        const volumeConfirmed = volumeChange > 0 || isDistribution;
        
        if (nearResistance && rsiOverbought && volumeConfirmed) {
          const sl = technicalAnalysis.calculateStopLoss(currentPrice, atr, 'sell', 2);
          const tp = technicalAnalysis.calculateTakeProfit(currentPrice, sl, 'sell', 2);
          
          if (sl && tp && technicalAnalysis.validateRiskReward(currentPrice, sl, tp, 'sell', 2)) {
            signal = {
              type: 'SELL',
              coinId: coin.id,
              symbol: coin.symbol,
              price: currentPrice,
              tp: tp,
              sl: sl,
              reason: `Bearish trend + Resistance rejection + RSI ${rsi.toFixed(2)} + Volume confirmed`,
              timeframe: 'M15',
              trendH4: trendH4,
              supportLevel: supportLevel,
              resistanceLevel: resistanceLevel,
              rsiValue: rsi,
              volumeConfirmed: volumeConfirmed
            };
          }
        }
      }

      // Save signal if found
      if (signal) {
        this.saveSignal(signal);
        await this.processSignal(signal, coin);
      }

    } catch (error) {
      console.error(`Error analyzing ${coin.symbol}:`, error.message);
    }
  }

  /**
   * Process trading signal
   */
  async processSignal(signal, coin) {
    // Check if we already have an active trade for this coin
    if (this.activeTrades.has(coin.id)) {
      console.log(`Active trade exists for ${coin.symbol}, skipping`);
      return;
    }

    // Send Telegram notification
    if (signal.type === 'BUY') {
      await telegram.sendBuySignal(signal.symbol, signal.price, signal.tp, signal.sl, signal.reason);
    } else {
      await telegram.sendSellSignal(signal.symbol, signal.price, signal.tp, signal.sl, signal.reason);
    }

    // Execute trade if auto-trading is enabled
    const autoTradeEnabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_trade_enabled');
    
    if (autoTradeEnabled && autoTradeEnabled.value === 'true') {
      await this.executeTrade(signal, coin);
    }
  }

  /**
   * Execute actual trade on Indodax
   */
  async executeTrade(signal, coin) {
    try {
      const pair = `${coin.symbol}idr`;
      
      // Get allocated capital for this coin
      const capital = coin.current_capital || coin.allocated_capital;
      
      if (signal.type === 'BUY') {
        // Calculate amount to buy
        const amount = capital / signal.price;
        
        // Place buy order
        const order = await indodax.buy(pair, signal.price, amount);
        
        if (order.success) {
          // Save trade to database
          const stmt = db.prepare(`
            INSERT INTO trades (coin_id, type, price, amount, total, status, signal_type, tp_price, sl_price, executed_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'))
          `);
          stmt.run(coin.id, 'buy', signal.price, amount, capital, signal.type, signal.tp, signal.sl);
          
          // Track active trade
          this.activeTrades.set(coin.id, {
            type: 'buy',
            entryPrice: signal.price,
            amount: amount,
            tp: signal.tp,
            sl: signal.sl,
            timestamp: Date.now()
          });
          
          // Send execution notification
          await telegram.sendTradeExecuted('buy', coin.symbol, signal.price, amount, capital);
        }
      } else if (signal.type === 'SELL') {
        // For sell, we need to have the coin balance
        const balances = await indodax.getBalances();
        const coinBalance = balances[coin.symbol] ? parseFloat(balances[coin.symbol].available) : 0;
        
        if (coinBalance > 0) {
          const amount = coinBalance;
          const total = amount * signal.price;
          
          // Place sell order
          const order = await indodax.sell(pair, signal.price, amount);
          
          if (order.success) {
            // Save trade to database
            const stmt = db.prepare(`
              INSERT INTO trades (coin_id, type, price, amount, total, status, signal_type, tp_price, sl_price, executed_at)
              VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'))
            `);
            stmt.run(coin.id, 'sell', signal.price, amount, total, signal.type, signal.tp, signal.sl);
            
            // Track active trade
            this.activeTrades.set(coin.id, {
              type: 'sell',
              entryPrice: signal.price,
              amount: amount,
              tp: signal.tp,
              sl: signal.sl,
              timestamp: Date.now()
            });
            
            // Send execution notification
            await telegram.sendTradeExecuted('sell', coin.symbol, signal.price, amount, total);
          }
        }
      }
    } catch (error) {
      console.error(`Error executing trade for ${coin.symbol}:`, error.message);
      await telegram.sendError(`Trade execution error for ${coin.symbol}: ${error.message}`);
    }
  }

  /**
   * Check open trades for TP/SL hits
   */
  async checkOpenTrades() {
    if (!this.isRunning) return;

    try {
      const activeTrades = db.prepare(`
        SELECT t.*, c.symbol, c.current_capital
        FROM trades t
        JOIN coins c ON t.coin_id = c.id
        WHERE t.status = 'active'
      `).all();

      for (const trade of activeTrades) {
        const pair = `${trade.symbol}idr`;
        const ticker = await indodax.getTicker(pair);
        const currentPrice = parseFloat(ticker.last);

        let shouldClose = false;
        let closeReason = '';

        // Check Take Profit
        if (trade.type === 'buy' && currentPrice >= trade.tp_price) {
          shouldClose = true;
          closeReason = 'Take Profit';
        } else if (trade.type === 'sell' && currentPrice <= trade.tp_price) {
          shouldClose = true;
          closeReason = 'Take Profit';
        }

        // Check Stop Loss
        if (trade.type === 'buy' && currentPrice <= trade.sl_price) {
          shouldClose = true;
          closeReason = 'Stop Loss';
        } else if (trade.type === 'sell' && currentPrice >= trade.sl_price) {
          shouldClose = true;
          closeReason = 'Stop Loss';
        }

        if (shouldClose) {
          await this.closeTrade(trade, currentPrice, closeReason);
        }
      }
    } catch (error) {
      console.error('Error checking open trades:', error.message);
    }
  }

  /**
   * Close a trade
   */
  async closeTrade(trade, exitPrice, reason) {
    try {
      const pair = `${trade.symbol}idr`;
      let profitLoss = 0;

      if (trade.type === 'buy') {
        // Close buy position by selling
        const amount = trade.amount;
        const sellTotal = amount * exitPrice;
        
        await indodax.sell(pair, exitPrice, amount);
        
        profitLoss = sellTotal - trade.total;
        
        // Update coin capital
        const newCapital = trade.current_capital + profitLoss;
        db.prepare('UPDATE coins SET current_capital = ? WHERE id = ?').run(newCapital, trade.coin_id);
        
        // Send notification
        if (reason === 'Take Profit') {
          await telegram.sendTakeProfitHit(trade.symbol, trade.price, exitPrice, profitLoss);
        } else {
          await telegram.sendStopLossHit(trade.symbol, trade.price, exitPrice, Math.abs(profitLoss));
        }
      } else {
        // For sell trades, profit is calculated differently
        const buyBackCost = trade.amount * exitPrice;
        profitLoss = trade.total - buyBackCost;
        
        // Update coin capital
        const newCapital = trade.current_capital + profitLoss;
        db.prepare('UPDATE coins SET current_capital = ? WHERE id = ?').run(newCapital, trade.coin_id);
        
        // Send notification
        if (reason === 'Take Profit') {
          await telegram.sendTakeProfitHit(trade.symbol, trade.price, exitPrice, profitLoss);
        } else {
          await telegram.sendStopLossHit(trade.symbol, trade.price, exitPrice, Math.abs(profitLoss));
        }
      }

      // Update trade status
      db.prepare(`
        UPDATE trades 
        SET status = 'closed', 
            executed_at = datetime('now')
        WHERE id = ?
      `).run(trade.id);

      // Remove from active trades
      this.activeTrades.delete(trade.coin_id);

    } catch (error) {
      console.error(`Error closing trade for ${trade.symbol}:`, error.message);
      await telegram.sendError(`Trade closure error: ${error.message}`);
    }
  }

  /**
   * Save signal to database
   */
  saveSignal(signal) {
    const stmt = db.prepare(`
      INSERT INTO signals (coin_id, signal_type, price, timeframe, trend_h4, support_level, resistance_level, rsi_value, volume_confirmed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      signal.coinId,
      signal.type,
      signal.price,
      signal.timeframe,
      signal.trendH4,
      signal.supportLevel,
      signal.resistanceLevel,
      signal.rsiValue,
      signal.volumeConfirmed
    );
  }

  /**
   * Get historical prices (placeholder - implement proper OHLCV fetching)
   */
  async getHistoricalPrices(pair, count = 200) {
    // In production, implement proper candlestick data fetching
    // This is a placeholder that generates simulated data
    const prices = [];
    let basePrice = 100000;
    
    try {
      const ticker = await indodax.getTicker(pair);
      basePrice = parseFloat(ticker.last);
    } catch (e) {
      // Use default if API fails
    }
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 0.02;
      basePrice = basePrice * (1 + change);
      prices.push(basePrice);
    }
    
    return prices;
  }

  /**
   * Get historical volumes (placeholder)
   */
  async getHistoricalVolumes(pair, count = 200) {
    const volumes = [];
    for (let i = 0; i < count; i++) {
      volumes.push(Math.random() * 1000000 + 500000);
    }
    return volumes;
  }
}

export default new TradingEngine();
