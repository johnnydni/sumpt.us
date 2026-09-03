import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

/**
 * The sub-path the router should treat as its root.
 *
 * Normally this is whatever Vite was built with — "/sumpt.us" on GitHub Pages,
 * "" in dev. But a build can end up served from somewhere else (a custom
 * domain, a renamed repo), and then a hardcoded basename makes every route
 * fail to match. So trust the address bar: only use the built prefix if the
 * page is actually under it.
 */
function resolveBasename(): string {
  const built = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (!built) return ''
  const here = window.location.pathname
  return here === built || here.startsWith(`${built}/`) ? built : ''
}

const basename = resolveBasename()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
