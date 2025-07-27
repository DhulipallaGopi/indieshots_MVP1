# PayU Payment Gateway Integration Guide

## Overview

PayU is a leading payment gateway provider focused on emerging markets, particularly strong in India, Latin America, and Central Europe. This document explores PayU's API capabilities for integration into IndieShots.

## Key Benefits for IndieShots

- **Indian Market Focus**: Ideal for targeting Indian filmmakers and content creators
- **Local Payment Methods**: UPI, NetBanking, Wallets, Credit/Debit cards
- **Competitive Pricing**: Lower transaction fees compared to international gateways
- **Regulatory Compliance**: Built for Indian payment regulations and RBI guidelines

## API Integration Architecture

### 1. PayU API Endpoints

**Base URLs:**
- Sandbox: `https://test.payu.in`
- Production: `https://secure.payu.in`

**Key Endpoints:**
- Payment Initiation: `/merchant/postservice?form=2`
- Payment Status: `/merchant/postservice.php?form=2`
- Refund: `/merchant/postservice.php?form=2`

### 2. Authentication & Security

```javascript
// Required Parameters for Authentication
const payuConfig = {
  merchantKey: process.env.PAYU_MERCHANT_KEY,
  merchantSalt: process.env.PAYU_MERCHANT_SALT,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'test'
};

// Hash Calculation for Payment
function generatePaymentHash(params) {
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${payuConfig.merchantSalt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}
```

### 3. Payment Flow Implementation

```javascript
// 1. Initialize Payment
app.post('/api/payu/initiate-payment', async (req, res) => {
  const {
    amount,
    productinfo,
    firstname,
    email,
    phone,
    tier = 'pro'
  } = req.body;

  const txnid = `INDIE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const paymentParams = {
    key: payuConfig.merchantKey,
    txnid,
    amount,
    productinfo: `IndieShots ${tier} Subscription`,
    firstname,
    email,
    phone,
    surl: `${process.env.BASE_URL}/api/payu/success`,
    furl: `${process.env.BASE_URL}/api/payu/failure`,
    service_provider: 'payu_paisa'
  };

  paymentParams.hash = generatePaymentHash(paymentParams);

  res.json({
    paymentUrl: `${getPayUBaseUrl()}/merchant/postservice?form=2`,
    params: paymentParams
  });
});

// 2. Handle Success Callback
app.post('/api/payu/success', async (req, res) => {
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    mihpayid,
    status,
    hash
  } = req.body;

  // Verify hash for security
  const calculatedHash = generateResponseHash(req.body);
  
  if (hash === calculatedHash && status === 'success') {
    // Update user to pro tier
    await upgradeUserToPro(email, txnid);
    
    res.redirect('/dashboard?payment=success');
  } else {
    res.redirect('/upgrade?payment=failed');
  }
});
```

### 4. Subscription Management

```javascript
// PayU doesn't natively support subscriptions like Stripe
// Implementation requires custom recurring payment logic

class PayUSubscriptionManager {
  async createSubscription(userEmail, amount, billingCycle = 'monthly') {
    // Store subscription in database
    const subscription = await db.subscriptions.create({
      userEmail,
      amount,
      billingCycle,
      status: 'active',
      nextBillingDate: this.calculateNextBilling(billingCycle),
      paymentMethod: 'payu'
    });

    // Schedule next payment
    await this.scheduleNextPayment(subscription);
    
    return subscription;
  }

