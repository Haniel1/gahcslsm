/**
 * Telegram Notification Service
 * Sends trading signals and transaction notifications to Telegram
 */
const TelegramBot = require('node-telegram-bot-api');

class TelegramNotifier {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.bot = null;
    
    if (botToken && chatId) {
      this.initialize();
    }
  }

  initialize() {
    try {
      this.bot = new TelegramBot(this.botToken, { polling: false });
      console.log('Telegram bot initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error.message);
    }
  }

  /**
   * Send a message to Telegram
   * @param {string} message - Message to send
   * @param {string} parseMode - Parse mode (HTML, Markdown, etc.)
   */
  async sendMessage(message, parseMode = 'HTML') {
    if (!this.bot || !this.chatId) {
      console.log('Telegram notification skipped (not configured):', message);
      return false;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: parseMode });
      console.log('Telegram notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
      return false;
    }
  }

  /**
   * Format and send trading signal notification
   * @param {Object} signal - Trading signal object
   * @param {string} pair - Trading pair (e.g., 'btc_idr')
   */
  async sendTradingSignal(signal, pair) {
    const emoji = signal.action === 'BUY' ? '🟢' : signal.action === 'SELL' ? '🔴' : '⚪';
    
    const message = `
${emoji} <b>TRADING SIGNAL</b> ${emoji}

<b>Pair:</b> ${pair.toUpperCase()}
<b>Action:</b> ${signal.action}
<b>Confidence:</b> ${(signal.confidence * 100).toFixed(1)}%
<b>Entry Price:</b> ${signal.sl ? 'Market' : 'N/A'}
<b>Stop Loss:</b> ${signal.sl ? signal.sl.toLocaleString('id-ID') : 'N/A'}
<b>Take Profit:</b> ${signal.tp ? signal.tp.toLocaleString('id-ID') : 'N/A'}
<b>Reason:</b> ${signal.reason}

<i>Generated at: ${new Date().toLocaleString('id-ID')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Send order execution notification
   * @param {Object} order - Order object
   * @param {string} pair - Trading pair
   * @param {boolean} isSimulation - Whether this is a simulation order
   */
  async sendOrderExecution(order, pair, isSimulation = false) {
    const emoji = order.type === 'buy' ? '🟢' : '🔴';
    const mode = isSimulation ? '🧪 SIMULATION' : '💰 LIVE';
    
    const message = `
${emoji} <b>ORDER EXECUTED</b> ${emoji}
${mode}

<b>Pair:</b> ${pair.toUpperCase()}
<b>Type:</b> ${order.type.toUpperCase()}
<b>Price:</b> ${order.price.toLocaleString('id-ID')} IDR
<b>Amount:</b> ${order.amount}
<b>Total:</b> ${(order.price * order.amount).toLocaleString('id-ID')} IDR
<b>Status:</b> ${order.status.toUpperCase()}
<b>Order ID:</b> ${order.id}

<i>Executed at: ${new Date().toLocaleString('id-ID')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Send profit/loss notification when position is closed
   * @param {string} pair - Trading pair
   * @param {number} pnl - Profit/Loss amount
   * @param {number} percentage - PnL percentage
   * @param {string} type - 'PROFIT' or 'LOSS'
   */
  async sendPnLNotification(pair, pnl, percentage, type) {
    const emoji = type === 'PROFIT' ? '💰' : '📉';
    const color = type === 'PROFIT' ? '✅' : '❌';
    
    const message = `
${emoji} <b>POSITION CLOSED</b> ${emoji}
${color} ${type}

<b>Pair:</b> ${pair.toUpperCase()}
<b>P&L:</b> ${pnl.toLocaleString('id-ID')} IDR
<b>Percentage:</b> ${percentage.toFixed(2)}%

<i>Closed at: ${new Date().toLocaleString('id-ID')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Send system status notification
   * @param {Object} status - System status object
   */
  async sendStatusUpdate(status) {
    const message = `
🤖 <b>BOT STATUS UPDATE</b> 🤖

<b>Mode:</b> ${status.mode}
<b>Active Coins:</b> ${status.activeCoins.join(', ')}
<b>Total Balance:</b> ${status.totalBalance.toLocaleString('id-ID')} IDR
<b>Open Positions:</b> ${status.openPositions}
<b>Last Update:</b> ${new Date().toLocaleString('id-ID')}

${status.message ? `<i>${status.message}</i>` : ''}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Send alert for important events
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   */
  async sendAlert(title, message) {
    const alertMessage = `
⚠️ <b>ALERT: ${title}</b> ⚠️

${message}

<i>Time: ${new Date().toLocaleString('id-ID')}</i>
    `.trim();

    return await this.sendMessage(alertMessage);
  }

  /**
   * Send daily summary report
   * @param {Object} summary - Daily trading summary
   */
  async sendDailySummary(summary) {
    const message = `
📊 <b>DAILY TRADING SUMMARY</b> 📊

<b>Date:</b> ${summary.date}
<b>Total Trades:</b> ${summary.totalTrades}
<b>Winning Trades:</b> ${summary.winningTrades}
<b>Losing Trades:</b> ${summary.losingTrades}
<b>Win Rate:</b> ${summary.winRate.toFixed(1)}%
<b>Total P&L:</b> ${summary.totalPnL.toLocaleString('id-ID')} IDR
<b>Best Performer:</b> ${summary.bestPerformer}
<b>Worst Performer:</b> ${summary.worstPerformer}

<i>Generated at: ${new Date().toLocaleString('id-ID')}</i>
    `.trim();

    return await this.sendMessage(message);
  }
}

module.exports = TelegramNotifier;
