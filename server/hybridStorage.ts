import { mongodb, initializeMongoDB } from './mongodb';
import { DatabaseStorage } from './storage';
import type { IStorage } from './storage';
import type { InsertScript, Script, InsertParseJob, ParseJob, InsertShot, Shot } from '../shared/schema';

/**
 * Hybrid storage implementation that writes to both PostgreSQL and MongoDB
 * This ensures zero-downtime migration while maintaining all existing functionality
 */
export class HybridStorage implements IStorage {
  private pgStorage: DatabaseStorage;
  private mongoEnabled = false;

  constructor() {
    this.pgStorage = new DatabaseStorage();
    this.initializeMongo();
  }

  private async initializeMongo() {
    try {
      await initializeMongoDB();
      this.mongoEnabled = true;
      console.log('✓ Hybrid storage: MongoDB enabled');
    } catch (error) {
      console.warn('⚠ Hybrid storage: MongoDB disabled, using PostgreSQL only');
      this.mongoEnabled = false;
    }
  }

  // Script operations
  async createScript(script: InsertScript): Promise<Script> {
    // Always write to PostgreSQL first (primary)
    const pgResult = await this.pgStorage.createScript(script);

    // Write to MongoDB if available (secondary)
    if (this.mongoEnabled) {
      try {
        await mongodb.scripts.insertOne({
          userId: script.userId,
          title: script.title,
          filePath: script.filePath || undefined,
          content: script.content || undefined,
          pageCount: script.pageCount || 0,
          fileType: script.fileType || undefined,
          fileSize: script.fileSize || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('✓ Script synced to MongoDB');
      } catch (error) {
        console.warn('⚠ MongoDB sync failed for script:', error);
      }
    }

    return pgResult;
  }

  async getUserScripts(userId: string): Promise<Script[]> {
    return this.pgStorage.getUserScripts(userId);
  }

  async getScriptById(id: number): Promise<Script | null> {
    return this.pgStorage.getScriptById(id);
  }

  async deleteScript(id: number): Promise<void> {
    // Delete from PostgreSQL first
    await this.pgStorage.deleteScript(id);

    // Delete from MongoDB if available
    if (this.mongoEnabled) {
      try {
        // Find the script to get its data for deletion
        const script = await this.pgStorage.getScriptById(id);
        if (script) {
          await mongodb.scripts.deleteMany({ userId: script.userId, title: script.title });
          await mongodb.parseJobs.deleteMany({ userId: script.userId });
          await mongodb.shots.deleteMany({ userId: script.userId });
        }
        console.log('✓ Script deleted from MongoDB');
      } catch (error) {
        console.warn('⚠ MongoDB deletion failed for script:', error);
      }
    }
  }

  // Parse Job operations
  async createParseJob(job: InsertParseJob): Promise<ParseJob> {
    // Always write to PostgreSQL first (primary)
    const pgResult = await this.pgStorage.createParseJob(job);

    // Write to MongoDB if available (secondary)
    if (this.mongoEnabled) {
      try {
        await mongodb.parseJobs.insertOne({
          scriptId: job.scriptId.toString(),
          userId: job.userId,
          status: (job.status || 'pending') as 'pending' | 'processing' | 'completed' | 'failed',
          selectedColumns: job.selectedColumns || [],
          previewData: job.previewData,
          fullParseData: job.fullParseData,
          errorMessage: job.errorMessage || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: job.completedAt || undefined,
        });
        console.log('✓ Parse job synced to MongoDB');
      } catch (error) {
        console.warn('⚠ MongoDB sync failed for parse job:', error);
      }
    }

    return pgResult;
  }

  async getParseJobById(id: number): Promise<ParseJob | null> {
    return this.pgStorage.getParseJobById(id);
  }

  async getUserParseJobs(userId: string): Promise<ParseJob[]> {
    return this.pgStorage.getUserParseJobs(userId);
  }

  async updateParseJob(id: number, update: Partial<InsertParseJob>): Promise<ParseJob> {
    // Update PostgreSQL first (primary)
    const pgResult = await this.pgStorage.updateParseJob(id, update);

    // Update MongoDB if available (secondary)
    if (this.mongoEnabled) {
      try {
        const updateDoc: any = {
          ...update,
          updatedAt: new Date(),
        };

        if (update.scriptId) {
          updateDoc.scriptId = update.scriptId.toString();
        }

        await mongodb.parseJobs.updateMany(
          { userId: update.userId || pgResult.userId },
          { $set: updateDoc }
        );
        console.log('✓ Parse job updated in MongoDB');
      } catch (error) {
        console.warn('⚠ MongoDB update failed for parse job:', error);
      }
    }

    return pgResult;
  }

  // Shot operations
  async createShots(shots: InsertShot[]): Promise<Shot[]> {
    // Always write to PostgreSQL first (primary)
    const pgResults = await this.pgStorage.createShots(shots);

    // Write to MongoDB if available (secondary)
    if (this.mongoEnabled && shots.length > 0) {
      try {
        const mongoDocs = shots.map(shot => ({
          parseJobId: shot.parseJobId.toString(),
          sceneIndex: shot.sceneIndex,
          userId: shot.userId,
          shotNumberInScene: shot.shotNumberInScene,
          displayShotNumber: shot.displayShotNumber || undefined,
          shotDescription: shot.shotDescription || undefined,
          shotType: shot.shotType || undefined,
          lens: shot.lens || undefined,
          movement: shot.movement || undefined,
          moodAndAmbience: shot.moodAndAmbience || undefined,
          lighting: shot.lighting || undefined,
          props: shot.props || undefined,
          notes: shot.notes || undefined,
          soundDesign: shot.soundDesign || undefined,
          colourTemp: shot.colourTemp || undefined,
          sceneHeading: shot.sceneHeading || undefined,
          location: shot.location || undefined,
          timeOfDay: shot.timeOfDay || undefined,
          tone: shot.tone || undefined,
          characters: shot.characters || undefined,
          action: shot.action || undefined,
          dialogue: shot.dialogue || undefined,
          imagePromptText: shot.imagePromptText || undefined,
          imageData: shot.imageData || undefined,
          imageGeneratedAt: shot.imageGeneratedAt || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await mongodb.shots.insertMany(mongoDocs);
        console.log(`✓ ${shots.length} shots synced to MongoDB`);
      } catch (error) {
        console.warn('⚠ MongoDB sync failed for shots:', error);
      }
    }

    return pgResults;
  }

  async getShotsByParseJobId(parseJobId: number): Promise<Shot[]> {
    return this.pgStorage.getShotsByParseJobId(parseJobId);
  }

  async updateShotImage(shotId: number, imageData: string | null, imagePrompt: string | null): Promise<Shot> {
    // Update PostgreSQL first (primary)
    const pgResult = await this.pgStorage.updateShotImage(shotId, imageData, imagePrompt);

    // Update MongoDB if available (secondary)
    if (this.mongoEnabled) {
      try {
        await mongodb.shots.updateMany(
          { userId: pgResult.userId },
          { 
            $set: { 
              imageData: imageData || undefined,
              imagePromptText: imagePrompt || undefined,
              imageGeneratedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
        console.log('✓ Shot image updated in MongoDB');
      } catch (error) {
        console.warn('⚠ MongoDB update failed for shot image:', error);
      }
    }

    return pgResult;
  }

  // Legacy user management methods (handled by Firebase)
  async updateStripeCustomerId(userId: number, customerId: string): Promise<any> {
    return this.pgStorage.updateStripeCustomerId(userId, customerId);
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { customerId: string; subscriptionId: string }): Promise<any> {
    return this.pgStorage.updateUserStripeInfo(userId, stripeInfo);
  }

  async upgradeToPro(userId: number): Promise<any> {
    return this.pgStorage.upgradeToPro(userId);
  }
}