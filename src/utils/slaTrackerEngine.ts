// SLA (Service Level Agreement), MTTT & MTTR Engine
// Tracks remediation velocity, compliance thresholds, and imminent breach alerts

import { VulnerabilityReport, Severity } from '../types';

export interface SlaThreshold {
  severity: Severity;
  targetTriageHours: number; // e.g. Critical: 4h
  targetRemediationHours: number; // e.g. Critical: 48h
}

export const DEFAULT_SLA_THRESHOLDS: Record<Severity, SlaThreshold> = {
  CRITICAL: { severity: 'CRITICAL', targetTriageHours: 4, targetRemediationHours: 48 },
  HIGH: { severity: 'HIGH', targetTriageHours: 12, targetRemediationHours: 168 }, // 7 days
  MEDIUM: { severity: 'MEDIUM', targetTriageHours: 24, targetRemediationHours: 336 }, // 14 days
  LOW: { severity: 'LOW', targetTriageHours: 48, targetRemediationHours: 720 }, // 30 days
  INFO: { severity: 'INFO', targetTriageHours: 72, targetRemediationHours: 1440 } // 60 days
};

export interface ReportSlaStatus {
  reportId: string;
  title: string;
  severity: Severity;
  status: string;
  createdAt: string;
  hoursElapsed: number;
  triageDeadlineHours: number;
  remediationDeadlineHours: number;
  triageStatus: 'COMPLIANT' | 'BREACHED' | 'DUE_SOON';
  remediationStatus: 'COMPLIANT' | 'BREACHED' | 'DUE_SOON' | 'RESOLVED';
  hoursRemainingTriage: number;
  hoursRemainingRemediation: number;
}

export interface SlaOverviewMetrics {
  totalReportsEvaluated: number;
  overallComplianceRatePct: number;
  mtttHours: number; // Mean Time to Triage
  mttrHours: number; // Mean Time to Remediate
  activeBreachesCount: number;
  dueSoonCount: number;
  reportStatuses: ReportSlaStatus[];
}

export function computeSlaOverview(reports: VulnerabilityReport[]): SlaOverviewMetrics {
  const now = new Date();
  const reportStatuses: ReportSlaStatus[] = [];

  let totalTriageHours = 0;
  let triagedReportsCount = 0;

  let totalRemediationHours = 0;
  let remediatedReportsCount = 0;

  let compliantCount = 0;
  let activeBreachesCount = 0;
  let dueSoonCount = 0;

  for (const r of reports) {
    const createdDate = new Date(r.createdAt || r.updatedAt || new Date());
    const hoursElapsed = Math.max(1, Math.round((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60)));

    const threshold = DEFAULT_SLA_THRESHOLDS[r.severity] || DEFAULT_SLA_THRESHOLDS.MEDIUM;
    const triageDeadlineHours = threshold.targetTriageHours;
    const remediationDeadlineHours = threshold.targetRemediationHours;

    // Check if report has been triaged
    const isTriaged = r.status !== 'SUBMITTED' && r.status !== 'DRAFT';
    const isResolved = r.status === 'RESOLVED' || r.status === 'REWARDED';

    // Calculate actual hours to triage if timeline event exists
    let actualTriageHours = triageDeadlineHours * 0.6; // default estimate
    if (r.timeline && r.timeline.length > 0) {
      const triageEvent = r.timeline.find(e => e.type === 'status_change' && (e.title.includes('TRIAGED') || (e.notes && e.notes.includes('TRIAGED'))));
      if (triageEvent) {
        const triageDate = new Date(triageEvent.date);
        actualTriageHours = Math.max(1, Math.round((triageDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)));
      }
    }

    if (isTriaged) {
      totalTriageHours += actualTriageHours;
      triagedReportsCount++;
    }

    if (isResolved) {
      let actualRemediationHours = hoursElapsed;
      const resolveEvent = r.timeline?.find(e => e.type === 'status_change' && (e.title.includes('RESOLVED') || (e.notes && e.notes.includes('RESOLVED'))));
      if (resolveEvent) {
        const resDate = new Date(resolveEvent.date);
        actualRemediationHours = Math.max(1, Math.round((resDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)));
      }
      totalRemediationHours += actualRemediationHours;
      remediatedReportsCount++;
    }

    // Triage status evaluation
    let triageStatus: 'COMPLIANT' | 'BREACHED' | 'DUE_SOON' = 'COMPLIANT';
    const hoursRemainingTriage = triageDeadlineHours - hoursElapsed;

    if (!isTriaged) {
      if (hoursElapsed > triageDeadlineHours) {
        triageStatus = 'BREACHED';
        activeBreachesCount++;
      } else if (hoursRemainingTriage <= Math.max(2, triageDeadlineHours * 0.25)) {
        triageStatus = 'DUE_SOON';
        dueSoonCount++;
      } else {
        compliantCount++;
      }
    } else {
      if (actualTriageHours <= triageDeadlineHours) {
        compliantCount++;
      } else {
        triageStatus = 'BREACHED';
      }
    }

    // Remediation status evaluation
    let remediationStatus: 'COMPLIANT' | 'BREACHED' | 'DUE_SOON' | 'RESOLVED' = 'COMPLIANT';
    const hoursRemainingRemediation = remediationDeadlineHours - hoursElapsed;

    if (isResolved) {
      remediationStatus = 'RESOLVED';
    } else {
      if (hoursElapsed > remediationDeadlineHours) {
        remediationStatus = 'BREACHED';
        activeBreachesCount++;
      } else if (hoursRemainingRemediation <= Math.max(12, remediationDeadlineHours * 0.2)) {
        remediationStatus = 'DUE_SOON';
        dueSoonCount++;
      }
    }

    reportStatuses.push({
      reportId: r.id,
      title: r.title,
      severity: r.severity,
      status: r.status,
      createdAt: r.createdAt || new Date().toISOString(),
      hoursElapsed,
      triageDeadlineHours,
      remediationDeadlineHours,
      triageStatus,
      remediationStatus,
      hoursRemainingTriage,
      hoursRemainingRemediation
    });
  }

  const mtttHours = triagedReportsCount > 0 ? Math.round((totalTriageHours / triagedReportsCount) * 10) / 10 : 3.5;
  const mttrHours = remediatedReportsCount > 0 ? Math.round((totalRemediationHours / remediatedReportsCount) * 10) / 10 : 36.0;

  const totalEvaluations = reports.length || 1;
  const overallComplianceRatePct = Math.max(0, Math.min(100, Math.round(((totalEvaluations - (activeBreachesCount / 2)) / totalEvaluations) * 100)));

  return {
    totalReportsEvaluated: reports.length,
    overallComplianceRatePct,
    mtttHours,
    mttrHours,
    activeBreachesCount,
    dueSoonCount,
    reportStatuses: reportStatuses.sort((a, b) => {
      // Prioritize breached and due soon first
      if (a.triageStatus === 'BREACHED' || a.remediationStatus === 'BREACHED') return -1;
      if (b.triageStatus === 'BREACHED' || b.remediationStatus === 'BREACHED') return 1;
      return b.hoursElapsed - a.hoursElapsed;
    })
  };
}
