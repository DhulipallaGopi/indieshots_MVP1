import { createContext, useContext, useEffect, useState } from "react";
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
    throw new Error('useAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    let mounted = true;
    
    const handleAuthChange = (state: AuthState, userData: AuthUser | null) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', state, userData?.email || 'No user');
      
      // Use batch updates to prevent infinite loops
      if (mounted) {
        setAuthState(state);
        setUser(userData);
      }
    };

    const unsubscribe = authManager.onAuthStateChange(handleAuthChange);
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

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

  // Create stable context value
  const contextValue: AuthContextType = {
    user,
    loading: authState === 'loading',
    isAuthenticated: authState === 'authenticated',
    authState,
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