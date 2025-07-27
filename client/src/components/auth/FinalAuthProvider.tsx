import { createContext, useContext, useEffect, useState, useRef } from "react";
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
    throw new Error('useAuth must be used within a FinalAuthProvider');
  }
  return context;
};

export const FinalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use a single state object to prevent multiple renders
  const [state, setState] = useState<{
    user: AuthUser | null;
    authState: AuthState;
    initialized: boolean;
  }>({
    user: null,
    authState: 'loading',
    initialized: false
  });
  
  // Use refs to track state and prevent unnecessary updates
  const lastUpdateRef = useRef<string>('');
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const handleAuthChange = (authState: AuthState, userData: AuthUser | null) => {
      if (!isMounted || isUpdatingRef.current) return;
      
      const stateKey = `${authState}:${JSON.stringify(userData)}`;
      if (lastUpdateRef.current === stateKey) return;
      
      isUpdatingRef.current = true;
      lastUpdateRef.current = stateKey;
      
      console.log('Auth state changed:', authState, userData?.email || 'No user');
      
      setState({
        user: userData,
        authState,
        initialized: true
      });
      
      // Reset update flag after a tick
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    };

    const unsubscribe = authManager.onAuthStateChange(handleAuthChange);
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Memoize all functions to prevent recreation
  const signIn = async (email: string, password: string) => {
    authManager.enableAuth();
    const result = await authManager.signInWithEmail(email, password);
    return result.success ? { success: true } : { success: false, error: result.error };
  };

  const signUp = async (email: string, password: string) => {
    const result = await authManager.signUpWithEmail(email, password);
    return result.success ? { success: true } : { success: false, error: result.error };
  };

  const logout = async () => {
    return await authManager.logout();
  };

  const enableAuth = () => {
    authManager.enableAuth();
  };

  // Static context value to prevent re-renders
  const contextValue: AuthContextType = {
    user: state.user,
    loading: state.authState === 'loading',
    isAuthenticated: state.authState === 'authenticated',
    authState: state.authState,
    signIn,
    signUp,
    logout,
    enableAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};