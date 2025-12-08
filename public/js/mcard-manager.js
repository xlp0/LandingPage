// Simple browser-only MCard implementation using IndexedDB
// Note: Full mcard-js has Node.js dependencies that don't work in browsers
// We'll implement a lightweight version with just the features we need

// Import renderer registry
import rendererRegistry from '../../js/renderers/RendererRegistry.js';
import { CONTENT_TYPES } from '../../js/redux/slices/content-renderer-slice.js';

// Global state
let db;
let allCards = [];
let currentType = 'all';
let currentCard = null;
let renderersInitialized = false;

// Simple MCard class
class MCard {
  constructor(hash, content, g_time) {
    this.hash = hash;
    this.content = content;
    this.g_time = g_time;
  }
  
  static async create(data) {
    // Convert to Uint8Array if needed
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array 
        ? data 
        : new Uint8Array(data);
    
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create timestamp
    const g_time = new Date().toISOString();
    
    return new MCard(hash, bytes, g_time);
  }
  
  getContent() {
    return this.content;
  }
  
  getContentAsText() {
    try {
      return new TextDecoder().decode(this.content);
    } catch {
      return '[Binary content]';
    }
  }
  
  toObject() {
    return {
      hash: this.hash,
      content: Array.from(this.content),
      g_time: this.g_time
    };
  }
  
  static fromObject(obj) {
    return new MCard(
      obj.hash,
      new Uint8Array(obj.content),
      obj.g_time
    );
  }
}