  async processRecurringPayment(subscriptionId) {
    const subscription = await db.subscriptions.findById(subscriptionId);
    
    // Send payment reminder email
    await this.sendPaymentReminder(subscription.userEmail);
    
    // For automatic payments, use PayU's stored card feature
    // Or redirect user to payment page
  }
}
```

## Payment Methods Supported

### 1. Credit/Debit Cards
- Visa, Mastercard, RuPay, Maestro
- Support for international cards
- EMI options available

### 2. Net Banking
- 50+ Indian banks supported
- Real-time bank selection
- Instant payment confirmation

### 3. UPI (Unified Payments Interface)
- All UPI apps supported (PhonePe, Google Pay, Paytm, etc.)
- QR code generation
- Intent-based payments

### 4. Digital Wallets
- Paytm, MobiKwik, Airtel Money
- Amazon Pay, JioMoney
- Instant wallet payments

### 5. Cash Cards & Gift Cards
- ITZ Cash, Ola Money
- Gift voucher support

## Integration Steps for IndieShots

### Phase 1: Basic Setup
1. **Account Creation**
   - Register at PayU merchant portal
   - Complete KYC verification
   - Obtain merchant credentials

2. **Environment Setup**
   ```bash
   # Environment Variables
   PAYU_MERCHANT_KEY=your_merchant_key
   PAYU_MERCHANT_SALT=your_merchant_salt
   PAYU_BASE_URL=https://test.payu.in  # or production URL
   ```

3. **Basic Integration**
   - Implement payment initiation
   - Handle success/failure callbacks
   - Add hash verification for security

### Phase 2: Advanced Features
1. **Multi-Currency Support**
   - INR (primary)
   - USD for international users
   - Automatic currency conversion

2. **Payment Analytics**
   - Transaction reporting
   - Success rate monitoring
   - Revenue analytics

3. **Subscription Logic**
   - Custom recurring payment system
   - Email reminders
   - Grace period handling

### Phase 3: Optimization
1. **User Experience**
   - Seamless checkout flow
   - Mobile-optimized payments
   - Multiple payment retry options

2. **Advanced Security**
   - Fraud detection
   - Risk scoring
   - PCI compliance

## Code Implementation Examples

### Frontend Integration

```javascript
// PayU Payment Component
const PayUPayment = ({ amount, userDetails }) => {
  const initiatePayment = async () => {
    const response = await fetch('/api/payu/initiate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        productinfo: 'IndieShots Pro Subscription',
        ...userDetails
      })
    });

    const { paymentUrl, params } = await response.json();

    // Create form and submit to PayU
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentUrl;

    Object.keys(params).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <Button onClick={initiatePayment}>
      Pay with PayU
    </Button>
  );
};
```

### Backend Webhook Handling

```javascript
// Webhook verification and processing
app.post('/api/payu/webhook', express.raw({type: 'application/x-www-form-urlencoded'}), async (req, res) => {
  const payuResponse = querystring.parse(req.body.toString());
  
  // Verify webhook authenticity
  const isValidWebhook = verifyPayUWebhook(payuResponse);
  
  if (isValidWebhook) {
    await processPaymentUpdate(payuResponse);
    res.status(200).send('OK');
  } else {
    res.status(400).send('Invalid webhook');
  }
});
```

## Testing Strategy

### 1. Test Credentials
```javascript
const testConfig = {
  merchantKey: 'gtKFFx',  // PayU test merchant key
  merchantSalt: 'eCwWELxi',  // PayU test salt
  baseUrl: 'https://test.payu.in'
};
```

### 2. Test Cards
- **Success**: 5123456789012346
- **Failure**: 5123456789012347
- **Test UPI**: success@payu (for success scenarios)

### 3. Test Scenarios
- Successful payments
- Failed payments
- Timeout scenarios
- Webhook delivery
- Refund processing

## Cost Analysis

### Transaction Fees
- **Domestic Cards**: 1.9% + GST
- **Net Banking**: ₹10 + GST
- **UPI**: 0.9% + GST (capped at ₹1000)
- **Wallets**: 1.9% + GST

### Setup Costs
- **Integration**: Free
- **Setup Fee**: ₹10,000 (one-time)
- **Annual Maintenance**: ₹12,000

## Comparison with Stripe

| Feature | PayU | Stripe |
|---------|------|--------|
| Indian Market | ✅ Optimized | ⚠️ Limited |
| UPI Support | ✅ Native | ❌ No |
| NetBanking | ✅ 50+ banks | ❌ No |
| International | ⚠️ Limited | ✅ Global |
| API Quality | ⚠️ Good | ✅ Excellent |
| Documentation | ⚠️ Adequate | ✅ Superior |
| Developer Tools | ⚠️ Basic | ✅ Advanced |

## Recommended Implementation Plan

### Immediate (Week 1-2)
1. Set up PayU test account
2. Implement basic payment flow
3. Test with sandbox credentials
4. Create payment success/failure pages

### Short-term (Week 3-4)
1. Implement webhook handling
2. Add payment status verification
3. Create subscription management logic
4. Test with various payment methods

### Long-term (Month 2-3)
1. Implement payment analytics
2. Add fraud detection
3. Optimize mobile experience
4. Go live with production credentials

## Security Considerations

### 1. Hash Verification
Always verify payment hashes to prevent tampering:

```javascript
function verifyPaymentHash(response) {
  const { hash, ...params } = response;
  const calculatedHash = generateResponseHash(params);
  return hash === calculatedHash;
}
```

### 2. HTTPS Requirements
- All PayU interactions must use HTTPS
- Webhook endpoints must be SSL certified
- PCI compliance for card data handling

### 3. Data Protection
- Never store card details
- Encrypt sensitive payment data
- Implement proper session management

## Conclusion

PayU offers a robust solution for Indian market penetration with strong local payment method support. While it requires more custom implementation compared to Stripe, the cost savings and local market advantages make it valuable for IndieShots' Indian user base.

**Recommendation**: Implement PayU as a secondary payment option alongside Stripe, allowing users to choose their preferred payment method based on their location and payment preferences.