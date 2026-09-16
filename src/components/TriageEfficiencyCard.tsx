import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Timer, 
  Zap, 
  ShieldAlert, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  ExternalLink,
  Layers,
  Sparkles,
  BarChart3,
  Flame,
  AlertCircle
} from 'lucide-react';
import { VulnerabilityReport, Severity, PlatformName } from '../types';
import { calculateTriageEfficiency, ReportTriageMetric } from '../utils/triageEfficiencyEngine';
import { getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface TriageEfficiencyCardProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
}

export const TriageEfficiencyCard: React.FC<TriageEfficiencyCardProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'severities' | 'reports'>('overview');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Filter reports if user chose a specific platform or severity
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchPlatform = selectedPlatform === 'ALL' || r.platform === selectedPlatform;
      const matchSeverity = selectedSeverity === 'ALL' || r.severity === selectedSeverity;
      return matchPlatform && matchSeverity;
    });
  }, [reports, selectedPlatform, selectedSeverity]);

  // Compute efficiency metrics
  const metrics = useMemo(() => {
    return calculateTriageEfficiency(filteredReports);
  }, [filteredReports]);

  // Overall un-filtered metrics for comparison
  const globalMetrics = useMemo(() => {
    return calculateTriageEfficiency(reports);
  }, [reports]);

  const platformList = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.platform)));
    return ['ALL', ...list];
  }, [reports]);

  const severityList: Array<'ALL' | Severity> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  const getDaysLabel = (days?: number) => {
    if (days === undefined) return '—';
    if (days === 0) return '< 24h';
    if (days === 1) return '1 dia';
    return `${days.toFixed(1)} dias`;
  };

  const getSlaColor = (days: number) => {
    if (days <= 2) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (days <= 4) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="rounded-xl bg-[#0b0b0f] border border-[#22222f] shadow-xl overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-5 sm:p-6 border-b border-[#1c1c28] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e0e14]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-semibold uppercase tracking-wider">
              <Timer className="w-3.5 h-3.5" />
              <span>Eficiência de Triagem & SLA</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <Zap className="w-3 h-3" />
              <span>Dados da Timeline ({metrics.totalTriaged} triagens analisadas)</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-medium text-white tracking-tight flex items-center gap-2">
            <span>Velocidade de Resposta do Ciclo de Vulnerabilidades</span>
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
            Métricas de tempo de resposta calculadas diretamente a partir dos carimbos de data e hora do cronograma histórico, mensurando o tempo decorrido desde a criação/rascunho (<strong className="text-zinc-200">DRAFT</strong>) até a confirmação (<strong className="text-zinc-200">TRIAGED</strong>) e resolução final (<strong className="text-zinc-200">CLOSED</strong>).
          </p>
        </div>

        {/* Quick Actions & View Toggle */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-[#151520] hover:bg-[#1f1f2e] border border-[#28283d] text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono"
            title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            {isExpanded ? (
              <>
                <span>Recolher</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Expandir</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main KPI Highlights Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tempo Médio DRAFT -> TRIAGED */}
        <div className="p-4 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>DRAFT ➔ TRIAGED</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSlaColor(metrics.avgDaysToTriage)}`}>
                {metrics.avgDaysToTriage <= 2 ? 'ÁGIL' : metrics.avgDaysToTriage <= 4 ? 'MODERADO' : 'ATENÇÃO'}
              </span>
            </div>
            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-3xl font-light font-mono text-white group-hover:text-cyan-400 transition-colors">
                {metrics.avgDaysToTriage.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-zinc-400">dias</span>
              <span className="text-[11px] font-mono text-zinc-500">
                (~{metrics.avgHoursToTriage}h)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2d] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>SLA Meta (&le; 48h):</span>
              <span className="text-emerald-400 font-bold">{metrics.slaUnder48hPercent}% cumprido</span>
            </div>
            <div className="w-full h-1.5 bg-[#1a1a27] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(10, metrics.slaUnder48hPercent))}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">
              Mais rápido: {getDaysLabel(metrics.fastestTriageDays)} | Mais lento: {getDaysLabel(metrics.slowestTriageDays)}
            </p>
          </div>
        </div>

        {/* Metric 2: Tempo Médio DRAFT -> CLOSED */}
        <div className="p-4 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>DRAFT ➔ CLOSED</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {metrics.totalClosed} fechados
              </span>
            </div>
            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-3xl font-light font-mono text-white group-hover:text-emerald-400 transition-colors">
                {metrics.avgDaysToClose.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-zinc-400">dias</span>
              <span className="text-[11px] font-mono text-zinc-500">
                (~{Math.round(metrics.avgDaysToClose * 24)}h)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2d] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Resolução / Bounty:</span>
              <span className="text-emerald-400 font-bold">Ciclo Completo</span>
            </div>
            <div className="w-full h-1.5 bg-[#1a1a27] rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(15, (metrics.totalClosed / (metrics.totalAnalyzed || 1)) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">
              Mediana de fechamento: {getDaysLabel(metrics.medianDaysToClose)}
            </p>
          </div>
        </div>

        {/* Metric 3: Taxa de Conformidade SLA */}
        <div className="p-4 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col justify-between hover:border-amber-500/40 transition-all group">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Score de Eficiência</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                SLA Global
              </span>
            </div>
            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-3xl font-light font-mono text-white group-hover:text-amber-400 transition-colors">
                {metrics.overallEfficiencyScore}
              </span>
              <span className="text-xs font-mono text-zinc-400">/ 100</span>
              <span className="text-[11px] font-mono text-zinc-500">pts</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2d] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Triados em até 5 dias:</span>
              <span className="text-zinc-200 font-bold">{metrics.slaUnder5DaysPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#1a1a27] rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-700" 
                style={{ width: `${metrics.overallEfficiencyScore}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">
              Benchmark de tempo de triagem do ecossistema
            </p>
          </div>
        </div>

        {/* Metric 4: Pipeline em Andamento (DRAFT / SUBMITTED) */}
        <div className="p-4 rounded-xl bg-[#12121c] border border-[#252538] flex flex-col justify-between hover:border-sky-500/40 transition-all group">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Backlog em Triagem</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Ativo
              </span>
            </div>
            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-3xl font-light font-mono text-white group-hover:text-sky-400 transition-colors">
                {metrics.currentlyDraftCount + metrics.currentlySubmittedCount}
              </span>
              <span className="text-xs font-mono text-zinc-400">pendentes</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2d] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Tempo médio de espera:</span>
              <span className="text-sky-300 font-bold">{metrics.avgDaysWaitingCurrent.toFixed(1)} dias</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>{metrics.currentlyDraftCount} rascunhos</span>
              <span>{metrics.currentlySubmittedCount} submetidos</span>
            </div>
            <p className="text-[10px] text-zinc-500 italic">
              {metrics.currentlyTriagedCount} achados em validação de correção
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Section: Platform / Severity Breakdown & Detailed Log */}
      {isExpanded && (
        <div className="border-t border-[#1c1c28] bg-[#09090d]">
          {/* Controls Bar */}
          <div className="p-4 sm:px-6 border-b border-[#1c1c28] flex flex-wrap items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#14141e] border border-[#232333]">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  activeTab === 'overview'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Visão Geral
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('platforms')}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  activeTab === 'platforms'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Por Plataforma
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('severities')}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  activeTab === 'severities'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Por Severidade
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  activeTab === 'reports'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Relatórios & Timeline ({metrics.reportMetrics.length})
              </button>
            </div>

            {/* Platform & Severity Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1 text-zinc-400">
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                <span>Filtros:</span>
              </div>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-[#14141e] border border-[#28283d] text-zinc-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500/50"
              >
                {platformList.map(p => (
                  <option key={p} value={p}>
                    {p === 'ALL' ? 'Todas Plataformas' : p}
                  </option>
                ))}
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-[#14141e] border border-[#28283d] text-zinc-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500/50"
              >
                {severityList.map(s => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'Todas Severidades' : s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tab Content: Overview */}
          {activeTab === 'overview' && (
            <div className="p-5 sm:p-6 space-y-6">
              {/* Turnaround Pipeline Diagram */}
              <div className="p-4 rounded-xl bg-[#11111a] border border-[#20202e] space-y-4">
                <h3 className="text-xs font-mono uppercase text-zinc-300 tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Pipeline de Transição Temporal Médio</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                  {/* Step 1: Draft / Criação */}
                  <div className="p-4 rounded-lg bg-[#141422] border border-[#25253a] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Etapa 1: Registro</span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">Ponto Zero</span>
                    </div>
                    <div className="text-sm font-bold text-white">DRAFT / SUBMISSÃO</div>
                    <p className="text-[11px] text-zinc-400">
                      Pesquisa, escrita do PoC e registro do evento de criação na timeline do achado.
                    </p>
                  </div>

                  {/* Step 2: Triagem */}
                  <div className="p-4 rounded-lg bg-[#141422] border border-cyan-500/30 space-y-2 relative">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-cyan-400">Etapa 2: Triagem</span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                        +{metrics.avgDaysToTriage.toFixed(1)} dias
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>TRIAGED / VALIDADO</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Triador reproduz e confirma impacto técnico junto ao programa parceiro.
                    </p>
                  </div>

                  {/* Step 3: Fechamento */}
                  <div className="p-4 rounded-lg bg-[#141422] border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400">Etapa 3: Resolução</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        +{metrics.avgDaysToClose.toFixed(1)} dias total
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>CLOSED / RESOLVED / BOUNTY</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Correção em produção liberada e bounty depositado para o pesquisador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Platform Comparison Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.byPlatform.map(p => (
                  <div key={p.platform} className="p-3.5 rounded-lg bg-[#12121c] border border-[#232335] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">{p.platform}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {p.totalCount} relatórios
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div className="bg-[#171724] p-2 rounded">
                        <span className="text-[10px] text-zinc-500 block">Tempo Triagem</span>
                        <span className="text-cyan-400 font-bold">{getDaysLabel(p.avgDaysToTriage)}</span>
                      </div>
                      <div className="bg-[#171724] p-2 rounded">
                        <span className="text-[10px] text-zinc-500 block">Tempo Fechamento</span>
                        <span className="text-emerald-400 font-bold">{getDaysLabel(p.avgDaysToClose)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content: By Platform */}
          {activeTab === 'platforms' && (
            <div className="p-5 sm:p-6 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#232335] text-zinc-400 uppercase text-[10px]">
                    <th className="pb-3 px-3">Plataforma</th>
                    <th className="pb-3 px-3">Total Relatórios</th>
                    <th className="pb-3 px-3">Triados</th>
                    <th className="pb-3 px-3">Tempo Médio Triagem</th>
                    <th className="pb-3 px-3">Fechados</th>
                    <th className="pb-3 px-3">Tempo Médio Fechamento</th>
                    <th className="pb-3 px-3">Velocidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181826]">
                  {metrics.byPlatform.map(p => (
                    <tr key={p.platform} className="hover:bg-[#13131f] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{p.platform}</td>
                      <td className="py-3 px-3 text-zinc-300">{p.totalCount}</td>
                      <td className="py-3 px-3 text-cyan-300">{p.triagedCount}</td>
                      <td className="py-3 px-3 font-bold text-cyan-400">
                        {p.avgDaysToTriage > 0 ? `${p.avgDaysToTriage.toFixed(1)} dias` : '—'}
                      </td>
                      <td className="py-3 px-3 text-emerald-300">{p.closedCount}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {p.avgDaysToClose > 0 ? `${p.avgDaysToClose.toFixed(1)} dias` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSlaColor(p.avgDaysToTriage)}`}>
                          {p.avgDaysToTriage <= 2 ? 'Rápida' : p.avgDaysToTriage <= 4 ? 'Normal' : 'Lenta'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: By Severity */}
          {activeTab === 'severities' && (
            <div className="p-5 sm:p-6 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#232335] text-zinc-400 uppercase text-[10px]">
                    <th className="pb-3 px-3">Severidade</th>
                    <th className="pb-3 px-3">Total Achados</th>
                    <th className="pb-3 px-3">Triados</th>
                    <th className="pb-3 px-3">Média DRAFT ➔ TRIAGED</th>
                    <th className="pb-3 px-3">Média DRAFT ➔ CLOSED</th>
                    <th className="pb-3 px-3">Prioridade de Atendimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181826]">
                  {metrics.bySeverity.map(s => (
                    <tr key={s.severity} className="hover:bg-[#13131f] transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeColor(s.severity)}`}>
                          {s.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-300">{s.totalCount}</td>
                      <td className="py-3 px-3 text-cyan-300">{s.triagedCount}</td>
                      <td className="py-3 px-3 font-bold text-cyan-400">
                        {s.avgDaysToTriage > 0 ? `${s.avgDaysToTriage.toFixed(1)} dias` : '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {s.avgDaysToClose > 0 ? `${s.avgDaysToClose.toFixed(1)} dias` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        {s.severity === 'CRITICAL' ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            <span>P1 Máxima</span>
                          </span>
                        ) : s.severity === 'HIGH' ? (
                          <span className="text-amber-400 font-bold">P2 Elevada</span>
                        ) : (
                          <span className="text-zinc-400">Padrão</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: Detailed Report Transitions */}
          {activeTab === 'reports' && (
            <div className="p-5 sm:p-6 overflow-x-auto space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Histórico individual de transições extraído dos cronogramas:</span>
                {onNavigateToReports && (
                  <button
                    type="button"
                    onClick={onNavigateToReports}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>Ver todos na aba de relatórios</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#232335] text-zinc-400 uppercase text-[10px]">
                    <th className="pb-3 px-3">Relatório / ID</th>
                    <th className="pb-3 px-3">Alvo & Plataforma</th>
                    <th className="pb-3 px-3">Severidade</th>
                    <th className="pb-3 px-3">Status Atual</th>
                    <th className="pb-3 px-3">Criação / Draft</th>
                    <th className="pb-3 px-3">Tempo até Triagem</th>
                    <th className="pb-3 px-3">Tempo até Fechamento</th>
                    <th className="pb-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181826]">
                  {metrics.reportMetrics.map(item => {
                    const originalReport = reports.find(r => r.id === item.reportId);
                    return (
                      <tr key={item.reportId} className="hover:bg-[#13131f] transition-colors">
                        <td className="py-3 px-3 max-w-[280px]">
                          <div className="font-bold text-zinc-200 truncate" title={item.reportTitle}>
                            {item.reportTitle}
                          </div>
                          <div className="text-[10px] text-zinc-500">{item.reportId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-zinc-200">{item.target}</div>
                          <div className="text-[10px] text-zinc-500">{item.platform}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeColor(item.severity)}`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={item.currentStatus} />
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          {item.creationDate}
                        </td>
                        <td className="py-3 px-3">
                          {item.daysToTriage !== undefined ? (
                            <span className="font-bold text-cyan-400">
                              {getDaysLabel(item.daysToTriage)}
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic">
                              Pendente ({getDaysLabel(item.daysCurrentlyPending)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.daysToClose !== undefined ? (
                            <span className="font-bold text-emerald-400">
                              {getDaysLabel(item.daysToClose)}
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic">Em aberto</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {originalReport && onSelectReport && (
                            <button
                              type="button"
                              onClick={() => onSelectReport(originalReport)}
                              className="px-2.5 py-1 rounded bg-[#1c1c2b] hover:bg-cyan-600 hover:text-white text-zinc-300 font-mono text-[11px] transition-all"
                            >
                              Inspecionar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
