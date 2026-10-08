import React from 'react';
import toast, { Toast } from 'react-hot-toast';
import { ShieldAlert, Flame, ExternalLink, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';

export type CriticalActionType = 'created' | 'updated' | 'escalated' | 'recalibrated' | 'imported';

/**
 * Custom High-Impact Toast Notification for CRITICAL Vulnerabilities
 */
export function notifyCriticalVulnerability(
  report: VulnerabilityReport,
  action: CriticalActionType,
  onOpenReport?: (report: VulnerabilityReport) => void
) {
  const actionLabels: Record<CriticalActionType, { badge: string; title: string; desc: string }> = {
    created: {
      badge: 'NOVA VULNERABILIDADE CRÍTICA',
      title: 'Vulnerabilidade Crítica Registrada',
      desc: 'Um novo achado com severidade CRITICAL foi inserido no sistema.'
    },
    updated: {
      badge: 'VULNERABILIDADE CRÍTICA MODIFICADA',
      title: 'Vulnerabilidade Crítica Atualizada',
      desc: 'Dados de um achado crítico existente foram modificados.'
    },
    escalated: {
      badge: 'ESCALADA PARA CRÍTICA',
      title: 'Severidade Elevada para CRITICAL',
      desc: 'A gravidade deste relatório foi elevada para o nível máximo.'
    },
    recalibrated: {
      badge: 'CVSS CRÍTICO RECALIBRADO',
      title: 'Score CVSS Crítico Aplicado',
      desc: 'O cálculo CVSS resultou em uma classificação de severidade CRITICAL.'
    },
    imported: {
      badge: 'IMPORTAÇÃO CRÍTICA DETECTADA',
      title: 'Vulnerabilidade Crítica Importada',
      desc: 'Achado crítico proveniente de migração CSV adicionado à base.'
    }
  };

  const actionInfo = actionLabels[action] || actionLabels.created;

  toast.custom(
    (t: Toast) => (
      <div
        className={`transform transition-all duration-300 ease-out ${
          t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
        } max-w-md w-full bg-[#14080c] border-2 border-rose-600/90 rounded-xl shadow-[0_0_35px_rgba(225,29,72,0.45)] p-4 pointer-events-auto flex flex-col gap-2.5 relative backdrop-blur-md font-mono`}
        role="alert"
        aria-live="assertive"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-wider">
                  {actionInfo.badge}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[9px] font-bold">
                  {report.cvssScore > 0 ? `CVSS ${report.cvssScore.toFixed(1)}` : 'CRITICAL'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mt-0.5 leading-snug">
                {actionInfo.title}
              </h4>
            </div>
          </div>

          <button
            onClick={() => toast.dismiss(t.id)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-rose-950/60 transition-colors"
            title="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report Details Body */}
        <div className="bg-[#180a0f] border border-rose-900/40 rounded-lg p-2.5 space-y-1">
          <div className="text-xs font-semibold text-rose-100 line-clamp-2">
            {report.title || 'Sem título definido'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Alvo: <strong className="text-zinc-200">{report.target}</strong></span>
            <span>Plataforma: <strong className="text-zinc-200">{report.platform}</strong></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 text-[10px]">
          <span className="text-rose-400/80 flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-500" />
            <span>Atenção prioritária requerida</span>
          </span>

          <div className="flex items-center gap-2">
            {onOpenReport && (
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  onOpenReport(report);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all text-[11px] shadow-sm active:scale-95"
              >
                <span>Inspecionar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    ),
    {
      id: `critical-${report.id}-${Date.now()}`,
      duration: 7000,
      position: 'top-right'
    }
  );
}

/**
 * Standard Toast Styles
 */
export const darkToastStyle = {
  background: '#12121c',
  color: '#f4f4f5',
  border: '1px solid #28283c',
  fontSize: '12px',
  fontFamily: 'monospace',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
};

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    style: darkToastStyle,
    iconTheme: {
      primary: '#10b981',
      secondary: '#0a0a0f'
    }
  });
};

export const showErrorToast = (message: string) => {
  toast.error(message, {
    style: darkToastStyle,
    iconTheme: {
      primary: '#f43f5e',
      secondary: '#0a0a0f'
    }
  });
};

export const showInfoToast = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
    style: darkToastStyle
  });
};

