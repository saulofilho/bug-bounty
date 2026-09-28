import React, { useState, useMemo } from 'react';
import {
  Activity,
  FileText,
  ShieldCheck,
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { VulnerabilityReport, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { BaseCard } from './BaseCard';

export interface DailyActivitySummaryProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
  onUpdateStatus?: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
}

const USD_TO_BRL = 5.45;

/**
 * Checks if a date string (YYYY-MM-DD or ISO timestamp) matches Today in either local or UTC time.
 */
function isDateToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const trimmed = dateStr.trim();
  const datePart = trimmed.substring(0, 10);

  const now = new Date();
  const utcToday = now.toISOString().split('T')[0];
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (datePart === utcToday || datePart === localToday) {
    return true;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return (
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate()
    );
  }

  return false;
}

export const DailyActivitySummary: React.FC<DailyActivitySummaryProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onUpdateStatus
}) => {
  const [showTodayFeed, setShowTodayFeed] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');

  const convertMoney = (usd: number) => (currency === 'BRL' ? Math.round(usd * USD_TO_BRL) : usd);
  const formatMoney = (usd: number) => formatCurrency(convertMoney(usd), currency);

  const {
    todayFormatted,
    reportsCreatedTodayList,
    reportsCreatedTodayCount,
    criticalsResolvedTodayList,
    criticalsResolvedTodayCount,
    allCriticalsResolvedList,
    allCriticalsResolvedCount,
    totalCriticalsCount,
    pendingCriticalsList,
    bountiesEarnedTodayUSD,
    rewardedTodayList,
    todayTouchedReports
  } = useMemo(() => {
    const now = new Date();
    const todayFormattedStr = now.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // 1. Reports Created Today
    const createdToday = reports.filter(report => {
      if (isDateToday(report.createdAt)) return true;
      const creationEvt = (report.timeline || []).find(e => e.type === 'creation');
      return creationEvt ? isDateToday(creationEvt.date) : false;
    });

    // 2. Criticals Resolved (from current reports state)
    const allCriticals = reports.filter(r => r.severity === 'CRITICAL');
    const allCriticalsResolved = allCriticals.filter(
      r => r.status === 'RESOLVED' || r.status === 'REWARDED'
    );
    const pendingCriticals = allCriticals.filter(
      r => r.status !== 'RESOLVED' && r.status !== 'REWARDED'
    );

    const criticalsResolvedToday = allCriticalsResolved.filter(report => {
      if (isDateToday(report.updatedAt) || isDateToday(report.createdAt)) return true;
      return (report.timeline || []).some(
        e => (e.type === 'status_change' || e.type === 'bounty') && isDateToday(e.date)
      );
    });

    // 3. Total Bounties Earned Today
    let bountiesTodayUSD = 0;
    const rewardedToday: VulnerabilityReport[] = [];

    reports.forEach(report => {
      const bountyEventsToday = (report.timeline || []).filter(
        e => e.type === 'bounty' && isDateToday(e.date)
      );

      if (bountyEventsToday.length > 0) {
        let reportTodayBounty = 0;
        bountyEventsToday.forEach(evt => {
          const match = evt.notes ? evt.notes.match(/\$?([0-9,]+)/) : null;
          const parsed = match ? parseFloat(match[1].replace(/,/g, '')) : (report.bountyAmount || 0);
          reportTodayBounty += parsed > 0 ? parsed : (report.bountyAmount || 0);
        });
        if (reportTodayBounty > 0) {
          bountiesTodayUSD += reportTodayBounty;
          rewardedToday.push(report);
        }
      } else if (
        (report.status === 'REWARDED' || (report.bountyAmount || 0) > 0) &&
        (isDateToday(report.updatedAt) || isDateToday(report.createdAt))
      ) {
        bountiesTodayUSD += report.bountyAmount || 0;
        rewardedToday.push(report);
      }
    });

    // Combined list of reports with activity today
    const touchedSet = new Map<string, VulnerabilityReport>();
    [...createdToday, ...criticalsResolvedToday, ...rewardedToday].forEach(r => {
      touchedSet.set(r.id, r);
    });
    reports.forEach(r => {
      if (isDateToday(r.updatedAt) || (r.timeline || []).some(e => isDateToday(e.date))) {
        touchedSet.set(r.id, r);
      }
    });

    return {
      todayFormatted: todayFormattedStr,
      reportsCreatedTodayList: createdToday,
      reportsCreatedTodayCount: createdToday.length,
      criticalsResolvedTodayList: criticalsResolvedToday,
      criticalsResolvedTodayCount: criticalsResolvedToday.length,
      allCriticalsResolvedList: allCriticalsResolved,
      allCriticalsResolvedCount: allCriticalsResolved.length,
      totalCriticalsCount: allCriticals.length,
      pendingCriticalsList: pendingCriticals,
      bountiesEarnedTodayUSD: bountiesTodayUSD,
      rewardedTodayList: rewardedToday,
      todayTouchedReports: Array.from(touchedSet.values())
    };
  }, [reports]);

  return (
    <BaseCard
      as="section"
      id="daily-activity-summary-card"
      elevation="card"
      border="default"
      rounded="xl"
      padding="md"
      className="space-y-4 overflow-hidden relative"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#24242c]">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Daily Activity Summary
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE • {todayFormatted}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Resumo diário em tempo real calculado diretamente do estado atual de relatórios (<code className="text-emerald-400 font-mono">reports</code>).
            </p>
          </div>
        </div>

        {/* Right Controls: Currency Switcher, Quick New Report & Expand Toggle */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-[#16161d] border border-[#282834] rounded-lg p-0.5 flex items-center gap-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                currency === 'USD' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BRL')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                currency === 'BRL' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              BRL
            </button>
          </div>

          {onNewReport && (
            <button
              type="button"
              id="btn-daily-summary-new-report"
              onClick={onNewReport}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 hover:text-white border border-emerald-500/35 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Report Today</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTodayFeed(prev => !prev)}
            className="px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222e] text-zinc-300 border border-[#2a2a38] text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Detalhes ({todayTouchedReports.length})</span>
            {showTodayFeed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3 Primary Daily KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Reports Created Today */}
        <div
          id="daily-metric-reports-created-today"
          className="bg-[#121217] border border-[#242430] hover:border-sky-500/40 rounded-xl p-4 flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Reports Created Today</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/25 font-mono text-[10px] font-bold">
                Relatórios Hoje
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 my-1">
              <span className="text-3xl font-light font-mono text-white tabular-nums">
                {reportsCreatedTodayCount}
              </span>
              <span className="text-xs font-mono text-sky-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>de {reports.length} no portfólio</span>
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1e1e28] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="truncate">
              {reportsCreatedTodayCount > 0
                ? `Último: ${reportsCreatedTodayList[0].id} (${reportsCreatedTodayList[0].severity})`
                : 'Nenhuma submissão criada hoje'}
            </span>
            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="text-sky-400 hover:text-sky-300 font-bold underline-offset-2 hover:underline shrink-0 ml-2 cursor-pointer"
              >
                + Criar
              </button>
            )}
          </div>
        </div>

        {/* Metric 2: Criticals Resolved */}
        <div
          id="daily-metric-criticals-resolved"
          className="bg-[#121217] border border-[#242430] hover:border-rose-500/40 rounded-xl p-4 flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Criticals Resolved</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25 font-mono text-[10px] font-bold">
                {criticalsResolvedTodayCount > 0
                  ? `+${criticalsResolvedTodayCount} resolvido(s) hoje`
                  : 'Críticos Mitigados'}
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 my-1">
              <span className="text-3xl font-light font-mono text-rose-400 tabular-nums">
                {allCriticalsResolvedCount}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                / {totalCriticalsCount} críticos ({totalCriticalsCount > 0 ? Math.round((allCriticalsResolvedCount / totalCriticalsCount) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1e1e28] flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
            {pendingCriticalsList.length > 0 && onUpdateStatus ? (
              <>
                <span className="text-amber-300 truncate">
                  {pendingCriticalsList.length} crítico(s) pendente(s)
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(pendingCriticalsList[0].id, 'RESOLVED')}
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40 text-[10px] font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                  title={`Marcar ${pendingCriticalsList[0].id} como RESOLVED agora`}
                >
                  <CheckCircle2 className="w-3 h-3 text-rose-400" />
                  <span>Resolver {pendingCriticalsList[0].id}</span>
                </button>
              </>
            ) : (
              <>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% dos críticos resolvidos</span>
                </span>
                <span className="text-zinc-500">Hoje: {criticalsResolvedTodayCount}</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 3: Total Bounties Earned Today */}
        <div
          id="daily-metric-bounties-earned-today"
          className="bg-[#121217] border border-[#242430] hover:border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between transition-all"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Total Bounties Earned Today</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[10px] font-bold">
                Recompensas Hoje
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 my-1">
              <span className="text-3xl font-light font-mono text-emerald-400 tabular-nums">
                {formatMoney(bountiesEarnedTodayUSD)}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                ({rewardedTodayList.length} {rewardedTodayList.length === 1 ? 'bounty' : 'bounties'} hoje)
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1e1e28] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>
              {currency === 'USD'
                ? `Equivalente: ${formatCurrency(Math.round(bountiesEarnedTodayUSD * USD_TO_BRL), 'BRL')}`
                : `Original: ${formatCurrency(bountiesEarnedTodayUSD, 'USD')}`}
            </span>
            <span className="text-emerald-400 font-bold">
              {rewardedTodayList.length > 0 ? 'Pago hoje' : 'Aguardando'}
            </span>
          </div>
        </div>

      </div>

      {/* Collapsible Today's Activity Breakdown */}
      {showTodayFeed && (
        <div className="pt-3 border-t border-[#24242c] space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relatórios Criados, Resolvidos ou Recompensados Hoje ({todayTouchedReports.length})</span>
            </span>
          </div>

          {todayTouchedReports.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#0d0d12] border border-dashed border-[#242430] text-center text-xs font-mono text-zinc-500">
              Nenhuma atividade registrada na data de hoje ({todayFormatted}). Clique em "Log Report Today" para registrar um novo achado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {todayTouchedReports.map(report => {
                const sevBadge = getSeverityBadgeColor(report.severity);
                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport && onSelectReport(report)}
                    className="p-3 rounded-lg bg-[#14141c] hover:bg-[#1a1a24] border border-[#262634] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-zinc-300">{report.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${sevBadge.bg} ${sevBadge.text}`}>
                          {report.severity}
                        </span>
                        <StatusBadge status={report.status} size="xs" />
                      </div>
                      <p className="text-xs font-semibold text-white truncate">{report.title}</p>
                      <p className="text-[10px] font-mono text-zinc-500">
                        {report.target} • {report.platform}
                      </p>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      {report.bountyAmount > 0 ? (
                        <span className="text-xs font-bold text-emerald-400 block">
                          {formatMoney(report.bountyAmount)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 block">Pendente</span>
                      )}
                      <span className="text-[10px] text-zinc-500">{report.updatedAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </BaseCard>
  );
};
