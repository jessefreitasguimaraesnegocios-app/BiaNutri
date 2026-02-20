

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, ChevronLeft, Loader2, Save, ArrowRight, TrendingUp, Calculator, X, MessageSquarePlus, Calendar, Flame, Droplet } from 'lucide-react';
import { TRANSLATIONS, MOCK_HISTORY, COLOR_PALETTES } from './constants';
import { Language, Theme, NutritionalInfo, HistoryItem, WaterEntry, MealAnalysis, UserStats } from './types';
import { analyzeFoodImage, fileToGenerativePart, mealToSingleFood } from './services/geminiService';
import { calculateWaterGoal, getTodayWaterTotal, getTodayWaterEntries } from './services/waterService';
import Header from './components/Header';
import Footer from './components/Footer';
import NutritionChart from './components/NutritionChart';
import HistoryCard from './components/HistoryCard';
import BioimpedanceModal from './components/BioimpedanceModal';
import DailyTracker from './components/DailyTracker';
import CalendarModal from './components/CalendarModal';
import DayDetailModal from './components/DayDetailModal';
import WaterTracker from './components/WaterTracker';

import CompanionContainer from './components/CompanionContainer';
import InstallPrompt from './components/InstallPrompt';
import LoginModal from './components/LoginModal';
import PhoneModal from './components/PhoneModal';
import PaywallScreen from './components/PaywallScreen';
import PlansCarouselSlide from './components/PlansCarouselSlide';
import FastingSlide from './components/FastingSlide';
import { getSession, onAuthStateChange, signOut } from './services/authService';
import {
  getProfile,
  getAccessStatus,
  getSubscriptionActive,
  startTrial,
  getTrialStatus,
  syncSubscriptionFromMP,
} from './services/subscriptionService';
import type { AccessStatus } from './types';
import type { Session } from '@supabase/supabase-js';
import { TRIAL_SECONDS_LIMIT, TRIAL_MINUTES } from './constants/plans';

import { getAvailablePets, PetDefinition } from './utils/petRegistry';

function App() {
  // Logic to load pets (Get fresh list every render to handle dev HMR updates)
  const availablePets = getAvailablePets();

  // State
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Language>('pt');
  const [colorKey, setColorKey] = useState<string>('purple');
  const [view, setView] = useState<'home' | 'results' | 'history' | 'dayDetails' | 'todayFoods'>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [previousView, setPreviousView] = useState<'home' | 'results' | 'history' | 'dayDetails' | 'todayFoods'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMeal, setCurrentMeal] = useState<MealAnalysis | null>(null);
  const [currentData, setCurrentData] = useState<NutritionalInfo | null>(null); // Para compatibilidade com histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Proporções de consumo para cada alimento (0-100%, padrão 100%)
  const [foodPortions, setFoodPortions] = useState<Record<number, number>>({});
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterGoal, setWaterGoal] = useState<number>(2000); // Default 2L
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayViewMode, setDayViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [currentWeightInput, setCurrentWeightInput] = useState<string>('');
  const [isBMRTDEEModalOpen, setIsBMRTDEEModalOpen] = useState(false);
  const [isIMCModalOpen, setIsIMCModalOpen] = useState(false);

  // Pet e cor são carregados por usuário no efeito que depende de session
  const [selectedPetId, setSelectedPetId] = useState<string>(availablePets[0]?.id || 'panda.glb');


  // Description Modal State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showDescModal, setShowDescModal] = useState(false);
  const [userDescription, setUserDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Refs for file input
  const fileInputRef = useRef<HTMLInputElement>(null); // For Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null); // For Camera

  // Trial / Paywall: perfil, status de acesso e contador de trial
  const [profile, setProfile] = useState<{
    phone: string | null;
    trial_started_at: string | null;
    trial_seconds_used: number;
    trial_used_at: string | null;
  } | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [paymentReturn, setPaymentReturn] = useState<'success' | 'failure' | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  /** Só redirecionar para Home uma vez ao obter acesso; não redirecionar de novo ao navegar. */
  const hasScrolledToHomeRef = useRef(false);
  /** Tempo restante do trial em segundos para exibir no cronômetro (atualiza a cada 1s, sincroniza com o servidor a cada 15s). */
  const [trialDisplayRemainingSeconds, setTrialDisplayRemainingSeconds] = useState(0);

  const texts = TRANSLATIONS[lang];

  // Função helper para navegação que sempre atualiza previousView
  const navigateToView = (newView: 'home' | 'results' | 'history' | 'dayDetails' | 'todayFoods') => {
    setPreviousView(view);
    setView(newView);
  };

  // Função para voltar à view anterior (não atualiza previousView)
  const goBack = () => {
    // Se previousView for válida e diferente da view atual, voltar para ela
    // Caso contrário, voltar para 'home' como fallback
    if (previousView && previousView !== view) {
      setView(previousView);
    } else {
      navigateToView('home');
    }
  };

  // Initialize Data
  useEffect(() => {
    // Verificar autenticação
    const checkAuth = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setSession(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listener para mudanças de autenticação
    const subscription = onAuthStateChange((newSession) => {
      setSession(newSession);
    });

    // Verificar se app está instalado e redirecionar se necessário
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSInstalled = isIOS && (window.navigator as any).standalone;
    
    // Se não estiver em modo standalone mas o app está instalado, 
    // o navegador já deve abrir no app. Mas podemos garantir com window.location se necessário.
    // Na prática, o manifest já faz isso automaticamente.

    // Theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carregar e salvar dados por usuário (cada conta mantém seus próprios dados)
  const userId = session?.user?.id ?? null;

  // Verificar acesso (perfil, trial no servidor, assinatura) – sem localStorage
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setAccessStatus(null);
      setHasSubscription(false);
      setIsCheckingAccess(false);
      return;
    }
    const url = new URL(window.location.href);
    const paymentParam = url.searchParams.get('payment');
    if (paymentParam === 'success' || paymentParam === 'failure') {
      setPaymentReturn(paymentParam);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
    const didReturnFromPayment = paymentParam === 'success';
    let cancelled = false;
    (async () => {
      setIsCheckingAccess(true);
      try {
        if (didReturnFromPayment) {
          await syncSubscriptionFromMP(userId);
          if (cancelled) return;
        }
        const p = await getProfile(userId);
        if (cancelled) return;
        setProfile(p);
        if (p && p.phone && !p.trial_started_at && !p.trial_used_at) {
          const start = await startTrial(userId);
          if (cancelled) return;
          if (start.ok) {
            setAccessStatus('allowed');
            if (start.remaining_seconds != null) setTrialDisplayRemainingSeconds(Math.max(0, start.remaining_seconds));
            const pUpdated = await getProfile(userId);
            if (!cancelled && pUpdated) setProfile(pUpdated);
          } else {
            const result = await getAccessStatus(userId, p);
            if (!cancelled) {
              setAccessStatus(result.status);
              setHasSubscription(!!result.hasSubscription);
              if (result.remaining_seconds != null) setTrialDisplayRemainingSeconds(Math.max(0, result.remaining_seconds));
            }
          }
        } else {
          const result = await getAccessStatus(userId, p);
          if (cancelled) return;
          setAccessStatus(result.status);
          setHasSubscription(!!result.hasSubscription);
          if (result.remaining_seconds != null) {
            setTrialDisplayRemainingSeconds(Math.max(0, result.remaining_seconds));
          }
        }
      } catch (e) {
        console.error('Erro ao verificar acesso:', e);
        if (!cancelled) setAccessStatus('allowed');
      } finally {
        if (!cancelled) setIsCheckingAccess(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const showTrialCountdown = accessStatus === 'allowed' && !!profile?.phone && !hasSubscription;

  // Sincronizar tempo com servidor a cada 60s (trial é time-based). Não colocar paywall se usuário tem assinatura ativa.
  useEffect(() => {
    if (!userId || !showTrialCountdown) return;
    const sync = async () => {
      const hasSubscription = await getSubscriptionActive(userId);
      if (hasSubscription) return;
      const trial = await getTrialStatus(userId);
      if (trial.remaining_seconds != null) setTrialDisplayRemainingSeconds(Math.max(0, trial.remaining_seconds));
      if (!trial.is_trial_active) setAccessStatus('paywall');
    };
    const id = setInterval(sync, 60000);
    return () => clearInterval(id);
  }, [userId, showTrialCountdown]);

  // Cronômetro local a cada 1s; ao chegar a 0, travar na paywall só se não tiver assinatura ativa
  useEffect(() => {
    if (!userId || !showTrialCountdown) return;
    const id = setInterval(() => {
      setTrialDisplayRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          getSubscriptionActive(userId).then((active) => {
            if (!active) setAccessStatus('paywall');
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [userId, showTrialCountdown]);

  // Ao obter acesso (login), redirecionar para Home uma vez; não redirecionar de novo ao navegar
  useEffect(() => {
    if (!userId) {
      hasScrolledToHomeRef.current = false;
      return;
    }
    if (accessStatus !== 'allowed' || hasScrolledToHomeRef.current) return;
    const scrollToHome = () => {
      const el = carouselRef.current;
      if (!el) return false;
      const slideWidth = el.offsetWidth || el.clientWidth;
      if (slideWidth > 0) {
        el.scrollLeft = slideWidth;
        hasScrolledToHomeRef.current = true;
        return true;
      }
      return false;
    };
    const t1 = setTimeout(() => requestAnimationFrame(() => scrollToHome()), 100);
    const t2 = setTimeout(() => requestAnimationFrame(() => scrollToHome()), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [userId, accessStatus]);

  // Carregar apenas dados do usuário atual (chave com userId). Sem fallback em chave legada para não misturar dados entre usuários.
  useEffect(() => {
    if (!userId) return;

    const k = (base: string) => `biaNutri${base}_${userId}`;

    const savedHistory = localStorage.getItem(k('History'));
    setHistory(savedHistory ? JSON.parse(savedHistory) : MOCK_HISTORY);

    const savedTarget = localStorage.getItem(k('DailyTarget'));
    setDailyTarget(savedTarget ? parseInt(savedTarget, 10) : null);

    const savedWaterEntries = localStorage.getItem(k('WaterEntries'));
    setWaterEntries(savedWaterEntries ? JSON.parse(savedWaterEntries) : []);

    const savedWaterGoal = localStorage.getItem(k('WaterGoal'));
    setWaterGoal(savedWaterGoal ? parseInt(savedWaterGoal, 10) : 2000);

    const savedColor = localStorage.getItem(k('Color'));
    if (savedColor && COLOR_PALETTES[savedColor]) setColorKey(savedColor);

    const savedPet = localStorage.getItem(k('Pet'));
    if (savedPet && availablePets.some(p => p.id === savedPet)) setSelectedPetId(savedPet);
  }, [userId]);

  // Update DOM for Light/Dark Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      // Atualizar theme-color meta tag para tema escuro
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#0f172a'); // slate-950
      }
    } else {
      document.documentElement.classList.remove('dark');
      // Atualizar theme-color meta tag para tema claro
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#f8fafc'); // slate-50
      }
    }
  }, [theme]);

  // Update DOM for Brand Color
  useEffect(() => {
    const palette = COLOR_PALETTES[colorKey];
    if (palette) {
      const root = document.documentElement;
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--brand-${shade}`, value);
      });
      if (userId) localStorage.setItem(`biaNutriColor_${userId}`, colorKey);
    }
  }, [colorKey, userId]);

  // Save Pet selection (por usuário)
  useEffect(() => {
    if (userId) localStorage.setItem(`biaNutriPet_${userId}`, selectedPetId);
  }, [userId, selectedPetId]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handlers
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(prev => prev === 'en' ? 'pt' : 'en');

  const togglePet = () => {
    const pets = availablePets;

    if (!pets || pets.length === 0) {
      console.warn("No pets found in registry. Pleace check src/assets/avatars.");
      return;
    }

    const currentIndex = pets.findIndex(p => p.id === selectedPetId);

    // If current not found, start from 0, otherwise next
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % pets.length;
    }

    console.log("Switching to pet:", pets[nextIndex].name);
    setSelectedPetId(pets[nextIndex].id);
  };

  const handleColorChange = (key: string) => {
    if (COLOR_PALETTES[key]) {
      setColorKey(key);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setPendingFile(file);
    setUserDescription('');
    setShowDescModal(true);

    // Reset input value so same file can be selected again if cancelled
    e.target.value = '';
  };

  const handleAnalyzeConfirm = async () => {
    if (!pendingFile) return;

    setShowDescModal(false);
    setIsLoading(true);
    setError(null);
    navigateToView('results');

    try {
      console.log('Iniciando análise de imagem...');
      const base64Data = await fileToGenerativePart(pendingFile);
      console.log('Imagem convertida para base64, tamanho:', base64Data.length);
      
      // Get MIME type from file, default to image/jpeg if not available
      const mimeType = pendingFile.type || 'image/jpeg';
      console.log('Chamando analyzeFoodImage com mimeType:', mimeType);
      
      const mealAnalysis = await analyzeFoodImage(base64Data, lang, userDescription, mimeType);
      console.log('Análise concluída:', mealAnalysis);
      
      setCurrentMeal(mealAnalysis);
      // Também manter currentData para compatibilidade com histórico existente
      setCurrentData(mealToSingleFood(mealAnalysis));
      
      // Inicializar todas as porções em 100% (padrão)
      const initialPortions: Record<number, number> = {};
      mealAnalysis.foods.forEach((_, index) => {
        initialPortions[index] = 100;
      });
      setFoodPortions(initialPortions);
    } catch (err: any) {
      console.error('Erro ao analisar imagem:', err);
      console.error('Detalhes do erro:', {
        message: err.message,
        code: err.code,
        isQuotaError: err.isQuotaError,
        stack: err.stack
      });
      
      // Verificar se é erro de quota excedida
      if (err.code === 429 || err.isQuotaError || err.message?.includes('quota') || err.message?.includes('Quota') || err.message?.includes('429')) {
        // Usar mensagem do erro se tiver retryAfter, senão usar mensagem padrão
        let quotaMessage = err.message || texts.errorQuota || 'Cota da API excedida. Aguarde alguns minutos e tente novamente.';
        
        // Se tiver retryAfter, adicionar informação de tempo
        if (err.retryAfter) {
          const minutes = Math.ceil(err.retryAfter / 60);
          if (lang === 'pt') {
            quotaMessage = `Cota da API excedida. Aguarde aproximadamente ${minutes} minuto${minutes > 1 ? 's' : ''} antes de tentar novamente.`;
          } else {
            quotaMessage = `API quota exceeded. Please wait approximately ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
          }
        }
        
        setError(quotaMessage);
      } else if (err.message?.includes('Supabase') || err.message?.includes('VITE_SUPABASE')) {
        setError('Configuração do Supabase não encontrada. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env');
      } else {
        // Usar a mensagem de erro específica se disponível, senão usar genérica
        setError(err.message || texts.errorGeneric);
      }
      
      setCurrentMeal(null);
      setCurrentData(null);
    } finally {
      setIsLoading(false);
      setPendingFile(null);
      setPreviewUrl(null);
    }
  };

  const cancelSelection = () => {
    setShowDescModal(false);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const handleSaveToHistory = () => {
    if (!currentMeal || !currentData) return;

    // Salvar cada alimento individualmente no histórico
    const timestamp = Date.now();
    // Calcular totais ajustados pelas porções antes de salvar
    const adjustedTotals = currentMeal.foods.reduce(
      (acc, food, idx) => {
        const portion = foodPortions[idx] ?? 100;
        const multiplier = portion / 100;
        return {
          calories: acc.calories + (food.calories * multiplier),
          protein: acc.protein + (food.protein * multiplier),
          carbs: acc.carbs + (food.carbs * multiplier),
          fat: acc.fat + (food.fat * multiplier),
          fiber: acc.fiber + (food.fiber * multiplier),
          sugar: acc.sugar + (food.sugar * multiplier),
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    const newItems: HistoryItem[] = currentMeal.foods.map((food, index) => {
      // Aplicar proporção ao salvar
      const portion = foodPortions[index] ?? 100;
      const multiplier = portion / 100;
      
      return {
        ...food,
        id: `${timestamp}-${index}`,
        timestamp: timestamp,
        calories: food.calories * multiplier,
        protein: food.protein * multiplier,
        carbs: food.carbs * multiplier,
        fat: food.fat * multiplier,
        fiber: food.fiber * multiplier,
        sugar: food.sugar * multiplier,
      };
    });

    const updatedHistory = [...newItems, ...history];
    setHistory(updatedHistory);
    if (userId) localStorage.setItem(`biaNutriHistory_${userId}`, JSON.stringify(updatedHistory));
    navigateToView('home'); // Redirect to home to see updated tracker
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    if (userId) localStorage.setItem(`biaNutriHistory_${userId}`, JSON.stringify(updatedHistory));
  };

  const updateDailyTarget = (target: number) => {
    setDailyTarget(target);
    if (userId) localStorage.setItem(`biaNutriDailyTarget_${userId}`, target.toString());
  };

  const handleAddWater = (amount: number) => {
    const newEntry: WaterEntry = {
      id: Date.now().toString(),
      amount,
      timestamp: Date.now()
    };
    const updatedEntries = [...waterEntries, newEntry];
    setWaterEntries(updatedEntries);
    if (userId) localStorage.setItem(`biaNutriWaterEntries_${userId}`, JSON.stringify(updatedEntries));
  };

  // Calcular meta de água a partir dos dados do usuário (por usuário)
  useEffect(() => {
    if (!userId) return;
    const savedStats = localStorage.getItem(`biaNutriUserStats_${userId}`);
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        const goal = calculateWaterGoal(stats.weight || 70, stats.activityLevel || 'moderate');
        setWaterGoal(goal);
        localStorage.setItem(`biaNutriWaterGoal_${userId}`, goal.toString());
      } catch (e) {
        console.error('Error calculating water goal:', e);
      }
    }
  }, [userId, isCalculatorOpen]);

  const triggerCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const triggerGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };



  // Calculations
  const totalHistoryCalories = history.reduce((sum, item) => sum + item.calories, 0);

  // Calculate Today's Calories
  const today = new Date().toDateString();
  const todayCalories = history
    .filter(item => new Date(item.timestamp).toDateString() === today)
    .reduce((sum, item) => sum + item.calories, 0);

  // Render Content
  const renderHome = () => {
    const todayWater = getTodayWaterTotal(waterEntries);
    const todayFoods = history.filter(item => new Date(item.timestamp).toDateString() === today);
    
    // Calculate today's totals
    const todayTotals = todayFoods.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
        sugar: acc.sugar + item.sugar,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );
    
    return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="text-center py-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{texts.title}</h2>
        <p className="text-slate-500 dark:text-slate-400">{texts.subtitle}</p>
      </div>

      {/* Interactive Avatar */}
      <CompanionContainer
        isLoading={isLoading}
        hasResult={!!currentMeal || !!currentData}
        hasError={!!error}
        selectedPet={selectedPetId}
        petData={availablePets.find(p => p.id === selectedPetId)}
        onVariantChange={togglePet}
      />

      {/* Trackers in Home if goal exists */}
      {dailyTarget && (
        <>
          <DailyTracker
            current={todayCalories}
            target={dailyTarget}
            texts={texts}
            onClick={() => navigateToView('todayFoods')}
          />
          
          <WaterTracker
            current={todayWater}
            goal={waterGoal}
            texts={texts}
            lang={lang}
            onAddWater={handleAddWater}
          />
        </>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-4">
          {/* Gallery Input */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageSelect}
          />

          {/* Camera Input (Direct) */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={cameraInputRef}
            onChange={handleImageSelect}
          />

          <button
            onClick={triggerCamera}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-brand-500/30"
          >
            <Camera size={24} />
            <span>{texts.scanButton}</span>
          </button>

          <button
            onClick={triggerGallery}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
          >
            <Upload size={24} />
            <span>{texts.uploadButton}</span>
          </button>

          <button
            onClick={() => navigateToView('history')}
            className="ml-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-1 px-3 rounded-xl transition-colors"
          >
            {lang === 'pt' ? 'Meus dados' : 'My data'}
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-brand-500 mb-4" size={48} />
          <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">{texts.analyzing}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl mb-6">
            <p className="font-semibold">{error}</p>
          </div>
          <button
            onClick={() => navigateToView('home')}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-lg font-bold"
          >
            {texts.tryAgain}
          </button>
        </div>
      );
    }

    if (!currentData) return null;

    // Se não houver currentMeal, é um item do histórico antigo - mostrar formato simples
    if (!currentMeal) {
      // Check if current data is already in history
      const isSaved = (currentData as any).id && history.some(h => h.id === (currentData as any).id);

      // Dynamic Language Selection for Results View
      const displayName = lang === 'pt'
        ? (currentData.foodNamePt || currentData.foodName)
        : (currentData.foodNameEn || currentData.foodName);

      const displayDescription = lang === 'pt'
        ? (currentData.descriptionPt || currentData.description)
        : (currentData.descriptionEn || currentData.description);

      return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={goBack}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{isSaved ? texts.history : texts.analyzing.replace('...', '')}</h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{displayName}</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {displayDescription}
            </p>

            <NutritionChart data={currentData} lang={lang} />

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">{texts.protein}</span>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{currentData.protein}g</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">{texts.carbs}</span>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{currentData.carbs}g</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">{texts.fat}</span>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{currentData.fat}g</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{texts.fiber}</span>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{currentData.fiber}g</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{texts.sugar}</span>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{currentData.sugar}g</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if current data is already in history
    const isSaved = (currentData as any).id && history.some(h => h.id === (currentData as any).id);

    // Dynamic Language Selection for Results View
    const mealDescription = lang === 'pt'
      ? (currentMeal.mealDescriptionPt || currentMeal.mealDescription || `${currentMeal.foods.length} ${currentMeal.foods.length === 1 ? 'item identificado' : 'itens identificados'}`)
      : (currentMeal.mealDescriptionEn || currentMeal.mealDescription || `${currentMeal.foods.length} ${currentMeal.foods.length === 1 ? 'item identified' : 'items identified'}`);

    return (
      <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{isSaved ? texts.history : texts.analyzing.replace('...', '')}</h2>
        </div>

        {/* Resumo da Refeição */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lang === 'pt' ? 'Refeição Completa' : 'Complete Meal'}
            </h1>
            <span className="text-sm bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-black px-3 py-1 rounded-full font-semibold">
              {currentMeal.foods.length} {currentMeal.foods.length === 1 ? (lang === 'pt' ? 'item' : 'item') : (lang === 'pt' ? 'itens' : 'items')}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            {mealDescription}
          </p>

          {/* Gráfico com totais (ajustados pelas porções) */}
          {(() => {
            // Criar dados ajustados para o gráfico
            const adjustedTotals = currentMeal.foods.reduce(
              (acc, food, idx) => {
                const portion = foodPortions[idx] ?? 100;
                const multiplier = portion / 100;
                return {
                  calories: acc.calories + (food.calories * multiplier),
                  protein: acc.protein + (food.protein * multiplier),
                  carbs: acc.carbs + (food.carbs * multiplier),
                  fat: acc.fat + (food.fat * multiplier),
                  fiber: acc.fiber + (food.fiber * multiplier),
                  sugar: acc.sugar + (food.sugar * multiplier),
                };
              },
              { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
            );
            
            const adjustedData: NutritionalInfo = {
              foodName: currentData?.foodName || '',
              foodNameEn: currentData?.foodNameEn || '',
              foodNamePt: currentData?.foodNamePt || '',
              calories: adjustedTotals.calories,
              protein: adjustedTotals.protein,
              carbs: adjustedTotals.carbs,
              fat: adjustedTotals.fat,
              fiber: adjustedTotals.fiber,
              sugar: adjustedTotals.sugar,
              description: currentData?.description || '',
              descriptionEn: currentData?.descriptionEn || '',
              descriptionPt: currentData?.descriptionPt || '',
            };
            
            return <NutritionChart data={adjustedData} lang={lang} />;
          })()}

          {/* Totais da Refeição (ajustados pelas porções) */}
          <div className="mt-6 p-4 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/30 rounded-xl mb-6">
            <h3 className="text-sm font-bold mb-3 uppercase" style={{ color: 'rgba(0, 0, 0, 1)' }}>{lang === 'pt' ? 'Totais da Refeição' : 'Meal Totals'}</h3>
            {(() => {
              // Calcular totais ajustados pelas porções
              const adjustedTotals = currentMeal.foods.reduce(
                (acc, food, idx) => {
                  const portion = foodPortions[idx] ?? 100;
                  const multiplier = portion / 100;
                  return {
                    calories: acc.calories + (food.calories * multiplier),
                    protein: acc.protein + (food.protein * multiplier),
                    carbs: acc.carbs + (food.carbs * multiplier),
                    fat: acc.fat + (food.fat * multiplier),
                    fiber: acc.fiber + (food.fiber * multiplier),
                    sugar: acc.sugar + (food.sugar * multiplier),
                  };
                },
                { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
              );
              
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'rgba(36, 25, 25, 1)' }}>{texts.protein}</span>
                      <p className="text-xl font-bold" style={{ color: 'rgba(0, 0, 0, 1)' }}>{adjustedTotals.protein.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'rgba(36, 25, 25, 1)' }}>{texts.carbs}</span>
                      <p className="text-xl font-bold" style={{ color: 'rgba(0, 0, 0, 1)' }}>{adjustedTotals.carbs.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'rgba(36, 25, 25, 1)' }}>{texts.fat}</span>
                      <p className="text-xl font-bold" style={{ color: 'rgba(0, 0, 0, 1)' }}>{adjustedTotals.fat.toFixed(1)}g</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'rgba(36, 25, 25, 1)' }}>{texts.fiber}</span>
                      <p className="text-lg font-bold" style={{ color: 'rgba(10, 0, 0, 1)' }}>{adjustedTotals.fiber.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'rgba(36, 25, 25, 1)' }}>{texts.sugar}</span>
                      <p className="text-lg font-bold" style={{ color: 'rgba(0, 0, 0, 1)' }}>{adjustedTotals.sugar.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'rgba(36, 25, 25, 1)' }}>{texts.calories}</span>
                      <p className="text-lg font-bold" style={{ color: 'rgba(0, 0, 0, 1)' }}>{adjustedTotals.calories.toFixed(0)}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Lista de Alimentos Identificados */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {lang === 'pt' ? 'Alimentos Identificados' : 'Identified Foods'}
          </h3>
          <div className="flex flex-col gap-4">
            {currentMeal.foods.map((food, index) => {
              const foodName = lang === 'pt'
                ? (food.foodNamePt || food.foodName)
                : (food.foodNameEn || food.foodName);
              const foodDescription = lang === 'pt'
                ? (food.descriptionPt || food.description)
                : (food.descriptionEn || food.description);

              // Obter porcentagem consumida (padrão 100%)
              const portion = foodPortions[index] ?? 100;
              const portionMultiplier = portion / 100;

              // Calcular valores proporcionais
              const adjustedCalories = food.calories * portionMultiplier;
              const adjustedProtein = food.protein * portionMultiplier;
              const adjustedCarbs = food.carbs * portionMultiplier;
              const adjustedFat = food.fat * portionMultiplier;
              const adjustedFiber = food.fiber * portionMultiplier;
              const adjustedSugar = food.sugar * portionMultiplier;

              const handlePortionChange = (newPortion: number) => {
                setFoodPortions(prev => ({
                  ...prev,
                  [index]: newPortion
                }));
              };

              return (
                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Barra de Controle de Porção */}
                  <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {lang === 'pt' ? 'Porção Consumida' : 'Portion Consumed'}
                      </span>
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                        {portion}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={portion}
                        onChange={(e) => handlePortionChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                        style={{
                          background: `linear-gradient(to right, var(--brand-500) 0%, var(--brand-500) ${portion}%, rgb(226 232 240) ${portion}%, rgb(226 232 240) 100%)`
                        }}
                      />
                      <div className="flex gap-1">
                        {[0, 25, 50, 75, 100].map((value) => (
                          <button
                            key={value}
                            onClick={() => handlePortionChange(value)}
                            className={`w-8 h-8 text-xs font-bold rounded transition-all ${
                              portion === value
                                ? 'bg-brand-500 text-white shadow-md scale-110'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {value}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{foodName}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{foodDescription}</p>
                    </div>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 ml-2">
                      {adjustedCalories.toFixed(0)} {lang === 'pt' ? 'kcal' : 'kcal'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{texts.protein}</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{adjustedProtein.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{texts.carbs}</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{adjustedCarbs.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{texts.fat}</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{adjustedFat.toFixed(1)}g</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isSaved && (
          <button
            onClick={handleSaveToHistory}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
          >
            <Save size={20} />
            <span>{texts.save}</span>
          </button>
        )}
      </div>
    );
  };

  const renderTodayFoods = () => {
    const todayWater = getTodayWaterTotal(waterEntries);
    const todayFoods = history.filter(item => new Date(item.timestamp).toDateString() === today);
    
    // Calculate today's totals
    const totals = todayFoods.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
        sugar: acc.sugar + item.sugar,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    const todayDate = new Date().toLocaleDateString(
      lang === 'pt' ? 'pt-BR' : 'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );

    return (
      <div className="flex flex-col gap-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar size={20} className="text-brand-500" />
              {lang === 'pt' ? 'Alimentos de Hoje' : 'Today\'s Foods'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{todayDate}</p>
          </div>
        </div>

        {/* Daily Tracker */}
        {dailyTarget && (
          <DailyTracker
            current={totals.calories}
            target={dailyTarget}
            texts={texts}
            onClick={() => {}}
          />
        )}

        {/* Totals Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            <h4 className="font-bold text-slate-800 dark:text-white">{texts.dailyTotals}</h4>
          </div>

          {/* Calories */}
          <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/30 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-brand-600 dark:text-brand-400" />
                <span className="font-semibold text-brand-700 dark:text-brand-300" style={{ color: 'rgba(41, 73, 112, 1)' }}>{texts.calories}</span>
              </div>
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {totals.calories.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.protein}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.protein.toFixed(1)}g
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.carbs}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.carbs.toFixed(1)}g
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.fat}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.fat.toFixed(1)}g
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.sugar}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.sugar.toFixed(1)}g
              </p>
            </div>
          </div>

          {/* Fiber */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
              {texts.fiber}
            </span>
            <p className="text-xl font-bold text-slate-800 dark:text-white">
              {totals.fiber.toFixed(1)}g
            </p>
          </div>

          {/* Water */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{texts.water}</span>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(todayWater / 100) / 10}L
              </span>
            </div>
          </div>
        </div>

        {/* Food Items List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-slate-800 dark:text-white mb-3">
            {texts.foodItems} ({todayFoods.length})
          </h4>
          {todayFoods.length > 0 ? (
            <div className="flex flex-col gap-3">
              {todayFoods.map(item => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  lang={lang}
                  onClick={() => {
                    setCurrentData(item);
                    setCurrentMeal(null);
                    setPreviousView('todayFoods');
                    navigateToView('results');
                  }}
                  onDelete={handleDeleteHistoryItem}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-600">
              <p>{lang === 'pt' ? 'Nenhum alimento registrado hoje' : 'No foods recorded today'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to get BMI color class
  const getBmiColor = (val: number) => {
    if (val < 18.5) return 'text-blue-500';
    if (val < 25) return 'text-green-500';
    if (val < 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleSaveCurrentWeight = () => {
    if (!currentWeightInput || isNaN(parseFloat(currentWeightInput)) || !userId) return;
    
    const weight = parseFloat(currentWeightInput);
    const savedStats = localStorage.getItem(`biaNutriUserStats_${userId}`);
    if (savedStats) {
      try {
        const stats: UserStats = JSON.parse(savedStats);
        // Primeira vez que salva peso: o valor digitado vira Peso Inicial (e Peso Atual)
        if (!stats.initialWeight) {
          stats.initialWeight = weight;
          stats.initialWeightDate = Date.now();
        }
        stats.currentWeight = weight;
        stats.currentWeightDate = Date.now();
        stats.weight = weight;
        localStorage.setItem(`biaNutriUserStats_${userId}`, JSON.stringify(stats));
      } catch (e) {
        console.error('Error saving current weight:', e);
        return;
      }
    } else {
      // Usuário ainda não preencheu a calculadora: criar stats mínimos com peso para Peso Inicial
      const defaultStats: UserStats = {
        gender: 'female',
        age: 30,
        height: 170,
        weight,
        activityLevel: 'moderate',
        goal: 'maintain',
        initialWeight: weight,
        initialWeightDate: Date.now(),
        currentWeight: weight,
        currentWeightDate: Date.now(),
      };
      localStorage.setItem(`biaNutriUserStats_${userId}`, JSON.stringify(defaultStats));
    }
    setCurrentWeightInput('');
    navigateToView('home');
    setTimeout(() => navigateToView('history'), 100);
  };

  const renderHistory = () => {
    const savedStats = userId ? localStorage.getItem(`biaNutriUserStats_${userId}`) : null;
    let userStats: UserStats | null = null;
    let bmi = 0;
    let minIdeal = 0;
    let maxIdeal = 0;
    let bmr = 0;
    let tdee = 0;
    let target = 0;

    if (savedStats) {
      try {
        userStats = JSON.parse(savedStats);
        
        // Use currentWeight if available, otherwise use weight
        const weightForCalc = userStats.currentWeight || userStats.weight;
        
        // Calculate BMI
        bmi = weightForCalc / Math.pow(userStats.height / 100, 2);
        
        // Ideal Weight Range (BMI 18.5 - 24.9)
        minIdeal = 18.5 * Math.pow(userStats.height / 100, 2);
        maxIdeal = 24.9 * Math.pow(userStats.height / 100, 2);
        const avgIdeal = (minIdeal + maxIdeal) / 2; // Peso ideal médio
        
        // BMR (Mifflin-St Jeor) - use currentWeight if available
        bmr = (10 * weightForCalc) + (6.25 * userStats.height) - (5 * userStats.age);
        bmr += userStats.gender === 'male' ? 5 : -161;
        
        // TDEE Multipliers
        const activityMultipliers = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          active: 1.725,
          very_active: 1.9
        };
        
        tdee = bmr * activityMultipliers[userStats.activityLevel];
        
        const weightDiff = weightForCalc - avgIdeal;
        const goal = userStats.goal;
        let caloricAdjustment = 0;

        if (goal === 'maintain') {
          if (weightDiff > 2) caloricAdjustment = -150;
          else if (weightDiff < -2) caloricAdjustment = 150;
        } else if (goal === 'lose') {
          if (weightDiff > 10) caloricAdjustment = -750;
          else if (weightDiff > 5) caloricAdjustment = -600;
          else if (weightDiff > 0) caloricAdjustment = -500;
          else caloricAdjustment = -300;
          const maxSafeDeficit = Math.min(1000, (tdee - bmr) * 0.8);
          caloricAdjustment = Math.max(caloricAdjustment, -maxSafeDeficit);
        } else {
          if (weightDiff < -10) caloricAdjustment = 500;
          else if (weightDiff < -5) caloricAdjustment = 400;
          else if (weightDiff < 0) caloricAdjustment = 300;
          else caloricAdjustment = 200;
        }

        target = Math.max(tdee + caloricAdjustment, bmr);
      } catch (e) {
        console.error('Error parsing user stats:', e);
      }
    }

    const getBmiColor = (val: number) => {
      if (val < 18.5) return 'text-blue-500';
      if (val < 25) return 'text-green-500';
      if (val < 30) return 'text-yellow-500';
      return 'text-red-500';
    };

    return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={goBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{lang === 'pt' ? 'Meus Dados' : 'My Data'}</h2>
      </div>

      {/* Display User Stats if available */}
      {userStats && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* BMI Card */}
            <div 
              onClick={() => setIsIMCModalOpen(true)}
              className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{texts.yourBmi}</span>
              <span className={`text-4xl font-extrabold ${getBmiColor(bmi)}`}>{bmi.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{lang === 'pt' ? 'Clique para ver tabela' : 'Click for table'}</span>
            </div>

            {/* Ideal Weight Card */}
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{texts.idealWeight}</span>
              <span className="text-xl font-bold text-slate-800 dark:text-white">
                {Math.round(minIdeal)} - {Math.round(maxIdeal)} <span className="text-sm text-slate-400">kg</span>
              </span>
            </div>
          </div>

          {/* Main Calorie Result */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white text-center shadow-lg shadow-brand-500/20 mb-6">
            <h3 className="text-brand-100 font-bold uppercase tracking-wider text-sm mb-2">{texts.dietPlan}</h3>
            <div className="flex items-end justify-center gap-2 mb-1">
              <span className="text-6xl font-extrabold">{Math.round(target)}</span>
              <span className="text-2xl font-bold opacity-80 mb-2">kcal</span>
            </div>
            <p className="text-white/80 text-sm">
              {texts.dailyNeeds}
            </p>
          </div>

          {/* BMR and TDEE */}
          <div 
            onClick={() => setIsBMRTDEEModalOpen(true)}
            className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-900/50 mb-6 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">BMR (Basal)</span>
              <span className="font-bold text-yellow-900 dark:text-yellow-400">{Math.round(bmr)} kcal</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">TDEE (Total)</span>
              <span className="font-bold text-yellow-900 dark:text-yellow-400">{Math.round(tdee)} kcal</span>
            </div>
            <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
              <span>{lang === 'pt' ? 'Clique para saber mais' : 'Click to learn more'}</span>
            </div>
          </div>

          {/* Weight Tracking */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase">{lang === 'pt' ? 'Acompanhamento de Peso' : 'Weight Tracking'}</h4>
            
            {/* Initial Weight */}
            {userStats.initialWeight && userStats.initialWeightDate && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-900/50">
                <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-1">
                  {lang === 'pt' ? 'Peso Inicial' : 'Initial Weight'}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-2xl font-bold text-blue-900 dark:text-blue-300">{userStats.initialWeight.toFixed(1)} kg</span>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {new Date(userStats.initialWeightDate).toLocaleDateString(
                      lang === 'pt' ? 'pt-BR' : 'en-US',
                      { day: '2-digit', month: '2-digit', year: 'numeric' }
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Current Weight */}
            {userStats.currentWeight && userStats.currentWeightDate && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-900/50">
                <div className="text-xs font-bold uppercase text-green-600 dark:text-green-400 mb-1">
                  {lang === 'pt' ? 'Peso Atual' : 'Current Weight'}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-2xl font-bold text-green-900 dark:text-green-300">{userStats.currentWeight.toFixed(1)} kg</span>
                    {userStats.initialWeight && (
                      <span className={`text-sm ml-2 ${userStats.currentWeight < userStats.initialWeight ? 'text-green-600 dark:text-green-400' : userStats.currentWeight > userStats.initialWeight ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        ({userStats.currentWeight < userStats.initialWeight ? '-' : '+'}{Math.abs(userStats.currentWeight - userStats.initialWeight).toFixed(1)} kg)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {new Date(userStats.currentWeightDate).toLocaleDateString(
                      lang === 'pt' ? 'pt-BR' : 'en-US',
                      { day: '2-digit', month: '2-digit', year: 'numeric' }
                    )}
                  </div>
                </div>
                {userStats.initialWeightDate && userStats.currentWeightDate && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'pt' 
                      ? `${Math.ceil((userStats.currentWeightDate - userStats.initialWeightDate) / (1000 * 60 * 60 * 24))} dias de acompanhamento`
                      : `${Math.ceil((userStats.currentWeightDate - userStats.initialWeightDate) / (1000 * 60 * 60 * 24))} days tracking`
                    }
                  </div>
                )}
              </div>
            )}

            {/* Current Weight Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                {lang === 'pt' ? 'Registrar Peso Atual' : 'Record Current Weight'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={currentWeightInput}
                  onChange={(e) => setCurrentWeightInput(e.target.value)}
                  placeholder={lang === 'pt' ? 'Ex: 70.5' : 'Ex: 70.5'}
                  className="flex-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <button
                  onClick={handleSaveCurrentWeight}
                  disabled={!currentWeightInput || isNaN(parseFloat(currentWeightInput))}
                  className="px-6 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  {lang === 'pt' ? 'Salvar' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {lang === 'pt' 
                  ? 'Use o peso na data de hoje para acompanhar sua evolução'
                  : 'Use today\'s weight to track your progress'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Button to open calculator */}
      <button
        onClick={() => setIsCalculatorOpen(true)}
        className="w-full bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
      >
        <Calculator size={20} />
        {texts.recalculate}
      </button>
      </div>
    );
  };

  const renderDayDetails = () => {
    if (!selectedDate) return null;

    // Helper functions to get date ranges
    const getWeekStart = (d: Date): Date => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day;
      return new Date(date.setDate(diff));
    };

    const getWeekEnd = (d: Date): Date => {
      const weekStart = getWeekStart(new Date(d));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return weekEnd;
    };

    const getMonthStart = (d: Date): Date => {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const getMonthEnd = (d: Date): Date => {
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    // Filter history based on view mode
    let filteredHistory: HistoryItem[] = [];
    let dateRange: string = '';

    if (dayViewMode === 'day') {
      const dateString = selectedDate.toDateString();
      filteredHistory = history.filter(
        item => new Date(item.timestamp).toDateString() === dateString
      );
      dateRange = selectedDate.toLocaleDateString(
        lang === 'pt' ? 'pt-BR' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      );
    } else if (dayViewMode === 'week') {
      const weekStart = getWeekStart(new Date(selectedDate));
      const weekEnd = getWeekEnd(new Date(selectedDate));
      filteredHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });
      dateRange = `${weekStart.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (dayViewMode === 'month') {
      const monthStart = getMonthStart(new Date(selectedDate));
      const monthEnd = getMonthEnd(new Date(selectedDate));
      filteredHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate >= monthStart && itemDate <= monthEnd;
      });
      dateRange = selectedDate.toLocaleDateString(
        lang === 'pt' ? 'pt-BR' : 'en-US',
        { month: 'long', year: 'numeric' }
      );
    }

    // Calculate totals
    const totals = filteredHistory.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
        sugar: acc.sugar + item.sugar,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    // Calculate water for the period
    let filteredWaterEntries: WaterEntry[] = [];
    if (dayViewMode === 'day') {
      const dateString = selectedDate.toDateString();
      filteredWaterEntries = waterEntries.filter(
        entry => new Date(entry.timestamp).toDateString() === dateString
      );
    } else if (dayViewMode === 'week') {
      const weekStart = getWeekStart(new Date(selectedDate));
      const weekEnd = getWeekEnd(new Date(selectedDate));
      filteredWaterEntries = waterEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
    } else if (dayViewMode === 'month') {
      const monthStart = getMonthStart(new Date(selectedDate));
      const monthEnd = getMonthEnd(new Date(selectedDate));
      filteredWaterEntries = waterEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate >= monthStart && entryDate <= monthEnd;
      });
    }
    const totalWater = filteredWaterEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return (
      <div className="flex flex-col gap-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => {
              setIsCalendarOpen(true);
              setIsDayDetailOpen(false);
            }}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar size={20} className="text-brand-500" />
              {texts.dayDetails}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{dateRange}</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setDayViewMode('day')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                dayViewMode === 'day'
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {texts.day}
            </button>
            <button
              onClick={() => setDayViewMode('week')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                dayViewMode === 'week'
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {texts.week}
            </button>
            <button
              onClick={() => setDayViewMode('month')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                dayViewMode === 'month'
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {texts.month}
            </button>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            <h4 className="font-bold text-slate-800 dark:text-white">{texts.dailyTotals}</h4>
          </div>

          {/* Calories */}
          <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/30 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-brand-600 dark:text-brand-400" />
                <span className="font-semibold text-brand-700 dark:text-brand-300" style={{ color: 'rgba(41, 73, 112, 1)' }}>{texts.calories}</span>
              </div>
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {totals.calories.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.protein}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.protein.toFixed(1)}g
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.carbs}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.carbs.toFixed(1)}g
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.fat}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.fat.toFixed(1)}g
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                {texts.sugar}
              </span>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {totals.sugar.toFixed(1)}g
              </p>
            </div>
          </div>

          {/* Fiber */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
              {texts.fiber}
            </span>
            <p className="text-xl font-bold text-slate-800 dark:text-white">
              {totals.fiber.toFixed(1)}g
            </p>
          </div>

          {/* Water */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{texts.water}</span>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(totalWater / 100) / 10}L
              </span>
            </div>
          </div>
        </div>

        {/* History Items */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-slate-800 dark:text-white mb-3">
            {texts.foodItems} ({filteredHistory.length})
          </h4>
          {filteredHistory.length > 0 ? (
      <div className="flex flex-col gap-3">
              {filteredHistory.map(item => (
          <HistoryCard
            key={item.id}
            item={item}
            lang={lang}
            onClick={() => {
              setCurrentData(item);
              setCurrentMeal(null); // Limpar currentMeal para itens do histórico
              navigateToView('results');
            }}
          />
        ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-600">
              <p>{texts.noDataForDay}</p>
          </div>
        )}
      </div>
    </div>
  );
  };

  // Se estiver verificando autenticação, mostrar loading
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            {lang === 'pt' ? 'Carregando...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar apenas o modal de login
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
        <LoginModal
          isOpen={true}
          onClose={() => {}} // Não permitir fechar sem login
          onSuccess={() => {
            // Sessão será atualizada automaticamente pelo listener
          }}
          theme={theme}
          lang={lang}
        />
      </div>
    );
  }

  // Carregando perfil / acesso
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            {lang === 'pt' ? 'Carregando...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Exigir telefone antes de usar o app
  if (accessStatus === 'phone_required' && userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
        <PhoneModal
          isOpen={true}
          userId={userId}
          theme={theme}
          lang={lang}
          onSuccess={async () => {
            const p = await getProfile(userId!);
            setProfile(p);
            const result = await getAccessStatus(userId!, p);
            setAccessStatus(result.status);
            setHasSubscription(!!result.hasSubscription);
            if (result.remaining_seconds != null) setTrialDisplayRemainingSeconds(Math.max(0, result.remaining_seconds));
            if (result.status === 'allowed' && p?.phone) {
              const start = await startTrial(userId!);
              if (start.ok && start.remaining_seconds != null) {
                setTrialDisplayRemainingSeconds(Math.max(0, start.remaining_seconds));
                const pUpdated = await getProfile(userId!);
                if (pUpdated) setProfile(pUpdated);
              }
            }
          }}
          onBackToLogin={async () => {
            try {
              await signOut();
              setSession(null);
              setProfile(null);
              setAccessStatus(null);
              setHistory([]);
              setDailyTarget(null);
              setWaterEntries([]);
              setWaterGoal(2000);
              setCurrentMeal(null);
              setCurrentData(null);
              setFoodPortions({});
              setError(null);
            } catch (e) {
              console.error('Erro ao sair:', e);
            }
          }}
        />
      </div>
    );
  }

  // Paywall: trial acabou e sem assinatura ativa
  if (accessStatus === 'paywall' && userId) {
    return (
      <PaywallScreen
        userId={userId}
        userEmail={session?.user?.email ?? undefined}
        theme={theme}
        lang={lang}
        paymentReturn={paymentReturn}
        onSuccess={() => {
          setAccessStatus('allowed');
          setPaymentReturn(null);
        }}
        onVerifySubscription={async () => {
          try {
            await syncSubscriptionFromMP(userId);
            const p = await getProfile(userId);
            setProfile(p);
            const result = await getAccessStatus(userId, p);
            setAccessStatus(result.status);
            setHasSubscription(!!result.hasSubscription);
            if (result.remaining_seconds != null) setTrialDisplayRemainingSeconds(Math.max(0, result.remaining_seconds));
            setPaymentReturn(null);
          } catch (e) {
            console.error('Erro ao verificar assinatura:', e);
            setAccessStatus('paywall');
          }
        }}
        onBackToLogin={async () => {
          try {
            await signOut();
            setSession(null);
            setProfile(null);
            setAccessStatus(null);
            setHistory([]);
            setDailyTarget(null);
            setWaterEntries([]);
            setWaterGoal(2000);
            setCurrentMeal(null);
            setCurrentData(null);
            setFoodPortions({});
            setError(null);
          } catch (e) {
            console.error('Erro ao sair:', e);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 font-sans flex flex-col">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        lang={lang}
        toggleLang={toggleLang}
        texts={texts}
        currentColor={colorKey}
        onColorChange={handleColorChange}
        onTitleClick={togglePet}
        onLogout={async () => {
          try {
            await signOut();
            setSession(null);
            setHistory([]);
            setDailyTarget(null);
            setWaterEntries([]);
            setWaterGoal(2000);
            setCurrentMeal(null);
            setCurrentData(null);
            setFoodPortions({});
            setError(null);
            setSelectedPetId(availablePets[0]?.id || 'panda.glb');
            setColorKey('purple');
            setView('home');
          } catch (error) {
            console.error('Erro ao fazer logout:', error);
          }
        }}
      />

      {/* Carrossel: slide 0 = Planos, slide 1 = Home, slide 2 = Jejum. Inicia na Home. */}
      <div
        ref={carouselRef}
        className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scroll-smooth touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Slide 0 (esquerda): Planos + cronômetro do trial */}
        <div className="flex-shrink-0 w-full min-w-full snap-start flex flex-col overflow-y-auto">
          <PlansCarouselSlide
            userId={userId!}
            userEmail={session?.user?.email ?? undefined}
            theme={theme}
            lang={lang}
            showTrialSection={showTrialCountdown}
            showTrialCountdown={showTrialCountdown}
            trialDisplayRemainingSeconds={trialDisplayRemainingSeconds}
            trialMinutes={TRIAL_MINUTES}
            profileTrialUsedAt={profile?.trial_used_at ?? null}
            onVerifySubscription={async () => {
              try {
                await syncSubscriptionFromMP(userId!);
                const p = await getProfile(userId!);
                setProfile(p);
                const result = await getAccessStatus(userId!, p);
                setAccessStatus(result.status);
                setHasSubscription(!!result.hasSubscription);
                if (result.remaining_seconds != null) setTrialDisplayRemainingSeconds(Math.max(0, result.remaining_seconds));
                setPaymentReturn(null);
              } catch (e) {
                console.error('Erro ao verificar assinatura:', e);
              }
            }}
          />
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-2 px-2">
            {lang === 'pt' ? 'Deslize para a direita → para ver o app' : 'Swipe right → to see the app'}
          </p>
        </div>

        {/* Slide 1 (centro): Home (trial strip + conteúdo principal) */}
        <div className="flex-shrink-0 w-full min-w-full snap-start flex flex-col overflow-y-auto">
          {showTrialCountdown && (
            <div className="max-w-md mx-auto px-4 pt-1 pb-2 flex-shrink-0">
              <div className="rounded-xl bg-brand-500/15 dark:bg-brand-500/20 border border-brand-500/30 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                    {lang === 'pt' ? 'Teste grátis' : 'Free trial'}
                  </span>
                  {!profile?.trial_used_at ? (
                    <>
                      <span className="text-lg font-bold text-brand-700 dark:text-brand-200 tabular-nums tracking-wider" aria-label={lang === 'pt' ? 'Tempo restante' : 'Time remaining'}>
                        {String(Math.floor(trialDisplayRemainingSeconds / 60)).padStart(2, '0')}
                        <span className="text-brand-500/80 mx-0.5">:</span>
                        {String(trialDisplayRemainingSeconds % 60).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-brand-600 dark:text-brand-400 tabular-nums">
                        {lang === 'pt' ? `min restantes` : `min left`}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                      {lang === 'pt' ? 'Trial encerrado — assine para continuar' : 'Trial ended — subscribe to continue'}
                    </span>
                  )}
                </div>
                {!profile?.trial_used_at && (
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((TRIAL_SECONDS_LIMIT - trialDisplayRemainingSeconds) / TRIAL_SECONDS_LIMIT) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <main className="max-w-md mx-auto p-4 flex-1">
            {view === 'home' && renderHome()}
            {view === 'results' && renderResults()}
            {view === 'history' && renderHistory()}
            {view === 'dayDetails' && renderDayDetails()}
            {view === 'todayFoods' && renderTodayFoods()}
          </main>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-1 px-2 flex-shrink-0 mt-auto">
            {lang === 'pt' ? '← Planos | Jejum →' : '← Plans | Fasting →'}
          </p>
        </div>

        {/* Slide 2 (direita): Relógio de jejum */}
        <div className="flex-shrink-0 w-full min-w-full snap-start flex flex-col overflow-y-auto">
          <FastingSlide userId={userId!} theme={theme} lang={lang} />
        </div>
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt theme={theme} lang={lang} />

      {/* Description Modal */}
      {showDescModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquarePlus size={20} className="text-brand-500" />
                {texts.addDescriptionTitle}
              </h3>
              <button onClick={cancelSelection} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              {/* Image Preview */}
              {previewUrl && (
                <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {texts.addDescriptionTitle}
                  </label>
                  <span className="text-xs text-slate-400">{texts.optional}</span>
                </div>
                <textarea
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  placeholder={texts.addDescriptionPlaceholder}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500 outline-none text-slate-900 dark:text-white h-32 resize-none transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              <button
                onClick={handleAnalyzeConfirm}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>{texts.analyzeNow}</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <BioimpedanceModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        lang={lang}
        texts={texts}
        onUpdate={updateDailyTarget}
        userId={userId ?? undefined}
      />

      <Footer
        texts={texts}
        onClick={() => {
          // Salvar a view atual antes de abrir o calendário
          setPreviousView(view);
          setIsCalendarOpen(true);
        }}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => {
          setIsCalendarOpen(false);
          // Voltar para a view anterior (de onde o usuário veio)
          // Se não houver previousView definida ou for dayDetails, usar 'home' como padrão
          if (previousView && previousView !== 'dayDetails') {
            setView(previousView);
          } else {
            navigateToView('home');
          }
        }}
        history={history}
        texts={texts}
        lang={lang}
        onDayClick={(date) => {
          setSelectedDate(date);
          setIsCalendarOpen(false);
          navigateToView('dayDetails');
        }}
      />

      <DayDetailModal
        isOpen={isDayDetailOpen}
        onClose={() => {
          setIsDayDetailOpen(false);
          setSelectedDate(null);
        }}
        date={selectedDate}
        history={history}
        texts={texts}
        lang={lang}
        onItemClick={(item) => {
          setCurrentData(item);
          setCurrentMeal(null); // Limpar currentMeal para itens do histórico
          setPreviousView('dayDetails');
          navigateToView('results');
        }}
      />

      {/* BMR/TDEE Explanation Modal */}
      {isBMRTDEEModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'pt' ? 'O que são BMR e TDEE?' : 'What are BMR and TDEE?'}
              </h2>
              <button 
                onClick={() => setIsBMRTDEEModalOpen(false)} 
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* BMR Explanation */}
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-200 dark:border-blue-900/50">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">
                  BMR (Taxa Metabólica Basal)
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  {lang === 'pt' 
                    ? 'O BMR é a quantidade de calorias que seu corpo queima em repouso completo, apenas para manter funções vitais como respiração, circulação e produção de células. É a energia mínima necessária para você estar vivo.'
                    : 'BMR is the number of calories your body burns at complete rest, just to maintain vital functions like breathing, circulation, and cell production. It\'s the minimum energy needed for you to be alive.'
                  }
                </p>
                <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                  {lang === 'pt' 
                    ? '💡 Calculado pela fórmula de Mifflin-St Jeor'
                    : '💡 Calculated using Mifflin-St Jeor formula'
                  }
                </div>
              </div>

              {/* TDEE Explanation */}
              <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-5 border border-green-200 dark:border-green-900/50">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-2">
                  TDEE (Gasto Energético Total Diário)
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  {lang === 'pt' 
                    ? 'O TDEE é o total de calorias que você queima em um dia, incluindo o BMR mais todas as atividades físicas. Ele representa sua necessidade calórica real diária baseada no seu nível de atividade.'
                    : 'TDEE is the total number of calories you burn in a day, including BMR plus all physical activities. It represents your real daily caloric need based on your activity level.'
                  }
                </p>
                <div className="text-xs text-green-700 dark:text-green-400 font-semibold">
                  {lang === 'pt' 
                    ? '📊 TDEE = BMR × Multiplicador de Atividade'
                    : '📊 TDEE = BMR × Activity Multiplier'
                  }
                </div>
              </div>

              {/* Why it matters */}
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-5 border border-yellow-200 dark:border-yellow-900/50">
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-300 mb-2">
                  {lang === 'pt' ? 'Por que isso importa?' : 'Why does this matter?'}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {lang === 'pt' 
                    ? 'Conhecer seu TDEE é essencial para planejar sua dieta. Para perder peso, você precisa consumir menos calorias que seu TDEE (déficit calórico). Para ganhar peso, precisa consumir mais (superávit calórico).'
                    : 'Knowing your TDEE is essential for planning your diet. To lose weight, you need to consume fewer calories than your TDEE (caloric deficit). To gain weight, you need to consume more (caloric surplus).'
                  }
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsBMRTDEEModalOpen(false)}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {lang === 'pt' ? 'Entendi' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMC Table Modal */}
      {isIMCModalOpen && (() => {
        const savedStats = userId ? localStorage.getItem(`biaNutriUserStats_${userId}`) : null;
        let currentBMI = 0;
        if (savedStats) {
          try {
            const stats: UserStats = JSON.parse(savedStats);
            const weightForCalc = stats.currentWeight || stats.weight;
            currentBMI = weightForCalc / Math.pow(stats.height / 100, 2);
          } catch (e) {
            console.error('Error calculating BMI:', e);
          }
        }

        return (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {lang === 'pt' ? 'Tabela de IMC' : 'BMI Table'}
                </h2>
                <button 
                  onClick={() => setIsIMCModalOpen(false)} 
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Explanation */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {lang === 'pt' 
                      ? 'O IMC (Índice de Massa Corporal) é uma medida que relaciona peso e altura para avaliar se você está dentro de uma faixa de peso considerada saudável.'
                      : 'BMI (Body Mass Index) is a measure that relates weight and height to assess if you are within a healthy weight range.'
                    }
                  </p>
                </div>

                {/* BMI Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          {lang === 'pt' ? 'Classificação' : 'Classification'}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          IMC
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                        <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 font-semibold">
                          {lang === 'pt' ? 'Abaixo do peso' : 'Underweight'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                          &lt; 18.5
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/10">
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-semibold">
                          {lang === 'pt' ? 'Peso normal' : 'Normal weight'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                          18.5 - 24.9
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/10">
                        <td className="px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                          {lang === 'pt' ? 'Sobrepeso' : 'Overweight'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                          25.0 - 29.9
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/10">
                        <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-semibold">
                          {lang === 'pt' ? 'Obesidade Grau I' : 'Obesity Grade I'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                          30.0 - 34.9
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/10">
                        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-semibold">
                          {lang === 'pt' ? 'Obesidade Grau II' : 'Obesity Grade II'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                          35.0 - 39.9
                        </td>
                      </tr>
                      <tr className="hover:bg-red-100 dark:hover:bg-red-900/20">
                        <td className="px-4 py-3 text-sm text-red-700 dark:text-red-500 font-semibold">
                          {lang === 'pt' ? 'Obesidade Grau III' : 'Obesity Grade III'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300 font-bold">
                          ≥ 40.0
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Current BMI Highlight */}
                {currentBMI > 0 && (
                  <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-900/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                        {lang === 'pt' ? 'Seu IMC:' : 'Your BMI:'}
                      </span>
                      <span className={`text-2xl font-extrabold ${getBmiColor(currentBMI)}`}>
                        {currentBMI.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-brand-600 dark:text-brand-500 mt-2">
                      {lang === 'pt' 
                        ? currentBMI < 18.5 ? 'Você está abaixo do peso ideal' :
                          currentBMI < 25 ? 'Você está no peso normal' :
                          currentBMI < 30 ? 'Você está com sobrepeso' :
                          currentBMI < 35 ? 'Você está com obesidade grau I' :
                          currentBMI < 40 ? 'Você está com obesidade grau II' :
                          'Você está com obesidade grau III'
                        : currentBMI < 18.5 ? 'You are underweight' :
                          currentBMI < 25 ? 'You are at normal weight' :
                          currentBMI < 30 ? 'You are overweight' :
                          currentBMI < 35 ? 'You have obesity grade I' :
                          currentBMI < 40 ? 'You have obesity grade II' :
                          'You have obesity grade III'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsIMCModalOpen(false)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {lang === 'pt' ? 'Fechar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
