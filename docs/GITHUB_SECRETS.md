# GitHub Secrets Configuration Guide

This guide explains how to configure GitHub Secrets for the CI/CD pipeline that automatically deploys Cyber Pong to Google Cloud Run.

## Prerequisites

Before configuring GitHub Secrets, you must:

1. Complete the [GCP Setup Guide](./GCP_SETUP.md)
2. Have the service account JSON key file downloaded
3. Have admin access to your GitHub repository

## Required Secrets

The CI/CD pipeline requires six secrets to be configured in your GitHub repository:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `GCP_PROJECT_ID` | Your GCP project ID | `cyber-pong-12345` |
| `GCP_SERVICE_ACCOUNT_KEY` | Base64-encoded service account JSON key | `ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsC...` |
| `GCP_REGION` | GCP region for deployment | `europe-west1` |
| `GCP_SERVICE_NAME` | Cloud Run service name | `cyber-pong` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Step 1: Prepare the Service Account Key

The service account key must be base64-encoded before adding it to GitHub Secrets.

### On Linux/Mac:

```bash
base64 -i ~/github-actions-key.json
```

This will output a long string of characters. Copy the entire output.

### On Windows (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("github-actions-key.json"))
```

Copy the entire output string.

### On Windows (Command Prompt):

```cmd
certutil -encode github-actions-key.json github-actions-key.txt
```

Open `github-actions-key.txt` and copy the content between the `BEGIN CERTIFICATE` and `END CERTIFICATE` lines (excluding those lines).

**Important:** The base64-encoded string will be very long (several thousand characters). Make sure you copy the entire string without any line breaks or extra spaces.

## Step 2: Add Secrets to GitHub Repository

### Via GitHub Web Interface:

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables > Actions**
4. Click **New repository secret**
5. Add each secret one by one:

#### Secret 1: GCP_PROJECT_ID

- **Name**: `GCP_PROJECT_ID`
- **Value**: Your GCP project ID (e.g., `cyber-pong-12345`)
- Click **Add secret**

#### Secret 2: GCP_SERVICE_ACCOUNT_KEY

- **Name**: `GCP_SERVICE_ACCOUNT_KEY`
- **Value**: The base64-encoded service account key from Step 1
- Click **Add secret**

**Note:** This is the most critical secret. Double-check that you copied the entire base64 string.

#### Secret 3: GCP_REGION

- **Name**: `GCP_REGION`
- **Value**: Your GCP region (e.g., `europe-west1`)
- Click **Add secret**

**Note:** This must match the region where you created your Artifact Registry repository and Cloud Run service.

#### Secret 4: GCP_SERVICE_NAME

- **Name**: `GCP_SERVICE_NAME`
- **Value**: Your Cloud Run service name (e.g., `cyber-pong`)
- Click **Add secret**

#### Secret 5: SUPABASE_URL

- **Name**: `SUPABASE_URL`
- **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- Click **Add secret**

You can find this in your Supabase project settings under **API > Project URL**.

#### Secret 6: SUPABASE_ANON_KEY

- **Name**: `SUPABASE_ANON_KEY`
- **Value**: Your Supabase anonymous key
- Click **Add secret**

You can find this in your Supabase project settings under **API > Project API keys > anon public**.

### Via GitHub CLI:

If you have the GitHub CLI installed, you can add secrets from the command line:

```bash
# Set your repository (format: owner/repo)
REPO="your-username/cyber-pong"

# Add GCP_PROJECT_ID
gh secret set GCP_PROJECT_ID --body "your-project-id" --repo $REPO

# Add GCP_SERVICE_ACCOUNT_KEY (base64-encoded)
gh secret set GCP_SERVICE_ACCOUNT_KEY --body "$(base64 -i ~/github-actions-key.json)" --repo $REPO

# Add GCP_REGION
gh secret set GCP_REGION --body "europe-west1" --repo $REPO

# Add GCP_SERVICE_NAME
gh secret set GCP_SERVICE_NAME --body "cyber-pong" --repo $REPO

# Add SUPABASE_URL
gh secret set SUPABASE_URL --body "https://xxxxx.supabase.co" --repo $REPO

