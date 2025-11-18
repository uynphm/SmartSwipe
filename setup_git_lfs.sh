#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print error messages
error() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Function to print success messages
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print info messages
info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not a git repository. Please run this script from within a git repository."
fi

# Check if git-lfs is installed
if ! command -v git-lfs &> /dev/null; then
    error "Git LFS is not installed. Please install it first: https://git-lfs.github.com/"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    error "No remote 'origin' found. Please add a remote first: git remote add origin <url>"
fi

# Step 1: Initialize Git LFS in the existing repository
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Initializing Git LFS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if git lfs install; then
    success "Git LFS initialized successfully"
else
    error "Failed to initialize Git LFS"
fi

# Step 2: Track all JPEG and PNG images for Git LFS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Tracking JPEG and PNG images with Git LFS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git lfs track "*.jpg" || error "Failed to track *.jpg"
git lfs track "*.jpeg" || error "Failed to track *.jpeg"
git lfs track "*.png" || error "Failed to track *.png"
git lfs track "*.JPG" || error "Failed to track *.JPG"
git lfs track "*.JPEG" || error "Failed to track *.JPEG"
git lfs track "*.PNG" || error "Failed to track *.PNG"
success "Image file patterns tracked with Git LFS"

# Step 3: Add all files in the current directory to Git
# This includes the .gitattributes file created by Git LFS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Adding all files to Git..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if git add .; then
    success "All files added to staging area"
    info "Including .gitattributes file with LFS tracking rules"
else
    error "Failed to add files to git"
fi

# Check if there are any changes to commit
if git diff --staged --quiet; then
    info "No changes to commit. All files are already committed."
else
    # Step 4: Commit the changes with message "Add dataset with Git LFS"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Step 4: Committing changes..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if git commit -m "Add dataset with Git LFS"; then
        success "Changes committed successfully"
    else
        error "Failed to commit changes"
    fi
fi

# Step 5: Push the commit to the remote origin main branch
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Pushing to remote origin main branch..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Detect the default branch name (main or master)
DEFAULT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
info "Current branch: $DEFAULT_BRANCH"

if git push origin "$DEFAULT_BRANCH"; then
    success "Changes pushed to origin/$DEFAULT_BRANCH successfully"
else
    error "Failed to push to remote. Check your network connection and permissions."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Git LFS setup complete! All JPEG and PNG images are now tracked with Git LFS."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

