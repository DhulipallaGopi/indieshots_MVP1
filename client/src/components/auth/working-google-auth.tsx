import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

export function WorkingGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");

    try {
      // Import Firebase dynamically
      const { GoogleAuthProvider, signInWithRedirect, getRedirectResult } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      // First check if we have a redirect result (user returning from Google)
      const result = await getRedirectResult(auth);
      
      if (result?.user) {
        // User just returned from Google authentication
        console.log("Google authentication successful:", result.user.email);
        
        // Create backend session
        const idToken = await result.user.getIdToken(true);
        
        const response = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firebaseUser: {
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
              emailVerified: result.user.emailVerified
            },
            provider: 'firebase'
          }),
        });

        if (response.ok) {
          toast({
            title: "Welcome!",
            description: `Successfully signed in as ${result.user.displayName || result.user.email}`,
          });
          window.location.href = '/dashboard';
          return;
        } else {
          throw new Error('Failed to create backend session');
        }
      }

      // No redirect result, so initiate new authentication
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Set custom parameters for better UX
      provider.setCustomParameters({
        'prompt': 'select_account'
      });

      console.log("Starting Google redirect authentication...");
      
      // Use redirect for better compatibility
      await signInWithRedirect(auth, provider);
      
    } catch (error: any) {
      console.error("Google authentication error:", error);
      setLoading(false);
      
      let errorMessage = "Google authentication failed";
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = `Domain still not authorized: ${window.location.hostname}. Please verify the domain was added correctly to Firebase console.`;
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Google sign-in is not enabled in Firebase console.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked. Using redirect method...";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-3">
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
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <p className="text-xs text-muted-foreground text-center">
        Redirects to Google for secure authentication
      </p>
    </div>
  );
}