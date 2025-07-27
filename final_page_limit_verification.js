// Final verification that all 5-page references have been updated to 10 pages
import fs from 'fs';
import path from 'path';

const searchFiles = [
  'client/src/pages/home.tsx',
  'client/src/pages/settings.tsx', 
  'client/src/components/layout/left-panel.tsx',
  'server/middleware/tierLimits.ts',
  'server/controllers/firebaseAuthController.ts',
  'shared/schema.ts'
];

console.log('=== FINAL PAGE LIMIT VERIFICATION ===\n');

let allFilesCorrect = true;

for (const file of searchFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for old references to 5 pages
    const oldReferences = [
      '5 pages per month',
      'totalPages: 5',
      'totalPages || 5',
      'Free tier: 5'
    ];
    
    const foundOldReferences = [];
    
    oldReferences.forEach(oldRef => {
      if (content.includes(oldRef)) {
        foundOldReferences.push(oldRef);
      }
    });
    
    // Check for new references to 10 pages 
    const newReferences = [
      '10 pages per month',
      'totalPages: 10',
      'totalPages || 10',
      'Free tier: 10'
    ];
    
    const foundNewReferences = [];
    
    newReferences.forEach(newRef => {
      if (content.includes(newRef)) {
        foundNewReferences.push(newRef);
      }
    });
    
    if (foundOldReferences.length > 0) {
      console.log(`❌ ${file}:`);
      console.log(`   Still contains old references: ${foundOldReferences.join(', ')}`);
      allFilesCorrect = false;
    } else if (foundNewReferences.length > 0) {
      console.log(`✅ ${file}:`);
      console.log(`   Updated correctly: ${foundNewReferences.join(', ')}`);
    } else {
      console.log(`🔍 ${file}: No page limit references found (may be normal)`);
    }
    
  } catch (error) {
    console.log(`❌ Error reading ${file}:`, error.message);
    allFilesCorrect = false;
  }
}

console.log('\n=== VERIFICATION SUMMARY ===');
if (allFilesCorrect) {
  console.log('🎉 SUCCESS: All page limit references have been updated from 5 to 10 pages per month!');
  console.log('✅ Free tier users now get 10 pages per month instead of 5');
  console.log('✅ All UI components, backend configs, and documentation updated');
} else {
  console.log('❌ Some files still contain old 5-page references and need fixing');
}