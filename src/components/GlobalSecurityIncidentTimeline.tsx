import React, { useState, useMemo } from 'react';
import {
  Clock,
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  DollarSign,
  Lock,
  ArrowUpDown,
  Layers,
  Sparkles,
  Zap,
  Activity,
  FileText,
  Download,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { VulnerabilityReport, Severity, ReportStatus, TimelineEvent } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';

export type IncidentPhase = 'all' | 'discovery' | 'triage' | 'remediation' | 'bounty' | 'pgp' | 'note';

export interface AggregatedIncidentEvent {
  id: string;
  uniqueKey: string;
  date: string;
  timestamp: number;
  phase: IncidentPhase;
  phaseLabel: string;
  title: string;
  notes?: string;
  hoursSpent?: number;
  report: VulnerabilityReport;
  reportId: string;
  reportTitle: string;
  target: string;
  platform: string;
  severity: Severity;
  status: ReportStatus;
  cvssScore: number;
  cwe: string;
  bountyAmount?: number;
}

export interface GlobalSecurityIncidentTimelineProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  onNewReport?: () => void;
}

export const GlobalSecurityIncidentTimeline: React.FC<GlobalSecurityIncidentTimelineProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  onNewReport
}) => {
  // State for filters, search and view modes
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<IncidentPhase>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = newest first, asc = oldest first
  const [viewMode, setViewMode] = useState<'timeline' | 'trends'>('timeline');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // 1. Extract and aggregate ALL timeline events across all reports
  const allIncidentEvents: AggregatedIncidentEvent[] = useMemo(() => {
    const list: AggregatedIncidentEvent[] = [];

    reports.forEach((report) => {
      const timelineEvents = report.timeline || [];

      // If a report has no explicit timeline, create at least a discovery event
      if (timelineEvents.length === 0) {
        const d = report.createdAt ? report.createdAt.split('T')[0] : '2026-01-01';
        list.push({
          id: `evt_disc_${report.id}`,
          uniqueKey: `evt_disc_${report.id}`,
          date: d,
          timestamp: new Date(d).getTime(),
          phase: 'discovery',
          phaseLabel: 'Descoberta de Vulnerabilidade',
          title: `Descoberta: ${report.title}`,
          notes: report.summary || 'Vulnerabilidade identificada e registrada na plataforma.',
          report,
          reportId: report.id,
          reportTitle: report.title,
          target: report.target,
          platform: report.platform,
          severity: report.severity,
          status: report.status,
          cvssScore: report.cvssScore,
          cwe: report.cwe,
          bountyAmount: report.bountyAmount
        });
        return;
      }

      timelineEvents.forEach((evt, idx) => {
        let phase: IncidentPhase = 'note';
        let phaseLabel = 'Nota de Investigação';

        const evtType = evt.type;
        const titleLower = (evt.title || '').toLowerCase();
        const notesLower = (evt.notes || '').toLowerCase();

        if (
          evtType === 'creation' ||
          titleLower.includes('cria') ||
          titleLower.includes('criado') ||
          titleLower.includes('descobert') ||
          titleLower.includes('report') ||
          idx === 0
        ) {
          phase = 'discovery';
          phaseLabel = 'Descoberta Inicial';
        } else if (
          evtType === 'bounty' ||
          titleLower.includes('bounty') ||
          titleLower.includes('recompensa') ||
          titleLower.includes('payout')
        ) {
          phase = 'bounty';
          phaseLabel = 'Recompensa Concedida';
        } else if (
          evtType === 'pgp_signature' ||
          titleLower.includes('pgp') ||
          notesLower.includes('pgp') ||
          notesLower.includes('fingerprint')
        ) {
          phase = 'pgp';
          phaseLabel = 'Assinatura Criptográfica PGP';
        } else if (
          titleLower.includes('triag') ||
          titleLower.includes('valid') ||
          titleLower.includes('reprodu') ||
          titleLower.includes('escalad')
        ) {
          phase = 'triage';
          phaseLabel = 'Triagem & Verificação';
        } else if (
          titleLower.includes('resolv') ||
          titleLower.includes('correç') ||
          titleLower.includes('patch') ||
          titleLower.includes('fix') ||
          titleLower.includes('mitigad')
        ) {
          phase = 'remediation';
          phaseLabel = 'Mitigação / Correção';
        }

        const dateStr = evt.date || (report.createdAt ? report.createdAt.split('T')[0] : '2026-01-01');
        const parsedTime = Date.parse(dateStr) || 0;

        list.push({
          id: evt.id || `evt_${report.id}_${idx}`,
          uniqueKey: `${report.id}_${evt.id || idx}_${dateStr}`,
          date: dateStr,
          timestamp: parsedTime,
          phase,
          phaseLabel,
          title: evt.title || `Evento #${idx + 1}`,
          notes: evt.notes,
          hoursSpent: evt.hoursSpent,
          report,
          reportId: report.id,
          reportTitle: report.title,
          target: report.target,
          platform: report.platform,
          severity: report.severity,
          status: report.status,
          cvssScore: report.cvssScore,
          cwe: report.cwe,
          bountyAmount: report.bountyAmount
        });
      });
    });

    return list;
  }, [reports]);

  // 2. Extract unique target domains for the filter
  const targetOptions = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.target) set.add(r.target);
    });
    return Array.from(set).sort();
  }, [reports]);

  // 3. Filter and sort incident events
  const filteredEvents = useMemo(() => {
    return allIncidentEvents
      .filter((evt) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = evt.title.toLowerCase().includes(q);
          const matchReportTitle = evt.reportTitle.toLowerCase().includes(q);
          const matchTarget = evt.target.toLowerCase().includes(q);
          const matchNotes = evt.notes?.toLowerCase().includes(q) || false;
          const matchId = evt.reportId.toLowerCase().includes(q);
          const matchCwe = evt.cwe.toLowerCase().includes(q);
          if (!matchTitle && !matchReportTitle && !matchTarget && !matchNotes && !matchId && !matchCwe) {
            return false;
          }
        }

        // Phase filter
        if (selectedPhase !== 'all' && evt.phase !== selectedPhase) {
          return false;
        }

        // Severity filter
        if (selectedSeverity !== 'ALL' && evt.severity !== selectedSeverity) {
          return false;
        }

        // Target filter
        if (selectedTarget !== 'ALL' && evt.target !== selectedTarget) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.timestamp - a.timestamp;
        }
        return a.timestamp - b.timestamp;
      });
  }, [allIncidentEvents, searchQuery, selectedPhase, selectedSeverity, selectedTarget, sortOrder]);

  // 4. Discovery Trends Data Aggregation (by Month for Recharts)
  const discoveryTrendData = useMemo(() => {
    // Only focus on discovery phase events or first report appearance
    const discoveryEvents = allIncidentEvents.filter((e) => e.phase === 'discovery');
    const monthMap = new Map<
      string,
      {
        monthKey: string;
        label: string;
        timestamp: number;
        CRITICAL: number;
        HIGH: number;
        MEDIUM: number;
        LOW: number;
        total: number;
      }
    >();

    discoveryEvents.forEach((evt) => {
      const d = new Date(evt.date);
      const year = d.getFullYear() || 2026;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${monthNames[d.getMonth()] || 'Mês'}/${String(year).slice(-2)}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          monthKey: key,
          label,
          timestamp: new Date(`${year}-${month}-01`).getTime(),
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          total: 0
        });
      }

      const item = monthMap.get(key)!;
      const sev = evt.severity;
      if (sev === 'CRITICAL') item.CRITICAL += 1;
      else if (sev === 'HIGH') item.HIGH += 1;
      else if (sev === 'MEDIUM') item.MEDIUM += 1;
      else item.LOW += 1;
      item.total += 1;
    });

    return Array.from(monthMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [allIncidentEvents]);

  // 5. Statistical Calculations
  const stats = useMemo(() => {
    const totalEvents = allIncidentEvents.length;
    const discoveryCount = allIncidentEvents.filter((e) => e.phase === 'discovery').length;
    const criticalIncidents = allIncidentEvents.filter((e) => e.severity === 'CRITICAL' && e.phase === 'discovery').length;
    const highIncidents = allIncidentEvents.filter((e) => e.severity === 'HIGH' && e.phase === 'discovery').length;

    // Calculate discovery cadence: average interval between discovery dates
    const discoveryTimestamps = allIncidentEvents
      .filter((e) => e.phase === 'discovery')
      .map((e) => e.timestamp)
      .sort((a, b) => a - b);

    let avgCadenceDays = 0;
    if (discoveryTimestamps.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < discoveryTimestamps.length; i++) {
        const diffDays = (discoveryTimestamps[i] - discoveryTimestamps[i - 1]) / (1000 * 60 * 60 * 24);
        if (diffDays > 0) intervals.push(diffDays);
      }
      if (intervals.length > 0) {
        avgCadenceDays = Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10;
      }
    }

    // Top affected target
    const targetFreq: Record<string, number> = {};
    allIncidentEvents.forEach((e) => {
      targetFreq[e.target] = (targetFreq[e.target] || 0) + 1;
    });
    const sortedTargets = Object.entries(targetFreq).sort((a, b) => b[1] - a[1]);
    const topTarget = sortedTargets[0] ? sortedTargets[0][0] : 'Nenhum';

    return {
      totalEvents,
      discoveryCount,
      criticalIncidents,
      highIncidents,
      avgCadenceDays,
      topTarget
    };
  }, [allIncidentEvents]);

  // Phase badge color helper
  const getPhaseStyles = (phase: IncidentPhase) => {
    switch (phase) {
      case 'discovery':
        return {
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          icon: ShieldAlert
        };
      case 'triage':
        return {
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: Clock
        };
      case 'remediation':
        return {
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500',
          icon: CheckCircle2
        };
      case 'bounty':
        return {
          bg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
          dot: 'bg-yellow-500',
          icon: DollarSign
        };
      case 'pgp':
        return {
          bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-500',
          icon: Lock
        };
      default:
        return {
          bg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-500',
          icon: FileText
        };
    }
  };

  const handleCopySummary = () => {
    const summaryText = filteredEvents
      .slice(0, 15)
      .map(
        (e) =>
          `[${e.date}] ${e.phaseLabel} | ${e.severity} | ${e.target} | ${e.title} (${e.reportId})`
      )
      .join('\n');

    navigator.clipboard.writeText(
      `--- Global Security Incident Timeline Export ---\nTotal: ${filteredEvents.length} eventos\n\n` + summaryText
    );
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div
      id="global-security-incident-timeline"
      className="bg-[#0e1017] border border-[#1e2338] rounded-2xl overflow-hidden shadow-xl mb-8"
    >
      {/* Component Header with Actions and Mode Selector */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#121522] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Global Security Incident Timeline</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1d2238] text-rose-300 border border-rose-500/30">
                  {filteredEvents.length} Eventos Agregados
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rastreamento cronológico de descobertas, validações e mitigações em todos os alvos monitorados.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Export */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-[#090b11] border border-[#1e2338] rounded-lg p-0.5 flex items-center">
            <button
              id="timeline-view-mode-btn"
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Linha Cronológica</span>
            </button>
            <button
              id="trends-view-mode-btn"
              type="button"
              onClick={() => setViewMode('trends')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'trends'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tendências de Descoberta</span>
            </button>
          </div>

          <button
            id="copy-incident-summary-btn"
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg bg-[#1a1f33] hover:bg-[#232a45] text-zinc-300 hover:text-white border border-[#2b3352] text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Copiar resumo textual dos eventos filtrados"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copiar Registro</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discovery Trends Overview Cards */}
      <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#0c0e17] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Total Eventos
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{stats.totalEvents}</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Histórico consolidado</span>
        </div>

        <div className="p-3 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Descobertas
          </span>
          <div className="text-xl font-bold font-mono text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{stats.discoveryCount}</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Bugs identificados</span>
        </div>

        <div className="p-3 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Críticos / Altos
          </span>
          <div className="text-xl font-bold font-mono text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{stats.criticalIncidents + stats.highIncidents}</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">{stats.criticalIncidents} Críticos • {stats.highIncidents} Altos</span>
        </div>

        <div className="p-3 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Cadência Média
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>{stats.avgCadenceDays}d</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Intervalo entre achados</span>
        </div>

        <div className="p-3 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Alvo Mais Afetado
          </span>
          <div className="text-sm font-bold font-mono text-zinc-200 truncate" title={stats.topTarget}>
            {stats.topTarget}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Maior volume de incidentes</span>
        </div>

        <div className="p-3 rounded-xl bg-[#121522] border border-[#1e2338]">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
            Ordem Temporal
          </span>
          <button
            id="toggle-sort-order-btn"
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="text-xs font-bold font-mono text-rose-300 hover:text-rose-200 flex items-center gap-1 transition-colors mt-0.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Mais Recente' : 'Mais Antigo'}</span>
          </button>
          <span className="text-[10px] text-zinc-500 mt-1 block">Clique para alternar</span>
        </div>
      </div>

      {/* Discovery Trends Chart View (Toggleable) */}
      {viewMode === 'trends' && (
        <div className="p-4 sm:p-6 border-b border-[#1e2338] bg-[#0d0f18] animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-rose-400" />
                <span>Curva Cronológica de Descoberta por Severidade</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Distribuição acumulada de novas vulnerabilidades identificadas ao longo do tempo.
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Agrupamento Mensal</span>
          </div>

          <div className="h-64 w-full">
            {discoveryTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={discoveryTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f263d" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#525b7a"
                    tick={{ fill: '#8f9bb3', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="#525b7a"
                    tick={{ fill: '#8f9bb3', fontSize: 11, fontFamily: 'monospace' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121522',
                      borderColor: '#2b3352',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="CRITICAL"
                    name="Crítico"
                    stackId="1"
                    stroke="#f43f5e"
                    fill="url(#colorCritical)"
                  />
                  <Area
                    type="monotone"
                    dataKey="HIGH"
                    name="Alto"
                    stackId="1"
                    stroke="#f97316"
                    fill="url(#colorHigh)"
                  />
                  <Area
                    type="monotone"
                    dataKey="MEDIUM"
                    name="Médio"
                    stackId="1"
                    stroke="#eab308"
                    fill="url(#colorMedium)"
                  />
                  <Area
                    type="monotone"
                    dataKey="LOW"
                    name="Baixo"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="url(#colorLow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
                Nenhum dado de tendência de descoberta suficiente para exibição gráfica.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-[#1e2338] bg-[#0a0c14] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="incident-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por alvo, título, CWE ou notas..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-[#121522] border border-[#22283e] text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Phase Filter Tabs */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Fase:</span>
          </span>

          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'discovery', label: 'Descoberta' },
              { id: 'triage', label: 'Triagem' },
              { id: 'remediation', label: 'Correção' },
              { id: 'bounty', label: 'Bounties' },
              { id: 'pgp', label: 'PGP' }
            ] as const
          ).map((phaseItem) => (
            <button
              key={phaseItem.id}
              type="button"
              onClick={() => setSelectedPhase(phaseItem.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedPhase === phaseItem.id
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-[#141726] text-zinc-400 hover:text-zinc-200 hover:bg-[#1c2136]'
              }`}
            >
              {phaseItem.label}
            </button>
          ))}
        </div>

        {/* Severity and Target Dropdowns */}
        <div className="flex items-center gap-2">
          <select
            id="incident-severity-filter"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-[#121522] border border-[#22283e] text-zinc-300 text-xs focus:outline-none focus:border-rose-500/60"
          >
            <option value="ALL">Severidade: Todas</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
            <option value="INFO">Informativa</option>
          </select>

          <select
            id="incident-target-filter"
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#121522] border border-[#22283e] text-zinc-300 text-xs focus:outline-none focus:border-rose-500/60 max-w-[160px] truncate"
          >
            <option value="ALL">Alvo: Todos</option>
            {targetOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chronological Stream */}
      <div className="p-4 sm:p-6 max-h-[580px] overflow-y-auto space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 font-mono text-xs">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-2 opacity-50" />
            <p className="text-zinc-300 font-semibold text-sm">Nenhum evento de incidente encontrado</p>
            <p className="text-zinc-500 text-[11px] mt-1">
              Ajuste os filtros de fase, severidade ou busca para visualizar os registros cronológicos.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-rose-500/60 before:via-[#2b3352] before:to-transparent space-y-6">
            {filteredEvents.map((evt) => {
              const phaseStyle = getPhaseStyles(evt.phase);
              const PhaseIcon = phaseStyle.icon;

              return (
                <div
                  key={evt.uniqueKey}
                  className="relative group transition-all duration-200"
                >
                  {/* Timeline bullet node */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-3.5 w-3 h-3 rounded-full ${phaseStyle.dot} ring-4 ring-[#0e1017] group-hover:scale-125 transition-transform duration-200 shadow-md`}
                  />

                  {/* Incident Event Card */}
                  <div className="bg-[#121522] hover:bg-[#161a2b] border border-[#1e2338] hover:border-[#2d3554] rounded-xl p-4 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center flex-wrap gap-2">
                        {/* Phase Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${phaseStyle.bg}`}
                        >
                          <PhaseIcon className="w-3 h-3" />
                          <span>{evt.phaseLabel}</span>
                        </span>

                        {/* Severity Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadgeColor(
                            evt.severity
                          )}`}
                        >
                          {evt.severity} (CVSS {evt.cvssScore.toFixed(1)})
                        </span>

                        {/* Platform Badge */}
                        <span className="text-[10px] font-mono text-zinc-400 bg-[#1c2136] px-2 py-0.5 rounded border border-[#2b3350]">
                          {evt.platform}
                        </span>

                        {/* Bounty Awarded Badge */}
                        {evt.bountyAmount && evt.bountyAmount > 0 && evt.phase === 'bounty' && (
                          <span className="text-[10px] font-mono font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{formatCurrency(evt.bountyAmount)}</span>
                          </span>
                        )}
                      </div>

                      {/* Date & Action */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-rose-400" />
                            <span>{evt.date}</span>
                          </span>
                          {evt.hoursSpent !== undefined && (
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              {evt.hoursSpent}h dedicadas
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectReport(evt.report)}
                          className="px-2.5 py-1 rounded-lg bg-[#1c2136] hover:bg-rose-600 hover:text-white text-zinc-300 text-xs font-medium transition-all flex items-center gap-1 group/btn shrink-0"
                          title="Abrir detalhes deste relatório de vulnerabilidade"
                        >
                          <span>Ver Relatório</span>
                          <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Report and Target Connection */}
                    <div className="mb-2">
                      <div className="text-xs text-zinc-400 flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
                          {evt.target}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 font-mono">{evt.reportId}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 text-[11px] truncate max-w-xs">{evt.cwe}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-rose-200 transition-colors">
                        {evt.title}
                      </h4>
                    </div>

                    {/* Event Notes / Context */}
                    {evt.notes && (
                      <p className="text-xs text-zinc-400 bg-[#0d0f18] p-2.5 rounded-lg border border-[#1b2034] mt-2 font-mono leading-relaxed">
                        {evt.notes}
                      </p>
                    )}

                    {/* Report Parent Reference Header if event is different from report title */}
                    {evt.title !== evt.reportTitle && (
                      <div className="mt-2.5 pt-2 border-t border-[#1a1f33] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                        <span className="truncate">
                          Relatório Vinculado: <span className="text-zinc-300">{evt.reportTitle}</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
                          Status: <span className="text-zinc-200">{evt.status}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Component Footer */}
      <div className="p-3.5 border-t border-[#1e2338] bg-[#0c0e17] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-mono">
            Mostrando {filteredEvents.length} de {allIncidentEvents.length} marcos de segurança indexados
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="text-xs text-rose-300 hover:text-white transition-colors flex items-center gap-1 font-mono font-semibold"
            >
              <span>Gerenciar Relatórios</span>
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
              <span>Registrar Descoberta</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
