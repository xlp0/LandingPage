/**
 * CLM YAML Server
 * Serves component registry and individual component configurations
 */

import express from 'express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load CLM registry
const registryPath = path.join(__dirname, '..', 'clm-registry.yaml');

/**
 * GET /api/clm/registry
 * Returns the complete CLM component registry
 */
router.get('/registry', (req, res) => {
  try {
    console.log('[CLM Server] Loading registry from:', registryPath);
    
    // Check if file exists
    if (!fs.existsSync(registryPath)) {
      throw new Error(`Registry file not found at: ${registryPath}`);
    }
    
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    console.log('[CLM Server] Registry file loaded, size:', registryContent.length, 'bytes');
    
    const registry = yaml.load(registryContent);
    console.log('[CLM Server] YAML parsed successfully, components:', registry.components?.length || 0);
    
    res.json({
      success: true,
      registry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CLM Server] Registry Error:', error);
    console.error('[CLM Server] Registry path:', registryPath);
    console.error('[CLM Server] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to load CLM registry',
      details: error.message,
      path: registryPath
    });
  }
});

/**
 * GET /api/clm/component/:id
 * Returns configuration for a specific component
 */
router.get('/component/:id', (req, res) => {
  try {
    const { id } = req.params;
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const registry = yaml.load(registryContent);
    
    const component = registry.components.find(c => c.id === id);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        error: `Component '${id}' not found in registry`
      });
    }
    
    res.json({
      success: true,
      component,
      observability: registry.observability,
      sidecar: registry.sidecar,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('CLM Component Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load component configuration',
      details: error.message
    });
  }
});

/**
 * GET /api/clm/health/:componentId
 * Health check endpoint for individual components
 */
router.get('/health/:componentId', (req, res) => {
  const { componentId } = req.params;
  
  // Simple health check - can be extended with actual component monitoring
  res.json({
    success: true,
    component_id: componentId,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_ms: process.uptime() * 1000
  });
});

/**
 * POST /api/clm/telemetry
 * Receives telemetry data from component sidecars
 */
router.post('/telemetry', express.json(), (req, res) => {
  const { component_id, event_type, data } = req.body;
  
  // Log telemetry (in production, send to Prometheus/Loki)
  console.log('[CLM Telemetry]', {
    component_id,
    event_type,
    data,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'Telemetry received'
  });
});

export default router;
