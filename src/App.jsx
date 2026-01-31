import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AdminDashboard from './components/AdminDashboard';
import ThankYou from './components/ThankYou';
import Footer from './components/Footer';
import './styles/main.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/thankyou" element={<ThankYou />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
