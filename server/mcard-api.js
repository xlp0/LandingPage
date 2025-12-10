/**
 * MCard API Server
 * Node.js backend that ACTUALLY USES mcard-js library
 * 
 * This replaces the browser-only implementation with a proper
 * Node.js backend using the full mcard-js v2.1.2 library
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MCard } = require('mcard-js');
const { SqliteNodeEngine } = require('mcard-js');
const { ContentTypeInterpreter } = require('mcard-js');

const router = express.Router();

// Initialize storage engine
let storage = null;

/**
 * Initialize mcard-js storage
 * Uses SqliteNodeEngine for Node.js backend
 */
async function initStorage() {
  if (!storage) {
    console.log('[MCard API] Initializing mcard-js SqliteNodeEngine...');
    
    // Use SQLite database in data directory
    const dbPath = path.join(__dirname, '..', 'data', 'mcard.db');
    storage = new SqliteNodeEngine(dbPath);
    await storage.init();
    
    console.log('[MCard API] ✅ mcard-js library initialized with SQLite backend');
    console.log('[MCard API] 📁 Database:', dbPath);
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
    
    console.log('[MCard API] Creating MCard using mcard-js library...');
    
    // Use mcard-js MCard.create()
    const card = await MCard.create(content, { metadata });
    
    // Store using mcard-js IndexedDBEngine
    const storage = await initStorage();
    const hash = await storage.add(card);
    
    console.log('[MCard API] ✅ Created MCard:', hash);
    
    res.json({
      success: true,
      hash: hash,
      size: card.getSize(),
      g_time: card.g_time,
      library: 'mcard-js v2.1.2'
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
    
    console.log('[MCard API] Getting MCard using mcard-js library:', hash);
    
    const storage = await initStorage();
    const card = await storage.get(hash);
    
    if (!card) {
      return res.status(404).json({ error: 'MCard not found' });
    }
    
    // Detect content type using mcard-js
    const contentType = ContentTypeInterpreter.detect(card.getContent());
    
    res.json({
      success: true,
      hash: card.hash,
      content: card.getContentAsText(),
      size: card.getSize(),
      g_time: card.g_time,
      contentType: contentType,
      library: 'mcard-js v2.1.2'
    });
  } catch (error) {
    console.error('[MCard API] Error getting MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard
 * Get all MCards using mcard-js library
 */
router.get('/', async (req, res) => {
  try {
    const { page = 0, pageSize = 20 } = req.query;
    
    console.log('[MCard API] Getting MCards page', page, 'using mcard-js library');
    
    const storage = await initStorage();
    
    // Use mcard-js pagination
    const result = await storage.getPage(parseInt(page), parseInt(pageSize));
    
    // Add content type detection
    const items = result.items.map(card => ({
      hash: card.hash,
      content: card.getContentAsText(),
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
      library: 'mcard-js v2.1.2'
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
    
    console.log('[MCard API] Deleting MCard using mcard-js library:', hash);
    
    const storage = await initStorage();
    await storage.delete(hash);
    
    res.json({
      success: true,
      message: 'MCard deleted',
      library: 'mcard-js v2.1.2'
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
    
    console.log('[MCard API] Searching MCards using mcard-js library:', hashPrefix);
    
    const storage = await initStorage();
    const cards = await storage.searchByHash(hashPrefix);
    
    const results = cards.map(card => ({
      hash: card.hash,
      content: card.getContentAsText(),
      size: card.getSize(),
      g_time: card.g_time,
      contentType: ContentTypeInterpreter.detect(card.getContent())
    }));
    
    res.json({
      success: true,
      results: results,
      count: results.length,
      library: 'mcard-js v2.1.2'
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
    
    console.log('[MCard API] Verifying MCard using mcard-js library:', hash);
    
    const storage = await initStorage();
    const card = await storage.get(hash);
    
    if (!card) {
      return res.status(404).json({ error: 'MCard not found' });
    }
    
    // Verify hash integrity
    const isValid = await card.verify();
    
    res.json({
      success: true,
      hash: hash,
      valid: isValid,
      library: 'mcard-js v2.1.2'
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
    console.log('[MCard API] Getting stats using mcard-js library');
    
    const storage = await initStorage();
    const total = await storage.count();
    
    res.json({
      success: true,
      total: total,
      library: 'mcard-js v2.1.2',
      engine: 'SqliteNodeEngine',
      backend: 'Node.js',
      message: '✅ ACTUALLY USING mcard-js library!'
    });
  } catch (error) {
    console.error('[MCard API] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
