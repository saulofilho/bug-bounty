import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Shield,
  Target,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Filter,
  Search,
  ArrowUpRight,
  Zap,
  BarChart3,
  Layers,
  Scale,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Users
} from 'lucide-react';
import { VulnerabilityReport, PlatformName } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  ProgramBenchmark,
  ProgramRoiResult,
  calculateProgramRoi,
  BENCHMARK_PROGRAMS,
  computeUserTargetRoiBenchmarks,
  ScopeBreadth,
  CompetitionDensity,
  TriageSpeed
} from '../utils/programRoiEngine';

interface ProgramRoiCalculatorProps {
  reports: VulnerabilityReport[];
}

export const ProgramRoiCalculator: React.FC<ProgramRoiCalculatorProps> = ({ reports }) => {
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('ALL');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'roiScore' | 'hourlyYield' | 'avgCrit' | 'speed'>('roiScore');
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom Simulator State
  const [simName, setSimName] = useState('Novo Programa Alvo (SaaS / API)');
  const [simPlatform, setSimPlatform] = useState<PlatformName | 'Google VRP' | 'Immunefi' | 'YesWeHack' | 'Custom'>('HackerOne');
  const [simScope, setSimScope] = useState<ScopeBreadth>('WILDCARD');
  const [simCritPayout, setSimCritPayout] = useState<number>(4500);
  const [simHighPayout, setSimHighPayout] = useState<number>(2000);
  const [simMedPayout, setSimMedPayout] = useState<number>(800);
  const [simCompDensity, setSimCompDensity] = useState<CompetitionDensity>('MEDIUM');
  const [simTriageSpeed, setSimTriageSpeed] = useState<TriageSpeed>('FAST');
  const [simDuplicateRate, setSimDuplicateRate] = useState<number>(15);
  const [simAcceptanceRate, setSimAcceptanceRate] = useState<number>(90);
  const [simDaysToPay, setSimDaysToPay] = useState<number>(7);

  // User's own targets extracted from real reports
  const userTargetBenchmarks = useMemo(() => {
    return computeUserTargetRoiBenchmarks(reports);
  }, [reports]);

  // Combine static benchmarks + user target benchmarks
  const allPrograms = useMemo(() => {
    return [...BENCHMARK_PROGRAMS, ...userTargetBenchmarks];
  }, [userTargetBenchmarks]);

  // Custom simulated program calculation
  const customSimulatedResult = useMemo<ProgramRoiResult>(() => {
    const customBenchmark: ProgramBenchmark = {
      id: 'custom-simulation',
      name: simName || 'Simulador Customizado',
      platform: simPlatform,
      scopeBreadth: simScope,
      scopeDescription: 'Parâmetros definidos pelo pesquisador no simulador',
      avgCriticalPayout: simCritPayout,
      avgHighPayout: simHighPayout,
      avgMediumPayout: simMedPayout,
      totalBountiesPaidUSD: 500000,
      medianResolutionDays: simDaysToPay,
      acceptanceRatePct: simAcceptanceRate,
      duplicateRatePct: simDuplicateRate,
      competitionDensity: simCompDensity,
      triageSpeed: simTriageSpeed,
      isManaged: true,
      minBounty: 100,
      maxBounty: simCritPayout * 2
    };
    return calculateProgramRoi(customBenchmark);
  }, [
    simName,
    simPlatform,
    simScope,
    simCritPayout,
    simHighPayout,
    simMedPayout,
    simCompDensity,
    simTriageSpeed,
    simDuplicateRate,
    simAcceptanceRate,
    simDaysToPay
  ]);

  // Evaluated and ranked program results
  const rankedResults = useMemo(() => {
    const calculated = allPrograms.map(calculateProgramRoi);

    return calculated
      .filter(item => {
        const matchPlatform = selectedPlatformFilter === 'ALL' || item.program.platform === selectedPlatformFilter;
        const matchScope = selectedScopeFilter === 'ALL' || item.program.scopeBreadth === selectedScopeFilter;
        const matchSearch = item.program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.program.scopeDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.program.platform.toLowerCase().includes(searchQuery.toLowerCase());
        return matchPlatform && matchScope && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'roiScore') return b.roiScore - a.roiScore;
        if (sortBy === 'hourlyYield') return b.expectedHourlyYieldUSD - a.expectedHourlyYieldUSD;
        if (sortBy === 'avgCrit') return b.program.avgCriticalPayout - a.program.avgCriticalPayout;
        if (sortBy === 'speed') return a.program.medianResolutionDays - b.program.medianResolutionDays;
        return 0;
      });
  }, [allPrograms, selectedPlatformFilter, selectedScopeFilter, searchQuery, sortBy]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="program-roi-calculator-container" className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hunter Strategy & Opportunity Yield</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Calculadora de ROI por Programa</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Priorização de Plataformas & Retorno sobre Investimento (ROI)</span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              Analisa a relação entre <strong>recompensas históricas pagas ($)</strong> versus <strong>amplitude de cobertura e saturação de pesquisadores</strong>. Identifique quais programas oferecem o maior rendimento esperado por hora (<code className="text-emerald-300 font-mono text-xs">$/hora</code>) e menor fricção com duplicatas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-[#171822] border border-[#272a3b] p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-zinc-400 uppercase">Top Yield Identificado</div>
                <div className="text-sm font-bold font-mono text-emerald-300">
                  {rankedResults[0] ? `${rankedResults[0].program.name.slice(0, 20)}...` : 'Nenhum'}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {rankedResults[0] ? `$${rankedResults[0].expectedHourlyYieldUSD}/h estimado` : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Strategy Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#202230]">
          <div className="bg-[#171720]/80 p-3 rounded-xl border border-[#232532] space-y-0.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Programas Monitorados</span>
            <div className="text-lg font-bold font-mono text-white">{allPrograms.length}</div>
            <span className="text-[10px] text-zinc-500">{userTargetBenchmarks.length} alvos reais dos seus relatórios</span>
          </div>

          <div className="bg-[#171720]/80 p-3 rounded-xl border border-[#232532] space-y-0.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Média Yield de Mercado</span>
            <div className="text-lg font-bold font-mono text-emerald-400">
              ${Math.round(allPrograms.reduce((acc, p) => acc + calculateProgramRoi(p).expectedHourlyYieldUSD, 0) / Math.max(1, allPrograms.length))}/h
            </div>
            <span className="text-[10px] text-zinc-500">Retorno médio projetado</span>
          </div>

          <div className="bg-[#171720]/80 p-3 rounded-xl border border-[#232532] space-y-0.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Fator Crítico Principal</span>
            <div className="text-lg font-bold font-mono text-indigo-400">Escopo Aberto</div>
            <span className="text-[10px] text-zinc-500">Wildcards pagam 2.4x mais</span>
          </div>

          <div className="bg-[#171720]/80 p-3 rounded-xl border border-[#232532] space-y-0.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Maior Atrito de Pesquisa</span>
            <div className="text-lg font-bold font-mono text-rose-400">Saturação / Dups</div>
            <span className="text-[10px] text-zinc-500">Reduz yield em até 45%</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: Interactive Program Simulator */}
      {/* ========================================================================= */}
      <div className="bg-[#111218] border border-[#232738] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2230] pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Simulador Interativo: Avaliar Qualquer Programa ou Novo Alvo</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Insira os parâmetros de um programa novo ou privado para projetar instantaneamente o ROI e rendimento estimado por hora.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold self-start sm:self-auto">
            Simulação em Tempo Real
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Nome do Programa / Alvo</label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#262838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Plataforma Hospedeira</label>
                <select
                  value={simPlatform}
                  onChange={(e) => setSimPlatform(e.target.value as any)}
                  className="w-full bg-[#0a0a0f] border border-[#262838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 mt-1"
                >
                  <option value="HackerOne">HackerOne</option>
                  <option value="Bugcrowd">Bugcrowd</option>
                  <option value="Intigriti">Intigriti</option>
                  <option value="YesWeHack">YesWeHack</option>
                  <option value="Immunefi">Immunefi (DeFi / Web3)</option>
                  <option value="Google VRP">Google VRP</option>
                  <option value="Custom">Programa Privado Direto (VDP)</option>
                </select>
              </div>
            </div>

            {/* Scope Breadth & Competition */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Amplitude de Escopo</label>
                <select
                  value={simScope}
                  onChange={(e) => setSimScope(e.target.value as ScopeBreadth)}
                  className="w-full bg-[#0a0a0f] border border-[#262838] rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 mt-1"
                >
                  <option value="WILDCARD">Wildcard (*.dominio.com)</option>
                  <option value="MULTI_DOMAIN">Multi-Domínio Selecionado</option>
                  <option value="SINGLE_WEB">Web App Única</option>
                  <option value="MOBILE_APP">Aplicativos Mobile (iOS/Android)</option>
                  <option value="SMART_CONTRACT">Smart Contracts (Solidity)</option>
                  <option value="SOURCE_CODE">White-Box / Código Aberto</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Saturação de Hunters</label>
                <select
                  value={simCompDensity}
                  onChange={(e) => setSimCompDensity(e.target.value as CompetitionDensity)}
                  className="w-full bg-[#0a0a0f] border border-[#262838] rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 mt-1"
                >
                  <option value="LOW">Baixa (Programa Novo ou Privado)</option>
                  <option value="MEDIUM">Média (Padrão de Mercado)</option>
                  <option value="HIGH">Alta (Programa Popular)</option>
                  <option value="EXTREME">Extrema (Público de 5+ anos)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Velocidade de Triagem</label>
                <select
                  value={simTriageSpeed}
                  onChange={(e) => setSimTriageSpeed(e.target.value as TriageSpeed)}
                  className="w-full bg-[#0a0a0f] border border-[#262838] rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 mt-1"
                >
                  <option value="FAST">Rápida (1 a 4 dias)</option>
                  <option value="MODERATE">Moderada (5 a 14 dias)</option>
                  <option value="SLOW">Lenta (15 a 30 dias)</option>
                  <option value="VERY_SLOW">Muito Lenta (&gt; 30 dias)</option>
                </select>
              </div>
            </div>

            {/* Payouts Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d0e14] p-3.5 rounded-xl border border-[#1e2230]">
              <div>
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Payout Crítico:</span>
                  <span className="text-red-400 font-bold">${simCritPayout.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="250"
                  value={simCritPayout}
                  onChange={(e) => setSimCritPayout(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Payout Alto:</span>
                  <span className="text-orange-400 font-bold">${simHighPayout.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="10000"
                  step="100"
                  value={simHighPayout}
                  onChange={(e) => setSimHighPayout(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Payout Médio:</span>
                  <span className="text-amber-400 font-bold">${simMedPayout.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="4000"
                  step="50"
                  value={simMedPayout}
                  onChange={(e) => setSimMedPayout(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Simulation Verdict Card */}
          <div className="bg-[#141620] border border-[#2a2f44] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Score de Oportunidade</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${customSimulatedResult.tierColor.bg} ${customSimulatedResult.tierColor.text} ${customSimulatedResult.tierColor.border}`}>
                  {customSimulatedResult.tierLabel}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-white">
                  {customSimulatedResult.roiScore}
                </span>
                <span className="text-zinc-500 text-xs font-mono">/ 100 pontos</span>
              </div>

              {/* Yield Highlights */}
              <div className="p-3 bg-[#0a0b10] rounded-lg border border-[#202334] space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Rendimento Estimado:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ${customSimulatedResult.expectedHourlyYieldUSD} / hora
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Retorno em 10h de Hunting:</span>
                  <span className="text-white font-bold">
                    ${customSimulatedResult.expectedReturn10hUSD.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Ciclo Médio de Pagamento:</span>
                  <span className="text-zinc-300">
                    {customSimulatedResult.timeToPayoutDays} dias
                  </span>
                </div>
              </div>

              {/* Recommendation Note */}
              <div className="text-xs text-zinc-300 leading-relaxed bg-[#191b26] p-2.5 rounded-lg border border-[#262a3e]">
                <strong className="text-emerald-400">Parecer Estratégico: </strong>
                {customSimulatedResult.recommendation}
              </div>
            </div>

            <button
              type="button"
              id="btn-copy-sim-verdict"
              onClick={() => handleCopy('sim-verdict', `[SIMULAÇÃO ROI BUG BOUNTY]\nPrograma: ${simName}\nPlataforma: ${simPlatform}\nScore ROI: ${customSimulatedResult.roiScore}/100\nYield Estimado: $${customSimulatedResult.expectedHourlyYieldUSD}/h\nRetorno 10h: $${customSimulatedResult.expectedReturn10hUSD}\nRecomendação: ${customSimulatedResult.recommendation}`)}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              {copiedId === 'sim-verdict' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>Copiar Parecer do Programa</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: Filter & Controls Bar */}
      {/* ========================================================================= */}
      <div className="bg-[#121218] border border-[#22222f] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por programa, escopo ou domínio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#262838] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-zinc-400 uppercase text-[11px] font-bold">Ordenar por:</span>
            {(
              [
                { id: 'roiScore', label: 'Score ROI' },
                { id: 'hourlyYield', label: 'Yield ($/h)' },
                { id: 'avgCrit', label: 'Payout Crítico' },
                { id: 'speed', label: 'Velocidade' }
              ] as const
            ).map(s => (
              <button
                key={s.id}
                type="button"
                id={`sort-roi-${s.id}`}
                onClick={() => setSortBy(s.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                  sortBy === s.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-[#181824] text-zinc-400 hover:text-zinc-200 border border-[#242636]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Pills Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
          <span className="text-zinc-500 uppercase text-[10px] font-bold shrink-0">Plataforma:</span>
          {['ALL', 'HackerOne', 'Bugcrowd', 'Intigriti', 'YesWeHack', 'Immunefi', 'Google VRP'].map(p => (
            <button
              key={p}
              type="button"
              id={`filter-plat-${p}`}
              onClick={() => setSelectedPlatformFilter(p)}
              className={`px-3 py-1 rounded-lg text-xs font-mono shrink-0 transition-all cursor-pointer ${
                selectedPlatformFilter === p
                  ? 'bg-zinc-200 text-zinc-950 font-bold'
                  : 'bg-[#161622] text-zinc-400 hover:text-zinc-200 border border-[#262838]'
              }`}
            >
              {p === 'ALL' ? 'Todas as Plataformas' : p}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: Ranked Programs Leaderboard */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span>Exibindo {rankedResults.length} programas ranqueados por atratividade</span>
          <span>Clique em um programa para inspecionar fatores de risco & vantagens</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {rankedResults.map((item, index) => {
            const isExpanded = expandedProgramId === item.program.id;

            return (
              <div
                key={item.program.id}
                className="bg-[#12131b] border border-[#222534] rounded-xl overflow-hidden hover:border-[#2e334a] transition-all shadow-md"
              >
                {/* Card Main Row */}
                <div
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedProgramId(isExpanded ? null : item.program.id)}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Rank Position */}
                    <div className="w-8 h-8 rounded-lg bg-[#181a26] border border-[#272a3e] flex items-center justify-center font-mono font-bold text-xs text-zinc-300 shrink-0">
                      #{index + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold uppercase">
                          {item.program.platform}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {item.program.name}
                        </h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${item.tierColor.bg} ${item.tierColor.text} ${item.tierColor.border}`}>
                          {item.tierLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 flex-wrap">
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Target className="w-3 h-3 text-emerald-400" />
                          <span>{item.program.scopeDescription}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="text-zinc-400">
                          Resolução média: <strong className="text-white">{item.timeToPayoutDays} dias</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="text-zinc-400">
                          Taxa de Aceitação: <strong className="text-emerald-400">{item.program.acceptanceRatePct}%</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Summary Strip */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#1c1e2b]">
                    {/* Hourly Yield */}
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Yield Estimado</div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        ${item.expectedHourlyYieldUSD} <span className="text-xs font-normal text-zinc-500">/h</span>
                      </div>
                    </div>

                    {/* Critical Payout */}
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Méd. Crítico</div>
                      <div className="text-sm font-bold font-mono text-white">
                        ${item.program.avgCriticalPayout.toLocaleString()}
                      </div>
                    </div>

                    {/* ROI Score Badge */}
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">ROI Score</div>
                      <div className="text-xl font-black font-mono text-white">
                        {item.roiScore}<span className="text-xs font-normal text-zinc-500">/100</span>
                      </div>
                    </div>

                    {/* Expand Toggle */}
                    <div className="text-zinc-400 pl-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-[#1e2130] bg-[#0c0d14] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                      {/* Payout Tiers */}
                      <div className="p-3 bg-[#131520] rounded-xl border border-[#222638] space-y-2">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Faixas de Recompensa Padrão</span>
                        </div>
                        <div className="space-y-1.5 text-zinc-300">
                          <div className="flex justify-between">
                            <span className="text-red-400 font-semibold">Crítico (P1):</span>
                            <span className="font-bold">${item.program.avgCriticalPayout.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-orange-400 font-semibold">Alto (P2):</span>
                            <span className="font-bold">${item.program.avgHighPayout.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-400 font-semibold">Médio (P3):</span>
                            <span className="font-bold">${item.program.avgMediumPayout.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-[#1c1f2e] text-[11px] text-zinc-400">
                            <span>Pool Total Pago:</span>
                            <span className="text-white">${(item.program.totalBountiesPaidUSD / 1000).toFixed(0)}k USD</span>
                          </div>
                        </div>
                      </div>

                      {/* Friction & Risk Factors */}
                      <div className="p-3 bg-[#131520] rounded-xl border border-[#222638] space-y-2">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Fatores de Fricção & Concorrência</span>
                        </div>
                        <div className="space-y-1.5 text-zinc-300">
                          <div className="flex justify-between">
                            <span>Saturação Hunters:</span>
                            <span className={`font-bold ${
                              item.program.competitionDensity === 'LOW' ? 'text-emerald-400' :
                              item.program.competitionDensity === 'MEDIUM' ? 'text-blue-400' : 'text-rose-400'
                            }`}>
                              {item.program.competitionDensity}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risco de Duplicatas:</span>
                            <span className="font-bold text-amber-400">{item.program.duplicateRatePct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Velocidade de Triagem:</span>
                            <span className="font-bold text-emerald-400">{item.program.triageSpeed}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-[#1c1f2e] text-[11px] text-zinc-400">
                            <span>Triagem Gerenciada:</span>
                            <span className="text-white">{item.program.isManaged ? 'Sim (Triage Team)' : 'Direta'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pros & Recommendation */}
                      <div className="p-3 bg-[#131520] rounded-xl border border-[#222638] space-y-2">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Pontos Fortes & Estratégia</span>
                        </div>
                        <div className="space-y-1 text-[11px] text-zinc-300">
                          {item.pros.slice(0, 2).map((pro, pIdx) => (
                            <div key={pIdx} className="flex items-start gap-1.5 text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{pro}</span>
                            </div>
                          ))}
                          {item.cons.slice(0, 1).map((con, cIdx) => (
                            <div key={cIdx} className="flex items-start gap-1.5 text-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                              <span>{con}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Operational Recommendation Box */}
                    <div className="p-3 bg-[#151722] rounded-lg border border-[#272b3c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                      <div className="text-zinc-300">
                        <span className="font-bold text-emerald-400">Diretriz Tática: </span>
                        <span>{item.recommendation}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.program.id, `${item.program.name} | ROI Score: ${item.roiScore}/100 | Yield: $${item.expectedHourlyYieldUSD}/h | Escopo: ${item.program.scopeDescription}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === item.program.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copiar Resumo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
