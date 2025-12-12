# Edit Panel Feature

## Overview

The MCard Manager now includes a **side panel editor** for creating and editing text cards with handles. This replaces the old popup dialog with a full-featured editing interface.

---

## Features

### 1. **Side Panel Editor**
- Clean, spacious UI similar to the chat panel
- Large textarea for comfortable editing
- Handle name input for friendly references
- Cancel and Save buttons

### 2. **Edit Button for Handled Cards**
- Cards with handles show an "Edit" button
- Click to open editor with existing content
- Update content and/or handle name
- Creates new version (content-addressed)

### 3. **New Text Enhancement**
- "New Text" button now opens side panel
- No more tiny popup dialogs
- Better UX for longer content
- Optional handle assignment

---

## How to Use

### Creating New Text Card

1. **Click "New Text" button** in the header
2. **Edit panel opens** on the right side
3. **Enter content** in the large textarea
4. **Optional:** Add a handle name (e.g., `my-notes`, `readme`)
5. **Click "Create"** to save

**Result:**
- New card created with your content
- If handle provided, it's set to point to the card
- Card appears in the list
- Viewer shows the new card

---

### Editing Existing Card

1. **Find a card with a handle** (shows green `@handle` badge)
2. **Click the "Edit" button** on that card
3. **Edit panel opens** with existing content
4. **Modify content** and/or handle name
5. **Click "Update"** to save changes

**Result:**
- New card created with updated content (immutable design)
- Handle updated to point to new version
- Old version still accessible by hash
- Viewer shows the updated card

---

## UI Components

### Edit Panel Structure

```
┌─────────────────────────────────────┐
│ ✏️ New Text Card              [X]   │ ← Header
├─────────────────────────────────────┤
│                                     │
│ 🏷️ Handle Name                      │
│ ┌─────────────────────────────────┐ │
│ │ my-document                     │ │ ← Handle input
│ └─────────────────────────────────┘ │
│ Optional: Give this card a friendly │
│ name for easy reference             │
│                                     │
│ 📝 Content                          │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │ Enter your content here...      │ │
│ │                                 │ │ ← Content textarea
│ │                                 │ │   (300px min height)
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│                    [Cancel] [Create]│ ← Action buttons
└─────────────────────────────────────┘
```

### Edit Button on Cards

```
┌─────────────────────────────────────┐
│ 📝 Text  @my-document      [Edit]   │ ← Edit button
│ d870ed31...                         │
│ ⏰ 2 hours ago  4.15 KB             │
└─────────────────────────────────────┘
```

---

## Technical Implementation

### Panel Modes

The edit panel operates in two modes:

#### **Create Mode**
```javascript
panel.dataset.mode = 'create'
panel.dataset.hash = ''
panel.dataset.handle = ''
```

- Title: "New Text Card"
- Button: "Create"
- Empty content and handle fields

#### **Edit Mode**
```javascript
panel.dataset.mode = 'edit'
panel.dataset.hash = 'abc123...'
panel.dataset.handle = 'my-document'
```

- Title: "Edit: @my-document"
- Button: "Update"
- Pre-filled with existing content and handle

---

### Code Flow

#### Opening Panel for New Card

```javascript
// User clicks "New Text" button
window.createTextCard()
  ↓
manager.createTextCard()
  ↓
manager.openNewTextPanel()
  ↓
// Panel opens with empty fields
// Mode: 'create'
```

#### Opening Panel for Edit

```javascript
// User clicks "Edit" button on card
window.mcardManager.editCard(hash, handle)
  ↓
manager.editCard(hash, handle)
  ↓
// Load existing card content
// Populate panel fields
// Mode: 'edit'
```

#### Saving Changes

```javascript
// User clicks "Create" or "Update"
window.saveEditedCard()
  ↓
// Check mode
if (mode === 'create') {
  // Create new card
  const card = await MCard.create(content)
  await collection.add(card)
  
  // Set handle if provided
  if (handle) {
    await collection.setHandle(handle, card.hash)
  }
}
else if (mode === 'edit') {
  // Create new card (immutable)
  const newCard = await MCard.create(content)
  await collection.add(newCard)
  
  // Update handle to point to new card
  await collection.setHandle(handle, newCard.hash)
}
  ↓
// Reload cards and show new/updated card
await manager.loadCards()
await manager.viewCard(card.hash)
window.closeEditPanel()
```

---

## Content-Addressed Design

### Why Create New Card on Edit?

MCards are **content-addressed** and **immutable**:

1. **Content determines hash** - Hash is derived from content
2. **Immutable** - Once created, content never changes
3. **Handles are mutable** - Pointers to immutable content

### Edit Flow

```
Original Card:
  Hash: abc123...
  Content: "Hello World"
  Handle: @my-doc → abc123...

User edits to "Hello Universe":

New Card Created:
  Hash: def456...  (different hash!)
  Content: "Hello Universe"
  Handle: @my-doc → def456...  (updated pointer)

Old Card Still Exists:
  Hash: abc123...
  Content: "Hello World"
  (No handle, but accessible by hash)
```

### Benefits

