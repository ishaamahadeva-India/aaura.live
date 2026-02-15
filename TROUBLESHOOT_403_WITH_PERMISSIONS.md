# 🔍 Troubleshooting 403 Errors (Permissions Already Assigned)

Since **Storage Object Admin** is already assigned but you're still getting 403 errors, let's check other potential causes:

## Checklist

### 1. ✅ Verify FIREBASE_SERVICE_ACCOUNT_KEY is Set in Production

**The most common issue:** The environment variable might not be set in your production environment (Vercel/Firebase App Hosting/etc).

**Check:**
- Go to your hosting platform's environment variables settings
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is set
- The value should be the **entire JSON as a single-line string**

**How to verify:**
1. Check your hosting platform's dashboard:
   - **Vercel**: Settings → Environment Variables
   - **Firebase App Hosting**: Environment Variables section
   - **Other**: Check your platform's env var settings

2. The value should look like:
   ```
   {"type":"service_account","project_id":"studio-9632556640-bd58d",...}
   ```

3. **Important:** It must be a **single line** (no line breaks)

**Fix if missing:**
- Copy the JSON from `FIREBASE_ADMIN_KEY.json`
- Convert to single line: `cat FIREBASE_ADMIN_KEY.json | jq -c .`
- Paste into production environment variables

---

### 2. ✅ Verify Service Account Email Matches

**Check:** The service account in your key file matches the one with permissions.

**From your key file:**
- Service account: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`

**Verify in Google Cloud Console:**
1. Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. Click **Permissions** tab
3. Look for: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
4. Verify it has **Storage Object Admin** role

**If different:**
- Either grant permissions to the correct service account
- Or use the service account key that matches the one with permissions

---

### 3. ✅ Check Permission Propagation

**IAM changes can take 1-5 minutes to propagate.**

**If you just granted permissions:**
- Wait 2-5 minutes
- Try uploading again
- Clear browser cache if needed

**Verify permissions are active:**
```bash
# If you have gcloud CLI
gsutil iam get gs://aaura-original-uploads | grep firebase-adminsdk-fbsvc
```

---

### 4. ✅ Verify Bucket Exists and Name is Correct

**Check bucket exists:**
1. Go to: https://console.cloud.google.com/storage/browser?project=studio-9632556640-bd58d
2. Look for: `aaura-original-uploads`
3. Verify it exists and is accessible

**Check bucket name in code:**
- File: `src/app/api/upload/signed-url/route.ts`
- Line 32: `bucket = storage.bucket('aaura-original-uploads');`
- Verify this matches the actual bucket name exactly

---

### 5. ✅ Check Server Logs for Detailed Errors

**The API endpoint logs detailed errors.** Check your production logs:

**For Vercel:**
- Go to: Vercel Dashboard → Your Project → Logs
- Look for errors from `/api/upload/signed-url`

**For Firebase App Hosting:**
- Check Firebase Console → App Hosting → Logs

**Look for:**
- `Error generating signed URLs`
- `Permission denied`
- `Bucket not found`
- `FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set`

---

### 6. ✅ Verify Service Account Key Format

**The JSON must be valid and properly formatted.**

**Test locally:**
```bash
# Check if the key file is valid JSON
cat FIREBASE_ADMIN_KEY.json | jq . > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"

# Check service account email
cat FIREBASE_ADMIN_KEY.json | jq -r .client_email
# Should output: firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
```

**Common issues:**
- Extra quotes or escaping in environment variable
- Line breaks in the JSON (must be single line)
- Missing fields in the JSON

---

### 7. ✅ Check Organization Policies

**If your project is in an organization, there might be policies blocking access.**

**Check:**
1. Go to: https://console.cloud.google.com/iam-admin/org-policies?project=studio-9632556640-bd58d
2. Look for policies that might restrict:
   - Storage access
   - Service account usage
   - IAM changes

---

### 8. ✅ Test Signed URL Generation Directly

**Create a test endpoint to verify the service account can generate signed URLs:**

Add this to `src/app/api/test-signed-url/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase/admin';

export async function GET() {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json({ 
        error: 'FIREBASE_SERVICE_ACCOUNT_KEY not set' 
      }, { status: 500 });
    }

    if (!storage) {
      return NextResponse.json({ 
        error: 'Storage not initialized' 
      }, { status: 500 });
    }

    const bucket = storage.bucket('aaura-original-uploads');
    const [exists] = await bucket.exists();
    
    if (!exists) {
      return NextResponse.json({ 
        error: 'Bucket does not exist' 
      }, { status: 404 });
    }

    const file = bucket.file('test-file.txt');
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000,
      contentType: 'text/plain',
    });

    return NextResponse.json({ 
      success: true,
      signedUrl: url,
      bucket: bucket.name,
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'Set' : 'Not set'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
```

**Test it:**
- Deploy and visit: `https://your-domain.com/api/test-signed-url`
- Check the response for detailed error information

---

### 9. ✅ Verify Production Environment

**Check if the code is running in the correct environment:**

**In your API route, add logging:**
```typescript
console.log('Environment check:', {
  hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  nodeEnv: process.env.NODE_ENV,
  storageInitialized: !!storage,
});
```

**Check production logs** to see if the service account key is actually available.

---

## Most Likely Causes (In Order)

1. **FIREBASE_SERVICE_ACCOUNT_KEY not set in production** ⚠️ **MOST COMMON**
2. **Service account key format issue** (line breaks, escaping)
3. **Permission propagation delay** (wait 2-5 minutes)
4. **Wrong service account** (key doesn't match the one with permissions)
5. **Bucket name mismatch**

---

## Quick Diagnostic Commands

**If you have access to production logs, check for:**

```bash
# Look for these error messages:
"FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set"
"Storage not initialized"
"Permission denied"
"Bucket not found"
```

---

## Next Steps

1. **First:** Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is set in production
2. **Second:** Check production logs for detailed error messages
3. **Third:** Verify service account email matches
4. **Fourth:** Test with the diagnostic endpoint above

---

## Still Not Working?

If you've checked all of the above:

1. **Share the exact error message** from production logs
2. **Confirm** the service account email from your key file
3. **Verify** the bucket name is exactly `aaura-original-uploads`
4. **Check** if there are any organization policies blocking access

The production logs will have the most detailed error information to help diagnose the issue.

