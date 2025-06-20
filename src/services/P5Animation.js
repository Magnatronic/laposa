import p5 from 'p5'

/**
 * P5Animation class manages p5.js animations triggered by movement detection
 * Provides various visual themes for music therapy interactions
 */
class P5Animation {
  constructor(container, theme = 'particles') {
    this.container = container
    this.currentTheme = theme
    this.p5Instance = null
    this.particles = []
    this.ripples = []
    this.movements = {}
    this.poses = []
    
    // Animation settings
    this.settings = {
      maxParticles: 200,
      maxRipples: 10,
      backgroundColor: [20, 20, 40], // Dark blue background
      colorPalette: {
        particles: [[255, 100, 150], [100, 200, 255], [150, 255, 100], [255, 200, 50]],
        ripples: [[100, 200, 255, 100], [255, 100, 150, 100], [150, 255, 100, 100]],
        fireworks: [[255, 50, 50], [50, 255, 50], [50, 50, 255], [255, 255, 50], [255, 50, 255]],
        flowers: [[255, 100, 150], [255, 200, 100], [150, 100, 255], [100, 255, 150]]
      }
    }

    console.log('[P5Animation] Initializing with theme:', theme)
    this.initializeP5()
  }

  /**
   * Initialize p5.js instance with the container
   */
  initializeP5() {
    const sketch = (p) => {
      // Store reference to p5 instance
      this.p = p

      p.setup = () => {
        console.log('[P5Animation] Setting up canvas')
        // Create canvas that fills the container
        const canvas = p.createCanvas(
          this.container.offsetWidth || 800,
          this.container.offsetHeight || 600
        )
        canvas.parent(this.container)
        
        // Set initial background
        p.background(...this.settings.backgroundColor)
        
        console.log('[P5Animation] Canvas created:', p.width, 'x', p.height)
      }

      p.draw = () => {
        this.draw()
      }

      p.windowResized = () => {
        console.log('[P5Animation] Resizing canvas')
        p.resizeCanvas(
          this.container.offsetWidth || 800,
          this.container.offsetHeight || 600
        )
      }
    }

    this.p5Instance = new p5(sketch)
    console.log('[P5Animation] p5.js instance created')
  }

  /**
   * Main draw loop - called by p5.js
   */
  draw() {
    const p = this.p
    if (!p) return

    // Semi-transparent background for trail effects
    p.fill(...this.settings.backgroundColor, 20)
    p.noStroke()
    p.rect(0, 0, p.width, p.height)

    // Draw based on current theme
    switch (this.currentTheme) {
      case 'particles':
        this.drawParticles()
        break
      case 'ripples':
        this.drawRipples()
        break
      case 'fireworks':
        this.drawFireworks()
        break
      case 'flowers':
        this.drawFlowers()
        break
      default:
        this.drawParticles()
    }

    // Update particle systems
    this.updateParticles()
    this.updateRipples()
  }  /**
   * Map pose coordinates from camera space to canvas space
   * @param {number} x - X coordinate from pose detection (camera space)
   * @param {number} y - Y coordinate from pose detection (camera space)
   * @param {number} cameraWidth - Actual camera width (optional, defaults to 320)
   * @param {number} cameraHeight - Actual camera height (optional, defaults to 240)
   * @returns {Object} Mapped coordinates {x, y} in canvas space
   */  mapPoseToCanvas(x, y, cameraWidth = 320, cameraHeight = 240) {
    if (!this.p) return { x: 0, y: 0 }
    
    // Map coordinates proportionally to canvas size
    const mappedX = (x / cameraWidth) * this.p.width
    const mappedY = (y / cameraHeight) * this.p.height
    
    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(this.p.width, mappedX))
    const clampedY = Math.max(0, Math.min(this.p.height, mappedY))
    
    // Only log occasionally to avoid spam (every 30th call)
    if (Math.random() < 0.033) {
      console.log(`[P5Animation] Coordinate mapping - Camera: (${x.toFixed(1)}, ${y.toFixed(1)}) [${cameraWidth}x${cameraHeight}] -> Canvas: (${clampedX.toFixed(1)}, ${clampedY.toFixed(1)}) [${this.p.width}x${this.p.height}]`)
    }
    
