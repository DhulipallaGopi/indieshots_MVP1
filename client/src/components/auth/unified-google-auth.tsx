import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export function UnifiedGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check for redirect result on component mount
  useEffect(() => {
    checkForRedirectResult();
  }, []);

  const checkForRedirectResult = async () => {
    try {
      const { getRedirectResult } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      
      const result = await getRedirectResult(auth);
      if (result?.user) {
        console.log("Google redirect authentication successful:", result.user.email);
        await createBackendSession(result);
      }
    } catch (error: any) {
      console.log("No redirect result or error:", error.code);
      if (error.code === 'auth/unauthorized-domain') {
        setDomainError(true);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    setDomainError(false);

    try {
      // Import Firebase dynamically
      const { GoogleAuthProvider, signInWithRedirect, signInWithPopup } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      // Configure Google provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log("Starting Google authentication...");
      console.log("Current domain:", window.location.hostname);

      try {
        // Try popup first for better UX
        console.log("Attempting Google popup authentication...");
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          console.log("Google popup authentication successful:", result.user.email);
          await createBackendSession(result);
          return;
        }
      } catch (popupError: any) {
        console.log("Popup authentication error:", popupError.code, popupError.message);
        
        if (popupError.code === 'auth/unauthorized-domain') {
          console.log("Domain not authorized for authentication");
          setDomainError(true);
          setLoading(false);
          return;
        }
        
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user') {
          // Fall back to redirect
          console.log("Popup blocked/closed, using redirect method...");
          try {
            await signInWithRedirect(auth, provider);
            return;
          } catch (redirectError: any) {
            console.error("Redirect authentication also failed:", redirectError);
            throw redirectError;
          }
        }
        
        // If it's not a domain or popup issue, continue with the error
        throw popupError;
      }
      
    } catch (error: any) {
      console.error("Google authentication error:", error);
      setLoading(false);
      
      let message = "Google sign-in failed";
      
      if (error.code === 'auth/unauthorized-domain') {
        setDomainError(true);
        message = "This domain is not authorized for Google sign-in.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google sign-in is not enabled.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Please allow popups and try again.";
      } else if (error.message) {
        message = error.message;
      }
      
      setError(message);
      
      toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const createBackendSession = async (result: any) => {
    try {
      console.log("Creating backend session for:", result.user.email);
      
      const idToken = await result.user.getIdToken(true);
      
      const authData = {
        idToken,
        provider: 'google.com',
        providerUserId: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authData),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("Backend session created successfully");
        
        // Update the auth query cache
        queryClient.setQueryData(["/api/auth/user"], responseData);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          description: `Welcome ${result.user.displayName || result.user.email}!`,
        });
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error('Failed to create session: ' + errorData.message);
      }
    } catch (error: any) {
      console.error("Backend session error:", error);
      setError("Failed to complete authentication");
      setLoading(false);
    }
  };

  const handleDomainFallback = () => {
    setDomainError(false);
    toast({
      title: "Use Email Authentication",
      description: "Google sign-in isn't available on this domain. Please use email and password instead.",
    });
  };

  if (domainError) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>
            Google sign-in is not available on this domain ({window.location.hostname}). 
            Please use email and password authentication instead.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={handleDomainFallback}
          className="w-full"
        >
          Use Email Authentication
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button 
        variant="outline" 
        type="button" 
        onClick={handleGoogleAuth}
        disabled={loading || !!user}
        className="flex items-center justify-center gap-2 w-full"
      >
        <SiGoogle className="h-4 w-4" />
        <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
      </Button>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <p className="text-xs text-muted-foreground text-center">
        Secure authentication with Google
      </p>
    </div>
  );
}