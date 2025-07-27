import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function TestPromoFlow() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("testpass123");
  const [otp, setOtp] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (step: string, data: any) => {
    setResults(prev => [...prev, { step, data, timestamp: new Date().toISOString() }]);
  };

  const testPromoSignup = async () => {
    if (!email || !firstName || !lastName) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      // Step 1: Signup with INDIE2025 promo code
      console.log("Testing signup with INDIE2025...");
      const signupResponse = await fetch('/api/auth/hybrid-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          couponCode: 'INDIE2025'
        })
      });

      const signupData = await signupResponse.json();
      addResult("Signup with INDIE2025", { 
        success: signupResponse.ok, 
        status: signupResponse.status,
        data: signupData 
      });

      if (!signupResponse.ok) {
        setIsLoading(false);
        return;
      }

      // Step 2: Test promo code validation directly
      const promoResponse = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'INDIE2025',
          email
        })
      });

      if (promoResponse.ok) {
        const promoData = await promoResponse.json();
        addResult("Promo Code Validation", { 
          success: true,
          data: promoData 
        });
      }

      console.log("✓ Ready for OTP verification");
      addResult("Ready for Verification", { 
        message: "Check server console for OTP code, then enter it above and click 'Verify OTP'"
      });

    } catch (error: any) {
      addResult("Error", { error: error?.message || String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const testOTPVerification = async () => {
    if (!otp || !email) {
      alert("Please enter OTP code");
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP
      const verifyResponse = await fetch('/api/auth/hybrid-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp
        })
      });

      const verifyData = await verifyResponse.json();
      addResult("OTP Verification", { 
        success: verifyResponse.ok,
        status: verifyResponse.status,
        data: verifyData 
      });

      if (verifyResponse.ok && verifyData.token) {
        // Try Firebase custom token authentication
        try {
          const { signInWithCustomToken } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          
          const userCredential = await signInWithCustomToken(auth, verifyData.token);
          
          addResult("Firebase Authentication", {
            success: true,
            data: {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              emailVerified: userCredential.user.emailVerified
            }
          });

          // Test Firebase custom claims
          const idToken = await userCredential.user.getIdToken(true);
          const claims = await userCredential.user.getIdTokenResult();
          
          addResult("Firebase Custom Claims", {
            success: true,
            data: {
              customClaims: claims.claims,
              tier: claims.claims.tier
            }
          });

          // Test backend sync
          const syncResponse = await fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              firebaseUser: {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
                photoURL: userCredential.user.photoURL,
                emailVerified: userCredential.user.emailVerified
              },
              provider: 'firebase'
            })
          });

          const syncData = await syncResponse.json();
          addResult("Backend Sync", {
            success: syncResponse.ok,
            status: syncResponse.status,
            data: syncData
          });

        } catch (firebaseError: any) {
          addResult("Firebase Error", { error: firebaseError?.message || String(firebaseError) });
        }
      }

    } catch (error: any) {
      addResult("Verification Error", { error: error?.message || String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const testFreeSignup = async () => {
    const freeEmail = `free${Date.now()}@example.com`;
    setIsLoading(true);

    try {
      const signupResponse = await fetch('/api/auth/hybrid-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: "Free",
          lastName: "User",
          email: freeEmail,
          password: "testpass123"
          // No couponCode
        })
      });

      const signupData = await signupResponse.json();
      addResult("Free Tier Signup", { 
        success: signupResponse.ok, 
        status: signupResponse.status,
        data: signupData,
        email: freeEmail
      });

    } catch (error: any) {
      addResult("Free Signup Error", { error: error?.message || String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Promo Code Flow Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter test email"
              />
            </div>

            <div>
              <Label htmlFor="otp">OTP Code (from server console)</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={testPromoSignup} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Testing..." : "Test INDIE2025 Signup"}
              </Button>
              
              <Button 
                onClick={testOTPVerification} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Verify OTP
              </Button>
              
              <Button 
                onClick={testFreeSignup} 
                disabled={isLoading}
                variant="outline"
              >
                Test Free Signup
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded p-4 bg-white">
                  <div className="font-semibold text-sm text-gray-600 mb-2">
                    {result.step} - {result.timestamp}
                  </div>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}