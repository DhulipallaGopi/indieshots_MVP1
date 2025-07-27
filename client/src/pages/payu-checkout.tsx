import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  IndianRupee,
  ArrowRight,
  Lock,
  Clock,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface PaymentFormData {
  firstname: string;
  email: string;
  phone: string;
  amount: number;
}

export default function PayUCheckout() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    firstname: '',
    email: '',
    phone: '',
    amount: 29
  });

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  // Pre-fill form with user data if available
  React.useEffect(() => {
    if (user && typeof user === 'object' && 'email' in user) {
      setFormData(prev => ({
        ...prev,
        firstname: ('displayName' in user ? user.displayName as string : '') || (user.email as string)?.split('@')[0] || '',
        email: user.email as string || ''
      }));
    }
  }, [user]);

  const handleInputChange = (field: keyof PaymentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePayment = async () => {
    if (!user) {
      setLocation('/auth?redirect=payu-checkout');
      return;
    }

    if (!formData.firstname || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await apiRequest('POST', '/api/payu/create-payment', {
        amount: formData.amount,
        tier: 'pro',
        customerInfo: {
          firstname: formData.firstname,
          email: formData.email,
          phone: formData.phone
        }
      });

      const data = await response.json();
      if (data.success && data.redirectUrl) {
        // Direct redirect to PayU payment gateway
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.error || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Payment initiation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const features = [
    'Unlimited script uploads',
    'Advanced AI shot generation',
    'Storyboard creation',
    'Premium support',
    'Export to professional formats',
    'Priority processing'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upgrade to IndieShots Pro
          </h1>
          <p className="text-gray-600">
            Complete your payment securely through PayU gateway
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="firstname">Full Name *</Label>
                    <Input
                      id="firstname"
                      value={formData.firstname}
                      onChange={(e) => handleInputChange('firstname', e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Amount */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" />
                  Payment Amount
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">IndieShots Pro Subscription</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{formData.amount}
                      </div>
                      <div className="text-sm text-gray-500">One-time payment</div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* PayU Security Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secured by PayU Payment Gateway</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span>SSL encrypted and PCI compliant</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>Instant activation after payment</span>
                </div>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing || !formData.firstname || !formData.email}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Pay ₹{formData.amount} via PayU</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By clicking "Pay via PayU", you agree to our terms of service and will be redirected to PayU's secure payment gateway.
              </p>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                What's Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  Pro Features
                </Badge>
                
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Payment Methods Supported:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>• Credit/Debit Cards</div>
                    <div>• Net Banking</div>
                    <div>• UPI Payments</div>
                    <div>• Digital Wallets</div>
                    <div>• EMI Options</div>
                    <div>• International Cards</div>
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm text-blue-800 mb-2">
                    Secure Payment Process
                  </h4>
                  <div className="space-y-2 text-xs text-blue-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Click "Pay via PayU" to create payment session</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Redirected to PayU secure checkout page</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Complete payment with your preferred method</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Instant account upgrade upon success</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Need help? Contact us at{' '}
            <a 
              href="mailto:indieshots@theindierise.com" 
              className="text-purple-600 hover:underline"
            >
              indieshots@theindierise.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}