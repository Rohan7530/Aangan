import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts: Inter (Latin; Apple devices use the system SF font first) + Noto Sans Devanagari.
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
