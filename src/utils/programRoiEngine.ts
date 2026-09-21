// Program ROI & Security Coverage Engine
// Calculates Return on Investment (ROI) and Yield for bug bounty programs
// based on historical bounty payouts vs. security coverage breadth and competition friction.

import { VulnerabilityReport, PlatformName, Severity } from '../types';

export type ScopeBreadth = 'WILDCARD' | 'MULTI_DOMAIN' | 'SINGLE_WEB' | 'MOBILE_APP' | 'SMART_CONTRACT' | 'SOURCE_CODE';
export type CompetitionDensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type TriageSpeed = 'FAST' | 'MODERATE' | 'SLOW' | 'VERY_SLOW';

export interface ProgramBenchmark {
  id: string;
  name: string;
  platform: PlatformName | 'Google VRP' | 'Immunefi' | 'YesWeHack' | 'Custom';
  scopeBreadth: ScopeBreadth;
  scopeDescription: string;
  avgCriticalPayout: number;
  avgHighPayout: number;
  avgMediumPayout: number;
  totalBountiesPaidUSD: number;
  medianResolutionDays: number;
  acceptanceRatePct: number;
  duplicateRatePct: number;
  competitionDensity: CompetitionDensity;
  triageSpeed: TriageSpeed;
  isManaged: boolean;
  minBounty: number;
  maxBounty: number;
}

export interface ProgramRoiResult {
  program: ProgramBenchmark;
  roiScore: number; // 0 - 100 scale
  expectedHourlyYieldUSD: number; // $/hour expected
  expectedReturn10hUSD: number; // expected return for 10 hours of focused testing
  timeToPayoutDays: number;
  opportunityTier: 'TIER_S' | 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';
  tierLabel: string;
  tierColor: { bg: string; text: string; border: string };
  pros: string[];
  cons: string[];
  recommendation: string;
}

