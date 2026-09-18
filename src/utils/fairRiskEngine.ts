import { VulnerabilityReport, Severity } from '../types';

export type FairExposureLevel = 'public_internet' | 'partner_api' | 'internal_network';
export type FairDataSensitivity = 'financial' | 'health_phi' | 'pii' | 'intellectual_property' | 'low_sensitivity';
export type FairOperationalDependency = 'critical' | 'moderate' | 'low';
export type FairControlsStrength = 'none' | 'basic' | 'advanced_zerotrust';

export interface FairSimulationConfig {
  reportId: string;
  exposure: FairExposureLevel;
  annualRevenue: number; // in USD
  recordCount: number; // records at risk
  dataSensitivity: FairDataSensitivity;
  operationalDependency: FairOperationalDependency;
  controlsStrength: FairControlsStrength;
  customBountyOverride?: number;
}

export interface FairLossBreakdown {
  name: string;
  category: 'primary' | 'secondary';
  amountUSD: number;
  percent: number;
  description: string;
}

export interface FairRiskCalculationResult {
  // Threat & Probability Metrics
  tef: number; // Threat Event Frequency (attempts/yr)
  threatCapability: number; // Threat actor capability (1-10)
  vulnProbability: number; // Probability of exploit given an attempt (0-1)
  aro: number; // Annualized Rate of Occurrence (Loss Event Frequency) = TEF * vulnProbability

  // Single Loss Expectancy (SLE / Loss Magnitude)
  primaryLoss: {
    assetLoss: number;
    productivityDowntime: number;
    incidentResponse: number;
    totalPrimary: number;
  };
  secondaryLoss: {
    regulatoryFines: number;
    reputationChurn: number;
    legalAndNotification: number;
    totalSecondary: number;
  };
  sle: number; // SLE = totalPrimary + totalSecondary

  // Loss Components list for Charts
  lossComponents: FairLossBreakdown[];

  // Annual Loss Expectancy (ALE = ARO * SLE)
  ale: number; // Most Likely / Expected Annual Loss
  aleMin: number; // 10th percentile (Optimistic Scenario)
  aleMax: number; // 90th percentile (Worst-Case Catastrophic Scenario)

  // Mitigated / Residual Risk
  residualAle: number; // Post-fix ALE (~95% reduction)
  costAvoidedAnnual: number; // ale - residualAle

  // Bug Bounty Financial ROI
  bountyPaid: number;
  roiRatio: number; // % Return on Bounty Investment
  savingsMultiple: number; // How many dollars saved per dollar invested in bounty

  // FAIR Classification
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number; // 0 - 100
  riskLabel: string;
  riskDescription: string;

  // Executive Summary text
  executiveSummary: string;
}

/**
 * Infer intelligent baseline simulation parameters from a VulnerabilityReport.
 */
