import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/UltimateAuthProvider';

/**
 * Hook that automatically validates user tier and refreshes data when needed
 * This ensures users get immediate access to pro features after promo code application
 */
export const useTierValidation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up automatic tier validation 2 seconds after login
    const validateTier = async () => {
      try {
        console.log('[TIER VALIDATION] Checking for tier updates...');
        
        // Force refresh user data from server
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        // Fetch fresh user data
        const response = await fetch('/api/auth/user', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const freshUserData = await response.json();
          console.log('[TIER VALIDATION] Fresh user data:', freshUserData.tier);
          
          // If tier changed, invalidate all queries to refresh UI
          if (freshUserData.tier !== user.tier) {
            console.log(`[TIER VALIDATION] Tier updated: ${user.tier} → ${freshUserData.tier}`);
            queryClient.invalidateQueries();
            
            // Force reload the page to ensure all components use new tier
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('[TIER VALIDATION] Error:', error);
      }
    };

    // Run validation after 2 seconds to allow for any backend tier updates
    const timeoutId = setTimeout(validateTier, 2000);

    return () => clearTimeout(timeoutId);
  }, [user?.email, queryClient]);

  // Also provide manual refresh function
  const refreshTier = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        queryClient.invalidateQueries();
        window.location.reload();
      }
    } catch (error) {
      console.error('[TIER VALIDATION] Manual refresh error:', error);
    }
  };

  return { refreshTier };
};