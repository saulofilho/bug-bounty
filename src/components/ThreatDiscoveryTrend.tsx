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
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calendar,
  Zap,
  ShieldAlert,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Filter,
  Eye,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

export interface ThreatDiscoveryTrendProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
}

export type TrendDisplayMode = 'velocity' | 'severity' | 'cumulative';
export type TimeframeSpan = '6M' | '12M' | 'ALL';

export interface MonthlyDiscoveryDataPoint {
  monthKey: string;          // YYYY-MM
  monthLabel: string;        // "Mar/26"
  fullMonthName: string;     // "Março 2026"
  timestamp: number;
  totalDiscovered: number;   // Total vulnerabilities discovered in this month
  critical: number;
  high: number;
  medium: number;
  low: number;
  cumulative: number;
  movingAverage: number;     // 3-month rolling velocity
  deltaFromPrev: number;     // Difference compared to previous month
  reports: VulnerabilityReport[];
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ThreatDiscoveryTrend: React.FC<ThreatDiscoveryTrendProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateToReports
}) => {
  const [displayMode, setDisplayMode] = useState<TrendDisplayMode>('velocity');
  const [timeframe, setTimeframe] = useState<TimeframeSpan>('12M');
  const [selectedMonth, setSelectedMonth] = useState<MonthlyDiscoveryDataPoint | null>(null);

  // 1. Parse and aggregate all reports by discovery month from 'createdAt'
  const monthlyData: MonthlyDiscoveryDataPoint[] = useMemo(() => {
    if (!reports || reports.length === 0) return [];

    // Extract valid dates
    const reportDatePairs: { report: VulnerabilityReport; date: Date }[] = [];
    reports.forEach((report) => {
      let dateObj: Date;
      if (report.createdAt) {
        // Handle "YYYY-MM-DD" or ISO string
        const parsed = new Date(report.createdAt);
        dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
      } else {
        dateObj = new Date();
      }
      reportDatePairs.push({ report, date: dateObj });
    });

    if (reportDatePairs.length === 0) return [];

    // Find min and max month to build a continuous monthly timeline
    const timestamps = reportDatePairs.map((p) => p.date.getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps, Date.now()));

    // Normalize to first day of each month
    let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

    // Map of monthKey -> array of reports
    const buckets = new Map<string, VulnerabilityReport[]>();
    while (current < end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      buckets.set(key, []);
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    // Populate buckets
    reportDatePairs.forEach(({ report, date }) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(report);
    });

    // Build sorted points
    const sortedKeys = Array.from(buckets.keys()).sort();
    let cumulativeCount = 0;
    const points: MonthlyDiscoveryDataPoint[] = [];

    sortedKeys.forEach((key, idx) => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      const monthReports = buckets.get(key) || [];

      const totalDiscovered = monthReports.length;
      cumulativeCount += totalDiscovered;

      let critical = 0;
      let high = 0;
      let medium = 0;
      let low = 0;

      monthReports.forEach((r) => {
        if (r.severity === 'CRITICAL') critical++;
        else if (r.severity === 'HIGH') high++;
        else if (r.severity === 'MEDIUM') medium++;
        else low++;
      });

      const label = `${MONTH_NAMES_SHORT[monthIndex]}/${String(year).slice(-2)}`;
      const fullName = `${MONTH_NAMES_FULL[monthIndex]} de ${year}`;
      const timestamp = new Date(year, monthIndex, 1).getTime();

      // Delta compared to previous month
      const prevTotal = idx > 0 ? points[idx - 1].totalDiscovered : 0;
      const deltaFromPrev = idx > 0 ? totalDiscovered - prevTotal : 0;

      points.push({
        monthKey: key,
        monthLabel: label,
        fullMonthName: fullName,
        timestamp,
        totalDiscovered,
        critical,
        high,
        medium,
        low,
        cumulative: cumulativeCount,
        movingAverage: 0, // Calculated in subsequent pass
        deltaFromPrev,
        reports: monthReports
      });
    });

    // Calculate 3-month moving average for velocity trendline
    points.forEach((pt, i) => {
      let sum = 0;
      let count = 0;
      for (let offset = -2; offset <= 0; offset++) {
        const targetIdx = i + offset;
        if (targetIdx >= 0 && targetIdx < points.length) {
          sum += points[targetIdx].totalDiscovered;
          count++;
        }
      }
      pt.movingAverage = count > 0 ? Math.round((sum / count) * 10) / 10 : pt.totalDiscovered;
    });

    return points;
  }, [reports]);

  // 2. Filter data by timeframe
  const filteredData = useMemo(() => {
    if (timeframe === 'ALL') return monthlyData;
    const limit = timeframe === '6M' ? 6 : 12;
    return monthlyData.slice(-limit);
  }, [monthlyData, timeframe]);

  // 3. Statistical metrics for velocity analysis
  const metrics = useMemo(() => {
    if (monthlyData.length === 0) {
      return {
        avgVelocity: 0,
        peakMonth: null as MonthlyDiscoveryDataPoint | null,
        recentAcceleration: 0,
        highSeverityRate: 0,
        totalDiscovered: 0
      };
    }

    const totalDiscovered = reports.length;
    const totalMonths = monthlyData.length;
    const avgVelocity = totalMonths > 0 ? Math.round((totalDiscovered / totalMonths) * 10) / 10 : 0;

    // Peak discovery month
    let peakMonth = monthlyData[0];
    monthlyData.forEach((m) => {
      if (m.totalDiscovered > peakMonth.totalDiscovered) {
        peakMonth = m;
      }
    });

    // Recent acceleration (last month vs month prior)
    let recentAcceleration = 0;
    if (monthlyData.length >= 2) {
      const last = monthlyData[monthlyData.length - 1].totalDiscovered;
      const prev = monthlyData[monthlyData.length - 2].totalDiscovered;
      if (prev > 0) {
        recentAcceleration = Math.round(((last - prev) / prev) * 100);
      } else if (last > 0) {
        recentAcceleration = 100;
      }
    }

    // Critical + High rate
    let criticalHighCount = 0;
    reports.forEach((r) => {
      if (r.severity === 'CRITICAL' || r.severity === 'HIGH') {
        criticalHighCount++;
      }
    });
    const highSeverityRate = totalDiscovered > 0 ? Math.round((criticalHighCount / totalDiscovered) * 100) : 0;

    return {
      avgVelocity,
      peakMonth,
      recentAcceleration,
      highSeverityRate,
      totalDiscovered
    };
  }, [reports, monthlyData]);

  return (
    <div
      id="threat-discovery-trend-card"
      className="bg-[#0e1017] border border-[#1e2338] rounded-2xl overflow-hidden shadow-xl mb-8"
    >
      {/* Component Header with Filters and Actions */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#121522] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Threat Discovery Trend</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1d2238] text-emerald-300 border border-emerald-500/30">
                  Velocidade de Descoberta
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rastreamento da taxa mensal de vulnerabilidades encontradas a partir da data de criação dos relatórios.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Controls & Timeframe Selector */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mode Selector */}
          <div className="bg-[#090b11] border border-[#1e2338] rounded-lg p-0.5 flex items-center">
            <button
              id="discovery-mode-velocity-btn"
              type="button"
              onClick={() => setDisplayMode('velocity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                displayMode === 'velocity'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Velocidade</span>
            </button>
            <button
              id="discovery-mode-severity-btn"
              type="button"
              onClick={() => setDisplayMode('severity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                displayMode === 'severity'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Severidade</span>
            </button>
            <button
              id="discovery-mode-cumulative-btn"
              type="button"
              onClick={() => setDisplayMode('cumulative')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                displayMode === 'cumulative'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acumulado</span>
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="bg-[#090b11] border border-[#1e2338] rounded-lg p-0.5 flex items-center text-xs font-mono">
            {(['6M', '12M', 'ALL'] as TimeframeSpan[]).map((span) => (
              <button
                key={span}
                id={`discovery-span-${span.toLowerCase()}-btn`}
                type="button"
                onClick={() => setTimeframe(span)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  timeframe === span
                    ? 'bg-[#1e243a] text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {span}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Discovery Velocity KPI Metric Cards */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#0c0e17] grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Average Velocity */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Velocidade Média
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>{metrics.avgVelocity}</span>
            <span className="text-xs text-zinc-500 font-sans font-normal">bugs/mês</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Cadência contínua de achados</span>
        </div>

        {/* Peak Velocity Month */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Mês de Pico
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>{metrics.peakMonth ? metrics.peakMonth.monthLabel : 'N/D'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block font-mono">
            {metrics.peakMonth ? `${metrics.peakMonth.totalDiscovered} vulnerabilidades` : 'Sem dados'}
          </span>
        </div>

        {/* Recent Acceleration */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Aceleração Mensal
          </span>
          <div
            className={`text-xl font-bold font-mono flex items-center gap-1.5 ${
              metrics.recentAcceleration > 0
                ? 'text-emerald-400'
                : metrics.recentAcceleration < 0
                ? 'text-rose-400'
                : 'text-zinc-300'
            }`}
          >
            {metrics.recentAcceleration > 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : metrics.recentAcceleration < 0 ? (
              <ArrowDownRight className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span>
              {metrics.recentAcceleration > 0 ? `+${metrics.recentAcceleration}%` : `${metrics.recentAcceleration}%`}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Variação vs. mês anterior</span>
        </div>

        {/* High Severity Impact Ratio */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Taxa Crítica / Alta
          </span>
          <div className="text-xl font-bold font-mono text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{metrics.highSeverityRate}%</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Proporção de alto impacto</span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="p-4 sm:p-6 bg-[#0a0c14]">
        <div className="h-72 sm:h-80 w-full">
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const point = e.activePayload[0].payload as MonthlyDiscoveryDataPoint;
                    setSelectedMonth(point);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2236" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke="#525b7a"
                  tick={{ fill: '#8f9bb3', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#2e3852' }}
                />
                <YAxis
                  stroke="#525b7a"
                  tick={{ fill: '#8f9bb3', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#2e3852' }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload as MonthlyDiscoveryDataPoint;
                    return (
                      <div className="bg-[#121522] border border-[#2b3352] rounded-xl p-3 shadow-2xl text-xs font-mono min-w-[200px]">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f263d]">
                          <span className="font-bold text-white">{data.fullMonthName}</span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            {data.totalDiscovered} achados
                          </span>
                        </div>
                        <div className="space-y-1.5 text-zinc-300">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Descobertas no mês:</span>
                            <span className="font-bold text-emerald-400">{data.totalDiscovered}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Média Móvel (3m):</span>
                            <span className="font-bold text-amber-300">{data.movingAverage}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Acumulado Histórico:</span>
                            <span className="font-bold text-cyan-400">{data.cumulative}</span>
                          </div>
                          <div className="pt-1.5 mt-1.5 border-t border-[#1f263d] flex items-center justify-between text-[11px]">
                            <span className="text-rose-400">{data.critical} Críticos</span>
                            <span className="text-orange-400">{data.high} Altos</span>
                            <span className="text-amber-400">{data.medium} Médios</span>
                            <span className="text-blue-400">{data.low} Baixos</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-[#1f263d] text-[10px] text-zinc-500 text-center">
                          Clique no ponto para listar vulnerabilidades
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />

                {/* Average reference line */}
                <ReferenceLine
                  y={metrics.avgVelocity}
                  stroke="#34d399"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{
                    value: `Média (${metrics.avgVelocity}/mês)`,
                    fill: '#34d399',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    position: 'insideBottomRight'
                  }}
                />

                {displayMode === 'velocity' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="totalDiscovered"
                      name="Vulnerabilidades Descobertas"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', stroke: '#0e1017', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAverage"
                      name="Média Móvel de Tendência"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </>
                )}

                {displayMode === 'severity' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="critical"
                      name="Crítica"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f43f5e' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="high"
                      name="Alta"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f97316' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="medium"
                      name="Média"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#fbbf24' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="low"
                      name="Baixa"
                      stroke="#60a5fa"
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: '#60a5fa' }}
                      activeDot={{ r: 6 }}
                    />
                  </>
                )}

                {displayMode === 'cumulative' && (
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Descobertas Acumuladas"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#06b6d4', stroke: '#0e1017', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#22d3ee', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
              Nenhuma data de descoberta registrada nos relatórios atuais.
            </div>
          )}
        </div>

        {/* Selected Month Interactive Drilldown Drawer */}
        {selectedMonth && (
          <div className="mt-4 p-4 rounded-xl bg-[#121522] border border-[#232a42] animate-fadeIn">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1c2236]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white font-mono">
                  Relatórios descobertos em {selectedMonth.fullMonthName} ({selectedMonth.reports.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#1c2136]"
              >
                ✕ Fechar Detalhes
              </button>
            </div>

            {selectedMonth.reports.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono">Nenhuma vulnerabilidade descoberta neste mês específico.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {selectedMonth.reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 rounded-lg bg-[#0d0f18] border border-[#1b2034] hover:border-emerald-500/40 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30 truncate max-w-[120px]">
                          {report.target}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold border ${getSeverityBadgeColor(
                            report.severity
                          )}`}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <h5 className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors line-clamp-1">
                        {report.title}
                      </h5>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        Criado em: {report.createdAt ? report.createdAt.split('T')[0] : 'N/D'}
                      </span>
                    </div>

                    {onSelectReport && (
                      <button
                        type="button"
                        onClick={() => onSelectReport(report)}
                        className="mt-2.5 pt-2 border-t border-[#1a1f33] text-[11px] font-mono text-zinc-400 hover:text-emerald-300 flex items-center justify-between transition-colors"
                      >
                        <span>Ver Relatório</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Component Footer */}
      <div className="p-3.5 border-t border-[#1e2338] bg-[#0c0e17] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-mono">
            {reports.length} vulnerabilidades agregadas no cálculo de velocidade de descoberta
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="text-xs text-emerald-300 hover:text-white transition-colors flex items-center gap-1 font-mono font-semibold"
            >
              <span>Ver Todos os Relatórios</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onNewReport && (
            <button
              type="button"
              onClick={onNewReport}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono text-xs transition-colors flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>Novo Relatório</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
