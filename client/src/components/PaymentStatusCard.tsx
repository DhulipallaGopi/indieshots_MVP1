import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useAuth } from '@/components/auth/UltimateAuthProvider';

interface PaymentInvoice {
  id: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
}

export function PaymentStatusCard() {
  const { user } = useAuth();

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['/api/payments/invoices'],
    enabled: !!user,
  });

  const invoices: PaymentInvoice[] = invoicesData?.invoices || [];
  const latestInvoice = invoices[0];

  if (!user || user.tier === 'free') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
          <CardDescription>
            You're on the free plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Badge variant="secondary">Free Plan</Badge>
            <p className="text-sm text-gray-600 mt-2">
              Upgrade to Pro to access premium features
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'canceled':
      case 'failed':
        return <X className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'canceled':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Status
        </CardTitle>
        <CardDescription>
          Your subscription and billing information
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">IndieShots Pro</div>
            <div className="text-sm text-gray-600">Unlimited access</div>
          </div>
          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            Active
          </Badge>
        </div>

        <Separator />

        {/* Latest Payment */}
        {latestInvoice && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Latest Payment</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(latestInvoice.status)}
                  <span className="text-sm font-medium capitalize">
                    {latestInvoice.method}
                  </span>
                </div>
                <Badge 
                  variant="outline" 
                  className={getStatusColor(latestInvoice.status)}
                >
                  {latestInvoice.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <DollarSign className="h-3 w-3" />
                  {latestInvoice.currency.toUpperCase()} {latestInvoice.amount}
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="h-3 w-3" />
                  {new Date(latestInvoice.date).toLocaleDateString()}
                </div>
              </div>

              {latestInvoice.description && (
                <div className="text-xs text-gray-500">
                  {latestInvoice.description}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History Link */}
        {invoices.length > 1 && (
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            View Payment History ({invoices.length} payments)
          </Button>
        )}

        {/* Subscription Management */}
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 text-center">
            Need help? Contact support or manage your subscription in settings
          </div>
        </div>
      </CardContent>
    </Card>
  );
}