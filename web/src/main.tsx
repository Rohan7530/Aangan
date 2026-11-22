import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts: Figtree (body) and Unbounded (brand + titles), as on the landing page;
// Inter as a Latin fallback; Noto Sans Devanagari for Hindi and Marathi.
import '@fontsource-variable/figtree';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-devanagari';
import App from './App';
import { applyTheme } from './features/settings/appearance';
import './index.css';

applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
