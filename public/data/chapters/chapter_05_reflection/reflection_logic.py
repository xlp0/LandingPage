
import os
import yaml
from typing import Dict, Any, List
from pathlib import Path

# Static configuration for paths
CHAPTERS_ROOT = Path("chapters")

def _scan_clms(root_dir: Path = CHAPTERS_ROOT) -> List[Dict[str, Any]]:
    """Recursively scan all CLM/YAML files in the chapters directory."""
    clm_files = []
    
    # Ensure root_dir is absolute or relative to cwd correctly
    if not root_dir.exists():
        # Try finding it relative to project root if we are running from elsewhere
        root_dir = Path.cwd() / "chapters"
        
    for p in root_dir.rglob("*"):
        if p.suffix in ['.clm', '.yaml', '.yml'] and p.is_file():
            # Skip test_data and hidden files
            if "test_data" in str(p) or p.name.startswith("."):
                continue
                
            try:
                with open(p, 'r') as f:
                    data = yaml.safe_load(f)
                    if not data: continue
                    
                    # Normalize structure
                    entry = {
                        "path": str(p),
                        "filename": p.name,
                        "type": "Unknown"
                    }
                    
                    if 'chapter' in data:
                        entry["type"] = "Chapter"
                        entry["id"] = data['chapter'].get('id', 0)
                        entry["title"] = data['chapter'].get('title', 'Untitled')
                        entry["mvp_card"] = data['chapter'].get('mvp_card', 'Unknown')
                        entry["clm"] = data.get('clm', {})
                    elif 'clm' in data:
                         entry["type"] = "Hybrid"
                         entry["clm"] = data['clm']
                    else:
                        entry["type"] = "PCard"
                        # Flat structure check
                        if 'abstract' in data and 'concrete' in data:
                            entry["clm"] = {
                                "abstract": data.get("abstract"),
                                "concrete": data.get("concrete"),
                                "balanced": data.get("balanced")
                            }
                    
                    clm_files.append(entry)
            except Exception as e:
                print(f"Error parsing {p}: {e}")
                
    return clm_files

def generate_inventory(context: Dict) -> Dict:
    """Generate a structured inventory of all discovered CLMs."""
    items = _scan_clms()
    
    # Sort by ID (if Chapter) then by Path
    # Handle mixed id types (some are int, some are str like "4.2")
    def sort_key(x):
        raw_id = x.get("id", 999)
        # Convert to float for sorting if possible, otherwise use 999
        try:
            numeric_id = float(raw_id)
        except (ValueError, TypeError):
            numeric_id = 999
        return (numeric_id, x["path"])
    
    items.sort(key=sort_key)
    
    return {
        "total_files": len(items),
        "inventory": items
    }

def audit_runtimes(context: Dict) -> Dict:
    """Analyze runtime distribution across all CLMs."""
    items = _scan_clms()
    stats = {}
    details = {}
    
    for item in items:
        clm = item.get("clm", {})
        concrete = clm.get("concrete", {}) if clm else {}
        runtime = concrete.get("runtime", "Unspecified")
        
        stats[runtime] = stats.get(runtime, 0) + 1
        
        if runtime not in details:
            details[runtime] = []
        details[runtime].append(item["filename"])
        
    return {
        "runtime_distribution": stats,
        "details": details
    }

def weave_narrative(context: Dict) -> Dict:
    """Extract narrative elements to form a cohesive story."""
    items = _scan_clms()
    narrative_arc = []
    
    for item in items:
        if item.get("type") == "Chapter":
            chapter = {
                "id": item.get("id"),
                "title": item.get("title"),
                "archetype": item.get("mvp_card"),
                "concept": item.get("clm", {}).get("abstract", {}).get("concept"),
                "manifestation": item.get("clm", {}).get("concrete", {}).get("manifestation")
            }
            narrative_arc.append(chapter)
            
    # Sort sequence - handle mixed id types
    def sort_key(x):
        raw_id = x.get("id", 999)
        try:
            return float(raw_id)
        except (ValueError, TypeError):
            return 999
    narrative_arc.sort(key=sort_key)
    
    return {
        "prologue_title": "The Prologue of Spacetime",
        "chapters": narrative_arc,
        "theme": "From Discrete Counting to Reflective Metacognition"
    }
