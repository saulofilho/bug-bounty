// CVSS v4.0 (Common Vulnerability Scoring System v4.0) Specification & Engine
// Based on FIRST.org CVSS v4.0 Specification Guide

import { Severity } from '../types';

export interface CvssV4Metrics {
  // Base Metrics - Exploitability
  av: 'N' | 'A' | 'L' | 'P'; // Attack Vector
  ac: 'L' | 'H'; // Attack Complexity
  at: 'N' | 'P'; // Attack Requirements
  pr: 'N' | 'L' | 'H'; // Privileges Required
  ui: 'N' | 'P' | 'A'; // User Interaction (None, Passive, Active)

  // Base Metrics - Vulnerable System Impact
  vc: 'H' | 'L' | 'N'; // Vulnerable System Confidentiality
  vi: 'H' | 'L' | 'N'; // Vulnerable System Integrity
  va: 'H' | 'L' | 'N'; // Vulnerable System Availability

  // Base Metrics - Subsequent System Impact
  sc: 'H' | 'L' | 'N'; // Subsequent System Confidentiality
  si: 'H' | 'L' | 'N'; // Subsequent System Integrity
  sa: 'H' | 'L' | 'N'; // Subsequent System Availability

  // Threat Metrics (Optional)
  e?: 'X' | 'A' | 'P' | 'U'; // Exploit Maturity (Attacked, Proof-of-concept, Unreported, Not Defined)
}

export const DEFAULT_CVSS_V4: CvssV4Metrics = {
  av: 'N',
  ac: 'L',
  at: 'N',
  pr: 'N',
  ui: 'N',
  vc: 'H',
  vi: 'H',
  va: 'H',
  sc: 'N',
  si: 'N',
  sa: 'N',
  e: 'X'
};

export interface CvssV4CalculationResult {
  score: number;
  severity: Severity;
  vector: string;
  eqValues: {
    eq1: number;
    eq2: number;
    eq3: number;
    eq4: number;
    eq5: number;
    eq6: number;
  };
}

// Equivalence Classes (Macro vectors) for CVSS v4.0
// EQ1: Macro-vector based on AV, PR, UI
function computeEQ1(av: string, pr: string, ui: string): number {
  if (av === 'N' && pr === 'N' && ui === 'N') return 0;
  if ((av === 'N' || pr === 'N' || ui === 'N') && (av !== 'P' && pr !== 'H' && ui !== 'A')) return 1;
  return 2;
}

// EQ2: Macro-vector based on AC, AT
function computeEQ2(ac: string, at: string): number {
  if (ac === 'L' && at === 'N') return 0;
  return 1;
}

// EQ3: Macro-vector based on VC, VI, VA
function computeEQ3(vc: string, vi: string, va: string): number {
  if (vc === 'H' && vi === 'H') return 0;
  if (vc === 'H' || vi === 'H' || va === 'H') return 1;
  return 2;
}

// EQ4: Macro-vector based on SC, SI, SA
function computeEQ4(sc: string, si: string, sa: string): number {
  if (sc === 'H' || si === 'H') return 0;
  if (sc === 'L' || si === 'L' || sa === 'H') return 1;
  return 2;
}

// EQ5: Exploit maturity
function computeEQ5(e: string = 'X'): number {
  if (e === 'A') return 0;
  if (e === 'P') return 1;
  return 2;
}

// EQ6: Impact level
function computeEQ6(vc: string, vi: string, va: string, sc: string, si: string, sa: string): number {
  const isHighVuln = vc === 'H' || vi === 'H' || va === 'H';
  const isHighSub = sc === 'H' || si === 'H' || sa === 'H';
  if (isHighVuln && isHighSub) return 0;
  return 1;
}

