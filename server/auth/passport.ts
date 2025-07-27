import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import bcrypt from 'bcrypt';
import { Express } from 'express';
import { storage } from '../storage';

declare global {
  namespace Express {
    interface User {
      id: number;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
      provider: string;
      tier: string;
      [key: string]: any;
    }
  }
}

export const configurePassport = (app: Express) => {
  // Initialize passport
  app.use(passport.initialize());
  
  // Configure serialization/deserialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  // Local strategy (username/password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          if (user.provider !== 'local') {
            return done(null, false, { 
              message: `This account uses ${user.provider} authentication. Please sign in with ${user.provider}.` 
            });
          }
          
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          passReqToCallback: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists by providerId
            let user = await storage.getUserByProviderId('google', profile.id);
            
            if (user) {
              // Update profile info if needed
              if (
                user.email !== profile.emails?.[0]?.value ||
                user.firstName !== profile.name?.givenName ||
                user.lastName !== profile.name?.familyName ||
                user.profileImageUrl !== profile.photos?.[0]?.value
              ) {
                user = await storage.updateUser(user.id, {
                  email: profile.emails?.[0]?.value,
                  firstName: profile.name?.givenName,
                  lastName: profile.name?.familyName,
                  profileImageUrl: profile.photos?.[0]?.value,
                  updatedAt: new Date()
                });
              }
              
              return done(null, user);
            }
            
            // Check if user exists by email (for account linking)
            if (profile.emails && profile.emails.length > 0) {
              const existingUser = await storage.getUserByEmail(profile.emails[0].value);
              
              if (existingUser) {
                // Link Google account to existing account
                const updatedUser = await storage.updateUser(existingUser.id, {
                  providerId: profile.id,
                  provider: 'google',
                  profileImageUrl: profile.photos?.[0]?.value || existingUser.profileImageUrl,
                  emailVerified: true,
                  updatedAt: new Date()
                });
                
                return done(null, updatedUser);
              }
            }
            
            // Create new user
            const newUser = await storage.createUser({
              email: profile.emails?.[0]?.value,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl: profile.photos?.[0]?.value,
              provider: 'google',
              providerId: profile.id,
              emailVerified: true,
              tier: 'free', // Default tier
              totalPages: 20, // Free tier gets 20 pages
              usedPages: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            done(null, newUser);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }
  
  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: '/api/auth/github/callback',
          scope: ['user:email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists by providerId
            let user = await storage.getUserByProviderId('github', profile.id);
            
            if (user) {
              // Update profile info if needed
              const email = profile.emails?.[0]?.value;
              const displayName = profile.displayName || profile.username;
              const nameParts = displayName ? displayName.split(' ') : [];
              const firstName = nameParts[0] || '';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              
              if (
                (email && user.email !== email) ||
                user.firstName !== firstName ||
                user.lastName !== lastName ||
                user.profileImageUrl !== profile.photos?.[0]?.value
              ) {
                user = await storage.updateUser(user.id, {
                  email: email || user.email,
                  firstName: firstName || user.firstName,
                  lastName: lastName || user.lastName,
                  profileImageUrl: profile.photos?.[0]?.value,
                  updatedAt: new Date()
                });
              }
              
              return done(null, user);
            }
            
            // Check if user exists by email
            const email = profile.emails?.[0]?.value;
            if (email) {
              const existingUser = await storage.getUserByEmail(email);
              
              if (existingUser) {
                // Link GitHub account to existing account
                const updatedUser = await storage.updateUser(existingUser.id, {
                  providerId: profile.id,
                  provider: 'github',
                  profileImageUrl: profile.photos?.[0]?.value || existingUser.profileImageUrl,
                  emailVerified: true,
                  updatedAt: new Date()
                });
                
                return done(null, updatedUser);
              }
            }
            
            // Create new user
            const displayName = profile.displayName || profile.username;
            const nameParts = displayName ? displayName.split(' ') : [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            const newUser = await storage.createUser({
              email: email,
              firstName,
              lastName,
              profileImageUrl: profile.photos?.[0]?.value,
              provider: 'github',
              providerId: profile.id,
              emailVerified: true,
              tier: 'free', // Default tier
              totalPages: 20, // Free tier gets 20 pages
              usedPages: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            done(null, newUser);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }
  
  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: '/api/auth/facebook/callback',
          profileFields: ['id', 'emails', 'name', 'picture.type(large)']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists by providerId
            let user = await storage.getUserByProviderId('facebook', profile.id);
            
            if (user) {
              // Update profile info if needed
              if (
                user.email !== profile.emails?.[0]?.value ||
                user.firstName !== profile.name?.givenName ||
                user.lastName !== profile.name?.familyName ||
                !user.profileImageUrl?.includes(profile.id)
              ) {
                const profileImageUrl = profile.photos?.[0]?.value || 
                  `https://graph.facebook.com/${profile.id}/picture?type=large`;
                
                user = await storage.updateUser(user.id, {
                  email: profile.emails?.[0]?.value,
                  firstName: profile.name?.givenName,
                  lastName: profile.name?.familyName,
                  profileImageUrl,
                  updatedAt: new Date()
                });
              }
              
              return done(null, user);
            }
            
            // Check if user exists by email
            if (profile.emails && profile.emails.length > 0) {
              const existingUser = await storage.getUserByEmail(profile.emails[0].value);
              
              if (existingUser) {
                // Link Facebook account to existing account
                const profileImageUrl = profile.photos?.[0]?.value || 
                  `https://graph.facebook.com/${profile.id}/picture?type=large`;
                
                const updatedUser = await storage.updateUser(existingUser.id, {
                  providerId: profile.id,
                  provider: 'facebook',
                  profileImageUrl: profileImageUrl,
                  emailVerified: true,
                  updatedAt: new Date()
                });
                
                return done(null, updatedUser);
              }
            }
            
            // Create new user
            const profileImageUrl = profile.photos?.[0]?.value || 
              `https://graph.facebook.com/${profile.id}/picture?type=large`;
            
            const newUser = await storage.createUser({
              email: profile.emails?.[0]?.value,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl,
              provider: 'facebook',
              providerId: profile.id,
              emailVerified: true,
              tier: 'free', // Default tier
              totalPages: 20, // Free tier gets 20 pages
              usedPages: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            done(null, newUser);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }
};