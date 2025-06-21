# Movement Therapy Tracker

A React.js web application for movement tracking and animation effects designed for music therapy rooms. The app uses TensorFlow.js with MoveNet for real-time pose detection and p5.js for creative visual effects.

## Features

- **Real-time Pose Detection**: Uses TensorFlow.js MoveNet for accurate, fast pose detection in the browser
- **Interactive Animations**: p5.js-powered visual effects triggered by movement
- **Calibration System**: Test and validate movement detection before starting therapy sessions
- **Multiple Animation Themes**: Particles, ripples, fireworks, and flowers themes
- **Responsive Design**: Works on tablets, laptops, and phones
- **Accessibility Focused**: Designed for therapy room use with clear visual feedback

## Technology Stack

- **React.js** - UI framework with functional components and hooks
- **TensorFlow.js + MoveNet** - Real-time pose detection in browser
- **p5.js** - Creative coding library for animations
- **react-webcam** - Camera access component
- **Vite** - Fast development build tool

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- Modern web browser with webcam support
- Good lighting for optimal pose detection

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd laposa
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage

### Calibration Page

1. **Camera Setup**: Position yourself so your full body is visible in the camera feed
2. **Movement Testing**: Test left hand raised above head and right hand raised above head
3. **Validation**: Complete the required number of hand raises for each hand
4. **Proceed**: Click "Start Animation!" once calibration is complete

### Animation Page

1. **Theme Selection**: Choose from available animation themes
2. **Movement Interaction**: Move your hands and body to trigger visual effects
3. **Real-time Feedback**: Watch movement indicators light up as gestures are detected
4. **Controls**: Use play/pause and theme controls as needed

## Movement Detection

The app currently detects:

- **Left Hand Raised**: Left hand positioned above head level
- **Right Hand Raised**: Right hand positioned above head level  
- **Both Hands Up**: Both hands raised simultaneously above head

## Project Structure

```
src/
├── components/
│   ├── CalibrationPage.jsx    # Camera setup and movement testing
│   ├── CalibrationPage.css
│   ├── AnimationPage.jsx      # Main animation interface
│   └── AnimationPage.css
├── services/
│   ├── PoseDetector.js        # TensorFlow.js pose detection
│   └── P5Animation.js         # p5.js animation engine
├── App.jsx                    # Main app component
├── App.css
├── index.css                  # Global styles
└── main.jsx                   # App entry point
```

## Development

### Debug Mode

Enable debug mode to see:
- Pose detection keypoints overlaid on camera feed
- Real-time movement detection status
- Performance metrics and diagnostic information

### Adding New Movement Types

1. Extend the `analyzePosesForMovements` function in `CalibrationPage.jsx`
2. Add corresponding animation triggers in `P5Animation.js`
3. Update UI indicators in `AnimationPage.jsx`

### Creating New Animation Themes

1. Add theme to `colorPalette` in `P5Animation.js`
2. Implement theme-specific drawing logic in draw methods
3. Add theme option to selector in `AnimationPage.jsx`

## Therapy Room Setup

### Recommended Hardware

- Tablet or laptop with good camera (720p minimum)
- Stable internet connection for initial model loading
- Well-lit room for optimal pose detection
- Positioning stand for camera at appropriate height

### Usage Tips

- Ensure full body is visible in camera frame
- Good lighting improves detection accuracy
- Start with calibration page for each new user
- Use debug mode during initial setup
- Test all movements before starting therapy session

## Browser Compatibility

- Chrome/Chromium 88+
- Firefox 85+
- Safari 14+
- Edge 88+

WebGL support required for optimal performance.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- TensorFlow.js team for pose detection models
- p5.js community for creative coding tools
- Music therapy community for inspiration and feedback