# Add SUPABASE_ANON_KEY
gh secret set SUPABASE_ANON_KEY --body "your-supabase-anon-key" --repo $REPO
```

## Step 3: Verify Secrets Are Configured

After adding all secrets:

1. Go to **Settings > Secrets and variables > Actions**
2. You should see all six secrets listed:
   - `GCP_PROJECT_ID`
   - `GCP_SERVICE_ACCOUNT_KEY`
   - `GCP_REGION`
   - `GCP_SERVICE_NAME`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

**Note:** GitHub does not show secret values after they're added. You can only update or delete them.

## Step 4: Test the Configuration

To verify your secrets are configured correctly:

1. Push a commit to the `main` branch (or trigger a manual workflow dispatch)
2. Go to **Actions** tab in your GitHub repository
3. Click on the running workflow
4. Monitor the workflow execution:
   - The **Authenticate to Google Cloud** step should succeed
   - The **Build and push** step should succeed
   - The **Deploy to Cloud Run** step should succeed

If any step fails, check the error message and verify the corresponding secret is correct.

## Common Issues and Solutions

### Authentication Failure

**Error:** `Error: google-github-actions/auth failed with: retry function failed after 3 attempts`

**Solution:**
- Verify `GCP_SERVICE_ACCOUNT_KEY` is correctly base64-encoded
- Ensure you copied the entire base64 string without line breaks
- Check that the service account key is valid and not expired
- Re-encode and re-add the secret if necessary

### Invalid Project ID

**Error:** `ERROR: (gcloud.artifacts.docker.images.list) NOT_FOUND: Project 'xxxxx' not found`

**Solution:**
- Verify `GCP_PROJECT_ID` matches your actual GCP project ID
- Check for typos or extra spaces
- Confirm the project exists in GCP Console

### Region Mismatch

**Error:** `ERROR: (gcloud.run.deploy) NOT_FOUND: Service [xxxxx] could not be found`

**Solution:**
- Verify `GCP_REGION` matches where you created your Cloud Run service
- Check that the region is spelled correctly (e.g., `europe-west1`, not `europe-west-1`)
- Ensure the Artifact Registry repository is in the same region

### Service Not Found

**Error:** `ERROR: (gcloud.run.deploy) NOT_FOUND: Requested entity was not found`

**Solution:**
- Verify `GCP_SERVICE_NAME` matches your Cloud Run service name exactly
- Check for typos or case sensitivity issues
- Confirm the service exists in GCP Console

### Missing Environment Variables

**Error:** Application fails to start or connect to Supabase

**Solution:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that you copied the full Supabase anonymous key
- Confirm the Supabase project is active and accessible

## Security Best Practices

### Protecting Your Secrets

- **Never commit secrets** to your repository (even in private repos)
- **Use repository secrets** for single-repo access
- **Use organization secrets** if deploying multiple repos to the same GCP project
- **Use environment secrets** for different deployment environments (staging, production)

### Rotating Secrets

Rotate your secrets periodically for security:

1. **Service Account Key** (every 90 days recommended):
   - Create a new key in GCP Console
   - Base64-encode the new key
   - Update `GCP_SERVICE_ACCOUNT_KEY` in GitHub
   - Delete the old key from GCP Console

2. **Supabase Keys** (if compromised):
   - Generate new keys in Supabase Dashboard
   - Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in GitHub
   - Revoke old keys if necessary

### Monitoring Secret Usage

- **Review workflow logs** regularly for unauthorized access attempts
- **Enable audit logging** in GCP to track service account usage
- **Set up alerts** for unusual activity
- **Limit repository access** to trusted collaborators only

### Revoking Access

If a secret is compromised:

1. **Immediately delete the secret** from GitHub
2. **Revoke the service account key** in GCP Console
3. **Create a new service account key** and add it to GitHub
4. **Review audit logs** to check for unauthorized access
5. **Rotate all other secrets** as a precaution

## Updating Secrets

To update an existing secret:

1. Go to **Settings > Secrets and variables > Actions**
2. Click on the secret name
3. Click **Update secret**
4. Enter the new value
5. Click **Update secret**

**Note:** Updating a secret does not trigger a new workflow run. You'll need to push a new commit or manually trigger the workflow.

## Deleting Secrets

To delete a secret:

1. Go to **Settings > Secrets and variables > Actions**
2. Click on the secret name
3. Click **Delete secret**
4. Confirm the deletion

**Warning:** Deleting a required secret will cause the CI/CD pipeline to fail.

## Environment-Specific Secrets

If you want to deploy to multiple environments (e.g., staging and production):

1. Create separate Cloud Run services for each environment
2. Use **Environment secrets** instead of repository secrets:
   - Go to **Settings > Environments**
   - Create environments (e.g., `staging`, `production`)
   - Add secrets to each environment
3. Modify the workflow to use environment-specific secrets:
   ```yaml
   jobs:
     deploy:
       environment: production  # or staging
       steps:
         # Secrets will be loaded from the specified environment
   ```

## Next Steps

After configuring GitHub Secrets:

1. Push a commit to the `main` branch to trigger the first deployment
2. Monitor the workflow execution in the **Actions** tab
3. Verify the application is deployed and accessible
4. Review the [Usage and Troubleshooting Guide](./USAGE.md) for ongoing operations

## Additional Resources

- [GitHub Encrypted Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [GCP Service Account Key Management](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Supabase API Settings](https://supabase.com/docs/guides/api)
