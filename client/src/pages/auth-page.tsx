import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RedirectHandler } from "@/components/auth/redirect-handler";
import { FirebaseUnifiedAuth } from "@/components/auth/firebase-unified-auth";

import { Mail, Key } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const registerSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  couponCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();

  const { 
    user, 
    isAuthenticated, 
    loginMutation, 
    registerMutation, 
    forgotPasswordMutation,
  } = useAuth();

  const handleFallbackToEmail = () => {
    setActiveTab("login");
    toast({
      title: "Use Email Authentication",
      description: "Google sign-in isn't available on this domain. Please use email and password instead.",
    });
  };

  // Get query parameters
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const error = params.get("error");
  const verified = params.get("verified") === "true";

  // Login Form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register Form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      couponCode: "",
    },
  });

  // Forgot Password Form
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Show toast messages based on URL parameters
  useEffect(() => {
    if (error) {
      let errorMessage = "An error occurred";

      switch (error) {
        case "invalid-token":
          errorMessage = "Invalid or expired token";
          break;
        case "expired-token":
          errorMessage = "The link has expired";
          break;
        case "verification-failed":
          errorMessage = "Email verification failed";
          break;
        case "server-error":
          errorMessage = "Server error. Please try again";
          break;
        case "invalid-verification":
          errorMessage = "Invalid verification token";
          break;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }

    if (verified) {
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully. You can now log in.",
      });
    }
  }, [error, verified, toast]);

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated && user) {
    return <Redirect to="/dashboard" />;
  }

  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: (userData) => {
        // Only redirect if login was truly successful (user data exists)
        if (userData && userData.id && !userData.code) {
          window.location.href = '/dashboard';
        }
      },
      onError: (error: any) => {
        // Error handling is done in the useAuth hook
        console.log('Login error:', error.message);
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: (userData) => {
        // After successful registration, redirect to dashboard
        if (userData && userData.id) {
          toast({
            title: "Account created successfully!",
            description: "Welcome to IndieShots!",
          });
          window.location.href = '/dashboard';
        }
      }
    });
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate(data);
    forgotPasswordForm.reset();
    setShowForgotPassword(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <RedirectHandler />

      {/* Left column with auth forms */}
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="flex flex-col items-center">
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
              IndieShots
            </h1>
            <h2 className="mt-2 text-sm text-muted-foreground">
              Your screenplay to shot list converter
            </h2>
          </div>



          {showForgotPassword ? (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>
                  Enter your email to receive a password reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotPasswordForm}>
                  <form
                    onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="you@example.com"
                              type="email"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full"
                      >
                        Back to Login
                      </Button>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Tabs
              defaultValue="login"
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-8"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>
                      Enter your credentials to access your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FirebaseUnifiedAuth mode="login" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign Up</CardTitle>
                    <CardDescription>
                      Create a new account to start using IndieShots
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FirebaseUnifiedAuth mode="register" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Right column with hero image and text */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 object-cover bg-gradient-to-tr from-primary/90 via-primary/70 to-background flex flex-col justify-center px-12">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold text-white mb-6">
              Transform Scripts into Production-Ready Shot Lists
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Upload your screenplay and let our AI-powered tools break it down into organized shot lists that your entire production team can use.
            </p>
            <div className="space-y-4 text-white/90">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <p>Intelligent scene and character detection</p>
              </div>
              <div className="flex items-start">
                <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <p>Automatic location grouping for efficient scheduling</p>
              </div>
              <div className="flex items-start">
                <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <p>Export to industry-standard formats for your entire crew</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}