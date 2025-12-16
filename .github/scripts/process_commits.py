#!/usr/bin/env python3
"""
Process daily commits, separate by user, and generate reports with Google Gemini API.
"""
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field
from google import genai

# User mappings
USERS = {
    'Henry': 'githubhenrykoo',
    'Alessandro': 'alessandrorumampuk'
}

# Pydantic models for structured output
class CommitAnalysis(BaseModel):
    """Structured analysis of daily commits."""
    summary: List[str] = Field(
        description="5-10 bullet points summarizing what was accomplished (features, bug fixes, improvements, technical decisions)"
    )
    suggestions: List[str] = Field(
        description="5-10 constructive suggestions for code quality improvements, better practices, optimizations, and areas needing attention"
    )
    critique: List[str] = Field(
        description="5-10 honest critiques about what could be done better, potential issues, code smells, technical debt, and areas needing refactoring"
    )
    conclusion: str = Field(
        description="2-3 paragraphs concluding the overall assessment, key achievements, recommendations for next steps, and productivity/quality assessment"
    )

def get_commits_by_user(commits_file, username):
    """Filter commits by username from the commits file."""
    user_commits = []
    
    with open(commits_file, 'r') as f:
        for line in f:
            if line.strip():
                parts = line.strip().split('|')
                if len(parts) >= 5:
                    commit_hash = parts[0][:7]
                    author = parts[1]
                    email = parts[2]
                    date = parts[3]
                    subject = parts[4]
                    body = parts[5] if len(parts) > 5 else ''
                    
                    # Check if commit is from the target user
                    if username.lower() in email.lower() or username.lower() in author.lower():
                        user_commits.append({
                            'hash': commit_hash,
                            'author': author,
                            'email': email,
                            'date': date,
                            'subject': subject,
                            'body': body
                        })
    
    return user_commits

def generate_analysis_prompt(user_name, commits):
    """Generate prompt for Google Gemini API to analyze commits."""
    prompt = f"""You are a technical project manager analyzing daily development work for {user_name}.

Analyze the following {len(commits)} commits from yesterday and create a comprehensive professional report.

Commits from {user_name}:
"""
    
    for i, commit in enumerate(commits, 1):
        prompt += f"\n{i}. [{commit['hash']}] {commit['subject']}"
        if commit['body']:
            prompt += f"\n   Details: {commit['body'][:300]}"
        prompt += f"\n   Time: {commit['date']}"
    
    prompt += """

Provide a detailed analysis with:

1. **Summary** (5-10 points): What was accomplished - features implemented, bug fixes, code improvements, technical decisions

2. **Suggestions** (5-10 points): Constructive suggestions for code quality improvements, better practices, optimizations, areas needing attention

3. **Critique** (5-10 points): Honest critique about what could be done better, potential issues, code smells, technical debt, areas needing refactoring

4. **Conclusion** (2-3 paragraphs): Overall assessment of the day's work, key achievements, recommendations for next steps, productivity and quality assessment

Be professional, actionable, and specific to the commits provided. Be constructive in critique and suggestions.
"""
    
    return prompt

def call_gemini_api(prompt):
    """Call Google Gemini API with structured output and return parsed response."""
    print(f"Calling Google Gemini API for analysis...")
    
    try:
        # Get API key from environment
        api_key = os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            print("❌ Error: GOOGLE_API_KEY environment variable not set")
            return None
        
        # Initialize Gemini client
        client = genai.Client(api_key=api_key)
        
        # Call Gemini with structured output
        print(f"Using model: gemini-2.0-flash-exp")
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_json_schema': CommitAnalysis.model_json_schema(),
            }
        )
        
        # Parse response using Pydantic
        analysis = CommitAnalysis.model_validate_json(response.text)
        
        # Convert to dict for compatibility with rest of code
        analysis_dict = {
            'summary': analysis.summary,
            'suggestions': analysis.suggestions,
            'critique': analysis.critique,
            'conclusion': analysis.conclusion
        }
        
        print(f"✅ Successfully received structured response")
        print(f"   - Summary: {len(analysis.summary)} points")
        print(f"   - Suggestions: {len(analysis.suggestions)} points")
        print(f"   - Critique: {len(analysis.critique)} points")
        print(f"   - Conclusion: {len(analysis.conclusion)} chars")
        
        # Save response for debugging
        debug_file = Path('daily-reports') / 'last_gemini_response.json'
        debug_file.parent.mkdir(exist_ok=True)
        with open(debug_file, 'w') as f:
            json.dump(analysis_dict, f, indent=2)
        print(f"Response saved to: {debug_file}")
        
        return analysis_dict
        
    except Exception as e:
        print(f"❌ Error calling Gemini API: {e}")
        import traceback
        traceback.print_exc()
        return None

