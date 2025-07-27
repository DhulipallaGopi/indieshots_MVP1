# Production Payment System Setup Guide

## Overview
Your IndieShots application now has a complete production-ready payment system with:
- ✅ **PayU Integration** (India-focused) with production/test mode switching
- ✅ **Stripe Integration** (Global) with subscription management
- ✅ **Email Notifications** with payment confirmations and welcome messages
- ✅ **Webhook Verification** for secure payment processing
- ✅ **Automatic Tier Upgrades** upon successful payment
- ✅ **Payment History** and subscription management

## Environment Variables Required

### Core Application
```env
NODE_ENV=production
BASE_URL=https://your-domain.com
DATABASE_URL=your_postgresql_connection_string
```

### PayU Configuration (India)
```env
PAYU_MERCHANT_KEY=your_production_merchant_key
PAYU_MERCHANT_SALT=your_production_merchant_salt
PAYU_CLIENT_ID=your_payu_client_id
PAYU_CLIENT_SECRET=your_payu_client_secret
```

### Stripe Configuration (Global)
```env
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Email Service (Choose One)
```env
# Option 1: SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key

# Option 2: SMTP (Gmail, etc.)
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Email Configuration
```env
FROM_EMAIL=noreply@indieshots.com
FROM_NAME=IndieShots
ADMIN_EMAIL=admin@indieshots.com
```

## 1. PayU Production Setup

### Get Production Credentials
1. **Sign up at PayU**: [https://www.payu.in/](https://www.payu.in/)
2. **Complete KYC verification**
3. **Get production credentials**:
   - Merchant Key
   - Merchant Salt
   - Client ID & Secret

### Configure Webhooks
- **Success URL**: `https://your-domain.com/api/webhooks/payu`
- **Failure URL**: `https://your-domain.com/api/webhooks/payu`

## 2. Stripe Production Setup

### Create Stripe Account
1. **Sign up at Stripe**: [https://stripe.com](https://stripe.com)
2. **Activate your account** with business verification
3. **Get API keys** from Dashboard → Developers → API Keys

### Create Products & Prices
```javascript
// Run this in Stripe CLI or Dashboard
stripe products create \
  --name "IndieShots Pro Plan" \
  --description "Unlimited pages, unlimited shots, AI storyboards"

stripe prices create \
  --unit-amount 2900 \
  --currency usd \
  --recurring interval=month \
  --product prod_XXXXXXXXXX
```

### Configure Webhooks
1. **Go to**: Dashboard → Developers → Webhooks
2. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
3. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## 3. Email Service Setup

### Option A: SendGrid (Recommended)
1. **Create account**: [https://sendgrid.com](https://sendgrid.com)
2. **Verify sender identity**
3. **Create API key** with Mail Send permissions
4. **Set environment variables**

### Option B: SMTP (Gmail/Custom)
1. **Enable 2FA** on your Google account
2. **Generate app password** in Google Account settings
3. **Set SMTP environment variables**

## 4. Database Schema Updates

The payment system requires these additional fields in the users table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS payu_transaction_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS payu_txn_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
```

Run: `npm run db:push` to apply schema changes.

## 5. Frontend Updates Required

### Update Payment Method Selection
The app now supports automatic payment method detection:
- **INR currency** → PayU (India)
- **Other currencies** → Stripe (Global)

### Payment Flow
1. User clicks "Upgrade to Pro"
2. System detects best payment method
3. Creates payment session
4. Redirects to payment gateway
5. Processes webhook after payment
6. Sends confirmation email
7. Upgrades user tier

## 6. Testing Payment Integration

### Test with Stripe
```javascript
// Use Stripe test cards
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

### Test with PayU
Use PayU test environment with test credentials (already configured).

## 7. Deployment to Render

### Environment Variables in Render Dashboard
1. Go to your service settings
2. Add all environment variables listed above
3. Deploy the updated code

### Domain Configuration
1. **Update BASE_URL** to your Render domain
2. **Configure webhook URLs** in payment gateways
3. **Update Firebase authorized domains**

## 8. Monitoring & Debugging

### Payment Logs
- All payment events are logged to console
- Success/failure notifications sent via email
- Payment history stored in database

### Health Checks
- **Endpoint**: `/health`
- **Payment Config**: `/api/env/payment-config`
- **User Status**: `/api/auth/user`

## 9. Security Features

### Webhook Verification
- ✅ PayU hash verification
- ✅ Stripe signature verification
- ✅ Duplicate payment prevention

### Data Protection
- ✅ No sensitive payment data stored
- ✅ PCI compliance through payment gateways
- ✅ Encrypted environment variables

## 10. Customer Support

### Payment Issues
Users experiencing payment issues can:
1. **Check payment history**: `/api/payments/invoices`
2. **Contact support**: Via integrated contact form
3. **Retry payment**: Automatic retry mechanisms

### Subscription Management
Users can:
- **Cancel subscription**: `/api/payments/cancel-subscription`
- **View payment history**: Dashboard → Settings
- **Update payment method**: Through Stripe customer portal

## Files Added/Modified

### New Services
- `server/services/stripeService.ts` - Stripe integration
- `server/services/emailService.ts` - Email notifications
- `server/services/payuService.ts` - Updated with production mode

### New Routes
- `server/routes/stripe.ts` - Stripe-specific endpoints
- `server/routes/webhooks.ts` - Unified webhook handling
- `server/routes/payments.ts` - Payment method selection
- `server/routes/payment-success.ts` - Success/cancel pages
- `server/routes/environment-variables.ts` - Config endpoint

### Database Extensions
- `server/storage-extensions.ts` - Payment-related storage methods

### Documentation
- `PRODUCTION_PAYMENT_SETUP.md` - This comprehensive guide

## Support & Maintenance

### Regular Tasks
- **Monitor webhook deliveries** monthly
- **Review payment failure rates** weekly
- **Update API keys** before expiration
- **Test payment flows** after any changes

### Troubleshooting
- **Payment failures**: Check webhook logs
- **Email delivery**: Verify SMTP/SendGrid status
- **Tier upgrades**: Check database user tier updates

Your payment system is now production-ready! 🚀