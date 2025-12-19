#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Maia ONNX Model Download Script
# ═══════════════════════════════════════════════════════════════════════════
#
# Downloads pre-converted Maia ONNX models from HuggingFace.
# These models are ready to use with onnxruntime-web in the browser.
#
# Source: https://huggingface.co/shermansiu (pre-converted by Sherman Siu)
#
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../public/models"
HUGGINGFACE_BASE="https://huggingface.co/shermansiu"

# Rating levels available
RATINGS=(1100 1200 1300 1400 1500 1600 1700 1800 1900)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Maia ONNX Model Downloader${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Download each model
for rating in "${RATINGS[@]}"; do
    OUTPUT_FILE="$OUTPUT_DIR/maia-$rating.onnx"
    
    # Skip if already exists
    if [ -f "$OUTPUT_FILE" ]; then
        SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
        echo -e "${YELLOW}⊘ maia-$rating.onnx already exists ($SIZE)${NC}"
        continue
    fi
    
    echo -n "Downloading maia-$rating.onnx... "
    
    # Download from HuggingFace
    URL="$HUGGINGFACE_BASE/maia-$rating/resolve/main/model.onnx"
    
    if curl -L -o "$OUTPUT_FILE" "$URL" 2>/dev/null; then
        SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
        echo -e "${GREEN}✓ ($SIZE)${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        rm -f "$OUTPUT_FILE"
    fi
done

echo ""
echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
echo ""

# Summary
echo "Models downloaded to: $OUTPUT_DIR"
echo ""

# List files
if ls "$OUTPUT_DIR"/*.onnx 1>/dev/null 2>&1; then
    echo "Available models:"
    ls -lh "$OUTPUT_DIR"/*.onnx 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
else
    echo -e "${RED}No ONNX models found!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Done! Run 'pnpm dev' to start the app with Maia predictions.${NC}"
echo ""




