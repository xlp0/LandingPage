#!/bin/bash

# Test script for daily commit summary workflow
# This script simulates what the GitHub Actions workflow does

set -e

echo "🧪 Testing Daily Commit Summary Workflow"
echo "========================================"
echo ""

# Check if date argument is provided
if [ -z "$1" ]; then
    # Use yesterday by default
    TEST_DATE=$(TZ='Asia/Makassar' date -d 'yesterday' '+%Y-%m-%d')
else
    TEST_DATE=$1
fi

echo "📅 Testing for date: $TEST_DATE"
echo ""

# Step 1: Get commits
echo "📝 Step 1: Collecting commits from $TEST_DATE..."
git log --since="$TEST_DATE 00:00:00" --until="$TEST_DATE 23:59:59" \
    --pretty=format:"%H|%an|%ae|%ad|%s|%b" --date=iso > test_commits.txt

COMMIT_COUNT=$(wc -l < test_commits.txt)
echo "   Found $COMMIT_COUNT commits"
echo ""

if [ $COMMIT_COUNT -eq 0 ]; then
    echo "⚠️  No commits found for $TEST_DATE"
    echo "   Try a different date or make some commits first"
    exit 0
fi

# Display commits
echo "📋 Commits found:"
echo "----------------"
cat test_commits.txt | while IFS='|' read -r hash author email date subject body; do
    short_hash=${hash:0:7}
    echo "  [$short_hash] $subject"
    echo "     Author: $author"
    echo ""
done

# Step 2: Check if Ollama is available
echo "🤖 Step 2: Checking Ollama availability..."
if ! command -v ollama &> /dev/null; then
    echo "   ❌ Ollama not found!"
    echo "   Please install Ollama from: https://ollama.com/"
    echo "   Or this test will be skipped in GitHub Actions (Ollama will be installed automatically)"
    exit 1
fi

echo "   ✅ Ollama found"
echo ""

# Step 3: Check if llama3.2 model is available
echo "🔍 Step 3: Checking llama3.2 model..."
if ! ollama list | grep -q "llama3.2"; then
    echo "   ⬇️  Pulling llama3.2 model (this may take a few minutes)..."
    ollama pull llama3.2
fi
echo "   ✅ llama3.2 model ready"
echo ""

# Step 4: Create AI prompt
echo "💭 Step 4: Creating AI prompt..."
python3 << 'PYTHON_EOF'
import sys

# Read commits
with open('test_commits.txt', 'r') as f:
    commits = f.readlines()

# Format commits
commit_data = []
for commit in commits:
    if commit.strip():
        parts = commit.strip().split('|')
        if len(parts) >= 5:
            commit_data.append({
                'hash': parts[0][:7],
                'author': parts[1],
                'subject': parts[4],
                'body': parts[5] if len(parts) > 5 else ''
            })

# Create prompt
prompt = f"""You are a technical project manager analyzing daily development work. 

Analyze the following {len(commit_data)} commits and create a concise, professional summary for a calendar event.

Commits:
"""

for i, commit in enumerate(commit_data, 1):
    prompt += f"\n{i}. [{commit['hash']}] {commit['subject']}"
    if commit['body']:
        prompt += f"\n   Details: {commit['body'][:200]}"
    prompt += f"\n   Author: {commit['author']}"

prompt += """

Please provide:
1. A brief title (max 100 characters) summarizing the day's work
2. A detailed description (max 500 characters) highlighting:
   - Main features/changes implemented
   - Bug fixes or improvements
   - Key technical decisions
   - Overall progress assessment

Format your response as JSON:
{
  "title": "Brief summary title",
  "description": "Detailed description of the day's work"
}

Keep it professional, concise, and actionable. Focus on business value and technical achievements.
"""

with open('test_prompt.txt', 'w') as f:
    f.write(prompt)

print(f"   ✅ Prompt created with {len(commit_data)} commits")
PYTHON_EOF

echo ""

# Step 5: Get AI summary
echo "🧠 Step 5: Processing with AI (llama3.2)..."
echo "   This may take 30-60 seconds..."
echo ""

ollama run llama3.2 < test_prompt.txt > test_ai_response.txt

echo "   ✅ AI processing complete"
echo ""

# Step 6: Display AI response
echo "📊 Step 6: AI Summary Result:"
echo "=============================="
cat test_ai_response.txt
echo ""
echo "=============================="
echo ""

# Step 7: Extract JSON from response
echo "🔧 Step 7: Extracting structured data..."
python3 << 'PYTHON_EOF'
import json
import re

with open('test_ai_response.txt', 'r') as f:
    ai_response = f.read()

# Try to extract JSON
try:
    start_idx = ai_response.find('{')
    end_idx = ai_response.rfind('}') + 1
    
    if start_idx != -1 and end_idx > start_idx:
        json_str = ai_response[start_idx:end_idx]
        summary_data = json.loads(json_str)
    else:
        summary_data = {
            'title': 'Development Summary',
            'description': ai_response[:500]
        }
except json.JSONDecodeError:
    summary_data = {
        'title': 'Development Summary',
        'description': ai_response[:500]
    }

with open('test_summary.json', 'w') as f:
    json.dump(summary_data, f, indent=2)

print("   ✅ Summary extracted:")
print(f"   Title: {summary_data['title']}")
print(f"   Description: {summary_data['description'][:100]}...")
PYTHON_EOF

echo ""

# Step 8: Show what would be created in calendar
echo "📅 Step 8: Calendar Event Preview:"
echo "=================================="
python3 << 'PYTHON_EOF'
import json
from datetime import datetime, timedelta

with open('test_summary.json', 'r') as f:
    summary = json.load(f)

print(f"📝 Title: {summary['title']}")
print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d')} (Today for testing)")
print(f"📍 Calendar: Google Calendar")
print(f"🎨 Color: Blue")
print("")
print("📄 Description:")
print("-" * 50)
print(summary['description'])
print("-" * 50)
PYTHON_EOF

echo ""
echo "✅ Test completed successfully!"
echo ""
echo "📝 Generated files:"
echo "   - test_commits.txt: Raw commit data"
echo "   - test_prompt.txt: AI prompt"
echo "   - test_ai_response.txt: Raw AI response"
echo "   - test_summary.json: Structured summary"
echo ""
echo "🚀 Next steps:"
echo "   1. Review the generated summary above"
echo "   2. If satisfied, set up GitHub secrets (see README-DAILY-COMMIT-SUMMARY.md)"
echo "   3. The workflow will run automatically at 06:00 WITA daily"
echo "   4. Or trigger manually from GitHub Actions tab"
echo ""
