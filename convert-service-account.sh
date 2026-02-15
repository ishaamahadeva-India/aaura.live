#!/bin/bash
# Script to convert Firebase service account JSON to single-line string for Vercel

if [ -z "$1" ]; then
    echo "Usage: ./convert-service-account.sh <path-to-service-account.json>"
    echo "Example: ./convert-service-account.sh FIREBASE_ADMIN_KEY.json"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "Error: File '$1' not found"
    exit 1
fi

echo "=== Single-line JSON (copy this to Vercel) ==="
cat "$1" | jq -c . 2>/dev/null || cat "$1" | tr -d '\n' | sed 's/"/\\"/g'

echo ""
echo ""
echo "=== Alternative: Escaped version (if jq not available) ==="
cat "$1" | tr -d '\n' | sed 's/"/\\"/g'

echo ""
echo ""
echo "✅ Copy the output above and paste it as the value for FIREBASE_SERVICE_ACCOUNT_KEY in Vercel"

