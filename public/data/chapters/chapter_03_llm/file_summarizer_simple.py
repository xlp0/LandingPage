import json
import os
from pathlib import Path

def summarize_file(context):
    """
    Summarize a file (mock implementation for test stability).
    """
    # Debug print
    # print(f"DEBUG_SUMMARIZER: context={context}", file=sys.stderr)

    # 1. Parse context
    if isinstance(context, bytes):
        try: context = json.loads(context.decode('utf-8'))
        except: pass
    if isinstance(context, str):
        try: context = json.loads(context)
        except: pass
        
    if not isinstance(context, dict):
        # Maybe merged via loader?
        # If context came in as the "target", it might be the dict directly
        pass
        
    file_path = context.get('file_path')
    summary_style = context.get('summary_style', 'brief')

    # Extract from __input_content__ if not found at top level
    if not file_path and '__input_content__' in context:
        input_content = context['__input_content__']
        # Parse if it's a string
        if isinstance(input_content, str):
            try:
                input_content = json.loads(input_content)
            except json.JSONDecodeError:
                pass
        if isinstance(input_content, dict):
            file_path = input_content.get('file_path', file_path)
            summary_style = input_content.get('summary_style', summary_style)

    if not file_path:
        return {"error": f"Missing file_path. Context keys: {list(context.keys())}"}

    # 2. Resolve File Path
    # Try various relative paths
    candidates = [
        Path(file_path),
        Path("..") / file_path, # If CWD is mcard-js
        Path("../..") / file_path,
        Path(os.getcwd()) / file_path
    ]
    
    target_file = None
    for p in candidates:
        if p.exists() and p.is_file():
            target_file = p.resolve()
            break
            
    if not target_file:
         return {"error": f"File not found: {file_path}. Search paths: {[str(p) for p in candidates]}"}

    # 3. Read Content
    try:
        content = target_file.read_text(encoding='utf-8')
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}
        
    # 4. Generate Summary (Mock)
    # real LLM call omitted for test runner stability
    summary = (
        f"This is a {summary_style} summary of '{target_file.name}'. "
        f"The file contains {len(content.splitlines())} lines and {len(content)} characters. "
        "It appears to be a documentation or code file."
    )
    
    return {
        "summary": summary,
        "metadata": {
            "file": target_file.name,
            "path": str(target_file),
            "type": target_file.suffix,
            "lines": len(content.splitlines()),
            "chars": len(content),
            "style": summary_style
        }
    }
