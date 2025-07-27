import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FirebaseDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      browser: {},
      firebase: {},
      network: {},
      permissions: {},
      cookies: {},
      popup: {}
    };

    try {
      // Browser Information
      results.browser = {
        userAgent: navigator.userAgent,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform,
        vendor: navigator.vendor
      };

      // Current Domain & Protocol
      results.domain = {
        hostname: window.location.hostname,
        origin: window.location.origin,
        protocol: window.location.protocol,
        port: window.location.port,
        href: window.location.href
      };

      // Firebase Configuration Check
      try {
        const { auth } = await import("@/lib/firebase");
        results.firebase = {
          authInstanceExists: !!auth,
          currentUser: auth.currentUser?.email || null,
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? "Present" : "Missing",
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "Default",
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "Missing",
          appId: import.meta.env.VITE_FIREBASE_APP_ID ? "Present" : "Missing"
        };
      } catch (firebaseError: any) {
        results.firebase.error = firebaseError.message;
      }

      // Cookie Test
      results.cookies = {
        testCookie: (() => {
          try {
            document.cookie = "test=1; path=/";
            const canRead = document.cookie.includes("test=1");
            document.cookie = "test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            return canRead;
          } catch {
            return false;
          }
        })(),
        thirdPartyCookies: (() => {
          try {
            return navigator.cookieEnabled && window.navigator.cookieEnabled;
          } catch {
            return false;
          }
        })(),
        sameSiteSupport: (() => {
          try {
            document.cookie = "samesite-test=1; SameSite=Lax; path=/";
            const supported = document.cookie.includes("samesite-test=1");
            document.cookie = "samesite-test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            return supported;
          } catch {
            return false;
          }
        })()
      };

      // Popup Test
      results.popup = {
        blocked: (() => {
          try {
            const popup = window.open("", "_blank", "width=1,height=1");
            if (popup) {
              popup.close();
              return false;
            }
            return true;
          } catch {
            return true;
          }
        })()
      };

      // Network Test
      try {
        const response = await fetch('/api/auth/user', { method: 'GET' });
        results.network = {
          apiReachable: true,
          statusCode: response.status,
          corsHeaders: Object.fromEntries(response.headers.entries())
        };
      } catch (networkError: any) {
        results.network = {
          apiReachable: false,
          error: networkError.message
        };
      }

      // Google APIs Reachability
      try {
        const googleTest = await fetch('https://accounts.google.com/.well-known/openid_configuration', {
          method: 'GET',
          mode: 'cors'
        });
        results.google = {
          reachable: googleTest.ok,
          status: googleTest.status
        };
      } catch {
        results.google = {
          reachable: false,
          blocked: true
        };
      }

    } catch (error: any) {
      results.error = error.message;
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const getStatusColor = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? 'text-green-600' : 'text-red-600';
    }
    return value === 'Present' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    return value === 'Present' ? '✓' : '✗';
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Firebase Authentication Diagnostics</CardTitle>
        <CardDescription>
          Complete system check for Google Firebase authentication issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={loading} className="w-full">
          {loading ? 'Running Diagnostics...' : 'Run Complete Diagnostics'}
        </Button>
        
        {diagnostics && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  
                  {/* Firebase Configuration */}
                  <div>
                    <h4 className="font-semibold mb-2">Firebase Configuration</h4>
                    <div className="space-y-1">
                      <div className={getStatusColor(diagnostics.firebase.apiKey)}>
                        {getStatusIcon(diagnostics.firebase.apiKey)} API Key: {diagnostics.firebase.apiKey}
                      </div>
                      <div className={getStatusColor(diagnostics.firebase.projectId !== 'Missing')}>
                        {getStatusIcon(diagnostics.firebase.projectId !== 'Missing')} Project ID: {diagnostics.firebase.projectId}
                      </div>
                      <div className={getStatusColor(diagnostics.firebase.appId)}>
                        {getStatusIcon(diagnostics.firebase.appId)} App ID: {diagnostics.firebase.appId}
                      </div>
                      <div className={getStatusColor(diagnostics.firebase.authInstanceExists)}>
                        {getStatusIcon(diagnostics.firebase.authInstanceExists)} Auth Instance: {diagnostics.firebase.authInstanceExists ? 'Active' : 'Failed'}
                      </div>
                    </div>
                  </div>

                  {/* Browser Capabilities */}
                  <div>
                    <h4 className="font-semibold mb-2">Browser Capabilities</h4>
                    <div className="space-y-1">
                      <div className={getStatusColor(diagnostics.browser.cookieEnabled)}>
                        {getStatusIcon(diagnostics.browser.cookieEnabled)} Cookies: {diagnostics.browser.cookieEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <div className={getStatusColor(!diagnostics.popup.blocked)}>
                        {getStatusIcon(!diagnostics.popup.blocked)} Popups: {diagnostics.popup.blocked ? 'Blocked' : 'Allowed'}
                      </div>
                      <div className={getStatusColor(diagnostics.cookies.thirdPartyCookies)}>
                        {getStatusIcon(diagnostics.cookies.thirdPartyCookies)} 3rd Party Cookies: {diagnostics.cookies.thirdPartyCookies ? 'Allowed' : 'Blocked'}
                      </div>
                      <div className={getStatusColor(diagnostics.browser.onLine)}>
                        {getStatusIcon(diagnostics.browser.onLine)} Network: {diagnostics.browser.onLine ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>

                  {/* Domain Information */}
                  <div>
                    <h4 className="font-semibold mb-2">Domain Information</h4>
                    <div className="space-y-1 text-xs">
                      <div>Protocol: {diagnostics.domain.protocol}</div>
                      <div>Domain: {diagnostics.domain.hostname}</div>
                      <div>Origin: {diagnostics.domain.origin}</div>
                    </div>
                  </div>

                  {/* Network Connectivity */}
                  <div>
                    <h4 className="font-semibold mb-2">Network Connectivity</h4>
                    <div className="space-y-1">
                      <div className={getStatusColor(diagnostics.network.apiReachable)}>
                        {getStatusIcon(diagnostics.network.apiReachable)} API Server: {diagnostics.network.apiReachable ? 'Reachable' : 'Unreachable'}
                      </div>
                      {diagnostics.google && (
                        <div className={getStatusColor(diagnostics.google.reachable)}>
                          {getStatusIcon(diagnostics.google.reachable)} Google APIs: {diagnostics.google.reachable ? 'Reachable' : 'Blocked'}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </AlertDescription>
            </Alert>

            {/* Issues & Recommendations */}
            <Alert variant={
              diagnostics.popup.blocked || 
              !diagnostics.cookies.thirdPartyCookies || 
              !diagnostics.firebase.authInstanceExists ||
              diagnostics.firebase.apiKey === 'Missing'
                ? 'destructive' : 'default'
            }>
              <AlertDescription>
                <div className="space-y-2">
                  <h4 className="font-semibold">Issues & Recommendations:</h4>
                  <div className="space-y-1 text-sm">
                    {diagnostics.popup.blocked && (
                      <div>• <strong>Popup Blocked:</strong> Allow popups for this site or use redirect authentication</div>
                    )}
                    {!diagnostics.cookies.thirdPartyCookies && (
                      <div>• <strong>Third-party Cookies Blocked:</strong> Enable third-party cookies or use redirect method</div>
                    )}
                    {diagnostics.firebase.apiKey === 'Missing' && (
                      <div>• <strong>Missing Firebase API Key:</strong> Add VITE_FIREBASE_API_KEY to environment variables</div>
                    )}
                    {!diagnostics.firebase.authInstanceExists && (
                      <div>• <strong>Firebase Auth Failed:</strong> Check Firebase configuration and credentials</div>
                    )}
                    {diagnostics.google && !diagnostics.google.reachable && (
                      <div>• <strong>Google APIs Blocked:</strong> Network or firewall is blocking Google authentication services</div>
                    )}
                    {diagnostics.domain.protocol === 'http:' && (
                      <div>• <strong>Insecure Protocol:</strong> HTTPS recommended for production authentication</div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}