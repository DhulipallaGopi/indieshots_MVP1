/**
 * Component disabled - removed hardcoded tier protection
 */
export const ProTierProtection = () => {
  // Component disabled to prevent hardcoded tier overrides
  return null;
};
    const interval = setInterval(protectProTier, 2000);

    return () => clearInterval(interval);
  }, [user?.email, user?.tier, queryClient]);

  return null;
};