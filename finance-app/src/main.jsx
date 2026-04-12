import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Importador from './Importador.jsx'

// ── Storage adapter ────────────────────────────────────────────
// Replaces window.storage (Claude artifact API) with localStorage
window.storage = {
  get: async (key) => {
    try {
      const val = localStorage.getItem(key)
      if (val === null) throw new Error('not found')
      return { key, value: val }
    } catch {
      return null
    }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, value)
      return { key, value }
    } catch {
      return null
    }
  },
  delete: async (key) => {
    localStorage.removeItem(key)
    return { key, deleted: true }
  },
  list: async (prefix) => {
    const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix))
    return { keys }
  }
}

// ── Router simples ─────────────────────────────────────────────
function Root() {
  const path = window.location.pathname
  if (path === '/importador') return <Importador />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
