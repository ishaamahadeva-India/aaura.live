# 📋 Cloud Shell - Exact Steps

## Step-by-Step Instructions

### Step 1: Open Cloud Shell

1. **Go to:** https://console.cloud.google.com/
2. **Click the Cloud Shell icon** (top right, looks like `>_` or a terminal icon)
3. **Wait 30-60 seconds** for it to open at the bottom of the page

---

### Step 2: Copy the Commands

**Copy ALL of this** (from `cat >` to `EOF`):

```bash
cat > /tmp/cors.json << 'EOF'
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
EOF
```

---

### Step 3: Paste and Press Enter

1. **Click inside the Cloud Shell terminal** (the black box at the bottom)
2. **Paste** the commands (Ctrl+V or right-click → Paste)
3. **Press Enter** (this creates the file)
4. **Wait** for the prompt to return (you'll see `$` or `>` again)

---

### Step 4: Apply CORS

**Copy this command:**
```bash
gsutil cors set /tmp/cors.json gs://aaura-original-uploads
```

1. **Paste it** in Cloud Shell
2. **Press Enter**
3. **Wait** for it to complete (you'll see "Updated CORS on gs://aaura-original-uploads")

---

### Step 5: Verify (Optional)

**Copy this command:**
```bash
gsutil cors get gs://aaura-original-uploads
```

1. **Paste it** in Cloud Shell
2. **Press Enter**
3. **Check the output** - should show the CORS configuration with `localhost:9002`

---

## What You'll See

**After Step 3 (creating file):**
```
$ cat > /tmp/cors.json << 'EOF'
> [paste the JSON]
> EOF
$ 
```

**After Step 4 (applying CORS):**
```
$ gsutil cors set /tmp/cors.json gs://aaura-original-uploads
Updated CORS on gs://aaura-original-uploads
$
```

---

## Important Notes

- ✅ **Just paste and press Enter** - No need to save or close
- ✅ **Cloud Shell saves automatically** - Your commands stay in history
- ✅ **You can close the browser** - CORS is applied to the bucket (not local)
- ✅ **Wait 1-2 minutes** after applying for CORS to propagate

---

## Quick Summary

1. Open Cloud Shell
2. Paste first command block → Press Enter
3. Paste `gsutil cors set...` → Press Enter
4. Done! (Wait 1-2 minutes, then test)

---

**That's it! Just paste, press Enter, and you're done!**

