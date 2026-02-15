#!/bin/bash

# Video Re-encoding Script for Web Streaming
# 
# This script re-encodes video files to be web-friendly and optimized for streaming.
# It moves the MOOV atom to the beginning of the file for progressive download.
#
# Prerequisites:
# - FFmpeg installed (sudo apt-get install ffmpeg or brew install ffmpeg)
#
# Usage:
#   ./scripts/reencodeVideos.sh input.mp4 output.mp4
#   OR
#   ./scripts/reencodeVideos.sh input.mp4  (creates input_web.mp4)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ ERROR: FFmpeg is not installed${NC}"
    echo ""
    echo "Install FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

# Get input and output file names
INPUT_FILE="$1"
OUTPUT_FILE="$2"

# Validate input file
if [ -z "$INPUT_FILE" ]; then
    echo -e "${RED}❌ ERROR: No input file specified${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 input.mp4 output.mp4"
    echo "  $0 input.mp4  (creates input_web.mp4)"
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ ERROR: Input file not found: $INPUT_FILE${NC}"
    exit 1
fi

# Generate output filename if not provided
if [ -z "$OUTPUT_FILE" ]; then
    BASENAME=$(basename "$INPUT_FILE" .mp4)
    DIRNAME=$(dirname "$INPUT_FILE")
    OUTPUT_FILE="${DIRNAME}/${BASENAME}_web.mp4"
fi

echo -e "${GREEN}🎬 Video Re-encoding for Web Streaming${NC}"
echo ""
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo ""

# Get original file size
ORIGINAL_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
echo "Original size: $ORIGINAL_SIZE"
echo ""

# Re-encode with web-optimized settings
echo -e "${YELLOW}⏳ Re-encoding video...${NC}"
echo ""

ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 \
    -preset fast \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -pix_fmt yuv420p \
    -profile:v high \
    -level 4.0 \
    -y \
    "$OUTPUT_FILE" 2>&1 | grep -E "(Duration|Stream|frame|size|time)" || true

# Check if output was created
if [ ! -f "$OUTPUT_FILE" ]; then
    echo -e "${RED}❌ ERROR: Re-encoding failed${NC}"
    exit 1
fi

# Get new file size
NEW_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo -e "${GREEN}✅ Re-encoding complete!${NC}"
echo ""
echo "Original size: $ORIGINAL_SIZE"
echo "New size:      $NEW_SIZE"
echo ""
echo -e "${GREEN}📤 Ready to upload to Firebase${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the video in a browser"
echo "  2. Upload to Firebase using: node scripts/uploadVideos.js"
echo ""


