import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  Sliders,
  Layers,
  Flame,
  Zap,
  Crosshair,
  Info,
  X,
  ExternalLink,
  HelpCircle,
  Activity,
  ArrowRight,
  Search
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';

interface RiskAssessmentMatrixProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
  onUpdateStatus?: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
}

export interface EvaluatedRiskReport {
  report: VulnerabilityReport;
  likelihood: number; // 1 to 5
  impact: number; // 1 to 5
  riskScore: number; // likelihood * impact (1 to 25)
  riskCategory: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  likelihoodLabel: string;
  impactLabel: string;
  likelihoodRationale: string;
  impactRationale: string;
}

const LIKELIHOOD_LEVELS = [
  { level: 5, label: 'Altamente Provável', shortLabel: 'Certo', subtext: 'Exposto na internet, zero-click ou sem autenticação' },
  { level: 4, label: 'Provável', shortLabel: 'Provável', subtext: 'Rede remota, autenticação básica ou interação mínima' },
  { level: 3, label: 'Possível', shortLabel: 'Possível', subtext: 'Complexidade média, requer condições específicas' },
  { level: 2, label: 'Pouco Provável', shortLabel: 'Improvável', subtext: 'Acesso restrito, privilégios elevados ou rede interna' },
  { level: 1, label: 'Raro / Remoto', shortLabel: 'Raro', subtext: 'Requer acesso físico ou condições extremas de timing' }
];

const IMPACT_LEVELS = [
  { level: 1, label: 'Insignificante', shortLabel: 'Mínimo', subtext: 'Sem impacto sensível ou vazamento informativo público' },
  { level: 2, label: 'Menor / Baixo', shortLabel: 'Baixo', subtext: 'Impacto local limitado, sem dados corporativos sensíveis' },
  { level: 3, label: 'Moderado', shortLabel: 'Médio', subtext: 'Acesso parcial a dados, indisponibilidade temporária' },
  { level: 4, label: 'Alto / Grave', shortLabel: 'Alto', subtext: 'Vazamento em massa de PII, sequestro parcial de contas' },
  { level: 5, label: 'Catastrófico', shortLabel: 'Crítico', subtext: 'RCE remoto, dump total de DB ou Account Takeover irrestrito' }
];

// Determine Risk Category based on NIST / ISO 5x5 Likelihood x Impact score (1-25)
export const getRiskCategory = (score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (score >= 15) return 'CRITICAL';
  if (score >= 10) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
};

export const getRiskCategoryStyle = (category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
  switch (category) {
    case 'CRITICAL':
      return {
        label: 'Crítico / Extremo',
        badgeBg: 'bg-red-500/15',
        badgeText: 'text-red-400',
        badgeBorder: 'border-red-500/30',
        cellBg: 'bg-red-950/20 hover:bg-red-950/35',
        cellBorder: 'border-red-600/30',
        nodeBg: 'bg-red-500/25 text-red-300 border-red-500/50',
        dotColor: 'bg-red-500',
        textColor: 'text-red-400'
      };
    case 'HIGH':
      return {
        label: 'Alto Risco',
        badgeBg: 'bg-orange-500/15',
        badgeText: 'text-orange-400',
        badgeBorder: 'border-orange-500/30',
        cellBg: 'bg-orange-950/15 hover:bg-orange-950/30',
        cellBorder: 'border-orange-600/25',
        nodeBg: 'bg-orange-500/25 text-orange-300 border-orange-500/50',
        dotColor: 'bg-orange-500',
        textColor: 'text-orange-400'
      };
    case 'MEDIUM':
      return {
        label: 'Médio Risco',
        badgeBg: 'bg-yellow-500/15',
        badgeText: 'text-yellow-400',
        badgeBorder: 'border-yellow-500/30',
        cellBg: 'bg-yellow-950/10 hover:bg-yellow-950/25',
        cellBorder: 'border-yellow-600/20',
        nodeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        dotColor: 'bg-yellow-500',
        textColor: 'text-yellow-400'
      };
    case 'LOW':
    default:
      return {
        label: 'Baixo Risco',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
        cellBg: 'bg-emerald-950/10 hover:bg-emerald-950/25',
        cellBorder: 'border-emerald-600/20',
        nodeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-400'
      };
  }
};

