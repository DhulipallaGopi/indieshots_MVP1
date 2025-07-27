import { ObjectId } from 'mongodb';
import { mongodb, ScriptDocument, ParseJobDocument, ShotDocument, ScriptHealthDocument } from './mongodb';
import type { IStorage } from './storage';
import type { InsertScript, Script, InsertParseJob, ParseJob, InsertShot, Shot, InsertScriptHealth, ScriptHealth } from '../shared/schema';

// Helper function to convert ObjectId to number for compatibility
function objectIdToNumber(id: ObjectId): number {
  return parseInt(id.toString().slice(-8), 16);
}

// Helper function to convert number to ObjectId
function numberToObjectId(num: number): ObjectId {
  const hex = num.toString(16).padStart(24, '0');
  return new ObjectId(hex);
}

export class MongoStorage implements IStorage {
  
  // Script operations
  async createScript(script: InsertScript): Promise<Script> {
    const doc: ScriptDocument = {
      userId: script.userId,
      title: script.title,
      filePath: script.filePath || undefined,
      content: script.content || undefined,
      pageCount: script.pageCount || 0,
      fileType: script.fileType || undefined,
      fileSize: script.fileSize || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await mongodb.scripts.insertOne(doc);
    
    return {
      id: parseInt(result.insertedId.toString(), 16), // Convert ObjectId to number for compatibility
      userId: doc.userId,
      title: doc.title,
      filePath: doc.filePath || null,
      content: doc.content || null,
      pageCount: doc.pageCount,
      fileType: doc.fileType || null,
      fileSize: doc.fileSize || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async getUserScripts(userId: string): Promise<Script[]> {
    const docs = await mongodb.scripts.find({ userId }).sort({ createdAt: -1 }).toArray();
    
    return docs.map(doc => ({
      id: parseInt(doc._id!.toString(), 16),
      userId: doc.userId,
      title: doc.title,
      filePath: doc.filePath || null,
      content: doc.content || null,
      pageCount: doc.pageCount,
      fileType: doc.fileType || null,
      fileSize: doc.fileSize || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async getScriptById(id: number): Promise<Script | null> {
    const objectId = new ObjectId(id.toString(16).padStart(24, '0'));
    const doc = await mongodb.scripts.findOne({ _id: objectId });
    
    if (!doc) return null;
    
    return {
      id: parseInt(doc._id!.toString(), 16),
      userId: doc.userId,
      title: doc.title,
      filePath: doc.filePath || null,
      content: doc.content || null,
      pageCount: doc.pageCount,
      fileType: doc.fileType || null,
      fileSize: doc.fileSize || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async deleteScript(id: number): Promise<void> {
    const objectId = new ObjectId(id.toString(16).padStart(24, '0'));
    
    // Delete related data first
    await mongodb.parseJobs.deleteMany({ scriptId: objectId.toString() });
    await mongodb.scriptHealthAnalysis.deleteMany({ scriptId: objectId.toString() });
    
    // Delete the script
    await mongodb.scripts.deleteOne({ _id: objectId });
  }

  // Parse Job operations
  async createParseJob(job: InsertParseJob): Promise<ParseJob> {
    const doc: ParseJobDocument = {
      scriptId: job.scriptId.toString(), // Convert number to string for MongoDB
      userId: job.userId,
      status: job.status || 'pending',
      selectedColumns: job.selectedColumns || [],
      previewData: job.previewData,
      fullParseData: job.fullParseData,
      errorMessage: job.errorMessage || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: job.completedAt || undefined,
    };

    const result = await mongodb.parseJobs.insertOne(doc);
    
    return {
      id: parseInt(result.insertedId.toString(), 16),
      scriptId: job.scriptId,
      userId: doc.userId,
      status: doc.status,
      selectedColumns: doc.selectedColumns,
      previewData: doc.previewData || null,
      fullParseData: doc.fullParseData || null,
      errorMessage: doc.errorMessage || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt || null,
    };
  }

  async getParseJobById(id: number): Promise<ParseJob | null> {
    const objectId = new ObjectId(id.toString(16).padStart(24, '0'));
    const doc = await mongodb.parseJobs.findOne({ _id: objectId });
    
    if (!doc) return null;
    
    return {
      id: parseInt(doc._id!.toString(), 16),
      scriptId: parseInt(doc.scriptId, 16), // Convert back to number
      userId: doc.userId,
      status: doc.status,
      selectedColumns: doc.selectedColumns,
      previewData: doc.previewData || null,
      fullParseData: doc.fullParseData || null,
      errorMessage: doc.errorMessage || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt || null,
    };
  }

  async getUserParseJobs(userId: string): Promise<ParseJob[]> {
    const docs = await mongodb.parseJobs.find({ userId }).sort({ createdAt: -1 }).toArray();
    
    return docs.map(doc => ({
      id: parseInt(doc._id!.toString(), 16),
      scriptId: parseInt(doc.scriptId, 16),
      userId: doc.userId,
      status: doc.status,
      selectedColumns: doc.selectedColumns,
      previewData: doc.previewData || null,
      fullParseData: doc.fullParseData || null,
      errorMessage: doc.errorMessage || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt || null,
    }));
  }

  async updateParseJob(id: number, update: Partial<InsertParseJob>): Promise<ParseJob> {
    const objectId = new ObjectId(id.toString(16).padStart(24, '0'));
    
    const updateDoc: Partial<ParseJobDocument> = {
      ...update,
      updatedAt: new Date(),
    };

    if (update.completedAt) {
      updateDoc.completedAt = update.completedAt;
    }

    await mongodb.parseJobs.updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    const updated = await this.getParseJobById(id);
    if (!updated) throw new Error('Parse job not found after update');
    
    return updated;
  }

  // Shot operations
  async createShots(shots: InsertShot[]): Promise<Shot[]> {
    const docs: ShotDocument[] = shots.map(shot => ({
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

    const result = await mongodb.shots.insertMany(docs);
    
    return docs.map((doc, index) => ({
      id: parseInt(result.insertedIds[index].toString(), 16),
      parseJobId: parseInt(doc.parseJobId, 16),
      sceneIndex: doc.sceneIndex,
      userId: doc.userId,
      shotNumberInScene: doc.shotNumberInScene,
      displayShotNumber: doc.displayShotNumber || null,
      shotDescription: doc.shotDescription || null,
      shotType: doc.shotType || null,
      lens: doc.lens || null,
      movement: doc.movement || null,
      moodAndAmbience: doc.moodAndAmbience || null,
      lighting: doc.lighting || null,
      props: doc.props || null,
      notes: doc.notes || null,
      soundDesign: doc.soundDesign || null,
      colourTemp: doc.colourTemp || null,
      sceneHeading: doc.sceneHeading || null,
      location: doc.location || null,
      timeOfDay: doc.timeOfDay || null,
      tone: doc.tone || null,
      characters: doc.characters || null,
      action: doc.action || null,
      dialogue: doc.dialogue || null,
      imagePromptText: doc.imagePromptText || null,
      imageData: doc.imageData || null,
      imageGeneratedAt: doc.imageGeneratedAt || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async getShotsByParseJobId(parseJobId: number): Promise<Shot[]> {
    const docs = await mongodb.shots
      .find({ parseJobId: parseJobId.toString() })
      .sort({ sceneIndex: 1, shotNumberInScene: 1 })
      .toArray();
    
    return docs.map(doc => ({
      id: parseInt(doc._id!.toString(), 16),
      parseJobId: parseInt(doc.parseJobId, 16),
      sceneIndex: doc.sceneIndex,
      userId: doc.userId,
      shotNumberInScene: doc.shotNumberInScene,
      displayShotNumber: doc.displayShotNumber || null,
      shotDescription: doc.shotDescription || null,
      shotType: doc.shotType || null,
      lens: doc.lens || null,
      movement: doc.movement || null,
      moodAndAmbience: doc.moodAndAmbience || null,
      lighting: doc.lighting || null,
      props: doc.props || null,
      notes: doc.notes || null,
      soundDesign: doc.soundDesign || null,
      colourTemp: doc.colourTemp || null,
      sceneHeading: doc.sceneHeading || null,
      location: doc.location || null,
      timeOfDay: doc.timeOfDay || null,
      tone: doc.tone || null,
      characters: doc.characters || null,
      action: doc.action || null,
      dialogue: doc.dialogue || null,
      imagePromptText: doc.imagePromptText || null,
      imageData: doc.imageData || null,
      imageGeneratedAt: doc.imageGeneratedAt || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async updateShotImage(id: number, imageData: string, imagePromptText?: string): Promise<void> {
    const objectId = new ObjectId(id.toString(16).padStart(24, '0'));
    
    await mongodb.shots.updateOne(
      { _id: objectId },
      { 
        $set: { 
          imageData,
          imagePromptText,
          imageGeneratedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  // Legacy methods - not implemented for MongoDB (Firebase handles user management)
  async updateStripeCustomerId(userId: string, customerId: string): Promise<any> {
    throw new Error('User management handled by Firebase');
  }

  async updateUserStripeInfo(userId: string, info: any): Promise<void> {
    throw new Error('User management handled by Firebase');
  }

  async upgradeToPro(userId: string): Promise<any> {
    throw new Error('User management handled by Firebase');
  }
}