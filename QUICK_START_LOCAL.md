# ⚡ Quick Start - Local Testing

## ✅ Setup Complete!

I've already created `.env.local` file for you with your Firebase service account key.

## 🚀 Start Testing Now

### Step 1: Start Development Server

Open a terminal and run:

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
npm run dev
```

**Wait for this message:**
```
▲ Next.js 15.5.7
- Local:        http://localhost:9002
```

### Step 2: Open in Browser

Open your browser and go to:
```
http://localhost:9002
```

### Step 3: Test Video Upload

1. **Login** (if required)
2. **Go to upload page** (`/upload`)
3. **Select a test video** (small file, 1-5 MB)
4. **Click upload**
5. **Open browser console** (F12 → Console tab)
6. **Check for errors:**
   - ✅ No 403 errors = Good!
   - ✅ No 412 errors = Good!
   - ❌ 403/412 errors = Issue

### Step 4: Test Diagnostic Endpoint

Open in browser:
```
http://localhost:9002/api/test-signed-url
```

Should show:
```json
{
  "success": true,
  "message": "Signed URL generation works correctly"
}
```

---

## 🎯 What to Check

- [ ] Dev server starts without errors
- [ ] Can access `http://localhost:9002`
- [ ] Can login (if required)
- [ ] Can upload a video
- [ ] No 403 errors in console
- [ ] No 412 errors in console
- [ ] Video uploads successfully
- [ ] Video plays after upload

---

## 🆘 If Something Goes Wrong

### Port Already in Use?
```bash
# Kill process on port 9002
lsof -ti:9002 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### Missing Dependencies?
```bash
npm install
```

### Service Account Key Issue?
Check `.env.local` file exists and has content:
```bash
cat .env.local
```

---

## ✅ Ready to Test!

**Run this command:**
```bash
npm run dev
```

**Then open:** `http://localhost:9002`

**Test upload and check console for errors!**

