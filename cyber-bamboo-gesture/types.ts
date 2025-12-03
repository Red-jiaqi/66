export interface Vector2 {
  x: number;
  y: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export enum InteractionMode {
  WIND = 'WIND',
  MAGNETIC = 'MAGNETIC'
}

export interface SystemStats {
  fps: number;
  activeParticles: number;
  mode: InteractionMode;
  windForce: number;
}

// Global MediaPipe types (since we are using CDN for stability)
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}
