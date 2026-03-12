import React, { useState, useEffect, useMemo } from 'react';
import VirtualPetScene from './VirtualPetScene';
import Avatar3D from './Avatar3D';
import { PetDefinition } from '../utils/petRegistry';

const PET_TEXTS = {
    pt: {
        greetings: [
            'Olá! Sou seu Pet Virtual.',
            'E aí, hooman! 🐾',
            'Tô aqui na moral!',
            'Bora de dieta saudável?',
            'Me dá comida que eu te dou moral!',
            'Sou fofo e sei que sou.',
            'Cadê o lanche?',
            'Hoje tem que fechar a meta!',
            'Tô de boa na lagoa.',
            'Vamos bater a meta juntos!',
            'Fome bateu... e aí?',
            'Só sucesso hoje! 💪',
        ],
        lowHealth: 'Estou cansado...',
        play: ['Yaaay! Brincar!', 'Aeee! Curti!'],
        playAfter: 'Foi divertido!',
        eat: ['Nham nham! Delícia!', 'Hmm, top!'],
        eatAfter: 'Estou cheio!',
        sleep: 'Zzz... recuperando energia...',
        sleepAfter: 'Acordei renovado!',
        scanning: 'Analisando...',
        error: 'Oops! Erro.',
        success: 'Incrível!',
        successAfter: 'Mais alguma coisa?',
        btnEat: '🍎 Comer',
        btnPlay: '⚽ Brincar',
        btnSleep: '💤 Dormir',
        btnChange: '🔄 Trocar',
        energy: 'Energia',
        ariaShowActions: 'Mostrar ações do pet',
        ariaHideActions: 'Ocultar ações do pet',
    },
    en: {
        greetings: [
            "Hey! I'm your Virtual Pet.",
            "What's up, hooman! 🐾",
            "Just chillin' here!",
            'Ready for a healthy diet?',
            'Feed me and we\'re good!',
            "I'm cute and I know it.",
            "Where's the snack?",
            "Let's hit today's goal!",
            'Just vibing.',
            "Let's crush this goal together!",
            "I'm hungry... what's up?",
            'We got this today! 💪',
        ],
        lowHealth: "I'm tired...",
        play: ['Yaaay! Play time!', 'Woo! So fun!'],
        playAfter: 'That was fun!',
        eat: ['Yum yum! So good!', 'Mmm, nice!'],
        eatAfter: "I'm full!",
        sleep: 'Zzz... recovering energy...',
        sleepAfter: 'I woke up refreshed!',
        scanning: 'Analyzing...',
        error: 'Oops! Error.',
        success: 'Amazing!',
        successAfter: 'Anything else?',
        btnEat: '🍎 Eat',
        btnPlay: '⚽ Play',
        btnSleep: '💤 Sleep',
        btnChange: '🔄 Change',
        energy: 'Energy',
        ariaShowActions: 'Show pet actions',
        ariaHideActions: 'Hide pet actions',
    },
} as const;

type Lang = 'pt' | 'en';

interface CompanionContainerProps {
    isLoading: boolean;
    hasResult: boolean;
    hasError: boolean;
    onVariantChange?: () => void;
    selectedPet?: string;
    petData?: PetDefinition;
    lang?: Lang;
}

