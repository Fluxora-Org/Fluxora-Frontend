import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initTheme } from './theme/ThemeProvider';
import './index.css'; /* Tailwind, design tokens, and global app styles */
import './styles/accessibility.css'; /* Global focus management & a11y */
import { HelmetProvider } from 'react-helmet-async';

// Resolve and apply the theme before React renders to prevent a flash of the
// wrong theme (FOUC). The ThemeProvider owns it from here on.
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
