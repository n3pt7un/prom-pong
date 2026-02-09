# Cyber-Pong Arcade League - Deployment Guide

## 1. Local Development (Single Machine)
Runs with local file storage. Perfect for testing or single-laptop usage.

1.  **Install**: `npm install`
2.  **Run**: `npm run dev`
3.  **Access**: `http://localhost:5173`

---

## 2. Cloud Deployment (Google Cloud Free Tier)

This setup uses **Cloud Run** (compute) and **Cloud Storage** (database) to host the app for free with data persistence.

### Prerequisites
*   Google Cloud Account
*   Google Cloud CLI (`gcloud`) installed

### Step 1: Create a Storage Bucket
This bucket will store your `db.json` file so it survives container restarts.

```bash
# Create a unique bucket name (e.g., cyberpong-yourname-db)
export BUCKET_NAME="cyberpong-data-$(date +%s)"

# Create the bucket (Standard class is free up to 5GB)
gcloud storage buckets create gs://$BUCKET_NAME --location=us-central1
```

### Step 2: Deploy to Cloud Run
This command builds the container, deploys it, and connects it to your bucket.

```bash
gcloud run deploy cyberpong \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCS_BUCKET=$BUCKET_NAME \
  --port 8080
```

### Step 3: Grant Permissions
The Cloud Run service needs permission to read/write to your bucket.

1.  Get the **Service Account** email from the deploy output (or find it in Cloud Console > Cloud Run > cyberpong > Details). It looks like: `[number]-compute@developer.gserviceaccount.com`.
2.  Grant the **Storage Object Admin** role:

```bash
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.objectAdmin"
```

*(Replace `YOUR_SERVICE_ACCOUNT_EMAIL` with the actual email found in step 1)*

### Done!
Click the URL provided by Cloud Run. Your data is now persistent in the cloud!

---

## 3. Maintenance

**Backups**:
Since your database is just a JSON file in a storage bucket, you can download a backup anytime via the Google Cloud Console or CLI:
`gcloud storage cp gs://$BUCKET_NAME/db.json ./backup.json`

**Resetting**:
To wipe the database completely, just delete the `db.json` file from the bucket. The app will regenerate a fresh one on next restart.
