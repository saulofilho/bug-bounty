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
  Check
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

export interface EvaluatedPriorityReport {
  report: VulnerabilityReport;
  cvssScore: number;
  businessImpactScore: number; // 0 to 100
  businessImpactRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  quadrant: QuadrantType;
  quadrantTitle: string;
  quadrantColor: string;
  quadrantBg: string;
  quadrantBorder: string;
  priorityLabel: string;
  actionItems: string[];
  rationale: string;
  xPercent: number; // 0 to 100 (CVSS mapped)
  yPercent: number; // 0 to 100 (Business Impact mapped)
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
    description: 'Ameaças severas com capacidade de exploração imediata e dano direto ao core business.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    headerBg: 'bg-rose-950/40',
    border: 'border-rose-500/30',
    lightBg: 'bg-rose-950/15',
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
    border: 'border-orange-500/30',
    lightBg: 'bg-orange-950/15',
    textColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    strategy: 'Demonstrar impacto comercial concreto na triagem para justificar bonificação e prioridade de correção.'
  },
  MEDIUM_P2: {
    code: 'P2',
    title: 'Média (Contenção Técnica)',
    subtitle: 'Alto CVSS (≥7.0) + Menor Impacto de Negócio (<60)',
    description: 'Vulnerabilidades tecnicamente complexas ou agressivas, porém confinadas a ambientes isolados ou ativos secundários.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    headerBg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    lightBg: 'bg-amber-950/15',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    strategy: 'Verificar possibilidades de encadeamento (chaining) com outros endpoints e acompanhar patch padrão.'
  },
  LOW_P3: {
    code: 'P3',
    title: 'Baixa (Fila de Manutenção)',
    subtitle: 'Baixo/Médio CVSS (<7.0) + Menor Impacto de Negócio (<60)',
    description: 'Itens informativos, headers ausentes ou falhas pontuais de baixa probabilidade sem exposição direta de dados.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    headerBg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    lightBg: 'bg-blue-950/15',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
    strategy: 'Manter em monitoramento passivo ou agrupar como achados secundários em relatórios abrangentes.'
  }
};

/**
 * Computes business impact score (0 to 100) based on textual content, CVSS vectors, and rewards
 */
function evaluateBusinessImpact(report: VulnerabilityReport): {
  score: number;
  rating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
} {
  let score = 30; // Baseline
  const text = `${report.title} ${report.businessImpact || ''} ${report.summary || ''} ${report.vulnerabilityType || ''}`.toLowerCase();
  const cvss = parseCvssVector(report.cvssVector || '');

  // 1. Core Data Impact
  if (cvss.c === 'H') score += 25;
  else if (cvss.c === 'L') score += 12;

  if (cvss.i === 'H') score += 20;
  else if (cvss.i === 'L') score += 10;

  if (cvss.a === 'H') score += 15;

  // 2. High Impact Keyword triggers
  if (/vazamento|dump|pii|cpf|cartao|credit card|senha|password|credencia|token|secret|database|banco de dados/i.test(text)) {
    score += 20;
  }
  if (/transa|pagamento|payment|saldo|wallet|carteira|fraude|transfer|financeir/i.test(text)) {
    score += 25;
  }
  if (/rce|remote code|execu|takeover|admin|root|superuser|escalação de privilégio|privilege escalation/i.test(text)) {
    score += 20;
  }
  if (/lgpd|gdpr|pci-dss|compliance|regulat/i.test(text)) {
    score += 15;
  }

  // 3. Bounty financial indicator
  if (report.bountyAmount >= 4000) score += 20;
  else if (report.bountyAmount >= 1500) score += 10;

  // Clamp 0 to 100
  const finalScore = Math.min(100, Math.max(10, score));

  let rating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let rationale = 'Impacto restrito a dados locais ou configurações não sensíveis.';

  if (finalScore >= 75) {
    rating = 'CRITICAL';
    rationale = 'Risco crítico de vazamento massivo de PII, fraude transacional ou sequestro de infraestrutura.';
  } else if (finalScore >= 55) {
    rating = 'HIGH';
    rationale = 'Exposição de dados sensíveis ou comprometimento de lógica corporativa essencial.';
  } else if (finalScore >= 35) {
    rating = 'MEDIUM';
    rationale = 'Impacto moderado restrito a operações secundárias ou indisponibilidade temporária.';
  }

  return { score: finalScore, rating, rationale };
}

