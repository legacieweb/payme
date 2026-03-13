import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoginModal from './LoginModal';

const MasterAdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [settings, setSettings] = useState({
    status: 'pending',
    withdrawalAccount: '',
    conversionRate: 127,
    withdrawalFee: 0.053
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('settings');
  const [payments, setPayments] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const masterLoggedIn = sessionStorage.getItem('masterAdminLoggedIn') === 'true';
    if (masterLoggedIn) {
      setIsLoggedIn(true);
      fetchSettings();
      fetchPayments();
    } else {
      setShowLoginModal(true);
    }
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/admin/payments`);
      if (response.data.success) {
        setPayments(response.data.payments);
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    fetchSettings();
    fetchPayments();
  };

  // Base API URL
  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/admin/withdrawal-settings`);
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch settings');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(`${baseUrl}/api/admin/withdrawal-settings`, settings);
      if (response.data.success) {
        setSuccess('Settings updated successfully!');
        setSettings(response.data.settings);
      }
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async (paymentId, newStatus) => {
    setUpdatingId(paymentId);
    try {
      const response = await axios.put(`${baseUrl}/api/admin/payments/${paymentId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        setPayments(prev => prev.map(p => 
          p._id === paymentId ? { ...p, status: newStatus } : p
        ));
      }
    } catch (err) {
      console.error('Update status error:', err);
      alert('Failed to update transaction status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-page" style={{ minHeight: '80vh', background: 'var(--bg)' }}>
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => navigate('/')} 
          onLogin={handleLoginSuccess}
        />
      </div>
    );
  }

  const totalVolume = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Volume that hasn't been paid out yet
  const pendingVolume = payments
    .filter(p => p.status !== 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingKESLiability = pendingVolume * settings.conversionRate * (1 - settings.withdrawalFee);

  return (
    <div className="dashboard-layout sidebar-less">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="logo-icon master">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="logo-text">PayLang Master</span>
          </div>
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">Master Admin</span>
              <span className="user-email">master@paylang.com</span>
            </div>
            <div className="user-avatar master">M</div>
            <button className="logout-nav-btn" onClick={() => {
              sessionStorage.removeItem('masterAdminLoggedIn');
              setIsLoggedIn(false);
            }} title="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="master-summary-grid">
            <div className="summary-card main-stat">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22m5-18H8.5a4.5 4.5 0 0 0 0 9h7a4.5 4.5 0 0 1 0 9H7"/></svg>
              </div>
              <div className="stat-content">
                <span className="stat-label">Pending USD Volume</span>
                <span className="stat-value">${pendingVolume.toLocaleString()}</span>
              </div>
              <div className="stat-visual">
                <div className="mini-chart"></div>
              </div>
            </div>
            <div className="summary-card withdrawal-stat">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h.01M11 15h.01"/></svg>
              </div>
              <div className="stat-content">
                <span className="stat-label">Pending KES Liability</span>
                <span className="stat-value success">KES {Math.round(pendingKESLiability).toLocaleString()}</span>
              </div>
              <div className="stat-badge">To be Processed</div>
            </div>
          </div>

          <div className="dashboard-tabs">
            <button 
              className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21a9 9 0 110-18 9 9 0 010 18zm0-15v10m-4-4h8"/></svg>
              <span>System Settings</span>
            </button>
            <button 
              className={`tab-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <span>Global Transactions</span>
            </button>
          </div>

          <div className="tab-content-wrapper">
            {activeTab === 'settings' && (
              <div className="fade-in">
                <div className="content-header">
                  <div>
                    <h1 className="gradient-text">System Configuration</h1>
                    <p>Global control for platform economics and status.</p>
                  </div>
                </div>

                <div className="settings-layout-grid">
                  <div className="grid-card settings-card premium">
                    <div className="card-header">
                      <h3>Withdrawal Management</h3>
                      <span className="premium-label">MASTER CONTROL</span>
                    </div>
                    
                    <form onSubmit={handleUpdate} className="modern-form">
                      <div className="form-grid">
                        <div className="form-group full-width">
                          <label>Current Withdrawal Status</label>
                          <div className="status-selector-modern">
                            {['pending', 'processing', 'completed', 'failed'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                className={`status-chip ${status} ${settings.status === status ? 'selected' : ''}`}
                                onClick={() => setSettings({ ...settings, status })}
                              >
                                <span className={`status-dot ${status}`}></span>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Global Withdrawal Wallet/Account</label>
                          <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h.01M11 15h.01"/></svg>
                            <input
                              type="text"
                              value={settings.withdrawalAccount}
                              onChange={(e) => setSettings({ ...settings, withdrawalAccount: e.target.value })}
                              placeholder="e.g. MPESA 07XXXXXXXX"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Exchange Rate (USD to KSH)</label>
                          <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22m5-18H8.5a4.5 4.5 0 0 0 0 9h7a4.5 4.5 0 0 1 0 9H7"/></svg>
                            <input
                              type="number"
                              value={settings.conversionRate}
                              onChange={(e) => setSettings({ ...settings, conversionRate: parseFloat(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Platform Withdrawal Fee</label>
                          <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>
                            <input
                              type="number"
                              step="0.001"
                              value={settings.withdrawalFee}
                              onChange={(e) => setSettings({ ...settings, withdrawalFee: parseFloat(e.target.value) })}
                            />
                          </div>
                          <span className="input-hint">Default 0.053 (5.3%)</span>
                        </div>
                      </div>

                      {error && <div className="error-badge">{error}</div>}
                      {success && <div className="success-badge">{success}</div>}

                      <div className="form-actions">
                        <button type="submit" className="primary-btn wide master-save" disabled={loading}>
                          {loading ? (
                            <><span className="spinner"></span> Updating System...</>
                          ) : (
                            'Save & Propagate Changes'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="settings-info-column">
                    <div className="info-card glass">
                      <div className="info-icon purple">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <div className="info-text">
                        <h4>Global Sync</h4>
                        <p>Changes made here are reflected instantly across all merchant dashboards for consistent reporting.</p>
                      </div>
                    </div>
                    <div className="info-card glass">
                      <div className="info-icon green">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>
                      </div>
                      <div className="info-text">
                        <h4>Exchange Rates</h4>
                        <p>Used to calculate the KES payout based on global USD holdings. Update during market volatility.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="fade-in">
                <div className="content-header">
                  <div>
                    <h1 className="gradient-text">Master Transaction Ledger</h1>
                    <p>Auditing every payment processed on the PayLang network.</p>
                  </div>
                  <div className="ledger-stats">
                    <div className="stat-pill">
                      <span className="pill-label">Total Volume:</span>
                      <span className="pill-value">${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid-card table-section premium">
                  <div className="card-header">
                    <h3>Live Network Traffic</h3>
                    <div className="live-indicator">
                      <span className="ping-dot"></span>
                      LIVE
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Recipient/Customer</th>
                          <th>USD Volume</th>
                          <th>KES Equiv.</th>
                          <th>Network Reference</th>
                          <th>State</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p._id} className={p.status === 'completed' ? 'completed-row' : ''}>
                            <td>{new Date(p.createdAt).toLocaleString()}</td>
                            <td>
                              <div className="customer-cell">
                                <span className="name">{p.name}</span>
                                <span className="email">{p.email}</span>
                              </div>
                            </td>
                            <td className="font-bold text-gradient">${p.amount.toLocaleString()}</td>
                            <td className="kes-value">
                              KES {Math.round(p.amount * settings.conversionRate * (1 - settings.withdrawalFee)).toLocaleString()}
                            </td>
                            <td className="font-mono text-small opacity-50">{p.reference}</td>
                            <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                            <td>
                              <select 
                                className={`status-mini-select ${updatingId === p._id ? 'loading' : ''}`}
                                value={p.status}
                                onChange={(e) => updateTransactionStatus(p._id, e.target.value)}
                                disabled={updatingId === p._id}
                              >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MasterAdminDashboard;
