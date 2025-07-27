import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function ComprehensiveGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [authStep, setAuthStep] = useState<string>("");
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
      
      console.log("Checking for redirect result...");
      const result = await getRedirectResult(auth);
      
      if (result?.user) {
        console.log("Redirect result found:", result.user.email);
        setStatus("Processing redirect authentication...");
        await createBackendSession(result);
      } else {
        console.log("No redirect result found");
      }
    } catch (error: any) {
      console.log("Redirect result error:", error.code, error.message);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    setStatus("");
    setAuthStep("Starting authentication...");

    try {
      // Step 1: Import Firebase modules
      setAuthStep("Loading Firebase modules...");
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      // Step 2: Configure provider
      setAuthStep("Configuring Google provider...");
      const provider = new GoogleAuthProvider();
      
      // Add required scopes
      provider.addScope('email');
      provider.addScope('profile');
      
      // Set custom parameters for better UX
      provider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'online'
      });

      console.log("Firebase auth instance:", !!auth);
      console.log("Google provider configured:", !!provider);
      console.log("Current domain:", window.location.hostname);
      console.log("Current origin:", window.location.origin);

      // Step 3: Try popup authentication first
      setAuthStep("Attempting popup authentication...");
      
      try {
        console.log("Starting popup authentication...");
        const result = await signInWithPopup(auth, provider);
        
        if (result?.user) {
          console.log("Popup authentication successful!");
          console.log("User email:", result.user.email);
          console.log("User ID:", result.user.uid);
          console.log("Provider data:", result.user.providerData);
          
          setAuthStep("Authentication successful, creating session...");
          await createBackendSession(result);
          return;
        }
      } catch (popupError: any) {
        console.log("Popup authentication failed:", popupError.code, popupError.message);
        
        // Handle specific popup errors
        if (popupError.code === 'auth/popup-blocked') {
          setAuthStep("Popup blocked, trying redirect...");
          console.log("Popup blocked, falling back to redirect");
          
          try {
            await signInWithRedirect(auth, provider);
            setStatus("Redirecting to Google for authentication...");
            return;
          } catch (redirectError: any) {
            throw new Error(`Redirect also failed: ${redirectError.message}`);
          }
        }
        
        if (popupError.code === 'auth/popup-closed-by-user') {
          setError("Authentication was cancelled. Please try again.");
          setLoading(false);
          return;
        }
        
        if (popupError.code === 'auth/unauthorized-domain') {
          setError(`Domain ${window.location.hostname} is not authorized. Please add it to Firebase Console.`);
          setLoading(false);
          return;
        }
        
        // For other errors, throw to be handled below
        throw popupError;
      }
      
    } catch (error: any) {
      console.error("Google authentication error:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = "Google authentication failed";
      
      if (error.code === 'auth/invalid-api-key') {
        errorMessage = "Invalid Firebase API key configuration";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setAuthStep("");
      setLoading(false);
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const createBackendSession = async (result: any) => {
    try {
      setAuthStep("Getting Firebase ID token...");
      console.log("Creating backend session for:", result.user.email);
      
      // Get fresh ID token
      const idToken = await result.user.getIdToken(true);
      console.log("ID token obtained, length:", idToken.length);
      
      setAuthStep("Sending authentication data to server...");
      
      const authData = {
        idToken,
        provider: 'google.com',
        providerUserId: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      
      console.log("Sending auth data:", {
        provider: authData.provider,
        email: authData.email,
        hasToken: !!authData.idToken
      });
      
      const response = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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
      
      console.log("Backend response status:", response.status);
      console.log("Backend response headers:", Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("Backend session created successfully");
        console.log("Response data:", { id: responseData.id, email: responseData.email });
        
        setAuthStep("Session created successfully!");
        setStatus("Authentication complete!");
        
        // Update auth cache
        queryClient.setQueryData(["/api/auth/user"], responseData);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          description: `Welcome ${result.user.displayName || result.user.email}!`,
        });
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error("Backend session creation failed:", errorData);
        throw new Error(`Server error: ${errorData.message}`);
      }
    } catch (error: any) {
      console.error("Backend session creation error:", error);
      setError(`Failed to create session: ${error.message}`);
      setAuthStep("");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button 
        onClick={handleGoogleAuth}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full"
        size="lg"
      >
        <SiGoogle className="h-4 w-4" />
        <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
      </Button>
      
      {authStep && (
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Step:</strong> {authStep}
          </AlertDescription>
        </Alert>
      )}
      
      {status && (
        <Alert>
          <AlertDescription className="text-sm text-green-600">
            {status}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Domain: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}</div>
        <div>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'unknown'}</div>
      </div>
    </div>
  );
}