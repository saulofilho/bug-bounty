import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  Timer,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Filter,
  BarChart2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Eye,
  X,
  Zap,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import {
  calculateTttHistogramDistribution,
  TttHistogramBucket,
  ReportTttData
} from '../utils/tttComparativeEngine';
import { getSeverityBadgeColor, formatRelativeTimeAgo } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { BaseCard } from './BaseCard';

export interface TttDistributionHistogramPanelProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

export const TttDistributionHistogramPanel: React.FC<TttDistributionHistogramPanelProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  className = ''
}) => {
  const { t } = useLanguage();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [bottleneckThresholdHours, setBottleneckThresholdHours] = useState<number>(72);
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);
  const [unit, setUnit] = useState<'hours' | 'days'>('hours');

  // Compute distribution analysis
  const distribution = useMemo(() => {
    return calculateTttHistogramDistribution(reports, {
      filterPlatform: selectedPlatform,
      filterSeverity: selectedSeverity,
      bottleneckThresholdHours
    });
  }, [reports, selectedPlatform, selectedSeverity, bottleneckThresholdHours]);

  const {
    buckets,
    totalTriaged,
    avgTttHours,
    avgTttDays,
    medianTttHours,
    medianTttDays,
    minTttHours,
    maxTttHours,
    standardDeviationHours,
    slaUnder48hPercent,
    slaUnder24hPercent,
    bottlenecksCount,
    bottlenecksPercent,
    bottleneckReports,
    primaryBottleneckPlatform,
    primaryBottleneckSeverity,
    recommendations
  } = distribution;

  // Selected bucket for drill-down inspection
  const selectedBucket = useMemo(() => {
    if (!selectedBucketKey) return null;
    return buckets.find(b => b.key === selectedBucketKey) || null;
  }, [buckets, selectedBucketKey]);

  // Extract platforms for filter
  const allPlatforms = useMemo(() => {
    const set = new Set(reports.map(r => r.platform).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [reports]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return buckets.map(b => ({
      key: b.key,
      shortLabel: b.shortLabel,
      label: b.label,
      rangeDescription: b.rangeDescription,
      count: b.count,
      percent: b.percent,
      color: b.color,
      isBottleneck: b.isBottleneck,
      severityLevel: b.severityLevel,
      reports: b.reports
    }));
  }, [buckets]);

  const formatHoursOrDays = (hours: number, days?: number) => {
    if (unit === 'hours') {
      return `${hours}h`;
    }
    const d = days !== undefined ? days : Math.round((hours / 24) * 10) / 10;
    return `${d}d (${hours}h)`;
  };

  return (
    <section
      id="ttt-distribution-histogram-panel"
      aria-label="Distribuição do Tempo Médio de Triagem e Histograma de Gargalos"
      className={`space-y-4 font-sans ${className}`}
    >
      <div className="rounded-2xl bg-gradient-to-br from-[#0b0d14] via-[#090b10] to-[#0c0d15] border border-[#202436] shadow-2xl p-4 sm:p-6 overflow-hidden relative">
        {/* Glow ambient background lights */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Panel Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/35 text-blue-300 text-[11px] font-mono font-bold uppercase tracking-wider shadow-inner">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Histograma de TTT</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Submissão &rarr; TRIAGED / VALIDATED</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono border border-zinc-700">
                {totalTriaged} {t('relatórios com triagem')}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{t('Distribuição do Tempo Médio de Triagem (TTT)')}</span>
              <span className="text-zinc-500 font-normal text-sm sm:text-base">•</span>
              <span className="text-blue-400 font-semibold text-sm sm:text-base">
                {t('Detecção de Gargalos de Produtividade')}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-4xl">
              {t('Histograma de frequência calculado a partir da diferença de tempo exata entre a submissão inicial e a primeira transição para ')}
              <span className="text-zinc-200 font-mono font-semibold">TRIAGED</span>
              {t(' ou ')}
              <span className="text-zinc-200 font-mono font-semibold">VALIDATED</span>
              {t(' no histórico da ')}
              <span className="text-zinc-200 font-mono">timeline</span>
              {t(', permitindo isolar faixas de atraso operacional e otimizar a velocidade de resposta.')}
            </p>
          </div>

          {/* Interactive Filters & Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Unit Toggle */}
            <div className="flex items-center bg-[#12141f] rounded-lg p-0.5 border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setUnit('hours')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'hours'
                    ? 'bg-blue-600 text-white font-bold shadow'
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
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('Dias (d)')}
              </button>
            </div>

            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={e => setSelectedPlatform(e.target.value)}
              className="bg-[#12141f] border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
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
              className="bg-[#12141f] border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">{t('Todas as Severidades')}</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Bottleneck Threshold Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800 text-zinc-400 font-mono text-xs">
              <span className="text-[11px]">{t('Limiar Gargalo:')}</span>
              <select
                value={bottleneckThresholdHours}
                onChange={e => setBottleneckThresholdHours(Number(e.target.value))}
                className="bg-[#12141f] border border-zinc-700 hover:border-zinc-500 text-amber-400 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none cursor-pointer"
              >
                <option value={48}>&gt; 48h (2 dias)</option>
                <option value={72}>&gt; 72h (3 dias - Padrão)</option>
                <option value={120}>&gt; 120h (5 dias)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top KPI Cards: Tempo Médio de Triagem e Métricas Chave */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
          {/* Card 1: Tempo Médio de Triagem (TTT) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121624] via-[#0d101b] to-[#111320] border border-blue-500/35 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('Tempo Médio de Triagem (TTT)')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {t('Média geral dos relatórios analisados')}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white tabular-nums drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]">
                  {formatHoursOrDays(avgTttHours, avgTttDays)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>&plusmn; &sigma; {standardDeviationHours}h {t('desvio padrão')}</span>
                <span className="text-blue-300 font-semibold">{totalTriaged} {t('relatórios')}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Mediana de TTT */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#101322] via-[#0b0e18] to-[#0e111d] border border-indigo-500/30 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('Mediana de Triagem')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {t('Ponto central sem distorção por outliers')}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-indigo-300 tabular-nums drop-shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                  {formatHoursOrDays(medianTttHours, medianTttDays)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{t('Mínimo:')} <strong className="text-emerald-400">{minTttHours}h</strong></span>
                <span>{t('Máximo:')} <strong className="text-rose-400">{maxTttHours}h</strong></span>
              </div>
            </div>
          </div>

          {/* Card 3: Conformidade SLA (< 48h) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1613] via-[#08110e] to-[#0b1411] border border-emerald-500/30 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('Triagem Rápida (&le; 48h)')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {t('Dentro do padrão corporativo de SLA')}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-emerald-300 tabular-nums drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  {slaUnder48hPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="text-emerald-400">{slaUnder24hPercent}% &le; 24h</span>
                <span className="text-zinc-500">{t('Meta: &ge; 75%')}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Gargalos Identificados (> Limiar) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#191012] via-[#130b0d] to-[#160d0f] border border-rose-500/35 flex flex-col justify-between gap-2 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('Gargalos de Produtividade')}</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  {t('Tempo de espera')} &ge; {bottleneckThresholdHours}h ({Math.round(bottleneckThresholdHours / 24)}d)
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-mono font-bold tabular-nums ${
                  bottlenecksCount > 0 ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'text-zinc-400'
                }`}>
                  {bottlenecksCount} {bottlenecksCount === 1 ? t('relatório') : t('relatórios')}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className={bottlenecksCount > 0 ? 'text-rose-300 font-semibold' : 'text-zinc-500'}>
                  {bottlenecksPercent}% {t('do total de triagens')}
                </span>
                <span className="text-zinc-500">{t('Ação prioritária')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottleneck Productivity Alert Banner */}
        {bottlenecksCount > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-rose-950/30 via-[#180e12] to-[#120f17] border border-rose-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs relative z-10 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {t('Diagnóstico de Gargalos de Produtividade')}
                  </span>
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {bottlenecksCount} {t('atrasos detectados')} (&ge; {bottleneckThresholdHours}h)
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed max-w-3xl">
                  {primaryBottleneckPlatform && (
                    <span>
                      {t('A maior lentidão concentra-se na plataforma ')}
                      <strong className="text-white font-mono">{primaryBottleneckPlatform}</strong>
                      {primaryBottleneckSeverity && (
                        <span> {t('com achados de severidade ')}<strong className="text-white font-mono">{primaryBottleneckSeverity}</strong></span>
                      )}.
                    </span>
                  )}
                  {' '}
                  {recommendations[0] || t('Revise a fila de triagem para reduzir o tempo de resposta.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // Focus on the first bottleneck bucket
                const b = buckets.find(b => b.isBottleneck && b.count > 0);
                if (b) setSelectedBucketKey(b.key);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#1c1317] hover:bg-[#25181e] border border-rose-500/40 text-rose-300 hover:text-white font-mono text-[11px] font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-start md:self-auto"
            >
              <span>{t('Inspecionar Gargalos')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Histogram Chart Section (Recharts BarChart) */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span>{t('Distribuição de Frequência dos Tempos de Triagem (Histograma)')}</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {t('Número de relatórios agrupados por intervalo de tempo até triagem. Clique em qualquer barra para listar os relatórios correspondentes.')}
              </p>
            </div>

            {/* Legend Indicators */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>{t('Ótimo (< 24h)')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                <span>{t('Meta (24-48h)')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>{t('Atenção (48-72h)')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>{t('Gargalo (&ge; 72h)')}</span>
              </div>
            </div>
          </div>

          {/* Histogram Chart Container */}
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const bKey = e.activePayload[0].payload.key;
                    setSelectedBucketKey(prev => prev === bKey ? null : bKey);
                  }
                }}
              >
                <CartesianGrid stroke="#1c1f2e" strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="shortLabel"
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#27272a' }}
                />

                <YAxis
                  allowDecimals={false}
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val} rpt`}
                  tickLine={{ stroke: '#27272a' }}
                />

                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-blue-500/40 shadow-2xl font-mono text-xs text-white space-y-2 min-w-[240px]">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                          <span className="font-bold text-blue-300">{data.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            data.isBottleneck ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {data.isBottleneck ? t('Gargalo') : t('Normal')}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400">
                          {data.rangeDescription}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                          <span className="text-zinc-400">{t('Frequência:')}</span>
                          <span className="text-white font-bold text-sm">
                            {data.count} {data.count === 1 ? t('relatório') : t('relatórios')} ({data.percent}%)
                          </span>
                        </div>

                        <div className="pt-1 text-[10px] text-blue-400 italic text-center">
                          {t('Clique na barra para inspecionar os relatórios desta faixa')}
                        </div>
                      </div>
                    );
                  }}
                />

                <Bar
                  dataKey="count"
                  name={t('Relatórios')}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {chartData.map((entry) => {
                    const isSelected = entry.key === selectedBucketKey;
                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        opacity={isSelected ? 1.0 : selectedBucketKey ? 0.35 : 0.85}
                        stroke={isSelected ? '#ffffff' : entry.color}
                        strokeWidth={isSelected ? 2 : 0}
                        className="transition-all cursor-pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selected Bucket Reports Drill-Down Inspector */}
        {selectedBucket && (
          <div className="mt-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#111422] via-[#0d101a] to-[#121424] border border-blue-500/40 shadow-2xl relative z-10 animate-fadeIn">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-blue-500/20">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-inner"
                  style={{
                    backgroundColor: `${selectedBucket.color}20`,
                    borderColor: `${selectedBucket.color}40`,
                    color: selectedBucket.color
                  }}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-white font-mono">
                      {selectedBucket.label}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold">
                      {selectedBucket.count} {selectedBucket.count === 1 ? t('relatório') : t('relatórios')} ({selectedBucket.percent}%)
                    </span>
                    {selectedBucket.isBottleneck && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
                        {t('Faixa de Gargalo')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedBucket.rangeDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBucketKey(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title={t('Fechar detalhamento')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reports List for Selected Bucket */}
            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {selectedBucket.reports.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#0a0c14] border border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                  {t('Nenhum relatório nesta faixa de tempo com os filtros atuais.')}
                </div>
              ) : (
                selectedBucket.reports.map(rep => {
                  const repColors = getSeverityBadgeColor(rep.severity);
                  return (
                    <div
                      key={rep.reportId}
                      className="p-3 rounded-lg bg-[#0a0c14] border border-zinc-800 hover:border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
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
                            {formatHoursOrDays(rep.tttHours || 0, rep.tttDays || 0)}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            (rep.tttHours || 0) <= 48 ? 'text-emerald-400' : (rep.tttHours || 0) <= 72 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {(rep.tttHours || 0) <= 48 ? t('SLA Ok') : (rep.tttHours || 0) <= 72 ? t('Atenção') : t('Gargalo')}
                          </span>
                        </div>

                        {onSelectReport && (
                          <button
                            type="button"
                            onClick={() => {
                              const fullReport = reports.find(r => r.id === rep.reportId);
                              if (fullReport) onSelectReport(fullReport);
                            }}
                            className="px-2.5 py-1 rounded bg-[#161a29] hover:bg-blue-600 border border-zinc-700 hover:border-blue-500 text-zinc-300 hover:text-white text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t('Ver')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Strategic Bottleneck Analysis Insights Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono relative z-10">
          <div className="p-3.5 rounded-xl bg-[#0f111a] border border-zinc-800 space-y-1.5">
            <span className="text-blue-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('Recomendações para Desobstrução do Fluxo')}</span>
            </span>
            <ul className="space-y-1 pt-1 text-[11px] text-zinc-300 list-disc list-inside leading-relaxed">
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f111a] border border-zinc-800 space-y-1.5">
            <span className="text-indigo-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('Metodologia do Cálculo de TTT')}</span>
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {t('O Tempo Médio de Triagem (TTT) é computado pela diferença entre a marcação inicial de criação/submissão e o primeiro evento de status_change para ')}
              <strong className="text-white">TRIAGED</strong>
              {t(' ou ')}
              <strong className="text-white">VALIDATED</strong>
              {t(' no array timeline. Relatórios fechados sem evento explícito utilizam o delta da primeira revisão intermediária.')}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
