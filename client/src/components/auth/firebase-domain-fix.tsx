import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, AlertTriangle } from "lucide-react";

export function FirebaseDomainFix() {
  const [currentDomain, setCurrentDomain] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  useState(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.hostname);
    }
  });

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  const authorizedDomains = [
    "localhost",
    "indieshots-c6bb1.firebaseapp.com",
    currentDomain
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Google Authentication Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Current domain: <code>{currentDomain}</code> needs to be authorized for Google sign-in.
          </AlertDescription>
        </Alert>

        <Button onClick={handleShowInstructions} variant="outline" className="w-full">
          Show Setup Instructions
        </Button>

        {showInstructions && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold">Firebase Console Setup Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Go to{" "}
                <a
                  href="https://console.firebase.google.com/project/indieshots-c6bb1/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Firebase Console <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Navigate to Authentication → Settings → Authorized domains</li>
              <li>Click "Add domain"</li>
              <li>
                Add this domain: <code className="bg-background px-1 rounded">{currentDomain}</code>
              </li>
              <li>Click "Save"</li>
              <li>Return here and try Google authentication again</li>
            </ol>

            <Alert>
              <AlertDescription>
                <strong>Alternative:</strong> Use email/password authentication which works on all domains without additional setup.
              </AlertDescription>
            </Alert>

            <div className="bg-background p-3 rounded text-xs">
              <strong>Current authorized domains should include:</strong>
              <ul className="mt-1 space-y-1">
                {authorizedDomains.map((domain) => (
                  <li key={domain}>• {domain}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}