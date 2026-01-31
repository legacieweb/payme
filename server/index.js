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

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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
          to: process.env.EMAIL_USER, // Admin email
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
          if (error) console.log('User email error:', error);
          else console.log('User email sent:', info.response);
        });

        transporter.sendMail(adminMailOptions, (error, info) => {
          if (error) console.log('Admin email error:', error);
          else console.log('Admin email sent:', info.response);
        });
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

// Admin password verification
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
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
      to: process.env.EMAIL_USER,
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
      if (error) console.log('Admin refund notification error:', error);
      else console.log('Admin refund notification sent:', info.response);
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
      if (error) console.log('Customer refund update email error:', error);
      else console.log('Customer refund update email sent:', info.response);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
