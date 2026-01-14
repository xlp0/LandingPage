"""
Content Handle CLM Logic Module.

This module provides the logic functions for the Content Handle CLM examples.
It implements handle registration, update, and validation operations.
"""
from typing import Any, Dict, List, Optional, Tuple
from mcard.model.card import MCard
from mcard.model.card_collection import CardCollection
from mcard.model.handle import validate_handle, HandleValidationError


def register_handle(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    CLM Logic: Register a handle pointing to content.
    
    Args:
        context: Dict with 'handle' and 'content' keys.
        
    Returns:
        Dict with 'success', 'hash', and 'resolved_content' keys.
    """
    handle = context.get('handle', '')
    content = context.get('content', '')
    
    collection = CardCollection(db_path=":memory:")
    card = MCard(content)
    
    try:
        hash_value = collection.add_with_handle(card, handle)
        
        # Verify resolution
        resolved = collection.get_by_handle(handle)
        resolved_content = resolved.get_content(as_text=True) if resolved else None
        
        return {
            'success': True,
            'hash': hash_value,
            'resolved_content': resolved_content,
            'matches': resolved_content == content
        }
    except (HandleValidationError, ValueError) as e:
        return {
            'success': False,
            'error': str(e)
        }


def update_handle(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    CLM Logic: Update a handle through multiple versions.
    
    Args:
        context: Dict with 'handle' and 'versions' (list of content strings).
        
    Returns:
        Dict with 'success', 'final_hash', 'history_length', and 'history' keys.
    """
    handle = context.get('handle', '')
    versions = context.get('versions', [])
    
    if not versions:
        return {'success': False, 'error': 'No versions provided'}
    
    collection = CardCollection(db_path=":memory:")
    
    try:
        # Add first version
        first_content = versions[0].get('content', '') if isinstance(versions[0], dict) else versions[0]
        card = MCard(first_content)
        collection.add_with_handle(card, handle)
        
        # Apply subsequent updates
        for version in versions[1:]:
            content = version.get('content', '') if isinstance(version, dict) else version
            new_card = MCard(content)
            collection.update_handle(handle, new_card)
        
        # Get final state
        final_card = collection.get_by_handle(handle)
        history = collection.get_handle_history(handle)
        
        return {
            'success': True,
            'final_hash': final_card.hash if final_card else None,
            'final_content': final_card.get_content(as_text=True) if final_card else None,
            'history_length': len(history),
            'history': history
        }
    except (HandleValidationError, ValueError) as e:
        return {
            'success': False,
            'error': str(e)
        }


def validate_handle_clm(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    CLM Logic: Validate a handle string.
    
    Args:
        context: Dict with 'handle' key.
        
    Returns:
        Dict with 'valid', 'normalized', and optionally 'error' keys.
    """
    handle = context.get('handle', '')
    
    try:
        normalized = validate_handle(handle)
        return {
            'valid': True,
            'normalized': normalized,
            'original': handle
        }
    except HandleValidationError as e:
        return {
            'valid': False,
            'error': str(e),
            'original': handle
        }


def run_registration_examples(examples: List[Dict]) -> List[Dict]:
    """Run all registration examples and return results."""
    results = []
    for example in examples:
        result = register_handle({
            'handle': example.get('handle', ''),
            'content': example.get('content', '')
        })
        result['example_name'] = example.get('name', 'unnamed')
        results.append(result)
    return results


def execute_registration_with_examples(context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute registration examples from context."""
    examples = context.get('examples', [])
    results = run_registration_examples(examples)
    all_success = all(r.get('success', False) and r.get('matches', False) for r in results)
    return {'success': all_success, 'results': results}


def run_versioning_examples(examples: List[Dict]) -> List[Dict]:
    """Run all versioning examples and return results."""
    results = []
    for example in examples:
        result = update_handle({
            'handle': example.get('handle', ''),
            'versions': example.get('versions', [])
        })
        result['example_name'] = example.get('name', 'unnamed')
        result['expected_history_length'] = example.get('expected_history_length', 0)
        result['passed'] = result.get('history_length', -1) == example.get('expected_history_length', 0)
        results.append(result)
    return results


def execute_versioning_with_examples(context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute versioning examples from context."""
    examples = context.get('examples', [])
    results = run_versioning_examples(examples)
    all_passed = all(r.get('passed', False) for r in results)
    return {'success': all_passed, 'results': results}


def update_handle_pruning(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    CLM Logic: Update a handle and then prune its history.
    """
    handle = context.get('handle', '')
    versions = context.get('versions', [])
    prune_type = context.get('prune_type', 'none') # 'all', 'older_than'
    
    collection = CardCollection(db_path=":memory:")
    
    try:
        # Setup history
        first_content = versions[0].get('content', '') if isinstance(versions[0], dict) else versions[0]
        collection.add_with_handle(MCard(first_content), handle)
        
        # Fast hacks for timestamp manipulation if needed for older_than test
        # But for CLM simplicity, we might just test 'delete_all' or rely on immediate pruning
        
        for version in versions[1:]:
             content = version.get('content', '') if isinstance(version, dict) else version
             collection.update_handle(handle, MCard(content))
             
        history_before = len(collection.get_handle_history(handle))
        
        deleted = 0
        if prune_type == 'all':
            deleted = collection.prune_handle_history(handle, delete_all=True)
            
        history_after = len(collection.get_handle_history(handle))
        
        return {
            'success': True,
            'handle': handle,
            'history_before': history_before,
            'deleted': deleted,
            'history_after': history_after
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def run_pruning_examples(examples: List[Dict]) -> List[Dict]:
    results = []
    for example in examples:
        result = update_handle_pruning({
            'handle': example.get('handle'),
            'versions': example.get('versions'),
            'prune_type': example.get('prune_type')
        })
        result['example_name'] = example.get('name', 'unnamed')
        result['passed'] = (result.get('history_after') == example.get('expected_history_after', 0))
        results.append(result)
    return results

def execute_pruning_with_examples(context: Dict[str, Any]) -> Dict[str, Any]:
    examples = context.get('examples', [])
    results = run_pruning_examples(examples)
    return {'success': all(r.get('passed') for r in results), 'results': results}


def run_validation_examples(examples: List[Dict]) -> List[Dict]:
    """Run all validation examples and return results."""
    results = []
    for example in examples:
        result = validate_handle_clm({'handle': example.get('handle', '')})
        result['example_name'] = example.get('name', 'unnamed')
        result['expected_valid'] = example.get('expected_valid', False)
        result['passed'] = result.get('valid') == example.get('expected_valid', False)
        results.append(result)
    return results


def execute_validation_with_examples(context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute validation examples from context."""
    examples = context.get('examples', [])
    results = run_validation_examples(examples)
    all_passed = all(r.get('passed', False) for r in results)
    return {'success': all_passed, 'results': results}


# Main entry point for CLM execution
def main(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main CLM entry point.
    
    Dispatches to the appropriate handler based on the 'operation' key.
    """
    operation = context.get('operation', 'validate')
    
    if operation == 'register':
        return register_handle(context)
    elif operation == 'update':
        return update_handle(context)
    elif operation == 'validate':
        return validate_handle_clm(context)
    else:
        return {'error': f'Unknown operation: {operation}'}
