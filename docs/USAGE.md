# CI/CD Pipeline Usage and Troubleshooting Guide

This guide explains how to use the automated CI/CD pipeline for deploying Cyber Pong to Google Cloud Run, and how to troubleshoot common issues.

## Prerequisites

Before using the pipeline, ensure you have completed:

1. [GCP Setup Guide](./GCP_SETUP.md) - GCP resources configured
2. [GitHub Secrets Configuration](./GITHUB_SECRETS.md) - All secrets added to GitHub

## How the Pipeline Works

The CI/CD pipeline automatically deploys your application when you push changes to the `main` branch. Here's what happens:

1. **Trigger**: Push to `main` branch (excluding documentation changes)
2. **Build**: Creates a Docker container image with your application
3. **Push**: Uploads the image to Google Artifact Registry
4. **Cleanup**: Deletes old images to stay within free tier limits
5. **Deploy**: Updates the Cloud Run service with the new image
6. **Verify**: Outputs the deployment URL for immediate access

**Total Time**: Typically 5-10 minutes for a complete deployment.

## Triggering Deployments

### Automatic Deployment (Push to Main)

The most common way to deploy is by pushing to the `main` branch:

```bash
# Make your changes
git add .
git commit -m "Add new feature"
git push origin main
```

The pipeline will automatically trigger and deploy your changes.

### Manual Deployment (Workflow Dispatch)

You can manually trigger a deployment without pushing new code:

#### Via GitHub Web Interface:

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Select **Deploy to Google Cloud Run** workflow in the left sidebar
4. Click **Run workflow** button (top right)
5. Select the branch (usually `main`)
6. Click **Run workflow**

#### Via GitHub CLI:

```bash
gh workflow run deploy.yml --ref main
```

This is useful for:
- Re-deploying the current version
- Deploying after updating GitHub Secrets
- Testing the pipeline without code changes

### What Triggers the Pipeline

The pipeline triggers on:
- ✅ Pushes to `main` branch
- ✅ Manual workflow dispatch
- ✅ Changes to source code files

The pipeline does NOT trigger on:
- ❌ Pushes to other branches
- ❌ Changes to `*.md` files (documentation)
- ❌ Changes to `docs/**` directory
- ❌ Changes to `.vscode/**` directory
- ❌ Changes to `.kiro/**` directory

## Viewing Workflow Logs

### Via GitHub Web Interface:

1. Go to your GitHub repository
2. Click the **Actions** tab
3. You'll see a list of workflow runs
4. Click on a specific run to view details
5. Click on the **Build and Deploy** job to see step-by-step logs

### Understanding the Workflow Steps:

Each workflow run shows these steps:

1. **Checkout code** - Downloads your repository code
2. **Authenticate to Google Cloud** - Logs into GCP using service account
3. **Set up Docker Buildx** - Prepares Docker build environment
4. **Setup Node.js** - Installs Node.js with dependency caching
5. **Build and push Docker image** - Builds and uploads container image
6. **Clean up old images** - Deletes previous images from Artifact Registry
7. **Deploy to Cloud Run** - Updates the Cloud Run service
8. **Display deployment URL** - Shows the live application URL
9. **Workflow summary** - Provides execution summary

### Via GitHub CLI:

```bash
# List recent workflow runs
gh run list --workflow=deploy.yml

# View details of the latest run
gh run view

# View logs of a specific run
gh run view <run-id> --log

# Watch a running workflow in real-time
gh run watch
```

### Via gcloud CLI:

To view Cloud Run service logs after deployment:

```bash
# View recent logs
gcloud run services logs read cyber-pong --region=europe-west1

# Follow logs in real-time
gcloud run services logs tail cyber-pong --region=europe-west1

# View logs from the last hour
gcloud run services logs read cyber-pong \
  --region=europe-west1 \
  --limit=100
```

## Common Failure Scenarios and Solutions

### 1. Authentication Failure

**Symptoms:**
- ❌ "Authenticate to Google Cloud" step fails
- Error: `google-github-actions/auth failed with: retry function failed after 3 attempts`

**Causes:**
- Invalid or expired service account key
- Incorrectly encoded service account key
- Missing `GCP_SERVICE_ACCOUNT_KEY` secret

**Solutions:**

1. **Verify the secret exists:**
   - Go to **Settings > Secrets and variables > Actions**
   - Check that `GCP_SERVICE_ACCOUNT_KEY` is listed

2. **Re-encode and update the key:**
   ```bash
   # On Linux/Mac
   base64 -i ~/github-actions-key.json
   
   # Copy the output and update the secret in GitHub
   ```

3. **Create a new service account key:**
   - Go to GCP Console > IAM & Admin > Service Accounts
   - Find `github-actions-deployer`
   - Create a new key (JSON format)
   - Base64-encode and update the GitHub secret

