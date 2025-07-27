import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/UltimateAuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CleanLogoutPage() {
  const { logout, authState } = useAuth();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    const performLogout = async () => {
      try {
        console.log("Starting clean logout process...");
        const result = await logout();
        
        if (result.success) {
          setLoggedOut(true);
          console.log("Logout completed successfully");
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          console.error("Logout failed");
          // Still redirect even if logout partially failed
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      } catch (error) {
        console.error("Logout error:", error);
        // Redirect anyway
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    performLogout();
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Logging Out</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {!loggedOut ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p>Signing you out securely...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-green-600 text-2xl">✓</div>
              <p>You have been logged out successfully.</p>
              <p className="text-sm text-gray-600">Redirecting to home page...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}