// Simple IndexedDB wrapper
class SimpleDB {
  constructor() {
    this.dbName = 'mcard-storage';
    this.storeName = 'cards';
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'hash' });
        }
      };
    });
  }
  
  async add(card) {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.put(card.toObject());
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async get(hash) {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.get(hash);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const obj = request.result;
        resolve(obj ? MCard.fromObject(obj) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async getAll() {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cards = request.result.map(obj => MCard.fromObject(obj));
        resolve(cards);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete(hash) {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.delete(hash);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async count() {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.count();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Initialize MCard storage
async function initMCard() {
  try {
    console.log('[MCard] Initializing IndexedDB...');
    db = new SimpleDB();
    await db.init();
    
    console.log('[MCard] Database initialized successfully');
    showToast('Database initialized', 'success');
    
    // Load existing cards
    await loadCards();
    populateFileTypes();
    updateStats();
  } catch (error) {
    console.error('[MCard] Initialization error:', error);
    showToast('Failed to initialize database: ' + error.message, 'error');
  }
}

// Load all cards from storage
async function loadCards() {
  try {
    const count = await db.count();
    console.log(`[MCard] Loading ${count} cards...`);
    
    // Get all cards
    allCards = await db.getAll();
    
    populateFileTypes();
    showCardsForType(currentType);
    updateStats();
  } catch (error) {
    console.error('[MCard] Error loading cards:', error);
    showToast('Failed to load cards', 'error');
  }
}

// Categorize cards by file type
function categorizeCards() {
  const categories = {
    all: [],
    text: [],
    images: [],
    videos: [],
    audio: [],
    documents: [],
    archives: [],
    other: []
  };

  allCards.forEach(card => {
    const metadata = getMetadata(card.hash);
    const type = metadata.fileType.toLowerCase();
    
    categories.all.push(card);
    
    if (type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('html')) {
      categories.text.push(card);
    } else if (type.startsWith('image/')) {
      categories.images.push(card);
    } else if (type.startsWith('video/')) {
      categories.videos.push(card);
    } else if (type.startsWith('audio/')) {
      categories.audio.push(card);
    } else if (type.includes('pdf') || type.includes('document') || type.includes('word') || type.includes('excel')) {
      categories.documents.push(card);
    } else if (type.includes('zip') || type.includes('tar') || type.includes('gz') || type.includes('archive')) {
      categories.archives.push(card);
    } else {
      categories.other.push(card);
    }
  });

  return categories;
}

// Populate file types in sidebar
function populateFileTypes() {
  const categories = categorizeCards();
  const typeList = document.getElementById('typeList');
  
  const types = [
    { id: 'all', name: 'All Files', icon: 'package', count: categories.all.length },
    { id: 'text', name: 'Text', icon: 'file-text', count: categories.text.length },
    { id: 'images', name: 'Images', icon: 'image', count: categories.images.length },
    { id: 'videos', name: 'Videos', icon: 'video', count: categories.videos.length },
    { id: 'audio', name: 'Audio', icon: 'music', count: categories.audio.length },
    { id: 'documents', name: 'Documents', icon: 'file', count: categories.documents.length },
    { id: 'archives', name: 'Archives', icon: 'archive', count: categories.archives.length },
    { id: 'other', name: 'Other', icon: 'folder', count: categories.other.length }
  ];

  typeList.innerHTML = types.map(type => `
    <div class="type-item ${type.id === currentType ? 'active' : ''}" onclick="selectType('${type.id}')">
      <div class="type-item-content">
        <span class="type-icon"><i data-lucide="${type.icon}" style="width: 20px; height: 20px;"></i></span>
        <span class="type-name">${type.name}</span>
      </div>
      <span class="type-count">${type.count}</span>
    </div>
  `).join('');
  
  // Initialize Lucide icons after DOM update
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Select a file type
window.selectType = function(typeId) {
  currentType = typeId;
  populateFileTypes();
  showCardsForType(typeId);
};

// Show cards for selected type
function showCardsForType(typeId) {
  const categories = categorizeCards();
  const cards = categories[typeId] || [];
  
  const mcardList = document.getElementById('mcardList');
  const columnTitle = document.getElementById('columnTitle');
  
  // Update title
  const typeNames = {
    all: 'All Files',
    text: 'Text Files',
    images: 'Images',
    videos: 'Videos',
    audio: 'Audio Files',
    documents: 'Documents',
    archives: 'Archives',
    other: 'Other Files'
  };
  columnTitle.textContent = typeNames[typeId] || 'Files';
  
  if (cards.length === 0) {
    mcardList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i data-lucide="package" style="width: 64px; height: 64px; color: #ccc;"></i>
        </div>
        <p>No ${typeNames[typeId].toLowerCase()} found</p>
      </div>
    `;
    return;
  }
  
  mcardList.innerHTML = cards.map(card => {
    const metadata = getMetadata(card.hash);
    const icon = getFileIcon(metadata.fileType);
    const time = formatTime(card.g_time);
    const size = formatBytes(metadata.fileSize);
    
    return `
      <div class="mcard-item ${currentCard?.hash === card.hash ? 'active' : ''}" onclick="viewCard('${card.hash}')">
        <div class="mcard-item-header">
          <div class="mcard-item-icon">${icon}</div>
          <div class="mcard-item-info">
            <div class="mcard-item-name">${metadata.fileName}</div>
            <div class="mcard-item-hash">${card.hash.substring(0, 16)}...</div>
          </div>
        </div>
        <div class="mcard-item-meta">
          <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${time}</span>
          <span>${size}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Initialize Lucide icons after DOM update
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Upload file and create MCard
async function uploadFile(file) {
  try {
    console.log(`[MCard] Uploading file: ${file.name}`);
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create MCard
    const card = await MCard.create(uint8Array);
    
    // Store in database
    await db.add(card);
    
    // Store metadata (file name, type)
    const metadata = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };
    localStorage.setItem(`mcard_meta_${card.hash}`, JSON.stringify(metadata));
    
    console.log(`[MCard] File uploaded successfully: ${card.hash}`);
    showToast(`✓ ${file.name} uploaded successfully!`, 'success');
    
    // Reload cards
    await loadCards();
  } catch (error) {
    console.error('[MCard] Upload error:', error);
    showToast('Failed to upload file', 'error');
  }
}

// Create text card
window.createTextCard = async function() {
  const text = prompt('Enter text content:');
  if (!text) return;
  
  try {
    const card = await MCard.create(text);
    await db.add(card);
    
    // Store metadata
    const metadata = {
      fileName: 'Text Note',
      fileType: 'text/plain',
      fileSize: text.length
    };
    localStorage.setItem(`mcard_meta_${card.hash}`, JSON.stringify(metadata));
    
    showToast('Text card created!', 'success');
    await loadCards();
  } catch (error) {
    console.error('[MCard] Error creating text card:', error);
    showToast('Failed to create text card', 'error');
  }
};

// Get metadata from localStorage
function getMetadata(hash) {
  const stored = localStorage.getItem(`mcard_meta_${hash}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    fileName: 'Unknown',
    fileType: 'application/octet-stream',
    fileSize: 0
  };
}

// Get content preview
function getContentPreview(card) {
  try {
    const text = card.getContentAsText();
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  } catch {
    return '[Binary content]';
  }
}

// Get file icon based on type
function getFileIcon(type) {
  if (type.startsWith('image/')) return '<i data-lucide="image" style="width: 24px; height: 24px;"></i>';
  if (type.startsWith('video/')) return '<i data-lucide="video" style="width: 24px; height: 24px;"></i>';
  if (type.startsWith('audio/')) return '<i data-lucide="music" style="width: 24px; height: 24px;"></i>';
  if (type.startsWith('text/')) return '<i data-lucide="file-text" style="width: 24px; height: 24px;"></i>';
  if (type.includes('pdf')) return '<i data-lucide="file" style="width: 24px; height: 24px;"></i>';
  if (type.includes('zip') || type.includes('archive')) return '<i data-lucide="archive" style="width: 24px; height: 24px;"></i>';
  return '<i data-lucide="file" style="width: 24px; height: 24px;"></i>';
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return date.toLocaleDateString();
}

// Initialize renderers
async function initRenderers() {
  if (renderersInitialized) return;
  
  try {
    await rendererRegistry.initialize();
    renderersInitialized = true;
    console.log('[MCard] Renderers initialized:', rendererRegistry.getRegisteredTypes());
  } catch (error) {
    console.error('[MCard] Failed to initialize renderers:', error);
  }
}

// Detect content type for rendering
function detectRenderType(mimeType, fileName) {
  const mime = (mimeType || '').toLowerCase();
  const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
  
  // Markdown
  if (mime.includes('markdown') || ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }
  
  // Images
  if (mime.startsWith('image/')) {
    return 'image';
  }
  
  // PDF
  if (mime.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  
  // Text
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript')) {
    return 'text';
  }
  
  // Code files
  if (['js', 'py', 'java', 'cpp', 'c', 'css', 'html', 'xml', 'json'].includes(ext)) {
    return 'code';
  }
  
  return 'text'; // Default fallback
}

// View card details in viewer column
window.viewCard = async function(hash) {
  try {
    // Initialize renderers if needed
    await initRenderers();
    
    const card = await db.get(hash);
    const metadata = getMetadata(hash);
    currentCard = card;
    
    // Update active state in list
    showCardsForType(currentType);
    
    // Update viewer
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerActions = document.getElementById('viewerActions');
    const viewerContent = document.getElementById('viewerContent');
    
    viewerTitle.textContent = metadata.fileName;
    viewerActions.style.display = 'flex';
    
    // Detect content type for rendering
    const renderType = detectRenderType(metadata.fileType, metadata.fileName);
    console.log('[MCard] Rendering as:', renderType, 'for', metadata.fileName);
    
    // Prepare content for rendering
    let content = card.content;
    if (renderType === 'markdown' || renderType === 'text' || renderType === 'code') {
      // Convert to text for text-based renderers
      content = card.getContentAsText();
    }
    // For binary types (image, pdf), keep as Uint8Array
    // Renderers will handle the conversion
    
    // Render content using appropriate renderer
    let renderedHTML = '';
    try {
      if (rendererRegistry.hasRenderer(renderType)) {
        renderedHTML = await rendererRegistry.render(renderType, content, {
          fileName: metadata.fileName,
          mimeType: metadata.fileType,
          enableHandles: true,
          onHandleClick: (targetHash) => {
            console.log('[MCard] Handle clicked:', targetHash);
            window.viewCard(targetHash);
          }
        });
        console.log('[MCard] Rendered HTML length:', renderedHTML.length);
      } else {
        // Fallback to simple preview
        const preview = getContentPreview(card);
        renderedHTML = `
          <div class="text-content">
            <div class="text-header">
              <span class="text-filename">${metadata.fileName}</span>
            </div>
            <pre class="text-body preserve-whitespace">${preview}</pre>
          </div>
        `;
      }
    } catch (renderError) {
      console.error('[MCard] Render error:', renderError);
      renderedHTML = `
        <div style="padding: 20px; color: #f48771;">
          <h3>Render Error</h3>
          <p>${renderError.message}</p>
        </div>
      `;
    }
    
    // Display rendered content - completely replace viewer content
    viewerContent.innerHTML = renderedHTML;
    console.log('[MCard] Viewer content updated');
    
    // Initialize Lucide icons after DOM update
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Add click handler for handles
    viewerContent.querySelectorAll('.mcard-handle').forEach(handle => {
      handle.addEventListener('click', async (e) => {
        e.preventDefault();
        const targetHash = e.target.dataset.hash;
        if (targetHash) {
          await window.viewCard(targetHash);
        }
      });
    });
    
  } catch (error) {
    console.error('[MCard] Error viewing card:', error);
    showToast('Failed to load card details', 'error');
  }
};

// Download current card
window.downloadCurrentCard = async function() {
  if (!currentCard) return;
  await downloadCard(currentCard.hash);
};

// Delete current card
window.deleteCurrentCard = async function() {
  if (!currentCard) return;
  await deleteCard(currentCard.hash);
  currentCard = null;
  
  // Reset viewer
  document.getElementById('viewerTitle').textContent = 'Select an MCard';
  document.getElementById('viewerActions').style.display = 'none';
  document.getElementById('viewerContent').innerHTML = `
    <div class="upload-section" id="uploadSection">
      <div class="upload-icon">📤</div>
      <h2>Upload Files</h2>
      <p>Drag & drop files here or click Upload button</p>
    </div>
  `;
};

// Download card
window.downloadCard = async function(hash) {
  try {
    const card = await db.get(hash);
    const metadata = getMetadata(hash);
    
    const blob = new Blob([card.getContent()], { type: metadata.fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadata.fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Download started', 'success');
  } catch (error) {
    console.error('[MCard] Download error:', error);
    showToast('Failed to download', 'error');
  }
};

// Delete card
window.deleteCard = async function(hash) {
  if (!confirm('Are you sure you want to delete this MCard?')) return;
  
  try {
    await db.delete(hash);
    localStorage.removeItem(`mcard_meta_${hash}`);
    showToast('Card deleted', 'success');
    await loadCards();
  } catch (error) {
    console.error('[MCard] Delete error:', error);
    showToast('Failed to delete card', 'error');
  }
};

// Close modal
window.closeModal = function() {
  document.getElementById('cardModal').classList.remove('active');
};

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMessage = document.getElementById('toastMessage');
  
  toastIcon.textContent = type === 'success' ? '✓' : '✗';
  toastMessage.textContent = message;
  toast.className = `toast ${type} active`;
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// Update stats
async function updateStats() {
  try {
    const count = await db.count();
    const totalSize = allCards.reduce((sum, card) => {
      const meta = getMetadata(card.hash);
      return sum + meta.fileSize;
    }, 0);
    
    document.getElementById('totalCards').textContent = count;
    document.getElementById('totalSize').textContent = formatBytes(totalSize);
    document.getElementById('dbStatus').textContent = 'Ready';
  } catch (error) {
    console.error('[MCard] Error updating stats:', error);
  }
}

// File input handler
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    await uploadFile(file);
  }
  e.target.value = ''; // Reset input
});

// Drag and drop handlers
const uploadSection = document.getElementById('uploadSection');

uploadSection.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadSection.classList.add('drag-over');
});

uploadSection.addEventListener('dragleave', () => {
  uploadSection.classList.remove('drag-over');
});

uploadSection.addEventListener('drop', async (e) => {
  e.preventDefault();
  uploadSection.classList.remove('drag-over');
  
  const files = Array.from(e.dataTransfer.files);
  for (const file of files) {
    await uploadFile(file);
  }
});

// Search functionality
document.getElementById('searchBox').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  
  // Get cards for current type
  const categories = categorizeCards();
  let cards = categories[currentType] || [];
  
  if (query) {
    cards = cards.filter(card => {
      const metadata = getMetadata(card.hash);
      const content = getContentPreview(card).toLowerCase();
      return card.hash.toLowerCase().includes(query) ||
             metadata.fileName.toLowerCase().includes(query) ||
             content.includes(query);
    });
  }
  
  // Render filtered cards
  const mcardList = document.getElementById('mcardList');
  if (cards.length === 0) {
    mcardList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No results found</p>
      </div>
    `;
    return;
  }
  
  mcardList.innerHTML = cards.map(card => {
    const metadata = getMetadata(card.hash);
    const icon = getFileIcon(metadata.fileType);
    const time = formatTime(card.g_time);
    const size = formatBytes(metadata.fileSize);
    
    return `
      <div class="mcard-item ${currentCard?.hash === card.hash ? 'active' : ''}" onclick="viewCard('${card.hash}')">
        <div class="mcard-item-header">
          <div class="mcard-item-icon">${icon}</div>
          <div class="mcard-item-info">
            <div class="mcard-item-name">${metadata.fileName}</div>
            <div class="mcard-item-hash">${card.hash.substring(0, 16)}...</div>
          </div>
        </div>
        <div class="mcard-item-meta">
          <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${time}</span>
          <span>${size}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Initialize Lucide icons after DOM update
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Chat functionality
window.toggleChat = function() {
  const chatPanel = document.getElementById('chatPanel');
  chatPanel.classList.toggle('hidden');
  
  // Initialize icons when opening
  if (!chatPanel.classList.contains('hidden') && window.lucide) {
    lucide.createIcons();
  }
};

window.sendChatMessage = function() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  const chatMessages = document.getElementById('chatMessages');
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'chat-message user';
  userMessageDiv.innerHTML = `
    <div class="chat-message-bubble">${escapeHtml(message)}</div>
    <div class="chat-message-time">${new Date().toLocaleTimeString()}</div>
  `;
  chatMessages.appendChild(userMessageDiv);
  
  // Clear input
  input.value = '';
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Simulate assistant response
  setTimeout(() => {
    const assistantMessageDiv = document.createElement('div');
    assistantMessageDiv.className = 'chat-message assistant';
    assistantMessageDiv.innerHTML = `
      <div class="chat-message-bubble">${getAssistantResponse(message)}</div>
      <div class="chat-message-time">${new Date().toLocaleTimeString()}</div>
    `;
    chatMessages.appendChild(assistantMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 500);
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getAssistantResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return '👋 Hello! How can I help you with your MCards today?';
  }
  
  if (lowerMessage.includes('upload') || lowerMessage.includes('add')) {
    return '📤 To upload files, click the "Upload" button in the header or drag & drop files into the upload area. All files are stored with SHA-256 content addressing!';
  }
  
  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    return '🔍 Use the search box in the middle column to find MCards by filename, hash, or content. You can also filter by file type in the left sidebar!';
  }
  
  if (lowerMessage.includes('hash') || lowerMessage.includes('sha')) {
    return '🔐 MCards use SHA-256 hashing for content-addressable storage. Each file gets a unique hash based on its content, ensuring data integrity and deduplication!';
  }
  
  if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
    return '🗑️ To delete an MCard, select it from the list and click the "Delete" button in the viewer. The file and its metadata will be permanently removed from IndexedDB.';
  }
  
  return `I received your message: "${message}". I'm a simple chat assistant. Try asking about uploading, searching, or MCard features!`;
}

// Handle Enter key in chat input
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
});

// Initialize on page load
initMCard();

// Initialize Lucide icons on initial load
if (window.lucide) {
  lucide.createIcons();
}
