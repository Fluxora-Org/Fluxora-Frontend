import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initTheme } from './theme/ThemeProvider';
import './styles/accessibility.css'; /* Global focus management & a11y */
import './index.css';

// Resolve and apply the theme before React renders to prevent a flash of the
// wrong theme (FOUC). The ThemeProvider owns it from here on.
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
