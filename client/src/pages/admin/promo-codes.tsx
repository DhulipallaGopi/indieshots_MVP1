import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Refresh
} from 'lucide-react';

export default function PromoCodesAdminPage() {
  const [selectedCode] = useState('INDIE2025');

  // Query promo code stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: [`/api/promo-codes/${selectedCode}/stats`],
    refetchInterval: 30000,
  });

  // Query promo code status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/promo-codes/status'],
    refetchInterval: 60000,
  });

  const handleRefreshData = () => {
    refetchStats();
    refetchStatus();
  };

  const getUsagePercentage = () => {
    if (!stats || stats.stats.usageLimit === -1) return 0;
    return (stats.stats.totalUses / stats.stats.usageLimit) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (statsLoading || statusLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Code Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor promo code usage and system status
          </p>
        </div>
        <Button onClick={handleRefreshData} variant="outline" size="sm">
          <Refresh className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status?.isValidDate ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="font-medium">{status?.message}</p>
              <p className="text-sm text-muted-foreground">
                Current Date: {status?.currentDate}
              </p>
              <p className="text-sm text-muted-foreground">
                Valid Dates: {status?.validDates?.join(', ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats.totalUses}</div>
              <p className="text-xs text-muted-foreground">
                {stats.stats.usageLimit === -1 ? 'Unlimited' : `of ${stats.stats.usageLimit}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                Individual accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Uses</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.stats.remainingUses === -1 ? '∞' : stats.stats.remainingUses}
              </div>
              <p className="text-xs text-muted-foreground">
                Available slots
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usage Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(getUsagePercentage())}%</div>
              <Progress value={getUsagePercentage()} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Latest promo code redemptions for {selectedCode}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.stats.recentUsage?.length > 0 ? (
            <div className="space-y-3">
              {stats.stats.recentUsage.map((usage: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{usage.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(usage.usedAt.toString())}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{usage.ipAddress}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent usage found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}