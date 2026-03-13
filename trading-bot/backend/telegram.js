import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

class TelegramService {
  constructor() {
    this.bot = null;
    this.chatId = TELEGRAM_CHAT_ID;
    
    if (TELEGRAM_BOT_TOKEN) {
      this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
    }
  }

  async sendMessage(message, parseMode = 'HTML') {
    if (!this.bot || !this.chatId) {
      console.log('Telegram not configured:', message);
      return false;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: parseMode });
      console.log('Telegram notification sent');
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
      return false;
    }
  }

  async sendBuySignal(coinSymbol, price, tp, sl, reason) {
    const message = `
🟢 <b>BUY SIGNAL</b> 🟢

💰 Coin: <b>${coinSymbol.toUpperCase()}</b>
📊 Price: <b>Rp ${price.toLocaleString('id-ID')}</b>
🎯 TP: <b>Rp ${tp.toLocaleString('id-ID')}</b>
🛑 SL: <b>Rp ${sl.toLocaleString('id-ID')}</b>

📝 Reason: ${reason}

⚡ Auto Trading Bot
    `.trim();

    return this.sendMessage(message);
  }

  async sendSellSignal(coinSymbol, price, tp, sl, reason) {
    const message = `
🔴 <b>SELL SIGNAL</b> 🔴

💰 Coin: <b>${coinSymbol.toUpperCase()}</b>
📊 Price: <b>Rp ${price.toLocaleString('id-ID')}</b>
🎯 TP: <b>Rp ${tp.toLocaleString('id-ID')}</b>
🛑 SL: <b>Rp ${sl.toLocaleString('id-ID')}</b>

📝 Reason: ${reason}

⚡ Auto Trading Bot
    `.trim();

    return this.sendMessage(message);
  }

  async sendTradeExecuted(type, coinSymbol, price, amount, total) {
    const emoji = type === 'buy' ? '🟢' : '🔴';
    const message = `
${emoji} <b>TRADE EXECUTED</b> ${emoji}

${type.toUpperCase()} <b>${amount} ${coinSymbol.toUpperCase()}</b>
💵 Price: <b>Rp ${price.toLocaleString('id-ID')}</b>
💰 Total: <b>Rp ${total.toLocaleString('id-ID')}</b>

✅ Order successfully placed on Indodax

⚡ Auto Trading Bot
    `.trim();

    return this.sendMessage(message);
  }

  async sendTakeProfitHit(coinSymbol, entryPrice, exitPrice, profit) {
    const profitEmoji = profit >= 0 ? '✅' : '❌';
    const profitText = profit >= 0 ? `+Rp ${profit.toLocaleString('id-ID')}` : `-Rp ${Math.abs(profit).toLocaleString('id-ID')}`;
    
    const message = `
${profitEmoji} <b>TAKE PROFIT HIT</b> ${profitEmoji}

💰 Coin: <b>${coinSymbol.toUpperCase()}</b>
📥 Entry: <b>Rp ${entryPrice.toLocaleString('id-ID')}</b>
📤 Exit: <b>Rp ${exitPrice.toLocaleString('id-ID')}</b>
💹 P/L: <b>${profitText}</b>

⚡ Auto Trading Bot
    `.trim();

    return this.sendMessage(message);
  }

  async sendStopLossHit(coinSymbol, entryPrice, exitPrice, loss) {
    const message = `
🛑 <b>STOP LOSS HIT</b> 🛑

💰 Coin: <b>${coinSymbol.toUpperCase()}</b>
📥 Entry: <b>Rp ${entryPrice.toLocaleString('id-ID')}</b>
📤 Exit: <b>Rp ${exitPrice.toLocaleString('id-ID')}</b>
💹 Loss: <b>-Rp ${Math.abs(loss).toLocaleString('id-ID')}</b>

⚠️ Risk management executed

⚡ Auto Trading Bot
    `.trim();

    return this.sendMessage(message);
  }

  async sendSimulationResult(coinSymbol, initialCapital, currentCapital, profitLoss) {
    const profitEmoji = profitLoss >= 0 ? '✅' : '❌';
    const profitText = profitLoss >= 0 ? `+Rp ${profitLoss.toLocaleString('id-ID')}` : `-Rp ${Math.abs(profitLoss).toLocaleString('id-ID')}`;
    
    const message = `
📊 <b>SIMULATION UPDATE</b> 📊

💰 Coin: <b>${coinSymbol.toUpperCase()}</b>
💵 Initial: <b>Rp ${initialCapital.toLocaleString('id-ID')}</b>
💰 Current: <b>Rp ${currentCapital.toLocaleString('id-ID')}</b>
💹 P/L: <b>${profitText}</b>

⚡ Simulation Bot
    `.trim();

    return this.sendMessage(message);
  }

  async sendError(message) {
    const errorMsg = `
⚠️ <b>ERROR ALERT</b> ⚠️

${message}

⚡ Auto Trading Bot
    `.trim();

    return this.sendMessage(errorMsg);
  }
}

export default new TelegramService();
