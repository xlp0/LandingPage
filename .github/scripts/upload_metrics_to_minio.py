#!/usr/bin/env python3
"""
Upload Grafana metrics to MinIO storage
"""

import os
import sys
import json
import glob
from datetime import datetime
from minio import Minio
from minio.error import S3Error
import pytz

def get_minio_client():
    """Initialize MinIO client"""
    endpoint = os.getenv('MINIO_ENDPOINT', 'minio.pkc.pub')
    access_key = os.getenv('MINIO_ACCESS_KEY')
    secret_key = os.getenv('MINIO_SECRET_KEY')
    
    if not access_key or not secret_key:
        print("❌ MinIO credentials not set")
        sys.exit(1)
    
    print(f"🔌 Connecting to MinIO endpoint: {endpoint}")
    
    try:
        client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=True
        )
        print(f"✅ Connected to MinIO: {endpoint}")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to MinIO: {e}")
        sys.exit(1)

def ensure_bucket_exists(client, bucket_name):
    """Create bucket if it doesn't exist"""
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
            print(f"✅ Created bucket: {bucket_name}")
        else:
            print(f"✅ Bucket exists: {bucket_name}")
    except S3Error as e:
        print(f"⚠️  Bucket check error: {e}")
        print(f"   Will try upload anyway")

def upload_file(client, bucket_name, file_path, object_name):
    """Upload file to MinIO"""
    try:
        # Determine content type based on file extension
        if file_path.endswith('.json'):
            content_type = "application/json"
        elif file_path.endswith('.md'):
            content_type = "text/markdown"
        else:
            content_type = "application/octet-stream"
        
        client.fput_object(
            bucket_name,
            object_name,
            file_path,
            content_type=content_type
        )
        print(f"  ✅ Uploaded: {object_name}")
        return True
    except S3Error as e:
        print(f"  ❌ Failed to upload {file_path}: {e}")
        return False

def main():
    metrics_dir = "grafana-metrics"
    bucket_name = "pkc"
    
    print("🚀 Starting upload to MinIO")
    
    # Initialize MinIO client
    client = get_minio_client()
    
    # Ensure bucket exists
    ensure_bucket_exists(client, bucket_name)
    
    # Get current date in WITA timezone (UTC+8) for folder structure
    wita_tz = pytz.timezone('Asia/Makassar')
    now = datetime.now(wita_tz)
    date_folder = now.strftime('%Y-%m-%d')
    
    # Find all JSON and Markdown files in metrics directory
    json_files = glob.glob(f"{metrics_dir}/*.json")
    md_files = glob.glob(f"{metrics_dir}/*.md")
    all_files = json_files + md_files
    
    if not all_files:
        print("⚠️  No metrics files found to upload")
        sys.exit(0)
    
    print(f"\n📤 Uploading {len(all_files)} files ({len(json_files)} JSON, {len(md_files)} Markdown)...")
    
    upload_results = {
        "timestamp": now.isoformat(),
        "bucket": bucket_name,
        "uploaded_files": [],
        "failed_files": []
    }
    
    for file_path in all_files:
        filename = os.path.basename(file_path)
        
        # Organize files by date (format: YYYY-MM-DD)
        object_name = f"grafana-metrics/{date_folder}/{filename}"
        
        success = upload_file(client, bucket_name, file_path, object_name)
        
        if success:
            upload_results["uploaded_files"].append({
                "filename": filename,
                "object_name": object_name,
                "size": os.path.getsize(file_path)
            })
        else:
            upload_results["failed_files"].append(filename)
    
    # Save upload results
    results_file = f"{metrics_dir}/upload_results.json"
    with open(results_file, 'w') as f:
        json.dump(upload_results, f, indent=2)
    
    print(f"\n✅ Upload completed!")
    print(f"   Successful: {len(upload_results['uploaded_files'])}")
    print(f"   Failed: {len(upload_results['failed_files'])}")
    print(f"   Results saved to: {results_file}")
    
    if upload_results["failed_files"]:
        print(f"\n⚠️  Some files failed to upload:")
        for filename in upload_results["failed_files"]:
            print(f"   - {filename}")

if __name__ == "__main__":
    main()