4. **Verify service account permissions:**
   ```bash
   gcloud projects get-iam-policy YOUR_PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:github-actions-deployer@*"
   ```

### 2. Docker Build Failure

**Symptoms:**
- ❌ "Build and push Docker image" step fails
- Compilation errors in build logs
- Missing dependencies

**Causes:**
- Syntax errors in source code
- Missing or incorrect dependencies in `package.json`
- Dockerfile configuration issues
- Build context problems

**Solutions:**

1. **Test the build locally:**
   ```bash
   cd source
   docker build -t cyber-pong-test .
   ```

2. **Check for compilation errors:**
   ```bash
   cd source
   npm install
   npm run build
   ```

3. **Verify Dockerfile:**
   - Ensure `Dockerfile` exists in `./source` directory
   - Check that all paths are correct
   - Verify base image is accessible

4. **Review build logs:**
   - Look for specific error messages in the GitHub Actions logs
   - Check which command failed during the build

5. **Clear cache and retry:**
   - Sometimes cached layers cause issues
   - Delete the workflow run and push a new commit

### 3. Image Push Failure

**Symptoms:**
- ❌ "Build and push Docker image" step fails during push
- Error: `denied: Permission denied` or `NOT_FOUND`

**Causes:**
- Service account lacks `artifactregistry.writer` role
- Artifact Registry repository doesn't exist
- Region mismatch between workflow and repository

**Solutions:**

1. **Verify Artifact Registry repository exists:**
   ```bash
   gcloud artifacts repositories list --location=europe-west1
   ```

2. **Check service account permissions:**
   ```bash
   gcloud projects get-iam-policy YOUR_PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:github-actions-deployer@*" \
     --format="table(bindings.role)"
   ```
   
   Should include `roles/artifactregistry.writer`

