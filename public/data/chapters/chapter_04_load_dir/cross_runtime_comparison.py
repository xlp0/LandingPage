import json
import os
from pathlib import Path
import logging
from mcard.ptr.core.runtime import RuntimeFactory
# RuntimeType might be needed if I use it, but I use strings "python", "javascript"
# from mcard.ptr.core.utils import RuntimeType # if it was there



logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CrossRuntimeComparison")

def compare_loaders(inputs, context=None):
    """
    Execute load_files using Python and Node runtimes, verify they match,
    and save the results as JSON MCards.
    """
    # Ensure context is available
    if context is None:
        context = inputs

    source_dir = inputs.get("source_dir", "docs")
    logger.info(f"Starting comparison for source: {source_dir}")
    
    # 1. Python Execution
    logger.info("Running Python Loader...")
    # RuntimeFactory.get_executor returns the runtime instance/class
    py_runtime = RuntimeFactory.get_executor("python")
    py_result = py_runtime.execute(
        code=None, 
        context=context, # Pass the full context 
        builtin="load_files"
    )
    
    # 2. JS Execution
    logger.info("Running Node Loader...")
    js_runtime = RuntimeFactory.get_executor("javascript")
    js_result = js_runtime.execute(
        code=None, # For builtin
        context=context,
        builtin="loader"  # mcard-js maps 'loader' to LoaderRuntime
    )
    
    # 3. Save "MCards" (Serialized JSON of the result)
    ingestion_dir = Path("data/ingestion")
    ingestion_dir.mkdir(parents=True, exist_ok=True)
    
    py_mcard_path = ingestion_dir / "python_loader_result.json"
    js_mcard_path = ingestion_dir / "js_loader_result.json"
    
    with open(py_mcard_path, "w") as f:
        json.dump(py_result, f, indent=2)
        
    with open(js_mcard_path, "w") as f:
        json.dump(js_result, f, indent=2)
        
    logger.info(f"Saved results to {ingestion_dir}")

    # 4. Compare Metrics
    metrics_match = True
    py_metrics = py_result.get("metrics", {})
    js_metrics = js_result.get("metrics", {})
    
    keys_to_compare = ["total_files", "total_directories", "directory_levels"]
    
    for key in keys_to_compare:
        py_val = py_metrics.get(key)
        js_val = js_metrics.get(key)
        if py_val != js_val:
            logger.error(f"Metric mismatch [{key}]: Python={py_val}, JS={js_val}")
            metrics_match = False
        else:
            logger.info(f"Metric match [{key}]: {py_val}")
            
    # 5. Compare Hashes (Set comparison)
    py_files = py_result.get("files", [])
    js_files = js_result.get("files", [])
    
    # Use relative paths for key, since absolute paths differ slightly (JS might resolve differently?)
    # Actually, verify handles/filenames. Filenames are safer.
    # Hashes should match.
    
    py_hashes = {f['filename']: f['hash'] for f in py_files}
    js_hashes = {f['filename']: f['hash'] for f in js_files}
    
    hash_match = True
    all_filenames = set(py_hashes.keys()) | set(js_hashes.keys())
    
    for fname in all_filenames:
        p_h = py_hashes.get(fname)
        j_h = js_hashes.get(fname)
        
        if p_h != j_h:
            # logger.error(f"Hash mismatch for {fname}: Python={p_h}, JS={j_h}")
            # Don't spam logs detailedly if many mismatch, but log first few
            logger.error(f"Hash mismatch for {fname}: Py={p_h}, JS={j_h}")
            hash_match = False
            
    if metrics_match and hash_match:
        logger.info("✅ SUCCESS: Python and JS loaders match perfectly.")
        return {"success": True, "match": True, "metrics": py_metrics}
    else:
        logger.error("❌ FAILURE: Loaders do not match.")
        return {"success": False, "match": False, "diff": "See logs"}
