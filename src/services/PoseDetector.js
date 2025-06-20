import * as tf from '@tensorflow/tfjs'
import * as poseDetection from '@tensorflow-models/pose-detection'

/**
 * PoseDetector class handles TensorFlow.js pose detection using MoveNet
 * Provides real-time human pose estimation for movement tracking
 */
class PoseDetector {
  constructor() {
    this.detector = null
    this.isInitialized = false
    this.model = 'MoveNet' // Using MoveNet for fast, accurate pose detection
    
    console.log('[PoseDetector] Constructor called')
  }

  /**
   * Initialize the pose detection model
   * This must be called before using detectPoses()
   */
  async initialize() {
    try {
      console.log('[PoseDetector] Starting initialization...')
      
      // Set TensorFlow.js backend (webgl for better performance)
      await tf.setBackend('webgl')
      console.log('[PoseDetector] TensorFlow.js backend set to webgl')
      
      // Create MoveNet detector
      // Using Lightning model for balance of speed and accuracy
      console.log('[PoseDetector] Loading MoveNet model...')
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true, // Smooth pose predictions over time
          enableSegmentation: false // We don't need segmentation for movement tracking
        }
      )
      
      this.isInitialized = true
      console.log('[PoseDetector] Successfully initialized MoveNet model')
      
