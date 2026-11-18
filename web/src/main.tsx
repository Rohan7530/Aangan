import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts: Noto Sans (Latin) + Noto Sans Devanagari, one design family.
import '@fontsource-variable/noto-sans';
import '@fontsource-variable/noto-sans-devanagari';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
