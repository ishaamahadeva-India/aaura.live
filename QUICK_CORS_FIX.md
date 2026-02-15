# ⚡ QUICK CORS FIX - Copy & Paste

## 🎯 One-Minute Fix

### Step 1: Open Google Cloud Console
https://console.cloud.google.com/storage/browser/studio-9632556640-bd58d.appspot.com?project=studio-9632556640-bd58d

### Step 2: Click "Configuration" Tab

### Step 3: Scroll to "CORS configuration" → Click "Edit"

### Step 4: Paste This (Copy ALL):

```json
[
  {
    "origin": [
      "https://www.aaura.live",
      "https://aaura.live",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:9002",
      "http://0.0.0.0:9002",
      "http://127.0.0.1:9002"
    ],
    "method": ["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Range",
      "x-goog-resumable",
      "x-goog-content-length-range"
    ]
  }
]
```

### Step 5: Click "Save"

### Step 6: Test Upload - Should Work! ✅

