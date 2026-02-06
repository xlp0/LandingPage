#!/usr/bin/env python3
"""
Convert Grafana Metrics JSON to Markdown Reports
Generates readable Markdown reports from collected Grafana metrics
"""

import os
import sys
import json
import glob
from datetime import datetime
from pathlib import Path
import pytz

def load_json_data(json_file):
    """Load metrics JSON file"""
    try:
        with open(json_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Failed to load {json_file}: {e}")
        return None

def format_number(num):
    """Format number with K/M suffix for readability"""
    if num >= 1_000_000:
        return f"{num/1_000_000:.2f}M"
    elif num >= 1000:
        return f"{num/1000:.2f}K"
    return str(int(num))

def format_bytes(bytes_val):
    """Format bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} PB"

def format_percentage(value):
    """Format value as percentage"""
    return f"{value * 100:.2f}%"

def get_metric_value(metric_data, index=-1):
    """Extract value from Prometheus metric data"""
    if not metric_data or not metric_data.get('result'):
        return None
    
    for result in metric_data['result']:
        if 'values' in result and result['values']:
            try:
                return float(result['values'][index][1])
            except (IndexError, ValueError):
                pass
        elif 'value' in result:
            try:
                return float(result['value'][1])
            except (IndexError, ValueError):
                pass
    
    return None

def get_metric_series(metric_data):
    """Extract time series from Prometheus metric data"""
    if not metric_data or not metric_data.get('result'):
        return []
    
    series = []
    for result in metric_data['result']:
        if 'values' in result and result['values']:
            series.append({
                'metric': result.get('metric', {}),
                'values': result['values']
            })
        elif 'value' in result:
            series.append({
                'metric': result.get('metric', {}),
                'values': [result['value']]
            })
    
    return series

def calculate_stats(values):
    """Calculate min, max, avg from values"""
    if not values:
        return {'min': 0, 'max': 0, 'avg': 0, 'current': 0}
    
    numeric_values = [float(v) for v in values if v is not None]
    if not numeric_values:
        return {'min': 0, 'max': 0, 'avg': 0, 'current': 0}
    
    return {
        'min': min(numeric_values),
        'max': max(numeric_values),
        'avg': sum(numeric_values) / len(numeric_values),
        'current': numeric_values[-1]
    }

def generate_kubernetes_report(data, output_file):
    """Generate Markdown report for Kubernetes metrics"""
    
    dashboard_name = data.get('source', 'Kubernetes Dashboard')
    timestamp = data.get('timestamp', '')
    time_range = data.get('time_range', '24h')
    metrics = data.get('metrics', {})
    
    # Parse timestamp
    try:
        wita_tz = pytz.timezone('Asia/Makassar')
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone(wita_tz)
        date_str = dt.strftime('%Y-%m-%d')
        time_str = dt.strftime('%H:%M:%S %Z')
    except:
        date_str = 'N/A'
        time_str = 'N/A'
    
    # Start building report
    report = f"""# {dashboard_name}

**Collection Date:** {date_str}  
**Collection Time:** {time_str}  
**Time Range:** {time_range}  
**Dashboard UID:** {data.get('dashboard', 'N/A')}

---

## 📊 Metrics Summary

"""
    
    # Count available metrics
    available_metrics = sum(1 for m in metrics.values() if m is not None)
    total_metrics = len(metrics)
    
    report += f"- **Total Metrics Collected:** {available_metrics}/{total_metrics}\n"
    report += f"- **Collection Status:** {'✅ Complete' if available_metrics == total_metrics else '⚠️ Partial'}\n\n"
    
    # Group metrics by category
    report += "## 📈 Metric Details\n\n"
    
    metric_count = 0
    for metric_name, metric_data in metrics.items():
        if metric_data is None:
            continue
        
        metric_count += 1
        value = get_metric_value(metric_data)
        
        if value is not None:
            # Format based on metric name
            if 'bytes' in metric_name.lower() or 'memory' in metric_name.lower():
                formatted_value = format_bytes(value)
            elif 'percentage' in metric_name.lower() or 'ratio' in metric_name.lower():
                formatted_value = format_percentage(value)
            elif value > 1000:
                formatted_value = format_number(value)
            else:
                formatted_value = f"{value:.2f}"
            
            report += f"### {metric_count}. {metric_name.replace('_', ' ').title()}\n\n"
            report += f"- **Current Value:** {formatted_value}\n"
            
            # Get time series for stats
            series = get_metric_series(metric_data)
            if series:
                all_values = []
                for s in series:
                    all_values.extend([float(v[1]) for v in s['values']])
                
                if all_values:
                    stats = calculate_stats(all_values)
                    min_val = format_number(stats['min']) if stats['min'] > 1000 else f"{stats['min']:.2f}"
                    max_val = format_number(stats['max']) if stats['max'] > 1000 else f"{stats['max']:.2f}"
                    avg_val = format_number(stats['avg']) if stats['avg'] > 1000 else f"{stats['avg']:.2f}"
                    report += f"- **Min:** {min_val}\n"
                    report += f"- **Max:** {max_val}\n"
                    report += f"- **Avg:** {avg_val}\n"
            
            report += "\n"
    
    if metric_count == 0:
        report += "*No metric data available*\n\n"
    
    # Footer
    report += "---\n\n"
    report += f"*Report generated on {datetime.now(wita_tz).strftime('%Y-%m-%d %H:%M:%S %Z')}*\n"
    
    # Write to file
    with open(output_file, 'w') as f:
        f.write(report)
    
    return True

def generate_generic_report(data, output_file):
    """Generate generic Markdown report for any dashboard"""
    return generate_kubernetes_report(data, output_file)

def convert_json_to_markdown(json_file):
    """Convert a single JSON file to Markdown"""
    
    # Load JSON data
    data = load_json_data(json_file)
    if not data:
        return False
    
    # Determine output filename
    output_file = json_file.replace('.json', '.md')
    
    # Get dashboard source
    source = data.get('source', '').lower()
    
    # Generate appropriate report
    try:
        if 'zitadel' in source:
            # ZITADEL has its own specialized generator
            print(f"  ℹ️  Skipping {json_file} - ZITADEL has dedicated generator")
            return False
        else:
            # Use generic generator for all other dashboards
            success = generate_generic_report(data, output_file)
            
            if success:
                print(f"  ✅ Generated: {output_file}")
                return True
            else:
                print(f"  ❌ Failed to generate: {output_file}")
                return False
    
    except Exception as e:
        print(f"  ❌ Error generating report for {json_file}: {e}")
        return False

def main():
    """Main function to convert all JSON files in metrics directory"""
    
    metrics_dir = "grafana-metrics"
    
    if len(sys.argv) > 1:
        metrics_dir = sys.argv[1]
    
    if not os.path.exists(metrics_dir):
        print(f"❌ Metrics directory not found: {metrics_dir}")
        sys.exit(1)
    
    print(f"🚀 Converting Grafana metrics to Markdown")
    print(f"   Directory: {metrics_dir}")
    
    # Find all JSON files (excluding summary and ZITADEL files)
    json_files = glob.glob(f"{metrics_dir}/*.json")
    
    # Exclude specific files
    exclude_patterns = ['summary', 'upload_results', 'zitadel']
    json_files = [
        f for f in json_files 
        if not any(pattern in os.path.basename(f).lower() for pattern in exclude_patterns)
    ]
    
    if not json_files:
        print("⚠️  No JSON files found to convert")
        sys.exit(0)
    
    print(f"\n📄 Found {len(json_files)} JSON files to convert")
    
    # Convert each file
    converted_count = 0
    failed_count = 0
    
    for json_file in sorted(json_files):
        filename = os.path.basename(json_file)
        print(f"\n📊 Processing: {filename}")
        
        if convert_json_to_markdown(json_file):
            converted_count += 1
        else:
            failed_count += 1
    
    # Summary
    print(f"\n✅ Conversion completed!")
    print(f"   Converted: {converted_count}")
    print(f"   Failed: {failed_count}")
    print(f"   Total: {len(json_files)}")

if __name__ == "__main__":
    main()
