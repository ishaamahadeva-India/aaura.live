#!/bin/bash
# Grant Storage Object Admin permissions to Firebase service account on custom buckets

PROJECT_ID="studio-9632556640-bd58d"
SERVICE_ACCOUNT="firebase-adminsdk-fbsvc@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Granting permissions to service account: ${SERVICE_ACCOUNT}"
echo ""

# Grant Storage Object Admin on aaura-original-uploads
echo "Granting Storage Object Admin on aaura-original-uploads..."
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:roles/storage.objectAdmin gs://aaura-original-uploads

# Grant Storage Object Admin on aaura-processed-media
echo "Granting Storage Object Admin on aaura-processed-media..."
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:roles/storage.objectAdmin gs://aaura-processed-media

echo ""
echo "✅ Permissions granted!"
echo ""
echo "The service account can now:"
echo "  - Generate signed URLs"
echo "  - Read/write objects in both buckets"
echo "  - Manage object metadata"

