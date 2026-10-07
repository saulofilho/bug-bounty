import { VulnerabilityReport, Severity } from '../types';
import { calculateFairRisk, inferFairConfigFromReport } from './fairRiskEngine';

export const FAIR_TOLERANCE_STORAGE_KEY = 'bbm_fair_risk_tolerance_thresholds';
export const FAIR_TOLERANCE_EVENT = 'fair-risk-tolerance-updated';

export type FairTolerancePreset = 'conservative' | 'balanced' | 'high_tolerance' | 'custom';
export type FairScopeFilter = 'all' | 'open_only';

export interface TargetThresholdOverride {
  targetName: string;
  warningThresholdUSD?: number;
  criticalThresholdUSD?: number;
}

export interface FairRiskToleranceConfig {
  warningThresholdUSD: number;    // Default: $100,000,000 (US$ 100M)
  criticalThresholdUSD: number;   // Default: $250,000,000 (US$ 250M)
  scopeFilter: FairScopeFilter;   // 'open_only' | 'all'
  preset: FairTolerancePreset;
  alertsEnabled: boolean;
  targetOverrides: Record<string, TargetThresholdOverride>;
  updatedAt: string;
}

export const FAIR_TOLERANCE_PRESETS: Record<Exclude<FairTolerancePreset, 'custom'>, {
  name: string;
  label: string;
  description: string;
  warningUSD: number;
  criticalUSD: number;
}> = {
  conservative: {
    name: 'Conservador (Alta Rigidez)',
    label: 'FinTech, Saúde & Infraestrutura Crítica',
    description: 'Tolerância mínima a perdas financeiras. Alerta a partir de US$ 50M e limite crítico em US$ 120M.',
    warningUSD: 50000000,
    criticalUSD: 120000000
  },
  balanced: {
    name: 'Equilibrado (Padrão Corporativo)',
    label: 'Enterprise, SaaS & E-commerce Global',
    description: 'Balanço entre mitigação de risco e esteira de desenvolvimento. Alerta em US$ 100M e crítico em US$ 250M.',
    warningUSD: 100000000,
    criticalUSD: 250000000
  },
  high_tolerance: {
    name: 'Alta Tolerância (Grandes Grupos)',
    label: 'Big Tech, Startups em Hipercrescimento & Conglomerados',
    description: 'Capacidade ampliada de absorção de risco operacional. Alerta em US$ 200M e crítico em US$ 500M.',
    warningUSD: 200000000,
    criticalUSD: 500000000
  }
};

export const DEFAULT_FAIR_TOLERANCE_CONFIG: FairRiskToleranceConfig = {
  warningThresholdUSD: 100000000, // US$ 100M
  criticalThresholdUSD: 250000000, // US$ 250M
  scopeFilter: 'all',
  preset: 'balanced',
  alertsEnabled: true,
  targetOverrides: {},
  updatedAt: new Date().toISOString()
};

/**
 * Loads the current FAIR risk tolerance configuration from localStorage.
 */
export function getFairToleranceConfig(): FairRiskToleranceConfig {
  try {
    const raw = localStorage.getItem(FAIR_TOLERANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FAIR_TOLERANCE_CONFIG,
        ...parsed,
        targetOverrides: parsed.targetOverrides || {}
      };
    }
  } catch (err) {
    console.error('Error reading FAIR tolerance config from localStorage:', err);
  }
  return DEFAULT_FAIR_TOLERANCE_CONFIG;
}

/**
 * Saves the FAIR risk tolerance configuration to localStorage and notifies listeners.
 */
export function saveFairToleranceConfig(config: FairRiskToleranceConfig): void {
  try {
    const toSave: FairRiskToleranceConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(FAIR_TOLERANCE_STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent(FAIR_TOLERANCE_EVENT, { detail: toSave }));
  } catch (err) {
    console.error('Error saving FAIR tolerance config to localStorage:', err);
  }
}

export type TargetBreachSeverity = 'CRITICAL_BREACH' | 'WARNING_BREACH' | 'WITHIN_TOLERANCE';

export interface TargetRiskSummary {
  target: string;
  reportCount: number;
  openReportCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  accumulatedAleUSD: number;
  accumulatedSleUSD: number;
  residualAleUSD: number;
  costAvoidedUSD: number;
  maxSingleAleUSD: number;
  effectiveWarningUSD: number;
  effectiveCriticalUSD: number;
  breachStatus: TargetBreachSeverity;
  thresholdExceededPercent: number; // e.g. +45% over critical or warning
  ratioOfCriticalThreshold: number; // 0 to 1+
  reports: VulnerabilityReport[];
}

/**
 * Computes accumulated FAIR risk (ALE/SLE) per target and identifies breaches against configured thresholds.
 */
