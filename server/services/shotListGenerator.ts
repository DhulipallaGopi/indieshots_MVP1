import { ParsedScene } from './scriptParser';

export interface ShotListItem {
  shotNumber: number;
  sceneNumber: number;
  shotSize: string;
  cameraAngle: string;
  cameraMovement: string;
  description: string;
  characters: string[];
  location: string;
  props: string[];
  wardrobe: string[];
  makeup: string[];
  specialEffects: string[];
  notes: string;
  estimatedDuration: number; // in seconds
}

export interface ShotListOptions {
  scenes: ParsedScene[];
  includeCloseUps: boolean;
  includeMediumShots: boolean;
  includeWideShots: boolean;
  includeInserts: boolean;
  cinematicStyle: 'standard' | 'documentary' | 'cinematic' | 'handheld';
}

/**
 * Advanced shot list generator that converts parsed scenes into detailed shot breakdowns
 */
export class ShotListGenerator {
  
  /**
   * Generate a comprehensive shot list from parsed scenes
   */
  generateShotList(options: ShotListOptions): ShotListItem[] {
    const { scenes, includeCloseUps, includeMediumShots, includeWideShots, includeInserts, cinematicStyle } = options;
    const shotList: ShotListItem[] = [];
    let shotNumber = 1;

    scenes.forEach(scene => {
      const sceneShots = this.generateShotsForScene(scene, {
        includeCloseUps,
        includeMediumShots,
        includeWideShots,
        includeInserts,
        cinematicStyle,
        startingShotNumber: shotNumber
      });

      shotList.push(...sceneShots);
      shotNumber += sceneShots.length;
    });

    return shotList;
  }

  /**
   * Generate shots for a single scene
   */
  private generateShotsForScene(scene: ParsedScene, options: any): ShotListItem[] {
    const shots: ShotListItem[] = [];
    const { cinematicStyle, startingShotNumber } = options;
    let currentShotNumber = startingShotNumber;

    // Always start with an establishing shot for new locations
    if (options.includeWideShots) {
      shots.push({
        shotNumber: currentShotNumber++,
        sceneNumber: scene.sceneNumber || 1,
        shotSize: 'Wide Shot',
        cameraAngle: 'Eye Level',
        cameraMovement: this.getCameraMovementForStyle(cinematicStyle, 'establishing'),
        description: `Establishing shot of ${scene.location || 'the location'}${scene.timeOfDay ? ' during ' + scene.timeOfDay.toLowerCase() : ''}`,
        characters: scene.characters || [],
        location: scene.location || '',
        props: scene.props || [],
        wardrobe: scene.wardrobe || [],
        makeup: scene.makeup || [],
        specialEffects: scene.specialEffects || [],
        notes: scene.notes || '',
        estimatedDuration: 3
      });
    }

    // Add medium shots for character interactions
    if (options.includeMediumShots && scene.characters && scene.characters.length > 0) {
      scene.characters.forEach(character => {
        shots.push({
          shotNumber: currentShotNumber++,
          sceneNumber: scene.sceneNumber || 1,
          shotSize: 'Medium Shot',
          cameraAngle: 'Eye Level',
          cameraMovement: this.getCameraMovementForStyle(cinematicStyle, 'character'),
          description: `Medium shot of ${character}${scene.action ? ' - ' + scene.action.substring(0, 50) + '...' : ''}`,
          characters: [character],
          location: scene.location || '',
          props: scene.props || [],
          wardrobe: scene.wardrobe || [],
          makeup: scene.makeup || [],
          specialEffects: scene.specialEffects || [],
          notes: scene.notes || '',
          estimatedDuration: 5
        });
      });
    }

    // Add close-ups for dialogue or emotional moments
    if (options.includeCloseUps && scene.dialogue && scene.characters) {
      scene.characters.forEach(character => {
        shots.push({
          shotNumber: currentShotNumber++,
          sceneNumber: scene.sceneNumber || 1,
          shotSize: 'Close-Up',
          cameraAngle: 'Eye Level',
          cameraMovement: this.getCameraMovementForStyle(cinematicStyle, 'dialogue'),
          description: `Close-up of ${character} during dialogue`,
          characters: [character],
          location: scene.location || '',
          props: scene.props || [],
          wardrobe: scene.wardrobe || [],
          makeup: scene.makeup || [],
          specialEffects: scene.specialEffects || [],
          notes: `Dialogue: ${scene.dialogue ? scene.dialogue.substring(0, 100) + '...' : ''}`,
          estimatedDuration: 4
        });
      });
    }

    // Add insert shots for important props
    if (options.includeInserts && scene.props && scene.props.length > 0) {
      scene.props.forEach(prop => {
        shots.push({
          shotNumber: currentShotNumber++,
          sceneNumber: scene.sceneNumber || 1,
          shotSize: 'Insert',
          cameraAngle: 'High Angle',
          cameraMovement: 'Static',
          description: `Insert shot of ${prop}`,
          characters: [],
          location: scene.location || '',
          props: [prop],
          wardrobe: scene.wardrobe || [],
          makeup: scene.makeup || [],
          specialEffects: scene.specialEffects || [],
          notes: scene.notes || '',
          estimatedDuration: 2
        });
      });
    }

    return shots;
  }

