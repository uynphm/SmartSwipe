#!/bin/bash

# Step 1: Initialize Git LFS in the existing repository
echo "Step 1: Initializing Git LFS..."
git lfs install

# Step 2: Track all JPEG and PNG images for Git LFS
echo "Step 2: Tracking JPEG and PNG images with Git LFS..."
git lfs track "*.jpg"
git lfs track "*.jpeg"
git lfs track "*.png"
git lfs track "*.JPG"
git lfs track "*.JPEG"
git lfs track "*.PNG"

# Step 3: Add all files in the current directory to Git
# This includes the .gitattributes file created by Git LFS
echo "Step 3: Adding all files to Git..."
git add .

# Step 4: Commit the changes with message "Add dataset with Git LFS"
echo "Step 4: Committing changes..."
git commit -m "Add dataset with Git LFS"

# Step 5: Push the commit to the remote origin main branch
echo "Step 5: Pushing to remote origin main branch..."
git push origin main

echo "✅ Git LFS setup complete! All JPEG and PNG images are now tracked with Git LFS."

