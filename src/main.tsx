import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

/**
 * GitHub Pages serves the app from a repository sub-path, so the router needs
 * the same base Vite was built with. import.meta.env.BASE_URL carries it and
 * is "/" in dev, which keeps local URLs clean.
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
