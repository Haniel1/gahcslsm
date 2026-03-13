/**
 * Technical Analysis Module
 * Implements trading strategies based on Trend Following, Support/Resistance, and Volume Analysis
 */
const { EMA, RSI, ATR, BollingerBands } = require('technicalindicators');

class TechnicalAnalysis {
  constructor() {
    this.defaultEMAPeriod = 200;
    this.defaultRSIPeriod = 14;
    this.defaultATRPeriod = 14;
    this.defaultBBPeriod = 20;
  }

  /**
   * Calculate Exponential Moving Average
   * @param {Array} prices - Array of closing prices
   * @param {number} period - EMA period (default: 200)
   * @returns {number|null} - EMA value or null if insufficient data
   */
  calculateEMA(prices, period = this.defaultEMAPeriod) {
    if (!prices || prices.length < period) return null;

    const input = { values: prices, period };
    const result = EMA.calculate(input);
    return result[result.length - 1] || null;
  }

  /**
   * Determine trend direction based on H4 timeframe
   * @param {Array} candles - OHLCV candlestick data [timestamp, open, high, low, close, volume]
   * @returns {string} - 'BULLISH', 'BEARISH', or 'SIDEWAYS'
   */
  determineTrend(candles) {
    if (!candles || candles.length < this.defaultEMAPeriod) return 'SIDEWAYS';

    const closes = candles.map(c => c[4]); // Extract closing prices
    const ema = this.calculateEMA(closes, this.defaultEMAPeriod);
    const currentPrice = closes[closes.length - 1];

    if (!ema) return 'SIDEWAYS';

    // Add buffer to avoid frequent flips
    const buffer = ema * 0.005; // 0.5% buffer

    if (currentPrice > ema + buffer) {
      return 'BULLISH';
    } else if (currentPrice < ema - buffer) {
      return 'BEARISH';
    }
    return 'SIDEWAYS';
  }

  /**
   * Find support levels from recent lows
   * @param {Array} candles - OHLCV candlestick data
   * @param {number} period - Lookback period
   * @returns {number|null} - Support level
   */
  findSupport(candles, period = 20) {
    if (!candles || candles.length < period) return null;

    const recentCandles = candles.slice(-period);
    const lowestLow = Math.min(...recentCandles.map(c => c[3])); // Low is at index 3
    return lowestLow;
  }

