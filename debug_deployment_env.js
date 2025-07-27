#!/usr/bin/env node

/**
 * Debug deployment environment differences
 */

console.log('🔍 DEPLOYMENT ENVIRONMENT DEBUG');
console.log('===============================');

console.log('\n📊 Environment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Present (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'Missing'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Present' : 'Missing'}`);
console.log(`PORT: ${process.env.PORT || 'Not set'}`);

console.log('\n🔧 Node.js Configuration:');
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

console.log('\n📦 Package Configuration:');
try {
  const pkg = await import('./package.json', { assert: { type: 'json' } });
  console.log(`App name: ${pkg.default.name}`);
  console.log(`App version: ${pkg.default.version}`);
  console.log(`Node engine: ${pkg.default.engines?.node || 'Not specified'}`);
} catch (error) {
  console.log('Package.json read error:', error.message);
}

console.log('\n🌐 Network Configuration:');
console.log(`Host: ${process.env.HOST || 'localhost'}`);
console.log(`Replit domain: ${process.env.REPLIT_DEV_DOMAIN || 'Not set'}`);

console.log('\n🚀 Runtime Differences:');
console.log('This script helps identify why deployment behaves differently than development');
console.log('Common causes of 500 errors in deployment:');
console.log('1. Missing environment variables');
console.log('2. Network timeouts (stricter in production)');
console.log('3. Memory limitations');
console.log('4. Import/module resolution issues');
console.log('5. Database connection differences');