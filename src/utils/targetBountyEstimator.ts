import { VulnerabilityReport, TargetProgram, Severity } from '../types';

export interface TargetHistoricalReportItem {
  id: string;
  title: string;
  severity: Severity;
  bountyAmount: number;
  date?: string;
}

export interface TargetBountyEstimationResult {
  targetInput: string;
  matchedTargetProgram: TargetProgram | null;
  targetName: string;
  targetDomain: string;
  programFound: boolean;
  totalHistoricalReports: number;
  rewardedHistoricalCount: number;
  targetAverageBounty: number;
  targetMinBounty: number;
  targetMaxBounty: number;
  targetTotalRewarded: number;
  programBountyRangeStr: string;
  severity: Severity;
  potentialRange: {
    min: number;
    max: number;
    displayString: string;
  };
  suggestedBounty: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'MODERATE' | 'PROGRAM_BASELINE';
  calculationMethod: string;
  historicalSummaryText: string;
  historicalReports: TargetHistoricalReportItem[];
}

/**
 * Normalizes domain or URL to facilitate target matching
 */
export function normalizeDomain(val: string): string {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\*\./, '');
}

/**
 * Checks whether a report target matches a target program
 */
export function isTargetMatch(
  reportTarget: string,
  targetProgram: TargetProgram
): boolean {
  const normRep = normalizeDomain(reportTarget);
  const normProg = normalizeDomain(targetProgram.domain);
  const normName = targetProgram.name.toLowerCase().trim();

  if (normRep === normProg) return true;
  if (normRep.endsWith(`.${normProg}`)) return true;
  if (normProg.endsWith(`.${normRep}`)) return true;
  if (normRep.includes(normProg) || normProg.includes(normRep)) return true;
  if (reportTarget.toLowerCase().includes(normName)) return true;

  if (Array.isArray(targetProgram.inScope)) {
    for (const scopeItem of targetProgram.inScope) {
      const normScope = normalizeDomain(scopeItem);
      if (normRep === normScope || normRep.endsWith(`.${normScope}`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parses numeric min and max from a bountyRange string (e.g. "$200 - $10,000")
 */
export function parseProgramBountyRange(rangeStr?: string): { min: number; max: number } | null {
  if (!rangeStr) return null;
  const numbers = rangeStr.replace(/[^0-9\-]/g, '').split('-').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
  if (numbers.length >= 2) {
    return { min: numbers[0], max: numbers[1] };
  }
  if (numbers.length === 1) {
    return { min: numbers[0], max: numbers[0] * 5 };
  }
  return null;
}

/**
 * Calculates potential reward range and suggested estimated bounty
 * based on selected target's average bounty history and report severity.
 */
export function calculateTargetEstimatedBounty(
  targetInput: string,
  targets: TargetProgram[] = [],
  existingReports: VulnerabilityReport[] = [],
  severity: Severity = 'MEDIUM',
  _cvssScore?: number
): TargetBountyEstimationResult {
  const normTarget = normalizeDomain(targetInput);

  // 1. Identify matching TargetProgram
  let matchedTargetProgram: TargetProgram | null = null;
  for (const prog of targets) {
    if (isTargetMatch(targetInput, prog)) {
      matchedTargetProgram = prog;
      break;
    }
  }

  // 2. Identify all historical reports belonging to this target
  const matchedReports = existingReports.filter(rep => {
    if (!rep.target) return false;
    const repNorm = normalizeDomain(rep.target);

    // Direct domain equality or substring
    if (repNorm === normTarget || repNorm.includes(normTarget) || normTarget.includes(repNorm)) {
      return true;
    }

    // Match via target program if program identified
    if (matchedTargetProgram && isTargetMatch(rep.target, matchedTargetProgram)) {
      return true;
    }

    return false;
  });

  // Extract rewarded reports with positive bounty amounts
  const rewardedReports = matchedReports.filter(
    r => (r.bountyAmount && r.bountyAmount > 0) || r.status === 'REWARDED' || r.status === 'RESOLVED'
  );

  const historicalReportItems: TargetHistoricalReportItem[] = rewardedReports.map(r => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    bountyAmount: r.bountyAmount || 0,
    date: r.createdAt
  }));

  const rewardedHistoricalCount = rewardedReports.length;
  const totalHistoricalReports = matchedReports.length;

  // 3. Compute target historical bounty metrics
  let targetTotalRewarded = 0;
  let targetMinBounty = 0;
  let targetMaxBounty = 0;
  let targetAverageBounty = 0;

  if (rewardedHistoricalCount > 0) {
    const amounts = rewardedReports.map(r => r.bountyAmount || 0).filter(a => a > 0);
    if (amounts.length > 0) {
      targetTotalRewarded = amounts.reduce((acc, curr) => acc + curr, 0);
      targetMinBounty = Math.min(...amounts);
      targetMaxBounty = Math.max(...amounts);
      targetAverageBounty = Math.round(targetTotalRewarded / amounts.length);
    }
  } else if (matchedTargetProgram && matchedTargetProgram.totalRewarded > 0 && matchedTargetProgram.reportsCount > 0) {
    // Fallback to TargetProgram summary stats
    targetTotalRewarded = matchedTargetProgram.totalRewarded;
    targetAverageBounty = Math.round(matchedTargetProgram.totalRewarded / matchedTargetProgram.reportsCount);
    targetMinBounty = Math.round(targetAverageBounty * 0.4);
    targetMaxBounty = Math.round(targetAverageBounty * 2.2);
  }

  // 4. Severity specific historical reports
  const sameSeverityReports = rewardedReports.filter(r => r.severity === severity && (r.bountyAmount || 0) > 0);
  const sameSeverityAmounts = sameSeverityReports.map(r => r.bountyAmount || 0);

  let severitySpecificAvg: number | null = null;
  if (sameSeverityAmounts.length > 0) {
    severitySpecificAvg = Math.round(sameSeverityAmounts.reduce((a, b) => a + b, 0) / sameSeverityAmounts.length);
  }

  // 5. Severity distribution weighting relative to target average
  // Severity multipliers relative to overall target average
  const severityMultipliers: Record<Severity, { minMul: number; maxMul: number; targetMul: number; fallbackAvg: number }> = {
    CRITICAL: { minMul: 1.3, maxMul: 2.2, targetMul: 1.6, fallbackAvg: 3500 },
    HIGH: { minMul: 0.8, maxMul: 1.35, targetMul: 1.05, fallbackAvg: 1800 },
    MEDIUM: { minMul: 0.35, maxMul: 0.75, targetMul: 0.55, fallbackAvg: 700 },
    LOW: { minMul: 0.15, maxMul: 0.35, targetMul: 0.25, fallbackAvg: 250 },
    INFO: { minMul: 0.05, maxMul: 0.15, targetMul: 0.10, fallbackAvg: 100 }
  };

  const sevConfig = severityMultipliers[severity] || severityMultipliers.MEDIUM;

  // 6. Calculate potential reward range
  let minReward = 0;
  let maxReward = 0;
  let suggestedBounty = 0;
  let confidenceLevel: 'HIGH' | 'MEDIUM' | 'MODERATE' | 'PROGRAM_BASELINE' = 'MODERATE';
  let calculationMethod = '';

  const parsedProgramRange = parseProgramBountyRange(matchedTargetProgram?.bountyRange);

  if (severitySpecificAvg !== null && sameSeverityAmounts.length >= 2) {
    // Case A: High confidence from multiple reports of the exact same severity for this target
    confidenceLevel = 'HIGH';
    minReward = Math.min(...sameSeverityAmounts);
    maxReward = Math.max(...sameSeverityAmounts);
    // Expand bounds slightly if min equals max
    if (minReward === maxReward) {
      minReward = Math.round(minReward * 0.85);
      maxReward = Math.round(maxReward * 1.25);
    }
    suggestedBounty = severitySpecificAvg;
    calculationMethod = `Baseado em ${sameSeverityAmounts.length} relatórios ${severity} pagos neste alvo específico.`;
  } else if (targetAverageBounty > 0) {
    // Case B: Calibrated using target's overall average bounty history + severity weighting
    confidenceLevel = rewardedHistoricalCount >= 3 ? 'HIGH' : 'MEDIUM';

    if (severitySpecificAvg !== null && sameSeverityAmounts.length === 1) {
      // 1 report of this severity, blend with target average
      suggestedBounty = Math.round((severitySpecificAvg * 0.7) + ((targetAverageBounty * sevConfig.targetMul) * 0.3));
    } else {
      suggestedBounty = Math.round(targetAverageBounty * sevConfig.targetMul);
    }

    minReward = Math.max(50, Math.round(targetAverageBounty * sevConfig.minMul));
    maxReward = Math.max(minReward + 100, Math.round(targetAverageBounty * sevConfig.maxMul));

    // Align with program boundaries if available
    if (parsedProgramRange) {
      minReward = Math.max(parsedProgramRange.min, minReward);
      maxReward = Math.min(parsedProgramRange.max, maxReward);
      if (maxReward < minReward) maxReward = minReward + 250;
    }

    calculationMethod = `Calculado a partir da média histórica do alvo ($${targetAverageBounty.toLocaleString()}) ponderada para severidade ${severity}.`;
  } else if (parsedProgramRange) {
    // Case C: Target program has a declared bountyRange (e.g. $200 - $10,000)
    confidenceLevel = 'PROGRAM_BASELINE';
    const { min: pMin, max: pMax } = parsedProgramRange;
    const spread = pMax - pMin;

    if (severity === 'CRITICAL') {
      minReward = Math.round(pMin + spread * 0.6);
      maxReward = pMax;
      suggestedBounty = Math.round((minReward + maxReward) / 2);
    } else if (severity === 'HIGH') {
      minReward = Math.round(pMin + spread * 0.3);
      maxReward = Math.round(pMin + spread * 0.7);
      suggestedBounty = Math.round((minReward + maxReward) / 2);
    } else if (severity === 'MEDIUM') {
      minReward = Math.round(pMin + spread * 0.1);
      maxReward = Math.round(pMin + spread * 0.4);
      suggestedBounty = Math.round((minReward + maxReward) / 2);
    } else {
      minReward = pMin;
      maxReward = Math.round(pMin + spread * 0.2);
      suggestedBounty = Math.round((minReward + maxReward) / 2);
    }
    calculationMethod = `Projetado com base na tabela de escopo do programa (${matchedTargetProgram?.bountyRange}).`;
  } else {
    // Case D: Fallback to benchmark industry averages
    confidenceLevel = 'MODERATE';
    suggestedBounty = sevConfig.fallbackAvg;
    minReward = Math.round(suggestedBounty * 0.7);
    maxReward = Math.round(suggestedBounty * 1.5);
    calculationMethod = `Estimativa preliminar padrão da indústria para vulnerabilidades ${severity}.`;
  }

  // Round values cleanly
  minReward = Math.round(minReward / 25) * 25;
  maxReward = Math.round(maxReward / 25) * 25;
  suggestedBounty = Math.round(suggestedBounty / 25) * 25;

  if (suggestedBounty < minReward) suggestedBounty = minReward;
  if (suggestedBounty > maxReward) suggestedBounty = maxReward;

  const displayString = `$${minReward.toLocaleString()} - $${maxReward.toLocaleString()}`;

  // Build summary text
  let historicalSummaryText = '';
  if (rewardedHistoricalCount > 0) {
    historicalSummaryText = `${rewardedHistoricalCount} relatório(s) pago(s) no alvo com média de $${targetAverageBounty.toLocaleString()} (Mín: $${targetMinBounty.toLocaleString()} / Máx: $${targetMaxBounty.toLocaleString()})`;
  } else if (matchedTargetProgram) {
    historicalSummaryText = `Programa ${matchedTargetProgram.name}: faixa declarada de ${matchedTargetProgram.bountyRange || 'sob demanda'}`;
  } else {
    historicalSummaryText = `Alvo ${targetInput || 'não mapeado'}: sem histórico prévio registrado`;
  }

  return {
    targetInput,
    matchedTargetProgram,
    targetName: matchedTargetProgram?.name || targetInput || 'Alvo Desconhecido',
    targetDomain: matchedTargetProgram?.domain || normTarget,
    programFound: !!matchedTargetProgram,
    totalHistoricalReports,
    rewardedHistoricalCount,
    targetAverageBounty,
    targetMinBounty,
    targetMaxBounty,
    targetTotalRewarded,
    programBountyRangeStr: matchedTargetProgram?.bountyRange || '',
    severity,
    potentialRange: {
      min: minReward,
      max: maxReward,
      displayString
    },
    suggestedBounty,
    confidenceLevel,
    calculationMethod,
    historicalSummaryText,
    historicalReports: historicalReportItems
  };
}
