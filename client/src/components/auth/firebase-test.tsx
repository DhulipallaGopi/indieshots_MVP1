import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState } from "react";

export function FirebaseTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFirebaseTest = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      addResult("Starting Firebase connectivity test...");
      
      // Test 1: Check Firebase initialization
      addResult(`Firebase app name: ${auth.app.name}`);
      addResult(`Firebase project ID: ${auth.app.options.projectId}`);
      addResult(`Firebase auth domain: ${auth.app.options.authDomain}`);
      
      // Test 2: Check domain
      addResult(`Current domain: ${window.location.hostname}`);
      addResult(`Full URL: ${window.location.href}`);
      
      // Test 3: Test Google provider setup
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      addResult("Google provider configured successfully");
      
      // Test 4: Attempt sign-in
      addResult("Attempting Google sign-in...");
      
      const result = await signInWithPopup(auth, provider);
      addResult(`Success! User: ${result.user.email}`);
      
    } catch (error: any) {
      addResult(`Error: ${error.code} - ${error.message}`);
      
      if (error.code === 'auth/unauthorized-domain') {
        addResult("SOLUTION: Add this domain to Firebase Console > Authentication > Settings > Authorized domains");
      } else if (error.code === 'auth/operation-not-allowed') {
        addResult("SOLUTION: Enable Google sign-in in Firebase Console > Authentication > Sign-in method");
      } else if (error.code === 'auth/popup-blocked') {
        addResult("SOLUTION: Allow popups in browser settings");
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Firebase Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runFirebaseTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? "Testing..." : "Run Firebase Test"}
        </Button>
        
        {testResults.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Test Results:</h4>
            <div className="space-y-1 text-sm font-mono">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}