export interface FairAleBreachNotificationParams {
  reportTitle: string;
  reportId: string;
  ale: number;
  threshold: number;
  currency?: 'USD' | 'BRL';
  cvss: number;
  aro: number;
  sle: number;
  onOpenReport?: () => void;
  onNavigateToRemediation?: () => void;
}

/**
 * Toast Notification for FAIR ALE Threshold Breach, alerting that
 * Annual Loss Expectancy has exceeded the user-configured limit and
 * explicitly suggesting remediation prioritization.
 */
export function notifyFairAleBreach({
  reportTitle,
  reportId,
  ale,
  threshold,
  currency = 'USD',
  cvss,
  aro,
  sle,
  onOpenReport,
  onNavigateToRemediation
}: FairAleBreachNotificationParams) {
  const currencySymbol = currency === 'BRL' ? 'R$' : 'US$';
  const formatVal = (v: number) => {
    return `${currencySymbol} ${Math.round(v).toLocaleString()}`;
  };

  const excessPercent = Math.max(0, Math.round(((ale - threshold) / threshold) * 100));

  toast.custom(
    (t: Toast) => (
      <div
        className={`transform transition-all duration-300 ease-out ${
          t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
        } max-w-md w-full bg-[#140b0e] border-2 border-red-500/90 rounded-xl shadow-[0_0_35px_rgba(239,68,68,0.45)] p-4 pointer-events-auto flex flex-col gap-2.5 relative backdrop-blur-md font-mono`}
        role="alert"
        aria-live="assertive"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold uppercase tracking-wider">
                  ALERTA FAIR: LIMITE DE RISCO (ALE)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/80 text-[9px] font-bold">
                  +{excessPercent}% acima do limite
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mt-0.5 leading-snug">
                Valor de Risco Anualizado Ultrapassou o Limite!
              </h4>
            </div>
          </div>

          <button
            onClick={() => toast.dismiss(t.id)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-red-950/60 transition-colors"
            title="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Breach Figures */}
        <div className="bg-[#1c0e12] border border-red-900/50 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">ALE Calculado:</span>
            <span className="text-red-400 font-bold text-sm drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              {formatVal(ale)} / ano
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-red-950/80">
            <span>Limite Configurado:</span>
            <span className="text-zinc-300 font-semibold">{formatVal(threshold)} / ano</span>
          </div>
          <div className="text-[11px] font-semibold text-zinc-200 truncate pt-1" title={reportTitle}>
            Achado: <span className="text-white">{reportTitle}</span> ({reportId})
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>CVSS: <strong className="text-red-300">{cvss.toFixed(1)}</strong></span>
            <span>ARO: <strong className="text-amber-300">{aro}x/ano</strong></span>
            <span>SLE: <strong className="text-blue-300">{formatVal(sle)}</strong></span>
          </div>
        </div>

        {/* Suggestion & Remediation Callout */}
        <div className="p-2 rounded bg-red-950/60 border border-red-800/40 text-[11px] text-red-200 leading-relaxed flex items-start gap-1.5">
          <Flame className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <span>
            <strong>Priorização Recomendada:</strong> Esta vulnerabilidade excede o apetite de risco corporativo. Sugere-se priorizar imediatamente sua remediação para conter a perda financeira anual.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 text-[10px]">
          <span className="text-zinc-500">FAIR Risk Alert System</span>
          <div className="flex items-center gap-2">
            {onOpenReport && (
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  onOpenReport();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition-all text-[11px] shadow-sm active:scale-95"
              >
                <span>Ver Relatório</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    ),
    {
      id: `fair-ale-${reportId}`,
      duration: 8000,
      position: 'top-right'
    }
  );
}

