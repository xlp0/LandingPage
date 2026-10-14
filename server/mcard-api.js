/**
 * MCard API Server
 * Self-contained sovereign Node.js backend (INV-CDO-33).
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// In-memory backing store for local LandingPage API fallback
const memoryStore = new Map();

function computeHash(content) {
  const buf = typeof content === 'string'
    ? Buffer.from(content, 'utf8')
    : Buffer.from(JSON.stringify(content || ''));
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function detectContentType(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content || '');
  if (/^<(!doctype|html|head|body)\b/i.test(text.trimStart())) return 'text/html';
  if (/^[\[{]/.test(text.trimStart())) {
    try { JSON.parse(text); return 'application/json'; } catch {}
  }
  if (/^#{1,6}\s+\S/m.test(text.trimStart())) return 'text/markdown';
  return 'text/plain';
}

/**
 * POST /api/mcard/create
 * Create a new MCard
 */
router.post('/create', async (req, res) => {
  try {
    const { content, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const textContent = typeof content === 'string' ? content : JSON.stringify(content);
    const hash = computeHash(textContent);
    const size = Buffer.byteLength(textContent, 'utf8');
    const g_time = Date.now();

    const record = {
      hash,
      content: textContent,
      size,
      g_time,
      metadata: metadata || {},
      contentType: detectContentType(textContent)
    };

    memoryStore.set(hash, record);

    res.json({
      success: true,
      hash,
      size,
      g_time,
      library: '@clm/core'
    });
  } catch (error) {
    console.error('[MCard API] Error creating MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard/:hash
 * Get MCard by hash
 */
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const card = memoryStore.get(hash);
    if (!card) {
      return res.status(404).json({ error: 'MCard not found' });
    }

    res.json({
      success: true,
      hash: card.hash,
      content: card.content,
      size: card.size,
      g_time: card.g_time,
      contentType: card.contentType,
      library: '@clm/core'
    });
  } catch (error) {
    console.error('[MCard API] Error getting MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard
 * Get all MCards
 */
router.get('/', async (req, res) => {
  try {
    const { page = 0, pageSize = 20 } = req.query;
    const all = Array.from(memoryStore.values());
    const start = parseInt(page) * parseInt(pageSize);
    const paged = all.slice(start, start + parseInt(pageSize));

    res.json({
      success: true,
      items: paged,
      total: all.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(all.length / parseInt(pageSize)) || 1,
      library: '@clm/core'
    });
  } catch (error) {
    console.error('[MCard API] Error getting MCards:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mcard/:hash
 * Delete MCard
 */
router.delete('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    memoryStore.delete(hash);
    res.json({
      success: true,
      message: 'MCard deleted',
      library: '@clm/core'
    });
  } catch (error) {
    console.error('[MCard API] Error deleting MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcard/search
 * Search MCards by hash prefix
 */
router.post('/search', async (req, res) => {
  try {
    const { hashPrefix = '' } = req.body;
    const results = Array.from(memoryStore.values()).filter(c => c.hash.startsWith(hashPrefix));

    res.json({
      success: true,
      results,
      count: results.length,
      library: '@clm/core'
    });
  } catch (error) {
    console.error('[MCard API] Error searching MCards:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcard/verify/:hash
 * Verify MCard hash integrity
 */
router.post('/verify/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const card = memoryStore.get(hash);
    if (!card) {
      return res.status(404).json({ error: 'MCard not found' });
    }

    const calculated = computeHash(card.content);
    res.json({
      success: true,
      hash,
      valid: calculated === hash,
      library: '@clm/core'
    });
  } catch (error) {
    console.error('[MCard API] Error verifying MCard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcard/stats
 * Get storage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      total: memoryStore.size,
      library: '@clm/core',
      engine: 'MemoryStore',
      backend: 'Node.js',
      message: 'Sovereign MCard backend'
    });
  } catch (error) {
    console.error('[MCard API] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
