import React, { useMemo } from 'react';
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
  Database,
  Calculator,
  Lock,
  Flame,
  Timer,
  MessageSquareWarning,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { calculateTriageEfficiency } from '../utils/triageEfficiencyEngine';
import { SeverityBarChart } from './SeverityBarChart';
import { SeverityPieChart } from './SeverityPieChart';
import { ReportsTrendChart } from './ReportsTrendChart';
import { SixMonthTrendLineChart } from './SixMonthTrendLineChart';
import { ThreatDiscoveryTrend } from './ThreatDiscoveryTrend';
import { FutureEarningsProjectionChart } from './FutureEarningsProjectionChart';
import { ActivityHeatmap } from './ActivityHeatmap';
import { CvssComparisonTool } from './CvssComparisonTool';
import { BugBountyDirectoryView } from './BugBountyDirectoryView';
import { WeeklySummary } from './WeeklySummary';
import { StatusBadge } from './StatusBadge';
import { ReportNotificationPanel } from './ReportNotificationPanel';
import { SmartAnomalyDetector } from './SmartAnomalyDetector';
import { DashboardActivityTimeline } from './DashboardActivityTimeline';
import { GlobalSecurityIncidentTimeline } from './GlobalSecurityIncidentTimeline';
import { ReporterInteractionSentiment } from './ReporterInteractionSentiment';
import { HourlyRateMetrics } from './HourlyRateMetrics';
import { TriageEfficiencyCard } from './TriageEfficiencyCard';
import { GlobalThreatMap } from './GlobalThreatMap';
import { RecentGlobalThreatIntelligence } from './RecentGlobalThreatIntelligence';
import { VulnerabilityImpactScorecard } from './VulnerabilityImpactScorecard';
import { VulnerabilityHeatmap } from './VulnerabilityHeatmap';
import { RiskPriorityMatrix } from './RiskPriorityMatrix';
import { RiskAssessmentMatrix } from './RiskAssessmentMatrix';
import { BountyPayoutTracker } from './BountyPayoutTracker';
import { TimelineEvent } from '../types';

