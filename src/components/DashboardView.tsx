import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink, 
  Plus, 
  Zap, 
  Award,
  Filter,
  Activity,
  HelpCircle,
  Database
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { SeverityBreakdownChart } from './SeverityBreakdownChart';
import { SeverityPieChart } from './SeverityPieChart';
import { ReportsTrendChart } from './ReportsTrendChart';
import { MonthlySubmissionCadenceChart } from './MonthlySubmissionCadenceChart';
import { FutureEarningsProjectionChart } from './FutureEarningsProjectionChart';
import { ActivityHeatmap } from './ActivityHeatmap';
import { CvssComparisonTool } from './CvssComparisonTool';
import { BugBountyDirectoryView } from './BugBountyDirectoryView';
import { WeeklySummary } from './WeeklySummary';
import { StatusBadge } from './StatusBadge';
import { ReportNotificationPanel } from './ReportNotificationPanel';
import { HourlyRateMetrics } from './HourlyRateMetrics';
import { TimelineEvent } from '../types';

interface DashboardViewProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNewReport: () => void;
  onNavigateTab: (tab: 'reports' | 'cve' | 'targets' | 'docs' | 'platforms') => void;
  onOpenAbout?: () => void;
  onSelectSeverity?: (severity: Severity) => void;
  onAddTimelineEvent?: (reportId: string, event: Omit<TimelineEvent, 'id'>) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateTab,
  onOpenAbout,
  onSelectSeverity,
  onAddTimelineEvent
}) => {
  const usdToBrl = 5.45;

  // Calculate high-precision metrics
  const rewardedReports = reports.filter(r => r.status === 'REWARDED' || r.bountyAmount > 0);
  const totalEarnedUSD = rewardedReports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
  const totalEarnedBRL = totalEarnedUSD * usdToBrl;

  const triagedReports = reports.filter(r => r.status === 'TRIAGED');
  const submittedReports = reports.filter(r => r.status === 'SUBMITTED');
  const pendingPotentialUSD = triagedReports.reduce((acc, r) => acc + (r.bountyAmount || 1000), 0);

  const resolvedOrRewardedCount = reports.filter(r => r.status === 'REWARDED' || r.status === 'RESOLVED').length;
  const invalidCount = reports.filter(r => r.status === 'DUPLICATE' || r.status === 'OUT_OF_SCOPE').length;
  const closedCount = resolvedOrRewardedCount + invalidCount;
  const acceptanceRate = closedCount > 0 ? Math.round((resolvedOrRewardedCount / closedCount) * 100) : 100;

  const avgRewardUSD = rewardedReports.length > 0 ? Math.round(totalEarnedUSD / rewardedReports.length) : 0;

  // Platform breakdown
  const platforms = ['HackerOne', 'Bugcrowd', 'Intigriti', 'YesWeHack', 'Synack', 'Direct / VDP'];
  const platformStats = platforms.map(platform => {
    const pReports = reports.filter(r => r.platform === platform);
    const pEarned = pReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
    return {
      platform,
      count: pReports.length,
      earned: pEarned,
      percent: totalEarnedUSD > 0 ? Math.round((pEarned / totalEarnedUSD) * 100) : 0
    };
  }).filter(p => p.count > 0).sort((a, b) => b.earned - a.earned);

  // Severity breakdown
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const severityStats = severities.map(sev => {
    const sReports = reports.filter(r => r.severity === sev);
    const sEarned = sReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);
    return {
      severity: sev,
      count: sReports.length,
      earned: sEarned
    };
  });

  // Recent reports
  const recentReports = [...reports].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  // Aggregated Recent Activity: Last 5 timeline events across all reports
  const recentTimelineEvents = reports
    .flatMap(report => 
      (report.timeline || []).map(event => ({
        ...event,
        reportId: report.id,
        reportTitle: report.title,
        reportSeverity: report.severity,
        reportTarget: report.target,
        report
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getTimelineEventVisuals = (type: string) => {
    switch (type) {
      case 'bounty':
        return { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'status_change':
        return { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'creation':
        return { icon: Plus, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' };
      case 'pgp_signature':
        return { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'dispatch':
        return { icon: ExternalLink, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
      default:
        return { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Welcome & Action Banner */}
      <div className="rounded-xl bg-[#0a0a0a] border border-[#262626] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Bug Bounty Command & Intelligence Terminal</span>
            </div>
            {onOpenAbout && (
              <button
                type="button"
                onClick={onOpenAbout}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono hover:bg-amber-500/20 transition-colors cursor-pointer"
                title="Clique para entender os dados mock e a persistência local"
              >
                <Database className="w-3 h-3" />
                <span>Dados Mock (localStorage ativo)</span>
              </button>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white uppercase">
            Sentinel Vulnerability Workbench
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Centralize os achados, acelere submissões para HackerOne, Bugcrowd e Intigriti, consulte vetores de CVE e acompanhe o fluxo de recompensas financeiras em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenAbout && (
            <button
              id="btn-dashboard-about-help"
              onClick={onOpenAbout}
              className="bg-[#141414] hover:bg-[#1f1f1f] text-zinc-300 hover:text-white border border-[#2b2b2b] text-xs uppercase tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1.5"
              title="Entenda a origem dos dados mock e como usar o sistema"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sobre & Guia Mock</span>
            </button>
          )}
          <button
            id="btn-dashboard-new-report"
            onClick={onNewReport}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Submission +</span>
          </button>
          <button
            id="btn-dashboard-cve-search"
            onClick={() => onNavigateTab('cve')}
            className="bg-[#121212] hover:bg-[#1a1a1a] text-zinc-300 hover:text-white border border-[#262626] text-xs uppercase tracking-wider px-4 py-2 rounded transition-all"
          >
            <span>CVE Correlation DB</span>
          </button>
        </div>
      </div>

      {/* Prominent Weekly Summary (Last 7 Days: Submissions & Rewards Earned) */}
      <WeeklySummary
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
        onNavigateTab={onNavigateTab}
      />

      {/* Primary KPI Metrics Grid - Sophisticated Dark Architecture */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Bounties / Earnings */}
        <div className="bg-[#121212] border border-[#262626] p-4 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase mb-1">Total Bounties</p>
          <h3 className="text-3xl font-light text-white font-mono">
            {formatCurrency(totalEarnedUSD, 'USD')}
          </h3>
          <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-700" 
              style={{ width: `${Math.min(100, Math.max(25, (totalEarnedUSD / 25000) * 100))}%` }} 
            />
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-400 font-mono">{formatCurrency(totalEarnedBRL, 'BRL')} estimado</p>
        </div>

        {/* Critical Findings */}
        <div className="bg-[#121212] border border-[#262626] p-4 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase mb-1">Critical Findings</p>
          <h3 className="text-3xl font-light text-red-500 font-mono">
            {String(severityStats.find(s => s.severity === 'CRITICAL')?.count || 0).padStart(2, '0')}
          </h3>
          <div className="mt-2 text-[10px] text-zinc-400 italic flex items-center justify-between">
            <span>{triagedReports.length} pending validation</span>
            <span className="text-red-400 font-mono">{formatCurrency(severityStats.find(s => s.severity === 'CRITICAL')?.earned || 0, 'USD')}</span>
          </div>
        </div>

        {/* CVE ID Reservations / Tracked */}
        <div className="bg-[#121212] border border-[#262626] p-4 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase mb-1">CVE ID Reservations</p>
          <h3 className="text-3xl font-light text-blue-400 font-mono">
            {String(reports.reduce((acc, r) => acc + (r.cveIds?.length || 0), 0)).padStart(2, '0')}
          </h3>
          <div className="mt-2 text-[10px] text-zinc-400 font-mono truncate">
            Tracking: {reports.find(r => r.cveIds?.length > 0)?.cveIds[0] || 'CVE-2024-21413'}...
          </div>
        </div>

        {/* Submission Success Rate */}
        <div className="bg-[#121212] border border-[#262626] p-4 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase mb-1">Submission Success Rate</p>
          <h3 className="text-3xl font-light text-emerald-400 font-mono">
            {acceptanceRate}%
          </h3>
          <div className="mt-2 text-[10px] text-zinc-400 flex items-center justify-between">
            <span>High reputation score</span>
            <span className="text-emerald-400 font-mono">{resolvedOrRewardedCount}/{reports.length} valid</span>
          </div>
        </div>

      </section>
 
      {/* Bug Bounty Hourly Rate & Efficiency Metrics (Calculated from Timeline Events & Bounties) */}
      <HourlyRateMetrics
        reports={reports}
        onSelectReport={onSelectReport}
        onAddTimelineEvent={onAddTimelineEvent}
      />

      {/* Actionable Report Attention & Milestones Notification Panel */}
      <ReportNotificationPanel
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
      />

      {/* Recharts Line Chart: Monthly Bug Submission Cadence Over Time */}
      <MonthlySubmissionCadenceChart
        reports={reports}
        onNewReport={onNewReport}
      />

      {/* Recharts Forecast & Predictive Chart: Future Bounty Earnings Projection */}
      <FutureEarningsProjectionChart
        reports={reports}
        onNewReport={onNewReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Recharts Line Chart: 30-Day Vulnerability Report Productivity & Trend */}
      <ReportsTrendChart
        reports={reports}
        onNewReport={onNewReport}
      />

      {/* Recharts Pie Chart: Vulnerability Distribution by Severity (Critical, High, Medium, Low) */}
      <SeverityPieChart
        reports={reports}
        onSeverityClick={(sev) => {
          if (onSelectSeverity) {
            onSelectSeverity(sev);
          } else {
            onNavigateTab('reports');
          }
        }}
        onNewReport={onNewReport}
      />

      {/* Recharts Bar & Severity Distribution Chart (Critical, High, Medium, Low) */}
      <SeverityBreakdownChart
        reports={reports}
        onSeverityClick={(sev) => {
          if (onSelectSeverity) {
            onSelectSeverity(sev);
          } else {
            onNavigateTab('reports');
          }
        }}
        onNewReport={onNewReport}
      />

      {/* 365-Day Calendar Activity Heatmap (GitHub-style frequency & streaks) */}
      <ActivityHeatmap
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
      />

      {/* Interactive CVSS v3.1 Differential Comparison Tool */}
      <CvssComparisonTool
        reports={reports}
      />

      {/* Bug Bounty Platforms Directory, Tutorials & Monetization Playbook */}
      <BugBountyDirectoryView
        reports={reports}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Main Grid: Left breakdown, Center report tracking lifecycle, Right tech intel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Programs / Platforms */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#262626] bg-[#111] flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Active Targets & Platforms</h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                {platformStats.length} SOURCES
              </span>
            </div>

            <div className="p-3 space-y-2">
              {platformStats.map((stat, idx) => (
                <div 
                  key={stat.platform} 
                  className={`p-3 rounded-lg border transition-colors ${
                    idx === 0 
                      ? 'bg-[#171717] border-emerald-500/20' 
                      : 'bg-[#121212] border-[#262626] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-200">{stat.platform}</p>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{formatCurrency(stat.earned, 'USD')}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                    <span>{stat.count} reports</span>
                    <span>{stat.percent}% total share</span>
                  </div>
                </div>
              ))}

              <button
                onClick={() => onNavigateTab('targets')}
                className="w-full p-2.5 bg-[#121212] hover:bg-[#171717] transition-colors rounded-lg text-zinc-500 hover:text-zinc-300 italic text-[11px] text-center border border-dashed border-zinc-800"
              >
                + Add new platform / target scope
              </button>

              <button
                onClick={() => onNavigateTab('platforms')}
                className="w-full p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Explorar 14 Plataformas & Guia de Ganhos →</span>
              </button>
            </div>
          </div>

          {/* Quick CVSS & Bounty Highlights */}
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Severity Highlights</h4>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">Live Intel</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="text-zinc-400">Critical & High Ratio</span>
                <span className="text-red-400 font-bold">
                  {reports.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length} / {reports.length} ({reports.length > 0 ? Math.round(((reports.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length) / reports.length) * 100) : 0}%)
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="text-zinc-400">Average CVSS Base</span>
                <span className="text-amber-400 font-bold">
                  {reports.length > 0 ? (reports.reduce((acc, r) => acc + (r.cvssScore || 0), 0) / reports.length).toFixed(1) : '0.0'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="text-zinc-400">Top Rewarded Bounty</span>
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(reports.length > 0 ? Math.max(...reports.map(r => r.bountyAmount || 0), 0) : 0, 'USD')}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Panel - Last 5 Timeline Events across all reports */}
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-lg">
            <div className="p-4 border-b border-[#262626] bg-[#111] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping opacity-75" />
                </div>
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Recent Activity</h4>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-medium">
                Last 5 Events
              </span>
            </div>

            <div className="p-3 space-y-2">
              {recentTimelineEvents.length === 0 ? (
                <div className="py-6 text-center text-zinc-600 font-mono text-xs italic">
                  Nenhuma atividade registrada ainda.
                </div>
              ) : (
                recentTimelineEvents.map((evt) => {
                  const visuals = getTimelineEventVisuals(evt.type);
                  const Icon = visuals.icon;
                  const sevBadge = getSeverityBadgeColor(evt.reportSeverity);

                  return (
                    <div
                      key={`${evt.reportId}-${evt.id}`}
                      onClick={() => onSelectReport(evt.report)}
                      className="p-2.5 rounded-lg bg-[#121212] border border-[#242424] hover:border-zinc-700 hover:bg-[#161616] transition-all cursor-pointer group"
                      title="Clique para inspecionar o relatório completo"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded shrink-0 border ${visuals.bg} ${visuals.color} mt-0.5`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                                {evt.title}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${sevBadge.bg} ${sevBadge.text}`}>
                                {evt.reportSeverity}
                              </span>
                              <StatusBadge status={evt.report.status} size="xs" />
                            </div>
                            {evt.notes && (
                              <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-sans">
                                {evt.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                              <span className="text-zinc-400">{evt.reportId}</span>
                              <span>•</span>
                              <span className="truncate max-w-[140px]">{evt.reportTarget}</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-zinc-500 shrink-0 whitespace-nowrap pt-0.5">
                          {evt.date}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2.5 border-t border-[#262626] bg-[#0c0c0c] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Sincronizado com timeline global</span>
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider transition-colors"
              >
                Ver Relatórios →
              </button>
            </div>
          </div>

        </div>

        {/* Right / Center Column: Report Tracking Lifecycle Table */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#262626] bg-[#111] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Report Tracking Lifecycle</h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {recentReports.length} of {reports.length}
                </span>
              </div>
              <button 
                onClick={onNewReport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3 py-1.5 rounded transition-all font-bold uppercase tracking-wider"
              >
                NEW SUBMISSION +
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 text-[10px] uppercase text-zinc-500 font-bold">
                  <tr>
                    <th className="px-4 py-3 border-b border-[#262626]">ID</th>
                    <th className="px-4 py-3 border-b border-[#262626]">Vulnerability</th>
                    <th className="px-4 py-3 border-b border-[#262626]">Severity</th>
                    <th className="px-4 py-3 border-b border-[#262626]">Status</th>
                    <th className="px-4 py-3 border-b border-[#262626]">Bounty</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#262626]">
                  {recentReports.map(report => {
                    const sevBadge = getSeverityBadgeColor(report.severity);
                    const statusBadge = getStatusBadgeColor(report.status);

                    return (
                      <tr 
                        key={report.id}
                        onClick={() => onSelectReport(report)}
                        className="hover:bg-[#121212]/60 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-zinc-500 whitespace-nowrap">
                          {report.id}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-zinc-200 hover:text-emerald-400 transition-colors truncate max-w-xs">
                            {report.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Target: {report.target} • {report.platform}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sevBadge.bg} ${sevBadge.text}`}>
                            {report.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={report.status} size="xs" />
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                          {report.bountyAmount > 0 ? (
                            <span className="text-emerald-400">{formatCurrency(report.bountyAmount, 'USD')}</span>
                          ) : (
                            <span className="text-zinc-500 font-normal">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-between text-[11px] text-zinc-500">
              <span>Showing high-priority pipeline records</span>
              <button 
                onClick={() => onNavigateTab('reports')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1"
              >
                <span>Full Ledger ({reports.length} reports) →</span>
              </button>
            </div>
          </div>

          {/* Quick Correlation & Library Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase text-zinc-500 mb-3 tracking-widest">
                  CVE Correlation Engine
                </h4>
                <div className="space-y-2.5">
                  <div className="p-3 bg-[#121212] border-l-2 border-blue-500 rounded-r-md">
                    <p className="text-[10px] text-blue-400 font-mono uppercase">MATCH FOUND</p>
                    <p className="text-xs font-semibold text-zinc-200">CVE-2024-21413 (Outlook RCE Moniker)</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 uppercase font-mono">CVSS 9.8 • Remote Code Execution</p>
                  </div>
                  <div className="p-3 bg-[#121212] border-l-2 border-emerald-500 rounded-r-md">
                    <p className="text-[10px] text-emerald-400 font-mono uppercase">POTENTIAL MATCH</p>
                    <p className="text-xs font-semibold text-zinc-200">OWASP-A01:2021 (Broken Access Control)</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 uppercase font-mono">Likelihood: 91% in API Endpoints</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('cve')}
                className="mt-3 text-left text-[11px] text-blue-400 hover:text-blue-300 font-medium"
              >
                Open CVE Database Explorer →
              </button>
            </div>

            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase text-zinc-500 mb-3 tracking-widest">
                  Tech Library & Checklists
                </h4>
                <ul className="space-y-2 text-xs">
                  <li 
                    onClick={() => onNavigateTab('docs')}
                    className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
                    <span>recon-methodology-owasp.md</span>
                  </li>
                  <li 
                    onClick={() => onNavigateTab('docs')}
                    className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <div className="w-1.5 h-1.5 bg-zinc-700 rounded-sm" />
                    <span>ssrf-cloud-metadata-bypass.txt</span>
                  </li>
                  <li 
                    onClick={() => onNavigateTab('docs')}
                    className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <div className="w-1.5 h-1.5 bg-zinc-700 rounded-sm" />
                    <span>idor-testing-matrix.md</span>
                  </li>
                </ul>
              </div>

              <div className="mt-3 p-2 bg-emerald-500/5 border border-emerald-500/10 rounded text-[10px] text-center italic text-emerald-400">
                Centralized docs synchronized with Workbench
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
