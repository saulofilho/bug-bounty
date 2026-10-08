import React, { useState, useMemo } from 'react';
import {
  Timer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Calendar,
  Sparkles,
  BarChart3,
  Info,
  ArrowRight,
  Flame,
  Search
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import {
  calculateAverageTtt,
  AverageTttCalculationResult,
  ReportTttData
} from '../utils/tttComparativeEngine';
import { getSeverityBadgeColor, getStatusBadgeColor, formatRelativeTimeAgo } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { BaseCard } from './BaseCard';

export interface AverageTttCardProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

export const AverageTttCard: React.FC<AverageTttCardProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  className = ''
}) => {
  const { t } = useLanguage();
  const [unit, setUnit] = useState<'hours' | 'days'>('hours');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter reports if platform or severity is selected
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchPlat = selectedPlatform === 'ALL' || r.platform === selectedPlatform;
      const matchSev = selectedSeverity === 'ALL' || r.severity === selectedSeverity;
      return matchPlat && matchSev;
    });
  }, [reports, selectedPlatform, selectedSeverity]);

  // Compute average TTT metrics using timeline events
  const metrics: AverageTttCalculationResult = useMemo(() => {
    return calculateAverageTtt(filteredReports);
  }, [filteredReports]);

  // Overall un-filtered metrics for baseline comparison
  const globalMetrics: AverageTttCalculationResult = useMemo(() => {
    return calculateAverageTtt(reports);
  }, [reports]);

  const platformList = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.platform).filter(Boolean)));
    return ['ALL', ...list];
  }, [reports]);

  const severitiesList: Array<Severity | 'ALL'> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  // Filtered reports inside the table search
  const displayedReports = useMemo(() => {
    let list = metrics.reportsWithTtt;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.reportId.toLowerCase().includes(q) ||
        r.reportTitle.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q)
      );
    }
    return list;
  }, [metrics.reportsWithTtt, searchQuery]);

  const formatTttValue = (hours: number, days: number) => {
    if (unit === 'hours') {
      return `${hours.toFixed(1)}h`;
    }
    return `${days.toFixed(1)}d`;
  };

  const getSlaBadge = (tttHours: number | null) => {
    if (tttHours === null) return { label: 'Pendente', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    if (tttHours <= 24) return { label: 'Excelente (≤24h)', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    if (tttHours <= 48) return { label: 'No SLA (≤48h)', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
    if (tttHours <= 72) return { label: 'Atenção (≤72h)', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    return { label: 'Lento (>72h)', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
  };

  return (
    <section 
      id="average-ttt-component" 
      aria-label="Componente de Tempo Médio de Triagem (TTT)"
      className={`space-y-4 ${className}`}
    >
      <BaseCard
        elevation="card"
        border="default"
        rounded="xl"
        padding="none"
        className="overflow-hidden bg-[#0a0d14] border-indigo-500/30 shadow-2xl shadow-black/60 font-sans"
      >
        {/* Header Section */}
        <div className="p-5 sm:p-6 border-b border-indigo-500/20 bg-gradient-to-r from-[#0d1220] via-[#0a0d14] to-[#0d111a] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-bold tracking-wider uppercase">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                <span>Métrica de Performance Operacional</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                <Zap className="w-3 h-3" />
                <span>Baseada na Timeline ({metrics.totalTriagedCount} triagens calculadas)</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{t('dash.avgTimeToTriage', 'Tempo Médio de Triagem (TTT)')}</span>
            </h2>

            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Calcula a média exata do tempo decorrido entre a <strong className="text-zinc-200">submissão inicial</strong> e a <strong className="text-indigo-300">primeira transição de status para 'TRIAGED' ou 'VALIDATED'</strong> no array de histórico <code className="text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded text-[11px]">timeline</code> de cada relatório.
            </p>
          </div>

          {/* Quick controls: Unit toggle & Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Unit Toggle: Horas vs Dias */}
            <div className="flex items-center p-0.5 bg-[#141824] rounded-lg border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setUnit('hours')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  unit === 'hours'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Exibir em Horas"
              >
                Horas (h)
              </button>
              <button
                type="button"
                onClick={() => setUnit('days')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  unit === 'days'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Exibir em Dias"
              >
                Dias (d)
              </button>
            </div>

            {/* Jump to Histogram button */}
            <button
              type="button"
              onClick={() => document.getElementById('ttt-distribution-histogram-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2236] text-blue-300 hover:text-white border border-blue-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Visualizar Histograma de Distribuição de TTT"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Histograma</span>
            </button>

            {/* Jump to Monthly Comparative button */}
            <button
              type="button"
              onClick={() => document.getElementById('monthly-ttt-comparative-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2236] text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Visualizar Painel Comparativo Mensal de TTT"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Comparativo Mensal</span>
            </button>
          </div>
        </div>

        {/* Filter Bar (Platform & Severity) */}
        <div className="p-3 sm:px-6 bg-[#0c0f18] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span>Filtrar:</span>
            </span>

            {/* Platform Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Plataforma:</span>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-[#141824] text-zinc-200 border border-zinc-700/80 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                {platformList.map(plat => (
                  <option key={plat} value={plat}>
                    {plat === 'ALL' ? 'Todas as Plataformas' : plat}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Severidade:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as Severity | 'ALL')}
                className="bg-[#141824] text-zinc-200 border border-zinc-700/80 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                {severitiesList.map(sev => (
                  <option key={sev} value={sev}>
                    {sev === 'ALL' ? 'Todas as Severidades' : sev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
            <span>Fórmula:</span>
            <code className="text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20">
              TTT = Data(1ª Transição TRIAGED/VALIDATED) - Data(Submissão Inicial)
            </code>
          </div>
        </div>

        {/* Primary KPI Highlight Grid */}
        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Tempo Médio de Triagem (Métrica Principal) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#12162a] via-[#0d101d] to-[#0a0d16] border border-indigo-500/40 relative overflow-hidden group hover:border-indigo-500/70 transition-all shadow-lg">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-indigo-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-indigo-400" />
                <span>Tempo Médio (TTT)</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                metrics.averageTttHours <= 48
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : metrics.averageTttHours <= 72
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                {metrics.averageTttHours <= 48 ? 'SLA OK' : metrics.averageTttHours <= 72 ? 'MODERADO' : 'ATENÇÃO'}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-light font-mono text-white tracking-tight drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                {formatTttValue(metrics.averageTttHours, metrics.averageTttDays)}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {unit === 'hours' ? `(~${metrics.averageTttDays.toFixed(1)} dias)` : `(~${metrics.averageTttHours.toFixed(1)} horas)`}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-indigo-500/20 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>{metrics.totalTriagedCount} de {metrics.totalSubmittedCount} relatórios</span>
              <span className="text-indigo-300 font-semibold">{metrics.triagedRatioPercent}% triados</span>
            </div>
          </div>

          {/* Card 2: SLA ≤ 48h Compliance */}
          <div className="p-4 rounded-xl bg-[#0e121d] border border-zinc-800 hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Conformidade SLA (≤ 48h)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Meta: 80%
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-light font-mono text-white group-hover:text-emerald-400 transition-colors">
                {metrics.slaUnder48hPercent}%
              </span>
              <span className="text-xs font-mono text-zinc-400">
                ({metrics.slaUnder48hCount} relatórios)
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1">
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min(100, Math.max(5, metrics.slaUnder48hPercent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>≤ 24h: {metrics.slaUnder24hPercent}% ({metrics.slaUnder24hCount})</span>
                <span>Alvo ideal: 48h</span>
              </div>
            </div>
          </div>

          {/* Card 3: Mediana do TTT */}
          <div className="p-4 rounded-xl bg-[#0e121d] border border-zinc-800 hover:border-cyan-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Mediana de Triagem</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700">
                P50 TTT
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-light font-mono text-white group-hover:text-cyan-400 transition-colors">
                {formatTttValue(metrics.medianTttHours, metrics.medianTttDays)}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {unit === 'hours' ? `(~${metrics.medianTttDays.toFixed(1)}d)` : `(~${metrics.medianTttHours.toFixed(1)}h)`}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="text-zinc-500">Robustez estatística</span>
              <span className="text-cyan-300">Sem distorção de outliers</span>
            </div>
          </div>

          {/* Card 4: Extremos (Mais Rápido & Mais Lento) */}
          <div className="p-4 rounded-xl bg-[#0e121d] border border-zinc-800 hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Extremos Observados</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30">
                Min / Max
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span>⚡ Mais Rápido:</span>
                </span>
                <span className="text-white font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {formatTttValue(metrics.fastestTttHours, metrics.fastestTttDays)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <span>🐢 Mais Lento:</span>
                </span>
                <span className="text-white font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  {formatTttValue(metrics.slowestTttHours, metrics.slowestTttDays)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-500 truncate" title={metrics.fastestReport?.reportTitle}>
              Recorde: {metrics.fastestReport ? `${metrics.fastestReport.reportId} (${metrics.fastestReport.platform})` : '—'}
            </div>
          </div>

        </div>

        {/* Breakdown by Severities & Platforms */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Severity Breakdown */}
          <div className="p-4 rounded-xl bg-[#0c101a] border border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                <span>TTT Médio por Severidade</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Horas decorridas</span>
            </div>

            <div className="space-y-1.5">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(sev => {
                const sData = metrics.bySeverity[sev];
                if (!sData) return null;
                const percent = Math.min(100, Math.round((sData.avgTttHours / 96) * 100));
                return (
                  <div key={sev} className="flex items-center justify-between text-xs font-mono gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getSeverityBadgeColor(sev)}`}>
                      {sev}
                    </span>
                    <div className="flex-1 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden mx-2">
                      <div 
                        className={`h-full rounded-full ${
                          sev === 'CRITICAL' ? 'bg-red-500' :
                          sev === 'HIGH' ? 'bg-orange-500' :
                          sev === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold text-right shrink-0">
                      {formatTttValue(sData.avgTttHours, sData.avgTttDays)}
                    </span>
                    <span className="text-[10px] text-zinc-500 shrink-0 w-12 text-right">
                      ({sData.count} achados)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="p-4 rounded-xl bg-[#0c101a] border border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>TTT Médio por Plataforma</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Agilidade do ecossistema</span>
            </div>

            <div className="space-y-1.5">
              {Object.entries(metrics.byPlatform).slice(0, 4).map(([plat, pData]) => {
                return (
                  <div key={plat} className="flex items-center justify-between text-xs font-mono gap-2">
                    <span className="text-zinc-300 font-semibold truncate max-w-[140px]">
                      {plat}
                    </span>
                    <div className="flex-1 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden mx-2">
                      <div 
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.round((pData.avgTttHours / 96) * 100))}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold text-right shrink-0">
                      {formatTttValue(pData.avgTttHours, pData.avgTttDays)}
                    </span>
                    <span className="text-[10px] text-zinc-500 shrink-0 w-12 text-right">
                      ({pData.count} triagens)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Collapsible Detailed Report Table */}
        <div className="border-t border-zinc-800/90 bg-[#090c14]">
          <div className="p-4 sm:px-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {isTableExpanded ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
              <span>
                {isTableExpanded 
                  ? 'Ocultar Relatórios Individuais com Cálculo de TTT' 
                  : `Ver Tabela de Relatórios Individuais (${metrics.totalTriagedCount} achados com TTT extraído)`}
              </span>
            </button>

            {isTableExpanded && (
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar relatório ou alvo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141824] border border-zinc-700/80 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {isTableExpanded && (
            <div className="px-4 pb-4 sm:px-6 sm:pb-6 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-[#121624] text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Relatório</th>
                    <th className="py-2.5 px-3 font-semibold">Alvo / Plataforma</th>
                    <th className="py-2.5 px-3 font-semibold">Severidade</th>
                    <th className="py-2.5 px-3 font-semibold">Submissão Inicial</th>
                    <th className="py-2.5 px-3 font-semibold">1ª Transição TRIAGED/VALIDATED</th>
                    <th className="py-2.5 px-3 font-semibold">TTT Decorrido</th>
                    <th className="py-2.5 px-3 font-semibold">Status SLA</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-[#0a0d16]">
                  {displayedReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-zinc-500 text-xs">
                        Nenhum relatório encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    displayedReports.map(rep => {
                      const sla = getSlaBadge(rep.tttHours);
                      const originalReport = reports.find(r => r.id === rep.reportId);
                      return (
                        <tr 
                          key={rep.reportId} 
                          className="hover:bg-[#141824]/60 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-white block">{rep.reportId}</span>
                            <span className="text-[11px] text-zinc-400 block truncate max-w-[200px]" title={rep.reportTitle}>
                              {rep.reportTitle}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-zinc-200 block">{rep.target}</span>
                            <span className="text-[10px] text-zinc-500 block">{rep.platform}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${getSeverityBadgeColor(rep.severity)}`}>
                              {rep.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {rep.submissionDate.split('T')[0]}
                          </td>
                          <td className="py-2.5 px-3 text-indigo-300">
                            {rep.triageDate ? rep.triageDate.split('T')[0] : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-white">
                              {rep.tttHours !== null ? `${rep.tttHours}h` : '—'}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              {rep.tttDays !== null ? `(${rep.tttDays}d)` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border inline-block ${sla.color}`}>
                              {sla.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {originalReport && onSelectReport && (
                              <button
                                type="button"
                                onClick={() => onSelectReport(originalReport)}
                                className="px-2.5 py-1 rounded bg-[#181d2e] hover:bg-indigo-600 hover:text-white text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer inline-flex items-center gap-1 border border-zinc-700 hover:border-indigo-500"
                              >
                                <span>Ver</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </BaseCard>
    </section>
  );
};
