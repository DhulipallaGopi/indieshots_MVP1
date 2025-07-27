import { useState, useEffect } from "react";
import { 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Initialize Google Auth Provider
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("=== Initializing Firebase Auth ===");
        
        // Check for redirect result first
        try {
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult?.user && mounted) {
            console.log("Google redirect sign-in successful");
            setUser(redirectResult.user);
            
            // Send to backend for session creation
            const idToken = await redirectResult.user.getIdToken();
            await fetch("/api/auth/firebase-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                idToken,
                provider: "google.com",
                providerUserId: redirectResult.user.uid,
                email: redirectResult.user.email,
                displayName: redirectResult.user.displayName,
                photoURL: redirectResult.user.photoURL,
              }),
            });
            
            window.location.href = '/dashboard';
            return;
          }
        } catch (redirectError) {
          console.log("No redirect result or error:", redirectError);
        }
        
        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log("Auth state changed:", firebaseUser?.email || "No user");
          
          if (firebaseUser && mounted) {
            setUser(firebaseUser);
            
            // Send to backend for persistent session creation
            try {
              const idToken = await firebaseUser.getIdToken();
              const provider = firebaseUser.providerData[0]?.providerId || 'password';
              
              console.log("Creating persistent session for provider:", provider);
              
              const response = await fetch("/api/auth/firebase-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  idToken,
                  provider: provider === 'google.com' ? 'google.com' : 'password',
                  providerUserId: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
                  photoURL: firebaseUser.photoURL,
                }),
              });
              
              if (response.ok) {
                console.log("Persistent session created for:", firebaseUser.email);
                
                // Only redirect if user is on auth page
                if (window.location.pathname === '/auth' || window.location.pathname === '/') {
                  console.log("Redirecting authenticated user to dashboard");
                  window.location.replace('/dashboard');
                }
              }
            } catch (error) {
              console.error("Backend sync error:", error);
            }
          } else {
            setUser(null);
          }
          
          if (mounted) {
            setLoading(false);
          }
        });
        
        return unsubscribe;
        
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log("=== Email Sign-in ===");
      console.log("Email:", email);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      if (result?.user) {
        console.log("Email sign-in successful");
        toast({
          title: "Welcome back!",
          description: `Signed in as ${result.user.email}`,
        });
        return result;
      }
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      
      let errorMessage = "Failed to sign in";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log("=== Email Sign-up ===");
      console.log("Email:", email);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (result?.user) {
        console.log("Email sign-up successful");
        toast({
          title: "Account created!",
          description: `Welcome to IndieShots, ${result.user.email}`,
        });
        return result;
      }
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      
      let errorMessage = "Failed to create account";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      }
      
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    console.log("🔥 signInWithGoogle function called");
    setLoading(true);
    try {
      console.log("🔥 Starting Google authentication with popup method");
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      console.log("🔥 Google provider configured, attempting popup");
      
      // Try popup method first - more reliable than redirect in many cases
      const result = await signInWithPopup(auth, provider);
      
      console.log("🔥 Popup result:", !!result?.user);
      
      if (result?.user) {
        console.log("🔥 Google popup authentication successful:", result.user.email);
        
        // Create backend session immediately
        const idToken = await result.user.getIdToken(true);
        console.log("🔥 Got ID token, length:", idToken.length);
        
        const provider_id = result.user.providerData[0]?.providerId || 'google.com';
        
        console.log("🔥 Creating backend session after popup success");
        
        const authData = {
          idToken,
          provider: 'google.com',
          providerUserId: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        };
        
        console.log("🔥 Sending auth data to backend:", { email: authData.email, provider: authData.provider });
        
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
        
        console.log("🔥 Backend response status:", response.status);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("🔥 Backend session created successfully:", responseData.message);
          
          toast({
            description: `Welcome ${result.user.displayName || result.user.email}!`,
          });
          
          // Redirect to dashboard
          console.log("🔥 Redirecting to dashboard");
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          const errorData = await response.json();
          console.error("🔥 Backend session creation failed:", errorData);
          throw new Error('Failed to create session: ' + errorData.message);
        }
      }
      
    } catch (error: any) {
      console.error("🔥 Google authentication error:", error);
      
      let message = "Google sign-in failed";
      
      if (error.code === 'auth/popup-closed-by-user') {
        message = "Sign-in was cancelled";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Please allow popups and try again";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Domain not authorized for Google sign-in";
      } else if (error.message) {
        message = error.message;
      }
      
      toast({
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      
      // Clear backend session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      
      window.location.href = '/auth';
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error signing out.",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
  };
};