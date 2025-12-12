/**
 * MCard Manager
 * Main controller for MCard file management system
 * 
 * ✅ NOW USING mcard-js LIBRARY!
 * ✅ Added Handle support for friendly names and versioning
 */

// ✅ Import from mcard-js library
import { 
  MCard, 
  CardCollection,
  IndexedDBEngine, 
  ContentTypeInterpreter,
  validateHandle,
  HandleValidationError
} from 'mcard-js';

// Keep UI components (not part of library)
import { UIComponents } from './UIComponents.js';
import { CardViewer } from './CardViewer.js';

export class MCardManager {
  constructor() {
    this.db = null;
    this.collection = null;  // ✅ CardCollection for handle support
    this.allCards = [];
    this.currentType = 'all';
    this.viewer = new CardViewer();
    this.searchDebounceTimer = null;  // For debounced search
  }
  
  /**
   * Initialize the manager
   * ✅ Uses IndexedDBEngine from mcard-js library
   */
  async init() {
    try {
      console.log('[MCardManager] Initializing with mcard-js library...');
      
      // ✅ Initialize IndexedDBEngine from library
      this.db = new IndexedDBEngine('mcard-storage');
      await this.db.init();
      console.log('[MCardManager] ✅ IndexedDBEngine initialized (mcard-js v2.1.8)');
      
      // ✅ Initialize CardCollection for handle support
      this.collection = new CardCollection(this.db);
      console.log('[MCardManager] ✅ CardCollection initialized with handle support');
      
      // Load cards
      console.log('[MCardManager] Starting loadCards...');
      await this.loadCards();
      console.log('[MCardManager] loadCards complete');
      
      // Setup UI
      console.log('[MCardManager] Setting up event listeners...');
      this.setupEventListeners();
      console.log('[MCardManager] Event listeners setup complete');
      
      UIComponents.showToast('MCard Manager ready', 'success');
      console.log('[MCardManager] Initialization complete!');
      
    } catch (error) {
      console.error('[MCardManager] Initialization error:', error);
      console.error('[MCardManager] Error stack:', error.stack);
      UIComponents.showToast('Failed to initialize: ' + error.message, 'error');
    }
  }
  
  /**
   * Create startup/welcome cards for first-time users
   */
  async createStartupCards() {
    try {
      console.log('[MCardManager] Creating startup cards...');
      
      const startupCards = [
        {
          handle: 'welcome',
          content: `# Welcome to MCard Manager! 🎉

MCard Manager is a content-addressed file management system where every file is immutable and cryptographically verified.

## Key Features:
- **Content-Addressed**: Files are identified by their content hash
- **Immutable**: Once created, cards never change
- **Handles**: Use friendly names to reference cards
- **Versioning**: Update handles to point to new versions
- **Type Detection**: Automatic content type recognition

## Getting Started:
1. Read the @quick-guide for step-by-step instructions
2. Check out @example-markdown to see formatting options
3. Click "Upload" to add your own files
4. Click "New Text" to create text cards
5. Use handles (like @welcome) to reference cards

## Learn More:
- **Quick Start**: See @quick-guide for detailed instructions
- **Markdown Examples**: Explore @example-markdown for formatting tips
- **Cross-References**: Click any @handle link to navigate between cards

Enjoy using MCard Manager! 📦✨`
        },
        {
          handle: 'quick-guide',
          content: `# Quick Start Guide 📖

Welcome! This guide will help you get started with MCard Manager.

👉 **New here?** Start with @welcome for an overview.

## Creating Cards:
- **Upload Files**: Click the Upload button or drag & drop
- **New Text Card**: Click "New Text" to create markdown content
- **Supported Types**: Text, Markdown, Images, Videos, Audio, Documents, Archives

## Using Handles:
Handles are friendly names for your cards (like @quick-guide).

### Create a Handle:
1. View a card
2. Click "Create Handle"
3. Enter a name (e.g., "my-document")

### Update a Handle:
1. Edit a card with a handle
2. Save changes
3. The handle now points to the new version

## Navigation:
- **Card Types**: Filter by content type (left sidebar)
- **Search**: Find cards by content or hash
- **View**: Click any card to see its content
- **Handle Links**: Click @handle references to navigate (try clicking @welcome!)

## Markdown Formatting:
Want to see what you can do with markdown? Check out @example-markdown for examples!

## Tips:
- Handles make it easy to reference cards
- Version history tracks all changes
- Content hashing ensures data integrity
- All data is stored locally in your browser
- Use @handle syntax to link between cards

## Related Cards:
- @welcome - Introduction and overview
- @example-markdown - Markdown formatting examples`
        },
        {
          handle: 'example-markdown',
          content: `# Markdown Example 📝

This card demonstrates various markdown formatting options you can use in MCard Manager.

👉 **New here?** Check out @welcome and @quick-guide first!

## Text Formatting:
- **Bold text** - Use \`**text**\`
- *Italic text* - Use \`*text*\`
- \`inline code\` - Use backticks
- ~~Strikethrough~~ - Use \`~~text~~\`

## Lists:
1. First item
2. Second item
3. Third item

### Unordered:
- Bullet point
- Another point
  - Nested point
  - Another nested point

## Code Block:
\`\`\`javascript
// Example code with syntax highlighting
const greeting = "Hello, MCard!";
console.log(greeting);

// You can reference other cards
const welcomeCard = "@welcome";
\`\`\`

## Quotes:
> "Content-addressed storage is the future of data management."
> 
> Use blockquotes for emphasis or citations.

## Handle References:
You can link to other cards using @handle syntax:
- Click @welcome to see the introduction
- Click @quick-guide for instructions
- Click @example-markdown (this card!) to return here

These become **clickable links** automatically! Try it!

## External Links:
You can also create regular links: [MCard Documentation](https://example.com)

## Headers:
Use \`#\` for headers (1-6 levels):
# H1 Header
## H2 Header
### H3 Header

---

**Try editing this card to create your own version!**

💡 **Tip**: When you edit a card with a handle, you create a new version. The handle (@example-markdown) will point to your new version!

## Related Cards:
- @welcome - Back to welcome page
- @quick-guide - Learn how to use MCard Manager`
        }
      ];
      
      for (const { handle, content } of startupCards) {
        const card = await MCard.create(content);
        await this.collection.addWithHandle(card, handle);
        console.log(`[MCardManager] ✅ Created startup card: @${handle}`);
      }
      
      console.log('[MCardManager] ✅ All startup cards created');
      UIComponents.showToast('Welcome cards created! 🎉', 'success');
      
    } catch (error) {
      console.error('[MCardManager] Error creating startup cards:', error);
      // Don't show error toast - this is not critical
    }
  }
  
