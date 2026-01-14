import json
import sqlite3
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VerifyLoaders")

def verify_databases(inputs, context={}):
    if isinstance(inputs, str):
        try:
            inputs = json.loads(inputs)
        except json.JSONDecodeError:
            logger.warning("Could not parse inputs as JSON")
            inputs = {}

    db_py = inputs.get("db_py", "data/ingestion/loader_python.db")
    db_js = inputs.get("db_js", "data/ingestion/loader_js.db")
    
    logger.info(f"Comparing databases:\n  Py: {db_py}\n  JS: {db_js}")
    
    def get_hashes(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # MCard schema uses 'card' table (not 'mcards')
        # Exclude duplicate and collision event cards (JSON content with type field)
        # Handle both with and without spaces after colon
        try:
            cursor.execute("""
                SELECT hash FROM card 
                WHERE CAST(content AS TEXT) NOT LIKE '%"type"%duplicate%' 
                AND CAST(content AS TEXT) NOT LIKE '%"type"%collision%'
            """)
            hashes = sorted([r[0] for r in cursor.fetchall()])
            
            # Also get handles if possible for file mapping check
            try:
                cursor.execute("SELECT handle, hash FROM handles")
                handles = {r[0]: r[1] for r in cursor.fetchall()}
            except:
                handles = {}
                
            return hashes, handles
        except Exception as e:
            logger.error(f"Error reading {db_path}: {e}")
            return [], {}
        finally:
            conn.close()

    hashes_py, handles_py = get_hashes(db_py)
    hashes_js, handles_js = get_hashes(db_js)
    
    logger.info(f"Python DB: {len(hashes_py)} MCards, {len(handles_py)} handles")
    logger.info(f"JS DB:     {len(hashes_js)} MCards, {len(handles_js)} handles")
    
    # 1. Compare Card Counts
    if len(hashes_py) != len(hashes_js):
        logger.error(f"Count mismatch! Py={len(hashes_py)}, JS={len(hashes_js)}")
        # Dump diff
        set_py = set(hashes_py)
        set_js = set(hashes_js)
        only_py = set_py - set_js
        only_js = set_js - set_py
        if only_py: logger.error(f"Only in Py: {list(only_py)[:5]}...")
        if only_js: logger.error(f"Only in JS: {list(only_js)[:5]}...")
        return {
            "success": False, 
            "match": False, 
            "py_count": len(hashes_py), 
            "js_count": len(hashes_js),
            "diff": "count_mismatch"
        }
        
    # 2. Compare Hashes Exact Match
    if hashes_py != hashes_js:
        logger.error("Hash sets do not match exactly.")
        return {
            "success": False, 
            "match": False, 
            "py_count": len(hashes_py), 
            "js_count": len(hashes_js),
            "diff": "hash_mismatch"
        }
        
    logger.info("✅ SUCCESS: Both databases have identical MCard sets.")
    return {
        "success": True, 
        "match": True, 
        "count": len(hashes_py),
        "py_count": len(hashes_py), 
        "js_count": len(hashes_js)
    }
