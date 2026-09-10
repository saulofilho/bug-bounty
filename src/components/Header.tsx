import React, { useRef, useEffect, useState } from 'react';
import { 
  ShieldAlert, 
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
  Globe
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export type NavTab = 'dashboard' | 'reports' | 'cve' | 'targets' | 'docs' | 'platforms';

export interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onNewReport: () => void;
  onOpenAddTarget?: () => void;
  onOpenPgp?: () => void;
  onOpenAbout?: () => void;
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
  onOpenAbout,
  totalRewardedUSD,
  activeReportsCount,
  searchQuery,
  onSearchChange,
  reportsMatchingCount
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const usdToBrlRate = 5.45;
  const totalBRL = totalRewardedUSD * usdToBrlRate;

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
  }, [onOpenAddTarget, onOpenPgp, onNewReport, isQuickMenuOpen]);

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
        <div className="flex lg:hidden items-center justify-between sm:justify-around py-2 border-t border-[#1e1e22] text-[10px] font-medium uppercase tracking-wider text-zinc-400 overflow-x-auto no-scrollbar gap-1 px-1.5">
          <button 
            onClick={() => onTabChange('dashboard')} 
            className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md transition-colors shrink-0 ${
              currentTab === 'dashboard' 
                ? 'text-emerald-400 font-bold bg-emerald-500/10' 
                : 'hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => onTabChange('reports')} 
            className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md transition-colors relative shrink-0 ${
              currentTab === 'reports' 
                ? 'text-emerald-400 font-bold bg-emerald-500/10' 
                : 'hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4 mb-0.5" />
            <span className="flex items-center gap-1">
              <span>Reports</span>
              {activeReportsCount > 0 && (
                <span className="text-[9px] px-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  {activeReportsCount}
                </span>
              )}
            </span>
          </button>
          <button 
            onClick={() => onTabChange('cve')} 
            className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md transition-colors shrink-0 ${
              currentTab === 'cve' 
                ? 'text-emerald-400 font-bold bg-emerald-500/10' 
                : 'hover:text-zinc-200'
            }`}
          >
            <Database className="w-4 h-4 mb-0.5" />
            <span>CVE-DB</span>
          </button>
          <button 
            onClick={() => onTabChange('targets')} 
            className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md transition-colors shrink-0 ${
              currentTab === 'targets' 
                ? 'text-emerald-400 font-bold bg-emerald-500/10' 
                : 'hover:text-zinc-200'
            }`}
          >
            <Target className="w-4 h-4 mb-0.5" />
            <span>Programs</span>
          </button>
          <button 
            onClick={() => onTabChange('docs')} 
            className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md transition-colors shrink-0 ${
              currentTab === 'docs' 
                ? 'text-emerald-400 font-bold bg-emerald-500/10' 
                : 'hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span>Library</span>
          </button>
          <button 
            onClick={() => onTabChange('platforms')} 
            className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded-md transition-colors relative shrink-0 ${
              currentTab === 'platforms' 
                ? 'text-emerald-400 font-bold bg-emerald-500/10' 
                : 'hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4 mb-0.5" />
            <span className="flex items-center gap-1">
              <span>Sites</span>
              <span className="text-[9px] px-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">14</span>
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};

