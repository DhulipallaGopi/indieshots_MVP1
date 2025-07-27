import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/UltimateAuthProvider';
import { useQueryClient } from '@tanstack/react-query';

export const AuthConsistencyFix = () => {
  const { user, refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  const [fixAttempts, setFixAttempts] = useState(0);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    // AGGRESSIVE: Check for authentication inconsistency every 2 seconds
    const checkConsistency = async () => {
      if (!user?.email || isFixing) return;

      try {
        setIsFixing(true);
        
        // Check current upgrade status with aggressive caching disabled
        const upgradeResponse = await fetch('/api/upgrade/status', {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (!upgradeResponse.ok) {
          console.log('🚨 AUTH CONSISTENCY: Token invalid, forcing immediate refresh...');
          
          // Use force refresh endpoint for immediate fix
          if (user?.email) {
            try {
              const forceResponse = await fetch(`/api/force-refresh/${encodeURIComponent(user.email)}`, {
                method: 'POST',
                credentials: 'include',
                cache: 'no-cache'
              });
              
              if (forceResponse.ok) {
                console.log('✅ AUTH CONSISTENCY: Force refresh successful');
                queryClient.clear();
                await refreshUserData();
              }
            } catch (forceError) {
              console.log('❌ AUTH CONSISTENCY: Force refresh failed, using fallback');
              queryClient.clear();
              await refreshUserData();
            }
          }
          
          setFixAttempts(prev => prev + 1);
          return;
        }

        const upgradeData = await upgradeResponse.json();
        console.log('🔍 AUTH CONSISTENCY: Current status:', upgradeData);

        // AGGRESSIVE: Check multiple inconsistency indicators
        const tierMismatch = upgradeData.tier !== user.tier;
        const isPro = upgradeData.tier === 'pro';
        const userThinksPro = user.tier === 'pro';
        
        if (tierMismatch || (isPro && !userThinksPro) || (!isPro && userThinksPro)) {
          console.log('🚨 AUTH CONSISTENCY: CRITICAL MISMATCH DETECTED!');
          console.log('Database tier:', upgradeData.tier);
          console.log('User tier:', user.tier);
          
          // Force immediate authentication fix
          if (user?.email) {
            try {
              const forceResponse = await fetch(`/api/force-refresh/${encodeURIComponent(user.email)}`, {
                method: 'POST',
                credentials: 'include',
                cache: 'no-cache'
              });
              
              if (forceResponse.ok) {
                console.log('✅ AUTH CONSISTENCY: Emergency fix successful');
                queryClient.clear();
                await refreshUserData();
                
                // Force page reload to ensure clean state
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            } catch (forceError) {
              console.log('❌ AUTH CONSISTENCY: Emergency fix failed');
              // Force reload as last resort
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          }
          
          setFixAttempts(prev => prev + 1);
        }
        
      } catch (error) {
        console.log('❌ AUTH CONSISTENCY: Check failed:', error);
      } finally {
        setIsFixing(false);
      }
    };

    // AGGRESSIVE: Check every 2 seconds for first 60 seconds
    const interval = setInterval(checkConsistency, 2000);
    
    // Run immediate check
    checkConsistency();
    
    // Stop after 60 seconds but extend if issues persist
    setTimeout(() => {
      if (fixAttempts < 10) {
        clearInterval(interval);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.email, user?.tier, refreshUserData, queryClient, fixAttempts, isFixing]);

  // Don't render anything visible - this is a background service
  return null;
};