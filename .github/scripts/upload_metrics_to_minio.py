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
        client.make_bucket(bucket_name)
        print(f"✅ Created bucket: {bucket_name}")
    except S3Error as e:
        if e.code == 'BucketAlreadyOwnedByYou' or e.code == 'BucketAlreadyExists':
            print(f"✅ Bucket already exists: {bucket_name}")
        else:
            print(f"⚠️  Bucket check skipped (assuming exists): {bucket_name}")
            print(f"   If upload fails, manually create bucket via MinIO console")

def upload_file(client, bucket_name, file_path, object_name):
    """Upload file to MinIO"""
    try:
        client.fput_object(
            bucket_name,
            object_name,
            file_path,
            content_type="application/json"
        )
        print(f"  ✅ Uploaded: {object_name}")
        return True
    except S3Error as e:
        print(f"  ❌ Failed to upload {file_path}: {e}")
        return False

def main():
    metrics_dir = "grafana-metrics"
    bucket_name = "grafana-metrics"
    
    print("🚀 Starting upload to MinIO")
    
    # Initialize MinIO client
    client = get_minio_client()
    
    # Ensure bucket exists
    ensure_bucket_exists(client, bucket_name)
    
    # Get current timestamp for organizing files
    wita_tz = pytz.timezone('Asia/Makassar')
    now = datetime.now(wita_tz)
    date_path = now.strftime('%Y/%m/%d')
    
    # Find all JSON files in metrics directory
    json_files = glob.glob(f"{metrics_dir}/*.json")
    
    if not json_files:
        print("⚠️  No metrics files found to upload")
        sys.exit(0)
    
    print(f"\n📤 Uploading {len(json_files)} files...")
    
    upload_results = {
        "timestamp": now.isoformat(),
        "bucket": bucket_name,
        "uploaded_files": [],
        "failed_files": []
    }
    
    for file_path in json_files:
        filename = os.path.basename(file_path)
        
        # Organize files by date
        object_name = f"{date_path}/{filename}"
        
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
