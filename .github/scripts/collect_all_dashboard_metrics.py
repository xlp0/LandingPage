#!/usr/bin/env python3
"""
Grafana Dashboard Metrics Collector
Collects metrics data from all Grafana dashboards using Prometheus queries
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
    session.auth = (username, password)
    session.verify = False  # Skip SSL verification
    
    try:
        response = session.get(f"{base_url}/api/org", timeout=10)
        response.raise_for_status()
        print(f"✅ Successfully connected to Grafana")
        return session
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to connect to Grafana: {e}")
        sys.exit(1)

def query_prometheus_via_grafana(session, base_url, query, time_range='24h'):
    """Query Prometheus metrics via Grafana API using /api/ds/query endpoint"""
    
    # Calculate time range
    now = datetime.now(pytz.UTC)
    
    if time_range.endswith('h'):
        hours = int(time_range[:-1])
        start_time = now - timedelta(hours=hours)
    elif time_range.endswith('d'):
        days = int(time_range[:-1])
        start_time = now - timedelta(days=days)
    else:
        start_time = now - timedelta(hours=24)
    
    # Use Grafana's unified query API endpoint
    url = f"{base_url}/api/ds/query"
    
    # Prepare query payload for Prometheus data source
    payload = {
        "queries": [
            {
                "refId": "A",
                "expr": query,
                "range": True,
                "instant": False,
                "datasource": {
                    "type": "prometheus",
                    "uid": "prometheus"
                },
                "intervalMs": 60000,
                "maxDataPoints": 1000
            }
        ],
        "from": str(int(start_time.timestamp() * 1000)),
        "to": str(int(now.timestamp() * 1000))
    }
    
    try:
        response = session.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Extract Prometheus-style response from Grafana's response
        if 'results' in data and 'A' in data['results']:
            frames = data['results']['A'].get('frames', [])
            if frames:
                # Convert to Prometheus format
                return {
                    'status': 'success',
                    'data': {
                        'resultType': 'matrix',
                        'result': frames
                    }
                }
        
        return {
            'status': 'success',
            'data': {
                'resultType': 'matrix',
                'result': []
            }
        }
    except requests.exceptions.RequestException as e:
        print(f"    ⚠️  Query failed: {query[:80]}... - {e}")
        return None

def get_dashboard_panels(session, base_url, dashboard_uid):
    """Get all panels from a dashboard"""
    url = f"{base_url}/api/dashboards/uid/{dashboard_uid}"
    
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        dashboard = data.get('dashboard', {})
        return dashboard.get('panels', [])
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Failed to get dashboard: {e}")
        return []

def extract_queries_from_panel(panel):
    """Extract Prometheus queries from a panel"""
    queries = []
    targets = panel.get('targets', [])
    
    for target in targets:
        # Handle different query formats
        expr = target.get('expr')
        if expr:
            queries.append({
                'expr': expr,
                'refId': target.get('refId', 'A'),
                'legendFormat': target.get('legendFormat', '')
            })
    
    return queries

def collect_dashboard_metrics(session, base_url, dashboard_uid, dashboard_name, time_range):
    """Collect metrics from a dashboard"""
    
    print(f"\n📊 Collecting metrics: {dashboard_name}")
    print(f"   UID: {dashboard_uid}")
    
    # Get dashboard panels
    panels = get_dashboard_panels(session, base_url, dashboard_uid)
    
    if not panels:
        print(f"  ⚠️  No panels found")
        return None
    
    print(f"   Found {len(panels)} panels")
    
    metrics_data = {
        "timestamp": datetime.now(pytz.UTC).isoformat(),
        "time_range": time_range,
        "source": dashboard_name,
        "dashboard": dashboard_uid,
        "metrics": {}
    }
    
    # Collect metrics from each panel
    for panel in panels:
        panel_title = panel.get('title', 'Untitled')
        panel_id = panel.get('id', 0)
        
        # Extract queries
        queries = extract_queries_from_panel(panel)
        
        if not queries:
            continue
        
        print(f"  Panel: {panel_title}")
        
        for query_info in queries:
            query = query_info['expr']
            ref_id = query_info['refId']
            
            # Create metric key
            metric_key = f"{panel_title}_{ref_id}".replace(' ', '_').replace('/', '_').lower()
            
            print(f"    Querying: {query[:80]}...")
            result = query_prometheus_via_grafana(session, base_url, query, time_range)
            
            if result and result.get('status') == 'success':
                metrics_data["metrics"][metric_key] = result.get('data', {})
                print(f"      ✅ Collected")
            else:
                metrics_data["metrics"][metric_key] = None
                print(f"      ⚠️  No data")
    
    return metrics_data

def collect_zitadel_metrics(session, base_url, time_range):
    """Collect ZITADEL metrics (special handling)"""
    
    print(f"\n📊 Collecting ZITADEL metrics")
    
    # ZITADEL-specific queries
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
            metrics_data["metrics"][metric_name] = {
                "resultType": "matrix",
                "result": []
            }
            print(f"    ⚠️  No data for {metric_name}")
    
    return metrics_data

def save_metrics(metrics_data, dashboard_name, output_dir):
    """Save metrics to JSON file"""
    
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now(pytz.timezone('Asia/Makassar')).strftime('%Y%m%d_%H%M%S')
    safe_name = dashboard_name.replace('/', '_').replace(' ', '_').lower()
    filename = f"{output_dir}/{safe_name}_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(metrics_data, f, indent=2)
    
    print(f"  💾 Saved to: {filename}")
    
    return filename

def main():
    # Configuration
    grafana_url = os.getenv('GRAFANA_URL', 'https://grafana.pkc.pub')
    username = os.getenv('GRAFANA_USERNAME', 'admin')
    password = os.getenv('GRAFANA_PASSWORD', 'r8RKaVP3rzJe6MsuloQv9B4G2UPzSe387DMpOY0r')
    time_range = os.getenv('TIME_RANGE', '24h')
    output_dir = os.getenv('OUTPUT_DIR', '/home/ubuntu1234/grafana-data')
    
    # Dashboard list (UID, Name)
    dashboard_list = [
        ("09ec8aa1e996d6ffcd6817bbaff4db1b", "Kubernetes / API server"),
        ("a87fb0d919ec0ea5f6543124e16c42a5", "Kubernetes / Compute Resources / Cluster"),
        ("85a562078cdf77779eaa1add43ccec1e", "Kubernetes / Compute Resources / Namespace (Pods)"),
        ("a164a7f0339f99e89cea5cb47e9be617", "Kubernetes / Compute Resources / Namespace (Workloads)"),
        ("200ac8fdbfbb74b39aff88118e4d1c2c", "Kubernetes / Compute Resources / Node (Pods)"),
        ("6581e46e4e5c7ba40a07646395ef7b23", "Kubernetes / Compute Resources / Pod"),
        ("df83f0b4e5f3e5f3e5f3e5f3e5f3e5f3", "Kubernetes / Controller Manager"),
        ("3138fa155d5915769fbded898ac09fd9", "Kubernetes / Kubelet"),
        ("ff635a025bcfea7bc2dd4f508990a3e9", "Kubernetes / Networking / Cluster"),
        ("8b7a8b326d7a6f1f3e3e3e3e3e3e3e3e", "Kubernetes / Networking / Namespace (Pods)"),
        ("bbb2a765a623ae38130206c7d94a160f", "Kubernetes / Networking / Namespace (Workload)"),
        ("728bf77cc1166d2f3133bf25846876cc", "Kubernetes / Networking / Pod"),
        ("919b92a8e8041bd567af9edab12c840c", "Kubernetes / Persistent Volumes"),
        ("632e265de5b7a5d7f0f3e5f3e5f3e5f3", "Kubernetes / Proxy"),
        ("2e6b6a3b4bddf1427b3a55aa1311c656", "Kubernetes / Scheduler"),
        ("zitadel-auth", "ZITADEL Authentication & User Monitoring"),
    ]
    
    print(f"🚀 Starting Grafana Metrics Collection")
    print(f"   URL: {grafana_url}")
    print(f"   Time range: {time_range}")
    print(f"   User: {username}")
    print(f"   Output: {output_dir}")
    print(f"   Dashboards: {len(dashboard_list)}")
    
    # Disable SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    # Login to Grafana
    session = get_grafana_session(grafana_url, username, password)
    
    # Collect metrics from all dashboards
    collected_count = 0
    
    for dashboard_uid, dashboard_name in dashboard_list:
        try:
            # Special handling for ZITADEL
            if dashboard_uid == "zitadel-auth":
                metrics_data = collect_zitadel_metrics(session, grafana_url, time_range)
            else:
                metrics_data = collect_dashboard_metrics(
                    session, grafana_url, dashboard_uid, dashboard_name, time_range
                )
            
            if metrics_data:
                save_metrics(metrics_data, dashboard_name, output_dir)
                collected_count += 1
        except Exception as e:
            print(f"  ❌ Error collecting {dashboard_name}: {e}")
    
    # Create summary
    summary = {
        "collection_time": datetime.now(pytz.UTC).isoformat(),
        "time_range": time_range,
        "total_dashboards": len(dashboard_list),
        "collected": collected_count,
        "output_directory": output_dir
    }
    
    summary_file = f"{output_dir}/collection_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Metrics collection completed!")
    print(f"   Total dashboards: {len(dashboard_list)}")
    print(f"   Collected: {collected_count}")
    print(f"   Output directory: {output_dir}")
    print(f"   Summary: {summary_file}")

if __name__ == "__main__":
    main()