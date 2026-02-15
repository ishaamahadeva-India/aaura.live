# 🌐 Localhost Access Guide

## Your Local Development Server

Your Next.js app runs on:
```
http://localhost:9002
```

---

## Quick Access

### Open in Browser:
1. **Open your browser**
2. **Go to:** `http://localhost:9002`
3. **Or:** `http://127.0.0.1:9002`

---

## Start Dev Server

If the server is not running:

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
npm run dev
```

**Wait for this message:**
```
▲ Next.js 15.5.7
- Local:        http://localhost:9002
- Network:      http://0.0.0.0:9002
```

---

## Test Video Upload Locally

1. **Open:** `http://localhost:9002`
2. **Login** (if required)
3. **Go to upload page:** `http://localhost:9002/upload`
4. **Upload a test video**
5. **Check browser console** (F12) for errors

---

## Test Diagnostic Endpoint

Check if signed URLs work:
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

## Common Localhost URLs

- **Home:** `http://localhost:9002`
- **Upload:** `http://localhost:9002/upload`
- **Feed:** `http://localhost:9002/feed`
- **Reels:** `http://localhost:9002/reels`
- **Test API:** `http://localhost:9002/api/test-signed-url`

---

## Troubleshooting

### Port Already in Use?
```bash
# Kill process on port 9002
lsof -ti:9002 | xargs kill -9

# Restart
npm run dev
```

### Can't Access?
1. Check if dev server is running
2. Check terminal for errors
3. Try `http://127.0.0.1:9002` instead

---

## Network Access (Other Devices)

If you want to access from other devices on same network:
```
http://YOUR_IP_ADDRESS:9002
```

Find your IP:
```bash
hostname -I
```

---

**Your localhost:** `http://localhost:9002`