  /**
   * Find resistance levels from recent highs
   * @param {Array} candles - OHLCV candlestick data
   * @param {number} period - Lookback period
   * @returns {number|null} - Resistance level
   */
  findResistance(candles, period = 20) {
    if (!candles || candles.length < period) return null;

    const recentCandles = candles.slice(-period);
    const highestHigh = Math.max(...recentCandles.map(c => c[2])); // High is at index 2
    return highestHigh;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * @param {Array} prices - Array of closing prices
   * @param {number} period - RSI period (default: 14)
   * @returns {number|null} - RSI value (0-100)
   */
  calculateRSI(prices, period = this.defaultRSIPeriod) {
    if (!prices || prices.length < period + 1) return null;

    const input = { values: prices, period };
    const result = RSI.calculate(input);
    return result[result.length - 1] || null;
  }

  /**
   * Calculate ATR (Average True Range) for volatility-based stop loss
   * @param {Array} candles - OHLCV candlestick data
   * @param {number} period - ATR period (default: 14)
   * @returns {number|null} - ATR value
   */
  calculateATR(candles, period = this.defaultATRPeriod) {
    if (!candles || candles.length < period + 1) return null;

    const high = candles.map(c => c[2]);
    const low = candles.map(c => c[3]);
    const close = candles.map(c => c[4]);

    const input = { high, low, close, period };
    const result = ATR.calculate(input);
    return result[result.length - 1] || null;
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array} prices - Array of closing prices
   * @param {number} period - BB period (default: 20)
   * @returns {Object|null} - { upper, middle, lower } bands
   */
  calculateBollingerBands(prices, period = this.defaultBBPeriod) {
    if (!prices || prices.length < period) return null;

    const input = { values: prices, period, stdDev: 2 };
    const result = BollingerBands.calculate(input);
    
    if (result && result.length > 0) {
      return result[result.length - 1];
    }
    return null;
  }

  /**
   * Check if current candle shows rejection pattern
   * @param {Array} currentCandle - Current candle [timestamp, open, high, low, close, volume]
   * @param {Array} previousCandle - Previous candle
   * @param {string} type - 'bullish' or 'bearish'
   * @returns {boolean} - True if rejection pattern detected
   */
  isRejectionCandle(currentCandle, previousCandle, type = 'bullish') {
    if (!currentCandle || !previousCandle) return false;

    const [currTime, currOpen, currHigh, currLow, currClose, currVol] = currentCandle;
    const [prevTime, prevOpen, prevHigh, prevLow, prevClose, prevVol] = previousCandle;

    if (type === 'bullish') {
      // Bullish rejection: hammer or bullish engulfing
      const bodySize = Math.abs(currClose - currOpen);
      const lowerShadow = Math.min(currOpen, currClose) - currLow;
      const upperShadow = currHigh - Math.max(currOpen, currClose);
      
      // Hammer pattern: small body, long lower shadow
      const isHammer = lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5;
      
      // Bullish engulfing
      const isEngulfing = currOpen < prevClose && currClose > prevOpen && 
                         currClose > currOpen && prevClose < prevOpen;

      return isHammer || isEngulfing;
    } else {
      // Bearish rejection: shooting star or bearish engulfing
      const bodySize = Math.abs(currClose - currOpen);
      const lowerShadow = Math.min(currOpen, currClose) - currLow;
      const upperShadow = currHigh - Math.max(currOpen, currClose);
      
      // Shooting star pattern: small body, long upper shadow
      const isShootingStar = upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5;
      
      // Bearish engulfing
      const isEngulfing = currOpen > prevClose && currClose < prevOpen && 
                         currClose < currOpen && prevClose > prevOpen;

      return isShootingStar || isEngulfing;
    }
  }

  /**
   * Analyze volume to confirm price action
   * @param {Array} candles - OHLCV candlestick data
   * @returns {Object} - Volume analysis result
   */
  analyzeVolume(candles) {
    if (!candles || candles.length < 2) return { signal: 'NEUTRAL', strength: 0 };

    const recent = candles.slice(-5);
    const avgVolume = recent.reduce((sum, c) => sum + c[5], 0) / recent.length;
    
    const currentCandle = candles[candles.length - 1];
    const previousCandle = candles[candles.length - 2];
    
    const priceChange = currentCandle[4] - previousCandle[4];
    const volumeRatio = currentCandle[5] / avgVolume;

    let signal = 'NEUTRAL';
    let strength = 0;

    // Bullish confirmation: Price up with high volume
    if (priceChange > 0 && volumeRatio > 1.2) {
      signal = 'BULLISH_CONFIRMED';
      strength = Math.min(volumeRatio / 2, 1);
    }
    // Bearish confirmation: Price down with high volume
    else if (priceChange < 0 && volumeRatio > 1.2) {
      signal = 'BEARISH_CONFIRMED';
      strength = Math.min(volumeRatio / 2, 1);
    }
    // Divergence: Price up but volume decreasing (weakness)
    else if (priceChange > 0 && volumeRatio < 0.8) {
      signal = 'BULLISH_DIVERGENCE';
      strength = 0.3;
    }
    // Divergence: Price down but volume decreasing (weakness)
    else if (priceChange < 0 && volumeRatio < 0.8) {
      signal = 'BEARISH_DIVERGENCE';
      strength = 0.3;
    }

    return { signal, strength, volumeRatio };
  }

  /**
   * Calculate Stop Loss using ATR method
   * @param {number} entryPrice - Entry price
   * @param {string} type - 'BUY' or 'SELL'
   * @param {number} atr - ATR value
   * @returns {number} - Stop Loss price
   */
  calculateStopLoss(entryPrice, type, atr) {
    if (!atr) atr = entryPrice * 0.02; // Default 2% if ATR not available

    const multiplier = 2; // 2x ATR
    if (type === 'BUY') {
      return entryPrice - (multiplier * atr);
    } else {
      return entryPrice + (multiplier * atr);
    }
  }

  /**
   * Calculate Take Profit with minimum 1:2 Risk/Reward ratio
   * @param {number} entryPrice - Entry price
   * @param {string} type - 'BUY' or 'SELL'
   * @param {number} stopLoss - Stop Loss price
   * @returns {number} - Take Profit price
   */
  calculateTakeProfit(entryPrice, type, stopLoss) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = risk * 2; // Minimum 1:2 risk/reward

    if (type === 'BUY') {
      return entryPrice + reward;
    } else {
      return entryPrice - reward;
    }
  }

