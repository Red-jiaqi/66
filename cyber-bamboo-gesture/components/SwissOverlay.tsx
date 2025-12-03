import React from 'react';
import { InteractionMode, SystemStats } from '../types';

interface SwissOverlayProps {
  stats: SystemStats;
}

const SwissOverlay: React.FC<SwissOverlayProps> = ({ stats }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-50">
      {/* Background Grids */}
      <div className="absolute inset-0 bg-swiss-grid opacity-30" />
      <div className="absolute inset-0 bg-swiss-dots opacity-20" />

      {/* Corner Crosshairs - Neon Green */}
      <div className="absolute top-8 left-8 w-4 h-4 border-l-2 border-t-2 border-[#00FF41]/40" />
      <div className="absolute top-8 right-8 w-4 h-4 border-r-2 border-t-2 border-[#00FF41]/40" />
      <div className="absolute bottom-8 left-8 w-4 h-4 border-l-2 border-b-2 border-[#00FF41]/40" />
      <div className="absolute bottom-8 right-8 w-4 h-4 border-r-2 border-b-2 border-[#00FF41]/40" />

      {/* Top Left: Header */}
      <div className="absolute top-8 left-12 text-white">
        <h1 className="text-3xl font-bold tracking-tight leading-none mb-1">DESIGN BY</h1>
        <h2 className="text-sm text-[#00FF41] font-medium tracking-wide mb-2">©Pang's Ai Hub</h2>
        <div className="h-[1px] w-24 bg-[#00FF41]/30 mb-2" />
        <h3 className="text-[10px] tracking-[0.2em] font-bold text-white/60">CYBER BAMBOO SYSTEM</h3>
      </div>

      {/* Bottom Left: Data Grid */}
      <div className="absolute bottom-8 left-12 text-white/80 font-mono text-xs">
        <div className="grid grid-cols-[80px_1fr] gap-y-1 gap-x-4 border-l-2 border-[#00FF41] pl-3">
          <span className="text-white/40">FPS</span>
          <span className="font-bold text-[#00FF41]">{stats.fps.toFixed(0)}</span>
          
          <span className="text-white/40">NODES</span>
          <span className="font-bold text-[#00FF41]">{stats.activeParticles}</span>
          
          <span className="text-white/40">VELOCITY</span>
          <span className="font-bold text-[#00FF41]">{stats.windForce.toFixed(2)} m/s</span>
        </div>
      </div>

      {/* Bottom Right: System Status */}
      <div className="absolute bottom-8 right-12 text-right">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
             <div className={`w-2 h-2 rounded-full ${stats.mode === InteractionMode.MAGNETIC ? 'bg-[#00FF41] animate-pulse' : 'bg-green-800'}`} />
             <span className="text-xs font-bold tracking-widest text-[#00FF41]">SYSTEM ONLINE</span>
          </div>
          <h2 className="text-4xl font-bold text-white tracking-tighter">
            {stats.mode}
          </h2>
          <span className="text-[10px] text-white/50 tracking-[0.15em] mt-1">
            {stats.mode === InteractionMode.MAGNETIC ? 'SINGULARITY DETECTED' : 'BAMBOO WIND SIMULATION'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SwissOverlay;