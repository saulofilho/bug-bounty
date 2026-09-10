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
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Zap,
  Target,
  Award,
  Clock,
  Plus,
  BarChart2,
  ChevronRight,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';

interface ReportsTrendChartProps {
  reports: VulnerabilityReport[];
  onNewReport?: () => void;
}

type TimeframeOption = 30 | 14 | 7;
type ViewModeOption = 'daily' | 'cumulative' | 'severity';

export const ReportsTrendChart: React.FC<ReportsTrendChartProps> = ({
  reports,
  onNewReport
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>(30);
  const [viewMode, setViewMode] = useState<ViewModeOption>('daily');
  const [anchorPreference, setAnchorPreference] = useState<'auto' | 'now'>('auto');

  // Compute anchor date
  const { anchorDate, isHistoricalFallback, usingHistorical } = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const hasRecentReports = reports.some(r => {
      const d = new Date(r.createdAt);
      return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
    });

    if (hasRecentReports || anchorPreference === 'now') {
      return { anchorDate: now, isHistoricalFallback: !hasRecentReports, usingHistorical: false };
    } else {
      // Find latest date in reports
      const sorted = [...reports].filter(r => r.createdAt).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (sorted.length > 0) {
        const latest = new Date(sorted[0].createdAt);
        return { anchorDate: isNaN(latest.getTime()) ? now : latest, isHistoricalFallback: true, usingHistorical: true };
      }
      return { anchorDate: now, isHistoricalFallback: false, usingHistorical: false };
    }
  }, [reports, anchorPreference]);

  // Generate date series for the selected timeframe (7, 14, or 30 days)
  const { chartData, metrics } = useMemo(() => {
    const days = timeframe;
    const result = [];
    let runningTotal = 0;
    let totalCreated = 0;
    let totalBounty = 0;
    let activeDaysCount = 0;
    let maxCountInSingleDay = 0;
    let peakDayFormatted = '-';

    // Build map of reports by date (YYYY-MM-DD)
    const reportsByDate = new Map<string, VulnerabilityReport[]>();
    reports.forEach(r => {
      const dateKey = r.createdAt ? r.createdAt.substring(0, 10) : '';
      if (dateKey) {
        const existing = reportsByDate.get(dateKey) || [];
        existing.push(r);
        reportsByDate.set(dateKey, existing);
      }
    });

    // Also calculate any reports created BEFORE the window for cumulative calculation
    const windowStartDate = new Date(anchorDate);
    windowStartDate.setDate(anchorDate.getDate() - (days - 1));
    windowStartDate.setHours(0, 0, 0, 0);

    const reportsBeforeWindow = reports.filter(r => {
      const d = new Date(r.createdAt);
      return !isNaN(d.getTime()) && d < windowStartDate;
    });
    runningTotal = reportsBeforeWindow.length;

    // Loop through each day in the window
    for (let i = days - 1; i >= 0; i--) {
      const currentDay = new Date(anchorDate);
      currentDay.setDate(anchorDate.getDate() - i);
      const dateStr = currentDay.toISOString().split('T')[0];

      // Format for X-axis: "07/09" or "07 Set"
      const dayNum = String(currentDay.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const displayDate = `${dayNum} ${monthNames[currentDay.getMonth()]}`;
      const fullDate = currentDay.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const dayReports = reportsByDate.get(dateStr) || [];
      const dayCount = dayReports.length;

      const criticalCount = dayReports.filter(r => r.severity === 'CRITICAL').length;
      const highCount = dayReports.filter(r => r.severity === 'HIGH').length;
      const mediumCount = dayReports.filter(r => r.severity === 'MEDIUM').length;
      const lowInfoCount = dayReports.filter(r => r.severity === 'LOW' || r.severity === 'INFO').length;
      const dayBounty = dayReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

      runningTotal += dayCount;
      totalCreated += dayCount;
      totalBounty += dayBounty;

      if (dayCount > 0) {
        activeDaysCount++;
        if (dayCount > maxCountInSingleDay) {
          maxCountInSingleDay = dayCount;
          peakDayFormatted = `${displayDate} (${dayCount} ${dayCount === 1 ? 'achado' : 'achados'})`;
        }
      }

      result.push({
        date: dateStr,
        displayDate,
        fullDate,
        count: dayCount,
        cumulativeCount: runningTotal,
        criticalCount,
        highCount,
        criticalHighCount: criticalCount + highCount,
        mediumCount,
        lowInfoCount,
        bountyTotal: dayBounty,
        reports: dayReports
      });
    }

    const weeklyAverage = Number((totalCreated / (days / 7)).toFixed(1));

    return {
      chartData: result,
      metrics: {
        totalCreated,
        totalBounty,
        activeDaysCount,
        weeklyAverage,
        maxCountInSingleDay,
        peakDayFormatted
      }
    };
  }, [reports, timeframe, anchorDate]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dayReports: VulnerabilityReport[] = data.reports || [];

      return (
        <div className="bg-[#121212] border border-[#333] p-3 rounded-lg shadow-2xl text-xs space-y-2 font-mono max-w-xs z-50">
          <div className="flex items-center justify-between border-b border-[#262626] pb-1.5">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {data.fullDate}
            </span>
            <span className="text-[10px] text-zinc-500">{data.displayDate}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] py-1">
            <div className="bg-[#181818] p-1.5 rounded border border-[#262626]">
              <span className="text-zinc-500 block text-[9px] uppercase">Novos Relatórios</span>
              <span className="text-emerald-400 font-bold text-sm">{data.count}</span>
            </div>
            <div className="bg-[#181818] p-1.5 rounded border border-[#262626]">
              <span className="text-zinc-500 block text-[9px] uppercase">Total Acumulado</span>
              <span className="text-white font-bold text-sm">{data.cumulativeCount}</span>
            </div>
          </div>

          {data.count > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] text-zinc-400 font-semibold uppercase flex items-center justify-between">
                <span>Vulnerabilidades ({data.count}):</span>
                {data.bountyTotal > 0 && (
                  <span className="text-emerald-400 font-bold">
                    +{formatCurrency(data.bountyTotal, 'USD')}
                  </span>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {dayReports.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="p-1.5 rounded bg-[#171717] border border-[#262626] text-[10px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white font-medium truncate">{r.id}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          r.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400'
                            : r.severity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400'
                            : r.severity === 'MEDIUM'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {r.severity}
                      </span>
                    </div>
                    <div className="text-zinc-400 truncate text-[10px]">{r.title}</div>
                    <div className="text-zinc-500 text-[9px] truncate">{r.target}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 italic text-center py-1">
              Nenhuma vulnerabilidade submetida nesta data.
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-xl">
      {/* Top Header with Title, Mode Switcher & Timeframe controls */}
      <div className="p-4 border-b border-[#262626] bg-[#111] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Tendência de Relatórios & Produtividade
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
                Últimos {timeframe} Dias
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ritmo de descoberta e submissão de vulnerabilidades ao longo do tempo.
            </p>
          </div>
        </div>

        {/* Action Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-[#171717] border border-[#262626] rounded p-0.5">
            <button
              type="button"
              id="trend-mode-daily"
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                viewMode === 'daily'
                  ? 'bg-[#262626] text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Volume de relatórios criados em cada dia"
            >
              Diário
            </button>
            <button
              type="button"
              id="trend-mode-cumulative"
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                viewMode === 'cumulative'
                  ? 'bg-[#262626] text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Crescimento acumulado de relatórios"
            >
              Acumulado
            </button>
            <button
              type="button"
              id="trend-mode-severity"
              onClick={() => setViewMode('severity')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                viewMode === 'severity'
                  ? 'bg-[#262626] text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Divisão por severidade"
            >
              Severidade
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#171717] border border-[#262626] rounded p-0.5">
            {([30, 14, 7] as TimeframeOption[]).map(tf => (
              <button
                key={tf}
                type="button"
                id={`trend-timeframe-${tf}`}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tf}d
              </button>
            ))}
          </div>

          {onNewReport && (
            <button
              type="button"
              id="btn-trend-add-report"
              onClick={onNewReport}
              className="px-2.5 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
              title="Registrar nova vulnerabilidade"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#262626] bg-[#0e0e0e] border-b border-[#262626]">
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Criados ({timeframe}d)</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">{metrics.totalCreated}</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {metrics.totalCreated === 1 ? 'achado' : 'achados'}
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Ritmo: <span className="text-emerald-400 font-semibold">{metrics.weeklyAverage}/sem</span>
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
            <Flame className="w-3 h-3 text-orange-400" />
            <span>Pico Diário</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-orange-400">
              {metrics.maxCountInSingleDay}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">no melhor dia</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5" title={metrics.peakDayFormatted}>
            {metrics.peakDayFormatted}
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span>Dias de Hunting</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-blue-400">
              {metrics.activeDaysCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">de {timeframe} dias</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Consistência: <span className="text-zinc-300 font-semibold">{Math.round((metrics.activeDaysCount / timeframe) * 100)}%</span>
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
            <Award className="w-3 h-3 text-emerald-400" />
            <span>Bounties do Período</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {formatCurrency(metrics.totalBounty, 'USD')}
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Média: <span className="text-zinc-300 font-semibold">{metrics.totalCreated > 0 ? formatCurrency(Math.round(metrics.totalBounty / metrics.totalCreated), 'USD') : '$0'}</span>/achado
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="p-4 sm:p-6 bg-[#0a0a0a] relative">
        {/* Subtle background glow effect */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'cumulative' ? (
              <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulativeCount"
                  name="Relatórios Acumulados"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#cumulativeGradient)"
                  dot={{ fill: '#10b981', r: 3, stroke: '#052e16', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : viewMode === 'severity' ? (
              <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-[11px] font-mono text-zinc-300">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="criticalCount"
                  name="Crítico"
                  stroke="#ef4444"
                  strokeWidth={2.2}
                  dot={{ fill: '#ef4444', r: 3 }}
                  activeDot={{ r: 5, fill: '#f87171' }}
                />
                <Line
                  type="monotone"
                  dataKey="highCount"
                  name="Alto"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 2.5 }}
                  activeDot={{ r: 5, fill: '#fb923c' }}
                />
                <Line
                  type="monotone"
                  dataKey="mediumCount"
                  name="Médio"
                  stroke="#eab308"
                  strokeWidth={1.8}
                  dot={{ fill: '#eab308', r: 2 }}
                  activeDot={{ r: 5, fill: '#facc15' }}
                />
                <Line
                  type="monotone"
                  dataKey="lowInfoCount"
                  name="Baixo / Info"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={{ fill: '#3b82f6', r: 2 }}
                  activeDot={{ r: 5, fill: '#60a5fa' }}
                />
              </LineChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  formatter={(value) => (
                    <span className="text-[11px] font-mono text-zinc-300">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Novos Relatórios"
                  stroke="#10b981"
                  strokeWidth={2.6}
                  dot={{ fill: '#10b981', r: 3.5, stroke: '#064e3b', strokeWidth: 1.5 }}
                  activeDot={{ r: 6.5, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="criticalHighCount"
                  name="Críticos & Altos (High Impact)"
                  stroke="#f43f5e"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={{ fill: '#f43f5e', r: 2.5 }}
                  activeDot={{ r: 5, fill: '#fda4af' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Bottom Legend & Status note */}
        <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Volume Total Diário</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-rose-500" />
              <span>Críticos & Altos</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Período analisado: <strong className="text-zinc-300">{chartData[0]?.displayDate}</strong> até <strong className="text-zinc-300">{chartData[chartData.length - 1]?.displayDate}</strong>
            </span>
            {isHistoricalFallback && (
              <button
                type="button"
                id="btn-toggle-anchor-date"
                onClick={() => setAnchorPreference(usingHistorical ? 'now' : 'auto')}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-1"
                title="Alternar entre a data atual e a data do último relatório registrado"
              >
                {usingHistorical ? 'Alternar para tempo real (Hoje)' : 'Exibir período ativo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
