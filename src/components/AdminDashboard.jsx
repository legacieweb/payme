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

const AdminDashboard = () => {
  const navigate = useNavigate();
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

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, analyticsRes, refundsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/payments'),
        axios.get('http://localhost:5000/api/admin/analytics'),
        axios.get('http://localhost:5000/api/refunds')
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
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/refunds/stats');
      if (response.data.success) {
        setRefundStats(response.data.stats);
      }
    } catch (err) {
      console.error('Refund stats error:', err);
    }
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (isLoggedIn) {
      fetchData();
      fetchRefundStats();
    }
  }, []);

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
      const response = await axios.put(`http://localhost:5000/api/refunds/${selectedRefund._id}`, {
        status: action,
        adminNotes: adminNotes,
        processedBy: 'Admin'
      });

      if (response.data.success) {
        // Update the refunds list
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

  const getStatusBadgeStyle = (status) => {
    const styles = {
      pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
      approved: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
      rejected: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
      success: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
    };
    return styles[status] || styles.pending;
  };

  const pendingRefundsCount = refunds.filter(r => r.status === 'pending').length;

  return (
    <div className="admin-page">
      <div className="admin-dashboard-page">
        <div className="container">
          <div className="admin-header">
            <h2>Admin Dashboard</h2>
            <div className="admin-actions">
              <button className="refresh-btn" onClick={fetchData} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '24px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px'
          }}>
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'payments' ? 'var(--accent)' : 'transparent',
                border: `1px solid ${activeTab === 'payments' ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px',
                color: activeTab === 'payments' ? '#000' : 'var(--text)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'refunds' ? '#f59e0b' : 'transparent',
                border: `1px solid ${activeTab === 'refunds' ? '#f59e0b' : 'var(--border)'}`,
                borderRadius: '8px',
                color: activeTab === 'refunds' ? '#000' : 'var(--text)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Refund Requests
              {pendingRefundsCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}>
                  {pendingRefundsCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'payments' && (
            <>
              {analytics && (
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-label">Today's Revenue</div>
                    <div className="analytics-value">{formatCurrency(analytics.today.total)}</div>
                    <div className="analytics-sub">{analytics.today.count} transactions</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-label">This Week</div>
                    <div className="analytics-value">{formatCurrency(analytics.thisWeek.total)}</div>
                    <div className="analytics-sub">{analytics.thisWeek.count} transactions</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-label">This Month</div>
                    <div className="analytics-value">{formatCurrency(analytics.thisMonth.total)}</div>
                    <div className="analytics-sub">{analytics.thisMonth.count} transactions</div>
                  </div>
                  <div className="analytics-card highlight">
                    <div className="analytics-label">All Time Revenue</div>
                    <div className="analytics-value">{formatCurrency(analytics.allTime.total)}</div>
                    <div className="analytics-sub">{analytics.allTime.count} transactions</div>
                  </div>
                </div>
              )}

              {dailyPayments.length > 0 && (
                <div className="chart-container">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}

              <div className="payments-table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3>Recent Payments</h3>
                  <button className="export-btn" onClick={exportToCSV}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export CSV
                  </button>
                </div>
                <div className="table-wrapper">
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 50).map((payment) => (
                        <tr key={payment._id}>
                          <td>{formatDate(payment.createdAt)}</td>
                          <td>{payment.name}</td>
                          <td>{payment.email}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td className="reference">{payment.reference}</td>
                          <td>
                            <span className={`status-badge ${payment.status}`}>
                              {payment.status}
                            </span>
                          </td>
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
              {/* Refund Stats */}
              {refundStats && (
                <div className="analytics-grid" style={{ marginBottom: '24px' }}>
                  <div className="analytics-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="analytics-label">Pending Refunds</div>
                    <div className="analytics-value" style={{ color: '#f59e0b' }}>{refundStats.pending.count}</div>
                    <div className="analytics-sub">{formatCurrency(refundStats.pending.totalAmount)}</div>
                  </div>
                  <div className="analytics-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="analytics-label">Approved Refunds</div>
                    <div className="analytics-value" style={{ color: '#10b981' }}>{refundStats.approved.count}</div>
                    <div className="analytics-sub">{formatCurrency(refundStats.approved.totalAmount)}</div>
                  </div>
                  <div className="analytics-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="analytics-label">Rejected Refunds</div>
                    <div className="analytics-value" style={{ color: '#ef4444' }}>{refundStats.rejected.count}</div>
                    <div className="analytics-sub">{formatCurrency(refundStats.rejected.totalAmount)}</div>
                  </div>
                  <div className="analytics-card highlight">
                    <div className="analytics-label">Total Refund Requests</div>
                    <div className="analytics-value">
                      {refundStats.pending.count + refundStats.approved.count + refundStats.rejected.count}
                    </div>
                    <div className="analytics-sub">
                      {formatCurrency(refundStats.pending.totalAmount + refundStats.approved.totalAmount + refundStats.rejected.totalAmount)}
                    </div>
                  </div>
                </div>
              )}

              <div className="payments-table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3>Refund Requests</h3>
                  <button className="export-btn" onClick={exportRefundsToCSV}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export CSV
                  </button>
                </div>
                <div className="table-wrapper">
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.map((refund) => {
                        const statusStyle = getStatusBadgeStyle(refund.status);
                        return (
                          <tr key={refund._id}>
                            <td>{formatDateTime(refund.createdAt)}</td>
                            <td>{refund.customerName}</td>
                            <td>{refund.customerEmail}</td>
                            <td>{formatCurrency(refund.amount)}</td>
                            <td className="reference">{refund.paymentReference}</td>
                            <td>
                              <span 
                                className="status-badge"
                                style={{ 
                                  background: statusStyle.bg, 
                                  color: statusStyle.color,
                                  textTransform: 'capitalize'
                                }}
                              >
                                {refund.status}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => openRefundModal(refund)}
                                style={{
                                  padding: '6px 12px',
                                  background: 'var(--accent)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#000',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: 'pointer'
                                }}
                              >
                                {refund.status === 'pending' ? 'Review' : 'View'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Refund Review Modal */}
      {showRefundModal && selectedRefund && (
        <div 
          className="refund-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRefundModal();
          }}
        >
          <div 
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>
                {selectedRefund.status === 'pending' ? 'Review Refund Request' : 'Refund Request Details'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Reference: <strong>{selectedRefund.paymentReference}</strong>
              </p>
            </div>

            {/* Status Badge */}
            <div style={{ marginBottom: '24px' }}>
              <span 
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  background: getStatusBadgeStyle(selectedRefund.status).bg,
                  color: getStatusBadgeStyle(selectedRefund.status).color
                }}
              >
                {selectedRefund.status}
              </span>
            </div>

            {/* Customer Info */}
            <div style={{ 
              background: 'var(--bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Customer Information
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div className="receipt-row">
                  <span className="receipt-label">Name</span>
                  <span className="receipt-value">{selectedRefund.customerName}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Email</span>
                  <span className="receipt-value">{selectedRefund.customerEmail}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Amount</span>
                  <span className="receipt-value" style={{ color: 'var(--accent)', fontWeight: '600' }}>
                    {selectedRefund.currency} {selectedRefund.amount.toFixed(2)}
                  </span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Request Date</span>
                  <span className="receipt-value">{formatDateTime(selectedRefund.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                Reason for Refund
              </h4>
              <div style={{
                background: 'var(--bg)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {selectedRefund.reason}
              </div>
            </div>

            {/* Admin Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '12px',
                color: 'var(--text-secondary)'
              }}>
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this refund decision..."
                disabled={selectedRefund.status !== 'pending' || refundActionLoading}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  opacity: selectedRefund.status !== 'pending' ? 0.7 : 1
                }}
              />
            </div>

            {/* Processed Info (if applicable) */}
            {selectedRefund.processedAt && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '24px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div className="receipt-row">
                  <span className="receipt-label">Processed By</span>
                  <span className="receipt-value">{selectedRefund.processedBy}</span>
                </div>
                <div className="receipt-row" style={{ marginTop: '8px' }}>
                  <span className="receipt-label">Processed Date</span>
                  <span className="receipt-value">{formatDateTime(selectedRefund.processedAt)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={closeRefundModal}
                style={{
                  flex: selectedRefund.status === 'pending' ? 'none' : 1,
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {selectedRefund.status === 'pending' ? 'Cancel' : 'Close'}
              </button>
              
              {selectedRefund.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleRefundAction('rejected')}
                    disabled={refundActionLoading}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: refundActionLoading ? 'not-allowed' : 'pointer',
                      opacity: refundActionLoading ? 0.7 : 1
                    }}
                  >
                    {refundActionLoading ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleRefundAction('approved')}
                    disabled={refundActionLoading}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: refundActionLoading ? 'not-allowed' : 'pointer',
                      opacity: refundActionLoading ? 0.7 : 1
                    }}
                  >
                    {refundActionLoading ? 'Processing...' : 'Approve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
