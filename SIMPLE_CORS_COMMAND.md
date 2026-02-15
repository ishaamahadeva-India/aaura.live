# ✅ Simple CORS Command - Copy This

## Method 1: Single Command (Easiest)

**Copy this ENTIRE line and paste in Cloud Shell:**

```bash
echo '[{"origin":["https://www.aaura.live","https://aaura.live","http://localhost:3000","http://localhost:3001","http://localhost:5173","http://localhost:9002","http://0.0.0.0:9002","http://127.0.0.1:9002"],"method":["GET","HEAD","OPTIONS","POST","PUT","DELETE"],"maxAgeSeconds":3600,"responseHeader":["Content-Type","Content-Length","Content-Range","Accept-Ranges","Access-Control-Allow-Origin","Access-Control-Allow-Methods","Access-Control-Allow-Headers","Range","x-goog-resumable","x-goog-content-length-range"]}]' > /tmp/cors.json && gsutil cors set /tmp/cors.json gs://aaura-original-uploads
```

**Then press Enter**

---

## Method 2: Two Separate Commands (If Method 1 doesn't work)

### Command 1:
```bash
echo '[{"origin":["https://www.aaura.live","https://aaura.live","http://localhost:3000","http://localhost:3001","http://localhost:5173","http://localhost:9002","http://0.0.0.0:9002","http://127.0.0.1:9002"],"method":["GET","HEAD","OPTIONS","POST","PUT","DELETE"],"maxAgeSeconds":3600,"responseHeader":["Content-Type","Content-Length","Content-Range","Accept-Ranges","Access-Control-Allow-Origin","Access-Control-Allow-Methods","Access-Control-Allow-Headers","Range","x-goog-resumable","x-goog-content-length-range"]}]' > /tmp/cors.json
```

**Press Enter**

### Command 2:
```bash
gsutil cors set /tmp/cors.json gs://aaura-original-uploads
```

**Press Enter**

---

## What You Should See

After running the command(s), you should see:
```
Updated CORS on gs://aaura-original-uploads
```

---

## Verify It Worked

Run this to check:
```bash
gsutil cors get gs://aaura-original-uploads
```

Should show the CORS configuration with `localhost:9002` in the origins.

---

**Try Method 1 first - it's the simplest!**

