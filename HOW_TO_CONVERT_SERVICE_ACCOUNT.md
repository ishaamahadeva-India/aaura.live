# How to Convert Firebase Service Account JSON to Single Line

## Method 1: Using jq (Recommended - Cleanest Output)

```bash
cat FIREBASE_ADMIN_KEY.json | jq -c .
```

**Output:** Clean single-line JSON (no escaping needed)

---

## Method 2: Using tr (No jq Required)

```bash
cat FIREBASE_ADMIN_KEY.json | tr -d '\n'
```

**Output:** Single-line JSON (works on any system)

---

## Method 3: Using the Script

```bash
./convert-service-account.sh FIREBASE_ADMIN_KEY.json
```

---

## Method 4: Manual (Online Tools)

1. Go to https://jsonformatter.org/json-minify
2. Paste your JSON file content
3. Click "Minify"
4. Copy the result

---

## Method 5: Using Node.js

```bash
node -e "console.log(JSON.stringify(require('./FIREBASE_ADMIN_KEY.json')))"
```

---

## ✅ Your Single-Line JSON (Ready to Use)

Copy this entire line and paste it as the value for `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel:

```
REDACTED - Get from Firebase Console → Project Settings → Service Accounts → Generate New Private Key. Paste as single-line JSON in Vercel env FIREBASE_SERVICE_ACCOUNT_KEY.
```

---

## 📝 Steps to Add to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Click **Add New**
3. Set:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the single-line JSON above
   - **Environment:** Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your project (or wait for auto-deploy)

---

## ⚠️ Important Notes

- The single-line JSON must be **exactly as shown** (no extra spaces or line breaks)
- Make sure to select **all environments** (Production, Preview, Development)
- After adding, you **must redeploy** for changes to take effect
- This is a **sensitive credential** - never commit it to git or share it publicly

