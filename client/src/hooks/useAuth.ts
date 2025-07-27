import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  password: string;
}

// Magic link functionality removed

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get current user with persistent authentication check
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: true, // Check auth when window regains focus
    refetchOnMount: true, // Check auth when component mounts
    refetchInterval: false,
  });
  
  const isAuthenticated = !!user;
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/signin", credentials);
      const responseData = await response.json();
      
      if (!response.ok) {
        const error = new Error(responseData.message || "Login failed");
        (error as any).code = responseData.code;
        (error as any).suggestion = responseData.suggestion;
        throw error;
      }
      
      // Check if response contains an error code even with 200 status
      if (responseData.code === 'USER_NOT_FOUND') {
        const error = new Error(responseData.message);
        (error as any).code = responseData.code;
        throw error;
      }
      
      return responseData;
    },
    onSuccess: (data) => {
      // Only proceed if we have valid user data (not an error response)
      if (data && data.id && !data.code) {
        queryClient.setQueryData(["/api/auth/user"], data);
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      }
    },
    onError: (error: any) => {
      let message = "";
      
      if (error.code === 'USER_NOT_FOUND') {
        message = "This email is not registered";
      } else if (error.code === 'INVALID_PASSWORD') {
        message = "Incorrect password. Please try again.";
      } else if (error.code === 'WRONG_PROVIDER') {
        message = "This email uses a different sign-in method.";
      } else {
        message = "Sign in failed. Please try again.";
      }
      
      toast({
        description: message,
        variant: "destructive",
      });
    },
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        description: "Account created successfully! Welcome to IndieShots.",
      });
    },
    onError: (error: Error) => {
      let message = "";
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
      } else {
        message = "Sign up failed. Please try again.";
      }
      
      toast({
        description: message,
        variant: "destructive",
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was a problem logging you out. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send password reset email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: "If your email is registered, you will receive a password reset link shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send password reset email",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now login with your new password.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Magic link functionality removed

  // Comprehensive logout function
  const logout = async () => {
    try {
      // Clear Firebase authentication first if available
      try {
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        await signOut(auth);
        console.log("Firebase signout successful");
      } catch (firebaseError) {
        console.log("Firebase signout not needed or failed:", firebaseError);
      }
      
      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear the user query cache
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear(); // Clear all cached data
      
      // Make logout API call to clear server-side session
      await apiRequest("POST", "/api/auth/logout");
      
      console.log("Logout completed successfully");
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local data even if API call fails
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      return true;
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    logout,
    loginMutation,
    registerMutation,
    logoutMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  };
}