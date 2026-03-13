# Indodax Auto Trading Bot

Sistem auto trading untuk Indodax dengan notifikasi Telegram, chart analysis, dan fitur simulasi.

## 🚀 Fitur Utama

### 1. Auto Trading System
- **Trend Following Strategy**: Menggunakan EMA untuk menentukan tren H4
- **Buy Low, Sell High**: Entry di support (bullish) atau resistance (bearish)
- **Multi-Timeframe Analysis**: H4 untuk trend, H1/M15 untuk entry
- **Risk Management**: Stop Loss berbasis ATR, minimal Risk:Reward 1:2
- **Volume Confirmation**: Konfirmasi volume untuk validasi sinyal

### 2. Indikator Trading
- EMA (Exponential Moving Average) - Trend detection
- RSI (Relative Strength Index) - Overbought/Oversold
- Bollinger Bands - Volatility measurement
- ATR (Average True Range) - Stop Loss calculation
- Support & Resistance levels
- Volume analysis (Accumulation/Distribution)

### 3. Notifikasi Telegram
- Sinyal BUY/SELL real-time
- Eksekusi trade (auto buy/sell)
- Take Profit hit
- Stop Loss hit
- Update simulasi

### 4. Manajemen Modal
- **5 Koin Utama** (BTC, ETH, SOL, BNB, LINK): Rp 400.000 per koin
- **Koin Spesifik** (ICP): Rp 200.000
- **Saldo Cadangan**: Rp 100.000
- **Isolated Compounding**: Profit/loss per koin terisolasi

### 5. Fitur Simulasi
- Modal awal Rp 1.000.000 per koin
- Backtesting strategi
- Track win rate dan profit/loss
- Tidak menggunakan uang sungguhan

### 6. Web Dashboard
- Real-time monitoring
- Chart dengan indikator
- Manage coins
- View signals & trades
- Simulation results

## 📁 Struktur Folder

```
trading-bot/
├── backend/
│   ├── server.js           # Express server & API endpoints
│   ├── database.js         # SQLite database setup
│   ├── indodax.js          # Indodax API integration
│   ├── telegram.js         # Telegram bot notifications
│   ├── technicalAnalysis.js # Technical indicators
│   ├── tradingEngine.js    # Core trading logic
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── main.jsx        # React entry point
│   │   └── index.css       # Styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── database/
    └── trading.db          # SQLite database (auto-created)
```

## ⚙️ Instalasi

### 1. Clone Repository
```bash
cd trading-bot
```

### 2. Setup Backend
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan kredensial Anda
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

### 4. Environment Variables (.env)

```env
# Indodax API Configuration
INDODAX_API_KEY=your_api_key_here
INDODAX_SECRET_KEY=your_secret_key_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./database/trading.db

# Trading Configuration
DEFAULT_CAPITAL_PER_COIN=400000
ICP_CAPITAL=200000
RESERVE_CAPITAL=100000
MAX_RISK_PERCENT=2
MIN_RISK_REWARD_RATIO=2
```

## 🎯 Cara Mendapatkan API Keys

### Indodax API Keys
1. Login ke akun Indodax Anda
2. Buka Settings > API Keys
3. Create New API Key
4. Copy API Key dan Secret Key ke file .env

### Telegram Bot Token
1. Buka @BotFather di Telegram
2. Kirim /newbot
3. Ikuti instruksi untuk membuat bot
4. Copy token ke TELEGRAM_BOT_TOKEN
5. Dapatkan Chat ID dengan mengirim pesan ke bot Anda
6. Akses: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
7. Copy "id" dari chat ke TELEGRAM_CHAT_ID

## 🚀 Menjalankan Aplikasi

### Terminal 1 - Backend
```bash
cd backend
npm start
```

Backend akan berjalan di http://localhost:3000

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Frontend akan berjalan di http://localhost:5173

## 📊 Strategi Trading

### Bullish Market (H4 Trend = BULLISH)
1. Tunggu harga turun ke area Support (H1/M15)
2. Konfirmasi: RSI < 30 (oversold) atau volume increase
3. Entry: BUY saat ada rejection candle (hammer, bullish engulfing)
4. Stop Loss: Di bawah support (2x ATR)
5. Take Profit: Di resistance terdekat (Risk:Reward 1:2)

### Bearish Market (H4 Trend = BEARISH)
1. Tunggu harga naik ke area Resistance (H1/M15)
2. Konfirmasi: RSI > 70 (overbought) atau volume increase
3. Entry: SELL saat ada rejection candle (shooting star, bearish engulfing)
4. Stop Loss: Di atas resistance (2x ATR)
5. Take Profit: Di support terdekat (Risk:Reward 1:2)

### Volume Analysis
- **Accumulation**: Price up + Volume up = Bullish confirmed
- **Distribution**: Price down + Volume up = Bearish confirmed
- Hindari entry jika volume tidak konfirmasi price action

## 🔧 API Endpoints

### Coins
- `GET /api/coins` - Get all coins
- `POST /api/coins` - Add new coin
- `PUT /api/coins/:id/capital` - Update capital
- `DELETE /api/coins/:id` - Deactivate coin

### Trades
- `GET /api/trades` - Get trade history
- `GET /api/signals` - Get trading signals

### Simulation
- `GET /api/simulation` - Get all simulations
- `POST /api/simulation/:coinId` - Initialize simulation
- `GET /api/simulation/:coinId/history` - Get simulation history

### Account
- `GET /api/account/balance` - Get Indodax balance
- `GET /api/prices` - Get current prices
- `GET /api/status` - Get trading status

## ⚠️ Disclaimer

**PERINGATAN PENTING:**
- Trading cryptocurrency memiliki risiko tinggi
- Gunakan hanya modal yang Anda rela kehilangan
- Past performance tidak menjamin hasil masa depan
- Sistem ini adalah tool bantu, bukan jaminan profit
- Selalu lakukan riset sendiri (DYOR)
- Test dengan simulasi terlebih dahulu sebelum live trading

## 🛡️ Keamanan

- API keys disimpan di environment variables
- Database SQLite lokal
- Tidak ada data sensitif yang dikirim ke server eksternal selain Indodax
- Isolated capital management untuk membatasi risiko

## 📝 Roadmap

- [ ] WebSocket real-time price updates
- [ ] Advanced charting dengan TradingView library
- [ ] Backtesting engine
- [ ] Multiple strategy support
- [ ] Machine learning predictions
- [ ] Mobile responsive design
- [ ] Export trade history to CSV
- [ ] Email notifications

## 🤝 Support

Untuk pertanyaan atau issue, silakan buat issue di repository ini.

## 📄 License

MIT License - Feel free to use and modify.

---

**Happy Trading! 🚀📈**
