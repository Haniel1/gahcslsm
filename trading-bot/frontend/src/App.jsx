import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = '/api';

function App() {
  const [status, setStatus] = useState(null);
  const [coins, setCoins] = useState([]);
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddCoin, setShowAddCoin] = useState(false);
  const [newCoin, setNewCoin] = useState({ symbol: '', name: '', allocated_capital: 400000 });
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, coinsRes, tradesRes, signalsRes, simulationsRes] = await Promise.all([
        axios.get(`${API_URL}/status`),
        axios.get(`${API_URL}/coins`),
        axios.get(`${API_URL}/trades`),
        axios.get(`${API_URL}/signals`),
        axios.get(`${API_URL}/simulation`)
      ]);

      setStatus(statusRes.data.data);
      setCoins(coinsRes.data.data);
      setTrades(tradesRes.data.data);
      setSignals(signalsRes.data.data);
      setSimulations(simulationsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddCoin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/coins`, newCoin);
      showNotification('Coin added successfully!');
      setShowAddCoin(false);
      setNewCoin({ symbol: '', name: '', allocated_capital: 400000 });
      fetchData();
    } catch (error) {
      showNotification('Error adding coin', 'error');
    }
  };

  const handleInitializeSimulation = async (coinId) => {
    try {
      await axios.post(`${API_URL}/simulation/${coinId}`, { initial_capital: 1000000 });
      showNotification('Simulation initialized with Rp 1,000,000');
      fetchData();
    } catch (error) {
      showNotification('Error initializing simulation', 'error');
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!status) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header className="header">
        <h1>🚀 Indodax Auto Trading Bot</h1>
        <span className={`status-badge ${status.isRunning ? 'status-running' : 'status-stopped'}`}>
          {status.isRunning ? '● Running' : '○ Stopped'}
        </span>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'coins' ? 'active' : ''}`}
          onClick={() => setActiveTab('coins')}
        >
          Coins
        </button>
        <button 
          className={`tab ${activeTab === 'trades' ? 'active' : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          Trades
        </button>
        <button 
          className={`tab ${activeTab === 'signals' ? 'active' : ''}`}
          onClick={() => setActiveTab('signals')}
        >
          Signals
        </button>
        <button 
          className={`tab ${activeTab === 'simulation' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulation')}
        >
          Simulation
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard">
          <div className="card">
            <h2>📊 Trading Status</h2>
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className="stat-value">{status.isRunning ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Coins</span>
              <span className="stat-value">{status.activeCoins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Trades</span>
              <span className="stat-value">{status.activeTrades}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Signals Today</span>
              <span className="stat-value">{status.signalsToday}</span>
            </div>
          </div>

          <div className="card">
            <h2>💰 Portfolio Allocation</h2>
            {coins.map(coin => (
              <div key={coin.id} className="stat-item">
                <span className="stat-label">{coin.symbol.toUpperCase()}</span>
                <span className="stat-value">{formatRupiah(coin.current_capital)}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>🔔 Recent Signals</h2>
            <div className="trade-list">
              {signals.slice(0, 5).map(signal => (
                <div key={signal.id} className="trade-item">
                  <span className={`signal-badge signal-${signal.signal_type.toLowerCase()}`}>
                    {signal.signal_type}
                  </span>
                  <strong>{signal.symbol.toUpperCase()}</strong>
                  <p>{formatRupiah(signal.price)}</p>
                  <small>{new Date(signal.created_at).toLocaleString('id-ID')}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coins' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>💎 Active Coins</h2>
            <button className="btn btn-primary" onClick={() => setShowAddCoin(true)}>
              + Add Coin
            </button>
          </div>
          
          <ul className="coin-list">
            {coins.map(coin => (
              <li key={coin.id} className="coin-item">
                <div className="coin-info">
                  <h3>{coin.symbol.toUpperCase()} - {coin.name}</h3>
                  <p>Allocated: {formatRupiah(coin.allocated_capital)}</p>
                  <p>Current: {formatRupiah(coin.current_capital)}</p>
                  <p>
                    P/L: 
                    <span style={{ color: coin.current_capital >= coin.allocated_capital ? '#28a745' : '#dc3545' }}>
                      {' '}
                      {formatRupiah(coin.current_capital - coin.allocated_capital)}
                    </span>
                  </p>
                </div>
                <div className="coin-actions">
                  {!simulations.find(s => s.coin_id === coin.id) && (
                    <button 
                      className="btn btn-success"
                      onClick={() => handleInitializeSimulation(coin.id)}
                    >
                      Start Simulation
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="card">
          <h2>📈 Trade History</h2>
          <div className="trade-list">
            {trades.map(trade => (
              <div key={trade.id} className={`trade-item ${trade.type}`}>
                <span className={`signal-badge signal-${trade.type}`}>{trade.type.toUpperCase()}</span>
                <strong>{trade.symbol.toUpperCase()}</strong>
                <p>Price: {formatRupiah(trade.price)}</p>
                <p>Amount: {trade.amount}</p>
                <p>Total: {formatRupiah(trade.total)}</p>
                <p>Status: {trade.status}</p>
                <small>{new Date(trade.created_at).toLocaleString('id-ID')}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="card">
          <h2>📡 Trading Signals</h2>
          <div className="trade-list">
            {signals.map(signal => (
              <div key={signal.id} className="trade-item">
                <span className={`signal-badge signal-${signal.signal_type.toLowerCase()}`}>
                  {signal.signal_type}
                </span>
                <strong>{signal.symbol.toUpperCase()}</strong>
                <p>Price: {formatRupiah(signal.price)}</p>
                <p>Timeframe: {signal.timeframe}</p>
                <p>Trend H4: {signal.trend_h4}</p>
                <p>RSI: {signal.rsi_value?.toFixed(2)}</p>
                <p>Volume Confirmed: {signal.volume_confirmed ? 'Yes' : 'No'}</p>
                <p>Reason: {signal.signal_type === 'BUY' ? 'Support bounce' : 'Resistance rejection'}</p>
                <small>{new Date(signal.created_at).toLocaleString('id-ID')}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="card">
          <h2>🧪 Simulation Results</h2>
          {simulations.length === 0 ? (
            <p>No simulations running. Initialize a simulation from the Coins tab.</p>
          ) : (
            <div className="dashboard">
              {simulations.map(sim => (
                <div key={sim.id} className="card">
                  <h3>{sim.symbol.toUpperCase()}</h3>
                  <div className="stat-item">
                    <span className="stat-label">Initial Capital</span>
                    <span className="stat-value">{formatRupiah(sim.initial_capital)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Current Capital</span>
                    <span className="stat-value">{formatRupiah(sim.current_capital)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Profit/Loss</span>
                    <span className="stat-value" style={{ color: sim.total_profit_loss >= 0 ? '#28a745' : '#dc3545' }}>
                      {formatRupiah(sim.total_profit_loss)}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">
                      {sim.trade_count > 0 ? ((sim.win_count / sim.trade_count) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Trades</span>
                    <span className="stat-value">{sim.trade_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddCoin && (
        <div className="modal-overlay" onClick={() => setShowAddCoin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Coin</h2>
            <form onSubmit={handleAddCoin}>
              <div className="form-group">
                <label>Symbol</label>
                <input
                  type="text"
                  value={newCoin.symbol}
                  onChange={(e) => setNewCoin({...newCoin, symbol: e.target.value})}
                  placeholder="e.g., btc"
                  required
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newCoin.name}
                  onChange={(e) => setNewCoin({...newCoin, name: e.target.value})}
                  placeholder="e.g., Bitcoin"
                  required
                />
              </div>
              <div className="form-group">
                <label>Allocated Capital (IDR)</label>
                <input
                  type="number"
                  value={newCoin.allocated_capital}
                  onChange={(e) => setNewCoin({...newCoin, allocated_capital: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-danger" onClick={() => setShowAddCoin(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Coin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
