import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/UltimateAuthProvider";
import { Upload, Eye, Download, ArrowRight, ChevronRight, Crown, Zap, TestTube, MessageSquare } from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import { UpgradePrompt } from "@/components/upgrade/upgrade-prompt";
import { usePostPaymentRefresh } from "@/hooks/usePostPaymentRefresh";
import { useEffect } from "react";
import { ForceProTierCheck } from "@/components/ForceProTierCheck";
import { PostPaymentAlert } from "@/components/PostPaymentAlert";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Handle post-payment authentication refresh
  usePostPaymentRefresh();
  
  // Aggressive pro tier detection and enforcement
  const isAuthenticated = !!user;
  
  // Fetch user's scripts
  const { data: scripts = [], isLoading: isLoadingScripts } = useQuery({
    queryKey: ["/api/scripts"],
  });
  
  // Fetch user's parse jobs
  const { data: parseJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Fetch upgrade status for accurate tier information (critical for post-payment scenarios)
  const { data: upgradeStatus, refetch: refetchUpgradeStatus } = useQuery({
    queryKey: ["/api/upgrade/status"],
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 2000, // Aggressive polling every 2 seconds for post-payment detection
  });
  
  // Calculate usage statistics based on tier - removed premium demo override
  const userTier = ((upgradeStatus as any)?.tier || 
     (upgradeStatus as any)?.limits?.tier ||
     user?.tier || 
     (user as any)?.tier || 
     ((upgradeStatus as any)?.limits?.totalPages === -1 ? 'pro' : 'free') ||
     ((user as any)?.totalPages === -1 ? 'pro' : 'free'));
  
  const pagesUsed = (upgradeStatus as any)?.limits?.usedPages || (user as any)?.usedPages || 0;
  const totalPages = userTier === 'pro' ? -1 : ((upgradeStatus as any)?.limits?.totalPages || (user as any)?.totalPages || 10);
  const usagePercentage = totalPages === -1 ? 0 : Math.min(100, Math.round((pagesUsed / totalPages) * 100));
  const pagesRemaining = totalPages === -1 ? 'unlimited' : Math.max(0, totalPages - pagesUsed);
  const canGenerateStoryboards = userTier === 'pro' ? true : ((upgradeStatus as any)?.limits?.canGenerateStoryboards || (user as any)?.canGenerateStoryboards || false);
  
  // Use actual tier data without forced overrides
  const finalUserTier = userTier;
  const finalTotalPages = totalPages;
  const finalCanGenerateStoryboards = canGenerateStoryboards;
  
  // Debug tier detection for troubleshooting
  console.log('Dashboard tier detection:', {
    email: user?.email,
    userTier,
    finalUserTier,
    totalPages,
    finalTotalPages,
    pagesUsed,
    canGenerateStoryboards,
    finalCanGenerateStoryboards,
    upgradeStatusTier: (upgradeStatus as any)?.tier,
    upgradeStatusLimits: (upgradeStatus as any)?.limits,
    rawUserData: user,
    rawUpgradeStatus: upgradeStatus
  });
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <ForceProTierCheck />
      <PostPaymentAlert />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your scripts, jobs and usage
        </p>
      </div>
      
      {/* Upgrade prompt for users approaching limits */}
      {finalUserTier === 'free' && usagePercentage >= 80 && (
        <div className="mb-6">
          <UpgradePrompt 
            feature="pages"
            currentUsage={pagesUsed}
            limit={finalTotalPages}
            message={`You've used ${pagesUsed} out of ${finalTotalPages} pages this month. Upgrade to Pro for unlimited script processing.`}
            compact
          />
        </div>
      )}

      {/* Usage Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-lg font-semibold flex items-center justify-center gap-2">
              {finalUserTier === 'pro' ? (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-amber-100 dark:from-indigo-900/30 dark:to-amber-900/30 rounded-full border border-indigo-200/50 dark:border-indigo-700/30">
                  <Crown className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">Pro Plan</span>
                </span>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Usage Quota
                </>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {finalUserTier === 'pro' ? (
                <span className="bg-gradient-to-r from-indigo-600 to-amber-600 dark:from-indigo-400 dark:to-amber-400 bg-clip-text text-transparent font-medium">
                  Unlimited access
                </span>
              ) : (
                'Free tier monthly limit'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {finalUserTier === 'pro' ? (
              <div className="text-center py-4 px-3 bg-gradient-to-br from-indigo-50/80 to-amber-50/80 dark:from-indigo-950/10 dark:to-amber-950/10 rounded-lg border border-indigo-200/30 dark:border-indigo-800/20">
                <div className="relative mb-3">
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full"></div>
                  <Crown className="h-6 w-6 text-amber-500 mx-auto" />
                </div>
                <p className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-amber-600 dark:from-indigo-400 dark:to-amber-400 bg-clip-text text-transparent mb-1">
                  Unlimited Pages
                </p>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                  Enjoy unlimited script processing
                </p>
              </div>
            ) : (
              <div className="text-center py-1">
                <div className="mb-2">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {pagesUsed}/{totalPages}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    pages used
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300" 
                      style={{ width: `${usagePercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {usagePercentage}% used
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 pb-4 flex justify-center">
            {userTier === 'free' && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/upgrade">
                  Upgrade for unlimited pages
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-lg font-semibold">Scripts Uploaded</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Total scripts in your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-1">
              <div className="mb-2">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {isLoadingScripts ? "..." : Array.isArray(scripts) ? scripts.length : 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  scripts
                </div>
              </div>
              <div className="mb-2">
                <div className="text-sm text-muted-foreground font-medium">
                  Total in your account
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-4 flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/upload">
                Upload New Script
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Scripts</h2>
          <Button variant="link" asChild>
            <Link href="/projects">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        
        {isLoadingScripts ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-9 bg-muted rounded w-full"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : Array.isArray(scripts) && scripts.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {scripts.slice(0, 3).map((script: any) => (
              <Card key={script.id}>
                <CardHeader>
                  <CardTitle>{truncate(script.title, 30)}</CardTitle>
                  <CardDescription>
                    Uploaded {formatDate(script.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {script.pageCount} pages • {script.fileType.toUpperCase()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  {Array.isArray(parseJobs) && parseJobs.find((job: any) => job.scriptId === script.id && job.status === 'completed') ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/review/${parseJobs.find((job: any) => job.scriptId === script.id)?.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <a href={`/api/jobs/${parseJobs.find((job: any) => job.scriptId === script.id)?.id}/download`}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/columns/${script.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/columns/${script.id}`}>
                          Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No scripts uploaded yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first script to get started
                </p>
                <Button asChild>
                  <Link href="/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload a Script
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-indigo-200/50 dark:border-indigo-800/30 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-amber-50 dark:hover:from-indigo-950/20 dark:hover:to-amber-950/20 hover:border-indigo-300/60 dark:hover:border-indigo-700/50 rounded-lg py-6 px-4 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-indigo-500/10">
            <Link href="/upload" className="flex flex-col items-center text-center w-full text-foreground no-underline">
              <Upload className="h-6 w-6 mb-3 text-indigo-600 dark:text-indigo-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300" />
              <span className="text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300 font-medium">Upload Script</span>
            </Link>
          </div>
          
          <div className="border border-indigo-200/50 dark:border-indigo-800/30 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-amber-50 dark:hover:from-indigo-950/20 dark:hover:to-amber-950/20 hover:border-indigo-300/60 dark:hover:border-indigo-700/50 rounded-lg py-6 px-4 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-indigo-500/10">
            <Link href="/projects" className="flex flex-col items-center text-center w-full text-foreground no-underline">
              <Eye className="h-6 w-6 mb-3 text-indigo-600 dark:text-indigo-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300" />
              <span className="text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300 font-medium">View Projects</span>
            </Link>
          </div>
          
          <div className="border border-indigo-200/50 dark:border-indigo-800/30 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-amber-50 dark:hover:from-indigo-950/20 dark:hover:to-amber-950/20 hover:border-indigo-300/60 dark:hover:border-indigo-700/50 rounded-lg py-6 px-4 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-indigo-500/10">
            <Link href="/contact" className="flex flex-col items-center text-center w-full text-foreground no-underline">
              <MessageSquare className="h-6 w-6 mb-3 text-indigo-600 dark:text-indigo-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300" />
              <span className="text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300 font-medium">Get help</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