  /**
   * Get appropriate camera movement based on cinematic style
   */
  private getCameraMovementForStyle(style: string, shotType: string): string {
    const movements = {
      'standard': {
        'establishing': 'Static',
        'character': 'Slow Push In',
        'dialogue': 'Static',
        'action': 'Pan'
      },
      'documentary': {
        'establishing': 'Handheld',
        'character': 'Handheld',
        'dialogue': 'Slight Handheld',
        'action': 'Handheld Follow'
      },
      'cinematic': {
        'establishing': 'Slow Dolly In',
        'character': 'Dolly Push In',
        'dialogue': 'Subtle Dolly',
        'action': 'Dynamic Movement'
      },
      'handheld': {
        'establishing': 'Handheld',
        'character': 'Handheld',
        'dialogue': 'Handheld',
        'action': 'Handheld'
      }
    };

    return movements[style as keyof typeof movements]?.[shotType as keyof typeof movements['standard']] || 'Static';
  }

  /**
   * Calculate total estimated duration for shot list
   */
  calculateTotalDuration(shots: ShotListItem[]): number {
    return shots.reduce((total, shot) => total + shot.estimatedDuration, 0);
  }

  /**
   * Group shots by scene
   */
  groupShotsByScene(shots: ShotListItem[]): { [sceneNumber: number]: ShotListItem[] } {
    const grouped: { [sceneNumber: number]: ShotListItem[] } = {};
    
    shots.forEach(shot => {
      if (!grouped[shot.sceneNumber]) {
        grouped[shot.sceneNumber] = [];
      }
      grouped[shot.sceneNumber].push(shot);
    });

    return grouped;
  }

  /**
   * Generate equipment list based on shots
   */
  generateEquipmentList(shots: ShotListItem[]): string[] {
    const equipment = new Set<string>();
    
    shots.forEach(shot => {
      // Add camera equipment based on shot type
      if (shot.shotSize === 'Wide Shot') {
        equipment.add('Wide Angle Lens');
      } else if (shot.shotSize === 'Close-Up') {
        equipment.add('85mm Lens');
      } else if (shot.shotSize === 'Medium Shot') {
        equipment.add('50mm Lens');
      }

      // Add movement equipment
      if (shot.cameraMovement.includes('Dolly')) {
        equipment.add('Camera Dolly');
      } else if (shot.cameraMovement.includes('Handheld')) {
        equipment.add('Stabilizer/Gimbal');
      } else if (shot.cameraMovement.includes('Pan')) {
        equipment.add('Tripod with Fluid Head');
      }

      // Add special equipment for effects
      if (shot.specialEffects && shot.specialEffects.length > 0) {
        equipment.add('Special Effects Equipment');
      }
    });

    equipment.add('Camera Body');
    equipment.add('Audio Equipment');
    equipment.add('Lighting Kit');

    return Array.from(equipment);
  }
}

export const shotListGenerator = new ShotListGenerator();