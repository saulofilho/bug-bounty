import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Activity,
  Award,
  Zap,
  Target,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  DollarSign,
  Plus
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MonthlySubmissionCadenceChartProps {
  reports: VulnerabilityReport[];
  onNewReport?: () => void;
  onSelectMonthFilter?: (monthKey: string) => void;
}

type CadenceMode = 'cadence' | 'severity' | 'bounties' | 'cumulative';
type TimeframeFilter = '6M' | '12M' | 'ALL';

interface MonthDataPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Jan 24"
  fullMonthName: string; // "Janeiro 2024"
  total: number;
  rewarded: number;
  triaged: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  bountiesUSD: number;
  cumulativeTotal: number;
  cumulativeBounties: number;
  movingAverage: number;
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthlySubmissionCadenceChart: React.FC<MonthlySubmissionCadenceChartProps> = ({
  reports,
  onNewReport,
  onSelectMonthFilter
}) => {
  const [cadenceMode, setCadenceMode] = useState<CadenceMode>('cadence');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('12M');
  const [hoveredPoint, setHoveredPoint] = useState<MonthDataPoint | null>(null);

  // Compute monthly chronological data
  const { monthlyData, metrics } = useMemo(() => {
    if (!reports || reports.length === 0) {
      return { monthlyData: [], metrics: { totalReports: 0, avgMonthly: 0, peakMonth: '-', peakCount: 0, totalBounties: 0, activeMonths: 0 } };
    }

    // 1. Determine all valid report dates
    const reportDateEntries = reports
      .map(r => {
        const d = new Date(r.createdAt);
        return {
          report: r,
          date: isNaN(d.getTime()) ? new Date() : d
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const earliestDate = reportDateEntries[0]?.date || new Date();
    const latestDate = reportDateEntries[reportDateEntries.length - 1]?.date || new Date();
    const currentDate = new Date();
    const endDate = latestDate > currentDate ? latestDate : currentDate;

    // Calculate start date based on timeframe filter
    let startDate = new Date(earliestDate);
    if (timeframe === '6M') {
      startDate = new Date(endDate);
      startDate.setMonth(endDate.getMonth() - 5);
      startDate.setDate(1);
    } else if (timeframe === '12M') {
      startDate = new Date(endDate);
      startDate.setMonth(endDate.getMonth() - 11);
      startDate.setDate(1);
    } else {
      // 'ALL': start at the first day of the earliest report's month
      startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    }

    // 2. Generate month-by-month keys between startDate and endDate
    const monthKeys: { year: number; month: number; key: string }[] = [];
    const curIter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endBoundary = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);

    while (curIter < endBoundary) {
      const y = curIter.getFullYear();
      const m = curIter.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      monthKeys.push({ year: y, month: m, key });
      curIter.setMonth(curIter.getMonth() + 1);
    }

    // 3. Aggregate reports by monthKey
    let runningCumulativeTotal = 0;
    let runningCumulativeBounties = 0;
    const points: MonthDataPoint[] = [];

    monthKeys.forEach((mObj, idx) => {
      const monthReports = reports.filter(r => {
        const d = new Date(r.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === mObj.year && d.getMonth() === mObj.month;
      });

      const total = monthReports.length;
      const rewarded = monthReports.filter(r => r.status === 'REWARDED' || r.status === 'RESOLVED').length;
      const triaged = monthReports.filter(r => r.status === 'TRIAGED').length;
      const critical = monthReports.filter(r => r.severity === 'CRITICAL').length;
      const high = monthReports.filter(r => r.severity === 'HIGH').length;
      const medium = monthReports.filter(r => r.severity === 'MEDIUM').length;
      const low = monthReports.filter(r => r.severity === 'LOW' || r.severity === 'INFO').length;
      const bountiesUSD = monthReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

      runningCumulativeTotal += total;
      runningCumulativeBounties += bountiesUSD;

      const yearShort = String(mObj.year).slice(-2);
      const monthLabel = `${MONTH_NAMES_SHORT[mObj.month]} ${yearShort}`;
      const fullMonthName = `${MONTH_NAMES_FULL[mObj.month]} de ${mObj.year}`;

      points.push({
        monthKey: mObj.key,
        monthLabel,
        fullMonthName,
        total,
        rewarded,
        triaged,
        critical,
        high,
        medium,
        low,
        bountiesUSD,
        cumulativeTotal: runningCumulativeTotal,
        cumulativeBounties: runningCumulativeBounties,
        movingAverage: 0 // calculated next
      });
    });

    // 4. Calculate 3-month moving average for smoothing cadence
    points.forEach((pt, i) => {
      const window = points.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((sum, item) => sum + item.total, 0) / window.length;
      pt.movingAverage = Number(avg.toFixed(1));
    });

    // 5. Compute metrics
    const totalReports = points.reduce((acc, p) => acc + p.total, 0);
    const totalBounties = points.reduce((acc, p) => acc + p.bountiesUSD, 0);
    const activeMonths = points.filter(p => p.total > 0).length;
    const avgMonthly = points.length > 0 ? Number((totalReports / points.length).toFixed(1)) : 0;

    let peakMonth = '-';
    let peakCount = 0;
    points.forEach(p => {
      if (p.total > peakCount) {
        peakCount = p.total;
        peakMonth = p.monthLabel;
      }
    });

    return {
      monthlyData: points,
      metrics: {
        totalReports,
        avgMonthly,
        peakMonth: peakCount > 0 ? `${peakMonth} (${peakCount})` : 'N/A',
        peakCount,
        totalBounties,
        activeMonths
      }
    };
  }, [reports, timeframe]);

  // Custom sleek tooltip for dark mode
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: MonthDataPoint = payload[0].payload;

    return (
      <div className="bg-[#0e0e11] border border-[#2b2b32] rounded-xl p-3.5 shadow-2xl backdrop-blur-md min-w-[210px] text-xs font-sans">
        <div className="flex items-center justify-between border-b border-[#222228] pb-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-zinc-100">{data.fullMonthName}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            {data.total} {data.total === 1 ? 'relatório' : 'relatórios'}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Submissões Totais:
            </span>
            <span className="font-bold text-white">{data.total}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Validados / Aceitos:
            </span>
            <span className="text-blue-300 font-semibold">{data.rewarded}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Bounties Pagos:
            </span>
            <span className="text-amber-300 font-semibold">{formatCurrency(data.bountiesUSD, 'USD')}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
              Média Móvel (3M):
            </span>
            <span className="text-zinc-400 font-semibold">{data.movingAverage} /mês</span>
          </div>

          {/* Severity Micro Breakdown */}
          <div className="pt-2 border-t border-[#1e1e24] grid grid-cols-4 gap-1 text-center text-[10px]">
            <div className="bg-red-950/40 border border-red-500/30 rounded py-1 text-red-300">
              <div className="font-bold">{data.critical}</div>
              <div className="text-[8px] uppercase text-red-400/80">Crit</div>
            </div>
            <div className="bg-amber-950/40 border border-amber-500/30 rounded py-1 text-amber-300">
              <div className="font-bold">{data.high}</div>
              <div className="text-[8px] uppercase text-amber-400/80">High</div>
            </div>
            <div className="bg-blue-950/40 border border-blue-500/30 rounded py-1 text-blue-300">
              <div className="font-bold">{data.medium}</div>
              <div className="text-[8px] uppercase text-blue-400/80">Med</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-700/40 rounded py-1 text-zinc-400">
              <div className="font-bold">{data.low}</div>
              <div className="text-[8px] uppercase text-zinc-500">Low</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-[#0a0a0a] border border-[#262626] p-5 sm:p-6 shadow-xl space-y-5">
      
      {/* Header with Title, Insights & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1e1e22] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Cadência Mensal de Submissões</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Timeline
              </span>
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
            Acompanhamento contínuo da velocidade de entrega de relatórios, estabilidade de pesquisas e conversão financeira por mês.
          </p>
        </div>

        {/* Action Toolbar: View Modes & Timeframes */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          
          {/* Mode Selector Pill */}
          <div className="inline-flex p-0.5 bg-[#121214] border border-[#262628] rounded-lg text-xs font-mono">
            <button
              type="button"
              id="cadence-mode-general"
              onClick={() => setCadenceMode('cadence')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                cadenceMode === 'cadence'
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Cadência geral de submissões e taxa de aceitação"
            >
              Cadência
            </button>
            <button
              type="button"
              id="cadence-mode-severity"
              onClick={() => setCadenceMode('severity')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                cadenceMode === 'severity'
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Comparativo de volume por severidade (Crítica, Alta, Média, Baixa)"
            >
              Severidade
            </button>
            <button
              type="button"
              id="cadence-mode-bounties"
              onClick={() => setCadenceMode('bounties')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                cadenceMode === 'bounties'
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Correlação entre volume de bugs e bounties ($ USD)"
            >
              Bounties ($)
            </button>
            <button
              type="button"
              id="cadence-mode-cumulative"
              onClick={() => setCadenceMode('cumulative')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                cadenceMode === 'cumulative'
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Curva de crescimento acumulado ao longo do tempo"
            >
              Acumulado
            </button>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="inline-flex p-0.5 bg-[#121214] border border-[#262628] rounded-lg text-xs font-mono">
            {(['6M', '12M', 'ALL'] as TimeframeFilter[]).map(tf => (
              <button
                key={tf}
                type="button"
                id={`cadence-timeframe-${tf.toLowerCase()}`}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md transition-all font-medium ${
                  timeframe === tf
                    ? 'bg-zinc-800 text-emerald-400 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tf === 'ALL' ? 'Tudo' : tf}
              </button>
            ))}
          </div>

          {onNewReport && (
            <button
              type="button"
              id="btn-cadence-new-report"
              onClick={onNewReport}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Registrar Novo Relatório"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Bug</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Cadência Média</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold font-mono text-emerald-400">{metrics.avgMonthly}</span>
            <span className="text-xs text-zinc-400 font-mono">bugs / mês</span>
          </div>
          <span className="text-[10px] text-zinc-500">nos últimos {monthlyData.length} meses</span>
        </div>

        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Mês de Pico</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base sm:text-lg font-bold font-mono text-white truncate">{metrics.peakMonth}</span>
          </div>
          <span className="text-[10px] text-zinc-500">recorde de submissões</span>
        </div>

        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Total no Período</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold font-mono text-white">{metrics.totalReports}</span>
            <span className="text-xs text-zinc-400 font-mono">achados</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">{metrics.activeMonths} meses ativos</span>
        </div>

        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Bounties do Período</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold font-mono text-amber-400">{formatCurrency(metrics.totalBounties, 'USD')}</span>
          </div>
          <span className="text-[10px] text-zinc-500">em recompensas pagas</span>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="w-full h-[320px] pt-2">
        {monthlyData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-lg">
            <Activity className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Nenhuma submissão registrada no período</p>
            <p className="text-xs text-zinc-500 mt-1">Cadastre novos relatórios para visualizar a cadência mensal.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c20" vertical={false} />
              
              <XAxis
                dataKey="monthLabel"
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                dy={8}
              />
              
              <YAxis
                yAxisId="left"
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                allowDecimals={false}
                domain={[0, 'auto']}
              />

              {cadenceMode === 'bounties' && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f59e0b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#78350f' }}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  domain={[0, 'auto']}
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {/* Mode: Cadência Geral */}
              {cadenceMode === 'cadence' && (
                <>
                  {/* Total Submissions Line */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    name="Submissões Totais"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#0a0a0a', stroke: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#10b981', stroke: '#ffffff', strokeWidth: 2, r: 6 }}
                    isAnimationActive={true}
                    animationDuration={900}
                  />

                  {/* Rewarded / Validated Line */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="rewarded"
                    name="Validados / Pagos"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#0a0a0a', stroke: '#3b82f6', strokeWidth: 2, r: 3.5 }}
                    activeDot={{ fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2, r: 5 }}
                    isAnimationActive={true}
                    animationDuration={1100}
                  />

                  {/* 3-Month Moving Average (Trend Smooth Line) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="movingAverage"
                    name="Média Móvel (3M)"
                    stroke="#a1a1aa"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1300}
                  />
                </>
              )}

              {/* Mode: Por Severidade */}
              {cadenceMode === 'severity' && (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="critical"
                    name="Crítico"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ fill: '#ef4444', r: 3.5 }}
                    activeDot={{ r: 5.5 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="high"
                    name="Alto"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="medium"
                    name="Médio"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="low"
                    name="Baixo / Info"
                    stroke="#71717a"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={{ fill: '#71717a', r: 2.5 }}
                    activeDot={{ r: 4.5 }}
                  />
                </>
              )}

              {/* Mode: Bounties vs Submissões */}
              {cadenceMode === 'bounties' && (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    name="Volume de Bugs (un)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bountiesUSD"
                    name="Recompensas ($ USD)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </>
              )}

              {/* Mode: Acumulado */}
              {cadenceMode === 'cumulative' && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cumulativeTotal"
                  name="Total Acumulado"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#0a0a0a', stroke: '#10b981', strokeWidth: 2, r: 4.5 }}
                  activeDot={{ fill: '#10b981', stroke: '#ffffff', strokeWidth: 2, r: 7 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Insight Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1a1a1d] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4 text-zinc-400">
          {cadenceMode === 'cadence' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block" />
                <span>Submissões Totais</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-blue-400 rounded-full inline-block" />
                <span>Validados / Pagos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-b border-dashed border-zinc-400 inline-block" />
                <span>Média Móvel (3M)</span>
              </div>
            </>
          )}

          {cadenceMode === 'severity' && (
            <>
              <div className="flex items-center gap-1.5 text-red-400">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" />
                <span>Crítico</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
                <span>Alto</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" />
                <span>Médio</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 bg-zinc-600 rounded-full inline-block" />
                <span>Baixo / Info</span>
              </div>
            </>
          )}

          {cadenceMode === 'bounties' && (
            <>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block" />
                <span>Submissões (Eixo Esquerdo)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-1 bg-amber-400 rounded-full inline-block" />
                <span>Bounties USD (Eixo Direito)</span>
              </div>
            </>
          )}

          {cadenceMode === 'cumulative' && (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block" />
              <span>Crescimento de Portfólio de Vulnerabilidades</span>
            </div>
          )}
        </div>

        <div className="text-zinc-500 text-[11px] flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-500/70" />
          <span>Calculado em tempo real sobre {reports.length} relatórios</span>
        </div>
      </div>

    </div>
  );
};
