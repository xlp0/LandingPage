"""
Dual Retrieval Logic Module.

Demonstrates the duality between hash-based and handle-based retrieval.
Both mechanisms access the same content, but with different characteristics:
- Hash: Immutable, precise, deterministic
- Handle: Semantic, mutable pointer, always latest version
"""
import yaml
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from mcard.model.card import MCard
from mcard.model.card_collection import CardCollection


class DualRetrievalRegistry:
    """Registry supporting both hash and handle retrieval."""
    
    def __init__(self, db_path: str = ":memory:"):
        """Initialize with a CardCollection."""
        self.collection = CardCollection(db_path=db_path)
        self.hash_registry: Dict[str, str] = {}  # name -> hash
        self.loaded_names: List[str] = []
    
    def load_and_register(self, file_path: Path, name: str) -> Dict[str, Any]:
        """Load a file, store as MCard, register handle, and record hash.
        
        Args:
            file_path: Path to the YAML file.
            name: The name to use as handle.
            
        Returns:
            Dict with 'hash', 'name', and 'content' keys.
        """
        with open(file_path, 'r') as f:
            content = f.read()
        
        card = MCard(content)
        hash_value = self.collection.add_with_handle(card, name)
        
        # Record the hash for direct retrieval
        self.hash_registry[name] = hash_value
        self.loaded_names.append(name)
        
        return {
            'hash': hash_value,
            'name': name,
            'content': content,
            'parsed': yaml.safe_load(content)
        }
    
    def get_by_hash(self, hash_value: str) -> Optional[Dict[str, Any]]:
        """Retrieve content by hash (immutable, precise).
        
        Args:
            hash_value: The exact hash of the MCard.
            
        Returns:
            Dict with content and metadata, or None if not found.
        """
        card = self.collection.get(hash_value)
        if card:
            content = card.get_content(as_text=True)
            return {
                'hash': card.hash,
                'content': content,
                'parsed': yaml.safe_load(content),
                'retrieval_method': 'hash'
            }
        return None
    
    def get_by_handle(self, handle: str) -> Optional[Dict[str, Any]]:
        """Retrieve content by handle (mutable pointer, latest version).
        
        Args:
            handle: The handle (name) to resolve.
            
        Returns:
            Dict with content and metadata, or None if not found.
        """
        card = self.collection.get_by_handle(handle)
        if card:
            content = card.get_content(as_text=True)
            return {
                'hash': card.hash,
                'content': content,
                'parsed': yaml.safe_load(content),
                'retrieval_method': 'handle'
            }
        return None
    
    def dual_retrieve(self, name: str) -> Dict[str, Any]:
        """Retrieve by both hash and handle, compare results.
        
        Args:
            name: The name (also the handle) of the test case.
            
        Returns:
            Dict with both retrieval results and comparison.
        """
        # Get the recorded hash for this name
        recorded_hash = self.hash_registry.get(name)
        
        if not recorded_hash:
            return {
                'success': False,
                'error': f"No recorded hash for name '{name}'"
            }
        
        # Retrieve by hash
        by_hash = self.get_by_hash(recorded_hash)
        
        # Retrieve by handle
        by_handle = self.get_by_handle(name)
        
        if not by_hash or not by_handle:
            return {
                'success': False,
                'error': 'Retrieval failed',
                'by_hash_found': by_hash is not None,
                'by_handle_found': by_handle is not None
            }
        
        # Compare
        content_matches = by_hash['content'] == by_handle['content']
        hash_matches = by_hash['hash'] == by_handle['hash']
        
        return {
            'success': True,
            'name': name,
            'recorded_hash': recorded_hash,
            'by_hash': {
                'hash': by_hash['hash'],
                'content_length': len(by_hash['content']),
                'method': 'hash'
            },
            'by_handle': {
                'hash': by_handle['hash'],
                'content_length': len(by_handle['content']),
                'method': 'handle'
            },
            'content_matches': content_matches,
            'hash_matches': hash_matches,
            'equivalence_verified': content_matches and hash_matches
        }
    
    def get_recorded_hash(self, name: str) -> Optional[str]:
        """Get the recorded hash for a name."""
        return self.hash_registry.get(name)
    
    def list_entries(self) -> List[Dict[str, str]]:
        """List all entries with their names and hashes."""
        return [
            {'name': name, 'hash': self.hash_registry[name]}
            for name in self.loaded_names
        ]


