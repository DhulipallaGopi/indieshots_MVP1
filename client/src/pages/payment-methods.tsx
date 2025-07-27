import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Smartphone, 
  Banknote,
  Shield,
  CheckCircle,
  Globe,
  MapPin,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/components/auth/UltimateAuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  currencies: string[];
  regions: string[];
  logo: string;
}

export default function PaymentMethods() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('auto');

  // Get available payment methods
  const { data: methodsData, isLoading } = useQuery({
    queryKey: ['/api/payments/methods'],
    enabled: !!user
  });

  // Get payment configuration
  const { data: configData } = useQuery({
    queryKey: ['/api/env/payment-config'],
  });

  // Create payment session mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: { method: string; amount: number; currency: string }) => {
      const response = await apiRequest('POST', '/api/payments/create-session', data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Redirect to payment gateway
        if (data.url) {
          window.location.href = data.url; // Stripe
        } else if (data.redirectUrl) {
          window.location.href = data.redirectUrl; // PayU
        }
      } else {
        toast({
          title: "Payment Error",
          description: data.error || "Failed to create payment session",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Payment creation failed:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to create payment session. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(null);
    }
  });

  const handlePayment = async (method: string, amount: number, currency: string) => {
    if (!user) {
      setLocation('/auth?redirect=upgrade');
      return;
    }

    setIsProcessing(method);
    
    createPaymentMutation.mutate({
      method,
      amount,
      currency,
    });
  };

  const methods = methodsData?.methods || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Payment Method</h1>
          <p className="text-gray-600">Select the payment method that works best for your region</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {methods.map((method: PaymentMethod) => (
            <Card key={method.id} className="relative border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    {method.id === 'stripe' && <CreditCard className="h-6 w-6 text-blue-600" />}
                    {method.id === 'payu' && <Smartphone className="h-6 w-6 text-orange-600" />}
                    {method.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {method.regions.includes('global') ? (
                      <><Globe className="h-3 w-3 mr-1" />Global</>
                    ) : (
                      <><MapPin className="h-3 w-3 mr-1" />{method.regions[0]}</>
                    )}
                  </Badge>
                </div>
                <CardDescription>{method.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Supported Currency:</h4>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      INR
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        IndieShots Pro - INR
                      </div>
                      <div className="text-sm text-gray-600">
                        ₹999/month
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handlePayment(
                        method.id, 
                        999,
                        'inr'
                      )}
                      disabled={!!isProcessing}
                      className="min-w-[100px]"
                    >
                      {isProcessing === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Pay Now <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-green-600 mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <span>Secure payment processing</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Pay Section */}
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
              <Banknote className="h-5 w-5" />
              Quick Payment (Auto-Detect)
            </h3>
            <p className="text-gray-600 mb-4">
              Let us automatically choose the best payment method for your region
            </p>
            <Button
              onClick={() => handlePayment('auto', 999, 'inr')}
              disabled={!!isProcessing}
              size="lg"
              className="min-w-[150px]"
            >
              {isProcessing === 'auto' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Pay ₹999
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Environment Info */}
        {configData && (
          <div className="mt-8 text-center">
            <Badge variant="outline" className="text-xs">
              {configData.environment === 'production' ? 'Live Payments' : 'Test Environment'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}