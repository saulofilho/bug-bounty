import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, ChevronDown, Image as ImageIcon, RotateCcw } from 'lucide-react';
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  AppLanguage,
  DEFAULT_APP_ICON_URL
} from '../context/LanguageContext';

export interface LanguageSwitcherProps {
  variant?: 'compact' | 'panel';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'compact' }) => {
  const { language, setLanguage, appIconUrl, setAppIconUrl, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [iconInput, setIconInput] = useState(appIconUrl);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIconInput(appIconUrl);
  }, [appIconUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang =
    SUPPORTED_LANGUAGES.find(item => item.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code: AppLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  const handleApplyIconUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setAppIconUrl(iconInput.trim() || DEFAULT_APP_ICON_URL);
  };

  if (variant === 'panel') {
    return (
      <div className="space-y-4">
        {/* Language Selector Grid */}
        <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#20273d] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Languages className="w-4 h-4 text-emerald-400" />
              <span>{t('lang.label', 'Idioma do Aplicativo')}</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {currentLang.flag} {currentLang.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SUPPORTED_LANGUAGES.map(opt => {
              const isSelected = opt.code === language;
              return (
                <button
                  key={opt.code}
                  type="button"
                  id={`btn-lang-panel-${opt.code}`}
                  onClick={() => setLanguage(opt.code)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-[#121520] border-[#242a40] text-zinc-300 hover:border-zinc-500 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.flag}</span>
                    <span>{opt.name}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* App Icon URL Path Configuration */}
        <form
          onSubmit={handleApplyIconUrl}
          className="p-4 rounded-xl bg-[#0a0c12] border border-[#20273d] space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>{t('icon.label', 'Caminho da URL do Ícone (Icon URL Path)')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIconInput(DEFAULT_APP_ICON_URL);
                setAppIconUrl(DEFAULT_APP_ICON_URL);
              }}
              className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset (/icon.svg)</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#141824] border border-[#262e45] flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={iconInput.trim() || DEFAULT_APP_ICON_URL}
                alt="App Icon Preview"
                className="w-6 h-6 object-contain"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_APP_ICON_URL;
                }}
              />
            </div>
            <input
              type="text"
              id="input-app-icon-url-path"
              value={iconInput}
              onChange={e => setIconInput(e.target.value)}
              placeholder="/icon.svg ou https://..."
              className="flex-1 bg-[#121520] border border-[#242a40] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer shrink-0"
            >
              Aplicar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id="btn-header-language-switcher"
        onClick={() => setIsOpen(prev => !prev)}
        title={`${t('lang.label', 'Idioma')}: ${currentLang.name}`}
        aria-expanded={isOpen}
        aria-label="Selecionar idioma do aplicativo"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#1e1e22] text-zinc-300 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-all font-semibold border border-transparent hover:border-[#333338] whitespace-nowrap cursor-pointer"
      >
        <Languages className="w-3.5 h-3.5 text-cyan-400" />
        <span>{currentLang.shortLabel}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-xl bg-[#111116] border border-[#2a2a36] shadow-2xl py-1.5 z-50 font-mono text-xs"
        >
          <div className="px-3 py-1.5 border-b border-[#22222c] text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            {t('lang.label', 'Idioma')}
          </div>
          {SUPPORTED_LANGUAGES.map(opt => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                role="menuitem"
                id={`menu-lang-${opt.code}`}
                onClick={() => handleSelectLanguage(opt.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                    : 'text-zinc-300 hover:bg-[#1b1b24] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{opt.flag}</span>
                  <span>{opt.name}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