def load_dual_registry(test_data_dir: Path) -> DualRetrievalRegistry:
    """Load all test data files into a dual retrieval registry.
    
    Args:
        test_data_dir: Path to directory with YAML test data files.
        
    Returns:
        A populated DualRetrievalRegistry.
    """
    registry = DualRetrievalRegistry()
    
    for yaml_file in sorted(test_data_dir.glob("*.yaml")):
        with open(yaml_file, 'r') as f:
            data = yaml.safe_load(f)
        
        name = data.get('name', yaml_file.stem)
        registry.load_and_register(yaml_file, name)
    
    return registry


def dual_retrieve(context: Dict[str, Any]) -> Dict[str, Any]:
    """CLM Entry Point: Perform dual retrieval for a test case.
    
    Args:
        context: Dict with 'test_data_dir' and 'name' keys.
        
    Returns:
        Dual retrieval result with comparison.
    """
    test_data_dir = Path(context.get('test_data_dir', 'chapters/chapter_02_handle/test_data'))
    name = context.get('name', '')
    
    registry = load_dual_registry(test_data_dir)
    return registry.dual_retrieve(name)


def dual_retrieve_all(context: Dict[str, Any]) -> Dict[str, Any]:
    """CLM Entry Point: Perform dual retrieval for all test cases.
    
    Args:
        context: Dict with 'test_data_dir' key.
        
    Returns:
        Dict with results for all entries.
    """
    test_data_dir = Path(context.get('test_data_dir', 'chapters/chapter_02_handle/test_data'))
    
    registry = load_dual_registry(test_data_dir)
    
    results = []
    for entry in registry.list_entries():
        result = registry.dual_retrieve(entry['name'])
        results.append(result)
    
    all_verified = all(r.get('equivalence_verified', False) for r in results)
    
    return {
        'success': all_verified,
        'total_entries': len(results),
        'all_equivalence_verified': all_verified,
        'results': results,
        'hash_registry': [
            {'name': e['name'], 'hash': e['hash']}
            for e in registry.list_entries()
        ]
    }


def demonstrate_version_duality(context: Dict[str, Any]) -> Dict[str, Any]:
    """CLM Entry Point: Demonstrate how updates affect hash vs handle retrieval.
    
    This shows that:
    - Hash retrieval always returns the exact content
    - Handle retrieval returns the latest version
    
    Args:
        context: Dict with 'handle', 'initial_content', 'updated_content'.
        
    Returns:
        Dict demonstrating version duality.
    """
    handle = context.get('handle', 'test_handle')
    initial_content = context.get('initial_content', 'Version A')
    updated_content = context.get('updated_content', 'Version B')
    
    registry = DualRetrievalRegistry()
    
    # Create initial version
    card1 = MCard(initial_content)
    hash_v1 = registry.collection.add_with_handle(card1, handle)
    registry.hash_registry[handle] = hash_v1
    
    # Verify initial state
    by_hash_v1 = registry.get_by_hash(hash_v1)
    by_handle_initial = registry.get_by_handle(handle)
    
    # Update to new version
    card2 = MCard(updated_content)
    hash_v2 = registry.collection.update_handle(handle, card2)
    
    # Verify after update
    by_hash_v1_after = registry.get_by_hash(hash_v1)  # Still gets V1
    by_hash_v2 = registry.get_by_hash(hash_v2)        # Gets V2
    by_handle_after = registry.get_by_handle(handle)  # Gets V2 (latest)
    
    return {
        'success': True,
        'demonstration': 'Version Duality',
        'versions': {
            'v1': {
                'hash': hash_v1,
                'content': initial_content
            },
            'v2': {
                'hash': hash_v2,
                'content': updated_content
            }
        },
        'retrieval_results': {
            'get_by_hash_v1': by_hash_v1_after['content'] if by_hash_v1_after else None,
            'get_by_hash_v2': by_hash_v2['content'] if by_hash_v2 else None,
            'get_by_handle': by_handle_after['content'] if by_handle_after else None
        },
        'assertions': {
            'hash_v1_still_returns_v1': by_hash_v1_after and by_hash_v1_after['content'] == initial_content,
            'hash_v2_returns_v2': by_hash_v2 and by_hash_v2['content'] == updated_content,
            'handle_returns_latest': by_handle_after and by_handle_after['content'] == updated_content,
            'v1_hash_differs_from_v2': hash_v1 != hash_v2
        }
    }
