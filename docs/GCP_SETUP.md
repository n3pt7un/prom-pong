# GCP Setup Guide for CI/CD Pipeline

This guide walks you through setting up the Google Cloud Platform resources required for the automated CI/CD pipeline that deploys Cyber Pong to Cloud Run.

## Prerequisites

- A Google Cloud Platform account
- A GCP project (or create a new one)
- `gcloud` CLI installed and authenticated (optional, but recommended)
- Access to the GCP Console

## Overview

The CI/CD pipeline requires the following GCP resources:

1. **Service Account** - For GitHub Actions to authenticate with GCP
2. **Artifact Registry Repository** - To store Docker container images
3. **Cloud Run Service** - To host the deployed application

All resources will be configured to stay within GCP's free tier limits.

## Step 1: Create a GCP Project (if needed)

If you don't already have a project:

1. Go to the [GCP Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "cyber-pong")
5. Note your **Project ID** - you'll need this later

## Step 2: Enable Required APIs

Enable the necessary APIs for your project:

### Via Console:

1. Go to **APIs & Services > Library**
2. Search for and enable each of these APIs:
   - **Artifact Registry API**
   - **Cloud Run Admin API**
   - **Cloud Build API** (for container builds)

### Via gcloud CLI:

```bash
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Step 3: Create a Service Account

The service account is used by GitHub Actions to authenticate with GCP.

### Via Console:

1. Go to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - **Name**: `github-actions-deployer`
   - **Description**: `Service account for GitHub Actions CI/CD pipeline`
4. Click **Create and Continue**

### Via gcloud CLI:

```bash
gcloud iam service-accounts create github-actions-deployer \
    --display-name="GitHub Actions Deployer" \
    --description="Service account for GitHub Actions CI/CD pipeline"
```

## Step 4: Grant Required IAM Roles

The service account needs three specific roles to build and deploy:

### Required Roles:

1. **Artifact Registry Writer** (`roles/artifactregistry.writer`)
   - Allows pushing Docker images to Artifact Registry

2. **Cloud Run Admin** (`roles/run.admin`)
   - Allows deploying and managing Cloud Run services

3. **Service Account User** (`roles/iam.serviceAccountUser`)
   - Allows acting as the Cloud Run service account

### Via Console:

1. Go to **IAM & Admin > IAM**
2. Click **Grant Access**
3. Enter the service account email: `github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com`
4. Add each role:
   - Click **Add Another Role** for each additional role
   - Select the three roles listed above
5. Click **Save**

### Via gcloud CLI:

```bash
# Set your project ID
PROJECT_ID="your-project-id"

# Grant Artifact Registry Writer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

## Step 5: Create and Download Service Account Key

GitHub Actions needs a JSON key file to authenticate as the service account.

### Via Console:

1. Go to **IAM & Admin > Service Accounts**
2. Find `github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com`
3. Click the three dots menu (⋮) on the right
4. Select **Manage Keys**
5. Click **Add Key > Create New Key**
6. Select **JSON** format
7. Click **Create**
8. The key file will download automatically - **save it securely**

### Via gcloud CLI:

```bash
gcloud iam service-accounts keys create ~/github-actions-key.json \
    --iam-account=github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Important Security Notes:**
- This key file grants full access to your GCP resources with the assigned roles
- Never commit this file to your repository
- Store it securely and delete it after adding to GitHub Secrets
- You can revoke keys anytime from the GCP Console

## Step 6: Create Artifact Registry Repository

This repository stores your Docker container images.

### Via Console:

1. Go to **Artifact Registry > Repositories**
2. Click **Create Repository**
3. Configure:
   - **Name**: `cyber-pong-repo`
   - **Format**: Docker
   - **Mode**: Standard
   - **Location type**: Region
   - **Region**: `europe-west1` (or your preferred region)
   - **Encryption**: Google-managed encryption key
4. Click **Create**

### Via gcloud CLI:

```bash
gcloud artifacts repositories create cyber-pong-repo \
    --repository-format=docker \
    --location=europe-west1 \
    --description="Docker repository for Cyber Pong application"
