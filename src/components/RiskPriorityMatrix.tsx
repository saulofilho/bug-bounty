import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Search,
  ArrowUpRight,
  ListTodo,
  Layers,
  Sparkles,
  ChevronRight,
  Zap,
  Target,
  FileText,
  Activity,
  DollarSign,
  TrendingUp,
  X,
  Building2,
  Check,
  Crosshair,
  SlidersHorizontal,
  Info,
  ArrowRight,
  Copy,
  Radio
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { parseCvssVector } from '../utils/cvss';

export interface RiskPriorityMatrixProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
  onNavigateToReports?: () => void;
}

export type QuadrantType = 'CRITICAL_P0' | 'HIGH_P1' | 'MEDIUM_P2' | 'LOW_P3';

export interface BusinessImpactDimensions {
  confidentiality: number;
  integrity: number;
  availability: number;
  financial: number;
  compliance: number;
}

export interface EvaluatedPriorityReport {
  report: VulnerabilityReport;
  cvssScore: number;
  businessImpactScore: number; // 0 to 100
  businessImpactRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  dimensions: BusinessImpactDimensions;
  compositeRiskScore: number; // 0 to 100
  quadrant: QuadrantType;
  quadrantTitle: string;
  quadrantColor: string;
  quadrantBg: string;
  quadrantBorder: string;
  priorityLabel: string;
  actionItems: string[];
  rationale: string;
  xPercent: number; // 0 to 100 (CVSS mapped)
  yPercent: number; // 0 to 100 (Business Impact mapped from top: 0 = 100% impact, 100 = 0% impact)
  clusterOffsetX: number;
  clusterOffsetY: number;
}

const QUADRANT_DEFINITIONS: Record<
  QuadrantType,
  {
    code: string;
    title: string;
    subtitle: string;
    description: string;
    badgeColor: string;
    headerBg: string;
    border: string;
    lightBg: string;
    textColor: string;
    dotColor: string;
    strategy: string;
  }
> = {
  CRITICAL_P0: {
    code: 'P0',
    title: 'Crítica (Ação Imediata)',
    subtitle: 'Alto CVSS (≥7.0) + Alto Impacto de Negócio (≥60)',
    description: 'Ameaças severas com capacidade de exploração imediata e dano catastrófico direto ao core business.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    headerBg: 'bg-rose-950/40',
    border: 'border-rose-500/40',
    lightBg: 'bg-rose-950/20',
    textColor: 'text-rose-400',
    dotColor: 'bg-rose-500',
    strategy: 'Priorizar triagem imediata, validação de remediação urgente e comunicação ativa com o programa.'
  },
  HIGH_P1: {
    code: 'P1',
    title: 'Alta (Escalação de Negócio)',
    subtitle: 'Baixo/Médio CVSS (<7.0) + Alto Impacto de Negócio (≥60)',
    description: 'Falhas técnicas de menor complexidade bruta que geram riscos desproporcionais de negócio (fraude, PII, lógica).',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    headerBg: 'bg-orange-950/40',
    border: 'border-orange-500/40',
    lightBg: 'bg-orange-950/20',
    textColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    strategy: 'Demonstrar impacto comercial concreto na triagem para justificar bonificação e prioridade de correção.'
  },
  MEDIUM_P2: {
    code: 'P2',
    title: 'Média (Contenção Técnica)',
    subtitle: 'Alto CVSS (≥7.0) + Menor Impacto de Negócio (<60)',
    description: 'Vulnerabilidades tecnicamente agressivas, porém confinadas a ambientes isolados ou ativos secundários.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    headerBg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
    lightBg: 'bg-amber-950/20',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    strategy: 'Verificar possibilidades de encadeamento (chaining) com outros endpoints e acompanhar patch padrão.'
  },
  LOW_P3: {
    code: 'P3',
    title: 'Baixa (Fila de Manutenção)',
    subtitle: 'Baixo/Médio CVSS (<7.0) + Menor Impacto de Negócio (<60)',
    description: 'Itens informativos, headers permissivos ou falhas pontuais sem exposição direta de dados sensíveis.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    headerBg: 'bg-blue-950/40',
    border: 'border-blue-500/40',
    lightBg: 'bg-blue-950/20',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
    strategy: 'Manter em monitoramento passivo ou agrupar como achados secundários em relatórios abrangentes.'
  }
};

/**
 * Computes business impact score (0 to 100) and multidimensional vectors based on textual content, CVSS vectors, and rewards
 */
