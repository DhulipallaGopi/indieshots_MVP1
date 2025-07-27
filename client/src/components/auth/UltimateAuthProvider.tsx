import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { authManager, AuthState, AuthUser } from "@/lib/authManager";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, isPremiumCoupon?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean }>;
  enableAuth: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an UltimateAuthProvider');
  }
  return context;
};

export const UltimateAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<{
    user: AuthUser | null;
    authState: AuthState;
  }>({
    user: null,
    authState: 'loading'
  });

  // Prevent infinite loops with single state update
  const updateAuthState = useCallback((state: AuthState, userData: AuthUser | null) => {
    setAuthData(prev => {
      // Only update if there's actually a change
      if (prev.authState === state && prev.user === userData) {
        return prev;
      }
      return { user: userData, authState: state };
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const handleAuthChange = (state: AuthState, userData: AuthUser | null) => {
      if (!mounted) return;
      
      // Debounce state updates to prevent rapid changes
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (mounted) {
          updateAuthState(state, userData);
        }
      }, 10);
    };

    const unsubscribe = authManager.onAuthStateChange(handleAuthChange);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [updateAuthState]);

  // Memoize auth functions to prevent recreating on every render
  const signIn = useCallback(async (email: string, password: string) => {
    authManager.enableAuth();
    
    try {
      // First check if user exists in Firebase using hybrid signin
      const response = await fetch('/api/auth/hybrid-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'USER_NOT_FOUND') {
          return { success: false, error: "This email is not registered. Please sign up first." };
        }
        return { success: false, error: data.message || "Sign in failed" };
      }

      // User exists in Firebase, now authenticate with Firebase client SDK
      if (data.action === 'firebase_auth') {
        const result = await authManager.signInWithEmail(email, password);
        return result.success ? { success: true } : { success: false, error: result.error };
      } else {
        return { success: false, error: "Unexpected response from server" };
      }
      
    } catch (error: any) {
      return { success: false, error: error.message || "Sign in failed" };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, isPremiumCoupon?: boolean) => {
    const result = await authManager.signUpWithEmail(email, password, isPremiumCoupon);
    return result.success ? { success: true } : { success: false, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    return await authManager.logout();
  }, []);

  const enableAuth = useCallback(() => {
    authManager.enableAuth();
  }, []);



  const refreshUserData = useCallback(async () => {
    // ENHANCED: Force comprehensive refresh of user data after payment
    try {
      console.log('🔄 AUTH PROVIDER: Starting user data refresh...');
      
      // Multiple attempts with different endpoints
      const endpoints = ['/api/auth/user', '/api/upgrade/status'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log(`✅ AUTH PROVIDER: Fresh data from ${endpoint}:`, userData);
            
            // Update auth state with fresh data
            updateAuthState('authenticated', userData);
            break;
          }
        } catch (endpointError) {
          console.warn(`⚠️ AUTH PROVIDER: Failed to fetch from ${endpoint}:`, endpointError);
        }
      }
      
      // Force reload auth manager state
      authManager.enableAuth();
      console.log('✅ AUTH PROVIDER: User data refresh completed');
      
    } catch (error) {
      console.error('❌ AUTH PROVIDER: Failed to refresh user data:', error);
    }
  }, [updateAuthState]);

  // Override user data if pro is locked from payment
  const displayUser = localStorage.getItem('instant_pro_lock') === 'true' && authData.user ? {
    ...authData.user,
    tier: 'pro',
    totalPages: -1,
    maxShotsPerScene: -1,
    canGenerateStoryboards: true
  } : authData.user;

  // Memoize the entire context value to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextType>(() => ({
    user: displayUser,
    loading: authData.authState === 'loading',
    isAuthenticated: authData.authState === 'authenticated',
    authState: authData.authState,
    signIn,
    signUp,
    logout,
    enableAuth,
    refreshUserData,
  }), [displayUser, authData.authState, signIn, signUp, logout, enableAuth, refreshUserData]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};