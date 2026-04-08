import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { BROWSER_TITLE } from './brand'
import './index.css'

document.title = BROWSER_TITLE

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/GovPulse">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
