import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Award, 
  ArrowUpRight, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Sparkles,
  ExternalLink,
  Target
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface WeeklySummaryProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNewReport: () => void;
  onNavigateTab?: (tab: 'reports' | 'cve' | 'targets' | 'docs') => void;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateTab
}) => {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  const usdToBrlRate = 5.45;

  // Calculate the 7-day window (Today and previous 6 days)
  const {
    startDate,
    endDate,
    startDateFormatted,
    endDateFormatted,
    dayBuckets,
    weeklyReports,
    weeklySubmittedCount,
    weeklyDraftCount,
    weeklyTotalRewardsUSD,
    weeklyRewardedReportsCount,
    weeklyTargetsCount,
    weeklySeverityBreakdown
  } = useMemo(() => {
    const now = new Date();
    // Normalize to end of today
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Start of 7-day window (6 days prior, start of day)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);

    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];

    const formatDateShort = (d: Date) => {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    };

    // Prepare day buckets for all 7 days
    const buckets: Array<{
      dateKey: string;
      label: string;
      dayOfWeek: string;
      reports: VulnerabilityReport[];
      bountiesUSD: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const isToday = i === 0;
      const isYesterday = i === 1;

      const dayOfWeekShort = isToday 
        ? 'Hoje' 
        : isYesterday 
          ? 'Ontem' 
          : d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);

      buckets.push({
        dateKey,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dayOfWeek: dayOfWeekShort,
        reports: [],
        bountiesUSD: 0
      });
    }

    const bucketMap = new Map(buckets.map(b => [b.dateKey, b]));

    // Find reports created/submitted in the 7-day window
    const reportsInWindow: VulnerabilityReport[] = [];
    const rewardedReportIds = new Set<string>();
    let totalRewardsUSD = 0;

    reports.forEach(report => {
      const createdDateStr = report.createdAt ? report.createdAt.substring(0, 10) : '';
      const updatedDateStr = report.updatedAt ? report.updatedAt.substring(0, 10) : '';
      
      const createdInWindow = createdDateStr >= startISO && createdDateStr <= endISO;

      if (createdInWindow) {
        reportsInWindow.push(report);
        const bucket = bucketMap.get(createdDateStr);
        if (bucket) {
          bucket.reports.push(report);
        }
      }

      // Check for bounties awarded in the last 7 days
      // 1. First inspect timeline events of type 'bounty'
      let reportBountyInWindow = 0;
      let hasBountyInTimeline = false;

      if (report.timeline && report.timeline.length > 0) {
        report.timeline.forEach(event => {
          if (event.type === 'bounty') {
            const eventDateStr = event.date ? event.date.substring(0, 10) : '';
            if (eventDateStr >= startISO && eventDateStr <= endISO) {
              hasBountyInTimeline = true;
              // Extract numeric amount if notes specify, or fallback to report.bountyAmount
              const match = event.notes ? event.notes.match(/\$?([0-9,]+)/) : null;
              const parsed = match ? parseFloat(match[1].replace(/,/g, '')) : (report.bountyAmount || 0);
              const amount = parsed > 0 ? parsed : (report.bountyAmount || 0);
              reportBountyInWindow += amount;
              
              const b = bucketMap.get(eventDateStr);
              if (b) {
                b.bountiesUSD += amount;
              }
            }
          }
        });
      }

      // 2. If no timeline bounty event was matched, but report is REWARDED and updatedAt/createdAt falls in window
      if (!hasBountyInTimeline && (report.status === 'REWARDED' || report.bountyAmount > 0)) {
        const rewardDateStr = updatedDateStr || createdDateStr;
        if (rewardDateStr >= startISO && rewardDateStr <= endISO) {
          const amount = report.bountyAmount || 0;
          if (amount > 0) {
            reportBountyInWindow += amount;
            const b = bucketMap.get(rewardDateStr);
            if (b) {
              b.bountiesUSD += amount;
            }
          }
        }
      }

      if (reportBountyInWindow > 0) {
        totalRewardsUSD += reportBountyInWindow;
        rewardedReportIds.add(report.id);
      }
    });

    // Counts & breakdowns
    const submittedCount = reportsInWindow.filter(r => r.status !== 'DRAFT').length;
    const draftCount = reportsInWindow.filter(r => r.status === 'DRAFT').length;

    const uniqueTargets = new Set(reportsInWindow.map(r => r.target).filter(Boolean));

    const severityCount: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0
    };

    reportsInWindow.forEach(r => {
      if (r.severity && severityCount[r.severity] !== undefined) {
        severityCount[r.severity]++;
      }
    });

    return {
      startDate: start,
      endDate: end,
      startDateFormatted: formatDateShort(start),
      endDateFormatted: formatDateShort(end),
      dayBuckets: buckets,
      weeklyReports: reportsInWindow,
      weeklySubmittedCount: submittedCount,
      weeklyDraftCount: draftCount,
      weeklyTotalRewardsUSD: totalRewardsUSD,
      weeklyRewardedReportsCount: rewardedReportIds.size,
      weeklyTargetsCount: uniqueTargets.size,
      weeklySeverityBreakdown: severityCount
    };
  }, [reports]);

  // Filtered reports for the details list if a specific day is clicked
  const displayReports = useMemo(() => {
    if (!selectedDayFilter) {
      return weeklyReports;
    }
    return weeklyReports.filter(r => (r.createdAt ? r.createdAt.substring(0, 10) : '') === selectedDayFilter);
  }, [weeklyReports, selectedDayFilter]);

  const maxReportsInDay = Math.max(1, ...dayBuckets.map(b => b.reports.length));

  return (
    <section 
      id="weekly-summary-section"
      className="relative rounded-xl bg-gradient-to-b from-[#111114] to-[#0c0c0e] border border-[#26262a] p-5 sm:p-6 shadow-xl transition-all"
    >
      {/* Background Subtle Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none rounded-xl" />

      {/* Header Bar */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#222226]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span>Weekly Summary</span>
                <span className="text-zinc-500 font-light hidden sm:inline">|</span>
                <span className="text-xs font-mono font-normal text-emerald-400">Últimos 7 Dias</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                Sprint Ativo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              Período: <span className="text-zinc-300 font-semibold">{startDateFormatted}</span> até <span className="text-zinc-300 font-semibold">{endDateFormatted}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-weekly-new-submission"
            type="button"
            onClick={onNewReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
            title="Criar novo relatório para esta semana"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Submission</span>
          </button>
          
          {weeklyReports.length > 0 && (
            <button
              id="btn-toggle-weekly-details"
              type="button"
              onClick={() => setIsDetailsExpanded(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-[#2e2e34] text-zinc-300 hover:text-white text-xs font-mono transition-all"
              title="Expandir detalhes dos relatórios da semana"
            >
              <span>{isDetailsExpanded ? 'Ocultar Lista' : `Ver Achados (${weeklyReports.length})`}</span>
              {isDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        
        {/* Card 1: Total New Reports Submitted */}
        <div className="relative rounded-xl bg-[#141418] border border-[#26262c] p-4 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">New Reports (7d)</span>
            <span className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-light text-white font-mono tracking-tight">
                {String(weeklyReports.length).padStart(2, '0')}
              </span>
              <span className="text-xs text-zinc-500 font-mono">relatório(s)</span>
            </div>
            
            {/* Status breakdown chip */}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>{weeklySubmittedCount} submetido(s)</span>
              </span>
              {weeklyDraftCount > 0 && (
                <span className="text-zinc-500 font-mono">
                  • {weeklyDraftCount} rascunho
                </span>
              )}
            </div>
          </div>

          {/* Micro Severity distribution pills */}
          <div className="flex items-center gap-1.5 pt-2.5 border-t border-[#222228] text-[10px] font-mono">
            {weeklySeverityBreakdown.CRITICAL > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                {weeklySeverityBreakdown.CRITICAL} Crit
              </span>
            )}
            {weeklySeverityBreakdown.HIGH > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                {weeklySeverityBreakdown.HIGH} High
              </span>
            )}
            {weeklySeverityBreakdown.MEDIUM > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                {weeklySeverityBreakdown.MEDIUM} Med
              </span>
            )}
            {weeklySeverityBreakdown.LOW > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {weeklySeverityBreakdown.LOW} Low
              </span>
            )}
            {weeklyReports.length === 0 && (
              <span className="text-zinc-500 italic">Sem achados nesta semana</span>
            )}
          </div>
        </div>

        {/* Card 2: Total Rewards Earned (Last 7 Days) */}
        <div className="relative rounded-xl bg-[#141418] border border-[#26262c] p-4 flex flex-col justify-between group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Rewards Earned (7d)</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-light text-emerald-400 font-mono tracking-tight">
                {formatCurrency(weeklyTotalRewardsUSD, 'USD')}
              </span>
            </div>
            
            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              ≈ {formatCurrency(weeklyTotalRewardsUSD * usdToBrlRate, 'BRL')} estimado
            </p>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-[#222228] text-[10px] text-zinc-400 font-mono">
            <span>{weeklyRewardedReportsCount} recompensa(s) atribuída(s)</span>
            {weeklyTotalRewardsUSD > 0 && weeklyRewardedReportsCount > 0 && (
              <span className="text-emerald-400 font-semibold">
                Média {formatCurrency(Math.round(weeklyTotalRewardsUSD / weeklyRewardedReportsCount), 'USD')}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Sprint Velocity & Acceptance */}
        <div className="relative rounded-xl bg-[#141418] border border-[#26262c] p-4 flex flex-col justify-between group hover:border-zinc-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Sprint Velocity</span>
            <span className="p-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-light text-white font-mono tracking-tight">
                {(weeklyReports.length / 7).toFixed(1)}
              </span>
              <span className="text-xs text-zinc-500 font-mono">achados / dia</span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-400">
              <Target className="w-3.5 h-3.5 text-zinc-500" />
              <span>{weeklyTargetsCount} escopo(s) / programas ativos</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-[#222228] text-[10px] text-zinc-400 font-mono">
            <span>Ritmo de Pesquisa</span>
            <span className={weeklyReports.length >= 3 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
              {weeklyReports.length >= 3 ? 'Alto Rendimento 🔥' : 'Foco em Recon'}
            </span>
          </div>
        </div>

        {/* Card 4: 7-Day Sparkline / Daily Distribution Breakdown */}
        <div className="relative rounded-xl bg-[#141418] border border-[#26262c] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Atividade por Dia</span>
            {selectedDayFilter && (
              <button
                onClick={() => setSelectedDayFilter(null)}
                className="text-[10px] text-emerald-400 hover:underline font-mono"
              >
                Limpar Filtro
              </button>
            )}
          </div>

          {/* Mini Interactive 7-Day Bar Chart */}
          <div className="grid grid-cols-7 gap-1.5 items-end h-20 pt-2 pb-1">
            {dayBuckets.map((bucket) => {
              const count = bucket.reports.length;
              const hasBounty = bucket.bountiesUSD > 0;
              const heightPercent = count > 0 
                ? Math.min(100, Math.max(25, (count / maxReportsInDay) * 100))
                : 8;
              const isSelected = selectedDayFilter === bucket.dateKey;

              return (
                <button
                  key={bucket.dateKey}
                  type="button"
                  onClick={() => {
                    if (count > 0) {
                      setSelectedDayFilter(isSelected ? null : bucket.dateKey);
                      setIsDetailsExpanded(true);
                    }
                  }}
                  disabled={count === 0}
                  className={`flex flex-col items-center justify-end h-full group focus:outline-none transition-all rounded p-0.5 ${
                    isSelected ? 'bg-emerald-950/40 ring-1 ring-emerald-500' : ''
                  } ${count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                  title={`${bucket.label} (${bucket.dayOfWeek}): ${count} achado(s)${hasBounty ? ` • ${formatCurrency(bucket.bountiesUSD, 'USD')} em bounties` : ''}`}
                >
                  {/* Bounty micro indicator dot */}
                  {hasBounty && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mb-1 shadow-sm shadow-emerald-400/50" />
                  )}

                  {/* Bar */}
                  <div className="w-full bg-[#202026] rounded-t overflow-hidden flex items-end">
                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${
                        isSelected
                          ? 'bg-emerald-400'
                          : count > 0
                            ? hasBounty
                              ? 'bg-emerald-500 group-hover:bg-emerald-400'
                              : 'bg-sky-500/80 group-hover:bg-sky-400'
                            : 'bg-zinc-800/40'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Day label */}
                  <span className={`text-[9px] font-mono mt-1 ${
                    isSelected ? 'text-emerald-400 font-bold' : count > 0 ? 'text-zinc-300' : 'text-zinc-600'
                  }`}>
                    {bucket.dayOfWeek}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#222228] text-[9px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Bounty pago
            </span>
            <span>Clique na barra para filtrar</span>
          </div>
        </div>

      </div>

      {/* Expandable Section: List of This Week's Reports */}
      {isDetailsExpanded && (
        <div className="mt-5 pt-4 border-t border-[#222226] animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <span>Achados Registrados no Período</span>
              {selectedDayFilter && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                  Filtrando dia: {selectedDayFilter}
                </span>
              )}
            </h3>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
              >
                <span>Ver todos em Reports</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {displayReports.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#101014] border border-[#222226] text-center text-zinc-500 text-xs font-mono">
              Nenhum relatório encontrado para o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-2">
              {displayReports.map(report => {
                const sevColor = getSeverityBadgeColor(report.severity);
                const statusColor = getStatusBadgeColor(report.status);

                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className="p-3 rounded-lg bg-[#121216] hover:bg-[#18181e] border border-[#222226] hover:border-emerald-500/30 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold shrink-0 mt-0.5 ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}>
                        {report.severity}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                          {report.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-zinc-400 font-mono">
                          <span className="text-emerald-400 font-medium">{report.target}</span>
                          <span>•</span>
                          <span>{report.platform}</span>
                          <span>•</span>
                          <span>{report.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {report.bountyAmount > 0 && (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {formatCurrency(report.bountyAmount, 'USD')}
                        </span>
                      )}
                      <StatusBadge status={report.status} size="xs" />
                      <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
