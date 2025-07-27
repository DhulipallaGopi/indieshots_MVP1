import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, browserLocalPersistence, browserSessionPersistence, setPersistence } from "firebase/auth";

// Get environment variables
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

// Use provided values or generate defaults based on project ID
const AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${PROJECT_ID}.firebaseapp.com`;
const STORAGE_BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.appspot.com`;
const MESSAGING_SENDER_ID = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "";

// Validate that auth domain matches expected pattern
if (AUTH_DOMAIN && !AUTH_DOMAIN.includes('.firebaseapp.com')) {
  console.warn("Auth domain doesn't follow expected Firebase pattern:", AUTH_DOMAIN);
}

// Log Firebase configuration for debugging (without revealing actual values)
console.log("Firebase config check:", {
  apiKeyExists: !!API_KEY,
  authDomainExists: !!AUTH_DOMAIN,
  projectIdExists: !!PROJECT_ID,
  storageBucketExists: !!STORAGE_BUCKET,
  messagingSenderIdExists: !!MESSAGING_SENDER_ID,
  appIdExists: !!APP_ID
});

// Additional validation
if (!API_KEY || !PROJECT_ID || !APP_ID) {
  console.error("Missing required Firebase configuration:", {
    apiKey: !!API_KEY,
    projectId: !!PROJECT_ID,
    appId: !!APP_ID
  });
}

// Log actual configuration values for debugging (first 10 chars only)
console.log("Firebase config values:", {
  apiKey: API_KEY ? API_KEY.substring(0, 10) + "..." : "missing",
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID ? APP_ID.substring(0, 10) + "..." : "missing"
});

// Firebase configuration
const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID,
};

// Initialize Firebase (check if already initialized to prevent duplicate app error)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, get the existing app
    app = initializeApp(firebaseConfig, 'indieshots-app');
  } else {
    throw error;
  }
}

// Initialize Firebase Auth
export const auth = getAuth(app);

// Dynamically check auth state and set persistence accordingly
const checkAndSetPersistence = () => {
  const authDisabled = localStorage.getItem('indieshots_auth_disabled');
  if (authDisabled !== 'true') {
    // Set auth persistence to maintain state across redirects only if not disabled
    setPersistence(auth, browserLocalPersistence).then(() => {
      console.log("Firebase persistence set successfully");
    }).catch((error) => {
      console.error("Failed to set Firebase persistence:", error);
    });
  } else {
    console.log("Firebase persistence disabled - forcing session-only persistence");
    // Force session-only persistence to prevent auto-relogin
    setPersistence(auth, browserSessionPersistence).then(() => {
      console.log("Firebase forced to session-only persistence");
    }).catch((error) => {
      console.error("Failed to set session persistence:", error);
    });
  }
};

checkAndSetPersistence();

// Listen for storage changes to dynamically update persistence
window.addEventListener('storage', (e) => {
  if (e.key === 'indieshots_auth_disabled') {
    console.log('Auth disabled state changed, updating Firebase persistence');
    checkAndSetPersistence();
  }
});

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Firebase Auth functions
export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const signInWithGoogleRedirect = () => {
  return signInWithRedirect(auth, googleProvider);
};

export const getGoogleRedirectResult = () => {
  return getRedirectResult(auth);
};

export default app;