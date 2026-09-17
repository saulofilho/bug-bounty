import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  RotateCcw,
  Zap,
  Shield,
  ShieldAlert,
  Sliders,
  Play,
  Square,
  Copy,
  Check,
  ChevronDown,
  Info,
  Server,
  Layers,
  Terminal,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  Pause
} from 'lucide-react';
import { VulnerabilityReport, PlatformName } from '../types';

export interface TargetRateLimitProfile {
  id: string;
  name: string;
  targetDomain: string;
  endpoint: string;
  platform: PlatformName | 'Direct Target' | 'Other';
  limit: number; // Total allowed requests per window
  windowSeconds: number; // Window size in seconds (e.g. 60s)
  used: number; // Consumed requests
  resetInSeconds: number; // Seconds left until quota replenishes
  roePolicy: 'STRICT' | 'STANDARD' | 'PERMISSIVE';
  wafThresholdWarning: number; // Percentage where WAF / 429 triggers
  lastRequestAt?: string;
  totalRequestsSession: number;
  blockedCount: number;
}

interface TargetRateLimitMonitorProps {
  reports?: VulnerabilityReport[];
  className?: string;
  onNavigateToTargets?: () => void;
}

const DEFAULT_PROFILES: TargetRateLimitProfile[] = [
  {
    id: 'tgt-api-main',
    name: 'Core REST API v1',
    targetDomain: 'api.target.com',
    endpoint: '/api/v1/*',
    platform: 'HackerOne',
    limit: 100,
    windowSeconds: 60,
    used: 42,
    resetInSeconds: 38,
    roePolicy: 'STANDARD',
    wafThresholdWarning: 80,
    totalRequestsSession: 340,
    blockedCount: 0
  },
  {
    id: 'tgt-auth-strict',
    name: 'OAuth & Login Endpoints (RoE Estrito)',
    targetDomain: 'auth.target.com',
    endpoint: '/oauth/token & /login',
    platform: 'Bugcrowd',
    limit: 20,
    windowSeconds: 60,
    used: 15,
    resetInSeconds: 22,
    roePolicy: 'STRICT',
    wafThresholdWarning: 75,
    totalRequestsSession: 68,
    blockedCount: 1
  },
  {
    id: 'tgt-graphql',
    name: 'GraphQL Query & Batching Gateway',
    targetDomain: 'graphql.target.com',
    endpoint: '/graphql',
    platform: 'Intigriti',
    limit: 120,
    windowSeconds: 60,
    used: 88,
    resetInSeconds: 14,
    roePolicy: 'STANDARD',
    wafThresholdWarning: 85,
    totalRequestsSession: 512,
    blockedCount: 2
  },
  {
    id: 'tgt-platform-h1',
    name: 'HackerOne API (Envio de Relatórios)',
    targetDomain: 'api.hackerone.com',
    endpoint: '/v1/reports',
    platform: 'HackerOne',
    limit: 600,
    windowSeconds: 3600,
    used: 145,
    resetInSeconds: 1840,
    roePolicy: 'PERMISSIVE',
    wafThresholdWarning: 90,
    totalRequestsSession: 145,
    blockedCount: 0
  }
];

