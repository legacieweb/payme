# Paylang Deployment Guide

## Overview
This guide will walk you through deploying Paylang to Render.com with both frontend and backend services.

## Prerequisites
- A Render.com account (free tier works fine)
- MongoDB Atlas account (free M0 cluster)
- Gmail account for sending emails (or other email service)

---

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Create a database user
4. Add your IP to the whitelist (or allow access from anywhere for Render)
5. Get your connection string - it should look like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/paylang?retryWrites=true&w=majority
   ```

---

## Step 2: Set Up Gmail for Email Notifications

### Option A: Using Gmail App Password (Recommended)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Note down:
   - Email: your-email@gmail.com
   - App Password: xxxx xxxx xxxx xxxx (16 characters)

### Option B: Using Other Email Services

If using another service, update the `EMAIL_SERVICE` value in render.yaml accordingly.

---

## Step 3: Deploy to Render

### Method 1: Using Render Dashboard (Easiest)

#### Deploy Backend First

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub/GitLab repository
4. Configure the service:
   - **Name**: paylang-backend
   - **Root Directory**: `server`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: Free

5. Add Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/paylang?retryWrites=true&w=majority
   JWT_SECRET=<generate a random string>
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CORS_ORIGINS=https://your-frontend-url.onrender.com
   NODE_ENV=production
   PORT=10000
   ```

6. Click "Create Web Service"
7. Wait for deployment to complete
8. Note the URL (e.g., `https://paylang-backend.onrender.com`)

#### Deploy Frontend

1. Click "New +" → "Static Site"
2. Connect the same repository
3. Configure:
   - **Name**: paylang-frontend
   - **Root Directory**: `.` (leave empty or use `./`)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   VITE_API_URL=https://paylang-backend.onrender.com/api
   ```

5. Click "Create Static Site"
6. Wait for deployment to complete

### Method 2: Using Blueprint (render.yaml)

1. Push the `render.yaml` file to your repository
2. Go to Render Dashboard → "Blueprints"
3. Click "New Blueprint Instance"
4. Select your repository
5. Render will automatically detect the `render.yaml` file
6. Configure the required environment variables when prompted:
   - `MONGODB_URI`
   - `EMAIL_USER`
   - `EMAIL_PASS`
7. Click "Apply"
8. Render will deploy both services automatically

---

## Step 4: Update CORS Origins

After both services are deployed, update the backend's `CORS_ORIGINS` environment variable:

```
CORS_ORIGINS=https://paylang-frontend.onrender.com,https://paylang.onrender.com
```

Replace with your actual frontend URL.

---

## Step 5: Verify Deployment

1. Visit your frontend URL
2. Test the following:
   - Homepage loads correctly
   - Payment form works
   - Receipt lookup works
   - Admin login works
   - Email notifications are sent

---

## Troubleshooting

### Backend Won't Start
- Check MongoDB connection string
- Verify all environment variables are set
- Check Render logs for errors

### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` is correct
- Check CORS_ORIGINS includes your frontend URL
- Check browser console for CORS errors

### Emails Not Sending
- Verify Gmail app password is correct
- Check if "Less secure app access" is enabled (if not using app password)
- Check Render logs for email errors

### Build Fails
- Ensure `vite.config.js` has the correct base path
- Check that all dependencies are in package.json
- Verify Node version compatibility

---

## Environment Variables Reference

### Backend (server/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `EMAIL_SERVICE` | Email provider (gmail, sendgrid, etc.) | Yes |
| `EMAIL_USER` | Email username/address | Yes |
| `EMAIL_PASS` | Email password or app password | Yes |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes |
| `NODE_ENV` | Environment (production) | Yes |
| `PORT` | Server port (usually 10000 on Render) | Yes |

### Frontend

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

---

## Post-Deployment

1. **Create Admin Account**: Use the admin registration endpoint or directly in MongoDB
2. **Test Payments**: Make a test payment to verify everything works
3. **Test Refunds**: Test the refund request and approval flow
4. **Monitor Logs**: Check Render dashboard for any errors

---

## Updating the Application

Simply push changes to your repository. Render will automatically redeploy both services.

---

## Custom Domain (Optional)

1. Go to your frontend service on Render
2. Click "Settings" → "Custom Domains"
3. Add your domain
4. Follow Render's DNS configuration instructions
5. Update `CORS_ORIGINS` in backend to include your custom domain