export function inferFairConfigFromReport(report: VulnerabilityReport): FairSimulationConfig {
  const text = `${report.title} ${report.summary || ''} ${report.businessImpact || ''} ${report.vulnerabilityType || ''}`.toLowerCase();
  const vector = report.cvssVector || '';

  // Infer Exposure from CVSS vector (AV:N = Network -> Public, AV:A = Adjacent, AV:L = Local)
  let exposure: FairExposureLevel = 'public_internet';
  if (vector.includes('AV:L') || vector.includes('AV:P')) {
    exposure = 'internal_network';
  } else if (vector.includes('AV:A') || text.includes('internal') || text.includes('intranet')) {
    exposure = 'partner_api';
  } else {
    exposure = 'public_internet';
  }

  // Infer Data Sensitivity from business impact & keywords
  let dataSensitivity: FairDataSensitivity = 'pii';
  if (text.includes('cartão') || text.includes('fatura') || text.includes('financial') || text.includes('pci') || text.includes('bancár')) {
    dataSensitivity = 'financial';
  } else if (text.includes('saúde') || text.includes('médic') || text.includes('phi') || text.includes('hipaa')) {
    dataSensitivity = 'health_phi';
  } else if (text.includes('código-fonte') || text.includes('propriedade') || text.includes('intellectual') || text.includes('segredo')) {
    dataSensitivity = 'intellectual_property';
  } else if (text.includes('lgpd') || text.includes('gdpr') || text.includes('cpf') || text.includes('email') || text.includes('usuario')) {
    dataSensitivity = 'pii';
  } else if (report.severity === 'LOW' || report.severity === 'INFO') {
    dataSensitivity = 'low_sensitivity';
  }

  // Infer Records count scale based on severity & context
  let recordCount = 10000;
  if (text.includes('milhões') || text.includes('mass') || report.cvssScore >= 9.0) {
    recordCount = 250000;
  } else if (report.cvssScore >= 7.5 || report.severity === 'HIGH') {
    recordCount = 50000;
  } else if (report.cvssScore >= 5.0) {
    recordCount = 5000;
  } else {
    recordCount = 500;
  }

  // Operational dependency based on availability CVSS (A:H vs A:L vs A:N) or DoS
  let operationalDependency: FairOperationalDependency = 'moderate';
  if (vector.includes('A:H') || text.includes('dos') || text.includes('denial') || text.includes('indisponibilidade') || text.includes('downtime')) {
    operationalDependency = 'critical';
  } else if (vector.includes('A:N') && !text.includes('downtime')) {
    operationalDependency = 'low';
  }

  return {
    reportId: report.id,
    exposure,
    annualRevenue: 50000000, // Standard baseline enterprise revenue ($50M USD)
    recordCount,
    dataSensitivity,
    operationalDependency,
    controlsStrength: 'basic',
    customBountyOverride: report.bountyAmount > 0 ? report.bountyAmount : undefined
  };
}

/**
 * Executes a Factor Analysis of Information Risk (FAIR) calculation
 * to compute Annual Loss Expectancy (ALE = ARO * SLE) and financial risk metrics.
 */