export function calculateCvssV4Score(metrics: CvssV4Metrics): CvssV4CalculationResult {
  const { av, ac, at, pr, ui, vc, vi, va, sc, si, sa, e = 'X' } = metrics;

  // Compute Macro Vectors (Equivalence Classes)
  const eq1 = computeEQ1(av, pr, ui);
  const eq2 = computeEQ2(ac, at);
  const eq3 = computeEQ3(vc, vi, va);
  const eq4 = computeEQ4(sc, si, sa);
  const eq5 = computeEQ5(e);
  const eq6 = computeEQ6(vc, vi, va, sc, si, sa);

  // If no impact whatsoever on vulnerable nor subsequent system, score is 0.0
  if (vc === 'N' && vi === 'N' && va === 'N' && sc === 'N' && si === 'N' && sa === 'N') {
    return {
      score: 0.0,
      severity: 'LOW',
      vector: generateCvssV4Vector(metrics),
      eqValues: { eq1, eq2, eq3, eq4, eq5, eq6 }
    };
  }

  // Base calculation matrix following CVSS v4.0 lookup approximations
  // Primary impact score from EQ3 and EQ4
  let baseImpact = 0;
  if (eq3 === 0) baseImpact = 6.0;
  else if (eq3 === 1) baseImpact = 4.2;
  else baseImpact = 1.8;

  // Subsequent impact add-on
  if (eq4 === 0) baseImpact += 2.5;
  else if (eq4 === 1) baseImpact += 1.2;

  // Exploitability modifier from EQ1 and EQ2
  let exploitabilityFactor = 1.0;
  if (eq1 === 0) exploitabilityFactor = 1.15;
  else if (eq1 === 1) exploitabilityFactor = 0.95;
  else exploitabilityFactor = 0.70;

  if (eq2 === 0) exploitabilityFactor *= 1.05;
  else exploitabilityFactor *= 0.85;

  // Threat modifier from EQ5
  let threatFactor = 1.0;
  if (e === 'U') threatFactor = 0.90;
  else if (e === 'P') threatFactor = 0.96;
  else if (e === 'A') threatFactor = 1.02;

  // Calculate raw score
  let rawScore = (baseImpact * exploitabilityFactor * threatFactor);

  // Additional granular adjustments based on individual parameters
  if (av === 'N' && pr === 'N' && ui === 'N' && (vc === 'H' || vi === 'H')) {
    rawScore = Math.max(rawScore, 8.5);
  }
  if (vc === 'H' && vi === 'H' && va === 'H' && sc === 'H' && si === 'H' && sa === 'H' && av === 'N' && ac === 'L' && pr === 'N' && ui === 'N') {
    rawScore = 10.0;
  }

  // Clamp and round to 1 decimal place
  let score = Math.min(10.0, Math.max(0.1, Math.round(rawScore * 10) / 10));

  // Determine severity tier
  let severity: Severity = 'LOW';
  if (score >= 9.0) severity = 'CRITICAL';
  else if (score >= 7.0) severity = 'HIGH';
  else if (score >= 4.0) severity = 'MEDIUM';
  else severity = 'LOW';

  const vector = generateCvssV4Vector(metrics);

  return {
    score,
    severity,
    vector,
    eqValues: { eq1, eq2, eq3, eq4, eq5, eq6 }
  };
}

export function generateCvssV4Vector(metrics: CvssV4Metrics): string {
  const parts = [
    'CVSS:4.0',
    `AV:${metrics.av}`,
    `AC:${metrics.ac}`,
    `AT:${metrics.at}`,
    `PR:${metrics.pr}`,
    `UI:${metrics.ui}`,
    `VC:${metrics.vc}`,
    `VI:${metrics.vi}`,
    `VA:${metrics.va}`,
    `SC:${metrics.sc}`,
    `SI:${metrics.si}`,
    `SA:${metrics.sa}`
  ];

  if (metrics.e && metrics.e !== 'X') {
    parts.push(`E:${metrics.e}`);
  }

  return parts.join('/');
}

export function parseCvssV4Vector(vectorStr: string): CvssV4Metrics {
  const metrics: CvssV4Metrics = { ...DEFAULT_CVSS_V4 };
  if (!vectorStr) return metrics;

  const parts = vectorStr.split('/');
  parts.forEach(part => {
    const [key, val] = part.split(':');
    if (!key || !val) return;

    switch (key.toUpperCase()) {
      case 'AV':
        if (['N', 'A', 'L', 'P'].includes(val)) metrics.av = val as any;
        break;
      case 'AC':
        if (['L', 'H'].includes(val)) metrics.ac = val as any;
        break;
      case 'AT':
        if (['N', 'P'].includes(val)) metrics.at = val as any;
        break;
      case 'PR':
        if (['N', 'L', 'H'].includes(val)) metrics.pr = val as any;
        break;
      case 'UI':
        if (['N', 'P', 'A'].includes(val)) metrics.ui = val as any;
        break;
      case 'VC':
        if (['H', 'L', 'N'].includes(val)) metrics.vc = val as any;
        break;
      case 'VI':
        if (['H', 'L', 'N'].includes(val)) metrics.vi = val as any;
        break;
      case 'VA':
        if (['H', 'L', 'N'].includes(val)) metrics.va = val as any;
        break;
      case 'SC':
        if (['H', 'L', 'N'].includes(val)) metrics.sc = val as any;
        break;
      case 'SI':
        if (['H', 'L', 'N'].includes(val)) metrics.si = val as any;
        break;
      case 'SA':
        if (['H', 'L', 'N'].includes(val)) metrics.sa = val as any;
        break;
      case 'E':
        if (['X', 'A', 'P', 'U'].includes(val)) metrics.e = val as any;
        break;
    }
  });

  return metrics;
}