export const BENCHMARK_PROGRAMS: ProgramBenchmark[] = [
  {
    id: 'prog-h1-fintech',
    name: 'Global Fintech & Banking Gateway',
    platform: 'HackerOne',
    scopeBreadth: 'MULTI_DOMAIN',
    scopeDescription: '*.fintech-corp.com (APIs, Webhooks, Portal)',
    avgCriticalPayout: 7500,
    avgHighPayout: 3200,
    avgMediumPayout: 1200,
    totalBountiesPaidUSD: 1450000,
    medianResolutionDays: 6,
    acceptanceRatePct: 92,
    duplicateRatePct: 12,
    competitionDensity: 'MEDIUM',
    triageSpeed: 'FAST',
    isManaged: true,
    minBounty: 300,
    maxBounty: 25000
  },
  {
    id: 'prog-immunefi-defi',
    name: 'EVM Liquidity & Lending Protocol',
    platform: 'Immunefi',
    scopeBreadth: 'SMART_CONTRACT',
    scopeDescription: 'Smart Contracts (Solidity, Foundry, Timelocks)',
    avgCriticalPayout: 50000,
    avgHighPayout: 15000,
    avgMediumPayout: 4000,
    totalBountiesPaidUSD: 3800000,
    medianResolutionDays: 4,
    acceptanceRatePct: 88,
    duplicateRatePct: 8,
    competitionDensity: 'LOW',
    triageSpeed: 'FAST',
    isManaged: false,
    minBounty: 1000,
    maxBounty: 250000
  },
  {
    id: 'prog-google-vrp',
    name: 'Google VRP (Core & Cloud Ecosystem)',
    platform: 'Google VRP',
    scopeBreadth: 'WILDCARD',
    scopeDescription: '*.google.com, *.youtube.com, GCP Services',
    avgCriticalPayout: 13337,
    avgHighPayout: 5000,
    avgMediumPayout: 1337,
    totalBountiesPaidUSD: 12000000,
    medianResolutionDays: 14,
    acceptanceRatePct: 85,
    duplicateRatePct: 28,
    competitionDensity: 'HIGH',
    triageSpeed: 'MODERATE',
    isManaged: true,
    minBounty: 500,
    maxBounty: 31337
  },
  {
    id: 'prog-bugcrowd-saas',
    name: 'Cloud Workspace & Enterprise SaaS',
    platform: 'Bugcrowd',
    scopeBreadth: 'WILDCARD',
    scopeDescription: '*.cloudworkspace.io, iOS & Android Apps',
    avgCriticalPayout: 4000,
    avgHighPayout: 1800,
    avgMediumPayout: 700,
    totalBountiesPaidUSD: 850000,
    medianResolutionDays: 5,
    acceptanceRatePct: 89,
    duplicateRatePct: 15,
    competitionDensity: 'MEDIUM',
    triageSpeed: 'FAST',
    isManaged: true,
    minBounty: 150,
    maxBounty: 10000
  },
  {
    id: 'prog-intigriti-retail',
    name: 'Pan-European Retail & Logistics',
    platform: 'Intigriti',
    scopeBreadth: 'MULTI_DOMAIN',
    scopeDescription: 'store-api.retail.eu, checkout, B2B Portal',
    avgCriticalPayout: 3500,
    avgHighPayout: 1500,
    avgMediumPayout: 600,
    totalBountiesPaidUSD: 420000,
    medianResolutionDays: 7,
    acceptanceRatePct: 84,
    duplicateRatePct: 18,
    competitionDensity: 'LOW',
    triageSpeed: 'FAST',
    isManaged: true,
    minBounty: 100,
    maxBounty: 8000
  },
  {
    id: 'prog-ywh-telecom',
    name: 'European Telecom & 5G Core Portal',
    platform: 'YesWeHack',
    scopeBreadth: 'MULTI_DOMAIN',
    scopeDescription: '*.telecom.fr, OSS/BSS customer endpoints',
    avgCriticalPayout: 4500,
    avgHighPayout: 2000,
    avgMediumPayout: 800,
    totalBountiesPaidUSD: 680000,
    medianResolutionDays: 8,
    acceptanceRatePct: 86,
    duplicateRatePct: 14,
    competitionDensity: 'LOW',
    triageSpeed: 'MODERATE',
    isManaged: true,
    minBounty: 200,
    maxBounty: 12000
  },
  {
    id: 'prog-legacy-corp',
    name: 'High-Saturation Legacy Portal',
    platform: 'HackerOne',
    scopeBreadth: 'SINGLE_WEB',
    scopeDescription: 'www.legacy-target.com (Restricted Subpaths)',
    avgCriticalPayout: 1500,
    avgHighPayout: 600,
    avgMediumPayout: 250,
    totalBountiesPaidUSD: 180000,
    medianResolutionDays: 32,
    acceptanceRatePct: 62,
    duplicateRatePct: 45,
    competitionDensity: 'EXTREME',
    triageSpeed: 'VERY_SLOW',
    isManaged: false,
    minBounty: 50,
    maxBounty: 2500
  }
];

