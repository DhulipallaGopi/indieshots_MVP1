# Deployment Fix Instructions

## Steps to Fix Deployment Issues

### 1. Clean Build Strategy
```bash
# Remove dist folder completely
rm -rf dist/

# Clear npm cache
npm cache clean --force

# Run build in production mode
NODE_ENV=production npm run build
```

### 2. Alternative Build Commands
If the standard build fails, try these alternatives:

```bash
# Option A: Build with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Option B: Build components separately
npx vite build --mode production
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js
```

### 3. Deployment Settings
Ensure your .replit file has:
```
[deployment]
deploymentTarget = "cloudrun"
run = ["sh", "-c", "npm run start"]
build = ["sh", "-c", "npm run build"]
```

### 4. Environment Variables Check
Make sure these are set in Replit Secrets:
- DATABASE_URL
- OPENAI_API_KEY
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_APP_ID
- JWT_SECRET

### 5. Manual Deploy Process
1. Click "Deploy" button in Replit
2. Wait for build completion (may take 5-10 minutes)
3. If build fails, retry with cleared cache
4. Monitor deployment logs for specific errors

### 6. Alternative: Use Replit Deployments
If build continues to fail:
1. Go to https://replit.com/deployments
2. Select your repl
3. Use "Auto Deploy" option
4. Set custom build commands if needed

## Common Deployment Errors and Fixes

### Error: "Build timeout"
- Solution: Increase build timeout or use manual build commands

### Error: "Out of memory"
- Solution: Use NODE_OPTIONS="--max-old-space-size=4096"

### Error: "Module not found"
- Solution: Check all dependencies are installed and environment variables are set

### Error: "Firebase auth domain"
- Solution: Add deployment domain to Firebase authorized domains after deployment