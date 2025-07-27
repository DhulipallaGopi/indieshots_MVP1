// Clean Firebase Authentication Manager
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'disabled';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  provider: string;
  tier?: string;
  usedPages?: number;
  totalPages?: number;
  maxShotsPerScene?: number;
  canGenerateStoryboards?: boolean;
  firstName?: string;
  lastName?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      parsing?: boolean;
      marketing?: boolean;
    };
    appearance?: {
      theme?: string;
      language?: string;
      timezone?: string;
    };
  };
}

class AuthManager {
  private authState: AuthState = 'loading';
  private user: AuthUser | null = null;
  private listeners: ((state: AuthState, user: AuthUser | null) => void)[] = [];
  private unsubscribeAuth: (() => void) | null = null;
  private isLoggedOut = false;
  private pendingCouponCode: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if auth is explicitly disabled
    if (localStorage.getItem('auth_disabled') === 'true') {
      const logoutTime = localStorage.getItem('logout_timestamp');
      const currentTime = Date.now();
      
      // Keep auth disabled for 2 minutes after logout
      if (logoutTime && (currentTime - parseInt(logoutTime)) < 120000) {
        this.authState = 'disabled';
        this.user = null;
        this.isLoggedOut = true;
        this.notifyListeners();
        return;
      } else {
        // Clear expired logout state
        localStorage.removeItem('auth_disabled');
        localStorage.removeItem('logout_timestamp');
        this.isLoggedOut = false;
      }
    }

