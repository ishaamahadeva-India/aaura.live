#!/bin/bash

# Script to deploy CORS configuration to Firebase Storage
# This enables HTTP range requests for video streaming

echo "Deploying CORS configuration to Firebase Storage..."
echo ""
echo "Make sure you have:"
echo "1. Google Cloud SDK (gcloud) installed"
echo "2. gsutil configured with proper permissions"
echo "3. Authenticated with: gcloud auth login"
echo ""
echo "Storage bucket: studio-9632556640-bd58d.appspot.com"
echo ""

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "ERROR: gsutil is not installed or not in PATH"
    echo "Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Deploy CORS configuration to the correct bucket
BUCKET="studio-9632556640-bd58d.appspot.com"
echo "Applying CORS configuration to: gs://${BUCKET}..."
gsutil cors set cors.json gs://${BUCKET}

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration deployed successfully!"
    echo ""
    echo "To verify, run:"
    echo "  gsutil cors get gs://${BUCKET}"
    echo ""
else
    echo ""
    echo "❌ Failed to deploy CORS configuration"
    echo "Make sure you have proper permissions and are authenticated"
    exit 1
fi

