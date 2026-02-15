# Installing Google Cloud SDK and Deploying CORS

## Step 1: Install Google Cloud SDK

You have a few options:

### Option A: Using Snap (Recommended - Easiest)
```bash
sudo snap install google-cloud-cli --classic
```

**Note:** The `--classic` flag is required because Google Cloud CLI needs full system access.

### Option B: Using apt (Alternative)
```bash
sudo apt install gsutil
```

### Option C: Official Installer (Most Complete)
```bash
# Download and run the official installer
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

## Step 2: Authenticate

After installation, authenticate with Google Cloud:

```bash
gcloud auth login
```

This will open a browser window for you to sign in with your Google account that has access to the Firebase project.

## Step 3: Set the Project (if needed)

```bash
gcloud config set project studio-9632556640-bd58d
```

## Step 4: Deploy CORS Configuration

Navigate to the project directory (use quotes because of parentheses in path):

```bash
cd "/home/surya/Downloads/aaura-india-main(2)/aaura-india-main"
```

Then deploy CORS:

```bash
# Option 1: Use the script
./deploy-cors.sh

# Option 2: Run directly
gsutil cors set cors.json gs://studio-9632556640-bd58d.firebasestorage.app
```

## Step 5: Verify CORS is Deployed

```bash
gsutil cors get gs://studio-9632556640-bd58d.firebasestorage.app
```

You should see the CORS configuration with:
- `origin: ["*"]`
- `method: ["GET", "HEAD"]`
- `responseHeader` including `Content-Range` and `Accept-Ranges`

## Troubleshooting

If you get permission errors:
1. Make sure you're logged in: `gcloud auth list`
2. Make sure you have Storage Admin or Owner permissions on the Firebase project
3. Try: `gcloud auth application-default login`

If `gsutil` command not found after installation:
- Close and reopen your terminal
- Or run: `source ~/.bashrc` or `source ~/.zshrc`

