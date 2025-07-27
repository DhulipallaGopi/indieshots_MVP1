import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FirebaseDomainChecker() {
  const [domains, setDomains] = useState<string[]>([]);

  const checkCurrentDomains = () => {
    const currentDomains = [
      window.location.hostname,
      window.location.host,
      `${window.location.protocol}//${window.location.host}`,
      window.location.origin,
    ];
    setDomains(currentDomains);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Firebase Domain Authorization Fix</CardTitle>
        <CardDescription>
          Add these exact domains to your Firebase Console → Authentication → Settings → Authorized domains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkCurrentDomains} className="w-full">
          Get Current Domain Information
        </Button>
        
        {domains.length > 0 && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Add these domains to Firebase Console:</p>
                <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                  {domains.map((domain, index) => (
                    <div key={index} className="break-all">
                      {domain}
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">Also add these wildcard domains:</p>
                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <div>*.replit.dev</div>
                    <div>*.replit.app</div>
                    <div>localhost</div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Steps to fix Firebase authorization:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a></li>
                <li>Select your project: <code className="bg-muted px-1 rounded">indieshots-c6bb1</code></li>
                <li>Navigate to <strong>Authentication</strong> → <strong>Settings</strong> → <strong>Authorized domains</strong></li>
                <li>Click <strong>Add domain</strong> and add each domain above</li>
                <li>Save changes and test authentication again</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}