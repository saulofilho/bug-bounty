import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie
} from 'recharts';
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Sliders,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Server,
  BarChart3,
  PieChart as PieIcon,
  HelpCircle,
  Terminal,
  Lock,
  RefreshCw,
  Send,
  ArrowUpRight,
  Filter,
  Download,
  Info,
  Globe,
  Layers,
  AlertCircle,
  Sparkles,
  Database,
  FileText,
  Key,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import {
  ApiServiceId,
  ApiServiceQuota,
  ApiRequestLog,
  getStoredServiceQuotas,
  saveServiceQuotas,
  getStoredRequestLogs,
  saveRequestLogs,
  recordPlatformApiCall,
  fetchLiveGitHubRateLimit,
  DEFAULT_SERVICE_QUOTAS,
  INITIAL_SAMPLE_LOGS
} from '../utils/apiRateLimiter';

export interface RateLimitMonitorProps {
  className?: string;
  onNavigateToSettings?: () => void;
}

export const RateLimitMonitor: React.FC<RateLimitMonitorProps> = ({
  className = '',
  onNavigateToSettings
}) => {
  // State
  const [quotas, setQuotas] = useState<ApiServiceQuota[]>(getStoredServiceQuotas);
  const [logs, setLogs] = useState<ApiRequestLog[]>(getStoredRequestLogs);
  const [activeTab, setActiveTab] = useState<'services' | 'analytics' | 'logs' | 'guidelines'>('services');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'throttled' | 'error'>('all');

  // Live GitHub checking state
  const [isCheckingGitHub, setIsCheckingGitHub] = useState(false);
  const [githubCheckResult, setGithubCheckResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Simulation test state
  const [isSimulatingCall, setIsSimulatingCall] = useState(false);
  const [simulationSuccessNotice, setSimulationSuccessNotice] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Auto-refresh timer for countdowns
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for platform API call events from elsewhere in the app
  useEffect(() => {
    const handleApiCallRecorded = () => {
      setQuotas(getStoredServiceQuotas());
      setLogs(getStoredRequestLogs());
    };

    window.addEventListener('platform-api-call-recorded', handleApiCallRecorded);
    return () => window.removeEventListener('platform-api-call-recorded', handleApiCallRecorded);
  }, []);

  // Total metrics computed
  const metrics = useMemo(() => {
    const totalRequestsToday = quotas.reduce((acc, q) => acc + q.totalCallsToday, 0);
    const totalRequestsSession = quotas.reduce((acc, q) => acc + q.totalCallsSession, 0);
    const throttledServicesCount = quotas.filter((q) => q.rateLimitStatus === 'throttled' || q.rateLimitStatus === 'critical').length;
    const warningServicesCount = quotas.filter((q) => q.rateLimitStatus === 'warning').length;
    const totalErrors429 = quotas.reduce((acc, q) => acc + q.errorCount429, 0);

    // Calculate weighted average latency
    const avgLatency = Math.round(
      quotas.reduce((acc, q) => acc + q.averageLatencyMs, 0) / Math.max(1, quotas.length)
    );

    // Check overall platform health
    let overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    let healthColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';

    if (throttledServicesCount > 0) {
      overallHealth = 'CRITICAL';
      healthColor = 'text-rose-400 bg-rose-950/60 border-rose-500/40';
    } else if (warningServicesCount > 0) {
      overallHealth = 'WARNING';
      healthColor = 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    }

    return {
      totalRequestsToday,
      totalRequestsSession,
      throttledServicesCount,
      warningServicesCount,
      totalErrors429,
      avgLatency,
      overallHealth,
      healthColor
    };
  }, [quotas]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return quotas.filter((s) => {
      if (selectedCategoryFilter !== 'all' && s.category !== selectedCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [quotas, selectedCategoryFilter]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    quotas.forEach((q) => cats.add(q.category));
    return Array.from(cats);
  }, [quotas]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedServiceFilter !== 'all' && l.serviceId !== selectedServiceFilter) {
        return false;
      }
      if (logStatusFilter === 'success' && (l.status >= 300 || l.isError)) {
        return false;
      }
      if (logStatusFilter === 'throttled' && l.status !== 429 && !l.isThrottled) {
        return false;
      }
      if (logStatusFilter === 'error' && !l.isError && l.status < 400) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const match =
          l.endpoint.toLowerCase().includes(q) ||
          l.serviceName.toLowerCase().includes(q) ||
          l.responseSummary.toLowerCase().includes(q) ||
          l.method.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, selectedServiceFilter, logStatusFilter, logSearchQuery]);

  // Format countdown
  const formatCountdown = (resetTimestamp: number) => {
    const diffMs = resetTimestamp - now;
    if (diffMs <= 0) return 'Pronto para reset';
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Perform Live GitHub Rate Limit Check
  const handleLiveGitHubCheck = async () => {
    setIsCheckingGitHub(true);
    setGithubCheckResult(null);

    try {
      const res = await fetchLiveGitHubRateLimit();
      if (res.success && res.limit !== undefined && res.remaining !== undefined) {
        // Update GitHub quota in state
        const updatedQuotas = quotas.map((q) => {
          if (q.id === 'github') {
            const used = (res.limit || 5000) - (res.remaining || 0);
            const remaining = res.remaining;
            const percentUsed = (used / (res.limit || 5000)) * 100;
            let status: ApiServiceQuota['rateLimitStatus'] = 'optimal';
            if (remaining <= 0) status = 'throttled';
            else if (percentUsed >= 95) status = 'critical';
            else if (percentUsed >= 80) status = 'warning';
            else if (percentUsed >= 50) status = 'moderate';

            return {
              ...q,
              limit: res.limit || 5000,
              used,
              remaining,
              rateLimitStatus: status,
              resetTimestamp: (res.reset || Math.floor((Date.now() + 3600000) / 1000)) * 1000,
              authenticated: !!res.authenticated,
              authType: res.authenticated
                ? 'Personal Access Token (PAT) - 5,000 req/h'
                : 'IP Público não-autenticado - 60 req/h',
              lastCallTimestamp: new Date().toISOString()
            };
          }
          return q;
        });

        setQuotas(updatedQuotas);
        saveServiceQuotas(updatedQuotas);
        setLogs(getStoredRequestLogs());

        setGithubCheckResult({
          success: true,
          message: `Taxa GitHub confirmada em tempo real!`,
          details: `${res.remaining.toLocaleString()} de ${res.limit.toLocaleString()} requisições restantes (${res.authenticated ? 'Autenticado com Token' : 'Modo IP Público'}). Reset: ${new Date((res.reset || 0) * 1000).toLocaleTimeString()}`
        });
      } else {
        setGithubCheckResult({
          success: false,
          message: 'Falha ao consultar taxa do GitHub',
          details: res.message || 'Verifique sua conexão ou token do GitHub.'
        });
      }
    } catch (err: any) {
      setGithubCheckResult({
        success: false,
        message: 'Erro ao verificar taxa do GitHub',
        details: err.message
      });
    } finally {
      setIsCheckingGitHub(false);
    }
  };

  // Simulate an Outbound API Call to test tracking
  const handleSimulateCall = (serviceId: ApiServiceId) => {
    setIsSimulatingCall(true);
    const targetService = quotas.find((q) => q.id === serviceId) || quotas[0];

    setTimeout(() => {
      let endpoint = '/api/v1/resource';
      let summary = 'Requisição executada com sucesso';
      let method: 'GET' | 'POST' = 'GET';

      if (serviceId === 'github') {
        endpoint = '/repos/finpay-global/billing-api/issues/89/comments';
        summary = 'Comentário sincronizado com o bug tracker no GitHub via REST API';
        method = 'POST';
      } else if (serviceId === 'gemini') {
        endpoint = '/api/gemini/target-recon-tips';
        summary = 'Geração de recomendações de testes e superfícies de ataque assistida por IA';
        method = 'POST';
      } else if (serviceId === 'nvd_nist') {
        endpoint = '/api/cve/search?q=CVE-2024-3400';
        summary = 'Consulta ao National Vulnerability Database para metadados de CVSS 10.0';
        method = 'GET';
      } else if (serviceId === 'hackerone') {
        endpoint = '/v1/hackers/me';
        summary = 'Validação de credenciais e escopo de ativos na API do HackerOne';
        method = 'GET';
      } else if (serviceId === 'slack') {
        endpoint = '/services/hooks/security-alerts';
        summary = 'Webhook de notificação transmitido para o canal da equipe de segurança';
        method = 'POST';
      }

      const randomLatency = Math.floor(Math.random() * 300) + 120;
      recordPlatformApiCall({
        serviceId,
        serviceName: targetService.name,
        endpoint,
        method,
        status: 200,
        latencyMs: randomLatency,
        cost: 1,
        responseSummary: summary,
        isError: false,
        isThrottled: false
      });

      setQuotas(getStoredServiceQuotas());
      setLogs(getStoredRequestLogs());
      setIsSimulatingCall(false);
      setSimulationSuccessNotice(`Requisição simulada para ${targetService.name} registrada no monitor!`);
      setTimeout(() => setSimulationSuccessNotice(null), 3000);
    }, 400);
  };

  // Reset Quotas to Default / Replenish
  const handleResetQuotas = () => {
    saveServiceQuotas(DEFAULT_SERVICE_QUOTAS);
    saveRequestLogs(INITIAL_SAMPLE_LOGS);
    setQuotas(DEFAULT_SERVICE_QUOTAS);
    setLogs(INITIAL_SAMPLE_LOGS);
    setSimulationSuccessNotice('Todos os contadores de cotas e registros foram reinicializados!');
    setTimeout(() => setSimulationSuccessNotice(null), 3000);
  };

  // Export logs to JSON
  const handleExportLogs = () => {
    const dataStr = JSON.stringify({ quotas, logs, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-api-rate-limits-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart Data: Service Quota Consumption (%)
  const quotaConsumptionData = useMemo(() => {
    return quotas.map((q) => {
      const percentUsed = Math.min(100, Math.round((q.used / q.limit) * 100));
      return {
        name: q.id === 'github' ? 'GitHub' : q.id === 'gemini' ? 'Gemini AI' : q.id === 'nvd_nist' ? 'NVD CVE' : q.name.split(' ')[0],
        fullName: q.name,
        percentUsed,
        remaining: q.remaining,
        used: q.used,
        limit: q.limit,
        status: q.rateLimitStatus
      };
    });
  }, [quotas]);

  // Chart Data: Activity Distribution by Service
  const pieDistributionData = useMemo(() => {
    const serviceCounts: Record<string, number> = {};
    logs.forEach((log) => {
      serviceCounts[log.serviceName] = (serviceCounts[log.serviceName] || 0) + 1;
    });

    const colors = [
      '#10b981', // emerald
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#f59e0b', // amber
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#f97316'  // orange
    ];

    return Object.entries(serviceCounts).map(([name, count], idx) => ({
      name,
      value: count,
      fill: colors[idx % colors.length]
    }));
  }, [logs]);

  // Chart Data: Hourly Activity Trend
  const timelineActivityData = useMemo(() => {
    const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', 'Agora'];
    return hours.map((hour, idx) => {
      const baseCalls = [8, 12, 18, 45, 95, 120, 145, 82, metrics.totalRequestsToday % 150][idx];
      return {
        time: hour,
        requests: baseCalls,
        threshold: 200
      };
    });
  }, [metrics.totalRequestsToday]);

  // Copy curl code snippet
  const handleCopyCurl = () => {
    const snippet = `# Verificar rate limit do GitHub sem gastar cota:
curl -H "Accept: application/vnd.github+json" \\
     -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \\
     https://api.github.com/rate_limit

# Verificar headers de resposta padrão em chamadas:
# X-RateLimit-Limit: 5000
# X-RateLimit-Remaining: 4852
# X-RateLimit-Reset: 1716294800
# X-RateLimit-Used: 148`;

    navigator.clipboard.writeText(snippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <section
      id="rate-limit-monitor-view"
      className={`bg-[#0d101b] border border-[#1e233d] rounded-2xl overflow-hidden shadow-2xl transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-[#1e233d] bg-gradient-to-r from-[#111528] via-[#0f1222] to-[#0a0c16] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 via-sky-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/40">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Rate Limit Monitor
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                  Outbound API Tracker
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  GitHub & Cloud Services
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${metrics.healthColor}`}>
                  Status: {metrics.overallHealth}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Monitoramento centralizado e visualização em tempo real do volume de requisições disparadas pela plataforma para <strong>GitHub API</strong>, <strong>Google Gemini</strong>, <strong>NIST NVD/CVE</strong>, <strong>HackerOne</strong> e outros serviços integrados para prevenir bloqueios HTTP 429 e respeitar janelas de cota.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Live GitHub Quota Check Button */}
          <button
            type="button"
            onClick={handleLiveGitHubCheck}
            disabled={isCheckingGitHub}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            title="Consulta ao vivo o endpoint https://api.github.com/rate_limit (gratuito, sem gastar cota)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGitHub ? 'animate-spin' : ''}`} />
            <span>{isCheckingGitHub ? 'Consultando...' : 'Verificar GitHub (Live)'}</span>
          </button>

          {/* Quick Simulation Menu */}
          <div className="relative group">
            <button
              type="button"
              disabled={isSimulatingCall}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#141829] hover:bg-[#1a2035] text-zinc-200 border border-[#242b44] hover:border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simular Chamada</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#101424] border border-[#242b44] rounded-xl shadow-2xl py-1 z-30 hidden group-hover:block">
              <div className="px-3 py-1 text-[10px] font-mono text-zinc-400 uppercase border-b border-[#1b2138]">
                Disparar Teste:
              </div>
              <button
                type="button"
                onClick={() => handleSimulateCall('github')}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 font-mono flex items-center justify-between cursor-pointer"
              >
                <span>GitHub API</span>
                <span className="text-[10px] text-zinc-500">Issue Comment</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateCall('gemini')}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 font-mono flex items-center justify-between cursor-pointer"
              >
                <span>Gemini AI</span>
                <span className="text-[10px] text-zinc-500">CVSS/Intel</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateCall('nvd_nist')}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 font-mono flex items-center justify-between cursor-pointer"
              >
                <span>NIST NVD</span>
                <span className="text-[10px] text-zinc-500">CVE Search</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateCall('hackerone')}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 font-mono flex items-center justify-between cursor-pointer"
              >
                <span>HackerOne</span>
                <span className="text-[10px] text-zinc-500">Report Status</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateCall('slack')}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 font-mono flex items-center justify-between cursor-pointer"
              >
                <span>Slack Webhook</span>
                <span className="text-[10px] text-zinc-500">Alert Dispatch</span>
              </button>
            </div>
          </div>

          {/* Export Logs */}
          <button
            type="button"
            onClick={handleExportLogs}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#141829] hover:bg-[#1a2035] text-zinc-300 border border-[#242b44] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            title="Exportar logs e cotas em formato JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar JSON</span>
          </button>

          {/* Reset / Replenish */}
          <button
            type="button"
            onClick={handleResetQuotas}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#141829] hover:bg-[#1a2035] text-zinc-400 hover:text-rose-400 border border-[#242b44] transition-all flex items-center gap-1 cursor-pointer"
            title="Resetar contadores de chamadas e cotas da sessão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetar</span>
          </button>
        </div>
      </div>

      {/* Live Notice Banners */}
      {githubCheckResult && (
        <div
          className={`px-5 py-3 border-b text-xs font-mono flex items-center justify-between gap-3 ${
            githubCheckResult.success
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {githubCheckResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div>
              <strong>{githubCheckResult.message}</strong>
              {githubCheckResult.details && (
                <span className="ml-2 text-zinc-300 font-sans text-[11px]">{githubCheckResult.details}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGithubCheckResult(null)}
            className="text-zinc-400 hover:text-white cursor-pointer px-1 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {simulationSuccessNotice && (
        <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{simulationSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSimulationSuccessNotice(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Level Summary Cards (Requests Today, Active Services, Throttled, Latency) */}
      <div className="p-4 sm:p-6 border-b border-[#1e233d] bg-[#0a0c16] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Platform Requests Today */}
        <div className="p-4 rounded-xl border border-[#20273d] bg-[#121626] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Requisições Hoje (Total)</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              {quotas.length} Serviços
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2 tracking-tight">
            {metrics.totalRequestsToday.toLocaleString()}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">chamadas</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-[#1e2338]">
            <span className="text-cyan-300">Sessão Atual: {metrics.totalRequestsSession}</span>
            <span>GitHub: {quotas.find((q) => q.id === 'github')?.totalCallsToday || 0} req</span>
          </div>
        </div>

        {/* Card 2: GitHub API Status */}
        {(() => {
          const gh = quotas.find((q) => q.id === 'github');
          const percent = gh ? Math.round((gh.used / gh.limit) * 100) : 0;
          return (
            <div className="p-4 rounded-xl border border-[#20273d] bg-[#121626] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cota GitHub REST/GraphQL</span>
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-purple-950/60 text-purple-300 border border-purple-500/30">
                  {gh?.limit ? `${(gh.limit / 1000).toFixed(0)}k/h` : '5k/h'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2 tracking-tight">
                {gh?.remaining.toLocaleString() || '4,852'}
                <span className="text-xs font-normal text-zinc-400 ml-1.5">restantes</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-[#1e2338]">
                <span className="text-purple-300">{percent}% consumido</span>
                <span>Reset: {gh ? formatCountdown(gh.resetTimestamp) : '38m'}</span>
              </div>
            </div>
          );
        })()}

        {/* Card 3: Throttling & 429 Errors */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            metrics.throttledServicesCount > 0
              ? 'border-rose-500/40 bg-rose-950/20'
              : metrics.warningServicesCount > 0
              ? 'border-amber-500/40 bg-amber-950/20'
              : 'border-[#20273d] bg-[#121626]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Throttling & Bloqueios 429</span>
            </span>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                metrics.totalErrors429 > 0
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {metrics.totalErrors429 > 0 ? 'Atenção' : 'Zero 429'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2 tracking-tight">
            {metrics.totalErrors429}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">bloqueios HTTP 429</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-[#1e2338]">
            <span className={metrics.throttledServicesCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {metrics.throttledServicesCount} throttled
            </span>
            <span>{metrics.warningServicesCount} em aviso (&gt;80%)</span>
          </div>
        </div>

        {/* Card 4: Average Outbound Latency */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Latência Média Externa</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
              Alta Cadência
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-300 mt-2 tracking-tight">
            {metrics.avgLatency}
            <span className="text-xs font-normal text-emerald-400/80 ml-1.5">ms</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-emerald-500/20">
            <span>Mais rápido: Slack (180ms)</span>
            <span>Gemini: 680ms</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="px-5 py-3 border-b border-[#1e233d] bg-[#0a0c16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-[#090b14] border border-[#20273d] p-1 rounded-lg text-xs font-mono overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'services'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Serviços & Cotas ({quotas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Gráficos de Consumo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'logs'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Registro de Chamadas ({logs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'guidelines'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Políticas & Prevenção de 429</span>
          </button>
        </div>

        {/* Filter by category when in services view */}
        {activeTab === 'services' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 shrink-0">Categoria:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-[#121626] border border-[#242b44] text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Services Grid & Quota Status */}
      {activeTab === 'services' && (
        <div className="p-4 sm:p-6 bg-[#0a0c16] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
              const percentUsed = Math.min(100, Math.round((service.used / service.limit) * 100));
              const isThrottled = service.rateLimitStatus === 'throttled' || service.remaining <= 0;
              const isWarning = service.rateLimitStatus === 'warning';
              const isCritical = service.rateLimitStatus === 'critical';

              let statusBadgeBg = 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
              if (isThrottled) {
                statusBadgeBg = 'bg-rose-950/70 text-rose-400 border-rose-500/40 animate-pulse';
              } else if (isCritical) {
                statusBadgeBg = 'bg-rose-950/60 text-rose-400 border-rose-500/40';
              } else if (isWarning) {
                statusBadgeBg = 'bg-amber-950/60 text-amber-400 border-amber-500/30';
              } else if (service.rateLimitStatus === 'moderate') {
                statusBadgeBg = 'bg-sky-950/60 text-sky-400 border-sky-500/30';
              }

              return (
                <div
                  key={service.id}
                  className={`bg-[#101424] border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all hover:border-cyan-500/40 shadow-lg ${
                    isThrottled
                      ? 'border-rose-500/50 shadow-rose-950/30'
                      : isCritical
                      ? 'border-rose-500/30'
                      : isWarning
                      ? 'border-amber-500/30'
                      : 'border-[#20273d]'
                  }`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#1b2138]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                            {service.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                          {service.category}
                        </span>
                      </div>

                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${statusBadgeBg}`}>
                        {isThrottled ? '429 Throttled' : service.rateLimitStatus}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed font-sans">
                      {service.description}
                    </p>

                    {/* Progress Bar and Numbers */}
                    <div className="mt-4 bg-[#090b14] border border-[#1d2338] rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-zinc-400">Consumo da Janela:</span>
                        <span className="text-white font-bold">
                          {service.used.toLocaleString()} / {service.limit.toLocaleString()}{' '}
                          <span className="text-zinc-500 text-[11px]">({percentUsed}%)</span>
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-2.5 bg-[#171c30] rounded-full overflow-hidden relative">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isThrottled || isCritical
                              ? 'bg-gradient-to-r from-rose-500 to-red-600'
                              : isWarning
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : percentUsed > 40
                              ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, percentUsed))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2">
                        <span className="text-cyan-300 font-bold">
                          {service.remaining.toLocaleString()} req restantes
                        </span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>Reset em {formatCountdown(service.resetTimestamp)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Service Attributes Table */}
                    <div className="mt-3 space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-[#171c30]">
                        <span>Janela de Cota:</span>
                        <span className="text-zinc-200">
                          {service.windowType === 'hour'
                            ? '1 Hora (60 min)'
                            : service.windowType === 'minute'
                            ? '1 Minuto (60 seg)'
                            : service.windowType === '30s'
                            ? '30 Segundos'
                            : '24 Horas'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-[#171c30]">
                        <span>Autenticação:</span>
                        <span className="text-zinc-200 truncate max-w-[190px]" title={service.authType}>
                          {service.authType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-[#171c30]">
                        <span>Latência Média:</span>
                        <span className="text-emerald-400">{service.averageLatencyMs} ms</span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400 py-0.5">
                        <span>Total de Chamadas Hoje:</span>
                        <span className="text-white font-bold">{service.totalCallsToday} req</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="mt-4 pt-3 border-t border-[#1b2138] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSimulateCall(service.id)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Testar Chamada</span>
                    </button>

                    <div className="flex items-center gap-3">
                      {service.id === 'github' && onNavigateToSettings && (
                        <button
                          type="button"
                          onClick={onNavigateToSettings}
                          className="text-[11px] font-mono text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Key className="w-3 h-3" />
                          <span>Configurar Token</span>
                        </button>
                      )}
                      <a
                        href={service.docsUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        <span>Docs</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Analytics & Recharts Visualizations */}
      {activeTab === 'analytics' && (
        <div className="p-4 sm:p-6 bg-[#0a0c16] space-y-6">
          {/* Chart Row 1: Quota Consumption Bar Chart & Share Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bar Chart (7 cols) */}
            <div className="lg:col-span-7 bg-[#101424] border border-[#20273d] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338] mb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Percentual de Consumo de Cota por Serviço (%)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Proximidade do limite máximo de taxa por janela de requisições
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-[#161a2e] px-2 py-1 rounded border border-[#242c48]">
                  Threshold Seguro: &lt;80%
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quotaConsumptionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2238" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={10}
                      fontFamily="monospace"
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      fontFamily="monospace"
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c0f1d',
                        borderColor: '#252d4a',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% (${item.payload.used} / ${item.payload.limit} req)`,
                        item.payload.fullName
                      ]}
                    />
                    <Bar dataKey="percentUsed" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {quotaConsumptionData.map((entry, index) => {
                        let fill = '#10b981'; // optimal
                        if (entry.percentUsed >= 95) fill = '#ef4444'; // critical
                        else if (entry.percentUsed >= 80) fill = '#f59e0b'; // warning
                        else if (entry.percentUsed >= 40) fill = '#38bdf8'; // moderate
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Request Share (5 cols) */}
            <div className="lg:col-span-5 bg-[#101424] border border-[#20273d] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338] mb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-purple-400" />
                    <span>Distribuição de Chamadas por Serviço</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Proporção do tráfego externo outbound gerado
                  </p>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                  {logs.length} Registros
                </span>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={48}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieDistributionData.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.fill} stroke="#0e1222" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c0f1d',
                        borderColor: '#252d4a',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                      formatter={(val: any) => [`${val} requisições`, 'Volume']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart Row 2: 24h Activity Timeline Area Chart */}
          <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338] mb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Cadência de Requisições da Plataforma (Rolling 24h)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Volume de chamadas por faixa de horário e linha de capacidade segura contra bloqueios
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Requisições Disparadas</span>
                </span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <span className="w-2.5 h-0.5 bg-rose-500" />
                  <span>Teto Recomendado</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2238" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c0f1d',
                      borderColor: '#252d4a',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                  <Area
                    type="monotone"
                    dataKey="threshold"
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Outbound Request Logs Table */}
      {activeTab === 'logs' && (
        <div className="p-4 sm:p-6 bg-[#0a0c16] space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101424] border border-[#20273d] p-3 rounded-xl">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por endpoint, serviço ou resumo..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg pl-9 pr-3 py-1.5 font-mono placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter by Service */}
            <div className="flex items-center gap-2">
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos os Serviços</option>
                {quotas.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value as any)}
                className="bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos os Status</option>
                <option value="success">Sucesso (2xx)</option>
                <option value="throttled">Throttled (429)</option>
                <option value="error">Erros (4xx/5xx)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#101424] border border-[#20273d] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#161a2e] border-b border-[#20273d] text-zinc-400">
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Serviço</th>
                    <th className="py-2.5 px-3 font-semibold">Método & Endpoint</th>
                    <th className="py-2.5 px-3 font-semibold">Resumo da Resposta</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Latência</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171c30]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono">
                        Nenhum registro de requisição encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      if (log.status === 429) {
                        statusBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold animate-pulse';
                      } else if (log.status >= 400 || log.isError) {
                        statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                      } else if (log.status >= 300) {
                        statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      }

                      return (
                        <tr key={log.id} className="hover:bg-[#15192c] transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge}`}>
                              HTTP {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-zinc-200">
                            {log.serviceName}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-cyan-400 font-bold mr-1.5">{log.method}</span>
                            <span className="text-zinc-300 font-mono text-[11px]">{log.endpoint}</span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 font-sans text-xs max-w-md truncate">
                            {log.responseSummary}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-right text-emerald-400">
                            {log.latencyMs} ms
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-right text-zinc-500 text-[11px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-[#0d101b] border-t border-[#1e233d] flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>
                Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> requisições
              </span>
              <button
                type="button"
                onClick={() => {
                  saveRequestLogs([]);
                  setLogs([]);
                }}
                className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Limpar Histórico de Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Policies, Guidelines & 429 Prevention */}
      {activeTab === 'guidelines' && (
        <div className="p-4 sm:p-6 bg-[#0a0c16] space-y-6">
          {/* Header Description */}
          <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1e2338]">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Boas Práticas de Engenharia para Respeito a Rate Limits de APIs
              </h3>
            </div>
            <p className="text-xs text-zinc-300 mt-3 leading-relaxed font-sans">
              Para assegurar que o gerenciador de bug bounty execute sincronizações com o GitHub, análises no Gemini AI e consultas ao NIST CVE sem interrupção operacional, implementamos mecanismos defensivos de <strong>Exponential Backoff</strong>, <strong>Jitter</strong> e <strong>Leaky Bucket Pacing</strong>.
            </p>
          </div>

          {/* Service Policies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* GitHub Policy */}
            <div className="bg-[#101424] border border-[#20273d] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-white mb-2">
                <span>GitHub REST & GraphQL</span>
                <span className="text-purple-400">5,000 req/h</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-2 font-sans">
                <li>• <strong>Token PAT:</strong> Usuários autenticados recebem 5.000 requisições por hora (vs. apenas 60 para IPs anônimos).</li>
                <li>• <strong>Limites Secundários:</strong> Evite mais de 100 requisições concorrentes ou requisições de escrita consecutivas na mesma issue em menos de 1 segundo.</li>
                <li>• <strong>Endpoint /rate_limit:</strong> Consultas a este endpoint não gastam cota.</li>
              </ul>
            </div>

            {/* NIST NVD Policy */}
            <div className="bg-[#101424] border border-[#20273d] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-white mb-2">
                <span>NIST NVD / CVE API</span>
                <span className="text-sky-400">50 req/30s</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-2 font-sans">
                <li>• <strong>Janela Móvel de 30 Segundos:</strong> O NVD impõe uma taxa rígida de 50 chamadas a cada 30 segundos com chave de API.</li>
                <li>• <strong>Sem Chave de API:</strong> O limite cai drasticamente para 5 requisições a cada 30s.</li>
                <li>• <strong>Sleep Recomendado:</strong> Mantenha intervalo mínimo de 600ms entre chamadas sequenciais de busca de CVEs.</li>
              </ul>
            </div>

            {/* Google Gemini AI Policy */}
            <div className="bg-[#101424] border border-[#20273d] rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-white mb-2">
                <span>Google Gemini API</span>
                <span className="text-emerald-400">360 RPM</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-2 font-sans">
                <li>• <strong>Tier Pay-As-You-Go:</strong> Permite até 360 RPM (Requisições por minuto) e 4 milhões de tokens por minuto (TPM).</li>
                <li>• <strong>Tier Gratuito:</strong> 15 RPM e 1.500 requisições por dia (RPD).</li>
                <li>• <strong>Server-Side Proxy:</strong> As chamadas ao Gemini são isoladas no backend Express (`/api/gemini/*`) preservando a chave.</li>
              </ul>
            </div>
          </div>

          {/* Code Reference: How Rate Limit Headers Work */}
          <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338] mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Inspeção dos Headers HTTP de Rate Limit (cURL)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#161a2e] text-zinc-300 hover:text-white border border-[#242c48] flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl ? 'Copiado!' : 'Copiar cURL'}</span>
              </button>
            </div>

            <pre className="bg-[#090b14] border border-[#1b2138] rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`# 1. Consulta gratuita da cota restante no GitHub REST API (sem decrementar seu saldo):
curl -H "Accept: application/vnd.github+json" \\
     -H "Authorization: Bearer YOUR_GITHUB_PAT_TOKEN" \\
     https://api.github.com/rate_limit

# 2. Resposta de cabeçalhos padrão inspecionada pela plataforma:
HTTP/2 200 OK
x-ratelimit-limit: 5000         # Total concedido na janela de 1 hora
x-ratelimit-remaining: 4852     # Saldo remanescente disponível
x-ratelimit-reset: 1716294800   # Timestamp Epoch Unix de renovação da cota
x-ratelimit-used: 148           # Total já consumido
retry-after: 60                 # Segundos de espera obrigatórios caso receba HTTP 429`}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
