import React from 'react'
import ReactDOM from 'react-dom/client'
import Clarity from '@microsoft/clarity'
import { MotionConfig } from 'framer-motion'
import App from './App.tsx'
import './index.css'

if (import.meta.env.PROD) {
  Clarity.init('xny8uod774')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
