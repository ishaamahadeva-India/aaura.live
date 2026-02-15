# ✅ Step 1 Complete! Now Do Step 2

## Step 2: Grant Bucket-Level Permissions

Follow these steps exactly:

### 1. Open the Bucket
Click this link (or copy-paste into your browser):
```
https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
```

### 2. Click on the Bucket
- You should see a bucket named: `aaura-original-uploads`
- Click on it to open it

### 3. Click "Permissions" Tab
- At the top of the page, you'll see tabs like: Overview, Objects, Permissions, etc.
- Click on **"Permissions"** tab

### 4. Click "Grant Access" Button
- You'll see a button that says **"Grant Access"** (usually at the top right)
- Click it

### 5. Enter the Service Account Email
- A popup/form will appear
- In the field labeled **"New principals"** (or "Principal"), paste exactly:
  ```
  firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
  ```

### 6. Select the Role
- Click the dropdown that says **"Select a role"**
- Start typing: `Storage Object Admin`
- Select: **"Storage Object Admin"** from the list

### 7. Click "Save"
- Click the **"Save"** button
- Wait for a success message

### 8. Verify It Worked
- After saving, you should see the service account in the permissions list
- It should show:
  - **Principal:** `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
  - **Role:** Storage Object Admin

---

## ✅ What You Should See

After completing Step 2, the Permissions tab should show:

```
┌─────────────────────────────────────────────────────────────┐
│ Principal                                                    │ Role                │
├─────────────────────────────────────────────────────────────┤
│ firebase-adminsdk-fbsvc@...iam.gserviceaccount.com        │ Storage Object Admin │ ✅
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 After Step 2

Once you see the service account in the permissions list:

1. **Wait 3-5 minutes** (for permissions to propagate)
2. **Test video upload** in your app
3. **Check if 403 errors are gone**

---

## ❓ Need Help?

If you get stuck at any point:
- Take a screenshot of what you see
- Tell me which step number you're on
- I'll help you continue

**Go ahead and do Step 2 now!**

