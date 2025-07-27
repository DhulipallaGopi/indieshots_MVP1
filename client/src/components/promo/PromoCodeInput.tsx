import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PromoCodeValidation {
  isValid: boolean;
  tier?: string;
  errorMessage?: string;
  usageCount?: number;
  remainingUses?: number;
}

interface PromoCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  email: string;
  onValidationChange?: (validation: PromoCodeValidation | null) => void;
  disabled?: boolean;
  className?: string;
}

export default function PromoCodeInput({ 
  value, 
  onChange, 
  email, 
  onValidationChange, 
  disabled = false,
  className = ""
}: PromoCodeInputProps) {
  const [validation, setValidation] = useState<PromoCodeValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced validation
  useEffect(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    if (value.trim().length >= 4 && email) {
      const timeout = setTimeout(() => {
        validatePromoCode(value.trim(), email);
      }, 500); // 500ms delay
      
      setValidationTimeout(timeout);
    } else {
      setValidation(null);
      onValidationChange?.(null);
    }

    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [value, email]);

  const validatePromoCode = async (code: string, userEmail: string) => {
    if (!code.trim() || !userEmail.trim()) return;

    setIsValidating(true);
    
    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim(),
          email: userEmail.trim()
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setValidation(result);
        onValidationChange?.(result);
        
        // Log successful validation
        if (result.isValid) {
          console.log(`✓ Promo code ${code} validated successfully for ${userEmail}`);
        }
      } else {
        setValidation({
          isValid: false,
          errorMessage: result.message || 'Validation failed'
        });
        onValidationChange?.(null);
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setValidation({
        isValid: false,
        errorMessage: 'Unable to validate promo code. Please try again.'
      });
      onValidationChange?.(null);
    } finally {
      setIsValidating(false);
    }
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    
    if (validation?.isValid) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    
    if (validation && !validation.isValid) {
      return <X className="h-4 w-4 text-red-600" />;
    }
    
    return <Gift className="h-4 w-4 text-muted-foreground" />;
  };

  const getValidationMessage = () => {
    if (!validation && value.trim().length < 4) {
      return null;
    }

    if (isValidating) {
      return (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Validating promo code...
        </p>
      );
    }

    if (validation?.isValid) {
      return (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Valid promo code - Premium access will be granted!
          </p>
          {validation.tier && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {validation.tier.toUpperCase()} Tier
            </Badge>
          )}
          {validation.remainingUses !== undefined && validation.remainingUses > 0 && (
            <p className="text-xs text-green-600">
              {validation.remainingUses} uses remaining
            </p>
          )}
        </div>
      );
    }

    if (validation && !validation.isValid) {
      return (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <X className="h-3 w-3" />
          {validation.errorMessage}
        </p>
      );
    }

    return null;
  };

  return (
    <div className={className}>
      <Label htmlFor="promo-code" className="block text-sm font-medium text-foreground">
        Promo Code (Optional)
      </Label>
      <div className="mt-1 relative">
        <Input
          id="promo-code"
          type="text"
          placeholder="Enter promo code to get premium account"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="pr-10"
          maxLength={50}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {getValidationIcon()}
        </div>
      </div>
      
      {getValidationMessage()}
      
      {/* Display current promo code system status */}
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Try "INDIE2025" for premium access on valid dates
        </p>
      )}
    </div>
  );
}