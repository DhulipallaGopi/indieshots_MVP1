import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/components/auth/UltimateAuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, X, Crown, Zap, Image, Infinity, FileText, Camera, Headphones, Sparkles, ArrowRight, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';


export default function Upgrade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Handle payment status from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const message = urlParams.get('message');

    if (status && message) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (status === 'success') {
        toast({
          title: "Payment Successful!",
          description: decodeURIComponent(message),
        });
      } else if (status === 'cancelled') {
        toast({
          title: "Payment Cancelled",
          description: decodeURIComponent(message),
          variant: "destructive",
        });
      } else if (status === 'error') {
        toast({
          title: "Payment Failed",
          description: decodeURIComponent(message),
          variant: "destructive",
        });
      } else if (status === 'warning') {
        toast({
          title: "Payment Warning",
          description: decodeURIComponent(message),
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  // Get upgrade plans and current status
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['/api/upgrade/plans'],
    enabled: !!user
  });

  const { data: statusData } = useQuery({
    queryKey: ['/api/upgrade/status'],
    enabled: !!user
  });

  // Create fresh PayU payment session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !user?.displayName) {
        throw new Error('User information required');
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email,
          firstname: user.displayName.split(' ')[0] || 'User',
          phone: phoneNumber || '9999999999'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment creation failed');
      }

      return await response.json();
    },
    onError: (error: Error) => {
      console.error('Upgrade error:', error);
      
      // Handle different error cases with user-friendly messages
      if (error.message.includes('400:')) {
        const errorText = error.message.split('400: ')[1] || error.message;
        try {
          const errorData = JSON.parse(errorText);
          toast({
            title: "Account Status",
            description: errorData.error || "There was an issue with your upgrade request.",
            variant: "destructive",
          });
        } catch (e) {
          toast({
            title: "Account Status",
            description: errorText.includes('Already on pro tier') 
              ? "You already have a Pro account! You have unlimited access to all features."
              : errorText,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Payment Error",
          description: "Something went wrong while setting up your payment. Please try again or contact support.",
          variant: "destructive",
        });
      }
    },
    onSuccess: (data: any) => {
      console.log('Fresh PayU payment response:', data);
      
      if (data.success && data.paymentUrl) {
        console.log('Creating PayU form submission:', data.paymentUrl);
        
        try {
          // Create form and submit to PayU
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.paymentUrl;
          
          // Add all PayU parameters
          Object.entries(data.paymentData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
            
            console.log('Adding field:', key, '=', String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value));
          });
          
          // Verify required fields are present
          const requiredFields = ['key', 'amount', 'email', 'hash', 'txnid'];
          const missingFields = requiredFields.filter(field => !data.paymentData[field]);
          
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
          }
          
          document.body.appendChild(form);
          console.log('Submitting PayU form to:', form.action);
          console.log('Transaction ID:', data.paymentData.txnid);
          
          // Show loading message
          toast({
            title: "Redirecting to Payment Gateway",
            description: "Please wait while we redirect you to PayU...",
          });
          
          form.submit();
          
        } catch (formError) {
          console.error('Form creation error:', formError);
          toast({
            title: "Payment Form Error",
            description: "Failed to create payment form. Please try again.",
            variant: "destructive",
          });
        }
      } else if (data.checkoutUrl || data.redirectUrl) {
        const url = data.redirectUrl || data.checkoutUrl;
        console.log('Redirecting to checkout URL:', url);
        window.location.href = url;
      } else if (data.error) {
        console.error('Payment error from server:', data.error);
        
        toast({
          title: "Payment Error",
          description: data.message || data.error,
          variant: "destructive",
        });
      } else {
        console.error('Unknown payment response:', data);
        toast({
          title: "Payment System Error",
          description: "Unable to process payment. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your account",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Log upgrade attempt for debugging
      console.log('Starting upgrade process for user:', user.email);
      
      await createCheckoutMutation.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-96 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const plans = (plansData as any)?.plans || [];
  const currentTier = (plansData as any)?.currentTier || 'free';
  const usage = (plansData as any)?.usage || {};

  // If user is already on pro tier, show pro member status instead of upgrade options
  if (currentTier === 'pro') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-700">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 relative">
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-pulse"></div>
              <Crown className="h-16 w-16 text-amber-500 mx-auto drop-shadow-lg" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              You're Already a Pro Member!
            </CardTitle>
            <CardDescription className="text-lg text-amber-800 dark:text-amber-200 mt-2">
              You have unlimited access to all IndieShots features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-amber-900/10 rounded-lg">
                <FileText className="h-8 w-8 text-amber-600 mb-2" />
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">Unlimited Pages</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">Process scripts of any length</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-amber-900/10 rounded-lg">
                <Zap className="h-8 w-8 text-amber-600 mb-2" />
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">Unlimited Shots</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">Generate detailed shot lists</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-amber-900/10 rounded-lg">
                <Camera className="h-8 w-8 text-amber-600 mb-2" />
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">AI Storyboards</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">Create visual storyboards</p>
              </div>
            </div>
            <div className="pt-4">
              <Button 
                onClick={() => window.location.href = '/dashboard'} 
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Unlock the full power of IndieShots for your filmmaking projects
        </p>
        
        {/* Fixed Pricing Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
            Fixed Pricing - ₹999/month
          </h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2">₹999</div>
            <p className="text-sm text-blue-600 dark:text-blue-300">per month</p>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
            Secure payment processing through PayU India. All transactions are processed in Indian Rupees (₹).
          </p>
        </div>
      </div>

      {/* Current Usage Display */}
      {currentTier === 'free' && (
        <Card className="mb-8 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2 text-gray-700 dark:text-gray-300">
                  <span>Pages Used</span>
                  <span>{usage.pagesUsed || 0}/{usage.totalPages || 10} pages</span>
                </div>
                <Progress 
                  value={usage.totalPages ? (usage.pagesUsed / usage.totalPages) * 100 : 0} 
                  className="h-2"
                />
              </div>
              {(statusData as any)?.needsUpgrade?.forMorePages && (
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  You're approaching your page limit. Upgrade to Pro for unlimited pages.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {plans.map((plan: any) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''} ${plan.current ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white text-amber-600 dark:bg-gray-800 dark:text-amber-400 border border-amber-300 dark:border-amber-600">
                Most Popular
              </Badge>
            )}
            
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.id === 'pro' ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {plan.id === 'pro' ? (
                      <div className="space-y-2">
                        <span className="text-3xl font-bold">₹999</span>
                        <span className="text-muted-foreground text-sm block">/month</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          Free
                        </span>
                      </>
                    )}
                  </CardDescription>
                </div>
                {plan.current && (
                  <Badge variant="success" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Current Plan
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Features Included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-muted-foreground">Limitations:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 flex-shrink-0" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 space-y-4">
                  {plan.id === 'pro' && currentTier !== 'pro' && (
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for payment processing and order confirmation
                      </p>
                    </div>
                  )}
                  
                  {plan.current ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : plan.id === 'pro' && currentTier !== 'pro' ? (
                    <Button 
                      onClick={handleUpgrade}
                      disabled={isProcessing || !phoneNumber.trim()}
                      className="w-full"
                    >
                      {isProcessing ? 'Processing...' : 'Upgrade to Pro'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* FAQ Section */}
      <div className="mt-12 text-center">
        <h3 className="text-xl font-semibold mb-4">Questions?</h3>
        <p className="text-muted-foreground mb-4">
          Need help choosing the right plan? We're here to help.
        </p>
        <Button variant="outline" onClick={() => window.location.href = 'mailto:indieshots@theindierise.com'}>
          Get help
        </Button>
      </div>
    </div>
  );
}