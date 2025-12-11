# Auth Slice - User Authentication & Login

**Purpose:** Manage user authentication state, login/logout, token management

---

## State Structure

```javascript
{
  // Authentication status
  isAuthenticated: false,
  
  // Current user data
  user: {
    id: string,
    name: string,
    email: string,
    avatar: string,
    status: 'online' | 'offline' | 'away'
  } | null,
  
  // OAuth tokens
  token: string | null,
  refreshToken: string | null,
  tokenExpiresAt: number | null,
  
  // Loading & Error states
  loading: false,
  error: null,
  
  // Login method
  loginMethod: 'zitadel' | 'local' | null
}
```

---

## Actions

### `loginStart()`
**Trigger:** User clicks login button  
**Effect:** Set loading = true, clear errors

```javascript
{
  type: 'auth/loginStart',
  payload: undefined
}
```

### `loginSuccess(user, token, refreshToken)`
**Trigger:** Zitadel returns auth code  
**Effect:** Store user data and tokens, set authenticated = true

```javascript
{
  type: 'auth/loginSuccess',
  payload: {
    user: { id, name, email, avatar },
    token: 'jwt_token',
    refreshToken: 'refresh_token'
  }
}
```

### `loginFailure(error)`
**Trigger:** Login fails  
**Effect:** Set error message, authenticated = false

```javascript
{
  type: 'auth/loginFailure',
  payload: 'Invalid credentials'
}
```

### `logout()`
**Trigger:** User clicks logout  
**Effect:** Clear all auth data

```javascript
{
  type: 'auth/logout',
  payload: undefined
}
```

### `updateUserProfile(profile)`
**Trigger:** User updates profile  
**Effect:** Update user data in state

```javascript
{
  type: 'auth/updateUserProfile',
  payload: {
    name: 'New Name',
    avatar: 'new_avatar_url'
  }
}
```

### `setUserStatus(status)`
**Trigger:** User goes online/offline/away  
**Effect:** Update user status

```javascript
{
  type: 'auth/setUserStatus',
  payload: 'online' | 'offline' | 'away'
}
```

### `refreshTokenSuccess(token)`
**Trigger:** Token refresh completes  
**Effect:** Update token

```javascript
{
  type: 'auth/refreshTokenSuccess',
  payload: 'new_jwt_token'
}
```

### `refreshTokenFailure()`
**Trigger:** Token refresh fails  
**Effect:** Logout user

```javascript
{
  type: 'auth/refreshTokenFailure',
  payload: undefined
}
```

---

## Reducers

```javascript
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.loading = false;
      state.error = null;
    },
    
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
    },
    
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    setUserStatus: (state, action) => {
      if (state.user) {
        state.user.status = action.payload;
      }
    },
    
    refreshTokenSuccess: (state, action) => {
      state.token = action.payload;
    },
    
    refreshTokenFailure: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
    }
  }
});
```

---

## Selectors

```javascript
// Basic selectors
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
export const selectIsOnline = (state) => 
  state.auth.user?.status === 'online';

export const selectCanPerformAction = (state) =>
  state.auth.isAuthenticated && !state.auth.loading;
```

---

## Async Thunks

### `loginWithZitadel(code, state)`
Exchanges authorization code for tokens

```javascript
export const loginWithZitadel = createAsyncThunk(
  'auth/loginWithZitadel',
  async ({ code, state }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        body: JSON.stringify({ code, state })
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
```

### `refreshToken()`
Refreshes expired token

```javascript
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.refreshToken}`
        }
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
```

### `logoutUser()`
Clears auth and notifies server

```javascript
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

---

## Integration with Zitadel

### Login Flow
1. User clicks "Login" on landing page
2. Redirected to `vpn.pkc.pub/oauth/v2/authorize`
3. User authenticates with Zitadel
4. Redirected to callback with `code` and `state`
5. Callback handler calls `loginWithZitadel(code, state)`
6. Backend exchanges code for tokens
7. Redux stores user data and tokens
8. User redirected to dashboard

### Token Refresh
- Token expires after X minutes
- Middleware detects expiry
- Calls `refreshToken()` thunk
- Updates token in state and localStorage
- Continues operation

### Logout Flow
1. User clicks logout
2. Calls `logoutUser()` thunk
3. Notifies server
4. Clears localStorage
5. Clears Redux state
6. Redirects to login page

---

## Middleware Integration

### Auto-logout on Token Expiry
```javascript
// Middleware watches for token expiry
if (state.auth.tokenExpiresAt < Date.now()) {
  dispatch(refreshToken());
}
```

### Persist to localStorage
```javascript
// Save auth state when it changes
if (state.auth.isAuthenticated) {
  localStorage.setItem('auth_state', JSON.stringify(state.auth));
}
```

### Sync Across Tabs
```javascript
// Listen for storage changes
window.addEventListener('storage', (e) => {
  if (e.key === 'auth_state') {
    dispatch(updateAuthState(JSON.parse(e.newValue)));
  }
});
```

---

## Usage Example

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { loginWithZitadel, logout } from './authSlice';

function LoginComponent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector(state => state.auth);
  
  const handleLogin = async () => {
    const code = new URLSearchParams(window.location.search).get('code');
    const state = new URLSearchParams(window.location.search).get('state');
    
    dispatch(loginWithZitadel({ code, state }));
  };
  
  const handleLogout = () => {
    dispatch(logout());
  };
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user.name}</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      )}
    </div>
  );
}
```

