"""
File Summarizer Logic

Reads a file (Markdown or Python) and summarizes it using the LLM runtime.
"""

from pathlib import Path
from typing import Dict, Any

from mcard.ptr.core.llm import chat_monad, LLMConfig


# ─────────────────────────────────────────────────────────────────────────────
# System Prompts by File Type
# ─────────────────────────────────────────────────────────────────────────────

PROMPTS = {
    'markdown': {
        'brief': """You are a document summarizer. Provide a concise 2-3 sentence summary 
of the Markdown document that captures its main purpose and key points.""",
        
        'detailed': """You are a document analyst. Provide a comprehensive summary of the 
Markdown document including:
1. Main purpose/topic
2. Key sections and their content
3. Important conclusions or takeaways""",
        
        'bullet_points': """You are a document summarizer. Summarize the Markdown document 
as 5-7 bullet points covering the main topics and key information.""",
    },
    
    'python': {
        'brief': """You are a code summarizer. Provide a concise 2-3 sentence summary 
of what this Python code does, its main purpose, and key functionality.""",
        
        'detailed': """You are a code analyst. Provide a comprehensive summary of 
this Python code including:
1. Main purpose and functionality
2. Key classes/functions and what they do
3. Dependencies and external interfaces
4. Notable patterns or architecture""",
        
        'bullet_points': """You are a code summarizer. Summarize this Python code 
as 5-7 bullet points covering:
- Main purpose
- Key functions/classes
- Important logic
- Dependencies""",
    }
}


# ─────────────────────────────────────────────────────────────────────────────
# Main Logic
# ─────────────────────────────────────────────────────────────────────────────

def summarize_file(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summarize a file using the LLM.
    
    Args:
        context: Dictionary with:
            - file_path: Path to the file
            - summary_style: 'brief', 'detailed', or 'bullet_points'
            - model: Optional model override
            
    Returns:
        Dictionary with summary and metadata
    """
    file_path = context.get('file_path')
    summary_style = context.get('summary_style', 'brief')
    model = context.get('model', 'gemma3:latest')
    
    if not file_path:
        return {'error': 'No file_path provided in context'}
    
    # Resolve path
    path = Path(file_path)
    if not path.is_absolute():
        # Try relative to cwd first
        if not path.exists():
            # Try relative to project root
            project_root = Path(__file__).parent.parent.parent.parent
            path = project_root / file_path
    
    if not path.exists():
        return {'error': f'File not found: {file_path}'}
    
    # Determine file type
    suffix = path.suffix.lower()
    if suffix == '.md':
        file_type = 'markdown'
    elif suffix == '.py':
        file_type = 'python'
    else:
        return {'error': f'Unsupported file type: {suffix}. Use .md or .py'}
    
    # Read file content
    try:
        content = path.read_text(encoding='utf-8')
    except Exception as e:
        return {'error': f'Failed to read file: {e}'}
    
    # Truncate if too long (keep first ~8000 chars for context window)
    max_chars = 8000
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars] + "\n\n[... content truncated ...]"
    
    # Get appropriate system prompt
    if summary_style not in PROMPTS[file_type]:
        summary_style = 'brief'
    system_prompt = PROMPTS[file_type][summary_style]
    
    # Call LLM
    result = chat_monad(
        prompt=f"Please summarize the following {file_type} file:\n\n---\n{content}\n---",
        system_prompt=system_prompt,
        model=model,
        temperature=0.3,
        max_tokens=1000
    ).unsafe_run()
    
    if result.is_left():
        return {'error': result.value}
    
    summary = result.value.get('content', str(result.value))
    
    # Build response
    return {
        'summary': summary,
        'metadata': {
            'file': path.name,
            'path': str(path),
            'type': file_type,
            'lines': content.count('\n') + 1,
            'chars': len(content),
            'truncated': truncated,
            'style': summary_style,
            'model': model
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLI Entry Point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python file_summarizer_logic.py <file_path> [style]")
        print("  style: brief (default), detailed, bullet_points")
        sys.exit(1)
    
    file_path = sys.argv[1]
    style = sys.argv[2] if len(sys.argv) > 2 else 'brief'
    
    print(f"📄 Summarizing: {file_path}")
    print(f"📝 Style: {style}")
    print("-" * 60)
    
    result = summarize_file({
        'file_path': file_path,
        'summary_style': style
    })
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
        sys.exit(1)
    
    print(f"\n📋 Summary:\n{result['summary']}")
    print(f"\n📊 Metadata: {json.dumps(result['metadata'], indent=2)}")
