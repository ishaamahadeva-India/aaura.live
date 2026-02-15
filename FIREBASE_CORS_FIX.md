# Firebase CORS Error Fix Guide

## Problem
You're seeing CORS errors like:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://firestore.googleapis.com/...
```

## Solution

### Step 1: Add Authorized Domains in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `studio-9632556640-bd58d`
3. Click on the **⚙️ Settings** icon (top left) → **Project settings**
4. Scroll down to **"Authorized domains"** section
5. Click **"Add domain"** and add:
   - `aaura.live`
   - `www.aaura.live`
   - `*.aaura.live` (if supported)
6. Click **"Add"** for each domain
7. **Save** the changes

### Step 2: Verify Firebase Configuration

Make sure your Firebase configuration matches your domain:

- **Auth Domain**: `studio-9632556640-bd58d.firebaseapp.com`
- **Project ID**: `studio-9632556640-bd58d`

### Step 3: Check Network/Proxy Issues

If you're behind a corporate proxy or firewall:
- Ensure `firestore.googleapis.com` is not blocked
- Check if WebSocket connections are allowed (Firestore uses WebSockets)

### Step 4: Clear Browser Cache

After adding domains:
1. Clear browser cache and cookies
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Try again

### Step 5: Verify CSP Headers

The CSP headers in `next.config.js` have been updated to explicitly allow:
- `https://firestore.googleapis.com`
- `https://*.googleapis.com`
- `https://*.google.com`

After deploying, these should allow Firestore connections.

## Common Issues

### Issue: Still seeing CORS errors after adding domains
**Solution**: 
- Wait 5-10 minutes for Firebase to propagate changes
- Check if you're using the correct domain (no typos)
- Verify you're not using `localhost` in production (use your actual domain)

### Issue: Works locally but not in production
**Solution**:
- Make sure production domain is added to authorized domains
- Check if Vercel/your hosting provider is adding any additional headers
- Verify environment variables are set correctly in production

### Issue: Intermittent CORS errors
**Solution**:
- Check network stability
- Verify Firebase quota limits haven't been exceeded
- Check browser console for other errors that might be causing issues

## Testing

After making changes:
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by "firestore"
4. Check if requests are successful (Status 200) or still blocked

## Additional Resources

- [Firebase Authorized Domains Documentation](https://firebase.google.com/docs/auth/web/domain-verification)
- [Firebase CORS Configuration](https://firebase.google.com/docs/hosting/custom-domain#cors)





