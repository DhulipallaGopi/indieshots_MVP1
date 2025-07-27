# IndieShots GCP Deployment Instructions

## Fixed npm ci Build Error

The Docker build was failing because the npm version in the container didn't support the `--legacy-peer-deps` flag. This has been resolved by:

1. Updating npm to the latest version in the Docker container
2. Adding fallback commands for dependency installation
3. Using multiple installation strategies to ensure compatibility

## Deployment Options

### Option 1: Quick Deploy (Recommended)
```bash
# Make the script executable and run
chmod +x gcp-deploy.sh
./gcp-deploy.sh
```

This script will:
- Set up your GCP project
- Enable required APIs
- Create secrets securely
- Build and deploy your application
- Provide the live URL

### Option 2: Manual Cloud Build
```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com

# Create secrets (you'll be prompted for values)
echo "YOUR_DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo "YOUR_OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=-
echo "YOUR_JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
echo "YOUR_FIREBASE_API_KEY" | gcloud secrets create firebase-api-key --data-file=-
echo "YOUR_FIREBASE_PROJECT_ID" | gcloud secrets create firebase-project-id --data-file=-

# Deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml .
```

### Option 3: Terraform Infrastructure as Code
```bash
cd terraform/

# Create terraform.tfvars with your values:
cat > terraform.tfvars << EOF
project_id = "your-project-id"
database_url = "your-database-url"
openai_api_key = "your-openai-key"
jwt_secret = "your-jwt-secret"
firebase_api_key = "your-firebase-key"
firebase_project_id = "your-firebase-project-id"
EOF

# Deploy infrastructure
terraform init
terraform plan
terraform apply
```

## What Gets Deployed

Your IndieShots application will be deployed with:

- **Cloud Run Service**: Auto-scaling serverless container
- **Secret Manager**: Secure storage for API keys and credentials
- **Container Registry**: Docker image storage
- **Load Balancer**: Automatic HTTPS and global distribution
- **Monitoring**: Built-in logging and metrics

## Expected Costs

- **Cloud Run**: $0-15/month (pay per request, free tier available)
- **Secret Manager**: $0.06/month per secret (minimal cost)
- **Container Registry**: $0.10/GB/month for image storage
- **Total Estimated**: $5-20/month depending on usage

## Post-Deployment

After successful deployment, you'll get:
- Live URL for your application
- Monitoring dashboard in GCP Console
- Automatic SSL certificate
- Global CDN distribution

## Troubleshooting

If deployment fails:
1. Check your secrets are properly set
2. Ensure your GCP project has billing enabled
3. Verify all required APIs are enabled
4. Check build logs in Cloud Build console

The Docker build error with npm has been resolved in the updated Dockerfile.