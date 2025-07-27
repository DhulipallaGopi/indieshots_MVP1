import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { authManager, AuthState, AuthUser } from "@/lib/authManager";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean }>;
  enableAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a StableAuthProvider');
  }
  return context;
};

export const StableAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<{
    user: AuthUser | null;
    authState: AuthState;
  }>({
    user: null,
    authState: 'loading'
  });
  
  // Single source of truth for state tracking
  const stateRef = useRef({
    lastState: 'loading' as AuthState,
    lastUserJson: 'null',
    updateInProgress: false
  });

  // Stable auth state change handler with stricter guards
  const handleAuthStateChange = useCallback((state: AuthState, userData: AuthUser | null) => {
    const userJson = JSON.stringify(userData);
    
    // Prevent concurrent updates
    if (stateRef.current.updateInProgress) {
      return;
    }
    
    // Check if state actually changed
    if (stateRef.current.lastState === state && stateRef.current.lastUserJson === userJson) {
      return;
    }
    
    // Mark update in progress
    stateRef.current.updateInProgress = true;
    
    // Update tracking state
    stateRef.current.lastState = state;
    stateRef.current.lastUserJson = userJson;
    
    console.log('Auth state changed:', state, userData?.email || 'No user');
    
    // Use functional update to prevent race conditions
    setAuthData(prevData => {
      // Double check if we still need to update
      if (prevData.authState === state && JSON.stringify(prevData.user) === userJson) {
        stateRef.current.updateInProgress = false;
        return prevData;
      }
      
      // Reset update flag after state change
      setTimeout(() => {
        stateRef.current.updateInProgress = false;
      }, 0);
      
      return { user: userData, authState: state };
    });
  }, []);

  useEffect(() => {
    const unsubscribe = authManager.onAuthStateChange(handleAuthStateChange);
    return unsubscribe;
  }, [handleAuthStateChange]);

  const signIn = useCallback(async (email: string, password: string) => {
    authManager.enableAuth();
    const result = await authManager.signInWithEmail(email, password);
    return result.success ? { success: true } : { success: false, error: result.error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await authManager.signUpWithEmail(email, password);
    return result.success ? { success: true } : { success: false, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    const result = await authManager.logout();
    // Force clear any cached auth state
    setAuthData({ user: null, authState: 'unauthenticated' });
    return result;
  }, []);

  const enableAuth = useCallback(() => {
    authManager.enableAuth();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user: authData.user,
    loading: authData.authState === 'loading',
    isAuthenticated: authData.authState === 'authenticated',
    authState: authData.authState,
    signIn,
    signUp,
    logout,
    enableAuth,
  }), [authData, signIn, signUp, logout, enableAuth]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};