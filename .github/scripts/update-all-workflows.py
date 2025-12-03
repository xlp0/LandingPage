#!/usr/bin/env python3
"""
Script to update all CLM test workflows to use the shared push-test-results.sh script
"""

import os
import re
from pathlib import Path

# Component mapping
COMPONENTS = [
    ("welcome", "Welcome Component"),
    ("hero-content", "Hero Content"),
    ("p2p-status", "P2P Status Panel"),
    ("wikipedia-viewer", "Wikipedia Knowledge Base"),
    ("user-list", "User Account List"),
    ("user-detail", "User Account Detail"),
    ("redux-state-viewer", "Redux Store Monitor"),
    ("wikipedia-search", "Wikipedia Search"),
    ("external-site-demo", "External Website Demo"),
    ("google-maps", "Google Maps"),
    ("pkc-viewer", "PKC Document Viewer"),
    ("grafana-faro", "Grafana Faro - Real User Monitoring"),
]

def update_workflow(component_hash, component_name):
    """Update a single workflow file"""
    workflow_file = Path(f".github/workflows/clm-test-{component_hash}.yml")
    
    if not workflow_file.exists():
        print(f"⚠️  Workflow not found: {workflow_file}")
        return False
    
    content = workflow_file.read_text()
    
    # Pattern to match the old commit and push steps
    old_pattern = r'    - name: Commit results.*?branch: \$\{\{ github\.ref \}\}'
    
    # New content using the script
    new_content = f'''    - name: Commit and Push results
      if: always()
      run: |
        chmod +x .github/scripts/push-test-results.sh
        .github/scripts/push-test-results.sh \\
          "{component_hash}" \\
          "${{{{ github.run_number }}}}" \\
          "${{{{ secrets.GITHUB_TOKEN }}}}" \\
          "${{{{ github.repository }}}}" \\
          "${{{{ github.ref }}}}"'''
    
    # Replace the pattern
    updated_content = re.sub(old_pattern, new_content, content, flags=re.DOTALL)
    
    if updated_content != content:
        workflow_file.write_text(updated_content)
        print(f"✅ Updated: {workflow_file}")
        return True
    else:
        print(f"ℹ️  No changes needed: {workflow_file}")
        return False

def main():
    """Main function"""
    print("🔧 Updating all CLM test workflows...\n")
    
    os.chdir(Path(__file__).parent.parent.parent)
    
    updated_count = 0
    for component_hash, component_name in COMPONENTS:
        if update_workflow(component_hash, component_name):
            updated_count += 1
    
    print(f"\n✨ Updated {updated_count} workflow files")

if __name__ == "__main__":
    main()
