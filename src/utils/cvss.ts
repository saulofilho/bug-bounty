import { Severity } from '../types';

export interface CvssMetrics {
  av: 'N' | 'A' | 'L' | 'P'; // Attack Vector
  ac: 'L' | 'H'; // Attack Complexity
  pr: 'N' | 'L' | 'H'; // Privileges Required
  ui: 'N' | 'R'; // User Interaction
  s: 'U' | 'C'; // Scope
  c: 'N' | 'L' | 'H'; // Confidentiality
  i: 'N' | 'L' | 'H'; // Integrity
  a: 'N' | 'L' | 'H'; // Availability
}

export const DEFAULT_CVSS: CvssMetrics = {
  av: 'N',
  ac: 'L',
  pr: 'N',
  ui: 'N',
  s: 'U',
  c: 'H',
  i: 'N',
  a: 'N'
};

export function calculateCvssScore(metrics: CvssMetrics): { 
  score: number; 
  vector: string; 
  severity: Severity;
  impactScore: number;
  exploitabilityScore: number;
} {
  // Weights defined by FIRST CVSS v3.1 specification
  const weightAV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[metrics.av];
  const weightAC = { L: 0.77, H: 0.44 }[metrics.ac];

  // PR depends on Scope
  let weightPR = 0.85;
  if (metrics.s === 'U') {
    weightPR = { N: 0.85, L: 0.62, H: 0.27 }[metrics.pr];
  } else {
    weightPR = { N: 0.85, L: 0.68, H: 0.50 }[metrics.pr];
  }

  const weightUI = { N: 0.85, R: 0.62 }[metrics.ui];
  const weightC = { N: 0, L: 0.22, H: 0.56 }[metrics.c];
  const weightI = { N: 0, L: 0.22, H: 0.56 }[metrics.i];
  const weightA = { N: 0, L: 0.22, H: 0.56 }[metrics.a];

  // ISS (Impact Sub-Score)
  const iss = 1 - (1 - weightC) * (1 - weightI) * (1 - weightA);

  let impact = 0;
  if (metrics.s === 'U') {
    impact = 6.42 * iss;
  } else {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  }

  const exploitability = 8.22 * weightAV * weightAC * weightPR * weightUI;

  let baseScore = 0;
  if (impact <= 0) {
    baseScore = 0;
  } else if (metrics.s === 'U') {
    baseScore = Math.min(impact + exploitability, 10);
  } else {
    baseScore = Math.min(1.08 * (impact + exploitability), 10);
  }

  // Round up to 1 decimal place (CVSS standard roundup)
  const roundedScore = Math.ceil(baseScore * 10) / 10;
  const roundedImpact = Math.round(impact * 10) / 10;
  const roundedExploitability = Math.round(exploitability * 10) / 10;

  const vector = `CVSS:3.1/AV:${metrics.av}/AC:${metrics.ac}/PR:${metrics.pr}/UI:${metrics.ui}/S:${metrics.s}/C:${metrics.c}/I:${metrics.i}/A:${metrics.a}`;

  let severity: Severity = 'INFO';
  if (roundedScore >= 9.0) severity = 'CRITICAL';
  else if (roundedScore >= 7.0) severity = 'HIGH';
  else if (roundedScore >= 4.0) severity = 'MEDIUM';
  else if (roundedScore > 0.0) severity = 'LOW';

  return { 
    score: roundedScore, 
    vector, 
    severity,
    impactScore: roundedImpact,
    exploitabilityScore: roundedExploitability
  };
}

export function parseCvssVector(vectorStr: string): CvssMetrics {
  const defaults = { ...DEFAULT_CVSS };
  if (!vectorStr) return defaults;

  const parts = vectorStr.split('/');
  for (const part of parts) {
    const [key, val] = part.split(':');
    if (!key || !val) continue;
    switch (key.toUpperCase()) {
      case 'AV': if (['N', 'A', 'L', 'P'].includes(val)) defaults.av = val as any; break;
      case 'AC': if (['L', 'H'].includes(val)) defaults.ac = val as any; break;
      case 'PR': if (['N', 'L', 'H'].includes(val)) defaults.pr = val as any; break;
      case 'UI': if (['N', 'R'].includes(val)) defaults.ui = val as any; break;
      case 'S': if (['U', 'C'].includes(val)) defaults.s = val as any; break;
      case 'C': if (['N', 'L', 'H'].includes(val)) defaults.c = val as any; break;
      case 'I': if (['N', 'L', 'H'].includes(val)) defaults.i = val as any; break;
      case 'A': if (['N', 'L', 'H'].includes(val)) defaults.a = val as any; break;
    }
  }
  return defaults;
}
