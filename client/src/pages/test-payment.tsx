import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, CreditCard, TestTube, Zap, Shield, Users, Lock } from 'lucide-react';
import { useAuth } from '@/components/auth/UltimateAuthProvider';

export default function TestPayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTier, setCurrentTier] = useState<'free' | 'pro'>('free');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, refreshUserData } = useAuth();

  // Check if user is authorized to access test payment system
  if (user?.email !== 'premium@demo.com') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-xl text-red-700">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-600 mb-4">
              This test payment system is restricted to authorized development users only.
            </p>
            <p className="text-sm text-red-500 mb-6">
              Contact support at indieshots@theindierise.com if you need access to this testing functionality.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/dashboard')}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTierSwitch = async (tier: 'free' | 'pro') => {
    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update tier via API
      const response = await apiRequest('POST', '/api/test/switch-tier', { tier });
      
      setCurrentTier(tier);
      toast({
        title: tier === 'pro' ? 'Upgraded to Pro!' : 'Switched to Free Tier',
        description: tier === 'pro' 
          ? 'You now have unlimited access to all features. Refreshing your account data...'
          : 'You are now on the free tier with limited features. Refreshing your account data...',
      });

      // Refresh user data from database to get updated tier
      await refreshUserData();
      
      // Show success message
      setTimeout(() => {
        toast({
          title: 'Account Updated',
          description: `Your account has been successfully updated to ${tier} tier.`,
        });
      }, 1000);
      
    } catch (error) {
      console.error('Tier switch error:', error);
      toast({
        title: 'Tier Switch Failed',
        description: 'Unable to switch tiers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayUExploration = () => {
    window.open('https://docs.payu.in/docs/payment-gateway-integration', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            <TestTube className="w-4 h-4 mr-2" />
            Testing Environment
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Payment Testing Portal
          </h1>
          <p className="text-lg text-gray-600">
            Test free and pro tier functionality without real payments
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Tier Card */}
          <Card className={`relative ${currentTier === 'free' ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Free Tier</CardTitle>
                {currentTier === 'free' && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              <p className="text-gray-600">Perfect for getting started</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold">$0<span className="text-lg font-normal">/month</span></div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">10 pages per month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">5 shots per scene</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Basic shot lists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-gray-400">✕</span>
                    <span className="text-sm text-gray-400">No storyboards</span>
                  </div>
                </div>

                <Button 
                  variant={currentTier === 'free' ? 'secondary' : 'outline'}
                  className="w-full"
                  onClick={() => handleTierSwitch('free')}
                  disabled={isProcessing || currentTier === 'free'}
                >
                  {currentTier === 'free' ? 'Current Plan' : 'Switch to Free'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier Card */}
          <Card className={`relative ${currentTier === 'pro' ? 'ring-2 ring-purple-500' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  Pro Tier
                  <Zap className="w-5 h-5 text-yellow-500" />
                </CardTitle>
                {currentTier === 'pro' && (
                  <Badge variant="default" className="bg-purple-600">Current</Badge>
                )}
              </div>
              <p className="text-gray-600">For professional filmmakers</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold">₹999<span className="text-lg font-normal">/month (~$12 USD)</span></div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Unlimited pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Unlimited shots</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Advanced shot lists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">AI-generated storyboards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>

                <Button 
                  variant={currentTier === 'pro' ? 'secondary' : 'default'}
                  className="w-full"
                  onClick={() => handleTierSwitch('pro')}
                  disabled={isProcessing || currentTier === 'pro'}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Payment Gateway Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Payment Gateway Integration
            </CardTitle>
            <p className="text-gray-600">
              Explore payment options for production deployment
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Current Integration</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Stripe (Configured)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">International payments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Subscription management</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">PayU Integration (Planned)</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Indian market focus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Local payment methods</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">UPI, NetBanking, Cards</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handlePayUExploration}
                >
                  Explore PayU API
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Actions */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/dashboard')}
            >
              Test Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/upload')}
            >
              Test Upload (Free vs Pro)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/projects')}
            >
              Test Projects
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            Current tier: <Badge variant="secondary">{currentTier}</Badge>
            • Use the tier switch above to test different functionality levels
          </p>
        </div>
      </div>
    </div>
  );
}