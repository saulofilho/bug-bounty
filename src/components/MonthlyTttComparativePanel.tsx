import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Timer,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Calendar,
  BarChart3,
  Flame,
  Info,
  X,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import {
  calculateMonthlyTttComparative,
  MonthlyTttDataPoint,
  ReportTttData
} from '../utils/tttComparativeEngine';
import { getSeverityBadgeColor, getStatusBadgeColor, formatRelativeTimeAgo } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { BaseCard } from './BaseCard';

export interface MonthlyTttComparativePanelProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

type TimeframeOption = '6M' | '12M' | 'ALL';
type TimeUnit = 'hours' | 'days';
type GroupingMode = 'submission' | 'triage';

export const MonthlyTttComparativePanel: React.FC<MonthlyTttComparativePanelProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  className = ''
}) => {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('12M');
  const [unit, setUnit] = useState<TimeUnit>('hours');
  const [groupBy, setGroupBy] = useState<GroupingMode>('submission');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [slaTargetHours, setSlaTargetHours] = useState<number>(48);
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(true);

  // Compute comparative analysis
  const analysis = useMemo(() => {
    return calculateMonthlyTttComparative(reports, {
      timeframe,
      groupBy,
      filterPlatform: selectedPlatform,
      filterSeverity: selectedSeverity,
      slaTargetHours
    });
  }, [reports, timeframe, groupBy, selectedPlatform, selectedSeverity, slaTargetHours]);

  const {
    monthlyData,
    overallAvgTttHours,
    overallAvgTttDays,
    overallMedianTttHours,
    overallSlaUnder48hPercent,
    totalTriagedReports,
    totalSubmittedReports,
    bestMonth,
    worstMonth,
    latestMonth,
    latestMomDiffHours,
    latestMomDiffPercent,
    latestTrend,
    fastestPlatform,
    severityComparison
  } = analysis;

  // Selected month data for drill-down inspection
  const selectedMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    return monthlyData.find(m => m.monthKey === selectedMonthKey) || null;
  }, [monthlyData, selectedMonthKey]);

  // Extract all available platforms for the filter
  const allPlatforms = useMemo(() => {
    const set = new Set(reports.map(r => r.platform).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [reports]);

  // Prepare chart dataset
  const chartData = useMemo(() => {
    return monthlyData.map(m => {
      const avgValue = unit === 'hours' ? m.avgTttHours : m.avgTttDays;
      const medianValue = unit === 'hours' ? m.medianTttHours : m.medianTttDays;
      const slaTargetValue = unit === 'hours' ? slaTargetHours : Math.round((slaTargetHours / 24) * 10) / 10;

      return {
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        fullMonthLabel: m.fullMonthLabel,
        avgTtt: avgValue,
        medianTtt: medianValue,
        slaTarget: slaTargetValue,
        triagedCount: m.triagedCount,
        totalSubmitted: m.totalSubmitted,
        slaPercent: m.slaUnder48hPercent,
        trend: m.trend,
        momDiffPercent: m.momDiffPercent
      };
    });
  }, [monthlyData, unit, slaTargetHours]);

  // Format value label with unit
  const formatValueLabel = (hours: number, days?: number) => {
    if (unit === 'hours') {
      return `${hours}h`;
    }
    const d = days !== undefined ? days : Math.round((hours / 24) * 10) / 10;
    return `${d}d (${hours}h)`;
  };

  return (
    <section
      id="monthly-ttt-comparative-panel"
      aria-label="Painel Comparativo de Tempo até Triagem (TTT)"
      className={`space-y-4 font-sans ${className}`}
    >
      {/* Main Container Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c0d13] via-[#090a0f] to-[#0c0d14] border border-[#23263b] shadow-2xl p-4 sm:p-6 overflow-hidden relative">
        {/* Glow ambient background lights */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Panel Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 text-[11px] font-mono font-bold uppercase tracking-wider shadow-inner">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                <span>TTT • Time to Triaged</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{t('Histórico do Campo Timeline')}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[10px] font-mono">
                {totalTriagedReports} {t('triagens analisadas')} / {totalSubmittedReports} {t('submissões')}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{t('Painel Comparativo de Tempo de Triagem (TTT)')}</span>
              <span className="text-zinc-500 font-normal text-sm sm:text-base">•</span>
              <span className="text-indigo-400 font-semibold text-sm sm:text-base">
                {unit === 'hours' ? t('Evolução Mensal em Horas') : t('Evolução Mensal em Dias')}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-4xl">
              {t('Mede com exatidão o tempo decorrido entre o registro do evento de submissão na ')}
              <span className="text-zinc-200 font-mono">timeline</span>
              {t(' até o carimbo de confirmação e triagem (')}
              <span className="text-zinc-200 font-mono">status: TRIAGED</span>
              {t(') ao longo dos meses, revelando tendências de agilidade e conformidade com SLA.')}
            </p>
          </div>

          {/* Interactive Filters & Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Unit Toggle: Horas vs Dias */}
            <div className="flex items-center bg-[#13151f] rounded-lg p-0.5 border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setUnit('hours')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'hours'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('Horas (h)')}
              </button>
              <button
                type="button"
                onClick={() => setUnit('days')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'days'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('Dias (d)')}
              </button>
            </div>

            {/* Timeframe Toggle: 6M | 12M | ALL */}
            <div className="flex items-center bg-[#13151f] rounded-lg p-0.5 border border-zinc-800 text-xs font-mono">
              {(['6M', '12M', 'ALL'] as TimeframeOption[]).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-cyan-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Grouping Toggle: Coorte Submissão vs Mês de Triagem */}
            <div className="flex items-center bg-[#13151f] rounded-lg p-0.5 border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setGroupBy('submission')}
                title="Agrupar relatórios pelo mês em que foram submetidos (Análise de Coorte)"
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  groupBy === 'submission'
                    ? 'bg-zinc-700 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('Coorte Submissão')}
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('triage')}
                title="Agrupar relatórios pelo mês em que a triagem foi concluída"
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  groupBy === 'triage'
                    ? 'bg-zinc-700 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('Mês da Triagem')}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Row: Platform & Severity */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3 text-zinc-400" />
              <span>{t('Filtros:')}</span>
            </span>

            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={e => setSelectedPlatform(e.target.value)}
              className="bg-[#12141e] border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">{t('Todas as Plataformas')}</option>
              {allPlatforms.filter(p => p !== 'ALL').map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value as Severity | 'ALL')}
              className="bg-[#12141e] border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">{t('Todas as Severidades')}</option>
              <option value="CRITICAL">Critical (CVSS 9.0+)</option>
              <option value="HIGH">High (CVSS 7.0-8.9)</option>
              <option value="MEDIUM">Medium (CVSS 4.0-6.9)</option>
              <option value="LOW">Low (CVSS 0.1-3.9)</option>
            </select>

            {/* SLA Target Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800 text-zinc-400 font-mono text-[11px]">
              <span>{t('Meta SLA:')}</span>
              <select
                value={slaTargetHours}
                onChange={e => setSlaTargetHours(Number(e.target.value))}
                className="bg-[#12141e] border border-zinc-700 hover:border-zinc-500 text-emerald-400 text-xs rounded-lg px-2 py-0.5 font-mono focus:outline-none cursor-pointer"
              >
                <option value={24}>24h (1 dia)</option>
                <option value={48}>48h (2 dias - Padrão)</option>
                <option value={72}>72h (3 dias)</option>
                <option value={120}>120h (5 dias)</option>
              </select>
            </div>
          </div>

          {(selectedPlatform !== 'ALL' || selectedSeverity !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform('ALL');
                setSelectedSeverity('ALL');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>{t('Limpar Filtros')}</span>
            </button>
          )}
        </div>

        {/* Comparative Summary Metric Cards */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
          {/* Card 1: TTT Médio Atual / Último Mês */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121524] via-[#0e101b] to-[#121422] border border-indigo-500/30 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('TTT Médio Recente')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {latestMonth ? `${latestMonth.fullMonthLabel}` : '—'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white tabular-nums drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                  {latestMonth ? formatValueLabel(latestMonth.avgTttHours, latestMonth.avgTttDays) : '—'}
                </span>
              </div>

              {/* MoM Variation Badge */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono">
                {latestTrend === 'improving' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                    <span>{Math.abs(latestMomDiffPercent)}% {t('mais rápido (MoM)')}</span>
                  </span>
                ) : latestTrend === 'degrading' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                    <ArrowUpRight className="w-3 h-3 text-rose-400" />
                    <span>+{latestMomDiffPercent}% {t('mais lento (MoM)')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <Minus className="w-3 h-3" />
                    <span>{t('Estável vs mês anterior')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Média Geral Histórica & Mediana */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#10141a] via-[#0c1015] to-[#101319] border border-cyan-500/30 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('Média Geral Histórica')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {t('Período:')} {timeframe === 'ALL' ? t('Todo o Histórico') : `Últimos ${timeframe}`}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white tabular-nums drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  {formatValueLabel(overallAvgTttHours, overallAvgTttDays)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{t('Mediana:')} <strong className="text-cyan-300">{formatValueLabel(overallMedianTttHours)}</strong></span>
                <span className="text-zinc-500">{monthlyData.length} {t('meses avaliados')}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Mês Mais Rápido (Recorde de Agilidade) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1612] via-[#09110d] to-[#0c1410] border border-emerald-500/30 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('Melhor Mês Histórico')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {bestMonth ? bestMonth.fullMonthLabel : '—'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-emerald-300 tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  {bestMonth ? formatValueLabel(bestMonth.avgTttHours, bestMonth.avgTttDays) : '—'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="text-emerald-400 font-semibold">{bestMonth?.triagedCount || 0} {t('triagens no mês')}</span>
                <span className="text-zinc-500">{t('SLA:')} {bestMonth?.slaUnder48hPercent || 0}%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Conformidade SLA (< 48h) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#16121a] via-[#100d14] to-[#140e18] border border-purple-500/30 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('Conformidade SLA')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {t('Meta:')} &le; {slaTargetHours}h ({Math.round(slaTargetHours / 24)}d)
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-mono font-bold tabular-nums ${
                  overallSlaUnder48hPercent >= 80 ? 'text-emerald-300' : overallSlaUnder48hPercent >= 60 ? 'text-amber-300' : 'text-rose-400'
                }`}>
                  {overallSlaUnder48hPercent}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    overallSlaUnder48hPercent >= 80 ? 'bg-emerald-500' : overallSlaUnder48hPercent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${overallSlaUnder48hPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Chart Section: Recharts ComposedChart (Line + Bar + SLA ReferenceLine) */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>{t('Histórico Comparativo Mensal de TTT vs Meta de SLA')}</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {t('A linha contínua exibe o tempo médio de triagem (eixo esquerdo); as barras translúcidas indicam o volume de relatórios triados no mês (eixo direito).')}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-400 rounded" />
                <span>{t('TTT Médio')} ({unit === 'hours' ? 'h' : 'd'})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 border border-emerald-400 border-dashed rounded" />
                <span>{t('Meta SLA')} ({unit === 'hours' ? `${slaTargetHours}h` : `${Math.round(slaTargetHours / 24)}d`})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-cyan-500/40 border border-cyan-500/70 rounded-sm" />
                <span>{t('Volume')}</span>
              </div>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const mKey = e.activePayload[0].payload.monthKey;
                    setSelectedMonthKey((prev: string | null) => prev === mKey ? null : mKey);
                  }
                }}
              >
                <defs>
                  <linearGradient id="tttLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1f2233" strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="monthLabel"
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#27272a' }}
                />

                {/* Left Y Axis: TTT Duration */}
                <YAxis
                  yAxisId="left"
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => unit === 'hours' ? `${val}h` : `${val}d`}
                  tickLine={{ stroke: '#27272a' }}
                />

                {/* Right Y Axis: Report Volume */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val} rpt`}
                  tickLine={{ stroke: '#27272a' }}
                />

                {/* SLA Reference Line */}
                <ReferenceLine
                  yAxisId="left"
                  y={unit === 'hours' ? slaTargetHours : Math.round((slaTargetHours / 24) * 10) / 10}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `SLA (${slaTargetHours}h)`,
                    fill: '#10b981',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    position: 'insideTopRight'
                  }}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 rounded-xl bg-[#0c0e17] border border-indigo-500/40 shadow-2xl font-mono text-xs text-white space-y-1.5 min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                          <span className="font-bold text-indigo-300">{data.fullMonthLabel}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {data.triagedCount} {t('triados')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-zinc-400">{t('TTT Médio:')}</span>
                          <span className="text-white font-bold text-sm">
                            {unit === 'hours' ? `${data.avgTtt}h` : `${data.avgTtt}d`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">{t('Mediana:')}</span>
                          <span className="text-zinc-300">
                            {unit === 'hours' ? `${data.medianTtt}h` : `${data.medianTtt}d`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">{t('Conformidade SLA:')}</span>
                          <span className={data.slaPercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                            {data.slaPercent}%
                          </span>
                        </div>

                        {data.momDiffPercent !== 0 && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
                            <span className="text-zinc-400">{t('Variação MoM:')}</span>
                            <span className={data.momDiffPercent < 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {data.momDiffPercent > 0 ? `+${data.momDiffPercent}%` : `${data.momDiffPercent}%`}
                            </span>
                          </div>
                        )}

                        <div className="pt-1 text-[10px] text-zinc-500 italic text-center">
                          {t('Clique para detalhar relatórios deste mês')}
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Bars for Volume */}
                <Bar
                  yAxisId="right"
                  dataKey="triagedCount"
                  name={t('Relatórios Triados')}
                  fill="#06b6d4"
                  opacity={0.35}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.monthKey}`}
                      fill={entry.monthKey === selectedMonthKey ? '#818cf8' : '#06b6d4'}
                      opacity={entry.monthKey === selectedMonthKey ? 0.7 : 0.35}
                    />
                  ))}
                </Bar>

                {/* Line for Average TTT */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgTtt"
                  name={t('TTT Médio')}
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#0e101b' }}
                  activeDot={{ r: 7, fill: '#c7d2fe', strokeWidth: 3, stroke: '#6366f1' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selected Month Drill-Down Drawer / Inspector */}
        {selectedMonthData && (
          <div className="mt-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#111422] via-[#0d101a] to-[#121424] border border-indigo-500/50 shadow-2xl relative z-10 animate-fadeIn">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-white font-mono">
                      {selectedMonthData.fullMonthLabel}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold">
                      {selectedMonthData.triagedCount} {t('relatórios triados')}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      TTT Médio: <strong className="text-white">{formatValueLabel(selectedMonthData.avgTttHours, selectedMonthData.avgTttDays)}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {t('Detalhamento de carimbos de timeline dos relatórios do mês selecionado:')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMonthKey(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title={t('Fechar detalhamento')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reports List for Selected Month */}
            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {selectedMonthData.reports.map(rep => {
                const isUnderSla = (rep.tttHours || 0) <= slaTargetHours;
                const repColors = getSeverityBadgeColor(rep.severity);
                return (
                  <div
                    key={rep.reportId}
                    className="p-3 rounded-lg bg-[#0a0c14] border border-zinc-800 hover:border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold border ${repColors.bg} ${repColors.text} ${repColors.border}`}>
                          {rep.severity}
                        </span>
                        <span className="font-mono text-xs text-zinc-400">{rep.reportId}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-300 font-mono text-xs">{rep.platform}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400 font-mono text-[11px] truncate">{rep.target}</span>
                      </div>

                      <h5 className="font-medium text-white text-xs truncate max-w-2xl">
                        {rep.reportTitle}
                      </h5>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                        <span>{t('Submissão:')} {rep.submissionDate.split('T')[0]}</span>
                        {rep.triageDate && (
                          <span>{t('Triagem:')} {rep.triageDate.split('T')[0]}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono">
                      <div className="text-right">
                        <span className="text-xs font-bold text-white block">
                          {rep.tttHours !== null ? formatValueLabel(rep.tttHours, rep.tttDays || 0) : 'Pendente'}
                        </span>
                        <span className={`text-[10px] font-semibold ${isUnderSla ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUnderSla ? t('Dentro do SLA') : t('Acima do SLA')}
                        </span>
                      </div>

                      {onSelectReport && (
                        <button
                          type="button"
                          onClick={() => {
                            const fullReport = reports.find(r => r.id === rep.reportId);
                            if (fullReport) onSelectReport(fullReport);
                          }}
                          className="px-2.5 py-1 rounded bg-[#161a29] hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500 text-zinc-300 hover:text-white text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{t('Ver')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month-over-Month Comparative Table */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setIsTableExpanded(prev => !prev)}
              className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>{t('Tabela Comparativa Mês a Mês (MoM)')}</span>
              {isTableExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            <span className="text-[11px] font-mono text-zinc-500">
              {t('Clique em qualquer mês para filtrar a visualização')}
            </span>
          </div>

          {isTableExpanded && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0c12]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#10121c] border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">{t('Mês')}</th>
                    <th className="py-2.5 px-3">{t('Triagens')}</th>
                    <th className="py-2.5 px-3">{t('TTT Médio')}</th>
                    <th className="py-2.5 px-3">{t('Mediana')}</th>
                    <th className="py-2.5 px-3">{t('Variação MoM')}</th>
                    <th className="py-2.5 px-3">{t('SLA (< 48h)')}</th>
                    <th className="py-2.5 px-3">{t('Mais Rápido')}</th>
                    <th className="py-2.5 px-3 text-right">{t('Ação')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {monthlyData.map(month => {
                    const isSelected = month.monthKey === selectedMonthKey;
                    return (
                      <tr
                        key={month.monthKey}
                        onClick={() => setSelectedMonthKey(prev => prev === month.monthKey ? null : month.monthKey)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-950/30 text-white' : 'hover:bg-zinc-800/40 text-zinc-300'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            <span>{month.monthLabel}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px]">
                            {month.triagedCount} / {month.totalSubmitted}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {formatValueLabel(month.avgTttHours, month.avgTttDays)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400">
                          {formatValueLabel(month.medianTttHours, month.medianTttDays)}
                        </td>
                        <td className="py-2.5 px-3">
                          {month.trend === 'improving' ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                              <ArrowDownRight className="w-3 h-3" />
                              <span>{Math.abs(month.momDiffPercent)}%</span>
                            </span>
                          ) : month.trend === 'degrading' ? (
                            <span className="text-rose-400 font-bold flex items-center gap-0.5">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>+{month.momDiffPercent}%</span>
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            month.slaUnder48hPercent >= 80
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {month.slaUnder48hPercent}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400">
                          {month.minTttHours > 0 ? `${month.minTttHours}h` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMonthKey(prev => prev === month.monthKey ? null : month.monthKey);
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold text-[11px] underline cursor-pointer"
                          >
                            {isSelected ? t('Ocultar') : t('Detalhar')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Strategic Insights Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono relative z-10">
          {/* Priority Correlation Insight */}
          <div className="p-3.5 rounded-xl bg-[#0f111a] border border-zinc-800 space-y-1.5">
            <span className="text-indigo-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('Correlação Severidade x Tempo de Triagem')}</span>
            </span>
            <div className="space-y-1 pt-1">
              {severityComparison.map(s => {
                const sColors = getSeverityBadgeColor(s.severity);
                return (
                  <div key={s.severity} className="flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${sColors.text}`}>
                      {s.severity}
                    </span>
                    <span className="text-zinc-300">
                      {formatValueLabel(s.avgTttHours)} ({s.count} {t('relatórios')})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Efficiency Benchmark */}
          <div className="p-3.5 rounded-xl bg-[#0f111a] border border-zinc-800 space-y-1.5">
            <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('Eficiência por Plataforma no Período')}</span>
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {fastestPlatform ? (
                <>
                  {t('A plataforma mais ágil em resposta de triagem foi ')}
                  <strong className="text-white">{fastestPlatform.platform}</strong>
                  {t(' com média de ')}
                  <strong className="text-cyan-300">{formatValueLabel(fastestPlatform.avgTttHours)}</strong>
                  {t(' em ')}{fastestPlatform.count} {t('relatórios analisados.')}
                </>
              ) : (
                t('Dados insuficientes para benchmark de plataformas.')
              )}
            </p>
            <div className="pt-2 flex items-center gap-2">
              {onNavigateToReports && (
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('Explorar todos os relatórios')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