function evaluateBusinessImpact(report: VulnerabilityReport): {
  score: number;
  rating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
  dimensions: BusinessImpactDimensions;
} {
  const text = `${report.title} ${report.businessImpact || ''} ${report.summary || ''} ${report.vulnerabilityType || ''}`.toLowerCase();
  const cvss = parseCvssVector(report.cvssVector || '');

  // 1. Confidentiality (Data Exposure & Privacy)
  let confidentiality = cvss.c === 'H' ? 85 : cvss.c === 'L' ? 45 : 15;
  if (/vazamento|dump|pii|cpf|cartao|credit card|senha|password|credencia|token|secret|database|banco de dados/i.test(text)) {
    confidentiality = Math.min(100, confidentiality + 25);
  }
  if (report.severity === 'CRITICAL' && cvss.c === 'H') confidentiality = 100;

  // 2. Integrity (State Tampering & Unauthorized Actions)
  let integrity = cvss.i === 'H' ? 85 : cvss.i === 'L' ? 45 : 15;
  if (/rce|remote code|execu|takeover|admin|root|superuser|escalação de privilégio|privilege escalation|idor|tamper|injet/i.test(text)) {
    integrity = Math.min(100, integrity + 25);
  }

  // 3. Availability (Service Disruption & Downtime)
  let availability = cvss.a === 'H' ? 85 : cvss.a === 'L' ? 45 : 10;
  if (/dos|denial of service|queda|indisponibilidade|travamento|crash|loop|timeout|exaust/i.test(text)) {
    availability = Math.min(100, availability + 30);
  }

  // 4. Financial & Fraud Exposure
  let financial = 25;
  if (report.bountyAmount >= 4000) financial = 95;
  else if (report.bountyAmount >= 2000) financial = 80;
  else if (report.bountyAmount >= 800) financial = 60;
  else if (report.bountyAmount > 0) financial = 45;
  else if (report.severity === 'CRITICAL') financial = 70;
  else if (report.severity === 'HIGH') financial = 50;

  if (/transa|pagamento|payment|saldo|wallet|carteira|fraude|transfer|financeir|checkout|fatura/i.test(text)) {
    financial = Math.min(100, financial + 30);
  }

  // 5. Compliance, Brand & Regulation
  let compliance = 25;
  if (report.cveIds && report.cveIds.length > 0) compliance += 25;
  if (/lgpd|gdpr|pci-dss|compliance|regulat|notifica|vazamento massivo/i.test(text)) compliance += 35;
  if (report.severity === 'CRITICAL') compliance += 20;

  confidentiality = Math.min(100, Math.max(10, confidentiality));
  integrity = Math.min(100, Math.max(10, integrity));
  availability = Math.min(100, Math.max(10, availability));
  financial = Math.min(100, Math.max(10, financial));
  compliance = Math.min(100, Math.max(10, compliance));

  // Weighted composite business impact score
  const finalScore = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        confidentiality * 0.28 +
        integrity * 0.26 +
        financial * 0.22 +
        compliance * 0.14 +
        availability * 0.10
      )
    )
  );

  let rating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let rationale = 'Impacto restrito a configurações não críticas ou ativos secundários.';

  if (finalScore >= 75) {
    rating = 'CRITICAL';
    rationale = 'Risco crítico de vazamento massivo de PII, fraude financeira direta ou tomada integral de controle.';
  } else if (finalScore >= 55) {
    rating = 'HIGH';
    rationale = 'Exposição substancial de dados sensíveis ou comprometimento de lógica corporativa essencial.';
  } else if (finalScore >= 35) {
    rating = 'MEDIUM';
    rationale = 'Impacto moderado restrito a operações departamentais ou indisponibilidade temporária.';
  }

  return {
    score: finalScore,
    rating,
    rationale,
    dimensions: {
      confidentiality,
      integrity,
      availability,
      financial,
      compliance
    }
  };
}

/**
 * Derives strategic researcher next steps based on report quadrant and status
 */
function deriveActionItems(report: VulnerabilityReport, quadrant: QuadrantType): string[] {
  const items: string[] = [];

  switch (quadrant) {
    case 'CRITICAL_P0':
      if (report.status === 'DRAFT' || report.status === 'SUBMITTED') {
        items.push('Validar script de PoC determinístico para assegurar 100% de reprodutibilidade.');
        items.push('Evidenciar no resumo executivo o dano direto ao core business para triagem expressa (< 24h).');
        items.push('Anexar gravação de tela com headers HTTP explícitos comprovando exfiltração.');
      } else if (report.status === 'TRIAGED') {
        items.push('Monitorar SLA de remediação urgente e estabelecer canal com o time de engenharia.');
        items.push('Preparar ambiente de reteste para validar ausência de bypass imediato após deploy.');
        items.push('Alinhar enquadramento na faixa máxima de bounty conforme tabela do programa.');
      } else {
        items.push('Executar reteste pós-deploy em produção para verificar eficácia definitiva do patch.');
        items.push('Solicitar autorização de divulgação coordenada (Responsible Disclosure) após janela de segurança.');
      }
      break;

    case 'HIGH_P1':
      items.push('Elaborar cenário de abuso comercial (Business Logic Abuse PoC) demonstrando prejuízo real.');
      items.push('Quantificar volume de transações ou registros de clientes potencialmente expostos.');
      items.push('Verificar se a falha viola isolamento entre organizações (multitenancy bypass).');
      break;

    case 'MEDIUM_P2':
      items.push('Testar encadeamento (chaining) com endpoints vizinhos para tentar elevar impacto técnico.');
      items.push('Inspecionar se parâmetros aceitam injeções secundárias ou escalada de contexto.');
      items.push('Acompanhar fila regular de triagem sem necessidade de intervenção prioritária.');
      break;

    case 'LOW_P3':
      items.push('Documentar vetores testados na base de conhecimento para reutilização em futuros testes.');
      items.push('Avaliar agrupamento como achado informativo complementar em auditoria periódica.');
      items.push('Verificar se o endpoint permanece no escopo ativo de recompensas.');
      break;
  }

  return items;
}

