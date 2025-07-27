import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { AlertTriangle, Info } from "lucide-react";

interface DomainAuthHandlerProps {
  onFallbackAuth: () => void;
}

export function DomainAuthHandler({ onFallbackAuth }: DomainAuthHandlerProps) {
  const [domainError, setDomainError] = useState(false);
  const [loading, setLoading] = useState(false);

  const getCurrentDomain = () => {
    return window.location.hostname;
  };

  const isReplotDomain = () => {
    const domain = getCurrentDomain();
    return domain.includes('replit.dev') || domain.includes('replit.app') || domain.includes('spock.replit.dev');
  };

  const tryGoogleAuth = async () => {
    setLoading(true);
    setDomainError(false);
    
    try {
      const { GoogleAuthProvider, signInWithRedirect, getRedirectResult } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      // First check if we're returning from a redirect
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Google redirect authentication successful:", result.user.email);
          await createBackendSession(result);
          return;
        }
      } catch (redirectError: any) {
        console.log("No redirect result:", redirectError.code);
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log("Starting Google redirect authentication on domain:", getCurrentDomain());

      // Use redirect method for better compatibility with Replit domains
      await signInWithRedirect(auth, provider);
      
    } catch (error: any) {
      console.error("Google authentication error:", error);
      
      if (error.code === 'auth/unauthorized-domain' || 
          error.message?.includes('unauthorized-domain') ||
          error.message?.includes('not authorized')) {
        setDomainError(true);
      }
      
      setLoading(false);
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
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authData),
      });
      
      if (response.ok) {
        window.location.href = '/dashboard';
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error("Backend session error:", error);
      setLoading(false);
    }
  };

  if (domainError) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Google sign-in failed. Domain: {getCurrentDomain()}. Try the test button below to see detailed error information.
          </AlertDescription>
        </Alert>
        
        <Button 
          variant="outline" 
          onClick={onFallbackAuth}
          className="w-full"
        >
          Use Email & Password Authentication
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      type="button" 
      onClick={tryGoogleAuth}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full"
    >
      <SiGoogle className="h-4 w-4" />
      <span>{loading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
    </Button>
  );
}