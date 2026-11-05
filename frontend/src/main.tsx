import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Force browser tab to immediately render the cute bot mascot favicon
(() => {
  const updateFavicon = () => {
    try {
      const head = document.head || document.getElementsByTagName('head')[0];
      const existing = document.querySelectorAll("link[rel*='icon']");
      existing.forEach((el) => el.remove());

      const v = 'bot_' + Date.now();
      const svg = document.createElement('link');
      svg.rel = 'icon';
      svg.type = 'image/svg+xml';
      svg.href = `/bot.svg?v=${v}`;
      head.appendChild(svg);

      const ico = document.createElement('link');
      ico.rel = 'shortcut icon';
      ico.href = `/bot.ico?v=${v}`;
      head.appendChild(ico);

      const png = document.createElement('link');
      png.rel = 'icon';
      png.type = 'image/png';
      png.sizes = '32x32';
      png.href = `/bot-32.png?v=${v}`;
      head.appendChild(png);
    } catch {
      // ignore
    }
  };

  updateFavicon();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFavicon);
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