  /**
   * Update startup cards - ensures they exist and have latest content
   * This runs on every page load/refresh
   */
  async updateStartupCards() {
    try {
      const startupHandles = ['welcome', 'quick-guide', 'example-markdown'];
      const startupCards = [
        {
          handle: 'welcome',
          content: `# Welcome to MCard Manager! 🎉

MCard Manager is a content-addressed file management system where every file is immutable and cryptographically verified.

## Key Features:
- **Content-Addressed**: Files are identified by their content hash
- **Immutable**: Once created, cards never change
- **Handles**: Use friendly names to reference cards
- **Versioning**: Update handles to point to new versions
- **Type Detection**: Automatic content type recognition

## Getting Started:
1. Read the @quick-guide for step-by-step instructions
2. Check out @example-markdown to see formatting options
3. Click "Upload" to add your own files
4. Click "New Text" to create text cards
5. Use handles (like @welcome) to reference cards

## Learn More:
- **Quick Start**: See @quick-guide for detailed instructions
- **Markdown Examples**: Explore @example-markdown for formatting tips
- **Cross-References**: Click any @handle link to navigate between cards

Enjoy using MCard Manager! 📦✨`
        },
        {
          handle: 'quick-guide',
          content: `# Quick Start Guide 📖

Welcome! This guide will help you get started with MCard Manager.

👉 **New here?** Start with @welcome for an overview.

## Creating Cards:
- **Upload Files**: Click the Upload button or drag & drop
- **New Text Card**: Click "New Text" to create markdown content
- **Supported Types**: Text, Markdown, Images, Videos, Audio, Documents, Archives

## Using Handles:
Handles are friendly names for your cards (like @quick-guide).

### Create a Handle:
1. View a card
2. Click "Create Handle"
3. Enter a name (e.g., "my-document")

### Update a Handle:
1. Edit a card with a handle
2. Save changes
3. The handle now points to the new version

## Navigation:
- **Card Types**: Filter by content type (left sidebar)
- **Search**: Find cards by content or hash
- **View**: Click any card to see its content
- **Handle Links**: Click @handle references to navigate (try clicking @welcome!)

## Markdown Formatting:
Want to see what you can do with markdown? Check out @example-markdown for examples!

## Tips:
- Handles make it easy to reference cards
- Version history tracks all changes
- Content hashing ensures data integrity
- All data is stored locally in your browser
- Use @handle syntax to link between cards

## Related Cards:
- @welcome - Introduction and overview
- @example-markdown - Markdown formatting examples`
        },
        {
          handle: 'example-markdown',
          content: `# Markdown Example 📝

This card demonstrates various markdown formatting options you can use in MCard Manager.

👉 **New here?** Check out @welcome and @quick-guide first!

## Text Formatting:
- **Bold text** - Use \`**text**\`
- *Italic text* - Use \`*text*\`
- \`inline code\` - Use backticks
- ~~Strikethrough~~ - Use \`~~text~~\`

## Lists:
1. First item
2. Second item
3. Third item

### Unordered:
- Bullet point
- Another point
  - Nested point
  - Another nested point

## Code Block:
\`\`\`javascript
// Example code with syntax highlighting
const greeting = "Hello, MCard!";
console.log(greeting);

// You can reference other cards
const welcomeCard = "@welcome";
\`\`\`

## Quotes:
> "Content-addressed storage is the future of data management."
> 
> Use blockquotes for emphasis or citations.

## Handle References:
You can link to other cards using @handle syntax:
- Click @welcome to see the introduction
- Click @quick-guide for instructions
- Click @example-markdown (this card!) to return here

These become **clickable links** automatically! Try it!

## External Links:
You can also create regular links: [MCard Documentation](https://example.com)

## Headers:
Use \`#\` for headers (1-6 levels):
# H1 Header
## H2 Header
### H3 Header

---

**Try editing this card to create your own version!**

💡 **Tip**: When you edit a card with a handle, you create a new version. The handle (@example-markdown) will point to your new version!

## Related Cards:
- @welcome - Back to welcome page
- @quick-guide - Learn how to use MCard Manager`
        }
      ];
      
      let created = 0;
      let updated = 0;
      
      for (const { handle, content } of startupCards) {
        // Check if handle exists
        const existingHash = await this.collection.resolveHandle(handle);
        const newCard = await MCard.create(content);
        
        if (existingHash) {
          // Handle exists - check if content changed
          if (existingHash !== newCard.hash) {
            // Content changed - update handle to point to new version
            await this.collection.addWithHandle(newCard, handle);
            console.log(`[MCardManager] ✅ Updated startup card: @${handle} (${existingHash.substring(0, 8)} → ${newCard.hash.substring(0, 8)})`);
            updated++;
          } else {
            console.log(`[MCardManager] ℹ️ Startup card @${handle} unchanged`);
          }
        } else {
          // Handle doesn't exist - create it
          await this.collection.addWithHandle(newCard, handle);
          console.log(`[MCardManager] ✅ Created startup card: @${handle}`);
          created++;
        }
      }
      
      if (created > 0 || updated > 0) {
        const message = created > 0 
          ? `Welcome cards created! 🎉` 
          : `Startup cards updated! ✨`;
        console.log(`[MCardManager] ${created} created, ${updated} updated`);
        if (created > 0) {
          UIComponents.showToast(message, 'success');
        }
      }
      
    } catch (error) {
      console.error('[MCardManager] Error updating startup cards:', error);
      // Don't show error toast - this is not critical
    }
  }
  