3. **Grant missing permissions:**
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"
   ```

4. **Verify registry path in workflow:**
   - Check that `REGISTRY` and `IMAGE_NAME` environment variables are correct
   - Ensure region matches your Artifact Registry location

### 4. Cleanup Step Failure

**Symptoms:**
- ⚠️ "Clean up old images" step fails (warning, not fatal)
- Storage accumulates in Artifact Registry

**Causes:**
- Permission issues
- Network timeout
- No images to delete (first deployment)

**Impact:**
- Deployment continues successfully
- Old images remain in registry
- May approach 0.5 GB free tier limit

**Solutions:**

1. **Manual cleanup via gcloud:**
   ```bash
   # List all images
   gcloud artifacts docker images list \
     europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league
   
   # Delete specific image by digest
   gcloud artifacts docker images delete \
     europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league@sha256:xxxxx \
     --quiet
   ```

2. **Bulk cleanup (keep only latest):**
   ```bash
   # Get all digests except latest
   gcloud artifacts docker images list \
     europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league \
     --format="get(digest)" \
     --filter="NOT tags:latest" | \
   while read digest; do
     gcloud artifacts docker images delete \
       "europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league@$digest" \
       --quiet
   done
   ```

3. **Check storage usage:**
   - Go to GCP Console > Artifact Registry
   - Click on your repository
   - View storage usage (should be < 0.5 GB)

### 5. Cloud Run Deployment Failure

**Symptoms:**
- ❌ "Deploy to Cloud Run" step fails
- Error: `NOT_FOUND: Service not found` or `PERMISSION_DENIED`

**Causes:**
- Cloud Run service doesn't exist
- Service account lacks required roles
- Region mismatch
- Invalid configuration parameters
- Resource quota exceeded

**Solutions:**

1. **Verify Cloud Run service exists:**
   ```bash
   gcloud run services describe cyber-pong --region=europe-west1
   ```

2. **Check service account permissions:**
   ```bash
   gcloud projects get-iam-policy YOUR_PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:github-actions-deployer@*" \
     --format="table(bindings.role)"
   ```
   
   Should include:
   - `roles/run.admin`
   - `roles/iam.serviceAccountUser`

3. **Grant missing permissions:**
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

4. **Verify region matches:**
   - Check `GCP_REGION` secret in GitHub (should be `europe-west1`)
   - Ensure Cloud Run service is in the same region

5. **Check Cloud Run logs for application errors:**
   ```bash
   gcloud run services logs read cyber-pong --region=europe-west1 --limit=50
   ```

6. **Verify environment variables:**
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets are set
   - Check that values are correct and not expired

### 6. Application Fails to Start

**Symptoms:**
- ✅ Deployment succeeds
- ❌ Application returns 500 errors or doesn't respond
- Cloud Run shows "Container failed to start"

**Causes:**
- Application crashes on startup
- Missing or incorrect environment variables
- Port configuration mismatch
- Application doesn't listen on 0.0.0.0

**Solutions:**

1. **Check Cloud Run logs:**
   ```bash
   gcloud run services logs read cyber-pong --region=europe-west1 --limit=100
   ```

2. **Verify environment variables:**
   - Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
   - Test Supabase connection locally with the same credentials

3. **Verify port configuration:**
   - Application must listen on port 8080
   - Must bind to `0.0.0.0`, not `localhost`
   - Check your application's server configuration

4. **Test locally with same configuration:**
   ```bash
   cd source
   docker build -t cyber-pong-test .
   docker run -p 8080:8080 \
     -e SUPABASE_URL="your-url" \
     -e SUPABASE_ANON_KEY="your-key" \
     cyber-pong-test
   ```

5. **Check resource limits:**
   - Ensure 512Mi memory is sufficient
   - Monitor memory usage in Cloud Run metrics

### 7. Workflow Timeout

**Symptoms:**
- ❌ Workflow fails after 15 minutes
- Error: `The job running on runner has exceeded the maximum execution time`

**Causes:**
- Slow network connection
- Large dependencies
- Inefficient build process
- Cache not working

**Solutions:**

1. **Check build time:**
   - Review logs to see which step takes longest
   - Build should complete in 5-10 minutes normally

2. **Verify caching is working:**
   - Look for "Cache restored" messages in logs
   - Node.js dependencies should be cached
   - Docker layers should be cached

3. **Optimize dependencies:**
   ```bash
   # Remove unused dependencies
   cd source
   npm prune
   
   # Update package-lock.json
   npm install
   ```

4. **Check network issues:**
   - Retry the workflow
   - Network problems are usually temporary

5. **Increase timeout (if needed):**
   - Edit `.github/workflows/deploy.yml`
   - Change `timeout-minutes: 15` to a higher value
   - Note: This uses more GitHub Actions minutes

### 8. Secret Not Found

**Symptoms:**
- ❌ Workflow fails with empty or undefined secret value
- Error: `Input required and not supplied: credentials_json`

**Causes:**
- Secret not configured in GitHub
- Typo in secret name
- Secret configured in wrong repository

**Solutions:**

1. **Verify all secrets exist:**
   - Go to **Settings > Secrets and variables > Actions**
   - Check that all six secrets are listed:
     - `GCP_PROJECT_ID`
     - `GCP_SERVICE_ACCOUNT_KEY`
     - `GCP_REGION`
     - `GCP_SERVICE_NAME`
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

2. **Check secret names match workflow:**
   - Secret names are case-sensitive
   - Must match exactly as referenced in workflow file

3. **Re-add missing secrets:**
   - Follow the [GitHub Secrets Configuration Guide](./GITHUB_SECRETS.md)

## Verifying Free Tier Compliance

It's important to monitor your usage to ensure you stay within free tier limits.

### GitHub Actions Usage

**Free Tier Limits:**
- Public repositories: 2,000 minutes/month
- Private repositories: 500 minutes/month (with free plan)

**Check Usage:**

1. Go to your GitHub repository
2. Click **Settings > Billing and plans**
3. View **Actions** usage

**Typical Usage:**
- Each deployment: ~5-10 minutes
- Public repo: ~200-400 deployments/month
- Private repo: ~50-100 deployments/month

**Optimization Tips:**
- Avoid unnecessary deployments
- Use path filters to skip documentation changes
- Leverage caching (already configured)

### Google Cloud Platform Usage

#### Artifact Registry

**Free Tier Limit:** 0.5 GB storage

**Check Usage:**

```bash
# Via gcloud CLI
gcloud artifacts repositories describe cloud-run-source-deploy \
  --location=europe-west1 \
  --format="value(sizeBytes)"

# Via GCP Console
# Go to Artifact Registry > Repositories > cloud-run-source-deploy
# View "Storage" metric
```

**Staying Compliant:**
- Pipeline automatically deletes old images
- Only latest image is retained
- Typical image size: 50-150 MB
- Well within 0.5 GB limit

**Manual Cleanup (if needed):**
```bash
# List all images with sizes
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league \
  --format="table(image,size)"

# Delete all except latest
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league \
  --format="get(digest)" \
  --filter="NOT tags:latest" | \
while read digest; do
  gcloud artifacts docker images delete \
    "europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league@$digest" \
    --quiet
done
```

#### Cloud Run

**Free Tier Limits:**
- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds
- 1 GB network egress

**Check Usage:**

```bash
# Via gcloud CLI - view metrics
gcloud run services describe cyber-pong \
  --region=europe-west1 \
  --format="value(status.traffic)"

