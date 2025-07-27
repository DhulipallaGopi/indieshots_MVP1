import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { authManager, AuthState, AuthUser } from "@/lib/authManager";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  enableAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  authState: 'loading',
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  logout: async () => ({ success: false }),
  enableAuth: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const CleanAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  
  // Track last state to prevent infinite loops
  const lastStateRef = useRef<{ state: AuthState; userStr: string }>({
    state: 'loading',
    userStr: 'null'
  });
  
  // Debounce state updates to prevent rapid fire changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized auth state change handler to prevent recreation
  const handleAuthStateChange = useCallback((state: AuthState, userData: AuthUser | null) => {
    const userStr = JSON.stringify(userData);
    
    // Check if state actually changed before updating
    if (lastStateRef.current.state === state && lastStateRef.current.userStr === userStr) {
      return; // No change, prevent update loop
    }
    
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Debounce updates to prevent rapid fire state changes
    updateTimeoutRef.current = setTimeout(() => {
      console.log('Auth state changed:', state, userData?.email || 'No user');
      
      // Update tracking reference
      lastStateRef.current = { state, userStr };
      
      // Batch state updates to prevent multiple renders
      setAuthState(state);
      setUser(userData);
    }, 10); // 10ms debounce
  }, []);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authManager.onAuthStateChange(handleAuthStateChange);
    return () => {
      unsubscribe();
      // Clean up timeout on unmount
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [handleAuthStateChange]);

  const signIn = useCallback(async (email: string, password: string) => {
    // Clear logout state before attempting sign in
    authManager.enableAuth();
    
    const result = await authManager.signInWithEmail(email, password);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await authManager.signUpWithEmail(email, password);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    const result = await authManager.logout();
    return result;
  }, []);

  const enableAuth = useCallback(() => {
    authManager.enableAuth();
  }, []);

  const value = useMemo(() => ({
    user,
    loading: authState === 'loading',
    isAuthenticated: authState === 'authenticated',
    authState,
    signIn,
    signUp,
    logout,
    enableAuth,
  }), [user, authState, signIn, signUp, logout, enableAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};