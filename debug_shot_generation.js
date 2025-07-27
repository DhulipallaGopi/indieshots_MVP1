/**
 * Debug script to test shot generation and identify why fallback shots are being used
 */

import { generateShotsFromScene } from './server/services/shotGenerator.js';

async function testShotGeneration() {
  console.log('🧪 Testing shot generation to identify fallback cause...');
  
  // Test scene data
  const sceneText = `INT. COFFEE SHOP - DAY

A young woman sits alone at a corner table, nervously checking her phone. She glances toward the entrance every few seconds.

SARAH
(to herself)
Where is he?

The door chimes as a man in a business suit enters, looking around uncertainly.

DAVID
(approaching)
Sarah? I'm David from the dating app.

SARAH
(relieved)
Oh, thank goodness. I was starting to think...

DAVID
Sorry I'm late. Traffic was insane.

They shake hands awkwardly.`;

  const sceneHeading = "INT. COFFEE SHOP - DAY";
  const sceneNumber = 1;
  
  try {
    console.log('📋 Scene text:', sceneText.substring(0, 100) + '...');
    console.log('🎬 Scene heading:', sceneHeading);
    console.log('🔢 Scene number:', sceneNumber);
    
    const shots = await generateShotsFromScene(sceneText, sceneHeading, sceneNumber);
    
    console.log('✅ Shot generation completed!');
    console.log('📊 Generated shots count:', shots.length);
    
    // Check if these look like demo shots or real AI shots
    const firstShot = shots[0];
    if (firstShot) {
      console.log('🎯 First shot sample:');
      console.log('   Description:', firstShot.shotDescription);
      console.log('   Type:', firstShot.shotType);
      console.log('   Lens:', firstShot.lens);
      console.log('   Movement:', firstShot.movement);
      
      // Check if it looks like a demo shot (contains specific demo patterns)
      const isDemoShot = firstShot.shotDescription.includes('establishing') || 
                        firstShot.shotDescription.includes('Wide shot establishing') ||
                        firstShot.shotType === 'Wide Shot' && firstShot.lens === '24mm';
      
      if (isDemoShot) {
        console.log('⚠️  This appears to be a DEMO SHOT - fallback was used');
        console.log('💡 Reason: OpenAI API likely failed or had issues');
      } else {
        console.log('✅ This appears to be a REAL AI-GENERATED SHOT');
      }
    }
    
    // Print all shots for analysis
    console.log('\n📋 All generated shots:');
    shots.forEach((shot, i) => {
      console.log(`${i + 1}. ${shot.shotDescription} (${shot.shotType})`);
    });
    
  } catch (error) {
    console.error('❌ Shot generation failed:', error);
    console.error('   Error message:', error.message);
    console.error('   Stack trace:', error.stack);
  }
}

// Run the test
testShotGeneration().catch(console.error);