import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './theme/theme.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)

// The service worker was caching stale builds and pinning browsers to old
// deploys. We no longer register it; the self-destroying /sw.js (below) removes
// any previously-installed worker + caches so every visit is always the latest
// deploy. Belt-and-braces: if an old worker is still controlling this page,
// unregister it now.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(r => r.unregister())).catch(() => {})
  if (window.caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
}
