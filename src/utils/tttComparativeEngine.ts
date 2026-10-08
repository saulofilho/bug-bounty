import { VulnerabilityReport, Severity, TimelineEvent, ReportStatus } from '../types';

export interface ReportTttData {
  reportId: string;
  reportTitle: string;
  target: string;
  platform: string;
  severity: Severity;
  status: ReportStatus;
  submissionDate: string;
  submissionMonthKey: string; // "YYYY-MM"
  submissionMonthLabel: string; // "Mai/26"
  triageDate: string | null;
  triageMonthKey: string | null;
  tttHours: number | null;
  tttDays: number | null;
  isTriaged: boolean;
  slaUnder48h: boolean;
  slaUnder24h: boolean;
  timelineSubmissionEvent?: TimelineEvent;
  timelineTriageEvent?: TimelineEvent;
}

export interface MonthlyTttDataPoint {
  monthKey: string;           // "YYYY-MM"
  monthLabel: string;         // "Mai/26"
  fullMonthLabel: string;     // "Maio de 2026"
  year: number;
  monthIndex: number;
  totalSubmitted: number;
  triagedCount: number;
  pendingCount: number;
  avgTttHours: number;
  avgTttDays: number;
  medianTttHours: number;
  medianTttDays: number;
  minTttHours: number;
  maxTttHours: number;
  fastestReportTitle?: string;
  fastestReportId?: string;
  slowestReportTitle?: string;
  slowestReportId?: string;
  slaUnder48hCount: number;
  slaUnder48hPercent: number;
  slaTargetHours: number;
  momDiffHours: number;       // vs previous month
  momDiffPercent: number;     // vs previous month
  trend: 'improving' | 'degrading' | 'stable' | 'initial';
  byPlatform: Record<string, { count: number; avgTttHours: number; avgTttDays: number }>;
  bySeverity: Partial<Record<Severity, { count: number; avgTttHours: number; avgTttDays: number }>>;
  reports: ReportTttData[];
}

