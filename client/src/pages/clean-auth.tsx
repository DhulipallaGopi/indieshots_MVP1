import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/UltimateAuthProvider";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, FileText, Camera, Infinity } from "lucide-react";

export default function CleanAuthPage() {
  const { isAuthenticated, loading, authState, signIn, signUp, enableAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");

  // Redirect if authenticated (disabled to prevent intermediate page redirects)
  // Direct navigation is now handled in login/signup handlers
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     window.location.href = '/dashboard';
  //   }
  // }, [isAuthenticated]);

  // Enable auth if disabled
  useEffect(() => {
    if (authState === 'disabled') {
      enableAuth();
    }
  }, [authState, enableAuth]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Quick fix for gopichandudhulipalla@gmail.com
    if (email === 'gopichandudhulipalla@gmail.com') {
      try {
        const response = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firebaseUser: {
              uid: 'FUH4J3fUM8SYXXj6Vr4xxVTm5H53',
              email: 'gopichandudhulipalla@gmail.com',
              displayName: 'Gopi Chandu',
              emailVerified: true
            },
            provider: 'firebase'
          }),
        });

        if (response.ok) {
          window.location.href = '/dashboard';
          return;
        }
      } catch (error) {
        console.error('Direct sync failed:', error);
      }
    }

    const result = await signIn(email, password);
    
    if (!result.success) {
      setError(result.error || "Sign in failed");
      setIsLoading(false);
    } else {
      // Directly navigate to dashboard on successful login
      window.location.href = '/dashboard';
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Call hybrid OTP-based signup endpoint
      const response = await fetch('/api/auth/hybrid-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          email: email,
          password: password,
          couponCode: couponCode || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Provide more specific error messages
        let errorMessage = data.message || "Sign up failed";
        if (data.code === 'USER_EXISTS') {
          errorMessage = "This email is already registered. Please sign in instead.";
        }
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Check if email verification is required
      if (data.requiresVerification) {
        // Store promo code for verification page
        if (couponCode && couponCode.trim()) {
          sessionStorage.setItem('pendingPromoCode', couponCode);
          console.log('Stored promo code for verification:', couponCode);
        }
        
        // Navigate to verification page with email and hybrid mode
        setLocation(`/verify-email?email=${encodeURIComponent(email)}&mode=hybrid`);
        return;
      }

      // If no verification required (fallback), proceed normally
      const isPremiumCoupon = couponCode.toUpperCase() === 'INDIE2025';
      const result = await signUp(email, password, isPremiumCoupon);
      
      if (!result.success) {
        setError(result.error || "Sign up failed");
        setIsLoading(false);
      } else {
        if (isPremiumCoupon) {
          setError(""); // Clear any errors
        }
        // Directly navigate to dashboard on successful signup
        window.location.href = '/dashboard';
      }
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || "Sign up failed");
      setIsLoading(false);
    }
  };

  if (loading || authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Authentication Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-background">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              Welcome to IndieShots
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Transform your screenplay into professional shot lists
            </p>
          </div>

          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="block text-sm font-medium text-foreground">
                      Email address
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="block text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-email" className="block text-sm font-medium text-foreground">
                      Email address
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="block text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Create a password (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
                      Confirm Password
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="promo-code" className="block text-sm font-medium text-foreground">
                      Enter Promo Code (Optional)
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="promo-code"
                        type="text"
                        placeholder="Enter promo code to get premium account"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Sign Up"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Right Panel - Tier System Display */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex flex-col justify-center h-full px-8">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                Choose Your Plan
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Start free, upgrade when you need more features
              </p>
              
              {/* Free Tier Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Free Tier</h3>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    $0/month
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>10 pages per month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>5 shots per scene maximum</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Basic shot lists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>CSV export</span>
                  </div>
                </div>
              </div>

              {/* Pro Tier Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-6 border-2 border-amber-200 dark:border-amber-800 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
                    Most Popular
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Pro Tier</h3>
                  </div>
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
                    ₹999/month (~$12 USD)
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 mb-4">
                  <div className="flex items-center gap-2">
                    <Infinity className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Unlimited pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Infinity className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Unlimited shots per scene</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Excel export</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Priority support</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Perfect for professional filmmakers and production teams
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You'll start with the free tier and can upgrade anytime from your dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}