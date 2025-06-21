import { useState } from 'react'
import CalibrationPage from './components/CalibrationPage'
import AnimationPage from './components/AnimationPage'
import './App.css'

function App() {
  // Main app state - controls which page is currently active
  const [currentPage, setCurrentPage] = useState('calibration') // 'calibration' or 'animation'

  console.log('[App] Current page:', currentPage)

  const navigateToAnimation = () => {
    console.log('[App] Navigating to animation page')
    setCurrentPage('animation')
  }

  const navigateToCalibration = () => {
    console.log('[App] Navigating back to calibration page')
    setCurrentPage('calibration')
  }

  return (
    <div className="app">
      {/* Main content area - full screen */}
      <main className="app-main">
        {currentPage === 'calibration' && (
          <CalibrationPage 
            onCalibrationComplete={navigateToAnimation}
            debugMode={false}
          />
        )}
        {currentPage === 'animation' && (
          <AnimationPage 
            onBackToCalibration={navigateToCalibration}
            debugMode={false}
          />
        )}
      </main>
    </div>
  )
}

export default App
