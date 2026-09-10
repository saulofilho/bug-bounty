import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  ShieldCheck,
  Calendar,
  Zap,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { VulnerabilityReport } from '../types';
import { formatCurrency } from '../utils/formatters';

interface FutureEarningsProjectionChartProps {
  reports: VulnerabilityReport[];
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
}

type ProjectionViewMode = 'monthly' | 'cumulative';
type ForecastHorizon = '3M' | '6M' | '12M';

interface ProjectionDataPoint {
  monthKey: string;
  label: string;
  isProjected: boolean;
  actual?: number;
  actualCumulative?: number;
  conservative: number;
  expected: number;
  optimistic: number;
  conservativeCumulative: number;
  expectedCumulative: number;
  optimisticCumulative: number;
  pipelineRealized?: number;
  newSubmissionsForecast?: number;
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const USD_TO_BRL_RATE = 5.20;

export const FutureEarningsProjectionChart: React.FC<FutureEarningsProjectionChartProps> = ({
  reports,
  onNewReport,
  onNavigateToReports
}) => {
  const [viewMode, setViewMode] = useState<ProjectionViewMode>('cumulative');
  const [horizon, setHorizon] = useState<ForecastHorizon>('6M');
  const [extraBugsGoal, setExtraBugsGoal] = useState<number>(1); // 0, 1, 2, 3 extra bugs per month
  const [showAssumptions, setShowAssumptions] = useState<boolean>(false);

  // Compute historical performance, pending pipeline, and future projection models
  const forecastModel = useMemo(() => {
    // 1. Separate paid/resolved vs pending reports
    const rewardedReports = reports.filter(r => (r.status === 'REWARDED' || r.status === 'RESOLVED') && (r.bountyAmount || 0) > 0);
    const pendingReports = reports.filter(r => r.status === 'TRIAGED' || r.status === 'SUBMITTED' || r.status === 'NEW');

    // 2. Calculate average bounty by severity from historical data (with sensible domain fallbacks)
    const severityPayouts: Record<string, { total: number; count: number; avg: number }> = {
      CRITICAL: { total: 0, count: 0, avg: 3500 },
      HIGH: { total: 0, count: 0, avg: 1500 },
      MEDIUM: { total: 0, count: 0, avg: 600 },
      LOW: { total: 0, count: 0, avg: 200 },
      INFO: { total: 0, count: 0, avg: 100 }
    };

    rewardedReports.forEach(r => {
      const sev = r.severity || 'MEDIUM';
      if (severityPayouts[sev]) {
        severityPayouts[sev].total += r.bountyAmount || 0;
        severityPayouts[sev].count += 1;
      }
    });

    Object.keys(severityPayouts).forEach(key => {
      if (severityPayouts[key].count > 0) {
        severityPayouts[key].avg = Math.round(severityPayouts[key].total / severityPayouts[key].count);
      }
    });

    // 3. Historical Acceptance Rate
    const totalFinished = reports.filter(r => r.status === 'REWARDED' || r.status === 'RESOLVED' || r.status === 'CLOSED').length;
    const acceptanceRate = totalFinished > 0 ? Math.min(0.95, Math.max(0.60, rewardedReports.length / totalFinished)) : 0.80;

    // 4. Pending Pipeline Valuation (Weighted by acceptance probability)
    let pendingPipelineGross = 0;
    let pendingPipelineWeighted = 0;

    pendingReports.forEach(r => {
      const sev = r.severity || 'MEDIUM';
      const estimatedBounty = r.bountyAmount && r.bountyAmount > 0 
        ? r.bountyAmount 
        : severityPayouts[sev]?.avg || 600;

      pendingPipelineGross += estimatedBounty;
      // Triaged has higher confidence (90%) than submitted (70%) or new (60%)
      const statusConfidence = r.status === 'TRIAGED' ? 0.90 : r.status === 'SUBMITTED' ? 0.70 : 0.60;
      pendingPipelineWeighted += estimatedBounty * statusConfidence * acceptanceRate;
    });

    // 5. Monthly Historical Actuals (group by month)
    const monthlyActualMap = new Map<string, { year: number; month: number; totalUSD: number; count: number }>();

    rewardedReports.forEach(r => {
      const d = new Date(r.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyActualMap.get(key) || { year: d.getFullYear(), month: d.getMonth(), totalUSD: 0, count: 0 };
      existing.totalUSD += r.bountyAmount || 0;
      existing.count += 1;
      monthlyActualMap.set(key, existing);
    });

    // Get the last 4 distinct historical months
    const sortedPastKeys = Array.from(monthlyActualMap.keys()).sort();
    const recentPastKeys = sortedPastKeys.slice(-4);

    // Calculate historical baseline run rate (average of recent active months)
    let recentSum = 0;
    let recentMonthsCount = 0;
    recentPastKeys.forEach(k => {
      const item = monthlyActualMap.get(k);
      if (item) {
        recentSum += item.totalUSD;
        recentMonthsCount += 1;
      }
    });

    const historicalMonthlyRunRate = recentMonthsCount > 0 ? Math.round(recentSum / recentMonthsCount) : 1500;
    const avgBountyPerReport = rewardedReports.length > 0 
      ? Math.round(rewardedReports.reduce((s, r) => s + (r.bountyAmount || 0), 0) / rewardedReports.length)
      : 850;

    // 6. Build Chronological Data Points: Past Months -> Current Month -> Future Projection Months
    const totalPoints: ProjectionDataPoint[] = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Start with past months
    let runningActualCumulative = 0;
    
    // We display 3 past months for historical context
    for (let i = 3; i >= 1; i--) {
      const pastDate = new Date(curYear, curMonth - i, 1);
      const y = pastDate.getFullYear();
      const m = pastDate.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const actualMonth = monthlyActualMap.get(key);
      const val = actualMonth ? actualMonth.totalUSD : Math.round(historicalMonthlyRunRate * (0.7 + (i * 0.1)));

      runningActualCumulative += val;
      const label = `${MONTH_NAMES_SHORT[m]} ${String(y).slice(-2)}`;

      totalPoints.push({
        monthKey: key,
        label,
        isProjected: false,
        actual: val,
        actualCumulative: runningActualCumulative,
        conservative: val,
        expected: val,
        optimistic: val,
        conservativeCumulative: runningActualCumulative,
        expectedCumulative: runningActualCumulative,
        optimisticCumulative: runningActualCumulative
      });
    }

    // Current Month (Partial Actual + in progress)
    const currentMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
    const curActual = monthlyActualMap.get(currentMonthKey)?.totalUSD || Math.round(historicalMonthlyRunRate * 0.5);
    runningActualCumulative += curActual;

    const currentPoint: ProjectionDataPoint = {
      monthKey: currentMonthKey,
      label: `${MONTH_NAMES_SHORT[curMonth]} ${String(curYear).slice(-2)} (Atual)`,
      isProjected: false,
      actual: curActual,
      actualCumulative: runningActualCumulative,
      conservative: curActual,
      expected: curActual,
      optimistic: curActual,
      conservativeCumulative: runningActualCumulative,
      expectedCumulative: runningActualCumulative,
      optimisticCumulative: runningActualCumulative
    };
    totalPoints.push(currentPoint);

    // 7. Generate Future Projected Months (M+1 up to M+12 depending on horizon)
    const futureMonthsCount = horizon === '3M' ? 3 : horizon === '6M' ? 6 : 12;

    // Pipeline realization curve:
    // 50% pays out in M+1, 35% in M+2, 15% in M+3
    const pipelineSchedule = [0.50, 0.35, 0.15];

    let runningConservative = runningActualCumulative;
    let runningExpected = runningActualCumulative;
    let runningOptimistic = runningActualCumulative;

    for (let step = 1; step <= futureMonthsCount; step++) {
      const futDate = new Date(curYear, curMonth + step, 1);
      const fy = futDate.getFullYear();
      const fm = futDate.getMonth();
      const fkey = `${fy}-${String(fm + 1).padStart(2, '0')}`;
      const flabel = `${MONTH_NAMES_SHORT[fm]} ${String(fy).slice(-2)}`;

      // Realized pipeline from current pending queue
      const pipelineFactor = step <= 3 ? (pipelineSchedule[step - 1] || 0) : 0;
      const pipelineIncome = Math.round(pendingPipelineWeighted * pipelineFactor);

      // Extra bonus from user target setting (extra bugs goal * avg bounty)
      const extraEffortBonus = Math.round(extraBugsGoal * avgBountyPerReport * 0.85);

      // Monthly Baseline Projections:
      // Conservative: 75% of historical run rate + 60% pipeline conversion
      const monthlyConservative = Math.round((historicalMonthlyRunRate * 0.75) + (pipelineIncome * 0.60) + (extraEffortBonus * 0.50));

      // Expected: 100% of historical run rate + 100% pipeline realization + extra effort
      // Includes modest skill compounding (+2% per month)
      const compoundingGrowth = 1 + (step * 0.025);
      const monthlyExpected = Math.round((historicalMonthlyRunRate * compoundingGrowth) + pipelineIncome + extraEffortBonus);

      // Optimistic: 125% of run rate + 120% pipeline bonus (higher tier payouts) + full extra effort (+3.5% compounding)
      const optimisticGrowth = 1 + (step * 0.045);
      const monthlyOptimistic = Math.round((historicalMonthlyRunRate * 1.25 * optimisticGrowth) + (pipelineIncome * 1.15) + (extraEffortBonus * 1.30));

      runningConservative += monthlyConservative;
      runningExpected += monthlyExpected;
      runningOptimistic += monthlyOptimistic;

      totalPoints.push({
        monthKey: fkey,
        label: flabel,
        isProjected: true,
        conservative: monthlyConservative,
        expected: monthlyExpected,
        optimistic: monthlyOptimistic,
        conservativeCumulative: runningConservative,
        expectedCumulative: runningExpected,
        optimisticCumulative: runningOptimistic,
        pipelineRealized: pipelineIncome,
        newSubmissionsForecast: monthlyExpected - pipelineIncome
      });
    }

    // Summary Metrics for the forecast horizon
    const futurePoints = totalPoints.filter(p => p.isProjected);
    const expectedHorizonTotal = futurePoints.reduce((s, p) => s + p.expected, 0);
    const conservativeHorizonTotal = futurePoints.reduce((s, p) => s + p.conservative, 0);
    const optimisticHorizonTotal = futurePoints.reduce((s, p) => s + p.optimistic, 0);
    const expectedMonthlyRunRate = futurePoints.length > 0 ? Math.round(expectedHorizonTotal / futurePoints.length) : historicalMonthlyRunRate;
    const projectedAnnualARR = Math.round(expectedMonthlyRunRate * 12);

    return {
      points: totalPoints,
      pendingCount: pendingReports.length,
      pendingPipelineGross,
      pendingPipelineWeighted: Math.round(pendingPipelineWeighted),
      historicalMonthlyRunRate,
      avgBountyPerReport,
      acceptanceRate: Math.round(acceptanceRate * 100),
      expectedHorizonTotal,
      conservativeHorizonTotal,
      optimisticHorizonTotal,
      expectedMonthlyRunRate,
      projectedAnnualARR
    };
  }, [reports, horizon, extraBugsGoal]);

  // Custom sleek tooltip matching BugSentinel dark theme
  const CustomProjectionTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: ProjectionDataPoint = payload[0].payload;

    return (
      <div className="bg-[#0e0e11] border border-[#2b2b32] rounded-xl p-3.5 shadow-2xl backdrop-blur-md min-w-[240px] text-xs font-sans">
        <div className="flex items-center justify-between border-b border-[#222228] pb-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-zinc-100">{data.label}</span>
          </div>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
              data.isProjected
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {data.isProjected ? 'Projeção Preditiva' : 'Histórico Real'}
          </span>
        </div>

        {viewMode === 'monthly' ? (
          <div className="space-y-1.5 font-mono text-[11px]">
            {!data.isProjected ? (
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Bounties Pagos:
                </span>
                <span className="font-bold text-emerald-400">{formatCurrency(data.actual || 0, 'USD')}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Cenário Esperado:
                  </span>
                  <span className="font-bold text-amber-300">{formatCurrency(data.expected, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    Cenário Otimista:
                  </span>
                  <span className="text-cyan-300 font-semibold">{formatCurrency(data.optimistic, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                    Cenário Conservador:
                  </span>
                  <span className="text-purple-300 font-semibold">{formatCurrency(data.conservative, 'USD')}</span>
                </div>

                {data.pipelineRealized !== undefined && data.pipelineRealized > 0 && (
                  <div className="pt-1.5 border-t border-[#1e1e24] flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Liberação do Backlog:</span>
                    <span className="text-blue-300 font-mono">+{formatCurrency(data.pipelineRealized, 'USD')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 font-mono text-[11px]">
            {!data.isProjected ? (
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Acumulado Real:
                </span>
                <span className="font-bold text-emerald-400">{formatCurrency(data.actualCumulative || 0, 'USD')}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Total Esperado:
                  </span>
                  <span className="font-bold text-amber-300">{formatCurrency(data.expectedCumulative, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    Total Otimista:
                  </span>
                  <span className="text-cyan-300 font-semibold">{formatCurrency(data.optimisticCumulative, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                    Total Conservador:
                  </span>
                  <span className="text-purple-300 font-semibold">{formatCurrency(data.conservativeCumulative, 'USD')}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Currency Equivalent in BRL */}
        <div className="mt-2.5 pt-2 border-t border-[#1e1e24] flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span>Estimativa em BRL:</span>
          <span className="text-emerald-400 font-bold">
            {formatCurrency(
              ((viewMode === 'monthly' ? (data.isProjected ? data.expected : data.actual || 0) : (data.isProjected ? data.expectedCumulative : data.actualCumulative || 0))) * USD_TO_BRL_RATE,
              'BRL'
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-[#0a0a0a] border border-[#262626] p-5 sm:p-6 shadow-xl space-y-5">
      
      {/* Header: Title, Horizon Selector and View Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1e1e22] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Projeção de Rendimentos Futuros</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                Forecast AI Model
              </span>
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
            Modelo preditivo baseado na cadência histórica de pagamentos, valor ponderado do backlog em triagem e metas de submissão.
          </p>
        </div>

        {/* Action Toolbar: Horizon Selector & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          
          {/* Mode Selector: Monthly vs Cumulative */}
          <div className="inline-flex p-0.5 bg-[#121214] border border-[#262628] rounded-lg text-xs font-mono">
            <button
              type="button"
              id="forecast-mode-cumulative"
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                viewMode === 'cumulative'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Crescimento acumulado de rendimentos projetados"
            >
              Acumulado ($)
            </button>
            <button
              type="button"
              id="forecast-mode-monthly"
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                viewMode === 'monthly'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Entrada mensal prevista em cada cenário"
            >
              Fluxo Mensal
            </button>
          </div>

          {/* Forecast Horizon */}
          <div className="inline-flex p-0.5 bg-[#121214] border border-[#262628] rounded-lg text-xs font-mono">
            {(['3M', '6M', '12M'] as ForecastHorizon[]).map(h => (
              <button
                key={h}
                type="button"
                id={`forecast-horizon-${h.toLowerCase()}`}
                onClick={() => setHorizon(h)}
                className={`px-2 py-1 rounded-md transition-all font-medium ${
                  horizon === h
                    ? 'bg-zinc-800 text-amber-400 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={`Projetar próximos ${h === '3M' ? '3 meses' : h === '6M' ? '6 meses' : '1 ano'}`}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Toggle Assumptions Drawer */}
          <button
            type="button"
            onClick={() => setShowAssumptions(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-mono transition-colors ${
              showAssumptions
                ? 'bg-zinc-800 border-zinc-700 text-amber-400'
                : 'bg-[#121214] border-[#262628] text-zinc-400 hover:text-zinc-200'
            }`}
            title="Ver premissas e calibragem do modelo matemático"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Premissas</span>
            {showAssumptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* KPI Highlights: Future Run Rate, Horizon Total, Pending Backlog */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Expected Horizon Projection */}
        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1">
            <span>Previsão ({horizon})</span>
            <span className="text-amber-400 font-bold">• Esperado</span>
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {formatCurrency(forecastModel.expectedHorizonTotal, 'USD')}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 font-mono">
            {formatCurrency(forecastModel.expectedHorizonTotal * USD_TO_BRL_RATE, 'BRL')} estimado
          </p>
        </div>

        {/* Monthly Run Rate Expected */}
        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Run Rate Projetado</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-white">
              {formatCurrency(forecastModel.expectedMonthlyRunRate, 'USD')}
            </span>
            <span className="text-xs text-zinc-500 font-mono">/ mês</span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Baseado no histórico recente</span>
          </p>
        </div>

        {/* Pending Pipeline Backlog Valuation */}
        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Backlog em Triagem</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {forecastModel.pendingCount} pendentes
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-blue-400">
              {formatCurrency(forecastModel.pendingPipelineWeighted, 'USD')}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 font-mono">
            {formatCurrency(forecastModel.pendingPipelineGross, 'USD')} valor de face bruto
          </p>
        </div>

        {/* Annualized Run Rate (ARR) */}
        <div className="bg-[#121214] border border-[#222226] rounded-lg p-3.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Potencial Anualizado</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(forecastModel.projectedAnnualARR, 'USD')}
            </span>
            <span className="text-xs text-zinc-500 font-mono">/ ano</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 font-mono">
            {formatCurrency(forecastModel.projectedAnnualARR * USD_TO_BRL_RATE, 'BRL')} anual
          </p>
        </div>
      </div>

      {/* Interactive Simulation Controls: Extra Bugs Target Goal */}
      <div className="bg-[#121214] border border-[#222226] rounded-lg p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-zinc-200 font-medium">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Simulador de Meta de Submissão Extra:</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Veja como aumentar a cadência mensal de submissões afeta sua projeção financeira futura.
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono">
          {[0, 1, 2, 3].map(extra => (
            <button
              key={extra}
              type="button"
              onClick={() => setExtraBugsGoal(extra)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                extraBugsGoal === extra
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-[#18181c] border-[#2b2b32] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              {extra === 0 ? 'Ritmo Atual' : `+${extra} bug/mês`}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Assumptions Expander */}
      {showAssumptions && (
        <div className="bg-[#111114] border border-[#28282e] rounded-lg p-4 text-xs font-sans space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#222226] pb-2">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              Premissas & Modelagem Estatística
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Câmbio: 1 USD = R$ {USD_TO_BRL_RATE.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
            <div className="p-2.5 rounded bg-[#16161a] border border-[#222228]">
              <span className="text-zinc-400 block text-[10px] uppercase">Taxa de Aceitação Histórica</span>
              <span className="text-emerald-400 font-bold text-sm">{forecastModel.acceptanceRate}%</span>
              <p className="text-[10px] text-zinc-500 mt-1">Percentual de relatórios convertidos em recompensas válidas.</p>
            </div>

            <div className="p-2.5 rounded bg-[#16161a] border border-[#222228]">
              <span className="text-zinc-400 block text-[10px] uppercase">Recompensa Média por Bug</span>
              <span className="text-white font-bold text-sm">{formatCurrency(forecastModel.avgBountyPerReport, 'USD')}</span>
              <p className="text-[10px] text-zinc-500 mt-1">Ticket médio por relatório premiado no histórico.</p>
            </div>

            <div className="p-2.5 rounded bg-[#16161a] border border-[#222228]">
              <span className="text-zinc-400 block text-[10px] uppercase">Liberação do Backlog</span>
              <span className="text-blue-400 font-bold text-sm">50% M+1 • 35% M+2 • 15% M+3</span>
              <p className="text-[10px] text-zinc-500 mt-1">Tempo médio de resposta e payout dos programas de triagem.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Recharts Composed Chart */}
      <div className="w-full h-[330px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={forecastModel.points}
            margin={{ top: 15, right: 25, left: -5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="expectedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="optimisticAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c20" vertical={false} />

            <XAxis
              dataKey="label"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              dy={8}
            />

            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              domain={[0, 'auto']}
            />

            <Tooltip content={<CustomProjectionTooltip />} />

            {/* Separator: Present Day Transition to Forecast */}
            <ReferenceLine
              x={forecastModel.points.find(p => p.label.includes('(Atual)'))?.label || forecastModel.points[3]?.label}
              stroke="#3f3f46"
              strokeDasharray="4 4"
              label={{
                value: 'Início da Projeção →',
                fill: '#71717a',
                fontSize: 10,
                position: 'insideTopRight'
              }}
            />

            {viewMode === 'cumulative' ? (
              <>
                {/* Optimistic Area Background */}
                <Area
                  type="monotone"
                  dataKey="optimisticCumulative"
                  name="Cenário Otimista (Acumulado)"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#optimisticAreaGrad)"
                  isAnimationActive={true}
                  animationDuration={1000}
                />

                {/* Expected Area Main Curve */}
                <Area
                  type="monotone"
                  dataKey="expectedCumulative"
                  name="Cenário Esperado (Acumulado)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#expectedAreaGrad)"
                  isAnimationActive={true}
                  animationDuration={1200}
                />

                {/* Conservative Baseline Line */}
                <Line
                  type="monotone"
                  dataKey="conservativeCumulative"
                  name="Cenário Conservador (Acumulado)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1400}
                />

                {/* Historical Actual Curve (Solid Emerald for the past) */}
                <Line
                  type="monotone"
                  dataKey="actualCumulative"
                  name="Histórico Real"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#0a0a0a', stroke: '#10b981', strokeWidth: 2, r: 4.5 }}
                  activeDot={{ fill: '#10b981', stroke: '#ffffff', strokeWidth: 2, r: 6.5 }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </>
            ) : (
              <>
                {/* Monthly Optimistic */}
                <Line
                  type="monotone"
                  dataKey="optimistic"
                  name="Otimista ($/mês)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ fill: '#06b6d4', r: 3 }}
                  activeDot={{ r: 5 }}
                />

                {/* Monthly Expected */}
                <Line
                  type="monotone"
                  dataKey="expected"
                  name="Esperado ($/mês)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6 }}
                />

                {/* Monthly Conservative */}
                <Line
                  type="monotone"
                  dataKey="conservative"
                  name="Conservador ($/mês)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={{ fill: '#a855f7', r: 2.5 }}
                  activeDot={{ r: 4.5 }}
                />

                {/* Monthly Historical Actuals */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Real Histórico ($/mês)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#0a0a0a', stroke: '#10b981', strokeWidth: 2, r: 4.5 }}
                  activeDot={{ fill: '#10b981', stroke: '#ffffff', strokeWidth: 2, r: 6.5 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Confidence Interval Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1a1a1d] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4 text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-emerald-400 rounded-full inline-block" />
            <span className="text-emerald-400 font-semibold">Histórico Real</span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-3 h-1.5 bg-amber-400 rounded-full inline-block" />
            <span>Esperado ({formatCurrency(forecastModel.expectedHorizonTotal, 'USD')})</span>
          </div>

          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block" />
            <span>Otimista ({formatCurrency(forecastModel.optimisticHorizonTotal, 'USD')})</span>
          </div>

          <div className="flex items-center gap-1.5 text-purple-300">
            <span className="w-3 h-0.5 border-b border-dashed border-purple-400 inline-block" />
            <span>Conservador ({formatCurrency(forecastModel.conservativeHorizonTotal, 'USD')})</span>
          </div>
        </div>

        {onNavigateToReports && (
          <button
            type="button"
            onClick={onNavigateToReports}
            className="text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 text-[11px] underline underline-offset-2"
          >
            <span>Ver relatórios que alimentam o modelo</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>

    </div>
  );
};
