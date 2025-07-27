import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';

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
  hash: string;
}

interface PaymentResponse {
  success: boolean;
  paymentData: PaymentData;
  paymentUrl: string;
  error?: string;
}

export default function PaymentTest() {
  const [email, setEmail] = useState('test@indieshots.com');
  const [firstname, setFirstname] = useState('Fresh Test');
  const [phone, setPhone] = useState('9876543210');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState('');

  const generatePayment = async () => {
    if (!email || !firstname) {
      setError('Please enter email and name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstname, phone })
      });

      const data = await response.json();

      if (data.success) {
        setPaymentData(data);
      } else {
        setError(data.error || 'Failed to generate payment');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = () => {
    if (!paymentData) return;

    // Create form and submit to PayU
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.paymentUrl;
    form.target = '_blank';

    Object.entries(paymentData.paymentData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Fresh PayU Payment System Test
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            1 Rupee Subscription Test with Your Production Credentials
          </p>
        </div>

        {/* Credentials Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              PayU Credentials Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
              <div>Merchant Key: xXZDKp</div>
              <div>Salt: ezsXEEqchsA1ZLmHzn5BrLRl9snmckHn (32 chars)</div>
              <div>Client ID: f10a90386f9639dadfe839bc565d2e6d26cb5d88e1f49640b53960ed0d1364c8</div>
              <div>Amount: ₹1.00 (One Rupee)</div>
              <div>Gateway: https://secure.payu.in (Production)</div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Flow */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Payment Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Enter your details below</li>
              <li>Click "Generate Payment" to create PayU request</li>
              <li>Click "Pay ₹1" to submit to PayU gateway</li>
              <li>Complete payment on PayU (QR/UPI/Cards)</li>
              <li>Get upgraded to Pro tier automatically</li>
              <li>Receive email confirmation</li>
              <li>Redirect to dashboard</li>
            </ol>
          </CardContent>
        </Card>

        {/* Test Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="Your first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={generatePayment} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? 'Generating...' : 'Generate Payment Request'}
              </Button>
              
              {paymentData && (
                <Button 
                  onClick={submitPayment}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay ₹1 - Get Pro Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="mb-8 border-red-200 dark:border-red-800">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {paymentData && (
          <Card className="mb-8 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Payment Request Generated!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg font-mono text-sm">
                <div>Transaction ID: {paymentData.paymentData.txnid}</div>
                <div>Amount: ₹{paymentData.paymentData.amount}</div>
                <div>Hash: {paymentData.paymentData.hash.substr(0, 32)}...</div>
                <div>Payment URL: {paymentData.paymentUrl}</div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  Ready to submit to PayU production gateway!
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Click "Pay ₹1" above to test the real payment flow.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}