
import React, { useRef, useEffect, useState } from 'react';
import { useGLTF, useFBX, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Object3D, MathUtils, AnimationClip } from 'three';

interface PandaProps {
    animation?: string;
    modelType?: 'glb' | 'fbx' | 'auto';
}

// --- SHARED LOGIC COMPONENT ---
interface PandaInnerProps {
    scene: Group | Object3D;
    animations: AnimationClip[];
    animation: string;
    scale: number;
    position: [number, number, number];
}

const PandaInner: React.FC<PandaInnerProps> = ({ scene, animations, animation, scale, position }) => {
    const group = useRef<Group>(null);
    const { actions } = useAnimations(animations, group);

    // --- SKELETON REFS ---
    const hipsRef = useRef<Object3D | null>(null);
    const spineRef = useRef<Object3D | null>(null);
    const neckRef = useRef<Object3D | null>(null);
    const headRef = useRef<Object3D | null>(null);
    const eyeLRef = useRef<Object3D | null>(null);
    const eyeRRef = useRef<Object3D | null>(null);
    const armLRef = useRef<Object3D | null>(null);
    const armRRef = useRef<Object3D | null>(null);
    const legLRef = useRef<Object3D | null>(null);
    const legRRef = useRef<Object3D | null>(null);

    // Track if a real animation is playing to disable procedural override
    const isPlayingRealAnimation = useRef(false);

    // Random idle variations
    const [randomOffset] = useState(() => Math.random() * 100);

    // Helper to find bones loosely
    const findBone = (name: string) => {
        let found: Object3D | null = null;
        scene.traverse((child) => {
            if (found) return;
            if (child.name.toLowerCase().includes(name.toLowerCase()) && (child.type === 'Bone' || child.type === 'Object3D' || child.type === 'Group')) {
                // Prioritize exact matches or bones
                found = child;
            }
        });
        return found;
    };

    useEffect(() => {
        // Map Skeleton
        hipsRef.current = findBone('hips') || findBone('pelvis') || findBone('root');
        spineRef.current = findBone('spine');
        neckRef.current = findBone('neck');
        headRef.current = findBone('head');

        // Eyes (often part of head mesh, but we check for bones/nodes)
        eyeLRef.current = findBone('eye_l') || findBone('eye.l') || findBone('LeftEye');
        eyeRRef.current = findBone('eye_r') || findBone('eye.r') || findBone('RightEye');

        armLRef.current = findBone('arm_l') || findBone('upper_arm.l') || findBone('shoulder.l') || findBone('LeftArm');
        armRRef.current = findBone('arm_r') || findBone('upper_arm.r') || findBone('shoulder.r') || findBone('RightArm');

        legLRef.current = findBone('leg_l') || findBone('thigh.l') || findBone('up_leg.l') || findBone('LeftLocation');
        legRRef.current = findBone('leg_r') || findBone('thigh.r') || findBone('up_leg.r') || findBone('RightLocation');

        console.log("Skeleton Mapping:", {
            hips: hipsRef.current?.name,
            head: headRef.current?.name,
            spine: spineRef.current?.name,
            neck: neckRef.current?.name
        });
    }, [scene]);

    useEffect(() => {
        if (!actions) return;

        // Stop currently playing actions if animation changes
        Object.values(actions).forEach(action => action?.fadeOut(0.3));
        isPlayingRealAnimation.current = false;

        const action = actions[animation];

        if (action) {
            console.log(`Playing animation: ${animation}`);
            action.reset().fadeIn(0.3).play();
            isPlayingRealAnimation.current = true;
        } else {
            Object.values(actions).forEach(action => action?.stop());
            console.warn(`Animation "${animation}" not found. using procedural fallback.`);
            isPlayingRealAnimation.current = false;
        }
    }, [animation, actions]);

    useFrame((state) => {
        if (!group.current) return;

        const t = state.clock.getElapsedTime() + randomOffset;
        const pointer = state.pointer; // Normalized [-1, 1]
        const baseY = position[1];
        let pulo = Math.sin(t * 1.8) * 0.03;
        let inclinacao = Math.sin(t * 1.1) * 0.045;

        if (animation === 'Happy' || animation === 'Success') {
            pulo = Math.abs(Math.sin(t * 6)) * 0.14;
            inclinacao = Math.sin(t * 7) * 0.1;
        } else if (animation === 'Walk') {
            pulo = Math.abs(Math.sin(t * 8)) * 0.07;
            inclinacao = Math.sin(t * 8) * 0.08;
        } else if (animation === 'Eat') {
            pulo = Math.abs(Math.sin(t * 9)) * 0.05;
            inclinacao = 0.06;
        } else if (animation === 'Sad' || animation === 'Error' || animation === 'LowHealth') {
            pulo = Math.sin(t * 0.7) * 0.015;
            inclinacao = 0.1;
        } else if (animation === 'Thinking') {
            pulo = Math.sin(t * 1.2) * 0.02;
            inclinacao = Math.sin(t * 1.5) * 0.12;
        }

        group.current.position.y = baseY + pulo;
        group.current.rotation.z = MathUtils.lerp(group.current.rotation.z, inclinacao * 0.45, 0.08);
        group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, 0, 0.06);

        // --- 1. GLOBAL ALIVENESS ---

        // Breathing: Influence Spine and Scale
        const breath = Math.sin(t * 1.5);
        if (spineRef.current) {
            spineRef.current.rotation.x = MathUtils.lerp(spineRef.current.rotation.x, breath * 0.05, 0.1);
        }

        // --- 2. INTELLIGENT TRACKING ---
        const lookX = -pointer.x;
        const lookY = -pointer.y;

        // Head Tracking
        if (headRef.current) {
            const range = 0.5;
            const targetY = lookX * range;
            const targetX = lookY * range * 0.5;

            headRef.current.rotation.y = MathUtils.lerp(headRef.current.rotation.y, targetY, 0.1);
            headRef.current.rotation.x = MathUtils.lerp(headRef.current.rotation.x, targetX, 0.1);
        }

        // Neck Tracking
        if (neckRef.current) {
            neckRef.current.rotation.y = MathUtils.lerp(neckRef.current.rotation.y, lookX * 0.3, 0.05);
            neckRef.current.rotation.x = MathUtils.lerp(neckRef.current.rotation.x, lookY * 0.2, 0.05);
        }

        // Spine Tracking
        if (spineRef.current) {
            spineRef.current.rotation.y = MathUtils.lerp(spineRef.current.rotation.y, lookX * 0.1, 0.02);
        }

        // Eyes Tracking
        if (eyeLRef.current && eyeRRef.current) {
            const eyeX = lookY * 0.5;
            const eyeY = lookX * 0.8;
            eyeLRef.current.rotation.x = eyeX;
            eyeLRef.current.rotation.y = eyeY;
            eyeRRef.current.rotation.x = eyeX;
            eyeRRef.current.rotation.y = eyeY;
        }

        // --- 3. PROCEDURAL BODY ANIMATIONS ---

        if (isPlayingRealAnimation.current) return;

        // Base Idle Posture
        if (hipsRef.current) {
            const sway = Math.sin(t * 0.8) * 0.02;
            hipsRef.current.position.y = MathUtils.lerp(hipsRef.current.position.y, sway, 0.1);
            hipsRef.current.rotation.z = MathUtils.lerp(hipsRef.current.rotation.z, -sway * 0.5, 0.1);
        }

        switch (animation) {
            case 'Idle':
            default:
                // Arms down relaxed
                if (armLRef.current) {
                    armLRef.current.rotation.z = MathUtils.lerp(armLRef.current.rotation.z, -1.2, 0.1);
                    armLRef.current.rotation.x = MathUtils.lerp(armLRef.current.rotation.x, 0, 0.1);
                }
                if (armRRef.current) {
                    armRRef.current.rotation.z = MathUtils.lerp(armRRef.current.rotation.z, 1.2, 0.1);
                    armRRef.current.rotation.x = MathUtils.lerp(armRRef.current.rotation.x, 0, 0.1);
                }
                // Legs planted
                if (legLRef.current) legLRef.current.rotation.x = MathUtils.lerp(legLRef.current.rotation.x, 0, 0.1);
                if (legRRef.current) legRRef.current.rotation.x = MathUtils.lerp(legRRef.current.rotation.x, 0, 0.1);
                // Subtle sway hip override
                if (hipsRef.current) {
                    hipsRef.current.rotation.z = Math.sin(t * 1) * 0.02;
                }
                break;

            case 'Walk':
                const walkSpeed = 8;
                const walkL = Math.sin(t * walkSpeed);
                const walkR = Math.sin(t * walkSpeed + Math.PI);

                if (legLRef.current) legLRef.current.rotation.x = walkL * 0.6;
                if (legRRef.current) legRRef.current.rotation.x = walkR * 0.6;

                if (armLRef.current) {
                    armLRef.current.rotation.x = -walkL * 0.4;
                    armLRef.current.rotation.z = -0.5;
                }
                if (armRRef.current) {
                    armRRef.current.rotation.x = -walkR * 0.4;
                    armRRef.current.rotation.z = 0.5;
                }
                if (hipsRef.current) {
                    hipsRef.current.position.y = Math.abs(Math.sin(t * walkSpeed * 2)) * 0.1;
                    hipsRef.current.rotation.z = Math.sin(t * walkSpeed) * 0.05;
                }
                break;

            case 'Run':
                const runSpeed = 15;
                const runL = Math.sin(t * runSpeed);
                const runR = Math.sin(t * runSpeed + Math.PI);

                if (legLRef.current) legLRef.current.rotation.x = runL * 0.8;
                if (legRRef.current) legRRef.current.rotation.x = runR * 0.8;

                if (armLRef.current) {
                    armLRef.current.rotation.x = -runL * 0.8;
                    armLRef.current.rotation.z = -1;
                }
                if (armRRef.current) {
                    armRRef.current.rotation.x = -runR * 0.8;
                    armRRef.current.rotation.z = 1;
                }
                break;

            case 'Jump':
            case 'Happy':
            case 'Success':
                const jumpPhase = Math.abs(Math.sin(t * 10));
                group.current.position.y = -0.8 + jumpPhase * 0.4;

                if (legLRef.current) legLRef.current.rotation.x = -0.5 * jumpPhase;
                if (legRRef.current) legRRef.current.rotation.x = -0.5 * jumpPhase;

                if (armLRef.current) {
                    armLRef.current.rotation.z = 2.5 + Math.sin(t * 20) * 0.2;
                    armLRef.current.rotation.x = 0;
                }
                if (armRRef.current) {
                    armRRef.current.rotation.z = -2.5 - Math.sin(t * 20) * 0.2;
                    armRRef.current.rotation.x = 0;
                }
                break;

            case 'Sad':
            case 'Error':
                if (neckRef.current) neckRef.current.rotation.x = 0.5;
                if (armLRef.current) {
                    armLRef.current.rotation.z = -0.5;
                    armLRef.current.rotation.x = 0.5;
                }
                if (armRRef.current) {
                    armRRef.current.rotation.z = 0.5;
                    armRRef.current.rotation.x = 0.5;
                }
                break;

            case 'Thinking':
                if (armRRef.current) {
                    armRRef.current.rotation.z = -2;
                    armRRef.current.rotation.x = 1.5;
                    armRRef.current.rotation.y = -0.5;
                }
                if (armLRef.current) {
                    armLRef.current.rotation.z = -1;
                }
                if (headRef.current) {
                    headRef.current.rotation.z = -0.3;
                }
                break;

            case 'Wave':
                if (armRRef.current) {
                    armRRef.current.rotation.z = -2.5;
                    armRRef.current.rotation.x = Math.sin(t * 10) * 0.5;
                }
                if (armLRef.current) {
                    armLRef.current.rotation.z = -1.2;
                }
                break;

            case 'Eat':
                if (armRRef.current && armLRef.current) {
                    armRRef.current.rotation.z = -1.5;
                    armRRef.current.rotation.x = -1;
                    armLRef.current.rotation.z = 1.5;
                    armLRef.current.rotation.x = -1;
                }
                if (headRef.current) {
                    headRef.current.rotation.x = 0.2 + Math.sin(t * 10) * 0.1;
                }
                break;
        }
    });

    return (
        <primitive
            ref={group}
            object={scene}
            scale={scale}
            position={position}
        />
    );
};


