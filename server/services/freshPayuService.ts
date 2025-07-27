import crypto from 'crypto';

/**
 * Fresh PayU Service - Built from Scratch
 * Using your exact production credentials for ₹999 subscription
 */

interface PayUConfig {
  merchantKey: string;
  merchantSalt: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

interface PaymentData {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  curl?: string; // Cancel URL (optional)
  hash: string;
}

export class FreshPayUService {
  private config: PayUConfig;

  constructor() {
    // Your exact PayU production credentials
    this.config = {
      merchantKey: 'xXZDKp',
      merchantSalt: 'ezsXEEqchsA1ZLmHzn5BrLRl9snmckHn',
      clientId: 'f10a90386f9639dadfe839bc565d2e6d26cb5d88e1f49640b53960ed0d1364c8',
      clientSecret: 'd2d92cbf109d9efe6430ec8399c5ffc89287b5fcfe6e8f27713a0fc17f3b74ec',
      baseUrl: 'https://secure.payu.in'
    };

    console.log('Fresh PayU Service initialized');
    console.log(`Merchant Key: ${this.config.merchantKey}`);
    console.log(`Production Gateway: ${this.config.baseUrl}`);
  }

  /**
   * Generate PayU hash using official formula
   * Formula: sha512(key|txnid|amount|productinfo|firstname|email|||||||||||salt)
   */
  private generateHash(data: Omit<PaymentData, 'hash'>): string {
    // PayU official hash formula with empty UDF fields
    const hashString = `${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|||||||||||${this.config.merchantSalt}`;
    
    console.log('Hash generation:');
    console.log(`Hash string: ${hashString}`);
    
    const hash = crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
    console.log(`Generated hash: ${hash}`);
    
    return hash;
  }

  /**
   * Create payment request for ₹999 subscription
   */
  createPaymentRequest(email: string, firstname: string, phone: string): PaymentData {
    const txnid = `INDIE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const domain = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    const paymentData: Omit<PaymentData, 'hash'> = {
      key: this.config.merchantKey,
      txnid: txnid,
      amount: '999.00', // ₹999 subscription (updated from ₹1)
      productinfo: 'IndieShots Pro Subscription',
      firstname: firstname,
      email: email,
      phone: phone,
      surl: `${domain}/api/payment/success`,
      furl: `${domain}/api/payment/failure`,
      curl: `${domain}/api/payment/cancel` // Cancel URL for when user closes payment gateway
    };

    const hash = this.generateHash(paymentData);

    return {
      ...paymentData,
      hash: hash
    };
  }

  /**
   * Verify payment response hash
   */
  verifyPaymentResponse(response: any): boolean {
    try {
      const { status, firstname, amount, txnid, email, productinfo, hash } = response;
      
      // Reverse hash for verification
      const verificationString = `${this.config.merchantSalt}|${status}||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${this.config.merchantKey}`;
      const expectedHash = crypto.createHash('sha512').update(verificationString, 'utf8').digest('hex');
      
      console.log('Hash verification:');
      console.log(`Expected: ${expectedHash}`);
      console.log(`Received: ${hash}`);
      
      return expectedHash === hash;
    } catch (error) {
      console.error('Hash verification error:', error);
      return false;
    }
  }

  getPaymentUrl(): string {
    return `${this.config.baseUrl}/_payment`;
  }
}

export const freshPayuService = new FreshPayUService();