import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Info,
  RotateCcw,
  Save,
  Building2,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  BellRing,
  BellOff,
  Filter,
  Flame,
  Check
} from 'lucide-react';
import { VulnerabilityReport } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  FairRiskToleranceConfig,
  FairTolerancePreset,
  FAIR_TOLERANCE_PRESETS,
  DEFAULT_FAIR_TOLERANCE_CONFIG,
  getFairToleranceConfig,
  saveFairToleranceConfig,
  calculateTargetAccumulatedRisks,
  getBreachedTargets,
  TargetThresholdOverride
} from '../utils/fairRiskTolerance';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export interface FairRiskToleranceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: VulnerabilityReport[];
  onSaved?: (newConfig: FairRiskToleranceConfig) => void;
}

const QUICK_AMOUNTS_WARNING = [
  { label: '$10M', val: 10000000 },
  { label: '$50M', val: 50000000 },
  { label: '$100M', val: 100000000 },
  { label: '$150M', val: 150000000 },
  { label: '$200M', val: 200000000 }
];

const QUICK_AMOUNTS_CRITICAL = [
  { label: '$50M', val: 50000000 },
  { label: '$120M', val: 120000000 },
  { label: '$250M', val: 250000000 },
  { label: '$350M', val: 350000000 },
  { label: '$500M', val: 500000000 }
];

const USD_TO_BRL = 5.45;

