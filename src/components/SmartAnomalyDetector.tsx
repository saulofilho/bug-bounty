import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  GitPullRequest,
  Clock,
  DollarSign,
  CheckCircle2,
  Filter,
  Search,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Eye,
  Check,
  RotateCcw,
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { VulnerabilityReport, ReportStatus, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor, formatRelativeTimeAgo, getImpactCategoryTag } from '../utils/formatters';

export type AnomalyType = 
  | 'STATUS_JUMP' 
  | 'MISSING_DOCUMENTATION' 
  | 'STALE_TIMELINE' 
  | 'BOUNTY_DISCREPANCY' 
  | 'MISSING_TRACKING';

export type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DetectedAnomaly {
  id: string; // unique anomaly identifier
  reportId: string;
  report: VulnerabilityReport;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  recommendation: string;
  detectedAt: string;
  categoryLabel: string;
}

interface SmartAnomalyDetectorProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  onUpdateStatus?: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
}

export const SmartAnomalyDetector: React.FC<SmartAnomalyDetectorProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  onUpdateStatus
}) => {
  // Dismissed anomalies state stored in localStorage
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('smart_anomalies_dismissed');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [showDismissed, setShowDismissed] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>(() => 
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  // Algorithm to analyze report timelines, status progressions, and documentation integrity
  const detectedAnomalies: DetectedAnomaly[] = useMemo(() => {
    const list: DetectedAnomaly[] = [];
    const now = new Date().getTime();

    reports.forEach((report) => {
      const {
        id,
        title,
        status,
        timeline = [],
        stepsToReproduce = [],
        proofOfConcept,
        businessImpact,
        remediation,
        submissionId,
        submissionUrl,
        bountyAmount,
        createdAt,
        updatedAt
      } = report;

      const timelineTypes = timeline.map(t => t.type);
      const timelineTitles = timeline.map(t => (t.title || '').toLowerCase());
      const hasSubmissionEvent = timelineTypes.includes('creation') || timelineTypes.includes('dispatch') || timelineTitles.some(t => t.includes('enviado') || t.includes('submiss') || t.includes('submetido'));
      const hasTriageEvent = timelineTitles.some(t => t.includes('triado') || t.includes('triage') || t.includes('validado'));
      const hasRewardEvent = timelineTypes.includes('bounty') || timelineTitles.some(t => t.includes('recompensa') || t.includes('bounty') || t.includes('pago'));

      // 1. RULE: Sudden Status Jump (Salto Abrupto de Status)
      // Jumps directly to REWARDED or RESOLVED without submission or triage record
      if ((status === 'REWARDED' || status === 'RESOLVED') && !hasSubmissionEvent) {
        list.push({
          id: `anomaly-jump-nosub-${id}`,
          reportId: id,
          report,
          type: 'STATUS_JUMP',
          severity: 'CRITICAL',
          title: 'Salto Abrupto: Finalizado sem Envio Registrado',
          description: `O relatório está marcado como '${status}', mas a timeline não possui nenhum registro formal de submissão na plataforma ou despacho inicial.`,
          recommendation: 'Adicione o evento histórico de submissão na timeline com a data real e identificador de envio.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Transição de Status'
        });
      }

      if ((status === 'REWARDED' || status === 'RESOLVED') && timeline.length <= 1) {
        list.push({
          id: `anomaly-jump-fast-${id}`,
          reportId: id,
          report,
          type: 'STATUS_JUMP',
          severity: 'HIGH',
          title: 'Ciclo de Vida Anormalmente Resumido',
          description: `O relatório já atingiu o estado '${status}', porém possui apenas ${timeline.length} evento(s) na timeline. O fluxo padrão exige submissão, triagem e confirmação de pagamento.`,
          recommendation: 'Registre as etapas intermediárias (triagem pelo time de segurança e concessão do bounty) para métricas precisas.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Transição de Status'
        });
      }

      // Check chronological order of timeline events
      if (timeline.length > 1) {
        for (let idx = 0; idx < timeline.length - 1; idx++) {
          const t1 = new Date(timeline[idx].date).getTime();
          const t2 = new Date(timeline[idx + 1].date).getTime();
          if (!isNaN(t1) && !isNaN(t2) && t1 > t2) {
            list.push({
              id: `anomaly-chronological-${id}-${idx}`,
              reportId: id,
              report,
              type: 'STATUS_JUMP',
              severity: 'MEDIUM',
              title: 'Inconsistência Cronológica na Timeline',
              description: `Os eventos '${timeline[idx].title}' e '${timeline[idx + 1].title}' estão em ordem de data invertida (${timeline[idx].date} antes de ${timeline[idx + 1].date}).`,
              recommendation: 'Corrija as datas dos eventos da timeline para manter a ordem sequencial auditável.',
              detectedAt: new Date().toISOString(),
              categoryLabel: 'Transição de Status'
            });
            break;
          }
        }
      }

      // 2. RULE: Missing Documentation (Documentação Técnica Incompleta em Relatório Ativo)
      const isActiveReport = status === 'SUBMITTED' || status === 'TRIAGED' || status === 'REWARDED' || status === 'RESOLVED';
      
      // Missing Steps to Reproduce
      if (isActiveReport && (!stepsToReproduce || stepsToReproduce.length < 2)) {
        list.push({
          id: `anomaly-missing-steps-${id}`,
          reportId: id,
          report,
          type: 'MISSING_DOCUMENTATION',
          severity: 'HIGH',
          title: 'Passos de Reprodução Incompletos ou Ausentes',
          description: `Relatório com status '${status}' possui menos de 2 passos de reprodução cadastrados. Triadores exigem guias passo a passo claros para reprodução determinística.`,
          recommendation: 'Elabore passos detalhados (ex: 1. Autenticar com usuário X, 2. Enviar requisição POST com payload Y).',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Documentação Faltante'
        });
      }

      // Missing Proof of Concept (PoC)
      if (isActiveReport && (!proofOfConcept || proofOfConcept.trim().length === 0)) {
        list.push({
          id: `anomaly-missing-poc-${id}`,
          reportId: id,
          report,
          type: 'MISSING_DOCUMENTATION',
          severity: 'HIGH',
          title: 'Prova de Conceito (PoC) Não Registrada',
          description: `O relatório está ativo (${status}), mas o campo de Prova de Conceito (PoC / Requisição HTTP / Script) está vazio.`,
          recommendation: 'Anexe a requisição HTTP pura, payload funcional ou script cURL para comprovar a vulnerabilidade.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Documentação Faltante'
        });
      }

      // Missing Business Impact
      if (isActiveReport && (!businessImpact || businessImpact.trim().length < 20)) {
        list.push({
          id: `anomaly-missing-impact-${id}`,
          reportId: id,
          report,
          type: 'MISSING_DOCUMENTATION',
          severity: 'MEDIUM',
          title: 'Impacto no Negócio Insuficiente',
          description: 'A justificativa de impacto comercial e confidencialidade está ausente ou excessivamente resumida, o que costuma levar a triagens com severidade rebaixada.',
          recommendation: 'Explique detalhadamente quais dados de clientes ou sistemas podem ser comprometidos em caso de exploração real.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Documentação Faltante'
        });
      }

      // 3. RULE: Missing Submission Tracking (Rastreabilidade Externa)
      if (isActiveReport && !submissionId && !submissionUrl) {
        list.push({
          id: `anomaly-missing-tracking-${id}`,
          reportId: id,
          report,
          type: 'MISSING_TRACKING',
          severity: 'LOW',
          title: 'Identificador Externo de Submissão Ausente',
          description: `O relatório está em andamento na plataforma ${report.platform}, mas não possui o ID de submissão (ex: #123456) nem o link do relatório original.`,
          recommendation: 'Preencha o Submission ID ou a URL do relatório para viabilizar consultas cruzadas.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Rastreabilidade'
        });
      }

      // 4. RULE: Bounty & Financial Discrepancies
      if (status === 'REWARDED' && (!bountyAmount || bountyAmount <= 0)) {
        list.push({
          id: `anomaly-bounty-zero-${id}`,
          reportId: id,
          report,
          type: 'BOUNTY_DISCREPANCY',
          severity: 'HIGH',
          title: 'Status "Recompensado" com Valor Zerado ($0)',
          description: 'O relatório foi classificado como REWARDED, porém o valor da recompensa financeira está configurado como $0 ou vazio.',
          recommendation: 'Informe o montante pago pelo programa para que os cálculos de ganhos e ROI de pesquisa fiquem corretos.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Discrepância Financeira'
        });
      }

      if (bountyAmount && bountyAmount > 0 && (status === 'DRAFT' || status === 'SUBMITTED')) {
        list.push({
          id: `anomaly-bounty-premature-${id}`,
          reportId: id,
          report,
          type: 'BOUNTY_DISCREPANCY',
          severity: 'MEDIUM',
          title: 'Recompensa Registrada em Relatório Não-Finalizado',
          description: `Valor de ${formatCurrency(bountyAmount, report.currency || 'USD')} atribuído a um relatório que ainda se encontra com status '${status}'.`,
          recommendation: 'Atualize o status do relatório para REWARDED ou confirme se o valor corresponde a uma estimativa provisória.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Discrepância Financeira'
        });
      }

      // 5. RULE: Stale Timeline & SLA Inactivity
      const reportDate = new Date(updatedAt || createdAt).getTime();
      const daysSinceUpdate = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24));

      if (status === 'SUBMITTED' && daysSinceUpdate >= 21) {
        list.push({
          id: `anomaly-stale-submitted-${id}`,
          reportId: id,
          report,
          type: 'STALE_TIMELINE',
          severity: 'HIGH',
          title: `Submissão sem Resposta de Triagem há ${daysSinceUpdate} dias`,
          description: `O relatório foi submetido há ${daysSinceUpdate} dias e ainda não recebeu validação ou triagem pelo programa. Atraso superior ao SLA usual.`,
          recommendation: 'Envie um ping formal e educado na plataforma solicitando atualização sobre o status da triagem.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Inatividade / SLA'
        });
      } else if (status === 'TRIAGED' && daysSinceUpdate >= 45) {
        list.push({
          id: `anomaly-stale-triaged-${id}`,
          reportId: id,
          report,
          type: 'STALE_TIMELINE',
          severity: 'MEDIUM',
          title: `Relatório Triado Estagnado há ${daysSinceUpdate} dias`,
          description: `Vulnerabilidade confirmada e triada pelo cliente há mais de 45 dias sem resolução ou atribuição de recompensa.`,
          recommendation: 'Consulte o triador para verificar se o patch foi implantado e solicite a liberação do bounty.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Inatividade / SLA'
        });
      }

      // Empty timeline
      if (timeline.length === 0) {
        list.push({
          id: `anomaly-empty-timeline-${id}`,
          reportId: id,
          report,
          type: 'STALE_TIMELINE',
          severity: 'MEDIUM',
          title: 'Timeline Vazia (Nenhum Evento Registrado)',
          description: 'O relatório não possui nenhum marco ou evento registrado em sua timeline de atividade.',
          recommendation: 'Adicione pelo menos o evento inicial de descoberta ou submissão.',
          detectedAt: new Date().toISOString(),
          categoryLabel: 'Inatividade / SLA'
        });
      }
    });

    return list;
  }, [reports]);

  // Dismiss / restore anomaly alert
  const toggleDismissAlert = (anomalyId: string) => {
    setDismissedAlerts(prev => {
      const updated = { ...prev, [anomalyId]: !prev[anomalyId] };
      try {
        localStorage.setItem('smart_anomalies_dismissed', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Re-run scan simulation
  const handleRescan = () => {
    setLastScanTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  };

  // Filtered alert list
  const filteredAnomalies = useMemo(() => {
    return detectedAnomalies.filter(item => {
      // Dismissed filter
      const isDismissed = !!dismissedAlerts[item.id];
      if (!showDismissed && isDismissed) return false;
      if (showDismissed && !isDismissed) return false;

      // Severity filter
      if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) return false;

      // Type filter
      if (selectedType !== 'ALL' && item.type !== selectedType) return false;

      // Search keyword
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesReport = item.report.title.toLowerCase().includes(query) || item.report.id.toLowerCase().includes(query) || item.report.target.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesReport) return false;
      }

      return true;
    });
  }, [detectedAnomalies, dismissedAlerts, showDismissed, selectedSeverity, selectedType, searchKeyword]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const total = detectedAnomalies.length;
    const activeAnomalies = detectedAnomalies.filter(a => !dismissedAlerts[a.id]);
    const criticalCount = activeAnomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount = activeAnomalies.filter(a => a.severity === 'HIGH').length;
    const mediumCount = activeAnomalies.filter(a => a.severity === 'MEDIUM').length;
    const lowCount = activeAnomalies.filter(a => a.severity === 'LOW').length;

    // Reports with at least one anomaly
    const reportsWithAnomalies = new Set(activeAnomalies.map(a => a.reportId)).size;
    const totalReports = reports.length;
    const healthyReports = Math.max(0, totalReports - reportsWithAnomalies);
    const healthScore = totalReports > 0 ? Math.round((healthyReports / totalReports) * 100) : 100;

    return {
      total: activeAnomalies.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      healthyReports,
      totalReports,
      healthScore,
      dismissedCount: Object.values(dismissedAlerts).filter(Boolean).length
    };
  }, [detectedAnomalies, dismissedAlerts, reports.length]);

  // Icon & color helper per anomaly type
  const getAnomalyTypeIcon = (type: AnomalyType) => {
    switch (type) {
      case 'STATUS_JUMP':
        return <GitPullRequest className="w-4 h-4 text-purple-400" />;
      case 'MISSING_DOCUMENTATION':
        return <FileWarning className="w-4 h-4 text-amber-400" />;
      case 'STALE_TIMELINE':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'BOUNTY_DISCREPANCY':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'MISSING_TRACKING':
      default:
        return <AlertCircle className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getSeverityStyle = (sev: AnomalySeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          badgeBg: 'bg-red-500/15',
          badgeText: 'text-red-400',
          badgeBorder: 'border-red-500/30',
          borderLeft: 'border-l-red-500',
          label: 'CRÍTICA'
        };
      case 'HIGH':
        return {
          badgeBg: 'bg-orange-500/15',
          badgeText: 'text-orange-400',
          badgeBorder: 'border-orange-500/30',
          borderLeft: 'border-l-orange-500',
          label: 'ALTA'
        };
      case 'MEDIUM':
        return {
          badgeBg: 'bg-yellow-500/15',
          badgeText: 'text-yellow-400',
          badgeBorder: 'border-yellow-500/30',
          borderLeft: 'border-l-yellow-500',
          label: 'MÉDIA'
        };
      case 'LOW':
      default:
        return {
          badgeBg: 'bg-blue-500/15',
          badgeText: 'text-blue-400',
          badgeBorder: 'border-blue-500/30',
          borderLeft: 'border-l-blue-500',
          label: 'AVISO'
        };
    }
  };

  return (
    <div id="smart-anomaly-detector-card" className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-xl mb-8">
      {/* 1. Card Header */}
      <div className="p-4 sm:p-6 border-b border-[#262626] bg-[#0d0f17]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide font-mono">
                    Smart Anomaly Detector
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    TIMELINE & AUDIT
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Análise contínua das timelines e documentação dos relatórios para identificar saltos irregulares de status, lacunas de dados e violações de SLA
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRescan}
              className="px-2.5 py-1.5 rounded-lg bg-[#141724] hover:bg-[#1c2133] border border-[#232738] text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Re-analisar todas as timelines"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Verificado às {lastScanTime}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDismissed(!showDismissed)}
              className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-1.5 transition-all ${
                showDismissed
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-[#141724] text-zinc-400 border-[#232738] hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showDismissed ? 'Ver Ativas' : `Revisadas (${metrics.dismissedCount})`}</span>
            </button>
          </div>
        </div>

        {/* 2. Executive Health & Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-[#1e2335]">
          {/* Health Score */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-[#22273d]">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Saúde dos Relatórios</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-mono font-bold ${metrics.healthScore >= 80 ? 'text-emerald-400' : metrics.healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {metrics.healthScore}%
              </span>
              <span className="text-[10px] font-mono text-zinc-400">íntegros</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              {metrics.healthyReports} de {metrics.totalReports} relatórios sem falhas
            </div>
          </div>

          {/* Critical Anomalies */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-red-500/20">
            <p className="text-[10px] font-mono text-red-400 uppercase font-bold">Críticas</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-red-400">{metrics.criticalCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">anomalias</span>
            </div>
            <div className="text-[10px] font-mono text-red-300/80 mt-0.5">Exigem intervenção imediata</div>
          </div>

          {/* High Anomalies */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-orange-500/20">
            <p className="text-[10px] font-mono text-orange-400 uppercase font-bold">Altas</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-orange-400">{metrics.highCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">anomalias</span>
            </div>
            <div className="text-[10px] font-mono text-orange-300/80 mt-0.5">Saltos / PoC faltante</div>
          </div>

          {/* Medium Anomalies */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-yellow-500/20">
            <p className="text-[10px] font-mono text-yellow-400 uppercase font-bold">Médias</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-yellow-400">{metrics.mediumCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">alertas</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Impacto / Estagnação</div>
          </div>

          {/* Low / Notice */}
          <div className="p-3 rounded-lg bg-[#141724]/80 border border-blue-500/20">
            <p className="text-[10px] font-mono text-blue-400 uppercase font-bold">Avisos / Baixa</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-blue-400">{metrics.lowCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">observações</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Rastreamento externo</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="p-3 sm:px-6 bg-[#0a0c14] border-b border-[#1f2436] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Search input */}
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar anomalias por alvo, falha..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-[#141726] border border-[#23283c] rounded-lg pl-8 pr-3 py-1 text-zinc-300 placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[#131625] border border-[#23283c] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setSelectedSeverity('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedSeverity === 'ALL' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity('CRITICAL')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedSeverity === 'CRITICAL' ? 'bg-red-500/30 text-red-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Críticas
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity('HIGH')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedSeverity === 'HIGH' ? 'bg-orange-500/30 text-orange-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Altas
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity('MEDIUM')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedSeverity === 'MEDIUM' ? 'bg-yellow-500/30 text-yellow-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Médias
            </button>
          </div>

          {/* Category Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#131625] border border-[#23283c] rounded-lg px-2.5 py-1 text-zinc-300 focus:outline-none focus:border-amber-500/50 text-[11px]"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="STATUS_JUMP">Salto de Status na Timeline</option>
            <option value="MISSING_DOCUMENTATION">Documentação Faltante</option>
            <option value="STALE_TIMELINE">Inatividade / Alerta de SLA</option>
            <option value="BOUNTY_DISCREPANCY">Discrepância Financeira</option>
            <option value="MISSING_TRACKING">Rastreamento de Submissão</option>
          </select>
        </div>
      </div>

      {/* 4. Simple Alert List */}
      <div className="p-4 sm:p-6 bg-[#0e1017]">
        {filteredAnomalies.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 font-mono text-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              {showDismissed ? 'Nenhuma anomalia arquivada como revisada' : 'Nenhuma anomalia detectada no momento'}
            </h4>
            <p className="text-zinc-500 max-w-md mx-auto text-[11px]">
              {showDismissed
                ? 'Você ainda não marcou nenhuma anomalia como revisada.'
                : 'Todas as timelines, sequências de status e documentações técnicas dos seus relatórios estão em conformidade com as boas práticas de bug bounty.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnomalies.map((anomaly) => {
              const sevStyle = getSeverityStyle(anomaly.severity);
              const isDismissed = !!dismissedAlerts[anomaly.id];
              const isCritical = anomaly.severity === 'CRITICAL' || anomaly.report.severity === 'CRITICAL';

              return (
                <div
                  key={anomaly.id}
                  className={`${
                    isCritical 
                      ? 'bg-gradient-to-r from-red-950/25 via-[#131627] to-[#101320] critical-vuln-card-glow-subtle' 
                      : 'bg-[#101320] border-[#1e2338]'
                  } border border-l-4 ${sevStyle.borderLeft} rounded-r-xl rounded-l-sm p-4 transition-all duration-200 hover:border-zinc-500/40 shadow-sm relative overflow-hidden`}
                >
                  {isCritical && (() => {
                    const impactTag = getImpactCategoryTag(anomaly.report);
                    return (
                      <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none z-10">
                        <span 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${impactTag.bg} ${impactTag.text} border ${impactTag.border}`}
                          title={`Impact Category / Attack Vector: ${impactTag.label}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${impactTag.dotColor}`} />
                          <span>{impactTag.label}</span>
                        </span>
                        <div className="critical-corner-badge flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-red-600 border border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.85)]">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                          </span>
                          <span className="text-[8px] font-mono font-black uppercase tracking-wider text-white">
                            CRITICAL
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left Icon & Main Anomaly Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-[#161a2b] border border-[#232942] shrink-0 mt-0.5">
                        {getAnomalyTypeIcon(anomaly.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Tags Header */}
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono mb-1">
                          <span className={`px-2 py-0.5 rounded font-bold border ${sevStyle.badgeBg} ${sevStyle.badgeText} ${sevStyle.badgeBorder}`}>
                            {sevStyle.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#161928] text-zinc-400 border border-[#242940]">
                            {anomaly.categoryLabel}
                          </span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400 font-bold">{anomaly.report.id}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-300 font-medium truncate max-w-[160px]" title={anomaly.report.target}>
                            {anomaly.report.target}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px]">
                            {anomaly.report.status}
                          </span>
                          {isCritical && (
                            <span 
                              className="px-1.5 py-0.5 rounded bg-red-950/70 text-red-300 border border-red-500/40 text-[9px] font-mono font-medium inline-flex items-center gap-1 shadow-sm"
                              title={`Criado em: ${anomaly.report.createdAt}`}
                            >
                              <Clock className="w-2.5 h-2.5 text-red-400 shrink-0" />
                              <span>{formatRelativeTimeAgo(anomaly.report.createdAt)}</span>
                            </span>
                          )}
                        </div>

                        {/* Anomaly Title */}
                        <h4 className="text-sm font-bold text-white font-mono leading-snug">
                          {anomaly.title}
                        </h4>

                        {/* Detailed Description */}
                        <p className="mt-1 text-xs font-mono text-zinc-300 leading-relaxed">
                          {anomaly.description}
                        </p>

                        {/* Actionable Recommendation Box */}
                        <div className="mt-2.5 p-2 rounded-lg bg-[#090b14] border border-[#1b2034] text-[11px] font-mono text-zinc-400 flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">
                            <strong className="text-zinc-200">Ação Sugerida: </strong>
                            {anomaly.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1a1e32]">
                      {isCritical && onUpdateStatus && anomaly.report.status !== 'TRIAGED' && (
                        <button
                          id={`btn-quick-triage-anomaly-${anomaly.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(anomaly.report.id, 'TRIAGED');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 active:scale-[0.98] text-blue-200 hover:text-white border border-blue-500/50 hover:border-blue-400 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_8px_rgba(59,130,246,0.3)] cursor-pointer"
                          title="Transição rápida de status para TRIAGED com 1 clique"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Quick Triage</span>
                        </button>
                      )}

                      {onSelectReport && (
                        <button
                          type="button"
                          onClick={() => onSelectReport(anomaly.report)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                          title="Abrir detalhes e timeline do relatório"
                        >
                          <span>Inspecionar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleDismissAlert(anomaly.id)}
                        className="px-2.5 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                        title={isDismissed ? 'Restaurar para lista ativa' : 'Marcar anomalia como revisada'}
                      >
                        {isDismissed ? (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Marcar Revisado</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