    // Set up Firebase auth listener with enhanced protection
    this.unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email || 'No user');
      
      // Check if logout happened recently (within 2 minutes)
      const logoutTimestamp = localStorage.getItem('logout_timestamp');
      const recentLogout = logoutTimestamp && (Date.now() - parseInt(logoutTimestamp)) < 120000;
      
      // CRITICAL: Block ALL authentication if recently logged out
      if (this.authState === 'disabled' || this.isLoggedOut || recentLogout || localStorage.getItem('auth_disabled') === 'true') {
        console.log('BLOCKING AUTH: disabled state or recent logout detected');
        if (firebaseUser) {
          console.log('Force signing out Firebase user to maintain logout state');
          await this.forceSignOut();
        }
        this.authState = 'disabled';
        this.user = null;
        this.notifyListeners();
        return;
      }

      if (firebaseUser) {
        console.log('Firebase auth listener triggered for user:', firebaseUser.email);
        console.log('Pending coupon code:', this.pendingCouponCode);
        // Create backend session
        await this.createBackendSession(firebaseUser);
      } else {
        console.log('Firebase auth listener: No user');
        this.authState = 'unauthenticated';
        this.user = null;
        this.notifyListeners();
      }
    });
  }

  private async createBackendSession(firebaseUser: FirebaseUser) {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const provider = firebaseUser.providerData[0]?.providerId || 'password';
      
      const authData = {
        idToken,
        provider: provider === 'google.com' ? 'google.com' : 'password',
        providerUserId: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
        photoURL: firebaseUser.photoURL,
        couponCode: this.pendingCouponCode // Include pending coupon code if any
      };
      
      // Log coupon usage for debugging
      if (this.pendingCouponCode) {
        console.log('Including coupon code in backend session:', this.pendingCouponCode);
      }

      console.log('Making Firebase sync request for:', firebaseUser.email);
      
      const response = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firebaseUser: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          },
          provider: 'firebase'
        }),
      });
      
      console.log('Firebase sync response status:', response.status);
      console.log('Firebase sync response ok:', response.ok);

      if (response.ok) {
        const userData = await response.json();
        
        // Use ONLY the database-provided tier information
        this.user = {
          id: userData.id,
          email: userData.email,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
          provider: userData.provider || 'password',
          tier: userData.tier,
          usedPages: userData.usedPages,
          totalPages: userData.totalPages,
          maxShotsPerScene: userData.maxShotsPerScene,
          canGenerateStoryboards: userData.canGenerateStoryboards
        };
        
        console.log('🎯 USER AUTHENTICATED:', {
          email: this.user.email,
          tier: this.user.tier,
          totalPages: this.user.totalPages,
          maxShotsPerScene: this.user.maxShotsPerScene,
          canGenerateStoryboards: this.user.canGenerateStoryboards,
          dataSource: 'database'
        });
        this.authState = 'authenticated';
        console.log('Backend session created for:', this.user.email, 'with tier:', this.user.tier);
        
        // Clear pending coupon code after successful use
        if (this.pendingCouponCode) {
          console.log('Clearing used coupon code:', this.pendingCouponCode);
          this.pendingCouponCode = null;
        }
        
        // Automatically validate tier information after login
        this.scheduleAutomaticTierValidation();
      } else {
        const errorText = await response.text();
        console.error('Backend session creation failed');
        console.error('Response status:', response.status);
        console.error('Response error:', errorText);
        this.authState = 'unauthenticated';
        this.user = null;
        // Clear pending coupon on failure too
        this.pendingCouponCode = null;
      }
    } catch (error) {
      console.error('Backend session error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      this.authState = 'unauthenticated';
      this.user = null;
      // Clear pending coupon on error
      this.pendingCouponCode = null;
    }
    
    this.notifyListeners();
  }



  private lastNotifiedState: { state: AuthState; user: AuthUser | null } | null = null;
  
  private notifyListeners() {
    // Only notify if state actually changed
    const currentState = { state: this.authState, user: this.user };
    
    if (this.lastNotifiedState && 
        this.lastNotifiedState.state === currentState.state &&
        JSON.stringify(this.lastNotifiedState.user) === JSON.stringify(currentState.user)) {
      return; // No change, don't notify
    }
    
    this.lastNotifiedState = currentState;
    this.listeners.forEach(listener => listener(this.authState, this.user));
  }

  // Public methods
  onAuthStateChange(callback: (state: AuthState, user: AuthUser | null) => void) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.authState, this.user);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithEmail(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      const authError = error as AuthError;
      return { success: false, error: this.getErrorMessage(authError) };
    }
  }

  async signInWithToken(customToken: string) {
    try {
      console.log('Signing in with custom token from OTP verification');
      const result = await signInWithCustomToken(auth, customToken);
      return { success: true, user: result.user };
    } catch (error) {
      const authError = error as AuthError;
      console.error('Custom token signin error:', authError);
      return { success: false, error: this.getErrorMessage(authError) };
    }
  }

  async signUpWithEmail(email: string, password: string, isPremiumCoupon?: boolean) {
    try {
      // Store coupon code temporarily for use in Firebase auth listener
      if (isPremiumCoupon) {
        this.pendingCouponCode = 'INDIE2025';
        console.log('Storing pending coupon code for signup:', this.pendingCouponCode);
      }
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      return { success: true, user: result.user };
    } catch (error) {
      // Clear pending coupon on error
      this.pendingCouponCode = null;
      const authError = error as AuthError;
      return { success: false, error: this.getErrorMessage(authError) };
    }
  }

  async logout() {
    console.log('Starting logout process...');
    
    // Immediately set logout flags and disable auth
    this.isLoggedOut = true;
    this.authState = 'disabled';
    this.user = null;
    localStorage.setItem('auth_disabled', 'true');
    localStorage.setItem('logout_timestamp', Date.now().toString());
    
    // Notify listeners immediately to update UI
    this.notifyListeners();
    
    try {
      // Unsubscribe from auth listener to prevent re-authentication
      if (this.unsubscribeAuth) {
        this.unsubscribeAuth();
        this.unsubscribeAuth = null;
      }
      
      // Sign out from Firebase
      await signOut(auth);
      console.log('Firebase signout completed');
      
      // Call backend logout with aggressive cookie clearing
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (logoutResponse.ok) {
        console.log('Backend logout completed successfully');
        
        // Additional client-side cookie clearing to ensure removal
        this.aggressiveCookieClearing();
      } else {
        console.error('Backend logout failed, but continuing with client cleanup');
      }
      
      // Clear all Firebase-related data
      this.clearFirebaseData();
      
      // Force reload page to completely clear state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
      console.log('Logout completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still force logout even if there are errors
      this.clearFirebaseData();
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      return { success: false, error: 'Logout failed' };
    }
  }

  private async forceSignOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Force signout error (ignored):', error);
    }
  }

  private aggressiveCookieClearing() {
    // Multiple cookie clearing strategies to ensure removal
    const cookieNames = ['auth_token', 'session', 'connect.sid'];
    const domains = [window.location.hostname, '.replit.dev', '.replit.app'];
    const paths = ['/', '/api', '/auth'];
    
    // Clear each cookie with all possible combinations
    cookieNames.forEach(name => {
      domains.forEach(domain => {
        paths.forEach(path => {
          // Clear with domain and path
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
          // Clear without domain
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
        });
      });
      // Clear with basic options
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    console.log('Aggressive cookie clearing completed');
  }

  private clearFirebaseData() {
    // Clear ALL authentication-related localStorage
    const authKeys = ['auth_disabled', 'logout_timestamp'];
    const firebaseKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firebase:') || key.includes('firebase') || key.includes('auth'))) {
        firebaseKeys.push(key);
      }
    }
    
    // Remove all Firebase and auth keys
    firebaseKeys.forEach(key => localStorage.removeItem(key));
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear all cookies by setting them to expire
    this.aggressiveCookieClearing();
  }

  enableAuth() {
    localStorage.removeItem('auth_disabled');
    localStorage.removeItem('logout_timestamp');
    this.isLoggedOut = false;
    this.authState = 'loading';
    this.notifyListeners();
    
    // Reinitialize auth listener
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    this.initialize();
  }

  updateUserData(userData: Partial<AuthUser>) {
    if (this.user) {
      // Special handling for premium demo account - force pro tier
      const isPremiumDemo = this.user.email === 'premium@demo.com';
      
      if (isPremiumDemo) {
        userData = {
          ...userData,
          tier: 'pro',
          totalPages: -1,
          maxShotsPerScene: -1,
          canGenerateStoryboards: true
        };
        // Removed pro tier override
      }
      
      this.user = { ...this.user, ...userData };
      this.notifyListeners();
    }
  }

  async refreshFromDatabase() {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        this.updateUserData(userData);
      }
    } catch (error) {
      console.error('Error refreshing user data from database:', error);
    }
  }

  // Schedule automatic tier validation to ensure users get the correct tier access
  private scheduleAutomaticTierValidation() {
    if (!this.user) return;
    
    // Check tier validation after a short delay to allow UI to settle
    setTimeout(async () => {
      await this.validateAndUpdateTier();
    }, 2000);
  }

  // Validate user tier and update if there's a mismatch
  private async validateAndUpdateTier() {
    if (!this.user) return;
    
    try {
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        const freshUserData = result.user;
        
        // Check if tier information differs
        if (freshUserData.tier !== this.user.tier || 
            freshUserData.canGenerateStoryboards !== this.user.canGenerateStoryboards ||
            freshUserData.maxShotsPerScene !== this.user.maxShotsPerScene) {
          
          console.log(`Tier mismatch detected for ${this.user.email}. Updating from ${this.user.tier} to ${freshUserData.tier}`);
          
          // Update user data with fresh tier information
          this.user = {
            ...this.user,
            tier: freshUserData.tier,
            totalPages: freshUserData.totalPages,
            maxShotsPerScene: freshUserData.maxShotsPerScene,
            canGenerateStoryboards: freshUserData.canGenerateStoryboards
          };
          
          // Notify listeners of the update
          this.notifyListeners();
          
          console.log(`User ${this.user.email} tier automatically updated to ${this.user.tier}`);
        }
      }
    } catch (error) {
      console.error('Error validating tier:', error);
    }
  }

  private getErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'This email is not registered. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }

  // Getters
  get currentUser() { return this.user; }
  get state() { return this.authState; }
  get isAuthenticated() { return this.authState === 'authenticated'; }
}

// Export singleton instance
export const authManager = new AuthManager();