export const FairRiskToleranceConfigModal: React.FC<FairRiskToleranceConfigModalProps> = ({
  isOpen,
  onClose,
  reports,
  onSaved
}) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<FairRiskToleranceConfig>(getFairToleranceConfig);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'overrides' | 'preview'>('thresholds');
  const [selectedTargetForOverride, setSelectedTargetForOverride] = useState<string>('');
  const [overrideWarningInput, setOverrideWarningInput] = useState<string>('');
  const [overrideCriticalInput, setOverrideCriticalInput] = useState<string>('');

  // Synchronize with stored config when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfig(getFairToleranceConfig());
    }
  }, [isOpen]);

  // Extract all unique targets in current reports
  const allTargets = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => (r.target || '').trim()).filter(Boolean)));
    return list.sort();
  }, [reports]);

  // Live simulation results based on current draft config
  const simulatedSummaries = useMemo(() => {
    return calculateTargetAccumulatedRisks(reports, config);
  }, [reports, config]);

  const simulatedBreaches = useMemo(() => {
    return getBreachedTargets(simulatedSummaries);
  }, [simulatedSummaries]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetKey: FairTolerancePreset) => {
    if (presetKey === 'custom') {
      setConfig(prev => ({ ...prev, preset: 'custom' }));
      return;
    }

    const presetData = FAIR_TOLERANCE_PRESETS[presetKey];
    if (presetData) {
      setConfig(prev => ({
        ...prev,
        preset: presetKey,
        warningThresholdUSD: presetData.warningUSD,
        criticalThresholdUSD: presetData.criticalUSD
      }));
    }
  };

  const handleWarningChange = (val: number) => {
    const clean = Math.max(1000000, val);
    setConfig(prev => ({
      ...prev,
      preset: 'custom',
      warningThresholdUSD: clean,
      // Ensure critical is at least equal or higher
      criticalThresholdUSD: Math.max(clean, prev.criticalThresholdUSD)
    }));
  };

  const handleCriticalChange = (val: number) => {
    const clean = Math.max(1000000, val);
    setConfig(prev => ({
      ...prev,
      preset: 'custom',
      criticalThresholdUSD: clean
    }));
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_FAIR_TOLERANCE_CONFIG);
    toast.success(t('Limites de tolerância restaurados para o padrão corporativo.', 'Tolerance limits restored to defaults.'));
  };

  const handleSave = () => {
    saveFairToleranceConfig(config);
    if (onSaved) onSaved(config);
    toast.success(t('Limites de tolerância FAIR salvos com sucesso!', 'FAIR tolerance thresholds saved!'), {
      icon: '🛡️'
    });
    onClose();
  };

  const handleAddTargetOverride = () => {
    if (!selectedTargetForOverride) return;
    const wVal = overrideWarningInput ? Number(overrideWarningInput) : undefined;
    const cVal = overrideCriticalInput ? Number(overrideCriticalInput) : undefined;

    setConfig(prev => ({
      ...prev,
      targetOverrides: {
        ...prev.targetOverrides,
        [selectedTargetForOverride]: {
          targetName: selectedTargetForOverride,
          warningThresholdUSD: wVal,
          criticalThresholdUSD: cVal
        }
      }
    }));

    setSelectedTargetForOverride('');
    setOverrideWarningInput('');
    setOverrideCriticalInput('');
    toast.success(t(`Limite customizado definido para ${selectedTargetForOverride}`));
  };

  const handleRemoveOverride = (targetName: string) => {
    setConfig(prev => {
      const nextOverrides = { ...prev.targetOverrides };
      delete nextOverrides[targetName];
      return { ...prev, targetOverrides: nextOverrides };
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fair-tolerance-modal-title"
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0d0f14] border border-[#232938] shadow-2xl overflow-hidden text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#1c2230] bg-[#11141c]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="fair-tolerance-modal-title" className="text-base font-bold text-white tracking-tight">
                  {t('Limites de Tolerância ao Risco FAIR (ALE)')}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                  {t('Perda Anual Esperada')}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px] border border-zinc-700">
                  ISO/FAIR 27005
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t('Configure os thresholds máximos aceitáveis de ALE por alvo e ative alertas automáticos no Dashboard.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title={t('Fechar')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#1c2230] bg-[#0d0f14]">
          <button
            type="button"
            onClick={() => setActiveTab('thresholds')}
            className={`pb-2.5 px-3 text-xs font-mono font-bold tracking-wide uppercase transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'thresholds'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('Thresholds Globais')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overrides')}
            className={`pb-2.5 px-3 text-xs font-mono font-bold tracking-wide uppercase transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'overrides'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t('Exceções por Alvo')}</span>
            {Object.keys(config.targetOverrides).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                {Object.keys(config.targetOverrides).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-mono font-bold tracking-wide uppercase transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('Simulação em Tempo Real')}</span>
            {simulatedBreaches.totalBreachesCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500/25 text-red-300 text-[10px] font-mono font-bold border border-red-500/40 animate-pulse">
                {simulatedBreaches.totalBreachesCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                0
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === 'thresholds' && (
            <div className="space-y-6">
              
              {/* Presets Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                  <span>{t('1. Perfil de Tolerância Corporativa (Presets)')}</span>
                  <span className="text-[11px] font-normal text-zinc-500">{t('Selecione ou personalize')}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(FAIR_TOLERANCE_PRESETS) as Array<Exclude<FairTolerancePreset, 'custom'>>).map(key => {
                    const preset = FAIR_TOLERANCE_PRESETS[key];
                    const isSelected = config.preset === key;
                    return (
                      <div
                        key={key}
                        onClick={() => handleSelectPreset(key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                            : 'bg-[#11141c] border-[#1e2434] hover:border-zinc-700 hover:bg-[#141824]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white">{preset.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-[11px] text-emerald-400 font-mono">{preset.label}</p>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-amber-400">Alerta: {formatCurrency(preset.warningUSD, 'USD')}</span>
                          <span className="text-red-400">Crítico: {formatCurrency(preset.criticalUSD, 'USD')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Threshold Adjusters: Warning & Critical */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Warning Threshold */}
                <div className="p-4 rounded-xl bg-[#11141c] border border-amber-500/25 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>{t('Limite de Advertência (Warning ALE)')}</span>
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {t('Dispara aviso preventivo quando o ALE acumulado atinge este valor')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-bold font-mono text-amber-300">
                      {formatCurrency(config.warningThresholdUSD, 'USD')}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      ~ {formatCurrency(config.warningThresholdUSD * USD_TO_BRL, 'BRL')}
                    </span>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="5000000"
                    max="500000000"
                    step="5000000"
                    value={config.warningThresholdUSD}
                    onChange={(e) => handleWarningChange(Number(e.target.value))}
                    className="w-full accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
                  />

                  {/* Quick Pill Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-mono text-zinc-500 mr-1">{t('Atalhos:')}</span>
                    {QUICK_AMOUNTS_WARNING.map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleWarningChange(item.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer ${
                          config.warningThresholdUSD === item.val
                            ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Critical Threshold */}
                <div className="p-4 rounded-xl bg-[#11141c] border border-red-500/25 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        <span>{t('Limite Crítico (Critical Breach ALE)')}</span>
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {t('Dispara alerta de violação severa de apetite a risco no Dashboard')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-bold font-mono text-red-400">
                      {formatCurrency(config.criticalThresholdUSD, 'USD')}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      ~ {formatCurrency(config.criticalThresholdUSD * USD_TO_BRL, 'BRL')}
                    </span>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="10000000"
                    max="1000000000"
                    step="10000000"
                    value={config.criticalThresholdUSD}
                    onChange={(e) => handleCriticalChange(Number(e.target.value))}
                    className="w-full accent-red-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
                  />

                  {/* Quick Pill Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-mono text-zinc-500 mr-1">{t('Atalhos:')}</span>
                    {QUICK_AMOUNTS_CRITICAL.map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleCriticalChange(item.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer ${
                          config.criticalThresholdUSD === item.val
                            ? 'bg-red-500/30 text-red-200 border-red-500/50'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Behavior & Scope Options */}
              <div className="p-4 rounded-xl bg-[#11141c] border border-[#1e2434] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-white block">{t('Escopo de Cálculo do Risco Acumulado')}</span>
                    <span className="text-[11px] text-zinc-400">
                      {t('Defina se o ALE acumulado considera todos os relatórios ou apenas os que ainda não foram resolvidos')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#0a0c10] p-1 rounded-lg border border-zinc-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, scopeFilter: 'all' }))}
                      className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        config.scopeFilter === 'all'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('Todos os Relatórios')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, scopeFilter: 'open_only' }))}
                      className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        config.scopeFilter === 'open_only'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('Apenas Pendentes / Abertos')}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      {config.alertsEnabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-zinc-500" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{t('Alertas Visuais no Dashboard')}</span>
                      <span className="text-[11px] text-zinc-400">
                        {t('Exibir banners destacados de advertência e violação de tolerância quando um alvo exceder os limites')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, alertsEnabled: !prev.alertsEnabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.alertsEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        config.alertsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'overrides' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200 leading-relaxed">
                  {t('Alguns alvos com faturamento elevado ou dados ultrassensíveis (ex: gateway de pagamentos) podem exigir limites mais rígidos ou mais flexíveis do que a política global.')}
                </p>
              </div>

              {/* Add Override Form */}
              <div className="p-4 rounded-xl bg-[#11141c] border border-[#1e2434] space-y-3">
                <span className="text-xs font-bold text-white block">{t('Adicionar Exceção para um Alvo Específico')}</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">{t('Alvo / Domínio')}</label>
                    <select
                      value={selectedTargetForOverride}
                      onChange={(e) => setSelectedTargetForOverride(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value="">{t('Selecione um alvo...')}</option>
                      {allTargets.map(tgt => (
                        <option key={tgt} value={tgt}>{tgt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">{t('Limite Alerta (USD)')}</label>
                    <input
                      type="number"
                      placeholder="ex: 40000000"
                      value={overrideWarningInput}
                      onChange={(e) => setOverrideWarningInput(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">{t('Limite Crítico (USD)')}</label>
                    <input
                      type="number"
                      placeholder="ex: 100000000"
                      value={overrideCriticalInput}
                      onChange={(e) => setOverrideCriticalInput(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddTargetOverride}
                    disabled={!selectedTargetForOverride}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    {t('Definir Limite Específico')}
                  </button>
                </div>
              </div>

              {/* Overrides Table */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  {t('Exceções Configuradas')} ({Object.keys(config.targetOverrides).length})
                </span>

                {Object.keys(config.targetOverrides).length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-zinc-800 text-center text-xs text-zinc-500">
                    {t('Nenhuma exceção cadastrada. Todos os alvos seguem a política global padrão.')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(Object.entries(config.targetOverrides) as [string, TargetThresholdOverride][]).map(([tName, over]) => (
                      <div
                        key={tName}
                        className="p-3 rounded-xl bg-[#11141c] border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 font-mono">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-white">{tName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          {over.warningThresholdUSD && (
                            <span className="text-amber-400">
                              Alerta: {formatCurrency(over.warningThresholdUSD, 'USD')}
                            </span>
                          )}
                          {over.criticalThresholdUSD && (
                            <span className="text-red-400">
                              Crítico: {formatCurrency(over.criticalThresholdUSD, 'USD')}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveOverride(tName)}
                            className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                            title={t('Remover')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-5">
              
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#11141c] border border-zinc-800">
                  <span className="text-[11px] font-mono text-zinc-400 block">{t('Total de Alvos Avaliados')}</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {simulatedSummaries.length}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  simulatedBreaches.criticalBreaches.length > 0
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-[#11141c] border-zinc-800 text-zinc-400'
                }`}>
                  <span className="text-[11px] font-mono block">{t('Alvos com Violação Crítica')}</span>
                  <span className="text-2xl font-bold font-mono mt-1 block text-red-400">
                    {simulatedBreaches.criticalBreaches.length}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  simulatedBreaches.warningBreaches.length > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-[#11141c] border-zinc-800 text-zinc-400'
                }`}>
                  <span className="text-[11px] font-mono block">{t('Alvos com Violação de Advertência')}</span>
                  <span className="text-2xl font-bold font-mono mt-1 block text-amber-400">
                    {simulatedBreaches.warningBreaches.length}
                  </span>
                </div>
              </div>

              {/* Targets List */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 block">
                  {t('Classificação de Risco por Alvo com os Thresholds Atuais:')}
                </span>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {simulatedSummaries.map(item => {
                    const isCritical = item.breachStatus === 'CRITICAL_BREACH';
                    const isWarning = item.breachStatus === 'WARNING_BREACH';

                    return (
                      <div
                        key={item.target}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                          isCritical
                            ? 'bg-red-950/20 border-red-500/40 shadow-sm'
                            : isWarning
                            ? 'bg-amber-950/20 border-amber-500/35'
                            : 'bg-[#0f121a] border-zinc-800/80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{item.target}</span>
                            <span className={`px-2 py-0.2 rounded-full font-mono text-[9px] font-bold ${
                              isCritical
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {isCritical ? t('CRÍTICO EXCEDIDO') : isWarning ? t('ALERTA ATINGIDO') : t('DENTRO DA TOLERÂNCIA')}
                            </span>
                            {item.thresholdExceededPercent > 0 && (
                              <span className="text-[10px] font-mono font-bold text-red-400">
                                +{item.thresholdExceededPercent}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {item.reportCount} {t('relatórios')} • {item.criticalCount} {t('críticos')} • {item.highCount} {t('altos')}
                          </p>
                        </div>

                        <div className="text-right font-mono">
                          <span className={`text-sm font-bold block ${
                            isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {formatCurrency(item.accumulatedAleUSD, 'USD')} <span className="text-[10px] font-normal text-zinc-400">/ano</span>
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Limite: {formatCurrency(item.effectiveCriticalUSD, 'USD')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1c2230] bg-[#11141c]/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-mono text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('Restaurar Padrões')}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
            >
              {t('Cancelar')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('Salvar Thresholds')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