export function calculateTargetAccumulatedRisks(
  reports: VulnerabilityReport[],
  config: FairRiskToleranceConfig = getFairToleranceConfig()
): TargetRiskSummary[] {
  if (!reports || reports.length === 0) return [];

  // Group reports by target domain/name
  const targetMap = new Map<string, VulnerabilityReport[]>();

  reports.forEach(report => {
    const target = (report.target || 'Desconhecido').trim();
    if (!targetMap.has(target)) {
      targetMap.set(target, []);
    }
    targetMap.get(target)!.push(report);
  });

  const summaries: TargetRiskSummary[] = [];

  targetMap.forEach((targetReports, target) => {
    // Determine effective thresholds (accounting for target-specific overrides)
    const override = config.targetOverrides?.[target];
    const effectiveWarningUSD = override?.warningThresholdUSD ?? config.warningThresholdUSD;
    const effectiveCriticalUSD = override?.criticalThresholdUSD ?? config.criticalThresholdUSD;

    // Filter reports based on scopeFilter
    const filteredReports = config.scopeFilter === 'open_only'
      ? targetReports.filter(r => r.status !== 'RESOLVED' && r.status !== 'DUPLICATE' && r.status !== 'OUT_OF_SCOPE')
      : targetReports;

    let accumulatedAleUSD = 0;
    let accumulatedSleUSD = 0;
    let residualAleUSD = 0;
    let costAvoidedUSD = 0;
    let maxSingleAleUSD = 0;

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let openReportCount = 0;

    targetReports.forEach(report => {
      if (report.severity === 'CRITICAL') criticalCount++;
      else if (report.severity === 'HIGH') highCount++;
      else if (report.severity === 'MEDIUM') mediumCount++;
      else lowCount++;

      if (report.status !== 'RESOLVED' && report.status !== 'DUPLICATE' && report.status !== 'OUT_OF_SCOPE') {
        openReportCount++;
      }
    });

    // Calculate FAIR risk across filtered reports
    filteredReports.forEach(report => {
      try {
        const fairRes = calculateFairRisk(report, inferFairConfigFromReport(report));
        accumulatedAleUSD += fairRes.ale;
        accumulatedSleUSD += fairRes.sle;
        residualAleUSD += fairRes.residualAle;
        costAvoidedUSD += fairRes.costAvoidedAnnual;
        if (fairRes.ale > maxSingleAleUSD) {
          maxSingleAleUSD = fairRes.ale;
        }
      } catch (err) {
        console.warn(`Error computing FAIR risk for report ${report.id}:`, err);
      }
    });

    // Evaluate breach status
    let breachStatus: TargetBreachSeverity = 'WITHIN_TOLERANCE';
    let thresholdExceededPercent = 0;

    if (accumulatedAleUSD >= effectiveCriticalUSD) {
      breachStatus = 'CRITICAL_BREACH';
      thresholdExceededPercent = Math.round(((accumulatedAleUSD - effectiveCriticalUSD) / effectiveCriticalUSD) * 100);
    } else if (accumulatedAleUSD >= effectiveWarningUSD) {
      breachStatus = 'WARNING_BREACH';
      thresholdExceededPercent = Math.round(((accumulatedAleUSD - effectiveWarningUSD) / effectiveWarningUSD) * 100);
    }

    const ratioOfCriticalThreshold = effectiveCriticalUSD > 0
      ? accumulatedAleUSD / effectiveCriticalUSD
      : 0;

    summaries.push({
      target,
      reportCount: targetReports.length,
      openReportCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      accumulatedAleUSD,
      accumulatedSleUSD,
      residualAleUSD,
      costAvoidedUSD,
      maxSingleAleUSD,
      effectiveWarningUSD,
      effectiveCriticalUSD,
      breachStatus,
      thresholdExceededPercent,
      ratioOfCriticalThreshold,
      reports: targetReports
    });
  });

  // Sort by accumulated ALE descending
  return summaries.sort((a, b) => b.accumulatedAleUSD - a.accumulatedAleUSD);
}

/**
 * Filter breached targets categorized by severity.
 */
export function getBreachedTargets(targetSummaries: TargetRiskSummary[]) {
  const criticalBreaches = targetSummaries.filter(s => s.breachStatus === 'CRITICAL_BREACH');
  const warningBreaches = targetSummaries.filter(s => s.breachStatus === 'WARNING_BREACH');
  const allBreaches = [...criticalBreaches, ...warningBreaches];

  return {
    criticalBreaches,
    warningBreaches,
    allBreaches,
    totalBreachesCount: allBreaches.length,
    hasCriticalBreaches: criticalBreaches.length > 0,
    hasWarningBreaches: warningBreaches.length > 0
  };
}
