import { useState } from 'react'
import CalibrationPage from './components/CalibrationPage'
import AnimationPage from './components/AnimationPage'
import './App.css'

function App() {
  // Main app state - controls which page is currently active
  const [currentPage, setCurrentPage] = useState('calibration') // 'calibration' or 'animation'
  
  // Debug mode for development - shows additional logging and UI elements
  const [debugMode, setDebugMode] = useState(true)

  console.log('[App] Current page:', currentPage, '| Debug mode:', debugMode)

  const navigateToAnimation = () => {
    console.log('[App] Navigating to animation page')
    setCurrentPage('animation')
  }

  const navigateToCalibration = () => {
    console.log('[App] Navigating back to calibration page')
    setCurrentPage('calibration')
  }

  const toggleDebugMode = () => {
    setDebugMode(!debugMode)
    console.log('[App] Debug mode toggled to:', !debugMode)
  }

  return (
    <div className="app">
      {/* Header with navigation and debug controls */}
      <header className="app-header">
        <h1>Movement Therapy Tracker</h1>
        <div className="header-controls">
          <button 
            onClick={navigateToCalibration}
            className={currentPage === 'calibration' ? 'active' : ''}
          >
            Calibration
          </button>
          <button 
            onClick={navigateToAnimation}
            className={currentPage === 'animation' ? 'active' : ''}
            disabled={currentPage === 'calibration'} // Only enable after calibration
          >
            Animation
          </button>
          <button 
            onClick={toggleDebugMode}
            className={`debug-toggle ${debugMode ? 'debug-active' : ''}`}
          >
            Debug: {debugMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="app-main">
        {currentPage === 'calibration' && (
          <CalibrationPage 
            onCalibrationComplete={navigateToAnimation}
            debugMode={debugMode}
          />
        )}
        {currentPage === 'animation' && (
          <AnimationPage 
            onBackToCalibration={navigateToCalibration}
            debugMode={debugMode}
          />
        )}
      </main>
    </div>
  )
}

export default App
