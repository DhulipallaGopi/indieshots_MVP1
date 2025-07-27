import {
  users,
  scripts,
  parseJobs,
  shots,
  scriptHealthAnalysis,
  promoCodes,
  promoCodeUsage,
  type User,
  type UpsertUser,
  type Script,
  type InsertScript,
  type ParseJob,
  type InsertParseJob,
  type Shot,
  type InsertShot,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByMagicLinkToken(token: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserTier(userId: string, tier: string, paymentInfo?: any): Promise<User>;
  updateUserPageCount(userId: number, pagesUsed: number): Promise<User>;
  updateUserPreferences(userId: number, preferences: any): Promise<User>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: number, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User>;
  upgradeToPro(userId: number): Promise<User>;
  deleteUser(id: string): Promise<void>;
  scheduleUserDeletion(userId: string): Promise<User>;
  cancelUserDeletion(userId: string): Promise<User>;
  getUsersPendingDeletion(): Promise<User[]>;
  getUserPaymentHistory(userId: string): Promise<any[]>;
  
  // Script operations
  createScript(script: InsertScript): Promise<Script>;
  getScript(id: number): Promise<Script | undefined>;
  getUserScripts(userId: string): Promise<Script[]>;
  deleteScript(id: number): Promise<void>;
  
  // Parse job operations
  createParseJob(job: InsertParseJob): Promise<ParseJob>;
  getParseJob(id: number): Promise<ParseJob | undefined>;
  getUserParseJobs(userId: string): Promise<ParseJob[]>;
  updateParseJob(id: number, update: Partial<InsertParseJob>): Promise<ParseJob>;
  deleteParseJobsForScript(scriptId: number): Promise<void>;
  
  // Shot operations
  createShots(shots: InsertShot[]): Promise<Shot[]>;
  getShots(parseJobId: number, sceneIndex: number): Promise<Shot[]>;
  deleteShots(parseJobId: number, sceneIndex: number): Promise<void>;
  updateShotImage(shotId: number, imageData: string | null, imagePrompt: string | null): Promise<Shot>;
  
  // Script Health Analysis operations
  createScriptHealthAnalysis(analysis: any): Promise<any>;
  getScriptHealthAnalysis(scriptId: number): Promise<any | undefined>;
  updateScriptHealthAnalysis(scriptId: number, updates: any): Promise<any>;
  deleteScriptHealthAnalysisForUser(userId: string): Promise<void>;
  
  // Session operations
  deleteUserSessions(userId: string): Promise<void>;
}

// Storage instance will be created at the end of the file

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (!user) return user;
    
    // Special handling ONLY for premium demo account
    if (user.email === 'premium@demo.com') {
      // If not already pro tier, update in database
      if (user.tier !== 'pro') {
        console.log(`🔧 DEMO ACCOUNT: Restoring pro tier for ${user.email}`);
        await this.updateUser(user.id, {
          tier: 'pro',
          totalPages: -1,
          maxShotsPerScene: -1,
          canGenerateStoryboards: true
        });
      }
      
      return {
        ...user,
        tier: 'pro',
        totalPages: -1,
        maxShotsPerScene: -1,
        canGenerateStoryboards: true
      };
    }
    
    // REMOVED AUTO-UPGRADE LOGIC - This was incorrectly upgrading new users to pro tier
    // Promo code tier assignment should ONLY happen during signup/verification process
    // NOT during regular user lookups which would affect all new users
    console.log(`✅ USER LOOKUP: ${user.email} - tier: ${user.tier} - no automatic upgrades`)
    
    return user;
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.provider, provider),
          eq(users.providerId, providerId)
        )
      );
    
    // Special handling for premium demo account - always force pro tier
    if (user && user.email === 'premium@demo.com') {
      return {
        ...user,
        tier: 'pro',
        totalPages: -1,
        maxShotsPerScene: -1,
        canGenerateStoryboards: true
      };
    }
    
    return user;
  }
  
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token));
    return user;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token));
    return user;
  }
  
  async getUserByMagicLinkToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.magicLinkToken, token));
    return user;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPageCount(userId: number, pagesUsed: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        usedPages: pagesUsed,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPreferences(userId: number, preferences: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        preferences,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: stripeInfo.customerId,
        stripeSubscriptionId: stripeInfo.subscriptionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async upgradeToPro(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        tier: 'pro',
        totalPages: -1,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Script operations
  async createScript(scriptData: InsertScript): Promise<Script> {
    const [script] = await db
      .insert(scripts)
      .values(scriptData)
      .returning();
    return script;
  }

  async getScript(id: number): Promise<Script | undefined> {
    console.log(`Storage: Looking for script with ID: ${id}`);
    try {
      const [script] = await db
        .select()
        .from(scripts)
        .where(eq(scripts.id, id));
      console.log(`Storage: Script found:`, script ? `ID ${script.id}` : 'NOT FOUND');
      return script;
    } catch (error) {
      console.error(`Storage: Error getting script ${id}:`, error);
      return undefined;
    }
  }

  async getUserScripts(userId: string): Promise<Script[]> {
    return await db
      .select()
      .from(scripts)
      .where(eq(scripts.userId, userId))
      .orderBy(desc(scripts.createdAt));
  }
  
  async deleteScript(id: number): Promise<void> {
    await db
      .delete(scripts)
      .where(eq(scripts.id, id));
  }

  // Parse job operations
  async createParseJob(jobData: InsertParseJob): Promise<ParseJob> {
    const [job] = await db
      .insert(parseJobs)
      .values(jobData)
      .returning();
    return job;
  }

  async getParseJob(id: number): Promise<ParseJob | undefined> {
    try {
      const [job] = await db
        .select()
        .from(parseJobs)
        .where(eq(parseJobs.id, id));
      return job;
    } catch (error) {
      console.error('Database error in getParseJob:', error);
      // Return undefined instead of throwing to prevent 500 errors
      return undefined;
    }
  }

  async getUserParseJobs(userId: string): Promise<ParseJob[]> {
    return await db
      .select()
      .from(parseJobs)
      .where(eq(parseJobs.userId, userId))
      .orderBy(desc(parseJobs.createdAt));
  }

  async updateParseJob(id: number, update: Partial<InsertParseJob>): Promise<ParseJob> {
    const [job] = await db
      .update(parseJobs)
      .set({
        ...update,
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, id))
      .returning();
    return job;
  }

  async deleteParseJobsForScript(scriptId: number): Promise<void> {
    await db
      .delete(parseJobs)
      .where(eq(parseJobs.scriptId, scriptId));
  }

  // Shot operations
  async createShots(shotsData: InsertShot[]): Promise<Shot[]> {
    console.log(`Storage: Attempting to insert ${shotsData.length} shots`);
    console.log(`Storage: First shot data:`, shotsData[0]);
    
    // Validate input data
    if (!shotsData || shotsData.length === 0) {
      console.error('Storage: Cannot insert empty shots array');
      throw new Error('Cannot create shots: No shot data provided');
    }
    
    try {
      const result = await db.insert(shots).values(shotsData).returning();
      console.log(`Storage: Successfully inserted ${result.length} shots`);
      console.log(`Storage: First inserted shot:`, result[0]);
      return result;
    } catch (error) {
      console.error('Storage: Error inserting shots:', error);
      throw error;
    }
  }

  async getShots(parseJobId: number, sceneIndex: number): Promise<Shot[]> {
    try {
      return await db
        .select()
        .from(shots)
        .where(and(eq(shots.parseJobId, parseJobId), eq(shots.sceneIndex, sceneIndex)))
        .orderBy(shots.shotNumberInScene);
    } catch (error) {
      console.error('Database error in getShots:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  async deleteShots(parseJobId: number, sceneIndex: number): Promise<void> {
    await db
      .delete(shots)
      .where(and(eq(shots.parseJobId, parseJobId), eq(shots.sceneIndex, sceneIndex)));
  }

  async updateShotImage(shotId: number, imageData: string | null, imagePrompt: string | null): Promise<Shot> {
    const [shot] = await db
      .update(shots)
      .set({
        imageData: imageData || null,
        imagePromptText: imagePrompt || null,
        imageGeneratedAt: imageData ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(shots.id, shotId))
      .returning();
    return shot;
  }

  // Script Health Analysis operations
  async createScriptHealthAnalysis(analysisData: any): Promise<any> {
    const [analysis] = await db
      .insert(scriptHealthAnalysis)
      .values({
        scriptId: analysisData.scriptId,
        userId: analysisData.userId,
        overallScore: analysisData.overallScore,
        structureScore: analysisData.structureScore,
        pacingScore: analysisData.pacingScore,
        characterScore: analysisData.characterScore,
        dialogueScore: analysisData.dialogueScore,
        visualScore: analysisData.visualScore,
        marketabilityScore: analysisData.marketabilityScore,
        strengths: analysisData.strengths,
        improvements: analysisData.improvements,
        genre: analysisData.genre,
        mood: analysisData.mood,
        targetAudience: analysisData.targetAudience,
        marketingTags: analysisData.marketingTags,
        oneLinePitch: analysisData.oneLinePitch,
        estimatedBudget: analysisData.estimatedBudget,
        productionComplexity: analysisData.productionComplexity,
      })
      .returning();
    return analysis;
  }

  async getScriptHealthAnalysis(scriptId: number): Promise<any | undefined> {
    const [analysis] = await db
      .select()
      .from(scriptHealthAnalysis)
      .where(eq(scriptHealthAnalysis.scriptId, scriptId))
      .orderBy(desc(scriptHealthAnalysis.createdAt));
    return analysis || undefined;
  }

  async updateScriptHealthAnalysis(scriptId: number, updates: any): Promise<any> {
    const [analysis] = await db
      .update(scriptHealthAnalysis)
      .set({
        overallScore: updates.overallScore,
        structureScore: updates.structureScore,
        pacingScore: updates.pacingScore,
        characterScore: updates.characterScore,
        dialogueScore: updates.dialogueScore,
        visualScore: updates.visualScore,
        marketabilityScore: updates.marketabilityScore,
        strengths: updates.strengths,
        improvements: updates.improvements,
        genre: updates.genre,
        mood: updates.mood,
        targetAudience: updates.targetAudience,
        marketingTags: updates.marketingTags,
        oneLinePitch: updates.oneLinePitch,
        estimatedBudget: updates.estimatedBudget,
        productionComplexity: updates.productionComplexity,
        updatedAt: new Date(),
      })
      .where(eq(scriptHealthAnalysis.scriptId, scriptId))
      .returning();
    return analysis;
  }

  // Get shots by parse job ID
  async getShotsByParseJobId(parseJobId: number): Promise<Shot[]> {
    return await db
      .select()
      .from(shots)
      .where(eq(shots.parseJobId, parseJobId))
      .orderBy(shots.sceneIndex, shots.shotNumberInScene);
  }

  // Delete user and all associated data
  async deleteUser(userId: string): Promise<void> {
    // For Firebase-based users, we need to delete by email or provider ID
    // Since the user ID passed is the Firebase UID, we'll use providerId
    await db
      .delete(users)
      .where(eq(users.providerId, userId));
  }

  // Schedule user for deletion (30-day delay)
  async scheduleUserDeletion(userId: string): Promise<User> {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30); // 30 days from now

    const [user] = await db
      .update(users)
      .set({
        pendingDeletion: true,
        deletionScheduledAt: deletionDate,
        updatedAt: new Date()
      })
      .where(eq(users.providerId, userId))
      .returning();
    return user;
  }

  // Cancel scheduled deletion (user logged back in)
  async cancelUserDeletion(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        pendingDeletion: false,
        deletionScheduledAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.providerId, userId))
      .returning();
    return user;
  }

  // Get users scheduled for deletion (for cleanup job)
  async getUsersPendingDeletion(): Promise<User[]> {
    const now = new Date();
    const result = await db.execute(sql`
      SELECT * FROM users 
      WHERE pending_deletion = true 
      AND deletion_scheduled_at <= ${now.toISOString()}
    `);
    return result.rows as User[];
  }

  // Delete all script health analysis records for a user
  async deleteScriptHealthAnalysisForUser(userId: string): Promise<void> {
    // Delete script health analysis records using SQL since we have the schema imported
    await db.execute(sql`
      DELETE FROM script_health_analysis 
      WHERE user_id = ${userId}
    `);
  }

  // Delete all session records for a user
  async deleteUserSessions(userId: string): Promise<void> {
    // Delete sessions by user ID stored in sess data
    await db.execute(sql`
      DELETE FROM sessions 
      WHERE sess::text LIKE '%"userId":"${userId}"%'
    `);
  }
}

// Create and export storage instance
export const storage = new DatabaseStorage();
