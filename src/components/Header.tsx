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
  Bell
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { UserAuthWidget } from './UserAuthWidget';

export type NavTab = 'dashboard' | 'reports' | 'cve' | 'targets' | 'docs' | 'platforms' | 'threat-intel' | 'notifications' | 'tools';

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
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const activeMobileTabRef = useRef<HTMLButtonElement>(null);
  const usdToBrlRate = 5.45;
  const totalBRL = totalRewardedUSD * usdToBrlRate;

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

      // Close quick menu on Escape
      if (e.key === 'Escape' && isQuickMenuOpen) {
        setIsQuickMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddTarget, onOpenPgp, onOpenCvssCalculator, onNewReport, isQuickMenuOpen]);

  // Click outside to close quick actions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsQuickMenuOpen(false);
      }
    };

    if (isQuickMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isQuickMenuOpen]);

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
    <header className="sticky top-0 z-30 border-b border-[#222224] bg-[#09090b]/95 backdrop-blur-md transition-all">
      <div className="w-full max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3 xl:gap-4">
          
          {/* Left: Logo & Desktop Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 xl:gap-5 min-w-0">
            {/* Logo & Brand */}
            <div 
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0 group py-1" 
              onClick={() => onTabChange('dashboard')}
              title="Ir para o Dashboard"
            >
              <div className="w-8 h-8 bg-emerald-500 group-hover:bg-emerald-400 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/25 transition-all shrink-0">
                <span className="text-black font-extrabold text-base sm:text-lg leading-none">Σ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight uppercase text-emerald-400 whitespace-nowrap">
                  BugSentinel
                </span>
                <span className="text-zinc-500 font-normal text-xs hidden min-[440px]:inline">.io</span>
                <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hidden 2xl:inline">
                  PRO
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs - Displayed on lg (1024px+) with responsive spacing to prevent full screen break */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 2xl:gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400 h-16 shrink min-w-0 overflow-x-auto no-scrollbar">
              <button
                id="nav-dashboard"
                onClick={() => onTabChange('dashboard')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'dashboard'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                id="nav-reports"
                onClick={() => onTabChange('reports')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'reports'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Reports</span>
                {searchQuery ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                      (reportsMatchingCount ?? 0) > 0
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-950/60 text-red-300 border-red-500/30'
                    }`}
                    title={`${reportsMatchingCount} relatório(s) filtrado(s)`}
                  >
                    {reportsMatchingCount}
                  </span>
                ) : activeReportsCount > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                    {activeReportsCount}
                  </span>
                ) : null}
              </button>

              <button
                id="nav-cve"
                onClick={() => onTabChange('cve')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'cve'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>CVE-DB</span>
              </button>

              <button
                id="nav-targets"
                onClick={() => onTabChange('targets')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'targets'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Programs</span>
              </button>

              <button
                id="nav-docs"
                onClick={() => onTabChange('docs')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'docs'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>

              <button
                id="nav-platforms"
                onClick={() => onTabChange('platforms')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'platforms'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Sites<span className="hidden xl:inline"> & Ganhos</span></span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                  14
                </span>
              </button>

              <button
                id="nav-threat-intel"
                onClick={() => onTabChange('threat-intel')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'threat-intel'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Threat Intel</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  LIVE
                </span>
              </button>

              <button
                id="nav-notifications"
                onClick={() => onTabChange('notifications')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'notifications'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notificações</span>
                {unreadNotificationsCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tools"
                onClick={() => onTabChange('tools')}
                className={`h-full flex items-center gap-1.5 px-2 xl:px-2.5 transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'tools'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-white hover:bg-zinc-900/40 rounded-t'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Ferramentas AppSec</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  10
                </span>
              </button>
            </nav>
          </div>

          {/* Right: Search + Quick Action Toolbar + CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Global Reports Search Bar */}
            <div className="relative w-28 min-[380px]:w-36 sm:w-44 md:w-48 lg:w-36 xl:w-44 2xl:w-60 group shrink min-w-[110px]">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                <Search className="w-3.5 h-3.5" />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                id="global-header-search"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar alvo, CVE..."
                className="w-full pl-8 pr-8 sm:pr-12 py-1.5 bg-[#121214] hover:bg-[#161618] border border-[#262628] group-focus-within:border-emerald-500/60 group-focus-within:bg-[#0e0e10] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                title="Filtrar relatórios por título, alvo ou tipo (/ ou Ctrl+K)"
              />

              <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
                {searchQuery ? (
                  <>
                    {reportsMatchingCount !== undefined && (
                      <span
                        className={`hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${
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
                      className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Limpar busca (Esc)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <kbd
                    className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 bg-[#1a1a1c] border border-[#2e2e32] rounded select-none pointer-events-none"
                    title="Pressione / ou Ctrl+K para buscar"
                  >
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Segmented Quick Actions Toolbar */}
            <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-[#121214] border border-[#262628] rounded-lg shadow-sm">
              
              {/* Quick Action: Add Target */}
              {onOpenAddTarget && (
                <button
                  id="btn-quick-add-target"
                  type="button"
                  onClick={onOpenAddTarget}
                  title="Adicionar Novo Alvo / Programa (Alt+T)"
                  aria-label="Adicionar Novo Alvo"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#1e1e22] text-zinc-300 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-all group font-semibold border border-transparent hover:border-[#333338] whitespace-nowrap"
                >
                  <Target className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden 2xl:inline">Add Target</span>
                </button>
              )}

              {/* Quick Action: Sign Report (PGP) */}
              {onOpenPgp && (
                <button
                  id="btn-quick-sign-report"
                  type="button"
                  onClick={onOpenPgp}
                  title="Assinar Relatório Criptograficamente com PGP (Alt+S)"
                  aria-label="Assinar Relatório com PGP"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#1e1e22] text-zinc-300 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-all group font-semibold border border-transparent hover:border-[#333338] whitespace-nowrap"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden 2xl:inline">Sign PGP</span>
                </button>
              )}

              {/* Quick Action: CVSS Calculator */}
              {onOpenCvssCalculator && (
                <button
                  id="btn-quick-cvss-calc"
                  type="button"
                  onClick={onOpenCvssCalculator}
                  title="Calculadora de Gravidade CVSS v3.1 (Alt+C)"
                  aria-label="Calculadora CVSS v3.1"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#1e1e22] text-zinc-300 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-all group font-semibold border border-transparent hover:border-[#333338] whitespace-nowrap"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden xl:inline">CVSS Calc</span>
                </button>
              )}

              {/* Quick Action: Welcome / Mock Mode */}
              {onOpenWelcomeModal && (
                <button
                  id="btn-header-welcome-modal"
                  type="button"
                  onClick={onOpenWelcomeModal}
                  title="Conhecer a plataforma ou alternar entre dados de demonstração (mock) e ambiente zerado"
                  aria-label="Conhecer a Plataforma e Dados Mock"
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all group font-semibold border whitespace-nowrap cursor-pointer ${
                    isMockActive
                      ? 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
                      : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
                  <span className="hidden xl:inline">{isMockActive ? 'Mock Ativo' : 'Plataforma Zerada'}</span>
                </button>
              )}

              {/* Quick Action: Settings / GitHub Token */}
              {onOpenSettings && (
                <button
                  id="btn-header-settings-modal"
                  type="button"
                  onClick={onOpenSettings}
                  title="Configurações & Token GitHub (PAT)"
                  aria-label="Configurações do Sistema"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#1e1e22] text-zinc-300 hover:text-white text-[11px] font-mono uppercase tracking-wider transition-all group font-semibold border border-transparent hover:border-[#333338] whitespace-nowrap cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-45 transition-transform" />
                  <span className="hidden xl:inline">Configurações</span>
                </button>
              )}

              {/* Quick Action: Notifications Hub */}
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
                title={`Central de Notificações & E-mails Mock (${unreadNotificationsCount} não lidos)`}
                aria-label="Central de Notificações"
                className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all group font-semibold border whitespace-nowrap cursor-pointer ${
                  unreadNotificationsCount > 0
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/40 hover:border-rose-400'
                    : 'hover:bg-[#1e1e22] text-zinc-300 hover:text-white border-transparent hover:border-[#333338]'
                }`}
              >
                <Bell className={`w-3.5 h-3.5 ${unreadNotificationsCount > 0 ? 'text-rose-400 animate-bounce' : 'text-indigo-400 group-hover:scale-110 transition-transform'}`} />
                <span className="hidden xl:inline">Notificações</span>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Quick Actions Dropdown Menu Toggle */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="btn-quick-actions-menu-toggle"
                  type="button"
                  onClick={() => setIsQuickMenuOpen(prev => !prev)}
                  title="Menu de Ações Rápidas do BugSentinel"
                  aria-expanded={isQuickMenuOpen}
                  aria-label="Ações Rápidas"
                  className={`flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-md transition-all font-mono text-[11px] uppercase tracking-wider border whitespace-nowrap ${
                    isQuickMenuOpen
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : 'hover:bg-[#1e1e22] text-zinc-400 hover:text-zinc-200 border-transparent hover:border-[#333338]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden 2xl:inline font-medium">Quick</span>
                  <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isQuickMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Modal */}
                {isQuickMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[#111114] border border-[#2d2d32] shadow-2xl z-50 p-1.5 text-xs font-sans animate-fadeIn"
                    role="menu"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#222226] mb-1 flex items-center justify-between">
                      <span>Ações Rápidas</span>
                      <span className="text-[9px] text-zinc-600">Atalhos</span>
                    </div>

                    {onOpenAddTarget && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          onOpenAddTarget();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>Adicionar Alvo / Escopo</span>
                        </div>
                        <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+T</kbd>
                      </button>
                    )}

                    {onOpenPgp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          onOpenPgp();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>Assinar Relatório PGP</span>
                        </div>
                        <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+S</kbd>
                      </button>
                    )}

                    {onOpenCvssCalculator && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          onOpenCvssCalculator();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>Calculadora CVSS v3.1</span>
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
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>Novo Relatório</span>
                      </div>
                      <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">Alt+N</kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        if (onOpenNotifications) {
                          onOpenNotifications();
                        } else {
                          onTabChange('notifications');
                        }
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors text-left group"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span>Central de Notificações</span>
                      </div>
                      {unreadNotificationsCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </button>

                    <div className="border-t border-[#222226] my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onTabChange('cve');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Base de Vulnerabilidades (CVE)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onTabChange('docs');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Biblioteca & Checklists</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onTabChange('platforms');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sites de Bug Bounty & Ganhos</span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400">14 sites</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onTabChange('threat-intel');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Threat Intelligence Feeds</span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.2 rounded font-bold">LIVE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onTabChange('tools');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Central de Ferramentas AppSec</span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded font-bold">10 TOOLS</span>
                    </button>

                    {onOpenStorageIntegrity && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          onOpenStorageIntegrity();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Integridade do Storage</span>
                        </div>
                        {isStorageRepaired ? (
                          <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                            Auto-Curado
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-400">100% OK</span>
                        )}
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
                          <span>Central de Ajuda & Guia</span>
                        </div>
                      </button>
                    )}

                    {onOpenWelcomeModal && (
                      <button
                        type="button"
                        id="btn-menu-welcome-modal"
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          onOpenWelcomeModal();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-950/40 transition-colors text-left border-t border-[#222226] mt-1 pt-2"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Conhecer Plataforma / Mock</span>
                        </div>
                        <span className="text-[9px] font-mono text-cyan-400 font-semibold">
                          {isMockActive ? 'Mock ON' : 'Zerado'}
                        </span>
                      </button>
                    )}

                    {onOpenSettings && (
                      <button
                        type="button"
                        id="btn-menu-settings"
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/40 transition-colors text-left border-t border-[#222226] mt-1 pt-2"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-3.5 h-3.5 text-purple-400" />
                          <span>Configurações & Token GitHub</span>
                        </div>
                        <span className="text-[9px] font-mono text-purple-400">PAT API</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Primary Action: New Submission */}
              <button
                id="btn-new-report-header"
                type="button"
                onClick={onNewReport}
                title="Criar Novo Relatório de Vulnerabilidade (Alt+N)"
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] uppercase tracking-wider px-2 sm:px-3 py-1.5 rounded-md transition-all font-bold shadow-sm flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Report</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>

            {/* Firebase Auth User Status / Login Widget */}
            <UserAuthWidget />

            {/* Wallet Balance (on Large screens) */}
            <div className="hidden 2xl:flex flex-col items-end text-right pl-1">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Bounty Balance</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-mono text-emerald-400 font-semibold">{formatCurrency(totalRewardedUSD, 'USD')}</span>
                <span className="text-[9px] text-zinc-500 font-mono">({formatCurrency(totalBRL, 'BRL')})</span>
              </div>
            </div>

            {/* Help / About Modal button */}
            {onOpenAbout && (
              <button
                id="btn-about-help-header"
                onClick={onOpenAbout}
                title="Central de Ajuda, Guia & Sobre os Dados Mock"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-[#121214] hover:bg-[#1b1b1e] border border-[#262628] text-zinc-400 hover:text-white transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {/* Hunter Avatar */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-emerald-500/30 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[10px] sm:text-xs font-mono text-zinc-300 font-bold">
                JH
              </div>
            </div>
          </div>

        </div>

        {/* Mobile & Tablet Navigation bar (visible on screens < 1024px) */}
        <div 
          id="mobile-nav-bar"
          role="tablist"
          aria-label="Navegação móvel principal"
          className="flex lg:hidden items-center py-2 px-1.5 sm:px-2 border-t border-[#1e1e24] bg-[#0c0c0f]/95 backdrop-blur-md overflow-x-auto touch-pan-x scroll-smooth no-scrollbar gap-1.5 md:gap-2 select-none"
        >
          {/* Dashboard Tab */}
          <button 
            ref={currentTab === 'dashboard' ? activeMobileTabRef : null}
            id="mobile-nav-dashboard"
            role="tab"
            aria-selected={currentTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')} 
            title="Ir para o Dashboard"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'dashboard' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${currentTab === 'dashboard' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Dashboard</span>
          </button>

          {/* Reports Tab */}
          <button 
            ref={currentTab === 'reports' ? activeMobileTabRef : null}
            id="mobile-nav-reports"
            role="tab"
            aria-selected={currentTab === 'reports'}
            onClick={() => onTabChange('reports')} 
            title="Relatórios de Vulnerabilidade"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'reports' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <FileText className={`w-4 h-4 shrink-0 ${currentTab === 'reports' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Reports</span>
            {searchQuery ? (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                  (reportsMatchingCount ?? 0) > 0
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-950/80 text-red-300 border-red-500/40'
                }`}
              >
                {reportsMatchingCount}
              </span>
            ) : activeReportsCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                {activeReportsCount}
              </span>
            ) : null}
          </button>

          {/* CVE-DB Tab */}
          <button 
            ref={currentTab === 'cve' ? activeMobileTabRef : null}
            id="mobile-nav-cve"
            role="tab"
            aria-selected={currentTab === 'cve'}
            onClick={() => onTabChange('cve')} 
            title="Base de Dados de CVEs e Exploits"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'cve' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Database className={`w-4 h-4 shrink-0 ${currentTab === 'cve' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>CVE-DB</span>
          </button>

          {/* Programs / Targets Tab */}
          <button 
            ref={currentTab === 'targets' ? activeMobileTabRef : null}
            id="mobile-nav-targets"
            role="tab"
            aria-selected={currentTab === 'targets'}
            onClick={() => onTabChange('targets')} 
            title="Programas e Alvos Bug Bounty"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'targets' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Target className={`w-4 h-4 shrink-0 ${currentTab === 'targets' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Programs</span>
          </button>

          {/* AppSec Tools Tab */}
          <button 
            ref={currentTab === 'tools' ? activeMobileTabRef : null}
            id="mobile-nav-tools"
            role="tab"
            aria-selected={currentTab === 'tools'}
            onClick={() => onTabChange('tools')} 
            title="Central de Ferramentas AppSec & DevSecOps (10 Módulos)"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'tools' 
                ? 'text-amber-300 font-bold bg-amber-500/15 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>AppSec</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              10
            </span>
          </button>

          {/* Threat Intel Tab */}
          <button 
            ref={currentTab === 'threat-intel' ? activeMobileTabRef : null}
            id="mobile-nav-threat-intel"
            role="tab"
            aria-selected={currentTab === 'threat-intel'}
            onClick={() => onTabChange('threat-intel')} 
            title="Threat Intelligence em Tempo Real"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'threat-intel' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Radio className={`w-4 h-4 shrink-0 ${currentTab === 'threat-intel' ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
            <span>Intel</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
              LIVE
            </span>
          </button>

          {/* Notifications Tab */}
          <button 
            ref={currentTab === 'notifications' ? activeMobileTabRef : null}
            id="mobile-nav-notifications"
            role="tab"
            aria-selected={currentTab === 'notifications'}
            onClick={() => onTabChange('notifications')} 
            title={`Notificações do Sistema (${unreadNotificationsCount} não lidas)`}
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'notifications' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Bell className={`w-4 h-4 shrink-0 ${unreadNotificationsCount > 0 ? 'text-rose-400' : currentTab === 'notifications' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Alertas</span>
            {unreadNotificationsCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono font-bold animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Sites & Platforms Tab */}
          <button 
            ref={currentTab === 'platforms' ? activeMobileTabRef : null}
            id="mobile-nav-platforms"
            role="tab"
            aria-selected={currentTab === 'platforms'}
            onClick={() => onTabChange('platforms')} 
            title="Plataformas de Bug Bounty & Ganhos"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'platforms' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <Globe className={`w-4 h-4 shrink-0 ${currentTab === 'platforms' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Sites</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              14
            </span>
          </button>

          {/* Library / Docs Tab */}
          <button 
            ref={currentTab === 'docs' ? activeMobileTabRef : null}
            id="mobile-nav-docs"
            role="tab"
            aria-selected={currentTab === 'docs'}
            onClick={() => onTabChange('docs')} 
            title="Biblioteca de Segurança, Guias e Metodologias"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide uppercase transition-all shrink-0 active:scale-95 ${
              currentTab === 'docs' 
                ? 'text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181d] border border-transparent'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${currentTab === 'docs' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Library</span>
          </button>
        </div>

      </div>
    </header>
  );
};

