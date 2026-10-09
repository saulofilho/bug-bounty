import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Bell,
  BellRing,
  FileText,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Download,
  Flame,
  Check,
  Radio,
  Eye,
  Layers,
  Clock,
  Tag,
  UserCheck,
  Play,
  ArrowRight,
  Shield,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import {
  FairNotificationChannel,
  FairSeverityTier,
  FairAutomatedActionType,
  FairSeverityThresholdRule,
  FairSeverityThresholdsConfig,
  DEFAULT_FAIR_SEVERITY_TIERS,
  DEFAULT_FAIR_SEVERITY_THRESHOLDS_CONFIG,
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
  saveFairRiskInternalLogs,
  clearFairRiskInternalLogs,
  acknowledgeFairRiskLog,
  deleteFairRiskInternalLog,
  dispatchFairRiskAlert,
  FAIR_INTERNAL_LOGS_EVENT
} from '../utils/fairRiskNotificationEngine';
import toast from 'react-hot-toast';

export interface FairRiskToleranceConfigPanelProps {
  currentReport?: VulnerabilityReport | null;
  currentAleUSD?: number;
  currentAro?: number;
  currentSleUSD?: number;
  currency?: 'USD' | 'BRL';
  currencyMultiplier?: number;
  onSelectReport?: (report: VulnerabilityReport) => void;
  onPreferencesChange?: (prefs: FairRiskAlertPreferences) => void;
  onSeverityConfigChange?: (config: FairSeverityThresholdsConfig) => void;
  className?: string;
  defaultTab?: 'tolerance' | 'severity_tiers' | 'notifications' | 'logs';
}

const PRESET_AMOUNTS = [
  { label: '$50k', val: 50000, desc: 'Startups & Baixo Apetite' },
  { label: '$100k', val: 100000, desc: 'Pequenas/Médias Empresas' },
  { label: '$250k', val: 250000, desc: 'Padrão Corporativo' },
  { label: '$500k', val: 500000, desc: 'Enterprise / Grande Porte' },
  { label: '$1M', val: 1000000, desc: 'Conglomerados / Big Tech' }
];

export const FairRiskToleranceConfigPanel: React.FC<FairRiskToleranceConfigPanelProps> = ({
  currentReport,
  currentAleUSD = 0,
  currentAro = 1,
  currentSleUSD = 0,
  currency = 'USD',
  currencyMultiplier = 1,
  onSelectReport,
  onPreferencesChange,
  onSeverityConfigChange,
  className = '',
  defaultTab = 'tolerance'
}) => {
  const safeCurrency: 'USD' | 'BRL' = currency === 'BRL' ? 'BRL' : 'USD';
  const [activeSubTab, setActiveSubTab] = useState<'tolerance' | 'severity_tiers' | 'notifications' | 'logs'>(defaultTab);
  const [preferences, setPreferences] = useState<FairRiskAlertPreferences>(getFairRiskAlertPreferences);
  const [severityConfig, setSeverityConfig] = useState<FairSeverityThresholdsConfig>(getFairSeverityThresholdsConfig);
  const [internalLogs, setInternalLogs] = useState<FairRiskInternalLog[]>(getFairRiskInternalLogs);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // Sync internal logs and severity config on events
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

  const formatMoney = (valUSD: number) => {
    return formatCurrency(valUSD * currencyMultiplier, safeCurrency);
  };

  const handleSave = () => {
    saveFairRiskAlertPreferences(preferences);
    saveFairSeverityThresholdsConfig(severityConfig);
    if (onPreferencesChange) {
      onPreferencesChange(preferences);
    }
    if (onSeverityConfigChange) {
      onSeverityConfigChange(severityConfig);
    }
    setIsSavedRecently(true);
    toast.success('Configurações de Tolerância FAIR, Limiares por Severidade e Notificações salvas com sucesso!', {
      style: {
        background: '#12121c',
        color: '#f4f4f5',
        border: '1px solid #10b981',
        fontSize: '12px',
        fontFamily: 'monospace'
      }
    });
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  const handleUpdateTierRule = (
    tier: FairSeverityTier,
    partial: Partial<FairSeverityThresholdRule>
  ) => {
    setSeverityConfig(prev => ({
      ...prev,
      tiers: {
        ...prev.tiers,
        [tier]: {
          ...prev.tiers[tier],
          ...partial
        }
      }
    }));
  };

  const handleApplySeverityPreset = (presetName: 'conservative' | 'balanced' | 'high_tolerance') => {
    if (presetName === 'conservative') {
      setSeverityConfig(prev => ({
        ...prev,
        tiers: {
          LOW: { ...prev.tiers.LOW, thresholdUSD: 15000 },
          MEDIUM: { ...prev.tiers.MEDIUM, thresholdUSD: 45000 },
          HIGH: { ...prev.tiers.HIGH, thresholdUSD: 120000 },
          CRITICAL: { ...prev.tiers.CRITICAL, thresholdUSD: 300000 }
        }
      }));
      toast.success('Preset Conservador aplicado em todas as 4 faixas de severidade!');
    } else if (presetName === 'balanced') {
      setSeverityConfig(prev => ({
        ...prev,
        tiers: {
          LOW: { ...prev.tiers.LOW, thresholdUSD: 30000 },
          MEDIUM: { ...prev.tiers.MEDIUM, thresholdUSD: 80000 },
          HIGH: { ...prev.tiers.HIGH, thresholdUSD: 200000 },
          CRITICAL: { ...prev.tiers.CRITICAL, thresholdUSD: 450000 }
        }
      }));
      toast.success('Preset Equilibrado aplicado em todas as 4 faixas de severidade!');
    } else if (presetName === 'high_tolerance') {
      setSeverityConfig(prev => ({
        ...prev,
        tiers: {
          LOW: { ...prev.tiers.LOW, thresholdUSD: 60000 },
          MEDIUM: { ...prev.tiers.MEDIUM, thresholdUSD: 150000 },
          HIGH: { ...prev.tiers.HIGH, thresholdUSD: 400000 },
          CRITICAL: { ...prev.tiers.CRITICAL, thresholdUSD: 1000000 }
        }
      }));
      toast.success('Preset Alta Tolerância aplicado em todas as 4 faixas de severidade!');
    }
  };

  const handleTestSeverityAction = (tier: FairSeverityTier) => {
    if (!currentReport) {
      toast.error('Nenhum relatório selecionado para teste.');
      return;
    }
    const rule = severityConfig.tiers[tier];
    const simulatedReport: VulnerabilityReport = {
      ...currentReport,
      severity: tier as Severity
    };
    const testAle = Math.max(currentAleUSD, rule.thresholdUSD * 1.35);

    const { dispatchedToast, dispatchedLog } = dispatchFairRiskAlert({
      report: simulatedReport,
      aleUSD: testAle,
      aro: currentAro,
      sleUSD: currentSleUSD,
      cvss: tier === 'CRITICAL' ? 9.8 : tier === 'HIGH' ? 8.2 : tier === 'MEDIUM' ? 5.5 : 2.5,
      currency: safeCurrency,
      currencyMultiplier,
      preferences: { ...preferences, alertsEnabled: true, useSeverityThresholds: true },
      severityConfig,
      onOpenReport: onSelectReport,
      forceManual: true
    });

    if (dispatchedLog) {
      setInternalLogs(getFairRiskInternalLogs());
    }

    toast.success(`Ação automática para [${tier}] disparada! (${rule.actionTitle})`, {
      icon: '⚡',
      style: {
        background: '#12121c',
        color: '#f4f4f5',
        border: '1px solid #f59e0b',
        fontSize: '12px',
        fontFamily: 'monospace'
      }
    });
  };

  const handleTestAlert = (channelToTest: FairNotificationChannel) => {
    if (!currentReport) {
      toast.error('Nenhum relatório selecionado para teste.');
      return;
    }

    const testAle = Math.max(currentAleUSD, preferences.thresholdUSD * 1.35); // simulate breach
    const tempPrefs = { ...preferences, channel: channelToTest, alertsEnabled: true };

    const { dispatchedToast, dispatchedLog } = dispatchFairRiskAlert({
      report: currentReport,
      aleUSD: testAle,
      aro: currentAro,
      sleUSD: currentSleUSD,
      cvss: currentReport.cvssScore,
      currency: safeCurrency,
      currencyMultiplier,
      preferences: tempPrefs,
      onOpenReport: onSelectReport,
      forceManual: true
    });

    if (dispatchedLog) {
      setInternalLogs(getFairRiskInternalLogs());
    }

    if (channelToTest === 'internal_log') {
      toast.success('Alerta registrado com sucesso no Log Interno de Riscos!', {
        icon: '📋',
        style: {
          background: '#12121c',
          color: '#f4f4f5',
          border: '1px solid #3b82f6',
          fontSize: '12px',
          fontFamily: 'monospace'
        }
      });
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico do Log Interno de Riscos?')) {
      clearFairRiskInternalLogs();
      setInternalLogs([]);
      toast.success('Histórico de logs internos limpo.');
    }
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(internalLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fair_risk_internal_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const unreadLogsCount = internalLogs.filter(l => l.status === 'UNREAD').length;
  const isCurrentReportBreached = currentAleUSD > preferences.thresholdUSD;
  const toleranceConsumption = preferences.thresholdUSD > 0
    ? Math.min(200, Math.round((currentAleUSD / preferences.thresholdUSD) * 100))
    : 0;

  return (
    <div
      id="fair-risk-tolerance-config-panel"
      className={`bg-[#0d0d12] border border-[#23232e] rounded-xl overflow-hidden font-mono text-xs shadow-xl transition-all ${className}`}
    >
      {/* Panel Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e1e28] bg-[#121218] p-3 gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <span>Painel de Configuração FAIR: Tolerância & Notificações</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/25">
                ISO/IEC 27005
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Defina limites de perda aceitável (ALE) e personalize o canal de alerta (Toast ou Log Interno).
            </p>
          </div>
        </div>

        {/* SubTab Switchers */}
        <div className="flex items-center gap-1 bg-[#181822] p-1 rounded-lg border border-[#292936] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('tolerance')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'tolerance'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Limites de Tolerância (ALE)</span>
          </button>

          <button
            type="button"
            id="tab-fair-severity-tiers"
            onClick={() => setActiveSubTab('severity_tiers')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'severity_tiers'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Limiares por Severidade</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
              4 Faixas
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'notifications'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Preferências de Notificação</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              preferences.channel === 'both'
                ? 'bg-indigo-500/20 text-indigo-300'
                : preferences.channel === 'toast'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {preferences.channel === 'both' ? 'Toast+Log' : preferences.channel === 'toast' ? 'Toast' : 'Log'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeSubTab === 'logs'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Log Interno de Riscos</span>
            {unreadLogsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
              {internalLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Limites de Tolerância ao Risco (ALE) */}
      {activeSubTab === 'tolerance' && (
        <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-150">
          {/* Real-time Status Gauge Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            isCurrentReportBreached
              ? 'bg-gradient-to-r from-red-950/40 via-[#180a0e] to-[#12080a] border-red-500/50 shadow-md'
              : 'bg-[#12141c] border-zinc-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  isCurrentReportBreached ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
                }`} />
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  Termômetro de Tolerância ao Risco para o Relatório Selecionado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Status Atual:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                  isCurrentReportBreached
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isCurrentReportBreached
                    ? `VIOLAÇÃO: +${Math.round(((currentAleUSD - preferences.thresholdUSD) / preferences.thresholdUSD) * 100)}% ACIMA DO LIMITE`
                    : 'DENTRO DO APETITE DE RISCO'}
                </span>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <span className="text-[11px] text-zinc-400 block">ALE Calculado (Exposição Anual):</span>
                <span className={`text-lg font-bold ${isCurrentReportBreached ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatMoney(currentAleUSD)} / ano
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Limite de Tolerância Configurado:</span>
                <span className="text-lg font-bold text-white">
                  {formatMoney(preferences.thresholdUSD)} / ano
                </span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Consumo de Limite:</span>
                  <span className={`font-bold ${isCurrentReportBreached ? 'text-red-400' : 'text-zinc-200'}`}>
                    {toleranceConsumption}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      toleranceConsumption > 100
                        ? 'bg-gradient-to-r from-red-500 to-rose-600'
                        : toleranceConsumption > 75
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, toleranceConsumption)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Primary Threshold Input */}
            <div className="p-4 rounded-xl bg-[#121218] border border-[#22222e] space-y-3">
              <label htmlFor="fair-panel-ale-threshold" className="text-zinc-200 font-bold block flex items-center justify-between">
                <span>Limite Máximo de Risco Tolerável (ALE):</span>
                <span className="text-amber-400 font-bold text-sm">
                  {formatMoney(preferences.thresholdUSD)}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                <input
                  id="fair-panel-ale-threshold"
                  type="number"
                  min={1000}
                  step={5000}
                  value={preferences.thresholdUSD}
                  onChange={(e) => {
                    const val = Math.max(1000, Number(e.target.value) || 0);
                    setPreferences({ ...preferences, thresholdUSD: val, corporatePreset: 'custom' });
                  }}
                  className="w-full bg-[#181822] border border-[#2d2d3c] rounded-lg pl-7 pr-3 py-2 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Qualquer relatório com ALE superior a este valor disparará notificações e sugestões executivas de priorização de patch.
              </p>

              {/* Quick Preset Buttons */}
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 block mb-1.5 uppercase font-semibold">
                  Presets Rápidos de Apetite de Risco:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {PRESET_AMOUNTS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setPreferences({ ...preferences, thresholdUSD: p.val, corporatePreset: 'custom' });
                      }}
                      className={`py-1 px-1 rounded text-center transition-all cursor-pointer font-mono text-[11px] border ${
                        preferences.thresholdUSD === p.val
                          ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-sm'
                          : 'bg-[#181822] text-zinc-400 hover:text-white border-zinc-800'
                      }`}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Corporate Profile Presets */}
            <div className="p-4 rounded-xl bg-[#121218] border border-[#22222e] space-y-3 flex flex-col justify-between">
              <div>
                <label className="text-zinc-200 font-bold block mb-1">
                  Arquétipos Corporativos de Apetite ao Risco (FAIR):
                </label>
                <p className="text-[11px] text-zinc-400 mb-3">
                  Ajuste automaticamente a régua de corte conforme o setor e regulação da sua empresa:
                </p>

                <div className="space-y-2">
                  {[
                    {
                      id: 'conservative' as const,
                      title: 'Conservador (Alta Rigidez)',
                      desc: 'FinTech, Saúde & Infraestrutura Crítica (Tolerância: US$ 100k)',
                      val: 100000
                    },
                    {
                      id: 'balanced' as const,
                      title: 'Equilibrado (Padrão Corporativo)',
                      desc: 'Enterprise, SaaS & E-commerce Global (Tolerância: US$ 250k)',
                      val: 250000
                    },
                    {
                      id: 'high_tolerance' as const,
                      title: 'Alta Tolerância (Grandes Grupos)',
                      desc: 'Big Tech, Startups em Hipercrescimento (Tolerância: US$ 1.000k)',
                      val: 1000000
                    }
                  ].map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setPreferences({
                        ...preferences,
                        thresholdUSD: preset.val,
                        corporatePreset: preset.id
                      })}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        preferences.thresholdUSD === preset.val
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                          : 'bg-[#161620] border-[#252532] text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fair_preset"
                        checked={preferences.thresholdUSD === preset.val}
                        onChange={() => {}}
                        className="mt-0.5 accent-amber-500"
                      />
                      <div>
                        <span className="font-bold block text-xs">{preset.title}</span>
                        <span className="text-[10px] text-zinc-400 block">{preset.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Limites de Tolerância</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Limiares por Severidade (ALE Multi-Tier) & Ações Automáticas Diferenciadas */}
      {activeSubTab === 'severity_tiers' && (
        <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-150">
          {/* Top Control Bar & Global Presets */}
          <div className="p-4 rounded-xl bg-[#121218] border border-[#232330] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Matriz de Limiares de Risco FAIR por Severidade (ALE Multi-Tier)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/25">
                      4 Níveis Diferenciados
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Defina limiares de Perda Anual Esperada (ALE) específicos para cada severidade de vulnerabilidade com ações de remediação e prazos de SLA automatizados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={severityConfig.enabled}
                    onChange={(e) => setSeverityConfig({ ...severityConfig, enabled: e.target.checked })}
                    className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                  />
                  <span className="font-bold text-xs">Ativar Limiares Multi-Tier</span>
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Matriz</span>
                </button>
              </div>
            </div>

            {/* Global Severity Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]">Aplicar Presets Globais Multi-Tier (1-clique em todas as faixas):</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplySeverityPreset('conservative')}
                  className="px-2.5 py-1 rounded bg-[#181822] hover:bg-[#20202e] text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-mono cursor-pointer transition-all"
                  title="Conservador: Baixo $15k, Médio $45k, Alto $120k, Crítico $300k"
                >
                  Conservador ($15k / $45k / $120k / $300k)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySeverityPreset('balanced')}
                  className="px-2.5 py-1 rounded bg-[#181822] hover:bg-[#20202e] text-amber-300 hover:text-white border border-amber-500/40 text-[11px] font-mono cursor-pointer transition-all font-semibold"
                  title="Equilibrado: Baixo $30k, Médio $80k, Alto $200k, Crítico $450k"
                >
                  Equilibrado ($30k / $80k / $200k / $450k)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySeverityPreset('high_tolerance')}
                  className="px-2.5 py-1 rounded bg-[#181822] hover:bg-[#20202e] text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-mono cursor-pointer transition-all"
                  title="Alta Tolerância: Baixo $60k, Médio $150k, Alto $400k, Crítico $1.000k"
                >
                  Alta Tolerância ($60k / $150k / $400k / $1M)
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Status Card for Current Report in Multi-Tier Context */}
          {currentReport && (() => {
            const currentTier = mapReportSeverityToTier(currentReport.severity);
            const currentRule = severityConfig.tiers[currentTier];
            const isBreached = currentAleUSD > currentRule.thresholdUSD;
            const excessPercent = Math.max(0, Math.round(((currentAleUSD - currentRule.thresholdUSD) / currentRule.thresholdUSD) * 100));
            const sevBadge = getSeverityBadgeColor(currentReport.severity);

            return (
              <div className={`p-4 rounded-xl border transition-all ${
                isBreached
                  ? 'bg-gradient-to-r from-red-950/35 via-[#160a0f] to-[#11070a] border-red-500/50 shadow-md'
                  : 'bg-[#10131d] border-zinc-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-zinc-400">Achado Selecionado:</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                      {currentReport.severity} (CVSS {currentReport.cvssScore.toFixed(1)})
                    </span>
                    <span className="font-bold text-white text-xs truncate max-w-sm">
                      [{currentReport.id}] {currentReport.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isBreached
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {isBreached
                        ? `VIOLAÇÃO NA FAIXA ${currentTier}: +${excessPercent}%`
                        : `DENTRO DO LIMIAR DA FAIXA ${currentTier}`}
                    </span>
                  </div>
                </div>

                <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">ALE Calculado vs Limiar {currentTier}:</span>
                    <span className={`text-base font-bold ${isBreached ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatMoney(currentAleUSD)}
                    </span>
                    <span className="text-zinc-400 text-[11px]"> (Teto {currentTier}: {formatMoney(currentRule.thresholdUSD)})</span>
                  </div>

                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151722] p-2.5 rounded-lg border border-zinc-800">
                    <div className="text-[11px] text-zinc-300">
                      <span className="text-amber-400 font-bold block flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Ação Automática para {currentTier}:</span>
                      </span>
                      <span className="text-white font-semibold">{currentRule.actionTitle}</span>
                      <span className="text-zinc-400 block text-[10px]">
                        Canal: <strong className="text-zinc-200">{currentRule.channel === 'both' ? 'Toast + Log' : currentRule.channel === 'toast' ? 'Toast' : 'Log Interno'}</strong> • SLA: <strong className="text-zinc-200">{currentRule.slaTargetHours}h</strong> • Resp: <strong className="text-zinc-200">{currentRule.escalationRole}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestSeverityAction(currentTier)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all flex items-center gap-1.5 text-xs shrink-0 cursor-pointer shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-black" />
                      <span>Testar Ação da Faixa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4 Severity Tier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as FairSeverityTier[]).map((tier) => {
              const rule = severityConfig.tiers[tier];
              const isSelectedReportTier = currentReport && mapReportSeverityToTier(currentReport.severity) === tier;

              const tierStyles = {
                LOW: {
                  border: 'border-emerald-500/40',
                  bgHeader: 'bg-emerald-950/25',
                  badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  accent: 'emerald',
                  accentText: 'text-emerald-400',
                  presets: [
                    { label: '$10k', val: 10000 },
                    { label: '$25k', val: 25000 },
                    { label: '$30k', val: 30000 },
                    { label: '$50k', val: 50000 }
                  ]
                },
                MEDIUM: {
                  border: 'border-yellow-500/40',
                  bgHeader: 'bg-yellow-950/25',
                  badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                  accent: 'yellow',
                  accentText: 'text-yellow-400',
                  presets: [
                    { label: '$50k', val: 50000 },
                    { label: '$80k', val: 80000 },
                    { label: '$100k', val: 100000 },
                    { label: '$150k', val: 150000 }
                  ]
                },
                HIGH: {
                  border: 'border-orange-500/40',
                  bgHeader: 'bg-orange-950/25',
                  badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                  accent: 'orange',
                  accentText: 'text-orange-400',
                  presets: [
                    { label: '$120k', val: 120000 },
                    { label: '$200k', val: 200000 },
                    { label: '$250k', val: 250000 },
                    { label: '$350k', val: 350000 }
                  ]
                },
                CRITICAL: {
                  border: 'border-red-500/50',
                  bgHeader: 'bg-red-950/30',
                  badge: 'bg-red-500/20 text-red-300 border-red-500/40',
                  accent: 'red',
                  accentText: 'text-red-400',
                  presets: [
                    { label: '$250k', val: 250000 },
                    { label: '$450k', val: 450000 },
                    { label: '$600k', val: 600000 },
                    { label: '$1M', val: 1000000 }
                  ]
                }
              }[tier];

              return (
                <div
                  key={tier}
                  className={`rounded-xl border bg-[#111116] transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
                    isSelectedReportTier ? `${tierStyles.border} shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50` : 'border-[#232330]'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`p-3.5 border-b border-[#222230] flex items-center justify-between ${tierStyles.bgHeader}`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border font-mono ${tierStyles.badge}`}>
                        {tier}
                      </span>
                      <span className="font-bold text-white text-xs">
                        {rule.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelectedReportTier && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                          Achado Atual
                        </span>
                      )}
                      <span className={`font-mono font-bold text-xs ${tierStyles.accentText}`}>
                        {formatMoney(rule.thresholdUSD)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-4 text-xs font-mono">
                    {/* Section 1: Limiar de Risco (ALE) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`fair-threshold-input-${tier}`} className="text-zinc-300 font-semibold flex items-center gap-1">
                          <span>Limiar de Risco Máximo (ALE):</span>
                        </label>
                        <span className="text-zinc-400 text-[11px]">
                          {formatMoney(rule.thresholdUSD)} / ano
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                        <input
                          id={`fair-threshold-input-${tier}`}
                          type="number"
                          min={1000}
                          step={5000}
                          value={rule.thresholdUSD}
                          onChange={(e) => handleUpdateTierRule(tier, {
                            thresholdUSD: Math.max(1000, Number(e.target.value) || 0)
                          })}
                          className="w-full bg-[#171722] border border-[#2d2d3c] rounded-lg pl-7 pr-3 py-1.5 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-[10px] text-zinc-500 mr-1">Presets:</span>
                        {tierStyles.presets.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => handleUpdateTierRule(tier, { thresholdUSD: p.val })}
                            className={`px-1.5 py-0.5 rounded text-[10px] transition-all cursor-pointer font-mono border ${
                              rule.thresholdUSD === p.val
                                ? 'bg-amber-500 text-black font-bold border-amber-400'
                                : 'bg-[#181822] text-zinc-400 hover:text-white border-zinc-800'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Canal de Notificação da Faixa */}
                    <div className="space-y-1.5 pt-2 border-t border-[#1e1e28]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300 font-semibold flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-amber-400" />
                          <span>Canal de Disparo desta Faixa:</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        {[
                          { id: 'toast' as const, label: 'Toast', desc: 'Pop-up em tela' },
                          { id: 'internal_log' as const, label: 'Log Interno', desc: 'Auditoria silenciosa' },
                          { id: 'both' as const, label: 'Ambos', desc: 'Toast + Log Interno' }
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleUpdateTierRule(tier, { channel: c.id })}
                            className={`py-1 px-1.5 rounded text-center text-[10px] transition-all cursor-pointer border ${
                              rule.channel === c.id
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                                : 'bg-[#161622] text-zinc-400 hover:text-white border-zinc-800'
                            }`}
                            title={c.desc}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Ação Automática Diferenciada */}
                    <div className="space-y-2.5 pt-2 border-t border-[#1e1e28]">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-200 select-none font-semibold">
                          <input
                            type="checkbox"
                            checked={rule.autoActionEnabled}
                            onChange={(e) => handleUpdateTierRule(tier, { autoActionEnabled: e.target.checked })}
                            className="accent-amber-500 rounded cursor-pointer"
                          />
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ação Automática Diferenciada</span>
                        </label>

                        <span className="text-[10px] text-zinc-400">
                          SLA Alvo: <strong className="text-white">{rule.slaTargetHours}h</strong>
                        </span>
                      </div>

                      {/* Tipo de Ação */}
                      <div className="space-y-1">
                        <label htmlFor={`fair-action-type-select-${tier}`} className="text-[10px] text-zinc-400 block">Tipo de Resposta Recomendada:</label>
                        <select
                          id={`fair-action-type-select-${tier}`}
                          value={rule.actionType}
                          onChange={(e) => {
                            const newType = e.target.value as FairAutomatedActionType;
                            let defaultTitle = rule.actionTitle;
                            let defaultDesc = rule.actionDescription;
                            let defaultSla = rule.slaTargetHours;
                            let defaultTag = rule.tagToApply;

                            if (newType === 'routine_backlog') {
                              defaultTitle = 'Esteira de Manutenção de Rotina';
                              defaultDesc = 'Registrar achado no backlog para ciclo regular de correções de manutenção.';
                              defaultSla = 720;
                              defaultTag = 'FAIR-BACKLOG-ROUTINE';
                            } else if (newType === 'standard_sla_30d') {
                              defaultTitle = 'Remediação em SLA Padrão (30 Dias)';
                              defaultDesc = 'Avaliar controles compensatórios (WAF/ACLs) e agendar patch na próxima sprint.';
                              defaultSla = 360;
                              defaultTag = 'FAIR-MED-PRIORITY';
                            } else if (newType === 'priority_sprint_7d') {
                              defaultTitle = 'Priorização Elevada na Sprint Atual (7 Dias)';
                              defaultDesc = 'Mitigação rápida em até 7 dias, bloqueio de rota exposta e revisão arquitetural.';
                              defaultSla = 72;
                              defaultTag = 'FAIR-HIGH-BREACH';
                            } else if (newType === 'emergency_war_room_24h') {
                              defaultTitle = 'War Room Emergencial & Escalação Imediata (< 24h)';
                              defaultDesc = 'Abertura imediata de War Room emergencial com alerta ao CISO/Board e deploy prioritário de hotfix.';
                              defaultSla = 24;
                              defaultTag = 'FAIR-CRIT-EMERGENCY';
                            }

                            handleUpdateTierRule(tier, {
                              actionType: newType,
                              actionTitle: defaultTitle,
                              actionDescription: defaultDesc,
                              slaTargetHours: defaultSla,
                              tagToApply: defaultTag
                            });
                          }}
                          className="w-full bg-[#181824] text-zinc-200 rounded px-2.5 py-1.5 border border-[#2d2d3c] focus:border-amber-500 focus:outline-none text-[11px]"
                        >
                          <option value="routine_backlog">Esteira de Manutenção de Rotina (Backlog)</option>
                          <option value="standard_sla_30d">Remediação em SLA Padrão (15-30 Dias)</option>
                          <option value="priority_sprint_7d">Priorização Elevada em Sprint Atual (3-7 Dias)</option>
                          <option value="emergency_war_room_24h">War Room Emergencial & Escalação Imediata (&lt; 24h)</option>
                          <option value="custom_action">Ação Customizada da Organização</option>
                        </select>
                      </div>

                      {/* Título & Responsável */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor={`fair-action-title-${tier}`} className="text-[10px] text-zinc-400 block">Título da Ação:</label>
                          <input
                            id={`fair-action-title-${tier}`}
                            type="text"
                            value={rule.actionTitle}
                            onChange={(e) => handleUpdateTierRule(tier, { actionTitle: e.target.value })}
                            className="w-full bg-[#181824] text-zinc-200 rounded px-2 py-1 border border-[#2d2d3c] focus:border-amber-500 focus:outline-none text-[10px]"
                          />
                        </div>
                        <div>
                          <label htmlFor={`fair-action-role-${tier}`} className="text-[10px] text-zinc-400 block">Responsável / Escalation Role:</label>
                          <input
                            id={`fair-action-role-${tier}`}
                            type="text"
                            value={rule.escalationRole}
                            onChange={(e) => handleUpdateTierRule(tier, { escalationRole: e.target.value })}
                            className="w-full bg-[#181824] text-zinc-200 rounded px-2 py-1 border border-[#2d2d3c] focus:border-amber-500 focus:outline-none text-[10px]"
                          />
                        </div>
                      </div>

                      {/* SLA & Tag */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor={`fair-action-sla-${tier}`} className="text-[10px] text-zinc-400 block">Meta de SLA Alvo:</label>
                          <select
                            id={`fair-action-sla-${tier}`}
                            value={rule.slaTargetHours}
                            onChange={(e) => handleUpdateTierRule(tier, { slaTargetHours: Number(e.target.value) })}
                            className="w-full bg-[#181824] text-zinc-200 rounded px-2 py-1 border border-[#2d2d3c] focus:border-amber-500 focus:outline-none text-[10px]"
                          >
                            <option value={24}>24 Horas (Crítico / Emergencial)</option>
                            <option value={72}>72 Horas (3 Dias - Alto)</option>
                            <option value={168}>168 Horas (7 Dias - Sprint)</option>
                            <option value={360}>360 Horas (15 Dias - Médio)</option>
                            <option value={720}>720 Horas (30 Dias - Backlog)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`fair-action-tag-${tier}`} className="text-[10px] text-zinc-400 block">Tag Automática Aplicada:</label>
                          <input
                            id={`fair-action-tag-${tier}`}
                            type="text"
                            value={rule.tagToApply}
                            onChange={(e) => handleUpdateTierRule(tier, { tagToApply: e.target.value })}
                            className="w-full bg-[#181824] text-zinc-200 rounded px-2 py-1 border border-[#2d2d3c] focus:border-amber-500 focus:outline-none text-[10px]"
                          />
                        </div>
                      </div>

                      {/* Descrição detalhada */}
                      <div>
                        <label htmlFor={`fair-action-desc-${tier}`} className="text-[10px] text-zinc-400 block">Instrução / Recomendação Executiva:</label>
                        <textarea
                          id={`fair-action-desc-${tier}`}
                          rows={2}
                          value={rule.actionDescription}
                          onChange={(e) => handleUpdateTierRule(tier, { actionDescription: e.target.value })}
                          className="w-full bg-[#181824] text-zinc-200 rounded p-1.5 border border-[#2d2d3c] focus:border-amber-500 focus:outline-none text-[10px] leading-snug resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Action Test Button */}
                  <div className="p-3 bg-[#14141c] border-t border-[#1e1e28] flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">
                      Tag: <code className="text-zinc-300 font-bold">[{rule.tagToApply}]</code>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTestSeverityAction(tier)}
                      className="px-2.5 py-1 rounded bg-[#1e1e2c] hover:bg-[#28283c] text-zinc-200 hover:text-white border border-zinc-700 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                      title={`Simular disparo da ação automática para ${tier}`}
                    >
                      <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>Testar Ação [{tier}]</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Bar */}
          <div className="p-3.5 rounded-xl bg-[#121218] border border-[#232330] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                As configurações de limiares por severidade são salvas no armazenamento local e aplicadas automaticamente em todos os cálculos do Simulador FAIR.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSeverityConfig(DEFAULT_FAIR_SEVERITY_THRESHOLDS_CONFIG);
                  toast.success('Limiares restaurados para os padrões de fábrica!');
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Todas as Configurações</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {activeSubTab === 'notifications' && (
        <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-150">
          <div className="p-4 rounded-xl bg-[#121218] border border-[#22222e] space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>Canais de Notificação de Violação de Risco (ALE)</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1">
                Escolha como deseja receber alertas quando a Perda Anual Esperada (ALE) de um relatório ultrapassar a tolerância definida.
              </p>
            </div>

            {/* Channels Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Toast Only */}
              <div
                onClick={() => setPreferences({ ...preferences, channel: 'toast' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  preferences.channel === 'toast'
                    ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-200'
                    : 'bg-[#161620] border-[#262634] text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <input
                      type="radio"
                      name="notif_channel"
                      checked={preferences.channel === 'toast'}
                      onChange={() => {}}
                      className="accent-amber-500"
                    />
                  </div>
                  <span className="font-bold text-xs text-white block">Apenas Toast Notification</span>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Exibe alerta pop-up animado no canto da tela com dados financeiros e botão direto para inspecionar o relatório.
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-800/60 mt-3 text-[10px] text-amber-400 font-semibold">
                  Ideal para análise interativa rápida
                </div>
              </div>

              {/* Option 2: Internal Log Only */}
              <div
                onClick={() => setPreferences({ ...preferences, channel: 'internal_log' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  preferences.channel === 'internal_log'
                    ? 'bg-blue-500/15 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-200'
                    : 'bg-[#161620] border-[#262634] text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      type="radio"
                      name="notif_channel"
                      checked={preferences.channel === 'internal_log'}
                      onChange={() => {}}
                      className="accent-blue-500"
                    />
                  </div>
                  <span className="font-bold text-xs text-white block">Apenas Log Interno</span>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Registra silenciosamente cada evento de violação no log interno de auditoria de risco da plataforma, sem pop-ups.
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-800/60 mt-3 text-[10px] text-blue-400 font-semibold">
                  Auditoria discreta e compliance contínuo
                </div>
              </div>

              {/* Option 3: Both (Toast + Internal Log) */}
              <div
                onClick={() => setPreferences({ ...preferences, channel: 'both' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  preferences.channel === 'both'
                    ? 'bg-indigo-500/15 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-indigo-200'
                    : 'bg-[#161620] border-[#262634] text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <input
                      type="radio"
                      name="notif_channel"
                      checked={preferences.channel === 'both'}
                      onChange={() => {}}
                      className="accent-indigo-500"
                    />
                  </div>
                  <span className="font-bold text-xs text-white block">Ambos (Toast + Log Interno)</span>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Alerta na tela imediatamente e armazena o evento no histórico de auditoria para rastreabilidade e governança.
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-800/60 mt-3 text-[10px] text-indigo-400 font-semibold">
                  Recomendado para máxima visibilidade
                </div>
              </div>
            </div>

            {/* General Notification Switches */}
            <div className="p-3 rounded-lg bg-[#181822] border border-[#2a2a38] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={preferences.alertsEnabled}
                    onChange={(e) => setPreferences({ ...preferences, alertsEnabled: e.target.checked })}
                    className="accent-emerald-500 rounded cursor-pointer w-4 h-4"
                  />
                  <span className="font-bold">Sistema de Alertas Ativado</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={preferences.autoDispatchOnBreach}
                    onChange={(e) => setPreferences({ ...preferences, autoDispatchOnBreach: e.target.checked })}
                    className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                  />
                  <span>Disparo Automático ao Detectar Violação</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Preferências</span>
              </button>
            </div>

            {/* Test Actions Bar */}
            <div className="p-3 rounded-lg bg-[#14141c] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-[11px]">
                  Teste os canais configurados com os parâmetros do achado atual:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleTestAlert('toast')}
                  className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Testar Toast</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAlert('internal_log')}
                  className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Gravar Log Teste</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAlert('both')}
                  className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Testar Ambos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Log Interno de Riscos & Auditoria */}
      {activeSubTab === 'logs' && (
        <div className="p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Histórico de Auditoria & Log Interno de Riscos FAIR</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/25 text-[10px]">
                  {internalLogs.length} eventos registrados
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Rastreabilidade permanente de violações de limite de tolerância ao risco (ALE) disparadas pelo sistema.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {internalLogs.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportLogs}
                    className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Exportar logs em formato JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="px-2.5 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Limpar todos os logs armazenados"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Logs</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {internalLogs.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#121218] border border-zinc-800/80 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-zinc-300 font-semibold">Nenhum evento registrado no Log Interno de Riscos</p>
              <p className="text-zinc-500 text-[11px] max-w-md mx-auto">
                Quando uma simulação ultrapassar o teto de tolerância e a opção &apos;Log Interno&apos; estiver habilitada, os eventos de auditoria aparecerão nesta tabela.
              </p>
              <button
                type="button"
                onClick={() => handleTestAlert('internal_log')}
                className="mt-3 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Gerar Primeiro Log de Teste</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {internalLogs.map((log) => {
                const sevBadge = getSeverityBadgeColor(log.severity);
                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      log.status === 'UNREAD'
                        ? 'bg-[#15121c] border-amber-500/40 shadow-sm'
                        : 'bg-[#121218] border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-zinc-400">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                          {log.severity} (CVSS {log.cvss.toFixed(1)})
                        </span>
                        <span className="font-bold text-white">[{log.reportId}] {log.reportTitle}</span>
                        <span className="text-[10px] text-zinc-400">({log.target})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          log.channelUsed === 'both'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : log.channelUsed === 'toast'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          Canal: {log.channelUsed === 'both' ? 'Toast + Log' : log.channelUsed === 'toast' ? 'Toast' : 'Log Interno'}
                        </span>

                        {log.status === 'UNREAD' && (
                          <button
                            type="button"
                            onClick={() => {
                              acknowledgeFairRiskLog(log.id);
                              setInternalLogs(getFairRiskInternalLogs());
                            }}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Marcar como reconhecido"
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Reconhecer</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block">ALE Calculado vs Limite:</span>
                        <span className="font-bold text-red-400">
                          {formatMoney(log.aleUSD)}
                        </span>
                        <span className="text-zinc-400"> (Teto: {formatMoney(log.thresholdUSD)})</span>
                        <span className="text-red-400 font-bold ml-1">+{log.exceededPercent}%</span>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-zinc-500 block">Recomendação de Priorização Registrada:</span>
                        <p className="text-zinc-300 leading-relaxed text-[10px]">
                          {log.remediationRecommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
