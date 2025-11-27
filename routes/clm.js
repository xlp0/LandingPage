/**
 * CLM YAML Server
 * Serves component registry and individual component configurations
 */

const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load CLM registry
const registryPath = path.join(__dirname, '..', 'clm-registry.yaml');

/**
 * GET /api/clm/registry
 * Returns the complete CLM component registry
 */
router.get('/registry', (req, res) => {
  try {
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const registry = yaml.load(registryContent);
    
    res.json({
      success: true,
      registry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('CLM Registry Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load CLM registry',
      details: error.message
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

module.exports = router;
