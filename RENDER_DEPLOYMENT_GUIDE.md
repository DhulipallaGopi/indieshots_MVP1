# IndieShots Render Deployment Guide

## Overview
This guide covers deploying IndieShots to Render, a modern cloud platform that's perfect for full-stack JavaScript applications. Your app is fully compatible with Render's deployment requirements.

## Why Render?
- **Automatic HTTPS** with custom domains
- **Free tier available** for testing
- **PostgreSQL database** included
- **Automatic builds** from GitHub
- **Simple environment variable management**
- **Built-in monitoring** and logging

## Prerequisites
- GitHub repository (push your code to GitHub)
- Render account (free at render.com)
- Firebase project configured
- OpenAI API key

## Quick Deployment Steps

### 1. Push Code to GitHub
```bash
# If not already done, initialize git and push to GitHub
git init
git add .
git commit -m "Initial commit for Render deployment"
git remote add origin https://github.com/yourusername/IndieShots.git
git push -u origin main
```

### 2. Create Render Web Service
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select your IndieShots repository

### 3. Configure Build Settings
Use these exact settings in Render:

**Basic Settings:**
- **Name**: `indieshots` (or your preferred name)
- **Root Directory**: Leave blank (uses root)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Node Version**: `18` (or leave auto-detect)

### 4. Set Environment Variables
Add these in Render's Environment tab:

**Required Variables:**
```
NODE_ENV=production
DATABASE_URL=<your-postgresql-url>
OPENAI_API_KEY=<your-openai-key>
JWT_SECRET=<generate-random-string>
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-firebase-app-id>
```

### 5. PostgreSQL Database Setup

**Option A: Render PostgreSQL (Recommended)**
1. In Render dashboard, click "New +" → "PostgreSQL"
2. Name: `indieshots-db`
3. Copy the "External Database URL"
4. Use this URL for `DATABASE_URL` environment variable

**Option B: Keep Existing Database**
- If you're already using Neon or another PostgreSQL provider, just use that connection string

### 6. Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Wait for "Live" status (usually 5-10 minutes)
4. Your app will be available at: `https://your-service-name.onrender.com`

## Firebase Configuration
After deployment, update Firebase with your Render domain:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication → Settings → Authorized domains**
4. Add your Render domains:
   - `your-service-name.onrender.com`
   - `www.your-service-name.onrender.com` (if using custom domain)

## Custom Domain (Optional)
1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain (e.g., `indieshots.com`)
4. Follow DNS configuration instructions
5. Update Firebase authorized domains with your custom domain

## Database Migration
After deployment, run database migrations:

```bash
# If you have existing data, export from current database
# Then run schema sync on new database
npm run db:push
```

## Environment-Specific Notes

**Build Optimization:**
Your app already has optimized build scripts that work perfectly with Render:
- Frontend: Vite build with production optimizations
- Backend: ESBuild bundling for fast startup
- Automatic static file serving

**Health Checks:**
Render automatically monitors your app health on port 5000 (as configured in your app).

## Troubleshooting

### Build Fails
- **Issue**: Out of memory during build
- **Solution**: Render provides sufficient memory for your build process

### App Won't Start
- **Issue**: Missing environment variables
- **Solution**: Double-check all environment variables are set correctly

### Database Connection Issues
- **Issue**: Cannot connect to database
- **Solution**: Verify DATABASE_URL format and database is accessible

### Firebase Auth Issues
- **Issue**: Authentication not working
- **Solution**: Ensure Render domain is added to Firebase authorized domains

## Deployment Commands Summary

**Local Testing:**
```bash
npm run build  # Test build locally
npm run start  # Test production build
```

**Database:**
```bash
npm run db:push  # Sync schema to new database
```

## Monitoring and Logs
- **Logs**: Available in Render dashboard under "Logs" tab
- **Metrics**: CPU, memory, and response time monitoring included
- **Alerts**: Set up notifications for downtime or errors

## Cost Estimates
- **Free Tier**: Perfect for testing and small projects
- **Starter Plan ($7/month)**: Production-ready with custom domains
- **PostgreSQL**: Free tier available, paid plans start at $7/month

## Advantages of Render vs Other Platforms

**vs Replit:**
- Better performance for production
- Custom domains included
- More reliable uptime
- Professional monitoring

**vs Vercel:**
- Built-in PostgreSQL database
- Better for full-stack apps
- No serverless limitations

**vs Heroku:**
- More modern platform
- Better free tier
- Faster deployments
- Built-in database options

## Next Steps After Deployment
1. Test all functionality in production
2. Set up monitoring and alerts
3. Configure custom domain if needed
4. Set up automatic deployments from GitHub
5. Configure backup strategy for database

Your IndieShots application is perfectly suited for Render deployment with its modern architecture and optimized build process!