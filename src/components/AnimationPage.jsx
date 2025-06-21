import { useState, useRef, useEffect } from 'react'
import Webcam from 'react-webcam'
import PoseDetector from '../services/PoseDetector'
import P5Animation from '../services/P5Animation'
import './AnimationPage.css'

const AnimationPage = ({ onBackToCalibration, animationTheme: initialTheme = 'particles', debugMode = false }) => {
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
    rightHandRaised: false
  })
  // Debug controls
  const [showWristCursors, setShowWristCursors] = useState(true)
    // Panel controls
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [showCameraFeed, setShowCameraFeed] = useState(false)

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
  }, [])  // Initialize P5 animation when container is ready
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

  // Update wrist cursor visibility when toggle changes
  useEffect(() => {
    if (p5Animation) {
      p5Animation.setWristCursorsVisible(showWristCursors)
    }
  }, [showWristCursors, p5Animation])

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
          }          // Update last movement time if any movement detected
          if (movements.leftHandRaised || movements.rightHandRaised) {
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
  const analyzePosesForMovements = (poses) => {    if (poses.length === 0) {
      return {
        leftHandRaised: false,
        rightHandRaised: false
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
    }    // Enhanced filtering system to prevent false hand detections
    const videoWidth = 320;
    const videoHeight = 240;
    
    let filteredLeftWrist = leftWrist
    let filteredRightWrist = rightWrist
    
    // Initial confidence filter
    if (filteredLeftWrist && filteredLeftWrist.score <= 0.25) filteredLeftWrist = null
    if (filteredRightWrist && filteredRightWrist.score <= 0.25) filteredRightWrist = null
    
    // Apply multiple filtering strategies when both hands are detected
    if (filteredLeftWrist && filteredRightWrist) {
      const distance = Math.sqrt(
        Math.pow(filteredLeftWrist.x - filteredRightWrist.x, 2) + 
        Math.pow(filteredLeftWrist.y - filteredRightWrist.y, 2)
      )
      
      // Filter 1: Proximity filter - hands too close together
      if (distance < 50) {
        console.log(`🔍 Hands too close (${distance.toFixed(1)}px), filtering lower confidence`)
        if (filteredLeftWrist.score > filteredRightWrist.score) {
          console.log(`   Keeping left hand (conf: ${filteredLeftWrist.score.toFixed(3)})`)
          filteredRightWrist = null
        } else {
          console.log(`   Keeping right hand (conf: ${filteredRightWrist.score.toFixed(3)})`)
          filteredLeftWrist = null
        }
      }
      // Filter 2: Anatomical constraint - hands at opposite vertical extremes
      else {
        const topThreshold = videoHeight * 0.15; // Top 15% of frame
        const bottomThreshold = videoHeight * 0.85; // Bottom 15% of frame
        
        const leftAtTop = filteredLeftWrist.y < topThreshold;
        const leftAtBottom = filteredLeftWrist.y > bottomThreshold;
        const rightAtTop = filteredRightWrist.y < topThreshold;
        const rightAtBottom = filteredRightWrist.y > bottomThreshold;
        
        // Check for anatomically unlikely configurations
        if ((leftAtTop && rightAtBottom) || (rightAtTop && leftAtBottom)) {
          console.log(`🚫 Anatomically unlikely: hands at opposite extremes`)
          console.log(`   Left: y=${filteredLeftWrist.y.toFixed(1)} (${leftAtTop ? 'top' : leftAtBottom ? 'bottom' : 'middle'})`)
          console.log(`   Right: y=${filteredRightWrist.y.toFixed(1)} (${rightAtTop ? 'top' : rightAtBottom ? 'bottom' : 'middle'})`)
          
          // Keep the hand with higher confidence
          if (filteredLeftWrist.score > filteredRightWrist.score) {
            console.log(`   Keeping left hand (higher confidence: ${filteredLeftWrist.score.toFixed(3)})`)
            filteredRightWrist = null
          } else {
            console.log(`   Keeping right hand (higher confidence: ${filteredRightWrist.score.toFixed(3)})`)
            filteredLeftWrist = null
          }
        }
      }
    }
    
    // Filter 3: Edge detection filter - remove low confidence detections near frame edges
    const edgeThreshold = 10; // Pixels from edge
    const edgeConfidenceThreshold = 0.4; // Higher threshold for edge detections
    
    if (filteredLeftWrist) {
      const nearEdge = filteredLeftWrist.x < edgeThreshold || 
                      filteredLeftWrist.x > (videoWidth - edgeThreshold) ||
                      filteredLeftWrist.y < edgeThreshold || 
                      filteredLeftWrist.y > (videoHeight - edgeThreshold);
      
      if (nearEdge && filteredLeftWrist.score < edgeConfidenceThreshold) {
        console.log(`🚫 Left hand filtered: near edge with low confidence (${filteredLeftWrist.score.toFixed(3)})`)
        filteredLeftWrist = null
      }
    }
    
    if (filteredRightWrist) {
      const nearEdge = filteredRightWrist.x < edgeThreshold || 
                      filteredRightWrist.x > (videoWidth - edgeThreshold) ||
                      filteredRightWrist.y < edgeThreshold || 
                      filteredRightWrist.y > (videoHeight - edgeThreshold);
      
      if (nearEdge && filteredRightWrist.score < edgeConfidenceThreshold) {
        console.log(`🚫 Right hand filtered: near edge with low confidence (${filteredRightWrist.score.toFixed(3)})`)
        filteredRightWrist = null
      }
    }

    // Check for left hand raised above head
    const leftHandRaised = filteredLeftWrist && headY && 
      filteredLeftWrist.score > 0.25 && filteredLeftWrist.y < headY - 20  // Increased threshold for better accuracy

    // Check for right hand raised above head
    const rightHandRaised = filteredRightWrist && headY && 
      filteredRightWrist.score > 0.25 && filteredRightWrist.y < headY - 20  // Increased threshold for better accuracy    // Debug: log final filtered wrist detections
    if (filteredLeftWrist) {
      console.log(`👈 Left wrist (filtered): score=${filteredLeftWrist.score.toFixed(3)}, pos=(${filteredLeftWrist.x.toFixed(1)}, ${filteredLeftWrist.y.toFixed(1)}), headY=${headY?.toFixed(1)}, raised=${leftHandRaised}`)
    }
    if (filteredRightWrist) {
      console.log(`👉 Right wrist (filtered): score=${filteredRightWrist.score.toFixed(3)}, pos=(${filteredRightWrist.x.toFixed(1)}, ${filteredRightWrist.y.toFixed(1)}), headY=${headY?.toFixed(1)}, raised=${rightHandRaised}`)    }

    // For testing: if wrists are detected but not raised, still trigger some hand effects
    const leftHandDetected = filteredLeftWrist && filteredLeftWrist.score > 0.25
    const rightHandDetected = filteredRightWrist && filteredRightWrist.score > 0.25
    
    // Use detected hands even if not raised for testing
    const testLeftHand = leftHandDetected && !leftHandRaised
    const testRightHand = rightHandDetected && !rightHandRaised
    
    return {
      leftHandRaised: leftHandRaised || testLeftHand,  // Include test cases
      rightHandRaised: rightHandRaised || testRightHand  // Include test cases
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

  const toggleWristCursors = () => {
    setShowWristCursors(!showWristCursors)
    console.log('[AnimationPage] Wrist cursors', !showWristCursors ? 'enabled' : 'disabled')
  }
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen)
    console.log('[AnimationPage] Panel', !isPanelOpen ? 'opened' : 'closed')
  }

  const toggleCameraFeed = () => {
    setShowCameraFeed(!showCameraFeed)
    console.log('[AnimationPage] Camera feed', !showCameraFeed ? 'shown' : 'hidden')
  }
  return (
    <div className="animation-page">      {/* Main content area with animation/camera */}
      <div className="main-content">
        {/* P5.js animation canvas - takes full screen */}
        <div 
          ref={p5ContainerRef}
          className="animation-canvas-container"
        />        {/* Single Camera Feed - Always running, positioned based on visibility */}
        <div className={`camera-feed-overlay ${showCameraFeed ? 'visible' : 'hidden'}`}>
          <div className="camera-feed-container">
            <div className="camera-feed-header">
              <span className="camera-feed-title">Camera View</span>
              <button 
                className="camera-close-button"
                onClick={toggleCameraFeed}
                aria-label="Hide camera feed"
              >
                ✕
              </button>
            </div>
            <div className="camera-feed-video">
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
                className={`webcam-feed ${showCameraFeed ? 'visible-webcam' : 'hidden-webcam'}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Control Panel */}
      <div className={`control-panel ${isPanelOpen ? 'open' : 'closed'}`}>
        {/* Panel toggle button */}
        <button 
          className="panel-toggle"
          onClick={togglePanel}
          aria-label={isPanelOpen ? 'Close panel' : 'Open panel'}
        >
          {isPanelOpen ? '✕' : '☰'}
        </button>

        {/* Panel content */}
        <div className="panel-content">
          {/* Header with back button and title */}
          <div className="panel-header">
            <button 
              onClick={onBackToCalibration}
              className="back-button"
            >
              ← Back to Calibration
            </button>
            <h2>Animation Studio</h2>
          </div>

          {/* System Status */}
          <div className="status-section">
            <h3>System Status</h3>
            <div className="status-indicator">
              <div className={`status-dot ${cameraReady && modelLoaded ? 'active' : ''}`}></div>
              <span>Tracking {currentPoses.length} person{currentPoses.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="status-details">
              <div>Camera: {cameraReady ? '✅ Ready' : '⏳ Loading...'}</div>
              <div>Model: {modelLoaded ? '✅ Loaded' : '⏳ Loading...'}</div>
            </div>
          </div>          {/* Animation Controls */}
          <div className="controls-section">
            <h3>Animation Controls</h3>
            
            <div className="control-group">
              <label htmlFor="theme-select">Theme:</label>
              <select 
                id="theme-select"
                value={animationTheme} 
                onChange={(e) => changeTheme(e.target.value)}
                className="theme-select"
              >
                <option value="particles">Particles</option>
                <option value="ripples">Ripples</option>
                <option value="fireworks">Fireworks</option>
                <option value="flowers">Flowers</option>
              </select>
            </div>
            
            <div className="control-buttons">
              <button 
                onClick={togglePlayPause}
                className={`play-pause-button ${isPlaying ? 'playing' : 'paused'}`}
              >
                {isPlaying ? '⏸️ Pause Animation' : '▶️ Play Animation'}
              </button>
              
              <button 
                onClick={toggleCameraFeed}
                className={`camera-toggle-button ${showCameraFeed ? 'active' : ''}`}
              >
                {showCameraFeed ? '📹 Hide Camera' : '👁️ Show Camera'}
              </button>
            </div>
          </div>

          {/* Movement Indicators */}
          <div className="movement-section">
            <h3>Movement Detection</h3>
            <div className="movement-indicators">
              <div className={`indicator ${currentMovements.leftHandRaised ? 'active' : ''}`}>
                <span className="indicator-icon">✋</span>
                <span className="indicator-label">Left Hand</span>
              </div>
              
              <div className={`indicator ${currentMovements.rightHandRaised ? 'active' : ''}`}>
                <span className="indicator-icon">🤚</span>
                <span className="indicator-label">Right Hand</span>
              </div>
            </div>
          </div>

          {/* Debug Information */}
          {debugMode && (
            <div className="debug-section">
              <h3>Debug Information</h3>
              <div className="debug-controls">
                <button 
                  onClick={toggleWristCursors}
                  className={`debug-toggle ${showWristCursors ? 'active' : ''}`}
                >
                  {showWristCursors ? '👁️ Hide Wrist Cursors' : '👁️‍🗨️ Show Wrist Cursors'}
                </button>
              </div>
              <div className="debug-grid">
                <div>Poses: {currentPoses.length}</div>
                <div>Theme: {animationTheme}</div>
                <div>Playing: {isPlaying ? 'Yes' : 'No'}</div>
                <div>Wrist Cursors: {showWristCursors ? 'On' : 'Off'}</div>
                <div>Last Movement: {Math.round((Date.now() - lastMovementTime) / 1000)}s ago</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimationPage
