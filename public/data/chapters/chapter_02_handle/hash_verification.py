"""
Hash Verification Logic Module.

Demonstrates cryptographic verification of content-hash correspondence.
Uses known hash values to verify that content retrieval is correct.
"""
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional

from mcard.model.card import MCard
from mcard.model.card_collection import CardCollection


def compute_sha256(content: bytes) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content).hexdigest()


class HashVerificationRegistry:
    """Registry for verifying hash-content correspondence."""
    
    def __init__(self, db_path: str = ":memory:"):
        """Initialize with a CardCollection."""
        self.collection = CardCollection(db_path=db_path)
        self.registered: Dict[str, Dict[str, str]] = {}  # name -> {hash, content}
    
    def load_and_verify(self, file_path: Path, name: str, expected_hash: Optional[str] = None) -> Dict[str, Any]:
        """Load a file, store as MCard, and verify hash.
        
        Args:
            file_path: Path to the file.
            name: The handle name.
            expected_hash: Optional expected hash to verify against.
            
        Returns:
            Verification result dict.
        """
        with open(file_path, 'r') as f:
            content = f.read()
        
        content_bytes = content.encode('utf-8')
        
        # Compute hash ourselves
        computed_hash = compute_sha256(content_bytes)
        
        # Store in MCard
        card = MCard(content)
        stored_hash = self.collection.add_with_handle(card, name)
        
        # Record
        self.registered[name] = {
            'hash': stored_hash,
            'content': content,
            'computed_hash': computed_hash
        }
        
        # Verification
        hash_matches_stored = (computed_hash == stored_hash)
        hash_matches_expected = (computed_hash == expected_hash) if expected_hash else None
        
        return {
            'name': name,
            'stored_hash': stored_hash,
            'computed_hash': computed_hash,
            'expected_hash': expected_hash,
            'hash_matches_stored': hash_matches_stored,
            'hash_matches_expected': hash_matches_expected,
            'content_length': len(content)
        }
    
    def verify_retrieval_duality(self, name: str) -> Dict[str, Any]:
        """Verify that hash and handle retrieval return identical content.
        
        Args:
            name: The handle name.
            
        Returns:
            Verification result with detailed comparisons.
        """
        if name not in self.registered:
            return {'success': False, 'error': f"Name '{name}' not registered"}
        
        stored_hash = self.registered[name]['hash']
        
        # Retrieve by hash
        card_by_hash = self.collection.get(stored_hash)
        
        # Retrieve by handle
        card_by_handle = self.collection.get_by_handle(name)
        
        # Resolve handle to hash
        resolved_hash = self.collection.resolve_handle(name)
        
        if not card_by_hash or not card_by_handle:
            return {
                'success': False,
                'error': 'Retrieval failed',
                'card_by_hash_found': card_by_hash is not None,
                'card_by_handle_found': card_by_handle is not None
            }
        
        content_by_hash = card_by_hash.get_content(as_text=True)
        content_by_handle = card_by_handle.get_content(as_text=True)
        
        # Verify content hash
        recomputed_hash = compute_sha256(content_by_hash.encode('utf-8'))
        
        return {
            'success': True,
            'name': name,
            'verification': {
                'stored_hash': stored_hash,
                'resolved_hash': resolved_hash,
                'recomputed_hash': recomputed_hash,
                'hash_by_card_hash': card_by_hash.hash,
                'hash_by_card_handle': card_by_handle.hash,
            },
            'assertions': {
                'stored_equals_resolved': stored_hash == resolved_hash,
                'stored_equals_recomputed': stored_hash == recomputed_hash,
                'content_by_hash_equals_content_by_handle': content_by_hash == content_by_handle,
                'card_hashes_equal': card_by_hash.hash == card_by_handle.hash,
            },
            'all_verified': (
                stored_hash == resolved_hash and
                stored_hash == recomputed_hash and
                content_by_hash == content_by_handle and
                card_by_hash.hash == card_by_handle.hash
            )
        }


