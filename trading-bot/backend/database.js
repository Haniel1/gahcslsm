import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../database/trading.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trading_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_capital REAL DEFAULT 2300000,
    capital_per_coin REAL DEFAULT 400000,
    icp_capital REAL DEFAULT 200000,
    reserve_capital REAL DEFAULT 100000,
    max_risk_percent REAL DEFAULT 2,
    min_risk_reward_ratio REAL DEFAULT 2,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS coins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT true,
    is_icp BOOLEAN DEFAULT false,
    allocated_capital REAL,
    current_capital REAL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coin_id INTEGER,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    amount REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    signal_type TEXT,
    tp_price REAL,
    sl_price REAL,
    executed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id)
  );

  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coin_id INTEGER,
    signal_type TEXT NOT NULL,
    price REAL NOT NULL,
    timeframe TEXT,
    trend_h4 TEXT,
    support_level REAL,
    resistance_level REAL,
    rsi_value REAL,
    volume_confirmed BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT false,
    FOREIGN KEY (coin_id) REFERENCES coins(id)
  );

  CREATE TABLE IF NOT EXISTS simulation_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coin_id INTEGER,
    initial_capital REAL DEFAULT 1000000,
    current_capital REAL DEFAULT 1000000,
    total_profit_loss REAL DEFAULT 0,
    trade_count INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    loss_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id)
  );

  CREATE TABLE IF NOT EXISTS simulation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    simulation_id INTEGER,
    type TEXT NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    amount REAL NOT NULL,
    profit_loss REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (simulation_id) REFERENCES simulation_trades(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    coin_symbol TEXT,
    sent BOOLEAN DEFAULT false,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default coins
  INSERT OR IGNORE INTO coins (symbol, name, is_active, is_icp, allocated_capital, current_capital) 
  VALUES 
    ('btc', 'Bitcoin', 1, 0, 400000, 400000),
    ('eth', 'Ethereum', 1, 0, 400000, 400000),
    ('sol', 'Solana', 1, 0, 400000, 400000),
    ('bnb', 'Binance Coin', 1, 0, 400000, 400000),
    ('link', 'Chainlink', 1, 0, 400000, 400000),
    ('icp', 'Internet Computer', 1, 1, 200000, 200000);
`);

export default db;
