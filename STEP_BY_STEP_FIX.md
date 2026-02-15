# 🎯 Step-by-Step Fix - Follow These Steps Exactly

## Step 1: Verify Service Account Key in Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com
   - Login to your account
   - Click on your project

2. **Go to Settings:**
   - Click **Settings** tab
   - Click **Environment Variables** in the left menu

3. **Find FIREBASE_SERVICE_ACCOUNT_KEY:**
   - Look for the variable named: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Click on it to view/edit

4. **Check the email in the JSON:**
   - The JSON should contain a field called `"client_email"`
   - It should say: `"firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com"`
   
   **If it's different, we need to fix it. Continue to Step 2.**
   
   **If it matches, skip to Step 3.**

---

## Step 2: Get the Correct Service Account Key (Only if Step 1 showed wrong email)

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/project/studio-9632556640-bd58d/settings/serviceaccounts/adminsdk

2. **Generate New Key:**
   - Click **"Generate New Private Key"** button
   - Click **"Generate Key"** in the popup
   - A JSON file will download

3. **Convert to Single Line:**
   - Open the downloaded JSON file
   - Copy ALL the content
   - Go to: https://jsonformatter.org/json-minify
   - Paste the JSON
   - Click **"Minify"**
   - Copy the result (it will be one long line)

4. **Update in Vercel:**
   - Go back to Vercel → Settings → Environment Variables
   - Click on `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Paste the single-line JSON
   - Click **Save**
   - **Redeploy your application**

---

## Step 3: Grant Bucket-Level Permissions

1. **Open Google Cloud Console:**
   - Visit: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
   - If it asks you to select a project, select: `studio-9632556640-bd58d`

2. **Click on the Bucket:**
   - You should see a bucket named: `aaura-original-uploads`
   - Click on it

3. **Open Permissions Tab:**
   - At the top of the page, click **"Permissions"** tab

4. **Grant Access:**
   - Click the **"Grant Access"** button (usually at the top right)
   
5. **Enter Service Account:**
   - In the **"New principals"** field, type exactly:
     ```
     firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
     ```

6. **Select Role:**
   - Click the **"Select a role"** dropdown
   - Type: `Storage Object Admin`
   - Select: **"Storage Object Admin"**

7. **Save:**
   - Click **"Save"** button
   - Wait for the success message

8. **Verify:**
   - In the Permissions list, you should now see:
     - `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
     - With role: **Storage Object Admin**

---

## Step 4: Wait and Test

1. **Wait 3-5 minutes:**
   - IAM permissions need time to propagate
   - Don't test immediately

2. **Test Video Upload:**
   - Go to your application
   - Try uploading a video
   - Check if it works

3. **Check for Errors:**
   - Open browser console (F12)
   - Look for any 403 errors
   - If you see errors, note them down

---

## Step 5: If Still Not Working - Check Logs

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com
   - Click on your project

2. **Open Logs:**
   - Click **"Logs"** tab at the top
   - Look for errors related to `/api/upload/signed-url`

3. **Look for these messages:**
   - `FIREBASE_SERVICE_ACCOUNT_KEY not set`
   - `Permission denied`
   - `Bucket not found`
   - `Storage not initialized`

4. **Share the error message** if you see one

---

## ✅ Summary Checklist

After completing all steps, verify:

- [ ] Service account key in Vercel has correct email: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
- [ ] Bucket permissions show the service account with **Storage Object Admin** role
- [ ] Waited 3-5 minutes after granting permissions
- [ ] Tested video upload
- [ ] Checked browser console for errors

---

## 🆘 If You Get Stuck

At any step, if you're not sure:
1. **Stop and read the step again carefully**
2. **Take a screenshot** of what you see
3. **Note the exact error message** (if any)
4. **Ask for help** with the specific step number

---

## 🎯 What This Will Fix

After completing these steps:
- ✅ Service account will have correct permissions
- ✅ Video uploads will work
- ✅ 403 errors will be resolved
- ✅ Your application will run perfectly

**Start with Step 1 and go through each step one by one. Don't skip any steps!**

