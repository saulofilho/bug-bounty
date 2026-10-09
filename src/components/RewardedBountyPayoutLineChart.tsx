import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor, formatRelativeTimeAgo } from '../utils/formatters';
import { BaseCard } from './BaseCard';

export interface RewardedBountyPayoutLineChartProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
}

type ChartViewMode = 'cumulative' | 'events' | 'severity';
type TimeHorizon = 'ALL' | '12M' | '6M' | '30D';
type CurrencyMode = 'USD' | 'BRL';

interface PayoutPoint {
  id: string;
  rawDate: string;        // YYYY-MM-DD
  timestamp: number;
  displayDate: string;    // "15/Out" or "Out/26"
  payoutAmount: number;   // Single report bounty
  payoutBRL: number;
  cumulativeTotal: number;// Running cumulative sum
  cumulativeBRL: number;
  reportTitle: string;
  target: string;
  platform: string;
  severity: Severity;
  cvssScore: number;
  report: VulnerabilityReport;
  criticalPayout?: number;
  highPayout?: number;
  mediumPayout?: number;
  lowPayout?: number;
}

const USD_TO_BRL = 5.45;

export const RewardedBountyPayoutLineChart: React.FC<RewardedBountyPayoutLineChartProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateToReports
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('cumulative');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('ALL');
  const [currency, setCurrency] = useState<CurrencyMode>('USD');
  const [selectedPointReport, setSelectedPointReport] = useState<VulnerabilityReport | null>(null);

  // 1. FILTER ONLY REWARDED REPORTS
  const rewardedReports = useMemo(() => {
    return reports.filter(r => r.status === 'REWARDED');
  }, [reports]);

  // 2. CHRONOLOGICAL SORTING & TIMELINE EXTRACTION
  const sortedRewardedReports = useMemo(() => {
    return [...rewardedReports].map(r => {
      // Find date when bounty was awarded from timeline or updatedAt or createdAt
      const bountyTimelineEvent = r.timeline?.find(t => t.type === 'bounty' || t.title.toLowerCase().includes('bounty') || t.title.toLowerCase().includes('recompensa'));
      const effectiveDateStr = bountyTimelineEvent?.date || r.updatedAt || r.createdAt || new Date().toISOString().split('T')[0];
      const validDate = new Date(effectiveDateStr);
      const timestamp = !isNaN(validDate.getTime()) ? validDate.getTime() : Date.now();
      const rawDate = !isNaN(validDate.getTime()) ? effectiveDateStr : new Date().toISOString().split('T')[0];

      return {
        report: r,
        effectiveDateStr: rawDate,
        timestamp,
        bountyAmount: typeof r.bountyAmount === 'number' ? r.bountyAmount : 0
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [rewardedReports]);

  // 3. TIME HORIZON FILTERING
  const filteredTimeline = useMemo(() => {
    if (sortedRewardedReports.length === 0) return [];
    if (timeHorizon === 'ALL') return sortedRewardedReports;

    const now = new Date().getTime();
    let daysCutoff = 365;
    if (timeHorizon === '30D') daysCutoff = 30;
    else if (timeHorizon === '6M') daysCutoff = 180;
    else if (timeHorizon === '12M') daysCutoff = 365;

    const cutoffTimestamp = now - (daysCutoff * 24 * 60 * 60 * 1000);
    const filtered = sortedRewardedReports.filter(item => item.timestamp >= cutoffTimestamp);

    // If filter returns empty but we have reports, show at least the recent reports
    return filtered.length > 0 ? filtered : sortedRewardedReports.slice(-6);
  }, [sortedRewardedReports, timeHorizon]);

  // 4. CHART DATA GENERATION WITH CUMULATIVE MATH
  const chartData = useMemo(() => {
    let runningCumulativeUSD = 0;
    const points: PayoutPoint[] = [];

    // Optional running totals by severity
    let runningCrit = 0;
    let runningHigh = 0;
    let runningMed = 0;
    let runningLow = 0;

    filteredTimeline.forEach((item, idx) => {
      const amt = item.bountyAmount;
      runningCumulativeUSD += amt;

      const dateObj = new Date(item.effectiveDateStr);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const monthShort = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const year = String(dateObj.getFullYear()).slice(-2);
      const displayDate = `${day}/${monthShort}`;

      const sev = item.report.severity;
      if (sev === 'CRITICAL') runningCrit += amt;
      else if (sev === 'HIGH') runningHigh += amt;
      else if (sev === 'MEDIUM') runningMed += amt;
      else runningLow += amt;

      points.push({
        id: item.report.id,
        rawDate: item.effectiveDateStr,
        timestamp: item.timestamp,
        displayDate,
        payoutAmount: currency === 'BRL' ? amt * USD_TO_BRL : amt,
        payoutBRL: amt * USD_TO_BRL,
        cumulativeTotal: currency === 'BRL' ? runningCumulativeUSD * USD_TO_BRL : runningCumulativeUSD,
        cumulativeBRL: runningCumulativeUSD * USD_TO_BRL,
        reportTitle: item.report.title,
        target: item.report.target,
        platform: item.report.platform,
        severity: item.report.severity,
        cvssScore: item.report.cvssScore,
        report: item.report,
        criticalPayout: currency === 'BRL' ? (viewMode === 'cumulative' ? runningCrit * USD_TO_BRL : (sev === 'CRITICAL' ? amt * USD_TO_BRL : 0)) : (viewMode === 'cumulative' ? runningCrit : (sev === 'CRITICAL' ? amt : 0)),
        highPayout: currency === 'BRL' ? (viewMode === 'cumulative' ? runningHigh * USD_TO_BRL : (sev === 'HIGH' ? amt * USD_TO_BRL : 0)) : (viewMode === 'cumulative' ? runningHigh : (sev === 'HIGH' ? amt : 0)),
        mediumPayout: currency === 'BRL' ? (viewMode === 'cumulative' ? runningMed * USD_TO_BRL : (sev === 'MEDIUM' ? amt * USD_TO_BRL : 0)) : (viewMode === 'cumulative' ? runningMed : (sev === 'MEDIUM' ? amt : 0)),
        lowPayout: currency === 'BRL' ? (viewMode === 'cumulative' ? runningLow * USD_TO_BRL : (sev === 'LOW' || sev === 'INFO' ? amt * USD_TO_BRL : 0)) : (viewMode === 'cumulative' ? runningLow : (sev === 'LOW' || sev === 'INFO' ? amt : 0))
      });
    });

    return points;
  }, [filteredTimeline, currency, viewMode]);

  // 5. SUMMARY METRICS
  const metrics = useMemo(() => {
    const totalUSD = rewardedReports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
    const count = rewardedReports.length;
    const avgUSD = count > 0 ? Math.round(totalUSD / count) : 0;
    
    let maxBountyUSD = 0;
    let maxBountyReport: VulnerabilityReport | null = null;
    rewardedReports.forEach(r => {
      const amt = r.bountyAmount || 0;
      if (amt > maxBountyUSD) {
        maxBountyUSD = amt;
        maxBountyReport = r;
      }
    });

    const latestRewarded = sortedRewardedReports[sortedRewardedReports.length - 1];

    return {
      totalUSD,
      totalBRL: totalUSD * USD_TO_BRL,
      count,
      avgUSD,
      avgBRL: avgUSD * USD_TO_BRL,
      maxBountyUSD,
      maxBountyBRL: maxBountyUSD * USD_TO_BRL,
      maxBountyReport,
      latestDate: latestRewarded?.effectiveDateStr || null,
      latestAmountUSD: latestRewarded?.bountyAmount || 0
    };
  }, [rewardedReports, sortedRewardedReports]);

  // Custom Chart Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: PayoutPoint = payload[0].payload;
      const sevBadge = getSeverityBadgeColor(data.severity);

      return (
        <div className="bg-[#090b10] border border-[#20273d] p-3.5 rounded-xl shadow-2xl text-xs font-mono max-w-xs space-y-2 z-50">
          <div className="flex items-center justify-between gap-2 border-b border-[#1e2338] pb-1.5">
            <span className="text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" />
              <span>{data.rawDate}</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
              {data.severity} ({data.cvssScore})
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-zinc-200 font-bold truncate text-[11px]" title={data.reportTitle}>
              {data.reportTitle}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Alvo: <strong className="text-zinc-300">{data.target}</strong></span>
              <span className="text-purple-300">{data.platform}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e2338] grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#121624] p-1.5 rounded border border-[#1e263d]">
              <span className="text-zinc-500 block">Payout Deste Achado:</span>
              <strong className="text-emerald-400 font-bold text-xs">
                {formatCurrency(currency === 'BRL' ? data.payoutBRL : data.payoutAmount / (currency === 'BRL' ? USD_TO_BRL : 1), currency)}
              </strong>
            </div>
            <div className="bg-[#121624] p-1.5 rounded border border-[#1e263d]">
              <span className="text-zinc-500 block">Total Acumulado:</span>
              <strong className="text-purple-400 font-bold text-xs">
                {formatCurrency(currency === 'BRL' ? data.cumulativeBRL : data.cumulativeTotal / (currency === 'BRL' ? USD_TO_BRL : 1), currency)}
              </strong>
            </div>
          </div>

          {onSelectReport && (
            <div className="text-[9px] text-cyan-400/80 text-center pt-1 border-t border-zinc-800/60">
              Clique no ponto para inspecionar relatório ↗
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <BaseCard
      id="rewarded-bounty-payout-line-chart"
      elevation="card"
      border="default"
      rounded="lg"
      padding="md"
      className="relative overflow-hidden bg-gradient-to-b from-[#0e111a] via-[#0b0d14] to-[#08090d]"
    >
      {/* Widget Header with Cyber Branding */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2338]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <span>Total Bounty Earnings Over Time</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-sans font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  REWARDED ONLY
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Visualização temporal agregando o campo <code className="text-emerald-300 font-mono">bountyAmount</code> de todos os relatórios com status <code className="text-emerald-300 font-mono">REWARDED</code>.
            </p>
          </div>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto font-mono text-xs">
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#121624] border border-[#20273d] rounded-lg p-0.5">
            <button
              type="button"
              id="btn-payout-view-cumulative"
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'cumulative'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Exibir curva cumulativa crescente de ganhos"
            >
              Acumulado
            </button>
            <button
              type="button"
              id="btn-payout-view-events"
              onClick={() => setViewMode('events')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'events'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Exibir valor individual pago por vulnerabilidade"
            >
              Por Achado
            </button>
            <button
              type="button"
              id="btn-payout-view-severity"
              onClick={() => setViewMode('severity')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'severity'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Exibir evolução segmentada por severidade"
            >
              Severidade
            </button>
          </div>

          {/* Time Horizon Segmented Control */}
          <div className="flex items-center bg-[#121624] border border-[#20273d] rounded-lg p-0.5">
            {(['ALL', '12M', '6M', '30D'] as TimeHorizon[]).map((hor) => (
              <button
                key={hor}
                type="button"
                id={`btn-payout-horizon-${hor}`}
                onClick={() => setTimeHorizon(hor)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  timeHorizon === hor
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {hor === 'ALL' ? 'Tudo' : hor}
              </button>
            ))}
          </div>

          {/* Currency Switcher */}
          <button
            type="button"
            id="btn-payout-currency-toggle"
            onClick={() => setCurrency(currency === 'USD' ? 'BRL' : 'USD')}
            className="px-2.5 py-1 rounded-lg bg-[#141928] hover:bg-[#1a2238] border border-[#202942] text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Alternar entre Dólares (USD) e Reais (BRL)"
          >
            <span>{currency === 'USD' ? '🇺🇸 USD' : '🇧🇷 BRL'}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-[#1e2338] text-xs font-mono">
        
        {/* Total Rewarded Payout */}
        <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1e263d] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Total em Bounties</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(currency === 'BRL' ? metrics.totalBRL : metrics.totalUSD, currency)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {currency === 'USD' ? `${formatCurrency(metrics.totalBRL, 'BRL')} est.` : `${formatCurrency(metrics.totalUSD, 'USD')} orig.`}
          </div>
        </div>

        {/* Rewarded Count */}
        <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1e263d] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Achados Premiados</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {metrics.count} <span className="text-xs font-normal text-zinc-400">relatórios</span>
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            100% status REWARDED
          </div>
        </div>

        {/* Average Ticket */}
        <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1e263d] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Recompensa Média</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-300 tracking-tight">
            {formatCurrency(currency === 'BRL' ? metrics.avgBRL : metrics.avgUSD, currency)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            Ticket médio por vulnerabilidade
          </div>
        </div>

        {/* Peak Single Bounty */}
        <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1e263d] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Maior Bounty Único</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-300 tracking-tight">
            {formatCurrency(currency === 'BRL' ? metrics.maxBountyBRL : metrics.maxBountyUSD, currency)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate" title={metrics.maxBountyReport?.title || ''}>
            {metrics.maxBountyReport ? `${metrics.maxBountyReport.severity} • ${metrics.maxBountyReport.target}` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="py-4">
        {chartData.length === 0 ? (
          <div className="p-8 text-center bg-[#090b10] border border-[#1e2338] rounded-xl space-y-2 text-xs font-mono">
            <Award className="w-8 h-8 text-zinc-600 mx-auto" />
            <h4 className="text-white font-bold">Nenhum Relatório com Status REWARDED no Filtro</h4>
            <p className="text-zinc-500 max-w-md mx-auto text-[11px]">
              Quando suas vulnerabilidades forem validadas pela equipe de triagem e a recompensa for aprovada, a curva de pagamentos será traçada automaticamente aqui.
            </p>
            {onNewReport && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNewReport}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Registrar Nova Vulnerabilidade
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'cumulative' ? (
                <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="payoutEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e2338" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#27272a' }}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <ReferenceLine
                    y={currency === 'BRL' ? metrics.avgBRL : metrics.avgUSD}
                    stroke="#a855f7"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: `Média: ${formatCurrency(currency === 'BRL' ? metrics.avgBRL : metrics.avgUSD, currency)}`,
                      fill: '#c084fc',
                      fontSize: 10,
                      position: 'insideBottomRight'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeTotal"
                    legendType="none"
                    stroke="none"
                    fillOpacity={1}
                    fill="url(#payoutEmeraldGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeTotal"
                    name="Total Acumulado ($)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', stroke: '#0e111a', strokeWidth: 2 }}
                    activeDot={{
                      r: 6,
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      fill: '#34d399',
                      onClick: (_: any, e: any) => {
                        const rep = e?.payload?.report;
                        if (rep && onSelectReport) onSelectReport(rep);
                      }
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="payoutAmount"
                    name="Payout Individual do Achado ($)"
                    stroke="#818cf8"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                  />
                </ComposedChart>
              ) : viewMode === 'events' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e2338" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#27272a' }}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="payoutAmount"
                    name="Bounty Pago por Vulnerabilidade ($)"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#a855f7', stroke: '#090b10', strokeWidth: 2 }}
                    activeDot={{
                      r: 7,
                      fill: '#c084fc',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      onClick: (_: any, e: any) => {
                        const rep = e?.payload?.report;
                        if (rep && onSelectReport) onSelectReport(rep);
                      }
                    }}
                  />
                </LineChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e2338" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#52525b"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#27272a' }}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Line type="monotone" dataKey="criticalPayout" name="Crítica ($)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="highPayout" name="Alta ($)" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="mediumPayout" name="Média ($)" stroke="#eab308" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="lowPayout" name="Baixa ($)" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Latest Rewarded Findings Footer Track */}
      {rewardedReports.length > 0 && (
        <div className="pt-3 border-t border-[#1e2338]">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Últimos Achados Recompensados ({rewardedReports.length})</span>
            </span>
            {onNavigateToReports && (
              <button
                type="button"
                id="btn-navigate-to-rewarded-reports"
                onClick={onNavigateToReports}
                className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 text-[11px] hover:underline cursor-pointer"
              >
                <span>Ver Todos os Relatórios</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sortedRewardedReports.slice(-3).reverse().map((item) => {
              const rep = item.report;
              const sevBadge = getSeverityBadgeColor(rep.severity);

              return (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport && onSelectReport(rep)}
                  className="p-2.5 rounded-lg bg-[#090b10] hover:bg-[#121624] border border-[#1e2338] hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-between gap-2 text-xs font-mono group"
                  title="Clique para abrir detalhes do achado"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                        {rep.severity}
                      </span>
                      <span className="text-zinc-300 font-medium truncate group-hover:text-white">
                        {rep.title}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {rep.target} • {item.effectiveDateStr}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-bold font-mono">
                      {formatCurrency(currency === 'BRL' ? (rep.bountyAmount || 0) * USD_TO_BRL : (rep.bountyAmount || 0), currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </BaseCard>
  );
};
