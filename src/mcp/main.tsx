import React from 'react'
import ReactDOM from 'react-dom/client'
import Clarity from '@microsoft/clarity'
import { MotionConfig } from 'framer-motion'
import McpPage from './McpPage'
import '../index.css'

if (import.meta.env.PROD) {
  Clarity.init('ytjehbjh93')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <McpPage />
    </MotionConfig>
  </React.StrictMode>,
)