interface DashboardViewProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNewReport: () => void;
  onNavigateTab: (tab: 'reports' | 'cve' | 'targets' | 'docs' | 'platforms') => void;
  onOpenAbout?: () => void;
  onOpenCvssCalculator?: (vector?: string, reportId?: string) => void;
  onSelectSeverity?: (severity: Severity) => void;
  onAddTimelineEvent?: (reportId: string, event: Omit<TimelineEvent, 'id'>) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNavigateTab,
  onOpenAbout,
  onOpenCvssCalculator,
  onSelectSeverity,
  onAddTimelineEvent
}) => {
  const { isAuthenticated, openLoginModal } = useAuth();
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

  // Triage efficiency calculated from historical timeline events
  const triageEfficiency = useMemo(() => calculateTriageEfficiency(reports), [reports]);

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
          {onOpenCvssCalculator && (
            <button
              id="btn-dashboard-cvss-calc"
              onClick={() => onOpenCvssCalculator()}
              className="bg-[#141417] hover:bg-[#1f1f26] text-zinc-200 hover:text-white border border-[#2b2b35] hover:border-emerald-500/40 text-xs font-mono font-semibold tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1.5 shadow-sm"
              title="Calculadora de Gravidade CVSS v3.1 (Alt+C)"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>CVSS Calc</span>
            </button>
          )}

          <button
            id="btn-dashboard-sentiment-tracker"
            onClick={() => document.getElementById('reporter-interaction-sentiment-tracker')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#141417] hover:bg-[#1f1f26] text-zinc-200 hover:text-white border border-[#2b2b35] hover:border-red-500/40 text-xs font-mono font-semibold tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1.5 shadow-sm"
            title="Ir para Reporter Interaction Sentiment Tracker"
          >
            <MessageSquareWarning className="w-3.5 h-3.5 text-red-400" />
            <span>Sentiment Tracker</span>
          </button>

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

      {/* Firebase Auth Quick Warning Bar if unauthenticated */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100">Modo Convidado (Acesso Limitado aos Relatórios)</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                  Firebase Auth
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Para registrar novos relatórios, editar vulnerabilidades existentes ou visualizar PoCs confidenciais, autentique-se como Administrador ou Pesquisador.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-dashboard-auth-prompt"
            onClick={() => openLoginModal('general')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-950/40 shrink-0 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Fazer Login</span>
          </button>
        </div>
      )}

      {/* Prominent Weekly Summary (Last 7 Days: Submissions & Rewards Earned) */}
      <WeeklySummary
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
        onNavigateTab={onNavigateTab}
      />

      {/* Primary KPI Metrics Grid - Sophisticated Dark Architecture */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
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
        {(() => {
          const criticalCount = severityStats.find(s => s.severity === 'CRITICAL')?.count || 0;
          const criticalEarned = severityStats.find(s => s.severity === 'CRITICAL')?.earned || 0;
          const isCriticalActive = criticalCount > 0;

          return (
            <div 
              onClick={() => {
                if (onSelectSeverity) onSelectSeverity('CRITICAL');
                else onNavigateTab('reports');
              }}
              className={`p-4 rounded-lg transition-all relative overflow-hidden cursor-pointer ${
                isCriticalActive 
                  ? 'bg-gradient-to-br from-red-950/40 via-[#161012] to-[#121212] critical-vuln-card-glow' 
                  : 'bg-[#121212] border border-[#262626]'
              }`}
              title="Clique para filtrar apenas vulnerabilidades CRITICAL"
            >
              {isCriticalActive && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 critical-radar-ping" />
                  </span>
                  <span className="text-[9px] font-mono font-bold text-red-300 uppercase tracking-wider bg-red-950/80 border border-red-500/50 px-1.5 py-0.2 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    ALERTA P1
                  </span>
                </div>
              )}
              <p className="text-xs text-zinc-400 uppercase mb-1 flex items-center gap-1.5">
                <ShieldAlert className={`w-3.5 h-3.5 text-red-500 ${isCriticalActive ? 'animate-pulse' : ''}`} />
                <span>Critical Findings</span>
              </p>
              <h3 className="text-3xl font-light text-red-500 font-mono tracking-tight flex items-baseline gap-2">
                <span className={isCriticalActive ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] font-normal' : ''}>
                  {String(criticalCount).padStart(2, '0')}
                </span>
                {isCriticalActive && (
                  <span className="text-[10px] font-bold text-red-300 uppercase font-mono tracking-widest bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/40 animate-pulse">
                    MÁXIMA PRIORIDADE
                  </span>
                )}
              </h3>
              <div className="mt-2 text-[10px] text-zinc-400 italic flex items-center justify-between">
                <span>{triagedReports.length} pending validation</span>
                <span className="text-red-400 font-mono font-bold">{formatCurrency(criticalEarned, 'USD')}</span>
              </div>
            </div>
          );
        })()}

        {/* Triage Efficiency Metric Card */}
        <div className="bg-[#121212] border border-[#262626] p-4 rounded-lg flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Eficiência de Triagem</span>
              </p>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Timeline
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-3xl font-light text-cyan-400 font-mono">
                {triageEfficiency.avgDaysToTriage > 0 ? `${triageEfficiency.avgDaysToTriage.toFixed(1)}` : '—'}
              </h3>
              <span className="text-xs font-mono text-zinc-400">dias</span>
              <span className="text-[10px] font-mono text-zinc-500">(~{triageEfficiency.avgHoursToTriage}h)</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(15, triageEfficiency.slaUnder48hPercent))}%` }} 
              />
            </div>
            <div className="mt-1.5 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
              <span className="text-cyan-300">{triageEfficiency.slaUnder48hPercent}% &le; 48h</span>
              <span className="text-emerald-400 font-bold">{triageEfficiency.avgDaysToClose.toFixed(1)}d fechamento</span>
            </div>
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

      {/* Triage Efficiency & Response Turnaround Module (DRAFT -> TRIAGED / CLOSED from Timeline) */}
      <TriageEfficiencyCard
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />
 
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

      {/* Smart Anomaly Detector: Timeline & Documentation Analysis */}
      <SmartAnomalyDetector
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Global Security Incident Timeline: Aggregates and visualizes all timeline events from every report in chronological order to track vulnerability discovery trends */}
      <GlobalSecurityIncidentTimeline
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
        onNewReport={onNewReport}
      />

      {/* Dashboard Activity Timeline: Scrollable Unified History Feed of System-Wide Actions */}
      <DashboardActivityTimeline
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
        onNewReport={onNewReport}
      />

      {/* Reporter Interaction Sentiment: Timeline Tone & Program Manager Friction Tracker */}
      <ReporterInteractionSentiment
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* D3.js Global Threat Map: Geospatial Target Distribution & IP Telemetry */}
      <GlobalThreatMap
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Recent Global Threat Intelligence: Live security headlines & advisories via Search Tool Grounding */}
      <RecentGlobalThreatIntelligence
        reports={reports}
        onNavigateToCve={() => onNavigateTab('cve')}
        onNewReport={onNewReport}
      />

      {/* Recharts Spider/Radar Chart: Vulnerability Impact Scorecard (Aggregates Business Impact across Open Reports) */}
      <VulnerabilityImpactScorecard
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Recharts Line Chart: Threat Discovery Trend (Vulnerabilities discovered per month aggregated from createdAt to show discovery velocity) */}
      <ThreatDiscoveryTrend
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Recharts Line Chart: Tendência de Novos Relatórios Descobertos nos Últimos 6 Meses */}
      <SixMonthTrendLineChart
        reports={reports}
        onNewReport={onNewReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Calendar Activity Heatmap (GitHub-style submission frequency, dates & streaks) */}
      <ActivityHeatmap
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
      />

      {/* Vulnerability Density Heatmap: Color-coded grid matrix visualizing vulnerability density by platform and severity type */}
      <VulnerabilityHeatmap
        reports={reports}
        onSelectReport={onSelectReport}
        onSelectSeverity={onSelectSeverity}
        onNavigateToReports={() => onNavigateTab('reports')}
        onNewReport={onNewReport}
      />

      {/* Risk Priority Matrix: Maps CVSS scores against business impact assessments (Critical, High, Medium, Low quadrants) */}
      <RiskPriorityMatrix
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* 5x5 Likelihood vs. Impact Risk Assessment Matrix & Prioritization Queue */}
      <RiskAssessmentMatrix
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Bounty Payout Tracker: Monthly Earnings Trends & Projected Future Bounties */}
      <BountyPayoutTracker
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReport={onNewReport}
        onNavigateToReports={() => onNavigateTab('reports')}
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

      {/* Recharts Bar Chart: Vulnerability Distribution by Severity (Low, Medium, High, Critical) */}
      <SeverityBarChart
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
                  const isCritical = evt.reportSeverity === 'CRITICAL';

                  return (
                    <div
                      key={`${evt.reportId}-${evt.id}`}
                      onClick={() => onSelectReport(evt.report)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer group relative overflow-hidden ${
                        isCritical
                          ? 'bg-gradient-to-r from-red-950/30 via-[#161214] to-[#121212] critical-vuln-card-glow-subtle'
                          : 'bg-[#121212] border-[#242424] hover:border-zinc-700 hover:bg-[#161616]'
                      }`}
                      title={isCritical ? "Alerta Crítico: clique para inspecionar" : "Clique para inspecionar o relatório completo"}
                    >
                      {isCritical && (
                        <div className="absolute top-1.5 right-2 flex items-center gap-1 pointer-events-none">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded shrink-0 border ${
                            isCritical 
                              ? 'bg-red-950/60 border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse' 
                              : `${visuals.bg} ${visuals.color}`
                          } mt-0.5`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-semibold transition-colors ${
                                isCritical ? 'text-red-200 group-hover:text-red-100' : 'text-zinc-200 group-hover:text-emerald-400'
                              }`}>
                                {evt.title}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${sevBadge.bg} ${sevBadge.text} ${
                                isCritical ? 'border border-red-500/50 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]' : ''
                              }`}>
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
                              <span className={isCritical ? 'text-red-400 font-semibold' : 'text-zinc-400'}>{evt.reportId}</span>
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
                    const isCritical = report.severity === 'CRITICAL';

                    return (
                      <tr 
                        key={report.id}
                        onClick={() => onSelectReport(report)}
                        className={`cursor-pointer transition-all ${
                          isCritical
                            ? 'bg-red-950/20 hover:bg-red-950/35 border-l-2 border-l-red-500 shadow-[inset_0_0_15px_rgba(239,68,68,0.12)]'
                            : 'hover:bg-[#121212]/60'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-zinc-500 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isCritical && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                              </span>
                            )}
                            <span className={isCritical ? 'text-red-400 font-bold' : ''}>{report.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-semibold transition-colors truncate max-w-xs ${
                            isCritical ? 'text-red-100 group-hover:text-white' : 'text-zinc-200 hover:text-emerald-400'
                          }`}>
                            {report.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Target: {report.target} • {report.platform}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sevBadge.bg} ${sevBadge.text} ${
                            isCritical ? 'border border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse' : ''
                          }`}>
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
