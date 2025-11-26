import React from 'react';
import VoxelPhage from './components/VoxelPhage';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-neutral-900 text-white overflow-hidden font-sans">
      <VoxelPhage />
      
      {/* Overlay UI */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none mix-blend-difference">
        <h1 className="text-4xl font-bold tracking-tighter mb-2 text-white">T4 BACTERIOPHAGE</h1>
        <h2 className="text-lg text-neutral-300 font-mono tracking-widest uppercase mb-6">Viral Injection Simulation</h2>
        
        <div className="space-y-4 max-w-sm">
          <div className="border-l-2 border-cyan-500 pl-4">
            <h3 className="text-cyan-400 font-bold text-sm uppercase">Phage Capsid</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Draining: The viral genome is actively being pumped out of the capsid head.
            </p>
          </div>
          <div className="border-l-2 border-emerald-500 pl-4">
            <h3 className="text-emerald-500 font-bold text-sm uppercase">Contractile Sheath</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Animating: The tail sheath contracts mechanically, driving the core through the cell wall.
            </p>
          </div>
          <div className="border-l-2 border-red-500 pl-4">
            <h3 className="text-red-500 font-bold text-sm uppercase">Infection</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Viral DNA enters the host cytoplasm, forming a chaotic pool of genetic material.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 z-10 text-right pointer-events-none">
        <div className="text-xs font-mono text-neutral-500">
          STATUS: INJECTION SEQUENCE<br />
          VOXEL COUNT: 48,000+<br />
          FPS: OPTIMIZED INSTANCING
        </div>
      </div>
    </div>
  );
};

export default App;