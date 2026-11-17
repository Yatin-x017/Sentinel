import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.jsx'
import { ReadingSettingsProvider } from './hooks/useReadingSettings.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ReadingSettingsProvider>
        <App />
      </ReadingSettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