/**
 * Derives researcher action items based on status, severity, and quadrant
 */
function deriveActionItems(report: VulnerabilityReport, quadrant: QuadrantType): string[] {
  const items: string[] = [];

  switch (quadrant) {
    case 'CRITICAL_P0':
      if (report.status === 'DRAFT' || report.status === 'SUBMITTED') {
        items.push('Validar e estabilizar script de PoC para assegurar 100% de reprodutibilidade.');
        items.push('Adicionar vídeo demonstrativo ou gravação de tela com headers HTTP explícitos.');
        items.push('Destacar risco imediato no resumo executivo para triagem em menos de 24h.');
      } else if (report.status === 'TRIAGED') {
        items.push('Monitorar tickets de remediação e solicitar estimativa de SLA ao program manager.');
        items.push('Preparar ambiente de reteste para validação assim que o patch for lançado.');
        items.push('Acompanhar enquadramento de recompensa conforme a tabela de bounties da plataforma.');
      } else if (report.status === 'RESOLVED' || report.status === 'REWARDED') {
        items.push('Executar reteste pós-deploy para assegurar ausência de bypass no patch.');
        items.push('Solicitar autorização de divulgação coordenada (Responsible Disclosure).');
      } else {
        items.push('Reavaliar escopo de mitigação e verificar persistência de artefatos.');
      }
      break;

    case 'HIGH_P1':
      items.push('Elaborar cenário realista de abuso comercial (Business Logic Proof of Concept).');
      items.push('Calcular exposição financeira potencial para justificar revisão de severidade.');
      items.push('Verificar se a falha afeta múltiplos tenants ou organizações na aplicação.');
      break;

    case 'MEDIUM_P2':
      items.push('Testar encadeamento (chaining) com endpoints vizinhos para elevar o impacto.');
      items.push('Inspecionar se parâmetros aceitam injeções secundárias ou escalada de contexto.');
      items.push('Acompanhar fila regular de triagem sem necessidade de escalação manual.');
      break;

    case 'LOW_P3':
      items.push('Arquivar documentação técnica como base de conhecimento para pesquisas futuras.');
      items.push('Avaliar inclusão como achado informativo complementar em auditoria periódica.');
      items.push('Verificar se o alvo ainda pertence ao escopo ativo de recompensas.');
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // 1. Evaluate and categorize all reports into quadrants
  const evaluatedReports: EvaluatedPriorityReport[] = useMemo(() => {
    return reports.map((report) => {
      const cvss = report.cvssScore || 0;
      const { score: biScore, rating: biRating, rationale } = evaluateBusinessImpact(report);

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

      // Coordinates for visual plot (x: CVSS 0-10 -> 0-100%, y: Impact 0-100 -> 0-100%)
      const xPercent = Math.min(95, Math.max(5, (cvss / 10) * 100));
      const yPercent = Math.min(95, Math.max(5, biScore));

      return {
        report,
        cvssScore: cvss,
        businessImpactScore: biScore,
        businessImpactRating: biRating,
        quadrant,
        quadrantTitle: qDef.title,
        quadrantColor: qDef.textColor,
        quadrantBg: qDef.lightBg,
        quadrantBorder: qDef.border,
        priorityLabel: qDef.code,
        actionItems,
        rationale,
        xPercent,
        yPercent
      };
    });
  }, [reports]);

  // 2. Filter reports by quadrant and search
  const filteredReports = useMemo(() => {
    return evaluatedReports.filter((item) => {
      if (selectedQuadrant !== 'ALL' && item.quadrant !== selectedQuadrant) {
        return false;
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
  }, [evaluatedReports, selectedQuadrant, searchQuery]);

  // Active highlighted report
  const activeReport = useMemo(() => {
    if (selectedReportId) {
      const found = evaluatedReports.find((r) => r.report.id === selectedReportId);
      if (found) return found;
    }
    return filteredReports.length > 0 ? filteredReports[0] : null;
  }, [evaluatedReports, filteredReports, selectedReportId]);

  // Quadrant distribution counts
  const quadrantCounts = useMemo(() => {
    const counts = {
      CRITICAL_P0: 0,
      HIGH_P1: 0,
      MEDIUM_P2: 0,
      LOW_P3: 0
    };
    evaluatedReports.forEach((r) => {
      counts[r.quadrant]++;
    });
    return counts;
  }, [evaluatedReports]);

  return (
    <div
      id="risk-priority-matrix-card"
      className="bg-[#0e1017] border border-[#1e2338] rounded-2xl overflow-hidden shadow-xl mb-8"
    >
      {/* Header Section */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#121522] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 via-orange-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Risk Priority Matrix</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1d2238] text-rose-300 border border-rose-500/30">
                  CVSS × Impacto de Negócio
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mapeamento visual em quatro quadrantes prioritários para direcionar as próximas ações estratégicas do pesquisador.
              </p>
            </div>
          </div>
        </div>

        {/* Quadrant Quick Filters */}
        <div className="flex items-center flex-wrap gap-1.5 bg-[#090b11] border border-[#1e2338] rounded-lg p-1 text-xs">
          <button
            id="rpm-filter-all-btn"
            type="button"
            onClick={() => setSelectedQuadrant('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              selectedQuadrant === 'ALL'
                ? 'bg-[#1e243a] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos ({evaluatedReports.length})
          </button>
          {(['CRITICAL_P0', 'HIGH_P1', 'MEDIUM_P2', 'LOW_P3'] as QuadrantType[]).map((q) => {
            const def = QUADRANT_DEFINITIONS[q];
            return (
              <button
                key={q}
                id={`rpm-filter-${def.code.toLowerCase()}-btn`}
                type="button"
                onClick={() => setSelectedQuadrant(q)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                  selectedQuadrant === q
                    ? `${def.badgeColor} border shadow-sm`
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${def.dotColor}`} />
                <span>{def.code}</span>
                <span className="opacity-70">({quadrantCounts[q]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#0c0e17] grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* P0 Priority */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-rose-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-bold">
              P0 • Ação Imediata
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
              URGENTE
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 flex items-center gap-1.5">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span>{quadrantCounts.CRITICAL_P0}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">CVSS ≥ 7.0 & Impacto ≥ 60</span>
        </div>

        {/* P1 Priority */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-orange-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-bold">
              P1 • Escalação
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-orange-950 text-orange-300 border border-orange-500/40">
              NEGÓCIO
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <span>{quadrantCounts.HIGH_P1}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Impacto de negócio dominante</span>
        </div>

        {/* P2 Priority */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-amber-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
              P2 • Contenção
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
              TÉCNICA
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 flex items-center gap-1.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>{quadrantCounts.MEDIUM_P2}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">CVSS elevado em alvo isolado</span>
        </div>

        {/* P3 Priority */}
        <div className="p-3.5 rounded-xl bg-[#121522] border border-blue-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold">
              P3 • Manutenção
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
              BACKLOG
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            <span>{quadrantCounts.LOW_P3}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Fila de baixa prioridade</span>
        </div>
      </div>

      {/* Main Grid: Visual Quadrant Diagram & Researcher Action Items Panel */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0a0c14]">
        {/* Left: 2x2 Interactive Quadrant Diagram */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                Diagrama de Dispersão dos Quadrantes
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              Eixo Y: Impacto de Negócio | Eixo X: CVSS Base
            </span>
          </div>

          {/* Visual Quadrant Container */}
          <div className="relative w-full h-[360px] sm:h-[400px] bg-[#0c0e18] border border-[#20273d] rounded-2xl p-4 overflow-hidden select-none">
            {/* 4 Quadrants Background Grid */}
            <div className="absolute inset-4 grid grid-cols-2 grid-rows-2 gap-1 pointer-events-none">
              {/* Top-Left: Quadrant P1 (High Impact, Low/Med CVSS) */}
              <div className="bg-orange-950/15 border border-orange-500/20 rounded-tl-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-500/30">
                    P1 • Escalação de Negócio
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">CVSS &lt; 7.0 | Impacto ≥ 60</span>
                </div>
                <div className="text-[9px] text-orange-300/60 font-mono">
                  {quadrantCounts.HIGH_P1} vulnerabilidades
                </div>
              </div>

              {/* Top-Right: Quadrant P0 (High Impact, High CVSS) */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-tr-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>P0 • Ação Imediata</span>
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">CVSS ≥ 7.0 | Impacto ≥ 60</span>
                </div>
                <div className="text-[9px] text-rose-300/70 font-mono font-bold">
                  {quadrantCounts.CRITICAL_P0} críticas
                </div>
              </div>

              {/* Bottom-Left: Quadrant P3 (Low Impact, Low CVSS) */}
              <div className="bg-blue-950/15 border border-blue-500/20 rounded-bl-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-500/30">
                    P3 • Fila de Manutenção
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">CVSS &lt; 7.0 | Impacto &lt; 60</span>
                </div>
                <div className="text-[9px] text-blue-300/60 font-mono">
                  {quadrantCounts.LOW_P3} itens
                </div>
              </div>

              {/* Bottom-Right: Quadrant P2 (Low Impact, High CVSS) */}
              <div className="bg-amber-950/15 border border-amber-500/20 rounded-br-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                    P2 • Contenção Técnica
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">CVSS ≥ 7.0 | Impacto &lt; 60</span>
                </div>
                <div className="text-[9px] text-amber-300/60 font-mono">
                  {quadrantCounts.MEDIUM_P2} técnicas
                </div>
              </div>
            </div>

            {/* Threshold Axis Dividers */}
            <div className="absolute top-4 bottom-4 left-[50%] w-[1px] bg-[#2d3754] pointer-events-none" />
            <div className="absolute left-4 right-4 top-[50%] h-[1px] bg-[#2d3754] pointer-events-none" />

            {/* Threshold markers */}
            <span className="absolute top-[48%] left-5 -translate-y-1/2 text-[9px] font-mono text-zinc-400 bg-[#0c0e18] px-1 border border-[#20273d] rounded pointer-events-none">
              Threshold Impacto (60)
            </span>
            <span className="absolute bottom-5 left-[50%] -translate-x-1/2 text-[9px] font-mono text-zinc-400 bg-[#0c0e18] px-1 border border-[#20273d] rounded pointer-events-none">
              Threshold CVSS (7.0)
            </span>

            {/* Render Report Nodes */}
            <div className="absolute inset-6">
              {evaluatedReports.map((item) => {
                const isSelected = activeReport?.report.id === item.report.id;
                // Compute position based on X (CVSS: 0-10 -> 0-100%) and Y (Impact: 0-100 -> inverted so top is 100%)
                const leftPercent = Math.min(94, Math.max(6, (item.cvssScore / 10) * 100));
                const topPercent = Math.min(94, Math.max(6, 100 - item.businessImpactScore));

                return (
                  <button
                    key={item.report.id}
                    type="button"
                    onClick={() => setSelectedReportId(item.report.id)}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className={`absolute p-1 rounded-full transition-all duration-200 group z-10 ${
                      isSelected
                        ? 'scale-150 ring-4 ring-white/30 z-30'
                        : 'hover:scale-125 hover:z-20'
                    }`}
                    title={`${item.report.title} (CVSS: ${item.cvssScore} | Impacto: ${item.businessImpactScore})`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 border-[#0c0e18] shadow-md flex items-center justify-center ${
                        item.quadrant === 'CRITICAL_P0'
                          ? 'bg-rose-500 shadow-rose-500/50'
                          : item.quadrant === 'HIGH_P1'
                          ? 'bg-orange-500 shadow-orange-500/50'
                          : item.quadrant === 'MEDIUM_P2'
                          ? 'bg-amber-500 shadow-amber-500/50'
                          : 'bg-blue-400 shadow-blue-400/50'
                      }`}
                    />

                    {/* Popover tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 rounded-lg bg-[#141824] border border-[#2b334d] text-left text-[10px] font-mono shadow-xl pointer-events-none z-40">
                      <div className="font-bold text-white truncate">{item.report.title}</div>
                      <div className="text-zinc-400 flex justify-between mt-1">
                        <span>CVSS: {item.cvssScore.toFixed(1)}</span>
                        <span className={item.quadrantColor}>{item.priorityLabel}</span>
                      </div>
                      <div className="text-zinc-400 flex justify-between">
                        <span>Impacto: {item.businessImpactScore}%</span>
                        <span className="text-emerald-400">
                          {item.report.bountyAmount > 0 ? formatCurrency(item.report.bountyAmount) : 'S/B'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Legend under chart */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> P0 Ação Imediata
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> P1 Escalação
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> P2 Contenção
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> P3 Fila Baixa
            </span>
          </div>
        </div>

        {/* Right: Selected Report Details & Prioritized Researcher Action Items */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ListTodo className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                Ações Prioritárias do Pesquisador
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
            <div className="bg-[#121522] border border-[#20273d] rounded-2xl p-4 sm:p-5 flex-1 flex flex-col justify-between shadow-lg">
              <div>
                {/* Report Identification */}
                <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-[#1c2236]">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        {activeReport.report.target}
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold border ${getSeverityBadgeColor(
                          activeReport.report.severity
                        )}`}
                      >
                        {activeReport.report.severity}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 bg-[#1c2136] px-1.5 py-0.2 rounded">
                        {activeReport.report.platform}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug">
                      {activeReport.report.title}
                    </h4>
                  </div>
                </div>

                {/* Score Breakdown (CVSS vs Business Impact) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-[#0c0e18] border border-[#1d2338]">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Score Técnico CVSS
                    </span>
                    <div className="text-lg font-bold font-mono text-white flex items-center justify-between mt-0.5">
                      <span>{activeReport.cvssScore.toFixed(1)}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">/ 10.0</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono truncate block mt-0.5">
                      {activeReport.report.cwe || 'CWE Não Mapeado'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0c0e18] border border-[#1d2338]">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Impacto de Negócio
                    </span>
                    <div className="text-lg font-bold font-mono text-rose-400 flex items-center justify-between mt-0.5">
                      <span>{activeReport.businessImpactScore}%</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Rating: {activeReport.businessImpactRating}</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-mono truncate block mt-0.5">
                      {activeReport.report.bountyAmount > 0
                        ? `Bounty: ${formatCurrency(activeReport.report.bountyAmount)}`
                        : 'Sem Bounty Confirmado'}
                    </span>
                  </div>
                </div>

                {/* Strategy Directive & Rationale */}
                <div className="p-3 rounded-xl bg-[#0d101a] border border-[#1b2238] mb-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Diretriz de Priorização ({activeReport.priorityLabel})</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {QUADRANT_DEFINITIONS[activeReport.quadrant].strategy}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1.5 pt-1.5 border-t border-[#181d2f]">
                    <strong className="text-zinc-400">Justificativa:</strong> {activeReport.rationale}
                  </p>
                </div>

                {/* Concrete Next Action Items Checklist */}
                <div>
                  <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                    Próximos Passos Recomendados:
                  </span>
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
                  Status: {activeReport.report.status}
                </span>

                {onSelectReport && (
                  <button
                    type="button"
                    onClick={() => onSelectReport(activeReport.report)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Abrir Relatório Completo</span>
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

      {/* Reports Filtered Queue Table */}
      <div className="p-4 sm:p-6 border-t border-[#1e2338] bg-[#0c0e17]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
              Fila de Itens Classificados ({filteredReports.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por alvo, título ou CWE..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#121522] border border-[#22283e] text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1c2236] text-zinc-400 font-mono text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Prioridade</th>
                <th className="py-2.5 px-3 font-semibold">Título da Vulnerabilidade</th>
                <th className="py-2.5 px-3 font-semibold">Alvo / Plataforma</th>
                <th className="py-2.5 px-3 text-center font-semibold">CVSS</th>
                <th className="py-2.5 px-3 text-center font-semibold">Impacto</th>
                <th className="py-2.5 px-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171c2c] font-mono">
              {filteredReports.slice(0, 8).map((item) => {
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
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectReport) onSelectReport(item.report);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-sans flex items-center justify-end gap-1 ml-auto"
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
      <div className="p-3.5 border-t border-[#1e2338] bg-[#0c0e17] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] font-mono">
            {evaluatedReports.length} relatórios classificados pela matriz de prioridade de risco
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="text-xs text-rose-300 hover:text-white transition-colors flex items-center gap-1 font-mono font-semibold"
            >
              <span>Ver Todos os Relatórios</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onNewReport && (
            <button
              type="button"
              onClick={onNewReport}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold font-mono text-xs transition-colors flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>Novo Relatório</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
