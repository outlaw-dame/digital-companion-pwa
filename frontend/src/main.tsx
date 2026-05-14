import { StrictMode } from 'react'
import { App } from 'konsta/react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App theme="ios">
    <StrictMode>
      <App />
    </StrictMode>
  </App>,
)
