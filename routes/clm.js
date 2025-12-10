/**
 * CLM YAML Server
 * Serves component registry and individual component configurations
 * ✅ Added CLM execution using mcard-js library's CLMRunner
 */

import express from 'express';
import yaml from 'js-yaml';
import fs from 'fs';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { CLMRunner } from 'mcard-js/dist/ptr/node/CLMRunner.js';

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

/**
 * POST /api/clm/execute
 * Execute CLM with input using mcard-js library's CLMRunner
 * 
 * Body:
 * {
 *   "yamlContent": "...",  // CLM YAML content
 *   "input": {}            // Input data (optional)
 * }
 */
router.post('/execute', async (req, res) => {
  let tempFile = null;
  
  try {
    const { yamlContent, input = {} } = req.body;
    
    if (!yamlContent) {
      return res.status(400).json({
        success: false,
        error: 'yamlContent is required'
      });
    }
    
    console.log('[CLM Execute] Creating temp file...');
    
    // Create temporary file for CLM content
    const tempId = randomBytes(16).toString('hex');
    tempFile = path.join(tmpdir(), `clm-${tempId}.yaml`);
    
    await writeFile(tempFile, yamlContent, 'utf-8');
    
    console.log('[CLM Execute] Executing with library CLMRunner...');
    
    // Execute using library's CLMRunner
    const runner = new CLMRunner(tmpdir(), 5000);
    const result = await runner.runFile(tempFile, input);
    
    console.log('[CLM Execute] Execution successful');
    
    res.json({
      success: true,
      result: result.result,
      executionTime: result.executionTime,
      clm: result.clm
    });
    
  } catch (error) {
    console.error('[CLM Execute] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (err) {
        console.error('[CLM Execute] Failed to delete temp file:', err);
      }
    }
  }
});

/**
 * POST /api/clm/test
 * Run all test cases from CLM using mcard-js library's CLMRunner
 * 
 * Body:
 * {
 *   "yamlContent": "..."  // CLM YAML content
 * }
 */
router.post('/test', async (req, res) => {
  let tempFile = null;
  
  try {
    const { yamlContent } = req.body;
    
    if (!yamlContent) {
      return res.status(400).json({
        success: false,
        error: 'yamlContent is required'
      });
    }
    
    console.log('[CLM Test] Creating temp file...');
    
    // Create temporary file for CLM content
    const tempId = randomBytes(16).toString('hex');
    tempFile = path.join(tmpdir(), `clm-${tempId}.yaml`);
    
    await writeFile(tempFile, yamlContent, 'utf-8');
    
    console.log('[CLM Test] Loading CLM and running tests...');
    
    // Load CLM and run tests
    const runner = new CLMRunner(tmpdir(), 5000);
    const clm = runner.loader.load(tempFile);
    const examples = clm.examples || [];
    
    if (examples.length === 0) {
      return res.json({
        success: true,
        message: 'No test cases found',
        totalTests: 0,
        passed: 0,
        failed: 0,
        results: []
      });
    }
    
    const results = [];
    
    for (const example of examples) {
      const startTime = Date.now();
      try {
        const result = await runner.runFile(tempFile, example.input);
        
        const passed = example.expected_output !== undefined
          ? resultsEqual(result.result, example.expected_output)
          : true;
        
        results.push({
          name: example.name,
          input: example.input,
          expected: example.expected_output,
          actual: result.result,
          passed,
          executionTime: Date.now() - startTime,
          error: null
        });
      } catch (error) {
        results.push({
          name: example.name,
          input: example.input,
          expected: example.expected_output,
          actual: null,
          passed: false,
          executionTime: Date.now() - startTime,
          error: error.message
        });
      }
    }
    
    const allPassed = results.every(r => r.passed);
    
    console.log('[CLM Test] Tests complete:', {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    });
    
    res.json({
      success: allPassed,
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    });
    
  } catch (error) {
    console.error('[CLM Test] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (err) {
        console.error('[CLM Test] Failed to delete temp file:', err);
      }
    }
  }
});

/**
 * Compare two values with tolerance for numbers
 * (Same as library's resultsEqual)
 */
function resultsEqual(a, b, tolerance = 1e-9) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  
  // Numbers with tolerance
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
  }
  
  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => resultsEqual(val, b[i], tolerance));
  }
  
  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => 
      keysB.includes(key) && resultsEqual(a[key], b[key], tolerance)
    );
  }
  
  return a === b;
}

export default router;
