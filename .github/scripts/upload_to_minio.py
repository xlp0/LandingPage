#!/usr/bin/env python3
"""
Upload daily reports (MD, LaTeX, PDF) to MinIO.
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from minio import Minio
from minio.error import S3Error

def upload_to_minio(file_path, bucket_name, object_name):
    """Upload a file to MinIO bucket."""
    # Get MinIO credentials from environment
    minio_endpoint = os.environ.get('MINIO_ENDPOINT', 'minio.pkc.pub')
    minio_access_key = os.environ.get('MINIO_ACCESS_KEY')
    minio_secret_key = os.environ.get('MINIO_SECRET_KEY')
    
    if not minio_access_key or not minio_secret_key:
        print("Error: MinIO credentials not set in environment variables")
        return None
    
    try:
        # Initialize MinIO client
        client = Minio(
            minio_endpoint,
            access_key=minio_access_key,
            secret_key=minio_secret_key,
            secure=True
        )
        
        # Check if bucket exists, create if not
        if not client.bucket_exists(bucket_name):
            print(f"Bucket {bucket_name} does not exist, creating...")
            client.make_bucket(bucket_name)
            # Set bucket policy to public read
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                    }
                ]
            }
            client.set_bucket_policy(bucket_name, json.dumps(policy))
        
        # Upload file
        client.fput_object(
            bucket_name,
            object_name,
            file_path,
        )
        
        # Generate public URL
        url = f"https://{minio_endpoint}/browser/{bucket_name}/{object_name}"
        print(f"✅ Uploaded: {file_path} -> {url}")
        return url
        
    except S3Error as e:
        print(f"❌ MinIO S3 Error: {e}")
        return None
    except Exception as e:
        print(f"❌ Error uploading to MinIO: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: upload_to_minio.py <processing_results.json>")
        sys.exit(1)
    
    results_file = sys.argv[1]
    
    if not os.path.exists(results_file):
        print(f"Error: Results file not found: {results_file}")
        sys.exit(1)
    
    # Load processing results
    with open(results_file, 'r') as f:
        results = json.load(f)
    
    # Get yesterday's date in WITA timezone (UTC+8) for folder structure
    wita_tz = ZoneInfo('Asia/Makassar')
    yesterday = (datetime.now(wita_tz) - timedelta(days=1)).strftime('%Y-%m-%d')
    
    bucket_name = 'daily-reports'
    upload_results = {}
    
    # Process each user
    for user_name, user_data in results.items():
        if not user_data.get('has_commits'):
            print(f"Skipping {user_name} - no commits")
            upload_results[user_name] = {
                'has_commits': False,
                'urls': {}
            }
            continue
        
        print(f"\n{'='*60}")
        print(f"Uploading files for {user_name}")
        print(f"{'='*60}")
        
        user_urls = {}
        
        # Determine file paths
        base_path = Path('daily-reports')
        user_prefix = user_name.lower()
        
        files_to_upload = {
            'markdown': base_path / f"{user_prefix}_{yesterday}.md",
            'latex': base_path / f"{user_prefix}_{yesterday}.tex",
            'pdf': base_path / f"{user_prefix}_{yesterday}.pdf"
        }
        
        # Upload each file type
        for file_type, file_path in files_to_upload.items():
            if file_path.exists():
                # Object name format: {date}/{user}/{filename}
                object_name = f"{yesterday}/{user_name}/{file_path.name}"
                url = upload_to_minio(str(file_path), bucket_name, object_name)
                if url:
                    user_urls[file_type] = url
            else:
                print(f"⚠️  File not found: {file_path}")
        
        upload_results[user_name] = {
            'has_commits': True,
            'commit_count': user_data.get('commit_count', 0),
            'urls': user_urls
        }
        
        print(f"✅ Upload complete for {user_name}")
    
    # Save upload results
    upload_results_file = Path('daily-reports') / 'upload_results.json'
    with open(upload_results_file, 'w') as f:
        json.dump(upload_results, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"Upload results saved to: {upload_results_file}")
    print(f"{'='*60}")
    
    # Print summary
    for user_name, data in upload_results.items():
        if data['has_commits']:
            print(f"\n{user_name}:")
            for file_type, url in data['urls'].items():
                print(f"  {file_type}: {url}")

if __name__ == '__main__':
    main()
