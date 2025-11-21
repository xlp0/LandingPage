import { configureStore } from '@reduxjs/toolkit';
import connectionReducer from './connectionSlice';

export const store = configureStore({
  reducer: {
    connection: connectionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
