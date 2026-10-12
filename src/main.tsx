import React from 'react'
import ReactDOM from 'react-dom/client'
import Clarity from '@microsoft/clarity'
import { MotionConfig } from 'framer-motion'
import Root from './Root'
import { startRouter } from './router'
import './index.css'

if (import.meta.env.PROD) {
  Clarity.init('ytjehbjh93')
}

startRouter()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <Root />
    </MotionConfig>
  </React.StrictMode>,
)