export const TargetRateLimitMonitor: React.FC<TargetRateLimitMonitorProps> = ({
  reports = [],
  className = '',
  onNavigateToTargets
}) => {
  // Profiles State
  const [profiles, setProfiles] = useState<TargetRateLimitProfile[]>(() => {
    // Merge default profiles with any targets found in reports
    const knownDomains = new Set(DEFAULT_PROFILES.map((p) => p.targetDomain));
    const dynamicFromReports: TargetRateLimitProfile[] = [];

    reports.forEach((rep) => {
      if (rep.target && !knownDomains.has(rep.target)) {
        knownDomains.add(rep.target);
        dynamicFromReports.push({
          id: `tgt-${rep.id}`,
          name: `${rep.target} (${rep.vulnerabilityType})`,
          targetDomain: rep.target,
          endpoint: '/api/*',
          platform: rep.platform || 'Direct Target',
          limit: 100,
          windowSeconds: 60,
          used: 18,
          resetInSeconds: 45,
          roePolicy: 'STANDARD',
          wafThresholdWarning: 80,
          totalRequestsSession: 95,
          blockedCount: 0
        });
      }
    });

    return [...DEFAULT_PROFILES, ...dynamicFromReports.slice(0, 3)];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(profiles[0]?.id || 'tgt-api-main');
  const [isAutoFuzzing, setIsAutoFuzzing] = useState<boolean>(false);
  const [fuzzPaceReqPerSec, setFuzzPaceReqPerSec] = useState<number>(5);
  const [copiedBurpConfig, setCopiedBurpConfig] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // New target modal form state
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDomain, setNewTargetDomain] = useState('');
  const [newTargetEndpoint, setNewTargetEndpoint] = useState('/api/v1');
  const [newTargetLimit, setNewTargetLimit] = useState(60);
  const [newTargetWindow, setNewTargetWindow] = useState(60);
  const [newTargetRoe, setNewTargetRoe] = useState<'STRICT' | 'STANDARD' | 'PERMISSIVE'>('STANDARD');

  // Currently Active Profile
  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  // Real-time ticking effect: decrement window timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setProfiles((prev) =>
        prev.map((profile) => {
          if (profile.resetInSeconds <= 1) {
            // Window reset triggered! Replenish quota
            return {
              ...profile,
              used: 0,
              resetInSeconds: profile.windowSeconds
            };
          } else {
            return {
              ...profile,
              resetInSeconds: profile.resetInSeconds - 1
            };
          }
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Automated Fuzzing / Testing Stream Simulation
  useEffect(() => {
    if (!isAutoFuzzing) return;

    // Firing interval based on selected req/s
    const fireIntervalMs = Math.max(100, Math.floor(1000 / fuzzPaceReqPerSec));

    const fuzzInterval = setInterval(() => {
      setProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== activeProfileId) return profile;

          const isAtLimit = profile.used >= profile.limit;
          if (isAtLimit) {
            // Reached limit! Record block/throttle
            return {
              ...profile,
              blockedCount: profile.blockedCount + 1,
              lastRequestAt: new Date().toLocaleTimeString()
            };
          }

          return {
            ...profile,
            used: Math.min(profile.limit, profile.used + 1),
            totalRequestsSession: profile.totalRequestsSession + 1,
            lastRequestAt: new Date().toLocaleTimeString()
          };
        })
      );
    }, fireIntervalMs);

    return () => clearInterval(fuzzInterval);
  }, [isAutoFuzzing, fuzzPaceReqPerSec, activeProfileId]);

  // Stop auto-fuzzing if current target is exhausted
  useEffect(() => {
    if (currentProfile && currentProfile.used >= currentProfile.limit && isAutoFuzzing) {
      setIsAutoFuzzing(false);
    }
  }, [currentProfile, isAutoFuzzing]);

  // Calculated Metrics
  const usedRatio = currentProfile ? Math.min(1, currentProfile.used / currentProfile.limit) : 0;
  const usedPercentage = Math.round(usedRatio * 100);
  const remainingRequests = currentProfile ? Math.max(0, currentProfile.limit - currentProfile.used) : 0;

  // Rate Limiting Status
  const status: 'SAFE' | 'ELEVATED' | 'THROTTLED' | 'COOLDOWN_ACTIVE' = useMemo(() => {
    if (!currentProfile) return 'SAFE';
    if (currentProfile.used >= currentProfile.limit) return 'COOLDOWN_ACTIVE';
    if (usedPercentage >= currentProfile.wafThresholdWarning) return 'THROTTLED';
    if (usedPercentage >= 60) return 'ELEVATED';
    return 'SAFE';
  }, [currentProfile, usedPercentage]);

  // Safe pace recommendation
  const recommendedDelayMs = useMemo(() => {
    if (!currentProfile) return 1000;
    // Calculate ms per request to distribute smoothly over remaining seconds
    const remainingSec = Math.max(1, currentProfile.resetInSeconds);
    const remReq = Math.max(1, remainingRequests);
    const msPerReq = Math.floor((remainingSec * 1000) / remReq);
    return Math.max(100, msPerReq);
  }, [currentProfile, remainingRequests]);

  const recommendedSafePace = useMemo(() => {
    if (!currentProfile) return 1;
    const remainingSec = Math.max(1, currentProfile.resetInSeconds);
    const remReq = Math.max(0, remainingRequests);
    return (remReq / remainingSec).toFixed(1);
  }, [currentProfile, remainingRequests]);

  // Radial SVG Ring Dimensions
  const radius = 68;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usedRatio * circumference);

  // Dynamic Color Palette for Radial Ring
  const ringColor = useMemo(() => {
    if (status === 'COOLDOWN_ACTIVE') return { stroke: '#ef4444', text: 'text-rose-400', glow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' };
    if (status === 'THROTTLED') return { stroke: '#f43f5e', text: 'text-rose-400', glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' };
    if (status === 'ELEVATED') return { stroke: '#f59e0b', text: 'text-amber-400', glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' };
    return { stroke: '#10b981', text: 'text-emerald-400', glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' };
  }, [status]);

  // Handlers for Request Firing
  const handleFireSingleRequest = () => {
    if (!currentProfile || currentProfile.used >= currentProfile.limit) return;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId
          ? {
              ...p,
              used: Math.min(p.limit, p.used + 1),
              totalRequestsSession: p.totalRequestsSession + 1,
              lastRequestAt: new Date().toLocaleTimeString()
            }
          : p
      )
    );
  };

  const handleFireBurst = (count: number) => {
    if (!currentProfile) return;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId
          ? {
              ...p,
              used: Math.min(p.limit, p.used + count),
              totalRequestsSession: p.totalRequestsSession + count,
              lastRequestAt: new Date().toLocaleTimeString()
            }
          : p
      )
    );
  };

  const handleResetCurrentQuota = () => {
    if (!currentProfile) return;
    setIsAutoFuzzing(false);
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId
          ? {
              ...p,
              used: 0,
              resetInSeconds: p.windowSeconds,
              blockedCount: 0
            }
          : p
      )
    );
  };

  // Burp Suite & Curl Config Copy
  const burpThrottlingConfigText = useMemo(() => {
    if (!currentProfile) return '';
    return `# Burp Suite Intruder / Project Options Rate Limit Rule
# Target: ${currentProfile.targetDomain} (${currentProfile.endpoint})
# RoE Policy: ${currentProfile.roePolicy}
Delay between requests: ${recommendedDelayMs} ms
Throttle: ${recommendedSafePace} req/second max
Maximum concurrency: 1 thread
429 Response action: Pause for Retry-After seconds

# Header Simulation for Testing
curl -s -i "https://${currentProfile.targetDomain}${currentProfile.endpoint.replace('/*', '')}" \\
  -H "User-Agent: BugBounty-Security-Audit/1.0" \\
  --retry 3 \\
  --retry-delay 2`;
  }, [currentProfile, recommendedDelayMs, recommendedSafePace]);

  const handleCopyBurpConfig = () => {
    navigator.clipboard.writeText(burpThrottlingConfigText);
    setCopiedBurpConfig(true);
    setTimeout(() => setCopiedBurpConfig(false), 2200);
  };

  // Add custom target profile
  const handleAddNewTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetDomain.trim()) return;

    const newProfile: TargetRateLimitProfile = {
      id: `tgt-${Date.now()}`,
      name: newTargetName.trim() || newTargetDomain.trim(),
      targetDomain: newTargetDomain.trim(),
      endpoint: newTargetEndpoint.trim() || '/api/*',
      platform: 'Direct Target',
      limit: Number(newTargetLimit) || 60,
      windowSeconds: Number(newTargetWindow) || 60,
      used: 0,
      resetInSeconds: Number(newTargetWindow) || 60,
      roePolicy: newTargetRoe,
      wafThresholdWarning: newTargetRoe === 'STRICT' ? 75 : 85,
      totalRequestsSession: 0,
      blockedCount: 0
    };

    setProfiles((prev) => [newProfile, ...prev]);
    setActiveProfileId(newProfile.id);
    setShowConfigModal(false);
    setNewTargetName('');
    setNewTargetDomain('');
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id) {
      const remaining = profiles.filter((p) => p.id !== id);
      setActiveProfileId(remaining[0]?.id || '');
    }
  };

  return (
    <div
      id="target-rate-limit-monitor"
      className={`rounded-2xl bg-[#0c0e14] border border-[#1e2338] shadow-xl overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#101422] via-[#0e121c] to-[#0c0e14] border-b border-[#1e2338]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2 font-mono uppercase">
                <span>Monitor de Rate Limit de Alvos</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-sans normal-case">
                  Tempo Real (API Call Limits)
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Monitore a cadência de testes, cotas de requisições por janela e limites de rate limit (X-RateLimit)
              dos seus alvos para respeitar as Regras de Engajamento (RoE) e evitar bloqueios de WAF ou erros 429.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-add-rate-limit-target"
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-300 hover:text-white border border-[#22283e] text-xs font-mono transition-all flex items-center gap-1.5"
              title="Adicionar novo endpoint ou alvo para monitoramento de rate limit"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Novo Alvo</span>
            </button>

            <button
              id="btn-copy-burp-rate-config"
              type="button"
              onClick={handleCopyBurpConfig}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border flex items-center gap-1.5 ${
                copiedBurpConfig
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border-cyan-500/30'
              }`}
              title="Copiar regra de throttling para Burp Suite Intruder / curl"
            >
              {copiedBurpConfig ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Config Burp/Pace</span>
                </>
              )}
            </button>

            <button
              id="btn-reset-rate-limit-quota"
              type="button"
              onClick={handleResetCurrentQuota}
              className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-400 hover:text-zinc-200 border border-[#22283e] text-xs font-mono transition-all flex items-center gap-1"
              title="Resetar cota do alvo atual"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Target Profile Switcher Bar */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-zinc-500 text-[11px] uppercase tracking-wider shrink-0 mr-1">
            Alvos Ativos:
          </span>
          {profiles.map((prof) => {
            const isActive = prof.id === activeProfileId;
            const profRatio = prof.used / prof.limit;
            const isCritical = profRatio >= 0.85 || prof.used >= prof.limit;
            const isWarn = profRatio >= 0.6;

            return (
              <div
                key={prof.id}
                onClick={() => setActiveProfileId(prof.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#151b2c] border-cyan-500/50 text-white shadow-sm'
                    : 'bg-[#090b10] border-[#1e2338] text-zinc-400 hover:text-zinc-200 hover:bg-[#121624]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCritical
                      ? 'bg-rose-500 animate-pulse'
                      : isWarn
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="font-semibold">{prof.targetDomain}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  ({prof.used}/{prof.limit})
                </span>

                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProfile(prof.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-opacity p-0.5 ml-1"
                    title="Remover alvo do monitor"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Body: Radial Gauge on Left, Testing Controls & Metrics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#1e2338]">
        
        {/* LEFT COLUMN: Circular Radial Progress Indicator & Status (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-[#090b10] border-b lg:border-b-0 lg:border-r border-[#1e2338] flex flex-col items-center justify-center space-y-5">
          
          <div className="text-center space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Taxa de Consumo de API
            </span>
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-base font-bold text-white font-mono truncate max-w-[240px]">
                {currentProfile?.targetDomain}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141824] text-zinc-300 border border-[#22283e]">
                {currentProfile?.endpoint}
              </span>
            </div>
          </div>

          {/* SVG Circular Radial Progress Gauge */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-48 h-48 sm:w-52 sm:h-52 transform -rotate-90"
              viewBox="0 0 160 160"
            >
              {/* Background Track Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-[#151928]"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Foreground Animated Progress Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={ringColor.stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className={`transition-all duration-500 ease-out ${ringColor.glow}`}
              />
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${ringColor.text}`}>
                {usedPercentage}%
              </span>
              <span className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {currentProfile?.used} / {currentProfile?.limit} req
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 mt-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Reset em {currentProfile?.resetInSeconds}s</span>
              </div>
            </div>
          </div>

          {/* Status Badge & Alert */}
          <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#121624] border border-[#1e2338] text-xs font-mono">
              <span className="text-zinc-400">Status do Alvo:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  status === 'COOLDOWN_ACTIVE'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : status === 'THROTTLED'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : status === 'ELEVATED'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {status === 'COOLDOWN_ACTIVE'
                  ? 'COOLDOWN ATIVO (429)'
                  : status === 'THROTTLED'
                  ? 'LIMITE CRÍTICO (WAF)'
                  : status === 'ELEVATED'
                  ? 'ATENÇÃO (ELEVADO)'
                  : 'SEGURO (NORMAL)'}
              </span>
            </div>

            {status === 'COOLDOWN_ACTIVE' && (
              <div className="p-2.5 rounded-lg bg-rose-950/25 border border-rose-500/30 text-[11px] text-rose-300 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Cota esgotada! Interrompa requisições para evitar bloqueio por IP.</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Testing Throttler, Cadence Controls & Headers (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-[#0c0e14] flex flex-col justify-between space-y-6">
          
          {/* Top Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#090b10] border border-[#1e2338]">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Requisições Restantes</span>
              <span className="text-lg font-bold font-mono text-zinc-200">
                {remainingRequests}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">nesta janela de {currentProfile?.windowSeconds}s</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090b10] border border-[#1e2338]">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Pace Seguro</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {recommendedSafePace} <span className="text-xs font-normal text-zinc-500">req/s</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">recomendado RoE</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090b10] border border-[#1e2338]">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Delay Indicado</span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                {recommendedDelayMs} <span className="text-xs font-normal text-zinc-500">ms</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">entre requisições</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090b10] border border-[#1e2338]">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Total Sessão</span>
              <span className="text-lg font-bold font-mono text-zinc-200">
                {currentProfile?.totalRequestsSession}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                {currentProfile?.blockedCount ? `${currentProfile.blockedCount} bloqueios 429` : '0 erros 429'}
              </span>
            </div>
          </div>

          {/* Interactive Request Simulator & Throttler */}
          <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2338]">
              <span className="text-xs font-bold text-zinc-200 uppercase font-mono flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Simulador de Teste & Cadência (Burp / Fuzzing)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Última chamada: {currentProfile?.lastRequestAt || 'Nenhuma nesta sessão'}
              </span>
            </div>

            {/* Firing Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFireSingleRequest}
                disabled={currentProfile?.used >= currentProfile?.limit}
                className="px-3 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-200 hover:text-white border border-[#22283e] text-xs font-mono transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                title="Dispara 1 requisição HTTP simulada"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>+1 Chamada</span>
              </button>

              <button
                type="button"
                onClick={() => handleFireBurst(5)}
                disabled={currentProfile?.used >= currentProfile?.limit}
                className="px-3 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-200 hover:text-white border border-[#22283e] text-xs font-mono transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                title="Dispara rajada de 5 requisições"
              >
                <span>+5 Rajada</span>
              </button>

              <button
                type="button"
                onClick={() => handleFireBurst(15)}
                disabled={currentProfile?.used >= currentProfile?.limit}
                className="px-3 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-200 hover:text-white border border-[#22283e] text-xs font-mono transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                title="Dispara rajada de 15 requisições (fuzzing moderado)"
              >
                <span>+15 Fuzz Burst</span>
              </button>

              {/* Auto Fuzzing Toggle */}
              <button
                type="button"
                onClick={() => setIsAutoFuzzing(!isAutoFuzzing)}
                disabled={currentProfile?.used >= currentProfile?.limit && !isAutoFuzzing}
                className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                  isAutoFuzzing
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm animate-pulse'
                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                }`}
                title="Ativar envio contínuo no ritmo selecionado"
              >
                {isAutoFuzzing ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausar Fuzzing</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar Fuzz Contínuo</span>
                  </>
                )}
              </button>
            </div>

            {/* Continuous Fuzz Pace Slider */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-[11px]">Velocidade do Fuzzing:</span>
                <span className="text-cyan-400 font-bold">{fuzzPaceReqPerSec} req/s</span>
              </div>
              <div className="flex items-center gap-3 flex-1 sm:max-w-xs">
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={fuzzPaceReqPerSec}
                  onChange={(e) => setFuzzPaceReqPerSec(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-[#1e2338] rounded-lg h-1.5 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500 shrink-0">Máx 25 req/s</span>
              </div>
            </div>
          </div>

          {/* Live HTTP Headers Visualizer */}
          <div className="p-4 rounded-xl bg-[#080a10] border border-[#1e2338] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Cabeçalhos HTTP Simulados (Rate Limit Response)
              </span>
              <span className="text-zinc-500">RFC 6585 / IETF Draft</span>
            </div>

            <div className="p-3 rounded-lg bg-[#05070a] border border-[#161b2c] font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-cyan-400 font-semibold">X-RateLimit-Limit:</span>
                <span className="text-zinc-200">{currentProfile?.limit}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-cyan-400 font-semibold">X-RateLimit-Remaining:</span>
                <span className={remainingRequests === 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {remainingRequests}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-cyan-400 font-semibold">X-RateLimit-Reset:</span>
                <span className="text-zinc-200">{Math.floor(Date.now() / 1000) + (currentProfile?.resetInSeconds || 0)} ({currentProfile?.resetInSeconds}s)</span>
              </div>
              {status === 'COOLDOWN_ACTIVE' && (
                <div className="flex items-center justify-between text-rose-400 pt-1 border-t border-rose-500/20">
                  <span className="font-semibold">HTTP Status:</span>
                  <span className="font-bold">429 Too Many Requests (Retry-After: {currentProfile?.resetInSeconds}s)</span>
                </div>
              )}
            </div>
          </div>

          {/* Testing Cadence Guidance Note */}
          <div className="p-3 rounded-xl bg-[#0e121e] border border-cyan-500/20 flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] text-zinc-400 font-sans leading-relaxed">
              <strong className="text-zinc-200 font-mono block">Dica de Segurança Operacional (OpSec):</strong>
              Em programas com regras de engajamento restritas, configure o Burp Intruder ou <code className="text-cyan-300 font-mono">ffuf -rate {recommendedSafePace}</code> para operar dentro do ritmo recomendado de {recommendedDelayMs}ms, preservando a disponibilidade do serviço e garantindo a elegibilidade a bounties.
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add New Target Rate Limit Policy */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e121c] border border-[#1e2338] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Adicionar Alvo ao Monitor de Rate Limit
              </span>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewTarget} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1 text-[11px]">Nome de Identificação:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: API de Pagamentos / Checkout"
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 text-[11px]">Domínio do Alvo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: api.empresa.com"
                  value={newTargetDomain}
                  onChange={(e) => setNewTargetDomain(e.target.value)}
                  className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 text-[11px]">Caminho / Endpoint do Escopo:</label>
                <input
                  type="text"
                  placeholder="Ex: /api/v1/auth/*"
                  value={newTargetEndpoint}
                  onChange={(e) => setNewTargetEndpoint(e.target.value)}
                  className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 text-[11px]">Limite de Req:</label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={newTargetLimit}
                    onChange={(e) => setNewTargetLimit(Number(e.target.value))}
                    className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 text-[11px]">Janela (Segundos):</label>
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={newTargetWindow}
                    onChange={(e) => setNewTargetWindow(Number(e.target.value))}
                    className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 text-[11px]">Política de RoE:</label>
                <select
                  value={newTargetRoe}
                  onChange={(e) => setNewTargetRoe(e.target.value as any)}
                  className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="STRICT">Estrito (RoE Restrito: &lt; 5 req/s)</option>
                  <option value="STANDARD">Padrão (&lt; 15 req/s)</option>
                  <option value="PERMISSIVE">Permissivo / Escopo Amplo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2338]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Salvar Alvo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
