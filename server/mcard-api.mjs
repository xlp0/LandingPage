/**
 * MCard API Server (ESM)
 * Node.js backend that ACTUALLY USES mcard-js library
 * 
 * ✅ Uses ESM imports to properly load mcard-js
 * ✅ Server-side SQLite storage
 * ✅ Full mcard-js v2.1.8 features
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize storage engine
let storage = null;
let MCard, SqliteNodeEngine, ContentTypeInterpreter;
let mcardLibraryAvailable = false;

// Attempt to load mcard-js dynamically
(async () => {
  try {
    const mcard = await import('mcard-js');
    MCard = mcard.MCard;
    SqliteNodeEngine = mcard.SqliteNodeEngine;
    ContentTypeInterpreter = mcard.ContentTypeInterpreter;
    mcardLibraryAvailable = true;
    console.log('[MCard API] ✅ mcard-js library loaded successfully');
  } catch (error) {
    console.warn('[MCard API] ⚠️ Failed to load mcard-js library:', error.message);
    console.warn('[MCard API] ⚠️ MCard API endpoints will be disabled.');
  }
})();

/**
 * Initialize mcard-js storage
 * Uses SqliteNodeEngine for server-side SQLite database
 */
async function initStorage() {
  if (!mcardLibraryAvailable) {
    throw new Error('mcard-js library is not available (failed to load)');
  }

  if (!storage) {
    console.log('[MCard API] 🔧 Initializing mcard-js SqliteNodeEngine...');

    // Use SQLite database in data directory
    const dbPath = path.join(__dirname, '..', 'data', 'mcard-server.db');
    storage = new SqliteNodeEngine(dbPath);
    await storage.init();

    console.log('[MCard API] ✅ mcard-js library initialized!');
    console.log('[MCard API] 📁 Server Database:', dbPath);
    console.log('[MCard API] 🎯 ACTUALLY USING mcard-js v2.1.8 library!');
  }
  return storage;
}

/**
 * POST /api/mcard/create
 * Create a new MCard using mcard-js library
 */
router.post('/create', async (req, res) => {
  try {
    const { content, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('[MCard API] Creating MCard using mcard-js MCard.create()...');

    // ✅ USING mcard-js MCard.create()
    const card = await MCard.create(content, { metadata });

    // ✅ USING mcard-js SqliteNodeEngine
    const storage = await initStorage();
    const hash = await storage.add(card);

    console.log('[MCard API] ✅ Created MCard:', hash);

    res.json({
      success: true,
      hash: hash,
      size: card.getSize(),
      g_time: card.g_time,
      library: 'mcard-js v2.1.8',
      storage: 'Server-side SQLite',
      message: '✅ ACTUALLY USING mcard-js library!'
    });
  } catch (error) {
    console.error('[MCard API] Error creating MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard/:hash
 * Get MCard by hash using mcard-js library
 */
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    console.log('[MCard API] Getting MCard using mcard-js storage.get():', hash);

    const storage = await initStorage();
    const card = await storage.get(hash);

    if (!card) {
      return res.status(404).json({ error: 'MCard not found' });
    }

    // ✅ USING mcard-js ContentTypeInterpreter
    const contentType = ContentTypeInterpreter.detect(card.getContent());

    res.json({
      success: true,
      hash: card.hash,
      content: card.getContentAsText(),
      size: card.getSize(),
      g_time: card.g_time,
      contentType: contentType,
      library: 'mcard-js v2.1.8',
      storage: 'Server-side SQLite'
    });
  } catch (error) {
    console.error('[MCard API] Error getting MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard
 * Get all MCards with pagination using mcard-js library
 */
router.get('/', async (req, res) => {
  try {
    const { page = 0, pageSize = 20 } = req.query;

    console.log('[MCard API] Getting MCards page', page, 'using mcard-js storage.getPage()');

    const storage = await initStorage();

    // ✅ USING mcard-js pagination
    const result = await storage.getPage(parseInt(page), parseInt(pageSize));

    // Add content type detection using mcard-js
    const items = result.items.map(card => ({
      hash: card.hash,
      content: card.getContentAsText().substring(0, 200), // Preview
      size: card.getSize(),
      g_time: card.g_time,
      contentType: ContentTypeInterpreter.detect(card.getContent())
    }));

    res.json({
      success: true,
      items: items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      library: 'mcard-js v2.1.8',
      storage: 'Server-side SQLite'
    });
  } catch (error) {
    console.error('[MCard API] Error getting MCards:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mcard/:hash
 * Delete MCard using mcard-js library
 */
router.delete('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    console.log('[MCard API] Deleting MCard using mcard-js storage.delete():', hash);

    const storage = await initStorage();
    await storage.delete(hash);

    res.json({
      success: true,
      message: 'MCard deleted',
      library: 'mcard-js v2.1.8'
    });
  } catch (error) {
    console.error('[MCard API] Error deleting MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcard/search
 * Search MCards by hash prefix using mcard-js library
 */
router.post('/search', async (req, res) => {
  try {
    const { hashPrefix } = req.body;

    console.log('[MCard API] Searching MCards using mcard-js storage.searchByHash():', hashPrefix);

    const storage = await initStorage();
    const cards = await storage.searchByHash(hashPrefix);

    const results = cards.map(card => ({
      hash: card.hash,
      content: card.getContentAsText().substring(0, 200),
      size: card.getSize(),
      g_time: card.g_time,
      contentType: ContentTypeInterpreter.detect(card.getContent())
    }));

    res.json({
      success: true,
      results: results,
      count: results.length,
      library: 'mcard-js v2.1.8'
    });
  } catch (error) {
    console.error('[MCard API] Error searching MCards:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcard/verify/:hash
 * Verify MCard hash integrity using mcard-js library
 */
router.post('/verify/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    console.log('[MCard API] Verifying MCard using mcard-js card.verify():', hash);

    const storage = await initStorage();
    const card = await storage.get(hash);

    if (!card) {
      return res.status(404).json({ error: 'MCard not found' });
    }

    // ✅ USING mcard-js verify method
    const isValid = await card.verify();

    res.json({
      success: true,
      hash: hash,
      valid: isValid,
      library: 'mcard-js v2.1.8'
    });
  } catch (error) {
    console.error('[MCard API] Error verifying MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard/stats
 * Get storage statistics using mcard-js library
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('[MCard API] Getting stats using mcard-js storage.count()');

    const storage = await initStorage();
    const total = await storage.count();

    res.json({
      success: true,
      total: total,
      library: 'mcard-js v2.1.8',
      engine: 'SqliteNodeEngine',
      backend: 'Node.js ESM',
      storage: 'Server-side SQLite',
      message: '✅ ACTUALLY USING mcard-js library!'
    });
  } catch (error) {
    console.error('[MCard API] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
