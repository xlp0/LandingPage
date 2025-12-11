# MCard Handles Filter

## Overview

The MCard Manager now includes a "With Handles" filter that allows you to view only MCards that have been assigned handles (named references).

## What are Handles?

Handles are mutable pointers to MCards. While MCards themselves are immutable and content-addressed (identified by their hash), handles provide human-readable names that can point to different MCards over time.

**Example:**
- MCard Hash: `1bff39ea7c...` (immutable)
- Handle: `my-document` (mutable, can be reassigned)

## Using the Filter

### Location
The "With Handles" filter appears in the left sidebar, second in the list after "All Files".

### Visual Indicator
- **Icon:** 🏷️ Tag icon
- **Label:** "With Handles"
- **Count:** Shows number of MCards with handles

### How to Use
1. Open MCard Manager
2. Look at the left sidebar under "File Types"
3. Click "With Handles" (second option)
4. View only MCards that have handles assigned

## Implementation Details

### Data Flow
```
1. User clicks "With Handles" filter
   ↓
2. MCardManager.selectType('with-handles')
   ↓
3. categorizeCards() queries IndexedDB handles store
   ↓
4. Builds Set of card hashes with handles
   ↓
5. Filters cards to only those in the Set
   ↓
6. Displays filtered list
```

### Technical Implementation

#### IndexedDB Query
```javascript
const db = this.collection.engine.db;
const tx = db.transaction('handles', 'readonly');
const store = tx.objectStore('handles');
const allHandles = await store.getAll();

// Build set of hashes that have handles
allHandles.forEach(handle => {
  if (handle.hash) {
    cardsWithHandles.add(handle.hash);
  }
});
```

#### Categorization
```javascript
for (const card of cards) {
  // Check if this card has handles
  if (cardsWithHandles.has(card.hash)) {
    categories.withHandles.push(card);
  }
  // ... other categorization logic
}
```

## Use Cases

### 1. Find Named Documents
Quickly locate all MCards you've given meaningful names to.

### 2. Manage Important Content
Handles typically indicate important or frequently accessed content.

### 3. Review Naming
See all your named MCards in one place to review naming consistency.

### 4. Cleanup
Identify which MCards have handles vs. which are unnamed.

## Example Workflow

### Creating a Handle
```javascript
// Upload a file
const file = new File(['content'], 'document.txt');
await mcardManager.handleFileUpload(file);

// Assign a handle
await mcardManager.collection.engine.registerHandle('my-doc', cardHash);

// Now appears in "With Handles" filter
```

### Viewing Handles
1. Click "With Handles" filter
2. See all MCards with handles
3. Click any MCard to view
4. Handle name shown in card details

## Benefits

### Quick Access
- ✅ Find named MCards instantly
- ✅ No need to search through all files
- ✅ One-click filtering

### Organization
- ✅ Separate named from unnamed content
- ✅ Identify important documents
- ✅ Review naming conventions

### Efficiency
- ✅ Fast IndexedDB query
- ✅ Cached handle lookups
- ✅ Minimal performance impact

## Performance

### Query Optimization
- Uses IndexedDB index for fast lookups
- Builds Set for O(1) hash checking
- Async operation doesn't block UI

### Caching
- Handle data fetched once per categorization
- Reused across all cards
- Minimal database queries

## Related Features

- **Handle Management** - See [mcard/how_to_use_mcard_js.md](mcard/how_to_use_mcard_js.md)
- **MCard Setup** - See [MCARD-JS-SETUP.md](MCARD-JS-SETUP.md)
- **Content Rendering** - See [CONTENT_RENDERING_SYSTEM.md](CONTENT_RENDERING_SYSTEM.md)

## Future Enhancements

### Possible Improvements
- Show handle names in card list
- Filter by specific handle pattern
- Bulk handle operations
- Handle history/versions
- Handle search

## Troubleshooting

### No Cards Showing
**Problem:** "With Handles" filter shows 0 cards

**Solutions:**
1. Verify handles exist in IndexedDB
2. Check handle-to-hash mappings
3. Ensure handles store is accessible
4. Reload the page

### Incorrect Count
**Problem:** Count doesn't match expected number

**Solutions:**
1. Check for duplicate handles
2. Verify handle.hash property exists
3. Clear browser cache
4. Re-index handles

## Summary

The "With Handles" filter provides a convenient way to:
- ✅ View only named MCards
- ✅ Quickly access important content
- ✅ Manage handle assignments
- ✅ Organize your MCard collection

**Filter by handles, find what matters! 🏷️✨**
