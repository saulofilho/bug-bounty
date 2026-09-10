import { VulnerabilityReport, Severity, PlatformName, TimelineEvent } from '../types';

export interface ReportHourlyStat {
  reportId: string;
  title: string;
  target: string;
  platform: PlatformName;
  severity: Severity;
  bountyAmount: number;
  currency: string;
  hoursSpent: number;
  hourlyRateUSD: number;
  hourlyRateBRL: number;
  timelineEventsCount: number;
  isExplicitHours: boolean;
  eventDetails: Array<{
    date: string;
    title: string;
    type: string;
    hoursSpent: number;
    source: 'explicit' | 'note_extracted' | 'estimated';
  }>;
}

export interface SeverityHourlyStat {
  severity: Severity;
  reportsCount: number;
  totalBountyUSD: number;
  totalHours: number;
  hourlyRateUSD: number;
  hourlyRateBRL: number;
}

export interface PlatformHourlyStat {
  platform: PlatformName;
  reportsCount: number;
  totalBountyUSD: number;
  totalHours: number;
  hourlyRateUSD: number;
  hourlyRateBRL: number;
}

export interface OverallHourlyMetrics {
  totalBountyUSD: number;
  totalBountyBRL: number;
  totalHoursInvested: number;
  averageHourlyRateUSD: number;
  averageHourlyRateBRL: number;
  rewardedReportsCount: number;
  averageHoursPerReport: number;
  averageBountyPerReportUSD: number;
  highestHourlyRateReport: ReportHourlyStat | null;
  lowestHourlyRateReport: ReportHourlyStat | null;
  severityBreakdown: SeverityHourlyStat[];
  platformBreakdown: PlatformHourlyStat[];
  reportStats: ReportHourlyStat[];
  marketComparison: {
    juniorPentesterRateUSD: number; // e.g. $40/h
    seniorConsultantRateUSD: number; // e.g. $75/h
    leadRedTeamerRateUSD: number; // e.g. $125/h
    versusSeniorRatio: number; // e.g. 2.4x
    isAboveSenior: boolean;
  };
}

/**
 * Parses notes to find mentions of hours like "3.5h", "2 horas", "4 hrs", "5 hours"
 */
function extractHoursFromNotes(notes?: string): number | null {
  if (!notes) return null;
  const match = notes.match(/(\d+(?:[.,]\d+)?)\s*(?:h(?:ora|rs|our)?s?)\b/i);
  if (match && match[1]) {
    const parsed = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      return parsed;
    }
  }
  return null;
}

/**
 * Baseline hours estimated for discovery/recon/poc based on severity
 */
function getBaselinePhaseHours(severity: Severity): number {
  switch (severity) {
    case 'CRITICAL':
      return 5.5; // High impact chained vulnerability investigation
    case 'HIGH':
      return 4.0;
    case 'MEDIUM':
      return 2.5;
    case 'LOW':
      return 1.5;
    case 'INFO':
    default:
      return 1.0;
  }
}

/**
 * Calculates time invested for a single report from its timeline events.
 */
