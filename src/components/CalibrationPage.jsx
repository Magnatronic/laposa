import { useState, useRef, useEffect } from 'react'
import Webcam from 'react-webcam'
import PoseDetector from '../services/PoseDetector'
import './CalibrationPage.css'

const CalibrationPage = ({ onCalibrationComplete, debugMode }) => {
  // Camera and pose detection state
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [poseDetector, setPoseDetector] = useState(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [currentPoses, setCurrentPoses] = useState([])
    // Movement detection state
  const [leftHandRaisedDetected, setLeftHandRaisedDetected] = useState(false)
  const [rightHandRaisedDetected, setRightHandRaisedDetected] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState(false)
  
  // Raise detection counters for validation
  const [leftRaiseCount, setLeftRaiseCount] = useState(0)
  const [rightRaiseCount, setRightRaiseCount] = useState(0)
  const REQUIRED_RAISE_COUNT = 3 // Number of raises needed to confirm detection
  
  // Control panel state
  const [isPanelExpanded, setIsPanelExpanded] = useState(true)
  
  console.log('[CalibrationPage] State:', {
    cameraReady,
    modelLoaded,
    currentPoses: currentPoses.length,
    leftHandRaisedDetected,
    rightHandRaisedDetected,
    isCalibrated
  })
  // Initialize pose detection when component mounts
  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        console.log('[CalibrationPage] Initializing pose detection...')
        const detector = new PoseDetector()
        await detector.initialize()
        setPoseDetector(detector)
        setModelLoaded(true)
        console.log('[CalibrationPage] Pose detection initialized successfully')
      } catch (error) {
        console.error('[CalibrationPage] Failed to initialize pose detection:', error)      }
    }

    // Test camera availability directly
    const testCameraAccess = async () => {
      try {
        console.log('[CalibrationPage] Testing camera access directly...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: "user"
          }
        })
        console.log('[CalibrationPage] Direct camera access successful')
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop())
      } catch (error) {
        console.error('[CalibrationPage] Direct camera access failed:', error)
      }
    }

    initializePoseDetection()
    testCameraAccess()
  }, [])

  // Draw pose keypoints on canvas for user feedback
  const drawPoses = (poses) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    poses.forEach(pose => {
      // Draw keypoints with clear colors and labels
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) {
          // Use distinct colors for left/right/center body parts
          if (keypoint.name.includes('left')) {
            ctx.fillStyle = '#ff4444' // Red for left
          } else if (keypoint.name.includes('right')) {
            ctx.fillStyle = '#4444ff' // Blue for right
          } else {
            ctx.fillStyle = '#44ff44' // Green for center (nose, etc.)
          }
          
          // Draw larger keypoint circles for better visibility
          ctx.beginPath()
          ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI)
          ctx.fill()
          
          // Add thick white outline for maximum visibility
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 3
          ctx.stroke()
          
          // Always show labels for key body parts for user feedback
          if (['nose', 'left_wrist', 'right_wrist', 'left_shoulder', 'right_shoulder'].includes(keypoint.name)) {
            ctx.font = 'bold 16px Arial'
            
            // Add highly visible text with strong background
            const text = keypoint.name.replace('_', ' ')
            const textWidth = ctx.measureText(text).width
            const textX = keypoint.x + 12
            const textY = keypoint.y - 12
            
            // Draw strong black background for text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
            ctx.fillRect(textX - 4, textY - 20, textWidth + 8, 24)
            
            // Draw text with thick outline for maximum contrast
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 4
            ctx.strokeText(text, textX, textY)
            ctx.fillStyle = 'white'
            ctx.fillText(text, textX, textY)
          }
        }
      })
      
      // Add real-time movement feedback overlay
      const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist')
      const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist')
      const nose = pose.keypoints.find(kp => kp.name === 'nose')
      
      if (leftWrist && rightWrist && nose && leftWrist.score > 0.3 && rightWrist.score > 0.3 && nose.score > 0.3) {
        // Check for raised hands and show immediate visual feedback
        const leftRaised = leftWrist.y < nose.y - 50
        const rightRaised = rightWrist.y < nose.y - 50
        
        if (leftRaised || rightRaised) {
          ctx.font = 'bold 24px Arial'
          
          const message = leftRaised && rightRaised ? 'BOTH HANDS UP!' : 
                         leftRaised ? 'LEFT HAND UP!' : 'RIGHT HAND UP!'
          
          const textWidth = ctx.measureText(message).width
          const x = (canvas.width - textWidth) / 2
          const y = 60
          
          // Background rectangle
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
          ctx.fillRect(x - 15, y - 35, textWidth + 30, 45)
          
          // Text with outline
          ctx.strokeStyle = 'black'
          ctx.lineWidth = 3
          ctx.strokeText(message, x, y)
          ctx.fillStyle = '#00ff00'
          ctx.fillText(message, x, y)
        }
      }
    })
  }

  // Start pose detection loop when both camera and model are ready
  useEffect(() => {
    if (!cameraReady || !modelLoaded || !poseDetector) return

    console.log('[CalibrationPage] Starting pose detection loop')
    const detectPoses = async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        try {
          const poses = await poseDetector.detectPoses(webcamRef.current.video)
          setCurrentPoses(poses)
            // Always draw poses for user feedback
          drawPoses(poses)
          
          // Analyze poses for movement detection
          analyzePosesForMovements(poses)
        } catch (error) {
          console.error('[CalibrationPage] Error detecting poses:', error)
        }
      }
    }

    const intervalId = setInterval(detectPoses, 100) // Check every 100ms
    return () => clearInterval(intervalId)
  }, [cameraReady, modelLoaded, poseDetector, debugMode])

  // Analyze detected poses for hand movements
  const analyzePosesForMovements = (poses) => {
    if (poses.length === 0) return

    const pose = poses[0] // Use first detected person
    const keypoints = pose.keypoints

    // Get key body part positions
    const leftWrist = keypoints.find(kp => kp.name === 'left_wrist')
    const rightWrist = keypoints.find(kp => kp.name === 'right_wrist')
    const nose = keypoints.find(kp => kp.name === 'nose')
    const leftEar = keypoints.find(kp => kp.name === 'left_ear')
    const rightEar = keypoints.find(kp => kp.name === 'right_ear')

    // Calculate head position (use nose, or average of ears if nose not detected)
    let headY = null
    if (nose && nose.score > 0.3) {
      headY = nose.y
    } else if (leftEar && rightEar && leftEar.score > 0.3 && rightEar.score > 0.3) {
      headY = (leftEar.y + rightEar.y) / 2
    }

    // Check for left hand above head
    if (leftWrist && headY && leftWrist.score > 0.3) {
      if (leftWrist.y < headY - 40) { // Hand is above head with 40px buffer
        if (!leftHandRaisedDetected) {
          setLeftRaiseCount(prev => prev + 1)
          setLeftHandRaisedDetected(true)
          console.log('[CalibrationPage] Left hand above head detected! Count:', leftRaiseCount + 1)
          
          // Reset detection after a delay to allow for multiple raises
          setTimeout(() => setLeftHandRaisedDetected(false), 1500)
        }
      }
    }

    // Check for right hand above head
    if (rightWrist && headY && rightWrist.score > 0.3) {
      if (rightWrist.y < headY - 40) { // Hand is above head with 40px buffer
        if (!rightHandRaisedDetected) {
          setRightRaiseCount(prev => prev + 1)
          setRightHandRaisedDetected(true)
          console.log('[CalibrationPage] Right hand above head detected! Count:', rightRaiseCount + 1)
          
          // Reset detection after a delay to allow for multiple raises
          setTimeout(() => setRightHandRaisedDetected(false), 1500)
        }
      }
    }  }
  
  // Check if calibration is complete
  useEffect(() => {
    const calibrationComplete = leftRaiseCount >= REQUIRED_RAISE_COUNT && rightRaiseCount >= REQUIRED_RAISE_COUNT
    if (calibrationComplete !== isCalibrated) {
      setIsCalibrated(calibrationComplete)
      if (calibrationComplete) {
        console.log('[CalibrationPage] Calibration completed successfully!')
      }
    }
  }, [leftRaiseCount, rightRaiseCount, isCalibrated])

  const handleCameraReady = () => {
    console.log('[CalibrationPage] Camera is ready')
    setCameraReady(true)
  }

  const handleCameraError = (error) => {
    console.error('[CalibrationPage] Camera error:', error)
    setCameraReady(false)
    
    // Try to provide helpful error message
    if (error.name === 'NotAllowedError') {
      console.error('[CalibrationPage] Camera permission denied by user')
    } else if (error.name === 'NotFoundError') {
      console.error('[CalibrationPage] No camera device found')
    } else if (error.name === 'NotReadableError') {
      console.error('[CalibrationPage] Camera already in use by another application')
    } else if (error.name === 'OverconstrainedError') {
      console.error('[CalibrationPage] Camera constraints too restrictive')
    } else {
      console.error('[CalibrationPage] Unknown camera error:', error.message)
    }
  }

  const resetCalibration = () => {
    console.log('[CalibrationPage] Resetting calibration')
    setLeftRaiseCount(0)
    setRightRaiseCount(0)
    setIsCalibrated(false)
  }
  
  const togglePanel = () => {
    setIsPanelExpanded(!isPanelExpanded)
  }

  return (
    <div className="calibration-page">
      {/* Full-height camera section */}
      <div className="camera-section">
        <div className="camera-container">          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "user"
            }}
            onUserMedia={handleCameraReady}
            onUserMediaError={handleCameraError}
            className="webcam-feed"/>
          {/* Pose visualization canvas overlay - always visible for calibration feedback */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="pose-canvas"
          />
        </div>
      </div>

      {/* Collapsible control panel */}
      <div className={`control-panel ${isPanelExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Panel toggle button */}
        <button 
          onClick={togglePanel}
          className="panel-toggle"
          aria-label={isPanelExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          {isPanelExpanded ? '⏸️' : '▶️'}
        </button>

        {/* Panel content */}
        <div className="panel-content">          {/* Header section */}
          <div className="panel-header">
            <h2>Camera Calibration</h2>
            <p>Position yourself so your full body is visible, then test movement detection.</p>
          </div>          {/* System Status */}
          <div className="panel-section">
            <h3>System Status</h3>
            <div className="status-indicators">
              <div className={`status-item ${cameraReady ? 'ready' : 'loading'}`}>
                <span className="status-icon">{cameraReady ? '✅' : '⏳'}</span>
                <span>Camera: {cameraReady ? 'Ready' : 'Loading...'}</span>
              </div>
              <div className={`status-item ${modelLoaded ? 'ready' : 'loading'}`}>
                <span className="status-icon">{modelLoaded ? '✅' : '⏳'}</span>
                <span>AI Model: {modelLoaded ? 'Loaded' : 'Loading...'}</span>
              </div>
              <div className={`status-item ${currentPoses.length > 0 ? 'ready' : 'waiting'}`}>
                <span className="status-icon">{currentPoses.length > 0 ? '👤' : '❓'}</span>
                <span>Person Detected: {currentPoses.length > 0 ? 'Yes' : 'No'}</span>
              </div>
            </div>
            {!cameraReady && (
              <div className="camera-help">
                <p style={{fontSize: '12px', color: '#888', marginTop: '8px'}}>
                  💡 If camera doesn't load: Check browser permissions, try Firefox, or ensure HTTPS access.
                </p>
              </div>
            )}
          </div>{/* Movement tests - streamlined */}
          <div className="panel-section">
            <h3>Movement Tests</h3>
            <p className="test-instructions">Raise each hand above your head to test movement detection:</p>
            
            <div className="movement-tests-compact">
              <div className={`test-item ${leftRaiseCount >= REQUIRED_RAISE_COUNT ? 'completed' : ''}`}>
                <div className="test-info">
                  <span className="test-icon">🙋‍♀️</span>
                  <span className="test-name">Left Hand</span>
                </div>
                <div className="test-status">
                  <span className="count">{leftRaiseCount}/{REQUIRED_RAISE_COUNT}</span>
                  <div className="mini-progress">
                    <div 
                      className="mini-fill"
                      style={{ width: `${(leftRaiseCount / REQUIRED_RAISE_COUNT) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className={`test-item ${rightRaiseCount >= REQUIRED_RAISE_COUNT ? 'completed' : ''}`}>
                <div className="test-info">
                  <span className="test-icon">🙋‍♂️</span>
                  <span className="test-name">Right Hand</span>
                </div>
                <div className="test-status">
                  <span className="count">{rightRaiseCount}/{REQUIRED_RAISE_COUNT}</span>
                  <div className="mini-progress">
                    <div 
                      className="mini-fill"
                      style={{ width: `${(rightRaiseCount / REQUIRED_RAISE_COUNT) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Control buttons */}
          <div className="panel-section">
            <div className="calibration-controls">
              <button 
                onClick={resetCalibration}
                className="reset-button"
              >
                Reset Tests
              </button>
              
              <button 
                onClick={onCalibrationComplete}
                disabled={!isCalibrated}
                className={`continue-button ${isCalibrated ? 'enabled' : 'disabled'}`}
              >
                {isCalibrated ? 'Start Animation!' : 'Complete Tests First'}
              </button>
            </div>
          </div>

          {/* Debug information */}
          {debugMode && (
            <div className="panel-section">
              <div className="debug-info">
                <h4>Debug Information</h4>
                <div className="debug-grid">
                  <div>Poses Detected: {currentPoses.length}</div>
                  <div>Left Raises: {leftRaiseCount}</div>
                  <div>Right Raises: {rightRaiseCount}</div>
                  <div>Calibrated: {isCalibrated ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CalibrationPage