export const RiskPriorityMatrix: React.FC<RiskPriorityMatrixProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateToReports
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN'>('ALL');
  const [dotSizeMode, setDotSizeMode] = useState<'uniform' | 'bounty'>('bounty');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState(false);

  // 1. Evaluate all reports with CVSS, Business Impact, and Quadrants
  const evaluatedReports: EvaluatedPriorityReport[] = useMemo(() => {
    // First pass: basic evaluation
    const initialList = reports.map((report) => {
      const cvss = report.cvssScore || 0;
      const { score: biScore, rating: biRating, rationale, dimensions } = evaluateBusinessImpact(report);

      const isHighCvss = cvss >= 7.0;
      const isHighImpact = biScore >= 60;

      let quadrant: QuadrantType;
      if (isHighCvss && isHighImpact) {
        quadrant = 'CRITICAL_P0';
      } else if (!isHighCvss && isHighImpact) {
        quadrant = 'HIGH_P1';
      } else if (isHighCvss && !isHighImpact) {
        quadrant = 'MEDIUM_P2';
      } else {
        quadrant = 'LOW_P3';
      }

      const qDef = QUADRANT_DEFINITIONS[quadrant];
      const actionItems = deriveActionItems(report, quadrant);

      // Composite risk index (0 to 100)
      const compositeRiskScore = Math.min(
        100,
        Math.max(0, Math.round(cvss * 10 * 0.45 + biScore * 0.55))
      );

      // Map to percentage coordinates on grid:
      // X-axis: CVSS 0 to 10 -> 0% to 100%
      // Y-axis: Business Impact 0 to 100 -> Inverted for CSS top (100% impact = 0% from top)
      const xPercent = Math.min(95, Math.max(5, (cvss / 10) * 100));
      const yPercent = Math.min(95, Math.max(5, 100 - biScore));

      return {
        report,
        cvssScore: cvss,
        businessImpactScore: biScore,
        businessImpactRating: biRating,
        dimensions,
        compositeRiskScore,
        quadrant,
        quadrantTitle: qDef.title,
        quadrantColor: qDef.textColor,
        quadrantBg: qDef.lightBg,
        quadrantBorder: qDef.border,
        priorityLabel: qDef.code,
        actionItems,
        rationale,
        xPercent,
        yPercent,
        clusterOffsetX: 0,
        clusterOffsetY: 0
      };
    });

    // Second pass: Collision / Cluster Dispersion
    // When reports share very close coordinates (e.g., within 3%), apply gentle radial offsets
    const clusters: { [key: string]: number } = {};
    return initialList.map((item) => {
      // Coordinate bucket key (rounded to 3%)
      const bucketKey = `${Math.round(item.xPercent / 3.5)}_${Math.round(item.yPercent / 3.5)}`;
      const clusterIndex = clusters[bucketKey] || 0;
      clusters[bucketKey] = clusterIndex + 1;

      if (clusterIndex > 0) {
        const angle = ((clusterIndex - 1) * 45 * Math.PI) / 180;
        const radius = Math.min(16, 5 + clusterIndex * 3);
        const clusterOffsetX = Math.cos(angle) * radius;
        const clusterOffsetY = Math.sin(angle) * radius;
        return {
          ...item,
          clusterOffsetX,
          clusterOffsetY
        };
      }
      return item;
    });
  }, [reports]);

  // 2. Filter reports by Quadrant, Status, and Search Query
  const filteredReports = useMemo(() => {
    return evaluatedReports.filter((item) => {
      if (selectedQuadrant !== 'ALL' && item.quadrant !== selectedQuadrant) {
        return false;
      }
      if (statusFilter === 'OPEN') {
        const openStatuses: ReportStatus[] = ['DRAFT', 'SUBMITTED', 'TRIAGED'];
        if (!openStatuses.includes(item.report.status)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.report.title.toLowerCase().includes(q);
        const matchTarget = item.report.target.toLowerCase().includes(q);
        const matchCwe = item.report.cwe?.toLowerCase().includes(q);
        const matchPlatform = item.report.platform?.toLowerCase().includes(q);
        if (!matchTitle && !matchTarget && !matchCwe && !matchPlatform) return false;
      }
      return true;
    });
  }, [evaluatedReports, selectedQuadrant, statusFilter, searchQuery]);

  // Quadrant counts based on status filter
  const quadrantCounts = useMemo(() => {
    const counts = {
      CRITICAL_P0: 0,
      HIGH_P1: 0,
      MEDIUM_P2: 0,
      LOW_P3: 0
    };
    evaluatedReports.forEach((r) => {
      if (statusFilter === 'OPEN') {
        const openStatuses: ReportStatus[] = ['DRAFT', 'SUBMITTED', 'TRIAGED'];
        if (!openStatuses.includes(r.report.status)) return;
      }
      counts[r.quadrant]++;
    });
    return counts;
  }, [evaluatedReports, statusFilter]);

  // Active highlighted report (selected or hovered or top high-risk)
  const activeReport = useMemo(() => {
    if (selectedReportId) {
      const found = evaluatedReports.find((r) => r.report.id === selectedReportId);
      if (found) return found;
    }
    // Default to first P0 item, or first filtered item
    const p0Item = filteredReports.find((r) => r.quadrant === 'CRITICAL_P0');
    return p0Item || filteredReports[0] || null;
  }, [evaluatedReports, filteredReports, selectedReportId]);

  // Hovered item details for instant tooltip
  const hoveredReport = useMemo(() => {
    if (!hoveredReportId) return null;
    return evaluatedReports.find((r) => r.report.id === hoveredReportId) || null;
  }, [evaluatedReports, hoveredReportId]);

  // Top P0 High-Risk Priorities
  const topHighRiskPriorities = useMemo(() => {
    return evaluatedReports
      .filter((r) => r.quadrant === 'CRITICAL_P0')
      .sort((a, b) => b.compositeRiskScore - a.compositeRiskScore)
      .slice(0, 4);
  }, [evaluatedReports]);

  const handleCopyActionItems = () => {
    if (!activeReport) return;
    const text = `[${activeReport.priorityLabel} - ${activeReport.report.title}]\nAlvo: ${activeReport.report.target}\nCVSS: ${activeReport.cvssScore.toFixed(1)} | Impacto de Negócio: ${activeReport.businessImpactScore}%\n\nDiretriz: ${QUADRANT_DEFINITIONS[activeReport.quadrant].strategy}\n\nPróximos Passos:\n${activeReport.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedAction(true);
    setTimeout(() => setCopiedAction(false), 2000);
  };

  return (
    <section
      id="risk-priority-matrix-card"
      className="bg-[#0e1017] border border-[#1e2338] rounded-2xl overflow-hidden shadow-2xl mb-8 transition-all"
    >
      {/* Header Section */}
      <div className="p-5 sm:p-6 border-b border-[#1e2338] bg-[#121524]/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 via-orange-500/20 to-amber-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 shadow-sm">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Risk Priority Matrix
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold">
                  CVSS × Impacto de Negócio
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  Priorização Estratégica P0-P3
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Mapeamento analítico que plota cada vulnerabilidade correlacionando sua gravidade técnica (CVSS Base Score) com a severidade do dano ao negócio, orientando intervenções urgentes e estratégias de bonificação.
              </p>
            </div>
          </div>
        </div>

        {/* View & Status Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filter Toggle */}
          <div className="flex items-center bg-[#090b13] border border-[#22283e] p-1 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({evaluatedReports.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OPEN')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                statusFilter === 'OPEN'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Em Aberto
            </button>
          </div>

          {/* Dot Size Mode Toggle */}
          <div className="flex items-center bg-[#090b13] border border-[#22283e] p-1 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setDotSizeMode('uniform')}
              title="Pontos com raio uniforme"
              className={`px-2 py-1 rounded transition-all cursor-pointer ${
                dotSizeMode === 'uniform'
                  ? 'bg-[#1a2034] text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Uniforme
            </button>
            <button
              type="button"
              onClick={() => setDotSizeMode('bounty')}
              title="Tamanho do ponto proporcional ao valor do Bounty / Severidade"
              className={`px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                dotSizeMode === 'bounty'
                  ? 'bg-[#1a2034] text-emerald-300 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Por Bounty</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Risk Priorities Spotlight Alert Banner (If P0 items exist) */}
      {topHighRiskPriorities.length > 0 && (
        <div className="px-5 py-3.5 bg-gradient-to-r from-rose-950/40 via-red-950/20 to-transparent border-b border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-xs font-mono text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 inline" />
              <span>Atenção Prioritária (P0):</span>
            </span>
            <span className="text-xs text-zinc-300 font-mono">
              <strong className="text-rose-400 font-bold">{quadrantCounts.CRITICAL_P0} falhas críticas</strong> demandam ação imediata de triagem e contenção.
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {topHighRiskPriorities.map((item) => (
              <button
                key={item.report.id}
                type="button"
                onClick={() => setSelectedReportId(item.report.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeReport?.report.id === item.report.id
                    ? 'bg-rose-500 text-white border-rose-400 font-bold shadow-md shadow-rose-900/50'
                    : 'bg-[#121524] text-zinc-300 border-rose-500/40 hover:bg-rose-950/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span className="max-w-[130px] truncate">{item.report.title}</span>
                <span className="text-rose-300 font-bold">({item.cvssScore.toFixed(1)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Overview Metrics (P0, P1, P2, P3) */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#0c0e17] grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* P0 Priority */}
        <button
          type="button"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'CRITICAL_P0' ? 'ALL' : 'CRITICAL_P0')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedQuadrant === 'CRITICAL_P0'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
              : 'bg-[#121524] border-rose-500/30 hover:bg-rose-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>P0 • Ação Imediata</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
              URGENTE
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5 flex items-baseline justify-between">
            <span>{quadrantCounts.CRITICAL_P0}</span>
            <span className="text-xs text-rose-400/80 font-normal">CVSS ≥ 7 + Impacto ≥ 60</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block leading-tight">
            RCE, roubo massivo de PII, bypass de autenticação primária.
          </span>
        </button>

        {/* P1 Priority */}
        <button
          type="button"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'HIGH_P1' ? 'ALL' : 'HIGH_P1')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedQuadrant === 'HIGH_P1'
              ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30 shadow-lg'
              : 'bg-[#121524] border-orange-500/30 hover:bg-orange-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>P1 • Escalação</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-950 text-orange-300 border border-orange-500/40">
              NEGÓCIO
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5 flex items-baseline justify-between">
            <span>{quadrantCounts.HIGH_P1}</span>
            <span className="text-xs text-orange-400/80 font-normal">CVSS &lt; 7 + Impacto ≥ 60</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block leading-tight">
            Falhas de lógica, abuso financeiro, quebra de regras de negócios.
          </span>
        </button>

        {/* P2 Priority */}
        <button
          type="button"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'MEDIUM_P2' ? 'ALL' : 'MEDIUM_P2')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedQuadrant === 'MEDIUM_P2'
              ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
              : 'bg-[#121524] border-amber-500/30 hover:bg-amber-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>P2 • Contenção</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
              TÉCNICA
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5 flex items-baseline justify-between">
            <span>{quadrantCounts.MEDIUM_P2}</span>
            <span className="text-xs text-amber-400/80 font-normal">CVSS ≥ 7 + Impacto &lt; 60</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block leading-tight">
            Complexidade alta em ambiente isolado ou host de teste.
          </span>
        </button>

        {/* P3 Priority */}
        <button
          type="button"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'LOW_P3' ? 'ALL' : 'LOW_P3')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedQuadrant === 'LOW_P3'
              ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
              : 'bg-[#121524] border-blue-500/30 hover:bg-blue-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>P3 • Manutenção</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
              BACKLOG
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5 flex items-baseline justify-between">
            <span>{quadrantCounts.LOW_P3}</span>
            <span className="text-xs text-blue-400/80 font-normal">CVSS &lt; 7 + Impacto &lt; 60</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block leading-tight">
            Informativos, cabeçalhos brandos e melhorias gerais de higiene.
          </span>
        </button>
      </div>

      {/* Main Grid: Interactive 2D Coordinate Scatter Plot & Comprehensive Inspector */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0a0c14]">
        {/* Left (7 cols): Visual 2D Coordinate Grid Matrix */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                Diagrama de Dispersão dos Quadrantes
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedQuadrant !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedQuadrant('ALL')}
                  className="text-[10px] font-mono text-rose-300 hover:text-white flex items-center gap-1 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30 cursor-pointer"
                >
                  <span>Limpar Filtro ({selectedQuadrant.replace('_', ' ')})</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                Eixo Y: Impacto | Eixo X: CVSS Base
              </span>
            </div>
          </div>

          {/* Scatter Plot Box with Accurate Geometric Thresholds */}
          <div className="relative w-full h-[400px] sm:h-[440px] bg-[#0c0e18] border border-[#20273d] rounded-2xl p-6 pl-12 pb-10 overflow-hidden select-none">
            {/* Y-Axis Label & Ticks on Left Side */}
            <div className="absolute left-1 top-6 bottom-10 w-9 flex flex-col justify-between items-end text-[10px] font-mono text-zinc-500 pr-1 select-none pointer-events-none">
              <span className="text-rose-400 font-bold">100%</span>
              <span>80%</span>
              <span className="text-orange-400 font-bold">60%</span>
              <span>40%</span>
              <span>20%</span>
              <span>0%</span>
            </div>
            <div className="absolute -left-12 top-1/2 -rotate-90 origin-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider pointer-events-none select-none">
              Impacto ao Negócio (0 - 100%)
            </div>

            {/* X-Axis Label & Ticks on Bottom */}
            <div className="absolute left-12 right-6 bottom-1 h-7 flex items-center justify-between text-[10px] font-mono text-zinc-500 select-none pointer-events-none">
              <span>0.0</span>
              <span>2.0</span>
              <span>4.0</span>
              <span>6.0</span>
              <span className="text-rose-400 font-bold">7.0</span>
              <span>8.0</span>
              <span className="text-rose-400 font-bold">10.0</span>
            </div>
            <div className="absolute bottom-1 right-8 text-[9px] font-mono text-zinc-400 uppercase tracking-wider pointer-events-none select-none">
              CVSS Base (0.0 - 10.0)
            </div>

            {/* Inner Coordinate Canvas Area */}
            <div className="relative w-full h-full">
              {/* Subtle Grid Guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Horizontal Guide Lines (Impact: 20%, 40%, 60% threshold, 80%) */}
                <div className="absolute left-0 right-0 top-[20%] h-[1px] bg-[#1a2034]/60" />
                <div className="absolute left-0 right-0 top-[40%] h-[1.5px] border-b border-dashed border-rose-500/50" />
                <div className="absolute left-0 right-0 top-[60%] h-[1px] bg-[#1a2034]/60" />
                <div className="absolute left-0 right-0 top-[80%] h-[1px] bg-[#1a2034]/60" />

                {/* Vertical Guide Lines (CVSS: 2.0 = 20%, 4.0 = 40%, 6.0 = 60%, 7.0 = 70% threshold, 8.0 = 80%) */}
                <div className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-[#1a2034]/60" />
                <div className="absolute top-0 bottom-0 left-[40%] w-[1px] bg-[#1a2034]/60" />
                <div className="absolute top-0 bottom-0 left-[60%] w-[1px] bg-[#1a2034]/60" />
                <div className="absolute top-0 bottom-0 left-[70%] w-[1.5px] border-r border-dashed border-rose-500/50" />
                <div className="absolute top-0 bottom-0 left-[80%] w-[1px] bg-[#1a2034]/60" />
              </div>

              {/* 4 Quadrants Color Zones (Mathematically matched to 70% CVSS and 40% top = 60% Impact) */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top-Right: Quadrant P0 (CVSS >= 7.0 & Impact >= 60%) */}
                <div
                  style={{ left: '70%', top: '0%', width: '30%', height: '40%' }}
                  className={`absolute rounded-tr-xl border-l border-b border-rose-500/40 p-2 flex flex-col justify-between transition-colors ${
                    selectedQuadrant === 'CRITICAL_P0' ? 'bg-rose-950/40' : 'bg-rose-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40 flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 text-rose-400" />
                      <span>P0 • Ação Imediata</span>
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-rose-400 font-bold">
                    {quadrantCounts.CRITICAL_P0} falhas
                  </div>
                </div>

                {/* Top-Left: Quadrant P1 (CVSS < 7.0 & Impact >= 60%) */}
                <div
                  style={{ left: '0%', top: '0%', width: '70%', height: '40%' }}
                  className={`absolute rounded-tl-xl border-r border-b border-orange-500/30 p-2 flex flex-col justify-between transition-colors ${
                    selectedQuadrant === 'HIGH_P1' ? 'bg-orange-950/30' : 'bg-orange-950/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-orange-300 bg-orange-950/80 px-1.5 py-0.5 rounded border border-orange-500/40">
                      P1 • Escalação de Negócio
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-orange-400">
                    {quadrantCounts.HIGH_P1} falhas
                  </div>
                </div>

                {/* Bottom-Right: Quadrant P2 (CVSS >= 7.0 & Impact < 60%) */}
                <div
                  style={{ left: '70%', top: '40%', width: '30%', height: '60%' }}
                  className={`absolute rounded-br-xl border-l border-t border-amber-500/30 p-2 flex flex-col justify-between transition-colors ${
                    selectedQuadrant === 'MEDIUM_P2' ? 'bg-amber-950/30' : 'bg-amber-950/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                      P2 • Contenção Técnica
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-amber-400">
                    {quadrantCounts.MEDIUM_P2} falhas
                  </div>
                </div>

                {/* Bottom-Left: Quadrant P3 (CVSS < 7.0 & Impact < 60%) */}
                <div
                  style={{ left: '0%', top: '40%', width: '70%', height: '60%' }}
                  className={`absolute rounded-bl-xl border-r border-t border-blue-500/20 p-2 flex flex-col justify-between transition-colors ${
                    selectedQuadrant === 'LOW_P3' ? 'bg-blue-950/25' : 'bg-blue-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/30">
                      P3 • Fila de Manutenção
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-blue-400">
                    {quadrantCounts.LOW_P3} falhas
                  </div>
                </div>
              </div>

              {/* Threshold Indicator Badges */}
              <div
                style={{ left: '70%', top: '40%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
              >
                <div className="px-2 py-0.5 rounded bg-[#090b13] border border-rose-500/60 text-[9px] font-mono text-rose-300 font-bold shadow-md shadow-black/80">
                  CVSS 7.0 / Impacto 60%
                </div>
              </div>

              {/* Plotted Report Nodes */}
              <div className="absolute inset-0">
                {filteredReports.map((item) => {
                  const isSelected = activeReport?.report.id === item.report.id;
                  const isHovered = hoveredReportId === item.report.id;
                  const isP0 = item.quadrant === 'CRITICAL_P0';

                  // Dynamic sizing based on dotSizeMode
                  let nodeSize = 14; // default uniform
                  if (dotSizeMode === 'bounty') {
                    if (item.report.bountyAmount >= 4000) nodeSize = 22;
                    else if (item.report.bountyAmount >= 1500) nodeSize = 18;
                    else if (item.report.bountyAmount > 0) nodeSize = 15;
                    else nodeSize = 12;
                  }

                  return (
                    <button
                      key={item.report.id}
                      type="button"
                      id={`rpm-node-${item.report.id}`}
                      onClick={() => setSelectedReportId(item.report.id)}
                      onMouseEnter={() => setHoveredReportId(item.report.id)}
                      onMouseLeave={() => setHoveredReportId(null)}
                      style={{
                        left: `calc(${item.xPercent}% + ${item.clusterOffsetX}px)`,
                        top: `calc(${item.yPercent}% + ${item.clusterOffsetY}px)`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isSelected ? 40 : isHovered ? 35 : isP0 ? 25 : 20
                      }}
                      className="absolute p-1 group cursor-pointer focus:outline-none"
                    >
                      {/* High-Risk P0 Ambient Radar Ping */}
                      {isP0 && (
                        <span
                          className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none"
                          style={{ animationDuration: '2.5s' }}
                        />
                      )}

                      {/* Dot Body */}
                      <div
                        style={{
                          width: `${nodeSize}px`,
                          height: `${nodeSize}px`
                        }}
                        className={`rounded-full border-2 transition-all duration-200 flex items-center justify-center shadow-lg ${
                          isSelected
                            ? 'ring-4 ring-white border-white scale-125'
                            : isHovered
                            ? 'scale-125 ring-2 ring-white/60'
                            : 'border-[#0c0e18]'
                        } ${
                          item.quadrant === 'CRITICAL_P0'
                            ? 'bg-rose-500 shadow-rose-500/60'
                            : item.quadrant === 'HIGH_P1'
                            ? 'bg-orange-500 shadow-orange-500/60'
                            : item.quadrant === 'MEDIUM_P2'
                            ? 'bg-amber-500 shadow-amber-500/60'
                            : 'bg-blue-400 shadow-blue-400/60'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Interactive Popover Hover Card */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block w-56 p-3 rounded-xl bg-[#121524]/95 backdrop-blur-md border border-[#2d3450] text-left text-[11px] font-mono shadow-2xl pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#20273d]">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${item.quadrantBorder} ${item.quadrantColor} bg-[#161a2c]`}
                          >
                            {item.priorityLabel} • {item.quadrantTitle.split(' ')[0]}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            CVSS {item.cvssScore.toFixed(1)}
                          </span>
                        </div>

                        <div className="font-bold text-white font-sans text-xs mt-1.5 line-clamp-2 leading-tight">
                          {item.report.title}
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#1e2338] space-y-1 text-zinc-300 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Alvo:</span>
                            <span className="text-emerald-400 font-semibold">{item.report.target}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Impacto Negócio:</span>
                            <span className="text-rose-400 font-bold">{item.businessImpactScore}% ({item.businessImpactRating})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Recompensa:</span>
                            <span className="text-emerald-400 font-bold">
                              {item.report.bountyAmount > 0 ? formatCurrency(item.report.bountyAmount) : 'S/B'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] text-zinc-500 mt-2 text-center pt-1 border-t border-[#1a2034]">
                          Clique para inspecionar diretrizes
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Legend & Filter Footer under Chart */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 px-1">
            <div className="flex items-center flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedQuadrant('CRITICAL_P0')}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <span>P0 Ação Imediata</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedQuadrant('HIGH_P1')}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>P1 Escalação</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedQuadrant('MEDIUM_P2')}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>P2 Contenção</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedQuadrant('LOW_P3')}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span>P3 Manutenção</span>
              </button>
            </div>

            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Info className="w-3 h-3 text-zinc-400" />
              <span>Pontos possuem dispersão orbital anticolisão</span>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Selected Report Strategic Inspector */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                Diretrizes do Achado Selecionado
              </span>
            </div>
            {activeReport && (
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${activeReport.quadrantBorder} ${activeReport.quadrantColor} bg-[#141724]`}
              >
                {activeReport.priorityLabel} • {activeReport.quadrantTitle}
              </span>
            )}
          </div>

          {activeReport ? (
            <div className="bg-[#121524] border border-[#20273d] rounded-2xl p-4 sm:p-5 flex-1 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                {/* Finding Header */}
                <div className="pb-3 border-b border-[#1c2236]">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {activeReport.report.target}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${getSeverityBadgeColor(
                        activeReport.report.severity
                      )}`}
                    >
                      {activeReport.report.severity}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${getStatusBadgeColor(
                        activeReport.report.status
                      )}`}
                    >
                      {activeReport.report.status}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 bg-[#1c2136] px-2 py-0.5 rounded">
                      {activeReport.report.platform}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 leading-snug">
                    {activeReport.report.title}
                  </h4>
                </div>

                {/* Score Cards (CVSS vs Business Impact + Composite Risk) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#0c0e18] border border-[#1d2338]">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Score Técnico CVSS
                    </span>
                    <div className="text-lg font-bold font-mono text-white flex items-center justify-between mt-0.5">
                      <span>{activeReport.cvssScore.toFixed(1)}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">/ 10.0</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono truncate block mt-0.5">
                      {activeReport.report.cwe || 'CWE N/D'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0c0e18] border border-[#1d2338]">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Impacto de Negócio
                    </span>
                    <div className="text-lg font-bold font-mono text-rose-400 flex items-center justify-between mt-0.5">
                      <span>{activeReport.businessImpactScore}%</span>
                      <span className="text-[10px] text-zinc-500 font-normal">{activeReport.businessImpactRating}</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-mono truncate block mt-0.5">
                      {activeReport.report.bountyAmount > 0
                        ? formatCurrency(activeReport.report.bountyAmount)
                        : 'Sem Bounty'}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#0c0e18] border border-[#1d2338]">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Índice de Risco
                    </span>
                    <div className="text-lg font-bold font-mono text-amber-300 flex items-center justify-between mt-0.5">
                      <span>{activeReport.compositeRiskScore}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">/ 100</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-mono truncate block mt-0.5">
                      Prioridade {activeReport.priorityLabel}
                    </span>
                  </div>
                </div>

                {/* Multidimensional Business Impact Breakdown */}
                <div className="p-3 rounded-xl bg-[#0d101a] border border-[#1b2238]">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                    Vetores de Dano ao Negócio
                  </span>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400 text-[10px]">Exposição de Dados (PII)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#191e32] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${activeReport.dimensions.confidentiality}%` }}
                          />
                        </div>
                        <span className="text-zinc-300 text-[10px] w-7 text-right">
                          {activeReport.dimensions.confidentiality}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400 text-[10px]">Integridade & Controle</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#191e32] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-full rounded-full"
                            style={{ width: `${activeReport.dimensions.integrity}%` }}
                          />
                        </div>
                        <span className="text-zinc-300 text-[10px] w-7 text-right">
                          {activeReport.dimensions.integrity}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400 text-[10px]">Risco Financeiro & Fraude</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#191e32] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${activeReport.dimensions.financial}%` }}
                          />
                        </div>
                        <span className="text-zinc-300 text-[10px] w-7 text-right">
                          {activeReport.dimensions.financial}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400 text-[10px]">Conformidade (LGPD/PCI)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#191e32] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full"
                            style={{ width: `${activeReport.dimensions.compliance}%` }}
                          />
                        </div>
                        <span className="text-zinc-300 text-[10px] w-7 text-right">
                          {activeReport.dimensions.compliance}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy Directive & Rationale */}
                <div className="p-3 rounded-xl bg-[#0d101a] border border-[#1b2238] text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Diretriz Estratégica ({activeReport.priorityLabel})</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {QUADRANT_DEFINITIONS[activeReport.quadrant].strategy}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-2 pt-1.5 border-t border-[#181d2f]">
                    <strong className="text-zinc-400">Justificativa:</strong> {activeReport.rationale}
                  </p>
                </div>

                {/* Action Items List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                      Ações Recomendadas ao Pesquisador:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyActionItems}
                      className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedAction ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Ações</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeReport.actionItems.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-[#0c0e18] border border-[#1c2236] text-[11px] text-zinc-300 flex items-start gap-2"
                      >
                        <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="leading-tight">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button: View Full Report */}
              <div className="mt-5 pt-3 border-t border-[#1c2236] flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500">
                  ID: <span className="text-zinc-400">{activeReport.report.id}</span>
                </span>

                {onSelectReport && (
                  <button
                    type="button"
                    onClick={() => onSelectReport(activeReport.report)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/30 cursor-pointer"
                  >
                    <span>Ver Relatório Completo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#121522] border border-[#20273d] rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center text-zinc-500 font-mono text-xs">
              <ShieldAlert className="w-8 h-8 text-zinc-600 mb-2" />
              <span>Nenhum relatório selecionado para análise de quadrante.</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtered Reports Priority Queue Table */}
      <div className="p-4 sm:p-6 border-t border-[#1e2338] bg-[#0c0e17]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
              Fila Priorizada de Riscos ({filteredReports.length} relatórios)
            </h4>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar alvo, título, CWE ou plataforma..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#121522] border border-[#22283e] text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1b2136]">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="bg-[#121524] border-b border-[#1c2236] text-zinc-400 font-mono text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Prioridade</th>
                <th className="py-2.5 px-3 font-semibold">Vulnerabilidade</th>
                <th className="py-2.5 px-3 font-semibold">Alvo / Plataforma</th>
                <th className="py-2.5 px-3 text-center font-semibold">CVSS</th>
                <th className="py-2.5 px-3 text-center font-semibold">Impacto</th>
                <th className="py-2.5 px-3 text-center font-semibold">Índice Risco</th>
                <th className="py-2.5 px-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171c2c] font-mono bg-[#090b13]">
              {filteredReports.slice(0, 10).map((item) => {
                const isSelected = activeReport?.report.id === item.report.id;
                return (
                  <tr
                    key={item.report.id}
                    onClick={() => setSelectedReportId(item.report.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#181d2e]' : 'hover:bg-[#121522]'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.quadrantBorder} ${item.quadrantColor} bg-[#141724]`}
                      >
                        {item.priorityLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-zinc-200 max-w-[240px] truncate">
                      {item.report.title}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                      <span className="text-emerald-400 font-semibold">{item.report.target}</span> • {item.report.platform}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-white">
                      {item.cvssScore.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-400 font-semibold">
                      {item.businessImpactScore}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold text-[10px]">
                        {item.compositeRiskScore}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectReport) onSelectReport(item.report);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-sans flex items-center justify-end gap-1 ml-auto cursor-pointer"
                      >
                        <span>Detalhes</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Component Footer */}
      <div className="p-4 border-t border-[#1e2338] bg-[#0c0e17] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>
            {evaluatedReports.length} relatórios avaliados na Matriz de Prioridade de Risco (CVSS vs Impacto ao Negócio)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="text-xs text-rose-300 hover:text-white transition-colors flex items-center gap-1 font-mono font-semibold cursor-pointer"
            >
              <span>Ver Todos os Relatórios</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onNewReport && (
            <button
              type="button"
              onClick={onNewReport}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold font-mono text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/30 cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              <span>Novo Relatório</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