/**
 * Computes Likelihood (1-5) and Impact (1-5) scientifically
 * from CVSS Vector components, severity, and vulnerability typology.
 */
function evaluateReportRisk(report: VulnerabilityReport): EvaluatedRiskReport {
  const vector = report.cvssVector || '';
  let likelihood = 3;
  let impact = 3;
  let likelihoodRationale = 'Avaliação baseada na severidade padrão e métricas de exploração.';
  let impactRationale = 'Avaliação baseada no impacto comercial e escopo do ativo.';

  // Check if standard CVSS:3.1 or 3.0 vector exists
  if (vector && vector.includes('AV:')) {
    // 1. Likelihood calculation from Exploitability Metrics
    // AV: Attack Vector (N: Network, A: Adjacent, L: Local, P: Physical)
    // AC: Attack Complexity (L: Low, H: High)
    // PR: Privileges Required (N: None, L: Low, H: High)
    // UI: User Interaction (N: None, R: Required)
    let lScore = 1.0;

    const hasAVNetwork = vector.includes('AV:N');
    const hasAVAdjacent = vector.includes('AV:A');
    const hasACLow = vector.includes('AC:L');
    const hasPRNone = vector.includes('PR:N');
    const hasPRLow = vector.includes('PR:L');
    const hasUINone = vector.includes('UI:N');

    if (hasAVNetwork) {
      lScore += 2.0;
    } else if (hasAVAdjacent) {
      lScore += 1.0;
    }

    if (hasACLow) lScore += 1.0;
    if (hasPRNone) lScore += 1.0;
    else if (hasPRLow) lScore += 0.5;
    if (hasUINone) lScore += 0.5;

    likelihood = Math.min(5, Math.max(1, Math.round(lScore)));

    likelihoodRationale = `${hasAVNetwork ? 'Acesso remoto via Internet (AV:N)' : 'Acesso restrito'}, ${hasACLow ? 'complexidade baixa (AC:L)' : 'complexidade alta'}, ${hasPRNone ? 'sem autenticação (PR:N)' : hasPRLow ? 'privilégios baixos (PR:L)' : 'privilégios altos'}.`;

    // 2. Impact calculation from CIA Impact Metrics
    // C: Confidentiality (H, L, N)
    // I: Integrity (H, L, N)
    // A: Availability (H, L, N)
    // S: Scope (C: Changed, U: Unchanged)
    let iScore = 1.0;
    const hasCHigh = vector.includes('C:H');
    const hasCLow = vector.includes('C:L');
    const hasIHigh = vector.includes('I:H');
    const hasILow = vector.includes('I:L');
    const hasAHigh = vector.includes('A:H');
    const hasScopeChanged = vector.includes('S:C');

    if (hasCHigh) iScore += 1.5;
    else if (hasCLow) iScore += 0.75;

    if (hasIHigh) iScore += 1.5;
    else if (hasILow) iScore += 0.75;

    if (hasAHigh) iScore += 1.0;
    if (hasScopeChanged) iScore += 1.0;

    impact = Math.min(5, Math.max(1, Math.round(iScore)));

    impactRationale = `Confidencialidade: ${hasCHigh ? 'Alta' : hasCLow ? 'Baixa' : 'Nenhuma'}, Integridade: ${hasIHigh ? 'Alta' : hasILow ? 'Baixa' : 'Nenhuma'}${hasScopeChanged ? ', Escopo estendido (S:C)' : ''}.`;
  } else {
    // Fallback based on severity & CVSS score
    const cvss = report.cvssScore || 5.0;
    if (report.severity === 'CRITICAL' || cvss >= 9.0) {
      likelihood = 5;
      impact = 5;
      likelihoodRationale = 'Exploração crítica remota sem barreiras identificadas.';
      impactRationale = 'Impacto sistêmico severo em infraestrutura ou dados.';
    } else if (report.severity === 'HIGH' || cvss >= 7.0) {
      likelihood = 4;
      impact = 4;
      likelihoodRationale = 'Alta probabilidade de exploração remota.';
      impactRationale = 'Comprometimento substancial de confidencialidade ou integridade.';
    } else if (report.severity === 'MEDIUM' || cvss >= 4.0) {
      likelihood = 3;
      impact = 3;
      likelihoodRationale = 'Exploração possível sob condições intermediárias.';
      impactRationale = 'Impacto moderado restrito ao componente afetado.';
    } else if (report.severity === 'LOW') {
      likelihood = 2;
      impact = 2;
      likelihoodRationale = 'Probabilidade baixa ou mitigada.';
      impactRationale = 'Divulgação residual sem comprometimento sistêmico.';
    } else {
      likelihood = 1;
      impact = 1;
      likelihoodRationale = 'Raramente explorável sem fatores externos.';
      impactRationale = 'Informativo sem dano direto comprovado.';
    }
  }

  const riskScore = likelihood * impact;
  const riskCategory = getRiskCategory(riskScore);
  const likelihoodLabel = LIKELIHOOD_LEVELS.find(l => l.level === likelihood)?.label || 'Moderada';
  const impactLabel = IMPACT_LEVELS.find(i => i.level === impact)?.label || 'Moderado';

  return {
    report,
    likelihood,
    impact,
    riskScore,
    riskCategory,
    likelihoodLabel,
    impactLabel,
    likelihoodRationale,
    impactRationale
  };
}

