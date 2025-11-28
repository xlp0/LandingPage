/**
 * Cubic Logic Model (CLM) Redux Slice
 * 
 * Core Principle: Three Sets (三套東西)
 * - Context (Abstract): The situation/environment
 * - Goal (Concrete): The objective/implementation  
 * - Success (Balanced): The outcome/metrics
 * 
 * Each set is a function: f(goal, process) → output
 * Details are represented as hash values pointing to complex documents
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Fetch a cubic model by hash
 * Hash can point to: images, nested models, documents, etc.
 */
export const fetchCubicModel = createAsyncThunk(
  'cubicModels/fetchModel',
  async (hash, { rejectWithValue }) => {
    try {
      console.log('[Cubic Models] Fetching model:', hash);
      
      const response = await fetch(`/api/cubic-models/${hash}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const model = await response.json();
      return { hash, model };
    } catch (error) {
      console.error('[Cubic Models] Fetch error:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Create a new cubic model
 */
export const createCubicModel = createAsyncThunk(
  'cubicModels/createModel',
  async (modelData, { rejectWithValue }) => {
    try {
      console.log('[Cubic Models] Creating model:', modelData);
      
      const response = await fetch('/api/cubic-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[Cubic Models] Create error:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Evaluate a cubic model function
 * f(goal, process) → output
 */
export const evaluateCubicModel = createAsyncThunk(
  'cubicModels/evaluate',
  async ({ hash, goal, process }, { rejectWithValue }) => {
    try {
      console.log('[Cubic Models] Evaluating:', { hash, goal, process });
      
      const response = await fetch(`/api/cubic-models/${hash}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, process })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const output = await response.json();
      return { hash, goal, process, output };
    } catch (error) {
      console.error('[Cubic Models] Evaluation error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  // Models stored by hash
  models: {},
  
  // Evaluation results
  evaluations: {},
  
  // Current active model
  activeModel: null,
  
  // Loading states
  loading: {
    fetch: false,
    create: false,
    evaluate: false
  },
  
  // Error states
  errors: {
    fetch: null,
    create: null,
    evaluate: null
  }
};

// Cubic Models Slice
const cubicModelsSlice = createSlice({
  name: 'cubicModels',
  initialState,
  reducers: {
    // Set active model
    setActiveModel: (state, action) => {
      state.activeModel = action.payload;
      console.log('[Cubic Models] Active model set:', action.payload);
    },
    
    // Clear active model
    clearActiveModel: (state) => {
      state.activeModel = null;
      console.log('[Cubic Models] Active model cleared');
    },
    
    // Store model locally (without fetching)
    storeModel: (state, action) => {
      const { hash, model } = action.payload;
      state.models[hash] = model;
      console.log('[Cubic Models] Model stored locally:', hash);
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.errors = {
        fetch: null,
        create: null,
        evaluate: null
      };
    }
  },
  
  extraReducers: (builder) => {
    // Fetch cubic model
    builder
      .addCase(fetchCubicModel.pending, (state) => {
        state.loading.fetch = true;
        state.errors.fetch = null;
      })
      .addCase(fetchCubicModel.fulfilled, (state, action) => {
        state.loading.fetch = false;
        const { hash, model } = action.payload;
        state.models[hash] = model;
        console.log('[Cubic Models] Model fetched:', hash);
      })
      .addCase(fetchCubicModel.rejected, (state, action) => {
        state.loading.fetch = false;
        state.errors.fetch = action.payload;
      });
    
    // Create cubic model
    builder
      .addCase(createCubicModel.pending, (state) => {
        state.loading.create = true;
        state.errors.create = null;
      })
      .addCase(createCubicModel.fulfilled, (state, action) => {
        state.loading.create = false;
        const { hash, model } = action.payload;
        state.models[hash] = model;
        console.log('[Cubic Models] Model created:', hash);
      })
      .addCase(createCubicModel.rejected, (state, action) => {
        state.loading.create = false;
        state.errors.create = action.payload;
      });
    
    // Evaluate cubic model
    builder
      .addCase(evaluateCubicModel.pending, (state) => {
        state.loading.evaluate = true;
        state.errors.evaluate = null;
      })
      .addCase(evaluateCubicModel.fulfilled, (state, action) => {
        state.loading.evaluate = false;
        const { hash, goal, process, output } = action.payload;
        
        // Store evaluation result
        if (!state.evaluations[hash]) {
          state.evaluations[hash] = [];
        }
        state.evaluations[hash].push({
          goal,
          process,
          output,
          timestamp: Date.now()
        });
        
        console.log('[Cubic Models] Evaluation complete:', { hash, output });
      })
      .addCase(evaluateCubicModel.rejected, (state, action) => {
        state.loading.evaluate = false;
        state.errors.evaluate = action.payload;
      });
  }
});

// Export actions
export const {
  setActiveModel,
  clearActiveModel,
  storeModel,
  clearErrors
} = cubicModelsSlice.actions;

// Selectors
export const selectAllModels = (state) => state.cubicModels.models;
export const selectModelByHash = (hash) => (state) => state.cubicModels.models[hash];
export const selectActiveModel = (state) => state.cubicModels.activeModel;
export const selectEvaluations = (hash) => (state) => state.cubicModels.evaluations[hash] || [];
export const selectLoading = (state) => state.cubicModels.loading;
export const selectErrors = (state) => state.cubicModels.errors;

// Export reducer
export default cubicModelsSlice.reducer;
