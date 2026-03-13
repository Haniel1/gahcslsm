import express from 'express';
import cors from 'cors';
import db from './database.js';
import tradingEngine from './tradingEngine.js';
import indodax from './indodax.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Start trading engine on server start
tradingEngine.start();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trading bot is running' });
});

// Get all coins
app.get('/api/coins', (req, res) => {
  try {
    const coins = db.prepare('SELECT * FROM coins').all();
    res.json({ success: true, data: coins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new coin
app.post('/api/coins', (req, res) => {
  try {
    const { symbol, name, allocated_capital } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO coins (symbol, name, allocated_capital, current_capital)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(symbol.toLowerCase(), name, allocated_capital, allocated_capital);
    
    res.json({ 
      success: true, 
      message: 'Coin added successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update coin capital
app.put('/api/coins/:id/capital', (req, res) => {
  try {
    const { current_capital } = req.body;
    const { id } = req.params;
    
    db.prepare('UPDATE coins SET current_capital = ? WHERE id = ?').run(current_capital, id);
    
    res.json({ success: true, message: 'Capital updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deactivate coin
app.delete('/api/coins/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.prepare('UPDATE coins SET is_active = 0 WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Coin deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active trades
app.get('/api/trades', (req, res) => {
  try {
    const trades = db.prepare(`
      SELECT t.*, c.symbol, c.name
      FROM trades t
      JOIN coins c ON t.coin_id = c.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `).all();
    
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get signals
app.get('/api/signals', (req, res) => {
  try {
    const signals = db.prepare(`
      SELECT s.*, c.symbol, c.name
      FROM signals s
      JOIN coins c ON s.coin_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all();
    
    res.json({ success: true, data: signals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get account info from Indodax
app.get('/api/account/balance', async (req, res) => {
  try {
    const balances = await indodax.getBalances();
    res.json({ success: true, data: balances });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current prices
app.get('/api/prices', async (req, res) => {
  try {
    const coins = db.prepare('SELECT symbol FROM coins WHERE is_active = 1').all();
    const prices = {};
    
    for (const coin of coins) {
      try {
        const pair = `${coin.symbol}idr`;
        const ticker = await indodax.getTicker(pair);
        prices[coin.symbol] = parseFloat(ticker.last);
      } catch (e) {
        prices[coin.symbol] = null;
      }
    }
    
    res.json({ success: true, data: prices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simulation endpoints
app.get('/api/simulation', (req, res) => {
  try {
    const simulations = db.prepare(`
      SELECT st.*, c.symbol, c.name
      FROM simulation_trades st
      JOIN coins c ON st.coin_id = c.id
    `).all();
    
    res.json({ success: true, data: simulations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize simulation for a coin
app.post('/api/simulation/:coinId', (req, res) => {
  try {
    const { coinId } = req.params;
    const { initial_capital = 1000000 } = req.body;
    
    // Check if simulation already exists
    const existing = db.prepare('SELECT * FROM simulation_trades WHERE coin_id = ?').get(coinId);
    
    if (existing) {
      return res.json({ success: true, message: 'Simulation already exists', data: existing });
    }
    
    const stmt = db.prepare(`
      INSERT INTO simulation_trades (coin_id, initial_capital, current_capital)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(coinId, initial_capital, initial_capital);
    const simulation = db.prepare('SELECT * FROM simulation_trades WHERE id = ?').get(result.lastInsertRowid);
    
    res.json({ success: true, message: 'Simulation initialized', data: simulation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get simulation history
app.get('/api/simulation/:coinId/history', (req, res) => {
  try {
    const { coinId } = req.params;
    
    const history = db.prepare(`
      SELECT * FROM simulation_history
      WHERE simulation_id = (SELECT id FROM simulation_trades WHERE coin_id = ?)
      ORDER BY opened_at DESC
      LIMIT 50
    `).all(coinId);
    
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?
    `).run(key, value, value);
    
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trading status
app.get('/api/status', (req, res) => {
  try {
    const coins = db.prepare('SELECT * FROM coins WHERE is_active = 1').all();
    const activeTradesCount = db.prepare("SELECT COUNT(*) as count FROM trades WHERE status = 'active'").get().count;
    const signalsToday = db.prepare(`
      SELECT COUNT(*) as count FROM signals 
      WHERE DATE(created_at) = DATE('now')
    `).get().count;
    
    res.json({
      success: true,
      data: {
        isRunning: tradingEngine.isRunning,
        activeCoins: coins.length,
        activeTrades: activeTradesCount,
        signalsToday: signalsToday
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Trading bot server running on port ${PORT}`);
  console.log(`📊 Auto trading engine started`);
});

export default app;
