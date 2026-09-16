import React, { useState, useMemo } from 'react';
import {
  Activity,
  ShieldCheck,
  Key,
  TrendingUp,
  Plus,
  DollarSign,
  ExternalLink,
  FileText,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Sparkles,
  GitCommit,
  Calendar,
  Layers,
  Award,
  Send
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus, TimelineEvent } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

export type SystemActionType = 
  | 'all'
  | 'creation' 
  | 'status_change' 
  | 'pgp_signature' 
  | 'bounty' 
  | 'dispatch' 
  | 'note';

export interface UnifiedSystemAction {
  id: string;
  uniqueKey: string;
  date: string;
  timestamp: number;
  type: 'creation' | 'status_change' | 'pgp_signature' | 'bounty' | 'dispatch' | 'note';
  title: string;
  notes?: string;
  reportId: string;
  reportTitle: string;
  reportTarget: string;
  reportPlatform: string;
  reportSeverity: Severity;
  reportStatus: ReportStatus;
  report: VulnerabilityReport;
  bountyAmount?: number;
  hoursSpent?: number;
  pgpKeyFingerprint?: string;
  pgpSignedAt?: string;
}

interface DashboardActivityTimelineProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  onNewReport?: () => void;
}

export const DashboardActivityTimeline: React.FC<DashboardActivityTimelineProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  onNewReport
}) => {
  // Filters
  const [selectedType, setSelectedType] = useState<SystemActionType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [copiedFingerprint, setCopiedFingerprint] = useState<string | null>(null);

  // Aggregate unified system-wide actions from reports & timeline events & PGP signatures
  const allActions: UnifiedSystemAction[] = useMemo(() => {
    const actions: UnifiedSystemAction[] = [];
    const seenPgpReports = new Set<string>();

    reports.forEach((report) => {
      const timelineEvents = report.timeline || [];

      // 1. Map existing timeline events
      timelineEvents.forEach((evt) => {
        let type = evt.type || 'note';
        // Normalize PGP signatures if mentioned in title or notes
        if (
          type === 'pgp_signature' ||
          evt.title.toLowerCase().includes('pgp') ||
          evt.title.toLowerCase().includes('assinad') ||
          (evt.notes && evt.notes.toLowerCase().includes('fingerprint'))
        ) {
          type = 'pgp_signature';
          seenPgpReports.add(report.id);
        }

        const dateObj = new Date(evt.date);
        const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();

        actions.push({
          id: evt.id,
          uniqueKey: `${report.id}-${evt.id}-${evt.date}`,
          date: evt.date,
          timestamp,
          type: type as any,
          title: evt.title,
          notes: evt.notes,
          reportId: report.id,
          reportTitle: report.title,
          reportTarget: report.target,
          reportPlatform: report.platform,
          reportSeverity: report.severity,
          reportStatus: report.status,
          report,
          hoursSpent: evt.hoursSpent,
          bountyAmount: type === 'bounty' ? report.bountyAmount : undefined,
          pgpKeyFingerprint: report.pgpSignature?.keyFingerprint,
          pgpSignedAt: report.pgpSignature?.signedAt
        });
      });

      // 2. Synthesize PGP signature event if report has pgpSignature and no timeline event captured it
      if (report.pgpSignature && !seenPgpReports.has(report.id)) {
        const signedDate = report.pgpSignature.signedAt 
          ? report.pgpSignature.signedAt.split('T')[0] 
          : report.updatedAt || report.createdAt;
        const dateObj = new Date(report.pgpSignature.signedAt || report.updatedAt || report.createdAt);

        actions.push({
          id: `pgp-${report.id}`,
          uniqueKey: `${report.id}-pgp-${report.pgpSignature.keyFingerprint}`,
          date: signedDate,
          timestamp: isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime(),
          type: 'pgp_signature',
          title: 'Assinatura Criptográfica PGP Registrada',
          notes: `Relatório assinado e blindado digitalmente com chave PGP. Fingerprint: ${report.pgpSignature.keyFingerprint}`,
          reportId: report.id,
          reportTitle: report.title,
          reportTarget: report.target,
          reportPlatform: report.platform,
          reportSeverity: report.severity,
          reportStatus: report.status,
          report,
          pgpKeyFingerprint: report.pgpSignature.keyFingerprint,
          pgpSignedAt: report.pgpSignature.signedAt
        });
      }

      // 3. Fallback: if report has NO timeline events at all, add report creation action
      if (timelineEvents.length === 0) {
        const createDate = report.createdAt || new Date().toISOString().split('T')[0];
        const dateObj = new Date(createDate);

        actions.push({
          id: `create-${report.id}`,
          uniqueKey: `${report.id}-initial-creation`,
          date: createDate,
          timestamp: isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime(),
          type: 'creation',
          title: `Relatório Registrado (${report.vulnerabilityType})`,
          notes: `Novo achado cadastrado no Sentinel Workbench direcionado a ${report.target}.`,
          reportId: report.id,
          reportTitle: report.title,
          reportTarget: report.target,
          reportPlatform: report.platform,
          reportSeverity: report.severity,
          reportStatus: report.status,
          report
        });
      }
    });

    // Sort chronologically descending (newest first)
    return actions.sort((a, b) => b.timestamp - a.timestamp);
  }, [reports]);

  // Copy fingerprint helper
  const handleCopyFingerprint = (fingerprint: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fingerprint);
    setCopiedFingerprint(fingerprint);
    setTimeout(() => setCopiedFingerprint(null), 2000);
  };

  // Filtered actions
  const filteredActions = useMemo(() => {
    const now = Date.now();
    const daysLimit = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 0;
    const minTimestamp = daysLimit > 0 ? now - daysLimit * 24 * 60 * 60 * 1000 : 0;

    return allActions.filter((action) => {
      // Type filter
      if (selectedType !== 'all' && action.type !== selectedType) {
        return false;
      }

      // Date range filter
      if (minTimestamp > 0 && action.timestamp < minTimestamp) {
        return false;
      }

      // Search keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = action.title.toLowerCase().includes(q);
        const matchesNotes = (action.notes || '').toLowerCase().includes(q);
        const matchesReportTitle = action.reportTitle.toLowerCase().includes(q);
        const matchesId = action.reportId.toLowerCase().includes(q);
        const matchesTarget = action.reportTarget.toLowerCase().includes(q);
        const matchesFingerprint = (action.pgpKeyFingerprint || '').toLowerCase().includes(q);

        if (!matchesTitle && !matchesNotes && !matchesReportTitle && !matchesId && !matchesTarget && !matchesFingerprint) {
          return false;
        }
      }

      return true;
    });
  }, [allActions, selectedType, dateRange, searchQuery]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = allActions.length;
    const creations = allActions.filter(a => a.type === 'creation').length;
    const statusChanges = allActions.filter(a => a.type === 'status_change').length;
    const pgpSignatures = allActions.filter(a => a.type === 'pgp_signature').length;
    const bounties = allActions.filter(a => a.type === 'bounty').length;

    return { total, creations, statusChanges, pgpSignatures, bounties };
  }, [allActions]);

  // Action Visual Styling Helper
  const getActionVisuals = (type: string) => {
    switch (type) {
      case 'pgp_signature':
        return {
          icon: ShieldCheck,
          label: 'Assinatura PGP',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-400 border-emerald-300 ring-emerald-500/20',
          lineClass: 'border-emerald-500/40',
          iconBg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        };
      case 'bounty':
        return {
          icon: DollarSign,
          label: 'Bounty & Payout',
          badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dotClass: 'bg-emerald-400 border-emerald-300 ring-emerald-500/20',
          lineClass: 'border-emerald-500/40',
          iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        };
      case 'status_change':
        return {
          icon: TrendingUp,
          label: 'Mudança de Status',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-400 border-amber-300 ring-amber-500/20',
          lineClass: 'border-amber-500/40',
          iconBg: 'bg-amber-500/10 border-amber-500/25 text-amber-400'
        };
      case 'creation':
        return {
          icon: Plus,
          label: 'Novo Relatório',
          badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          dotClass: 'bg-sky-400 border-sky-300 ring-sky-500/20',
          lineClass: 'border-sky-500/40',
          iconBg: 'bg-sky-500/10 border-sky-500/25 text-sky-400'
        };
      case 'dispatch':
        return {
          icon: Send,
          label: 'Despacho Externo',
          badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          dotClass: 'bg-cyan-400 border-cyan-300 ring-cyan-500/20',
          lineClass: 'border-cyan-500/40',
          iconBg: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400'
        };
      case 'note':
      default:
        return {
          icon: FileText,
          label: 'Anotação / Triage',
          badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dotClass: 'bg-purple-400 border-purple-300 ring-purple-500/20',
          lineClass: 'border-purple-500/40',
          iconBg: 'bg-purple-500/10 border-purple-500/25 text-purple-400'
        };
    }
  };

  return (
    <div id="dashboard-activity-timeline-card" className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-xl mb-8">
      {/* 1. Card Header with Activity Pulse & Navigation */}
      <div className="p-4 sm:p-6 border-b border-[#262626] bg-[#0d0f17]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide font-mono">
                    Dashboard Activity Timeline
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    UNIFIED FEED
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Histórico unificado de ações do sistema: novos relatórios, alterações de status, assinaturas criptográficas PGP e concessão de recompensas
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Relatório</span>
              </button>
            )}

            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="px-3 py-1.5 rounded-lg bg-[#141724] hover:bg-[#1b2033] border border-[#232738] text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
              >
                <span>Ver Todos Relatórios</span>
                <ArrowRight className="w-3 h-3 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Executive Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-[#1e2335]">
          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-[#22273d]">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Total de Ações</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-white">{metrics.total}</span>
              <span className="text-[10px] font-mono text-zinc-400">eventos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-sky-500/20">
            <p className="text-[10px] font-mono text-sky-400 uppercase">Novos Relatórios</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-sky-400">{metrics.creations}</span>
              <span className="text-[10px] font-mono text-zinc-400">submetidos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-amber-500/20">
            <p className="text-[10px] font-mono text-amber-400 uppercase">Mudanças de Status</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-amber-400">{metrics.statusChanges}</span>
              <span className="text-[10px] font-mono text-zinc-400">transições</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-emerald-500/20">
            <p className="text-[10px] font-mono text-emerald-400 uppercase">Assinaturas PGP</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-emerald-400">{metrics.pgpSignatures}</span>
              <span className="text-[10px] font-mono text-zinc-400">blindados</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-emerald-500/20">
            <p className="text-[10px] font-mono text-emerald-300 uppercase">Bounties Concedidos</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-emerald-300">{metrics.bounties}</span>
              <span className="text-[10px] font-mono text-zinc-400">pagamentos</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter Toolbar */}
      <div className="p-3 sm:px-6 bg-[#0a0c14] border-b border-[#1f2436] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Action Type Pills */}
        <div className="flex items-center gap-1 bg-[#131625] border border-[#23283c] rounded-lg p-0.5 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
              selectedType === 'all'
                ? 'bg-zinc-800 text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todas ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('creation')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedType === 'creation'
                ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus className="w-3 h-3 text-sky-400" />
            <span>Criados ({metrics.creations})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('status_change')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedType === 'status_change'
                ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>Status ({metrics.statusChanges})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('pgp_signature')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedType === 'pgp_signature'
                ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>PGP ({metrics.pgpSignatures})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('bounty')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedType === 'bounty'
                ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span>Bounties ({metrics.bounties})</span>
          </button>
        </div>

        {/* Search & Date Range */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-[#131625] border border-[#23283c] rounded-lg px-2.5 py-1 text-zinc-300 focus:outline-none focus:border-emerald-500/50 text-[11px]"
          >
            <option value="all">Todo o Histórico</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          {/* Search Input */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ação, alvo, ID ou PGP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141726] border border-[#23283c] rounded-lg pl-8 pr-3 py-1 text-zinc-300 placeholder-zinc-500 text-xs focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* 4. Scrollable Unified History Feed */}
      <div className="p-4 sm:p-6 bg-[#0e1017]">
        {filteredActions.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 font-mono text-xs">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-500" />
            <p className="font-bold text-white">Nenhuma atividade encontrada com os filtros selecionados.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedType('all');
                setDateRange('all');
                setSearchQuery('');
              }}
              className="mt-2 text-emerald-400 hover:underline"
            >
              Redefinir filtros de atividade
            </button>
          </div>
        ) : (
          <div className="max-h-[560px] overflow-y-auto pr-2 space-y-4">
            {/* Timeline container with vertical connector line */}
            <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#202538]">
              {filteredActions.map((action, idx) => {
                const visuals = getActionVisuals(action.type);
                const Icon = visuals.icon;
                const sevBadge = getSeverityBadgeColor(action.reportSeverity);
                const isPgp = action.type === 'pgp_signature';
                const isBounty = action.type === 'bounty';

                return (
                  <div
                    key={action.uniqueKey || `${action.id}-${idx}`}
                    className="relative mb-5 last:mb-0 group"
                  >
                    {/* Glowing Node on Timeline connector */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 ${visuals.dotClass} bg-[#0e1017] flex items-center justify-center shadow-md z-10 transition-transform group-hover:scale-110`}
                    >
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>

                    {/* Action Card Container */}
                    <div
                      onClick={() => onSelectReport(action.report)}
                      className={`border rounded-xl p-3.5 sm:p-4 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
                        action.reportSeverity === 'CRITICAL'
                          ? 'bg-gradient-to-r from-red-950/30 via-[#131627] to-[#101320] critical-vuln-card-glow-subtle'
                          : 'bg-[#101320] border-[#1e2338] hover:border-zinc-500/50 group-hover:bg-[#131726]'
                      }`}
                      title="Clique para inspecionar os detalhes deste relatório"
                    >
                      {action.reportSeverity === 'CRITICAL' && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                        </div>
                      )}
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#181d30]">
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                          {/* Action Type Badge */}
                          <span className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${visuals.badgeClass}`}>
                            <Icon className="w-3 h-3" />
                            <span>{visuals.label}</span>
                          </span>

                          {/* Report ID & Target */}
                          <span className="text-zinc-500">•</span>
                          <span className={`font-bold ${action.reportSeverity === 'CRITICAL' ? 'text-red-300' : 'text-zinc-300'}`}>{action.reportId}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400 font-medium truncate max-w-[180px]" title={action.reportTarget}>
                            {action.reportTarget}
                          </span>

                          {/* Platform Badge */}
                          <span className="px-1.5 py-0.5 rounded bg-[#161a29] text-zinc-400 border border-[#22283e]">
                            {action.reportPlatform}
                          </span>

                          {/* Severity & Status */}
                          <span className={`px-1.5 py-0.5 rounded font-bold ${sevBadge.bg} ${sevBadge.text} ${
                            action.reportSeverity === 'CRITICAL' ? 'border border-red-500/50 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''
                          }`}>
                            {action.reportSeverity}
                          </span>
                          <StatusBadge status={action.reportStatus} size="xs" />
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 shrink-0">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{action.date}</span>
                        </div>
                      </div>

                      {/* Main Content Row */}
                      <div className="mt-2.5 flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Event Title */}
                          <h4 className="text-sm font-bold text-white font-mono leading-snug group-hover:text-emerald-400 transition-colors">
                            {action.title}
                          </h4>

                          {/* Report Name Reference */}
                          <p className="text-xs text-zinc-400 font-mono mt-0.5 line-clamp-1">
                            <span className="text-zinc-500">Alvo:</span> {action.reportTitle}
                          </p>

                          {/* Notes / Description */}
                          {action.notes && (
                            <p className="mt-2 text-xs font-mono text-zinc-300 leading-relaxed bg-[#0b0d18] p-2.5 rounded-lg border border-[#1a2034]">
                              {action.notes}
                            </p>
                          )}

                          {/* PGP Specific Metadata Display */}
                          {isPgp && action.pgpKeyFingerprint && (
                            <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-emerald-300">
                              <div className="flex items-center gap-2 min-w-0">
                                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-zinc-400">Fingerprint:</span>
                                <span className="font-bold text-emerald-400 truncate max-w-[280px]">
                                  {action.pgpKeyFingerprint}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleCopyFingerprint(action.pgpKeyFingerprint!, e)}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-colors"
                                title="Copiar Fingerprint PGP"
                              >
                                {copiedFingerprint === action.pgpKeyFingerprint ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copiar Chave</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right Highlights & Action Button */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 pt-2 md:pt-0">
                          {/* Bounty Amount Badge if applicable */}
                          {isBounty && action.bountyAmount && action.bountyAmount > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1 shadow-sm">
                              <DollarSign className="w-3 h-3" />
                              <span>+{formatCurrency(action.bountyAmount, action.report.currency || 'USD')}</span>
                            </span>
                          )}

                          {/* Hours Spent if applicable */}
                          {action.hoursSpent !== undefined && action.hoursSpent > 0 && (
                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              <span>{action.hoursSpent}h dedicadas</span>
                            </span>
                          )}

                          {/* Inspect Button */}
                          <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                            <span>Inspecionar</span>
                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Audit Information */}
        <div className="mt-4 pt-3 border-t border-[#1c2033] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Feed auditável de integridade: todas as mutações de status, submissões e assinaturas PGP são indexadas automaticamente.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>Exibindo {filteredActions.length} de {allActions.length} eventos</span>
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="text-emerald-400 hover:underline"
              >
                Gerenciar relatórios completos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