      // Log model information
      console.log('[PoseDetector] Model details:', {
        model: this.model,
        type: 'SINGLEPOSE_LIGHTNING',
        smoothing: true,
        backend: tf.getBackend()
      })
      
    } catch (error) {
      console.error('[PoseDetector] Failed to initialize:', error)
      throw new Error(`Pose detection initialization failed: ${error.message}`)
    }
  }
  /**
   * Detect poses in a video element or image
   * @param {HTMLVideoElement|HTMLImageElement|ImageData} input - Input source for pose detection
   * @returns {Array} Array of detected poses with keypoints
   */
  async detectPoses(input) {
    if (!this.isInitialized || !this.detector) {
      console.warn('[PoseDetector] Detector not initialized. Call initialize() first.')
      return []
    }

    try {
      // Log video dimensions for debugging coordinate mapping issues
      if (input.videoWidth && input.videoHeight) {
        console.log(`[PoseDetector] Processing video: ${input.videoWidth}x${input.videoHeight}`)
      }
      
      // Detect poses using MoveNet
      const poses = await this.detector.estimatePoses(input, {
        maxPoses: 1, // Single person detection for therapy room use
        flipHorizontal: false, // Don't flip - maintain natural left/right orientation
        scoreThreshold: 0.3 // Minimum confidence threshold for keypoints
      })

      // Log detection results in debug mode
      if (poses.length > 0) {
        console.log('[PoseDetector] Detected pose with', poses[0].keypoints.length, 'keypoints')
        
        // Log high-confidence keypoints for debugging
        const highConfidenceKeypoints = poses[0].keypoints.filter(kp => kp.score > 0.5)
        if (highConfidenceKeypoints.length > 0) {
          console.log('[PoseDetector] High confidence keypoints:', 
            highConfidenceKeypoints.map(kp => `${kp.name}: ${kp.score.toFixed(2)}`))
        }
        
        // Log some sample coordinates for debugging
        const nose = poses[0].keypoints.find(kp => kp.name === 'nose')
        if (nose) {
          console.log(`[PoseDetector] Sample coordinates - Nose: (${nose.x.toFixed(1)}, ${nose.y.toFixed(1)})`)
        }
      }

      return poses

    } catch (error) {
      console.error('[PoseDetector] Error during pose detection:', error)
      return [] // Return empty array on error to prevent app crashes
    }
  }

  /**
   * Get specific keypoint from a pose by name
   * @param {Object} pose - Detected pose object
   * @param {string} keypointName - Name of the keypoint (e.g., 'left_wrist', 'right_shoulder')
   * @returns {Object|null} Keypoint object with x, y, score properties or null if not found
   */
  getKeypoint(pose, keypointName) {
    if (!pose || !pose.keypoints) {
      console.warn('[PoseDetector] Invalid pose object provided to getKeypoint')
      return null
    }

    const keypoint = pose.keypoints.find(kp => kp.name === keypointName)
    
    if (!keypoint) {
      console.log(`[PoseDetector] Keypoint '${keypointName}' not found in pose`)
      return null
    }

    // Only return keypoint if confidence is above threshold
    if (keypoint.score < 0.3) {
      console.log(`[PoseDetector] Keypoint '${keypointName}' has low confidence: ${keypoint.score}`)
      return null
    }

    return keypoint
  }

  /**
   * Calculate distance between two keypoints
   * @param {Object} keypoint1 - First keypoint with x, y properties
   * @param {Object} keypoint2 - Second keypoint with x, y properties
   * @returns {number} Euclidean distance between keypoints
   */
  calculateDistance(keypoint1, keypoint2) {
    if (!keypoint1 || !keypoint2) {
      console.warn('[PoseDetector] Invalid keypoints provided to calculateDistance')
      return 0
    }

    const dx = keypoint1.x - keypoint2.x
    const dy = keypoint1.y - keypoint2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    console.log(`[PoseDetector] Distance calculated: ${distance.toFixed(2)}px`)
    return distance
  }
  /**
   * Check if a hand is raised above the head
   * @param {Object} pose - Detected pose object
   * @param {string} side - 'left' or 'right'
   * @returns {boolean} True if hand is raised above head
   */
  isHandAboveHead(pose, side) {
    const wrist = this.getKeypoint(pose, `${side}_wrist`)
    const nose = this.getKeypoint(pose, 'nose')
    const leftEar = this.getKeypoint(pose, 'left_ear')
    const rightEar = this.getKeypoint(pose, 'right_ear')
    
    if (!wrist) {
      return false
    }

    // Calculate head position (use nose, or average of ears if nose not detected)
    let headY = null
    if (nose) {
      headY = nose.y
    } else if (leftEar && rightEar) {
      headY = (leftEar.y + rightEar.y) / 2
    }

    if (!headY) {
      return false
    }

    // Hand is raised if wrist is above head (smaller y value) with buffer
    const isRaised = wrist.y < headY - 40 // 40px threshold to avoid false positives
    
    if (isRaised) {
      console.log(`[PoseDetector] ${side} hand is above head (wrist: ${wrist.y}, head: ${headY})`)
    }
    
    return isRaised
  }

  /**
   * Check if a hand is raised (wrist above shoulder) - kept for backwards compatibility
   * @param {Object} pose - Detected pose object
   * @param {string} side - 'left' or 'right'
   * @returns {boolean} True if hand is raised
   */
  isHandRaised(pose, side) {
    const wrist = this.getKeypoint(pose, `${side}_wrist`)
    const shoulder = this.getKeypoint(pose, `${side}_shoulder`)
    
    if (!wrist || !shoulder) {
      return false
    }

    // Hand is raised if wrist is above shoulder (smaller y value)
    const isRaised = wrist.y < shoulder.y - 30 // 30px threshold to avoid false positives
    
    if (isRaised) {
      console.log(`[PoseDetector] ${side} hand is raised (wrist: ${wrist.y}, shoulder: ${shoulder.y})`)
    }
    
    return isRaised
  }

  /**
   * Get pose center point (average of visible keypoints)
   * @param {Object} pose - Detected pose object
   * @returns {Object} Center point with x, y properties
   */
  getPoseCenter(pose) {
    if (!pose || !pose.keypoints) {
      return { x: 0, y: 0 }
    }

    const visibleKeypoints = pose.keypoints.filter(kp => kp.score > 0.3)
    
    if (visibleKeypoints.length === 0) {
      return { x: 0, y: 0 }
    }

    const centerX = visibleKeypoints.reduce((sum, kp) => sum + kp.x, 0) / visibleKeypoints.length
    const centerY = visibleKeypoints.reduce((sum, kp) => sum + kp.y, 0) / visibleKeypoints.length

    return { x: centerX, y: centerY }
  }

  /**
   * Clean up resources when done
   */
  dispose() {
    if (this.detector) {
      console.log('[PoseDetector] Disposing detector resources')
      this.detector.dispose()
      this.detector = null
      this.isInitialized = false
    }
  }

  /**
   * Get detector status information
   * @returns {Object} Status object with initialization and model info
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      model: this.model,
      backend: tf.getBackend(),
      hasDetector: !!this.detector
    }
  }
}

export default PoseDetector
