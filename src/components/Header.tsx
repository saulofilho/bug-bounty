import React, { useRef, useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck,
  LayoutDashboard, 
  FileText, 
  Database, 
  Target, 
  BookOpen, 
  PlusCircle, 
  DollarSign,
  Key,
  HelpCircle,
  Search,
  X,
  Zap,
  ChevronDown,
  Check,
  Plus,
  Globe,
  Calculator,
  Radio,
  Sparkles,
  Settings,
  Bell,
  Sun,
  Moon,
  MoreHorizontal
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { UserAuthWidget } from './UserAuthWidget';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, DEFAULT_APP_ICON_URL } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export type NavTab = 'home' | 'dashboard' | 'reports' | 'cve' | 'targets' | 'docs' | 'platforms' | 'threat-intel' | 'notifications' | 'tools';

export interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onNewReport: () => void;
  onOpenAddTarget?: () => void;
  onOpenPgp?: () => void;
  onOpenCvssCalculator?: () => void;
  onOpenAbout?: () => void;
  onOpenStorageIntegrity?: () => void;
  onOpenWelcomeModal?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  isMockActive?: boolean;
  isStorageRepaired?: boolean;
  totalRewardedUSD: number;
  activeReportsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  reportsMatchingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onNewReport,
  onOpenAddTarget,
  onOpenPgp,
  onOpenCvssCalculator,
  onOpenAbout,
  onOpenStorageIntegrity,
  onOpenWelcomeModal,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  isMockActive = true,
  isStorageRepaired,
  totalRewardedUSD,
  activeReportsCount,
  searchQuery,
  onSearchChange,
  reportsMatchingCount
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreNavRef = useRef<HTMLDivElement>(null);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isMoreNavOpen, setIsMoreNavOpen] = useState(false);
  const activeMobileTabRef = useRef<HTMLButtonElement>(null);
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const { t, appIconUrl, language, rerenderVersion } = useLanguage();
  const usdToBrlRate = 5.45;
  const totalBRL = totalRewardedUSD * usdToBrlRate;

  // Auto-close more nav dropdown on tab switch
  useEffect(() => {
    setIsMoreNavOpen(false);
  }, [currentTab]);

  // Auto-scroll the active mobile tab into view smoothly on tab switch
  useEffect(() => {
    if (activeMobileTabRef.current) {
      activeMobileTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentTab]);

  // Global keyboard shortcuts:
  // - '/' or 'Ctrl+K' -> Focus search
  // - 'Alt+T' -> Add Target
  // - 'Alt+S' -> Sign Report (PGP)
  // - 'Alt+N' -> New Report
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      // Search shortcut
      if ((e.key === '/' && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Quick Actions shortcuts (Alt + Key)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          if (onOpenAddTarget) onOpenAddTarget();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (onOpenPgp) onOpenPgp();
        } else if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          if (onOpenCvssCalculator) onOpenCvssCalculator();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          onNewReport();
        }
      }

      // Close open menus on Escape
      if (e.key === 'Escape') {
        if (isQuickMenuOpen) setIsQuickMenuOpen(false);
        if (isMoreNavOpen) setIsMoreNavOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddTarget, onOpenPgp, onOpenCvssCalculator, onNewReport, isQuickMenuOpen, isMoreNavOpen]);

  // Click outside to close quick actions dropdown & more nav menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsQuickMenuOpen(false);
      }
      if (moreNavRef.current && !moreNavRef.current.contains(e.target as Node)) {
        setIsMoreNavOpen(false);
      }
    };

    if (isQuickMenuOpen || isMoreNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isQuickMenuOpen, isMoreNavOpen]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    if (val.trim() && currentTab !== 'reports') {
      onTabChange('reports');
    }
  };

  const handleClearSearch = () => {
    onSearchChange('');
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onSearchChange('');
      searchInputRef.current?.blur();
    } else if (e.key === 'Enter' && currentTab !== 'reports') {
      onTabChange('reports');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#222226] bg-[#09090b]/95 backdrop-blur-md transition-all shadow-lg shadow-black/20">
      {/* Selector 2: Container */}
      <div className="w-full max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 flex flex-col">
        
        {/* Selector 1: Tier 1 - Main Application Bar (Brand + Global Search + Actions Toolbar) */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4 w-full min-w-0">
          
          {/* Left: Brand Identity & Platform Indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div 
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group py-1" 
              onClick={() => onTabChange('home')}
              title={t('header.brandTooltip', 'Ir para a Página Inicial (Boas-vindas)')}
            >
              <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 bg-emerald-500/15 group-hover:bg-emerald-500/25 border border-emerald-500/40 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/25 transition-all shrink-0 overflow-hidden">
                {appIconUrl ? (
                  <img
                    src={appIconUrl}
                    alt="BugSentinel Icon"
                    className="w-6 h-6 object-contain"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_APP_ICON_URL;
                    }}
                  />
                ) : (
                  <span className="text-emerald-400 font-extrabold text-base sm:text-lg leading-none">Σ</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight uppercase text-emerald-400 whitespace-nowrap">
                  BugSentinel
                </span>
                <span className="text-zinc-500 font-normal text-xs hidden min-[480px]:inline">.io</span>
                <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hidden sm:inline">
                  PRO
                </span>
              </div>
            </div>

            {/* Platform / Mock Status Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-[#222226]">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                isMockActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMockActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span>{isMockActive ? t('header.mockActive', 'Mock Ativo') : t('header.mockEmpty', 'Plataforma')}</span>
              </span>
            </div>
          </div>

          {/* Center: Global Search Bar (Dedicated, centered, flex-1 with min-w-0 so it never crushes) */}
          <div className="relative flex-1 max-w-sm sm:max-w-md lg:max-w-lg mx-2 sm:mx-4 min-w-0">
            <div className="relative flex items-center w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-zinc-500 transition-colors">
                <Search className="w-3.5 h-3.5" />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                id="global-header-search"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('header.searchPlaceholder', 'Buscar alvo, CVE...')}
                className="w-full pl-8 sm:pl-9 pr-8 sm:pr-12 py-1.5 bg-[#121215] hover:bg-[#16161a] border border-[#26262a] focus:border-emerald-500/60 focus:bg-[#0c0c0e] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                title="Filtrar relatórios por título, alvo ou tipo (/ ou Ctrl+K)"
              />

              <div className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center gap-1">
                {searchQuery ? (
                  <>
                    {reportsMatchingCount !== undefined && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                          reportsMatchingCount > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                        title={`${reportsMatchingCount} relatório(s) encontrado(s)`}
                      >
                        {reportsMatchingCount}
                      </span>
                    )}
                    <button
                      type="button"
                      id="btn-clear-global-search"
                      onClick={handleClearSearch}
                      className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Limpar busca (Esc)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <kbd
                    className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 bg-[#1a1a1e] border border-[#2e2e34] rounded select-none pointer-events-none"
                    title="Pressione / ou Ctrl+K para buscar"
                  >
                    /
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions, Utilities & User Profile (Consolidated, never overlapping) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Quick Actions Dropdown (Zap Menu) */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="btn-quick-actions-menu-toggle"
                type="button"
                onClick={() => setIsQuickMenuOpen(prev => !prev)}
                title="Menu de Ações Rápidas do BugSentinel"
                aria-expanded={isQuickMenuOpen}
                aria-label="Ações Rápidas"
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all font-mono text-xs border whitespace-nowrap cursor-pointer ${
                  isQuickMenuOpen
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'bg-[#121215] hover:bg-[#18181d] text-zinc-300 hover:text-white border-[#26262a]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">{t('header.actions', 'Ações')}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isQuickMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Quick Actions Dropdown Modal */}
              {isQuickMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl bg-[#111115] border border-[#2d2d34] shadow-2xl z-50 p-2 text-xs font-sans animate-fadeIn"
                  role="menu"
                >
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#222228] mb-1.5 flex items-center justify-between">
                    <span>{t('header.quickActions', 'Ações Rápidas')}</span>
                    <span className="text-[9px] text-zinc-500">{t('header.shortcuts', 'Atalhos')}</span>
                  </div>

                  {onOpenAddTarget && (
                    <button
                      type="button"
                      id="btn-quick-add-target"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onOpenAddTarget();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>{t('header.addScope', 'Adicionar Alvo')}</span>
                      </div>
                      <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+T</kbd>
                    </button>
                  )}

                  {onOpenPgp && (
                    <button
                      type="button"
                      id="btn-quick-sign-report"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onOpenPgp();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>{t('header.signReport', 'Assinar PGP')}</span>
                      </div>
                      <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+S</kbd>
                    </button>
                  )}

                  {onOpenCvssCalculator && (
                    <button
                      type="button"
                      id="btn-quick-cvss-calc"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onOpenCvssCalculator();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Calculator className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>{t('header.cvssCalcTitle', 'Calc CVSS v3.1')}</span>
                      </div>
                      <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+C</kbd>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      onNewReport();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>{t('header.newReport', 'Novo Relatório')}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+N</kbd>
                  </button>

                  <div className="border-t border-[#222228] my-1.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      onTabChange('tools');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('header.appSecSuiteMenu', 'AppSec Suite (10 Ferramentas)')}</span>
                    </div>
                    <span className="text-[9px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded font-bold">10</span>
                  </button>

                  {onOpenWelcomeModal && (
                    <button
                      type="button"
                      id="btn-header-welcome-modal"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onOpenWelcomeModal();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-950/40 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('header.welcomeMockMenu', 'Conhecer Plataforma / Mock')}</span>
                      </div>
                      <span className="text-[9px] font-mono text-cyan-400 font-semibold">
                        {isMockActive ? t('header.mockOn', 'Mock ON') : t('header.mockOff', 'Zerado')}
                      </span>
                    </button>
                  )}

                  {onOpenSettings && (
                    <button
                      type="button"
                      id="btn-header-settings-modal"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/40 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-purple-400" />
                        <span>{t('header.settingsMenu', 'Configurações & Token GitHub')}</span>
                      </div>
                      <span className="text-[9px] font-mono text-purple-400">PAT API</span>
                    </button>
                  )}

                  {onOpenAbout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onOpenAbout();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t('header.helpMenu', 'Central de Ajuda & Guia')}</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Hub Button */}
            <button
              id="btn-header-notifications"
              type="button"
              onClick={() => {
                if (onOpenNotifications) {
                  onOpenNotifications();
                } else {
                  onTabChange('notifications');
                }
              }}
              title={`Central de Notificações (${unreadNotificationsCount} não lidos)`}
              aria-label="Central de Notificações"
              className={`relative flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg border transition-all cursor-pointer ${
                unreadNotificationsCount > 0
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
                  : 'bg-[#121215] text-zinc-300 hover:text-white border-[#26262a] hover:bg-[#18181d]'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${unreadNotificationsCount > 0 ? 'text-rose-400 animate-bounce' : 'text-zinc-400'}`} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold leading-none shadow-sm">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />

            {/* Light / Dark Theme Toggle */}
            <button
              id="btn-header-theme-toggle"
              type="button"
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              aria-label="Alternar Tema Claro e Escuro"
              className="flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-[#121215] hover:bg-[#18181d] text-zinc-300 hover:text-white border border-[#26262a] transition-all cursor-pointer"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-400 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Primary Action Button: New Report */}
            <button
              id="btn-new-report-header"
              type="button"
              onClick={onNewReport}
              title="Criar Novo Relatório de Vulnerabilidade (Alt+N)"
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-emerald-950/40 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden min-[480px]:inline">{t('header.newReport', 'Novo Relatório')}</span>
              <span className="min-[480px]:hidden">{t('header.newShort', 'Novo')}</span>
            </button>

            {/* Firebase Auth User Status / Login Widget */}
            <div className="shrink-0">
              <UserAuthWidget />
            </div>

            {/* Wallet Balance (on Large screens) */}
            <div className="hidden xl:flex flex-col items-end text-right pl-1 shrink-0">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">{t('header.bountyBalance', 'Saldo de Bounties')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-mono text-emerald-400 font-semibold">{formatCurrency(totalRewardedUSD, 'USD')}</span>
                <span className="text-[9px] text-zinc-500 font-mono">({formatCurrency(totalBRL, 'BRL')})</span>
              </div>
            </div>

            {/* Help / About Modal button (Desktop) */}
            {onOpenAbout && (
              <button
                id="btn-about-help-header"
                onClick={onOpenAbout}
                title="Central de Ajuda, Guia & Sobre os Dados Mock"
                className="hidden xl:flex items-center justify-center w-8 h-8 rounded-lg bg-[#121215] hover:bg-[#18181d] border border-[#26262a] text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {/* Hunter Avatar */}
            <div className="hidden 2xl:block w-8 h-8 rounded-full border border-emerald-500/30 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[10px] sm:text-xs font-mono text-zinc-300 font-bold">
                JH
              </div>
            </div>

          </div>

        </div>

        {/* Dedicated Navigation Bar: Clean, independent, full screen responsive */}
        <nav
          id="desktop-nav-menu"
          role="navigation"
          aria-label="Navegação Principal"
          className="w-full flex items-center justify-between xl:justify-start gap-1 sm:gap-1.5 py-1.5 border-t border-[#1c1c22] overflow-x-auto touch-pan-x scroll-smooth no-scrollbar select-none"
        >
          {/* Home / Boas-vindas Tab */}
          <button 
            ref={currentTab === 'home' ? activeMobileTabRef : null}
            id="nav-home"
            role="tab"
            aria-selected={currentTab === 'home'}
            onClick={() => onTabChange('home')} 
            title={t('nav.homeTitle', 'Página Inicial de Apresentação e Boas-Vindas')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'home' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'home' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.home', 'Início')}</span>
          </button>

          {/* Dashboard Tab */}
          <button 
            ref={currentTab === 'dashboard' ? activeMobileTabRef : null}
            id="nav-dashboard"
            role="tab"
            aria-selected={currentTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')} 
            title={t('nav.dashTitle', 'Ir para o Dashboard')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'dashboard' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <LayoutDashboard className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'dashboard' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.dashboard', 'Dashboard')}</span>
          </button>

          {/* Reports Tab */}
          <button 
            ref={currentTab === 'reports' ? activeMobileTabRef : null}
            id="nav-reports"
            role="tab"
            aria-selected={currentTab === 'reports'}
            onClick={() => onTabChange('reports')} 
            title={t('nav.reportsTitle', 'Relatórios de Vulnerabilidade')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'reports' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'reports' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.reports', 'Relatórios')}</span>
            {searchQuery ? (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                  (reportsMatchingCount ?? 0) > 0
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-950/80 text-red-300 border-red-500/40'
                }`}
              >
                {reportsMatchingCount}
              </span>
            ) : activeReportsCount > 0 ? (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                {activeReportsCount}
              </span>
            ) : null}
          </button>

          {/* CVE-DB Tab */}
          <button 
            ref={currentTab === 'cve' ? activeMobileTabRef : null}
            id="nav-cve"
            role="tab"
            aria-selected={currentTab === 'cve'}
            onClick={() => onTabChange('cve')} 
            title={t('nav.cveTitle', 'Base de Dados de CVEs e Exploits')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'cve' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Database className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'cve' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.cve', 'CVE-DB')}</span>
          </button>

          {/* Programs / Targets Tab */}
          <button 
            ref={currentTab === 'targets' ? activeMobileTabRef : null}
            id="nav-targets"
            role="tab"
            aria-selected={currentTab === 'targets'}
            onClick={() => onTabChange('targets')} 
            title={t('nav.targetsTitle', 'Programas e Alvos Bug Bounty')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'targets' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Target className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'targets' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.targets', 'Programas')}</span>
          </button>

          {/* AppSec Tools Tab */}
          <button 
            ref={currentTab === 'tools' ? activeMobileTabRef : null}
            id="nav-tools"
            role="tab"
            aria-selected={currentTab === 'tools'}
            onClick={() => onTabChange('tools')} 
            title={t('nav.toolsTitle', 'Central de Ferramentas AppSec & DevSecOps (10 Módulos)')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'tools' 
                ? 'text-amber-300 font-bold bg-amber-500/15 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t('nav.appsecShort', 'AppSec')}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              10
            </span>
          </button>

          {/* Threat Intel Tab */}
          <button 
            ref={currentTab === 'threat-intel' ? activeMobileTabRef : null}
            id="nav-threat-intel"
            role="tab"
            aria-selected={currentTab === 'threat-intel'}
            onClick={() => onTabChange('threat-intel')} 
            title={t('nav.threatIntelTitle', 'Threat Intelligence em Tempo Real')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'threat-intel' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'threat-intel' ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
            <span>{t('nav.intelShort', 'Intel')}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
              LIVE
            </span>
          </button>

          {/* Notifications Tab */}
          <button 
            ref={currentTab === 'notifications' ? activeMobileTabRef : null}
            id="nav-notifications"
            role="tab"
            aria-selected={currentTab === 'notifications'}
            onClick={() => onTabChange('notifications')} 
            title={t('nav.notificationsTitle', `Notificações do Sistema (${unreadNotificationsCount} não lidas)`)}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'notifications' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 shrink-0 ${unreadNotificationsCount > 0 ? 'text-rose-400' : currentTab === 'notifications' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.alertsShort', 'Alertas')}</span>
            {unreadNotificationsCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono font-bold animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Sites & Platforms Tab */}
          <button 
            ref={currentTab === 'platforms' ? activeMobileTabRef : null}
            id="nav-platforms"
            role="tab"
            aria-selected={currentTab === 'platforms'}
            onClick={() => onTabChange('platforms')} 
            title={t('nav.platformsTitle', 'Plataformas de Bug Bounty & Ganhos')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'platforms' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'platforms' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.platformsShort', 'Sites')}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              14
            </span>
          </button>

          {/* Library / Docs Tab */}
          <button 
            ref={currentTab === 'docs' ? activeMobileTabRef : null}
            id="nav-docs"
            role="tab"
            aria-selected={currentTab === 'docs'}
            onClick={() => onTabChange('docs')} 
            title={t('nav.docsTitle', 'Biblioteca de Segurança, Guias e Metodologias')}
            className={`h-8 sm:h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentTab === 'docs' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'docs' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t('nav.docs', 'Biblioteca')}</span>
          </button>
        </nav>

      </div>
    </header>
  );
};

