import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function RedirectHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handleGoogleRedirect = async () => {
      try {
        // Import Firebase modules
        const { getRedirectResult } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");

        // Check for redirect result
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          console.log("Processing Google redirect result for:", result.user.email);
          
          // Create backend session
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
            toast({
              title: "Session Error",
              description: errorData.message || "Failed to create user session",
              variant: "destructive"
            });
          }
        }
      } catch (error: any) {
        if (error.code !== 'auth/no-auth-event') {
          console.error("Redirect result error:", error);
          toast({
            title: "Authentication Error",
            description: error.message || "Failed to process authentication",
            variant: "destructive"
          });
        }
      }
    };

    // Only handle redirect on auth pages
    if (window.location.pathname.includes('/auth') || 
        window.location.pathname.includes('/login') || 
        window.location.pathname.includes('/signup')) {
      handleGoogleRedirect();
    }
  }, [toast]);

  return null;
}