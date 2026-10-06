import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  PlayCircle,
  Trash2,
  Layers,
  GitBranch,
  Calculator,
  FileText,
  Target,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Database,
  Terminal,
  Radio,
  Lock,
  Cpu,
  Cloud,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  ExternalLink,
  Zap,
  Globe,
  Sliders,
  Award
} from 'lucide-react';
import { NavTab } from './Header';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export interface WelcomePageViewProps {
  onEnterTool: () => void;
  onExploreWithMock: () => void;
  onClearMockAndStartFresh: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenNewReport?: () => void;
  onOpenCvssCalculator?: () => void;
  isMockActive: boolean;
  reportsCount: number;
  targetsCount: number;
}

export const WelcomePageView: React.FC<WelcomePageViewProps> = ({
  onEnterTool,
  onExploreWithMock,
  onClearMockAndStartFresh,
  onNavigateTab,
  onOpenNewReport,
  onOpenCvssCalculator,
  isMockActive,
  reportsCount,
  targetsCount
}) => {
  const { isCloudConnected, currentUser, openLoginModal } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-300">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#121526] via-[#0d101d] to-[#0a0c16] border border-[#232942] p-6 sm:p-10 lg:p-12 shadow-2xl">
        {/* Glow lights behind hero */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Version and Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('welcome.badge', 'BugSentinel Platform v2.4.0')}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300">{t('welcome.badgeSub', 'AppSec Operations & Bug Bounty Management')}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t('welcome.hero.titlePrefix', 'Central de Operações para')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              {t('welcome.hero.titleHighlight', 'Security Researchers & Bug Bounty Hunters')}
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans max-w-3xl">
            {t('welcome.hero.desc', 'Uma estação de trabalho profissional para catalogar vulnerabilidades, calcular severidades com precisão matemática (CVSS v3.1 / v4.0), gerar relatórios executivos com inteligência artificial, simular riscos corporativos (FAIR) e sincronizar achados em tempo real na nuvem ou no GitHub.')}
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              type="button"
              id="btn-welcome-enter-dashboard"
              onClick={onEnterTool}
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono font-bold text-sm tracking-wide transition-all flex items-center gap-2.5 shadow-lg shadow-emerald-950/60 cursor-pointer group"
            >
              <LayoutDashboard className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>{t('welcome.hero.enterDashboard', 'Acessar a Ferramenta (Dashboard)')}</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              id="btn-welcome-hero-mock"
              onClick={onExploreWithMock}
              className="px-5 py-3.5 rounded-xl bg-[#161a2b] hover:bg-[#1e233b] active:scale-95 text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 font-mono font-semibold text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-cyan-400" />
              <span>{t('welcome.hero.exploreMock', 'Explorar com Dados Demonstrativos')}</span>
            </button>

            {!currentUser && (
              <button
                type="button"
                onClick={() => openLoginModal('general')}
                className="px-4 py-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-mono text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{t('welcome.hero.login', 'Login / Criar Conta')}</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#1e243a]">
            <div className="p-3 rounded-xl bg-[#0b0d18]/80 border border-[#1a1f33]">
              <span className="text-[11px] text-zinc-400 font-mono block">{t('welcome.metric.baseStatus', 'Status da Base:')}</span>
              <span className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isMockActive ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
                {isMockActive ? t('welcome.metric.mockActive', 'Mock Demonstrativo') : t('welcome.metric.mockClean', 'Ambiente Zerado')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0d18]/80 border border-[#1a1f33]">
              <span className="text-[11px] text-zinc-400 font-mono block">{t('welcome.metric.currentReports', 'Relatórios Atuais:')}</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                {reportsCount} {reportsCount === 1 ? t('welcome.metric.registered', 'cadastrado') : t('welcome.metric.registeredPlural', 'cadastrados')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0d18]/80 border border-[#1a1f33]">
              <span className="text-[11px] text-zinc-400 font-mono block">{t('welcome.metric.targets', 'Alvos & Programas:')}</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                {targetsCount} {targetsCount === 1 ? t('welcome.metric.program', 'programa') : t('welcome.metric.programPlural', 'programas')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0d18]/80 border border-[#1a1f33]">
              <span className="text-[11px] text-zinc-400 font-mono block">{t('welcome.metric.persistence', 'Persistência em Nuvem:')}</span>
              <span className="text-sm font-bold font-mono text-cyan-400 flex items-center gap-1.5 mt-0.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                {isCloudConnected ? t('welcome.metric.cloudConnected', 'Firebase Conectado') : t('welcome.metric.offline', 'Offline / Local')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DECISION CARDS: MOCK DEMO VS. CLEAN START (LOGIC OF MODAL EMBEDDED IN HOME PAGE) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>{t('welcome.mode.title', 'Como você deseja inicializar a plataforma?')}</span>
          </h2>
          <p className="text-sm text-zinc-400">
            {t('welcome.mode.desc', 'Você pode alternar entre uma demonstração completa pré-populada ou um espaço de trabalho 100% limpo a qualquer momento:')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Explore with Mock */}
          <div
            id="page-card-mock"
            className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
              isMockActive
                ? 'bg-gradient-to-b from-[#131b2e] to-[#0c101c] border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                : 'bg-[#0f111c] border-[#202538] hover:border-cyan-500/30'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('welcome.card.mockBadge', 'Recomendado para Primeira Visita')}</span>
                </span>
                {isMockActive && (
                  <span className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('welcome.card.activeNow', 'Ativo agora')}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <span>{t('welcome.card.mockTitle', 'Explorar com Dados Demonstrativos')}</span>
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                  {t('welcome.card.mockDesc', 'Inicie com relatórios realistas já cadastrados (BOLA/IDOR em APIs financeiras, XSS, CSRF), programas de bug bounty configurados, gráficos de recompensas preenchidos e timelines de auditoria.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs sm:text-sm text-zinc-300 pt-2 border-t border-[#1c2238]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{t('welcome.card.mockBullet1', 'Visualize todos os gráficos de evolução, matrizes 5x5 e simulações FAIR em funcionamento.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{t('welcome.card.mockBullet2', 'Teste o exportador em PDF Executivo, calculadora CVSS v3.1/v4.0 e assinatura PGP.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{t('welcome.card.mockBullet3', 'Zere ou recarregue a base de testes quando desejar com um clique.')}</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4">
              <button
                type="button"
                id="btn-home-explore-mock"
                onClick={onExploreWithMock}
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>{t('welcome.card.mockBtn', 'Carregar Demonstração & Entrar na Ferramenta')}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          {/* Card 2: Clear Mock and Start Fresh */}
          <div
            id="page-card-clean"
            className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
              !isMockActive
                ? 'bg-gradient-to-b from-[#1c141e] to-[#120e15] border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                : 'bg-[#0f111c] border-[#202538] hover:border-emerald-500/30'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('welcome.card.cleanBadge', 'Ambiente Limpo / Produção')}</span>
                </span>
                {!isMockActive && (
                  <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('welcome.card.activeNow', 'Ativo agora')}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-emerald-400" />
                  <span>{t('welcome.card.cleanTitle', 'Iniciar com Espaço 100% Zerado')}</span>
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                  {t('welcome.card.cleanDesc', 'Remove os dados simulados e deixa a aplicação completamente limpa, pronta para você cadastrar seus próprios programas corporativos e vulnerabilidades reais confidenciais.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs sm:text-sm text-zinc-300 pt-2 border-t border-[#1c2238]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t('welcome.card.cleanBullet1', 'Base com 0 relatórios e 0 alvos, pronta para uso pessoal ou em equipe.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t('welcome.card.cleanBullet2', 'Privacidade total: seus achados são sincronizados no seu próprio usuário no Firebase.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t('welcome.card.cleanBullet3', 'Possibilidade de restaurar os mocks a qualquer momento na central de configurações.')}</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4">
              <button
                type="button"
                id="btn-home-clear-clean"
                onClick={onClearMockAndStartFresh}
                className="w-full py-3 px-4 rounded-xl bg-[#141b1f] hover:bg-emerald-950/80 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/40 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-emerald-400" />
                <span>{t('welcome.card.cleanBtn', 'Limpar Mock & Entrar com Base Limpa')}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TOUR OF PLATFORM CAPABILITIES */}
      <section className="space-y-6 pt-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span>{t('welcome.modules.title', 'Módulos e Recursos Integrados')}</span>
          </h2>
          <p className="text-sm text-zinc-400">
            {t('welcome.modules.desc', 'Conheça as ferramentas disponíveis na plataforma e navegue diretamente para cada uma:')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card: Dashboard Operacional */}
          <div
            onClick={() => onNavigateTab('dashboard')}
            className="p-5 rounded-2xl bg-[#0f111a] hover:bg-[#141724] border border-[#1e2338] hover:border-emerald-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                {t('welcome.modules.dashTitle', 'Dashboard Operacional')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t('welcome.modules.dashDesc', 'Métricas de aceitação, evolução de recompensas ao longo do tempo (Recharts), matriz de risco 5x5 e linha do tempo de auditoria.')}
              </p>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <span>{t('welcome.modules.dashBtn', 'Abrir Dashboard')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card: Gestão de Relatórios */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="p-5 rounded-2xl bg-[#0f111a] hover:bg-[#141724] border border-[#1e2338] hover:border-emerald-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                {t('welcome.modules.reportsTitle', 'Relatórios de Vulnerabilidade')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t('welcome.modules.reportsDesc', 'Criação assistida por IA, passos de reprodução estruturados, exportação em PDF executivo, assinatura digital PGP e importação CSV.')}
              </p>
            </div>
            <div className="text-[11px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
              <span>{t('welcome.modules.reportsBtn', 'Ver Relatórios')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card: Suíte AppSec */}
          <div
            onClick={() => onNavigateTab('tools')}
            className="p-5 rounded-2xl bg-[#0f111a] hover:bg-[#141724] border border-[#1e2338] hover:border-amber-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Terminal className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                {t('welcome.modules.toolsTitle', 'Suíte AppSec (37 Ferramentas)')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t('welcome.modules.toolsDesc', 'BOLA/IDOR Matrix, Payload Obfuscator (XOR/B64), HTTP Smuggling (CL.TE), Sanitizador DLP de tokens, ReDoS Analyzer e mais.')}
              </p>
            </div>
            <div className="text-[11px] font-mono text-amber-400 font-semibold flex items-center gap-1">
              <span>{t('welcome.modules.toolsBtn', 'Explorar Ferramentas')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card: Threat Intelligence */}
          <div
            onClick={() => onNavigateTab('threat-intel')}
            className="p-5 rounded-2xl bg-[#0f111a] hover:bg-[#141724] border border-[#1e2338] hover:border-rose-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-rose-300 transition-colors">
                {t('welcome.modules.intelTitle', 'Threat Intelligence Global')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t('welcome.modules.intelDesc', 'Feed em tempo real com avisos oficiais da CISA, NVD e OWASP, além de notícias globais de exploração e ameaças em 0-day.')}
              </p>
            </div>
            <div className="text-[11px] font-mono text-rose-400 font-semibold flex items-center gap-1">
              <span>{t('welcome.modules.intelBtn', 'Acessar Threat Intel')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card: Calculadoras CVSS v3.1 & v4.0 */}
          <div
            onClick={() => onNavigateTab('cve')}
            className="p-5 rounded-2xl bg-[#0f111a] hover:bg-[#141724] border border-[#1e2338] hover:border-purple-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">
                {t('welcome.modules.cveTitle', 'CVE Explorer & CVSS Calculator')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t('welcome.modules.cveDesc', 'Cálculo de score base, temporal e ambiental segundo a especificação oficial FIRST.org, com busca em catálogo local e NVD.')}
              </p>
            </div>
            <div className="text-[11px] font-mono text-purple-400 font-semibold flex items-center gap-1">
              <span>{t('welcome.modules.cveBtn', 'Abrir CVE & CVSS')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card: Alvos e Programas */}
          <div
            onClick={() => onNavigateTab('targets')}
            className="p-5 rounded-2xl bg-[#0f111a] hover:bg-[#141724] border border-[#1e2338] hover:border-emerald-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                {t('welcome.modules.targetsTitle', 'Alvos, Escopos & 14 Plataformas')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t('welcome.modules.targetsDesc', 'Controle estrito de escopo (in-scope / out-of-scope), histórico por domínio e diretório de 14 plataformas com regras e limites.')}
              </p>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <span>{t('welcome.modules.targetsBtn', 'Gerenciar Alvos')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

        </div>
      </section>

      {/* 4. SECURITY & CLOUD ARCHITECTURE HIGHLIGHTS */}
      <section className="p-6 sm:p-8 rounded-2xl bg-[#0d0f19] border border-[#1e2236] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('welcome.arch.tag', 'Arquitetura Híbrida Segura')}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {t('welcome.arch.title', 'Persistência em Nuvem Firebase + Auto-Cura Local')}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            {t('welcome.arch.desc', 'Seus dados são protegidos por regras estritas de Attribute-Based Access Control no Firestore. Você pode trabalhar offline sem perder nada ou acessar de qualquer dispositivo conectando sua conta.')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={onEnterTool}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <span>{t('welcome.arch.btn', 'Ir para o Dashboard')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
