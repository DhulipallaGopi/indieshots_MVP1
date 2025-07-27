import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

// Import auth setup
import { configurePassport } from "./auth/passport";
import { attachUserMiddleware } from "./auth/jwt";

// Import routes
import indexRoutes from "./routes/index";
import authRoutes from "./routes/auth";
import scriptRoutes from "./routes/scripts";
import jobRoutes from "./routes/jobs";
import scenesRoutes from "./routes/scenes";
import testRoutes from "./routes/test";
import contactRoutes from "./routes/contact";
import adminRoutes from "./routes/admin";
import paymentHistoryRoutes from "./routes/payment-history";

// Import utility functions
import { estimatePageCount, parseScriptPreview } from "./utils/scriptUtils";
import { startParseWorker } from "./workers/parse";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure middleware
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for development - enable in production
  }));
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all replit domains and localhost
      if (origin.includes('.replit.dev') || 
          origin.includes('.replit.app') || 
          origin.includes('localhost') ||
          origin.includes('0.0.0.0')) {
        return callback(null, true);
      }
      
      return callback(null, true); // Allow all for now
    },
    credentials: true,
    optionsSuccessStatus: 200
  }));
  
  // Initialize and configure Passport
  configurePassport(app);
  
  // Attach user from JWT if present (re-enabled now that registration works)
  app.use(attachUserMiddleware);

  // Global error handler for Zod validation errors
  app.use((err: any, req: Request, res: Response, next: any) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationError.details
      });
    }
    next(err);
  });
  
  // Mount API routes - specific routes first to override general routes
  app.use('/api/auth', authRoutes);
  app.use('/api', indexRoutes);
  app.use('/api/scripts', scriptRoutes);
  app.use('/api/jobs', jobRoutes);
  
  // Import and mount currency routes
  const currencyRoutes = (await import('./routes/currency')).default;
  app.use('/api/currency', currencyRoutes);
  app.use('/api/scenes', scenesRoutes);
  app.use('/api', scenesRoutes); // Also mount scenes routes at /api for shots endpoints
  app.use('/api/test', testRoutes);
  
  // Script Health routes
  const scriptHealthRoutes = await import('./routes/scriptHealth');
  app.use('/api/scripts', scriptHealthRoutes.default);
  
  // Enhanced analysis routes
  const analysisRoutes = await import('./routes/analysis');
  app.use('/api/analysis', analysisRoutes.default);
  
  // Upgrade routes
  const upgradeRoutes = await import('./routes/upgrade');
  app.use('/api/upgrade', upgradeRoutes.default);
  
  // Fresh PayU Payment System
  const freshPaymentRoutes = await import('./routes/freshPayment');
  app.use('/api/payment', freshPaymentRoutes.default);
  
  // Post-payment status check (no authentication required)
  const postPaymentStatusRoutes = await import('./routes/postPaymentStatus');
  app.use('/api/post-payment', postPaymentStatusRoutes.default);
  
  // Simple status check for debugging
  const simpleStatusRoutes = await import('./routes/simpleStatus');
  app.use('/api/simple-status', simpleStatusRoutes.default);
  
  // Authentication bypass for post-payment processing
  const authBypassRoutes = await import('./routes/authBypass');
  app.use('/api/auth-bypass', authBypassRoutes.default);
  
  // Debug authentication routes (development only)
  if (process.env.NODE_ENV === 'development') {
    const debugAuthRoutes = await import('./routes/debugAuth');
    app.use('/api/debug-auth', debugAuthRoutes.default);
  }
  
  // Force refresh authentication
  const forceRefreshRoutes = await import('./routes/forceRefresh');
  app.use('/api/force-refresh', forceRefreshRoutes.default);
  
  const envRoutes = await import('./routes/environment-variables');
  app.use('/api/env', envRoutes.default);
  
  // Promo code routes
  const promoCodeRoutes = await import('./routes/promoCode');
  app.use('/api/promo-codes', promoCodeRoutes.default);
  
  // Debug routes (development only)
  if (process.env.NODE_ENV === 'development') {
    const debugRoutes = await import('./routes/debug');
    app.use('/api/debug', debugRoutes.default);
    
    // Promo user fix routes
    const fixPromoRoutes = await import('./routes/fixPromoUsers');
    app.use('/api/fix', fixPromoRoutes.default);
  }
  
  // Contact routes
  app.use('/api/contact', contactRoutes);
  
  // Admin routes
  app.use('/api/admin', adminRoutes);
  
  // Payment history routes
  app.use('/api/payment-history', paymentHistoryRoutes);

  // Start the parse worker in background
  startParseWorker().catch(error => {
    console.error('Error starting parse worker:', error);
  });

  const httpServer = createServer(app);
  return httpServer;
}
