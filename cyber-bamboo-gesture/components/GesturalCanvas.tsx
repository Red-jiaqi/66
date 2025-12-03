import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ParticleSystem } from '../classes/ParticleSystem';
import SwissOverlay from './SwissOverlay';
import { HandLandmark, InteractionMode, SystemStats, Vector2 } from '../types';
import { lerp, distSq } from '../utils/math';

// Constants for Gesture Logic
const PINCH_THRESHOLD = 60; // Pixels
// Increased smoothing factor (0.2 -> 0.4) for more sensitive/responsive cursor tracking
const SMOOTHING_FACTOR = 0.4; 

const GesturalCanvas: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Logic Refs (mutable to avoid re-renders in loop)
  const particleSystem = useRef<ParticleSystem | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);

  // Interaction State
  const cursorRef = useRef<Vector2>({ x: -100, y: -100 });
  const tipsRef = useRef<Vector2[]>([]);
  const modeRef = useRef<InteractionMode>(InteractionMode.WIND);
  const landmarksRef = useRef<HandLandmark[] | null>(null);

  // UI State
  const [stats, setStats] = useState<SystemStats>({
    fps: 0,
    activeParticles: 0,
    mode: InteractionMode.WIND,
    windForce: 0
  });

  const [isCameraReady, setIsCameraReady] = useState(false);

  // Initialize Particle System
  useEffect(() => {
    particleSystem.current = new ParticleSystem();
    const handleResize = () => {
      if (particleSystem.current) {
        particleSystem.current.resize(window.innerWidth, window.innerHeight);
      }
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Coordinate Mapping Function
  // Transforms normalized (0-1) coordinates from video to absolute screen coordinates
  // accounting for object-fit: cover
  const mapCoordinates = useCallback((normX: number, normY: number): Vector2 => {
    if (!videoRef.current || !containerRef.current) return { x: 0, y: 0 };

    const screenW = containerRef.current.clientWidth;
    const screenH = containerRef.current.clientHeight;
    const videoW = videoRef.current.videoWidth || 640;
    const videoH = videoRef.current.videoHeight || 480;

    const screenRatio = screenW / screenH;
    const videoRatio = videoW / videoH;

    let scale: number;
    let offsetX: number;
    let offsetY: number;

    if (screenRatio > videoRatio) {
      // Screen is wider - fit width, crop height
      scale = screenW / videoW;
      const scaledH = videoH * scale;
      offsetX = 0;
      offsetY = (screenH - scaledH) / 2;
    } else {
      // Screen is taller - fit height, crop width
      scale = screenH / videoH;
      const scaledW = videoW * scale;
      offsetX = (screenW - scaledW) / 2;
      offsetY = 0;
    }

    // Mirror X because selfie camera
    const mirroredX = 1 - normX;

    return {
      x: mirroredX * videoW * scale + offsetX,
      y: normY * videoH * scale + offsetY
    };
  }, []);

  // Processing MediaPipe Results
  const onResults = useCallback((results: any) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      landmarksRef.current = null;
      tipsRef.current = [];
      return;
    }

    // Assuming maxNumHands: 1
    const landmarks = results.multiHandLandmarks[0];
    landmarksRef.current = landmarks;

    // Extract fingertips (4: Thumb, 8: Index, 12: Middle, 16: Ring, 20: Pinky)
    const fingertipIndices = [4, 8, 12, 16, 20];
    const newTips: Vector2[] = [];

    fingertipIndices.forEach(idx => {
      const p = mapCoordinates(landmarks[idx].x, landmarks[idx].y);
      newTips.push(p);
    });
    tipsRef.current = newTips;

    // Update Main Cursor (Index Finger - ID 8) with LERP
    const rawIndex = newTips[1]; // Index 8 is second in our array
    cursorRef.current.x = lerp(cursorRef.current.x, rawIndex.x, SMOOTHING_FACTOR);
    cursorRef.current.y = lerp(cursorRef.current.y, rawIndex.y, SMOOTHING_FACTOR);

    // Detect Pinch (Thumb Tip #4 vs Index Tip #8)
    const thumb = newTips[0];
    const index = newTips[1];
    
    // Calculate raw distance in screen pixels
    const pinchDistSq = distSq(thumb.x, thumb.y, index.x, index.y);
    const isPinching = pinchDistSq < (PINCH_THRESHOLD * PINCH_THRESHOLD);

    modeRef.current = isPinching ? InteractionMode.MAGNETIC : InteractionMode.WIND;

  }, [mapCoordinates]);

  // Main Loop
  const loop = useCallback((time: number) => {
    if (!canvasRef.current || !particleSystem.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Update Physics
    particleSystem.current.update(
      modeRef.current,
      tipsRef.current,
      landmarksRef.current ? cursorRef.current : null
    );

    // Draw Particles
    particleSystem.current.draw(ctx);

    // Draw Hand Visuals
    if (landmarksRef.current) {
      // 1. Draw Skeleton
      // MediaPipe HAND_CONNECTIONS need mapping
      if (window.HAND_CONNECTIONS) {
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.4)'; // Cyber Green Transparent
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const conn of window.HAND_CONNECTIONS) {
          const start = landmarksRef.current[conn[0]];
          const end = landmarksRef.current[conn[1]];
          const p1 = mapCoordinates(start.x, start.y);
          const p2 = mapCoordinates(end.x, end.y);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
      }

      // 2. Draw Fingertips (Dots)
      ctx.fillStyle = '#00FF41';
      tipsRef.current.forEach((tip, i) => {
        // Skip Index finger here, it gets a special cursor
        if (i === 1) return; 
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Index Cursor (Main Interaction Point)
      ctx.strokeStyle = '#00FF41';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 25, 0, Math.PI * 2);
      ctx.stroke();

      // If pinching, add a visual indicator
      if (modeRef.current === InteractionMode.MAGNETIC) {
        ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
        ctx.fill();
        
        // Draw connection between thumb and index
        ctx.beginPath();
        ctx.moveTo(tipsRef.current[0].x, tipsRef.current[0].y);
        ctx.lineTo(cursorRef.current.x, cursorRef.current.y);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
    }

    // Stats Calculations
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    frameCountRef.current++;

    if (time - lastFpsTimeRef.current >= 1000) {
      setStats({
        fps: frameCountRef.current,
        activeParticles: particleSystem.current.particles.length,
        mode: modeRef.current,
        windForce: modeRef.current === InteractionMode.MAGNETIC ? 9.8 : Math.random() * 2 // Pseudo value for UI
      });
      frameCountRef.current = 0;
      lastFpsTimeRef.current = time;
    }

    requestAnimationFrame(loop);
  }, [mapCoordinates]);

  // Initialize MediaPipe & Camera
  useEffect(() => {
    // Wait for window globals from CDN
    const init = async () => {
      if (!window.Hands || !window.Camera) {
        console.log("Waiting for MediaPipe scripts...");
        setTimeout(init, 100);
        return;
      }

      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      if (videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        cameraRef.current = camera;
        await camera.start();
        setIsCameraReady(true);
        
        // Start Loop
        requestAnimationFrame(loop);
      }
    };

    init();

    return () => {
      // Cleanup not strictly necessary for single page lifestyle, 
      // but good practice: stop camera tracks if we had access to the stream object directly
    };
  }, [loop, onResults]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#050505]">
      {/* Hidden Video for Input */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-0 pointer-events-none transform -scale-x-100"
        playsInline
      />
      
      {/* Rendering Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full block"
      />

      {/* UI Overlay */}
      {isCameraReady && <SwissOverlay stats={stats} />}

      {/* Loading State */}
      {!isCameraReady && (
        <div className="absolute inset-0 flex items-center justify-center text-[#00FF41] font-bold tracking-widest animate-pulse z-50">
          INITIALIZING CYBER SYSTEM...
        </div>
      )}
    </div>
  );
};

export default GesturalCanvas;