export interface TttComparativeAnalysis {
  monthlyData: MonthlyTttDataPoint[];
  allReportsTtt: ReportTttData[];
  overallAvgTttHours: number;
  overallAvgTttDays: number;
  overallMedianTttHours: number;
  overallSlaUnder48hPercent: number;
  totalTriagedReports: number;
  totalSubmittedReports: number;
  bestMonth: MonthlyTttDataPoint | null;
  worstMonth: MonthlyTttDataPoint | null;
  latestMonth: MonthlyTttDataPoint | null;
  previousMonth: MonthlyTttDataPoint | null;
  latestMomDiffHours: number;
  latestMomDiffPercent: number;
  latestTrend: 'improving' | 'degrading' | 'stable' | 'initial';
  fastestPlatform: { platform: string; avgTttHours: number; count: number } | null;
  slowestPlatform: { platform: string; avgTttHours: number; count: number } | null;
  severityComparison: Array<{ severity: Severity; avgTttHours: number; count: number; ratioVsCritical: number }>;
  timeframe: '6M' | '12M' | 'ALL';
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Checks if a timeline event title or notes signifies a triage transition.
 * Explicitly matches transitions to 'TRIAGED' or 'VALIDATED'.
 */
export function isTimelineTriageEvent(title?: string, notes?: string): boolean {
  const text = `${title || ''} ${notes || ''}`.toLowerCase();
  return (
    text.includes('triaged') ||
    text.includes('validated') ||
    text.includes('triagem') ||
    text.includes('validado') ||
    text.includes('validada') ||
    text.includes('tria') ||
    text.includes('aceit') ||
    text.includes('accepted') ||
    text.includes('reproduzid') ||
    text.includes('confirmad')
  );
}

/**
 * Checks if a timeline event signifies submission/creation.
 */
export function isTimelineSubmissionEvent(event: TimelineEvent): boolean {
  if (event.type === 'creation' || event.type === 'dispatch') return true;
  const text = `${event.title} ${event.notes || ''}`.toLowerCase();
  return (
    text.includes('submiss') ||
    text.includes('submetid') ||
    text.includes('enviad') ||
    text.includes('criado') ||
    text.includes('relatad') ||
    text.includes('rascunho') ||
    text.includes('created')
  );
}

/**
 * Safe date parsing to timestamp.
 */
function parseDateSafe(dateStr?: string): number | null {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extracts TTT (Time to Triaged) for a single vulnerability report from its timeline history.
 */
export function extractReportTtt(report: VulnerabilityReport): ReportTttData {
  const timeline = report.timeline || [];

  // 1. Find submission event from timeline
  const submissionEvent = timeline.find(isTimelineSubmissionEvent) || timeline[0];
  const submissionDateStr = submissionEvent?.date || report.createdAt || new Date().toISOString();
  const submissionMs = parseDateSafe(submissionDateStr) || parseDateSafe(report.createdAt) || Date.now();

  const subDateObj = new Date(submissionMs);
  const subYear = subDateObj.getFullYear();
  const subMonth = subDateObj.getMonth();
  const submissionMonthKey = `${subYear}-${String(subMonth + 1).padStart(2, '0')}`;
  const submissionMonthLabel = `${MONTH_NAMES_SHORT[subMonth]}/${String(subYear).slice(-2)}`;

  // 2. Find triage event from timeline
  let triageEvent: TimelineEvent | undefined;
  let triageMs: number | null = null;
  let triageDateStr: string | null = null;

  for (const ev of timeline) {
    const evMs = parseDateSafe(ev.date);
    if (!evMs || evMs < submissionMs) continue;

    if (isTimelineTriageEvent(ev.title, ev.notes) || (ev.type === 'status_change' && ev.title.toLowerCase().includes('triad'))) {
      triageEvent = ev;
      triageMs = evMs;
      triageDateStr = ev.date;
      break;
    }
  }

  // 3. Fallback for reports that reached TRIAGED / REWARDED / RESOLVED if timeline text was omitted
  const isTriagedStatus = ['TRIAGED', 'REWARDED', 'RESOLVED'].includes(report.status);
  const isClosedStatus = ['REWARDED', 'RESOLVED', 'DUPLICATE', 'OUT_OF_SCOPE'].includes(report.status);

  if (!triageMs && isTriagedStatus) {
    const updatedMs = parseDateSafe(report.updatedAt);
    if (updatedMs && updatedMs >= submissionMs) {
      if (isClosedStatus) {
        // Estimate intermediate triage between submission and closure
        triageMs = Math.round(submissionMs + (updatedMs - submissionMs) * 0.35);
        triageDateStr = new Date(triageMs).toISOString().split('T')[0];
      } else {
        triageMs = updatedMs;
        triageDateStr = report.updatedAt;
      }
    } else {
      // Moderate default: 24h
      triageMs = submissionMs + 24 * 60 * 60 * 1000;
      triageDateStr = new Date(triageMs).toISOString().split('T')[0];
    }
  }

  let tttHours: number | null = null;
  let tttDays: number | null = null;
  let triageMonthKey: string | null = null;

  if (triageMs !== null) {
    const diffMs = Math.max(0, triageMs - submissionMs);
    tttDays = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
    tttHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

    const trDateObj = new Date(triageMs);
    const trYear = trDateObj.getFullYear();
    const trMonth = trDateObj.getMonth();
    triageMonthKey = `${trYear}-${String(trMonth + 1).padStart(2, '0')}`;
  }

  const isTriaged = tttHours !== null;
  const slaUnder48h = isTriaged ? (tttHours <= 48) : false;
  const slaUnder24h = isTriaged ? (tttHours <= 24) : false;

  return {
    reportId: report.id,
    reportTitle: report.title,
    target: report.target,
    platform: report.platform,
    severity: report.severity,
    status: report.status,
    submissionDate: submissionDateStr,
    submissionMonthKey,
    submissionMonthLabel,
    triageDate: triageDateStr,
    triageMonthKey,
    tttHours,
    tttDays,
    isTriaged,
    slaUnder48h,
    slaUnder24h,
    timelineSubmissionEvent: submissionEvent,
    timelineTriageEvent: triageEvent
  };
}

/**
 * Calculates comparative Time to Triaged (TTT) metrics grouped over months.
 *
 * @param reports Vulnerability reports array.
 * @param timeframe Optional timeframe filter ('6M' | '12M' | 'ALL').
 * @param groupBy Optional grouping strategy: 'submission' (cohort) or 'triage'.
 * @param filterPlatform Optional platform filter.
 * @param filterSeverity Optional severity filter.
 */
export function calculateMonthlyTttComparative(
  reports: VulnerabilityReport[],
  options: {
    timeframe?: '6M' | '12M' | 'ALL';
    groupBy?: 'submission' | 'triage';
    filterPlatform?: string;
    filterSeverity?: Severity | 'ALL';
    slaTargetHours?: number;
  } = {}
): TttComparativeAnalysis {
  const {
    timeframe = '12M',
    groupBy = 'submission',
    filterPlatform = 'ALL',
    filterSeverity = 'ALL',
    slaTargetHours = 48
  } = options;

  if (!reports || reports.length === 0) {
    return {
      monthlyData: [],
      allReportsTtt: [],
      overallAvgTttHours: 0,
      overallAvgTttDays: 0,
      overallMedianTttHours: 0,
      overallSlaUnder48hPercent: 0,
      totalTriagedReports: 0,
      totalSubmittedReports: 0,
      bestMonth: null,
      worstMonth: null,
      latestMonth: null,
      previousMonth: null,
      latestMomDiffHours: 0,
      latestMomDiffPercent: 0,
      latestTrend: 'initial',
      fastestPlatform: null,
      slowestPlatform: null,
      severityComparison: [],
      timeframe
    };
  }

  // 1. Extract TTT data for all reports
  let allReportsTtt = reports.map(extractReportTtt);

  // Apply optional filters
  if (filterPlatform !== 'ALL') {
    allReportsTtt = allReportsTtt.filter(r => r.platform === filterPlatform);
  }
  if (filterSeverity !== 'ALL') {
    allReportsTtt = allReportsTtt.filter(r => r.severity === filterSeverity);
  }

  // 2. Group reports by month
  const monthMap = new Map<string, ReportTttData[]>();

  allReportsTtt.forEach(reportTtt => {
    const key = groupBy === 'submission' 
      ? reportTtt.submissionMonthKey 
      : (reportTtt.triageMonthKey || reportTtt.submissionMonthKey);

    if (!key) return;
    if (!monthMap.has(key)) {
      monthMap.set(key, []);
    }
    monthMap.get(key)!.push(reportTtt);
  });

  // Collect chronological keys
  const sortedMonthKeys = Array.from(monthMap.keys()).sort();

  // If there are gaps in months, optionally fill them or limit by timeframe
  let targetKeys = sortedMonthKeys;
  if (timeframe === '6M') {
    targetKeys = targetKeys.slice(-6);
  } else if (timeframe === '12M') {
    targetKeys = targetKeys.slice(-12);
  }

  const monthlyData: MonthlyTttDataPoint[] = [];

  targetKeys.forEach((monthKey, idx) => {
    const monthReports = monthMap.get(monthKey) || [];
    const [yStr, mStr] = monthKey.split('-');
    const year = parseInt(yStr, 10);
    const monthIndex = parseInt(mStr, 10) - 1;
    const monthLabel = `${MONTH_NAMES_SHORT[monthIndex]}/${String(year).slice(-2)}`;
    const fullMonthLabel = `${MONTH_NAMES_FULL[monthIndex]} de ${year}`;

    const totalSubmitted = monthReports.length;
    const triagedReports = monthReports.filter(r => r.isTriaged && r.tttHours !== null);
    const triagedCount = triagedReports.length;
    const pendingCount = totalSubmitted - triagedCount;

    let avgTttHours = 0;
    let avgTttDays = 0;
    let medianTttHours = 0;
    let medianTttDays = 0;
    let minTttHours = 0;
    let maxTttHours = 0;
    let fastestReportTitle: string | undefined;
    let fastestReportId: string | undefined;
    let slowestReportTitle: string | undefined;
    let slowestReportId: string | undefined;

    const slaUnder48hCount = triagedReports.filter(r => (r.tttHours || 0) <= slaTargetHours).length;
    const slaUnder48hPercent = triagedCount > 0 ? Math.round((slaUnder48hCount / triagedCount) * 100) : 0;

    const byPlatform: Record<string, { count: number; avgTttHours: number; avgTttDays: number }> = {};
    const bySeverity: Partial<Record<Severity, { count: number; avgTttHours: number; avgTttDays: number }>> = {};

    if (triagedCount > 0) {
      const times = triagedReports.map(r => r.tttHours as number);
      const totalHours = times.reduce((a, b) => a + b, 0);
      avgTttHours = Math.round((totalHours / triagedCount) * 10) / 10;
      avgTttDays = Math.round((avgTttHours / 24) * 10) / 10;

      const sortedTimes = [...times].sort((a, b) => a - b);
      medianTttHours = sortedTimes[Math.floor(sortedTimes.length / 2)];
      medianTttDays = Math.round((medianTttHours / 24) * 10) / 10;

      minTttHours = sortedTimes[0];
      maxTttHours = sortedTimes[sortedTimes.length - 1];

      // Identify fastest and slowest reports
      const fastest = triagedReports.find(r => r.tttHours === minTttHours);
      if (fastest) {
        fastestReportTitle = fastest.reportTitle;
        fastestReportId = fastest.reportId;
      }
      const slowest = triagedReports.find(r => r.tttHours === maxTttHours);
      if (slowest) {
        slowestReportTitle = slowest.reportTitle;
        slowestReportId = slowest.reportId;
      }

      // Breakdown by platform
      triagedReports.forEach(r => {
        if (!byPlatform[r.platform]) {
          byPlatform[r.platform] = { count: 0, avgTttHours: 0, avgTttDays: 0 };
        }
        byPlatform[r.platform].count += 1;
      });
      Object.keys(byPlatform).forEach(plat => {
        const pReports = triagedReports.filter(r => r.platform === plat);
        const pTotal = pReports.reduce((s, r) => s + (r.tttHours || 0), 0);
        const pAvg = Math.round((pTotal / pReports.length) * 10) / 10;
        byPlatform[plat].avgTttHours = pAvg;
        byPlatform[plat].avgTttDays = Math.round((pAvg / 24) * 10) / 10;
      });

      // Breakdown by severity
      const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      severities.forEach(sev => {
        const sReports = triagedReports.filter(r => r.severity === sev);
        if (sReports.length > 0) {
          const sTotal = sReports.reduce((s, r) => s + (r.tttHours || 0), 0);
          const sAvg = Math.round((sTotal / sReports.length) * 10) / 10;
          bySeverity[sev] = {
            count: sReports.length,
            avgTttHours: sAvg,
            avgTttDays: Math.round((sAvg / 24) * 10) / 10
          };
        }
      });
    }

    // MoM (Month-over-Month) calculation
    let momDiffHours = 0;
    let momDiffPercent = 0;
    let trend: 'improving' | 'degrading' | 'stable' | 'initial' = 'initial';

    if (idx > 0) {
      const prev = monthlyData[idx - 1];
      if (prev.triagedCount > 0 && triagedCount > 0) {
        momDiffHours = Math.round((avgTttHours - prev.avgTttHours) * 10) / 10;
        momDiffPercent = prev.avgTttHours > 0 
          ? Math.round(((avgTttHours - prev.avgTttHours) / prev.avgTttHours) * 100) 
          : 0;

        // Note: For response time (TTT), a lower number means faster response (improving!)
        if (momDiffPercent <= -5) {
          trend = 'improving'; // TTT decreased -> Faster response!
        } else if (momDiffPercent >= 5) {
          trend = 'degrading'; // TTT increased -> Slower response
        } else {
          trend = 'stable';
        }
      }
    }

    monthlyData.push({
      monthKey,
      monthLabel,
      fullMonthLabel,
      year,
      monthIndex,
      totalSubmitted,
      triagedCount,
      pendingCount,
      avgTttHours,
      avgTttDays,
      medianTttHours,
      medianTttDays,
      minTttHours,
      maxTttHours,
      fastestReportTitle,
      fastestReportId,
      slowestReportTitle,
      slowestReportId,
      slaUnder48hCount,
      slaUnder48hPercent,
      slaTargetHours,
      momDiffHours,
      momDiffPercent,
      trend,
      byPlatform,
      bySeverity,
      reports: monthReports
    });
  });

  // Overall aggregates across evaluated months
  const allTriagedInScope = monthlyData.flatMap(m => m.reports).filter(r => r.isTriaged && r.tttHours !== null);
  const totalTriagedReports = allTriagedInScope.length;
  const totalSubmittedReports = monthlyData.reduce((sum, m) => sum + m.totalSubmitted, 0);

  let overallAvgTttHours = 0;
  let overallAvgTttDays = 0;
  let overallMedianTttHours = 0;
  let overallSlaUnder48hPercent = 0;

  if (totalTriagedReports > 0) {
    const allHours = allTriagedInScope.map(r => r.tttHours as number);
    overallAvgTttHours = Math.round((allHours.reduce((a, b) => a + b, 0) / totalTriagedReports) * 10) / 10;
    overallAvgTttDays = Math.round((overallAvgTttHours / 24) * 10) / 10;

    const sortedAll = [...allHours].sort((a, b) => a - b);
    overallMedianTttHours = sortedAll[Math.floor(sortedAll.length / 2)];

    const underSlaCount = allTriagedInScope.filter(r => (r.tttHours || 0) <= slaTargetHours).length;
    overallSlaUnder48hPercent = Math.round((underSlaCount / totalTriagedReports) * 100);
  }

  // Best Month (lowest non-zero avgTttHours) and Worst Month (highest avgTttHours)
  const validMonths = monthlyData.filter(m => m.triagedCount > 0);
  const bestMonth = validMonths.length > 0 
    ? [...validMonths].sort((a, b) => a.avgTttHours - b.avgTttHours)[0] 
    : null;
  const worstMonth = validMonths.length > 0 
    ? [...validMonths].sort((a, b) => b.avgTttHours - a.avgTttHours)[0] 
    : null;

  const latestMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
  const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const latestMomDiffHours = latestMonth?.momDiffHours || 0;
  const latestMomDiffPercent = latestMonth?.momDiffPercent || 0;
  const latestTrend = latestMonth?.trend || 'initial';

  // Platform comparisons overall
  const platformAgg: Record<string, { totalHours: number; count: number }> = {};
  allTriagedInScope.forEach(r => {
    if (!platformAgg[r.platform]) {
      platformAgg[r.platform] = { totalHours: 0, count: 0 };
    }
    platformAgg[r.platform].totalHours += (r.tttHours || 0);
    platformAgg[r.platform].count += 1;
  });

  const platformList = Object.entries(platformAgg)
    .filter(([, v]) => v.count > 0)
    .map(([plat, v]) => ({
      platform: plat,
      avgTttHours: Math.round((v.totalHours / v.count) * 10) / 10,
      count: v.count
    }))
    .sort((a, b) => a.avgTttHours - b.avgTttHours);

  const fastestPlatform = platformList.length > 0 ? platformList[0] : null;
  const slowestPlatform = platformList.length > 1 ? platformList[platformList.length - 1] : null;

  // Severity comparisons overall
  const severityOrder: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const severityComparison = severityOrder.map(sev => {
    const sReports = allTriagedInScope.filter(r => r.severity === sev);
    const count = sReports.length;
    const avgTttHours = count > 0 
      ? Math.round((sReports.reduce((sum, r) => sum + (r.tttHours || 0), 0) / count) * 10) / 10 
      : 0;
    return {
      severity: sev,
      avgTttHours,
      count,
      ratioVsCritical: 1 // computed below
    };
  }).filter(s => s.count > 0);

  const critItem = severityComparison.find(s => s.severity === 'CRITICAL');
  if (critItem && critItem.avgTttHours > 0) {
    severityComparison.forEach(item => {
      item.ratioVsCritical = Math.round((item.avgTttHours / critItem.avgTttHours) * 10) / 10;
    });
  }

  return {
    monthlyData,
    allReportsTtt,
    overallAvgTttHours,
    overallAvgTttDays,
    overallMedianTttHours,
    overallSlaUnder48hPercent,
    totalTriagedReports,
    totalSubmittedReports,
    bestMonth,
    worstMonth,
    latestMonth,
    previousMonth,
    latestMomDiffHours,
    latestMomDiffPercent,
    latestTrend,
    fastestPlatform,
    slowestPlatform,
    severityComparison,
    timeframe
  };
}

export interface TttHistogramBucket {
  key: string;
  label: string;
  shortLabel: string;
  rangeDescription: string;
  minHours: number;
  maxHours: number; // Infinity for top bucket
  count: number;
  percent: number;
  isBottleneck: boolean;
  severityLevel: 'optimal' | 'normal' | 'warning' | 'bottleneck' | 'severe_bottleneck';
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  reports: ReportTttData[];
}

export interface TttDistributionAnalysis {
  buckets: TttHistogramBucket[];
  allTriagedReports: ReportTttData[];
  totalTriaged: number;
  avgTttHours: number;
  avgTttDays: number;
  medianTttHours: number;
  medianTttDays: number;
  minTttHours: number;
  maxTttHours: number;
  standardDeviationHours: number;
  slaUnder48hPercent: number;
  slaUnder24hPercent: number;
  bottlenecksCount: number;
  bottlenecksPercent: number;
  bottleneckReports: ReportTttData[];
  primaryBottleneckPlatform?: string;
  primaryBottleneckSeverity?: Severity;
  recommendations: string[];
}

const HISTOGRAM_BUCKET_TEMPLATES = [
  {
    key: '0-12h',
    shortLabel: '< 12h',
    label: '< 12h (Ultra-Rápido)',
    rangeDescription: 'Triagem emergencial em menos de 12 horas',
    minHours: 0,
    maxHours: 12,
    isBottleneck: false,
    severityLevel: 'optimal' as const,
    color: '#10b981',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: '12-24h',
    shortLabel: '12h-24h',
    label: '12h - 24h (SLA 1 Dia)',
    rangeDescription: 'Triagem no mesmo dia ou até 24 horas',
    minHours: 12,
    maxHours: 24,
    isBottleneck: false,
    severityLevel: 'optimal' as const,
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-400'
  },
  {
    key: '24-48h',
    shortLabel: '24h-48h',
    label: '24h - 48h (Meta SLA 2 Dias)',
    rangeDescription: 'Triagem padrão dentro do SLA corporativo',
    minHours: 24,
    maxHours: 48,
    isBottleneck: false,
    severityLevel: 'normal' as const,
    color: '#6366f1',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
    textClass: 'text-indigo-400'
  },
  {
    key: '48-72h',
    shortLabel: '48h-72h',
    label: '48h - 72h (Atenção / 3 Dias)',
    rangeDescription: 'Triagem limítrofe no 3º dia útil',
    minHours: 48,
    maxHours: 72,
    isBottleneck: false,
    severityLevel: 'warning' as const,
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: '72-120h',
    shortLabel: '3d-5d',
    label: '3d - 5d (Gargalo Operacional)',
    rangeDescription: 'Atraso perceptível com mais de 3 dias de espera',
    minHours: 72,
    maxHours: 120,
    isBottleneck: true,
    severityLevel: 'bottleneck' as const,
    color: '#f97316',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-400'
  },
  {
    key: '120-168h',
    shortLabel: '5d-7d',
    label: '5d - 7d (Gargalo Severo)',
    rangeDescription: 'Espera de quase uma semana sem validação',
    minHours: 120,
    maxHours: 168,
    isBottleneck: true,
    severityLevel: 'severe_bottleneck' as const,
    color: '#ef4444',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-400'
  },
  {
    key: 'gt168h',
    shortLabel: '> 7d',
    label: '> 7d (Gargalo Crítico)',
    rangeDescription: 'Acima de 7 dias úteis; risco de evasão de pesquisador',
    minHours: 168,
    maxHours: Infinity,
    isBottleneck: true,
    severityLevel: 'severe_bottleneck' as const,
    color: '#dc2626',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400'
  }
];

/**
 * Calculates the distribution of Time to Triage (TTT) across histogram buckets,
 * identifying productivity bottlenecks and recommendations.
 */
export function calculateTttHistogramDistribution(
  reports: VulnerabilityReport[],
  options: {
    filterPlatform?: string;
    filterSeverity?: Severity | 'ALL';
    bottleneckThresholdHours?: number;
  } = {}
): TttDistributionAnalysis {
  const {
    filterPlatform = 'ALL',
    filterSeverity = 'ALL',
    bottleneckThresholdHours = 72
  } = options;

  let allReportsTtt = reports.map(extractReportTtt);

  if (filterPlatform !== 'ALL') {
    allReportsTtt = allReportsTtt.filter(r => r.platform === filterPlatform);
  }
  if (filterSeverity !== 'ALL') {
    allReportsTtt = allReportsTtt.filter(r => r.severity === filterSeverity);
  }

  const allTriaged = allReportsTtt.filter(r => r.isTriaged && r.tttHours !== null);
  const totalTriaged = allTriaged.length;

  if (totalTriaged === 0) {
    return {
      buckets: HISTOGRAM_BUCKET_TEMPLATES.map(t => ({
        ...t,
        count: 0,
        percent: 0,
        reports: []
      })),
      allTriagedReports: [],
      totalTriaged: 0,
      avgTttHours: 0,
      avgTttDays: 0,
      medianTttHours: 0,
      medianTttDays: 0,
      minTttHours: 0,
      maxTttHours: 0,
      standardDeviationHours: 0,
      slaUnder48hPercent: 0,
      slaUnder24hPercent: 0,
      bottlenecksCount: 0,
      bottlenecksPercent: 0,
      bottleneckReports: [],
      recommendations: []
    };
  }

  const times = allTriaged.map(r => r.tttHours as number);
  const totalHours = times.reduce((a, b) => a + b, 0);
  const avgTttHours = Math.round((totalHours / totalTriaged) * 10) / 10;
  const avgTttDays = Math.round((avgTttHours / 24) * 10) / 10;

  const sortedTimes = [...times].sort((a, b) => a - b);
  const medianTttHours = sortedTimes[Math.floor(sortedTimes.length / 2)];
  const medianTttDays = Math.round((medianTttHours / 24) * 10) / 10;
  const minTttHours = sortedTimes[0];
  const maxTttHours = sortedTimes[sortedTimes.length - 1];

  // Standard deviation
  const variance = times.reduce((sum, val) => sum + Math.pow(val - avgTttHours, 2), 0) / totalTriaged;
  const standardDeviationHours = Math.round(Math.sqrt(variance) * 10) / 10;

  const slaUnder48hCount = allTriaged.filter(r => (r.tttHours || 0) <= 48).length;
  const slaUnder48hPercent = Math.round((slaUnder48hCount / totalTriaged) * 100);

  const slaUnder24hCount = allTriaged.filter(r => (r.tttHours || 0) <= 24).length;
  const slaUnder24hPercent = Math.round((slaUnder24hCount / totalTriaged) * 100);

  // Group into histogram buckets
  const buckets: TttHistogramBucket[] = HISTOGRAM_BUCKET_TEMPLATES.map(tmpl => {
    const bucketReports = allTriaged.filter(r => {
      const h = r.tttHours as number;
      if (tmpl.maxHours === Infinity) {
        return h >= tmpl.minHours;
      }
      return h >= tmpl.minHours && h < tmpl.maxHours;
    });

    const count = bucketReports.length;
    const percent = totalTriaged > 0 ? Math.round((count / totalTriaged) * 100) : 0;

    return {
      ...tmpl,
      count,
      percent,
      reports: bucketReports
    };
  });

  // Identify bottlenecks
  const bottleneckReports = allTriaged.filter(r => (r.tttHours || 0) >= bottleneckThresholdHours);
  const bottlenecksCount = bottleneckReports.length;
  const bottlenecksPercent = totalTriaged > 0 ? Math.round((bottlenecksCount / totalTriaged) * 100) : 0;

  // Find primary platform and severity of bottlenecks
  let primaryBottleneckPlatform: string | undefined;
  let primaryBottleneckSeverity: Severity | undefined;

  if (bottleneckReports.length > 0) {
    const platCounts: Record<string, number> = {};
    const sevCounts: Record<string, number> = {};

    bottleneckReports.forEach(r => {
      platCounts[r.platform] = (platCounts[r.platform] || 0) + 1;
      sevCounts[r.severity] = (sevCounts[r.severity] || 0) + 1;
    });

    primaryBottleneckPlatform = Object.entries(platCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    primaryBottleneckSeverity = Object.entries(sevCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Severity;
  }

  // Generate automated productivity recommendations
  const recommendations: string[] = [];

  if (bottlenecksPercent > 20) {
    recommendations.push(
      `Gargalo crítico detectado: ${bottlenecksPercent}% dos relatórios levam mais de ${bottleneckThresholdHours}h para triagem.`
    );
  } else if (bottlenecksPercent > 10) {
    recommendations.push(
      `Atenção operacional: ${bottlenecksCount} relatório(s) acumulam tempo excessivo de espera (> ${bottleneckThresholdHours}h).`
    );
  } else {
    recommendations.push(
      'Excelente fluidez operacional: mais de 90% dos relatórios são triados antes do limite de gargalo.'
    );
  }

  if (primaryBottleneckPlatform) {
    recommendations.push(
      `Maior concentração de lentidão na plataforma ${primaryBottleneckPlatform}. Considere revisar a esteira de triagem dessa equipe.`
    );
  }

  if (primaryBottleneckSeverity && primaryBottleneckSeverity !== 'CRITICAL') {
    recommendations.push(
      `Relatórios de severidade ${primaryBottleneckSeverity} concentram os maiores atrasos. Padronizar templates pode acelerar a validação.`
    );
  }

  return {
    buckets,
    allTriagedReports: allTriaged,
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
  };
}

export interface AverageTttCalculationResult {
  averageTttHours: number;
  averageTttDays: number;
  medianTttHours: number;
  medianTttDays: number;
  fastestTttHours: number;
  fastestTttDays: number;
  slowestTttHours: number;
  slowestTttDays: number;
  fastestReport?: ReportTttData;
  slowestReport?: ReportTttData;
  totalTriagedCount: number;
  totalSubmittedCount: number;
  triagedRatioPercent: number;
  slaUnder48hCount: number;
  slaUnder48hPercent: number;
  slaUnder24hCount: number;
  slaUnder24hPercent: number;
  byPlatform: Record<string, { count: number; avgTttHours: number; avgTttDays: number }>;
  bySeverity: Partial<Record<Severity, { count: number; avgTttHours: number; avgTttDays: number }>>;
  reportsWithTtt: ReportTttData[];
}

/**
 * Calculates the Average Time to Triaged (TTT) across vulnerability reports,
 * measuring the exact time difference between the initial submission and the
 * first transition to status 'TRIAGED' or 'VALIDATED' in the 'timeline' array.
 */
export function calculateAverageTtt(reports: VulnerabilityReport[]): AverageTttCalculationResult {
  if (!reports || reports.length === 0) {
    return {
      averageTttHours: 0,
      averageTttDays: 0,
      medianTttHours: 0,
      medianTttDays: 0,
      fastestTttHours: 0,
      fastestTttDays: 0,
      slowestTttHours: 0,
      slowestTttDays: 0,
      totalTriagedCount: 0,
      totalSubmittedCount: 0,
      triagedRatioPercent: 0,
      slaUnder48hCount: 0,
      slaUnder48hPercent: 0,
      slaUnder24hCount: 0,
      slaUnder24hPercent: 0,
      byPlatform: {},
      bySeverity: {},
      reportsWithTtt: []
    };
  }

  const reportsWithTtt: ReportTttData[] = [];

  for (const report of reports) {
    const data = extractReportTtt(report);
    if (data.isTriaged && data.tttHours !== null) {
      reportsWithTtt.push(data);
    }
  }

  const totalSubmittedCount = reports.length;
  const totalTriagedCount = reportsWithTtt.length;

  if (totalTriagedCount === 0) {
    return {
      averageTttHours: 0,
      averageTttDays: 0,
      medianTttHours: 0,
      medianTttDays: 0,
      fastestTttHours: 0,
      fastestTttDays: 0,
      slowestTttHours: 0,
      slowestTttDays: 0,
      totalTriagedCount: 0,
      totalSubmittedCount,
      triagedRatioPercent: 0,
      slaUnder48hCount: 0,
      slaUnder48hPercent: 0,
      slaUnder24hCount: 0,
      slaUnder24hPercent: 0,
      byPlatform: {},
      bySeverity: {},
      reportsWithTtt: []
    };
  }

  // Sort ascending by TTT in hours
  reportsWithTtt.sort((a, b) => (a.tttHours || 0) - (b.tttHours || 0));

  const totalHours = reportsWithTtt.reduce((sum, r) => sum + (r.tttHours || 0), 0);
  const avgHours = Math.round((totalHours / totalTriagedCount) * 10) / 10;
  const avgDays = Math.round((avgHours / 24) * 10) / 10;

  // Calculate median
  const mid = Math.floor(totalTriagedCount / 2);
  const medianHours = totalTriagedCount % 2 !== 0
    ? (reportsWithTtt[mid].tttHours || 0)
    : Math.round((((reportsWithTtt[mid - 1].tttHours || 0) + (reportsWithTtt[mid].tttHours || 0)) / 2) * 10) / 10;
  const medianDays = Math.round((medianHours / 24) * 10) / 10;

  const fastest = reportsWithTtt[0];
  const slowest = reportsWithTtt[reportsWithTtt.length - 1];

  const slaUnder48hCount = reportsWithTtt.filter(r => r.slaUnder48h).length;
  const slaUnder48hPercent = Math.round((slaUnder48hCount / totalTriagedCount) * 100);

  const slaUnder24hCount = reportsWithTtt.filter(r => r.slaUnder24h).length;
  const slaUnder24hPercent = Math.round((slaUnder24hCount / totalTriagedCount) * 100);

  const triagedRatioPercent = Math.round((totalTriagedCount / totalSubmittedCount) * 100);

  // Group by platform
  const byPlatform: Record<string, { count: number; avgTttHours: number; avgTttDays: number }> = {};
  for (const r of reportsWithTtt) {
    if (!byPlatform[r.platform]) {
      byPlatform[r.platform] = { count: 0, avgTttHours: 0, avgTttDays: 0 };
    }
    byPlatform[r.platform].count++;
  }
  for (const plat of Object.keys(byPlatform)) {
    const platReports = reportsWithTtt.filter(r => r.platform === plat);
    const platTotalHours = platReports.reduce((s, r) => s + (r.tttHours || 0), 0);
    const pAvgH = Math.round((platTotalHours / platReports.length) * 10) / 10;
    byPlatform[plat].avgTttHours = pAvgH;
    byPlatform[plat].avgTttDays = Math.round((pAvgH / 24) * 10) / 10;
  }

  // Group by severity
  const bySeverity: Partial<Record<Severity, { count: number; avgTttHours: number; avgTttDays: number }>> = {};
  const severitiesList: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  for (const sev of severitiesList) {
    const sevReports = reportsWithTtt.filter(r => r.severity === sev);
    if (sevReports.length > 0) {
      const sTotalH = sevReports.reduce((s, r) => s + (r.tttHours || 0), 0);
      const sAvgH = Math.round((sTotalH / sevReports.length) * 10) / 10;
      bySeverity[sev] = {
        count: sevReports.length,
        avgTttHours: sAvgH,
        avgTttDays: Math.round((sAvgH / 24) * 10) / 10
      };
    }
  }

  return {
    averageTttHours: avgHours,
    averageTttDays: avgDays,
    medianTttHours: medianHours,
    medianTttDays: medianDays,
    fastestTttHours: fastest.tttHours || 0,
    fastestTttDays: fastest.tttDays || 0,
    slowestTttHours: slowest.tttHours || 0,
    slowestTttDays: slowest.tttDays || 0,
    fastestReport: fastest,
    slowestReport: slowest,
    totalTriagedCount,
    totalSubmittedCount,
    triagedRatioPercent,
    slaUnder48hCount,
    slaUnder48hPercent,
    slaUnder24hCount,
    slaUnder24hPercent,
    byPlatform,
    bySeverity,
    reportsWithTtt
  };
}


