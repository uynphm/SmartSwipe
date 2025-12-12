#!/usr/bin/env python3
"""
Extract image features using MobileNetV2 for fashion item recommendations.
Run this script to preprocess all images and generate feature vectors.
"""

import os
import json
import numpy as np
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from PIL import Image

# Load MobileNetV2 pretrained on ImageNet, excluding classification head
print("Loading MobileNetV2 model...")
base_model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg')
print("Model loaded successfully!")

def extract_features(img_path):
    """Extract feature vector from an image."""
    try:
        # Load image using PIL
        img = Image.open(img_path)
        # Convert to RGB if needed (handles RGBA, P, etc.)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # Resize to target size (use LANCZOS resampling)
        try:
            # PIL 10.0.0+
            img = img.resize((224, 224), Image.Resampling.LANCZOS)
        except AttributeError:
            # Older PIL versions
            img = img.resize((224, 224), Image.LANCZOS)
        # Convert to numpy array
        img_array = np.array(img, dtype=np.float32)
        # Expand dimensions for batch
        img_array = np.expand_dims(img_array, axis=0)
        # Preprocess for MobileNetV2
        img_array = preprocess_input(img_array)
        
        features = base_model.predict(img_array, verbose=0)
        return features[0].tolist()  # Convert numpy array to list for JSON
    except Exception as e:
        print(f"Error processing {img_path}: {e}")
        return None

def process_dataset():
    """Process all images in the dataset and extract features."""
    # Path to dataset
    dataset_path = Path(__file__).parent.parent / 'dataset' / 'dataset_clothing_images'
    
    if not dataset_path.exists():
        print(f"Dataset path not found: {dataset_path}")
        return
    
    features_dict = {}
    total_images = 0
    processed = 0
    
    # Get all categories
    categories = [d for d in dataset_path.iterdir() if d.is_dir()]
    
    for category_dir in categories:
        category = category_dir.name
        print(f"\nProcessing category: {category}")
        
        # Get all images in category
        image_files = list(category_dir.glob('*.jpg')) + list(category_dir.glob('*.jpeg'))
        total_images += len(image_files)
        
        for img_file in image_files:
            # Image ID format: category/uuid
            image_id = f"{category}/{img_file.stem}"
            
            print(f"  Processing {image_id}...", end=' ')
            features = extract_features(str(img_file))
            
            if features:
                features_dict[image_id] = features
                processed += 1
                print("✓")
            else:
                print("✗")
    
    # Save features to JSON file
    output_path = Path(__file__).parent.parent / 'dataset' / 'image_features.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(features_dict, f)
    
    print(f"\n{'='*50}")
    print(f"Processing complete!")
    print(f"Total images: {total_images}")
    print(f"Successfully processed: {processed}")
    print(f"Features saved to: {output_path}")
    print(f"{'='*50}")

if __name__ == '__main__':
    process_dataset()