def generate_markdown_report(user_name, date_str, commits, analysis):
    """Generate markdown report from analysis."""
    md_content = f"""# Daily Report - {date_str}
**Author:** {user_name}  
**Date:** {date_str}

## Summary

"""
    
    for point in analysis['summary']:
        md_content += f"- {point}\n"
    
    md_content += "\n## Suggestions\n\n"
    
    for point in analysis['suggestions']:
        md_content += f"- {point}\n"
    
    md_content += "\n## Critique\n\n"
    
    for point in analysis['critique']:
        md_content += f"- {point}\n"
    
    md_content += f"\n## Conclusion\n\n{analysis['conclusion']}\n"
    
    return md_content

def main():
    if len(sys.argv) < 2:
        print("Usage: process_commits.py <commits_file>")
        sys.exit(1)
    
    commits_file = sys.argv[1]
    
    if not os.path.exists(commits_file):
        print(f"Error: Commits file not found: {commits_file}")
        sys.exit(1)
    
    # Get yesterday's date
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    
    # Create output directory
    output_dir = Path('daily-reports')
    output_dir.mkdir(exist_ok=True)
    
    results = {}
    
    # Process each user
    for user_name, username in USERS.items():
        print(f"\n{'='*60}")
        print(f"Processing commits for {user_name} ({username})")
        print(f"{'='*60}")
        
        # Get user's commits
        user_commits = get_commits_by_user(commits_file, username)
        
        if not user_commits:
            print(f"No commits found for {user_name}")
            results[user_name] = {
                'commit_count': 0,
                'has_commits': False,
                'markdown_file': None,
                'analysis': None
            }
            continue
        
        print(f"Found {len(user_commits)} commits for {user_name}")
        
        # Generate prompt and call Gemini API
        prompt = generate_analysis_prompt(user_name, user_commits)
        
        # Save prompt for debugging
        prompt_file = output_dir / f"{user_name.lower()}_prompt.txt"
        with open(prompt_file, 'w') as f:
            f.write(prompt)
        print(f"Prompt saved to: {prompt_file}")
        
        # Call Gemini API
        analysis = call_gemini_api(prompt)
        
        if not analysis:
            print(f"Error: Failed to get analysis from Gemini API for {user_name}")
            results[user_name] = {
                'commit_count': len(user_commits),
                'has_commits': True,
                'markdown_file': None,
                'analysis': None
            }
            continue
        
        # Generate markdown report
        markdown_content = generate_markdown_report(user_name, yesterday, user_commits, analysis)
        
        # Save markdown file
        markdown_file = output_dir / f"{user_name.lower()}_{yesterday}.md"
        with open(markdown_file, 'w') as f:
            f.write(markdown_content)
        print(f"Markdown report saved to: {markdown_file}")
        
        # Save analysis as JSON
        analysis_file = output_dir / f"{user_name.lower()}_analysis.json"
        with open(analysis_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        # Store results
        results[user_name] = {
            'commit_count': len(user_commits),
            'has_commits': True,
            'markdown_file': str(markdown_file),
            'analysis_file': str(analysis_file),
            'analysis': analysis
        }
        
        print(f"✅ Processing complete for {user_name}")
    
    # Save overall results
    results_file = output_dir / 'processing_results.json'
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"All processing complete. Results saved to: {results_file}")
    print(f"{'='*60}")
    
    # Output summary
    for user_name, result in results.items():
        if result['has_commits']:
            print(f"{user_name}: {result['commit_count']} commits processed ✅")
        else:
            print(f"{user_name}: No commits found ⚠️")

if __name__ == '__main__':
    main()
