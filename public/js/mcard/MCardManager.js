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
import { UIComponents } from './UIComponents.js?v=12';
import { CardViewer } from './CardViewer.js?v=12';
import { ContentTypeDetector } from './BrowserContentTypeDetector.js?v=12';
import { getDemoMCardImportSources } from './DemoMCardImportSources.js';

export class MCardManager {
  constructor() {
    this.db = null;
    this.collection = null;  // ✅ CardCollection for handle support
    this.allCards = [];
    this.currentType = 'all';
    this.viewer = new CardViewer();
    this.searchDebounceTimer = null;  // For debounced search
  }

  _sanitizeHandlePart(value) {
    return String(value)
      .toLowerCase()
      .replace(/\.[^./\\]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async _listDirectoryPaths(dirPath) {
    try {
      const res = await fetch(`${dirPath}?t=${Date.now()}`, { cache: 'no-cache' });
      if (!res.ok)
        return [];

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'));

      return links
        .filter(a => {
          const href = a.getAttribute('href');
          return href && href !== '../' && href !== './';
        })
        .map(a => {
          const href = a.getAttribute('href');
          // Support serve-index (no trailing slash but has icon-directory class)
          // or standard nginx/apache (trailing slash)
          const isDirClass = a.classList.contains('icon-directory') || a.parentElement?.classList?.contains('icon-directory');
          const isDir = href.endsWith('/') || isDirClass;

          const pathname = new URL(href, window.location.origin + dirPath).pathname;
          return { pathname, isDir };
        })
        .filter(item => {
          // Ensure it's a child path
          // Note: serve-index hrefs are usually relative (foo) or absolute path (/public/...)
          // pathname resolution should handle it.
          // We just want to ensure we don't go up.
          return item.pathname.startsWith(dirPath) && item.pathname !== dirPath;
        });
    } catch (e) {
      return [];
    }
  }

  async _collectFilesRecursively(rootDirPath, maxFiles = 500) {
    const results = [];
    const visited = new Set();
    const queue = [rootDirPath.endsWith('/') ? rootDirPath : `${rootDirPath}/`];

    while (queue.length > 0 && results.length < maxFiles) {
      const dirPath = queue.shift();
      if (visited.has(dirPath))
        continue;
      visited.add(dirPath);

      const items = await this._listDirectoryPaths(dirPath);
      for (const item of items) {
        if (item.isDir) {
          if (!visited.has(item.pathname)) {
            queue.push(item.pathname);
          }
        } else {
          results.push(item.pathname);
          if (results.length >= maxFiles)
            break;
        }
      }
    }

    return results;
  }

  async _upsertHandleLoaded({ handle, url, isBinary, updateIfChanged }) {
    const contentRes = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-cache' });
    if (!contentRes.ok) {
      console.warn(`[MCardManager] Demo asset not found for @${handle}:`, url, contentRes.status);
      return;
    }

    let newCard;
    if (isBinary) {
      const buf = await contentRes.arrayBuffer();
      newCard = await MCard.create(new Uint8Array(buf));
    } else {
      const text = await contentRes.text();
      newCard = await MCard.create(text);
    }

    const existingHash = await this.collection.resolveHandle(handle);
    if (existingHash) {
      // Handle already exists
      if (!updateIfChanged || existingHash === newCard.hash) {
        return;
      }

      const existingContent = await this.collection.get(newCard.hash);
      if (!existingContent) {
        await this.collection.add(newCard);
      }
      await this.collection.updateHandle(handle, newCard);
      return;
    }

    const existingContent = await this.collection.get(newCard.hash);
    if (existingContent) {
      await this.collection.engine.registerHandle(handle, newCard.hash);
    } else {
      await this.collection.addWithHandle(newCard, handle);
    }
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

      // Load startup demo cards
      console.log('[MCardManager] Loading startup cards...');
      await this.updateStartupCards();
      console.log('[MCardManager] Startup cards loaded');

      // Load cards from database
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

  async updateStartupCards() {
    if (!this.collection) return;

    const sources = await getDemoMCardImportSources();
    for (const source of sources) {
      if (!source || !source.kind)
        continue;

      if (source.kind === 'manifest') {
        try {
          const res = await fetch(`${source.url}?t=${Date.now()}`, { cache: 'no-cache' });
          if (!res.ok)
            continue;

          const entries = await res.json();
          if (!Array.isArray(entries) || entries.length === 0)
            continue;

          for (const entry of entries) {
            if (!entry || !entry.handle || !entry.path)
              continue;

            const handle = String(entry.handle).trim();
            try {
              validateHandle(handle);
            } catch (ve) {
              console.warn(`[MCardManager] Invalid handle in manifest: ${handle}`, ve);
              continue;
            }

            const relativePath = String(entry.path).replace(/^\/+/, '');
            const baseUrl = (source.baseUrl || '/').endsWith('/') ? (source.baseUrl || '/') : `${source.baseUrl}/`;
            const url = `${baseUrl}${relativePath}`;

            console.log(`[MCardManager] Loading manifest entry: ${handle} -> ${url}`);

            const ext = relativePath.split('.').pop().toLowerCase();
            const textExts = source.textExtensions || [];
            const inferredBinary = textExts.length > 0 ? !textExts.includes(ext) : !!entry.isBinary;
            const isBinary = typeof entry.isBinary === 'boolean' ? entry.isBinary : inferredBinary;

            try {
              await this._upsertHandleLoaded({ handle, url, isBinary, updateIfChanged: !!source.updateIfChanged });
            } catch (loadErr) {
              console.error(`[MCardManager] Failed to load ${handle}:`, loadErr);
            }
          }
        } catch (e) {
          console.error('[MCardManager] Error processing manifest source:', e);
        }

        continue;
      }

      if (source.kind === 'directory') {
        try {
          const dir = source.dir;
          if (!dir)
            continue;

          const files = source.recursive
            ? await this._collectFilesRecursively(dir)
            : (await this._listDirectoryPaths(dir)).filter(i => !i.isDir).map(i => i.pathname);

          for (const pathname of files) {
            if (Array.isArray(source.skipPrefixes) && source.skipPrefixes.some(p => pathname.startsWith(p)))
              continue;

            const relative = pathname.replace(/^\/public\//, '');
            const ext = (relative.split('.').pop() || '').toLowerCase();

            if (Array.isArray(source.includeExtensions) && source.includeExtensions.length > 0) {
              if (!source.includeExtensions.includes(ext))
                continue;
            }

            const handlePrefix = source.handlePrefix || 'data';
            const handleKey = source.recursive ? relative : (relative.split('/').pop() || relative);
            const handlePart = this._sanitizeHandlePart(handleKey);
            const normalizedHandlePart = handlePart.replace(new RegExp(`^${handlePrefix}-`), '');
            const handle = normalizedHandlePart ? `${handlePrefix}-${normalizedHandlePart}` : handlePrefix;
            try {
              validateHandle(handle);
            } catch {
              continue;
            }

            const textExts = source.textExtensions || [];
            const isBinary = source.isBinaryByDefault
              ? (textExts.length > 0 ? !textExts.includes(ext) : true)
              : (textExts.length > 0 ? !textExts.includes(ext) : false);

            await this._upsertHandleLoaded({ handle, url: pathname, isBinary, updateIfChanged: !!source.updateIfChanged });
          }
        } catch (e) {
        }
      }
    }
  }


  /**
   * Load all cards from the collection
   */
  async loadCards() {
    try {
      const count = await this.collection.count();
      console.log(`[MCardManager] Loading ${count} cards from collection`);

      // NOTE: updateStartupCards() is now only called once in init(), not on every load
      // This prevents duplicate event regeneration on page refresh

      const cards = await this.collection.getAllMCardsRaw();
      console.log(`[MCardManager] Loaded ${cards.length} cards`);

      // Store cards in instance variable
      this.allCards = cards;

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
    console.log('[MCardManager] ✅ Using ContentTypeDetector for categorization');

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
      duplications: [],
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
            // Store mapping for category detection
            this._handleMap = this._handleMap || new Map();
            this._handleMap.set(handleHash, handleName);
          }
        });

        console.log('[MCardManager] Cards with handles Set size:', cardsWithHandles.size);
      } catch (error) {
        console.error('[MCardManager] Error fetching handles:', error);
      }
    }

    // Ensure handle map exists even if DB fail
    this._handleMap = this._handleMap || new Map();

    for (const card of cards) {
      // Check if this card has handles
      const hasHandle = cardsWithHandles.has(card.hash);

      if (hasHandle) {
        categories.withHandles.push(card);
      }

      // ✅ Use ContentTypeDetector for unified detection
      const typeInfo = ContentTypeDetector.detect(card);
      const type = typeInfo.type;

      console.log(`[MCardManager] Detected "${type}" (${typeInfo.displayName}) for card ${card.hash.substring(0, 8)}`);

      // Categorize by detected type
      if (type === 'clm') {
        categories.clm.push(card);
      }
      else if (type === 'duplicate') {
        categories.duplications.push(card);
      }
      else if (type === 'markdown') {
        categories.markdown.push(card);
      }
      else if (type === 'text' || type === 'json') {
        categories.text.push(card);
      }
      else if (type === 'image') {
        categories.images.push(card);
      }
      else if (type === 'audio') {
        categories.audio.push(card);
      }
      else if (type === 'video') {
        categories.videos.push(card);
      }
      else if (type === 'pdf') {
        categories.documents.push(card);
      }
      else {
        // Everything else goes to other
        categories.other.push(card);
      }
    }

    // Sort CLM cards by handle for better UX
    categories.clm.sort((a, b) => {
      const hA = this._handleMap.get(a.hash) || '';
      const hB = this._handleMap.get(b.hash) || '';
      return hA.localeCompare(hB);
    });

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

    // Toggle batch remove button
    const batchRemoveBtn = document.getElementById('batchRemoveBtn');
    if (batchRemoveBtn) {
      batchRemoveBtn.style.display = (typeId === 'duplications') ? 'flex' : 'none';
      if (typeId === 'duplications' && window.lucide) {
        setTimeout(() => lucide.createIcons(), 50);
      }
    }

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
        'duplications': 'Duplicate Events',
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
    console.log('[MCardManager] deleteCurrentCard called');
    const card = this.viewer.getCurrentCard();
    if (!card) {
      console.warn('[MCardManager] No card found in viewer');
      return;
    }
    console.log('[MCardManager] Deleting card:', card.hash);

    // Use custom confirmation to avoid browser auto-dismiss issues
    const confirmed = await this.showConfirmDialog('Are you sure you want to delete this MCard?');
    if (!confirmed) {
      console.log('[MCardManager] Delete cancelled by user');
      return;
    }

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
   * Remove all duplicate event cards in a batch
   */
  async batchRemoveDuplications() {
    console.log('[MCardManager] batchRemoveDuplications called');
    const categories = await this.categorizeCards(this.allCards);
    const dupes = categories.duplications || [];
    console.log(`[MCardManager] Found ${dupes.length} duplicates`);

    if (dupes.length === 0) {
      UIComponents.showToast('No duplications to remove', 'info');
      return;
    }

    // Use custom confirmation
    const confirmed = await this.showConfirmDialog(`Are you sure you want to remove all ${dupes.length} duplicate events?`);
    if (!confirmed) {
      console.log('[MCardManager] Batch remove cancelled by user');
      return;
    }

    try {
      for (const card of dupes) {
        await this.db.delete(card.hash);
      }
      await this.loadCards();
      UIComponents.showToast(`Removed ${dupes.length} duplicate events`, 'success');
    } catch (error) {
      console.error('[MCardManager] Error batch removing duplications:', error);
      UIComponents.showToast('Failed to remove duplications', 'error');
    }
  }

  /**
   * Show custom confirmation dialog (replaces native confirm())
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  showConfirmDialog(message) {
    return new Promise((resolve) => {
      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Create dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #1e1e1e;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;

      dialog.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px;">Confirm</h3>
        <p style="margin: 0 0 24px 0; color: #ccc; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancelBtn" style="
            background: #3e3e42;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
          <button id="confirmBtn" style="
            background: #e74c3c;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Delete</button>
        </div>
      `;

      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      const cleanup = () => {
        document.body.removeChild(backdrop);
      };

      dialog.querySelector('#confirmBtn').onclick = () => {
        cleanup();
        resolve(true);
      };

      dialog.querySelector('#cancelBtn').onclick = () => {
        cleanup();
        resolve(false);
      };

      // ESC key to cancel
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          document.removeEventListener('keydown', handleKeydown);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleKeydown);
    });
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
   * Open card creation form in viewer area
   */
  openNewTextPanel() {
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerActions = document.getElementById('viewerActions');
    const viewerContent = document.getElementById('viewerContent');

    // Update title
    viewerTitle.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <span style="font-size: 16px; font-weight: 600;">Create New Card</span>
      </div>
    `;

    // Hide default viewer actions
    viewerActions.style.display = 'none';

    // Show creation form in viewer content
    viewerContent.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <!-- Handle Name Input -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #cccccc;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;">
              <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path>
              <circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle>
            </svg>
            Handle Name (Optional)
          </label>
          <input 
            type="text" 
            id="newCardHandle" 
            class="search-box" 
            placeholder="e.g., my-document, readme, notes"
            style="width: 100%; padding: 12px; background: #1e1e1e; border: 1px solid #3e3e42; border-radius: 4px; color: #cccccc; font-size: 14px;"
          />
          <p style="font-size: 12px; color: #888; margin-top: 6px;">
            💡 Give this card a friendly name for easy reference (e.g., @my-document)
          </p>
        </div>

        <!-- Content Editor -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #cccccc;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;">
              <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
              <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
              <path d="M10 9H8"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
            </svg>
            Content
          </label>
          <textarea 
            id="newCardContent" 
            placeholder="Enter your content here...

Supports:
• Markdown formatting
• @handle references (e.g., @welcome, @quick-guide)
• Mermaid diagrams
• Code blocks with syntax highlighting

Try creating a card with some markdown!"
            style="width: 100%; min-height: 400px; padding: 12px; background: #1e1e1e; border: 1px solid #3e3e42; border-radius: 4px; color: #cccccc; font-family: 'Monaco', 'Menlo', 'Courier New', monospace; font-size: 13px; line-height: 1.6; resize: vertical;"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 12px; border-top: 1px solid #3e3e42;">
          <button 
            class="btn btn-secondary" 
            onclick="window.mcardManager.cancelNewCard()"
            style="font-size: 14px; padding: 10px 24px; display: flex; align-items: center; gap: 8px;"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
            Cancel
          </button>
          <button 
            class="btn" 
            onclick="window.mcardManager.saveNewCard()"
            style="font-size: 14px; padding: 10px 24px; display: flex; align-items: center; gap: 8px; background: #007acc;"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
              <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path>
              <path d="M7 3v4a1 1 0 0 0 1 1h7"></path>
            </svg>
            Create Card
          </button>
        </div>
      </div>
    `;

    // Focus content area
    setTimeout(() => {
      const contentArea = document.getElementById('newCardContent');
      if (contentArea) contentArea.focus();
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

      // Update handle to point to new card (if handle exists)
      if (handle) {
        await this.collection.updateHandle(handle, newCard);
        UIComponents.showToast(`Saved @${handle}`, 'success');
        console.log('[MCardManager] Saved in-place edit for:', handle);
      } else {
        UIComponents.showToast('Card saved successfully', 'success');
        console.log('[MCardManager] Saved card without handle');
      }

      // Reload and view updated card
      await this.loadCards();
      await this.viewCard(newCard.hash);

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
   * Save new card from creation form
   */
  async saveNewCard() {
    try {
      const handleInput = document.getElementById('newCardHandle');
      const contentArea = document.getElementById('newCardContent');

      if (!contentArea) {
        UIComponents.showToast('Content area not found', 'error');
        return;
      }

      const content = contentArea.value.trim();
      const handle = handleInput ? handleInput.value.trim() : '';

      if (!content) {
        UIComponents.showToast('Please enter some content', 'error');
        return;
      }

      // Create the card
      const { MCard } = await import('mcard-js');
      const newCard = await MCard.create(content);

      // Add to collection
      if (handle) {
        // Validate handle
        if (!/^[a-z0-9-]+$/.test(handle)) {
          UIComponents.showToast('Handle must contain only lowercase letters, numbers, and hyphens', 'error');
          return;
        }

        // Check if handle exists
        const existingHash = await this.collection.resolveHandle(handle);
        if (existingHash) {
          UIComponents.showToast(`Handle @${handle} already exists`, 'error');
          return;
        }

        // Add with handle
        await this.collection.addWithHandle(newCard, handle);
        UIComponents.showToast(`Created card with handle @${handle}`, 'success');
        console.log(`[MCardManager] Created card with handle: @${handle}`);
      } else {
        // Add without handle
        await this.collection.add(newCard);
        UIComponents.showToast('Card created successfully', 'success');
        console.log('[MCardManager] Created card without handle');
      }

      // Reload cards and view the new one
      await this.loadCards();
      await this.viewCard(newCard.hash);

    } catch (error) {
      console.error('[MCardManager] Error creating card:', error);
      UIComponents.showToast('Failed to create card: ' + error.message, 'error');
    }
  }

  /**
   * Cancel new card creation
   */
  cancelNewCard() {
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerContent = document.getElementById('viewerContent');

    // Reset viewer to default state
    viewerTitle.textContent = 'Select an MCard';
    viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 64px; height: 64px; color: #666;">
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
          </svg>
        </div>
        <p style="color: #888; font-size: 14px;">Select a card from the list to view its content</p>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    console.log('[MCardManager] Cancelled card creation');
  }

  /**
   * Create a new text card (legacy - now uses panel)
   */
  async createTextCard() {
    // Open the creation form in viewer area
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

  /**
   * Apply search filters and refresh results
   */
  async applyFiltersAndSearch() {
    const searchBox = document.getElementById('searchBox');
    const query = searchBox ? searchBox.value : '';

    // Get current cards for the selected type
    let cards = await this.getCardsForType(this.currentType);

    // Apply filters if they exist
    if (window.searchFilters) {
      const filters = window.searchFilters;

      // Filter by handles
      if (filters.withHandles) {
        const cardsWithHandles = new Set();
        try {
          const db = this.collection.engine.db;
          const tx = db.transaction('handles', 'readonly');
          const store = tx.objectStore('handles');
          const allHandles = await store.getAll();
          allHandles.forEach(h => cardsWithHandles.add(h.currentHash));
        } catch (e) {
          console.warn('[MCardManager] Failed to get handles:', e);
        }
        cards = cards.filter(card => cardsWithHandles.has(card.hash));
      }

      // Filter by capital letters (content starts with capital)
      if (filters.capital) {
        cards = cards.filter(card => {
          const content = card.getContentAsText().trim();
          return content.length > 0 && content[0] === content[0].toUpperCase() && content[0] !== content[0].toLowerCase();
        });
      }

      // Filter by markdown
      if (filters.markdown) {
        cards = cards.filter(card => {
          const contentType = ContentTypeInterpreter.detect(card.getContent());
          return contentType.toLowerCase().includes('markdown') ||
            card.getContentAsText().includes('# ') ||
            card.getContentAsText().includes('## ');
        });
      }

      // Filter by images
      if (filters.images) {
        cards = cards.filter(card => {
          const contentType = ContentTypeInterpreter.detect(card.getContent());
          return contentType.toLowerCase().includes('image');
        });
      }

      // Filter by videos
      if (filters.videos) {
        cards = cards.filter(card => {
          const contentType = ContentTypeInterpreter.detect(card.getContent());
          return contentType.toLowerCase().includes('video');
        });
      }

      // Apply sorting
      if (filters.sortBy === 'oldest') {
        cards.sort((a, b) => a.hash.localeCompare(b.hash));
      } else if (filters.sortBy === 'newest') {
        cards.sort((a, b) => b.hash.localeCompare(a.hash));
      } else if (filters.sortBy === 'name') {
        cards.sort((a, b) => {
          const aText = a.getContentAsText().substring(0, 50);
          const bText = b.getContentAsText().substring(0, 50);
          return aText.localeCompare(bText);
        });
      }
    }

    // Apply text search if query exists
    if (query.trim()) {
      const q = query.toLowerCase();
      cards = cards.filter(card => {
        const hash = card.hash.toLowerCase();
        const content = card.getContentAsText().toLowerCase();
        return hash.includes(q) || content.includes(q);
      });
    }

    // Render filtered cards
    await UIComponents.renderCards(cards, this.collection);
  }

  /**
   * Get cards for a specific type
   * @param {string} typeId
   * @returns {Promise<Array>}
   */
  async getCardsForType(typeId) {
    const categories = await this.categorizeCards(this.allCards);

    switch (typeId) {
      case 'all': return categories.all || [];
      case 'with-handles': return categories.withHandles || [];
      case 'clm': return categories.clm || [];
      case 'markdown': return categories.markdown || [];
      case 'text': return categories.text || [];
      case 'images': return categories.images || [];
      case 'videos': return categories.videos || [];
      case 'audio': return categories.audio || [];
      case 'documents': return categories.documents || [];
      case 'archives': return categories.archives || [];
      case 'other': return categories.other || [];
      default: return categories.all || [];
    }
  }
}
