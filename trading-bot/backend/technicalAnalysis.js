import { EMA, RSI, BollingerBands, ATR } from 'technicalindicators';

class TechnicalAnalysis {
  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(prices, period = 50) {
    if (prices.length < period) return null;
    
    const input = { values: prices, period: period };
    const result = EMA.calculate(input);
    return result ? result[result.length - 1] : null;
  }

  /**
   * Calculate RSI
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const input = { values: prices, period: period };
    const result = RSI.calculate(input);
    return result ? result[result.length - 1] : null;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const input = { values: prices, period: period, stdDev: stdDev };
    const result = BollingerBands.calculate(input);
    return result ? result[result.length - 1] : null;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period) return null;
    
    const input = { high: highs, low: lows, close: closes, period: period };
    const result = ATR.calculate(input);
    return result ? result[result.length - 1] : null;
  }

  /**
   * Determine H4 Trend using EMA
   */
  getTrendH4(prices, period = 200) {
    const ema = this.calculateEMA(prices, period);
    if (!ema) return 'UNKNOWN';
    
    const currentPrice = prices[prices.length - 1];
    return currentPrice > ema ? 'BULLISH' : 'BEARISH';
  }

  /**
   * Find Support Level (Swing Low)
   */
  findSupportLevel(prices, period = 20) {
    if (prices.length < period) return null;
    
    let minPrice = prices[prices.length - 1];
    for (let i = prices.length - period; i < prices.length; i++) {
      if (prices[i] < minPrice) minPrice = prices[i];
    }
    return minPrice;
  }

  /**
   * Find Resistance Level (Swing High)
   */
  findResistanceLevel(prices, period = 20) {
    if (prices.length < period) return null;
    
    let maxPrice = prices[0];
    for (let i = prices.length - period; i < prices.length; i++) {
      if (prices[i] > maxPrice) maxPrice = prices[i];
    }
    return maxPrice;
  }

  /**
   * Check if volume confirms price action
   */
  confirmVolume(priceChange, volumeChange) {
    // Bullish confirmation: Price up + Volume up
    if (priceChange > 0 && volumeChange > 0) return 'BULLISH_CONFIRMED';
    
    // Bearish confirmation: Price down + Volume up
    if (priceChange < 0 && volumeChange > 0) return 'BEARISH_CONFIRMED';
    
    // Weak signal: Price movement without volume support
    if (priceChange > 0 && volumeChange < 0) return 'BULLISH_WEAK';
    if (priceChange < 0 && volumeChange < 0) return 'BEARISH_WEAK';
    
    return 'NEUTRAL';
  }

  /**
   * Detect accumulation phase
   */
  isAccumulationPhase(prices, volumes) {
    if (prices.length < 10 || volumes.length < 10) return false;
    
    const recentPrices = prices.slice(-10);
    const recentVolumes = volumes.slice(-10);
    
    // Check if price spikes are accompanied by volume increases
    let confirmedSpikes = 0;
    for (let i = 1; i < recentPrices.length; i++) {
      const priceChange = (recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1];
      const volumeChange = (recentVolumes[i] - recentVolumes[i-1]) / recentVolumes[i-1];
      
      if (priceChange > 0.01 && volumeChange > 0) {
        confirmedSpikes++;
      }
    }
    
    return confirmedSpikes >= 3;
  }

  /**
   * Detect distribution phase
   */
  isDistributionPhase(prices, volumes) {
    if (prices.length < 10 || volumes.length < 10) return false;
    
    const recentPrices = prices.slice(-10);
    const recentVolumes = volumes.slice(-10);
    
    // Check if price drops have high volume and rallies have low volume
    let distributionSignals = 0;
    for (let i = 1; i < recentPrices.length; i++) {
      const priceChange = (recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1];
      const volumeChange = (recentVolumes[i] - recentVolumes[i-1]) / recentVolumes[i-1];
      
      // Price down with volume up
      if (priceChange < -0.01 && volumeChange > 0) {
        distributionSignals++;
      }
      // Price up with volume down
      if (priceChange > 0.01 && volumeChange < 0) {
        distributionSignals++;
      }
    }
    
    return distributionSignals >= 4;
  }

  /**
   * Check for rejection candle pattern
   */
  isRejectionCandle(current, previous, type = 'bullish') {
    const currentBody = Math.abs(current.close - current.open);
    const currentRange = current.high - current.low;
    const upperWick = current.high - Math.max(current.close, current.open);
    const lowerWick = Math.min(current.close, current.open) - current.low;
    
    if (type === 'bullish') {
      // Hammer or bullish engulfing
      const isHammer = lowerWick > currentBody * 2 && upperWick < currentBody * 0.5;
      const isEngulfing = current.close > previous.open && current.open < previous.close && previous.close < previous.open;
      return isHammer || isEngulfing;
    } else {
      // Shooting star or bearish engulfing
      const isShootingStar = upperWick > currentBody * 2 && lowerWick < currentBody * 0.5;
      const isEngulfing = current.close < previous.open && current.open > previous.close && previous.close > previous.open;
      return isShootingStar || isEngulfing;
    }
  }

  /**
   * Calculate Stop Loss using ATR
   */
  calculateStopLoss(entryPrice, atr, type = 'buy', multiplier = 2) {
    if (!atr) return null;
    
    if (type === 'buy') {
      return entryPrice - (multiplier * atr);
    } else {
      return entryPrice + (multiplier * atr);
    }
  }

  /**
   * Calculate Take Profit based on Risk:Reward ratio
   */
  calculateTakeProfit(entryPrice, stopLoss, type = 'buy', riskRewardRatio = 2) {
    const risk = Math.abs(entryPrice - stopLoss);
    
    if (type === 'buy') {
      return entryPrice + (risk * riskRewardRatio);
    } else {
      return entryPrice - (risk * riskRewardRatio);
    }
  }

  /**
   * Validate Risk:Reward ratio
   */
  validateRiskReward(entryPrice, stopLoss, takeProfit, type = 'buy', minRatio = 2) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = type === 'buy' 
      ? Math.abs(takeProfit - entryPrice)
      : Math.abs(entryPrice - takeProfit);
    
    const ratio = reward / risk;
    return ratio >= minRatio;
  }
}

export default new TechnicalAnalysis();