export const RiskAssessmentMatrix: React.FC<RiskAssessmentMatrixProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateToReports,
  onUpdateStatus
}) => {
  // State for interactive filters & selection
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [minRiskFilter, setMinRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH_PLUS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [hoveredReport, setHoveredReport] = useState<EvaluatedRiskReport | null>(null);
  const [showInfoBanner, setShowInfoBanner] = useState<boolean>(false);

  // 1. Evaluate all reports with risk scoring
  const evaluatedReports: EvaluatedRiskReport[] = useMemo(() => {
    return reports.map(evaluateReportRisk);
  }, [reports]);

  // 2. Filter reports based on user controls
  const filteredReports = useMemo(() => {
    return evaluatedReports.filter(item => {
      // Status filter
      if (statusFilter === 'ACTIVE') {
        const isResolved = item.report.status === 'RESOLVED' || item.report.status === 'REWARDED';
        if (isResolved) return false;
      } else if (statusFilter === 'RESOLVED') {
        const isResolved = item.report.status === 'RESOLVED' || item.report.status === 'REWARDED';
        if (!isResolved) return false;
      }

      // Minimum Risk Filter
      if (minRiskFilter === 'CRITICAL' && item.riskScore < 15) return false;
      if (minRiskFilter === 'HIGH_PLUS' && item.riskScore < 10) return false;

      // Platform filter
      if (selectedPlatform !== 'ALL' && item.report.platform !== selectedPlatform) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.report.title.toLowerCase().includes(query);
        const matchesTarget = item.report.target.toLowerCase().includes(query);
        const matchesType = item.report.vulnerabilityType.toLowerCase().includes(query);
        const matchesId = item.report.id.toLowerCase().includes(query);
        if (!matchesTitle && !matchesTarget && !matchesType && !matchesId) return false;
      }

      return true;
    });
  }, [evaluatedReports, statusFilter, minRiskFilter, selectedPlatform, searchQuery]);

  // 3. Group filtered reports into 5x5 Matrix cells [Likelihood 1-5, Impact 1-5]
  const matrixGrid = useMemo(() => {
    const grid: Record<string, EvaluatedRiskReport[]> = {};

    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        grid[`${l}_${i}`] = [];
      }
    }

    filteredReports.forEach(item => {
      const key = `${item.likelihood}_${item.impact}`;
      if (grid[key]) {
        grid[key].push(item);
      }
    });

    return grid;
  }, [filteredReports]);

  // 4. Prioritization Queue: Sorted by Risk Score (descending), then CVSS score
  const prioritizedQueue = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }
      return (b.report.cvssScore || 0) - (a.report.cvssScore || 0);
    });
  }, [filteredReports]);

  // 5. Executive Risk KPIs
  const kpis = useMemo(() => {
    const total = filteredReports.length;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let scoreSum = 0;

    filteredReports.forEach(r => {
      scoreSum += r.riskScore;
      if (r.riskScore >= 15) criticalCount++;
      else if (r.riskScore >= 10) highCount++;
      else if (r.riskScore >= 5) mediumCount++;
      else lowCount++;
    });

    const averageRiskScore = total > 0 ? (scoreSum / total).toFixed(1) : '0.0';

    return {
      total,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      averageRiskScore
    };
  }, [filteredReports]);

  // Reports in currently selected cell
  const selectedCellReports = useMemo(() => {
    if (!selectedCell) return null;
    const key = `${selectedCell.likelihood}_${selectedCell.impact}`;
    return matrixGrid[key] || [];
  }, [selectedCell, matrixGrid]);

  return (
    <div id="risk-assessment-matrix-card" className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-xl mb-8">
      {/* 1. Card Header with Title, Controls & Help */}
      <div className="p-4 sm:p-6 border-b border-[#262626] bg-[#0d0f17]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide font-mono">
                    Risk Assessment Matrix (5×5)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/30 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Likelihood vs. Impact
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mapeamento bidimensional de probabilidade e impacto para priorização proativa de remediação
                </p>
              </div>
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowInfoBanner(!showInfoBanner)}
              className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-1.5 transition-all ${
                showInfoBanner
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-[#151824] text-zinc-400 border-[#232738] hover:text-white'
              }`}
              title="Explicação da Metodologia 5x5"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Metodologia</span>
            </button>

            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>+ Novo Relatório</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Executive Risk Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-[#1e2335]">
          {/* Total Findings in Scope */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-[#22273d]">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Ameaças no Escopo</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-mono font-bold text-white">{kpis.total}</span>
              <span className="text-[10px] font-mono text-zinc-400">vulnerabilidades</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
              Score Médio: <strong className="text-zinc-200">{kpis.averageRiskScore}</strong> / 25
            </div>
          </div>

          {/* Critical / Extreme Risk Count */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-red-500/20">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono text-red-400 uppercase font-bold">Crítico (15-25)</p>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-mono font-bold text-red-400">{kpis.criticalCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">
                ({kpis.total > 0 ? Math.round((kpis.criticalCount / kpis.total) * 100) : 0}%)
              </span>
            </div>
            <div className="text-[10px] font-mono text-red-300/80 mt-0.5">Prioridade Imediata</div>
          </div>

          {/* High Risk Count */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-orange-500/20">
            <p className="text-[10px] font-mono text-orange-400 uppercase font-bold">Alto Risco (10-14)</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-mono font-bold text-orange-400">{kpis.highCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">
                ({kpis.total > 0 ? Math.round((kpis.highCount / kpis.total) * 100) : 0}%)
              </span>
            </div>
            <div className="text-[10px] font-mono text-orange-300/80 mt-0.5">Remediar no Sprint</div>
          </div>

          {/* Medium Risk Count */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-yellow-500/20">
            <p className="text-[10px] font-mono text-yellow-400 uppercase font-bold">Médio Risco (5-9)</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-mono font-bold text-yellow-400">{kpis.mediumCount}</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Ações programadas</div>
          </div>

          {/* Low Risk Count */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-emerald-500/20">
            <p className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Baixo Risco (1-4)</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-mono font-bold text-emerald-400">{kpis.lowCount}</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Monitoramento passivo</div>
          </div>
        </div>
      </div>

      {/* Methodology Explanation Accordion */}
      {showInfoBanner && (
        <div className="p-4 sm:p-5 bg-[#0a0c16] border-b border-[#21263d] text-xs font-mono text-zinc-300 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Metodologia de Classificação de Risco (NIST SP 800-30 / ISO 27005):
            </span>
            <button
              type="button"
              onClick={() => setShowInfoBanner(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            • <strong>Probabilidade (Eixo Y):</strong> Derivada dos subcomponentes de Exploitability do CVSS (Vetor de Ataque, Complexidade, Privilégios Necessários e Interação do Usuário).<br />
            • <strong>Impacto (Eixo X):</strong> Derivado das métricas de impacto na Confidencialidade, Integridade, Disponibilidade e Escopo (C/I/A/S).<br />
            • <strong>Risk Score = Probabilidade × Impacto (1 a 25):</strong><br />
            &nbsp;&nbsp;• <span className="text-red-400 font-bold">15 a 25 (Crítico/Extremo):</span> Exige intervenção emergencial de segurança.<br />
            &nbsp;&nbsp;• <span className="text-orange-400 font-bold">10 a 14 (Alto Risco):</span> Requer remediação de alto escalão.<br />
            &nbsp;&nbsp;• <span className="text-yellow-400 font-bold">5 a 9 (Médio Risco):</span> Tratamento em ciclo normal de manutenção.<br />
            &nbsp;&nbsp;• <span className="text-emerald-400 font-bold">1 a 4 (Baixo Risco):</span> Risco residual tolerável.
          </p>
        </div>
      )}

      {/* 3. Filter Toolbar */}
      <div className="p-3 sm:px-6 bg-[#0a0c14] border-b border-[#1f2436] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por alvo, título, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141726] border border-[#23283c] rounded-lg pl-8 pr-3 py-1.5 text-zinc-300 placeholder-zinc-500 text-xs focus:outline-none focus:border-red-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters Right */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#131625] border border-[#23283c] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                statusFilter === 'ALL' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                statusFilter === 'ACTIVE' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ativos / Abertos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                statusFilter === 'RESOLVED' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Resolvidos
            </button>
          </div>

          {/* Risk Level Filter */}
          <select
            value={minRiskFilter}
            onChange={(e) => setMinRiskFilter(e.target.value as any)}
            className="bg-[#131625] border border-[#23283c] rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-red-500/50 text-[11px]"
          >
            <option value="ALL">Todo Nível de Risco</option>
            <option value="HIGH_PLUS">Apenas Alto & Crítico (≥ 10)</option>
            <option value="CRITICAL">Apenas Crítico / Extremo (≥ 15)</option>
          </select>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-[#131625] border border-[#23283c] rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-red-500/50 text-[11px]"
          >
            <option value="ALL">Todas Plataformas</option>
            <option value="HackerOne">HackerOne</option>
            <option value="Bugcrowd">Bugcrowd</option>
            <option value="Intigriti">Intigriti</option>
            <option value="YesWeHack">YesWeHack</option>
            <option value="Synack">Synack</option>
            <option value="Direct / VDP">Direct / VDP</option>
          </select>

          {/* Clear cell selection if active */}
          {selectedCell && (
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 border border-zinc-700"
            >
              <span>Limpar Filtro da Célula</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Body: 5x5 Matrix Grid (Left) + Prioritization Action Queue (Right) */}
      <div className="p-4 sm:p-6 bg-[#0e1017]">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: The 5x5 Matrix Layout */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                Matriz de Risco 5×5 (Probabilidade × Impacto)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Clique em uma célula para filtrar ameaças
              </span>
            </div>

            {/* Matrix Frame Container */}
            <div className="bg-[#0b0d14] border border-[#1f2438] rounded-xl p-3 sm:p-4 overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Likelihood Y-Axis Label */}
                <div className="flex">
                  {/* Vertical Y-axis label */}
                  <div className="w-8 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-widest -rotate-90 whitespace-nowrap uppercase">
                      ← PROBABILIDADE (LIKELIHOOD)
                    </span>
                  </div>

                  {/* 5 Rows for Likelihood (from 5 down to 1) */}
                  <div className="flex-1 space-y-1.5">
                    {LIKELIHOOD_LEVELS.map((likelihoodItem) => {
                      const l = likelihoodItem.level;

                      return (
                        <div key={`row-${l}`} className="flex items-stretch gap-1.5">
                          {/* Y-Axis Row Header */}
                          <div
                            className="w-24 shrink-0 flex flex-col justify-center px-2 py-1 bg-[#121524] border border-[#1e2338] rounded-md text-right"
                            title={likelihoodItem.subtext}
                          >
                            <span className="text-[10px] font-mono font-bold text-white leading-tight">
                              {l} - {likelihoodItem.shortLabel}
                            </span>
                            <span className="text-[8px] font-mono text-zinc-500 leading-tight">
                              {l === 5 ? 'Quase Certo' : l === 4 ? 'Provável' : l === 3 ? 'Possível' : l === 2 ? 'Pouco Prov.' : 'Raro'}
                            </span>
                          </div>

                          {/* 5 Columns for Impact (1 to 5) */}
                          <div className="grid grid-cols-5 gap-1.5 flex-1">
                            {IMPACT_LEVELS.map((impactItem) => {
                              const i = impactItem.level;
                              const score = l * i;
                              const category = getRiskCategory(score);
                              const style = getRiskCategoryStyle(category);
                              const cellKey = `${l}_${i}`;
                              const cellReports = matrixGrid[cellKey] || [];
                              const isSelected = selectedCell?.likelihood === l && selectedCell?.impact === i;

                              return (
                                <div
                                  key={`cell-${l}-${i}`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedCell(null);
                                    } else {
                                      setSelectedCell({ likelihood: l, impact: i });
                                    }
                                  }}
                                  className={`relative min-h-[58px] p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${style.cellBg} ${style.cellBorder} ${
                                    isSelected
                                      ? 'ring-2 ring-white border-white scale-[1.02] z-10 shadow-lg'
                                      : 'hover:border-zinc-400/50'
                                  }`}
                                  title={`Probabilidade: ${l} (${likelihoodItem.label}) × Impacto: ${i} (${impactItem.label}) = Score ${score} (${style.label})`}
                                >
                                  {/* Score watermark indicator in top right */}
                                  <div className="flex items-center justify-between w-full text-[9px] font-mono leading-none">
                                    <span className={`font-bold ${style.textColor}`}>
                                      {score}
                                    </span>
                                    {cellReports.length > 0 && (
                                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${style.nodeBg}`}>
                                        {cellReports.length} {cellReports.length === 1 ? 'bug' : 'bugs'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Badges of reports placed in this cell */}
                                  <div className="mt-1 flex flex-wrap gap-0.5 max-h-9 overflow-hidden">
                                    {cellReports.slice(0, 3).map((item) => (
                                      <div
                                        key={item.report.id}
                                        onMouseEnter={() => setHoveredReport(item)}
                                        onMouseLeave={() => setHoveredReport(null)}
                                        className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold truncate max-w-full flex items-center gap-1 ${style.nodeBg}`}
                                        title={`${item.report.title} (${item.report.severity})`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor} shrink-0`} />
                                        <span className="truncate">{item.report.id}</span>
                                      </div>
                                    ))}
                                    {cellReports.length > 3 && (
                                      <span className="text-[8px] font-mono text-zinc-400 font-bold px-1">
                                        +{cellReports.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Bottom X-Axis Column Headers */}
                    <div className="flex items-stretch gap-1.5 pt-1">
                      {/* Empty spacer for alignment with row header */}
                      <div className="w-24 shrink-0" />

                      {/* 5 Column Headers */}
                      <div className="grid grid-cols-5 gap-1.5 flex-1 text-center font-mono">
                        {IMPACT_LEVELS.map((imp) => (
                          <div
                            key={`header-imp-${imp.level}`}
                            className="px-1 py-1.5 bg-[#121524] border border-[#1e2338] rounded-md"
                            title={imp.subtext}
                          >
                            <span className="text-[10px] font-bold text-white block leading-tight">
                              {imp.level} - {imp.shortLabel}
                            </span>
                            <span className="text-[8px] text-zinc-500 block leading-tight">
                              {imp.level === 1 ? 'Mínimo' : imp.level === 2 ? 'Menor' : imp.level === 3 ? 'Moderado' : imp.level === 4 ? 'Alto' : 'Catastrófico'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom X-Axis Label */}
                    <div className="flex pt-1">
                      <div className="w-24 shrink-0" />
                      <div className="flex-1 text-center">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-widest uppercase">
                          IMPACTO (IMPACT) →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Legend beneath matrix */}
              <div className="mt-3 pt-3 border-t border-[#1b2034] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-zinc-500 uppercase text-[10px] font-bold">Níveis de Risco:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-red-500" />
                    <span>Crítico (15-25)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-orange-500" />
                    <span>Alto (10-14)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-yellow-500" />
                    <span>Médio (5-9)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span>Baixo (1-4)</span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500">
                  {selectedCell ? (
                    <span className="text-white font-bold">
                      Filtro ativo: P={selectedCell.likelihood} × I={selectedCell.impact} (Score {selectedCell.likelihood * selectedCell.impact})
                    </span>
                  ) : (
                    <span>Selecione qualquer quadrante para isolar ameaças</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hovered Report Quick Info Bar */}
            {hoveredReport && (
              <div className="mt-3 p-2.5 rounded-lg bg-[#141829] border border-indigo-500/40 text-xs font-mono text-zinc-300 animate-in fade-in duration-150 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-white border border-zinc-700">
                    {hoveredReport.report.id}
                  </span>
                  <span className="font-bold text-white truncate">{hoveredReport.report.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-zinc-400">
                    Score: <strong className={getRiskCategoryStyle(hoveredReport.riskCategory).textColor}>{hoveredReport.riskScore}/25</strong>
                  </span>
                  {onSelectReport && (
                    <button
                      type="button"
                      onClick={() => onSelectReport(hoveredReport.report)}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                    >
                      Inspecionar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: Remediation & Threat Prioritization Queue */}
          <div className="xl:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Fila de Priorização de Ameaças ({prioritizedQueue.length})
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Ordenado por Severidade de Risco
              </span>
            </div>

            {/* Prioritized List Container */}
            <div className="bg-[#0b0d14] border border-[#1f2438] rounded-xl p-3 space-y-2 max-h-[485px] overflow-y-auto font-mono">
              {prioritizedQueue.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-500" />
                  <p>Nenhuma vulnerabilidade encontrada com os filtros atuais.</p>
                  {selectedCell && (
                    <button
                      type="button"
                      onClick={() => setSelectedCell(null)}
                      className="mt-2 text-indigo-400 hover:underline text-xs"
                    >
                      Remover filtro da célula
                    </button>
                  )}
                </div>
              ) : (
                prioritizedQueue.map((item, index) => {
                  const style = getRiskCategoryStyle(item.riskCategory);
                  const statusColor = getStatusBadgeColor(item.report.status);
                  const isSelectedInCell = selectedCell && selectedCell.likelihood === item.likelihood && selectedCell.impact === item.impact;
                  const isCritical = item.riskCategory === 'CRITICAL' || item.report.severity === 'CRITICAL';

                  return (
                    <div
                      key={item.report.id}
                      className={`p-3 rounded-lg border transition-all relative overflow-hidden ${
                        isCritical
                          ? 'critical-vuln-card-glow-subtle bg-gradient-to-r from-red-950/30 via-[#14121a] to-[#101320]'
                          : isSelectedInCell
                          ? 'bg-[#151a2d] border-indigo-500/60 ring-1 ring-indigo-400/40'
                          : 'bg-[#101320] border-[#1e2338] hover:border-zinc-500/40'
                      }`}
                    >
                      {isCritical && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        {/* Rank and Title */}
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isCritical ? 'bg-red-950/80 text-red-300 border border-red-500/50 animate-pulse' : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <h4
                              onClick={() => onSelectReport && onSelectReport(item.report)}
                              className={`text-xs font-bold hover:text-indigo-400 cursor-pointer transition-colors line-clamp-1 ${
                                isCritical ? 'text-red-100' : 'text-white'
                              }`}
                              title={item.report.title}
                            >
                              {item.report.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                              <span className="text-zinc-300 font-medium">{item.report.target}</span>
                              <span>•</span>
                              <span>{item.report.platform}</span>
                            </div>
                          </div>
                        </div>

                        {/* Risk Score Pill */}
                        <div className="shrink-0 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder} ${
                              isCritical ? 'shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse' : ''
                            }`}
                          >
                            Score: {item.riskScore}
                          </span>
                        </div>
                      </div>

                      {/* Technical Drivers: Likelihood and Impact */}
                      <div className="mt-2 pt-2 border-t border-[#1a1e30] grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-[#090b12] p-1.5 rounded border border-[#171b2b]">
                          <span className="text-zinc-500 block">Probabilidade (P={item.likelihood}):</span>
                          <span className="text-zinc-300 font-bold truncate block">
                            {item.likelihoodLabel}
                          </span>
                        </div>
                        <div className="bg-[#090b12] p-1.5 rounded border border-[#171b2b]">
                          <span className="text-zinc-500 block">Impacto (I={item.impact}):</span>
                          <span className="text-zinc-300 font-bold truncate block">
                            {item.impactLabel}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Status & Inspect Action */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                            {statusColor.label}
                          </span>
                          {item.report.bountyAmount && item.report.bountyAmount > 0 ? (
                            <span className="text-emerald-400 font-bold">
                              {formatCurrency(item.report.bountyAmount, 'USD')}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {isCritical && onUpdateStatus && item.report.status !== 'TRIAGED' && (
                            <button
                              id={`btn-quick-triage-risk-matrix-${item.report.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(item.report.id, 'TRIAGED');
                              }}
                              className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 active:scale-[0.98] text-blue-200 hover:text-white border border-blue-500/50 hover:border-blue-400 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                              title="Transição rápida para TRIAGED com 1 clique"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
                              <span>Quick Triage</span>
                            </button>
                          )}

                          {onSelectReport && (
                            <button
                              type="button"
                              onClick={() => onSelectReport(item.report)}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold transition-colors cursor-pointer"
                            >
                              <span>Detalhes</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Selected Cell Inspector Modal/Drawer */}
      {selectedCell && (
        <div className="p-4 sm:p-6 bg-[#080910] border-t border-[#1f2438] animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between pb-3 border-b border-[#1b2034] mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold font-mono text-white">
                  Quadrante Selecionado: Probabilidade {selectedCell.likelihood} × Impacto {selectedCell.impact}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    getRiskCategoryStyle(getRiskCategory(selectedCell.likelihood * selectedCell.impact)).badgeBg
                  } ${
                    getRiskCategoryStyle(getRiskCategory(selectedCell.likelihood * selectedCell.impact)).badgeText
                  } ${
                    getRiskCategoryStyle(getRiskCategory(selectedCell.likelihood * selectedCell.impact)).badgeBorder
                  }`}
                >
                  Score: {selectedCell.likelihood * selectedCell.impact} ({getRiskCategoryStyle(getRiskCategory(selectedCell.likelihood * selectedCell.impact)).label})
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                {selectedCellReports?.length || 0} ameaças localizadas nesta combinação específica de risco
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Fechar Detalhes da Célula"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedCellReports && selectedCellReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#21263c] text-[11px] text-zinc-400 uppercase">
                    <th className="pb-2 pr-3">Vulnerabilidade</th>
                    <th className="pb-2 px-2">Alvo</th>
                    <th className="pb-2 px-2">Plataforma</th>
                    <th className="pb-2 px-2 text-center">Severidade CVSS</th>
                    <th className="pb-2 px-2">Racional de Probabilidade</th>
                    <th className="pb-2 px-2">Racional de Impacto</th>
                    <th className="pb-2 pl-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171b2b]">
                  {selectedCellReports.map((item) => {
                    const sevBadge = getSeverityBadgeColor(item.report.severity);
                    return (
                      <tr key={item.report.id} className="hover:bg-[#111424] transition-colors">
                        <td className="py-2.5 pr-3">
                          <span className="font-bold text-zinc-200 block truncate max-w-xs">
                            {item.report.title}
                          </span>
                          <span className="text-[10px] text-zinc-500">{item.report.id}</span>
                        </td>
                        <td className="py-2.5 px-2 text-zinc-300 truncate max-w-[130px]">
                          {item.report.target}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                            {item.report.platform}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                            {item.report.severity} ({item.report.cvssScore ? item.report.cvssScore.toFixed(1) : '—'})
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-[10px] text-zinc-400 max-w-[180px] truncate">
                          {item.likelihoodRationale}
                        </td>
                        <td className="py-2.5 px-2 text-[10px] text-zinc-400 max-w-[180px] truncate">
                          {item.impactRationale}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          {onSelectReport && (
                            <button
                              type="button"
                              onClick={() => onSelectReport(item.report)}
                              className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Inspecionar</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs font-mono text-zinc-500 py-3">
              Nenhuma vulnerabilidade cadastrada neste quadrante.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