  /**
   * Main trading signal generator
   * @param {Array} h4Candles - H4 timeframe candles for trend
   * @param {Array} m15Candles - M15 timeframe candles for entry
   * @returns {Object} - Trading signal { action, confidence, sl, tp, reason }
   */
  generateSignal(h4Candles, m15Candles) {
    const defaultResult = { action: 'HOLD', confidence: 0, sl: null, tp: null, reason: 'No clear signal' };

    // Determine H4 trend
    const h4Trend = this.determineTrend(h4Candles);
    
    if (h4Trend === 'SIDEWAYS') {
      return { ...defaultResult, reason: 'Market is sideways on H4' };
    }

    // Get M15 data for entry timing
    const m15Closes = m15Candles.map(c => c[4]);
    const currentPrice = m15Closes[m15Closes.length - 1];
    const currentM15Candle = m15Candles[m15Candles.length - 1];
    const previousM15Candle = m15Candles[m15Candles.length - 2];

    // Calculate indicators
    const rsi = this.calculateRSI(m15Closes);
    const atr = this.calculateATR(m15Candles);
    const volumeAnalysis = this.analyzeVolume(m15Candles);

    if (h4Trend === 'BULLISH') {
      // Look for BUY opportunities in bullish trend
      const support = this.findSupport(m15Candles);
      
      if (support && currentPrice <= support * 1.002) { // Within 0.2% of support
        // Check for bullish rejection and oversold RSI
        const isRejection = this.isRejectionCandle(currentM15Candle, previousM15Candle, 'bullish');
        
        if (isRejection && rsi && rsi < 40) {
          // Check volume confirmation
          if (volumeAnalysis.signal.includes('BULLISH')) {
            const sl = this.calculateStopLoss(currentPrice, 'BUY', atr);
            const tp = this.calculateTakeProfit(currentPrice, 'BUY', sl);
            
            // Verify risk/reward ratio
            const riskReward = (tp - currentPrice) / (currentPrice - sl);
            if (riskReward >= 2) {
              return {
                action: 'BUY',
                confidence: Math.min(rsi ? (40 - rsi) / 40 : 0.5, 1),
                sl,
                tp,
                reason: `Bullish setup: Price at support (${support}), RSI=${rsi?.toFixed(2)}, Volume=${volumeAnalysis.signal}`
              };
            }
          }
        }
      }
    } else if (h4Trend === 'BEARISH') {
      // Look for SELL opportunities in bearish trend
      const resistance = this.findResistance(m15Candles);
      
      if (resistance && currentPrice >= resistance * 0.998) { // Within 0.2% of resistance
        // Check for bearish rejection and overbought RSI
        const isRejection = this.isRejectionCandle(currentM15Candle, previousM15Candle, 'bearish');
        
        if (isRejection && rsi && rsi > 60) {
          // Check volume confirmation
          if (volumeAnalysis.signal.includes('BEARISH')) {
            const sl = this.calculateStopLoss(currentPrice, 'SELL', atr);
            const tp = this.calculateTakeProfit(currentPrice, 'SELL', sl);
            
            // Verify risk/reward ratio
            const riskReward = (currentPrice - tp) / (sl - currentPrice);
            if (riskReward >= 2) {
              return {
                action: 'SELL',
                confidence: Math.min(rsi ? (rsi - 60) / 40 : 0.5, 1),
                sl,
                tp,
                reason: `Bearish setup: Price at resistance (${resistance}), RSI=${rsi?.toFixed(2)}, Volume=${volumeAnalysis.signal}`
              };
            }
          }
        }
      }
    }

    return defaultResult;
  }
}

module.exports = TechnicalAnalysis;
