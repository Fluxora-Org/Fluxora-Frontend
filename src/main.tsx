import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initTheme } from './theme/ThemeProvider';
import './index.css'; /* Tailwind, design tokens, and global app styles */
import './styles/accessibility.css'; /* Global focus management & a11y */
import { HelmetProvider } from 'react-helmet-async';
import { isSupportedBrowser } from './lib/browserSupport';

const root = document.getElementById('root')!;

if (!isSupportedBrowser(navigator.userAgent)) {
  ReactDOM.createRoot(root).render(
    <main className="browser-support-message" role="alert">
      <h1>Browser not supported</h1>
      <p>
        Fluxora needs a recent version of Chrome 109+, Edge 109+, Firefox 115+,
        or Safari 16.4+. Update your browser to use the app.
      </p>
    </main>,
  );
} else {

import { config, configError } from './lib/config';

if (configError) {
  throw new Error(
    `Application failed to start: Configuration invalid.\n` +
      configError.errors.map((e) => `- ${e.message}`).join('\n')
  );
}

if (import.meta.env.DEV) {
  console.log('[Startup] Active configuration:', config);
}

// Resolve and apply the theme before React renders to prevent a flash of the
// wrong theme (FOUC). The ThemeProvider owns it from here on.
initTheme();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
}
