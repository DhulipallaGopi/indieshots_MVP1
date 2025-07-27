# PayU Credential Update Required

## Your New PayU Credentials:
- **Merchant Key**: `xXZDKp` ✅ (already correct)
- **Merchant Salt**: `ezsXEEqchsA1ZLmHzn5BrLRl9snmckHn` ❌ (needs update)

## Current Replit Secrets:
- **PAYU_MERCHANT_KEY**: `xXZDKp` ✅ (correct)
- **PAYU_MERCHANT_SALT**: `PEvebkhtqZbQ4VhCV7W2IZCdgnGGaa2B` ❌ (old value)

## Action Required:
You need to update the `PAYU_MERCHANT_SALT` environment variable in your Replit secrets:

1. Go to your Replit project
2. Click on "Secrets" (lock icon) in the left sidebar
3. Find `PAYU_MERCHANT_SALT`
4. Update its value to: `ezsXEEqchsA1ZLmHzn5BrLRl9snmckHn`
5. Save the changes

After updating the secret, the PayU integration will use your new merchant salt for hash generation.