import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import defaultTheme from '../green-trace-frontend/src/theme/defaultTheme.js'
import ThemeProvider from '../green-trace-frontend/src/theme/ThemeProvider.jsx'
import './index.css'

function Root() {
  // Production would fetch the org theme from GET /api/org/theme and pass it here.
  return (
    <ThemeProvider theme={defaultTheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
