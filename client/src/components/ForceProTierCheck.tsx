/**
 * Component disabled - removed hardcoded tier forcing
 */
export const ForceProTierCheck = () => {
  // COMPLETELY DISABLED - Prevents automatic pro tier forcing
  return null;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    
    if (status === 'success') {
      console.log('🎯 FORCE PRO CHECK: Payment success detected - starting aggressive tier check');
      
      const checkProStatus = async () => {
        for (let attempt = 1; attempt <= 5; attempt++) {
          console.log(`🔄 FORCE PRO CHECK: Attempt ${attempt}/5`);
          
          try {
            // Clear all caches
            queryClient.clear();
            
            // Force fetch upgrade status
            const upgradeResponse = await fetch('/api/upgrade/status', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'X-Timestamp': Date.now().toString()
              }
            });
            
            if (upgradeResponse.ok) {
              const upgradeData = await upgradeResponse.json();
              console.log(`✅ FORCE PRO CHECK: Upgrade data (attempt ${attempt}):`, upgradeData);
              
              // Check if user is now pro (read-only check)
              if (upgradeData.tier === 'pro' || upgradeData.limits?.totalPages === -1) {
                console.log('✅ FORCE PRO CHECK: Pro tier confirmed after payment');
                
                // Simply refresh to show pro status - no forcing
                await refreshUserData();
                
                // Force refetch all queries
                await queryClient.invalidateQueries();
                
                // Force reload in 2 seconds to ensure clean state
                setTimeout(() => {
                  console.log('🔄 FORCE PRO CHECK: Reloading page for clean pro tier state...');
                  window.location.reload();
                }, 2000);
                
                break; // Stop checking, we found pro tier
              }
            }
            
            // Wait before next attempt
            if (attempt < 5) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
          } catch (error) {
            console.warn(`⚠️ FORCE PRO CHECK: Attempt ${attempt} failed:`, error);
          }
        }
      };
      
      // Start checking immediately and every 3 seconds
      checkProStatus();
      const interval = setInterval(checkProStatus, 3000);
      
      // Clean up after 30 seconds
      setTimeout(() => {
        clearInterval(interval);
        console.log('🏁 FORCE PRO CHECK: Stopped checking after 30 seconds');
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [queryClient, refreshUserData, user?.email]);

  return null; // This is a monitoring component, no UI
};