export function calculateFairRisk(
  report: VulnerabilityReport,
  config: FairSimulationConfig
): FairRiskCalculationResult {
  const cvss = Math.max(0.1, Math.min(10.0, report.cvssScore || 5.0));
  const vector = report.cvssVector || '';

  // 1. THREAT EVENT FREQUENCY (TEF) - How many threat actors attempt exploitation per year
  let baseTef = 12; // Base 12 attempts/yr
  if (config.exposure === 'public_internet') {
    baseTef = 36; // Constant automated scanning & bug hunters on internet
  } else if (config.exposure === 'partner_api') {
    baseTef = 10;
  } else {
    baseTef = 3; // Internal corporate network
  }

  // Attack Complexity (AC:L = high frequency, AC:H = lower frequency)
  if (vector.includes('AC:L')) baseTef *= 1.4;
  else if (vector.includes('AC:H')) baseTef *= 0.6;

  // Privileges Required (PR:N = anyone, PR:L = regular user, PR:H = admin)
  if (vector.includes('PR:N')) baseTef *= 1.5;
  else if (vector.includes('PR:H')) baseTef *= 0.4;

  // 2. VULNERABILITY EXPLOITABILITY PROBABILITY (P_VULN)
  // Likelihood that an attempt successfully breaches the control
  let vulnProb = (cvss / 10) * 0.85;

  // Controls Strength mitigation factor
  if (config.controlsStrength === 'advanced_zerotrust') {
    vulnProb *= 0.45; // WAF + Strict RBAC + EDR cuts exploitability by 55%
  } else if (config.controlsStrength === 'basic') {
    vulnProb *= 0.80; // Basic firewall & standard patching
  } else {
    vulnProb = Math.min(0.98, vulnProb * 1.25); // No defensive controls
  }

  // Ensure reasonable bounds for FAIR TEF & ARO
  vulnProb = Math.max(0.02, Math.min(0.98, vulnProb));
  const aro = Math.max(0.05, Number((baseTef * vulnProb).toFixed(2))); // Annualized Rate of Occurrence

  // 3. SINGLE LOSS EXPECTANCY (SLE) - LOSS MAGNITUDE PER BREACH EVENT

  // A. Primary Loss: Asset & Direct Financial Loss
  let costPerRecord = 180; // Ponemon average ~$180/record
  switch (config.dataSensitivity) {
    case 'health_phi':
      costPerRecord = 380; // HIPAA average
      break;
    case 'financial':
      costPerRecord = 265; // PCI / banking
      break;
    case 'intellectual_property':
      costPerRecord = 210;
      break;
    case 'pii':
      costPerRecord = 175;
      break;
    case 'low_sensitivity':
      costPerRecord = 45;
      break;
  }

  const assetLoss = Math.min(config.recordCount * costPerRecord * 0.15, config.annualRevenue * 0.08);

  // B. Primary Loss: Productivity & Downtime
  let downtimeHours = 4;
  if (config.operationalDependency === 'critical') downtimeHours = 36;
  else if (config.operationalDependency === 'moderate') downtimeHours = 12;
  else downtimeHours = 2;

  // Revenue per hour
  const revenuePerHour = config.annualRevenue / (365 * 24);
  const productivityDowntime = Math.round(downtimeHours * revenuePerHour * 0.65);

  // C. Primary Loss: Incident Response, Forensics & System Restoration
  let incidentResponse = 45000;
  if (cvss >= 9.0) incidentResponse = 160000;
  else if (cvss >= 7.0) incidentResponse = 85000;
  else if (cvss >= 4.0) incidentResponse = 35000;
  else incidentResponse = 12000;

  const totalPrimary = Math.round(assetLoss + productivityDowntime + incidentResponse);

  // D. Secondary Loss: Regulatory Penalties (LGPD / GDPR / PCI-DSS)
  let fineRate = 0.0;
  if (config.dataSensitivity === 'health_phi' || config.dataSensitivity === 'financial') {
    fineRate = cvss >= 8.5 ? 0.015 : 0.006; // up to 1.5% of annual revenue
  } else if (config.dataSensitivity === 'pii') {
    fineRate = cvss >= 8.0 ? 0.008 : 0.003;
  }
  const regulatoryFines = Math.round(config.annualRevenue * fineRate);

  // E. Secondary Loss: Customer Churn & Reputation
  let churnRate = 0.002;
  if (cvss >= 9.0) churnRate = 0.018; // 1.8% customer churn on critical breach
  else if (cvss >= 7.0) churnRate = 0.008;
  const reputationChurn = Math.round(config.annualRevenue * churnRate);

  // F. Secondary Loss: Legal Defense, PR, Customer Notifications
  const legalAndNotification = Math.round(
    Math.min(config.recordCount * 2.5 + 25000, config.annualRevenue * 0.02)
  );

  const totalSecondary = Math.round(regulatoryFines + reputationChurn + legalAndNotification);
  const sle = Math.round(totalPrimary + totalSecondary);

  // 4. ANNUAL LOSS EXPECTANCY (ALE) = ARO * SLE
  const rawAle = Math.round(aro * sle);
  const ale = Math.max(1000, rawAle);

  // Confidence Interval Bounds (Log-normal distribution dispersion in FAIR modeling)
  const aleMin = Math.round(ale * 0.35); // 10th percentile
  const aleMax = Math.round(ale * 2.65); // 90th percentile

  // Residual Risk post mitigation (assuming standard 95% efficacy of patch/closure)
  const residualAle = Math.round(ale * 0.05);
  const costAvoidedAnnual = ale - residualAle;

  // Bug Bounty Financial Efficiency & ROI
  const bountyPaid = config.customBountyOverride ?? (report.bountyAmount > 0 ? report.bountyAmount : 1500);
  const roiRatio = bountyPaid > 0 ? Math.round((costAvoidedAnnual / bountyPaid) * 100) : 0;
  const savingsMultiple = bountyPaid > 0 ? Math.round((costAvoidedAnnual / bountyPaid) * 10) / 10 : 0;

  // FAIR Risk Scoring & Classification (0 - 100)
  const aleRatioToRevenue = ale / config.annualRevenue;
  let riskScore = Math.min(100, Math.round((cvss * 6) + (aleRatioToRevenue * 400)));
  riskScore = Math.max(5, riskScore);

  let riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let riskLabel = 'Risco Moderado';
  let riskDescription = 'Perda anual esperada administrável dentro do orçamento de segurança da informação.';

  if (ale >= 500000 || riskScore >= 80 || cvss >= 9.0) {
    riskTier = 'CRITICAL';
    riskLabel = 'Risco Financeiro Catastrófico';
    riskDescription = 'Impacto financeiro severo com potencial de comprometer resultados anuais, gerar sanções regulatórias pesadas e dano à marca.';
  } else if (ale >= 150000 || riskScore >= 60 || cvss >= 7.0) {
    riskTier = 'HIGH';
    riskLabel = 'Risco Financeiro Elevado';
    riskDescription = 'Exposição de perda anual considerável, requerendo correção prioritária na esteira de desenvolvimento.';
  } else if (ale <= 30000 && cvss < 4.5) {
    riskTier = 'LOW';
    riskLabel = 'Risco Financeiro Baixo';
    riskDescription = 'Exposição residual de baixo impacto, sem necessidade de alocação de resposta emergencial.';
  }

  // Loss components structured for Recharts visualization
  const lossComponents: FairLossBreakdown[] = [
    {
      name: 'Vazamento / Ativos de Dados',
      category: 'primary',
      amountUSD: assetLoss,
      percent: Math.round((assetLoss / sle) * 100),
      description: 'Custo direto por registro violado, reemissão de chaves e substituição de dados.'
    },
    {
      name: 'Indisponibilidade / Produtividade',
      category: 'primary',
      amountUSD: productivityDowntime,
      percent: Math.round((productivityDowntime / sle) * 100),
      description: 'Perda de faturamento operacional durante tempo de contenção e restauração.'
    },
    {
      name: 'Resposta ao Incidente & Forense',
      category: 'primary',
      amountUSD: incidentResponse,
      percent: Math.round((incidentResponse / sle) * 100),
      description: 'Contratação de consultoria externa, triagem, engenharia de reversão e auditoria.'
    },
    {
      name: 'Multas Regulatórias (LGPD/GDPR)',
      category: 'secondary',
      amountUSD: regulatoryFines,
      percent: Math.round((regulatoryFines / sle) * 100),
      description: 'Penalidades pecuniárias impostas por órgãos de fiscalização e proteção de dados.'
    },
    {
      name: 'Evasão de Clientes & Reputação',
      category: 'secondary',
      amountUSD: reputationChurn,
      percent: Math.round((reputationChurn / sle) * 100),
      description: 'Cancelamentos contratuais (churn) e desvalorização da imagem de confiança da marca.'
    },
    {
      name: 'Jurídico & Notificações',
      category: 'secondary',
      amountUSD: legalAndNotification,
      percent: Math.round((legalAndNotification / sle) * 100),
      description: 'Assessoria jurídica contenciosa, emissão de avisos formais aos titulares e assessoria de imprensa.'
    }
  ];

  const executiveSummary = `Segundo a taxonomia quantitativa FAIR (Factor Analysis of Information Risk), a vulnerabilidade "${report.title}" (CVSS ${cvss.toFixed(1)}) apresenta uma Taxa Anual de Ocorrência (ARO) de ${aro} eventos/ano e Perda por Incidente (SLE) estimada em US$ ${(sle / 1000).toFixed(0)}k. Isso gera uma Perda Anual Esperada (ALE) de US$ ${(ale / 1000).toFixed(0)}k/ano no cenário base. Com a recompensa/correção de US$ ${bountyPaid.toLocaleString()}, a organização atinge um ROI de ${savingsMultiple}x em custo evitado.`;

  return {
    tef: Math.round(baseTef),
    threatCapability: Math.round(cvss),
    vulnProbability: Number(vulnProb.toFixed(3)),
    aro,
    primaryLoss: {
      assetLoss: Math.round(assetLoss),
      productivityDowntime,
      incidentResponse,
      totalPrimary
    },
    secondaryLoss: {
      regulatoryFines,
      reputationChurn,
      legalAndNotification,
      totalSecondary
    },
    sle,
    lossComponents,
    ale,
    aleMin,
    aleMax,
    residualAle,
    costAvoidedAnnual,
    bountyPaid,
    roiRatio,
    savingsMultiple,
    riskTier,
    riskScore,
    riskLabel,
    riskDescription,
    executiveSummary
  };
}
