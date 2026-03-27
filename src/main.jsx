import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AliasGame from './AliasGame.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AliasGame />
  </StrictMode>,
)
