import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
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
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Calendar,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor, formatRelativeTimeAgo } from '../utils/formatters';
import { calculateTriageEfficiency } from '../utils/triageEfficiencyEngine';
import { BountySparklineChart, BountyCompactSparkline } from './BountySparklineChart';
import { SeverityBarChart } from './SeverityBarChart';
import { SeverityPieChart } from './SeverityPieChart';
import { SeverityDoughnutChart } from './SeverityDoughnutChart';
import { ReportsTrendChart } from './ReportsTrendChart';
import { SixMonthTrendLineChart } from './SixMonthTrendLineChart';
import { ThreatDiscoveryTrend } from './ThreatDiscoveryTrend';
import { FutureEarningsProjectionChart } from './FutureEarningsProjectionChart';
import { ActivityHeatmap } from './ActivityHeatmap';
import { CvssComparisonTool } from './CvssComparisonTool';
import { BreachImpactSimulator } from './BreachImpactSimulator';
import { FairImpactSimulator } from './FairImpactSimulator';
import { RiskSimulatorView } from './RiskSimulatorView';
import { TargetRateLimitMonitor } from './TargetRateLimitMonitor';
import { RateLimitMonitor } from './RateLimitMonitor';
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
import { TargetVulnerabilityHeatmap } from './TargetVulnerabilityHeatmap';
import { RiskPriorityMatrix } from './RiskPriorityMatrix';
import { RiskAssessmentMatrix } from './RiskAssessmentMatrix';
import { BountyPayoutTracker } from './BountyPayoutTracker';
import { ThreatIntelligenceDashboard } from './ThreatIntelligenceDashboard';
import { TimelineEvent } from '../types';
import { NavTab } from './Header';

