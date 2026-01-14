
import os
import time
import random
import logging
from pathlib import Path
from mcard import MCard
from mcard.model.card_collection import CardCollection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_loader_benchmark(target_content=None):
    """Entry point for CLM runtime."""
    # Default parameters (fallback) - use test_data that exists in the project
    params = {
        'source_dir': "chapters/chapter_04_load_dir/test_data",
        'db_path': "data/loader_test.db",
        'retrieval_count': 100,
        'recursive': True
    }
    
    # Override with context parameters if available (CLM injection)
    if 'context' in globals():
        ctx = globals()['context']  # Extract to local var to satisfy linter
        bal = ctx.get('balanced', {})
        
        # Merge input and output arguments from balanced (static) and context (dynamic/test)
        args = {}
        
        # 1. Static defaults from balanced
        args.update(bal.get('input_arguments', {}))
        args.update(bal.get('output_arguments', {}))
        
        # 2. Dynamic overrides from test context
        args.update(ctx.get('input_arguments', {}))
        args.update(ctx.get('output_arguments', {}))
        
        # Also check root of balanced for backward compatibility during transition
        for k, v in bal.items():
            if k not in ['input_arguments', 'output_arguments', 'expected_results']:
                args[k] = v

        for key in params:
            # Check context root (params override), then args (structured), then params (default)
            val = ctx.get(key, args.get(key))
            if val is not None:
                params[key] = val

    return _run_benchmark(**params)

from mcard.rag.vector.store import MCardVectorStore

def _find_project_root():
    """Find the MCard_TDD project root by looking for pyproject.toml."""
    current = Path(__file__).resolve().parent
    for _ in range(10):  # Max 10 levels up
        if (current / "pyproject.toml").exists():
            return current
        current = current.parent
    return Path.cwd()  # Fallback to cwd


def _run_benchmark(source_dir, db_path, retrieval_count, recursive=True):
    """Core benchmark logic."""
    source_path = Path(source_dir)

    # If path doesn't exist, try resolving relative to project root
    if not source_path.exists():
        project_root = _find_project_root()
        source_path = project_root / source_dir
        if not source_path.exists():
            raise FileNotFoundError(f"Source not found: {source_dir} (tried {source_path})")

    # clean slate
    db_file = Path(db_path)
    if db_file.exists():
        try: os.remove(db_file)
        except OSError: pass
    else:
        db_file.parent.mkdir(parents=True, exist_ok=True)

    # Initialize collections
    collection = CardCollection(db_path=db_path)
    vector_store = MCardVectorStore(db_path=db_path)
    
    # 1. Load (Triadic: MCard + Handle + Vector)
    # Refactored to use mcard.file_io for standardized loading
    from mcard.file_io import list_files, process_file_content
    
    # Discovery
    t0 = time.time()
    files = list_files(source_path, recursive=recursive)
    total = len(files)
    total_bytes = 0
    hashes = []
    
    for fpath in files:
        try:
            # Standardized content reading + detection
            # Returns dict: {'content': bytes/str, 'mime_type': ..., 'is_binary': ...}
            processed = process_file_content(fpath, allow_pathological=False)
            content = processed['content']
            
            # Re-encode text if needed for MCard (which expects bytes or handles str -> bytes conversion)
            if isinstance(content, str):
                final_content = content.encode('utf-8', errors='replace')
            else:
                final_content = content
                
            card = MCard(final_content)
            
            # Determine handle from filename (stem only)
            handle_candidate = fpath.stem
            
            # Try to add with handle if valid, otherwise fallback to plain add
            try:
                # This adds card + registers handle
                hash_val = collection.add_with_handle(card, handle_candidate)
            except (ValueError, Exception) as e:
                # Handle might be invalid or duplicate, fallback to just adding card
                hash_val = collection.add(card)
            
            hashes.append(hash_val)
            total_bytes += len(final_content)
            
            # Skip vector embedding for binary files that aren't text
            if processed['is_binary']:
                 # Optionally log skipping embedding
                 pass
            else:
                # Generate and store embedding (RAG) - with retry policy
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        indexed_count = vector_store.index(card, chunk=False)
                        if indexed_count > 0:
                            break
                    except Exception as e:
                        if attempt == max_retries - 1:
                            logger.error(f"Failed to index {hash_val[:8]} after {max_retries} attempts: {e}")
                        time.sleep(0.5 * (attempt + 1))  # Backoff
            
            # Small delay to prevent overwhelming the local LLM
            time.sleep(0.1)
            
        except Exception as e:
            logger.error(f"Error loading {fpath}: {e}")
            
    load_time = time.time() - t0

    # 2. Retrieve (Hybrid: Hash + Vector)
    sample_size = min(retrieval_count, len(hashes))
    t1 = time.time()
    
    # Sample random hash retrieval
    for h in random.sample(hashes, sample_size):
        collection.get(h)
    
    # Sample vector search (query with handle of last added file as dummy query)
    if hashes:
        dummy_query = "Concept"
        vector_store.search(dummy_query, k=1)
        
    ret_time = time.time() - t1
    
    # 3. Metrics
    safe_div = lambda n, d: round(n/d, 2) if d > 0 else 0
    
    return {
        "dataset": {
            "source": str(source_dir),
            "files": total,
            "size_mb": safe_div(total_bytes, 1024**2),
            "vector_count": vector_store.count()
        },
        "loading": {
            "time_s": round(load_time, 4),
            "files_per_sec": safe_div(total, load_time), 
            "mb_per_sec": safe_div(total_bytes/1024**2, load_time)
        },
        "retrieval": {
            "samples": sample_size,
            "time_s": round(ret_time, 4),
            "latency_ms": safe_div(ret_time * 1000, sample_size),
            "ops_per_sec": safe_div(sample_size, ret_time)
        },
        "success": True
    }

if __name__ == "__main__":
    # Standalone execution support
    import json
    print(json.dumps(run_loader_benchmark(), indent=2))
