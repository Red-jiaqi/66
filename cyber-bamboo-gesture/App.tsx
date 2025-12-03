import React from 'react';
import GesturalCanvas from './components/GesturalCanvas';

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050505] text-white">
      <GesturalCanvas />
    </div>
  );
}
