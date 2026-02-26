import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// src/main.jsx (or src/index.jsx)
(function initStorageOncePerTab() {
  const INIT_FLAG = 'app:init';
  if (!sessionStorage.getItem(INIT_FLAG)) {
    // ❗️Clear only your keys (safer) or clear all (see #notes below)
    // localStorage.clear(); // <- clears EVERYTHING for this origin
    // Recommended: clear only app-owned keys
    const APP_KEYS = ['auth_users', 'auth_token', 'some_other_key'];
    APP_KEYS.forEach((k) => localStorage.removeItem(k));

    sessionStorage.setItem(INIT_FLAG, '1');
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
