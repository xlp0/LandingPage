import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import connectionReducer from './connectionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    connection: connectionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