  /**
   * Load all cards from the collection
   */
  async loadCards() {
    try {
      const count = await this.collection.count();
      console.log(`[MCardManager] Loading ${count} cards from collection`);
      
      // Always update startup cards on every load to ensure they have latest content
      console.log('[MCardManager] Updating startup cards...');
      await this.updateStartupCards();
      
      const cards = await this.collection.getAllMCardsRaw();
      console.log(`[MCardManager] Loaded ${cards.length} cards`);
      
      console.log('[MCardManager] Rendering file types...');
      const categories = await this.categorizeCards(cards);
      UIComponents.renderFileTypes(cards, this.currentType, categories);
      
      console.log('[MCardManager] Showing cards for type:', this.currentType);
      this.showCardsForType(this.currentType);
      
      console.log('[MCardManager] Updating stats...');
      UIComponents.updateStats(this.allCards.length);
      
      console.log('[MCardManager] Load complete!');
    } catch (error) {
      console.error('[MCardManager] Error loading cards:', error);
      console.error('[MCardManager] Error stack:', error.stack);
      UIComponents.showToast('Failed to load cards', 'error');
    }
  }
  
  /**
   * Categorize cards by content 
   * Uses ContentTypeInterpreter from mcard-js library
   * @param {Array} cards
   * @returns {Promise<Object>} Categories object
   */
  async categorizeCards(cards) {
    const categories = {
      all: cards,
      withHandles: [],
      clm: [],
      markdown: [],
      text: [],
      images: [],
      videos: [],
      audio: [],
      documents: [],
      archives: [],
      other: []
    };
    
    // Fetch all cards with handles
    const cardsWithHandles = new Set();
    if (this.collection && this.collection.engine.db) {
      try {
        const db = this.collection.engine.db;
        const tx = db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const allHandles = await store.getAll();
        
        console.log('[MCardManager] Found handles in DB:', allHandles.length);
        
        // Debug: Log first handle structure
        if (allHandles.length > 0) {
          console.log('[MCardManager] First handle structure:', allHandles[0]);
        }
        
        // Build set of hashes that have handles
        allHandles.forEach(handleObj => {
          // ✅ Handle object structure: { handle: 'name', currentHash: '...' }
          const handleName = handleObj.handle || 'unknown';
          const handleHash = handleObj.currentHash; // ← Use currentHash, not hash
          console.log('[MCardManager] Handle:', handleName, '→', handleHash?.substring(0, 8));
          if (handleHash) {
            cardsWithHandles.add(handleHash);
          }
        });
        
        console.log('[MCardManager] Cards with handles Set size:', cardsWithHandles.size);
      } catch (error) {
        console.error('[MCardManager] Error fetching handles:', error);
      }
    }
    
    for (const card of cards) {
      // Check if this card has handles
      const hasHandle = cardsWithHandles.has(card.hash);
      console.log(`[MCardManager] Card ${card.hash.substring(0, 8)} has handle: ${hasHandle}`);
      
      if (hasHandle) {
        categories.withHandles.push(card);
      }
      
      // Use library's ContentTypeInterpreter
      const contentType = ContentTypeInterpreter.detect(card.getContent());
      const lowerType = contentType.toLowerCase();
      
      // Debug: Log what library detected
      console.log(`[MCardManager] Library detected: "${contentType}" for card ${card.hash.substring(0, 8)}`);
      
      // ✅ Check for images by magic bytes if library says "application/octet-stream"
      let isImage = lowerType.includes('image');
      if (!isImage && lowerType.includes('octet-stream')) {
        // Check magic bytes for common image formats
        const content = card.getContent();
        if (content.length > 4) {
          const bytes = new Uint8Array(content.slice(0, 4));
          // PNG: 89 50 4E 47
          if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            isImage = true;
          }
          // JPEG: FF D8 FF
          else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            isImage = true;
          }
          // GIF: 47 49 46
          else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            isImage = true;
          }
          // WebP: 52 49 46 46 (RIFF)
          else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            isImage = true;
          }
        }
      }
      
      // ✅ TRUST THE LIBRARY FIRST for binary/structured types
      if (isImage) {
        categories.images.push(card);
      } 
      else if (lowerType.includes('video')) {
        categories.videos.push(card);
      } 
      else if (lowerType.includes('audio')) {
        categories.audio.push(card);
      } 
      else if (lowerType.includes('pdf')) {
        categories.documents.push(card);
      } 
      else if (lowerType.includes('zip') || lowerType.includes('archive')) {
        categories.archives.push(card);
      }
      else if (lowerType.includes('json')) {
        categories.other.push(card);
      }
      else if (lowerType.includes('markdown')) {
        categories.markdown.push(card);
      }
      // ✅ Check for YAML (library might detect it)
      else if (lowerType.includes('yaml')) {
        const contentStr = card.getContentAsText();
        // Check if it's a CLM file (YAML with CLM structure)
        if ((contentStr.includes('abstract:') && contentStr.includes('concrete:') && contentStr.includes('balanced:')) ||
            contentStr.includes('clm:')) {
          categories.clm.push(card);
        } else {
          // Regular YAML - put in other for now
          categories.other.push(card);
        }
      }
      // ✅ ENHANCE for text-based types (library might say "text/plain")
      else if (lowerType.includes('text')) {
        const contentStr = card.getContentAsText();
        
        // Check for CLM (YAML-based, highest priority)
        if ((contentStr.includes('abstract:') && contentStr.includes('concrete:') && contentStr.includes('balanced:')) ||
            contentStr.includes('clm:')) {
          categories.clm.push(card);
        }
        // Check for markdown patterns
        else if (
          contentStr.match(/^#{1,6}\s+/m) ||  // Headers
          contentStr.match(/\[.+\]\(.+\)/) ||  // Links
          contentStr.match(/```[\s\S]*?```/) || // Code blocks
          contentStr.match(/^\s*[-*+]\s+/m) ||  // Lists
          contentStr.match(/^\s*\d+\.\s+/m)     // Numbered lists
        ) {
          categories.markdown.push(card);
        }
        // Plain text
        else {
          categories.text.push(card);
        }
      }
      // Other
      else {
        categories.other.push(card);
      }
    }
    
    return categories;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }
    
    // Search box (supports @handle syntax)
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => this.searchByHandle(e.target.value));
      searchBox.placeholder = 'Search files or @handle...';
    }
    
    // Drag and drop
    const uploadSection = document.getElementById('uploadSection');
    if (uploadSection) {
      uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.style.borderColor = '#667eea';
      });
      
      uploadSection.addEventListener('dragleave', () => {
        uploadSection.style.borderColor = '#3e3e42';
      });
      
      uploadSection.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadSection.style.borderColor = '#3e3e42';
        await this.handleFileDrop(e.dataTransfer.files);
      });
    }
  }
  
  /**
   * Handle file upload
   * @param {Event} event
   */
  async handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const card = await MCard.create(bytes);
        await this.collection.add(card);
        console.log(`[MCardManager] Added card: ${card.hash}`);
      } catch (error) {
        console.error(`[MCardManager] Error uploading ${file.name}:`, error);
        UIComponents.showToast(`Failed to upload ${file.name}`, 'error');
      }
    }
    
    await this.loadCards();
    UIComponents.showToast(`Uploaded ${files.length} file(s)`, 'success');
    event.target.value = '';
  }
  
  /**
   * Handle file drop
   * @param {FileList} files
   */
  async handleFileDrop(files) {
    if (!files || files.length === 0) return;
    
    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const card = await MCard.create(bytes);
        await this.collection.add(card);
      } catch (error) {
        console.error(`[MCardManager] Error dropping ${file.name}:`, error);
      }
    }
    
    await this.loadCards();
    UIComponents.showToast(`Added ${files.length} file(s)`, 'success');
  }
  
  /**
   * Select a file type filter
   * @param {string} typeId
   */
  async selectType(typeId) {
    this.currentType = typeId;
    const categories = await this.categorizeCards(this.allCards);
    UIComponents.renderFileTypes(this.allCards, this.currentType, categories);
    this.showCardsForType(typeId);
  }
  
  /**
   * Show cards for selected type
   * @param {string} typeId
   * ✅ Uses ContentTypeInterpreter from library
   */
  async showCardsForType(typeId) {
    // ✅ Categorize using library's ContentTypeInterpreter
    const categories = await this.categorizeCards(this.allCards);
    
    // ✅ Map kebab-case to camelCase for category lookup
    const categoryMap = {
      'with-handles': 'withHandles'
    };
    const categoryKey = categoryMap[typeId] || typeId;
    const cards = categories[categoryKey] || [];
    
    const columnTitle = document.getElementById('columnTitle');
    if (columnTitle) {
      const typeNames = {
        'all': 'All MCards',
        'with-handles': 'MCards with Handles',
        'clm': 'CLM Cards',
        'markdown': 'Markdown Cards',
        'text': 'Text Cards',
        'images': 'Image Cards',
        'videos': 'Video Cards',
        'audio': 'Audio Cards',
        'documents': 'Document Cards',
        'archives': 'Archive Cards',
        'other': 'Other Cards'
      };
      columnTitle.textContent = typeNames[typeId] || 'MCards';
    }
    
    // ✅ Pass collection for handle lookup
    await UIComponents.renderCards(cards, this.collection);
  }
  
  /**
   * View a card
   * @param {string} hash
   */
  async viewCard(hash) {
    try {
      const card = await this.db.get(hash);
      if (!card) {
        UIComponents.showToast('Card not found', 'error');
        return;
      }
      
      // ✅ Pass collection for handle lookup in viewer
      await this.viewer.view(card, this.collection);
      
    } catch (error) {
      console.error('[MCardManager] Error viewing card:', error);
      UIComponents.showToast('Failed to view card', 'error');
    }
  }
  
  /**
   * Download current card
   */
  downloadCurrentCard() {
    const card = this.viewer.getCurrentCard();
    if (!card) return;
    
    const typeInfo = ContentTypeDetector.detect(card);
    const blob = new Blob([card.getContent()], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typeInfo.displayName}-${card.hash.substring(0, 8)}`;
    a.click();
    URL.revokeObjectURL(url);
    
    UIComponents.showToast('Download started', 'success');
  }
  
  /**
   * Delete current card
   */
  async deleteCurrentCard() {
    const card = this.viewer.getCurrentCard();
    if (!card) return;
    
    if (!confirm('Are you sure you want to delete this MCard?')) return;
    
    try {
      await this.db.delete(card.hash);
      await this.loadCards();
      UIComponents.showEmptyViewer();
      UIComponents.showToast('MCard deleted', 'success');
    } catch (error) {
      console.error('[MCardManager] Error deleting card:', error);
      UIComponents.showToast('Failed to delete card', 'error');
    }
  }
  
  /**
   * Copy hash to clipboard
   * @param {string} hash
   */
  async copyHash(hash) {
    try {
      await navigator.clipboard.writeText(hash);
      UIComponents.showToast('Hash copied to clipboard', 'success');
    } catch (error) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = hash;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      UIComponents.showToast('Hash copied', 'success');
    }
  }
  
  /**
   * Handle search with debouncing
   * Searches both content (IndexedDB) and hash (client-side)
   * @param {string} query
   */
  async handleSearch(query) {
    // Clear existing debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // If empty query, show current type
    if (!query.trim()) {
      await this.showCardsForType(this.currentType);
      return;
    }
    
    // Debounce search by 300ms
    this.searchDebounceTimer = setTimeout(async () => {
      try {
        console.log('[MCardManager] Searching for:', query);
        const q = query.toLowerCase();
        
        // ✅ 1. Search by hash (fast, client-side)
        const hashMatches = this.allCards.filter(card => 
          card.hash.toLowerCase().includes(q)
        );
        
        console.log('[MCardManager] Hash matches:', hashMatches.length);
        
        // ✅ 2. Search by handle name (fast, client-side)
        let handleMatches = [];
        try {
          // Get all handles from IndexedDB
          const db = this.collection.engine.db;
          const tx = db.transaction('handles', 'readonly');
          const store = tx.objectStore('handles');
          const allHandles = await store.getAll();
          
          // Find handles that match the query
          const matchingHandles = allHandles.filter(h => 
            h.handle && h.handle.toLowerCase().includes(q)
          );
          
          // Get cards for matching handles
          handleMatches = this.allCards.filter(card =>
            matchingHandles.some(h => h.currentHash === card.hash)
          );
          
          console.log('[MCardManager] Handle matches:', handleMatches.length);
        } catch (handleError) {
          console.log('[MCardManager] Handle search failed:', handleError);
        }
        
        // ✅ 3. Search by content (IndexedDB full-text search)
        let contentMatches = [];
        try {
          const searchResults = await this.collection.engine.search(query, 1, 100);
          contentMatches = searchResults.items;
          console.log('[MCardManager] Content matches:', contentMatches.length);
        } catch (searchError) {
          console.log('[MCardManager] IndexedDB search failed, using client-side filter');
          // Fallback to client-side content search
          contentMatches = this.allCards.filter(card => {
            const content = card.getContentAsText().toLowerCase();
            return content.includes(q);
          });
        }
        
        // ✅ Combine all results (remove duplicates by hash)
        const resultMap = new Map();
        
        // Add hash matches first (highest priority)
        hashMatches.forEach(card => {
          resultMap.set(card.hash, card);
        });
        
        // Add handle matches (second priority)
        handleMatches.forEach(card => {
          if (!resultMap.has(card.hash)) {
            resultMap.set(card.hash, card);
          }
        });
        
        // Add content matches (third priority)
        contentMatches.forEach(card => {
          if (!resultMap.has(card.hash)) {
            resultMap.set(card.hash, card);
          }
        });
        
        const combinedResults = Array.from(resultMap.values());
        
        console.log('[MCardManager] Total unique results:', combinedResults.length);
        
        // Update column title to show search results
        const columnTitle = document.getElementById('columnTitle');
        if (columnTitle) {
          const hashCount = hashMatches.length;
          const handleCount = handleMatches.length;
          const contentCount = contentMatches.length;
          const total = combinedResults.length;
          columnTitle.textContent = `Search: "${query}" (${total} results: ${hashCount} hash, ${handleCount} handle, ${contentCount} content)`;
        }
        
        // Render combined results
        await UIComponents.renderCards(combinedResults, this.collection);
        
      } catch (error) {
        console.error('[MCardManager] Search error:', error);
        
        // Ultimate fallback: simple client-side search
        console.log('[MCardManager] Using ultimate fallback search');
        const filtered = this.allCards.filter(card => {
          const content = card.getContentAsText().toLowerCase();
          const hash = card.hash.toLowerCase();
          const q = query.toLowerCase();
          return content.includes(q) || hash.includes(q);
        });
        
        const columnTitle = document.getElementById('columnTitle');
        if (columnTitle) {
          columnTitle.textContent = `Search: "${query}" (${filtered.length} results)`;
        }
        
        await UIComponents.renderCards(filtered, this.collection);
      }
    }, 300); // 300ms debounce
  }
  
  /**
   * Open edit panel for creating new text card
   */
  openNewTextPanel() {
    const panel = document.getElementById('editPanel');
    const titleText = document.getElementById('editPanelTitleText');
    const handleInput = document.getElementById('editHandleName');
    const contentArea = document.getElementById('editContentArea');
    const saveButtonText = document.getElementById('editSaveButtonText');
    
    // Reset panel
    titleText.textContent = 'New Text Card';
    handleInput.value = '';
    contentArea.value = '';
    saveButtonText.textContent = 'Create';
    
    // Store mode
    panel.dataset.mode = 'create';
    panel.dataset.hash = '';
    panel.dataset.handle = '';
    
    // Show panel
    panel.classList.remove('hidden');
    
    // Focus content area
    setTimeout(() => {
      contentArea.focus();
      if (window.lucide) lucide.createIcons();
    }, 100);
  }
  
  /**
   * Toggle in-place edit mode in viewer
   */
  async toggleEditMode(hash, handle) {
    try {
      const card = await this.db.get(hash);
      if (!card) {
        UIComponents.showToast('Card not found', 'error');
        return;
      }
      
      const viewerContent = document.getElementById('viewerContent');
      const editBtn = document.getElementById('editBtn');
      const saveBtn = document.getElementById('saveBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      
      // Store original content for cancel
      if (!viewerContent.dataset.originalContent) {
        viewerContent.dataset.originalContent = card.getContentAsText();
        viewerContent.dataset.originalHash = hash;
      }
      
      // Replace viewer content with textarea
      viewerContent.innerHTML = `
        <textarea 
          id="inPlaceEditor" 
          style="
            width: 100%; 
            height: 100%; 
            background: #1e1e1e; 
            color: #d4d4d4; 
            border: 1px solid #3e3e42; 
            border-radius: 4px; 
            padding: 16px; 
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace; 
            font-size: 13px; 
            line-height: 1.6; 
            resize: none;
            outline: none;
          "
        >${card.getContentAsText()}</textarea>
      `;
      
      // Toggle buttons
      editBtn.style.display = 'none';
      saveBtn.style.display = 'flex';
      cancelBtn.style.display = 'flex';
      
      // Focus editor
      setTimeout(() => {
        document.getElementById('inPlaceEditor').focus();
      }, 100);
      
      console.log('[MCardManager] Entered edit mode for:', handle, hash.substring(0, 8));
    } catch (error) {
      console.error('[MCardManager] Error entering edit mode:', error);
      UIComponents.showToast('Failed to enter edit mode', 'error');
    }
  }
  
  /**
   * Save in-place edit
   */
  async saveInPlaceEdit(hash, handle) {
    try {
      const editor = document.getElementById('inPlaceEditor');
      if (!editor) {
        UIComponents.showToast('Editor not found', 'error');
        return;
      }
      
      const newContent = editor.value;
      if (!newContent.trim()) {
        UIComponents.showToast('Content cannot be empty', 'error');
        return;
      }
      
      // Create new card with updated content
      const { MCard } = await import('mcard-js');
      const newCard = await MCard.create(newContent);
      await this.collection.add(newCard);
      
      // Update handle to point to new card
      await this.collection.updateHandle(handle, newCard);
      
      // Reload and view updated card
      await this.loadCards();
      await this.viewCard(newCard.hash);
      
      UIComponents.showToast(`Saved @${handle}`, 'success');
      console.log('[MCardManager] Saved in-place edit for:', handle);
    } catch (error) {
      console.error('[MCardManager] Error saving edit:', error);
      UIComponents.showToast('Failed to save: ' + error.message, 'error');
    }
  }
  
  /**
   * Cancel in-place edit mode
   */
  async cancelEditMode(hash) {
    try {
      // Re-render the original card
      await this.viewCard(hash);
      console.log('[MCardManager] Cancelled edit mode');
    } catch (error) {
      console.error('[MCardManager] Error cancelling edit:', error);
      UIComponents.showToast('Failed to cancel edit', 'error');
    }
  }
  
  /**
   * Create a new text card (legacy - now uses panel)
   */
  async createTextCard() {
    // Open the edit panel instead of using prompt
    this.openNewTextPanel();
  }
  
  // =========== Handle Management ===========
  
  /**
   * Create a handle for a card
   * ✅ Uses library's handle validation and CardCollection
   * @param {string} hash - Card hash
   */
  async createHandle(hash) {
    const handleName = prompt('Enter a friendly name for this card:\n(e.g., my-document, 文檔, مستند)');
    if (!handleName) return;
    
    try {
      // ✅ Validate handle using library
      validateHandle(handleName);
      
      // Verify card exists
      const card = await this.collection.get(hash);
      if (!card) {
        throw new Error('Card not found');
      }
      
      // ✅ Register handle directly (card already exists)
      await this.collection.engine.registerHandle(handleName, hash);
      
      UIComponents.showToast(`Handle "${handleName}" created`, 'success');
      
      // Refresh view to show handle
      await this.loadCards(); // Reload to show handle in list
      await this.viewCard(hash);
      
    } catch (error) {
      if (error instanceof HandleValidationError) {
        UIComponents.showToast(`Invalid handle: ${error.message}`, 'error');
      } else {
        console.error('[MCardManager] Error creating handle:', error);
        UIComponents.showToast('Failed to create handle: ' + error.message, 'error');
      }
    }
  }
  
  /**
   * Get card by handle
   * ✅ Uses CardCollection.getByHandle
   * @param {string} handle - Handle name
   */
  async getByHandle(handle) {
    try {
      const card = await this.collection.getByHandle(handle);
      if (card) {
        await this.viewCard(card.hash);
      } else {
        UIComponents.showToast(`Handle "${handle}" not found`, 'error');
      }
    } catch (error) {
      console.error('[MCardManager] Error getting by handle:', error);
      UIComponents.showToast('Failed to resolve handle', 'error');
    }
  }
  
  /**
   * Update handle to point to new card
   * ✅ Uses CardCollection.updateHandle
   * @param {string} handle - Handle name
   * @param {string} newHash - New card hash
   */
  async updateHandle(handle, newHash) {
    try {
      const card = await this.collection.get(newHash);
      if (!card) {
        throw new Error('Card not found');
      }
      
      await this.collection.updateHandle(handle, card);
      UIComponents.showToast(`Handle "${handle}" updated`, 'success');
      
      // Refresh view
      await this.viewCard(newHash);
      
    } catch (error) {
      console.error('[MCardManager] Error updating handle:', error);
      UIComponents.showToast('Failed to update handle', 'error');
    }
  }
  
  /**
   * Get handle history
   * ✅ Uses CardCollection.getHandleHistory
   * @param {string} handle - Handle name
   */
  async getHandleHistory(handle) {
    try {
      const history = await this.collection.getHandleHistory(handle);
      
      if (!history || history.length === 0) {
        UIComponents.showToast(`No history for "${handle}"`, 'info');
        return;
      }
      
      // Display history in a modal or panel
      this.showHandleHistory(handle, history);
      
    } catch (error) {
      console.error('[MCardManager] Error getting handle history:', error);
      UIComponents.showToast('Failed to get history', 'error');
    }
  }
  
  /**
   * Show handle history UI
   * @param {string} handle - Handle name
   * @param {Array} history - History entries
   */
  showHandleHistory(handle, history) {
    const historyHtml = `
      <div class="handle-history-modal">
        <div class="handle-history-header">
          <h3>Version History: ${handle}</h3>
          <button onclick="this.closest('.handle-history-modal').remove()">×</button>
        </div>
        <div class="handle-history-content">
          ${history.map((entry, index) => `
            <div class="history-entry">
              <div class="history-version">Version ${history.length - index}</div>
              <div class="history-hash">${entry.hash.substring(0, 16)}...</div>
              <div class="history-time">${new Date(entry.timestamp).toLocaleString()}</div>
              <button onclick="window.mcardManager.viewCard('${entry.hash}')">View</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Add to page
    const container = document.createElement('div');
    container.innerHTML = historyHtml;
    document.body.appendChild(container.firstElementChild);
  }
  
  /**
   * Search by handle
   * @param {string} query - Search query
   */
  async searchByHandle(query) {
    if (query.startsWith('@')) {
      // Handle search (e.g., @my-document)
      const handle = query.substring(1);
      await this.getByHandle(handle);
    } else {
      // Regular search
      this.handleSearch(query);
    }
  }
}
