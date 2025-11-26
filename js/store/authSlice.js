// Use Redux Toolkit from global window.RTK (loaded via CDN)
// Wait for RTK to be available if not loaded yet
if (!window.RTK) {
    throw new Error('Redux Toolkit (window.RTK) not loaded! Make sure the CDN script loads before this module.');
}
const { createSlice, createAsyncThunk } = window.RTK;

// Async Thunks

/**
 * Login with Zitadel OAuth2
 * Exchanges authorization code for tokens
 */
export const loginWithZitadel = createAsyncThunk(
  'auth/loginWithZitadel',
  async ({ code, state }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) throw new Error('Login failed');

      const { user, token, refreshToken } = await response.json();

      // Store in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refreshToken);

      return { user, token, refreshToken };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Refresh expired token
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.refreshToken}`,
        },
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const { token } = await response.json();
      localStorage.setItem('auth_token', token);

      return token;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Logout user
 * Clears auth and notifies server
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Restore auth from localStorage
 */
export const restoreAuth = createAsyncThunk(
  'auth/restoreAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!token) return null;

      // Verify token is still valid
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Token verification failed');

      const { user } = await response.json();
      return { user, token, refreshToken };
    } catch (error) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      return rejectWithValue(error.message);
    }
  }
);

// Initial State
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiresAt: null,
  loading: false,
  error: null,
  loginMethod: null,
};

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    setUserStatus: (state, action) => {
      if (state.user) {
        state.user.status = action.payload;
      }
    },

    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    clearError: (state) => {
      state.error = null;
    },

    // Set auth state directly (for loading from localStorage)
    setAuth: (state, action) => {
      const { user, token, refreshToken } = action.payload;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken || null;
      state.loginMethod = 'restored';
    },

    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.loginMethod = null;
      state.error = null;
    },
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
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.loginMethod = 'zitadel';
        state.error = null;
      })
      .addCase(loginWithZitadel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Refresh Token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.loginMethod = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Still clear auth even if logout fails
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });

    // Restore Auth
    builder
      .addCase(restoreAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(restoreAuth.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.loginMethod = 'zitadel';
        }
      })
      .addCase(restoreAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });
  },
});

// Actions
export const { loginStart, setUserStatus, updateUserProfile, clearError, setAuth, clearAuth } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectUserId = (state) => state.auth.user?.id;
export const selectUserName = (state) => state.auth.user?.name;
export const selectUserEmail = (state) => state.auth.user?.email;
export const selectUserStatus = (state) => state.auth.user?.status;
export const selectToken = (state) => state.auth.token;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectLoginMethod = (state) => state.auth.loginMethod;

// Computed selectors
export const selectIsOnline = (state) => state.auth.user?.status === 'online';
export const selectCanPerformAction = (state) =>
  state.auth.isAuthenticated && !state.auth.loading;

export default authSlice.reducer;
