# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a React.js web application for movement tracking and animation effects designed for music therapy rooms. The app uses TensorFlow.js with MoveNet for real-time pose detection and p5.js for creative visual effects.

## Key Technologies

- **React.js** - UI framework with responsive design
- **TensorFlow.js + MoveNet** - Real-time pose detection in browser
- **p5.js** - Creative coding library for animations
- **react-webcam** - Camera access component

## Architecture Guidelines

- Use functional components with React hooks
- Implement responsive design for tablets/laptops/phones
- Structure code for future theme expansion
- Include comprehensive debugging and logging
- Ensure accessibility for therapy room use

## Code Standards

- Write well-commented code explaining pose detection logic
- Use descriptive variable names for body parts and movements
- Implement error handling for camera and model loading
- Create reusable components for different animation themes
- Follow React best practices for state management

## Specific Features

- Calibration page with camera feed for pose testing
- Detection of specific movements (hands raised above head)
- Animation screen with visual effects triggered by poses
- Responsive UI suitable for therapist setup and student interaction
