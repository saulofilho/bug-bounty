import { VulnerabilityReport, ReportStatus } from '../types';
import { parseCvssVector } from './cvss';

export interface ImpactDimensionResult {
  key: string;
  dimension: string;
  shortLabel: string;
  score: number; // 0 to 100 (weighted average)
  peakScore: number; // 0 to 100 (highest single finding)
  affectedReportsCount: number;
  criticalReportsCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  contributingReports: Array<{
    id: string;
    title: string;
    target: string;
    severity: string;
    scoreContribution: number;
    businessImpactSnippet: string;
  }>;
}

export interface BusinessImpactSummary {
  totalAnalyzedReports: number;
  openReportsCount: number;
  closedReportsCount: number;
  compositeScore: number; // 0 to 100
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  highestImpactDimension: string;
  totalFinancialExposureUSD: number;
  dimensions: ImpactDimensionResult[];
  openReports: VulnerabilityReport[];
}

export const OPEN_STATUSES: ReportStatus[] = ['DRAFT', 'SUBMITTED', 'TRIAGED'];

/**
 * Evaluates the business impact of a single vulnerability report across 6 strategic risk vectors
 */
function evaluateReportImpact(report: VulnerabilityReport) {
  const cvss = parseCvssVector(report.cvssVector || '');
  const biText = (report.businessImpact || '').toLowerCase();
  const summaryText = (report.summary || '').toLowerCase();
  const typeText = (report.vulnerabilityType || '').toLowerCase();
  const allText = `${biText} ${summaryText} ${typeText} ${(report.title || '').toLowerCase()}`;

  // 1. Confidentiality (Data Exposure & Privacy)
  let confidentiality = 0;
  if (cvss.c === 'H') confidentiality = 90;
  else if (cvss.c === 'L') confidentiality = 50;
  else confidentiality = 15;

  if (/vazamento|leak|expos|pii|token|credencia|senha|password|segredo|secret|database|banco de dados|dump/i.test(allText)) {
    confidentiality = Math.min(100, confidentiality + 15);
  }
  if (report.severity === 'CRITICAL' && cvss.c === 'H') confidentiality = 100;

  // 2. Integrity (State Tampering & Unauthorized Actions)
  let integrity = 0;
  if (cvss.i === 'H') integrity = 90;
  else if (cvss.i === 'L') integrity = 50;
  else integrity = 15;

  if (/tamper|altera|manipula|substitui|modifica|bypass|sobrescreve|overwrite|idor|privilege|elevação|injet|write/i.test(allText)) {
    integrity = Math.min(100, integrity + 15);
  }
  if (/mass assignment|admin|rce|remote code/i.test(allText)) {
    integrity = Math.min(100, integrity + 20);
  }

  // 3. Availability (Service Disruption & Downtime)
  let availability = 0;
  if (cvss.a === 'H') availability = 90;
  else if (cvss.a === 'L') availability = 50;
  else availability = 10;

  if (/dos|denial of service|queda|indisponibilidade|travamento|crash|loop|timeout|exaust|resource exhaustion|memória/i.test(allText)) {
    availability = Math.min(100, availability + 25);
  }

  // 4. Financial & Fraud Exposure
  let financial = 0;
  if (report.bountyAmount >= 5000) financial = 95;
  else if (report.bountyAmount >= 2500) financial = 80;
  else if (report.bountyAmount >= 1000) financial = 65;
  else if (report.bountyAmount > 0) financial = 45;
  else financial = report.severity === 'CRITICAL' ? 75 : report.severity === 'HIGH' ? 55 : 30;

  if (/transaç|payment|pagamento|saldo|checkout|cartão|fatura|invoice|fraude|transfer|financeir|banco|moeda/i.test(allText)) {
    financial = Math.min(100, financial + 20);
  }

  // 5. Exploitability & Remote Perimeter Risk
  let exploitability = 50;
  const avScore = cvss.av === 'N' ? 100 : cvss.av === 'A' ? 70 : cvss.av === 'L' ? 40 : 20;
  const prScore = cvss.pr === 'N' ? 100 : cvss.pr === 'L' ? 65 : 30;
  const uiScore = cvss.ui === 'N' ? 100 : 50;
  const acScore = cvss.ac === 'L' ? 100 : 50;
  exploitability = Math.round((avScore * 0.4) + (prScore * 0.3) + (uiScore * 0.15) + (acScore * 0.15));

  if (/zero-click|pre-auth|unauthenticated|sem autenticação|remoto|rce/i.test(allText)) {
    exploitability = Math.min(100, exploitability + 15);
  }

  // 6. Brand & Regulatory Compliance
  let brand = 30;
  if (report.cveIds && report.cveIds.length > 0) brand += 30;
  if (report.severity === 'CRITICAL') brand += 35;
  else if (report.severity === 'HIGH') brand += 25;
  else if (report.severity === 'MEDIUM') brand += 10;

  if (/gdpr|lgpd|pci-dss|pci|regulat|conformidade|auditoria|notificação pública|reputa|marca/i.test(allText)) {
    brand = Math.min(100, brand + 20);
  }

  return {
    confidentiality: Math.min(100, Math.max(0, confidentiality)),
    integrity: Math.min(100, Math.max(0, integrity)),
    availability: Math.min(100, Math.max(0, availability)),
    financial: Math.min(100, Math.max(0, financial)),
    exploitability: Math.min(100, Math.max(0, exploitability)),
    brand: Math.min(100, Math.max(0, brand))
  };
}

