import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  DollarSign,
  TrendingDown,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Award,
  Zap,
  Building2,
  Scale,
  FileText,
  ChevronDown,
  ChevronUp,
  Percent,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Bell,
  BellRing,
  Flame,
  Play
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import { notifyFairAleBreach } from '../utils/toastNotifications';
import {
  FairSimulationConfig,
  FairRiskCalculationResult,
  FairExposureLevel,
  FairDataSensitivity,
  FairOperationalDependency,
  FairControlsStrength,
  ThreatActorCapability,
  inferFairConfigFromReport,
  calculateFairRisk
} from '../utils/fairRiskEngine';
import { FairRiskToleranceConfigModal } from './FairRiskToleranceConfigModal';
import { FairRiskToleranceConfigPanel } from './FairRiskToleranceConfigPanel';
import {
  FairNotificationChannel,
  FairSeverityTier,
  FairSeverityThresholdRule,
  FairSeverityThresholdsConfig,
  getFairSeverityThresholdsConfig,
  saveFairSeverityThresholdsConfig,
  mapReportSeverityToTier,
  getEffectiveSeverityRule,
  FAIR_SEVERITY_THRESHOLDS_EVENT,
  FairRiskAlertPreferences,
  FairRiskInternalLog,
  getFairRiskAlertPreferences,
  saveFairRiskAlertPreferences,
  getFairRiskInternalLogs,
  dispatchFairRiskAlert,
  FAIR_INTERNAL_LOGS_EVENT
} from '../utils/fairRiskNotificationEngine';

interface FairImpactSimulatorProps {
  reports: VulnerabilityReport[];
  initialReportId?: string;
  onSelectReport?: (report: VulnerabilityReport) => void;
  onOpenToleranceConfig?: () => void;
  className?: string;
}

