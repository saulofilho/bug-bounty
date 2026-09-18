import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Award,
  ChevronRight,
  X,
  Info
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import {
  calculate30DayBountyTrend,
  BountyAwardPoint,
  BountySparklineMetrics
} from '../utils/bountySparklineEngine';

interface BountySparklineChartProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

type SparklineMode = 'cumulative' | 'daily';
type CurrencyMode = 'USD' | 'BRL';

const USD_TO_BRL = 5.45;

/**
 * Compact Sparkline widget suitable for embedding inside cards or headers.
 */
export const BountyCompactSparkline: React.FC<{
  reports: VulnerabilityReport[];
  height?: number;
  showTooltip?: boolean;
  onOpenDetailedView?: () => void;
}> = ({ reports, height = 44, showTooltip = true, onOpenDetailedView }) => {
  const metrics = useMemo(() => calculate30DayBountyTrend(reports), [reports]);
  const [hoveredPoint, setHoveredPoint] = useState<BountyAwardPoint | null>(null);

  const points = metrics.points;
  const maxVal = Math.max(...points.map(p => p.cumulativeAmountUSD), 100);
  const minVal = 0;

  // Generate SVG path for crisp instantaneous rendering inside card
  const width = 240;
  const h = height;
  const paddingX = 4;
  const paddingY = 6;

  const getX = (index: number) => paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
  const getY = (val: number) => h - paddingY - ((val - minVal) / (maxVal - minVal)) * (h - paddingY * 2);

  const pathCoords = points.map((p, idx) => `${getX(idx).toFixed(1)},${getY(p.cumulativeAmountUSD).toFixed(1)}`);
  const linePath = `M ${pathCoords.join(' L ')}`;
  const areaPath = `M ${pathCoords.join(' L ')} L ${getX(points.length - 1).toFixed(1)},${h} L ${getX(0).toFixed(1)},${h} Z`;

  // Filter points that had daily awards for dots
  const awardPoints = points.filter(p => p.dailyAmountUSD > 0);

  return (
    <div className="relative group select-none w-full" id="compact-bounty-sparkline-container">
      <div 
        className="w-full flex flex-col cursor-pointer"
        onClick={onOpenDetailedView}
        title="Clique para ver o gráfico detalhado de tendência dos últimos 30 dias"
      >
        <svg
          viewBox={`0 0 ${width} ${h}`}
          className="w-full h-11 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="compactSparklineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="compactLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaPath} fill="url(#compactSparklineGrad)" />

          {/* Sparkline Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#compactLineGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Payout Milestone Dots */}
          {awardPoints.map((ap) => {
            const cx = getX(ap.dayIndex);
            const cy = getY(ap.cumulativeAmountUSD);
            return (
              <g key={ap.date} className="transition-all">
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  className="fill-emerald-400 stroke-[#0a0a0a] stroke-[1.5px] hover:r-5 transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Micro Legend / Trend Indicator */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1 px-0.5">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">30d:</span>
            <span className="text-emerald-400 font-bold">
              +{formatCurrency(metrics.total30DaysUSD, 'USD')}
            </span>
          </div>
          {metrics.growthPercentage !== null && (
            <div className={`flex items-center gap-0.5 font-semibold ${
              metrics.growthDirection === 'up' 
                ? 'text-emerald-400' 
                : metrics.growthDirection === 'down' 
                ? 'text-red-400' 
                : 'text-zinc-400'
            }`}>
              {metrics.growthDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {metrics.growthDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              {metrics.growthDirection === 'neutral' && <Minus className="w-3 h-3" />}
              <span>{metrics.growthPercentage > 0 ? `+${metrics.growthPercentage}%` : `${metrics.growthPercentage}%`}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Full-featured 30-Day Bounty Sparkline & Financial Insight Panel.
 */
export const BountySparklineChart: React.FC<BountySparklineChartProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  className = ''
}) => {
  const [mode, setMode] = useState<SparklineMode>('cumulative');
  const [currency, setCurrency] = useState<CurrencyMode>('USD');
  const [selectedDayPoint, setSelectedDayPoint] = useState<BountyAwardPoint | null>(null);

  const metrics: BountySparklineMetrics = useMemo(
    () => calculate30DayBountyTrend(reports),
    [reports]
  );

  const currencyMultiplier = currency === 'BRL' ? USD_TO_BRL : 1;

  // Chart dataset mapped with currency conversion
  const chartData = useMemo(() => {
    return metrics.points.map((p) => ({
      ...p,
      displayDaily: Math.round(p.dailyAmountUSD * currencyMultiplier),
      displayCumulative: Math.round(p.cumulativeAmountUSD * currencyMultiplier)
    }));
  }, [metrics.points, currencyMultiplier]);

  const activeValueKey = mode === 'cumulative' ? 'displayCumulative' : 'displayDaily';

  // Format monetary value according to selected currency
  const formatMoney = (val: number) => {
    if (currency === 'BRL') {
      return formatCurrency(val, 'BRL');
    }
    return formatCurrency(val, 'USD');
  };

  return (
    <section
      id="bounty-30day-sparkline-section"
      className={`rounded-xl bg-[#0e0e11] border border-[#26262a] p-5 shadow-2xl transition-all ${className}`}
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
              Financial Velocity Sparkline
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              Últimos 30 Dias
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-light tracking-tight text-white flex items-center gap-2">
            Tendência de Recompensas Concedidas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Evolução financeira e aceleração de pagamentos dos achados de segurança validados no último mês.
          </p>
        </div>

        {/* View Controls: Cumulative vs Daily + USD vs BRL */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg bg-[#141418] p-0.5 border border-[#282830]">
            <button
              type="button"
              id="btn-sparkline-mode-cumulative"
              onClick={() => setMode('cumulative')}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                mode === 'cumulative'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Curva Acumulada
            </button>
            <button
              type="button"
              id="btn-sparkline-mode-daily"
              onClick={() => setMode('daily')}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                mode === 'daily'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pagamentos Diários
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="inline-flex rounded-lg bg-[#141418] p-0.5 border border-[#282830]">
            <button
              type="button"
              id="btn-sparkline-curr-usd"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-zinc-700 text-emerald-300 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              id="btn-sparkline-curr-brl"
              onClick={() => setCurrency('BRL')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                currency === 'BRL'
                  ? 'bg-zinc-700 text-emerald-300 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              BRL (R$)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Total 30D Awarded */}
        <div className="p-3 rounded-lg bg-[#141418] border border-[#24242c]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">
            Total 30 Dias
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-light font-mono text-white">
              {formatMoney(metrics.total30DaysUSD * currencyMultiplier)}
            </span>
          </div>
          {metrics.growthPercentage !== null && (
            <div className={`mt-1 flex items-center gap-1 text-[11px] font-mono ${
              metrics.growthDirection === 'up'
                ? 'text-emerald-400'
                : metrics.growthDirection === 'down'
                ? 'text-red-400'
                : 'text-zinc-400'
            }`}>
              {metrics.growthDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {metrics.growthDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              {metrics.growthDirection === 'neutral' && <Minus className="w-3 h-3" />}
              <span>
                {metrics.growthPercentage > 0 ? `+${metrics.growthPercentage}%` : `${metrics.growthPercentage}%`} vs 30d anteriores
              </span>
            </div>
          )}
        </div>

        {/* Peak Daily Payout */}
        <div className="p-3 rounded-lg bg-[#141418] border border-[#24242c]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">
            Maior Recompensa
          </span>
          <span className="text-xl sm:text-2xl font-light font-mono text-emerald-400 block">
            {formatMoney(metrics.peakDailyAmountUSD * currencyMultiplier)}
          </span>
          <p className="text-[10px] text-zinc-400 font-mono mt-1 truncate">
            {metrics.peakReport ? metrics.peakReport.title : 'Nenhum pagamento no período'}
          </p>
        </div>

        {/* Average per Awarded Bug */}
        <div className="p-3 rounded-lg bg-[#141418] border border-[#24242c]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">
            Média por Achado
          </span>
          <span className="text-xl sm:text-2xl font-light font-mono text-cyan-300 block">
            {formatMoney(metrics.averagePerReportUSD * currencyMultiplier)}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
            {metrics.rewardedReportsCount} vulnerabilidades premiadas
          </span>
        </div>

        {/* Frequency & Active Days */}
        <div className="p-3 rounded-lg bg-[#141418] border border-[#24242c]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">
            Dias com Payout
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-light font-mono text-amber-300">
              {metrics.activeDaysCount}
            </span>
            <span className="text-xs font-mono text-zinc-500">/ 30 dias</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
            Taxa de conversão contínua
          </span>
        </div>
      </div>

      {/* Main Sparkline Chart Area */}
      <div className="relative w-full h-56 mt-2 bg-[#0c0c0f] rounded-lg border border-[#1e1e24] p-3">
        {metrics.total30DaysUSD === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">Nenhum pagamento registrado nos últimos 30 dias</p>
            <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
              Assim que relatórios forem marcados como recompensados (REWARDED) ou tiverem eventos de bounty no timeline, a curva de velocidade aparecerá aqui.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedDayPoint(e.activePayload[0].payload as BountyAwardPoint);
                }
              }}
            >
              <defs>
                <linearGradient id="bountySparklineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="bountyStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="shortDayLabel"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                interval={4}
              />

              <YAxis
                hide
                domain={[0, 'dataMax + 200']}
              />

              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as BountyAwardPoint;
                    return (
                      <div className="bg-[#18181c] border border-emerald-500/40 rounded-lg p-2.5 shadow-xl text-xs max-w-xs z-50">
                        <div className="flex items-center justify-between gap-2 border-b border-[#282830] pb-1.5 mb-1.5">
                          <span className="font-mono text-zinc-400 text-[11px] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            {data.formattedDate} ({data.date})
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                            {formatMoney(
                              (mode === 'cumulative' ? data.cumulativeAmountUSD : data.dailyAmountUSD) *
                                currencyMultiplier
                            )}
                          </span>
                        </div>

                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex justify-between text-zinc-300">
                            <span>Pagamento no dia:</span>
                            <span className="font-bold text-white">
                              {formatMoney(data.dailyAmountUSD * currencyMultiplier)}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Acumulado 30d:</span>
                            <span>{formatMoney(data.cumulativeAmountUSD * currencyMultiplier)}</span>
                          </div>
                        </div>

                        {data.reports && data.reports.length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-[#282830]">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                              Achados Premiados ({data.reports.length}):
                            </p>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {data.reports.map((rep) => {
                                const badgeColor = getSeverityBadgeColor(rep.severity);
                                return (
                                  <div
                                    key={rep.id}
                                    className="p-1 rounded bg-[#202026] text-[10px] flex items-center justify-between gap-2"
                                  >
                                    <span className="text-zinc-200 truncate flex-1">{rep.title}</span>
                                    <span className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                                      {formatMoney(rep.amount * currencyMultiplier)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey={activeValueKey}
                stroke="url(#bountyStrokeGradient)"
                strokeWidth={2.5}
                fill="url(#bountySparklineGradient)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload || payload.dailyAmountUSD <= 0) return <circle key={`dot-empty-${cx}-${cy}`} cx={0} cy={0} r={0} />;
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#10b981"
                      stroke="#0e0e11"
                      strokeWidth={2}
                      className="cursor-pointer hover:r-6 transition-all"
                    />
                  );
                }}
                activeDot={{ r: 6, fill: '#34d399', stroke: '#0e0e11', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Selected Day Inspection Banner */}
      {selectedDayPoint && (
        <div className="mt-3 p-3 rounded-lg bg-[#14141a] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white font-mono">
                  {selectedDayPoint.formattedDate} ({selectedDayPoint.date})
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {formatMoney(selectedDayPoint.dailyAmountUSD * currencyMultiplier)} pagos no dia
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">
                Acumulado até esta data:{' '}
                <span className="text-zinc-200 font-semibold">
                  {formatMoney(selectedDayPoint.cumulativeAmountUSD * currencyMultiplier)}
                </span>{' '}
                · {selectedDayPoint.reports.length} achado(s) premiado(s)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDayPoint(null)}
            className="self-end sm:self-center p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar detalhe do dia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Awarded Reports in Period Carousel / Badges */}
      {metrics.awardsIn30Days.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#222226]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vulnerabilidades Premiadas no Período ({metrics.awardsIn30Days.length})</span>
            </span>
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>Ver todos os relatórios</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {metrics.awardsIn30Days.map((award) => {
              const fullReport = reports.find(r => r.id === award.reportId);
              const badgeColor = getSeverityBadgeColor(award.severity);
              return (
                <div
                  key={`${award.reportId}-${award.dateStr}`}
                  onClick={() => {
                    if (fullReport && onSelectReport) {
                      onSelectReport(fullReport);
                    }
                  }}
                  className="p-2.5 rounded-lg bg-[#141418] hover:bg-[#1a1a20] border border-[#262630] hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-zinc-200 group-hover:text-white font-medium line-clamp-2 transition-colors">
                      {award.reportTitle}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400 whitespace-nowrap">
                      {formatMoney(award.amount * currencyMultiplier)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded border ${badgeColor.bg} ${badgeColor.text} ${badgeColor.border}`}>
                        {award.severity}
                      </span>
                      <span>{award.platform}</span>
                    </div>
                    <span className="text-zinc-400">{award.dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
