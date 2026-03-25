import React from 'react'
import ReactDOM from 'react-dom/client'
import { GhostKeyProvider } from '@ghostkey/sdk'
import App from './App.js'

const config = {
  // Point this at your local server: make dev
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  chainId: 84532, // Base Sepolia
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GhostKeyProvider config={config}>
      <App />
    </GhostKeyProvider>
  </React.StrictMode>,
)