interface DashboardViewProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNewReport: () => void;
  onNewReportWithAdvisory?: (advisoryData: Partial<VulnerabilityReport>) => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenAbout?: () => void;
  onOpenCvssCalculator?: (vector?: string, reportId?: string) => void;
  onOpenWelcomeModal?: () => void;
  onSelectSeverity?: (severity: Severity) => void;
  onAddTimelineEvent?: (reportId: string, event: Omit<TimelineEvent, 'id'>) => void;
  onOpenSettings?: () => void;
  onUpdateStatus?: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
  onUpdateReport?: (updatedReport: VulnerabilityReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onNewReportWithAdvisory,
  onNavigateTab,
  onOpenAbout,
  onOpenCvssCalculator,
  onOpenWelcomeModal,
  onSelectSeverity,
  onAddTimelineEvent,
  onOpenSettings,
  onUpdateStatus,
  onUpdateReport
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

  // Trend of discovered vulnerabilities per month based on the 'createdAt' date field of the reports
  const [trendTimeframe, setTrendTimeframe] = useState<'6M' | '12M' | 'ALL'>('12M');
  const [trendViewMode, setTrendViewMode] = useState<'total' | 'severity' | 'cumulative'>('total');

  const { monthlyTrendData, monthlyTrendMetrics } = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        monthlyTrendData: [],
        monthlyTrendMetrics: {
          totalDiscovered: 0,
          avgPerMonth: 0,
          peakMonth: 'N/A',
          peakCount: 0,
          latestMonthCount: 0,
          trendChangePercent: 0,
          criticalTotal: 0,
          highTotal: 0
        }
      };
    }

    // Extract reports with valid createdAt timestamps
    const reportsWithDates = reports.map((report) => {
      let dateObj: Date;
      if (report.createdAt) {
        const parsed = new Date(report.createdAt);
        dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
      } else {
        dateObj = new Date();
      }
      return { report, date: dateObj };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const now = new Date();
    const earliestDate = reportsWithDates[0]?.date || now;
    const latestDate = reportsWithDates[reportsWithDates.length - 1]?.date || now;
    const maxDate = latestDate > now ? latestDate : now;

    // Build chronological month sequence (minimum 6 months)
    const minStart = new Date(maxDate.getFullYear(), maxDate.getMonth() - 5, 1);
    const actualStart = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const startDate = actualStart < minStart ? actualStart : minStart;
    const endBoundary = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

    const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const MONTH_FULL = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const allMonths: { year: number; month: number; key: string; label: string; fullMonth: string }[] = [];
    const iter = new Date(startDate);
    while (iter < endBoundary) {
      const y = iter.getFullYear();
      const m = iter.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${MONTH_LABELS[m]}/${String(y).slice(-2)}`;
      const fullMonth = `${MONTH_FULL[m]} de ${y}`;
      allMonths.push({ year: y, month: m, key, label, fullMonth });
      iter.setMonth(iter.getMonth() + 1);
    }

    let runningCumulative = 0;
    let peakMonth = 'N/A';
    let peakCount = 0;
    let criticalTotal = 0;
    let highTotal = 0;

    const fullData = allMonths.map((mObj) => {
      // Find all reports created in this specific month based on 'createdAt'
      const monthReports = reports.filter((r) => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === mObj.year && d.getMonth() === mObj.month;
      });

      const count = monthReports.length;
      runningCumulative += count;

      if (count > peakCount) {
        peakCount = count;
        peakMonth = `${mObj.label} (${count})`;
      }

      const critical = monthReports.filter((r) => r.severity === 'CRITICAL').length;
      const high = monthReports.filter((r) => r.severity === 'HIGH').length;
      const medium = monthReports.filter((r) => r.severity === 'MEDIUM').length;
      const low = monthReports.filter((r) => r.severity === 'LOW' || r.severity === 'INFO').length;

      criticalTotal += critical;
      highTotal += high;

      return {
        month: mObj.label,
        monthKey: mObj.key,
        fullMonth: mObj.fullMonth,
        vulnerabilities: count,
        discovered: count, // explicit naming for recharts line chart
        critical,
        high,
        medium,
        low,
        cumulative: runningCumulative,
        movingAverage: 0,
        reports: monthReports
      };
    });

    // Compute moving average (3-month rolling)
    fullData.forEach((pt, i) => {
      const window = fullData.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((sum, item) => sum + item.discovered, 0) / window.length;
      pt.movingAverage = Number(avg.toFixed(1));
    });

    const totalDiscovered = reports.length;
    const avgPerMonth = fullData.length > 0 ? Number((totalDiscovered / fullData.length).toFixed(1)) : 0;
    const latestMonthCount = fullData[fullData.length - 1]?.discovered || 0;
    const prevMonthCount = fullData[fullData.length - 2]?.discovered || 0;
    const trendChangePercent = prevMonthCount > 0
      ? Math.round(((latestMonthCount - prevMonthCount) / prevMonthCount) * 100)
      : (latestMonthCount > 0 ? 100 : 0);

    return {
      monthlyTrendData: fullData,
      monthlyTrendMetrics: {
        totalDiscovered,
        avgPerMonth,
        peakMonth,
        peakCount,
        latestMonthCount,
        trendChangePercent,
        criticalTotal,
        highTotal
      }
    };
  }, [reports]);

  // Sliced according to timeframe selection
  const displayedMonthlyData = useMemo(() => {
    if (trendTimeframe === '6M') {
      return monthlyTrendData.slice(-6);
    }
    if (trendTimeframe === '12M') {
      return monthlyTrendData.slice(-12);
    }
    return monthlyTrendData;
  }, [monthlyTrendData, trendTimeframe]);

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

          <button
            id="btn-dashboard-fair-simulator"
            onClick={() => document.getElementById('fair-risk-simulator-view')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#141417] hover:bg-[#1f1f26] text-zinc-200 hover:text-white border border-[#2b2b35] hover:border-emerald-500/40 text-xs font-mono font-semibold tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Ir para Simulador de Risco FAIR (Frequência x Magnitude)"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulador FAIR</span>
          </button>

          <button
            id="btn-dashboard-rate-limit-monitor"
            onClick={() => document.getElementById('rate-limit-monitor-view')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#141417] hover:bg-[#1f1f26] text-zinc-200 hover:text-white border border-[#2b2b35] hover:border-cyan-500/40 text-xs font-mono font-semibold tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Ir para Rate Limit Monitor (GitHub, Gemini e Serviços Cloud)"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rate Limits API</span>
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

      {/* Zero State Alert Banner when Mock is Cleared */}
      {reports.length === 0 && (
        <div 
          id="banner-clean-environment" 
          className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0c1612] to-[#0a0a0f] border border-emerald-500/35 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-lg animate-fadeIn"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Plataforma Zerada (Ambiente Limpo)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-500/30">
                  0 Achados
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                Você está no ambiente sem dados simulados. Comece criando seu primeiro relatório ou carregue os dados de demonstração (mock) para ver dashboards, gráficos e históricos preenchidos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenWelcomeModal && (
              <button
                type="button"
                id="btn-dashboard-load-mock"
                onClick={onOpenWelcomeModal}
                className="px-3.5 py-2 rounded-lg bg-[#141d24] hover:bg-[#1b2b36] text-cyan-300 hover:text-white border border-cyan-500/40 font-mono font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Opções de Mock</span>
              </button>
            )}
            <button
              type="button"
              id="btn-dashboard-create-first-report"
              onClick={onNewReport}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Relatório</span>
            </button>
          </div>
        </div>
      )}

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

      {/* DevSecOps & AppSec Tools Suite Quick Launch Card */}
      <div className="bg-gradient-to-r from-[#14141e] via-[#111119] to-[#161624] border border-[#262638] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-emerald-500/40 transition-all">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">Central de Ferramentas AppSec & DevSecOps</span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                10 MÓDULOS ATIVOS
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              CVSS v4.0, Mapeador CWE/OWASP Top 10, Construtor PoC cURL/Python, Monitor SLA MTTR/MTTT, Macros de Triagem, Sanitizador DLP e Jira/GitHub Exporter.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('tools')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
        >
          <span>Abrir Ferramentas AppSec</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Primary KPI Metrics Grid - Sophisticated Dark Architecture */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Bounties / Earnings with 30-Day Sparkline */}
        <div 
          className="bg-[#121212] border border-[#262626] hover:border-emerald-500/40 transition-colors p-4 rounded-lg flex flex-col justify-between"
          id="kpi-card-total-bounties"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Bounties</span>
              </p>
              <button
                type="button"
                id="btn-kpi-view-30d-trend"
                onClick={() => document.getElementById('bounty-30day-sparkline-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[9px] font-mono uppercase text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Visualizar gráfico de tendência em sparkline dos últimos 30 dias"
              >
                <span>30D Trend</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
            <h3 className="text-3xl font-light text-white font-mono">
              {formatCurrency(totalEarnedUSD, 'USD')}
            </h3>
            <p className="mt-0.5 text-[10px] text-zinc-400 font-mono">{formatCurrency(totalEarnedBRL, 'BRL')} estimado</p>
          </div>

          {/* Embedded 30-Day Bounty Sparkline Visualization */}
          <div className="mt-2.5 pt-2 border-t border-[#1e1e1e]">
            <BountyCompactSparkline
              reports={reports}
              onOpenDetailedView={() => document.getElementById('bounty-30day-sparkline-section')?.scrollIntoView({ behavior: 'smooth' })}
            />
          </div>
        </div>

        {/* Critical Findings */}
        {(() => {
          const criticalCount = severityStats.find(s => s.severity === 'CRITICAL')?.count || 0;
          const criticalEarned = severityStats.find(s => s.severity === 'CRITICAL')?.earned || 0;
          const isCriticalActive = criticalCount > 0;
          const untriagedCriticalReports = reports.filter(r => r.severity === 'CRITICAL' && r.status !== 'TRIAGED');
          const untriagedPendingCount = untriagedCriticalReports.length;
          const latestCriticalReport = reports.filter(r => r.severity === 'CRITICAL').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

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
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                  {latestCriticalReport && (
                    <span 
                      className="text-[9px] font-mono text-red-300 bg-red-950/90 border border-red-500/40 px-1.5 py-0.2 rounded shadow-[0_0_8px_rgba(239,68,68,0.3)] hidden sm:inline-flex items-center gap-1"
                      title={`Mais recente: ${latestCriticalReport.title} (${latestCriticalReport.createdAt})`}
                    >
                      <Clock className="w-2.5 h-2.5 text-red-400" />
                      <span>{formatRelativeTimeAgo(latestCriticalReport.createdAt)}</span>
                    </span>
                  )}
                  <div className="critical-corner-badge flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 border border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.85)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-white">
                      CRITICAL
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-1 mb-1">
                <p className="text-xs text-zinc-400 uppercase flex items-center gap-1.5">
                  <ShieldAlert className={`w-3.5 h-3.5 text-red-500 ${isCriticalActive ? 'animate-pulse' : ''}`} />
                  <span>Critical Findings</span>
                </p>
                {isCriticalActive && latestCriticalReport && (
                  <span className="sm:hidden text-[9px] font-mono text-red-300 bg-red-950/80 border border-red-500/40 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-red-400" />
                    <span>{formatRelativeTimeAgo(latestCriticalReport.createdAt)}</span>
                  </span>
                )}
              </div>
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

              {/* Quick Triage One-Click Action */}
              {isCriticalActive && onUpdateStatus && (
                <div className="mt-3 pt-2.5 border-t border-red-500/20">
                  {untriagedPendingCount > 0 ? (
                    <button
                      id="btn-quick-triage-critical-card"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextUntriaged = untriagedCriticalReports[0];
                        if (nextUntriaged) {
                          onUpdateStatus(nextUntriaged.id, 'TRIAGED');
                        }
                      }}
                      className="w-full py-1.5 px-2.5 rounded bg-blue-600/25 hover:bg-blue-600/40 active:scale-[0.98] text-blue-200 hover:text-white border border-blue-500/40 hover:border-blue-400 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(59,130,246,0.25)] cursor-pointer"
                      title={`Triar com 1 clique o relatório crítico pendente (${untriagedCriticalReports[0]?.id || ''})`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Quick Triage ({untriagedPendingCount} pendente{untriagedPendingCount > 1 ? 's' : ''})</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-blue-400/90 bg-blue-950/30 border border-blue-500/30 py-1 px-2 rounded">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      <span>Todos os críticos triados</span>
                    </div>
                  )}
                </div>
              )}
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

      {/* Recharts Line Chart: Monthly Trend of Discovered Vulnerabilities based on createdAt */}
      <section
        id="monthly-vulnerabilities-trend-section"
        className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-lg p-5 sm:p-6"
      >
        {/* Header with Title, Description, and Interactive Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#262626]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-zinc-100">
                  Tendência Mensal de Vulnerabilidades Descobertas
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20 font-bold">
                  recharts • createdAt
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                Evolução temporal da taxa de descoberta de vulnerabilidades por mês baseada na data de registro (<code className="text-emerald-400 font-mono">createdAt</code>) dos relatórios.
              </p>
            </div>
          </div>

          {/* Controls: Mode & Timeframe */}
          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Buttons */}
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-1 flex items-center gap-1">
              <button
                type="button"
                id="btn-trend-mode-total"
                onClick={() => setTrendViewMode('total')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  trendViewMode === 'total'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Total
              </button>
              <button
                type="button"
                id="btn-trend-mode-severity"
                onClick={() => setTrendViewMode('severity')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  trendViewMode === 'severity'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Por Severidade
              </button>
              <button
                type="button"
                id="btn-trend-mode-cumulative"
                onClick={() => setTrendViewMode('cumulative')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  trendViewMode === 'cumulative'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Acumulado
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-1 flex items-center gap-1 text-xs font-mono">
              {(['6M', '12M', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  id={`btn-trend-tf-${tf.toLowerCase()}`}
                  onClick={() => setTrendTimeframe(tf)}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    trendTimeframe === tf
                      ? 'bg-zinc-700 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tf === '6M' ? '6 Meses' : tf === '12M' ? '12 Meses' : 'Tudo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Highlight KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-[#262626]">
          <div className="bg-[#181818] border border-[#282828] p-3 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Média Mensal</span>
            <div className="text-xl font-light font-mono text-emerald-400 mt-0.5 flex items-baseline gap-1">
              <span>{monthlyTrendMetrics.avgPerMonth}</span>
              <span className="text-xs text-zinc-500 font-sans">achados/mês</span>
            </div>
          </div>
          <div className="bg-[#181818] border border-[#282828] p-3 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Mês de Pico</span>
            <div className="text-xl font-light font-mono text-zinc-100 mt-0.5">
              {monthlyTrendMetrics.peakMonth}
            </div>
          </div>
          <div className="bg-[#181818] border border-[#282828] p-3 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Último Mês</span>
            <div className="text-xl font-light font-mono text-cyan-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{monthlyTrendMetrics.latestMonthCount}</span>
              <span className={`text-xs ${monthlyTrendMetrics.trendChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlyTrendMetrics.trendChangePercent >= 0 ? `+${monthlyTrendMetrics.trendChangePercent}%` : `${monthlyTrendMetrics.trendChangePercent}%`}
              </span>
            </div>
          </div>
          <div className="bg-[#181818] border border-[#282828] p-3 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Críticos + Altos</span>
            <div className="text-xl font-light font-mono text-red-400 mt-0.5">
              {monthlyTrendMetrics.criticalTotal + monthlyTrendMetrics.highTotal}
              <span className="text-xs text-zinc-500 font-sans ml-1.5">impacto elevado</span>
            </div>
          </div>
        </div>

        {/* Recharts Line Chart Visualization */}
        <div className="pt-5">
          <div className="h-72 sm:h-80 w-full" id="vulnerability-trend-line-chart-container">
            {displayedMonthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={displayedMonthlyData}
                  margin={{ top: 10, right: 25, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#52525b"
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#3f3f46' }}
                  />
                  <YAxis
                    stroke="#52525b"
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#3f3f46' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#181818] border border-[#333333] rounded-lg p-3 shadow-xl text-xs font-mono">
                          <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-[#2a2a2a]">
                            <span className="font-bold text-zinc-100">{data.fullMonth}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              {data.discovered} {data.discovered === 1 ? 'vulnerabilidade' : 'vulnerabilidades'}
                            </span>
                          </div>
                          <div className="space-y-1 text-zinc-300">
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-500">Descobertas no mês:</span>
                              <span className="font-bold text-emerald-400">{data.discovered}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-500">Acumulado total:</span>
                              <span className="font-bold text-cyan-400">{data.cumulative}</span>
                            </div>
                            <div className="pt-1.5 mt-1 border-t border-[#2a2a2a] flex items-center gap-2 text-[10px]">
                              <span className="text-red-400">{data.critical} Críticos</span>
                              <span className="text-orange-400">{data.high} Altos</span>
                              <span className="text-amber-400">{data.medium} Médios</span>
                              <span className="text-blue-400">{data.low} Baixos</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px', fontSize: '11px', fontFamily: 'monospace' }}
                  />

                  {trendViewMode === 'total' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="discovered"
                        name="Vulnerabilidades Descobertas"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', stroke: '#121212', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="movingAverage"
                        name="Média Móvel (3m)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </>
                  )}

                  {trendViewMode === 'severity' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="critical"
                        name="Crítico"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#ef4444' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="high"
                        name="Alto"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f97316' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="medium"
                        name="Médio"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f59e0b' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="low"
                        name="Baixo / Info"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={{ r: 3, fill: '#3b82f6' }}
                      />
                    </>
                  )}

                  {trendViewMode === 'cumulative' && (
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Acumulado Histórico"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#8b5cf6', stroke: '#121212', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#a78bfa', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs font-mono">
                <span>Nenhum dado temporal disponível para exibir o gráfico.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 30-Day Bounty Sparkline & Financial Velocity Intelligence Panel */}
      <BountySparklineChart
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

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
        onUpdateStatus={onUpdateStatus}
      />

      {/* Smart Anomaly Detector: Timeline & Documentation Analysis */}
      <SmartAnomalyDetector
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
        onUpdateStatus={onUpdateStatus}
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
        onUpdateStatus={onUpdateStatus}
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

      {/* Real-time Threat Intelligence Dashboard: Security Advisory Feeds with Google Search Grounding & Vulnerability Context */}
      <ThreatIntelligenceDashboard
        reports={reports}
        onSelectReport={onSelectReport}
        onNewReportWithAdvisory={onNewReportWithAdvisory}
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

      {/* Target Vulnerability Density Heatmap: Displays vulnerability density per target domain and identifies attack-prone surfaces */}
      <TargetVulnerabilityHeatmap
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
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
        onUpdateStatus={onUpdateStatus}
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

      {/* Recharts Doughnut Chart: Vulnerability Distribution by Severity (CRITICAL, HIGH, MEDIUM, LOW) */}
      <SeverityDoughnutChart
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

      {/* FAIR Risk Simulator: Factor Analysis of Information Risk (Loss Frequency & Loss Magnitude) */}
      <RiskSimulatorView
        reports={reports}
        onSelectReport={onSelectReport}
        onNavigateToReports={() => onNavigateTab('reports')}
      />

      {/* Breach Impact Simulator: Quantitative Financial & Reputational Cost Modeling (IBM/Ponemon & FAIR) */}
      <BreachImpactSimulator
        reports={reports}
        onSelectReport={onSelectReport}
      />

      {/* FAIR Impact Simulator: Quantitative Annual Loss Expectancy (ALE = ARO x SLE) Risk Modeling */}
      <FairImpactSimulator
        reports={reports}
        onSelectReport={onSelectReport}
      />

      {/* Target Rate Limit Monitor: Real-Time API Testing Cadence & Radial Progress Gauge */}
      <TargetRateLimitMonitor
        reports={reports}
        onNavigateToTargets={() => onNavigateTab('targets')}
      />

      {/* Outbound Platform Rate Limit Monitor: GitHub, Gemini & External Cloud Services Tracker */}
      <RateLimitMonitor
        onNavigateToSettings={onOpenSettings}
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
                        <div className="absolute top-1.5 right-2 flex items-center gap-1 pointer-events-none z-10">
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
                              {isCritical && (
                                <span 
                                  className="px-1.5 py-0.2 rounded bg-red-950/70 text-red-300 border border-red-500/40 text-[9px] font-mono font-medium inline-flex items-center gap-1 shadow-sm"
                                  title={`Criado em: ${evt.report.createdAt}`}
                                >
                                  <Clock className="w-2.5 h-2.5 text-red-400 shrink-0" />
                                  <span>{formatRelativeTimeAgo(evt.report.createdAt)}</span>
                                </span>
                              )}
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

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap pt-0.5">
                            {evt.date}
                          </span>

                          {/* Quick Triage button for Critical vulnerability card */}
                          {isCritical && onUpdateStatus && evt.report.status !== 'TRIAGED' && (
                            <button
                              id={`btn-quick-triage-recent-${evt.reportId}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(evt.report.id, 'TRIAGED');
                              }}
                              className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 active:scale-[0.98] text-blue-200 hover:text-white border border-blue-500/50 hover:border-blue-400 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-[0_0_8px_rgba(59,130,246,0.3)] cursor-pointer"
                              title={`Triar imediatamente relatório ${evt.reportId} para TRIAGED com 1 clique`}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
                              <span>Quick Triage</span>
                            </button>
                          )}
                          {isCritical && evt.report.status === 'TRIAGED' && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-950/40 text-blue-400 border border-blue-500/30 text-[9px] font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
                              <span>Triaged</span>
                            </span>
                          )}
                        </div>
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
