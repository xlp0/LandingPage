#!/usr/bin/env python3
"""
Grafana Metrics Collector
Collects metrics from Grafana dashboards using Grafana API
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
import pytz

def get_grafana_session(base_url, username, password):
    """Login to Grafana and return session"""
    session = requests.Session()
    
    login_url = f"{base_url}/login"
    login_data = {
        "user": username,
        "password": password
    }
    
    try:
        response = session.post(login_url, json=login_data)
        response.raise_for_status()
        print(f"✅ Successfully logged in to Grafana")
        return session
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to login to Grafana: {e}")
        sys.exit(1)

def get_dashboard_info(session, base_url, dashboard_uid):
    """Get dashboard information"""
    url = f"{base_url}/api/dashboards/uid/{dashboard_uid}"
    
    try:
        response = session.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to get dashboard info: {e}")
        return None

def query_prometheus_via_grafana(session, base_url, query, time_range='1h'):
    """Query Prometheus metrics via Grafana API"""
    
    # Calculate time range
    now = datetime.now(pytz.UTC)
    
    if time_range.endswith('h'):
        hours = int(time_range[:-1])
        start_time = now - timedelta(hours=hours)
    elif time_range.endswith('d'):
        days = int(time_range[:-1])
        start_time = now - timedelta(days=days)
    else:
        start_time = now - timedelta(hours=1)
    
    # Grafana datasource query endpoint
    url = f"{base_url}/api/datasources/proxy/1/api/v1/query_range"
    
    params = {
        'query': query,
        'start': int(start_time.timestamp()),
        'end': int(now.timestamp()),
        'step': '60s'  # 1 minute resolution
    }
    
    try:
        response = session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Query failed: {query[:50]}... - {e}")
        return None

def collect_zitadel_metrics(session, base_url, time_range):
    """Collect ZITADEL authentication and user monitoring metrics"""
    
    print("\n📊 Collecting ZITADEL metrics...")
    
    # Common ZITADEL metrics to collect
    queries = {
        "active_sessions": 'zitadel_active_sessions_total',
        "failed_logins": 'rate(zitadel_failed_auth_requests_total[5m])',
        "successful_logins": 'rate(zitadel_successful_auth_requests_total[5m])',
        "active_users": 'zitadel_active_users_total',
        "registered_users": 'zitadel_users_total',
        "auth_requests": 'rate(zitadel_auth_requests_total[5m])',
        "token_requests": 'rate(zitadel_token_requests_total[5m])',
        "api_calls": 'rate(zitadel_api_calls_total[5m])',
        "database_connections": 'zitadel_database_connections',
        "cache_hit_rate": 'rate(zitadel_cache_hits_total[5m]) / rate(zitadel_cache_requests_total[5m])',
    }
    
    metrics_data = {
        "timestamp": datetime.now(pytz.UTC).isoformat(),
        "time_range": time_range,
        "source": "ZITADEL",
        "dashboard": "zitadel-auth",
        "metrics": {}
    }
    
    for metric_name, query in queries.items():
        print(f"  Querying: {metric_name}...")
        result = query_prometheus_via_grafana(session, base_url, query, time_range)
        
        if result and result.get('status') == 'success':
            metrics_data["metrics"][metric_name] = result.get('data', {})
            print(f"    ✅ Collected {metric_name}")
        else:
            metrics_data["metrics"][metric_name] = None
            print(f"    ⚠️  No data for {metric_name}")
    
    return metrics_data

def save_metrics(metrics_data, output_dir="grafana-metrics"):
    """Save metrics to JSON file"""
    
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now(pytz.timezone('Asia/Makassar')).strftime('%Y%m%d_%H%M%S')
    filename = f"{output_dir}/zitadel_metrics_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(metrics_data, f, indent=2)
    
    print(f"\n💾 Metrics saved to: {filename}")
    
    # Also save a summary file
    summary = {
        "collection_time": metrics_data["timestamp"],
        "time_range": metrics_data["time_range"],
        "source": metrics_data["source"],
        "metrics_collected": len([m for m in metrics_data["metrics"].values() if m is not None]),
        "total_metrics": len(metrics_data["metrics"]),
        "filename": filename
    }
    
    summary_file = f"{output_dir}/latest_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"📄 Summary saved to: {summary_file}")
    
    return filename

def main():
    # Get environment variables
    grafana_url = os.getenv('GRAFANA_URL', 'https://grafana.pkc.pub')
    username = os.getenv('GRAFANA_USERNAME', 'admin')
    password = os.getenv('GRAFANA_PASSWORD')
    time_range = os.getenv('TIME_RANGE', '1h')
    
    if not password:
        print("❌ GRAFANA_PASSWORD environment variable not set")
        sys.exit(1)
    
    print(f"🚀 Starting Grafana metrics collection")
    print(f"   URL: {grafana_url}")
    print(f"   Time range: {time_range}")
    print(f"   User: {username}")
    
    # Login to Grafana
    session = get_grafana_session(grafana_url, username, password)
    
    # Collect ZITADEL metrics
    metrics_data = collect_zitadel_metrics(session, grafana_url, time_range)
    
    # Save metrics
    filename = save_metrics(metrics_data)
    
    print(f"\n✅ Metrics collection completed successfully!")
    print(f"   Total metrics: {len(metrics_data['metrics'])}")
    print(f"   Output file: {filename}")

if __name__ == "__main__":
    main()
