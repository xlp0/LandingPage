#!/usr/bin/env python3
"""
Process daily commits, separate by user, and generate reports with Ollama LLM.
"""
import subprocess
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# User mappings
USERS = {
    'Henry Koo': 'githubhenrykoo',
    'Alessandro Rumampuk': 'alessandrorumampuk'
}

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

def generate_llm_prompt(user_name, commits):
    """Generate prompt for Ollama LLM to analyze commits."""
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

Please provide a detailed analysis in the following structure:

1. **Summary**: Provide 5-10 bullet points summarizing what was accomplished. Focus on:
   - Features implemented
   - Bug fixes
   - Code improvements
   - Technical decisions made

2. **Suggestions**: Provide 5-10 bullet points with constructive suggestions for:
   - Code quality improvements
   - Better practices that could be applied
   - Potential optimizations
   - Areas that need attention

3. **Critique**: Provide 5-10 bullet points with honest critique about:
   - What could have been done better
   - Potential issues or concerns
   - Code smells or technical debt
   - Areas needing refactoring

4. **Conclusion**: Write 2-3 paragraphs concluding:
   - Overall assessment of the day's work
   - Key achievements
   - Recommendations for next steps
   - Overall productivity and quality assessment

Format your response as JSON with this exact structure:
{
  "summary": ["point 1", "point 2", ...],
  "suggestions": ["point 1", "point 2", ...],
  "critique": ["point 1", "point 2", ...],
  "conclusion": "Your conclusion paragraphs here"
}

Keep it professional, actionable, and specific to the commits provided. Be constructive in critique and suggestions.
"""
    
    return prompt

def call_ollama(prompt):
    """Call Ollama LLM with the prompt and return parsed response."""
    print(f"Calling Ollama llama3.2 for analysis...")
    
    try:
        result = subprocess.run(
            ['ollama', 'run', 'llama3.2'],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        ai_response = result.stdout.strip()
        print(f"AI Response received ({len(ai_response)} chars)")
        
        # Try to extract JSON from response
        start_idx = ai_response.find('{')
        end_idx = ai_response.rfind('}') + 1
        
        if start_idx != -1 and end_idx > start_idx:
            json_str = ai_response[start_idx:end_idx]
            analysis = json.loads(json_str)
            
            # Validate structure
            required_keys = ['summary', 'suggestions', 'critique', 'conclusion']
            if all(key in analysis for key in required_keys):
                return analysis
        
        # Fallback if parsing fails
        print("Warning: Could not parse JSON from LLM response, using fallback")
        return {
            'summary': ['Analysis completed but response format was invalid'],
            'suggestions': ['Review the commits manually for detailed suggestions'],
            'critique': ['Unable to generate detailed critique'],
            'conclusion': ai_response[:500] if ai_response else 'No response from LLM'
        }
        
    except subprocess.TimeoutExpired:
        print("Error: Ollama timeout")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: JSON decode failed - {e}")
        return None
    except Exception as e:
        print(f"Error calling Ollama: {e}")
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
        
        # Generate prompt and call LLM
        prompt = generate_llm_prompt(user_name, user_commits)
        
        # Save prompt for debugging
        prompt_file = output_dir / f"{user_name.lower()}_prompt.txt"
        with open(prompt_file, 'w') as f:
            f.write(prompt)
        print(f"Prompt saved to: {prompt_file}")
        
        # Call Ollama
        analysis = call_ollama(prompt)
        
        if not analysis:
            print(f"Error: Failed to get analysis from LLM for {user_name}")
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