# Via GCP Console
# Go to Cloud Run > cyber-pong > Metrics
# View request count, memory usage, CPU usage
```

**Staying Compliant:**
- Configuration: 512Mi memory, 1 CPU
- Min instances: 0 (scales to zero when idle)
- Max instances: 1 (prevents runaway costs)
- Timeout: 300s

**Typical Usage:**
- Low traffic: Well within free tier
- Scales to zero when not in use
- No charges for idle time

**Set Up Billing Alerts:**

1. Go to **Billing > Budgets & alerts**
2. Create a budget:
   - Amount: $0.01 (to catch any charges)
   - Alert thresholds: 50%, 90%, 100%
3. Add email notifications

### Monitoring Dashboard

Create a simple monitoring routine:

**Weekly Check:**
```bash
# Check Artifact Registry storage
gcloud artifacts repositories describe cloud-run-source-deploy \
  --location=europe-west1 \
  --format="value(sizeBytes)"

# Check Cloud Run service status
gcloud run services describe cyber-pong \
  --region=europe-west1 \
  --format="value(status.url,status.conditions)"

# View recent deployments
gh run list --workflow=deploy.yml --limit=5
```

**Monthly Review:**
- GitHub Actions minutes used
- GCP billing report (should be $0.00)
- Artifact Registry storage
- Cloud Run request count

## Best Practices

### Development Workflow

1. **Work on feature branches:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   ```

2. **Test locally before merging:**
   ```bash
   cd source
   npm install
   npm run build
   docker build -t cyber-pong-test .
   docker run -p 8080:8080 cyber-pong-test
   ```

3. **Merge to main when ready:**
   ```bash
   # Via pull request (recommended)
   # Or direct merge:
   git checkout main
   git merge feature/new-feature
   git push origin main
   ```

4. **Monitor deployment:**
   - Watch the Actions tab
   - Verify deployment succeeds
   - Test the live application

### Deployment Safety

1. **Always review changes before pushing to main**
2. **Use pull requests for code review**
3. **Test builds locally first**
4. **Monitor the first few deployments closely**
5. **Keep secrets up to date**
6. **Rotate service account keys every 90 days**

### Cost Management

1. **Monitor usage weekly**
2. **Set up billing alerts**
3. **Keep min-instances at 0**
4. **Limit max-instances to 1**
5. **Clean up old images regularly**
6. **Avoid unnecessary deployments**

### Troubleshooting Workflow

When something goes wrong:

1. **Check the workflow logs** in GitHub Actions
2. **Look for diagnostic messages** in failed steps
3. **Review Cloud Run logs** if deployment succeeded but app fails
4. **Verify secrets** are configured correctly
5. **Test locally** to isolate the issue
6. **Check GCP Console** for resource status
7. **Review recent changes** that might have caused the issue

## Quick Reference Commands

### GitHub Actions

```bash
# List recent runs
gh run list --workflow=deploy.yml

# View latest run
gh run view

# Watch running workflow
gh run watch

# Trigger manual deployment
gh workflow run deploy.yml --ref main

# Cancel running workflow
gh run cancel <run-id>
```

### Cloud Run

```bash
# View service details
gcloud run services describe cyber-pong --region=europe-west1

# View logs
gcloud run services logs read cyber-pong --region=europe-west1

# List all services
gcloud run services list --region=europe-west1

# Update service configuration
gcloud run services update cyber-pong \
  --region=europe-west1 \
  --memory=512Mi

# View service URL
gcloud run services describe cyber-pong \
  --region=europe-west1 \
  --format="value(status.url)"
```

### Artifact Registry

```bash
# List images
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league

# View repository details
gcloud artifacts repositories describe cloud-run-source-deploy \
  --location=europe-west1

# Delete specific image
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/cloud-run-source-deploy/cyber-pong-arcade-league@sha256:xxxxx
```

### Service Account

```bash
# List service accounts
gcloud iam service-accounts list

# View service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-deployer@*"

# Create new key
gcloud iam service-accounts keys create ~/new-key.json \
  --iam-account=github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Getting Help

If you're still experiencing issues:

1. **Check the documentation:**
   - [GCP Setup Guide](./GCP_SETUP.md)
   - [GitHub Secrets Configuration](./GITHUB_SECRETS.md)
   - This troubleshooting guide

2. **Review official documentation:**
   - [GitHub Actions Documentation](https://docs.github.com/en/actions)
   - [Cloud Run Documentation](https://cloud.google.com/run/docs)
   - [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)

3. **Check workflow logs:**
   - Detailed error messages
   - Diagnostic information
   - Step-by-step execution

4. **Test components individually:**
   - Local Docker build
   - GCP authentication
   - Manual deployment via gcloud

5. **Verify configuration:**
   - All secrets present
   - Service account permissions
   - GCP resources exist

## Additional Resources

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Cloud Run Troubleshooting](https://cloud.google.com/run/docs/troubleshooting)
- [Artifact Registry Best Practices](https://cloud.google.com/artifact-registry/docs/best-practices)
- [GCP Free Tier Documentation](https://cloud.google.com/free)
- [Docker Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)