```

**Free Tier Note:** Artifact Registry provides 0.5 GB of free storage. The CI/CD pipeline automatically deletes old images to stay within this limit.

## Step 7: Create Cloud Run Service

Create the initial Cloud Run service that will host your application.

### Via Console:

1. Go to **Cloud Run**
2. Click **Create Service**
3. Configure:
   - **Container image URL**: Leave blank for now (will be set by CI/CD)
   - **Service name**: `cyber-pong` (or your preferred name)
   - **Region**: `europe-west1` (must match Artifact Registry region)
   - **CPU allocation**: CPU is only allocated during request processing
   - **Autoscaling**:
     - Minimum instances: 0
     - Maximum instances: 1
   - **Ingress**: Allow all traffic
   - **Authentication**: Allow unauthenticated invocations
4. Click **Container, Networking, Security** to expand advanced settings:
   - **Container port**: 8080
   - **Memory**: 512 MiB
   - **CPU**: 1
   - **Request timeout**: 300 seconds
   - **Environment variables**: Add these (get values from Supabase):
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
5. Click **Create**

### Via gcloud CLI:

```bash
# Deploy a placeholder image first (will be replaced by CI/CD)
gcloud run deploy cyber-pong \
    --image=gcr.io/cloudrun/hello \
    --region=europe-west1 \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=1 \
    --timeout=300 \
    --set-env-vars="SUPABASE_URL=your-supabase-url,SUPABASE_ANON_KEY=your-supabase-key"
```

**Free Tier Note:** Cloud Run provides:
- 2 million requests per month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

With the configuration above (512 MiB, 1 CPU, scale to zero), you'll stay well within these limits for typical usage.

## Step 8: Verify Your Setup

Confirm all resources are created correctly:

### Check Service Account:
```bash
gcloud iam service-accounts list | grep github-actions-deployer
```

### Check Artifact Registry:
```bash
gcloud artifacts repositories list --location=europe-west1
```

### Check Cloud Run Service:
```bash
gcloud run services list --region=europe-west1
```

## Step 9: Gather Information for GitHub Secrets

You'll need these values to configure GitHub Secrets (see GitHub Secrets Configuration Guide):

1. **GCP_PROJECT_ID**: Your GCP project ID
   ```bash
   gcloud config get-value project
   ```

2. **GCP_SERVICE_ACCOUNT_KEY**: Base64-encoded service account key
   ```bash
   # On Linux/Mac:
   base64 -i ~/github-actions-key.json
   
   # On Windows (PowerShell):
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("github-actions-key.json"))
   ```

3. **GCP_REGION**: `europe-west1` (or your chosen region)

4. **GCP_SERVICE_NAME**: `cyber-pong` (or your chosen service name)

5. **SUPABASE_URL**: Your Supabase project URL

6. **SUPABASE_ANON_KEY**: Your Supabase anonymous key

## Troubleshooting

### Permission Denied Errors

If GitHub Actions fails with permission errors:

1. Verify the service account has all three required roles
2. Check that the APIs are enabled
3. Ensure the service account key is valid and not expired

### Artifact Registry Access Issues

If image push fails:

1. Verify Artifact Registry API is enabled
2. Check that the repository exists in the correct region
3. Confirm the service account has `artifactregistry.writer` role

### Cloud Run Deployment Failures

If deployment fails:

1. Verify Cloud Run API is enabled
2. Check that the service exists in the correct region
3. Confirm the service account has `run.admin` and `iam.serviceAccountUser` roles
4. Verify the container image exists in Artifact Registry

### Free Tier Exceeded

Monitor your usage:

1. Go to **Billing > Reports** in GCP Console
2. Filter by service (Artifact Registry, Cloud Run)
3. Check storage usage in Artifact Registry (should be < 0.5 GB)
4. Verify Cloud Run stays within request/compute limits

## Next Steps

After completing this setup:

1. Configure GitHub Secrets (see `docs/GITHUB_SECRETS.md`)
2. Push to the main branch to trigger your first deployment
3. Monitor the GitHub Actions workflow execution
4. Verify the application is accessible at the Cloud Run URL

## Security Best Practices

- **Rotate service account keys** periodically (every 90 days recommended)
- **Use least privilege** - only grant necessary permissions
- **Monitor access logs** in GCP Console under IAM & Admin > Audit Logs
- **Enable Cloud Audit Logs** for tracking service account usage
- **Delete unused keys** from the Service Accounts page
- **Never commit** service account keys to version control

## Cost Management

To ensure you stay within free tier:

- **Monitor storage**: Check Artifact Registry storage regularly
- **Review Cloud Run metrics**: Monitor request count and compute usage
- **Set up billing alerts**: Configure alerts at 50%, 75%, and 90% of free tier limits
- **Clean up old revisions**: The pipeline automatically deletes old images
- **Scale to zero**: Ensure min-instances is set to 0

## Additional Resources

- [GCP Free Tier Documentation](https://cloud.google.com/free)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
