# 🚨 CRITICAL: Clear Browser Cache NOW

## The Problem

Your network request is **STILL** using the old bucket:
```
/v0/b/studio-9632556640-bd58d.firebasestorage.app/o
```

This means **Firebase SDK cached the old bucket endpoint** in your browser.

## ✅ Solution: Clear Browser Cache

### Method 1: DevTools (Recommended)

1. **Open DevTools** (F12 or Right-click → Inspect)
2. **Go to Application tab**
3. **Click "Clear storage"** in left sidebar
4. **Check ALL boxes**:
   - ✅ Local and session storage
   - ✅ IndexedDB
   - ✅ Cache storage
   - ✅ Cookies
5. **Click "Clear site data"**
6. **Close DevTools**
7. **Hard reload**: Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

### Method 2: Incognito/Private Window (Easiest)

1. **Open browser in Incognito/Private mode**
   - Chrome: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`
   - Edge: `Ctrl + Shift + N`
2. **Go to**: https://www.aaura.live
3. **Login and test upload**
4. **Should work immediately** ✅

### Method 3: Clear All Site Data (Nuclear Option)

1. **Chrome**: Settings → Privacy → Clear browsing data → Advanced → All time → Clear data
2. **Firefox**: Settings → Privacy → Clear Data → Cookies and Site Data
3. **Hard reload**: `Ctrl + Shift + R`

## 🧪 Verify Fix

After clearing cache, check network request:

**Should see:**
```
/v0/b/studio-9632556640-bd58d.appspot.com/o
```

**Should NOT see:**
```
/v0/b/studio-9632556640-bd58d.firebasestorage.app/o
```

## ⚠️ Why This Happens

Firebase SDK **caches the bucket endpoint** in browser storage. Even though we fixed the code:
- ✅ Code is correct (`.appspot.com`)
- ❌ Browser still has old cache (`.firebasestorage.app`)
- ❌ SDK uses cached endpoint → 412 error

## ✅ After Clearing Cache

1. **Hard refresh** (Ctrl + Shift + R)
2. **Try upload**
3. **Check network tab** - should use `.appspot.com`
4. **Should work** ✅

## If Still Fails

Check if environment variable is set:
```bash
# Check for .env files
ls -la .env*

# If found, check contents:
cat .env.local | grep STORAGE_BUCKET
```

If `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is set to `.firebasestorage.app`, change it to `.appspot.com`.

