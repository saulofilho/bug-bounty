import React from 'react';
import {
  History,
  Search,
  Link as LinkIcon,
  Plus,
  ExternalLink,
  Trash2,
  Clock,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { CveHistoryItem, CVERecord, Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';
import { formatCveRelativeTime } from '../utils/cveHistoryManager';

interface CveHistoryWidgetProps {
  history: CveHistoryItem[];
  onSelectCveForSearch: (cveId: string) => void;
  onLinkToNewReport: (cve: CVERecord) => void;
  onClearHistory: () => void;
  onRemoveItem?: (cveId: string) => void;
  onRestoreDefaults?: () => void;
}

export const CveHistoryWidget: React.FC<CveHistoryWidgetProps> = ({
  history,
  onSelectCveForSearch,
  onLinkToNewReport,
  onClearHistory,
  onRemoveItem,
  onRestoreDefaults
}) => {
  const linkedCount = history.filter(item => item.action === 'linked').length;
  const searchedCount = history.filter(item => item.action === 'searched').length;

  return (
    <section 
      id="cve-history-widget"
      className="p-4 sm:p-5 rounded-xl bg-[#0c0c0e] border border-[#222226] space-y-4 shadow-xl"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e1e24]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100 font-mono">
                Histórico de CVE
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                {history.length} de 5 mais recentes
              </span>
              {history.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                  <span className="text-emerald-400 font-semibold">{linkedCount} linkados</span>
                  <span>•</span>
                  <span className="text-blue-400 font-semibold">{searchedCount} buscados</span>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Navegação rápida pelos últimos 5 CVEs consultados ou vinculados a relatórios.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {history.length > 0 ? (
            <button
              type="button"
              id="btn-clear-cve-history"
              onClick={onClearHistory}
              className="px-2.5 py-1 rounded bg-[#16161a] hover:bg-red-500/10 border border-[#2a2a32] hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title="Limpar todos os registros do histórico"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar Histórico</span>
            </button>
          ) : onRestoreDefaults ? (
            <button
              type="button"
              id="btn-restore-cve-history"
              onClick={onRestoreDefaults}
              className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Exemplos</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <div className="p-8 text-center rounded-lg bg-[#101014] border border-[#1e1e24] text-zinc-400 space-y-2">
          <p className="text-xs text-zinc-300">
            Nenhum CVE no histórico recente.
          </p>
          <p className="text-[11px] text-zinc-500">
            Pesquise um CVE acima ou clique em <span className="text-emerald-400 font-semibold">&ldquo;Criar Relatório Deste CVE&rdquo;</span> para que ele seja fixado aqui automaticamente.
          </p>
          {onRestoreDefaults && (
            <button
              type="button"
              onClick={onRestoreDefaults}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181820] hover:bg-[#20202a] border border-[#2e2e38] text-xs text-blue-400 font-mono transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Carregar 5 CVEs Curados no Histórico</span>
            </button>
          )}
        </div>
      ) : (
        /* 5-Card Responsive Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {history.map((item, index) => {
            const sevBadge = getSeverityBadgeColor(item.severity as Severity);
            const isLinked = item.action === 'linked';

            return (
              <div
                key={`${item.cveId}-${item.timestamp}-${index}`}
                id={`cve-history-item-${item.cveId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                className="p-3.5 rounded-lg bg-[#111115] hover:bg-[#15151c] border border-[#222228] hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 group relative shadow-sm"
              >
                {/* Remove single item button on hover */}
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.cveId);
                    }}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title={`Remover ${item.cveId} do histórico`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}

                {/* Top Section: CVE ID & Action Badge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5 pr-4">
                    <button
                      type="button"
                      onClick={() => onSelectCveForSearch(item.cveId)}
                      className="font-mono text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors truncate text-left cursor-pointer flex items-center gap-1"
                      title={`Buscar ${item.cveId}`}
                    >
                      <span>{item.cveId}</span>
                      <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 shrink-0" />
                    </button>
                  </div>

                  {/* Badges: Action + Severity */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isLinked ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold tracking-tight">
                        <LinkIcon className="w-2.5 h-2.5" />
                        <span>Linkado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] font-mono font-bold tracking-tight">
                        <Search className="w-2.5 h-2.5" />
                        <span>Buscado</span>
                      </span>
                    )}

                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                      {item.cvss.toFixed(1)} {item.severity}
                    </span>
                  </div>

                  {/* Title Preview */}
                  <p 
                    onClick={() => onSelectCveForSearch(item.cveId)}
                    className="text-xs text-zinc-300 group-hover:text-white font-medium line-clamp-2 leading-snug cursor-pointer transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </p>
                </div>

                {/* Bottom Section: Timing & Quick Actions */}
                <div className="pt-2 border-t border-[#1e1e24] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="w-2.5 h-2.5 text-zinc-500" />
                      <span>{formatCveRelativeTime(item.timestamp)}</span>
                    </span>
                    {item.cwe && (
                      <span className="text-zinc-500 truncate max-w-[75px]" title={item.cwe}>
                        {item.cwe}
                      </span>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectCveForSearch(item.cveId)}
                      className="w-full px-2 py-1 rounded bg-[#1a1a22] hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-[#2a2a34] hover:border-blue-500/40 text-[10px] font-mono font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Navegar e filtrar este CVE na lista"
                    >
                      <Search className="w-2.5 h-2.5" />
                      <span>Buscar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onLinkToNewReport(item.cveRecord)}
                      className="w-full px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Criar novo relatório preenchido com este CVE"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Relatório</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
