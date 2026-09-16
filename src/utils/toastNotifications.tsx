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
