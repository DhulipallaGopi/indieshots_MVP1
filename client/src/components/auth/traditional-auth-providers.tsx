import { Button } from "@/components/ui/button";
import { SiGoogle, SiGithub } from "react-icons/si";
import { Facebook } from "lucide-react";
import { useState } from "react";

export function TraditionalAuthProviders() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    setLoading('google');
    window.location.href = '/api/auth/google';
  };

  const handleGithubSignIn = () => {
    setLoading('github');
    window.location.href = '/api/auth/github';
  };

  const handleFacebookSignIn = () => {
    setLoading('facebook');
    window.location.href = '/api/auth/facebook';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-center text-muted-foreground">
        Continue with
      </h3>
      
      <div className="grid gap-2">
        <Button 
          variant="outline" 
          type="button" 
          onClick={handleGoogleSignIn}
          disabled={loading === 'google'}
          className="flex items-center justify-center gap-2 w-full"
        >
          <SiGoogle className="h-4 w-4" />
          <span>Google</span>
        </Button>
        
        <Button 
          variant="outline" 
          type="button" 
          onClick={handleGithubSignIn}
          disabled={loading === 'github'}
          className="flex items-center justify-center gap-2 w-full"
        >
          <SiGithub className="h-4 w-4" />
          <span>GitHub</span>
        </Button>
        
        <Button 
          variant="outline" 
          type="button" 
          onClick={handleFacebookSignIn}
          disabled={loading === 'facebook'}
          className="flex items-center justify-center gap-2 w-full"
        >
          <Facebook className="h-4 w-4" />
          <span>Facebook</span>
        </Button>
      </div>
    </div>
  );
}