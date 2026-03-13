# Auto Trading Bot - Indodax

Sistem auto trading untuk Indodax dengan fitur chart, indikator teknikal, notifikasi Telegram, dan simulasi trading.

## 🚀 Fitur Utama

### 1. **Auto Trading System**
- Terhubung langsung ke akun Indodax Anda
- Berjalan di backend (Node.js + Express)
- Tetap berjalan 24/7 meskipun Anda keluar dari web
- Mode LIVE dan SIMULATION

### 2. **Strategi Trading**
- **Trend Following** dengan filter multi-timeframe (H4 untuk trend, M15 untuk entry)
- **Buy Low, Sell High** berdasarkan Support & Resistance
- **Volume Analysis** untuk konfirmasi price action
- Indikator: EMA, RSI, ATR, Bollinger Bands

### 3. **Manajemen Modal**
- Alokasi terpisah per koin (silo system)
- 5 Koin Utama (BTC, ETH, SOL, BNB, LINK): Rp400.000/koin
- 1 Koin Spesifik (ICP): Rp200.000
- Saldo Cadangan: Rp100.000
- Profit/loss per koin tidak mempengaruhi koin lain

### 4. **Notifikasi Telegram**
- Sinyal jual/beli real-time
- Notifikasi saat order dieksekusi
- Laporan profit/loss saat posisi ditutup
- Status update bot

### 5. **Simulasi Trading**
- Setiap koin mendapat modal awal Rp1.000.000
- Bisa menambahkan koin baru sesuai keinginan
- Sama seperti auto trading tapi tanpa uang sungguhan

### 6. **Dashboard Web**
- Monitoring portfolio real-time
- Chart dengan indikator teknikal
- Riwayat sinyal dan trades
- Kontrol start/stop trading

## 📁 Struktur Project

```
/workspace
├── backend/                 # Backend server (Node.js)
│   ├── server.js           # Main server & API endpoints
│   ├── indodax.js          # Indodax API client
│   ├── trading-strategy.js # Technical analysis & strategy
│   ├── telegram.js         # Telegram notification service
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variables template
├── src/                    # Frontend (React)
│   ├── App.js             # Main dashboard component
│   └── ...
├── package.json           # Frontend dependencies
└── README.md              # This file
```

## ⚙️ Konfigurasi

### 1. Setup Backend

```bash
cd /workspace/backend
npm install
cp .env.example .env
```

Edit file `.env` dengan kredensial Anda:

```env
# Indodax API Configuration
INDODAX_API_KEY=your_indodax_api_key_here
INDODAX_SECRET_KEY=your_indodax_secret_key_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Trading Configuration
INITIAL_CAPITAL_PER_COIN=1000000
TOTAL_INITIAL_CAPITAL=2300000
ENABLE_AUTO_TRADING=false
ENABLE_SIMULATION=true

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 2. Jalankan Backend

```bash
cd /workspace/backend
npm start
```

Backend akan berjalan di `http://localhost:3001`

### 3. Setup Frontend

```bash
cd /workspace
npm install
```

### 4. Jalankan Frontend

```bash
npm start
```

Frontend akan berjalan di `http://localhost:3000`

## 🌐 Deployment

### Frontend (Vercel)

1. Push code ke GitHub
2. Connect repository ke Vercel
3. Set environment variable: `REACT_APP_API_URL` = URL backend Anda

### Backend (Railway/Heroku/VPS)

**PENTING**: Backend harus dideploy di layanan yang mendukung proses berkelanjutan (bukan Vercel):

- **Railway.app** (recommended)
- **Heroku**
- **VPS** (DigitalOcean, Linode, dll)
- **Google Cloud Run**

Set environment variables yang sama seperti di `.env`

## 📊 Logika Trading

### Trend Identification (H4 Timeframe)
- **BULLISH**: Price > EMA 200 + buffer
- **BEARISH**: Price < EMA 200 - buffer
- **SIDEWAYS**: Price sekitar EMA 200

### Entry Conditions (M15 Timeframe)

#### Bullish Setup (BUY):
1. H4 trend = BULLISH
2. Price menyentuh support level
3. Rejection candle (hammer/engulfing)
4. RSI < 40 (oversold)
5. Volume confirmation (volume naik)
6. Risk/Reward ratio minimal 1:2

#### Bearish Setup (SELL):
1. H4 trend = BEARISH
2. Price menyentuh resistance level
3. Rejection candle (shooting star/engulfing)
4. RSI > 60 (overbought)
5. Volume confirmation (volume naik)
6. Risk/Reward ratio minimal 1:2

### Stop Loss & Take Profit
- **SL**: Entry ± (2 × ATR)
- **TP**: Entry ± (2 × risk) untuk minimal 1:2 RR

### Volume Analysis
- **Bullish Confirmed**: Price ↑ + Volume ↑
- **Bearish Confirmed**: Price ↓ + Volume ↑
- **Divergence**: Price bergerak tapi volume turun (warning!)

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/state` | Get current trading state |
| GET | `/api/signals` | Get recent trading signals |
| GET | `/api/trades` | Get trade history |
| POST | `/api/toggle-trading` | Start/stop auto trading |
| POST | `/api/add-coin` | Add new coin to monitoring |
| GET | `/api/chart/:pair` | Get candlestick data |
| GET | `/api/indicators/:pair` | Get technical indicators |
| GET | `/api/health` | Health check |

## ⚠️ Disclaimer

Trading cryptocurrency memiliki risiko tinggi. Gunakan sistem ini dengan bijak:
- Mulai dengan mode SIMULATION terlebih dahulu
- Jangan invest lebih dari yang Anda mampu kehilangan
- Past performance tidak menjamin hasil masa depan
- Sistem ini disediakan "AS IS" tanpa jaminan profit

## 📝 License

MIT License - feel free to use and modify!

## 🤝 Support

Untuk pertanyaan atau issue, silakan buat issue di GitHub repository.

---

**Happy Trading! 🚀📈**
