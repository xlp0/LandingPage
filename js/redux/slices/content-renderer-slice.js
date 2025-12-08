/**
 * Content Renderer Redux Slice
 * 
 * Manages content rendering state and type detection for MCard content.
 * Supports multiple content types: markdown, image, video, audio, pdf, text, etc.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Content type detection based on MIME type and file extension
const CONTENT_TYPES = {
  MARKDOWN: 'markdown',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  PDF: 'pdf',
  TEXT: 'text',
  JSON: 'json',
  HTML: 'html',
  CODE: 'code',
  BINARY: 'binary',
  UNKNOWN: 'unknown'
};

// MIME type to content type mapping
const MIME_TYPE_MAP = {
  // Markdown
  'text/markdown': CONTENT_TYPES.MARKDOWN,
  'text/x-markdown': CONTENT_TYPES.MARKDOWN,
  
  // Images
  'image/jpeg': CONTENT_TYPES.IMAGE,
  'image/jpg': CONTENT_TYPES.IMAGE,
  'image/png': CONTENT_TYPES.IMAGE,
  'image/gif': CONTENT_TYPES.IMAGE,
  'image/webp': CONTENT_TYPES.IMAGE,
  'image/svg+xml': CONTENT_TYPES.IMAGE,
  
  // Videos
  'video/mp4': CONTENT_TYPES.VIDEO,
  'video/webm': CONTENT_TYPES.VIDEO,
  'video/ogg': CONTENT_TYPES.VIDEO,
  
  // Audio
  'audio/mpeg': CONTENT_TYPES.AUDIO,
  'audio/mp3': CONTENT_TYPES.AUDIO,
  'audio/wav': CONTENT_TYPES.AUDIO,
  'audio/ogg': CONTENT_TYPES.AUDIO,
  
  // PDF
  'application/pdf': CONTENT_TYPES.PDF,
  
  // Text
  'text/plain': CONTENT_TYPES.TEXT,
  
  // JSON
  'application/json': CONTENT_TYPES.JSON,
  
  // HTML
  'text/html': CONTENT_TYPES.HTML,
  
  // Code
  'text/javascript': CONTENT_TYPES.CODE,
  'application/javascript': CONTENT_TYPES.CODE,
  'text/css': CONTENT_TYPES.CODE,
  'application/xml': CONTENT_TYPES.CODE,
  'text/xml': CONTENT_TYPES.CODE,
};

// File extension to content type mapping (fallback)
const EXTENSION_MAP = {
  'md': CONTENT_TYPES.MARKDOWN,
  'markdown': CONTENT_TYPES.MARKDOWN,
  'jpg': CONTENT_TYPES.IMAGE,
  'jpeg': CONTENT_TYPES.IMAGE,
  'png': CONTENT_TYPES.IMAGE,
  'gif': CONTENT_TYPES.IMAGE,
  'webp': CONTENT_TYPES.IMAGE,
  'svg': CONTENT_TYPES.IMAGE,
  'mp4': CONTENT_TYPES.VIDEO,
  'webm': CONTENT_TYPES.VIDEO,
  'ogg': CONTENT_TYPES.VIDEO,
  'mp3': CONTENT_TYPES.AUDIO,
  'wav': CONTENT_TYPES.AUDIO,
  'pdf': CONTENT_TYPES.PDF,
  'txt': CONTENT_TYPES.TEXT,
  'json': CONTENT_TYPES.JSON,
  'html': CONTENT_TYPES.HTML,
  'htm': CONTENT_TYPES.HTML,
  'js': CONTENT_TYPES.CODE,
  'css': CONTENT_TYPES.CODE,
  'xml': CONTENT_TYPES.CODE,
  'py': CONTENT_TYPES.CODE,
  'java': CONTENT_TYPES.CODE,
  'cpp': CONTENT_TYPES.CODE,
  'c': CONTENT_TYPES.CODE,
};

/**
 * Detect content type from MIME type and filename
 */
function detectContentType(mimeType, fileName) {
  // Try MIME type first
  if (mimeType && MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType];
  }
  
  // Try file extension
  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && EXTENSION_MAP[extension]) {
      return EXTENSION_MAP[extension];
    }
  }
  
  // Default to text if it's a text MIME type
  if (mimeType && mimeType.startsWith('text/')) {
    return CONTENT_TYPES.TEXT;
  }
  
  return CONTENT_TYPES.UNKNOWN;
}

/**
 * Async thunk to render content
 * Detects type and calls appropriate renderer
 */
export const renderContent = createAsyncThunk(
  'contentRenderer/renderContent',
  async ({ hash, content, mimeType, fileName }, { rejectWithValue }) => {
    try {
      const contentType = detectContentType(mimeType, fileName);
      
      return {
        hash,
        content,
        contentType,
        mimeType,
        fileName,
        renderedAt: new Date().toISOString()
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        hash
      });
    }
  }
);

/**
 * Async thunk to extract handles from markdown content
 * Handles are content-addressable hyperlinks in the format: [[hash]] or [[hash|label]]
 */
