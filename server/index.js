const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Payment Schema
const paymentSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number,
  reference: String,
  status: String,
  currency: { type: String, default: 'USD' },
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// Withdrawal Settings Schema
const withdrawalSettingsSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  withdrawalAccount: { type: String, default: '' },
  withdrawalCurrency: { type: String, default: 'KSH' },
  conversionRate: { type: Number, default: 127 }, // 1 USD = 127 KSH
  withdrawalFee: { type: Number, default: 0.053 }, // 5.3%
  nextWithdrawalDate: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // Default 7 days from now
  updatedAt: { type: Date, default: Date.now }
});

const WithdrawalSettings = mongoose.model('WithdrawalSettings', withdrawalSettingsSchema);

// Refund Request Schema
const refundRequestSchema = new mongoose.Schema({
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  paymentReference: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNotes: { type: String, default: '' },
  processedAt: { type: Date },
  processedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const RefundRequest = mongoose.model('RefundRequest', refundRequestSchema);

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'paid', 'settled'], default: 'pending' },
  maxUsage: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },
  reference: { type: String }, // Paystack reference when paid
  createdAt: { type: Date, default: Date.now }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Payer/User Schema
const payerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String },
  securityQuestion: { type: String, default: '' },
  securityAnswer: { type: String, default: '' },
  isRegistered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Payer = mongoose.model('Payer', payerSchema);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Payer: Update Profile