// --- SUB-COMPONENTS FOR DIFFERENT LOADERS ---

// --- SUB-COMPONENTS FOR DIFFERENT LOADERS ---

const PandaGLB = ({ animation, url }: { animation: string, url: string }) => {
    const { scene, animations } = useGLTF(url);
    return <PandaInner scene={scene} animations={animations} animation={animation} scale={0.86} position={[0, -1.15, 0]} />;
};

const PandaFBX = ({ animation, url }: { animation: string, url: string }) => {
    const fbx = useFBX(url);
    return <PandaInner scene={fbx} animations={fbx.animations} animation={animation} scale={0.011} position={[0, -0.8, 0]} />;
};

// --- ERROR BOUNDARY FOR FALLBACK ---
class ModelErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.warn("Primary model failed to load, switching to fallback:", error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

interface PandaProps {
    animation?: string;
    modelType?: 'glb' | 'fbx' | 'auto';
    url: string; // URL is now required for dynamic loading
}

// --- MAIN EXPORT ---

export default function Panda({ animation = "Idle", modelType = "auto", url }: PandaProps) {
    // Explicit choices
    if (modelType === 'glb') {
        return <PandaGLB animation={animation} url={url} />;
    }
    if (modelType === 'fbx') {
        return <PandaFBX animation={animation} url={url} />;
    }

    // Auto is less relevant with explicit URLs but we keep structure
    // If auto, we assume the URL dictates the type or we try our best. 
    // Actually if we pass a .glb URL to useFBX it fails.
    // So 'auto' should rely on explicit type passed from parent which knows the extension.
    // If we land here with 'auto', we just render based on extension if possible?
    // For now, let's assume valid modelType is always passed by the smart container.

    // Fallback if type mismatch? 
    if (url.endsWith('.fbx')) return <PandaFBX animation={animation} url={url} />;
    return <PandaGLB animation={animation} url={url} />;
}

