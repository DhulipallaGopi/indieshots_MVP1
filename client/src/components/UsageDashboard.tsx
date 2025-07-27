import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Image, MessageCircle, Shield, Clock } from 'lucide-react';

interface UsageStats {
  userId: string;
  userTier: string;
  usage: {
    imageGenerations: number;
    gptCalls: number;
    totalCost: number;
    lastReset: string;
  };
  limits: {
    imageGenerations: number;
    gptCalls: number;
    maxCostPerDay: number;
  };
  remainingUsage: {
    imageGenerations: number;
    gptCalls: number;
    budget: number;
  };
}

export default function UsageDashboard() {
  const { data: usageStats, isLoading, error } = useQuery<UsageStats>({
    queryKey: ['/api/usage-stats'],
    refetchInterval: 30000 // Update every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Usage Dashboard
          </CardTitle>
          <CardDescription>Loading usage statistics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !usageStats) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Usage Dashboard
          </CardTitle>
          <CardDescription className="text-red-500">
            Failed to load usage statistics
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { usage, limits, remainingUsage, userTier } = usageStats;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getProgressColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Usage Dashboard
          <Badge variant={userTier === 'pro' ? 'default' : 'secondary'}>
            {userTier.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Daily usage resets at midnight UTC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Spend</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(usage.totalCost)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Image className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Images Generated</p>
              <p className="text-lg font-bold text-green-600">
                {usage.imageGenerations}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <MessageCircle className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">GPT Calls</p>
              <p className="text-lg font-bold text-purple-600">
                {usage.gptCalls}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Daily Limits</h3>
          
          {/* Budget Usage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Budget Used</span>
              <span className="text-sm text-gray-600">
                {formatCurrency(usage.totalCost)} / {formatCurrency(limits.maxCostPerDay)}
              </span>
            </div>
            <Progress 
              value={(usage.totalCost / limits.maxCostPerDay) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500">
              {formatCurrency(remainingUsage.budget)} remaining
            </div>
          </div>

          {/* Image Generation Usage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Image Generations</span>
              <span className="text-sm text-gray-600">
                {usage.imageGenerations} / {limits.imageGenerations}
              </span>
            </div>
            <Progress 
              value={(usage.imageGenerations / limits.imageGenerations) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500">
              {remainingUsage.imageGenerations} remaining
            </div>
          </div>

          {/* GPT Calls Usage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">GPT Calls</span>
              <span className="text-sm text-gray-600">
                {usage.gptCalls} / {limits.gptCalls}
              </span>
            </div>
            <Progress 
              value={(usage.gptCalls / limits.gptCalls) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-500">
              {remainingUsage.gptCalls} remaining
            </div>
          </div>
        </div>

        {/* Warning Messages */}
        {usage.totalCost >= limits.maxCostPerDay * 0.8 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Approaching daily budget limit
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              You have {formatCurrency(remainingUsage.budget)} remaining in your daily budget.
            </p>
          </div>
        )}

        {/* Last Reset Time */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-4 h-4" />
          Last reset: {new Date(usage.lastReset).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}