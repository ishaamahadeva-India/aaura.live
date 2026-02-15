#!/bin/bash

# Video Streaming Test Script
# Tests CDN setup, Range requests, and video playback

set -e

echo "🎬 Video Streaming Test Suite"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CDN_DOMAIN="videos.aaura.live"
BUCKET="studio-9632556640-bd58d"
TEST_PATH="posts/testUserId/testVideo.mp4"

# Test 1: DNS Resolution
echo "1️⃣  Testing DNS Resolution..."
if dig +short $CDN_DOMAIN | grep -q "104.16\|172.64\|173.245"; then
    echo -e "${GREEN}✅ DNS resolves to Cloudflare IPs${NC}"
else
    echo -e "${RED}❌ DNS does not resolve to Cloudflare IPs${NC}"
    echo "   Run: dig $CDN_DOMAIN"
    exit 1
fi
echo ""

# Test 2: Basic Connectivity
echo "2️⃣  Testing Basic Connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$CDN_DOMAIN/v0/b/$BUCKET/o/test?alt=media" || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✅ CDN is reachable (HTTP $HTTP_CODE)${NC}"
    if [ "$HTTP_CODE" = "404" ]; then
        echo -e "${YELLOW}   ⚠️  404 is OK - file doesn't exist, but CDN is working${NC}"
    fi
else
    echo -e "${RED}❌ CDN is not reachable (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Test 3: Range Request Support
echo "3️⃣  Testing Range Request Support..."
RANGE_RESPONSE=$(curl -s -I -H "Range: bytes=0-1023" "https://$CDN_DOMAIN/v0/b/$BUCKET/o/test?alt=media" 2>&1)
if echo "$RANGE_RESPONSE" | grep -q "206 Partial Content\|Accept-Ranges: bytes"; then
    echo -e "${GREEN}✅ Range requests supported${NC}"
    if echo "$RANGE_RESPONSE" | grep -q "206 Partial Content"; then
        echo -e "${GREEN}   ✅ Returns 206 Partial Content${NC}"
    fi
    if echo "$RANGE_RESPONSE" | grep -q "Accept-Ranges: bytes"; then
        echo -e "${GREEN}   ✅ Accept-Ranges header present${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Range request test inconclusive${NC}"
    echo "   Response:"
    echo "$RANGE_RESPONSE" | head -5
fi
echo ""

# Test 4: Cloudflare Headers
echo "4️⃣  Testing Cloudflare Headers..."
HEADERS=$(curl -s -I "https://$CDN_DOMAIN/v0/b/$BUCKET/o/test?alt=media" 2>&1)
if echo "$HEADERS" | grep -q "server: cloudflare\|cf-ray\|cf-cache-status"; then
    echo -e "${GREEN}✅ Cloudflare headers present${NC}"
    if echo "$HEADERS" | grep -q "cf-cache-status"; then
        CACHE_STATUS=$(echo "$HEADERS" | grep -i "cf-cache-status" | cut -d: -f2 | tr -d ' ')
        echo "   Cache Status: $CACHE_STATUS"
    fi
else
    echo -e "${RED}❌ Cloudflare headers missing${NC}"
    echo "   This might indicate DNS/proxy issue"
fi
echo ""

# Test 5: CORS Headers
echo "5️⃣  Testing CORS Headers..."
CORS_HEADERS=$(curl -s -I -H "Origin: https://aaura.live" "https://$CDN_DOMAIN/v0/b/$BUCKET/o/test?alt=media" 2>&1)
if echo "$CORS_HEADERS" | grep -qi "access-control"; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
else
    echo -e "${YELLOW}⚠️  CORS headers not found (may be OK if not needed)${NC}"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Test Summary"
echo "=============================="
echo ""
echo "Next Steps:"
echo "1. Test with a real video URL from your app"
echo "2. Check browser Network tab for Range requests"
echo "3. Verify videos play fully without stopping"
echo "4. Check Cloudflare Page Rule is active"
echo ""
echo "To test with real video:"
echo "  curl -I -H 'Range: bytes=0-1023' 'https://$CDN_DOMAIN/v0/b/$BUCKET/o/REAL_PATH?alt=media&token=TOKEN'"
echo ""







