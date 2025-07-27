# IndieShots GCP Migration Guide

## Overview
This guide covers migrating IndieShots from Replit to Google Cloud Platform using Cloud Run for serverless deployment.

## Prerequisites
- Google Cloud Account with billing enabled
- Google Cloud CLI installed (`gcloud`)
- Docker installed locally
- GitHub repository set up at: https://github.com/indishots/IndieShots

## Quick Start

### Option 1: Automated Deployment (Recommended)
```bash
# Clone your repository
git clone https://github.com/indishots/IndieShots.git
cd IndieShots

# Run the automated deployment script
./deploy.sh
```

### Option 2: Terraform Infrastructure as Code
```bash
# Navigate to terraform directory
cd terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize and apply
terraform init
terraform plan
terraform apply
```

### Option 3: Manual Setup

## Migration Steps

### 1. Set up Google Cloud Project
```bash
# Create a new project
gcloud projects create indieshots-prod --name="IndieShots Production"

# Set the project as default
gcloud config set project indieshots-prod

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Database Migration (PostgreSQL)

#### Option A: Cloud SQL (Recommended)
```bash
# Create Cloud SQL instance
gcloud sql instances create indieshots-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB

# Create database
gcloud sql databases create indieshots --instance=indieshots-db

# Create user
gcloud sql users create indieshots-user \
    --instance=indieshots-db \
    --password=YOUR_SECURE_PASSWORD
```

#### Option B: Neon (Current) - No Migration Needed
Keep using your existing Neon database by updating the CONNECTION_URL

### 3. Secrets Management
```bash
# Store secrets in Google Secret Manager
gcloud secrets create openai-api-key --data-file=- <<< "YOUR_OPENAI_KEY"
gcloud secrets create jwt-secret --data-file=- <<< "YOUR_JWT_SECRET"
gcloud secrets create database-url --data-file=- <<< "YOUR_DATABASE_URL"
gcloud secrets create firebase-api-key --data-file=- <<< "YOUR_FIREBASE_KEY"
gcloud secrets create firebase-project-id --data-file=- <<< "YOUR_FIREBASE_PROJECT"
```

### 4. Build and Deploy with Cloud Run

#### Method 1: Direct Deployment
```bash
# Build and deploy in one command
gcloud run deploy indieshots \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production \
    --set-secrets DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest
```

#### Method 2: Cloud Build (Recommended)
```bash
# Submit build to Cloud Build
gcloud builds submit --tag gcr.io/indieshots-prod/indieshots

# Deploy to Cloud Run
gcloud run deploy indieshots \
    --image gcr.io/indieshots-prod/indieshots \
    --region us-central1 \
    --allow-unauthenticated \
    --set-secrets DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest
```

### 5. Domain Configuration
```bash
# Map custom domain (optional)
gcloud run domain-mappings create \
    --service indieshots \
    --domain indieshots.com \
    --region us-central1
```

## Configuration Files Created

### Dockerfile
- Multi-stage build for optimized production image
- Node.js 20 Alpine base
- Proper dependency management
- Production-ready configuration

### .dockerignore
- Excludes unnecessary files from Docker context
- Reduces build time and image size

### cloudbuild.yaml
- Automated CI/CD pipeline
- Builds and deploys on code changes
- Integrates with GitHub

## Environment Variables Mapping

| Replit Variable | GCP Secret Name | Description |
|----------------|-----------------|-------------|
| DATABASE_URL | database-url | PostgreSQL connection string |
| OPENAI_API_KEY | openai-api-key | OpenAI API key for AI processing |
| JWT_SECRET | jwt-secret | JWT token signing secret |
| VITE_FIREBASE_API_KEY | firebase-api-key | Firebase API key |
| VITE_FIREBASE_PROJECT_ID | firebase-project-id | Firebase project ID |

## Post-Migration Checklist

- [ ] Database connection verified
- [ ] Firebase authentication working
- [ ] File uploads functional
- [ ] AI processing operational
- [ ] SSL certificate configured
- [ ] Custom domain mapped (if applicable)
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented

## Cost Optimization

### Cloud Run Pricing
- Pay per request (no idle costs)
- 2 million requests/month free tier
- CPU allocated only during request processing

### Recommended Settings
```yaml
# Cloud Run service configuration
cpu: 1000m
memory: 512Mi
max_instances: 10
min_instances: 0
concurrency: 80
timeout: 300s
```

## Monitoring and Logging
```bash
# Set up Cloud Monitoring alerts
gcloud alpha monitoring policies create --policy-from-file=monitoring-policy.yaml

# View logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50
```

## Rollback Strategy
- Keep Replit environment as backup
- Use Cloud Run revisions for quick rollbacks
- Database backups automated with Cloud SQL

## Security Considerations
- All secrets managed via Secret Manager
- HTTPS enforced by default
- IAM roles properly configured
- Network security via VPC (if needed)

## Support and Troubleshooting
- Use `gcloud logs tail` for real-time debugging
- Cloud Run metrics available in Google Cloud Console
- Error reporting automatically enabled