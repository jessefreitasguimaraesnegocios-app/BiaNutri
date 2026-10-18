
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Panda from './Panda';

interface VirtualPetSceneProps {
    animationName: string;
    message?: string;
    modelType?: 'glb' | 'fbx' | 'auto';
    url?: string;
}

const VirtualPetScene: React.FC<VirtualPetSceneProps> = ({ animationName, message, modelType = 'auto', url }) => {
    return (
        <div className="w-full h-full relative flex flex-col items-center">
            {message && (
                <div className="pointer-events-none relative z-20 shrink-0 mt-1 mb-1 w-[min(220px,78%)] text-center">
                    <div
                        key={message}
                        className="relative inline-block max-w-full bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-lg border-2 border-brand-100 dark:border-brand-900 animate-in fade-in zoom-in duration-300"
                    >
                        <p className="text-xs font-bold text-slate-700 dark:text-brand-300 whitespace-normal leading-snug">
                            {message}
                        </p>
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-800 rotate-45 border-b-2 border-r-2 border-brand-100 dark:border-brand-900"></div>
                    </div>
                </div>
            )}
            <div className="relative w-full flex-1 min-h-0">
            <Canvas shadows camera={{ position: [0, 0.35, 4.4], fov: 38 }} className="!absolute inset-0">
                <ambientLight intensity={1} />
                <directionalLight position={[3, 3, 3]} intensity={1} castShadow />

                <Suspense fallback={null}>
                    <Panda animation={animationName} modelType={modelType} url={url!} />
                </Suspense>

                <OrbitControls
                    target={[0, -0.15, 0]}
                    enableZoom={false}
                    enablePan={false}
                    enableDamping
                    dampingFactor={0.08}
                    minPolarAngle={Math.PI / 2.5}
                    maxPolarAngle={Math.PI / 1.75}
                    minAzimuthAngle={-Math.PI / 2.2}
                    maxAzimuthAngle={Math.PI / 2.2}
                />
            </Canvas>
            </div>
        </div>
    );
};

export default VirtualPetScene;
