# ✅ Permissions Verified - Troubleshooting 403 Errors

## Good News! ✅

Your service account `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com` already has:
- ✅ **Storage Admin** (project-level)
- ✅ **Storage Object Admin** (project-level)

These permissions should be sufficient! If you're still getting 403 errors, let's check other causes.

---

## Possible Issues (In Order of Likelihood)

### 1. ⚠️ Service Account Key Mismatch

**Check:** The service account key in Vercel might be for a different service account.

**Verify:**
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Check the `FIREBASE_SERVICE_ACCOUNT_KEY` value
3. Extract the `client_email` field from the JSON
4. It should be: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`

**How to check:**
```bash
# If you have the JSON locally
cat FIREBASE_ADMIN_KEY.json | jq -r .client_email
# Should output: firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
```

**If different:** Update Vercel with the correct service account key.

---

### 2. ⚠️ Bucket-Level IAM Override

**Check:** Bucket-level IAM policies might be overriding project-level permissions.

**Verify:**
1. Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. Click **Permissions** tab
3. Check if the service account is listed at the **bucket level**
4. If not listed, grant it (even though project-level should work)

**Grant at bucket level (to be safe):**
1. Bucket → Permissions tab
2. Grant Access
3. Principal: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
4. Role: **Storage Object Admin**
5. Save

---

### 3. ⚠️ Permission Propagation Delay

**IAM changes can take 2-5 minutes to propagate.**

**If you just granted permissions:**
- Wait 5 minutes
- Try uploading again
- Clear browser cache if needed

---

### 4. ⚠️ Service Account Key Format Issue

**Check:** The JSON in Vercel might be malformed.

**Common issues:**
- Line breaks in the JSON (must be single line)
- Extra quotes or escaping
- Missing fields

**Fix:**
1. Get the service account key from Firebase Console:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. Convert to single line:
   ```bash
   cat FIREBASE_ADMIN_KEY.json | jq -c .
   ```

3. Copy the entire output (single line)
4. Paste into Vercel's `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable
5. Redeploy

---

### 5. ⚠️ Check Production Logs

**The API endpoint logs detailed errors.**

**Check Vercel logs:**
1. Go to Vercel Dashboard → Your Project → Logs
2. Look for errors from `/api/upload/signed-url`
3. Check for:
   - `FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set`
   - `Storage not initialized`
   - `Permission denied`
   - `Bucket not found`

---

### 6. ⚠️ Test with Diagnostic Endpoint

**Use the diagnostic endpoint to get detailed information:**

1. **Deploy the diagnostic endpoint** (if not already deployed):
   - File: `src/app/api/test-signed-url/route.ts`
   - Already created in your codebase

2. **Visit:** `https://your-domain.com/api/test-signed-url`

3. **Check the response:**
   - Should show `success: true` if everything works
   - Will show specific error if something is wrong

---

## Quick Diagnostic Checklist

- [ ] Service account key in Vercel matches `firebase-adminsdk-fbsvc@...`
- [ ] Service account key is valid JSON (single line)
- [ ] Bucket-level permissions granted (to be safe)
- [ ] Waited 5 minutes after granting permissions
- [ ] Checked Vercel logs for detailed errors
- [ ] Tested with `/api/test-signed-url` endpoint

---

## Most Likely Fix

**If permissions are already set at project level, the issue is likely:**

1. **Service account key mismatch** - Check the `client_email` in Vercel's env var
2. **Key format issue** - Ensure it's valid single-line JSON
3. **Bucket-level override** - Grant permissions at bucket level too

---

## Next Steps

1. **Verify service account key** in Vercel matches the one with permissions
2. **Grant bucket-level permissions** (even though project-level should work)
3. **Wait 5 minutes** for propagation
4. **Test with diagnostic endpoint**: `/api/test-signed-url`
5. **Check Vercel logs** for specific error messages

---

## Still Not Working?

If you've checked all of the above:

1. **Share the response** from `/api/test-signed-url` endpoint
2. **Share the error** from Vercel logs
3. **Confirm** the `client_email` from the service account key in Vercel

This will help identify the exact issue.

