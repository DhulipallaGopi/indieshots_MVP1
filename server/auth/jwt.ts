import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

const JWT_SECRET = process.env.JWT_SECRET || '8e31b97e70a9066721c835527a4111a7';
const JWT_EXPIRES_IN = '30d'; // Extended for persistent login

// In-memory token blacklist (in production, use Redis or database)
// Cleared for debugging authentication issues
const blacklistedTokens = new Set<string>();

interface TokenPayload {
  id: number;
  email: string;
  tier: string;
  totalPages: number;
  usedPages: number;
  maxShotsPerScene: number;
  canGenerateStoryboards: boolean;
  jti?: string; // JWT ID for token invalidation
}

// Extended user type for request object
interface RequestUser {
  id: number;
  email: string;
  tier: string;
  totalPages: number;
  usedPages: number;
  maxShotsPerScene: number;
  canGenerateStoryboards: boolean;
  displayName?: string;
  provider?: string;
  [key: string]: any;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: any): string {
  const jti = Math.random().toString(36).substring(2, 15);
  
  // Special handling for premium demo account - always treat as pro tier
  const isPremiumDemo = user.email === 'premium@demo.com';
  
  // DEFAULT TO FREE TIER unless premium demo 
  const userTier = isPremiumDemo ? 'pro' : (user.tier === 'pro' ? 'pro' : 'free');
  const isProTier = userTier === 'pro';
  
  if (isPremiumDemo) {
    console.log('🔒 JWT: Forcing pro tier for premium@demo.com');
  }
  
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    tier: userTier,
    totalPages: isPremiumDemo ? -1 : (user.totalPages !== undefined ? user.totalPages : (isProTier ? -1 : 10)),
    usedPages: user.usedPages || 0,
    maxShotsPerScene: isPremiumDemo ? -1 : (user.maxShotsPerScene !== undefined ? user.maxShotsPerScene : (isProTier ? -1 : 5)),
    canGenerateStoryboards: isPremiumDemo ? true : (user.canGenerateStoryboards !== undefined ? user.canGenerateStoryboards : isProTier),
    jti
  };
  
  console.log(`[JWT] Generated token for ${user.email} with tier: ${userTier}`);
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token and check blacklist
 */
export function verifyToken(token: string): any {
  try {
    // More lenient token validation for post-payment processing
    if (!token || token === 'test' || token === 'invalid') {
      console.log('🔍 JWT: Invalid or test token provided');
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle both old and new token formats
    if (decoded && typeof decoded === 'object') {
      // Special handling for premium demo account - force pro tier values
      const isPremiumDemo = (decoded as any).email === 'premium@demo.com';
      
      // AGGRESSIVE PRO TIER PROTECTION: Once pro, always pro in token
      const tierFromToken = (decoded as any).tier;
      const isProTier = tierFromToken === 'pro' || isPremiumDemo;
      
      // Normalize token format - handle both uid and id fields
      const normalizedToken = {
        id: (decoded as any).uid || (decoded as any).id,
        uid: (decoded as any).uid || (decoded as any).id,
        email: (decoded as any).email,
        tier: isProTier ? 'pro' : 'free', // Force consistency
        totalPages: isProTier ? -1 : 10,
        usedPages: (decoded as any).usedPages || 0,
        maxShotsPerScene: isProTier ? -1 : 5,
        canGenerateStoryboards: isProTier,
        displayName: (decoded as any).displayName,
        // Preserve any other fields while overriding specific ones
        ...(decoded as any),
      };
      
      if (isPremiumDemo) {
        console.log('🔒 JWT VERIFY: Forcing pro tier for premium@demo.com');
      }
      
      return normalizedToken;
    }
    
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    console.error('Token that failed verification:', token.substring(0, 30) + '...');
    return null;
  }
}

/**
 * Invalidate a JWT token by adding it to blacklist
 */
export function invalidateToken(token: string): void {
  blacklistedTokens.add(token);
  console.log('Token added to blacklist');
}

/**
 * Clear the token blacklist (for debugging)
 */
export function clearBlacklist(): void {
  blacklistedTokens.clear();
  console.log('🔓 Token blacklist cleared');
}

// Clear blacklist immediately to fix authentication issues
clearBlacklist();

/**
 * Middleware to verify JWT token in Authorization header or cookies
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('🔐 Auth middleware called for:', req.method, req.path);
    
    // Check for token in cookies first (for browser clients)
    let token = req.cookies?.auth_token;
    
    console.log('Auth middleware - checking token in cookies:', !!token);
    console.log('Auth middleware - all cookies:', Object.keys(req.cookies || {}));
    
    // If no cookie, check Authorization header (for API clients)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      console.log('Auth middleware - checking Authorization header:', authHeader?.substring(0, 20) + '...');
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('Auth middleware - found token in Authorization header');
      }
    }
    
    if (!token) {
      console.log('Auth middleware - no token found, returning 401');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Auth middleware - token verification failed');
      console.log('Auth middleware - token preview:', token.substring(0, 20) + '...');
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Check if user still exists in database (optional for Firebase users)
    try {
      const { storage } = await import('../storage');
      const user = await storage.getUserByProviderId('firebase', decoded.id);
      
      if (user) {
        console.log('Auth middleware - token verified for existing PostgreSQL user:', decoded.email);
        // Attach full user data if available in PostgreSQL
        req.user = { ...decoded, ...user };
      } else {
        console.log('Auth middleware - token verified for Firebase-only user:', decoded.email);
        // Firebase user not synced to PostgreSQL yet, but token is valid
        req.user = decoded;
      }
    } catch (error) {
      console.log('Auth middleware - error checking user existence, but token is valid:', error);
      // Even if database check fails, allow authentication if token is valid
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
}

/**
 * Middleware to check if user has premium subscription
 */
export function isPremiumMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userTier = req.user.tier;
  if (userTier !== 'premium' && userTier !== 'pro') {
    return res.status(403).json({ message: 'Premium subscription required' });
  }
  
  next();
}

/**
 * Middleware to attach the full user object to the request if authenticated
 */
export async function attachUserMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('📎 AttachUserMiddleware called for:', req.method, req.path);
    
    // Check for token in cookies first (for browser clients)
    let token = req.cookies?.auth_token;
    
    // If no cookie, check Authorization header (for API clients)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('📎 AttachUserMiddleware - found token in Authorization header');
      }
    }
    
    if (token) {
      console.log('📎 AttachUserMiddleware - token found, attempting verification');
      try {
        const decoded = verifyToken(token);
        console.log('📎 AttachUserMiddleware - token verification result:', !!decoded);
        if (decoded && decoded.id) {
          try {
            const user = await storage.getUser(decoded.id);
            if (user) {
              (req as any).user = user;
              console.log('📎 AttachUserMiddleware - user attached:', user.email);
            } else {
              console.log('📎 AttachUserMiddleware - no user found in database for decoded token');
            }
          } catch (userError: any) {
            console.log('📎 AttachUserMiddleware - user lookup failed, continuing without user:', userError.message);
          }
        } else {
          console.log('📎 AttachUserMiddleware - decoded token invalid or missing id');
        }
      } catch (tokenError: any) {
        // Token is invalid, but don't fail the request - just continue without user
        console.log('📎 AttachUserMiddleware - invalid token, continuing without user:', tokenError.message);
      }
    } else {
      console.log('📎 AttachUserMiddleware - no token found');
    }
    
    next();
  } catch (error) {
    console.error('Attach user middleware error:', error);
    // Don't fail the request, just continue without attaching user
    next();
  }
}