# Firebase errors – what they mean and how to fix them

## 1. `FirebaseError: Missing or insufficient permissions` (Firestore)

**What it is:** The Firestore client got a "permission-denied" response (or something that looks like it).

**Often caused by:**

- **CORS / origin, not rules:** If you also see **"Cross-Origin Request Blocked … firestore.googleapis.com … (Reason: CORS request did not succeed). Status code: (null)"**, the browser blocked the request before Firestore could respond. In that case the SDK can surface it as "Missing or insufficient permissions" even though the real problem is **origin/network**, not security rules.
- **Wrong origin:** App opened from `file://`, or from a host/port not in Firebase **Authorized domains** (e.g. `http://localhost:3000` vs `http://127.0.0.1:3000`, or a custom domain not added).
- **Actual rules:** Firestore rules deny the operation (e.g. read/write on a collection that requires auth or ownership).

**What to do:**

1. **Run the app from a proper URL**  
   Use `http://localhost:3000` (or your deployed URL), not `file:///...`.

2. **Add your origin in Firebase**  
   Firebase Console → Project settings → **Your apps** → **Authorized domains** → add:
   - `localhost` (for dev),
   - your production domain (e.g. `aaura.live`).

3. **Disable blockers for Firestore (when testing)**  
   Try with ad blockers / privacy extensions disabled; they can block `firestore.googleapis.com`.

4. **If it’s really rules:**  
   Deploy your `firestore.rules` from the repo and test in the Rules Playground. Ensure the collection/path and auth state match what the app uses.

---

## 2. Cross-Origin Request Blocked (Firestore Listen channel)

**What it is:** The browser blocks the long‑polling request to  
`https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?...`  
with **"CORS request did not succeed"** and **Status code: (null)**.

**Meaning:** The request never reached the server (or never got a valid response). So this is **not** a Firestore security rules error; it’s **origin/network/CORS**.

**Causes:**

- App opened from `file://`.
- Domain not in Firebase **Authorized domains**.
- Ad blocker / privacy extension blocking `firestore.googleapis.com`.
- Corporate proxy/firewall blocking or altering the request.
- Mixed content (e.g. HTTPS page loading something over HTTP) – less common for Firestore.

**What to do:** Same as in section 1: use a proper origin, add it to Authorized domains, and temporarily disable extensions that might block Firestore.

---

## 3. Storage `412 Precondition Failed` (resumable upload)

**What it is:** A **resumable upload** to Firebase Storage (e.g. `uploadBytesResumable`) got an HTTP **412** from  
`firebasestorage.googleapis.com/.../o?name=...&upload_id=...&upload_protocol=resumable`.

**Meaning:** The upload session (the `upload_id`) is no longer valid: e.g. session expired, already finalized, or the client is reusing an old session. The server is saying “precondition failed” for that session.

**Causes:**

- Retrying or resuming with an old/invalid `upload_id`.
- Duplicate submit or double-click starting a second upload while the first is still in progress.
- Network blip so the client thinks the upload failed and retries with the same session.
- Very long idle so the session expires.

**What to do (in app):**

- Use a **new path** (e.g. new UUID in the object name) for each new upload and avoid reusing the same resumable session.
- On **412** (or Storage error that wraps 412), **retry once** with a **brand new path** and a new `uploadBytesResumable` call (no reuse of the previous `upload_id`).
- Prevent duplicate submissions (e.g. disable button, single “upload in progress” guard).

---

## Summary

| Symptom | Likely cause | Action |
|--------|----------------|--------|
| Many “Missing or insufficient permissions” | CORS / wrong origin / blocked request | Use correct URL, add domain in Firebase, check extensions |
| CORS “request did not succeed” for Firestore Listen | Same as above | Same as above |
| Storage 412 on resumable upload | Invalid/expired upload session | New path + new upload; retry once; prevent duplicate uploads |

The app now:

- Catches Firestore permission rejections early (inline script + `FirebaseErrorListener`) so they don’t appear as “Uncaught (in promise)” and shows a single toast.
- Can retry once on Storage 412 with a new path in the upload flows.
