import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import LeftPanel from "./left-panel";
import RightPanel from "./right-panel";
import { useAuth } from "@/components/auth/UltimateAuthProvider";
import { Settings, LogOut, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToggle } from "@/hooks/use-toggle";
import { cn } from "@/lib/utils";
import ContactButton from "@/components/ContactButton";
import { useTierValidation } from "@/hooks/useTierValidation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, authState, logout } = useAuth();
  const isAuthenticated = authState === 'authenticated';
  const [leftCollapsed, toggleLeftCollapsed] = useToggle(false);
  const [rightCollapsed, toggleRightCollapsed] = useToggle(false);

  // Query for upgrade status to get accurate tier info
  const { data: upgradeStatus } = useQuery({
    queryKey: ['/api/upgrade/status'],
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Also fetch user data to get the most current tier information
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Get tier information from multiple sources for accuracy
  const userTier = ((currentUser as any)?.tier || 
     (upgradeStatus as any)?.tier || 
     (user as any)?.tier || 
     ((currentUser as any)?.totalPages === -1 ? 'pro' : 'free'));
  
  const isProUser = userTier === 'pro';
  
  // Debug header tier detection
  console.log('Header tier detection:', {
    email: user?.email,
    userTier,
    isProUser,
    currentUserTier: (currentUser as any)?.tier,
    upgradeStatusTier: (upgradeStatus as any)?.tier,
    totalPages: (currentUser as any)?.totalPages
  });

  // Pages that should show the sidebar
  const sidebarPages = ['/dashboard', '/projects', '/settings', '/upload', '/columns', '/parse', '/review', '/scene-selection', '/shots', '/scriptHealth', '/help'];
  const shouldShowSidebar = isAuthenticated && (sidebarPages.some(page => location.startsWith(page)) || location === '/');
  
  // Pages that should show the right panel (exclude review pages)
  const shouldShowRightPanel = isAuthenticated && !location.startsWith('/review');

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "U";
    if (user.displayName) {
      const nameParts = user.displayName.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
      }
      return nameParts[0].charAt(0).toUpperCase();
    }
    return user.email?.charAt(0)?.toUpperCase() || "U";
  };

  // Handle logout using CleanAuthProvider
  const handleLogout = async () => {
    try {
      console.log('Starting logout from app layout...');
      const result = await logout();
      if (result.success) {
        console.log('Logout successful, redirecting...');
        // The logout method will handle the redirection
      } else {
        console.error('Logout failed');
        // Force redirect anyway
        window.location.href = '/';
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect on error
      window.location.href = '/';
    }
  };

  return (
    <div className="flex flex-col h-screen dark">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => setLocation('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <h1 className="text-xl font-bold tracking-tight text-white">IndieShots</h1>
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary rounded-full text-white font-medium">Beta</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {/* Tier-based Header Content */}
            {isAuthenticated && userTier === 'free' && (
              <Button 
                variant="default" 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white hidden sm:flex"
                onClick={() => window.location.href = "/upgrade"}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
            
            {/* Pro User Badge */}
            {isAuthenticated && isProUser && (
              <div className="flex items-center bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5 hidden sm:flex">
                <Crown className="h-4 w-4 text-amber-600 mr-2" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Pro Member</span>
              </div>
            )}
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-1 hover:bg-background">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-white">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:inline">
                      {(user as any)?.displayName || (user as any)?.email || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = "/dashboard"}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                onClick={async () => {
                  // Clear any existing auth state like the "Get Started" button
                  try {
                    await fetch('/api/auth/logout', {
                      method: 'POST',
                      credentials: 'include'
                    });
                  } catch (error) {
                    console.log('Logout call failed:', error);
                  }
                  
                  // Clear local auth state
                  localStorage.setItem('auth_disabled', 'true');
                  localStorage.setItem('logout_timestamp', Date.now().toString());
                  
                  // Navigate to clean auth page
                  window.location.href = "/clean-auth";
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area with conditional sidebar layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Navigation - Only show on specific pages */}
        {shouldShowSidebar && <LeftPanel collapsed={leftCollapsed} />}

        {/* Collapse/Expand Button for Left Panel - Only visible when sidebar should be shown */}
        {shouldShowSidebar && (
          leftCollapsed ? (
            <button 
              className="absolute top-1/2 transform -translate-y-1/2 bg-card hover:bg-muted rounded-r-md p-1 z-10 transition-all duration-300 ease-in-out left-0"
              onClick={toggleLeftCollapsed}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button 
              className="absolute top-1/2 transform -translate-y-1/2 bg-card hover:bg-muted rounded-r-md p-1 z-10 transition-all duration-300 ease-in-out left-64"
              onClick={toggleLeftCollapsed}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )
        )}

        {/* Center Workspace */}
        <div className="flex-1 overflow-auto bg-background">
          {children}
        </div>

        {/* Right Details Panel */}
        {shouldShowRightPanel && <RightPanel collapsed={rightCollapsed} />}
      </div>

      {/* Contact Support Button - Available on all pages */}
      <ContactButton />
    </div>
  );
}
