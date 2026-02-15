#!/bin/bash
# Script to regenerate package-lock.json for Firebase App Hosting compatibility
# Run this script to sync package-lock.json with package.json

set -e

echo "🔄 Regenerating package-lock.json for Firebase App Hosting compatibility..."

# Remove old lock file if it exists
if [ -f "package-lock.json" ]; then
    echo "📦 Removing old package-lock.json..."
    rm package-lock.json
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "Please install Node.js and npm first:"
    echo "  - Visit https://nodejs.org/ or use nvm"
    exit 1
fi

# Install dependencies to regenerate lock file
echo "📥 Installing dependencies to regenerate package-lock.json..."
npm install

# Verify the lock file was created
if [ -f "package-lock.json" ]; then
    echo "✅ Successfully regenerated package-lock.json"
    echo "📊 File size: $(ls -lh package-lock.json | awk '{print $5}')"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated package-lock.json"
    echo "2. Commit it: git add package-lock.json && git commit -m 'Sync package-lock.json'"
    echo "3. Push: git push"
else
    echo "❌ Error: package-lock.json was not generated"
    exit 1
fi

