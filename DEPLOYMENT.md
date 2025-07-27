# IndieShots Deployment Guide

## Quick Deployment Steps

1. **Click Deploy Button** in Replit sidebar
2. **Set Domain**: `indieshots.replit.app` 
3. **Configure Firebase** after deployment

## Firebase Domain Authorization

After deployment, add these domains to Firebase Console:

**Firebase Console → Authentication → Settings → Authorized domains:**
- `indieshots.replit.app`
- `www.indieshots.replit.app`

## Deployment Configuration

- **Target**: Autoscale deployment
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Port**: 5000 → 80 (configured in .replit)

## Environment Variables

Required for production:
- `DATABASE_URL` (PostgreSQL connection)
- `OPENAI_API_KEY` (AI processing)
- `VITE_FIREBASE_API_KEY` (Authentication)
- `VITE_FIREBASE_PROJECT_ID` (Authentication)
- `VITE_FIREBASE_APP_ID` (Authentication)

## Post-Deployment Testing

1. Visit `www.indieshots.replit.app`
2. Test email/password authentication
3. Test Google sign-in
4. Verify user creation in Firebase Console
5. Test script upload and processing

## Troubleshooting

If Google authentication fails:
- Check Firebase authorized domains
- Verify environment variables
- Check browser console for errors

If app doesn't load:
- Check deployment logs
- Verify build completed successfully
- Check database connection