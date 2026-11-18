import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts: Noto Sans (Latin) + Noto Sans Devanagari, one design family.
import '@fontsource-variable/noto-sans';
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
