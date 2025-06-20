import { useState, useRef, useEffect } from 'react'
import Webcam from 'react-webcam'
import PoseDetector from '../services/PoseDetector'
import P5Animation from '../services/P5Animation'
import './AnimationPage.css'

const AnimationPage = ({ onBackToCalibration, debugMode }) => {
  // Camera and pose detection state
  const webcamRef = useRef(null)
  const p5ContainerRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [poseDetector, setPoseDetector] = useState(null)
  const [p5Animation, setP5Animation] = useState(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [currentPoses, setCurrentPoses] = useState([])
  
  // Animation state
  const [animationTheme, setAnimationTheme] = useState('particles') // Current theme
  const [isPlaying, setIsPlaying] = useState(true)
  const [lastMovementTime, setLastMovementTime] = useState(Date.now())
    // Movement tracking for animations
  const [currentMovements, setCurrentMovements] = useState({
    leftHandRaised: false,
    rightHandRaised: false,
    bothHandsUp: false,
    bodyMovement: 0 // 0-1 scale of overall body movement
  })

  console.log('[AnimationPage] State:', {
    cameraReady,
    modelLoaded,
    currentPoses: currentPoses.length,
    animationTheme,
    isPlaying,
    currentMovements
  })

  // Initialize pose detection when component mounts
  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        console.log('[AnimationPage] Initializing pose detection...')
        const detector = new PoseDetector()
        await detector.initialize()
        setPoseDetector(detector)
        setModelLoaded(true)
        console.log('[AnimationPage] Pose detection initialized successfully')
      } catch (error) {
        console.error('[AnimationPage] Failed to initialize pose detection:', error)
      }
    }

    initializePoseDetection()
  }, [])

  // Initialize P5 animation when container is ready
  useEffect(() => {
    if (p5ContainerRef.current && !p5Animation) {
      console.log('[AnimationPage] Initializing P5 animation...')
      const animation = new P5Animation(p5ContainerRef.current, animationTheme)
      setP5Animation(animation)
    }

    // Cleanup P5 instance when component unmounts
    return () => {
      if (p5Animation) {
        console.log('[AnimationPage] Cleaning up P5 animation')
        p5Animation.cleanup()
      }
    }
  }, [p5ContainerRef.current])

  // Update P5 animation theme when changed
  useEffect(() => {
    if (p5Animation && animationTheme) {
      console.log('[AnimationPage] Updating animation theme to:', animationTheme)
      p5Animation.setTheme(animationTheme)
    }
  }, [animationTheme, p5Animation])

  // Start pose detection loop when both camera and model are ready
  useEffect(() => {
    if (!cameraReady || !modelLoaded || !poseDetector) return

    console.log('[AnimationPage] Starting pose detection loop')
    const detectPoses = async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        try {
          const poses = await poseDetector.detectPoses(webcamRef.current.video)
          setCurrentPoses(poses)
          
          // Analyze poses for movements and trigger animations
          const movements = analyzePosesForMovements(poses)
          setCurrentMovements(movements)            // Send movement data to P5 animation
          if (p5Animation && isPlaying) {
            // Get actual video dimensions
            const video = webcamRef.current.video
            const videoWidth = video && video.videoWidth > 0 ? video.videoWidth : 320
            const videoHeight = video && video.videoHeight > 0 ? video.videoHeight : 240
            
            console.log('[AnimationPage] Video dimensions:', videoWidth, 'x', videoHeight)
            p5Animation.updateMovements(movements, poses, videoWidth, videoHeight)
          }
          
          // Update last movement time if any movement detected
          if (movements.leftHandRaised || movements.rightHandRaised || movements.bothHandsUp || movements.bodyMovement > 0.1) {
            setLastMovementTime(Date.now())
          }
          
        } catch (error) {
          console.error('[AnimationPage] Error detecting poses:', error)
        }
      }
    }

    const intervalId = setInterval(detectPoses, 50) // Run detection every 50ms for smooth animations
    return () => clearInterval(intervalId)
  }, [cameraReady, modelLoaded, poseDetector, p5Animation, isPlaying])
  // Analyze detected poses for various movements
  const analyzePosesForMovements = (poses) => {
    if (poses.length === 0) {
      return {
        leftHandRaised: false,
        rightHandRaised: false,
        bothHandsUp: false,
        bodyMovement: 0
      }
    }

    const pose = poses[0] // Use first detected person
    const keypoints = pose.keypoints

    // Get key body part positions
    const leftWrist = keypoints.find(kp => kp.name === 'left_wrist')
    const rightWrist = keypoints.find(kp => kp.name === 'right_wrist')
    const nose = keypoints.find(kp => kp.name === 'nose')
    const leftEar = keypoints.find(kp => kp.name === 'left_ear')
    const rightEar = keypoints.find(kp => kp.name === 'right_ear')
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder')
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder')

    // Calculate head position (use nose, or average of ears if nose not detected)
    let headY = null
    if (nose && nose.score > 0.3) {
      headY = nose.y
    } else if (leftEar && rightEar && leftEar.score > 0.3 && rightEar.score > 0.3) {
      headY = (leftEar.y + rightEar.y) / 2
    }    // Check for left hand raised above head
    const leftHandRaised = leftWrist && headY && 
      leftWrist.score > 0.2 && leftWrist.y < headY - 20  // Lowered threshold and height requirement

    // Check for right hand raised above head
    const rightHandRaised = rightWrist && headY && 
      rightWrist.score > 0.2 && rightWrist.y < headY - 20  // Lowered threshold and height requirement

    // Check for both hands up
    const bothHandsUp = leftHandRaised && rightHandRaised

    // Debug: log wrist detection
    if (leftWrist && leftWrist.score > 0.1) {
      console.log(`[AnimationPage] Left wrist detected: score=${leftWrist.score.toFixed(2)}, pos=(${leftWrist.x.toFixed(1)}, ${leftWrist.y.toFixed(1)}), headY=${headY?.toFixed(1)}, raised=${leftHandRaised}`)
    }
    if (rightWrist && rightWrist.score > 0.1) {
      console.log(`[AnimationPage] Right wrist detected: score=${rightWrist.score.toFixed(2)}, pos=(${rightWrist.x.toFixed(1)}, ${rightWrist.y.toFixed(1)}), headY=${headY?.toFixed(1)}, raised=${rightHandRaised}`)
    }    // Calculate overall body movement (simplified)
    let bodyMovement = 0
    if (nose && leftShoulder && rightShoulder) {
      // This is a simplified movement calculation
      // In a real implementation, you'd track movement over time
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
      const headPosition = nose.y
      
      // Normalize movement based on pose confidence and position changes
      bodyMovement = Math.min(1, (shoulderWidth / 200) * 0.5 + 
        (headPosition < 200 ? 0.3 : 0)) // Higher movement if head is higher
    }

    // For testing: if wrists are detected but not raised, still trigger some hand effects
    const leftHandDetected = leftWrist && leftWrist.score > 0.2
    const rightHandDetected = rightWrist && rightWrist.score > 0.2
    
    // Use detected hands even if not raised for testing
    const testLeftHand = leftHandDetected && !leftHandRaised
    const testRightHand = rightHandDetected && !rightHandRaised

    return {
      leftHandRaised: leftHandRaised || testLeftHand,  // Include test cases
      rightHandRaised: rightHandRaised || testRightHand,  // Include test cases
      bothHandsUp,
      bodyMovement
    }
  }

  const handleCameraReady = () => {
    console.log('[AnimationPage] Camera is ready')
    setCameraReady(true)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    console.log('[AnimationPage] Animation', isPlaying ? 'paused' : 'playing')
  }

  const changeTheme = (newTheme) => {
    console.log('[AnimationPage] Changing theme to:', newTheme)
    setAnimationTheme(newTheme)
  }

  return (
    <div className="animation-page">
      {/* Control header */}
      <div className="animation-header">
        <div className="header-left">
          <button 
            onClick={onBackToCalibration}
            className="back-button"
          >
            ← Back to Calibration
          </button>
          <h2>Movement Animation Studio</h2>
        </div>
        
        <div className="header-controls">
          <div className="theme-selector">
            <label htmlFor="theme-select">Theme:</label>
            <select 
              id="theme-select"
              value={animationTheme} 
              onChange={(e) => changeTheme(e.target.value)}
            >
              <option value="particles">Particles</option>
              <option value="ripples">Ripples</option>
              <option value="fireworks">Fireworks</option>
              <option value="flowers">Flowers</option>
            </select>
          </div>
          
          <button 
            onClick={togglePlayPause}
            className={`play-pause-button ${isPlaying ? 'playing' : 'paused'}`}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>
      </div>

      {/* Main animation area */}
      <div className="animation-content">
        {/* P5.js animation canvas */}
        <div 
          ref={p5ContainerRef}
          className="animation-canvas-container"
        />

        {/* Camera feed (smaller, for monitoring) */}
        <div className="camera-monitor">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 320,
              height: 240,
              facingMode: "user"
            }}
            onUserMedia={handleCameraReady}
            className="monitor-webcam"
          />
          
          <div className="monitor-status">
            <div className={`status-dot ${cameraReady && modelLoaded ? 'active' : ''}`}></div>
            <span>Tracking {currentPoses.length} person{currentPoses.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>      {/* Movement indicators */}
      <div className="movement-indicators">
        <div className={`indicator ${currentMovements.leftHandRaised ? 'active' : ''}`}>
          <span className="indicator-icon">�‍♀️</span>
          <span className="indicator-label">Left Raised</span>
        </div>
        
        <div className={`indicator ${currentMovements.rightHandRaised ? 'active' : ''}`}>
          <span className="indicator-icon">�‍♂️</span>
          <span className="indicator-label">Right Raised</span>
        </div>
        
        <div className={`indicator ${currentMovements.bothHandsUp ? 'active' : ''}`}>
          <span className="indicator-icon">🙌</span>
          <span className="indicator-label">Both Hands</span>
        </div>
        
        <div className={`indicator ${currentMovements.bodyMovement > 0.3 ? 'active' : ''}`}>
          <span className="indicator-icon">💃</span>
          <span className="indicator-label">Body Movement</span>
        </div>
      </div>

      {/* Debug information */}
      {debugMode && (
        <div className="debug-info">
          <h4>Debug Information</h4>
          <div className="debug-grid">
            <div>Poses: {currentPoses.length}</div>
            <div>Theme: {animationTheme}</div>
            <div>Playing: {isPlaying ? 'Yes' : 'No'}</div>
            <div>Body Movement: {(currentMovements.bodyMovement * 100).toFixed(1)}%</div>
            <div>Last Movement: {Math.round((Date.now() - lastMovementTime) / 1000)}s ago</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnimationPage
