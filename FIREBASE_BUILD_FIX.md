# Firebase App Hosting Build Fix

## Problem
Firebase App Hosting build fails with error:
```
npm ci can only install packages when your package.json and package-lock.json are in sync.
Missing: framer-motion@11.18.2 from lock file
Missing: next-themes@0.4.6 from lock file
Missing: motion-dom@11.18.1 from lock file
Missing: motion-utils@11.18.1 from lock file
```

## Solution
The `package-lock.json` file is out of sync with `package.json`. Firebase App Hosting uses `npm ci` which requires exact sync, while Vercel uses `npm install` which is more forgiving.

## Steps to Fix

1. **Regenerate package-lock.json** (run this locally or in CI):
   ```bash
   rm package-lock.json
   npm install
   ```

2. **Commit the updated lock file**:
   ```bash
   git add package-lock.json
   git commit -m "Sync package-lock.json with package.json for Firebase builds"
   git push
   ```

3. **Verify the lock file is committed**:
   ```bash
   git ls-files | grep package-lock.json
   ```

## Why This Happens

- **Vercel** uses `npm install` which automatically updates the lock file
- **Firebase App Hosting** uses `npm ci` which requires an exact match
- If dependencies are updated without regenerating the lock file, they get out of sync

## Best Practices

1. Always commit `package-lock.json` to version control
2. Run `npm install` (not `npm ci`) when updating dependencies locally
3. Use `npm ci` in CI/CD pipelines after ensuring lock file is synced
4. Regenerate lock file whenever `package.json` changes

## Alternative: Use npm install in Firebase

If you want Firebase to also use `npm install` instead of `npm ci`, you would need to configure it in `apphosting.yaml`, but this is not recommended as `npm ci` is more reliable for production builds.

