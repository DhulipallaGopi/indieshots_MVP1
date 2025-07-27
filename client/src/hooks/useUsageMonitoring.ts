import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

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

export function useUsageMonitoring() {
  const { toast } = useToast();
  const notificationShownRef = useRef(new Set<string>());

  const { data: usageStats, isLoading, error } = useQuery<UsageStats>({
    queryKey: ['/api/usage-stats'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1 // Don't retry too aggressively
  });

  useEffect(() => {
    if (!usageStats) return;

    const { usage, limits, remainingUsage } = usageStats;
    
    // Check budget usage (warn at 80% and 95%)
    const budgetUsagePercent = (usage.totalCost / limits.maxCostPerDay) * 100;
    
    if (budgetUsagePercent >= 95 && !notificationShownRef.current.has('budget-95')) {
      toast({
        title: "Budget Alert",
        description: `You've used 95% of your daily budget. Only $${remainingUsage.budget.toFixed(2)} remaining.`,
        variant: "destructive",
      });
      notificationShownRef.current.add('budget-95');
    } else if (budgetUsagePercent >= 80 && !notificationShownRef.current.has('budget-80')) {
      toast({
        title: "Budget Warning",
        description: `You've used 80% of your daily budget. $${remainingUsage.budget.toFixed(2)} remaining.`,
        variant: "default",
      });
      notificationShownRef.current.add('budget-80');
    }

    // Check image generation usage (warn at 90%)
    const imageUsagePercent = (usage.imageGenerations / limits.imageGenerations) * 100;
    
    if (imageUsagePercent >= 90 && !notificationShownRef.current.has('images-90')) {
      toast({
        title: "Image Generation Alert",
        description: `You've used 90% of your daily image generation limit. ${remainingUsage.imageGenerations} remaining.`,
        variant: "default",
      });
      notificationShownRef.current.add('images-90');
    }

    // Check GPT calls usage (warn at 90%)
    const gptUsagePercent = (usage.gptCalls / limits.gptCalls) * 100;
    
    if (gptUsagePercent >= 90 && !notificationShownRef.current.has('gpt-90')) {
      toast({
        title: "GPT Usage Alert",
        description: `You've used 90% of your daily GPT call limit. ${remainingUsage.gptCalls} remaining.`,
        variant: "default",
      });
      notificationShownRef.current.add('gpt-90');
    }

    // Reset notifications if usage drops significantly (e.g., after daily reset)
    if (budgetUsagePercent < 50) {
      notificationShownRef.current.delete('budget-80');
      notificationShownRef.current.delete('budget-95');
    }
    if (imageUsagePercent < 50) {
      notificationShownRef.current.delete('images-90');
    }
    if (gptUsagePercent < 50) {
      notificationShownRef.current.delete('gpt-90');
    }
  }, [usageStats, toast]);

  return {
    usageStats,
    isLoading,
    error,
    isNearBudgetLimit: usageStats ? (usageStats.usage.totalCost / usageStats.limits.maxCostPerDay) >= 0.8 : false,
    isNearImageLimit: usageStats ? (usageStats.usage.imageGenerations / usageStats.limits.imageGenerations) >= 0.9 : false,
    isNearGPTLimit: usageStats ? (usageStats.usage.gptCalls / usageStats.limits.gptCalls) >= 0.9 : false
  };
}