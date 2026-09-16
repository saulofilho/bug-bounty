import { VulnerabilityReport, Severity, ReportStatus } from '../types';

export interface ReportTriageMetric {
  reportId: string;
  reportTitle: string;
  target: string;
  platform: string;
  severity: Severity;
  currentStatus: ReportStatus;
  creationDate: string;
  triageDate?: string;
  closedDate?: string;
  daysToTriage?: number;
  daysToClose?: number;
  hoursToTriage?: number;
  daysCurrentlyPending?: number;
  statusPhase: 'DRAFT' | 'SUBMITTED' | 'TRIAGED' | 'CLOSED';
}

export interface PlatformTriageEfficiency {
  platform: string;
  totalCount: number;
  triagedCount: number;
  closedCount: number;
  avgDaysToTriage: number;
  avgDaysToClose: number;
}

export interface SeverityTriageEfficiency {
  severity: Severity;
  totalCount: number;
  triagedCount: number;
  avgDaysToTriage: number;
  avgDaysToClose: number;
}

export interface TriageEfficiencySummary {
  totalAnalyzed: number;
  totalTriaged: number;
  avgDaysToTriage: number;
  avgHoursToTriage: number;
  medianDaysToTriage: number;
  fastestTriageDays: number;
  slowestTriageDays: number;

  totalClosed: number;
  avgDaysToClose: number;
  medianDaysToClose: number;
  fastestCloseDays: number;
  slowestCloseDays: number;

  currentlyDraftCount: number;
  currentlySubmittedCount: number;
  currentlyTriagedCount: number;
  avgDaysWaitingCurrent: number;

  slaUnder48hPercent: number;
  slaUnder5DaysPercent: number;
  overallEfficiencyScore: number;

  byPlatform: PlatformTriageEfficiency[];
  bySeverity: SeverityTriageEfficiency[];
  reportMetrics: ReportTriageMetric[];
}

/**
 * Normalizes and converts date string into timestamp ms
 */