/**
 * Calculates aggregated business impact metrics across open (or all) reports
 */
export function calculateBusinessImpactScorecard(
  reports: VulnerabilityReport[],
  onlyOpenReports: boolean = true
): BusinessImpactSummary {
  const openReportsList = reports.filter(r => OPEN_STATUSES.includes(r.status));
  const closedReportsList = reports.filter(r => !OPEN_STATUSES.includes(r.status));
  const targetReports = onlyOpenReports ? openReportsList : reports;

  const totalAnalyzed = targetReports.length;
  const totalFinancialExposure = targetReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

  if (totalAnalyzed === 0) {
    const emptyDimensions: ImpactDimensionResult[] = [
      { key: 'confidentiality', dimension: 'Confidencialidade', shortLabel: 'Confidencialidade', score: 0, peakScore: 0, affectedReportsCount: 0, criticalReportsCount: 0, riskLevel: 'LOW', description: 'Exposição de dados confidenciais, PII e segredos de infraestrutura', contributingReports: [] },
      { key: 'integrity', dimension: 'Integridade', shortLabel: 'Integridade', score: 0, peakScore: 0, affectedReportsCount: 0, criticalReportsCount: 0, riskLevel: 'LOW', description: 'Manipulação de estado, adulteração de dados e bypass de autorização', contributingReports: [] },
      { key: 'availability', dimension: 'Disponibilidade', shortLabel: 'Disponibilidade', score: 0, peakScore: 0, affectedReportsCount: 0, criticalReportsCount: 0, riskLevel: 'LOW', description: 'Risco de negação de serviço (DoS), esgotamento de recursos e queda', contributingReports: [] },
      { key: 'financial', dimension: 'Impacto Financeiro', shortLabel: 'Financeiro', score: 0, peakScore: 0, affectedReportsCount: 0, criticalReportsCount: 0, riskLevel: 'LOW', description: 'Perdas financeiras diretas, fraude em transações e bônus em risco', contributingReports: [] },
      { key: 'exploitability', dimension: 'Explorabilidade', shortLabel: 'Explorabilidade', score: 0, peakScore: 0, affectedReportsCount: 0, criticalReportsCount: 0, riskLevel: 'LOW', description: 'Facilidade de exploração remota pela Internet sem credenciais prévias', contributingReports: [] },
      { key: 'brand', dimension: 'Reputação & Regulatório', shortLabel: 'Reputação', score: 0, peakScore: 0, affectedReportsCount: 0, criticalReportsCount: 0, riskLevel: 'LOW', description: 'Exposição regulatória (LGPD/GDPR), atribuição de CVE e dano à marca', contributingReports: [] }
    ];

    return {
      totalAnalyzedReports: 0,
      openReportsCount: openReportsList.length,
      closedReportsCount: closedReportsList.length,
      compositeScore: 0,
      overallRiskLevel: 'LOW',
      highestImpactDimension: 'Nenhum',
      totalFinancialExposureUSD: 0,
      dimensions: emptyDimensions,
      openReports: openReportsList
    };
  }

  // Evaluate each target report
  const reportImpacts = targetReports.map(report => ({
    report,
    scores: evaluateReportImpact(report)
  }));

  const dimensionsMeta = [
    {
      key: 'confidentiality',
      dimension: 'Confidencialidade',
      shortLabel: 'Confidencialidade',
      description: 'Exposição de dados sensíveis, credenciais, segredos e registros de clientes'
    },
    {
      key: 'integrity',
      dimension: 'Integridade',
      shortLabel: 'Integridade',
      description: 'Modificação arbitrária de registros, corrupção de estado e escalada de privilégios'
    },
    {
      key: 'availability',
      dimension: 'Disponibilidade',
      shortLabel: 'Disponibilidade',
      description: 'Potencial de indisponibilidade de serviço, congelamento de rotinas e DoS'
    },
    {
      key: 'financial',
      dimension: 'Impacto Financeiro',
      shortLabel: 'Financeiro',
      description: 'Exposição direta a fraudes transacionais, penalidades contratuais e bounties'
    },
    {
      key: 'exploitability',
      dimension: 'Explorabilidade',
      shortLabel: 'Explorabilidade',
      description: 'Vetor de ataque remoto desautenticado via Internet com baixa complexidade'
    },
    {
      key: 'brand',
      dimension: 'Reputação & Regulatório',
      shortLabel: 'Reputação',
      description: 'Publicação de CVEs, exigências de notificação a órgãos reguladores e perda de confiança'
    }
  ];

  const dimensionsResults: ImpactDimensionResult[] = dimensionsMeta.map(dim => {
    const scores = reportImpacts.map(item => (item.scores as any)[dim.key] as number);
    const peakScore = Math.max(...scores);
    
    // Weighted score gives heavier weighting to high-severity findings
    let weightedSum = 0;
    let weightSum = 0;
    let affectedCount = 0;
    let criticalCount = 0;

    const contributors: ImpactDimensionResult['contributingReports'] = [];

    reportImpacts.forEach(({ report, scores: rScores }) => {
      const s = (rScores as any)[dim.key] as number;
      const weight = report.severity === 'CRITICAL' ? 3.5 : report.severity === 'HIGH' ? 2.5 : report.severity === 'MEDIUM' ? 1.5 : 1.0;
      
      weightedSum += s * weight;
      weightSum += weight;

      if (s >= 50) affectedCount++;
      if (report.severity === 'CRITICAL' && s >= 60) criticalCount++;

      if (s >= 40) {
        contributors.push({
          id: report.id,
          title: report.title,
          target: report.target,
          severity: report.severity,
          scoreContribution: s,
          businessImpactSnippet: report.businessImpact || report.summary || 'Impacto crítico documentado.'
        });
      }
    });

    // Blend: 65% weighted average + 35% peak risk to ensure critical outliers surface accurately
    const avgScore = weightSum > 0 ? weightedSum / weightSum : 0;
    const finalScore = Math.round((avgScore * 0.65) + (peakScore * 0.35));

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (finalScore >= 80) riskLevel = 'CRITICAL';
    else if (finalScore >= 60) riskLevel = 'HIGH';
    else if (finalScore >= 40) riskLevel = 'MEDIUM';

    // Sort contributors by score descending
    contributors.sort((a, b) => b.scoreContribution - a.scoreContribution);

    return {
      key: dim.key,
      dimension: dim.dimension,
      shortLabel: dim.shortLabel,
      score: finalScore,
      peakScore,
      affectedReportsCount: affectedCount,
      criticalReportsCount: criticalCount,
      riskLevel,
      description: dim.description,
      contributingReports: contributors
    };
  });

  // Calculate composite overall impact score
  const compositeScore = Math.round(
    dimensionsResults.reduce((acc, d) => acc + d.score, 0) / dimensionsResults.length
  );

  let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (compositeScore >= 75) overallRiskLevel = 'CRITICAL';
  else if (compositeScore >= 55) overallRiskLevel = 'HIGH';
  else if (compositeScore >= 35) overallRiskLevel = 'MEDIUM';

  // Find dimension with highest risk
  const sortedDims = [...dimensionsResults].sort((a, b) => b.score - a.score);
  const highestImpactDimension = sortedDims[0]?.dimension || 'Confidencialidade';

  return {
    totalAnalyzedReports: totalAnalyzed,
    openReportsCount: openReportsList.length,
    closedReportsCount: closedReportsList.length,
    compositeScore,
    overallRiskLevel,
    highestImpactDimension,
    totalFinancialExposureUSD: totalFinancialExposure,
    dimensions: dimensionsResults,
    openReports: openReportsList
  };
}
