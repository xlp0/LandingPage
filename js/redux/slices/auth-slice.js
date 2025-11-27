/**
 * Auth Redux Slice
 * Manages authentication state with Zitadel OAuth2
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk to login with Zitadel
export const loginWithZitadel = createAsyncThunk(
  'auth/loginWithZitadel',
  async ({ code, codeVerifier, redirectUri }, { rejectWithValue }) => {
    try {
      console.log('[Auth Slice] Exchanging code for token...');
      
      // Exchange authorization code for tokens
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token exchange failed');
      }

      const data = await response.json();
      
      // Store tokens in localStorage
      localStorage.setItem('thk-mesh-access_token', data.access_token);
      localStorage.setItem('thk-mesh-refresh_token', data.refresh_token);
      localStorage.setItem('thk-mesh-user', JSON.stringify(data.user));
      
      console.log('[Auth Slice] Login successful:', data.user);
      
      return {
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      console.error('[Auth Slice] Login failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to refresh token
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('thk-mesh-refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Update tokens
      localStorage.setItem('thk-mesh-access_token', data.access_token);
      
      return {
        accessToken: data.access_token
      };
    } catch (error) {
      console.error('[Auth Slice] Token refresh failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[Auth Slice] Logging out...');
      
      // Clear tokens
      localStorage.removeItem('thk-mesh-access_token');
      localStorage.removeItem('thk-mesh-refresh_token');
      localStorage.removeItem('thk-mesh-user');
      localStorage.removeItem('pkce_code_verifier');
      
      return null;
    } catch (error) {
      console.error('[Auth Slice] Logout failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

// Load initial state from localStorage
const loadInitialState = () => {
  try {
    const accessToken = localStorage.getItem('thk-mesh-access_token');
    const refreshToken = localStorage.getItem('thk-mesh-refresh_token');
    const userStr = localStorage.getItem('thk-mesh-user');
    
    if (accessToken && userStr) {
      const user = JSON.parse(userStr);
      return {
        ...initialState,
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true
      };
    }
  } catch (error) {
    console.error('[Auth Slice] Error loading initial state:', error);
  }
  
  return initialState;
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    // Set user manually (for testing or direct updates)
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Login with Zitadel
    builder
      .addCase(loginWithZitadel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithZitadel.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginWithZitadel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Refresh token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Clear auth on refresh failure
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const { setUser, clearError } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

// Export reducer
export default authSlice.reducer;
