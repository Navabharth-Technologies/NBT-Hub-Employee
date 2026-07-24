// Intercept localStorage to redirect Auth-related keys to sessionStorage
// This ensures that multiple tabs/windows can run different user/role sessions without overwriting each other.
(function() {
  if (typeof window === 'undefined') return;

  const authKeys = new Set(['token', 'user', 'navAuthUser', 'userRole']);
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.getItem = function(key) {
    if (authKeys.has(key)) {
      return sessionStorage.getItem(key);
    }
    return originalGetItem(key);
  };

  localStorage.setItem = function(key, value) {
    if (authKeys.has(key)) {
      return sessionStorage.setItem(key, value);
    }
    return originalSetItem(key, value);
  };

  localStorage.removeItem = function(key) {
    if (authKeys.has(key)) {
      return sessionStorage.removeItem(key);
    }
    return originalRemoveItem(key);
  };

  const originalClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function() {
    authKeys.forEach(key => sessionStorage.removeItem(key));
    originalClear();
  };

  // Global window.fetch interceptor to immediately detect account deactivation (401/403) and log the user out
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) {
        let isDeactivated = false;
        try {
          const clone = response.clone();
          const body = await clone.json();
          const errMsg = String(body?.error || body?.message || '').toLowerCase();
          if (response.status === 401 || errMsg.includes('disabled') || errMsg.includes('deactivated')) {
            isDeactivated = true;
          }
        } catch (_) {
          if (response.status === 401) isDeactivated = true;
        }

        if (isDeactivated) {
          authKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          window.location.href = './';
        }
      }
      return response;
    } catch (err) {
      throw err;
    }
  };
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';
import { HashRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);

reportWebVitals();
