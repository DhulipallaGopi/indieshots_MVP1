import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Key, User } from "lucide-react";

interface UnifiedAuthProps {
  mode: 'login' | 'register';
}

export function FirebaseUnifiedAuth({ mode }: UnifiedAuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    couponCode: '' // Added coupon code field
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for redirect result on mount
  useEffect(() => {
    checkRedirectResult();
  }, []);

  const checkRedirectResult = async () => {
    try {
      const { getRedirectResult } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      const result = await getRedirectResult(auth);
      if (result?.user) {
        console.log("Google redirect successful:", result.user.email);
        await handleFirebaseUser(result.user, 'google', formData.couponCode);
      }
    } catch (error: any) {
      console.log("Redirect result error:", error.code);
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      let userCredential;

      if (mode === 'register') {
        // Create new Firebase user
        userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

        // Update user profile with name
        await updateProfile(userCredential.user, {
          displayName: `${formData.firstName} ${formData.lastName}`
        });

        console.log("Firebase user created:", userCredential.user.email);
      } else {
        // Sign in existing Firebase user
        userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        console.log("Firebase user signed in:", userCredential.user.email);
      }

      await handleFirebaseUser(userCredential.user, 'email', formData.couponCode);

    } catch (error: any) {
      console.error("Firebase email/password auth error:", error);

      let errorMessage = "";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else {
        errorMessage = error.message || "Authentication failed";
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");

    try {
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      try {
        // Try popup first
        const result = await signInWithPopup(auth, provider);
        console.log("Google popup successful:", result.user.email);
        await handleFirebaseUser(result.user, 'google', formData.couponCode);
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          // Fallback to redirect
          console.log("Using redirect method...");
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }

    } catch (error: any) {
      console.error("Google auth error:", error);

      let errorMessage = "";
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized for Google sign-in. Please contact support at indieshots@theindierise.com.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup blocked. Please allow popups and try again.";
      } else {
        errorMessage = error.message || "Google authentication failed";
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleFirebaseUser = async (firebaseUser: any, provider: string, couponCode?: string) => {
    try {
      console.log("Processing Firebase user:", firebaseUser.email);

      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken(true);

      // Create/update user in our backend database
      const response = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firebaseUser: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          },
          idToken,
          provider,
          couponCode
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("User synced successfully:", userData.email);

        // Update auth cache
        queryClient.setQueryData(["/api/auth/user"], userData);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        toast({
          description: `Welcome ${firebaseUser.displayName || firebaseUser.email}!`,
        });

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync user data');
      }

    } catch (error: any) {
      console.error("User sync error:", error);
      setError(`Failed to complete authentication: ${error.message}`);
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Email/Password Form */}
      <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="relative">
          <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className="pl-10"
            minLength={6}
            required
          />
        </div>

        {mode === 'register' && (
          <div className="relative">
            <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter promo code to get premium account"
              value={formData.couponCode}
              onChange={(e) => handleInputChange('couponCode', e.target.value)}
              className="pl-10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter a valid promo code to get premium features
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (mode === 'register' ? 'Creating Account...' : 'Signing In...') : 
                    (mode === 'register' ? 'Create Account' : 'Sign In')}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google Authentication */}
      <Button 
        onClick={handleGoogleAuth}
        disabled={loading}
        variant="outline"
        className="w-full flex items-center gap-2"
      >
        <SiGoogle className="h-4 w-4" />
        Continue with Google
      </Button>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground text-center">
        All authentication handled securely by Firebase
      </p>
    </div>
  );
}