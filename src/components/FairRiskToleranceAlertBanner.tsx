import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Sliders,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Building2,
  DollarSign,
  Scale,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  FairRiskToleranceConfig,
  getFairToleranceConfig,
  FAIR_TOLERANCE_EVENT,
  calculateTargetAccumulatedRisks,
  getBreachedTargets,
  TargetRiskSummary
} from '../utils/fairRiskTolerance';
import { useLanguage } from '../context/LanguageContext';

export interface FairRiskToleranceAlertBannerProps {
  reports: VulnerabilityReport[];
  onOpenConfigModal: () => void;
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  onNavigateToTargets?: () => void;
  className?: string;
}

export const FairRiskToleranceAlertBanner: React.FC<FairRiskToleranceAlertBannerProps> = ({
  reports,
  onOpenConfigModal,
  onSelectReport,
  onNavigateToReports,
  onNavigateToTargets,
  className = ''
}) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<FairRiskToleranceConfig>(getFairToleranceConfig);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Listen to config updates from modal or localStorage
  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getFairToleranceConfig());
    };

    window.addEventListener(FAIR_TOLERANCE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(FAIR_TOLERANCE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Compute accumulated risks per target
  const targetSummaries = useMemo(() => {
    return calculateTargetAccumulatedRisks(reports, config);
  }, [reports, config]);

  const { criticalBreaches, warningBreaches, allBreaches, totalBreachesCount } = useMemo(() => {
    return getBreachedTargets(targetSummaries);
  }, [targetSummaries]);

  // If alerts are disabled in config, show a subtle disabled indicator or nothing
  if (!config.alertsEnabled) {
    return null;
  }

  // If user dismissed this session
  if (isDismissed) {
    return (
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0e111a] border border-zinc-800 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('Alertas de Risco FAIR minimizados')} ({totalBreachesCount} {t('alvos excedendo limites')})</span>
        </span>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
        >
          {t('Exibir novamente')}
        </button>
      </div>
    );
  }

  // 1. STATE: ALL TARGETS WITHIN TOLERANCE
  if (totalBreachesCount === 0) {
    return (
      <div 
        id="fair-risk-tolerance-alert-banner"
        className={`p-3 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#0d1612] to-[#0a0d14] border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm">
                {t('Tolerância ao Risco FAIR Respeitada')}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                {t('Dentro dos Limites ALE')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {t('Todos os alvos monitorados acumulam Perda Anual Esperada abaixo dos thresholds configurados')} (Alerta: {formatCurrency(config.warningThresholdUSD, 'USD')} • Crítico: {formatCurrency(config.criticalThresholdUSD, 'USD')}).
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-edit-fair-tolerance-banner"
          onClick={onOpenConfigModal}
          className="px-3 py-1.5 rounded-lg bg-[#141d1a] hover:bg-[#1a2924] border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-[11px] font-semibold transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Sliders className="w-3 h-3" />
          <span>{t('Ajustar Thresholds FAIR')}</span>
        </button>
      </div>
    );
  }

  // 2. STATE: BREACH DETECTED (CRITICAL OR WARNING)
  const isCritical = criticalBreaches.length > 0;
  const bannerBg = isCritical
    ? 'bg-gradient-to-r from-red-950/40 via-[#180d10] to-[#0d0f17] border-red-500/45 shadow-[0_0_25px_rgba(239,68,68,0.18)]'
    : 'bg-gradient-to-r from-amber-950/40 via-[#17120d] to-[#0d0f17] border-amber-500/45 shadow-[0_0_25px_rgba(245,158,11,0.18)]';

  const titleColor = isCritical ? 'text-red-300' : 'text-amber-300';
  const badgeColor = isCritical
    ? 'bg-red-500/20 text-red-300 border-red-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <section
      id="fair-risk-tolerance-alert-banner"
      aria-label="Alerta de Tolerância de Risco FAIR"
      className={`rounded-xl border p-4 sm:p-5 transition-all text-xs relative overflow-hidden ${bannerBg} ${className}`}
    >
      {/* Glow lights */}
      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isCritical ? 'bg-red-500/10' : 'bg-amber-500/10'}`} />

      {/* Banner Top Bar */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
            isCritical
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
          }`}>
            {isCritical ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {isCritical ? t('🚨 VIOLAÇÃO CRÍTICA DE TOLERÂNCIA FAIR') : t('⚠️ ALERTA DE RISCO ACUMULADO')}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {criticalBreaches.length > 0 && `${criticalBreaches.length} ${t('crítico(s)')}`}
                {warningBreaches.length > 0 && ` • ${warningBreaches.length} ${t('em alerta')}`}
              </span>
            </div>

            <h3 className={`text-sm sm:text-base font-bold ${titleColor}`}>
              {totalBreachesCount === 1
                ? t(`O alvo "${allBreaches[0].target}" ultrapassou o teto tolerável de Perda Anual Esperada (ALE)`)
                : t(`${totalBreachesCount} alvos monitorados ultrapassaram a tolerância corporativa de Perda Anual Esperada (ALE)`)}
            </h3>

            <p className="text-zinc-300 text-xs max-w-3xl leading-relaxed">
              {t('A modelagem quantitativa FAIR calcula que vulnerabilidades acumuladas nesses ativos representam uma exposição financeira anual acima do apetite de risco definido para a organização.')}
            </p>
          </div>
        </div>

        {/* Controls: Actions & Minimize */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-alert-configure-tolerance"
            onClick={onOpenConfigModal}
            className="px-3 py-1.5 rounded-lg bg-[#141622] hover:bg-[#1c2033] border border-zinc-700 hover:border-zinc-500 text-white font-mono text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t('Ajustar Limites')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title={isCollapsed ? t('Expandir detalhes') : t('Recolher')}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title={t('Dispensar temporariamente')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Targets List */}
      {!isCollapsed && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3 relative z-10 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            <span>{t('Alvos em Não Conformidade com a Política FAIR:')}</span>
            <span>{t('ALE Acumulado vs Teto de Tolerância')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allBreaches.map(item => {
              const isTargetCritical = item.breachStatus === 'CRITICAL_BREACH';
              const effectiveTgtThreshold = isTargetCritical ? item.effectiveCriticalUSD : item.effectiveWarningUSD;
              const ratioPercent = Math.min(250, Math.round((item.accumulatedAleUSD / effectiveTgtThreshold) * 100));

              return (
                <div
                  key={item.target}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    isTargetCritical
                      ? 'bg-red-950/30 border-red-500/40 hover:border-red-500/70'
                      : 'bg-amber-950/30 border-amber-500/40 hover:border-amber-500/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 font-mono">
                        <Building2 className={`w-3.5 h-3.5 ${isTargetCritical ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className="font-bold text-white text-xs">{item.target}</span>
                      </div>
                      <span className={`px-2 py-0.2 rounded-full font-mono text-[9px] font-bold ${
                        isTargetCritical
                          ? 'bg-red-500/25 text-red-300 border border-red-500/40'
                          : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      }`}>
                        +{item.thresholdExceededPercent}% {t('acima')}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1 text-xs font-mono">
                      <span className="text-zinc-400">
                        {item.reportCount} {t('achados')} ({item.criticalCount} {t('críticos')})
                      </span>
                      <div className="text-right">
                        <span className={`font-bold ${isTargetCritical ? 'text-red-400' : 'text-amber-400'}`}>
                          {formatCurrency(item.accumulatedAleUSD, 'USD')}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          Teto: {formatCurrency(effectiveTgtThreshold, 'USD')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with Overflow */}
                    <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-500 ${isTargetCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (item.accumulatedAleUSD / effectiveTgtThreshold) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions for this Target */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        const targetReport = item.reports.find(r => r.severity === 'CRITICAL') || item.reports[0];
                        if (targetReport && onSelectReport) {
                          onSelectReport(targetReport);
                        }
                        const simulatorEl = document.getElementById('fair-impact-simulator-section');
                        if (simulatorEl) {
                          simulatorEl.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Scale className="w-3 h-3" />
                      <span>{t('Simular no FAIR')}</span>
                    </button>

                    {onNavigateToTargets && (
                      <button
                        type="button"
                        onClick={onNavigateToTargets}
                        className="text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{t('Ver Escopo')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
