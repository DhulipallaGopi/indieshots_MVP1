import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";

export function GoogleAuthTest() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testGoogleAuth = async () => {
    setLoading(true);
    setStatus("Starting Google authentication test...");
    setError("");

    try {
      // Import Firebase modules
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      setStatus("Firebase modules loaded successfully");

      // Configure provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      setStatus("Attempting Google sign-in popup...");

      // Try authentication
      const result = await signInWithPopup(auth, provider);
      
      if (result?.user) {
        setStatus(`Success! User: ${result.user.email}`);
        
        // Test backend session creation
        setStatus("Creating backend session...");
        
        const idToken = await result.user.getIdToken(true);
        
        const response = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            idToken,
            provider: 'google.com',
            providerUserId: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          }),
        });

        if (response.ok) {
          setStatus("Complete! Backend session created successfully");
        } else {
          const errorData = await response.json();
          setError(`Backend session failed: ${errorData.message}`);
        }
      }
      
    } catch (error: any) {
      console.error("Google auth test error:", error);
      setError(`Error: ${error.code} - ${error.message}`);
      setStatus("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Google Authentication Test</h3>
      
      <Button 
        onClick={testGoogleAuth}
        disabled={loading}
        className="flex items-center gap-2"
      >
        <SiGoogle className="h-4 w-4" />
        Test Google Authentication
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
      
      <div className="text-xs text-muted-foreground">
        Current domain: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}
      </div>
    </div>
  );
}