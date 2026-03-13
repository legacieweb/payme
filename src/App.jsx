import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AdminDashboard from './components/AdminDashboard';
import MasterAdminDashboard from './components/MasterAdminDashboard';
import PayerDashboard from './components/PayerDashboard';
import ThankYou from './components/ThankYou';
import InvoicePage from './components/InvoicePage';
import ReceiptLookup from './components/ReceiptLookup';
import Security from './components/Security';
import Settlements from './components/Settlements';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import CookiePolicy from './components/CookiePolicy';
import Footer from './components/Footer';
import './styles/main.css';

const AppContent = () => {
  const location = useLocation();
  const hideFooter = location.pathname === '/payer-dashboard' || location.pathname.startsWith('/invoice');

  // Automatic scroll to top on route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [location.pathname]);

  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/master-admin" element={<MasterAdminDashboard />} />
        <Route path="/payer-dashboard" element={<PayerDashboard />} />
        <Route path="/thankyou" element={<ThankYou />} />
        <Route path="/invoice/:id" element={<InvoicePage />} />
        <Route path="/receipt-lookup" element={<ReceiptLookup />} />
        <Route path="/security" element={<Security />} />
        <Route path="/settlements" element={<Settlements />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
      </Routes>
      {!hideFooter && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
