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
        console.error('[CalibrationPage] Failed to initialize pose detection:', error)
      }
    }

    initializePoseDetection()
  }, [])

  // Start pose detection loop when both camera and model are ready
  useEffect(() => {
    if (!cameraReady || !modelLoaded || !poseDetector) return

    console.log('[CalibrationPage] Starting pose detection loop')
    const detectPoses = async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        try {
          const poses = await poseDetector.detectPoses(webcamRef.current.video)
          setCurrentPoses(poses)
            // Analyze poses for hand-above-head detection
          analyzePosesForHandRaises(poses)
          
          // Draw poses on canvas if in debug mode
          if (debugMode && canvasRef.current) {
            drawPoses(poses)
          }
        } catch (error) {
          console.error('[CalibrationPage] Error detecting poses:', error)
        }
      }
    }

    const intervalId = setInterval(detectPoses, 100) // Run detection every 100ms
    return () => clearInterval(intervalId)
  }, [cameraReady, modelLoaded, poseDetector, debugMode])  // Analyze detected poses for hand-above-head movements
  const analyzePosesForHandRaises = (poses) => {
    if (poses.length === 0) return

    const pose = poses[0] // Use first detected person
    const keypoints = pose.keypoints

    // Get hand positions (wrist keypoints) and head reference
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
    }    // Check for left hand above head
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
    }
  }

  // Draw pose keypoints on canvas for debugging
  const drawPoses = (poses) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    poses.forEach(pose => {
      // Draw keypoints
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) {
          ctx.fillStyle = keypoint.name.includes('left') ? 'red' : 'blue'
          ctx.beginPath()
          ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI)
          ctx.fill()
          
          // Label keypoints in debug mode
          ctx.fillStyle = 'white'
          ctx.font = '12px Arial'
          ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y)
        }
      })
    })
  }
  // Check if calibration is complete
  useEffect(() => {
    if (leftRaiseCount >= REQUIRED_RAISE_COUNT && rightRaiseCount >= REQUIRED_RAISE_COUNT) {
      setIsCalibrated(true)
      console.log('[CalibrationPage] Calibration complete!')
    }
  }, [leftRaiseCount, rightRaiseCount])

  const handleCameraReady = () => {
    console.log('[CalibrationPage] Camera is ready')
    setCameraReady(true)
  }
  const resetCalibration = () => {
    console.log('[CalibrationPage] Resetting calibration')
    setLeftRaiseCount(0)
    setRightRaiseCount(0)
    setIsCalibrated(false)
  }

  return (
    <div className="calibration-page">
      <div className="calibration-header">
        <h2>Camera Calibration & Movement Testing</h2>
        <p>Position yourself so your full body is visible in the camera feed below. We'll test if the system can detect when you raise your hands above your head.</p>
      </div>

      <div className="calibration-content">
        {/* Camera feed section */}
        <div className="camera-section">
          <div className="camera-container">            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                facingMode: "user",
                aspectRatio: 4/3
              }}
              onUserMedia={handleCameraReady}
              className="webcam-feed"
            />
              {/* Debug canvas overlay */}
            {debugMode && (
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="pose-canvas"
              />
            )}
            
            {/* Camera status overlay */}
            <div className="camera-status">
              <div className={`status-indicator ${cameraReady ? 'ready' : 'loading'}`}>
                Camera: {cameraReady ? 'Ready' : 'Loading...'}
              </div>
              <div className={`status-indicator ${modelLoaded ? 'ready' : 'loading'}`}>
                AI Model: {modelLoaded ? 'Loaded' : 'Loading...'}
              </div>
            </div>
          </div>
        </div>

        {/* Movement testing section */}
        <div className="testing-section">          <h3>Movement Tests</h3>
          <p>Test the following movements to ensure the system can detect them:</p>
            <div className="movement-tests">
            <div className={`test-card ${leftRaiseCount >= REQUIRED_RAISE_COUNT ? 'completed' : ''}`}>
              <div className="test-icon">�‍♀️</div>
              <h4>Left Hand Above Head</h4>
              <p>Raise your left hand straight up above your head</p>
              <div className="test-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(leftRaiseCount / REQUIRED_RAISE_COUNT) * 100}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {leftRaiseCount}/{REQUIRED_RAISE_COUNT} raises detected
                </span>
              </div>
            </div>

            <div className={`test-card ${rightRaiseCount >= REQUIRED_RAISE_COUNT ? 'completed' : ''}`}>
              <div className="test-icon">�‍♂️</div>
              <h4>Right Hand Above Head</h4>
              <p>Raise your right hand straight up above your head</p>
              <div className="test-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(rightRaiseCount / REQUIRED_RAISE_COUNT) * 100}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {rightRaiseCount}/{REQUIRED_RAISE_COUNT} raises detected
                </span>
              </div>
            </div>
          </div>

          {/* Calibration controls */}
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
      </div>

      {/* Debug information */}
      {debugMode && (
        <div className="debug-info">
          <h4>Debug Information</h4>
          <div className="debug-grid">
            <div>Poses Detected: {currentPoses.length}</div>            <div>Left Raises: {leftRaiseCount}</div>
            <div>Right Raises: {rightRaiseCount}</div>
            <div>Calibrated: {isCalibrated ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalibrationPage
