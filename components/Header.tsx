
import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Languages, Palette, LogOut } from 'lucide-react';
import { Theme, Language, Translation } from '../types';
import { COLOR_PALETTES } from '../constants';
import { signOut } from '../services/authService';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  lang: Language;
  toggleLang: () => void;
  texts: Translation;
  onColorChange: (colorKey: string) => void;
  currentColor: string;
  onTitleClick?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, lang, toggleLang, texts, onColorChange, currentColor, onTitleClick, onLogout }) => {
  const [showColors, setShowColors] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Close color menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setShowColors(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Color Picker Trigger */}
          <div className="relative" ref={colorMenuRef}>
            <button
              onClick={() => setShowColors(!showColors)}
              className="btn-vivo w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30"
              aria-label={texts.chooseColor}
            >
              B
            </button>

            {/* Color Palette Popover */}
            {showColors && (
              <div className="absolute top-full left-0 mt-3 p-3 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-100 dark:border-slate-700 w-48 animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 px-1">
                  {texts.chooseColor}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                    <button
                      key={key}
                      onClick={() => {
                        onColorChange(key);
                        setShowColors(false);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === key ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: palette[500] }}
                      aria-label={`Select ${key} theme`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h1
              onClick={onTitleClick}
              className="text-lg font-bold text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-brand-500 transition-colors select-none"
            >
              {texts.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="btn-vivo p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold uppercase"
          >
            <Languages size={18} />
            {lang}
          </button>
          <button
            onClick={toggleTheme}
            className="btn-vivo p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'light' ? <Moon size={20} className="icone-vivo" /> : <Sun size={20} className="icone-vivo" />}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="btn-vivo p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title={lang === 'pt' ? 'Sair' : 'Logout'}
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;