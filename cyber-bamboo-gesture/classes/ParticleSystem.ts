import { Vector2, InteractionMode } from '../types';
import { distSq, randomRange } from '../utils/math';

const MAX_PARTICLES_PC = 600;
const MAX_PARTICLES_MOBILE = 250;
const GRAVITY = 0.05; 
const DRAG = 0.96;
const CYBER_GREEN = '#00FF41'; // Neon Green

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // Represents length of the leaf
  rotation: number;
  angVel: number;
  alpha: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * -height; 
    this.vx = randomRange(-1, 1);
    this.vy = randomRange(1, 4);
    this.size = randomRange(10, 22); // Longer for bamboo leaves
    this.rotation = Math.random() * Math.PI * 2;
    this.angVel = randomRange(-0.05, 0.05);
    this.alpha = randomRange(0.4, 0.9);
  }

  reset(width: number) {
    this.x = Math.random() * width;
    this.y = -20;
    this.vx = randomRange(-1, 1);
    this.vy = randomRange(1, 4);
  }
}

export class ParticleSystem {
  particles: Particle[] = [];
  width: number = 0;
  height: number = 0;
  maxParticles: number = MAX_PARTICLES_PC;

  constructor() {
    this.resize(window.innerWidth, window.innerHeight);
    this.initParticles();
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    const isMobile = w < 768;
    this.maxParticles = isMobile ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_PC;
    
    // Adjust array size
    if (this.particles.length > this.maxParticles) {
      this.particles.length = this.maxParticles;
    } else {
      while (this.particles.length < this.maxParticles) {
        this.particles.push(new Particle(this.width, this.height));
      }
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(new Particle(this.width, this.height));
    }
  }

  update(mode: InteractionMode, fingertips: Vector2[], indexFinger: Vector2 | null) {
    for (const p of this.particles) {
      // 1. Basic Physics
      p.vy += GRAVITY;
      p.vx *= DRAG;
      p.vy *= DRAG;
      p.x += p.vx;
      p.y += p.vy;
      
      // Dynamic rotation
      p.rotation += p.angVel + (p.vx * 0.03); 

      // 2. Interaction
      if (mode === InteractionMode.WIND && fingertips.length > 0) {
        // Repulsion
        for (const tip of fingertips) {
          const d2 = distSq(p.x, p.y, tip.x, tip.y);
          if (d2 < 62500) { 
            const dist = Math.sqrt(d2);
            const force = (250 - dist) / 250;
            const angle = Math.atan2(p.y - tip.y, p.x - tip.x);
            p.vx += Math.cos(angle) * force * 3.5;
            p.vy += Math.sin(angle) * force * 3.5;
          }
        }
      } else if (mode === InteractionMode.MAGNETIC && indexFinger) {
        // Spiral Attraction
        const d2 = distSq(p.x, p.y, indexFinger.x, indexFinger.y);
        const dx = indexFinger.x - p.x;
        const dy = indexFinger.y - p.y;
        const dist = Math.sqrt(d2);
        
        if (dist > 10) {
           const pull = 0.12; 
           p.vx += (dx / dist) * pull * 8;
           p.vy += (dy / dist) * pull * 8;

           const spiralStrength = 3000 / (d2 + 2000); 
           p.vx += (-dy / dist) * spiralStrength;
           p.vy += (dx / dist) * spiralStrength;
        }
      }

      // 3. Reset boundaries
      if (p.y > this.height + 20 || p.x < -50 || p.x > this.width + 50) {
        p.reset(this.width);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = CYBER_GREEN;
    
    for (const p of this.particles) {
      if (p.x < -20 || p.x > this.width + 20 || p.y < -20 || p.y > this.height + 20) continue;

      ctx.globalAlpha = p.alpha;
      
      const px = p.x | 0;
      const py = p.y | 0;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.rotation);
      
      // Draw Bamboo Leaf Shape (elongated rhombus/ellipse)
      // Length is p.size, width is p.size / 4
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size / 3, 0, 0, p.size);
      ctx.quadraticCurveTo(-p.size / 3, 0, 0, -p.size);
      ctx.fill();
      
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }
}