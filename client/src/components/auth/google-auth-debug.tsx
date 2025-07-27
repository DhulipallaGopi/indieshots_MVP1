import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

export function GoogleAuthDebug() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const testGoogleAuth = async () => {
    setLoading(true);
    setError("");
    setStatus("Starting authentication test...");

    try {
      // Import Firebase modules
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      setStatus("Configuring Google provider...");
      
      // Configure Google provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      setStatus("Attempting popup authentication...");
      console.log("Starting Google authentication test");
      console.log("Current domain:", window.location.hostname);
      console.log("Full URL:", window.location.href);

      // Try authentication
      const result = await signInWithPopup(auth, provider);
      
      if (result?.user) {
        setStatus(`Authentication successful! User: ${result.user.email}`);
        console.log("Google authentication successful:", result.user);
        
        // Test backend session creation
        setStatus("Creating backend session...");
        
        const idToken = await result.user.getIdToken(true);
        console.log("Got Firebase ID token, length:", idToken.length);
        
        const authData = {
          idToken,
          provider: 'google.com',
          providerUserId: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        };
        
        console.log("Sending authentication data to backend:", {
          email: authData.email,
          provider: authData.provider,
          hasToken: !!authData.idToken
        });

        const response = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(authData),
        });

        console.log("Backend response status:", response.status);
        console.log("Backend response headers:", Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const responseData = await response.json();
          console.log("Backend session created successfully:", responseData);
          setStatus("Complete! Authentication successful and session created");
          
          toast({
            description: `Welcome ${result.user.displayName || result.user.email}!`,
          });
          
          // Test redirect
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        } else {
          const errorData = await response.json();
          console.error("Backend session creation failed:", errorData);
          setError(`Backend session failed: ${errorData.message}`);
        }
      }
      
    } catch (error: any) {
      console.error("Google auth test error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      setError(`Error: ${error.code} - ${error.message}`);
      setStatus("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Google Authentication Debug</h3>
      
      <Button 
        onClick={testGoogleAuth}
        disabled={loading}
        className="flex items-center gap-2 w-full"
      >
        <SiGoogle className="h-4 w-4" />
        {loading ? 'Testing...' : 'Test Google Authentication'}
      </Button>

      {status && (
        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Current domain: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}</div>
        <div>Current URL: {typeof window !== 'undefined' ? window.location.href : 'unknown'}</div>
        <div>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'unknown'}</div>
      </div>
    </div>
  );
}