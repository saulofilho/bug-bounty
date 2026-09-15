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
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Layers,
  ShieldAlert,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  CheckCircle2,
  Award,
  Zap,
  Target,
  HelpCircle
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface SixMonthTrendLineChartProps {
  reports: VulnerabilityReport[];
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
}

type TrendViewMode = 'total' | 'severity' | 'cumulative';

interface MonthDataPoint {
  monthKey: string;      // YYYY-MM
  monthShort: string;    // "Abr/26"
  monthName: string;     // "Abril"
  year: number;
  newReports: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  bountiesUSD: number;
  cumulative: number;
  monthReports: VulnerabilityReport[];
  deltaFromPrev: number | null; // % difference or diff count
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const SixMonthTrendLineChart: React.FC<SixMonthTrendLineChartProps> = ({
  reports,
  onNewReport,
  onNavigateToReports
}) => {
  const [viewMode, setViewMode] = useState<TrendViewMode>('total');
  const [curveType, setCurveType] = useState<'monotone' | 'linear'>('monotone');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Calculate chronological data for the LAST 6 MONTHS
  const { sixMonthData, summaryMetrics } = useMemo(() => {
    const now = new Date();
    const months: { year: number; monthIndex: number; key: string; short: string; full: string }[] = [];

    // Generate exactly the last 6 months (5 months ago to current month)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const short = `${MONTH_NAMES_SHORT[m]}/${String(y).slice(-2)}`;
      const full = `${MONTH_NAMES_FULL[m]} ${y}`;
      months.push({ year: y, monthIndex: m, key, short, full });
    }

    let runningCumulative = 0;
    const points: MonthDataPoint[] = [];

    months.forEach((mObj, idx) => {
      // Find reports whose createdAt matches this month and year
      const matchingReports = reports.filter(r => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === mObj.year && d.getMonth() === mObj.monthIndex;
      });

      const newCount = matchingReports.length;
      runningCumulative += newCount;

      const critical = matchingReports.filter(r => r.severity === 'CRITICAL').length;
      const high = matchingReports.filter(r => r.severity === 'HIGH').length;
      const medium = matchingReports.filter(r => r.severity === 'MEDIUM').length;
      const low = matchingReports.filter(r => r.severity === 'LOW' || r.severity === 'INFO').length;
      const bountiesUSD = matchingReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

      // Delta comparison to previous month
      let deltaFromPrev: number | null = null;
      if (idx > 0) {
        const prevCount = points[idx - 1].newReports;
        deltaFromPrev = newCount - prevCount;
      }

      points.push({
        monthKey: mObj.key,
        monthShort: mObj.short,
        monthName: mObj.full,
        year: mObj.year,
        newReports: newCount,
        critical,
        high,
        medium,
        low,
        bountiesUSD,
        cumulative: runningCumulative,
        monthReports: matchingReports,
        deltaFromPrev
      });
    });

    // Summary calculations across the 6-month span
    const totalNew = points.reduce((sum, p) => sum + p.newReports, 0);
    const totalBounties = points.reduce((sum, p) => sum + p.bountiesUSD, 0);
    const avgMonthly = (totalNew / 6).toFixed(1);

    // Peak month identification
    const peakPoint = [...points].sort((a, b) => b.newReports - a.newReports)[0];
    const peakMonthName = peakPoint && peakPoint.newReports > 0 ? `${peakPoint.monthName} (${peakPoint.newReports} achados)` : 'Nenhum';

    // Growth trend between first half (months 0-2) and second half (months 3-5)
    const firstHalfCount = points.slice(0, 3).reduce((sum, p) => sum + p.newReports, 0);
    const secondHalfCount = points.slice(3, 6).reduce((sum, p) => sum + p.newReports, 0);
    let growthPercent = 0;
    if (firstHalfCount > 0) {
      growthPercent = Math.round(((secondHalfCount - firstHalfCount) / firstHalfCount) * 100);
    } else if (secondHalfCount > 0) {
      growthPercent = 100;
    }

    return {
      sixMonthData: points,
      summaryMetrics: {
        totalNew,
        totalBounties,
        avgMonthly,
        peakMonthName,
        growthPercent,
        hasReports: totalNew > 0
      }
    };
  }, [reports]);

  // Max value for Y-Axis headroom
  const maxYValue = useMemo(() => {
    if (viewMode === 'cumulative') {
      const maxCum = Math.max(...sixMonthData.map(d => d.cumulative), 1);
      return Math.ceil(maxCum * 1.15);
    }
    const maxVal = Math.max(...sixMonthData.map(d => d.newReports), 1);
    return Math.max(maxVal + 1, 4);
  }, [sixMonthData, viewMode]);

  // Custom Tooltip with high-density security telemetry
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: MonthDataPoint = payload[0].payload;
      return (
        <div className="bg-[#101014]/95 backdrop-blur-md border border-[#2b2b35] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-mono min-w-[240px] z-50">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#262630]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white uppercase text-sm">{data.monthName}</span>
            </div>
            {data.deltaFromPrev !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 ${
                data.deltaFromPrev > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : data.deltaFromPrev < 0
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {data.deltaFromPrev > 0 ? `+${data.deltaFromPrev}` : data.deltaFromPrev} vs anterior
              </span>
            )}
          </div>

          <div className="space-y-1 text-zinc-300">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Novos Relatórios:</span>
              <span className="font-bold text-emerald-400 text-sm font-mono">
                {data.newReports} descobertas
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total Acumulado:</span>
              <span className="font-bold text-white font-mono">
                {data.cumulative} relatórios
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Bounties no Mês:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatCurrency(data.bountiesUSD, 'USD')}
              </span>
            </div>
          </div>

          {/* Breakdown per severity in this specific month */}
          {data.newReports > 0 && (
            <div className="pt-2 border-t border-[#262630] space-y-1.5">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Severidades do Mês:</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {data.critical > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300">
                    <span>Critical:</span>
                    <span className="font-bold">{data.critical}</span>
                  </div>
                )}
                {data.high > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300">
                    <span>High:</span>
                    <span className="font-bold">{data.high}</span>
                  </div>
                )}
                {data.medium > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                    <span>Medium:</span>
                    <span className="font-bold">{data.medium}</span>
                  </div>
                )}
                {data.low > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    <span>Low:</span>
                    <span className="font-bold">{data.low}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.monthReports.length > 0 && (
            <div className="pt-1 text-[10px] text-zinc-500 italic truncate">
              Alvos: {Array.from(new Set(data.monthReports.map(r => r.target))).slice(0, 2).join(', ')}
              {new Set(data.monthReports.map(r => r.target)).size > 2 ? '...' : ''}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-2xl">
      
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#111113] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold uppercase text-zinc-100 tracking-wider">
                Tendência de Descobertas (Últimos 6 Meses)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 border border-[#2e2e2e] text-zinc-300 font-mono">
                Recharts Line Chart
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                Cadência Mensal
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evolução temporal de vulnerabilidades descobertas ao longo do último semestre
            </p>
          </div>
        </div>

        {/* Action Controls: View Mode & Curve Style */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode: Total vs Severity vs Cumulative */}
          <div className="flex items-center bg-[#17171a] p-0.5 rounded-lg border border-[#2c2c36]">
            <button
              type="button"
              id="btn-six-month-view-total"
              onClick={() => setViewMode('total')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'total'
                  ? 'bg-[#282832] text-emerald-400 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Linha de novos relatórios descobertos mês a mês"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Descobertas ({summaryMetrics.totalNew})</span>
            </button>

            <button
              type="button"
              id="btn-six-month-view-severity"
              onClick={() => setViewMode('severity')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'severity'
                  ? 'bg-[#282832] text-amber-400 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Desagregação de linhas por severidade (Crítico, Alto, Médio, Baixo)"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Por Severidade</span>
            </button>

            <button
              type="button"
              id="btn-six-month-view-cumulative"
              onClick={() => setViewMode('cumulative')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'cumulative'
                  ? 'bg-[#282832] text-blue-400 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Curva acumulativa do crescimento do inventário de falhas"
            >
              <Layers className="w-3 h-3" />
              <span>Acumulado</span>
            </button>
          </div>

          {/* Curve Smoothing Toggle */}
          <button
            type="button"
            id="btn-six-month-curve-toggle"
            onClick={() => setCurveType(prev => prev === 'monotone' ? 'linear' : 'monotone')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#17171a] hover:bg-[#202026] text-zinc-300 hover:text-white border border-[#2c2c36] text-xs font-mono transition-all"
            title="Alternar suavização da linha (Monotone / Linear)"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{curveType === 'monotone' ? 'Suave' : 'Reto'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#222] border-b border-[#222] bg-[#0d0d10] text-xs font-mono">
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Total no Semestre</span>
          <span className="text-emerald-400 font-bold">{summaryMetrics.totalNew} relatórios</span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Média Mensal</span>
          <span className="text-white font-bold">{summaryMetrics.avgMonthly} achados/mês</span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Mês de Pico</span>
          <span className="text-amber-400 font-bold truncate max-w-[140px] text-right" title={summaryMetrics.peakMonthName}>
            {summaryMetrics.peakMonthName}
          </span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Recompensas Semestre</span>
          <span className="text-emerald-400 font-bold">{formatCurrency(summaryMetrics.totalBounties, 'USD')}</span>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="p-4 sm:p-6">
        {!summaryMetrics.hasReports ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h5 className="text-sm font-semibold text-zinc-300">Nenhum dado no período semestral</h5>
              <p className="text-xs text-zinc-500">
                Cadastre novas vulnerabilidades para começar a acompanhar o gráfico de tendência de descobertas ao longo dos últimos 6 meses.
              </p>
            </div>
            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Submissão +</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Active Readout / Legend Header */}
            <div className="flex items-center justify-between text-xs font-mono px-1 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {viewMode === 'total' && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
                    <span className="text-zinc-200 font-bold">Novos Relatórios Descobertos</span>
                    <span className="text-zinc-500 text-[11px]">(Área com gradiente)</span>
                  </div>
                )}

                {viewMode === 'severity' && (
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical
                    </span>
                    <span className="flex items-center gap-1 text-orange-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Medium
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Low/Info
                    </span>
                  </div>
                )}

                {viewMode === 'cumulative' && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-400 rounded-full" />
                    <span className="text-blue-300 font-bold">Total Acumulado de Descobertas</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Passe o mouse nos marcadores para detalhes</span>
              </div>
            </div>

            {/* Recharts Line Chart Container */}
            <div className="w-full h-72 sm:h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'total' ? (
                  <AreaChart
                    data={sixMonthData}
                    margin={{ top: 20, right: 20, left: -15, bottom: 6 }}
                  >
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" vertical={false} />
                    <XAxis
                      dataKey="monthShort"
                      stroke="#52525b"
                      tick={{ fill: '#e4e4e7', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis
                      stroke="#52525b"
                      tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                      allowDecimals={false}
                      domain={[0, maxYValue]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type={curveType}
                      dataKey="newReports"
                      name="Novos Relatórios"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#emeraldGradient)"
                      activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                      dot={{ r: 4.5, stroke: '#10b981', strokeWidth: 2, fill: '#0a0a0a' }}
                      isAnimationActive={true}
                      animationDuration={700}
                    />
                  </AreaChart>
                ) : viewMode === 'severity' ? (
                  <LineChart
                    data={sixMonthData}
                    margin={{ top: 20, right: 20, left: -15, bottom: 6 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" vertical={false} />
                    <XAxis
                      dataKey="monthShort"
                      stroke="#52525b"
                      tick={{ fill: '#e4e4e7', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis
                      stroke="#52525b"
                      tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                      allowDecimals={false}
                      domain={[0, maxYValue]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'monospace' }}
                      formatter={(val) => <span className="text-zinc-300 font-mono text-xs">{val}</span>}
                    />
                    <Line
                      type={curveType}
                      dataKey="critical"
                      name="Critical"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#ef4444' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type={curveType}
                      dataKey="high"
                      name="High"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#f97316' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type={curveType}
                      dataKey="medium"
                      name="Medium"
                      stroke="#eab308"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#eab308' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type={curveType}
                      dataKey="low"
                      name="Low/Info"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : (
                  <AreaChart
                    data={sixMonthData}
                    margin={{ top: 20, right: 20, left: -15, bottom: 6 }}
                  >
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" vertical={false} />
                    <XAxis
                      dataKey="monthShort"
                      stroke="#52525b"
                      tick={{ fill: '#e4e4e7', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis
                      stroke="#52525b"
                      tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                      allowDecimals={false}
                      domain={[0, maxYValue]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type={curveType}
                      dataKey="cumulative"
                      name="Acumulado"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#blueGradient)"
                      activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                      dot={{ r: 4.5, stroke: '#3b82f6', strokeWidth: 2, fill: '#0a0a0a' }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* 6 Monthly Milestone Micro-Cards Below Line Chart */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {sixMonthData.map((pt, idx) => {
                const isHovered = hoveredMonth === pt.monthKey;
                const isCurrentMonth = idx === 5;
                return (
                  <div
                    key={pt.monthKey}
                    id={`milestone-month-${pt.monthKey}`}
                    onMouseEnter={() => setHoveredMonth(pt.monthKey)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    onClick={() => {
                      if (onNavigateToReports) onNavigateToReports();
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer text-xs font-mono relative overflow-hidden ${
                      isHovered
                        ? 'bg-[#181822] border-emerald-500/50 shadow-md scale-[1.02]'
                        : isCurrentMonth
                        ? 'bg-[#111116] border-emerald-500/30'
                        : 'bg-[#111115] border-[#25252d] hover:border-zinc-600'
                    }`}
                  >
                    {isCurrentMonth && (
                      <span className="absolute top-1 right-1 text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        Atual
                      </span>
                    )}

                    <div className="text-zinc-400 font-semibold mb-1">
                      {pt.monthShort}
                    </div>

                    <div className="text-lg font-bold text-white mb-1">
                      {pt.newReports}{' '}
                      <span className="text-[10px] font-normal text-zinc-500">achados</span>
                    </div>

                    <div className="text-[10px] text-emerald-400 font-bold truncate">
                      {pt.bountiesUSD > 0 ? formatCurrency(pt.bountiesUSD, 'USD') : '$0'}
                    </div>

                    {/* Mini Severity pill indicator */}
                    <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[#22222b]">
                      {pt.critical > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" title={`${pt.critical} crítico(s)`} />
                      )}
                      {pt.high > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title={`${pt.high} alto(s)`} />
                      )}
                      {pt.medium > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title={`${pt.medium} médio(s)`} />
                      )}
                      {pt.low > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${pt.low} baixo(s)`} />
                      )}
                      {pt.newReports === 0 && (
                        <span className="text-[9px] text-zinc-600">Sem reports</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanatory Footer */}
            <div className="p-3 bg-[#111115] border border-[#23232b] rounded-lg text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Cadência Semestral:</strong> Tendência acumulada calculada com base na data de descoberta (`createdAt`) de cada relatório.
                </span>
              </div>
              {onNavigateToReports && (
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 shrink-0 font-semibold"
                >
                  <span>Explorar relatórios completos</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