// Calculate ROI and metrics for a specific program benchmark
export function calculateProgramRoi(prog: ProgramBenchmark): ProgramRoiResult {
  // 1. Payout factor (0 to 1)
  const weightedPayout = 
    prog.avgCriticalPayout * 0.45 + 
    prog.avgHighPayout * 0.35 + 
    prog.avgMediumPayout * 0.20;

  // Normalized against reference high benchmark ($10,000 reference)
  const payoutScore = Math.min(100, (weightedPayout / 12000) * 100);

  // 2. Scope breadth multiplier (Wildcard and Multi-domain offer higher attack surfaces)
  const scopeMultipliers: Record<ScopeBreadth, number> = {
    WILDCARD: 1.25,
    MULTI_DOMAIN: 1.15,
    SMART_CONTRACT: 1.30, // High yield niche
    SOURCE_CODE: 1.20,
    MOBILE_APP: 1.05,
    SINGLE_WEB: 0.85
  };
  const scopeMult = scopeMultipliers[prog.scopeBreadth] || 1.0;

  // 3. Friction penalties
  const compPenalties: Record<CompetitionDensity, number> = {
    LOW: 1.20,     // bonus for low hunter saturation
    MEDIUM: 1.0,
    HIGH: 0.80,
    EXTREME: 0.55  // heavy penalty for overcrowded programs
  };
  const compMult = compPenalties[prog.competitionDensity] || 1.0;

  const triagePenalties: Record<TriageSpeed, number> = {
    FAST: 1.15,
    MODERATE: 1.0,
    SLOW: 0.75,
    VERY_SLOW: 0.50
  };
  const triageMult = triagePenalties[prog.triageSpeed] || 1.0;

  // Duplicate penalty
  const duplicatePenalty = Math.max(0.4, 1 - (prog.duplicateRatePct / 100) * 1.1);

  // Acceptance rate bonus/penalty
  const acceptanceMult = prog.acceptanceRatePct / 100;

  // Raw combined ROI Score (0 - 100)
  const rawScore = payoutScore * scopeMult * compMult * triageMult * duplicatePenalty * acceptanceMult;
  const roiScore = Math.max(12, Math.min(99, Math.round(rawScore)));

  // Estimated expected hourly yield ($/h)
  // Assuming average testing cycle of 8-15 hours per validated finding
  const hoursPerFinding = prog.competitionDensity === 'EXTREME' ? 24 :
                          prog.competitionDensity === 'HIGH' ? 16 :
                          prog.competitionDensity === 'MEDIUM' ? 10 : 7;

  const expectedPayoutPerValidFinding = weightedPayout * acceptanceMult * (1 - prog.duplicateRatePct / 100);
  const expectedHourlyYieldUSD = Math.round(expectedPayoutPerValidFinding / hoursPerFinding);
  const expectedReturn10hUSD = Math.round(expectedHourlyYieldUSD * 10);

  // Tier determination
  let opportunityTier: ProgramRoiResult['opportunityTier'] = 'TIER_B';
  let tierLabel = 'Tier B: Retorno Moderado';
  let tierColor = { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };

  if (roiScore >= 80) {
    opportunityTier = 'TIER_S';
    tierLabel = 'Tier S: Altamente Lucrativo (Top Yield)';
    tierColor = { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' };
  } else if (roiScore >= 65) {
    opportunityTier = 'TIER_A';
    tierLabel = 'Tier A: Forte Oportunidade';
    tierColor = { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' };
  } else if (roiScore >= 45) {
    opportunityTier = 'TIER_B';
    tierLabel = 'Tier B: Equilibrado / Estável';
    tierColor = { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' };
  } else if (roiScore >= 30) {
    opportunityTier = 'TIER_C';
    tierLabel = 'Tier C: Alta Concorrência';
    tierColor = { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' };
  } else {
    opportunityTier = 'TIER_D';
    tierLabel = 'Tier D: Baixo Rendimento / Atrito';
    tierColor = { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' };
  }

  // Pros and Cons extraction
  const pros: string[] = [];
  const cons: string[] = [];

  if (prog.avgCriticalPayout >= 5000) pros.push(`Payouts Críticos atrativos ($${prog.avgCriticalPayout.toLocaleString()})`);
  if (prog.scopeBreadth === 'WILDCARD' || prog.scopeBreadth === 'MULTI_DOMAIN') pros.push('Ampla superfície de ataque (Escopo aberto/Multi-domínio)');
  if (prog.competitionDensity === 'LOW') pros.push('Baixa saturação de pesquisadores (Oportunidades inexploradas)');
  if (prog.triageSpeed === 'FAST') pros.push(`Triagem ágil (${prog.medianResolutionDays} dias em média)`);
  if (prog.acceptanceRatePct >= 90) pros.push(`Altíssima taxa de aceitação (${prog.acceptanceRatePct}%)`);

  if (prog.duplicateRatePct >= 25) cons.push(`Alto risco de duplicatas (${prog.duplicateRatePct}% de colisões)`);
  if (prog.competitionDensity === 'EXTREME' || prog.competitionDensity === 'HIGH') cons.push('Superpopulação de hunters (Superfície amplamente testada)');
  if (prog.triageSpeed === 'SLOW' || prog.triageSpeed === 'VERY_SLOW') cons.push(`Ciclo de resposta lento (${prog.medianResolutionDays} dias para payout)`);
  if (prog.scopeBreadth === 'SINGLE_WEB') cons.push('Escopo restrito a única aplicação web');
  if (prog.avgCriticalPayout < 2000) cons.push(`Teto de recompensas modesto (Máx padrão $${prog.avgCriticalPayout})`);

  let recommendation = '';
  if (opportunityTier === 'TIER_S') {
    recommendation = 'Altamente recomendado para sessões de hunting dedicadas. Excelente relação entre esforço e recompensa monetária com mínima taxa de atrito.';
  } else if (opportunityTier === 'TIER_A') {
    recommendation = 'Programa prioritário para a carteira de pesquisa. Boa velocidade de pagamento e recompensas consistentes para falhas de média e alta criticidade.';
  } else if (opportunityTier === 'TIER_B') {
    recommendation = 'Boa opção para hunting de manutenção ou busca por vulnerabilidades lógicas específicas de negócio.';
  } else if (opportunityTier === 'TIER_C') {
    recommendation = 'Aconselha-se testar apenas novas funcionalidades ou releases recém-lançadas para evitar duplicatas.';
  } else {
    recommendation = 'Desfavorável para hunting extensivo. O risco de duplicatas e o retorno por hora tornam outras plataformas mais vantajosas.';
  }

  return {
    program: prog,
    roiScore,
    expectedHourlyYieldUSD,
    expectedReturn10hUSD,
    timeToPayoutDays: prog.medianResolutionDays,
    opportunityTier,
    tierLabel,
    tierColor,
    pros,
    cons,
    recommendation
  };
}

// Extract real program metrics from researcher's personal reports
export function computeUserTargetRoiBenchmarks(reports: VulnerabilityReport[]): ProgramBenchmark[] {
  const targetMap: Record<string, {
    target: string;
    platform: PlatformName;
    reports: VulnerabilityReport[];
    totalPaid: number;
    paidCount: number;
    bounties: number[];
  }> = {};

  reports.forEach(r => {
    if (!r.target) return;
    if (!targetMap[r.target]) {
      targetMap[r.target] = {
        target: r.target,
        platform: r.platform,
        reports: [],
        totalPaid: 0,
        paidCount: 0,
        bounties: []
      };
    }
    targetMap[r.target].reports.push(r);
    if (r.bountyAmount && r.bountyAmount > 0) {
      targetMap[r.target].totalPaid += r.bountyAmount;
      targetMap[r.target].paidCount += 1;
      targetMap[r.target].bounties.push(r.bountyAmount);
    }
  });

  return Object.values(targetMap).map((item, idx) => {
    const avgBounty = item.paidCount > 0 ? item.totalPaid / item.paidCount : 500;
    const critReports = item.reports.filter(r => r.severity === 'CRITICAL' && r.bountyAmount);
    const avgCrit = critReports.length > 0 
      ? critReports.reduce((s, r) => s + (r.bountyAmount || 0), 0) / critReports.length 
      : avgBounty * 2.2;

    const highReports = item.reports.filter(r => r.severity === 'HIGH' && r.bountyAmount);
    const avgHigh = highReports.length > 0
      ? highReports.reduce((s, r) => s + (r.bountyAmount || 0), 0) / highReports.length
      : avgBounty * 1.3;

    return {
      id: `user-target-${idx}`,
      name: `Alvo Real: ${item.target}`,
      platform: item.platform,
      scopeBreadth: item.target.startsWith('*') ? 'WILDCARD' : 'MULTI_DOMAIN',
      scopeDescription: `Domínio de Produção: ${item.target} (${item.reports.length} relatórios enviados)`,
      avgCriticalPayout: Math.round(avgCrit),
      avgHighPayout: Math.round(avgHigh),
      avgMediumPayout: Math.round(avgBounty * 0.6),
      totalBountiesPaidUSD: item.totalPaid,
      medianResolutionDays: 7,
      acceptanceRatePct: Math.round((item.paidCount / Math.max(1, item.reports.length)) * 100),
      duplicateRatePct: 10,
      competitionDensity: 'MEDIUM',
      triageSpeed: 'FAST',
      isManaged: true,
      minBounty: item.bounties.length > 0 ? Math.min(...item.bounties) : 100,
      maxBounty: item.bounties.length > 0 ? Math.max(...item.bounties) : 5000
    };
  });
}
