import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global Error Handler for diagnostics
window.addEventListener('error', (event) => {
  console.error("Intercepted global error:", event.error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="background-color: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 24px; border-radius: 12px; margin: 32px; font-family: monospace; max-width: 800px; margin-left: auto; margin-right: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; font-size: 18px; font-weight: bold; border-bottom: 1px solid #fca5a5; padding-bottom: 8px;">🚨 Runtime Exception Intercepted</h3>
        <p style="font-weight: bold; margin-top: 12px; font-size: 14px;">${event.message}</p>
        <pre style="background: rgba(255,255,255,0.5); padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin-top: 12px;">${event.error ? event.error.stack : 'No stack trace available.'}</pre>
        <p style="margin-bottom: 0; font-size: 11px; color: #b91c1c; margin-top: 16px;">Please capture this screen and share the trace to debug the white screen.</p>
      </div>
    `;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
