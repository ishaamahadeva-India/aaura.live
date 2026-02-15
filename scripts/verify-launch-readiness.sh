#!/bin/bash

# Pre-Launch Verification Script
# This script checks critical items before launch

echo "🚀 Pre-Launch Verification Script"
echo "=================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}❌${NC} $1 is NOT installed"
        ((ERRORS++))
        return 1
    fi
}

# Function to check Firebase project
check_firebase() {
    if firebase projects:list &> /dev/null; then
        echo -e "${GREEN}✅${NC} Firebase CLI is authenticated"
        CURRENT_PROJECT=$(firebase use 2>&1 | grep "Now using" | awk '{print $3}' || echo "none")
        if [ "$CURRENT_PROJECT" != "none" ]; then
            echo -e "${GREEN}   Current project: $CURRENT_PROJECT${NC}"
        else
            echo -e "${YELLOW}⚠️  No Firebase project selected${NC}"
            ((WARNINGS++))
        fi
        return 0
    else
        echo -e "${RED}❌${NC} Firebase CLI not authenticated or not installed"
        echo "   Run: firebase login"
        ((ERRORS++))
        return 1
    fi
}

# Function to check if functions are deployed
check_functions() {
    echo ""
    echo "Checking Cloud Functions..."
    if firebase functions:list &> /dev/null; then
        FUNCTIONS=$(firebase functions:list 2>/dev/null | grep -c "convertVideoToHLS" || echo "0")
        if [ "$FUNCTIONS" -gt 0 ]; then
            echo -e "${GREEN}✅${NC} convertVideoToHLS function is deployed"
        else
            echo -e "${RED}❌${NC} convertVideoToHLS function is NOT deployed"
            echo "   Run: cd functions && firebase deploy --only functions:convertVideoToHLS"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠️  Could not check functions (may need to be in project directory)${NC}"
        ((WARNINGS++))
    fi
}

# Function to check if build works
check_build() {
    echo ""
    echo "Checking production build..."
    if [ -f "package.json" ]; then
        echo "   Running: npm run build"
        if npm run build 2>&1 | grep -q "error\|Error\|ERROR"; then
            echo -e "${RED}❌${NC} Build has errors"
            ((ERRORS++))
        else
            echo -e "${GREEN}✅${NC} Build completed successfully"
        fi
    else
        echo -e "${YELLOW}⚠️  package.json not found in current directory${NC}"
        ((WARNINGS++))
    fi
}

# Function to check environment variables
check_env_vars() {
    echo ""
    echo "Checking environment variables..."
    
    if [ -f "apphosting.yaml" ] || [ -f "src/apphosting.production.yaml" ]; then
        echo -e "${GREEN}✅${NC} Environment configuration files found"
        
        # Check if key variables are set
        if grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" apphosting.yaml 2>/dev/null || grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" src/apphosting.production.yaml 2>/dev/null; then
            echo -e "${GREEN}✅${NC} Firebase config variables found"
        else
            echo -e "${YELLOW}⚠️  Firebase config variables may not be set${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠️  Environment configuration files not found${NC}"
        ((WARNINGS++))
    fi
}

# Function to check critical files
check_files() {
    echo ""
    echo "Checking critical files..."
    
    FILES=(
        "firestore.rules"
        "storage.rules"
        "firestore.indexes.json"
        "firebase.json"
    )
    
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅${NC} $file exists"
        else
            echo -e "${RED}❌${NC} $file is missing"
            ((ERRORS++))
        fi
    done
}

# Main checks
echo "1. Checking required tools..."
check_command "node"
check_command "npm"
check_command "firebase"

echo ""
echo "2. Checking Firebase setup..."
check_firebase

echo ""
echo "3. Checking critical files..."
check_files

echo ""
echo "4. Checking environment variables..."
check_env_vars

echo ""
echo "5. Checking Cloud Functions..."
check_functions

echo ""
echo "6. Checking production build..."
check_build

# Summary
echo ""
echo "=================================="
echo "📊 Summary"
echo "=================================="
echo -e "${GREEN}✅ Passed checks: $((6 - ERRORS - WARNINGS))${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
fi
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Errors: $ERRORS${NC}"
    echo ""
    echo -e "${RED}❌ NOT READY FOR LAUNCH${NC}"
    echo "Please fix the errors above before launching."
    exit 1
else
    echo ""
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ READY FOR LAUNCH!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Review PRE_LAUNCH_CHECKLIST.md"
        echo "2. Deploy rules: firebase deploy --only firestore:rules,storage:rules,firestore:indexes"
        echo "3. Deploy functions: cd functions && firebase deploy --only functions"
        echo "4. Deploy app: firebase deploy --only hosting"
    else
        echo -e "${YELLOW}⚠️  MOSTLY READY, but review warnings above${NC}"
        echo ""
        echo "Review PRE_LAUNCH_CHECKLIST.md for details."
    fi
    exit 0
fi








