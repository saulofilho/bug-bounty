import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Filter,
  Sparkles,
  Layers,
  ArrowUpRight,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor, formatRelativeTimeAgo } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { BaseCard } from './BaseCard';

export interface MonthlyBountiesBarChartProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
}

type TimeframeOption = '6M' | '12M' | 'ALL';
type CurrencyMode = 'USD' | 'BRL';
type BarViewMode = 'total' | 'severity';

interface MonthBountyPoint {
  monthKey: string;           // "YYYY-MM"
  monthLabel: string;         // "Mai/26"
  fullMonthLabel: string;     // "Maio de 2026"
  year: number;
  monthIndex: number;
  totalBountyUSD: number;
  totalBountyBRL: number;
  reportCount: number;
  criticalBountiesUSD: number;
  highBountiesUSD: number;
  mediumBountiesUSD: number;
  lowBountiesUSD: number;
  maxSingleBountyUSD: number;
  avgBountyUSD: number;
  reports: VulnerabilityReport[];
}

const USD_TO_BRL_RATE = 5.45;

const MONTH_NAMES_SHORT_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_NAMES_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthlyBountiesBarChart: React.FC<MonthlyBountiesBarChartProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateToReports
}) => {
  const { t, language } = useLanguage();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('12M');
  const [currency, setCurrency] = useState<CurrencyMode>('USD');
  const [viewMode, setViewMode] = useState<BarViewMode>('total');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const isEn = language === 'en-US';

  // 1. Filter reports with awarded bounties and parse their 'updatedAt' field
  const { chartData, metrics, allAvailableMonths } = useMemo(() => {
    // Collect all reports with bounty
    const rewardedReports = reports.filter(
      r => (r.status === 'REWARDED' || (r.bountyAmount !== undefined && r.bountyAmount > 0)) && (r.bountyAmount || 0) > 0
    );

    if (rewardedReports.length === 0) {
      return {
        chartData: [],
        metrics: {
          totalEarnedUSD: 0,
          totalEarnedBRL: 0,
          rewardedReportsCount: 0,
          peakMonthLabel: '—',
          peakMonthValueUSD: 0,
          avgMonthlyBountyUSD: 0,
          activeMonthsCount: 0
        },
        allAvailableMonths: []
      };
    }

    // Group by YYYY-MM based on report.updatedAt (fallback to createdAt)
    const monthMap = new Map<string, VulnerabilityReport[]>();

    rewardedReports.forEach(report => {
      const dateStr = report.updatedAt || report.createdAt;
      let dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }

      const year = dateObj.getFullYear();
      const month = dateObj.getMonth(); // 0 to 11
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, []);
      }
      monthMap.get(key)!.push(report);
    });

    // Determine chronological sequence between earliest and latest dates
    const allKeys = Array.from(monthMap.keys()).sort();
    const [startYearStr, startMonthStr] = allKeys[0].split('-');
    const [endYearStr, endMonthStr] = allKeys[allKeys.length - 1].split('-');

    let currentYear = parseInt(startYearStr, 10);
    let currentMonth = parseInt(startMonthStr, 10); // 1 to 12
    const endYear = parseInt(endYearStr, 10);
    const endMonth = parseInt(endMonthStr, 10);

    const fullSequence: MonthBountyPoint[] = [];

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const key = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      const monthIdx = currentMonth - 1;
      const monthReports = monthMap.get(key) || [];

      const totalUSD = monthReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
      const totalBRL = totalUSD * USD_TO_BRL_RATE;

      const criticalUSD = monthReports
        .filter(r => r.severity === 'CRITICAL')
        .reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
      const highUSD = monthReports
        .filter(r => r.severity === 'HIGH')
        .reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
      const mediumUSD = monthReports
        .filter(r => r.severity === 'MEDIUM')
        .reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
      const lowUSD = monthReports
        .filter(r => r.severity === 'LOW' || r.severity === 'INFO')
        .reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

      const maxSingleUSD = monthReports.length > 0 ? Math.max(...monthReports.map(r => r.bountyAmount || 0)) : 0;
      const avgUSD = monthReports.length > 0 ? Math.round(totalUSD / monthReports.length) : 0;

      const shortNames = isEn ? MONTH_NAMES_SHORT_EN : MONTH_NAMES_SHORT_PT;
      const fullNames = isEn ? MONTH_NAMES_FULL_EN : MONTH_NAMES_FULL_PT;

      const monthLabel = `${shortNames[monthIdx]}/${String(currentYear).slice(-2)}`;
      const fullMonthLabel = `${fullNames[monthIdx]} ${currentYear}`;

      fullSequence.push({
        monthKey: key,
        monthLabel,
        fullMonthLabel,
        year: currentYear,
        monthIndex: monthIdx,
        totalBountyUSD: totalUSD,
        totalBountyBRL: Math.round(totalBRL),
        reportCount: monthReports.length,
        criticalBountiesUSD: criticalUSD,
        highBountiesUSD: highUSD,
        mediumBountiesUSD: mediumUSD,
        lowBountiesUSD: lowUSD,
        maxSingleBountyUSD: maxSingleUSD,
        avgBountyUSD: avgUSD,
        reports: monthReports
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    // Filter by timeframe
    let filteredSequence = fullSequence;
    if (timeframe === '6M') {
      filteredSequence = fullSequence.slice(-6);
    } else if (timeframe === '12M') {
      filteredSequence = fullSequence.slice(-12);
    }

    // Aggregate metrics for active timeline
    const activeMonths = filteredSequence.filter(p => p.totalBountyUSD > 0);
    const totalUSD = filteredSequence.reduce((sum, p) => sum + p.totalBountyUSD, 0);
    const totalBRL = totalUSD * USD_TO_BRL_RATE;
    const totalReports = filteredSequence.reduce((sum, p) => sum + p.reportCount, 0);

    let peakMonthLabel = '—';
    let peakMonthValueUSD = 0;

    filteredSequence.forEach(p => {
      if (p.totalBountyUSD > peakMonthValueUSD) {
        peakMonthValueUSD = p.totalBountyUSD;
        peakMonthLabel = p.monthLabel;
      }
    });

    const avgMonthlyUSD = activeMonths.length > 0 ? Math.round(totalUSD / activeMonths.length) : 0;

    return {
      chartData: filteredSequence,
      metrics: {
        totalEarnedUSD: totalUSD,
        totalEarnedBRL: Math.round(totalBRL),
        rewardedReportsCount: totalReports,
        peakMonthLabel,
        peakMonthValueUSD,
        avgMonthlyBountyUSD: avgMonthlyUSD,
        activeMonthsCount: activeMonths.length
      },
      allAvailableMonths: fullSequence
    };
  }, [reports, timeframe, isEn]);

  // Selected month detail drilldown
  const selectedMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    return allAvailableMonths.find(m => m.monthKey === selectedMonthKey) || null;
  }, [selectedMonthKey, allAvailableMonths]);

  // Average line value based on currency
  const avgLineValue = currency === 'USD' ? metrics.avgMonthlyBountyUSD : Math.round(metrics.avgMonthlyBountyUSD * USD_TO_BRL_RATE);

  // Custom Recharts Tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: MonthBountyPoint = payload[0]?.payload;
    if (!data) return null;

    const displayAmount = currency === 'USD' ? data.totalBountyUSD : data.totalBountyBRL;

    return (
      <div className="rounded-xl bg-[#0c0f17]/95 border border-[#2b354f] p-3.5 shadow-2xl backdrop-blur-md text-xs font-mono min-w-[240px] animate-fadeIn z-50">
        <div className="flex items-center justify-between border-b border-[#1c2336] pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{data.fullMonthLabel}</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            {data.reportCount} {data.reportCount === 1 ? t('achado pago', 'paid finding') : t('achados pagos', 'paid findings')}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">{t('Total Ganho:', 'Total Earned:')}</span>
            <span className="text-emerald-400 font-bold text-sm">
              {formatCurrency(displayAmount, currency)}
            </span>
          </div>

          {currency === 'USD' ? (
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>{t('Equivalente em BRL:', 'BRL Equivalent:')}</span>
              <span>{formatCurrency(data.totalBountyBRL, 'BRL')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>{t('Original em USD:', 'USD Original:')}</span>
              <span>{formatCurrency(data.totalBountyUSD, 'USD')}</span>
            </div>
          )}

          {data.reportCount > 0 && (
            <>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-[#1a2133]">
                <span>{t('Média por Achado:', 'Avg per Finding:')}</span>
                <span className="text-cyan-300">
                  {formatCurrency(currency === 'USD' ? data.avgBountyUSD : Math.round(data.avgBountyUSD * USD_TO_BRL_RATE), currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>{t('Maior Recompensa:', 'Highest Bounty:')}</span>
                <span className="text-amber-400 font-semibold">
                  {formatCurrency(currency === 'USD' ? data.maxSingleBountyUSD : Math.round(data.maxSingleBountyUSD * USD_TO_BRL_RATE), currency)}
                </span>
              </div>

              {/* Severity mini-breakdown */}
              <div className="pt-2 mt-1 border-t border-[#1a2133] grid grid-cols-2 gap-1 text-[10px]">
                {data.criticalBountiesUSD > 0 && (
                  <div className="flex items-center justify-between text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded">
                    <span>Critical:</span>
                    <span>{formatCurrency(currency === 'USD' ? data.criticalBountiesUSD : Math.round(data.criticalBountiesUSD * USD_TO_BRL_RATE), currency)}</span>
                  </div>
                )}
                {data.highBountiesUSD > 0 && (
                  <div className="flex items-center justify-between text-orange-400 bg-orange-950/30 px-1.5 py-0.5 rounded">
                    <span>High:</span>
                    <span>{formatCurrency(currency === 'USD' ? data.highBountiesUSD : Math.round(data.highBountiesUSD * USD_TO_BRL_RATE), currency)}</span>
                  </div>
                )}
                {data.mediumBountiesUSD > 0 && (
                  <div className="flex items-center justify-between text-yellow-400 bg-yellow-950/30 px-1.5 py-0.5 rounded">
                    <span>Medium:</span>
                    <span>{formatCurrency(currency === 'USD' ? data.mediumBountiesUSD : Math.round(data.mediumBountiesUSD * USD_TO_BRL_RATE), currency)}</span>
                  </div>
                )}
                {data.lowBountiesUSD > 0 && (
                  <div className="flex items-center justify-between text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded">
                    <span>Low:</span>
                    <span>{formatCurrency(currency === 'USD' ? data.lowBountiesUSD : Math.round(data.lowBountiesUSD * USD_TO_BRL_RATE), currency)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#1c2336] text-[10px] text-zinc-500 italic text-center">
          {t('Clique na barra para inspecionar os relatórios', 'Click bar to inspect reports')}
        </div>
      </div>
    );
  };

  return (
    <BaseCard
      elevation="card"
      border="default"
      rounded="lg"
      padding="lg"
      className="space-y-6 shadow-2xl relative overflow-hidden"
      id="monthly-bounties-bar-chart-card"
    >
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-1/4 w-80 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Control Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1f2638] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{t('Histórico de Recompensas por Mês', 'Histórico de Recompensas por Mês')}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  updatedAt
                </span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            {t(
              'Distribuição temporal de bounties pagos agregados mensalmente com base na data de atualização (updatedAt) dos relatórios.',
              'Monthly distribution of earned bounties aggregated by update timestamp (updatedAt) of reports.'
            )}
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Filter */}
          <div className="inline-flex rounded-lg bg-[#0e121d] border border-[#21293d] p-0.5">
            {(['6M', '12M', 'ALL'] as TimeframeOption[]).map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf === 'ALL' ? t('Tudo', 'All') : tf}
              </button>
            ))}
          </div>

          {/* Currency Toggle */}
          <div className="inline-flex rounded-lg bg-[#0e121d] border border-[#21293d] p-0.5">
            {(['USD', 'BRL'] as CurrencyMode[]).map(cur => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  currency === cur
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cur === 'USD' ? '$ USD' : 'R$ BRL'}
              </button>
            ))}
          </div>

          {/* View Mode Toggle (Total vs Severity) */}
          <div className="inline-flex rounded-lg bg-[#0e121d] border border-[#21293d] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('total')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'total'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('Visualização em Barra Única Total', 'Single Total Bar View')}
            >
              <span>{t('Total', 'Total')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('severity')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'severity'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('Barras Empilhadas por Severidade (Critical, High, Med, Low)', 'Stacked Bars by Severity')}
            >
              <Layers className="w-3 h-3" />
              <span>{t('Severidade', 'Severity')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Earned in Selected Window */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#1d2436] space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{t('Total no Período', 'Total in Period')}</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {formatCurrency(currency === 'USD' ? metrics.totalEarnedUSD : metrics.totalEarnedBRL, currency)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {currency === 'USD' ? `~ ${formatCurrency(metrics.totalEarnedBRL, 'BRL')}` : `~ ${formatCurrency(metrics.totalEarnedUSD, 'USD')}`}
          </div>
        </div>

        {/* Peak Month Record */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#1d2436] space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{t('Mês Recorde', 'Peak Month')}</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-300 tabular-nums">
            {metrics.peakMonthLabel}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            {formatCurrency(currency === 'USD' ? metrics.peakMonthValueUSD : Math.round(metrics.peakMonthValueUSD * USD_TO_BRL_RATE), currency)}
          </div>
        </div>

        {/* Monthly Average in Active Months */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#1d2436] space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{t('Média Mensal', 'Monthly Average')}</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300 tabular-nums">
            {formatCurrency(avgLineValue, currency)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {metrics.activeMonthsCount} {t('meses com pagamento', 'months with payout')}
          </div>
        </div>

        {/* Rewarded Findings Count */}
        <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#1d2436] space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{t('Achados Pagos', 'Paid Findings')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums">
            {metrics.rewardedReportsCount}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {metrics.rewardedReportsCount > 0
              ? `${Math.round(metrics.totalEarnedUSD / metrics.rewardedReportsCount)} USD / ${t('achado', 'finding')}`
              : '0'}
          </div>
        </div>
      </div>

      {/* Main Recharts BarChart Canvas */}
      {chartData.length > 0 ? (
        <div className="space-y-2">
          <div className="w-full h-[320px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 25, left: 10, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const clickedPoint: MonthBountyPoint = e.activePayload[0].payload;
                    setSelectedMonthKey(prev => (prev === clickedPoint.monthKey ? null : clickedPoint.monthKey));
                  }
                }}
              >
                <defs>
                  {/* Total Bar Gradient (Emerald Cyber) */}
                  <linearGradient id="bountyEmeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="60%" stopColor="#059669" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.4} />
                  </linearGradient>

                  {/* Active Selected Bar Gradient */}
                  <linearGradient id="bountyActiveBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                  </linearGradient>

                  {/* Severity Gradients */}
                  <linearGradient id="bountyCriticalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="bountyHighGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#c2410c" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="bountyMediumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#a16207" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="bountyLowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.6} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1c2336" vertical={false} />

                <XAxis
                  dataKey="monthLabel"
                  stroke="#525d7a"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#27314a' }}
                />

                <YAxis
                  stroke="#525d7a"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#27314a' }}
                  tickFormatter={val => {
                    if (val === 0) return '0';
                    return currency === 'USD'
                      ? `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                      : `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;
                  }}
                />

                <Tooltip content={<CustomBarTooltip />} />

                {/* Average Reference Line */}
                {avgLineValue > 0 && (
                  <ReferenceLine
                    y={avgLineValue}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg: ${formatCurrency(avgLineValue, currency)}`,
                      fill: '#06b6d4',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      position: 'insideTopRight'
                    }}
                  />
                )}

                {/* Main Bar Renderers */}
                {viewMode === 'total' ? (
                  <Bar
                    dataKey={currency === 'USD' ? 'totalBountyUSD' : 'totalBountyBRL'}
                    name={t('Recompensa Total', 'Total Bounty')}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                    onMouseEnter={(_, index) => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {chartData.map((entry, index) => {
                      const isSelected = selectedMonthKey === entry.monthKey;
                      const isHovered = hoveredBarIndex === index;
                      const isPeak = entry.totalBountyUSD === metrics.peakMonthValueUSD && entry.totalBountyUSD > 0;

                      let fill = 'url(#bountyEmeraldBarGrad)';
                      if (isSelected) fill = 'url(#bountyActiveBarGrad)';
                      else if (isPeak) fill = 'url(#bountyActiveBarGrad)';

                      return (
                        <Cell
                          key={`cell-${entry.monthKey}`}
                          fill={fill}
                          stroke={isSelected ? '#34d399' : isHovered ? '#6ee7b7' : isPeak ? '#10b981' : '#059669'}
                          strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
                        />
                      );
                    })}
                  </Bar>
                ) : (
                  <>
                    <Legend
                      wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'monospace' }}
                      formatter={value => <span className="text-zinc-300">{value}</span>}
                    />
                    <Bar
                      dataKey={currency === 'USD' ? 'criticalBountiesUSD' : 'criticalBountiesUSD'}
                      name="Critical"
                      stackId="severityStack"
                      fill="url(#bountyCriticalGrad)"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey={currency === 'USD' ? 'highBountiesUSD' : 'highBountiesUSD'}
                      name="High"
                      stackId="severityStack"
                      fill="url(#bountyHighGrad)"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey={currency === 'USD' ? 'mediumBountiesUSD' : 'mediumBountiesUSD'}
                      name="Medium"
                      stackId="severityStack"
                      fill="url(#bountyMediumGrad)"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey={currency === 'USD' ? 'lowBountiesUSD' : 'lowBountiesUSD'}
                      name="Low / Info"
                      stackId="severityStack"
                      fill="url(#bountyLowGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-mono px-2">
            <span>
              {t(
                '* Agrupado cronologicamente por mês do campo updatedAt',
                '* Chronologically grouped by month of updatedAt field'
              )}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('Clique na barra para ver os relatórios do mês', 'Click any bar to inspect reports for that month')}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="py-12 px-6 rounded-xl bg-[#090b12] border border-[#1b2234] text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-white text-sm">
            {t('Nenhuma recompensa registrada ainda', 'No rewarded bounties recorded yet')}
          </h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {t(
              'Assim que os relatórios forem triados e recompensados (status REWARDED com valor atribuído), o histórico mensal com base no campo updatedAt aparecerá neste gráfico.',
              'Once reports are marked as REWARDED with a bounty amount, their monthly timeline based on updatedAt will render here.'
            )}
          </p>
          {onNewReport && (
            <button
              type="button"
              onClick={onNewReport}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>{t('Criar Relatório', 'Create Report')}</span>
            </button>
          )}
        </div>
      )}

      {/* Selected Month Interactive Drilldown Drawer */}
      {selectedMonthData && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#0c101a] border border-emerald-500/30 space-y-3.5 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#1c2438] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>{selectedMonthData.fullMonthLabel}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {selectedMonthData.reportCount} {selectedMonthData.reportCount === 1 ? t('relatório pago', 'paid report') : t('relatórios pagos', 'paid reports')}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold font-mono text-base">
                {formatCurrency(currency === 'USD' ? selectedMonthData.totalBountyUSD : selectedMonthData.totalBountyBRL, currency)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonthKey(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title={t('Fechar detalhes', 'Close details')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of reports for this month */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {selectedMonthData.reports.map(report => {
              const sevBadge = getSeverityBadgeColor(report.severity);
              return (
                <div
                  key={report.id}
                  onClick={() => onSelectReport && onSelectReport(report)}
                  className="p-3 rounded-lg bg-[#111624] hover:bg-[#161d30] border border-[#212b42] hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">{report.id}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}
                      >
                        {report.severity}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded border border-zinc-700/40">
                        {report.target}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {report.platform}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors truncate">
                      {report.title}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {formatCurrency(currency === 'USD' ? report.bountyAmount : Math.round(report.bountyAmount * USD_TO_BRL_RATE), currency)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        updatedAt: {report.updatedAt || report.createdAt}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>

          {onNavigateToReports && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onNavigateToReports}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{t('Ver todos na aba Relatórios', 'View all in Reports tab')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </BaseCard>
  );
};