export const FairImpactSimulator: React.FC<FairImpactSimulatorProps> = ({
  reports,
  initialReportId,
  onSelectReport,
  onOpenToleranceConfig,
  className = ''
}) => {
  const [isToleranceModalOpen, setIsToleranceModalOpen] = useState<boolean>(false);
  const [isTolerancePanelOpen, setIsTolerancePanelOpen] = useState<boolean>(false);
  const [tolerancePanelTab, setTolerancePanelTab] = useState<'tolerance' | 'severity_tiers' | 'notifications' | 'logs'>('tolerance');

  // 1. State: Selected Report
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialReportId || (reports.length > 0 ? reports[0].id : '')
  );

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  // Currency toggle (USD / BRL, fixed 5.45)
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
  const currencyMultiplier = currency === 'BRL' ? 5.45 : 1;

  const formatMoney = (valUSD: number) => {
    return formatCurrency(valUSD * currencyMultiplier, currency);
  };

  // 2. State: Simulation Parameters
  const [config, setConfig] = useState<FairSimulationConfig>(() => {
    if (selectedReport) {
      return inferFairConfigFromReport(selectedReport);
    }
    return {
      reportId: '',
      exposure: 'public_internet',
      annualRevenue: 50000000,
      recordCount: 10000,
      dataSensitivity: 'pii',
      operationalDependency: 'moderate',
      controlsStrength: 'basic'
    };
  });

  // Re-infer defaults when user switches reports
  useEffect(() => {
    if (selectedReport) {
      setConfig(inferFairConfigFromReport(selectedReport));
    }
  }, [selectedReport]);

  // Expandable parameter customization panel (open by default to easily tune threat variables)
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(true);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Unified Alert & Tolerance Preferences (ALE threshold + Toast / Internal Log preferences)
  const [alertPreferences, setAlertPreferences] = useState<FairRiskAlertPreferences>(getFairRiskAlertPreferences);
  const [severityConfig, setSeverityConfig] = useState<FairSeverityThresholdsConfig>(getFairSeverityThresholdsConfig);
  const [internalLogs, setInternalLogs] = useState<FairRiskInternalLog[]>(getFairRiskInternalLogs);

  // Sync internal logs and severity config state across tabs and triggers
  useEffect(() => {
    const handleLogsUpdate = (e: Event) => {
      const custom = e as CustomEvent<FairRiskInternalLog[]>;
      if (custom.detail) {
        setInternalLogs(custom.detail);
      } else {
        setInternalLogs(getFairRiskInternalLogs());
      }
    };

    const handleSeverityUpdate = (e: Event) => {
      const custom = e as CustomEvent<FairSeverityThresholdsConfig>;
      if (custom.detail) {
        setSeverityConfig(custom.detail);
      } else {
        setSeverityConfig(getFairSeverityThresholdsConfig());
      }
    };

    window.addEventListener(FAIR_INTERNAL_LOGS_EVENT, handleLogsUpdate);
    window.addEventListener(FAIR_SEVERITY_THRESHOLDS_EVENT, handleSeverityUpdate);
    window.addEventListener('storage', handleLogsUpdate);
    window.addEventListener('storage', handleSeverityUpdate);
    return () => {
      window.removeEventListener(FAIR_INTERNAL_LOGS_EVENT, handleLogsUpdate);
      window.removeEventListener(FAIR_SEVERITY_THRESHOLDS_EVENT, handleSeverityUpdate);
      window.removeEventListener('storage', handleLogsUpdate);
      window.removeEventListener('storage', handleSeverityUpdate);
    };
  }, []);

  const updateAlertPreferences = (newPrefs: FairRiskAlertPreferences) => {
    setAlertPreferences(newPrefs);
    saveFairRiskAlertPreferences(newPrefs);
  };

  const updateSeverityConfig = (newConfig: FairSeverityThresholdsConfig) => {
    setSeverityConfig(newConfig);
    saveFairSeverityThresholdsConfig(newConfig);
  };

  // Determine effective rule and threshold for currently analyzed report
  const currentSeverityTier: FairSeverityTier = useMemo(() => {
    return selectedReport ? mapReportSeverityToTier(selectedReport.severity) : 'LOW';
  }, [selectedReport]);

  const currentSeverityRule: FairSeverityThresholdRule | null = useMemo(() => {
    if (!selectedReport) return null;
    return getEffectiveSeverityRule(selectedReport.severity, severityConfig);
  }, [selectedReport, severityConfig]);

  const effectiveThresholdUSD = useMemo(() => {
    if (severityConfig.enabled && currentSeverityRule) {
      return currentSeverityRule.thresholdUSD;
    }
    return alertPreferences.thresholdUSD;
  }, [severityConfig.enabled, currentSeverityRule, alertPreferences.thresholdUSD]);

  // 3. Execution: Run FAIR Calculation
  const fairResult: FairRiskCalculationResult | null = useMemo(() => {
    if (!selectedReport) return null;
    return calculateFairRisk(selectedReport, config);
  }, [selectedReport, config]);

  const lastAlertTriggerRef = useRef<{ reportId: string; ale: number; time: number } | null>(null);

  const triggerAleAlert = (force = false, forcedChannel?: FairNotificationChannel) => {
    if (!fairResult || !selectedReport) return;
    const now = Date.now();
    // Avoid repetitive automatic triggers within short duration unless force clicked
    if (!force && lastAlertTriggerRef.current) {
      if (
        lastAlertTriggerRef.current.reportId === selectedReport.id &&
        Math.abs(lastAlertTriggerRef.current.ale - fairResult.ale) < 2000 &&
        now - lastAlertTriggerRef.current.time < 8000
      ) {
        return;
      }
    }

    lastAlertTriggerRef.current = {
      reportId: selectedReport.id,
      ale: fairResult.ale,
      time: now
    };

    const targetPreferences = forcedChannel
      ? { ...alertPreferences, channel: forcedChannel, alertsEnabled: true }
      : alertPreferences;

    const { dispatchedLog } = dispatchFairRiskAlert({
      report: selectedReport,
      aleUSD: fairResult.ale,
      aro: fairResult.aro,
      sleUSD: fairResult.sle,
      cvss: config.customCvss ?? selectedReport.cvssScore,
      currency,
      currencyMultiplier,
      preferences: targetPreferences,
      severityConfig,
      onOpenReport: () => {
        if (onSelectReport) onSelectReport(selectedReport);
      },
      forceManual: force
    });

    if (dispatchedLog) {
      setInternalLogs(getFairRiskInternalLogs());
    }
  };

  // Automatic debounced notification when ALE exceeds the active limit
  useEffect(() => {
    if (
      alertPreferences.alertsEnabled &&
      alertPreferences.autoDispatchOnBreach &&
      fairResult &&
      fairResult.ale > effectiveThresholdUSD
    ) {
      const timer = setTimeout(() => {
        triggerAleAlert(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    fairResult?.ale,
    effectiveThresholdUSD,
    alertPreferences.alertsEnabled,
    alertPreferences.autoDispatchOnBreach,
    alertPreferences.channel,
    severityConfig,
    selectedReport?.id
  ]);

  // Copy Executive Report to Clipboard
  const handleCopySummary = () => {
    if (!fairResult || !selectedReport) return;
    const text = `=== BRIEFING EXECUTIVO DE RISCO QUANTITATIVO (FAIR) ===
Relatório: ${selectedReport.title} (${selectedReport.id})
Target: ${selectedReport.target} | Severidade: ${selectedReport.severity} (CVSS ${selectedReport.cvssScore.toFixed(1)})
Classificação de Risco FAIR: ${fairResult.riskLabel} (Score ${fairResult.riskScore}/100)

1. MÉTRICAS FINANCEIRAS PRINCIPAIS:
- Perda Anual Esperada (ALE - Annual Loss Expectancy): ${formatMoney(fairResult.ale)} / ano
  * Faixa de Confiança: ${formatMoney(fairResult.aleMin)} (10th%) até ${formatMoney(fairResult.aleMax)} (90th%)
- Perda por Incidente (SLE - Single Loss Expectancy): ${formatMoney(fairResult.sle)}
- Taxa Anual de Ocorrência (ARO): ${fairResult.aro}x / ano (~${fairResult.tef} tentativas de ataque/ano)

2. DECOMPOSIÇÃO DE PERDAS POR EVENTO (SLE):
- Perda Primária: ${formatMoney(fairResult.primaryLoss.totalPrimary)}
  * Ativos & Registros: ${formatMoney(fairResult.primaryLoss.assetLoss)}
  * Indisponibilidade & Downtime: ${formatMoney(fairResult.primaryLoss.productivityDowntime)}
  * Resposta ao Incidente & Forense: ${formatMoney(fairResult.primaryLoss.incidentResponse)}
- Perda Secundária: ${formatMoney(fairResult.secondaryLoss.totalSecondary)}
  * Multas Regulatórias (LGPD/GDPR): ${formatMoney(fairResult.secondaryLoss.regulatoryFines)}
  * Evasão de Clientes & Marca: ${formatMoney(fairResult.secondaryLoss.reputationChurn)}
  * Jurídico & Comunicação: ${formatMoney(fairResult.secondaryLoss.legalAndNotification)}

3. RETORNO SOBRE O INVESTIMENTO (BUG BOUNTY ROI):
- Custo da Recompensa: ${formatMoney(fairResult.bountyPaid)}
- Risco Anual Evitado: ${formatMoney(fairResult.costAvoidedAnnual)}
- Múltiplo de Economia: ${fairResult.savingsMultiple}x de ROI financeiro evitado

${fairResult.executiveSummary}
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleResetToInferred = () => {
    if (selectedReport) {
      setConfig(inferFairConfigFromReport(selectedReport));
    }
  };

  if (!selectedReport || !fairResult) {
    return null;
  }

  const cvssBadge = getSeverityBadgeColor(selectedReport.severity);

  // Prepare data for ALE Comparison Chart
  const aleComparisonData = [
    {
      scenario: 'Otimista (10%)',
      amount: fairResult.aleMin * currencyMultiplier,
      fill: '#3b82f6',
      description: 'Menor impacto em cenário com contenção ágil'
    },
    {
      scenario: 'Esperado (ALE)',
      amount: fairResult.ale * currencyMultiplier,
      fill: fairResult.riskTier === 'CRITICAL' ? '#ef4444' : fairResult.riskTier === 'HIGH' ? '#f97316' : '#10b981',
      description: 'Cenário base mais provável segundo o FAIR'
    },
    {
      scenario: 'Pior Caso (90%)',
      amount: fairResult.aleMax * currencyMultiplier,
      fill: '#dc2626',
      description: 'Exposição catastrófica com multas e churn máximo'
    },
    {
      scenario: 'ALE Residual',
      amount: fairResult.residualAle * currencyMultiplier,
      fill: '#10b981',
      description: 'Risco residual após implementação da correção'
    },
    {
      scenario: 'Custo Bounty',
      amount: fairResult.bountyPaid * currencyMultiplier,
      fill: '#a855f7',
      description: 'Investimento na recompensa do bug bounty'
    }
  ];

  // Colors for loss breakdown bars
  const categoryColors = [
    '#3b82f6', // Assets
    '#f59e0b', // Downtime
    '#8b5cf6', // IR
    '#ef4444', // Fines
    '#ec4899', // Churn
    '#06b6d4'  // Legal
  ];

  return (
    <section
      id="fair-risk-simulator-view"
      className={`p-5 sm:p-6 rounded-xl bg-[#0a0a0d] border border-[#222228] space-y-6 shadow-2xl ${className}`}
    >
      <span id="fair-impact-simulator-section" className="sr-only" />
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e1e24]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                <span>Simulador de Risco FAIR</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                  FAIR™ ISO/IEC 27005
                </span>
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                fairResult.riskTier === 'CRITICAL'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : fairResult.riskTier === 'HIGH'
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {fairResult.riskLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Modelagem quantitativa de risco financeiro com a metodologia <strong className="text-zinc-200">FAIR (Factor Analysis of Information Risk)</strong>. Calcula a Perda Anual Esperada (<strong className="text-amber-400">ALE</strong> = ARO × SLE) a partir do CVSS v3.1, frequência de ameaça e impacto de negócio.
            </p>
          </div>
        </div>

        {/* Global Controls: Currency + Copy Briefing */}
        <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
          {/* Currency Toggle */}
          <div className="flex items-center bg-[#141418] border border-[#26262e] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BRL')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                currency === 'BRL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              BRL (R$)
            </button>
          </div>

          {/* Tolerance Thresholds & Notifications Configuration Panel Button */}
          <button
            type="button"
            id="btn-fair-tolerance-settings"
            onClick={() => {
              setIsTolerancePanelOpen(!isTolerancePanelOpen);
              setTolerancePanelTab('tolerance');
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs text-zinc-300 hover:text-white font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isTolerancePanelOpen && tolerancePanelTab === 'tolerance'
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                : 'bg-[#141418] hover:bg-[#1a1a22] border-[#2a2a34] hover:border-amber-500/40'
            }`}
            title="Abrir Painel de Configuração de Tolerância ao Risco (ALE) e Preferências de Notificação"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Configurar Tolerância</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              alertPreferences.channel === 'both'
                ? 'bg-indigo-500/20 text-indigo-300'
                : alertPreferences.channel === 'toast'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {alertPreferences.channel === 'both' ? 'Toast+Log' : alertPreferences.channel === 'toast' ? 'Toast' : 'Log'}
            </span>
            {internalLogs.filter(l => l.status === 'UNREAD').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" title="Novos logs de violação pendentes" />
            )}
          </button>

          {/* Severity Tiers Multi-Tier Quick Button */}
          <button
            type="button"
            id="btn-fair-severity-tiers-quick"
            onClick={() => {
              setIsTolerancePanelOpen(true);
              setTolerancePanelTab('severity_tiers');
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isTolerancePanelOpen && tolerancePanelTab === 'severity_tiers'
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                : 'bg-[#141418] hover:bg-[#1a1a22] border-[#2a2a34] hover:border-amber-500/40 text-zinc-300 hover:text-white'
            }`}
            title="Abrir Painel de Limiares Diferenciados por Severidade (Baixo, Médio, Alto, Crítico)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Limiares por Severidade</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
              4 Faixas
            </span>
          </button>

          {/* Copy Executive Summary */}
          <button
            type="button"
            id="btn-copy-fair-summary"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1a1a22] border border-[#2a2a34] hover:border-amber-500/40 text-xs text-zinc-300 hover:text-white font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Copiar relatório executivo para apresentação ao C-level/Board"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Briefing Executivo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Embedded Painel de Configuração de Tolerância ao Risco & Preferências de Notificação */}
      {isTolerancePanelOpen && (
        <FairRiskToleranceConfigPanel
          currentReport={selectedReport}
          currentAleUSD={fairResult.ale}
          currentAro={fairResult.aro}
          currentSleUSD={fairResult.sle}
          currency={currency}
          currencyMultiplier={currencyMultiplier}
          onSelectReport={onSelectReport}
          onPreferencesChange={updateAlertPreferences}
          onSeverityConfigChange={updateSeverityConfig}
          defaultTab={tolerancePanelTab}
          className="border-amber-500/30"
        />
      )}

      {/* 2. Report Selector & Quick Meta Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#101014] p-3.5 rounded-xl border border-[#1e1e24]">
        <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <label htmlFor="fair-report-select" className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Relatório Analisado:</span>
          </label>
          <div className="relative flex-1">
            <select
              id="fair-report-select"
              value={selectedReportId}
              onChange={(e) => {
                setSelectedReportId(e.target.value);
              }}
              className="w-full bg-[#18181e] text-zinc-100 text-xs font-mono rounded-lg px-3 py-2 border border-[#2a2a36] focus:border-amber-500 focus:outline-none transition-colors cursor-pointer appearance-none pr-8 truncate"
            >
              {reports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  [{rep.id}] {rep.severity} (CVSS {rep.cvssScore.toFixed(1)}) - {rep.title} ({rep.target})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${cvssBadge.bg} ${cvssBadge.text} ${cvssBadge.border}`}>
              {selectedReport.severity}
            </span>
            <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-[#18181e] border border-[#2a2a34]">
              CVSS {selectedReport.cvssScore.toFixed(1)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              isConfigExpanded
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#18181e] border-[#2a2a36] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calibrar Parâmetros</span>
            {isConfigExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. Parameter Customization Drawer (Accordion) */}
      {isConfigExpanded && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#121217] border border-[#2a2a36] space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#22222c]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                <span>Calibração das Variáveis de Ameaça e Impacto FAIR</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] border border-amber-500/25">
                Ajuste Dinâmico em Tempo Real
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetToInferred}
              className="text-[11px] font-mono text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Redefinir pelos dados do Relatório</span>
            </button>
          </div>

          {/* Section A: Variáveis de Ameaça e Frequência de Exploração */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Variáveis de Ameaça & Exploração (Threat & Exploitability)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono bg-[#0c0c10] p-4 rounded-xl border border-zinc-800">
              {/* Variable 1: CVSS Score Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1">
                    <span>Pontuação CVSS v3.1 / v4.0:</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded font-bold text-xs border ${
                      (config.customCvss ?? selectedReport.cvssScore) >= 9.0
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : (config.customCvss ?? selectedReport.cvssScore) >= 7.0
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : (config.customCvss ?? selectedReport.cvssScore) >= 4.0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {(config.customCvss ?? selectedReport.cvssScore).toFixed(1)}
                    </span>
                    {(config.customCvss !== undefined && config.customCvss !== selectedReport.cvssScore) && (
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, customCvss: selectedReport.cvssScore })}
                        className="text-[10px] text-zinc-500 hover:text-amber-400 underline"
                        title="Restaurar CVSS do relatório"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={config.customCvss ?? selectedReport.cvssScore}
                  onChange={(e) => setConfig({ ...config, customCvss: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>0.1 (Baixo)</span>
                  <span>4.0 (Médio)</span>
                  <span>7.0 (Alto)</span>
                  <span>10.0 (Crítico)</span>
                </div>
              </div>

              {/* Variable 2: Frequência Estimada de Exploração (TEF) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-semibold">
                    Frequência de Tentativas (TEF):
                  </label>
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {config.estimatedExploitFrequency ?? 36} tentativas / ano
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  value={config.estimatedExploitFrequency ?? 36}
                  onChange={(e) => setConfig({ ...config, estimatedExploitFrequency: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-zinc-500">Presets:</span>
                  {[
                    { label: 'Baixa (4/ano)', val: 4 },
                    { label: 'Média (12/ano)', val: 12 },
                    { label: 'Alta (36/ano)', val: 36 },
                    { label: 'Automatizada (80/ano)', val: 80 }
                  ].map(pre => (
                    <button
                      key={pre.label}
                      type="button"
                      onClick={() => setConfig({ ...config, estimatedExploitFrequency: pre.val })}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        (config.estimatedExploitFrequency ?? 36) === pre.val
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pre.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable 3: Capacidade do Atacante (Threat Actor Capability) */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold block">
                  Perfil & Capacidade do Atacante:
                </label>
                <select
                  value={config.threatActorCapability || 'opportunistic'}
                  onChange={(e) => setConfig({ ...config, threatActorCapability: e.target.value as ThreatActorCapability })}
                  className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-2 border border-[#30303c] focus:border-amber-500 focus:outline-none text-xs"
                >
                  <option value="script_kiddie">Script Kiddie / Amador (Nível 2 - Scanners Públicos)</option>
                  <option value="opportunistic">Oportunista / Bug Hunter (Nível 5 - Ferramentas Comuns)</option>
                  <option value="skilled_hacker">Hacker Especializado (Nível 8 - Exploits Customizados)</option>
                  <option value="apt_nation_state">APT / Estado-Nação (Nível 10 - 0-days, Recursos Ilimitados)</option>
                </select>
                <p className="text-[10px] text-zinc-500">
                  Modula a probabilidade de bypass de defesas e taxa de sucesso do exploit.
                </p>
              </div>
            </div>
          </div>

          {/* Section B: Variáveis de Exposição, Controles e Negócio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Variáveis de Exposição, Ativos e Impacto Organizacional (SLE)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              {/* Exposure */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Exposição da Aplicação (Vetor de Acesso):</label>
                <select
                  value={config.exposure}
                  onChange={(e) => setConfig({ ...config, exposure: e.target.value as FairExposureLevel })}
                  className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
                >
                  <option value="public_internet">Internet Pública (Ataques Constantes)</option>
                  <option value="partner_api">API de Parceiros / B2B (Média Frequência)</option>
                  <option value="internal_network">Rede Interna / Intranet (Baixa Frequência)</option>
                </select>
              </div>

              {/* Data Sensitivity */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Classificação dos Dados em Risco:</label>
                <select
                  value={config.dataSensitivity}
                  onChange={(e) => setConfig({ ...config, dataSensitivity: e.target.value as FairDataSensitivity })}
                  className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
                >
                  <option value="financial">Financeiro / Cartões (PCI-DSS) - Alto Custo</option>
                  <option value="health_phi">Saúde / PHI (HIPAA) - Custo Extremo</option>
                  <option value="pii">Dados Pessoais (LGPD / GDPR) - Médio/Alto</option>
                  <option value="intellectual_property">Propriedade Intelectual / Código-Fonte</option>
                  <option value="low_sensitivity">Baixa Sensibilidade / Logs Públicos</option>
                </select>
              </div>

              {/* Records at Risk */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Registros Expostos:</span>
                  <span className="text-amber-400 font-bold">{config.recordCount.toLocaleString()}</span>
                </div>
                <select
                  value={config.recordCount}
                  onChange={(e) => setConfig({ ...config, recordCount: Number(e.target.value) })}
                  className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
                >
                  <option value={500}>500 registros (Incidente Contido)</option>
                  <option value={5000}>5.000 registros (Vazamento Médio)</option>
                  <option value={25000}>25.000 registros (Base Corporativa)</option>
                  <option value={100000}>100.000 registros (Vazamento Amplo)</option>
                  <option value={500000}>500.000 registros (Vazamento Massivo)</option>
                </select>
              </div>

              {/* Controls Strength */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Eficácia das Defesas Existentes:</label>
                <select
                  value={config.controlsStrength}
                  onChange={(e) => setConfig({ ...config, controlsStrength: e.target.value as FairControlsStrength })}
                  className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
                >
                  <option value="none">Sem Controles Específicos (Exploit Direto)</option>
                  <option value="basic">Defesas Básicas (Firewall & WAF Padrão)</option>
                  <option value="advanced_zerotrust">Defesas Avançadas (Zero Trust + SIEM + EDR)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Equation Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/20 via-[#10131a] to-blue-950/20 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" />
                <span>Equação FAIR em Tempo Real:</span>
              </span>
              <code className="text-zinc-200 bg-black/60 px-2.5 py-1 rounded border border-zinc-700/80 font-bold">
                ALE ({formatMoney(fairResult.ale)}/ano) = ARO ({fairResult.aro}x/ano) × SLE ({formatMoney(fairResult.sle)})
              </code>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
              <span>TEF: <strong className="text-amber-300">{fairResult.tef} tentativas/ano</strong></span>
              <span className="text-zinc-600">•</span>
              <span>P(Exploit|CVSS): <strong className="text-indigo-300">{(fairResult.vulnProbability * 100).toFixed(0)}%</strong></span>
              <span className="text-zinc-600">•</span>
              <span>ARO: <strong className="text-emerald-300">{fairResult.aro} eventos/ano</strong></span>
            </div>
          </div>

          {/* Section C: Sistema de Alertas de Limite de Risco FAIR (ALE) com Limiares por Severidade & Ações Automáticas Diferenciadas */}
          <div 
            id="fair-ale-alert-config-card"
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              fairResult.ale > effectiveThresholdUSD
                ? 'bg-gradient-to-r from-red-950/40 via-[#180a0e] to-[#12080a] border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                : 'bg-[#0e111a] border-zinc-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  fairResult.ale > effectiveThresholdUSD
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                }`}>
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      Sistema de Alertas FAIR: Tolerância ALE & Ações Automáticas
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      fairResult.ale > effectiveThresholdUSD
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {fairResult.ale > effectiveThresholdUSD
                        ? `VIOLAÇÃO (${severityConfig.enabled ? currentSeverityTier : 'GLOBAL'})`
                        : `DENTRO DO LIMITE (${severityConfig.enabled ? currentSeverityTier : 'GLOBAL'})`}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      alertPreferences.channel === 'both'
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        : alertPreferences.channel === 'toast'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    }`}>
                      Canal: {alertPreferences.channel === 'both' ? 'Toast + Log Interno' : alertPreferences.channel === 'toast' ? 'Toast' : 'Log Interno'}
                    </span>
                    {severityConfig.enabled && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Multi-Tier Ativo (4 Faixas)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Monitora a Perda Anual Esperada (ALE) com limiares específicos por severidade (Baixo, Médio, Alto, Crítico) e dispara ações de remediação automatizadas.
                  </p>
                </div>
              </div>

              {/* Toggles & Panel Launchers */}
              <div className="flex items-center gap-2.5 text-xs font-mono shrink-0 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={alertPreferences.alertsEnabled}
                    onChange={(e) => updateAlertPreferences({ ...alertPreferences, alertsEnabled: e.target.checked })}
                    className="accent-red-500 rounded cursor-pointer"
                  />
                  <span>Alertas Ativos</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 select-none text-[11px]">
                  <input
                    type="checkbox"
                    checked={alertPreferences.autoDispatchOnBreach}
                    onChange={(e) => updateAlertPreferences({ ...alertPreferences, autoDispatchOnBreach: e.target.checked })}
                    className="accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Auto Disparo</span>
                </label>

                {/* Switch between Multi-Tier and Single Global */}
                <button
                  type="button"
                  id="btn-toggle-multi-tier"
                  onClick={() => updateSeverityConfig({ ...severityConfig, enabled: !severityConfig.enabled })}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border flex items-center gap-1 cursor-pointer ${
                    severityConfig.enabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                  }`}
                  title="Alternar entre Limiares por Severidade Multi-Tier e Limiar Global"
                >
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>{severityConfig.enabled ? 'Multi-Tier Ativo' : 'Limiar Global Único'}</span>
                </button>

                <button
                  type="button"
                  id="btn-open-severity-matrix"
                  onClick={() => {
                    setIsTolerancePanelOpen(true);
                    setTolerancePanelTab('severity_tiers');
                  }}
                  className="px-2.5 py-1 rounded bg-[#181a24] hover:bg-[#202432] text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Abrir painel completo de configuração de limiares por severidade"
                >
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>Configurar Matriz</span>
                </button>
              </div>
            </div>

            {/* Threshold controls & Multi-Tier Matrix Preview */}
            <div className="pt-3.5 space-y-3 font-mono">
              {severityConfig.enabled ? (
                /* Multi-Tier 4-Band Grid (Low, Medium, High, Critical) */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Limiares e Ações Automáticas por Faixa de Severidade:</span>
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Achado analisado: <strong className="text-white">[{selectedReport.id}] {currentSeverityTier}</strong> (Teto: <strong className="text-amber-300">{formatMoney(effectiveThresholdUSD)}</strong>)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as FairSeverityTier[]).map((tier) => {
                      const rule = severityConfig.tiers[tier];
                      const isCurrentTier = currentSeverityTier === tier;
                      const tierStyles = {
                        LOW: {
                          border: isCurrentTier ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-emerald-500/30',
                          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                          text: 'text-emerald-400',
                          bg: 'bg-emerald-950/20'
                        },
                        MEDIUM: {
                          border: isCurrentTier ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-yellow-500/30',
                          badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                          text: 'text-yellow-400',
                          bg: 'bg-yellow-950/20'
                        },
                        HIGH: {
                          border: isCurrentTier ? 'border-orange-500 ring-1 ring-orange-500/50' : 'border-orange-500/30',
                          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                          text: 'text-orange-400',
                          bg: 'bg-orange-950/20'
                        },
                        CRITICAL: {
                          border: isCurrentTier ? 'border-red-500 ring-1 ring-red-500/50' : 'border-red-500/30',
                          badge: 'bg-red-500/20 text-red-300 border-red-500/40',
                          text: 'text-red-400',
                          bg: 'bg-red-950/20'
                        }
                      }[tier];

                      return (
                        <div
                          key={tier}
                          className={`p-3 rounded-lg border bg-[#12141e] transition-all flex flex-col justify-between ${tierStyles.border} ${
                            isCurrentTier ? 'shadow-md shadow-amber-500/10' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tierStyles.badge}`}>
                                {tier}
                              </span>
                              {isCurrentTier && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                  Achado Atual
                                </span>
                              )}
                            </div>

                            {/* Threshold input for this tier */}
                            <div className="my-2">
                              <label htmlFor={`quick-tier-input-${tier}`} className="text-[10px] text-zinc-400 block mb-0.5">
                                Limiar ALE:
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">$</span>
                                <input
                                  id={`quick-tier-input-${tier}`}
                                  type="number"
                                  min={1000}
                                  step={5000}
                                  value={rule.thresholdUSD}
                                  onChange={(e) => {
                                    const val = Math.max(1000, Number(e.target.value) || 0);
                                    updateSeverityConfig({
                                      ...severityConfig,
                                      tiers: {
                                        ...severityConfig.tiers,
                                        [tier]: { ...severityConfig.tiers[tier], thresholdUSD: val }
                                      }
                                    });
                                  }}
                                  className="w-full bg-[#171926] border border-[#2b2e40] rounded pl-5 pr-2 py-1 text-white text-[11px] font-mono focus:border-amber-500 focus:outline-none"
                                />
                              </div>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                {formatMoney(rule.thresholdUSD)} / ano
                              </span>
                            </div>

                            {/* Automated Action Badge */}
                            <div className="p-2 rounded bg-[#161824] border border-zinc-800/80 space-y-1 text-[10px]">
                              <span className="text-amber-400 font-bold block flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                <span>Ação Automática:</span>
                              </span>
                              <span className="text-zinc-200 font-semibold block truncate" title={rule.actionTitle}>
                                {rule.actionTitle}
                              </span>
                              <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                                <span>SLA: <strong className="text-white">{rule.slaTargetHours}h</strong></span>
                                <span className="text-[9px] text-zinc-400 font-mono">[{rule.tagToApply}]</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick test button */}
                          <div className="pt-2 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
                            <span className="text-[9px] text-zinc-500">
                              Canal: {rule.channel === 'both' ? 'Toast+Log' : rule.channel === 'toast' ? 'Toast' : 'Log'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const simReport: VulnerabilityReport = {
                                  ...selectedReport,
                                  severity: tier as Severity
                                };
                                const testAle = Math.max(fairResult.ale, rule.thresholdUSD * 1.35);
                                dispatchFairRiskAlert({
                                  report: simReport,
                                  aleUSD: testAle,
                                  aro: fairResult.aro,
                                  sleUSD: fairResult.sle,
                                  cvss: tier === 'CRITICAL' ? 9.8 : tier === 'HIGH' ? 8.2 : tier === 'MEDIUM' ? 5.5 : 2.5,
                                  currency,
                                  currencyMultiplier,
                                  preferences: { ...alertPreferences, alertsEnabled: true, useSeverityThresholds: true },
                                  severityConfig,
                                  onOpenReport: onSelectReport,
                                  forceManual: true
                                });
                                setInternalLogs(getFairRiskInternalLogs());
                              }}
                              className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 flex items-center gap-1 cursor-pointer transition-all"
                              title={`Testar ação automatizada para ${tier}`}
                            >
                              <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span>Testar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Global Single Threshold Control */
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-mono">
                  {/* Threshold input */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="fair-ale-threshold-input" className="text-zinc-300 font-semibold">
                      Limite Global de Tolerância ao Risco (ALE):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        id="fair-ale-threshold-input"
                        type="number"
                        min={1000}
                        step={5000}
                        value={alertPreferences.thresholdUSD}
                        onChange={(e) => updateAlertPreferences({
                          ...alertPreferences,
                          thresholdUSD: Math.max(1000, Number(e.target.value) || 0)
                        })}
                        className="bg-[#161a26] border border-zinc-700 rounded pl-6 pr-3 py-1 text-white font-mono text-xs w-36 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-zinc-400 text-[11px]">/ ano ({formatMoney(alertPreferences.thresholdUSD)})</span>
                  </div>

                  {/* Notification Channel Quick Selector */}
                  <div className="flex items-center gap-2 bg-[#12141c] p-1 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 px-1 font-semibold uppercase">Canal:</span>
                    {[
                      { id: 'toast' as const, label: 'Toast', desc: 'Pop-up flutuante' },
                      { id: 'internal_log' as const, label: 'Log Interno', desc: 'Auditoria interna silenciosa' },
                      { id: 'both' as const, label: 'Ambos (Toast + Log)', desc: 'Alerta na tela e no log' }
                    ].map((chan) => (
                      <button
                        key={chan.id}
                        type="button"
                        onClick={() => updateAlertPreferences({ ...alertPreferences, channel: chan.id })}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                          alertPreferences.channel === chan.id
                            ? 'bg-amber-500 text-black font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title={chan.desc}
                      >
                        {chan.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500">Presets:</span>
                    {[
                      { label: '$50k', val: 50000 },
                      { label: '$150k', val: 150000 },
                      { label: '$250k (Padrão)', val: 250000 },
                      { label: '$500k', val: 500000 },
                      { label: '$1M', val: 1000000 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => updateAlertPreferences({ ...alertPreferences, thresholdUSD: p.val })}
                        className={`text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer font-mono ${
                          alertPreferences.thresholdUSD === p.val
                            ? 'bg-red-500 text-white font-bold shadow'
                            : 'bg-[#181d2c] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Comparison & Differentiated Remediation Suggestion Box */}
              <div className={`p-3.5 rounded-lg border text-xs font-mono transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                fairResult.ale > effectiveThresholdUSD
                  ? 'bg-red-950/50 border-red-500/40 text-red-200'
                  : 'bg-[#121622] border-zinc-800 text-zinc-300'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">
                      {fairResult.ale > effectiveThresholdUSD
                        ? `🚨 Limite ${severityConfig.enabled ? `da Faixa ${currentSeverityTier}` : 'Global'} Excedido em +${Math.round(((fairResult.ale - effectiveThresholdUSD) / effectiveThresholdUSD) * 100)}%`
                        : `✅ Risco Sob Controle na Faixa ${currentSeverityTier}`}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ALE Calculado: <strong className={fairResult.ale > effectiveThresholdUSD ? 'text-red-400' : 'text-emerald-400'}>{formatMoney(fairResult.ale)}</strong> vs Limite {currentSeverityTier}: <strong>{formatMoney(effectiveThresholdUSD)}</strong>
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    {fairResult.ale > effectiveThresholdUSD ? (
                      <span>
                        <strong className="text-amber-300">Ação Automática Diferenciada [{currentSeverityTier}]:</strong> {currentSeverityRule?.actionTitle || 'Priorização Imediata'} — {currentSeverityRule?.actionDescription}
                        <span className="block text-[10px] text-zinc-400 mt-1">
                          Responsável Designado: <strong className="text-zinc-200">{currentSeverityRule?.escalationRole}</strong> • SLA Alvo: <strong className="text-zinc-200">{currentSeverityRule?.slaTargetHours}h</strong> • Tag: <code className="text-amber-300">[{currentSeverityRule?.tagToApply}]</code>
                        </span>
                      </span>
                    ) : (
                      <span>
                        O risco anualizado desta vulnerabilidade ({formatMoney(fairResult.ale)}) está dentro da tolerância para a faixa {currentSeverityTier} ({formatMoney(effectiveThresholdUSD)}). Ação operacional recomendada: <strong className="text-zinc-200">{currentSeverityRule?.actionTitle}</strong> (SLA de {currentSeverityRule?.slaTargetHours}h).
                      </span>
                    )}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => triggerAleAlert(true, 'toast')}
                    className="px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
                    title="Disparar alerta toast de teste"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Testar Toast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerAleAlert(true, 'internal_log')}
                    className="px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
                    title="Gravar evento de teste no log interno"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Gravar Log</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerAleAlert(true)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                      fairResult.ale > effectiveThresholdUSD
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                        : 'bg-amber-600 hover:bg-amber-500 text-black'
                    }`}
                    title="Disparar alerta configurado com a ação automática da faixa"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{fairResult.ale > effectiveThresholdUSD ? `Disparar Ação [${currentSeverityTier}]` : `Testar Ação [${currentSeverityTier}]`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTolerancePanelOpen(true);
                      setTolerancePanelTab('logs');
                    }}
                    className="px-2 py-1.5 rounded-lg font-mono text-xs text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/40 flex items-center gap-1 cursor-pointer"
                    title="Ver histórico do Log Interno de Riscos"
                  >
                    <FileText className="w-3 h-3 text-blue-400" />
                    <span>Logs ({internalLogs.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. Primary 4-KPI Row: ALE, SLE, ARO, ROI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Annual Loss Expectancy (ALE) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#242430] relative overflow-hidden flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>ALE (Perda Anual Esperada)</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
              ARO × SLE
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-white font-mono tracking-tight">
              {formatMoney(fairResult.ale)}
            </h3>
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 mt-1">
              <span>Faixa (10%-90%):</span>
              <span className="text-zinc-300 font-semibold">
                {formatMoney(fairResult.aleMin)} - {formatMoney(fairResult.aleMax)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>CVSS {(config.customCvss ?? selectedReport.cvssScore).toFixed(1)} • {fairResult.tef} tentativas/ano</span>
            <span className="text-emerald-400 font-semibold">{formatMoney(fairResult.residualAle)} residual</span>
          </div>
        </div>

        {/* KPI 2: Single Loss Expectancy (SLE) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#242430] flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>SLE (Custo por Incidente)</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25 font-semibold">
              Loss Magnitude
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-white font-mono tracking-tight">
              {formatMoney(fairResult.sle)}
            </h3>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
              <span>Primário: <strong className="text-blue-400">{formatMoney(fairResult.primaryLoss.totalPrimary)}</strong></span>
              <span>Secundário: <strong className="text-pink-400">{formatMoney(fairResult.secondaryLoss.totalSecondary)}</strong></span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Impacto em Negócio:</span>
            <span className="text-zinc-200 truncate max-w-[130px]" title={selectedReport.businessImpact || 'Severo'}>
              {selectedReport.severity}
            </span>
          </div>
        </div>

        {/* KPI 3: Annualized Rate of Occurrence (ARO) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#242430] flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>ARO (Frequência Anual)</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 font-semibold">
              TEF × P(V)
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-white font-mono tracking-tight">
              {fairResult.aro}x <span className="text-sm font-normal text-zinc-400">/ ano</span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-1">
              {fairResult.aro >= 1
                ? `Estimativa de ~${Math.round(fairResult.aro)} violação(ões) por ano sem patch`
                : `1 incidente provável a cada ${(1 / fairResult.aro).toFixed(1)} anos`}
            </p>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Tentativas (TEF):</span>
            <span className="text-zinc-200 font-semibold">{fairResult.tef} scans/ano</span>
          </div>
        </div>

        {/* KPI 4: Bug Bounty Financial ROI */}
        <div className="p-4 rounded-xl bg-[#111116] border border-emerald-500/30 flex flex-col justify-between shadow-md bg-gradient-to-b from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-semibold">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bug Bounty ROI</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              Cost Avoidance
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-emerald-400 font-mono tracking-tight flex items-baseline gap-1">
              <span>{fairResult.savingsMultiple}x</span>
              <span className="text-xs font-normal text-zinc-400 font-sans">retorno</span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-300 mt-1">
              Economia anual de <strong className="text-emerald-400">{formatMoney(fairResult.costAvoidedAnnual)}</strong>
            </p>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Bounty Pago:</span>
            <span className="text-white font-bold">{formatMoney(fairResult.bountyPaid)}</span>
          </div>
        </div>
      </div>

      {/* 5. Visual Charts Grid: ALE Comparison & Loss Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Chart: FAIR ALE Confidence & Scenario Comparison (7 Cols) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-[#111116] border border-[#22222a] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e1e26]">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
                <BarChart className="w-4 h-4 text-amber-400" />
                <span>Distribuição de Perda Anual (ALE) vs Custos</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Cenários estatísticos de perda anual segundo a distribuição Log-Normal FAIR.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              Valores em {currency}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aleComparisonData}
                margin={{ top: 15, right: 15, left: 0, bottom: 25 }}
              >
                <XAxis
                  dataKey="scenario"
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return `${val}`;
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18181f] border border-amber-500/40 rounded-lg p-2.5 text-xs shadow-xl font-mono max-w-xs z-50">
                          <p className="text-white font-bold">{data.scenario}</p>
                          <p className="text-amber-400 font-bold text-sm my-1">
                            {formatCurrency(data.amount, currency)}
                          </p>
                          <p className="text-zinc-400 text-[10px] font-sans">
                            {data.description}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {aleComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Decomposição das Perdas (Loss Magnitude SLE Breakdown) (5 Cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#111116] border border-[#22222a] space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e1e26]">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Decomposição do Custo por Incidente (SLE)</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Categorias de perda primária e secundária.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold">
              Total: {formatMoney(fairResult.sle)}
            </span>
          </div>

          {/* Structured Stacked Bars */}
          <div className="space-y-2.5 my-auto">
            {fairResult.lossComponents.map((comp, idx) => {
              const color = categoryColors[idx % categoryColors.length];
              return (
                <div key={comp.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 truncate max-w-[190px]" title={comp.name}>
                      {comp.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-[11px]">({comp.percent}%)</span>
                      <span className="font-bold text-white whitespace-nowrap">
                        {formatMoney(comp.amountUSD)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, comp.percent))}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>Primário: {formatMoney(fairResult.primaryLoss.totalPrimary)}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
              <span>Secundário: {formatMoney(fairResult.secondaryLoss.totalSecondary)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 6. Executive Narrative & Impact Statement */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#121218] via-[#101016] to-[#121218] border border-[#2a2a38] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Parecer Executivo para C-Level & Auditoria FAIR
            </h4>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            {fairResult.executiveSummary}
          </p>
        </div>

        {onSelectReport && (
          <button
            type="button"
            onClick={() => onSelectReport(selectedReport)}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-mono font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <span>Ver Relatório Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Embedded Tolerance Thresholds Configuration Modal */}
      <FairRiskToleranceConfigModal
        isOpen={isToleranceModalOpen}
        onClose={() => setIsToleranceModalOpen(false)}
        reports={reports}
      />
    </section>
  );
};
