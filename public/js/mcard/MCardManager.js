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
   * Load all cards from storage
   */
  async loadCards() {
    try {
      const count = await this.collection.count();
      console.log(`[MCardManager] Loading ${count} cards...`);
      
      this.allCards = await this.collection.getAll();
      console.log(`[MCardManager] Loaded ${this.allCards.length} cards`);
      
      console.log('[MCardManager] Rendering file types...');
      const categories = this.categorizeCards(this.allCards);
      UIComponents.renderFileTypes(this.allCards, this.currentType, categories);
      
      console.log('[MCardManager] Showing cards for type:', this.currentType);
      this.showCardsForType(this.currentType);
      
      console.log('[MCardManager] Updating stats...');
      UIComponents.updateStats(count);
      
      console.log('[MCardManager] Load complete!');
    } catch (error) {
      console.error('[MCardManager] Error loading cards:', error);
      console.error('[MCardManager] Error stack:', error.stack);
      UIComponents.showToast('Failed to load cards', 'error');
    }
  }
  
  /**
   * Categorize cards by content type
   * ✅ Uses ContentTypeInterpreter from mcard-js library
   * @param {Array} cards
   * @returns {Object} Categories object
   */
  categorizeCards(cards) {
    const categories = {
      all: cards,
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
    
    for (const card of cards) {
      // ✅ Use library's ContentTypeInterpreter
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
  selectType(typeId) {
    this.currentType = typeId;
    const categories = this.categorizeCards(this.allCards);
    UIComponents.renderFileTypes(this.allCards, this.currentType, categories);
    this.showCardsForType(typeId);
  }
  
  /**
   * Show cards for selected type
   * @param {string} typeId
   * ✅ Uses ContentTypeInterpreter from library
   */
  showCardsForType(typeId) {
    // ✅ Categorize using library's ContentTypeInterpreter
    const categories = this.categorizeCards(this.allCards);
    const cards = categories[typeId] || [];
    
    const columnTitle = document.getElementById('columnTitle');
    if (columnTitle) {
      const typeNames = {
        'all': 'All MCards',
        'clm': 'CLM Files',
        'markdown': 'Markdown Files',
        'text': 'Text Files',
        'images': 'Images',
        'videos': 'Videos',
        'audio': 'Audio Files',
        'documents': 'Documents',
        'archives': 'Archives',
        'other': 'Other Files'
      };
      columnTitle.textContent = typeNames[typeId] || 'MCards';
    }
    
    UIComponents.renderCardList(cards);
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
      
      await this.viewer.view(card);
      
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
   * Handle search
   * @param {string} query
   */
  handleSearch(query) {
    if (!query.trim()) {
      this.showCardsForType(this.currentType);
      return;
    }
    
    const filtered = this.allCards.filter(card => {
      const content = card.getContentAsText().toLowerCase();
      const hash = card.hash.toLowerCase();
      const q = query.toLowerCase();
      return content.includes(q) || hash.includes(q);
    });
    
    UIComponents.renderCardList(filtered);
  }
  
  /**
   * Create a new text card
   */
  async createTextCard() {
    const content = prompt('Enter text content:');
    if (!content) return;
    
    try {
      const card = await MCard.create(content);
      await this.collection.add(card);
      await this.loadCards();
      await this.viewCard(card.hash);
      UIComponents.showToast('Text card created', 'success');
    } catch (error) {
      console.error('[MCardManager] Error creating text card:', error);
      UIComponents.showToast('Failed to create card', 'error');
    }
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
      
      // Get the card
      const card = await this.collection.get(hash);
      if (!card) {
        throw new Error('Card not found');
      }
      
      // ✅ Add with handle using CardCollection
      await this.collection.addWithHandle(card, handleName);
      
      UIComponents.showToast(`Handle "${handleName}" created`, 'success');
      
      // Refresh view to show handle
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
