import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthControl } from "@/lib/authControl";

export default function LogoutPage() {
  const { logout } = useAuth();
  const { setLogoutState, disableAuth } = useAuthContext();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    // Clear authentication and redirect immediately
    const performLogout = async () => {
      try {
        console.log("Starting logout process...");
        
        // Set logout state to prevent auto-relogin
        setLogoutState(true);
        
        // Disable authentication completely using AuthControl
        AuthControl.disableAuth();
        disableAuth(true);
        
        // Clear Firebase authentication completely to prevent auto-relogin
        try {
          const { signOut, browserSessionPersistence, setPersistence } = await import("firebase/auth");
          const { auth } = await import("@/lib/firebase");
          
          // First sign out the user
          await signOut(auth);
          console.log("Firebase signout completed");
          
          // Change persistence to session-only (clears on browser close)
          await setPersistence(auth, browserSessionPersistence);
          console.log("Firebase persistence changed to session-only");
          
          // Clear all Firebase-related data from localStorage
          const firebaseKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('firebase:')) {
              firebaseKeys.push(key);
            }
          }
          firebaseKeys.forEach(key => localStorage.removeItem(key));
          console.log("Firebase localStorage data cleared");
          
        } catch (firebaseError) {
          console.error("Firebase signout error:", firebaseError);
        }
        
        // Clear all authentication data using AuthControl
        AuthControl.clearAllAuthData();
        
        // Call the backend logout to clear server session
        await logout();
        setLoggedOut(true);
        
        // Wait a moment before redirect to ensure cleanup
        setTimeout(() => {
          console.log("Logout successful, redirecting to home...");
          window.location.href = "/";
        }, 100);
      } catch (error) {
        console.error("Logout error:", error);
        setLoggedOut(true);
        // Still redirect even if logout fails
        setTimeout(() => {
          console.log("Logout had errors, still redirecting to home...");
          window.location.href = "/";
        }, 100);
      }
    };

    performLogout();
  }, [logout, setLogoutState]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Logging out...</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            You have been successfully logged out.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to home page...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}