    return { x: clampedX, y: clampedY }
  }
  /**
   * Update animation with new movement data
   * @param {Object} movements - Movement detection results
   * @param {Array} poses - Detected poses array
   * @param {number} videoWidth - Actual video width from camera
   * @param {number} videoHeight - Actual video height from camera
   */  updateMovements(movements, poses, videoWidth = 320, videoHeight = 240) {
    this.movements = movements
    this.poses = poses
    // Store actual video dimensions, with fallbacks
    this.videoWidth = videoWidth || 320
    this.videoHeight = videoHeight || 240
    
    console.log('[P5Animation] Using video dimensions:', this.videoWidth, 'x', this.videoHeight)// Trigger effects based on movements
    if (movements.leftHandRaised) {
      this.triggerEffect('leftHand', poses[0])
    }
    
    if (movements.rightHandRaised) {
      this.triggerEffect('rightHand', poses[0])
    }
    
    if (movements.bothHandsUp) {
      this.triggerEffect('bothHands', poses[0])
    }
    
    if (movements.bodyMovement > 0.3) {
      this.triggerEffect('bodyMovement', poses[0], movements.bodyMovement)
    }
  }
  /**
   * Trigger visual effect based on movement type
   * @param {string} effectType - Type of effect to trigger
   * @param {Object} pose - Pose data for positioning
   * @param {number} intensity - Effect intensity (0-1)
   */
  triggerEffect(effectType, pose, intensity = 1) {
    if (!pose || !this.p) return

    const p = this.p
    const colors = this.settings.colorPalette[this.currentTheme] || this.settings.colorPalette.particles

    switch (effectType) {      case 'leftHand':
        const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist')
        if (leftWrist && leftWrist.score > 0.2) {  // Lowered from 0.3 to 0.2
          const mapped = this.mapPoseToCanvas(leftWrist.x, leftWrist.y, this.videoWidth, this.videoHeight)
          console.log(`[P5Animation] Creating left hand effect at (${mapped.x.toFixed(1)}, ${mapped.y.toFixed(1)})`)
          this.createParticlesBurst(mapped.x, mapped.y, colors[0], 10)
        } else {
          console.log(`[P5Animation] Left wrist not suitable for effect - score: ${leftWrist?.score?.toFixed(2) || 'N/A'}`)
        }
        break

      case 'rightHand':
        const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist')
        if (rightWrist && rightWrist.score > 0.2) {  // Lowered from 0.3 to 0.2
          const mapped = this.mapPoseToCanvas(rightWrist.x, rightWrist.y, this.videoWidth, this.videoHeight)
          console.log(`[P5Animation] Creating right hand effect at (${mapped.x.toFixed(1)}, ${mapped.y.toFixed(1)})`)
          this.createParticlesBurst(mapped.x, mapped.y, colors[1], 10)
        } else {
          console.log(`[P5Animation] Right wrist not suitable for effect - score: ${rightWrist?.score?.toFixed(2) || 'N/A'}`)
        }
        break

      case 'bothHands':
        const leftW = pose.keypoints.find(kp => kp.name === 'left_wrist')
        const rightW = pose.keypoints.find(kp => kp.name === 'right_wrist')
        if (leftW && rightW && leftW.score > 0.2 && rightW.score > 0.2) {  // Lowered from 0.3 to 0.2
          const leftMapped = this.mapPoseToCanvas(leftW.x, leftW.y, this.videoWidth, this.videoHeight)
          const rightMapped = this.mapPoseToCanvas(rightW.x, rightW.y, this.videoWidth, this.videoHeight)
          const centerX = (leftMapped.x + rightMapped.x) / 2
          const centerY = (leftMapped.y + rightMapped.y) / 2
          
          this.createRipple(centerX, centerY, colors[2])
          this.createParticlesBurst(leftMapped.x, leftMapped.y, colors[0], 15)
          this.createParticlesBurst(rightMapped.x, rightMapped.y, colors[1], 15)
        }
        break

      case 'bodyMovement':
        const nose = pose.keypoints.find(kp => kp.name === 'nose')
        if (nose && nose.score > 0.3) {
          const mapped = this.mapPoseToCanvas(nose.x, nose.y, this.videoWidth, this.videoHeight)
          const particleCount = Math.floor(intensity * 8)
          this.createParticlesBurst(mapped.x, mapped.y, colors[3], particleCount)
        }
        break
    }
  }
  /**
   * Create a burst of particles at specified location
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Array} color - RGB color array
   * @param {number} count - Number of particles to create
   */
  createParticlesBurst(x, y, color, count) {
    // Add boundary checking and logging
    if (!this.p) {
      console.warn('[P5Animation] p5 instance not available')
      return
    }
    
    console.log(`[P5Animation] Creating ${count} particles at (${x.toFixed(1)}, ${y.toFixed(1)}) on canvas ${this.p.width}x${this.p.height}`)
    
    // Ensure coordinates are within valid bounds
    if (x < 0 || x > this.p.width || y < 0 || y > this.p.height) {
      console.warn(`[P5Animation] Particle coordinates (${x.toFixed(1)}, ${y.toFixed(1)}) are outside canvas bounds (0,0)-(${this.p.width},${this.p.height})`)
    }
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length < this.settings.maxParticles) {
        this.particles.push({
          x: x,
          y: y,
          vx: this.p.random(-5, 5),
          vy: this.p.random(-5, 5),
          life: 1.0,
          maxLife: this.p.random(60, 120),
          size: this.p.random(5, 15),
          color: [...color],
          trail: []
        })
      }
    }
    console.log(`[P5Animation] Total particles: ${this.particles.length}`)
  }

  /**
   * Create a ripple effect at specified location
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Array} color - RGBA color array
   */
  createRipple(x, y, color) {
    if (this.ripples.length < this.settings.maxRipples) {
      this.ripples.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: this.p.random(100, 200),
        life: 1.0,
        color: [...color]
      })
    }
    console.log(`[P5Animation] Created ripple at (${x}, ${y})`)
  }

  /**
   * Draw particles animation
   */
  drawParticles() {
    const p = this.p
    
    this.particles.forEach(particle => {
      p.push()
      
      // Set particle color with alpha based on life
      const alpha = particle.life * 255
      p.fill(particle.color[0], particle.color[1], particle.color[2], alpha)
      p.noStroke()
      
      // Draw particle
      p.ellipse(particle.x, particle.y, particle.size)
      
      // Draw trail if it exists
      if (particle.trail.length > 1) {
        p.stroke(particle.color[0], particle.color[1], particle.color[2], alpha * 0.5)
        p.strokeWeight(2)
        p.noFill()
        p.beginShape()
        particle.trail.forEach(point => {
          p.vertex(point.x, point.y)
        })
        p.endShape()
      }
      
      p.pop()
    })
  }

  /**
   * Draw ripples animation
   */
  drawRipples() {
    const p = this.p
    
    this.ripples.forEach(ripple => {
      p.push()
      
      const alpha = ripple.life * ripple.color[3]
      p.stroke(ripple.color[0], ripple.color[1], ripple.color[2], alpha)
      p.strokeWeight(3)
      p.noFill()
      
      p.ellipse(ripple.x, ripple.y, ripple.radius * 2)
      
      p.pop()
    })
  }

  /**
   * Draw fireworks animation
   */
  drawFireworks() {
    this.drawParticles() // Fireworks use enhanced particle system
    
    // Add sparkle effects
    const p = this.p
    this.particles.forEach(particle => {
      if (particle.life > 0.7 && p.random() < 0.1) {
        p.push()
        p.fill(255, 255, 255, particle.life * 255)
        p.noStroke()
        p.ellipse(
          particle.x + p.random(-10, 10),
          particle.y + p.random(-10, 10),
          3
        )
        p.pop()
      }
    })
  }

  /**
   * Draw flowers animation
   */
  drawFlowers() {
    const p = this.p
    
    this.particles.forEach(particle => {
      p.push()
      
      const alpha = particle.life * 255
      p.fill(particle.color[0], particle.color[1], particle.color[2], alpha)
      p.noStroke()
      
      // Draw flower petals
      const petalCount = 6
      const petalSize = particle.size * 0.8
      
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * p.TWO_PI
        const petalX = particle.x + p.cos(angle) * petalSize * 0.5
        const petalY = particle.y + p.sin(angle) * petalSize * 0.5
        p.ellipse(petalX, petalY, petalSize)
      }
      
      // Draw flower center
      p.fill(255, 255, 100, alpha)
      p.ellipse(particle.x, particle.y, particle.size * 0.4)
      
      p.pop()
    })
  }

  /**
   * Update particle positions and lifecycle
   */
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      // Update position
      particle.x += particle.vx
      particle.y += particle.vy
      
      // Add gravity
      particle.vy += 0.1
      
      // Add to trail
      particle.trail.push({ x: particle.x, y: particle.y })
      if (particle.trail.length > 10) {
        particle.trail.shift()
      }
      
      // Update life
      particle.life -= 1 / particle.maxLife
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  /**
   * Update ripple animations
   */
  updateRipples() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i]
      
      // Expand ripple
      ripple.radius += 3
      
      // Fade out
      ripple.life -= 0.02
      
      // Remove completed ripples
      if (ripple.life <= 0 || ripple.radius > ripple.maxRadius) {
        this.ripples.splice(i, 1)
      }
    }
  }

  /**
   * Change animation theme
   * @param {string} theme - New theme name
   */
  setTheme(theme) {
    console.log('[P5Animation] Changing theme from', this.currentTheme, 'to', theme)
    this.currentTheme = theme
    
    // Clear existing particles and ripples for clean transition
    this.particles = []
    this.ripples = []
  }

  /**
   * Clean up p5.js instance
   */
  cleanup() {
    console.log('[P5Animation] Cleaning up p5.js instance')
    if (this.p5Instance) {
      this.p5Instance.remove()
      this.p5Instance = null
    }
  }

  /**
   * Get current animation status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      theme: this.currentTheme,
      particles: this.particles.length,
      ripples: this.ripples.length,
      isActive: !!this.p5Instance
    }
  }
}

export default P5Animation
