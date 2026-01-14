"""
Handle Test Registry: Self-Referential Test Data Management.

This module demonstrates using the Content Handle system to manage
its own test data. Test examples are stored as MCards and referenced
by handles, creating a content-addressed test data registry.
"""
import yaml
from pathlib import Path
from typing import Any, Dict, List, Optional

from mcard.model.card import MCard
from mcard.model.card_collection import CardCollection


class HandleTestRegistry:
    """Registry for test data stored as content-addressed MCards with handles."""
    
    def __init__(self, db_path: str = ":memory:"):
        """Initialize the registry with a CardCollection."""
        self.collection = CardCollection(db_path=db_path)
        self.loaded_handles: List[str] = []
    
    def load_test_data_file(self, file_path: Path, handle: str) -> Dict[str, Any]:
        """Load a YAML test data file and register it with a handle.
        
        Args:
            file_path: Path to the YAML file.
            handle: The handle to register for this test data.
            
        Returns:
            Dict with 'hash', 'handle', and 'content' keys.
        """
        with open(file_path, 'r') as f:
            content = f.read()
        
        card = MCard(content)
        hash_value = self.collection.add_with_handle(card, handle)
        self.loaded_handles.append(handle)
        
        return {
            'hash': hash_value,
            'handle': handle,
            'content': content,
            'parsed': yaml.safe_load(content)
        }
    
    def get_test_data(self, handle: str) -> Optional[Dict[str, Any]]:
        """Retrieve test data by handle.
        
        Args:
            handle: The handle to resolve.
            
        Returns:
            Parsed YAML content as a dict, or None if not found.
        """
        card = self.collection.get_by_handle(handle)
        if card:
            content = card.get_content(as_text=True)
            return {
                'hash': card.hash,
                'handle': handle,
                'content': content,
                'parsed': yaml.safe_load(content)
            }
        return None
    
    def update_test_data(self, handle: str, new_content: str) -> Dict[str, Any]:
        """Update test data and create a new version.
        
        Args:
            handle: The handle to update.
            new_content: The new YAML content.
            
        Returns:
            Dict with 'new_hash', 'handle', and 'history_length' keys.
        """
        new_card = MCard(new_content)
        new_hash = self.collection.update_handle(handle, new_card)
        history = self.collection.get_handle_history(handle)
        
        return {
            'new_hash': new_hash,
            'handle': handle,
            'history_length': len(history),
            'history': history
        }
    
    def list_registered_handles(self) -> List[str]:
        """List all handles registered in this session."""
        return self.loaded_handles.copy()


def load_test_registry(test_data_dir: Path) -> HandleTestRegistry:
    """Load all test data files from a directory into the registry.
    
    Files are loaded and registered with handles derived from their name field.
    
    Args:
        test_data_dir: Path to the directory containing YAML test data files.
        
    Returns:
        A populated HandleTestRegistry.
    """
    registry = HandleTestRegistry()
    
    for yaml_file in test_data_dir.glob("*.yaml"):
        # Read the file to get the 'name' field for the handle
        with open(yaml_file, 'r') as f:
            data = yaml.safe_load(f)
        
        handle = data.get('name', yaml_file.stem)
        registry.load_test_data_file(yaml_file, handle)
    
    return registry


def run_tests_from_handles(context: Dict[str, Any]) -> Dict[str, Any]:
    """CLM Entry Point: Run tests by retrieving test data from handles.
    
    Args:
        context: Dict with 'test_data_dir' and 'handles' keys.
        
    Returns:
        Dict with 'success', 'results', and 'registry_info' keys.
    """
    test_data_dir = Path(context.get('test_data_dir', 'chapters/chapter_02_handle/test_data'))
    handles_to_test = context.get('handles')
    summary_only = context.get('return_handles_only', False)
    
    # Load the registry
    registry = load_test_registry(test_data_dir)
    
    # If no specific handles given, test all loaded handles
    if handles_to_test is None:
        handles_to_test = registry.list_registered_handles()
    
    # Normalize handles to list
    if isinstance(handles_to_test, str):
        handles_to_test = [handles_to_test]

    results = []
    for handle in handles_to_test:
        test_data = registry.get_test_data(handle)
        if test_data:
            parsed = test_data['parsed']
            results.append({
                'handle': handle,
                'hash': test_data['hash'],
                'test_name': parsed.get('name'),
                'versions_count': len(parsed.get('versions', [])),
                'expected_history_length': parsed.get('expected_history_length'),
                'retrieved': True
            })
        else:
            results.append({
                'handle': handle,
                'retrieved': False,
                'error': f"Handle '{handle}' not found"
            })
    
    success = all(r.get('retrieved', False) for r in results)

    if summary_only:
        retrieved_handles = [r['handle'] for r in results if r.get('retrieved')]
        missing_handles = [r['handle'] for r in results if not r.get('retrieved', False)]
        return {
            'success': success,
            'handles_checked': handles_to_test,
            'retrieved_handles': retrieved_handles,
            'missing_handles': missing_handles,
        }

    return {
        'success': all(r.get('retrieved', False) for r in results),
        'results': results,
        'registry_info': {
            'loaded_handles': registry.list_registered_handles(),
            'total_loaded': len(registry.loaded_handles)
        }
    }


def run_versioning_test_from_handle(context: Dict[str, Any]) -> Dict[str, Any]:
    """CLM Entry Point: Run a versioning test retrieved from a handle.
    
    This executes the actual versioning test defined in the test data.
    
    Args:
        context: Dict with 'test_data_dir' and 'handle' keys.
        
    Returns:
        Dict with test execution results.
    """
    test_data_dir = Path(context.get('test_data_dir', 'chapters/chapter_02_handle/test_data'))
    handle = context.get('handle', '')
    
    # Load the registry
    registry = load_test_registry(test_data_dir)
    
    # Get the test data
    test_data = registry.get_test_data(handle)
    if not test_data:
        return {'success': False, 'error': f"Handle '{handle}' not found"}
    
    parsed = test_data['parsed']
    
    # Create a new collection for running the actual test
    test_collection = CardCollection(db_path=":memory:")
    
    # Execute the versioning test as defined in the test data
    test_handle = parsed.get('handle', 'test_handle')
    versions = parsed.get('versions', [])
    expected_history_length = parsed.get('expected_history_length', 0)
    
    if not versions:
        return {'success': False, 'error': 'No versions defined in test data'}
    
    # Add first version
    first_content = versions[0].get('content', '')
    first_card = MCard(first_content)
    test_collection.add_with_handle(first_card, test_handle)
    
    # Apply subsequent updates
    for version in versions[1:]:
        content = version.get('content', '')
        new_card = MCard(content)
        test_collection.update_handle(test_handle, new_card)
    
    # Get final state and history
    final_card = test_collection.get_by_handle(test_handle)
    history = test_collection.get_handle_history(test_handle)
    
    passed = len(history) == expected_history_length
    
    return {
        'success': passed,
        'test_name': parsed.get('name'),
        'test_handle': test_handle,
        'final_content': final_card.get_content(as_text=True) if final_card else None,
        'actual_history_length': len(history),
        'expected_history_length': expected_history_length,
        'source_handle': handle,
        'source_hash': test_data['hash']
    }
