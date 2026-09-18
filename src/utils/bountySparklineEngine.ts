import { VulnerabilityReport, Severity } from '../types';

export interface BountyAwardEvent {
  reportId: string;
  reportTitle: string;
  severity: Severity;
  platform: string;
  amount: number;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
}

export interface BountyAwardPoint {
  date: string; // YYYY-MM-DD
  formattedDate: string; // "18 Set"
  shortDayLabel: string; // "18/09"
  dayIndex: number; // 0 (29 days ago) to 29 (today)
  dailyAmountUSD: number;
  cumulativeAmountUSD: number;
  awardsCount: number;
  reports: Array<{
    id: string;
    title: string;
    severity: Severity;
    platform: string;
    amount: number;
  }>;
}

export interface BountySparklineMetrics {
  total30DaysUSD: number;
  totalPrevious30DaysUSD: number;
  growthPercentage: number | null;
  growthDirection: 'up' | 'down' | 'neutral';
  peakDailyAmountUSD: number;
  peakDailyDate: string | null;
  peakReport: { id: string; title: string; amount: number } | null;
  activeDaysCount: number;
  rewardedReportsCount: number;
  averagePerReportUSD: number;
  points: BountyAwardPoint[];
  awardsIn30Days: BountyAwardEvent[];
}

/**
 * Extracts all recorded bounty payments from reports and their timeline history.
 */
export function extractBountyAwards(reports: VulnerabilityReport[]): BountyAwardEvent[] {
  const awards: BountyAwardEvent[] = [];

  for (const report of reports) {
    const reportAmount = report.bountyAmount || 0;
    if (reportAmount <= 0 && report.status !== 'REWARDED') {
      continue;
    }

    const timelineBountyEvents = (report.timeline || []).filter(e => e.type === 'bounty');

    if (timelineBountyEvents.length > 0) {
      for (const bEvent of timelineBountyEvents) {
        let eventAmount = reportAmount / timelineBountyEvents.length;

        // If explicit amount written in event notes (e.g., "$3,500")
        if (bEvent.notes) {
          const match = bEvent.notes.match(/\$([\d,]+)/);
          if (match) {
            const parsed = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(parsed) && parsed > 0) {
              eventAmount = parsed;
            }
          }
        }

        const parsedDate = new Date(bEvent.date);
        const validDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
        const dateStr = validDate.toISOString().split('T')[0];

        awards.push({
          reportId: report.id,
          reportTitle: report.title,
          severity: report.severity,
          platform: report.platform,
          amount: eventAmount > 0 ? eventAmount : reportAmount,
          dateStr,
          timestamp: validDate.getTime()
        });
      }
    } else if (reportAmount > 0) {
      // Fallback to updatedAt or createdAt
      const fallbackDateStr = report.updatedAt || report.createdAt || new Date().toISOString();
      const parsedDate = new Date(fallbackDateStr);
      const validDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
      const dateStr = validDate.toISOString().split('T')[0];

      awards.push({
        reportId: report.id,
        reportTitle: report.title,
        severity: report.severity,
        platform: report.platform,
        amount: reportAmount,
        dateStr,
        timestamp: validDate.getTime()
      });
    }
  }

  return awards;
}

/**
 * Computes 30-day bounty amounts, daily distribution, and cumulative trend.
 */
export function calculate30DayBountyTrend(
  reports: VulnerabilityReport[],
  refDate: Date = new Date()
): BountySparklineMetrics {
  const awards = extractBountyAwards(reports);

  const dayAwardsMap = new Map<string, BountyAwardEvent[]>();
  for (const award of awards) {
    const list = dayAwardsMap.get(award.dateStr) || [];
    list.push(award);
    dayAwardsMap.set(award.dateStr, list);
  }

  // Previous 30-day window: [refDate - 59 days, refDate - 30 days]
  let totalPrevious30DaysUSD = 0;
  const prev30Start = new Date(refDate);
  prev30Start.setDate(refDate.getDate() - 59);
  prev30Start.setHours(0, 0, 0, 0);

  const prev30End = new Date(refDate);
  prev30End.setDate(refDate.getDate() - 30);
  prev30End.setHours(23, 59, 59, 999);

  for (const award of awards) {
    const awardDate = new Date(`${award.dateStr}T12:00:00`);
    if (awardDate >= prev30Start && awardDate <= prev30End) {
      totalPrevious30DaysUSD += award.amount;
    }
  }

  const points: BountyAwardPoint[] = [];
  const awardsIn30Days: BountyAwardEvent[] = [];
  let runningCumulative = 0;
  let total30DaysUSD = 0;
  let peakDailyAmountUSD = 0;
  let peakDailyDate: string | null = null;
  let peakReport: { id: string; title: string; amount: number } | null = null;
  let activeDaysCount = 0;
  const uniqueReportsIn30Days = new Set<string>();

  const monthNamesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const dayAwards = dayAwardsMap.get(dateStr) || [];
    const dailyAmountUSD = dayAwards.reduce((sum, a) => sum + a.amount, 0);

    if (dailyAmountUSD > 0) {
      activeDaysCount++;
      if (dailyAmountUSD > peakDailyAmountUSD) {
        peakDailyAmountUSD = dailyAmountUSD;
        peakDailyDate = dateStr;
      }
    }

    for (const a of dayAwards) {
      awardsIn30Days.push(a);
      uniqueReportsIn30Days.add(a.reportId);
      if (!peakReport || a.amount > peakReport.amount) {
        peakReport = { id: a.reportId, title: a.reportTitle, amount: a.amount };
      }
    }

    total30DaysUSD += dailyAmountUSD;
    runningCumulative += dailyAmountUSD;

    const dayNumber = d.getDate().toString().padStart(2, '0');
    const monthIndex = d.getMonth();
    const formattedDate = `${dayNumber} ${monthNamesPt[monthIndex]}`;
    const shortDayLabel = `${dayNumber}/${(monthIndex + 1).toString().padStart(2, '0')}`;

    points.push({
      date: dateStr,
      formattedDate,
      shortDayLabel,
      dayIndex: 29 - i,
      dailyAmountUSD,
      cumulativeAmountUSD: runningCumulative,
      awardsCount: dayAwards.length,
      reports: dayAwards.map(a => ({
        id: a.reportId,
        title: a.reportTitle,
        severity: a.severity,
        platform: a.platform,
        amount: a.amount
      }))
    });
  }

  let growthPercentage: number | null = null;
  let growthDirection: 'up' | 'down' | 'neutral' = 'neutral';

  if (totalPrevious30DaysUSD > 0) {
    growthPercentage = Math.round(((total30DaysUSD - totalPrevious30DaysUSD) / totalPrevious30DaysUSD) * 100);
    growthDirection = growthPercentage > 0 ? 'up' : growthPercentage < 0 ? 'down' : 'neutral';
  } else if (total30DaysUSD > 0) {
    growthPercentage = 100;
    growthDirection = 'up';
  }

  const rewardedReportsCount = uniqueReportsIn30Days.size;
  const averagePerReportUSD = rewardedReportsCount > 0 ? Math.round(total30DaysUSD / rewardedReportsCount) : 0;

  return {
    total30DaysUSD,
    totalPrevious30DaysUSD,
    growthPercentage,
    growthDirection,
    peakDailyAmountUSD,
    peakDailyDate,
    peakReport,
    activeDaysCount,
    rewardedReportsCount,
    averagePerReportUSD,
    points,
    awardsIn30Days
  };
}