export function calculateReportHoursFromTimeline(report: VulnerabilityReport): {
  totalHours: number;
  isExplicit: boolean;
  eventDetails: Array<{
    date: string;
    title: string;
    type: string;
    hoursSpent: number;
    source: 'explicit' | 'note_extracted' | 'estimated';
  }>;
} {
  // If report has a top-level override
  if (report.timeSpentHours && report.timeSpentHours > 0) {
    return {
      totalHours: report.timeSpentHours,
      isExplicit: true,
      eventDetails: (report.timeline || []).map(evt => ({
        date: evt.date,
        title: evt.title,
        type: evt.type,
        hoursSpent: (report.timeSpentHours || 0) / Math.max(1, report.timeline?.length || 1),
        source: 'explicit'
      }))
    };
  }

  const timeline = report.timeline || [];
  let explicitHoursFound = false;
  let totalExplicitHours = 0;

  const eventDetails: Array<{
    date: string;
    title: string;
    type: string;
    hoursSpent: number;
    source: 'explicit' | 'note_extracted' | 'estimated';
  }> = [];

  // Check if any event has explicit hoursSpent
  timeline.forEach(event => {
    if (typeof event.hoursSpent === 'number' && event.hoursSpent > 0) {
      explicitHoursFound = true;
      totalExplicitHours += event.hoursSpent;
      eventDetails.push({
        date: event.date,
        title: event.title,
        type: event.type,
        hoursSpent: event.hoursSpent,
        source: 'explicit'
      });
    } else {
      const extracted = extractHoursFromNotes(event.notes);
      if (extracted !== null) {
        explicitHoursFound = true;
        totalExplicitHours += extracted;
        eventDetails.push({
          date: event.date,
          title: event.title,
          type: event.type,
          hoursSpent: extracted,
          source: 'note_extracted'
        });
      }
    }
  });

  if (explicitHoursFound && totalExplicitHours > 0) {
    return {
      totalHours: Math.round(totalExplicitHours * 10) / 10,
      isExplicit: true,
      eventDetails
    };
  }

  // Heuristic estimation based on event stages in the timeline
  let estimatedTotal = 0;
  const fallbackDetails: typeof eventDetails = [];

  timeline.forEach((event, index) => {
    let phaseHours = 0.5; // default communication/triage follow-up

    if (event.type === 'creation' || index === 0) {
      // First event is the initial hunting, recon and PoC drafting
      phaseHours = getBaselinePhaseHours(report.severity);
    } else if (event.type === 'status_change') {
      // Retesting, answering questions, or verifying patches
      phaseHours = 0.75;
    } else if (event.type === 'bounty') {
      // Awarding verification
      phaseHours = 0.25;
    } else if (event.type === 'dispatch') {
      phaseHours = 0.5;
    } else if (event.type === 'pgp_signature') {
      phaseHours = 0.25;
    } else if (event.type === 'note') {
      phaseHours = 1.0;
    }

    estimatedTotal += phaseHours;
    fallbackDetails.push({
      date: event.date,
      title: event.title,
      type: event.type,
      hoursSpent: phaseHours,
      source: 'estimated'
    });
  });

  // Ensure minimum realistic effort of 1.5h if timeline is empty or minimal
  if (estimatedTotal < 1.0) {
    estimatedTotal = getBaselinePhaseHours(report.severity);
  }

  return {
    totalHours: Math.round(estimatedTotal * 10) / 10,
    isExplicit: false,
    eventDetails: fallbackDetails
  };
}

/**
 * Calculates comprehensive hourly rate metrics across reports.
 */
