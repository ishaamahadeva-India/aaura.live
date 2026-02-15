# Instructions to Sync package-lock.json for Firebase App Hosting

## Problem
Firebase App Hosting build fails because `package-lock.json` is out of sync with `package.json`. Firebase uses `npm ci` which requires exact synchronization.

## Quick Fix (Run Locally)

**IMPORTANT:** You need to run these commands on a machine with Node.js and npm installed.

### Step 1: Regenerate package-lock.json

On your local machine (or any machine with npm):

```bash
cd /home/surya/Downloads/aaura-India/aaura

# Remove the old lock file (already done)
# rm package-lock.json

# Regenerate it by running npm install
npm install
```

This will:
- Install all dependencies
- Generate a fresh `package-lock.json` that matches your `package.json`
- Include all the missing packages (framer-motion@11.18.2, next-themes@0.4.6, etc.)

### Step 2: Verify the Lock File

Check that the lock file was generated:

```bash
ls -lh package-lock.json
```

You should see the file and it should be several hundred KB in size.

### Step 3: Commit and Push

```bash
git add package-lock.json
git commit -m "Sync package-lock.json with package.json for Firebase App Hosting compatibility"
git push origin main
```

### Step 4: Verify in Git

Make sure the lock file is tracked:

```bash
git ls-files | grep package-lock.json
```

You should see `package-lock.json` in the output.

## What Happened?

- **package.json** has: `framer-motion: ^11.0.0` and `next-themes: ^0.4.4`
- **package-lock.json** didn't have the resolved versions (11.18.2, 0.4.6, etc.)
- Firebase's `npm ci` requires the lock file to have exact versions
- Vercel's `npm install` is more forgiving and updates the lock file automatically

## Alternative: Use the Script

If you prefer, you can use the provided script:

```bash
chmod +x regenerate-lockfile.sh
./regenerate-lockfile.sh
```

## After Fixing

Once you commit the new `package-lock.json`, both platforms should work:
- ✅ **Vercel**: Will continue to work (uses `npm install`)
- ✅ **Firebase App Hosting**: Will now work (uses `npm ci` with synced lock file)

## Preventing Future Issues

1. **Always commit `package-lock.json`** - Never add it to `.gitignore`
2. **When updating dependencies**: Run `npm install` (not `npm ci`) locally first
3. **After any `package.json` change**: Regenerate lock file and commit it

## Note

The old `package-lock.json` has been deleted. You **must** regenerate it before your next build. The build will fail until you regenerate and commit the lock file.

