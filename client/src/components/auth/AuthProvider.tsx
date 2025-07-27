import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  getRedirectResult,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@shared/schema";
import { AuthControl } from "@/lib/authControl";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  setLogoutState: (state: boolean) => void;
  disableAuth: (disabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  isAuthenticated: false,
  setLogoutState: () => {},
  disableAuth: () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authDisabled, setAuthDisabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // Check if authentication is disabled via AuthControl
      if (AuthControl.isAuthDisabled()) {
        console.log("Authentication disabled - preventing any Firebase auth");
        setAuthDisabled(true);
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Check for redirect result first (handles Google redirect auth)
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && mounted) {
          console.log(
            "✓ Google redirect authentication successful:",
            redirectResult.user.email,
          );

          // Show immediate success feedback
          const isNewUser =
            redirectResult.user.metadata.creationTime ===
            redirectResult.user.metadata.lastSignInTime;
          const message = isNewUser
            ? `Account created! Welcome ${redirectResult.user.displayName || redirectResult.user.email}!`
            : `Welcome back ${redirectResult.user.displayName || redirectResult.user.email}!`;

          // Create a temporary success notification
          const notification = document.createElement("div");
          notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: #10b981; color: white; padding: 12px 20px;
            border-radius: 8px; font-family: system-ui; font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          `;
          notification.textContent = message;
          document.body.appendChild(notification);

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
        }
      } catch (error: any) {
        console.error("Redirect result error:", error);
        if (error.code === "auth/unauthorized-domain") {
          console.error("Domain not authorized for Google authentication");
        }
      }

      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;

        console.log(
          "Firebase auth state changed:",
          firebaseUser?.email || "No user",
        );

        // Critical check: Prevent any authentication if disabled via AuthControl
        if (AuthControl.isAuthDisabled()) {
          console.log("Authentication disabled via AuthControl - blocking Firebase auth");
          if (firebaseUser) {
            // Force signout immediately without triggering more state changes
            try {
              const { signOut } = await import("firebase/auth");
              await signOut(auth);
            } catch (e) {
              console.log("Silent signout during disabled state");
            }
          }
          setFirebaseUser(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Check if we're in the middle of a logout process or auth is disabled
        if (isLoggingOut || authDisabled) {
          console.log("Ignoring auth state change - logout in progress or auth disabled");
          setFirebaseUser(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (firebaseUser) {
          setFirebaseUser(firebaseUser);

          // Create persistent backend session
          try {
            const idToken = await firebaseUser.getIdToken(true); // Force refresh
            const provider =
              firebaseUser.providerData[0]?.providerId || "password";

            console.log("Creating backend session for provider:", provider);
            console.log("Making request to /api/auth/firebase-login");

            const authData = {
              idToken,
              provider: provider === "google.com" ? "google.com" : "password",
              providerUserId: firebaseUser.uid,
              email: firebaseUser.email,
              displayName:
                firebaseUser.displayName || firebaseUser.email?.split("@")[0],
              photoURL: firebaseUser.photoURL,
            };

            console.log("Auth data being sent:", authData);

            const response = await fetch("/api/auth/firebase-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(authData),
            });

            console.log("Backend response status:", response.status);

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              console.log("Backend session created for:", firebaseUser.email);

              // Auto-redirect if on auth page
              if (
                window.location.pathname === "/auth" ||
                window.location.pathname === "/login" ||
                window.location.pathname === "/signup"
              ) {
                console.log("Redirecting authenticated user to dashboard");
                window.location.replace("/dashboard");
              }
            } else {
              console.error(
                "Backend session creation failed:",
                response.status,
              );
              const errorData = await response.json().catch(() => ({}));
              console.error("Error details:", errorData);
              setUser(null);
            }
          } catch (error) {
            console.error("Backend session error:", error);
            setUser(null);
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }

        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribe = initializeAuth();

    return () => {
      mounted = false;
      unsubscribe.then((unsub) => unsub && unsub());
    };
  }, []);

  const value = {
    user,
    firebaseUser,
    loading,
    isAuthenticated: !!user && !!firebaseUser,
    setLogoutState: setIsLoggingOut,
    disableAuth: setAuthDisabled,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