function parseDateSafe(dateStr?: string): number | null {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Calculates days between two date timestamps
 */
function getDiffInDays(startMs: number, endMs: number): number {
  const diffMs = Math.max(0, endMs - startMs);
  return Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
}

/**
 * Evaluates whether a timeline event represents a Triage transition
 */
function isTriageEvent(title?: string, notes?: string): boolean {
  const text = `${title || ''} ${notes || ''}`.toLowerCase();
  return (
    text.includes('tria') ||
    text.includes('aceit') ||
    text.includes('valid') ||
    text.includes('accepted') ||
    text.includes('triaged') ||
    text.includes('reproduzid') ||
    text.includes('confirmad')
  );
}

/**
 * Evaluates whether a timeline event represents a Resolution/Closure transition
 */
function isClosureEvent(title?: string, notes?: string, type?: string): boolean {
  if (type === 'bounty') return true;
  const text = `${title || ''} ${notes || ''}`.toLowerCase();
  return (
    text.includes('resolv') ||
    text.includes('mitigad') ||
    text.includes('fechad') ||
    text.includes('encerrad') ||
    text.includes('closed') ||
    text.includes('recompensa') ||
    text.includes('bounty') ||
    text.includes('pago') ||
    text.includes('concedid') ||
    text.includes('duplicate') ||
    text.includes('out of scope')
  );
}

/**
 * Core engine calculating Triage and Closure turn-around times from report timeline
 */
export function calculateTriageEfficiency(reports: VulnerabilityReport[]): TriageEfficiencySummary {
  const nowMs = Date.now();
  const reportMetrics: ReportTriageMetric[] = [];

  const triageTimes: number[] = [];
  const closeTimes: number[] = [];
  let under48hCount = 0;
  let under5dCount = 0;

  let currentDraftCount = 0;
  let currentSubmittedCount = 0;
  let currentTriagedCount = 0;
  const pendingWaitingTimes: number[] = [];

  reports.forEach(report => {
    const timeline = report.timeline || [];
    
    // Determine creation/draft timestamp
    const creationEvent = timeline.find(e => e.type === 'creation') || timeline[0];
    const creationDateStr = creationEvent?.date || report.createdAt;
    const creationMs = parseDateSafe(creationDateStr) || parseDateSafe(report.createdAt) || nowMs;

    let triageMs: number | null = null;
    let triageDateStr: string | undefined;
    let closedMs: number | null = null;
    let closedDateStr: string | undefined;

    // Scan timeline events for triage and closure
    timeline.forEach(event => {
      const eventMs = parseDateSafe(event.date);
      if (!eventMs || eventMs < creationMs) return;

      // Check for triage event
      if (!triageMs && (isTriageEvent(event.title, event.notes) || event.title.toLowerCase().includes('triad'))) {
        triageMs = eventMs;
        triageDateStr = event.date;
      }

      // Check for closure event
      if (!closedMs && isClosureEvent(event.title, event.notes, event.type)) {
        closedMs = eventMs;
        closedDateStr = event.date;
      }
    });

    // Fallback detection based on report status if not explicitly recorded in timeline text
    const isReportInTriageOrBeyond = ['TRIAGED', 'REWARDED', 'RESOLVED'].includes(report.status);
    const isReportClosed = ['REWARDED', 'RESOLVED', 'DUPLICATE', 'OUT_OF_SCOPE'].includes(report.status);

    if (!triageMs && isReportInTriageOrBeyond) {
      // If status progressed to TRIAGED or beyond, use intermediate timeline date or updatedAt
      const updatedMs = parseDateSafe(report.updatedAt);
      if (updatedMs && updatedMs >= creationMs) {
        // If closed, assume triage happened earlier or at intermediate point
        if (isReportClosed && closedMs && closedMs > creationMs) {
          triageMs = Math.round(creationMs + (closedMs - creationMs) * 0.35);
          triageDateStr = new Date(triageMs).toISOString().split('T')[0];
        } else {
          triageMs = updatedMs;
          triageDateStr = report.updatedAt;
        }
      }
    }

    if (!closedMs && isReportClosed) {
      const updatedMs = parseDateSafe(report.updatedAt);
      if (updatedMs && updatedMs >= creationMs) {
        closedMs = updatedMs;
        closedDateStr = report.updatedAt;
      }
    }

    // Calculate metrics
    let daysToTriage: number | undefined;
    let hoursToTriage: number | undefined;
    if (triageMs !== null) {
      daysToTriage = getDiffInDays(creationMs, triageMs);
      hoursToTriage = Math.round(daysToTriage * 24);
      triageTimes.push(daysToTriage);

      if (daysToTriage <= 2) under48hCount++;
      if (daysToTriage <= 5) under5dCount++;
    }

    let daysToClose: number | undefined;
    if (closedMs !== null) {
      daysToClose = getDiffInDays(creationMs, closedMs);
      closeTimes.push(daysToClose);
    }

    // In-flight reports
    let statusPhase: 'DRAFT' | 'SUBMITTED' | 'TRIAGED' | 'CLOSED' = 'DRAFT';
    if (isReportClosed) {
      statusPhase = 'CLOSED';
    } else if (report.status === 'TRIAGED') {
      statusPhase = 'TRIAGED';
      currentTriagedCount++;
    } else if (report.status === 'SUBMITTED') {
      statusPhase = 'SUBMITTED';
      currentSubmittedCount++;
    } else {
      statusPhase = 'DRAFT';
      currentDraftCount++;
    }

    let daysCurrentlyPending: number | undefined;
    if (!isReportClosed) {
      daysCurrentlyPending = getDiffInDays(creationMs, nowMs);
      if (report.status === 'DRAFT' || report.status === 'SUBMITTED') {
        pendingWaitingTimes.push(daysCurrentlyPending);
      }
    }

    reportMetrics.push({
      reportId: report.id,
      reportTitle: report.title,
      target: report.target,
      platform: report.platform,
      severity: report.severity,
      currentStatus: report.status,
      creationDate: creationDateStr,
      triageDate: triageDateStr,
      closedDate: closedDateStr,
      daysToTriage,
      daysToClose,
      hoursToTriage,
      daysCurrentlyPending,
      statusPhase
    });
  });

  // Calculate aggregates
  const totalTriaged = triageTimes.length;
  const avgDaysToTriage = totalTriaged > 0 
    ? Math.round((triageTimes.reduce((a, b) => a + b, 0) / totalTriaged) * 10) / 10 
    : 0;
  const avgHoursToTriage = Math.round(avgDaysToTriage * 24);

  const sortedTriage = [...triageTimes].sort((a, b) => a - b);
  const medianDaysToTriage = totalTriaged > 0
    ? sortedTriage[Math.floor(sortedTriage.length / 2)]
    : 0;
  const fastestTriageDays = totalTriaged > 0 ? sortedTriage[0] : 0;
  const slowestTriageDays = totalTriaged > 0 ? sortedTriage[sortedTriage.length - 1] : 0;

  const totalClosed = closeTimes.length;
  const avgDaysToClose = totalClosed > 0
    ? Math.round((closeTimes.reduce((a, b) => a + b, 0) / totalClosed) * 10) / 10
    : 0;

  const sortedClose = [...closeTimes].sort((a, b) => a - b);
  const medianDaysToClose = totalClosed > 0
    ? sortedClose[Math.floor(sortedClose.length / 2)]
    : 0;
  const fastestCloseDays = totalClosed > 0 ? sortedClose[0] : 0;
  const slowestCloseDays = totalClosed > 0 ? sortedClose[sortedClose.length - 1] : 0;

  const avgDaysWaitingCurrent = pendingWaitingTimes.length > 0
    ? Math.round((pendingWaitingTimes.reduce((a, b) => a + b, 0) / pendingWaitingTimes.length) * 10) / 10
    : 0;

  const slaUnder48hPercent = totalTriaged > 0
    ? Math.round((under48hCount / totalTriaged) * 100)
    : 0;
  const slaUnder5DaysPercent = totalTriaged > 0
    ? Math.round((under5dCount / totalTriaged) * 100)
    : 0;

  // Overall benchmark score (100 is best: average triage <= 2d and closure <= 7d)
  let score = 70;
  if (avgDaysToTriage > 0) {
    if (avgDaysToTriage <= 1.5) score += 15;
    else if (avgDaysToTriage <= 3.0) score += 10;
    else if (avgDaysToTriage > 6.0) score -= 15;
  }
  if (slaUnder48hPercent >= 70) score += 15;
  else if (slaUnder48hPercent >= 50) score += 8;
  const overallEfficiencyScore = Math.min(100, Math.max(20, score));

  // Platform breakdown
  const platforms = Array.from(new Set(reports.map(r => r.platform)));
  const byPlatform: PlatformTriageEfficiency[] = platforms.map(platform => {
    const pMetrics = reportMetrics.filter(m => m.platform === platform);
    const pTriageTimes = pMetrics.map(m => m.daysToTriage).filter((d): d is number => d !== undefined);
    const pCloseTimes = pMetrics.map(m => m.daysToClose).filter((d): d is number => d !== undefined);

    const pAvgTriage = pTriageTimes.length > 0
      ? Math.round((pTriageTimes.reduce((a, b) => a + b, 0) / pTriageTimes.length) * 10) / 10
      : 0;
    const pAvgClose = pCloseTimes.length > 0
      ? Math.round((pCloseTimes.reduce((a, b) => a + b, 0) / pCloseTimes.length) * 10) / 10
      : 0;

    return {
      platform,
      totalCount: pMetrics.length,
      triagedCount: pTriageTimes.length,
      closedCount: pCloseTimes.length,
      avgDaysToTriage: pAvgTriage,
      avgDaysToClose: pAvgClose
    };
  }).filter(p => p.totalCount > 0).sort((a, b) => {
    if (a.triagedCount === 0) return 1;
    if (b.triagedCount === 0) return -1;
    return a.avgDaysToTriage - b.avgDaysToTriage;
  });

  // Severity breakdown
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const bySeverity: SeverityTriageEfficiency[] = severities.map(sev => {
    const sMetrics = reportMetrics.filter(m => m.severity === sev);
    const sTriageTimes = sMetrics.map(m => m.daysToTriage).filter((d): d is number => d !== undefined);
    const sCloseTimes = sMetrics.map(m => m.daysToClose).filter((d): d is number => d !== undefined);

    const sAvgTriage = sTriageTimes.length > 0
      ? Math.round((sTriageTimes.reduce((a, b) => a + b, 0) / sTriageTimes.length) * 10) / 10
      : 0;
    const sAvgClose = sCloseTimes.length > 0
      ? Math.round((sCloseTimes.reduce((a, b) => a + b, 0) / sCloseTimes.length) * 10) / 10
      : 0;

    return {
      severity: sev,
      totalCount: sMetrics.length,
      triagedCount: sTriageTimes.length,
      avgDaysToTriage: sAvgTriage,
      avgDaysToClose: sAvgClose
    };
  }).filter(s => s.totalCount > 0);

  return {
    totalAnalyzed: reports.length,
    totalTriaged,
    avgDaysToTriage,
    avgHoursToTriage,
    medianDaysToTriage,
    fastestTriageDays,
    slowestTriageDays,
    totalClosed,
    avgDaysToClose,
    medianDaysToClose,
    fastestCloseDays,
    slowestCloseDays,
    currentlyDraftCount: currentDraftCount,
    currentlySubmittedCount: currentSubmittedCount,
    currentlyTriagedCount: currentTriagedCount,
    avgDaysWaitingCurrent,
    slaUnder48hPercent,
    slaUnder5DaysPercent,
    overallEfficiencyScore,
    byPlatform,
    bySeverity,
    reportMetrics
  };
}