app.put('/api/payer/update-profile', async (req, res) => {
  const { email, name, securityQuestion, securityAnswer } = req.body;
  try {
    const payer = await Payer.findOne({ email: email.toLowerCase() });
    if (!payer) return res.json({ success: false, message: 'User not found' });

    if (name) payer.name = name;
    if (securityQuestion) payer.securityQuestion = securityQuestion;
    if (securityAnswer) payer.securityAnswer = securityAnswer;

    await payer.save();
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payer: Change Password
app.post('/api/auth/change-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  try {
    const payer = await Payer.findOne({ email: email.toLowerCase() });
    if (!payer) return res.json({ success: false, message: 'User not found' });

    if (payer.password !== currentPassword) {
      return res.json({ success: false, message: 'Incorrect current password' });
    }

    payer.password = newPassword;
    await payer.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment and save to database
app.post('/api/payments/verify', async (req, res) => {
  const { reference, name, email } = req.body;
  
  try {
    // Verify with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const paystackData = response.data.data;

    if (paystackData.status === 'success') {
      // Check if payment already exists
      const existingPayment = await Payment.findOne({ reference });
      
      if (!existingPayment) {
        // Save new payment to database
        const payment = new Payment({
          name: name || paystackData.customer.first_name + ' ' + paystackData.customer.last_name,
          email: email || paystackData.customer.email,
          amount: paystackData.amount / 100,
          reference: paystackData.reference,
          status: 'success',
          currency: paystackData.currency,
          paidAt: paystackData.paid_at
        });
        await payment.save();

        /* Email sending disabled as per user request
        // Send confirmation email to user
        const userMailOptions = {
          from: process.env.EMAIL_USER,
          to: payment.email,
          subject: 'Payment Receipt - Paylang',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">Payment Successful!</h2>
              <p>Thank you for your payment. Here are your transaction details:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reference:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${payment.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${payment.currency} ${payment.amount.toFixed(2)}</td>
                </tr>
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${new Date(payment.paidAt).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #10b981;">Successful</td>
                </tr>
              </table>
              <p>Keep this receipt for your records.</p>
              <p style="margin-top: 30px; color: #666;">Best regards,<br>Paylang Team</p>
            </div>
          `
        };

        // Send notification email to admin
        const adminMailOptions = {
          from: process.env.EMAIL_USER,
          to: 'iyonicorp@gmail.com', // Admin email
          subject: 'New Payment Received - Paylang',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">New Payment Received!</h2>
              <p>A new payment has been processed. Details below:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${payment.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${payment.email}</td>
                </tr>
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reference:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${payment.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${payment.currency} ${payment.amount.toFixed(2)}</td>
                </tr>
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${new Date(payment.paidAt).toLocaleString()}</td>
                </tr>
              </table>
            </div>
          `
        };

        // Send emails
        transporter.sendMail(userMailOptions, (error, info) => {
          if (error) {
            console.error('User email error details:', {
              error: error.message,
              code: error.code,
              command: error.command,
              stack: error.stack
            });
          } else {
            console.log('User email sent:', info.response);
          }
        });

        transporter.sendMail(adminMailOptions, (error, info) => {
          if (error) {
            console.error('Admin email error details:', {
              error: error.message,
              code: error.code,
              command: error.command,
              stack: error.stack
            });
          } else {
            console.log('Admin email sent:', info.response);
          }
        });
        */
      }

      res.json({ success: true, data: paystackData });
    } else {
      res.json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payments by email
app.get('/api/payments/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    const payments = await Payment.find({ email: email.toLowerCase() }).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all payments with analytics
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    
    // Calculate analytics
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalTransactions = payments.length;
    const averageAmount = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Get payments by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyPayments = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]);
    
    res.json({
      success: true,
      payments,
      analytics: {
        totalRevenue,
        totalTransactions,
        averageAmount
      },
      dailyPayments
    });
  } catch (error) {
    console.error('Admin fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Payment Status
app.put('/api/admin/payments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    payment.status = status;
    await payment.save();
    
    res.json({ success: true, message: 'Payment status updated', payment });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get analytics summary
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);
    
    const [todayStats, weekStats, monthStats, allTimeStats] = await Promise.all([
      Payment.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: thisWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      success: true,
      analytics: {
        today: todayStats[0] || { total: 0, count: 0 },
        thisWeek: weekStats[0] || { total: 0, count: 0 },
        thisMonth: monthStats[0] || { total: 0, count: 0 },
        allTime: allTimeStats[0] || { total: 0, count: 0 }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Withdrawal Settings
app.get('/api/admin/withdrawal-settings', async (req, res) => {
  try {
    let settings = await WithdrawalSettings.findOne();
    if (!settings) {
      settings = new WithdrawalSettings({});
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Fetch withdrawal settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Master Admin: Update Withdrawal Settings
app.put('/api/admin/withdrawal-settings', async (req, res) => {
  const { status, withdrawalAccount, nextWithdrawalDate, conversionRate, withdrawalFee } = req.body;
  try {
    let settings = await WithdrawalSettings.findOne();
    if (!settings) {
      settings = new WithdrawalSettings({});
    }
    
    if (status) settings.status = status;
    if (withdrawalAccount !== undefined) settings.withdrawalAccount = withdrawalAccount;
    if (nextWithdrawalDate) settings.nextWithdrawalDate = new Date(nextWithdrawalDate);
    if (conversionRate) settings.conversionRate = conversionRate;
    if (withdrawalFee !== undefined) settings.withdrawalFee = withdrawalFee;
    
    settings.updatedAt = new Date();
    await settings.save();
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update withdrawal settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Universal login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, message: 'Missing credentials' });

  try {
    const inputEmail = email.trim().toLowerCase();
    const inputPassword = password.trim();

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
    const masterEmail = (process.env.MASTER_ADMIN_EMAIL || '').trim().toLowerCase();
    const masterPassword = (process.env.MASTER_ADMIN_PASSWORD || '').trim();

    // Check if Master Admin
    if (inputEmail === masterEmail && inputPassword === masterPassword) {
      return res.json({ success: true, role: 'master', message: 'Master Admin Login Successful' });
    }

    // Check if Regular Admin
    if (inputEmail === adminEmail && inputPassword === adminPassword) {
      return res.json({ success: true, role: 'admin', message: 'Admin Login Successful' });
    }

    // Check if Payer
    const payer = await Payer.findOne({ email: inputEmail });
    if (payer && payer.isRegistered && payer.password === inputPassword) {
      return res.json({ 
        success: true, 
        role: 'payer', 
        user: { email: payer.email, name: payer.name },
        message: 'Payer Login Successful' 
      });
    }

    res.json({ success: false, message: 'Invalid email or password' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payer Onboarding: Verify Details
app.post('/api/payer/verify-details', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.json({ success: false, message: 'Email and Name are required' });

  try {
    const inputEmail = email.trim().toLowerCase();
    const inputName = name.trim().toLowerCase();

    // Check if they have at least one successful payment
    const payment = await Payment.findOne({ 
      email: inputEmail,
      name: new RegExp(`^${inputName}$`, 'i'),
      status: 'success'
    });

    if (!payment) {
      return res.json({ 
        success: false, 
        message: 'No record found with these details. Please ensure you use the exact name and email used during payment.' 
      });
    }

    // Check if already registered
    const existingPayer = await Payer.findOne({ email: inputEmail });
    if (existingPayer && existingPayer.isRegistered) {
      return res.json({ success: false, message: 'Account already exists. Please login.' });
    }

    res.json({ success: true, message: 'Details verified. Please set your password.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payer Onboarding: Set Password
app.post('/api/payer/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) return res.json({ success: false, message: 'All fields are required' });

  try {
    const inputEmail = email.trim().toLowerCase();
    
    let payer = await Payer.findOne({ email: inputEmail });
    if (payer) {
      payer.password = password;
      payer.isRegistered = true;
      payer.name = name;
      await payer.save();
    } else {
      payer = new Payer({
        email: inputEmail,
        name: name,
        password: password,
        isRegistered: true
      });
      await payer.save();
    }

    res.json({ success: true, message: 'Account created successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payer: Get personal analytics and payments
app.get('/api/payer/dashboard/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const payments = await Payment.find({ email: email.toLowerCase() }).sort({ createdAt: -1 });
    const refunds = await RefundRequest.find({ customerEmail: email.toLowerCase() }).sort({ createdAt: -1 });
    
    // Simple spending analytics
    const spendingByDate = await Payment.aggregate([
      { $match: { email: email.toLowerCase(), status: 'success' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);

    res.json({ success: true, payments, refunds, analytics: spendingByDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Master Admin login
app.post('/api/master-admin/verify', (req, res) => {
  const { email, password } = req.body;
  const masterEmail = (process.env.MASTER_ADMIN_EMAIL || '').trim().toLowerCase();
  const masterPassword = (process.env.MASTER_ADMIN_PASSWORD || '').trim();
  
  if (email && password && email.trim().toLowerCase() === masterEmail && password.trim() === masterPassword) {
    res.json({ success: true, role: 'master' });
  } else {
    res.json({ success: false });
  }
});

// Admin password verification
app.post('/api/admin/verify', (req, res) => {
  const { email, password } = req.body;
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  
  if (email && password && email.trim().toLowerCase() === adminEmail && password.trim() === adminPassword) {
    res.json({ success: true, role: 'admin' });
  } else {
    res.json({ success: false });
  }
});

// Refund Request: Create
app.post('/api/refunds', async (req, res) => {
  const { paymentId, paymentReference, customerName, customerEmail, amount, currency, reason } = req.body;

  try {
    // Check if payment exists
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Check if refund already requested for this payment
    const existingRefund = await RefundRequest.findOne({ paymentId });
    if (existingRefund) {
      return res.status(400).json({ success: false, message: 'Refund already requested for this payment' });
    }

    // Create refund request
    const refundRequest = new RefundRequest({
      paymentId,
      paymentReference,
      customerName,
      customerEmail,
      amount,
      currency,
      reason,
      status: 'pending'
    });

    await refundRequest.save();

    // Send email notification to admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: 'iyonicorp@gmail.com',
      subject: 'New Refund Request - Paylang',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">New Refund Request</h2>
          <p>A new refund request has been submitted. Details below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Customer Name:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${customerEmail}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reference:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${paymentReference}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${currency} ${amount.toFixed(2)}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${reason}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="http://localhost:5173/admin" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Admin Dashboard</a>
          </p>
        </div>
      `
    };

    transporter.sendMail(adminMailOptions, (error, info) => {
      if (error) {
        console.error('Admin refund notification error details:', {
          error: error.message,
          code: error.code,
          command: error.command,
          stack: error.stack
        });
      } else {
        console.log('Admin refund notification sent:', info.response);
      }
    });

    res.json({ success: true, message: 'Refund request submitted successfully', refundRequest });
  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refund Request: Get all (for admin)
app.get('/api/refunds', async (req, res) => {
  try {
    const refunds = await RefundRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, refunds });
  } catch (error) {
    console.error('Fetch refunds error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refund Request: Get by payment ID
app.get('/api/refunds/payment/:paymentId', async (req, res) => {
  try {
    const refund = await RefundRequest.findOne({ paymentId: req.params.paymentId });
    res.json({ success: true, refund });
  } catch (error) {
    console.error('Fetch refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refund Request: Update status (approve/reject)
app.put('/api/refunds/:id', async (req, res) => {
  const { status, adminNotes, processedBy } = req.body;

  try {
    const refundRequest = await RefundRequest.findById(req.params.id);
    if (!refundRequest) {
      return res.status(404).json({ success: false, message: 'Refund request not found' });
    }

    refundRequest.status = status;
    refundRequest.adminNotes = adminNotes || '';
    refundRequest.processedBy = processedBy;
    refundRequest.processedAt = new Date();

    await refundRequest.save();

    // Send email notification to customer
    const subject = status === 'approved' 
      ? 'Refund Request Approved - Paylang' 
      : 'Refund Request Update - Paylang';
    
    const statusColor = status === 'approved' ? '#10b981' : '#ef4444';
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    const customerMailOptions = {
      from: process.env.EMAIL_USER,
      to: refundRequest.customerEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${statusColor};">Refund Request ${statusText}</h2>
          <p>Hello ${refundRequest.customerName},</p>
          <p>Your refund request has been <strong>${statusText.toLowerCase()}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reference:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${refundRequest.paymentReference}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${refundRequest.currency} ${refundRequest.amount.toFixed(2)}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: ${statusColor}; font-weight: bold;">${statusText}</td>
            </tr>
            ${adminNotes ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Notes:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${adminNotes}</td>
            </tr>
            ` : ''}
          </table>
          ${status === 'approved' ? `
          <p style="color: #10b981; font-weight: bold;">Your refund will be processed within 5-7 business days.</p>
          ` : ''}
          <p style="margin-top: 30px; color: #666;">Best regards,<br>Paylang Team</p>
        </div>
      `
    };

    transporter.sendMail(customerMailOptions, (error, info) => {
      if (error) {
        console.error('Customer refund update email error details:', {
          error: error.message,
          code: error.code,
          command: error.command,
          stack: error.stack
        });
      } else {
        console.log('Customer refund update email sent:', info.response);
      }
    });

    res.json({ success: true, message: `Refund request ${status}`, refundRequest });
  } catch (error) {
    console.error('Update refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refund Request: Get statistics
app.get('/api/refunds/stats', async (req, res) => {
  try {
    const stats = await RefundRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const result = {
      pending: { count: 0, totalAmount: 0 },
      approved: { count: 0, totalAmount: 0 },
      rejected: { count: 0, totalAmount: 0 }
    };

    stats.forEach(stat => {
      result[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
    });

    res.json({ success: true, stats: result });
  } catch (error) {
    console.error('Refund stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create Invoice
app.post('/api/admin/invoices', async (req, res) => {
  try {
    const { amount, description, maxUsage } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    // Cap maxUsage at 5
    const finalMaxUsage = Math.min(Math.max(parseInt(maxUsage) || 1, 1), 5);
    
    const invoice = new Invoice({ 
      amount, 
      description, 
      maxUsage: finalMaxUsage,
      usageCount: 0 
    });
    await invoice.save();
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all invoices
app.get('/api/admin/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public: Get invoice by ID
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public: Mark invoice as paid (after Paystack verification)
app.put('/api/invoices/:id/paid', async (req, res) => {
  try {
    const { reference } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    if (invoice.usageCount >= invoice.maxUsage) {
      return res.status(400).json({ success: false, message: 'Invoice usage limit reached' });
    }

    invoice.usageCount += 1;
    invoice.reference = reference;
    
    // If usage limit reached, mark as settled
    if (invoice.usageCount >= invoice.maxUsage) {
      invoice.status = 'settled';
    } else {
      invoice.status = 'paid';
    }
    
    await invoice.save();
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