def verify_all(context: Dict[str, Any]) -> Any:
    """CLM Entry Point: Verify all known MCards.
    
    Args:
        context: Dict with 'test_data_dir' and optional 'known_mcards' keys.
                 Supports 'name' (single) or 'names' (list) for filtering.
        
    Returns:
        Complete verification report, or a string message when a single name
        is requested (for result_contains assertions).
    """
    test_data_dir = Path(context.get('test_data_dir', 'chapters/chapter_02_handle/test_data'))
    
    # Known MCards with expected hashes (from CLM)
    known_mcards = context.get('known_mcards', [
        {
            'name': 'single_update',
            'source_file': 'test_data/single_update.yaml',
            'expected_hash': '84bb7bfbbf91801eb7353ee17d40a22b1e1b116b2d129fab863835e25504481c'
        },
        {
            'name': 'multiple_updates',
            'source_file': 'test_data/multiple_updates.yaml',
            'expected_hash': 'b741e20e045e904a474c85366c675d29d463a6895ee7d0a2ef32e8891c694f80'
        },
        {
            'name': 'content_lineage',
            'source_file': 'test_data/content_lineage.yaml',
            'expected_hash': 'e019311898778ae05d51bbb1d445e35070a9de9375a75f7f9b092d76e8d75ba3'
        }
    ])
    
    # Support both 'name' (single) and 'names' (list) for filtering
    single_name = context.get('name')
    names_filter = context.get('names')
    if single_name:
        names_filter = [single_name]
    if names_filter:
        names_set = set(names_filter)
        known_mcards = [mc for mc in known_mcards if mc['name'] in names_set]
    summary_only = context.get('summary_only', False)
    
    registry = HashVerificationRegistry()
    
    load_results = []
    verification_results = []
    
    # Load and verify each known MCard
    for mcard_spec in known_mcards:
        name = mcard_spec['name']
        source_file = mcard_spec['source_file']
        expected_hash = mcard_spec.get('expected_hash')
        
        file_path = test_data_dir.parent / source_file
        
        # Load and verify hash
        load_result = registry.load_and_verify(file_path, name, expected_hash)
        load_results.append(load_result)
        
        # Verify retrieval duality
        duality_result = registry.verify_retrieval_duality(name)
        verification_results.append(duality_result)
    
    # Compile summary
    all_hashes_match = all(r.get('hash_matches_expected', True) for r in load_results)
    all_duality_verified = all(r.get('all_verified', False) for r in verification_results)
    checked_names = [spec['name'] for spec in known_mcards]

    # When a single name is requested, return a string message containing the hash
    # so that result_contains assertions can match the expected hash substring.
    if single_name and len(load_results) == 1:
        lr = load_results[0]
        vr = verification_results[0]
        status = "VERIFIED" if lr.get('hash_matches_expected') and vr.get('all_verified') else "FAILED"
        return (
            f"Hash verification for '{single_name}': {status}. "
            f"computed_hash={lr['computed_hash']} "
            f"stored_hash={lr['stored_hash']} "
            f"duality_verified={vr.get('all_verified')}"
        )

    if summary_only:
        return {
            'success': all_hashes_match and all_duality_verified,
            'summary': {
                'checked_names': checked_names,
                'all_hashes_match_expected': all_hashes_match,
                'all_duality_verified': all_duality_verified,
            }
        }

    return {
        'success': all_hashes_match and all_duality_verified,
        'summary': {
            'total_mcards': len(known_mcards),
            'all_hashes_match_expected': all_hashes_match,
            'all_duality_verified': all_duality_verified
        },
        'load_results': load_results,
        'duality_verification': verification_results,
        'hash_registry': [
            {
                'name': n,
                'hash': info['hash'],
                'hash_short': info['hash'][:16] + '...'
            }
            for n, info in registry.registered.items()
        ]
    }


def verify_single(context: Dict[str, Any]) -> Dict[str, Any]:
    """CLM Entry Point: Verify a single MCard by name.
    
    Args:
        context: Dict with 'test_data_dir', 'name', and 'expected_hash' keys.
        
    Returns:
        Detailed verification for one MCard.
    """
    test_data_dir = Path(context.get('test_data_dir', 'chapters/chapter_02_handle/test_data'))
    name = context['name']
    expected_hash = context.get('expected_hash')
    source_file = context.get('source_file', f'test_data/{name}.yaml')
    
    file_path = test_data_dir.parent / source_file
    
    registry = HashVerificationRegistry()
    
    # Load
    load_result = registry.load_and_verify(file_path, name, expected_hash)
    
    # Verify duality
    duality_result = registry.verify_retrieval_duality(name)
    
    return {
        'success': load_result.get('hash_matches_expected', True) and duality_result.get('all_verified', False),
        'load': load_result,
        'duality': duality_result
    }
