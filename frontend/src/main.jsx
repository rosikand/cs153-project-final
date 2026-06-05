import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import Landing from '@/pages/Landing.jsx'
import HowItWorks from '@/pages/HowItWorks.jsx'
import Impact from '@/pages/Impact.jsx'
import Benchmark from '@/pages/Benchmark.jsx'
import Engine from '@/pages/Engine.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="/app" element={<Engine />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
