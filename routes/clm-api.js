/**
 * CLM Execution API
 * Server-side endpoint using mcard-js library's actual CLMRunner
 */

import express from 'express';
import { CLMRunner } from 'mcard-js/dist/ptr/node/CLMRunner.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const router = express.Router();

/**
 * POST /api/clm/execute
 * Execute CLM with input
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
    
    // Create temporary file for CLM content
    const tempId = randomBytes(16).toString('hex');
    tempFile = join(tmpdir(), `clm-${tempId}.yaml`);
    
    await writeFile(tempFile, yamlContent, 'utf-8');
    
    // Execute using library's CLMRunner
    const runner = new CLMRunner(tmpdir(), 5000);
    const result = await runner.runFile(tempFile, input);
    
    res.json({
      success: true,
      result: result.result,
      executionTime: result.executionTime,
      clm: result.clm
    });
    
  } catch (error) {
    console.error('[CLM API] Execution error:', error);
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
        console.error('[CLM API] Failed to delete temp file:', err);
      }
    }
  }
});

/**
 * POST /api/clm/test
 * Run all test cases from CLM
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
    
    // Create temporary file for CLM content
    const tempId = randomBytes(16).toString('hex');
    tempFile = join(tmpdir(), `clm-${tempId}.yaml`);
    
    await writeFile(tempFile, yamlContent, 'utf-8');
    
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
    
    res.json({
      success: allPassed,
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    });
    
  } catch (error) {
    console.error('[CLM API] Test error:', error);
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
        console.error('[CLM API] Failed to delete temp file:', err);
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