export function calculateHourlyRateMetrics(
  reports: VulnerabilityReport[],
  options?: {
    usdToBrlRate?: number;
    platformFilter?: string;
    severityFilter?: string;
    timeframeDays?: number | 'ALL';
    includePendingBounties?: boolean;
  }
): OverallHourlyMetrics {
  const usdToBrl = options?.usdToBrlRate || 5.45;
  const now = new Date();

  // Filter rewarded reports (or reports with bounty > 0)
  const candidateReports = reports.filter(r => {
    // Bounty amount check
    const hasBounty = (r.bountyAmount && r.bountyAmount > 0) || r.status === 'REWARDED';
    if (!hasBounty && !options?.includePendingBounties) return false;

    // Platform filter
    if (options?.platformFilter && options.platformFilter !== 'ALL') {
      if (r.platform !== options.platformFilter) return false;
    }

    // Severity filter
    if (options?.severityFilter && options.severityFilter !== 'ALL') {
      if (r.severity !== options.severityFilter) return false;
    }

    // Timeframe filter
    if (options?.timeframeDays && options.timeframeDays !== 'ALL') {
      const reportDate = new Date(r.updatedAt || r.createdAt);
      const diffDays = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > options.timeframeDays) return false;
    }

    return true;
  });

  const reportStats: ReportHourlyStat[] = candidateReports.map(report => {
    const { totalHours, isExplicit, eventDetails } = calculateReportHoursFromTimeline(report);
    const bountyUSD = report.bountyAmount || 0;
    const hourlyRateUSD = totalHours > 0 ? bountyUSD / totalHours : 0;
    const hourlyRateBRL = hourlyRateUSD * usdToBrl;

    return {
      reportId: report.id,
      title: report.title,
      target: report.target,
      platform: report.platform,
      severity: report.severity,
      bountyAmount: bountyUSD,
      currency: report.currency,
      hoursSpent: totalHours,
      hourlyRateUSD: Math.round(hourlyRateUSD * 100) / 100,
      hourlyRateBRL: Math.round(hourlyRateBRL * 100) / 100,
      timelineEventsCount: report.timeline?.length || 0,
      isExplicitHours: isExplicit,
      eventDetails
    };
  });

  // Sort reportStats by hourlyRateUSD descending (Highest ROI first)
  reportStats.sort((a, b) => b.hourlyRateUSD - a.hourlyRateUSD);

  const totalBountyUSD = reportStats.reduce((sum, r) => sum + r.bountyAmount, 0);
  const totalBountyBRL = totalBountyUSD * usdToBrl;
  const totalHoursInvested = Math.round(reportStats.reduce((sum, r) => sum + r.hoursSpent, 0) * 10) / 10;
  
  const averageHourlyRateUSD = totalHoursInvested > 0 
    ? Math.round((totalBountyUSD / totalHoursInvested) * 100) / 100 
    : 0;
  const averageHourlyRateBRL = Math.round(averageHourlyRateUSD * usdToBrl * 100) / 100;

  const rewardedReportsCount = reportStats.length;
  const averageHoursPerReport = rewardedReportsCount > 0 
    ? Math.round((totalHoursInvested / rewardedReportsCount) * 10) / 10 
    : 0;
  const averageBountyPerReportUSD = rewardedReportsCount > 0 
    ? Math.round(totalBountyUSD / rewardedReportsCount) 
    : 0;

  const highestHourlyRateReport = reportStats.length > 0 ? reportStats[0] : null;
  const lowestHourlyRateReport = reportStats.length > 0 ? reportStats[reportStats.length - 1] : null;

  // Severity Breakdown
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const severityBreakdown: SeverityHourlyStat[] = severities.map(sev => {
    const matching = reportStats.filter(r => r.severity === sev);
    const sevBounty = matching.reduce((sum, r) => sum + r.bountyAmount, 0);
    const sevHours = Math.round(matching.reduce((sum, r) => sum + r.hoursSpent, 0) * 10) / 10;
    const sevRateUSD = sevHours > 0 ? Math.round((sevBounty / sevHours) * 100) / 100 : 0;
    const sevRateBRL = Math.round(sevRateUSD * usdToBrl * 100) / 100;

    return {
      severity: sev,
      reportsCount: matching.length,
      totalBountyUSD: sevBounty,
      totalHours: sevHours,
      hourlyRateUSD: sevRateUSD,
      hourlyRateBRL: sevRateBRL
    };
  }).filter(s => s.reportsCount > 0 || s.totalBountyUSD > 0);

  // Platform Breakdown
  const platforms: PlatformName[] = ['HackerOne', 'Bugcrowd', 'Intigriti', 'YesWeHack', 'Synack', 'Direct / VDP'];
  const platformBreakdown: PlatformHourlyStat[] = platforms.map(plat => {
    const matching = reportStats.filter(r => r.platform === plat);
    const platBounty = matching.reduce((sum, r) => sum + r.bountyAmount, 0);
    const platHours = Math.round(matching.reduce((sum, r) => sum + r.hoursSpent, 0) * 10) / 10;
    const platRateUSD = platHours > 0 ? Math.round((platBounty / platHours) * 100) / 100 : 0;
    const platRateBRL = Math.round(platRateUSD * usdToBrl * 100) / 100;

    return {
      platform: plat,
      reportsCount: matching.length,
      totalBountyUSD: platBounty,
      totalHours: platHours,
      hourlyRateUSD: platRateUSD,
      hourlyRateBRL: platRateBRL
    };
  }).filter(p => p.reportsCount > 0);

  // Market Comparison Benchmarks
  const juniorPentesterRateUSD = 40;
  const seniorConsultantRateUSD = 75;
  const leadRedTeamerRateUSD = 125;
  const versusSeniorRatio = seniorConsultantRateUSD > 0 
    ? Math.round((averageHourlyRateUSD / seniorConsultantRateUSD) * 10) / 10 
    : 1.0;

  return {
    totalBountyUSD,
    totalBountyBRL,
    totalHoursInvested,
    averageHourlyRateUSD,
    averageHourlyRateBRL,
    rewardedReportsCount,
    averageHoursPerReport,
    averageBountyPerReportUSD,
    highestHourlyRateReport,
    lowestHourlyRateReport,
    severityBreakdown,
    platformBreakdown,
    reportStats,
    marketComparison: {
      juniorPentesterRateUSD,
      seniorConsultantRateUSD,
      leadRedTeamerRateUSD,
      versusSeniorRatio,
      isAboveSenior: averageHourlyRateUSD >= seniorConsultantRateUSD
    }
  };
}
