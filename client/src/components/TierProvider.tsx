import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/UltimateAuthProvider';

interface TierContextType {
  userTier: 'free' | 'pro';
  isProUser: boolean;
  totalPages: number;
  usedPages: number;
  canGenerateStoryboards: boolean;
  maxShotsPerScene: number;
  isLoading: boolean;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export const useTier = () => {
  const context = useContext(TierContext);
  if (context === undefined) {
    throw new Error('useTier must be used within a TierProvider');
  }
  return context;
};

interface TierProviderProps {
  children: ReactNode;
}

export const TierProvider: React.FC<TierProviderProps> = ({ children }) => {
  const { user, authState } = useAuth();
  const isAuthenticated = authState === 'authenticated';

  // Fetch upgrade status as primary source of tier information
  const { data: upgradeStatus, isLoading: upgradeLoading } = useQuery({
    queryKey: ['/api/upgrade/status'],
    enabled: isAuthenticated && !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Fetch current user data as secondary source
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: isAuthenticated && !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const isLoading = upgradeLoading || userLoading;

  // Determine tier from multiple sources with fallback logic
  // Removed premium demo override
  
  // Priority: Upgrade status > Current user > Auth user > Default free
  let userTier: 'free' | 'pro' = 'free';
  let totalPages = 10;
  let usedPages = 0;
  let canGenerateStoryboards = false;
  let maxShotsPerScene = 5;

  if (upgradeStatus) {
    userTier = (upgradeStatus as any)?.tier || 'free';
    const limits = (upgradeStatus as any)?.limits;
    if (limits) {
      totalPages = limits.totalPages;
      usedPages = limits.usedPages || 0;
      canGenerateStoryboards = limits.canGenerateStoryboards;
      maxShotsPerScene = limits.maxShotsPerScene;
    }
  } else if (currentUser) {
    userTier = (currentUser as any)?.tier || 'free';
    totalPages = (currentUser as any)?.totalPages || 10;
    usedPages = (currentUser as any)?.usedPages || 0;
    canGenerateStoryboards = (currentUser as any)?.canGenerateStoryboards || false;
    maxShotsPerScene = (currentUser as any)?.maxShotsPerScene || 5;
  } else if (user) {
    userTier = (user as any)?.tier || 'free';
    totalPages = (user as any)?.totalPages || 10;
    usedPages = (user as any)?.usedPages || 0;
    canGenerateStoryboards = (user as any)?.canGenerateStoryboards || false;
    maxShotsPerScene = (user as any)?.maxShotsPerScene || 5;
  }

  // Ensure pro tier has unlimited access
  if (userTier === 'pro') {
    totalPages = -1;
    canGenerateStoryboards = true;
    maxShotsPerScene = -1;
  }

  const isProUser = userTier === 'pro';

  // Debug logging for tier detection
  console.log('🎯 TIER PROVIDER: Tier detection results:', {
    email: user?.email,
    userTier,
    isProUser,
    totalPages,
    usedPages,
    canGenerateStoryboards,
    maxShotsPerScene,
    upgradeStatusTier: (upgradeStatus as any)?.tier,
    currentUserTier: (currentUser as any)?.tier,
    authUserTier: (user as any)?.tier
  });

  const value: TierContextType = {
    userTier,
    isProUser,
    totalPages,
    usedPages,
    canGenerateStoryboards,
    maxShotsPerScene,
    isLoading
  };

  return (
    <TierContext.Provider value={value}>
      {children}
    </TierContext.Provider>
  );
};