#!/bin/bash

# IndieShots GCP Cloud Run Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="indieshots"

echo -e "${BLUE}🚀 IndieShots GCP Cloud Run Deployment${NC}"
echo "=========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID if not set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}📝 Enter your Google Cloud Project ID:${NC}"
    read -r PROJECT_ID
fi

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Project ID is required${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Setting up project: $PROJECT_ID${NC}"

# Set the project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo -e "${BLUE}🔌 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Create secrets if they don't exist
echo -e "${BLUE}🔐 Setting up secrets...${NC}"

create_secret_if_not_exists() {
    local secret_name=$1
    local prompt_message=$2
    
    if ! gcloud secrets describe "$secret_name" &>/dev/null; then
        echo -e "${YELLOW}📝 $prompt_message${NC}"
        read -rs secret_value
        echo "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
        echo -e "${GREEN}✅ Secret $secret_name created${NC}"
    else
        echo -e "${GREEN}✅ Secret $secret_name already exists${NC}"
    fi
}

# Create all required secrets
create_secret_if_not_exists "database-url" "Enter your DATABASE_URL:"
create_secret_if_not_exists "openai-api-key" "Enter your OPENAI_API_KEY:"
create_secret_if_not_exists "jwt-secret" "Enter your JWT_SECRET:"
create_secret_if_not_exists "firebase-api-key" "Enter your VITE_FIREBASE_API_KEY:"
create_secret_if_not_exists "firebase-project-id" "Enter your VITE_FIREBASE_PROJECT_ID:"

# Build and deploy
echo -e "${BLUE}🏗️  Building and deploying to Cloud Run...${NC}"

# Option 1: Direct source deployment (simpler)
echo -e "${YELLOW}Choose deployment method:${NC}"
echo "1) Direct source deployment (recommended for first time)"
echo "2) Cloud Build pipeline (recommended for CI/CD)"
read -p "Enter choice (1 or 2): " deploy_choice

if [ "$deploy_choice" = "1" ]; then
    echo -e "${BLUE}🚀 Deploying directly from source...${NC}"
    gcloud run deploy "$SERVICE_NAME" \
        --source . \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --port 8080 \
        --memory 1Gi \
        --cpu 1 \
        --max-instances 10 \
        --min-instances 0 \
        --concurrency 80 \
        --timeout 300 \
        --set-env-vars NODE_ENV=production,PORT=8080 \
        --set-secrets DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest

elif [ "$deploy_choice" = "2" ]; then
    echo -e "${BLUE}🏗️  Using Cloud Build pipeline...${NC}"
    
    # Submit build
    gcloud builds submit --config cloudbuild.yaml .
    
else
    echo -e "${RED}❌ Invalid choice${NC}"
    exit 1
fi

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=========================================="
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo -e "${BLUE}📊 Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME${NC}"
echo -e "${BLUE}📝 Logs: gcloud logs tail 'resource.type=cloud_run_revision'${NC}"
echo ""

# Test the deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"
if curl -f "$SERVICE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Application may still be starting up${NC}"
    echo "Check logs: gcloud logs tail 'resource.type=cloud_run_revision'"
fi

echo ""
echo -e "${GREEN}🎬 Your IndieShots application is now live on Google Cloud Run!${NC}"