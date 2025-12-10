/**
 * MCard Manager
 * Main controller for MCard file management system
 * 
 * ✅ NOW USING mcard-js LIBRARY!
 */

// ✅ Import from mcard-js library
import { MCard, IndexedDBEngine, ContentTypeInterpreter } from 'mcard-js';

// Keep UI components (not part of library)
import { UIComponents } from './UIComponents.js';
import { CardViewer } from './CardViewer.js';

export class MCardManager {
  constructor() {
    this.db = null;
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
      const count = await this.db.count();
      console.log(`[MCardManager] Loading ${count} cards...`);
      
      this.allCards = await this.db.getAll();
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
      const contentStr = card.getContentAsText();
      
      // Categorize based on detected type
      if (contentStr.includes('specification:') && contentStr.includes('implementation:')) {
        categories.clm.push(card);
      } else if (contentType.includes('markdown') || contentStr.match(/^#+ |\*\*|\[.*\]\(.*\)/m)) {
        categories.markdown.push(card);
      } else if (contentType.includes('text')) {
        categories.text.push(card);
      } else if (contentType.includes('image')) {
        categories.images.push(card);
      } else if (contentType.includes('video')) {
        categories.videos.push(card);
      } else if (contentType.includes('audio')) {
        categories.audio.push(card);
      } else if (contentType.includes('pdf') || contentType.includes('document')) {
        categories.documents.push(card);
      } else if (contentType.includes('zip') || contentType.includes('archive')) {
        categories.archives.push(card);
      } else {
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
    
    // Search box
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => this.handleSearch(e.target.value));
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
        await this.db.add(card);
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
        await this.db.add(card);
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
      await this.db.add(card);
      await this.loadCards();
      await this.viewCard(card.hash);
      UIComponents.showToast('Text card created', 'success');
    } catch (error) {
      console.error('[MCardManager] Error creating text card:', error);
      UIComponents.showToast('Failed to create card', 'error');
    }
  }
}
