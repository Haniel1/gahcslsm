import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Trading Dashboard Component
 * Main interface for monitoring and controlling the auto trading bot
 */
function App() {
  const [tradingState, setTradingState] = useState(null);
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState('btc');
  const [chartData, setChartData] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [newCoin, setNewCoin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch chart data when selected coin changes
  useEffect(() => {
    if (selectedCoin) {
      fetchChartData(selectedCoin);
      fetchIndicators(selectedCoin);
    }
  }, [selectedCoin]);

  const fetchData = async () => {
    try {
      const [stateRes, signalsRes, tradesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/state`),
        axios.get(`${API_BASE_URL}/api/signals?limit=20`),
        axios.get(`${API_BASE_URL}/api/trades?limit=50`)
      ]);

      setTradingState(stateRes.data);
      setSignals(signalsRes.data);
      setTrades(tradesRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data. Make sure the backend server is running.');
      setLoading(false);
    }
  };

  const fetchChartData = async (coin) => {
    try {
      const pair = `${coin}_idr`;
      const res = await axios.get(`${API_BASE_URL}/api/chart/${pair}?timeframe=1h&limit=100`);
      setChartData(res.data.candles);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const fetchIndicators = async (coin) => {
    try {
      const pair = `${coin}_idr`;
      const res = await axios.get(`${API_BASE_URL}/api/indicators/${pair}`);
      setIndicators(res.data);
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const toggleTrading = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/toggle-trading`);
      fetchData();
    } catch (err) {
      setError('Failed to toggle trading');
    }
  };

  const addCoin = async () => {
    if (!newCoin) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/add-coin`, { coin: newCoin });
      setNewCoin('');
      fetchData();
    } catch (err) {
      setError('Failed to add coin');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };

  if (loading) {
    return (
      <div className="App">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="App" style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 Auto Trading Bot</h1>
        <div style={styles.statusBar}>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: tradingState?.isActive ? '#4caf50' : '#f44336'
          }}>
            {tradingState?.isActive ? 'ACTIVE' : 'STOPPED'}
          </span>
          <span style={styles.modeBadge}>
            {tradingState?.isSimulation ? '🧪 SIMULATION' : '💰 LIVE'}
          </span>
          <span style={styles.lastUpdate}>
            Last update: {formatTime(tradingState?.lastUpdate)}
          </span>
        </div>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={styles.closeBtn}>×</button>
        </div>
      )}

      <div style={styles.controls}>
        <button 
          onClick={toggleTrading}
          style={{
            ...styles.controlBtn,
            backgroundColor: tradingState?.isActive ? '#f44336' : '#4caf50'
          }}
        >
          {tradingState?.isActive ? '⏹ Stop Trading' : '▶ Start Trading'}
        </button>
        
        <div style={styles.addCoinForm}>
          <input
            type="text"
            placeholder="Add new coin (e.g., DOT)"
            value={newCoin}
            onChange={(e) => setNewCoin(e.target.value)}
            style={styles.input}
          />
          <button onClick={addCoin} style={styles.addBtn}>Add Coin</button>
        </div>
      </div>

      <div style={styles.dashboard}>
        {/* Portfolio Overview */}
        <div style={styles.card}>
          <h2>💼 Portfolio Overview</h2>
          <div style={styles.grid}>
            {tradingState?.coinBalances && Object.entries(tradingState.coinBalances).map(([coin, data]) => (
              <div 
                key={coin}
                onClick={() => setSelectedCoin(coin)}
                style={{
                  ...styles.coinCard,
                  border: selectedCoin === coin ? '2px solid #2196f3' : '1px solid #ddd',
                  cursor: 'pointer'
                }}
              >
                <h3>{coin.toUpperCase()}</h3>
                <p>Balance: {formatCurrency(data.currentBalance)}</p>
                <p>P&L: <span style={{ color: data.pnl >= 0 ? '#4caf50' : '#f44336' }}>
                  {formatCurrency(data.pnl)}
                </span></p>
                {data.position && (
                  <div style={styles.positionBadge}>
                    {data.position.type} @ {formatCurrency(data.position.entryPrice)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chart & Indicators */}
        <div style={styles.card}>
          <h2>📊 {selectedCoin?.toUpperCase()}/IDR Analysis</h2>
          {indicators ? (
            <div style={styles.indicatorsGrid}>
              <div style={styles.indicatorBox}>
                <strong>H4 Trend:</strong>
                <span style={{
                  color: indicators.h4Trend === 'BULLISH' ? '#4caf50' : 
                         indicators.h4Trend === 'BEARISH' ? '#f44336' : '#ff9800'
                }}>
                  {indicators.h4Trend}
                </span>
              </div>
              <div style={styles.indicatorBox}>
                <strong>RSI:</strong> {indicators.indicators.rsi?.toFixed(2) || 'N/A'}
              </div>
              <div style={styles.indicatorBox}>
                <strong>ATR:</strong> {indicators.indicators.atr?.toFixed(2) || 'N/A'}
              </div>
              <div style={styles.indicatorBox}>
                <strong>Support:</strong> {formatCurrency(indicators.indicators.support)}
              </div>
              <div style={styles.indicatorBox}>
                <strong>Resistance:</strong> {formatCurrency(indicators.indicators.resistance)}
              </div>
              <div style={styles.indicatorBox}>
                <strong>Volume:</strong> {indicators.indicators.volume.signal}
              </div>
              <div style={styles.indicatorBox}>
                <strong>Current Price:</strong> {formatCurrency(indicators.currentPrice)}
              </div>
            </div>
          ) : (
            <p>Loading indicators...</p>
          )}
          
          <div style={styles.chartPlaceholder}>
            <p>📈 Chart visualization would be displayed here</p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Candlestick data: {chartData.length} candles loaded
            </p>
          </div>
        </div>

        {/* Recent Signals */}
        <div style={styles.card}>
          <h2>🔔 Recent Signals</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Pair</th>
                  <th>Action</th>
                  <th>Confidence</th>
                  <th>H4 Trend</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 10).map((sig, idx) => (
                  <tr key={idx} style={{
                    backgroundColor: sig.signal.action === 'BUY' ? 'rgba(76, 175, 80, 0.1)' :
                                   sig.signal.action === 'SELL' ? 'rgba(244, 67, 54, 0.1)' : 'transparent'
                  }}>
                    <td>{formatTime(sig.timestamp)}</td>
                    <td>{sig.pair.toUpperCase()}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: sig.signal.action === 'BUY' ? '#4caf50' :
                                       sig.signal.action === 'SELL' ? '#f44336' : '#9e9e9e',
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        {sig.signal.action}
                      </span>
                    </td>
                    <td>{(sig.signal.confidence * 100).toFixed(1)}%</td>
                    <td>{sig.h4Trend}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sig.signal.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Trades */}
        <div style={styles.card}>
          <h2>📜 Recent Trades</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Pair</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(-10).reverse().map((trade, idx) => (
                  <tr key={idx}>
                    <td>{formatTime(trade.timestamp)}</td>
                    <td>{trade.pair.toUpperCase()}</td>
                    <td>
                      <span style={{
                        color: trade.type === 'buy' ? '#4caf50' : '#f44336',
                        fontWeight: 'bold'
                      }}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td>{formatCurrency(trade.price)}</td>
                    <td>{trade.amount.toFixed(6)}</td>
                    <td>{trade.isSimulation ? '🧪 Sim' : '💰 Live'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer style={styles.footer}>
        <p>Auto Trading Bot v1.0 | Strategy: Trend Following + Volume Analysis</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Backend: Node.js + Express | Frontend: React | Exchange: Indodax
        </p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    padding: '20px'
  },
  header: {
    backgroundColor: '#1976d2',
    color: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '28px'
  },
  statusBar: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  modeBadge: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: '14px'
  },
  lastUpdate: {
    fontSize: '12px',
    opacity: 0.8,
    marginLeft: 'auto'
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#c62828'
  },
  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  controlBtn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer'
  },
  addCoinForm: {
    display: 'flex',
    gap: '10px'
  },
  input: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    width: '200px'
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  dashboard: {
    display: 'grid',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  },
  coinCard: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  positionBadge: {
    marginTop: '8px',
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#1976d2'
  },
  indicatorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '20px'
  },
  indicatorBox: {
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '14px'
  },
  chartPlaceholder: {
    backgroundColor: '#f9f9f9',
    padding: '40px',
    textAlign: 'center',
    borderRadius: '8px',
    border: '2px dashed #ddd'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  footer: {
    marginTop: '40px',
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    borderTop: '1px solid #ddd'
  }
};

export default App;
