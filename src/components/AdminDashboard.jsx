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
import { Line } from 'react-chartjs-2';
import LoginModal from './LoginModal';

// Register Chart.js components
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dailyPayments, setDailyPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Refund management state
  const [refunds, setRefunds] = useState([]);
  const [refundStats, setRefundStats] = useState(null);
  const [activeTab, setActiveTab] = useState('payments');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundActionLoading, setRefundActionLoading] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceMaxUsage, setInvoiceMaxUsage] = useState(1);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Withdrawal settings state
  const [withdrawalSettings, setWithdrawalSettings] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (adminLoggedIn) {
      setIsLoggedIn(true);
      fetchData();
      fetchRefundStats();
    } else {
      setShowLoginModal(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    fetchData();
    fetchRefundStats();
  };

  // Base API URL
  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, analyticsRes, refundsRes, settingsRes, invoicesRes] = await Promise.all([
        axios.get(`${baseUrl}/api/admin/payments`),
        axios.get(`${baseUrl}/api/admin/analytics`),
        axios.get(`${baseUrl}/api/refunds`),
        axios.get(`${baseUrl}/api/admin/withdrawal-settings`),
        axios.get(`${baseUrl}/api/admin/invoices`)
      ]);

      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.payments);
        setDailyPayments(paymentsRes.data.dailyPayments);
      }

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.analytics);
      }

      if (refundsRes.data.success) {
        setRefunds(refundsRes.data.refunds);
      }

      if (settingsRes.data.success) {
        setWithdrawalSettings(settingsRes.data.settings);
      }

      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.invoices);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setInvoiceLoading(true);
    try {
      const response = await axios.post(`${baseUrl}/api/admin/invoices`, {
        amount: parseFloat(invoiceAmount),
        description: invoiceDescription,
        maxUsage: invoiceMaxUsage
      });
      if (response.data.success) {
        setInvoices([response.data.invoice, ...invoices]);
        setShowInvoiceModal(false);
        setInvoiceAmount('');
        setInvoiceDescription('');
        setInvoiceMaxUsage(1);
      }
    } catch (err) {
      console.error('Invoice creation error:', err);
      alert('Failed to create invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const copyInvoiceLink = (id) => {
    const link = `${window.location.origin}/#/invoice/${id}`;
    navigator.clipboard.writeText(link);
    alert('Invoice link copied to clipboard!');
  };

  const fetchRefundStats = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/refunds/stats`);
      if (response.data.success) {
        setRefundStats(response.data.stats);
      }
    } catch (err) {
      console.error('Refund stats error:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Amount', 'Currency', 'Reference', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => [
        p.name,
        p.email,
        p.amount,
        p.currency,
        p.reference,
        p.status,
        new Date(p.createdAt).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportRefundsToCSV = () => {
    const headers = ['Date', 'Customer', 'Email', 'Amount', 'Currency', 'Reference', 'Reason', 'Status', 'Processed Date', 'Admin Notes'];
    const csvContent = [
      headers.join(','),
      ...refunds.map(r => [
        new Date(r.createdAt).toLocaleString(),
        r.customerName,
        r.customerEmail,
        r.amount,
        r.currency,
        r.paymentReference,
        `"${r.reason.replace(/"/g, '""')}"`,
        r.status,
        r.processedAt ? new Date(r.processedAt).toLocaleString() : '',
        `"${(r.adminNotes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refunds_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleRefundAction = async (action) => {
    setRefundActionLoading(true);
    try {
      const response = await axios.put(`${baseUrl}/api/refunds/${selectedRefund._id}`, {
        status: action,
        adminNotes: adminNotes,
        processedBy: 'Admin'
      });

      if (response.data.success) {
        setRefunds(prev => prev.map(r => 
          r._id === selectedRefund._id ? response.data.refundRequest : r
        ));
        fetchRefundStats();
        closeRefundModal();
      }
    } catch (err) {
      console.error('Refund action error:', err);
      alert('Failed to process refund request. Please try again.');
    } finally {
      setRefundActionLoading(false);
    }
  };

  const openRefundModal = (refund) => {
    setSelectedRefund(refund);
    setAdminNotes(refund.adminNotes || '');
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedRefund(null);
    setAdminNotes('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatKES = (amount) => {
    return 'KES ' + Math.round(amount).toLocaleString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Prepare chart data
  const chartData = {
    labels: dailyPayments.map(d => `${d._id.month}/${d._id.day}`).reverse(),
    datasets: [
      {
        label: 'Revenue ($)',
        data: dailyPayments.map(d => d.totalAmount).reverse(),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Transactions',
        data: dailyPayments.map(d => d.count).reverse(),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#ffffff' }
      },
      title: {
        display: true,
        text: 'Daily Revenue & Transactions (Last 30 Days)',
        color: '#ffffff'
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

  // total amount paid in the system, used for analytics
  const totalAmount =
    analytics?.allTime?.total ||
    payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // amount waiting to be withdrawn (not marked completed)
  const pendingPayoutAmount = payments
    .filter(p => p.status !== 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingRefundsCount = refunds.filter(r => r.status === 'pending').length;

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

  return (
    <div className="dashboard-layout sidebar-less">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="logo-text">PayLang Admin</span>
          </div>
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-email">admin@paylang.com</span>
            </div>
            <div className="user-avatar admin">A</div>
            <button className="logout-nav-btn" onClick={() => {
              localStorage.removeItem('adminLoggedIn');
              setIsLoggedIn(false);
            }} title="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-tabs">
            <button 
              className={`tab-item ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Overview
            </button>
            <button 
              className={`tab-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Transactions
            </button>
            <button 
              className={`tab-item ${activeTab === 'withdrawals' ? 'active' : ''}`}
              onClick={() => setActiveTab('withdrawals')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Withdrawals
            </button>
            <button 
              className={`tab-item ${activeTab === 'refunds' ? 'active' : ''}`}
              onClick={() => setActiveTab('refunds')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 9.58V19a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.42"/><path d="M12 13V7l8 8-8 8v-6H4"/></svg>
              Refunds
              {pendingRefundsCount > 0 && (
                <span className="nav-badge">{pendingRefundsCount}</span>
              )}
            </button>
            <button 
              className={`tab-item ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              Invoices
            </button>
          </div>

          {activeTab === 'payments' && (
            <>
              <div className="content-header">
                <div>
                  <h1>Payments Overview</h1>
                  <p>Monitor your overall business performance.</p>
                </div>
                <div className="action-buttons">
                  <button className="refresh-btn-icon" onClick={fetchData} title="Refresh Data">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spin' : ''}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                  </button>
                </div>
              </div>

              {analytics && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-glow"></div>
                    <div className="stat-icon spending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                    <div className="stat-details">
                      <span className="stat-label">Today's Revenue</span>
                      <div className="stat-value-group">
                        <span className="stat-value">{formatCurrency(analytics.today?.total || 0)}</span>
                        <span className="stat-trend positive">+{analytics.today?.count || 0}</span>
                      </div>
                      <span className="stat-kes">≈ {formatKES((analytics.today?.total || 0) * (withdrawalSettings?.conversionRate || 127))}</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-glow"></div>
                    <div className="stat-icon success">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                    <div className="stat-details">
                      <span className="stat-label">This Month</span>
                      <div className="stat-value-group">
                        <span className="stat-value">{formatCurrency(analytics.thisMonth?.total || 0)}</span>
                        <span className="stat-trend positive">+{analytics.thisMonth?.count || 0}</span>
                      </div>
                      <span className="stat-kes">≈ {formatKES((analytics.thisMonth?.total || 0) * (withdrawalSettings?.conversionRate || 127))}</span>
                    </div>
                  </div>
                  <div className="stat-card highlight-card">
                    <div className="stat-glow"></div>
                    <div className="stat-icon all-time">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                    <div className="stat-details">
                      <span className="stat-label">Total Volume</span>
                      <div className="stat-value-group">
                        <span className="stat-value">{formatCurrency(analytics.allTime?.total || 0)}</span>
                        <span className="stat-trend positive">+{analytics.allTime?.count || 0}</span>
                      </div>
                      <span className="stat-kes">≈ {formatKES((analytics.allTime?.total || 0) * (withdrawalSettings?.conversionRate || 127))}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="dashboard-grid full-width">
                <div className="grid-card chart-section">
                  <div className="card-header">
                    <h3>Revenue & Transactions</h3>
                  </div>
                  <div className="chart-wrapper">
                    <Line data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <>
              <div className="content-header">
                <div>
                  <h1>Transactions</h1>
                  <p>All transactions from all users and channels.</p>
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={exportToCSV}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="grid-card table-section">
                <div className="card-header">
                  <h3>All Transactions</h3>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id} className={payment.status === 'completed' ? 'completed-row' : ''}>
                          <td>{formatDate(payment.createdAt)}</td>
                          <td>
                            <div className="customer-cell">
                              <span className="name">{payment.name}</span>
                              <span className="email">{payment.email}</span>
                            </div>
                          </td>
                          <td className="font-bold">{formatCurrency(payment.amount)}</td>
                          <td className="font-mono text-small">{payment.reference}</td>
                          <td><span className={`badge ${payment.status}`}>{payment.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'withdrawals' && (
            <>
              <div className="content-header">
                <div>
                  <h1>Withdrawals</h1>
                  <p>Manage and track your payouts and transaction status.</p>
                </div>
              </div>

              <div className="withdrawal-banner premium">
                <div className="banner-item">
                  <span className="banner-label">Global Status</span>
                  <div className="banner-value">
                    <span className={`status-dot ${withdrawalSettings?.status || 'pending'}`}></span>
                    {withdrawalSettings?.status || 'pending'}
                  </div>
                </div>
                <div className="banner-item">
                  <span className="banner-label">Preferred Account</span>
                  <div className="banner-value">{withdrawalSettings?.withdrawalAccount || '0790057596'}</div>
                </div>
                <div className="banner-item">
                  <span className="banner-label">Remaining Payout</span>
                  <div className="banner-value success">
                    KES {Math.round(pendingPayoutAmount * (withdrawalSettings?.conversionRate || 127) * (1 - (withdrawalSettings?.withdrawalFee || 0.053))).toLocaleString()}
                  </div>
                  <span className="banner-sub">After {(withdrawalSettings?.withdrawalFee * 100).toFixed(1)}% fee</span>
                </div>
              </div>

              <div className="grid-card table-section">
                <div className="card-header">
                  <h3>Transaction Breakdown</h3>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount (USD)</th>
                        <th>Amount (KES)</th>
                        <th>Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p._id} className={p.status === 'completed' ? 'completed-row' : ''}>
                          <td>{formatDate(p.createdAt)}</td>
                          <td className="font-bold">${p.amount.toLocaleString()}</td>
                          <td className="kes-value">
                            KES {Math.round(p.amount * (withdrawalSettings?.conversionRate || 127) * (1 - (withdrawalSettings?.withdrawalFee || 0.053))).toLocaleString()}
                          </td>
                          <td className="font-mono text-small opacity-50">{p.reference}</td>
                          <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'refunds' && (
            <>
              <div className="content-header">
                <div>
                  <h1>Refund Management</h1>
                  <p>Process and track refund requests from customers.</p>
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={exportRefundsToCSV}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Export CSV
                  </button>
                </div>
              </div>

              {refundStats && (
                <div className="refund-summary-grid">
                  <div className="summary-card">
                    <div className="summary-icon pending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div className="summary-details">
                      <span className="summary-label">Pending</span>
                      <span className="summary-value">{refundStats.pending.count}</span>
                      <span className="summary-trend">{formatCurrency(refundStats.pending.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon approved">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    </div>
                    <div className="summary-details">
                      <span className="summary-label">Approved</span>
                      <span className="summary-value">{refundStats.approved.count}</span>
                      <span className="summary-trend">{formatCurrency(refundStats.approved.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon rejected">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                    </div>
                    <div className="summary-details">
                      <span className="summary-label">Rejected</span>
                      <span className="summary-value">{refundStats.rejected.count}</span>
                      <span className="summary-trend">{formatCurrency(refundStats.rejected.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid-card table-section">
                <div className="card-header">
                  <h3>Refund Requests</h3>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.map((refund) => (
                        <tr key={refund._id}>
                          <td>{formatDate(refund.createdAt)}</td>
                          <td>
                            <div className="customer-cell">
                              <span className="name">{refund.customerName}</span>
                              <span className="email">{refund.customerEmail}</span>
                            </div>
                          </td>
                          <td className="font-bold">{formatCurrency(refund.amount)}</td>
                          <td className="font-mono text-small">{refund.paymentReference}</td>
                          <td className="text-secondary">{refund.reason}</td>
                          <td><span className={`badge ${refund.status}`}>{refund.status}</span></td>
                          <td>
                            {refund.status === 'pending' && (
                              <button 
                                className="action-btn"
                                onClick={() => openRefundModal(refund)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                Process
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'invoices' && (
            <>
              <div className="content-header">
                <div>
                  <h1>Invoice Management</h1>
                  <p>Create and share payment links with your customers.</p>
                </div>
                <div className="action-buttons">
                  <button className="primary-btn" onClick={() => setShowInvoiceModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Create Invoice
                  </button>
                </div>
              </div>

              <div className="grid-card table-section">
                <div className="card-header">
                  <h3>Generated Invoices</h3>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Usage</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice._id}>
                          <td>{formatDate(invoice.createdAt)}</td>
                          <td className="text-secondary">{invoice.description || 'No description'}</td>
                          <td className="font-bold">{formatCurrency(invoice.amount)}</td>
                          <td>
                            <div className="usage-progress">
                              <span className="usage-text">{invoice.usageCount || 0} / {invoice.maxUsage || 1}</span>
                              <div className="usage-bar">
                                <div 
                                  className="usage-fill" 
                                  style={{ width: `${((invoice.usageCount || 0) / (invoice.maxUsage || 1)) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td><span className={`badge ${invoice.status}`}>{invoice.status}</span></td>
                          <td>
                            <button 
                              className="action-btn"
                              onClick={() => copyInvoiceLink(invoice._id)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                              Copy Link
                            </button>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-secondary">No invoices created yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showInvoiceModal && (
        <div className="modal-overlay active">
          <div className="modern-modal invoice-creation-modal">
            <div className="modal-sidebar-accent"></div>
            <div className="modal-content-wrapper">
              <div className="modal-header">
                <div className="header-title-group">
                  <div className="header-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                  </div>
                  <div>
                    <h3>Generate Smart Invoice</h3>
                    <p>Create a trackable, multi-use payment link</p>
                  </div>
                </div>
                <button className="modal-close-btn" onClick={() => setShowInvoiceModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="modern-form">
                <div className="form-sections-grid">
                  <div className="form-main-inputs">
                    <div className="modern-input-group">
                      <label>Settlement Amount</label>
                      <div className="input-with-icon">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                          placeholder="0.00"
                          className="amount-input-large"
                        />
                      </div>
                    </div>

                    <div className="modern-input-group">
                      <label>Payment Description</label>
                      <textarea
                        value={invoiceDescription}
                        onChange={(e) => setInvoiceDescription(e.target.value)}
                        placeholder="e.g. Monthly Retainer for Web Services"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-side-controls">
                    <div className="modern-input-group">
                      <label>Usage Frequency</label>
                      <div className="usage-selector-grid">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            type="button"
                            className={`usage-option ${invoiceMaxUsage === num ? 'active' : ''}`}
                            onClick={() => setInvoiceMaxUsage(num)}
                          >
                            {num}x
                          </button>
                        ))}
                      </div>
                      <p className="control-hint">Maximum number of successful settlements allowed for this link.</p>
                    </div>

                    <div className="invoice-preview-mini">
                      <div className="preview-label">Live Preview</div>
                      <div className="preview-card">
                        <div className="preview-header">
                          <span className="preview-brand">Paylang</span>
                          <span className="preview-status">Active</span>
                        </div>
                        <div className="preview-amount">
                          ${parseFloat(invoiceAmount || 0).toFixed(2)}
                        </div>
                        <div className="preview-desc">
                          {invoiceDescription || 'Untitled Payment'}
                        </div>
                        <div className="preview-limit">
                          Limit: {invoiceMaxUsage} {invoiceMaxUsage === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-action-footer">
                  <button type="button" className="modern-secondary-btn" onClick={() => setShowInvoiceModal(false)}>
                    Discard
                  </button>
                  <button type="submit" className="modern-primary-btn" disabled={invoiceLoading || !invoiceAmount}>
                    {invoiceLoading ? (
                      <div className="btn-loader"></div>
                    ) : (
                      <>
                        <span>Generate & Copy Link</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedRefund && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3>Process Refund Request</h3>
              <button className="modal-close" onClick={closeRefundModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="refund-details">
                <div className="detail-item">
                  <span className="detail-label">Customer</span>
                  <span className="detail-value">{selectedRefund.customerName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selectedRefund.customerEmail}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value">{formatCurrency(selectedRefund.amount)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reference</span>
                  <span className="detail-value font-mono">{selectedRefund.paymentReference}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reason</span>
                  <span className="detail-value">{selectedRefund.reason}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this refund..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={closeRefundModal}>
                Cancel
              </button>
              <button 
                className="danger-btn"
                onClick={() => handleRefundAction('rejected')}
                disabled={refundActionLoading}
              >
                {refundActionLoading ? <span className="spinner"></span> : 'Reject'}
              </button>
              <button 
                className="primary-btn"
                onClick={() => handleRefundAction('approved')}
                disabled={refundActionLoading}
              >
                {refundActionLoading ? <span className="spinner"></span> : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

