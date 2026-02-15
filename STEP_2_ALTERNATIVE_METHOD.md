# ✅ Step 2 Alternative: Grant Project-Level Permissions

Since you can't access the bucket permissions directly, we'll grant permissions at the **project level** instead. This works the same way!

## Step 2: Grant Project-Level Permissions

### 1. Open IAM & Admin
Click this link (or copy-paste into your browser):
```
https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d
```

### 2. Click "Grant Access" Button
- At the top of the page, you'll see a button: **"Grant Access"**
- Click it

### 3. Enter the Service Account Email
- A popup/form will appear
- In the field labeled **"New principals"**, paste exactly:
  ```
  firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
  ```

### 4. Select the Role
- Click the dropdown that says **"Select a role"**
- Start typing: `Storage Object Admin`
- Select: **"Storage Object Admin"** from the list

### 5. Click "Save"
- Click the **"Save"** button
- Wait for a success message

### 6. Verify It Worked
- After saving, scroll down in the IAM list
- Look for: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
- It should show: **Storage Object Admin** role

---

## ✅ What You Should See

After completing Step 2, the IAM page should show:

```
┌─────────────────────────────────────────────────────────────┐
│ Principal                                                    │ Role                │
├─────────────────────────────────────────────────────────────┤
│ firebase-adminsdk-fbsvc@...iam.gserviceaccount.com        │ Storage Object Admin │ ✅
└─────────────────────────────────────────────────────────────┘
```

**Note:** If you already see it listed with Storage Object Admin, that's perfect! It means permissions are already granted.

---

## 🎯 After Step 2

Once you see the service account with Storage Object Admin role:

1. **Wait 3-5 minutes** (for permissions to propagate)
2. **Test video upload** in your app
3. **Check if 403 errors are gone**

---

## ❓ If You Still Can't Access

If you still get permission errors when trying to grant access:

1. **Check if the service account is already listed:**
   - Scroll through the IAM list
   - Look for: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
   - If it's already there with **Storage Object Admin**, you're done! Skip to testing.

2. **If you can't grant access:**
   - Ask someone with **Owner** role to grant it
   - Or share a screenshot of what you see

---

**Go ahead and try Step 2 using the project-level method above!**

