import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import PaymentForm from './PaymentForm';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PayerDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'transactions', 'refunds', 'settings'
  
  // Settings state
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [securityData, setSecurityData] = useState({ question: '', answer: '' });
  const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });

  // Refund state
  const [refundForm, setRefundForm] = useState({ reference: '', reason: '' });
  const [refundMessage, setRefundMessage] = useState({ type: '', text: '' });
  const [refundLoading, setRefundLoading] = useState(false);

  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  useEffect(() => {
    const data = localStorage.getItem('payerData');
    const loggedIn = localStorage.getItem('payerLoggedIn') === 'true';
    if (!loggedIn || !data) {
      navigate('/');
    } else {
      const parsedData = JSON.parse(data);
      setUserData(parsedData);
      setProfileData({ name: parsedData.name, email: parsedData.email });
      setSecurityData({ question: parsedData.securityQuestion || '', answer: '' });
    }
  }, [navigate]);

  useEffect(() => {
    if (userData) {
      fetchDashboardData();
    }
  }, [userData]);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/payer/dashboard/${userData.email}`);
      if (res.data.success) {
        setPayments(res.data.payments);
        setRefunds(res.data.refunds);
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsMessage({ type: 'loading', text: 'Updating profile...' });
    try {
      const res = await axios.put(`${baseUrl}/api/payer/update-profile`, {
        email: userData.email,
        name: profileData.name,
        securityQuestion: securityData.question,
        securityAnswer: securityData.answer
      });
      if (res.data.success) {
        setSettingsMessage({ type: 'success', text: 'Profile updated successfully!' });
        const updatedUser = { ...userData, name: profileData.name, securityQuestion: securityData.question };
        setUserData(updatedUser);
        localStorage.setItem('payerData', JSON.stringify(updatedUser));
      } else {
        setSettingsMessage({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setSettingsMessage({ type: 'error', text: 'Failed to update profile' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setSettingsMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setSettingsMessage({ type: 'loading', text: 'Changing password...' });
    try {
      const res = await axios.post(`${baseUrl}/api/auth/change-password`, {
        email: userData.email,
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      if (res.data.success) {
        setSettingsMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        setSettingsMessage({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setSettingsMessage({ type: 'error', text: 'Failed to change password' });
    }
  };

  const handleRefundRequest = async (e) => {
    e.preventDefault();
    setRefundLoading(true);
    setRefundMessage({ type: 'loading', text: 'Submitting refund request...' });
    try {
      const res = await axios.post(`${baseUrl}/api/refunds`, {
        paymentId: selectedPayment._id,
        paymentReference: selectedPayment.reference,
        customerName: userData.name,
        customerEmail: userData.email,
        amount: selectedPayment.amount,
        currency: selectedPayment.currency,
        reason: refundForm.reason
      });
      if (res.data.success) {
        setRefundMessage({ type: 'success', text: 'Refund request submitted!' });
        setRefundForm({ reference: '', reason: '' });
        fetchDashboardData();
        setTimeout(() => {
          setShowRefundModal(false);
          setRefundMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setRefundMessage({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setRefundMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit refund request' });
    } finally {
      setRefundLoading(false);
    }
  };

  const chartData = {
    labels: analytics.map(a => `${a._id.month}/${a._id.day}`).reverse(),
    datasets: [
      {
        type: 'line',
        label: 'Spending (Line)',
        data: analytics.map(a => a.total).reverse(),
        borderColor: '#10b981',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      },
      {
        type: 'bar',
        label: 'Spending (Bar)',
        data: analytics.map(a => a.total).reverse(),
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#ffffff' }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        ticks: { color: '#a0a0a0' },
        grid: { color: '#262626' }
      },
      y: {
        ticks: { color: '#a0a0a0' },
        grid: { color: '#262626' }
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('payerLoggedIn');
    localStorage.removeItem('payerData');
    navigate('/');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  if (loading) return <div className="preloader-overlay"><div className="preloader"></div></div>;

  return (
    <div className="dashboard-layout sidebar-less">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="logo-text">PayLang</span>
          </div>
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{userData?.name}</span>
              <span className="user-email">{userData?.email}</span>
            </div>
            <div className="user-avatar">
              {userData?.name?.charAt(0)}
            </div>
            <button className="logout-nav-btn" onClick={logout} title="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-tabs">
            <button 
              className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Overview
            </button>
            <button 
              className={`tab-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => handleTabChange('transactions')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Transactions
            </button>
            <button 
              className={`tab-item ${activeTab === 'refunds' ? 'active' : ''}`}
              onClick={() => handleTabChange('refunds')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 9.58V19a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.42"/><path d="M12 13V7l8 8-8 8v-6H4"/></svg>
              Refunds
            </button>
            <button 
              className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="content-header">
                <div>
                  <h1>Dashboard Overview</h1>
                  <p>Welcome back! Here's what's happening with your account.</p>
                </div>
                <button className="primary-btn" onClick={() => setShowPaymentModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Make a Payment
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon spending">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Total Spent</span>
                    <span className="stat-value">${payments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
                    <span className="stat-trend up">{payments.length} transactions</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon refunds">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 9.58V19a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.42"/><path d="M12 13V7l8 8-8 8v-6H4"/></svg>
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Active Refunds</span>
                    <span className="stat-value">{refunds.filter(r => r.status === 'pending').length}</span>
                    <span className="stat-trend">In progress</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Successful</span>
                    <span className="stat-value">{payments.filter(p => p.status === 'success').length}</span>
                    <span className="stat-trend">Transactions</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid full-width">
                {analytics.length > 0 && (
                  <div className="grid-card chart-section">
                    <div className="card-header">
                      <h3>Spending Overview</h3>
                      <div className="chart-legend">
                        <span className="legend-item"><span className="dot line"></span> Line</span>
                        <span className="legend-item"><span className="dot bar"></span> Bar</span>
                      </div>
                    </div>
                    <div className="chart-wrapper">
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="transactions-container">
              <div className="content-header">
                <div>
                  <h3>Transaction History</h3>
                  <p>View and manage all your past payments</p>
                </div>
              </div>
              
              <div className="transaction-cards">
                {payments.length > 0 ? (
                  payments.map(p => (
                    <div key={p._id} className="transaction-card">
                      <div className="card-top">
                        <div className="date-info">
                          <span className="day">{new Date(p.createdAt).getDate()}</span>
                          <div className="month-year">
                            <span className="month">{new Date(p.createdAt).toLocaleString('default', { month: 'short' })}</span>
                            <span className="year">{new Date(p.createdAt).getFullYear()}</span>
                          </div>
                        </div>
                        <div className={`status-badge ${p.status}`}>{p.status}</div>
                      </div>
                      
                      <div className="card-body">
                        <div className="amount-info">
                          <span className="currency">{p.currency}</span>
                          <span className="amount">{p.amount.toFixed(2)}</span>
                        </div>
                        <div className="reference-info">
                          <span className="label">Ref:</span>
                          <span className="value">{p.reference}</span>
                        </div>
                      </div>
                      
                      <div className="card-footer">
                        {p.status === 'success' && !refunds.find(r => r.paymentReference === p.reference) ? (
                          <button 
                            className="refund-btn-compact" 
                            onClick={() => {
                              setSelectedPayment(p);
                              setRefundForm({ reference: p.reference, reason: '' });
                              setShowRefundModal(true);
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 13V7l8 8-8 8v-6H4"/></svg>
                            Request Refund
                          </button>
                        ) : refunds.find(r => r.paymentReference === p.reference) ? (
                          <span className={`refund-status-tag ${refunds.find(r => r.paymentReference === p.reference).status}`}>
                            Refund: {refunds.find(r => r.paymentReference === p.reference).status}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="refund-container animate-fade-in">
              <div className="refund-summary-grid">
                <div className="summary-card">
                  <div className="summary-icon pending">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div className="summary-details">
                    <span className="summary-label">Pending</span>
                    <span className="summary-value">{refunds.filter(r => r.status === 'pending').length}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon approved">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  </div>
                  <div className="summary-details">
                    <span className="summary-label">Approved</span>
                    <span className="summary-value">{refunds.filter(r => r.status === 'approved').length}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon rejected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                  </div>
                  <div className="summary-details">
                    <span className="summary-label">Rejected</span>
                    <span className="summary-value">{refunds.filter(r => r.status === 'rejected').length}</span>
                  </div>
                </div>
              </div>

              <div className="grid-card table-section">
                <div className="card-header">
                  <div>
                    <h3>Refund History</h3>
                    <p>Track your submitted refund requests</p>
                  </div>
                </div>
                <div className="table-responsive">
                  {refunds.length > 0 ? (
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Reference</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Admin Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refunds.map(r => (
                          <tr key={r._id}>
                            <td data-label="Date">{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td data-label="Reference" className="font-mono">{r.paymentReference}</td>
                            <td data-label="Amount" className="font-bold">${r.amount.toFixed(2)}</td>
                            <td data-label="Status">
                              <span className={`status-pill ${r.status}`}>
                                {r.status}
                              </span>
                            </td>
                            <td data-label="Admin Notes" className="text-secondary">{r.adminNotes || '---'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 9.58V19a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.42"/><path d="M12 13V7l8 8-8 8v-6H4"/></svg>
                      </div>
                      <h4>No refund requested</h4>
                      <p>You haven't requested any refunds yet. You can request a refund from the Transactions section.</p>
                      <button className="secondary-btn" onClick={() => setActiveTab('transactions')}>
                        Go to Transactions
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-container animate-fade-in">
              <div className="settings-grid">
                {/* Profile Section */}
                <div className="grid-card">
                  <div className="card-header">
                    <div className="header-icon profile">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div>
                      <h3>Profile Settings</h3>
                      <p>Manage your account personal information</p>
                    </div>
                  </div>
                  <form className="modern-form" onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <div className="input-with-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <input 
                          type="text" 
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          placeholder="Your Name"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="input-with-icon disabled">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                        <input type="email" value={profileData.email} disabled />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Security Question</label>
                      <select 
                        value={securityData.question}
                        onChange={(e) => setSecurityData({ ...securityData, question: e.target.value })}
                        className="modern-select"
                      >
                        <option value="">Select a question</option>
                        <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                        <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                        <option value="What city were you born in?">What city were you born in?</option>
                        <option value="What is your favorite book?">What is your favorite book?</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Security Answer</label>
                      <input 
                        type="password" 
                        placeholder="Answer to security question"
                        value={securityData.answer}
                        onChange={(e) => setSecurityData({ ...securityData, answer: e.target.value })}
                        className="modern-input"
                      />
                    </div>
                    <button type="submit" className="primary-btn wide">Save Profile Changes</button>
                  </form>
                </div>

                {/* Password Section */}
                <div className="grid-card">
                  <div className="card-header">
                    <div className="header-icon security">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </div>
                    <div>
                      <h3>Security</h3>
                      <p>Keep your account safe with a strong password</p>
                    </div>
                  </div>
                  <form className="modern-form" onSubmit={handleChangePassword}>
                    <div className="form-group">
                      <label>Current Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        className="modern-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input 
                        type="password" 
                        placeholder="New strong password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        className="modern-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input 
                        type="password" 
                        placeholder="Repeat new password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        className="modern-input"
                      />
                    </div>
                    {settingsMessage.text && (
                      <div className={`settings-badge ${settingsMessage.type}`}>
                        {settingsMessage.text}
                      </div>
                    )}
                    <button type="submit" className="primary-btn wide">Update Password</button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showPaymentModal && (
        <div className="modern-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modern-modal-content compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Payment</h2>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">Authenticated as <strong>{userData.email}</strong></p>
              <PaymentForm 
                compact={true}
                authenticated={true}
                onSuccess={() => {
                  setShowPaymentModal(false);
                  fetchDashboardData();
                }} 
                initialEmail={userData.email} 
                initialName={userData.name} 
              />
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="modern-modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="modern-modal-content compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Refund</h2>
              <button className="close-btn" onClick={() => setShowRefundModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="selected-payment-summary">
                <p>Transaction: <strong>{selectedPayment?.reference}</strong></p>
                <p>Amount: <strong>${selectedPayment?.amount?.toFixed(2)}</strong></p>
              </div>
              <form className="modern-form" onSubmit={handleRefundRequest}>
                <div className="form-group">
                  <label>Reason for Refund</label>
                  <select 
                    value={refundForm.reason}
                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                    required
                    className="modal-select"
                  >
                    <option value="">Select a reason</option>
                    <option value="Duplicate payment">Duplicate payment</option>
                    <option value="Incorrect amount">Incorrect amount</option>
                    <option value="Service not rendered">Service not rendered</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {refundForm.reason === 'Other' && (
                  <div className="form-group">
                    <label>Specify Reason</label>
                    <textarea 
                      placeholder="Tell us more..."
                      className="modal-textarea"
                      required
                    ></textarea>
                  </div>
                )}
                {refundMessage.text && (
                  <div className={`settings-badge ${refundMessage.type}`}>
                    {refundMessage.text}
                  </div>
                )}
                <div className="modal-actions">
                  <button type="submit" className="primary-btn wide" disabled={refundLoading}>
                    {refundLoading ? 'Submitting...' : 'Submit Refund Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayerDashboard;
