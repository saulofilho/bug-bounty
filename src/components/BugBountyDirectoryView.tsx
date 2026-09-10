import React, { useState, useMemo } from 'react';
import {
  Globe,
  ExternalLink,
  DollarSign,
  ShieldCheck,
  BookOpen,
  TrendingUp,
  Target,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Zap,
  Clock,
  ShieldAlert,
  ChevronRight,
  Calculator,
  Compass,
  FileCode,
  Key,
  Flame,
  X
} from 'lucide-react';
import {
  BUG_BOUNTY_PLATFORMS,
  MONETIZATION_ROADMAP,
  BUG_BOUNTY_TUTORIAL,
  BountyPlatform
} from '../data/bugBountyPlatformsData';
import { VulnerabilityReport } from '../types';
import { formatCurrency } from '../utils/formatters';

interface BugBountyDirectoryViewProps {
  reports?: VulnerabilityReport[];
  onNavigateToReports?: () => void;
  onSelectPlatformFilter?: (platformName: string) => void;
  compactMode?: boolean;
}

export const BugBountyDirectoryView: React.FC<BugBountyDirectoryViewProps> = ({
  reports = [],
  onNavigateToReports,
  onSelectPlatformFilter,
  compactMode = false
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'directory' | 'tutorial' | 'monetization' | 'calculator'>('directory');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlatformModal, setSelectedPlatformModal] = useState<BountyPlatform | null>(null);
  const [selectedTutorialStep, setSelectedTutorialStep] = useState<number>(1);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Income Calculator States
  const [monthlyTargetUSD, setMonthlyTargetUSD] = useState<number>(2500);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(15);
  const [hackerLevel, setHackerLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const usdToBrlRate = 5.45;

  // Real bounties earned in app
  const currentEarnedUSD = useMemo(() => {
    return reports
      .filter(r => r.status === 'REWARDED' || r.bountyAmount > 0)
      .reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
  }, [reports]);

  // Filtered platforms
  const filteredPlatforms = useMemo(() => {
    return BUG_BOUNTY_PLATFORMS.filter(platform => {
      const matchesCategory = selectedCategory === 'ALL' || platform.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        platform.name.toLowerCase().includes(q) ||
        platform.description.toLowerCase().includes(q) ||
        platform.headquarters.toLowerCase().includes(q) ||
        platform.targetFocus.some(t => t.toLowerCase().includes(q)) ||
        platform.payoutMethods.some(p => p.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const categories = [
    { id: 'ALL', label: 'Todas as Plataformas', count: BUG_BOUNTY_PLATFORMS.length },
    { id: 'Global Leader', label: 'Líderes Globais (H1, BC)', count: BUG_BOUNTY_PLATFORMS.filter(p => p.category === 'Global Leader').length },
    { id: 'European Leader', label: 'Líderes Europa (EUR)', count: BUG_BOUNTY_PLATFORMS.filter(p => p.category === 'European Leader').length },
    { id: 'Web3 & DeFi', label: 'Web3 & Smart Contracts', count: BUG_BOUNTY_PLATFORMS.filter(p => p.category === 'Web3 & DeFi').length },
    { id: 'Big Tech Direct', label: 'Programas Big Tech', count: BUG_BOUNTY_PLATFORMS.filter(p => p.category === 'Big Tech Direct').length },
    { id: 'Private Red Team', label: 'Red Team Fechada', count: BUG_BOUNTY_PLATFORMS.filter(p => p.category === 'Private Red Team').length },
    { id: 'Beginner Friendly', label: 'Iniciantes & VDP', count: BUG_BOUNTY_PLATFORMS.filter(p => p.category === 'Beginner Friendly').length }
  ];

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Calculator computations
  const calcResults = useMemo(() => {
    const monthlyTargetBRL = monthlyTargetUSD * usdToBrlRate;
    const hoursPerMonth = hoursPerWeek * 4.3;

    // Average values based on level
    const avgLow = 150;
    const avgMed = 600;
    const avgHigh = 2200;
    const avgCrit = 6000;

    let plan = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      totalReports: 0,
      duplicateBuffer: 0,
      hourlyRateUSD: 0,
      hourlyRateBRL: 0
    };

    if (hackerLevel === 'beginner') {
      // Focus on Low and Medium
      const neededFromLow = Math.min(monthlyTargetUSD * 0.4, 400);
      const neededFromMed = monthlyTargetUSD - neededFromLow;
      plan.low = Math.max(1, Math.round(neededFromLow / avgLow));
      plan.medium = Math.max(1, Math.round(neededFromMed / avgMed));
      plan.high = monthlyTargetUSD > 2000 ? 1 : 0;
    } else if (hackerLevel === 'intermediate') {
      // Focus on Medium and High
      const highCount = Math.floor(monthlyTargetUSD / avgHigh);
      const remaining = monthlyTargetUSD - (highCount * avgHigh);
      plan.high = Math.max(1, highCount);
      plan.medium = Math.max(1, Math.round(remaining / avgMed));
      plan.low = 1;
    } else {
      // Expert: Focus on High and Critical
      const critCount = Math.floor(monthlyTargetUSD / avgCrit);
      const remaining = monthlyTargetUSD - (critCount * avgCrit);
      plan.critical = Math.max(monthlyTargetUSD >= 5000 ? 1 : 0, critCount);
      plan.high = Math.max(1, Math.round(remaining / avgHigh));
      plan.medium = 1;
    }

    plan.totalReports = plan.critical + plan.high + plan.medium + plan.low;
    plan.duplicateBuffer = Math.ceil(plan.totalReports * 0.3); // 30% average duplicate rate in the wild
    plan.hourlyRateUSD = Math.round(monthlyTargetUSD / (hoursPerMonth || 1));
    plan.hourlyRateBRL = Math.round(monthlyTargetBRL / (hoursPerMonth || 1));

    return {
      monthlyTargetBRL,
      hoursPerMonth: Math.round(hoursPerMonth),
      ...plan
    };
  }, [monthlyTargetUSD, hoursPerWeek, hackerLevel, usdToBrlRate]);

  return (
    <div id="bug-bounty-directory-hub" className="space-y-6">
      
      {/* Top Banner / Feature Card */}
      <div className="bg-gradient-to-r from-[#0d1612] via-[#0b100d] to-[#0a0a0a] border border-emerald-500/25 rounded-2xl p-5 sm:p-7 relative overflow-hidden shadow-2xl">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Guia Oficial de Bug Bounty
              </span>
              <span className="text-zinc-500 text-xs font-mono">• 14 Plataformas Mapeadas</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Diretório de Plataformas & Como Ganhar Dinheiro com Caça de Vulnerabilidades
            </h2>

            <p className="text-sm text-zinc-400 leading-relaxed">
              Catálogo completo das maiores plataformas mundiais (HackerOne, Bugcrowd, Intigriti, YesWeHack, Immunefi e Big Techs), tutoriais práticos de uso e o playbook definitivo para transformar falhas de segurança em renda regular em dólares e euros.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 font-mono">
            <div className="bg-[#121212]/90 border border-[#262626] p-3 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Bounties Máximos</span>
              <span className="text-emerald-400 font-bold text-lg sm:text-xl">$10.000.000</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Immunefi / Web3</span>
            </div>

            <div className="bg-[#121212]/90 border border-[#262626] p-3 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Moedas Aceitas</span>
              <span className="text-amber-400 font-bold text-lg sm:text-xl">USD • EUR • Crypto</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Wise, PayPal, ACH</span>
            </div>

            <div className="bg-[#121212]/90 border border-[#262626] p-3 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Seus Ganhos no App</span>
              <span className="text-white font-bold text-lg sm:text-xl">{formatCurrency(currentEarnedUSD, 'USD')}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">≈ {formatCurrency(currentEarnedUSD * usdToBrlRate, 'BRL')}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs inside the Hub */}
        <div className="mt-6 pt-5 border-t border-[#222] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeMainTab === 'directory'
                ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-[#161616] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#2a2a2a]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Diretório das Plataformas ({BUG_BOUNTY_PLATFORMS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('tutorial')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeMainTab === 'tutorial'
                ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-[#161616] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#2a2a2a]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tutorial Prático: Como Usar os Sites</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('monetization')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeMainTab === 'monetization'
                ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-[#161616] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#2a2a2a]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Guia de Monetização: Como Ganhar Dinheiro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('calculator')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeMainTab === 'calculator'
                ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-[#161616] text-zinc-300 hover:text-white hover:bg-[#222] border border-[#2a2a2a]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Simulador de Metas & Renda Hacker</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DIRECTORY OF PLATFORMS */}
      {activeMainTab === 'directory' && (
        <div className="space-y-5">
          {/* Filter Bar & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0a0a0a] border border-[#262626] p-4 rounded-xl">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, método de saque, foco (Web, Cloud, Smart Contract)..."
                className="w-full bg-[#141414] border border-[#2e2e2e] focus:border-emerald-500/50 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Platform Counter */}
            <div className="text-xs font-mono text-zinc-400 shrink-0 self-center">
              Mostrando <span className="text-emerald-400 font-bold">{filteredPlatforms.length}</span> de {BUG_BOUNTY_PLATFORMS.length} plataformas
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-[#111] text-zinc-400 hover:text-zinc-200 border border-[#262626]'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#202020] text-zinc-400">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlatforms.map((platform) => (
              <div
                key={platform.id}
                id={`platform-card-${platform.id}`}
                className="bg-[#0c0c0c] border border-[#242424] hover:border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-md hover:shadow-emerald-950/20"
              >
                <div>
                  {/* Top Bar: Category & Safe Harbor */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181818] text-zinc-400 border border-[#2e2e2e]">
                      {platform.category}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {platform.safeHarbor}
                    </span>
                  </div>

                  {/* Platform Title & Badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.badgeColor} text-white font-bold font-mono text-sm flex items-center justify-center shrink-0 shadow-md`}>
                      {platform.logoText}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {platform.name}
                        </h3>
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-emerald-400 transition-colors p-1"
                          title="Acessar site oficial"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{platform.tagline}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-3">
                    {platform.description}
                  </p>

                  {/* Bounty Range & Stats Box */}
                  <div className="p-3 rounded-lg bg-[#141414] border border-[#242424] space-y-2 mb-4 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Faixa de Bounties:</span>
                      <span className="text-emerald-400 font-bold">{platform.minBounty} – {platform.maxBounty}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Velocidade Triagem:</span>
                      <span className="text-zinc-300">{platform.triageSpeed}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Concorrência:</span>
                      <span className={`font-bold ${
                        platform.competitionLevel.includes('Alta')
                          ? 'text-amber-400'
                          : platform.competitionLevel.includes('Restrita')
                          ? 'text-purple-400'
                          : 'text-emerald-400'
                      }`}>
                        {platform.competitionLevel}
                      </span>
                    </div>
                  </div>

                  {/* Target Focus Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {platform.targetFocus.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181818] text-zinc-400 border border-[#2a2a2a]"
                      >
                        {tag}
                      </span>
                    ))}
                    {platform.targetFocus.length > 3 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 text-zinc-500">
                        +{platform.targetFocus.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-[#222] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span className="truncate max-w-[140px]">{platform.payoutMethods[0]}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlatformModal(platform)}
                    className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-emerald-500 hover:text-black text-zinc-200 text-xs font-semibold transition-all flex items-center gap-1 border border-[#333] hover:border-emerald-500"
                  >
                    <span>Guia & Dicas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: STEP-BY-STEP PRACTICAL TUTORIAL */}
      {activeMainTab === 'tutorial' && (
        <div className="space-y-6">
          
          {/* Header intro */}
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl p-5 space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Tutorial de Uso dos Sites de Bug Bounty: Do Cadastro ao Primeiro Saque
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Guia passo a passo com checklists de conformidade, configuração de headers HTTP de identificação ética no Burp Suite, regras de Safe Harbor e um modelo pronto de relatório com alta taxa de aceitação na triagem.
            </p>
          </div>

          {/* Steps Navigation Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {BUG_BOUNTY_TUTORIAL.map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setSelectedTutorialStep(item.step)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedTutorialStep === item.step
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-950/20'
                    : 'bg-[#101010] border-[#262626] text-zinc-400 hover:bg-[#161616] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#202020] text-emerald-400 font-bold">
                    Passo {item.step}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {item.category.split(' ')[0]}
                  </span>
                </div>
                <p className="text-xs font-semibold line-clamp-2">{item.title}</p>
              </button>
            ))}
          </div>

          {/* Active Tutorial Step Content */}
          {(() => {
            const currentStep = BUG_BOUNTY_TUTORIAL.find(s => s.step === selectedTutorialStep) || BUG_BOUNTY_TUTORIAL[0];
            return (
              <div className="bg-[#0c0c0c] border border-[#262626] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-4">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-wider">
                      Passo {currentStep.step} de 5 • {currentStep.category}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      {currentStep.title}
                    </h3>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-[#181818] border border-[#333] text-xs font-mono text-zinc-300">
                    Tutorial Prático
                  </span>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  {currentStep.summary}
                </p>

                {/* Details list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">
                    Checklist de Execução:
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentStep.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-[#141414] border border-[#242424]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-zinc-300 leading-relaxed">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code or Template Block (if available) */}
                {currentStep.codeOrTemplate && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-amber-400" />
                        Modelo / Template Copiável:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(currentStep.codeOrTemplate!, `step-${currentStep.step}`)}
                        className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
                      >
                        {copiedCodeId === `step-${currentStep.step}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCodeId === `step-${currentStep.step}` ? 'Copiado!' : 'Copiar Template'}</span>
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-[#070707] border border-[#2a2a2a] text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {currentStep.codeOrTemplate}
                    </pre>
                  </div>
                )}

                {/* Caution Notice Box */}
                {currentStep.cautionNotice && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-red-300 uppercase tracking-wider font-mono">
                        Atenção Crítica de Conformidade & Safe Harbor:
                      </h5>
                      <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
                        {currentStep.cautionNotice}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step navigation buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#222]">
                  <button
                    type="button"
                    disabled={currentStep.step === 1}
                    onClick={() => setSelectedTutorialStep(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2 rounded-lg bg-[#181818] hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none text-xs font-mono text-zinc-300 transition-all"
                  >
                    ← Passo Anterior
                  </button>

                  <span className="text-xs font-mono text-zinc-500">
                    {currentStep.step} de 5
                  </span>

                  <button
                    type="button"
                    disabled={currentStep.step === 5}
                    onClick={() => setSelectedTutorialStep(prev => Math.min(5, prev + 1))}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono font-bold text-black transition-all flex items-center gap-1"
                  >
                    <span>Próximo Passo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: MONETIZATION ROADMAP & PLAYBOOK */}
      {activeMainTab === 'monetization' && (
        <div className="space-y-6">
          
          {/* Header intro */}
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl p-5 space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              O Playbook de Monetização: Como Ganhar de $1.000 a $15.000+/mês com Bug Bounty
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O segredo dos melhores caçadores de recompensa não é rodar scanners automáticos, mas sim entender o funil de convites privados, especializar-se em classes de falhas de alto valor (IDOR, SSRF, Race Condition) e construir automação de reconhecimento contínuo.
            </p>
          </div>

          {/* Highlight Secret: Public vs Private Programs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm font-mono uppercase">
                <AlertTriangle className="w-4 h-4" />
                A Armadilha dos Programas Públicos
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Programas públicos de gigantes como Uber, Twitter e TikTok têm mais de <strong>20.000 hackers</strong> caçando simultaneamente. A chance de você encontrar um bug que ninguém viu é minúscula, resultando em <strong>90% de duplicatas</strong> e frustração.
              </p>
              <div className="text-[11px] font-mono text-red-300 bg-red-950/40 p-2.5 rounded border border-red-500/20">
                Resultado Comum: 20 relatórios enviados ➔ 18 duplicatas ➔ $0 recebidos.
              </div>
            </div>

            <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-mono uppercase">
                <Sparkles className="w-4 h-4" />
                O Segredo: Convites Privados (Private Programs)
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                As empresas gastam 80% do seu orçamento em programas privados fechados para apenas <strong>20 a 50 hackers convidados</strong>. O mar é azul: alvos novos, sem concorrência e pagamentos altos garantidos.
              </p>
              <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 p-2.5 rounded border border-emerald-500/20">
                Estratégia Vencedora: Faça 5 bugs em VDP ➔ Suba Signal ➔ Receba convites semanais.
              </div>
            </div>
          </div>

          {/* The 4 Phases Cards */}
          <div className="space-y-4">
            {MONETIZATION_ROADMAP.map((phase) => (
              <div
                key={phase.phase}
                id={`roadmap-phase-${phase.phase}`}
                className="bg-[#0c0c0c] border border-[#262626] rounded-2xl p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-lg flex items-center justify-center shrink-0">
                      0{phase.phase}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{phase.title}</h4>
                      <p className="text-xs text-zinc-400">{phase.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-[#181818] border border-[#333] text-zinc-300">
                      {phase.timeframe}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                      {phase.expectedEarningsUSD} ({phase.expectedEarningsBRL})
                    </span>
                  </div>
                </div>

                {/* Key Goal */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#242424] text-xs">
                  <span className="text-zinc-500 font-mono font-bold uppercase mr-2">Meta Principal:</span>
                  <span className="text-zinc-200 font-semibold">{phase.keyGoal}</span>
                </div>

                {/* Action Steps */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                    Passos de Ação Prática:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {phase.actionSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#101010] border border-[#222] text-xs text-zinc-300"
                      >
                        <span className="w-5 h-5 rounded bg-[#1c1c1c] text-emerald-400 flex items-center justify-center font-mono text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mistakes to avoid and Pro Tip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/25 space-y-1.5">
                    <span className="text-[11px] font-mono font-bold uppercase text-red-400 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      Erros para Evitar a Todo Custo:
                    </span>
                    <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                      {phase.mistakesToAvoid.map((mistake, mIdx) => (
                        <li key={mIdx} className="leading-relaxed">{mistake}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/25 space-y-1.5">
                    <span className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Dica de Especialista (Pro-Tip):
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {phase.proTip}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Vulnerability ROI Matrix Table */}
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Matriz de Retorno Financeiro (ROI das Vulnerabilidades)
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Quais classes de falhas pagam os maiores valores com menor tempo de exploração
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                HIGH ROI
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-zinc-400">
                    <th className="pb-2.5 font-semibold">Classe de Vulnerabilidade</th>
                    <th className="pb-2.5 font-semibold">Faixa Média de Pagamento</th>
                    <th className="pb-2.5 font-semibold">Dificuldade / Barreira</th>
                    <th className="pb-2.5 font-semibold">Taxa de Duplicata</th>
                    <th className="pb-2.5 font-semibold">Como Encontrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e] text-zinc-300">
                  <tr>
                    <td className="py-2.5 font-bold text-white">IDOR / BOLA em APIs</td>
                    <td className="py-2.5 text-emerald-400 font-bold">$1.500 – $8.000</td>
                    <td className="py-2.5 text-amber-400">Média</td>
                    <td className="py-2.5 text-emerald-400">Baixa (em APIs privadas)</td>
                    <td className="py-2.5 text-zinc-400 font-sans text-[11px]">Substituir IDs em endpoints /api/v2/</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-white">SSRF em Nuvem (AWS/GCP)</td>
                    <td className="py-2.5 text-emerald-400 font-bold">$3.000 – $25.000</td>
                    <td className="py-2.5 text-amber-400">Média-Alta</td>
                    <td className="py-2.5 text-emerald-400">Muito Baixa</td>
                    <td className="py-2.5 text-zinc-400 font-sans text-[11px]">Geradores de PDF, webhooks, importadores de URL</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-white">Race Condition (Concorrência)</td>
                    <td className="py-2.5 text-emerald-400 font-bold">$1.000 – $6.000</td>
                    <td className="py-2.5 text-emerald-400">Fácil (Turbo Intruder)</td>
                    <td className="py-2.5 text-emerald-400">Baixa</td>
                    <td className="py-2.5 text-zinc-400 font-sans text-[11px]">Cupons de desconto, saques e likes simultâneos</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-white">Account Takeover (ATO / OAuth)</td>
                    <td className="py-2.5 text-emerald-400 font-bold">$2.500 – $15.000</td>
                    <td className="py-2.5 text-red-400">Alta</td>
                    <td className="py-2.5 text-emerald-400">Muito Baixa</td>
                    <td className="py-2.5 text-zinc-400 font-sans text-[11px]">Bypass de fluxo de reset de senha e redirect URI</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-white">Smart Contract DeFi (Web3)</td>
                    <td className="py-2.5 text-purple-400 font-bold">$10.000 – $1.000.000+</td>
                    <td className="py-2.5 text-red-400">Muito Alta</td>
                    <td className="py-2.5 text-emerald-400">Raríssima</td>
                    <td className="py-2.5 text-zinc-400 font-sans text-[11px]">Auditoria manual de contratos Solidity/Rust na Immunefi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: INCOME & TARGET CALCULATOR */}
      {activeMainTab === 'calculator' && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl p-5 space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              Simulador de Metas & Renda Financeira com Bug Bounty
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Defina sua meta financeira mensal em dólares ou reais e calcule exatamente quantos relatórios válidos (Critical, High, Medium, Low) você precisa submeter, considerando margem de duplicatas e horas dedicadas por semana.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Input Controls Left Column */}
            <div className="lg:col-span-5 bg-[#0c0c0c] border border-[#262626] rounded-xl p-5 space-y-5">
              <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider border-b border-[#222] pb-3 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                Configurar Parâmetros de Meta
              </h4>

              {/* Monthly Goal Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-400">Meta Mensal Desejada:</span>
                  <span className="text-emerald-400 font-bold text-base">
                    ${monthlyTargetUSD.toLocaleString()} USD
                    <span className="text-zinc-400 text-xs ml-1 font-normal">
                      (≈ R$ {calcResults.monthlyTargetBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                    </span>
                  </span>
                </div>

                <input
                  type="range"
                  min="300"
                  max="15000"
                  step="100"
                  value={monthlyTargetUSD}
                  onChange={(e) => setMonthlyTargetUSD(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-[#222] h-2 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>$300 (Iniciante)</span>
                  <span>$3.000 (Médio)</span>
                  <span>$15.000+ (Elite)</span>
                </div>
              </div>

              {/* Weekly Dedication Hours */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-400">Dedicação Semanal:</span>
                  <span className="text-amber-400 font-bold text-base">
                    {hoursPerWeek} horas / semana
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-[#222] h-2 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>5h (Part-time casual)</span>
                  <span>20h (Foco semi-integral)</span>
                  <span>40h (Full-time Hunter)</span>
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 block">Nível de Experiência do Hunter:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setHackerLevel('beginner')}
                    className={`p-2.5 rounded-lg text-xs font-mono border text-center transition-all ${
                      hackerLevel === 'beginner'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#141414] border-[#262626] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Iniciante
                  </button>

                  <button
                    type="button"
                    onClick={() => setHackerLevel('intermediate')}
                    className={`p-2.5 rounded-lg text-xs font-mono border text-center transition-all ${
                      hackerLevel === 'intermediate'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#141414] border-[#262626] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Intermediário
                  </button>

                  <button
                    type="button"
                    onClick={() => setHackerLevel('expert')}
                    className={`p-2.5 rounded-lg text-xs font-mono border text-center transition-all ${
                      hackerLevel === 'expert'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#141414] border-[#262626] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Especialista
                  </button>
                </div>
              </div>

              {/* Current App Progress */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Progresso dos Seus Relatórios:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.min(100, Math.round((currentEarnedUSD / monthlyTargetUSD) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((currentEarnedUSD / monthlyTargetUSD) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Atual: {formatCurrency(currentEarnedUSD, 'USD')}</span>
                  <span>Meta: ${monthlyTargetUSD.toLocaleString()} USD</span>
                </div>
              </div>

            </div>

            {/* Simulation Results Output Right Column */}
            <div className="lg:col-span-7 bg-[#0c0c0c] border border-[#262626] rounded-xl p-5 space-y-5">
              <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider border-b border-[#222] pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Plano de Execução Recomendado (Mensal)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                  SIMULAÇÃO DINÂMICA
                </span>
              </h4>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-[#141414] border border-[#242424]">
                  <span className="text-[10px] text-zinc-500 block">Total de Bugs Válidos</span>
                  <span className="text-2xl font-bold text-white">{calcResults.totalReports}</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">relatórios aceitos</span>
                </div>

                <div className="p-3 rounded-lg bg-[#141414] border border-[#242424]">
                  <span className="text-[10px] text-zinc-500 block">Margem Duplicatas (+30%)</span>
                  <span className="text-2xl font-bold text-amber-400">+{calcResults.duplicateBuffer}</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">total: {calcResults.totalReports + calcResults.duplicateBuffer} submetidos</span>
                </div>

                <div className="p-3 rounded-lg bg-[#141414] border border-[#242424] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-500 block">Remuneração Efetiva/Hora</span>
                  <span className="text-2xl font-bold text-emerald-400">${calcResults.hourlyRateUSD}/h</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">≈ R$ {calcResults.hourlyRateBRL}/hora</span>
                </div>
              </div>

              {/* Breakdown of reports by severity */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                  Composição Ideal dos Relatórios no Mês:
                </span>

                <div className="space-y-2 font-mono text-xs">
                  {calcResults.critical > 0 && (
                    <div className="p-3 rounded-lg bg-[#151212] border border-red-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                          CRITICAL
                        </span>
                        <span className="text-zinc-200">{calcResults.critical} relatório(s) de impacto máximo</span>
                      </div>
                      <span className="text-red-400 font-bold">≈ $6.000 / bug</span>
                    </div>
                  )}

                  {calcResults.high > 0 && (
                    <div className="p-3 rounded-lg bg-[#151412] border border-orange-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold text-[10px]">
                          HIGH
                        </span>
                        <span className="text-zinc-200">{calcResults.high} relatório(s) (IDOR / SSRF / ATO)</span>
                      </div>
                      <span className="text-orange-400 font-bold">≈ $2.200 / bug</span>
                    </div>
                  )}

                  {calcResults.medium > 0 && (
                    <div className="p-3 rounded-lg bg-[#151512] border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                          MEDIUM
                        </span>
                        <span className="text-zinc-200">{calcResults.medium} relatório(s) (CSRF com impacto, Race Condition)</span>
                      </div>
                      <span className="text-amber-400 font-bold">≈ $600 / bug</span>
                    </div>
                  )}

                  {calcResults.low > 0 && (
                    <div className="p-3 rounded-lg bg-[#121417] border border-blue-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px]">
                          LOW
                        </span>
                        <span className="text-zinc-200">{calcResults.low} relatório(s) (Info Disclosure, Open Redirect)</span>
                      </div>
                      <span className="text-blue-400 font-bold">≈ $150 / bug</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Action Plan */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                  Recomendação Estratégica para Sua Meta:
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Para atingir <strong>${monthlyTargetUSD.toLocaleString()} USD (R$ {calcResults.monthlyTargetBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})</strong> dedicando <strong>{hoursPerWeek}h/semana</strong>, seu foco ideal é submeter cerca de <strong>{Math.ceil((calcResults.totalReports + calcResults.duplicateBuffer) / 4)} relatórios por semana</strong>. Alterne entre programas privados da <strong>HackerOne / Intigriti</strong> para evitar duplicatas e acelerar o pagamento.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* PLATFORM DETAIL MODAL */}
      {selectedPlatformModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-[#2e2e2e] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#222] pb-5">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedPlatformModal.badgeColor} text-white font-bold font-mono text-base flex items-center justify-center shrink-0 shadow-lg`}>
                  {selectedPlatformModal.logoText}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedPlatformModal.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {selectedPlatformModal.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedPlatformModal.tagline}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="p-1.5 rounded-lg bg-[#1a1a1a] text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#141414] border border-[#242424]">
                <span className="text-[10px] text-zinc-500 block">Faixa de Bounties</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedPlatformModal.minBounty} – {selectedPlatformModal.maxBounty}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#242424]">
                <span className="text-[10px] text-zinc-500 block">Velocidade Triagem</span>
                <span className="text-zinc-200 font-bold">{selectedPlatformModal.triageSpeed}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#242424]">
                <span className="text-[10px] text-zinc-500 block">Sede / Fundação</span>
                <span className="text-zinc-200">{selectedPlatformModal.headquarters} ({selectedPlatformModal.founded})</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#242424]">
                <span className="text-[10px] text-zinc-500 block">Métodos de Saque</span>
                <span className="text-amber-400 font-bold truncate block">{selectedPlatformModal.payoutMethods.join(', ')}</span>
              </div>
            </div>

            {/* Header requirement notification if exists */}
            {selectedPlatformModal.headerRequirement && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-300">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Header Obrigatório no Burp Suite: <strong>{selectedPlatformModal.headerRequirement}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedPlatformModal.headerRequirement!, 'modal-header')}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] hover:bg-amber-500/30 transition-all shrink-0"
                >
                  {copiedCodeId === 'modal-header' ? 'Copiado!' : 'Copiar Header'}
                </button>
              </div>
            )}

            {/* Step-by-Step for this platform */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">
                Como Começar no {selectedPlatformModal.name}:
              </h4>
              <div className="space-y-2">
                {selectedPlatformModal.howToStart.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#141414] border border-[#242424] text-xs text-zinc-300"
                  >
                    <span className="w-5 h-5 rounded bg-[#202020] text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips to make money on this specific platform */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Dicas para Faturar Alto no {selectedPlatformModal.name}:
              </h4>
              <div className="space-y-2">
                {selectedPlatformModal.howToEarnMoneyTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#141414] border border-amber-500/20 text-xs text-zinc-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-emerald-400 block">
                  Vantagens & Pontos Fortes:
                </span>
                <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                  {selectedPlatformModal.pros.map((p, idx) => (
                    <li key={idx} className="leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-[#2a2a2a] space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400 block">
                  Atenção & Limitações:
                </span>
                <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                  {selectedPlatformModal.cons.map((c, idx) => (
                    <li key={idx} className="leading-relaxed">{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#222]">
              <span className="text-xs font-mono text-zinc-400">
                Pagamentos: {selectedPlatformModal.payoutNotes}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={selectedPlatformModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <span>Acessar {selectedPlatformModal.name}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedPlatformModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-zinc-300 text-xs font-mono transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
