#!/usr/bin/env python3
"""
Upload Grafana metrics to MinIO storage
"""

import os
import sys
import json
import glob
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import pytz

def get_s3_client():
    """Initialize S3 client for MinIO"""
    endpoint = os.getenv('MINIO_ENDPOINT', 'https://minio.pkc.pub')
    access_key = os.getenv('MINIO_ACCESS_KEY')
    secret_key = os.getenv('MINIO_SECRET_KEY')
    
    if not access_key or not secret_key:
        print("❌ MinIO credentials not set")
        sys.exit(1)
    
    print(f"🔌 Connecting to MinIO S3 endpoint: {endpoint}")
    
    try:
        # Use boto3 S3 client with MinIO endpoint
        client = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'  # MinIO default region
        )
        
        # Test connection by listing buckets
        client.list_buckets()
        print(f"✅ Connected to MinIO S3 API: {endpoint}")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to MinIO: {e}")
        print(f"   Endpoint: {endpoint}")
        print(f"   Make sure MinIO S3 API is accessible at this URL")
        sys.exit(1)

def ensure_bucket_exists(client, bucket_name):
    """Create bucket if it doesn't exist"""
    try:
        client.head_bucket(Bucket=bucket_name)
        print(f"✅ Bucket exists: {bucket_name}")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            try:
                client.create_bucket(Bucket=bucket_name)
                print(f"✅ Created bucket: {bucket_name}")
            except ClientError as create_error:
                print(f"⚠️  Could not create bucket: {create_error}")
                print(f"   Assuming bucket exists, will try upload anyway")
        else:
            print(f"⚠️  Bucket check skipped: {e}")
            print(f"   Assuming bucket exists, will try upload anyway")

def upload_file(client, bucket_name, file_path, object_name):
    """Upload file to MinIO using S3 API"""
    try:
        with open(file_path, 'rb') as f:
            client.put_object(
                Bucket=bucket_name,
                Key=object_name,
                Body=f,
                ContentType='application/json'
            )
        print(f"  ✅ Uploaded: {object_name}")
        return True
    except ClientError as e:
        print(f"  ❌ Failed to upload {file_path}: {e}")
        return False

def main():
    metrics_dir = "grafana-metrics"
    bucket_name = "grafana-metrics"
    
    print("🚀 Starting upload to MinIO")
    
    # Initialize S3 client for MinIO
    client = get_s3_client()
    
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
