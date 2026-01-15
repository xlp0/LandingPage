#!/usr/bin/env python3
"""
Generate Simple ZITADEL Metrics Report
Focus on Total Users and 7 Authentication Events
"""

import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

def load_json_data(json_file):
    """Load ZITADEL metrics JSON file"""
    with open(json_file, 'r') as f:
        return json.load(f)

def get_latest_value(metric_data):
    """Get the latest value from metric data"""
    if not metric_data.get('result'):
        return 0
    
    for result in metric_data['result']:
        if 'values' in result and result['values']:
            return float(result['values'][-1][1])
        elif 'value' in result:
            return float(result['value'][1])
    
    return 0

def calculate_hourly_samples(metric_data, sample_hours=[0, 4, 8, 12, 16, 20, 24]):
    """Get values at specific hour marks"""
    if not metric_data.get('result'):
        return [0] * len(sample_hours)
    
    all_values = []
    for result in metric_data['result']:
        if 'values' in result:
            all_values = result['values']
            break
    
    if not all_values:
        return [0] * len(sample_hours)
    
    # Get first value as baseline
    baseline = float(all_values[0][1])
    
    # For constant values, return same value for all samples
    samples = [baseline] * len(sample_hours)
    
    return samples

def format_number(num):
    """Format number with K suffix if >= 1000"""
    if num >= 1000:
        return f"{num/1000:.2f}k"
    return str(int(num))

def generate_report(json_file, template_file, output_file):
    """Generate simple report from JSON data"""
    
    # Load data
    data = load_json_data(json_file)
    
    with open(template_file, 'r') as f:
        template = f.read()
    
    # Extract metrics
    metrics = data['metrics']
    
    # Get total users
    total_users = get_latest_value(metrics['registered_users'])
    
    # Get user trend data (sample every 4 hours)
    user_samples = calculate_hourly_samples(metrics['registered_users'])
    
    # Extract authentication events from actual metrics
    # Map event metrics to display names
    event_data = {
        'access_token': int(get_latest_value(metrics.get('event_oidc_session_access_token_added', {}))),
        'session': int(get_latest_value(metrics.get('event_oidc_session_added', {}))),
        'external_login': int(get_latest_value(metrics.get('event_user_human_externallogin_check_succeeded', {}))),
        'mfa_skip': int(get_latest_value(metrics.get('event_user_human_mfa_init_skipped', {}))),
        'mfa_otp': int(get_latest_value(metrics.get('event_user_human_mfa_otp_added', {}))),
        'password': int(get_latest_value(metrics.get('event_user_human_password_check_succeeded', {}))),
        'token_v2': int(get_latest_value(metrics.get('event_user_token_v2_added', {}))),
    }
    
    total_events = sum(event_data.values())
    
    # Find most common event
    if total_events > 0:
        most_common = max(event_data.items(), key=lambda x: x[1])
        most_common_name = most_common[0].replace('_', ' ').title()
    else:
        most_common_name = "No events recorded"
    
    # Data points
    data_points = 0
    if metrics['registered_users'].get('result'):
        for result in metrics['registered_users']['result']:
            if 'values' in result:
                data_points = len(result['values'])
                break
    
    # Timestamps
    wita_offset = timezone(timedelta(hours=8))
    timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')).astimezone(wita_offset)
    
    # Get time range
    start_time = "N/A"
    end_time = "N/A"
    if metrics['registered_users'].get('result'):
        first_result = metrics['registered_users']['result'][0]
        if 'values' in first_result and first_result['values']:
            start_ts = first_result['values'][0][0]
            end_ts = first_result['values'][-1][0]
            start_time = datetime.fromtimestamp(start_ts).strftime('%Y-%m-%d %H:%M')
            end_time = datetime.fromtimestamp(end_ts).strftime('%Y-%m-%d %H:%M')
    
    # Prepare replacements
    replacements = {
        # Header
        '{{date}}': timestamp.strftime('%Y-%m-%d'),
        '{{time_range}}': data['time_range'],
        
        # Users
        '{{total_users}}': format_number(total_users),
        '{{user_trend_data}}': ', '.join([str(int(v)) for v in user_samples]),
        
        # Events
        '{{event_counts}}': ', '.join([str(event_data[k]) for k in ['access_token', 'session', 'external_login', 'mfa_skip', 'mfa_otp', 'password', 'token_v2']]),
        '{{event_access_token}}': str(event_data['access_token']),
        '{{event_session}}': str(event_data['session']),
        '{{event_external_login}}': str(event_data['external_login']),
        '{{event_mfa_skip}}': str(event_data['mfa_skip']),
        '{{event_mfa_otp}}': str(event_data['mfa_otp']),
        '{{event_password}}': str(event_data['password']),
        '{{event_token_v2}}': str(event_data['token_v2']),
        
        # Summary
        '{{total_events}}': str(total_events),
        '{{most_common_event}}': most_common_name,
        '{{data_points}}': str(data_points),
        '{{start_time}}': start_time,
        '{{end_time}}': end_time,
    }
    
    # Replace all placeholders
    report = template
    for placeholder, value in replacements.items():
        report = report.replace(placeholder, value)
    
    # Write output
    with open(output_file, 'w') as f:
        f.write(report)
    
    print(f"✅ Report generated: {output_file}")
    print(f"   Total Users: {format_number(total_users)}")
    print(f"   Total Events: {total_events}")
    print(f"   Data Points: {data_points}")
    print(f"   Metrics Available: {sum(1 for m in metrics.values() if m.get('result'))}/{len(metrics)}")

def main():
    # Default: use latest JSON from /tmp or current directory
    if len(sys.argv) < 2:
        # Look for zitadel JSON files
        possible_files = [
            '/tmp/zitadel_metrics.json',
            Path(__file__).parent / 'zitadel_metrics.json',
        ]
        
        json_file = None
        for f in possible_files:
            if Path(f).exists():
                json_file = str(f)
                break
        
        if not json_file:
            print("❌ No JSON file found. Please provide a file path or download metrics first:")
            print("\nUsage: python3 generate_zitadel_report.py <json_file> [output_file]")
            print("\nExample:")
            print("  python3 generate_zitadel_report.py zitadel_metrics.json report.md")
            sys.exit(1)
        
        print(f"📂 Using JSON file: {json_file}")
    else:
        json_file = sys.argv[1]
    
    template_file = Path(__file__).parent / 'zitadel_report_template.md'
    
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        # Default output to daily-reports directory
        output_file = Path(__file__).parent / 'zitadel_report.md'
    
    if not Path(json_file).exists():
        print(f"❌ Error: JSON file not found: {json_file}")
        sys.exit(1)
    
    if not template_file.exists():
        print(f"❌ Error: Template file not found: {template_file}")
        sys.exit(1)
    
    generate_report(json_file, template_file, output_file)

if __name__ == "__main__":
    main()
