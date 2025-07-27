import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

export function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    setLoading(true);
    
    try {
      // Import Firebase dynamically to avoid initialization issues
      const { GoogleAuthProvider, signInWithRedirect, getRedirectResult } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      // Check for redirect result first (user returning from Google)
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Google redirect result found:", result.user.email);
          await createBackendSession(result);
          return;
        }
      } catch (redirectError: any) {
        console.log("No redirect result or error:", redirectError.code);
      }

      // Configure Google provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log("Starting Google authentication redirect");
      
      // Use redirect method for better compatibility with Replit domains
      await signInWithRedirect(auth, provider);
      
    } catch (error: any) {
      console.error("Google authentication error:", error);
      setLoading(false);
      
      let message = "Google sign-in failed";
      
      if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized for Google sign-in. Please use email/password authentication or contact support at indieshots@theindierise.com.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google sign-in is not enabled. Please use email/password authentication.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Please allow popups and try again, or use email/password authentication.";
      } else if (error.message) {
        message = error.message;
      }
      
      toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const createBackendSession = async (result: any) => {
    try {
      const idToken = await result.user.getIdToken(true);
      
      const authData = {
        idToken,
        provider: 'google.com',
        providerUserId: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      
      console.log("Creating backend session for:", result.user.email);
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authData),
      });
      
      if (response.ok) {
        console.log("Backend session created successfully");
        toast({
          title: "Welcome!",
          description: `Successfully signed in as ${result.user.displayName || result.user.email}`,
        });
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        const errorData = await response.json();
        console.error("Backend session creation failed:", errorData);
        throw new Error(errorData.message || 'Failed to create session');
      }
    } catch (error: any) {
      console.error("Backend session error:", error);
      toast({
        title: "Session Error",
        description: error.message || "Failed to create user session",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      type="button" 
      onClick={handleGoogleAuth}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full"
    >
      <SiGoogle className="h-4 w-4" />
      <span>{loading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
    </Button>
  );
}