const CompanionContainer: React.FC<CompanionContainerProps> = ({
    isLoading,
    hasResult,
    hasError,
    onVariantChange,
    selectedPet = 'panda_glb',
    petData,
    lang = 'pt'
}) => {
    type PetState = 'idle' | 'scanning' | 'success' | 'error' | 'walk' | 'sleep' | 'play' | 'eat' | 'lowHealth';

    const t = PET_TEXTS[lang];
    const randomGreeting = useMemo(() => t.greetings[Math.floor(Math.random() * t.greetings.length)], [lang]);

    const [animationState, setAnimationState] = useState<PetState>('idle');
    const [message, setMessage] = useState<string>(randomGreeting);
    const [life, setLife] = useState(100);
    const [showInteractions, setShowInteractions] = useState(false);

    useEffect(() => {
        setMessage(randomGreeting);
    }, [lang, randomGreeting]);

    // Life Decay System
    useEffect(() => {
        const interval = setInterval(() => {
            setLife(prev => {
                if (animationState === 'sleep') return prev;
                return Math.max(prev - 0.2, 0);
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [animationState]);

    // Check Low Health
    useEffect(() => {
        if (life < 20 && animationState === 'idle') {
            setAnimationState("lowHealth");
            setMessage(PET_TEXTS[lang].lowHealth);
        }
    }, [life, animationState, lang]);

    // Actions
    const play = () => {
        if (animationState === 'sleep') return;
        setAnimationState("play");
        setLife(prev => Math.min(prev + 10, 100));
        setMessage(t.play[Math.floor(Math.random() * t.play.length)]);
        setTimeout(() => {
            setAnimationState('idle');
            setMessage(t.playAfter);
        }, 3000);
    };

    const eat = () => {
        if (animationState === 'sleep') return;
        setAnimationState("eat");
        setLife(prev => Math.min(prev + 20, 100));
        setMessage(t.eat[Math.floor(Math.random() * t.eat.length)]);
        setTimeout(() => {
            setAnimationState('idle');
            setMessage(t.eatAfter);
        }, 3000);
    };

    const sleep = () => {
        setAnimationState("sleep");
        setMessage(t.sleep);

        // Recover health loop
        const recover = setInterval(() => {
            setLife(prev => {
                if (prev >= 100) {
                    clearInterval(recover);
                    setAnimationState("idle");
                    setMessage(t.sleepAfter);
                    return 100;
                }
                return Math.min(prev + 2, 100);
            });
        }, 1000);

        return () => clearInterval(recover);
    };

    // React to App State Changes
    useEffect(() => {
        if (isLoading) {
            setAnimationState('scanning');
            setMessage(PET_TEXTS[lang].scanning);
        } else if (hasError) {
            setAnimationState('error');
            setMessage(PET_TEXTS[lang].error);
        } else if (hasResult) {
            setAnimationState('success');
            setMessage(PET_TEXTS[lang].success);
            setTimeout(() => {
                setAnimationState('idle');
                setMessage(PET_TEXTS[lang].successAfter);
            }, 5000);
        }
    }, [isLoading, hasResult, hasError, lang]);

    // Map App State to Animation Name (GLB)
    const getAnimationName = (state: PetState): string => {
        switch (state) {
            case 'idle': return 'Idle';
            case 'scanning': return 'Thinking';
            case 'success': return 'Happy';
            case 'error': return 'Error';
            case 'walk': return 'Walk';
            case 'sleep': return 'Sad';
            case 'play': return 'Happy';
            case 'eat': return 'Eat';
            case 'lowHealth': return 'LowHealth';
            default: return 'Idle';
        }
    };

    const renderPet = () => {
        // Fallback or loading state if petData is missing
        if (!petData) return <div className="animate-pulse w-32 h-32 bg-slate-200 rounded-full" />;

        if (petData.type === 'glb' || petData.type === 'fbx') {
            return (
                <VirtualPetScene
                    animationName={getAnimationName(animationState)}
                    message={message}
                    modelType={petData.type}
                    url={petData.src} // Pass URL explicitly to Scene -> Panda
                />
            );
        } else {
            // Render 2D Variant (Image)
            return (
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Speech Bubble 2D */}
                    {message && (
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 p-2 px-4 rounded-xl shadow-lg border-2 border-brand-100 dark:border-brand-900 animate-in fade-in zoom-in duration-300 z-20 w-max max-w-[200px] text-center">
                            <p className="text-sm font-bold text-slate-700 dark:text-brand-300">
                                {message}
                            </p>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 rotate-45 border-b-2 border-r-2 border-brand-100 dark:border-brand-900"></div>
                        </div>
                    )}

                    <Avatar3D
                        src={petData.src}
                        className="scale-90"
                        onInteract={play}
                    />
                </div>
            );
        }
    };

    return (
        <div className="relative w-full h-80 mx-auto z-10 flex flex-col items-center">
            <div
                role="button"
                tabIndex={0}
                onClick={() => setShowInteractions((s) => !s)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowInteractions((s) => !s); } }}
                className="w-full flex-1 min-h-0 flex flex-col items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset rounded-xl"
                aria-label={showInteractions ? t.ariaHideActions : t.ariaShowActions}
            >
                {renderPet()}
            </div>

            {/* Life Bar */}
            <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden border border-slate-300 dark:border-slate-600 relative z-10">
                <div
                    className={`h-full transition-all duration-500 ${life < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${life}%` }}
                ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono relative z-10">{t.energy}: {Math.floor(life)}%</p>

            {/* Interaction Controls - aparecem ao clicar no pet, logo abaixo do pet */}
            <div
                className={`flex gap-2 mt-3 transition-all duration-200 relative z-10 flex-wrap justify-center overflow-hidden ${
                    showInteractions ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 mt-0 pointer-events-none'
                }`}
            >
                <button
                    type="button"
                    onClick={eat}
                    className="bg-orange-100 hover:bg-orange-200 active:scale-95 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-700 text-xs px-3 py-2 rounded-xl font-bold transition-all shadow-sm"
                >
                    {t.btnEat}
                </button>
                <button
                    type="button"
                    onClick={play}
                    className="bg-blue-100 hover:bg-blue-200 active:scale-95 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 text-xs px-3 py-2 rounded-xl font-bold transition-all shadow-sm"
                >
                    {t.btnPlay}
                </button>
                <button
                    type="button"
                    onClick={sleep}
                    className="bg-indigo-100 hover:bg-indigo-200 active:scale-95 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 text-xs px-3 py-2 rounded-xl font-bold transition-all shadow-sm"
                >
                    {t.btnSleep}
                </button>
                {onVariantChange && (
                    <button
                        type="button"
                        onClick={onVariantChange}
                        className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-xs px-3 py-2 rounded-xl font-bold transition-all shadow-sm"
                    >
                        {t.btnChange}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CompanionContainer;
