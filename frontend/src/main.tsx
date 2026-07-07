import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/newsreader'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'

import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
