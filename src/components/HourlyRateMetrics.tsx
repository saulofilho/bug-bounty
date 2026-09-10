import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Zap, 
  Award, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  Calculator, 
  Sliders, 
  Plus, 
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  BarChart2,
  RefreshCw
} from 'lucide-react';
import { VulnerabilityReport, Severity, PlatformName, TimelineEvent } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import { calculateHourlyRateMetrics, ReportHourlyStat } from '../utils/hourlyRateEngine';
import { StatusBadge } from './StatusBadge';

interface HourlyRateMetricsProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onAddTimelineEvent?: (reportId: string, event: Omit<TimelineEvent, 'id'>) => void;
}

export const HourlyRateMetrics: React.FC<HourlyRateMetricsProps> = ({
  reports,
  onSelectReport,
  onAddTimelineEvent
}) => {
  // State for controls and filters
  const [timeframe, setTimeframe] = useState<'ALL' | 30 | 90 | 180 | 365>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'BRL'>('USD');
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(true);
  const [isSimulatorExpanded, setIsSimulatorExpanded] = useState<boolean>(false);
  const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(15);
  const [usdToBrlRate, setUsdToBrlRate] = useState<number>(5.45);
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState<boolean>(false);
  const [logTimeReportId, setLogTimeReportId] = useState<string>('');
  const [logTimeHours, setLogTimeHours] = useState<number>(2);
  const [logTimeTitle, setLogTimeTitle] = useState<string>('Sessão de Pesquisa & Fuzzing');
  const [logTimeNotes, setLogTimeNotes] = useState<string>('Investigação de superfícies e validação de parâmetros.');

  // Calculate metrics using the timeline engine
  const metrics = useMemo(() => {
    return calculateHourlyRateMetrics(reports, {
      usdToBrlRate,
      platformFilter: selectedPlatform,
      severityFilter: selectedSeverity,
      timeframeDays: timeframe
    });
  }, [reports, usdToBrlRate, selectedPlatform, selectedSeverity, timeframe]);

  // Format currency according to selected mode
  const renderMoney = (usdVal: number, brlVal: number) => {
    if (currencyMode === 'BRL') {
      return formatCurrency(brlVal, 'BRL');
    }
    return formatCurrency(usdVal, 'USD');
  };

  // Format hourly rate display
  const renderHourlyRate = (usdVal: number, brlVal: number) => {
    if (currencyMode === 'BRL') {
      return `${formatCurrency(brlVal, 'BRL')} / h`;
    }
    return `${formatCurrency(usdVal, 'USD')} / h`;
  };

  // Handle logging time to a report's timeline
  const handleSaveLoggedTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTimeReportId || !onAddTimelineEvent || logTimeHours <= 0) return;

    onAddTimelineEvent(logTimeReportId, {
      date: new Date().toISOString().split('T')[0],
      title: logTimeTitle || 'Registro de Tempo no Cronograma',
      notes: `${logTimeNotes.trim()} (${logTimeHours}h investidas)`,
      type: 'note',
      hoursSpent: logTimeHours
    });

    setIsLogTimeModalOpen(false);
    setLogTimeNotes('');
    setLogTimeHours(2);
  };

  // Simulator calculations
  const weeklyEstimatedEarningsUSD = targetWeeklyHours * metrics.averageHourlyRateUSD;
  const monthlyEstimatedEarningsUSD = weeklyEstimatedEarningsUSD * 4.33;
  const monthlyEstimatedEarningsBRL = monthlyEstimatedEarningsUSD * usdToBrlRate;

  return (
    <div id="hourly-rate-metrics-card" className="bg-[#0a0a0a] border border-[#262626] rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
      
      {/* Top Banner & Title Section */}
      <div className="p-5 sm:p-6 border-b border-[#262626] bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-semibold">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bug Bounty Hourly Yield Engine</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[10px] font-mono">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>Baseado no Cronograma de Eventos</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight flex items-center gap-2">
              <span>Valor por Hora Trabalhada</span>
              <span className="text-xs font-mono font-normal text-zinc-400">
                (Recompensas ÷ Tempo Investido)
              </span>
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Métrica de retorno sobre investimento de tempo (ROI) calculada agregando as recompensas financeiras recebidas e as horas de recon, exploração, relatórios e retestes registradas nas etapas do cronograma.
            </p>
          </div>

          {/* Quick Action & Currency Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Currency Mode Toggle */}
            <div className="flex items-center bg-[#141414] border border-[#262626] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setCurrencyMode('USD')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  currencyMode === 'USD'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('BRL')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  currencyMode === 'BRL'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                BRL (R$)
              </button>
            </div>

            {/* Quick Log Time Action */}
            {onAddTimelineEvent && (
              <button
                type="button"
                onClick={() => {
                  const defaultRep = reports.find(r => r.status === 'REWARDED') || reports[0];
                  if (defaultRep) setLogTimeReportId(defaultRep.id);
                  setIsLogTimeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                title="Registrar horas de pesquisa em um relatório do cronograma"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Logar Horas</span>
              </button>
            )}
          </div>

        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-[#1f1f1f] flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Período:</span>
            </span>

            {(['ALL', 30, 90, 180, 365] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  timeframe === tf
                    ? 'bg-zinc-800 text-white border border-zinc-600 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {tf === 'ALL' ? 'Todo o Histórico' : `${tf}d`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Platform Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">Plataforma:</span>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-[#141414] border border-[#2b2b2b] text-zinc-300 text-xs rounded px-2.5 py-1 font-mono focus:border-emerald-500 outline-none"
              >
                <option value="ALL">Todas</option>
                <option value="HackerOne">HackerOne</option>
                <option value="Bugcrowd">Bugcrowd</option>
                <option value="Intigriti">Intigriti</option>
                <option value="YesWeHack">YesWeHack</option>
                <option value="Synack">Synack</option>
                <option value="Direct / VDP">Direct / VDP</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">Severidade:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-[#141414] border border-[#2b2b2b] text-zinc-300 text-xs rounded px-2.5 py-1 font-mono focus:border-emerald-500 outline-none"
              >
                <option value="ALL">Todas</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* KPI Highlight Cards Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#0a0a0a]">
        
        {/* HERO CARD: Average Hourly Rate */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#131b15] via-[#101512] to-[#0c0e0d] border border-emerald-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Valor Médio por Hora</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              {metrics.averageHourlyRateUSD > 100 ? 'Alto Retorno' : 'Ativo'}
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-3xl font-light text-white font-mono tracking-tight">
              {renderHourlyRate(metrics.averageHourlyRateUSD, metrics.averageHourlyRateBRL)}
            </h4>
            <p className="text-[11px] text-zinc-400 font-mono">
              {renderMoney(metrics.totalBountyUSD, metrics.totalBountyBRL)} ÷ {metrics.totalHoursInvested}h investidas
            </p>
          </div>

          {/* Market benchmark badge */}
          <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">vs. Consultoria Sênior:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.marketComparison.versusSeniorRatio}x mercado ($75/h)</span>
            </span>
          </div>
        </div>

        {/* Total Bounties Awarded */}
        <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-zinc-400">
                Recompensas Totais
              </span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>

            <h4 className="text-3xl font-light text-white font-mono tracking-tight">
              {renderMoney(metrics.totalBountyUSD, metrics.totalBountyBRL)}
            </h4>

            <p className="mt-1 text-[11px] text-zinc-400 font-mono">
              {metrics.rewardedReportsCount} vulnerabilidade(s) premiada(s)
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#222] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Média por Bug:</span>
            <span className="text-zinc-200 font-semibold">
              {renderMoney(metrics.averageBountyPerReportUSD, metrics.averageBountyPerReportUSD * usdToBrlRate)}
            </span>
          </div>
        </div>

        {/* Total Timeline Hours Invested */}
        <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-zinc-400">
                Horas no Cronograma
              </span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>

            <h4 className="text-3xl font-light text-sky-400 font-mono tracking-tight">
              {metrics.totalHoursInvested} <span className="text-base text-zinc-400">hrs</span>
            </h4>

            <p className="mt-1 text-[11px] text-zinc-400 font-mono">
              Média de {metrics.averageHoursPerReport}h por vulnerabilidade
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#222] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Eventos analisados:</span>
            <span className="text-sky-300 font-semibold">
              {metrics.reportStats.reduce((sum, r) => sum + r.timelineEventsCount, 0)} etapas
            </span>
          </div>
        </div>

        {/* Best Performing Bug (Highest Hourly ROI) */}
        <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-zinc-400">
                Maior Retorno / Hora
              </span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>

            {metrics.highestHourlyRateReport ? (
              <div className="space-y-1">
                <h4 className="text-2xl font-light text-emerald-400 font-mono tracking-tight">
                  {renderHourlyRate(
                    metrics.highestHourlyRateReport.hourlyRateUSD,
                    metrics.highestHourlyRateReport.hourlyRateBRL
                  )}
                </h4>
                <p className="text-xs text-zinc-300 font-medium truncate" title={metrics.highestHourlyRateReport.title}>
                  {metrics.highestHourlyRateReport.title}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {metrics.highestHourlyRateReport.target} • {metrics.highestHourlyRateReport.hoursSpent}h dedicadas
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono italic">
                Nenhum relatório com recompensa registrado no filtro.
              </p>
            )}
          </div>

          {metrics.highestHourlyRateReport && onSelectReport && (
            <div className="mt-3 pt-2.5 border-t border-[#222] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-500">{metrics.highestHourlyRateReport.reportId}</span>
              <button
                type="button"
                onClick={() => {
                  const r = reports.find(item => item.id === metrics.highestHourlyRateReport?.reportId);
                  if (r) onSelectReport(r);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Inspecionar</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Severity Yield Breakdown & Comparison Section */}
      <div className="px-5 sm:px-6 py-4 border-t border-b border-[#262626] bg-[#0d0d0d]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Rentabilidade por Severidade ($/Hora)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Comparativo de Retorno por Complexidade
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.severityBreakdown.map(sev => {
            const badge = getSeverityBadgeColor(sev.severity);
            const isTop = metrics.severityBreakdown[0]?.severity === sev.severity;

            return (
              <div 
                key={sev.severity}
                className={`p-3 rounded-lg border transition-all ${
                  isTop 
                    ? 'bg-[#141915] border-emerald-500/30 shadow-sm' 
                    : 'bg-[#121212] border-[#262626]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${badge.bg} ${badge.text}`}>
                    {sev.severity}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {sev.reportsCount} bug(s) • {sev.totalHours}h
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-light font-mono text-white">
                    {renderHourlyRate(sev.hourlyRateUSD, sev.hourlyRateBRL)}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {renderMoney(sev.totalBountyUSD, sev.totalBountyUSD * usdToBrlRate)}
                  </span>
                </div>

                {/* Relative yield bar */}
                <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, Math.max(10, metrics.averageHourlyRateUSD > 0 ? (sev.hourlyRateUSD / (metrics.highestHourlyRateReport?.hourlyRateUSD || metrics.averageHourlyRateUSD)) * 100 : 0))}%` 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Time & Target Simulator (Expandable) */}
      <div className="border-b border-[#262626] bg-[#0c0c0c]">
        <button
          type="button"
          onClick={() => setIsSimulatorExpanded(!isSimulatorExpanded)}
          className="w-full px-5 sm:px-6 py-3.5 flex items-center justify-between text-left hover:bg-[#121212] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
              Simulador de Metas & Projeção com base na sua Taxa Horária Real
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Interativo
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-xs font-mono hidden sm:inline">
              {isSimulatorExpanded ? 'Ocultar Simulador' : 'Configurar Horas Semanais'}
            </span>
            {isSimulatorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isSimulatorExpanded && (
          <div className="px-5 sm:px-6 pb-6 pt-2 space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-[#141414] border border-[#2b2b2b] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200 font-mono uppercase">
                    Dedicação Semanal Alvo:
                  </label>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {targetWeeklyHours} horas / semana
                  </span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={targetWeeklyHours}
                  onChange={(e) => setTargetWeeklyHours(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>2h (Casual / Weekend)</span>
                  <span>15h (Part-time Consistente)</span>
                  <span>40h (Full-time Hunter)</span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Considerando sua taxa horária verificada no cronograma de <strong className="text-white font-mono">{renderHourlyRate(metrics.averageHourlyRateUSD, metrics.averageHourlyRateBRL)}</strong>, este é o potencial financeiro projetado com consistência:
                </p>
              </div>

              <div className="md:col-span-5 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333] space-y-1">
                  <span className="text-[10px] uppercase font-mono text-zinc-400">Ganhos / Semana</span>
                  <p className="text-xl font-light text-white font-mono">
                    {renderMoney(weeklyEstimatedEarningsUSD, weeklyEstimatedEarningsUSD * usdToBrlRate)}
                  </p>
                  <span className="text-[9px] text-zinc-500 font-mono">({targetWeeklyHours}h × {formatCurrency(metrics.averageHourlyRateUSD, 'USD')})</span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Projeção Mensal</span>
                  <p className="text-xl font-light text-emerald-300 font-mono">
                    {renderMoney(monthlyEstimatedEarningsUSD, monthlyEstimatedEarningsBRL)}
                  </p>
                  <span className="text-[9px] text-emerald-500/80 font-mono">~4.33 semanas / mês</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Detailed Table of Rewarded Reports & Timeline Hours Breakdown */}
      <div className="p-5 sm:p-6 bg-[#0a0a0a]">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
              Detalhamento de Rentabilidade por Relatório ({metrics.reportStats.length} Achados Premiados)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="px-3 py-1 bg-[#141414] hover:bg-[#1a1a1a] text-zinc-400 hover:text-zinc-200 rounded border border-[#2b2b2b] text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <span>{isTableExpanded ? 'Recolher Tabela' : 'Expandir Tabela'}</span>
              {isTableExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isTableExpanded && (
          <div className="overflow-x-auto border border-[#262626] rounded-xl bg-[#0f0f0f]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#141414] text-[10px] uppercase text-zinc-400 font-mono font-semibold border-b border-[#262626]">
                <tr>
                  <th className="px-4 py-3">Relatório & Alvo</th>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Recompensa</th>
                  <th className="px-4 py-3">Horas no Cronograma</th>
                  <th className="px-4 py-3">Valor por Hora ($/h)</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[#222]">
                {metrics.reportStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono italic">
                      Nenhum relatório premiado encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  metrics.reportStats.map((stat, idx) => {
                    const sevBadge = getSeverityBadgeColor(stat.severity);
                    const originalReport = reports.find(r => r.id === stat.reportId);

                    return (
                      <tr 
                        key={stat.reportId}
                        className="hover:bg-[#161616] transition-colors"
                      >
                        {/* Report & Target */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 max-w-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-zinc-400 font-bold">
                                {stat.reportId}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                                {stat.platform}
                              </span>
                            </div>
                            <p 
                              onClick={() => originalReport && onSelectReport && onSelectReport(originalReport)}
                              className="font-medium text-zinc-200 hover:text-emerald-400 cursor-pointer truncate transition-colors text-xs"
                              title={stat.title}
                            >
                              {stat.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              Alvo: {stat.target}
                            </p>
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sevBadge.bg} ${sevBadge.text}`}>
                            {stat.severity}
                          </span>
                        </td>

                        {/* Bounty Awarded */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          <span className="text-emerald-400 font-semibold">
                            {renderMoney(stat.bountyAmount, stat.bountyAmount * usdToBrlRate)}
                          </span>
                        </td>

                        {/* Hours in Timeline */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-sky-400" />
                              <span className="text-zinc-200 font-bold">{stat.hoursSpent}h</span>
                              {stat.isExplicitHours ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Registrado
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400" title="Estimativa baseada nas etapas do cronograma">
                                  Etapas ({stat.timelineEventsCount})
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {stat.timelineEventsCount} evento(s) na timeline
                            </span>
                          </div>
                        </td>

                        {/* Hourly Rate */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          <div className="space-y-0.5">
                            <span className={`text-sm font-bold ${
                              stat.hourlyRateUSD >= 250 
                                ? 'text-emerald-400' 
                                : stat.hourlyRateUSD >= 100 
                                  ? 'text-sky-300' 
                                  : 'text-zinc-300'
                            }`}>
                              {renderHourlyRate(stat.hourlyRateUSD, stat.hourlyRateBRL)}
                            </span>
                            <div>
                              {stat.hourlyRateUSD >= 250 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                  Super ROI
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onAddTimelineEvent && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLogTimeReportId(stat.reportId);
                                  setIsLogTimeModalOpen(true);
                                }}
                                className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-zinc-300 hover:text-white rounded border border-[#333] text-[11px] font-mono transition-colors"
                                title="Adicionar sessão de tempo neste cronograma"
                              >
                                + Horas
                              </button>
                            )}

                            {originalReport && onSelectReport && (
                              <button
                                type="button"
                                onClick={() => onSelectReport(originalReport)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 text-[11px] font-mono transition-colors flex items-center gap-1"
                              >
                                <span>Ver</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Quick Time Logging Modal */}
      {isLogTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-[#2b2b2b] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase font-mono">
                  Registrar Horas no Cronograma
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsLogTimeModalOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleSaveLoggedTime} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">
                  Relatório Alvo:
                </label>
                <select
                  value={logTimeReportId}
                  onChange={(e) => setLogTimeReportId(e.target.value)}
                  className="w-full bg-[#171717] border border-[#2b2b2b] text-zinc-200 rounded p-2 font-mono outline-none focus:border-emerald-500"
                  required
                >
                  {reports.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.id}] {r.title.slice(0, 45)}... ({formatCurrency(r.bountyAmount || 0, 'USD')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">
                    Horas Investidas:
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="100"
                    value={logTimeHours}
                    onChange={(e) => setLogTimeHours(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#171717] border border-[#2b2b2b] text-zinc-200 rounded p-2 font-mono outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono mb-1">
                    Data da Sessão:
                  </label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[#171717] border border-[#2b2b2b] text-zinc-200 rounded p-2 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">
                  Título da Etapa no Cronograma:
                </label>
                <input
                  type="text"
                  value={logTimeTitle}
                  onChange={(e) => setLogTimeTitle(e.target.value)}
                  placeholder="Ex: Fuzzing e desenvolvimento de PoC"
                  className="w-full bg-[#171717] border border-[#2b2b2b] text-zinc-200 rounded p-2 font-sans outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">
                  Notas / Detalhes da Pesquisa:
                </label>
                <textarea
                  value={logTimeNotes}
                  onChange={(e) => setLogTimeNotes(e.target.value)}
                  rows={3}
                  placeholder="Descreva as técnicas, ferramentas e endpoints testados..."
                  className="w-full bg-[#171717] border border-[#2b2b2b] text-zinc-200 rounded p-2 font-sans outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-[#222] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogTimeModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono uppercase tracking-wider transition-colors shadow-sm"
                >
                  Salvar no Cronograma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
