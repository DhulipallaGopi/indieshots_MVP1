#!/bin/bash

# IndieShots GCP Deployment Script
set -e

echo "🚀 Starting IndieShots GCP Migration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="indieshots-prod"
REGION="us-central1"
SERVICE_NAME="indieshots"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Please log in to Google Cloud${NC}"
    gcloud auth login
fi

echo -e "${GREEN}✅ Setting up project: $PROJECT_ID${NC}"

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${GREEN}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Function to create secret if it doesn't exist
create_secret() {
    local secret_name=$1
    local secret_description=$2
    
    if ! gcloud secrets describe $secret_name >/dev/null 2>&1; then
        echo -e "${YELLOW}🔐 Creating secret: $secret_name${NC}"
        echo -e "${YELLOW}Please enter $secret_description:${NC}"
        read -s secret_value
        echo "$secret_value" | gcloud secrets create $secret_name --data-file=-
        echo -e "${GREEN}✅ Secret $secret_name created${NC}"
    else
        echo -e "${GREEN}✅ Secret $secret_name already exists${NC}"
    fi
}

# Create secrets
echo -e "${GREEN}🔐 Setting up secrets...${NC}"
create_secret "database-url" "Database URL (PostgreSQL connection string)"
create_secret "openai-api-key" "OpenAI API Key"
create_secret "jwt-secret" "JWT Secret Key"
create_secret "firebase-api-key" "Firebase API Key"
create_secret "firebase-project-id" "Firebase Project ID"

# Build and deploy
echo -e "${GREEN}🏗️  Building and deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production \
    --set-secrets DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest \
    --memory 512Mi \
    --cpu 1000m \
    --max-instances 10 \
    --timeout 300s

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${GREEN}🔗 Your application is available at: $SERVICE_URL${NC}"

# Optional: Set up Cloud Build trigger for automatic deployments
read -p "Do you want to set up automatic deployments from GitHub? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🔄 Setting up Cloud Build trigger...${NC}"
    echo "Please connect your GitHub repository manually in the Cloud Console:"
    echo "https://console.cloud.google.com/cloud-build/triggers"
    echo "Use the cloudbuild.yaml file in your repository"
fi

echo -e "${GREEN}✅ Migration completed successfully!${NC}"