// Bounty Matrix & Program Budget Pool Simulator Engine
// Calculates tiered reward expectations and Cost-of-Breach ROI

import { VulnerabilityReport, Severity } from '../types';

export interface AssetTier {
  id: 'TIER_1' | 'TIER_2' | 'TIER_3';
  name: string;
  description: string;
  rewards: {
    CRITICAL: { min: number; max: number; standard: number };
    HIGH: { min: number; max: number; standard: number };
    MEDIUM: { min: number; max: number; standard: number };
    LOW: { min: number; max: number; standard: number };
  };
}

export const ASSET_TIERS: AssetTier[] = [
  {
    id: 'TIER_1',
    name: 'Tier 1: Core Systems & Critical APIs',
    description: 'Bancos de dados de produção, gateways de pagamento, autenticação central, chaves privadas.',
    rewards: {
      CRITICAL: { min: 3000, max: 10000, standard: 5000 },
      HIGH: { min: 1500, max: 3000, standard: 2000 },
      MEDIUM: { min: 500, max: 1500, standard: 800 },
      LOW: { min: 100, max: 500, standard: 250 }
    }
  },
  {
    id: 'TIER_2',
    name: 'Tier 2: Secondary Services & Internal Apps',
    description: 'Painéis corporativos internos, microsserviços de suporte, blogs integrados, webhooks.',
    rewards: {
      CRITICAL: { min: 1500, max: 4000, standard: 2500 },
      HIGH: { min: 750, max: 1500, standard: 1000 },
      MEDIUM: { min: 250, max: 750, standard: 400 },
      LOW: { min: 50, max: 250, standard: 150 }
    }
  },
  {
    id: 'TIER_3',
    name: 'Tier 3: Marketing & Static Assets',
    description: 'Landing pages promocionais, documentação pública, sites de eventos sem autenticação.',
    rewards: {
      CRITICAL: { min: 500, max: 1500, standard: 800 },
      HIGH: { min: 250, max: 500, standard: 350 },
      MEDIUM: { min: 100, max: 250, standard: 150 },
      LOW: { min: 50, max: 100, standard: 50 }
    }
  }
];

export interface BountyBudgetSimulation {
  totalBudgetPool: number;
  totalBountiesPaid: number;
  pendingApprovedBounties: number;
  remainingRunwayUSD: number;
  budgetUtilizationPct: number;
  estimatedCostOfBreachAvoidedUSD: number;
  programRoiRatio: number;
}

export function computeBountyBudgetSimulation(
  reports: VulnerabilityReport[],
  annualBudgetPool: number = 75000
): BountyBudgetSimulation {
  let totalBountiesPaid = 0;
  let pendingApprovedBounties = 0;

  let criticalAvertedCount = 0;
  let highAvertedCount = 0;
  let mediumAvertedCount = 0;

  for (const r of reports) {
    const bounty = r.bountyAmount || 0;
    if (r.status === 'RESOLVED' || r.status === 'REWARDED') {
      totalBountiesPaid += bounty;
    } else if (r.status === 'TRIAGED') {
      pendingApprovedBounties += bounty > 0 ? bounty : getSuggestedBounty(r.severity, 'TIER_1');
    }

    if (r.status === 'RESOLVED' || r.status === 'REWARDED' || r.status === 'TRIAGED') {
      if (r.severity === 'CRITICAL') criticalAvertedCount++;
      else if (r.severity === 'HIGH') highAvertedCount++;
      else if (r.severity === 'MEDIUM') mediumAvertedCount++;
    }
  }

  // Cost of breach estimates based on IBM Cost of a Data Breach Report:
  // Critical vulnerability exploit average incident cost avoided: ~$350,000
  // High vulnerability exploit incident cost avoided: ~$85,000
  // Medium vulnerability exploit incident cost avoided: ~$18,000
  const estimatedCostOfBreachAvoidedUSD = 
    (criticalAvertedCount * 350000) + 
    (highAvertedCount * 85000) + 
    (mediumAvertedCount * 18000);

  const totalCommitted = totalBountiesPaid + pendingApprovedBounties;
  const remainingRunwayUSD = Math.max(0, annualBudgetPool - totalCommitted);
  const budgetUtilizationPct = annualBudgetPool > 0 
    ? Math.min(100, Math.round((totalCommitted / annualBudgetPool) * 100))
    : 0;

  const totalProgramInvestment = totalBountiesPaid > 0 ? totalBountiesPaid : 1;
  const programRoiRatio = Math.round((estimatedCostOfBreachAvoidedUSD / totalProgramInvestment) * 10) / 10;

  return {
    totalBudgetPool: annualBudgetPool,
    totalBountiesPaid,
    pendingApprovedBounties,
    remainingRunwayUSD,
    budgetUtilizationPct,
    estimatedCostOfBreachAvoidedUSD,
    programRoiRatio
  };
}

export function getSuggestedBounty(severity: Severity, tierId: 'TIER_1' | 'TIER_2' | 'TIER_3' = 'TIER_1'): number {
  const tier = ASSET_TIERS.find(t => t.id === tierId) || ASSET_TIERS[0];
  return tier.rewards[severity]?.standard || 500;
}