- ✅ **Version History** - Old versions still accessible
- ✅ **Data Integrity** - Content never changes
- ✅ **Deduplication** - Same content = same hash
- ✅ **Verification** - Hash proves content authenticity

---

## UI/UX Improvements

### Before (Popup)

```javascript
const content = prompt('Enter text content:');
```

**Problems:**
- ❌ Tiny input box
- ❌ Hard to edit long content
- ❌ No handle assignment
- ❌ Poor UX

### After (Side Panel)

```
Large side panel with:
✅ Big textarea (300px+ height)
✅ Monospace font for code
✅ Handle name input
✅ Clear Cancel/Save buttons
✅ Professional editing experience
```

---

## Examples

### Example 1: Create New Note

**Action:**
1. Click "New Text"
2. Handle: `meeting-notes`
3. Content: "Team meeting on Dec 12..."
4. Click "Create"

**Result:**
```
Card created: 1bff39ea...
Handle set: @meeting-notes → 1bff39ea...
Toast: "Created card with handle @meeting-notes"
```

### Example 2: Edit Existing Document

**Action:**
1. Find card with `@readme` handle
2. Click "Edit" button
3. Update content
4. Click "Update"

**Result:**
```
New card: 7349e1e2...
Handle updated: @readme → 7349e1e2...
Old card still exists: d870ed31...
Toast: "Updated @readme"
```

### Example 3: Create Without Handle

**Action:**
1. Click "New Text"
2. Leave handle empty
3. Content: "Quick note"
4. Click "Create"

**Result:**
```
Card created: 6bd7355a...
No handle set
Toast: "Card created"
```

---

## Keyboard Shortcuts

### In Edit Panel

- **Esc** - Close panel (future enhancement)
- **Cmd+Enter** - Save (future enhancement)
- **Tab** - Indent (native textarea behavior)

---

## Styling

### Panel Appearance

- **Width:** Same as chat panel (~400px)
- **Position:** Slides in from right
- **Background:** White with shadow
- **Font:** Monospace for content area
- **Buttons:** Primary (blue) and Secondary (gray)

### Edit Button

- **Size:** Small (11px font)
- **Color:** Secondary (gray)
- **Icon:** Edit pencil icon
- **Position:** Right side of card header

---

## Error Handling

### Validation

```javascript
// Empty content check
if (!content) {
  alert('Content cannot be empty');
  return;
}

// Handle validation (library handles this)
await collection.setHandle(handle, hash);
// Throws error if handle invalid
```

### Error Messages

- **Empty content:** "Content cannot be empty"
- **Save failed:** "Failed to save card: [error]"
- **Load failed:** "Failed to open editor"

---

## Future Enhancements

### Planned Features

1. **Markdown Preview**
   - Split view: edit | preview
   - Live rendering as you type
   - Syntax highlighting

2. **Keyboard Shortcuts**
   - Esc to close
   - Cmd+S to save
   - Cmd+Enter to save and close

3. **Auto-save Draft**
   - Save to localStorage
   - Restore on panel reopen
   - Prevent data loss

4. **Content Type Selection**
   - Choose: Text, Markdown, JSON, etc.
   - Syntax highlighting per type
   - Format validation

5. **File Upload in Panel**
   - Drag & drop into panel
   - Paste images
   - Attach files

6. **Version Comparison**
   - Show diff between versions
   - Restore previous version
   - Version timeline

---

## Accessibility

### Keyboard Navigation

- ✅ Tab through fields
- ✅ Enter in handle field focuses content
- ✅ Buttons keyboard accessible

### Screen Readers

- ✅ Labels for all inputs
- ✅ Button text descriptive
- ✅ Panel title announces mode

---

## Testing Checklist

### Create New Card

- [ ] Click "New Text" opens panel
- [ ] Panel shows "New Text Card" title
- [ ] Handle and content fields empty
- [ ] Button says "Create"
- [ ] Cancel closes panel
- [ ] Create with handle works
- [ ] Create without handle works
- [ ] Toast shows correct message

### Edit Existing Card

- [ ] Edit button shows on handled cards
- [ ] Edit button doesn't show on cards without handles
- [ ] Click Edit opens panel
- [ ] Panel shows "Edit: @handle" title
- [ ] Content pre-filled correctly
- [ ] Handle pre-filled correctly
- [ ] Button says "Update"
- [ ] Update creates new card
- [ ] Handle points to new card
- [ ] Old card still accessible

### UI/UX

- [ ] Panel slides in smoothly
- [ ] Close button works
- [ ] Textarea resizable
- [ ] Monospace font applied
- [ ] Icons render correctly
- [ ] Responsive on different screens

---

## Summary

**What We Built:**
- ✅ Side panel editor for text cards
- ✅ Edit button for cards with handles
- ✅ Handle name input
- ✅ Large content textarea
- ✅ Create and Update modes

**Benefits:**
- ✅ Better UX than popup
- ✅ Easy content editing
- ✅ Integrated handle management
- ✅ Content-addressed versioning
- ✅ Professional editing experience

**How It Works:**
- Create: New card + optional handle
- Edit: New card + update handle pointer
- Immutable: Old versions preserved
- Accessible: By handle or hash

**Edit panel for powerful content management! ✏️📝✨**
