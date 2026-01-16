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

def get_datasource_uid(session, base_url, datasource_name='prometheus'):
    """Get datasource UID by name"""
    url = f"{base_url}/api/datasources/name/{datasource_name}"
    
    try:
        response = session.get(url)
        response.raise_for_status()
        data = response.json()
        return data.get('uid')
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Failed to get datasource UID for '{datasource_name}': {e}")
        return None

def query_prometheus_via_grafana(session, base_url, query, time_range='1h', datasource_uid=None):
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
    
    # Use datasource UID if provided, otherwise use name-based proxy
    if datasource_uid:
        url = f"{base_url}/api/datasources/uid/{datasource_uid}/resources/api/v1/query_range"
    else:
        url = f"{base_url}/api/datasources/proxy/uid/prometheus/api/v1/query_range"
    
    params = {
        'query': query,
        'start': int(start_time.timestamp()),
        'end': int(now.timestamp()),
        'step': '3600s'  # 1 hour resolution
    }
    
    try:
        response = session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Query failed: {query[:50]}... - {e}")
        return None

def get_dashboard_panels(session, base_url, dashboard_uid):
    """Get all panels from a dashboard"""
    url = f"{base_url}/api/dashboards/uid/{dashboard_uid}"
    
    try:
        response = session.get(url)
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
        expr = target.get('expr')
        if expr:
            queries.append({
                'expr': expr,
                'refId': target.get('refId', 'A'),
                'legendFormat': target.get('legendFormat', '')
            })
    
    return queries

def collect_dashboard_metrics(session, base_url, dashboard_uid, dashboard_name, time_range, datasource_uid=None):
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
            result = query_prometheus_via_grafana(session, base_url, query, time_range, datasource_uid)
            
            if result and result.get('status') == 'success':
                metrics_data["metrics"][metric_key] = result.get('data', {})
                print(f"      ✅ Collected")
            else:
                metrics_data["metrics"][metric_key] = None
                print(f"      ⚠️  No data")
    
    return metrics_data

def collect_zitadel_metrics(session, base_url, time_range, datasource_uid=None):
    """Collect ZITADEL authentication and user monitoring metrics"""
    
    print(f"\n📊 Collecting ZITADEL metrics")
    
    # Common ZITADEL metrics to collect
    queries = {
        "active_sessions": 'zitadel_active_sessions_total',
        "failed_logins": 'rate(zitadel_failed_auth_requests_total[1h])',
        "successful_logins": 'rate(zitadel_successful_auth_requests_total[1h])',
        "active_users": 'zitadel_active_users_total',
        "registered_users": 'zitadel_users_total',
        "auth_requests": 'rate(zitadel_auth_requests_total[1h])',
        "token_requests": 'rate(zitadel_token_requests_total[1h])',
        "api_calls": 'rate(zitadel_api_calls_total[1h])',
        "database_connections": 'zitadel_database_connections',
        "cache_hit_rate": 'rate(zitadel_cache_hits_total[1h]) / rate(zitadel_cache_requests_total[1h])',
        # Authentication Events (specific event types) - using correct metric name
        "event_oidc_session_access_token_added": 'zitadel_auth_events_total{event_type="oidc_session.access_token.added"}',
        "event_oidc_session_added": 'zitadel_auth_events_total{event_type="oidc_session.added"}',
        "event_user_human_externallogin_check_succeeded": 'zitadel_auth_events_total{event_type="user.human.externallogin.check.succeeded"}',
        "event_user_human_mfa_init_skipped": 'zitadel_auth_events_total{event_type="user.human.mfa.init.skipped"}',
        "event_user_human_mfa_otp_added": 'zitadel_auth_events_total{event_type="user.human.mfa.otp.added"}',
        "event_user_human_password_check_succeeded": 'zitadel_auth_events_total{event_type="user.human.password.check.succeeded"}',
        "event_user_token_v2_added": 'zitadel_auth_events_total{event_type="user.token.v2.added"}',
        # All authentication events aggregated by event type
        "authentication_events_by_type": 'zitadel_auth_events_total',
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
        result = query_prometheus_via_grafana(session, base_url, query, time_range, datasource_uid)
        
        if result and result.get('status') == 'success':
            metrics_data["metrics"][metric_name] = result.get('data', {})
            print(f"    ✅ Collected {metric_name}")
        else:
            metrics_data["metrics"][metric_name] = None
            print(f"    ⚠️  No data for {metric_name}")
    
    return metrics_data

def save_metrics(metrics_data, dashboard_name, output_dir="grafana-metrics"):
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
    # Get environment variables
    grafana_url = os.getenv('GRAFANA_URL', 'https://grafana.pkc.pub')
    username = os.getenv('GRAFANA_USERNAME', 'admin')
    password = os.getenv('GRAFANA_PASSWORD')
    time_range = os.getenv('TIME_RANGE', '24h')
    output_dir = os.getenv('OUTPUT_DIR', 'grafana-metrics')
    
    if not password:
        print("❌ GRAFANA_PASSWORD environment variable not set")
        sys.exit(1)
    
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
    
    print(f"🚀 Starting Grafana metrics collection")
    print(f"   URL: {grafana_url}")
    print(f"   Time range: {time_range}")
    print(f"   User: {username}")
    print(f"   Output: {output_dir}")
    print(f"   Dashboards: {len(dashboard_list)}")
    
    # Login to Grafana
    session = get_grafana_session(grafana_url, username, password)
    
    # Get Prometheus datasource UID
    print(f"\n🔍 Getting Prometheus datasource UID...")
    datasource_uid = get_datasource_uid(session, grafana_url, 'prometheus')
    if datasource_uid:
        print(f"   ✅ Found Prometheus datasource: {datasource_uid}")
    else:
        print(f"   ⚠️  Could not find Prometheus datasource, will use default proxy")
    
    # Collect metrics from all dashboards
    collected_count = 0
    total_metrics = 0
    
    for dashboard_uid, dashboard_name in dashboard_list:
        try:
            # Special handling for ZITADEL
            if dashboard_uid == "zitadel-auth":
                metrics_data = collect_zitadel_metrics(session, grafana_url, time_range, datasource_uid)
            else:
                metrics_data = collect_dashboard_metrics(
                    session, grafana_url, dashboard_uid, dashboard_name, time_range, datasource_uid
                )
            
            if metrics_data:
                save_metrics(metrics_data, dashboard_name, output_dir)
                collected_count += 1
                total_metrics += len([m for m in metrics_data["metrics"].values() if m is not None])
        except Exception as e:
            print(f"  ❌ Error collecting {dashboard_name}: {e}")
    
    # Create summary
    summary = {
        "collection_time": datetime.now(pytz.UTC).isoformat(),
        "time_range": time_range,
        "total_dashboards": len(dashboard_list),
        "collected": collected_count,
        "total_metrics": total_metrics,
        "output_directory": output_dir
    }
    
    summary_file = f"{output_dir}/latest_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Metrics collection completed!")
    print(f"   Total dashboards: {len(dashboard_list)}")
    print(f"   Collected: {collected_count}")
    print(f"   Total metrics: {total_metrics}")
    print(f"   Summary: {summary_file}")

if __name__ == "__main__":
    main()