export const extractHandles = createAsyncThunk(
  'contentRenderer/extractHandles',
  async ({ content, hash }, { rejectWithValue }) => {
    try {
      // Regex to match [[hash]] or [[hash|label]]
      const handleRegex = /\[\[([a-f0-9]{64})(?:\|([^\]]+))?\]\]/g;
      const handles = [];
      let match;
      
      while ((match = handleRegex.exec(content)) !== null) {
        handles.push({
          fullMatch: match[0],
          targetHash: match[1],
          label: match[2] || match[1].substring(0, 8) + '...',
          position: match.index
        });
      }
      
      return {
        sourceHash: hash,
        handles,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        hash
      });
    }
  }
);

const initialState = {
  // Current content being rendered
  currentContent: null,
  currentType: null,
  currentHash: null,
  
  // Rendering state
  isRendering: false,
  renderError: null,
  
  // Handle extraction
  handles: {},
  isExtractingHandles: false,
  extractError: null,
  
  // Renderer registry
  availableRenderers: [
    CONTENT_TYPES.MARKDOWN,
    CONTENT_TYPES.IMAGE,
    CONTENT_TYPES.VIDEO,
    CONTENT_TYPES.AUDIO,
    CONTENT_TYPES.PDF,
    CONTENT_TYPES.TEXT,
    CONTENT_TYPES.JSON,
    CONTENT_TYPES.HTML,
    CONTENT_TYPES.CODE
  ],
  
  // Rendering history (for navigation)
  history: [],
  historyIndex: -1,
  
  // Settings
  settings: {
    enableHandles: true,
    autoDetectType: true,
    maxHistorySize: 50
  }
};

const contentRendererSlice = createSlice({
  name: 'contentRenderer',
  initialState,
  reducers: {
    // Clear current content
    clearContent: (state) => {
      state.currentContent = null;
      state.currentType = null;
      state.currentHash = null;
      state.renderError = null;
    },
    
    // Navigate back in history
    navigateBack: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        const item = state.history[state.historyIndex];
        state.currentContent = item.content;
        state.currentType = item.contentType;
        state.currentHash = item.hash;
      }
    },
    
    // Navigate forward in history
    navigateForward: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        const item = state.history[state.historyIndex];
        state.currentContent = item.content;
        state.currentType = item.contentType;
        state.currentHash = item.hash;
      }
    },
    
    // Update settings
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Clear history
    clearHistory: (state) => {
      state.history = [];
      state.historyIndex = -1;
    }
  },
  extraReducers: (builder) => {
    builder
      // Render content
      .addCase(renderContent.pending, (state) => {
        state.isRendering = true;
        state.renderError = null;
      })
      .addCase(renderContent.fulfilled, (state, action) => {
        state.isRendering = false;
        state.currentContent = action.payload.content;
        state.currentType = action.payload.contentType;
        state.currentHash = action.payload.hash;
        
        // Add to history
        const historyItem = {
          hash: action.payload.hash,
          content: action.payload.content,
          contentType: action.payload.contentType,
          fileName: action.payload.fileName,
          renderedAt: action.payload.renderedAt
        };
        
        // Remove forward history if we're not at the end
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        state.history.push(historyItem);
        state.historyIndex = state.history.length - 1;
        
        // Limit history size
        if (state.history.length > state.settings.maxHistorySize) {
          state.history.shift();
          state.historyIndex -= 1;
        }
      })
      .addCase(renderContent.rejected, (state, action) => {
        state.isRendering = false;
        state.renderError = action.payload?.message || 'Failed to render content';
      })
      
      // Extract handles
      .addCase(extractHandles.pending, (state) => {
        state.isExtractingHandles = true;
        state.extractError = null;
      })
      .addCase(extractHandles.fulfilled, (state, action) => {
        state.isExtractingHandles = false;
        state.handles[action.payload.sourceHash] = action.payload.handles;
      })
      .addCase(extractHandles.rejected, (state, action) => {
        state.isExtractingHandles = false;
        state.extractError = action.payload?.message || 'Failed to extract handles';
      });
  }
});

export const {
  clearContent,
  navigateBack,
  navigateForward,
  updateSettings,
  clearHistory
} = contentRendererSlice.actions;

export default contentRendererSlice.reducer;

// Selectors
export const selectCurrentContent = (state) => state.contentRenderer.currentContent;
export const selectCurrentType = (state) => state.contentRenderer.currentType;
export const selectCurrentHash = (state) => state.contentRenderer.currentHash;
export const selectIsRendering = (state) => state.contentRenderer.isRendering;
export const selectRenderError = (state) => state.contentRenderer.renderError;
export const selectHandles = (state) => state.contentRenderer.handles;
export const selectCanNavigateBack = (state) => state.contentRenderer.historyIndex > 0;
export const selectCanNavigateForward = (state) => 
  state.contentRenderer.historyIndex < state.contentRenderer.history.length - 1;
export const selectSettings = (state) => state.contentRenderer.settings;

// Export content types for use in renderers
export { CONTENT_TYPES };
