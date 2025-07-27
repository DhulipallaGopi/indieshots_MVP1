import { useQuery } from '@tanstack/react-query';
import { RefreshCw, DollarSign, IndianRupee } from 'lucide-react';

interface PricingData {
  inr: { amount: number; display: string; currency: string };
  usd: { amount: number; display: string; currency: string };
  exchangeRate: number;
  note: string;
}

interface CurrencyDisplayProps {
  className?: string;
  showRate?: boolean;
}

export default function CurrencyDisplay({ className = "", showRate = true }: CurrencyDisplayProps) {
  const { data: pricingData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/currency/subscription-pricing'],
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading pricing...</span>
      </div>
    );
  }

  if (error || !pricingData?.success) {
    return (
      <div className={`text-center ${className}`}>
        <div className="flex items-center gap-2 justify-center mb-2">
          <IndianRupee className="w-5 h-5 text-blue-600" />
          <span className="text-xl font-bold">₹999</span>
          <span className="text-gray-500">~</span>
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-xl font-bold">$12</span>
        </div>
        <p className="text-xs text-gray-500">
          Exchange rate temporarily unavailable
        </p>
      </div>
    );
  }

  const pricing: PricingData = pricingData.pricing;

  return (
    <div className={`text-center ${className}`}>
      {/* Main price display */}
      <div className="flex items-center gap-3 justify-center mb-2">
        <div className="flex items-center gap-1">
          <IndianRupee className="w-5 h-5 text-blue-600" />
          <span className="text-2xl font-bold text-blue-600">{pricing.inr.display}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-px bg-gray-300"></div>
          <span className="text-xs text-gray-500 mt-1">equals</span>
        </div>
        
        <div className="flex items-center gap-1">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-2xl font-bold text-green-600">{pricing.usd.display}</span>
        </div>
      </div>

      {/* Exchange rate info */}
      {showRate && (
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Exchange rate:</span> 1 INR = ${pricing.exchangeRate}
          </p>
          <p className="text-xs text-gray-500">
            Updated in real-time • PayU processes in Indian Rupees
          </p>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={() => refetch()}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
        disabled={isLoading}
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh rate
      </button>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactCurrencyDisplay({ className = "" }: { className?: string }) {
  const { data: pricingData, isLoading } = useQuery({
    queryKey: ['/api/currency/subscription-pricing'],
    refetchInterval: 30 * 60 * 1000,
  });

  if (isLoading || !pricingData?.success) {
    return (
      <span className={`text-lg font-semibold ${className}`}>
        ₹999 (~$12)
      </span>
    );
  }

  const pricing: PricingData = pricingData.pricing;

  return (
    <span className={`text-lg font-semibold ${className}`}>
      {pricing.inr.display} (~{pricing.usd.display})
    </span>
  );
}