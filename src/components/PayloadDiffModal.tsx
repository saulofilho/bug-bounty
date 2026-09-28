import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  X, 
  Copy, 
  Check, 
  FileCode, 
  Filter, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { computeSideBySideDiff } from '../utils/diffUtils';
import { FuzzTestHistoryItem } from './PayloadFuzzerStudio';

interface PayloadDiffModalProps {
  history: FuzzTestHistoryItem[];
  initialLeftId?: string;
  initialRightId?: string;
  onClose: () => void;
}

export const PayloadDiffModal: React.FC<PayloadDiffModalProps> = ({
  history,
  initialLeftId,
  initialRightId,
  onClose
}) => {
  // If fewer than 2 items in history, we still allow opening with available items
  const defaultLeft = history.find(h => h.id === initialLeftId) || history[1] || history[0];
  const defaultRight = history.find(h => h.id === initialRightId) || history[0];

  const [leftId, setLeftId] = useState<string>(defaultLeft?.id || '');
  const [rightId, setRightId] = useState<string>(defaultRight?.id || '');
  const [formatJson, setFormatJson] = useState<boolean>(true);
  const [onlyDifferences, setOnlyDifferences] = useState<boolean>(false);
  const [copiedSide, setCopiedSide] = useState<'left' | 'right' | 'all' | null>(null);

  const leftItem = useMemo(() => history.find(h => h.id === leftId) || history[0], [history, leftId]);
  const rightItem = useMemo(() => history.find(h => h.id === rightId) || history[1] || history[0], [history, rightId]);

  const leftContent = leftItem?.responseBody || '';
  const rightContent = rightItem?.responseBody || '';

  // Swap Left and Right items
  const handleSwap = () => {
    const temp = leftId;
    setLeftId(rightId);
    setRightId(temp);
  };

  // Compute Diff
  const { rows, summary } = useMemo(() => {
    return computeSideBySideDiff(leftContent, rightContent, formatJson);
  }, [leftContent, rightContent, formatJson]);

  // Filter rows if "Apenas Diferenças" is enabled
  const displayedRows = useMemo(() => {
    if (!onlyDifferences) return rows;
    return rows.filter(r => r.leftType !== 'unchanged' || r.rightType !== 'unchanged');
  }, [rows, onlyDifferences]);

  const handleCopyText = (side: 'left' | 'right' | 'all') => {
    let textToCopy = '';
    if (side === 'left') {
      textToCopy = leftContent;
    } else if (side === 'right') {
      textToCopy = rightContent;
    } else {
      // Unified text format
      textToCopy = rows.map(r => {
        if (r.leftType === 'removed' && r.rightType === 'added') {
          return `- ${r.leftContent}\n+ ${r.rightContent}`;
        }
        if (r.leftType === 'removed') return `- ${r.leftContent}`;
        if (r.rightType === 'added') return `+ ${r.rightContent}`;
        return `  ${r.leftContent ?? r.rightContent ?? ''}`;
      }).join('\n');
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 1500);
  };

  const getStatusColor = (code?: number) => {
    if (!code) return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    if (code === 200) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (code === 400 || code === 403) return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (code === 422) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#111119] border border-[#262638] rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#141420] border-b border-[#242436] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span>Comparador de Respostas HTTP</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-cyan-300 text-xs">Side-by-Side Diff</span>
                </h2>
                {summary.isIdentical ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                    Respostas 100% Idênticas
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      +{summary.addedCount} adições
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                      -{summary.removedCount} remoções
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      ~{summary.modifiedCount} modificadas
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                      Delta: {summary.byteDelta >= 0 ? `+${summary.byteDelta}` : summary.byteDelta} bytes
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Compare o corpo da resposta HTTP de dois testes de injeção lado a lado com detecção de desvios e sanitização.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* JSON Prettify Toggle */}
            <button
              type="button"
              onClick={() => setFormatJson(!formatJson)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                formatJson
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#1a1a28] text-zinc-400 hover:text-white border border-[#2a2a3c]'
              }`}
              title="Formatar automaticamente respostas em JSON para facilitar a visualização de diferenças estruturais"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Formatar JSON</span>
            </button>

            {/* Differences Only Filter */}
            <button
              type="button"
              onClick={() => setOnlyDifferences(!onlyDifferences)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyDifferences
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#1a1a28] text-zinc-400 hover:text-white border border-[#2a2a3c]'
              }`}
              title="Ocultar linhas idênticas e exibir apenas onde houve divergência"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apenas Diferenças</span>
            </button>

            {/* Swap Sides */}
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-lg bg-[#1a1a28] hover:bg-[#252538] text-zinc-300 hover:text-white border border-[#2a2a3c] transition-all cursor-pointer"
              title="Inverter lados (Trocar Teste A e Teste B)"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            {/* Copy Diff */}
            <button
              type="button"
              onClick={() => handleCopyText('all')}
              className="px-2.5 py-1.5 rounded-lg bg-[#1a1a28] hover:bg-[#252538] text-zinc-300 hover:text-white border border-[#2a2a3c] text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
              title="Copiar relatório unificado de diff (+/-)"
            >
              {copiedSide === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Diff</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1a1a28] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-[#2a2a3c] hover:border-rose-500/40 transition-all cursor-pointer ml-1"
              title="Fechar comparador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dual Pane Header (Selection & Metadata for Left and Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#242436] bg-[#12121c] border-b border-[#242436] shrink-0">
          
          {/* Left Side Header (Test A / Base) */}
          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
                  Teste A (Linha de Base / Original)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopyText('left')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a1a28] hover:bg-[#252538] text-zinc-400 hover:text-white border border-[#28283a] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copiar corpo da resposta do Teste A"
                >
                  {copiedSide === 'left' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar A</span>
                </button>
              </div>
            </div>

            {/* Selector Dropdown */}
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full bg-[#181826] border border-[#2d2d42] rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.timestamp}] ?{h.paramName}= HTTP {h.statusCode} ({h.latencyMs}ms) — {h.payload.slice(0, 32)}
                </option>
              ))}
            </select>

            {/* Left Meta Badge Bar */}
            {leftItem && (
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 bg-[#0e0e16] p-2 rounded-lg border border-[#1e1e2c] flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(leftItem.statusCode)}`}>
                    HTTP {leftItem.statusCode} ({leftItem.statusText.split(' ')[0]})
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-cyan-300">?{leftItem.paramName}=</span>
                  <span className="text-zinc-500">·</span>
                  <span>{leftItem.latencyMs}ms</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  {new Blob([leftContent]).size} bytes · {leftContent.split('\n').length} linhas
                </div>
              </div>
            )}
          </div>

          {/* Right Side Header (Test B / Comparison) */}
          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                  Teste B (Comparação / Novo Payload)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopyText('right')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a1a28] hover:bg-[#252538] text-zinc-400 hover:text-white border border-[#28283a] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copiar corpo da resposta do Teste B"
                >
                  {copiedSide === 'right' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar B</span>
                </button>
              </div>
            </div>

            {/* Selector Dropdown */}
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full bg-[#181826] border border-[#2d2d42] rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.timestamp}] ?{h.paramName}= HTTP {h.statusCode} ({h.latencyMs}ms) — {h.payload.slice(0, 32)}
                </option>
              ))}
            </select>

            {/* Right Meta Badge Bar */}
            {rightItem && (
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 bg-[#0e0e16] p-2 rounded-lg border border-[#1e1e2c] flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(rightItem.statusCode)}`}>
                    HTTP {rightItem.statusCode} ({rightItem.statusText.split(' ')[0]})
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-cyan-300">?{rightItem.paramName}=</span>
                  <span className="text-zinc-500">·</span>
                  <span>{rightItem.latencyMs}ms</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  {new Blob([rightContent]).size} bytes · {rightContent.split('\n').length} linhas
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Status Delta Quick Callout Banner */}
        {leftItem && rightItem && leftItem.statusCode !== rightItem.statusCode && (
          <div className="px-5 py-2 bg-gradient-to-r from-amber-950/30 via-indigo-950/20 to-emerald-950/30 border-b border-[#282838] flex items-center justify-between text-xs font-mono shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-200 font-bold">Variação de Código de Resposta HTTP:</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                {leftItem.statusCode} {leftItem.statusText.split(' ')[0]}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {rightItem.statusCode} {rightItem.statusText.split(' ')[0]}
              </span>
            </div>
            <div className="text-[11px] text-amber-300 font-semibold">
              {rightItem.statusCode === 200 && leftItem.statusCode !== 200
                ? '⚡ Potencial Bypass detectado: resposta liberada com sucesso (200 OK)!'
                : leftItem.statusCode === 200 && rightItem.statusCode !== 200
                ? '🛡️ Filtro/WAF ativado: payload de teste foi interceptado pelo servidor'
                : 'Alteração no comportamento de resposta do endpoint'}
            </div>
          </div>
        )}

        {/* Main Side-by-Side Scrollable Diff Canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#0d0d14] font-mono text-xs select-text">
          {displayedRows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
              <Layers className="w-8 h-8 text-zinc-600" />
              <p className="text-sm font-bold text-zinc-400">Nenhuma diferença encontrada para os filtros atuais.</p>
              <p className="text-xs text-zinc-600">Desmarque "Apenas Diferenças" para inspecionar todas as linhas.</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              {displayedRows.map((row, idx) => {
                const isLeftRemoved = row.leftType === 'removed';
                const isRightAdded = row.rightType === 'added';
                const isRowModified = row.isModified;

                return (
                  <div 
                    key={idx} 
                    className="grid grid-cols-2 divide-x divide-[#202030] hover:bg-white/[0.02] border-b border-[#161622] transition-colors leading-relaxed"
                  >
                    {/* Left Pane Cell */}
                    <div className={`flex items-start ${
                      isRowModified
                        ? 'bg-rose-950/25 text-rose-200'
                        : isLeftRemoved
                        ? 'bg-rose-950/35 text-rose-200'
                        : row.leftType === 'empty'
                        ? 'bg-[#09090f]/70 text-transparent select-none'
                        : 'text-zinc-300'
                    }`}>
                      {/* Left Line Number */}
                      <span className="w-12 py-1 px-2 text-right text-[10px] text-zinc-600 bg-[#0e0e16] border-r border-[#1a1a26] select-none shrink-0 font-mono">
                        {row.leftLineNumber ?? ''}
                      </span>
                      {/* Left Sign */}
                      <span className="w-5 py-1 text-center font-bold select-none shrink-0 text-rose-400">
                        {isLeftRemoved ? '-' : ''}
                      </span>
                      {/* Left Content */}
                      <span className="py-1 px-2 flex-1 whitespace-pre-wrap break-all font-mono">
                        {row.leftContent || (row.leftType === 'empty' ? ' ' : '')}
                      </span>
                    </div>

                    {/* Right Pane Cell */}
                    <div className={`flex items-start ${
                      isRowModified
                        ? 'bg-emerald-950/25 text-emerald-200'
                        : isRightAdded
                        ? 'bg-emerald-950/35 text-emerald-200'
                        : row.rightType === 'empty'
                        ? 'bg-[#09090f]/70 text-transparent select-none'
                        : 'text-zinc-300'
                    }`}>
                      {/* Right Line Number */}
                      <span className="w-12 py-1 px-2 text-right text-[10px] text-zinc-600 bg-[#0e0e16] border-r border-[#1a1a26] select-none shrink-0 font-mono">
                        {row.rightLineNumber ?? ''}
                      </span>
                      {/* Right Sign */}
                      <span className="w-5 py-1 text-center font-bold select-none shrink-0 text-emerald-400">
                        {isRightAdded ? '+' : ''}
                      </span>
                      {/* Right Content */}
                      <span className="py-1 px-2 flex-1 whitespace-pre-wrap break-all font-mono">
                        {row.rightContent || (row.rightType === 'empty' ? ' ' : '')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        <div className="px-5 py-2.5 bg-[#141420] border-t border-[#242436] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-500/40 border border-rose-500/60 rounded"></span>
              <span>Linhas removidas no Teste B ({summary.removedCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500/40 border border-emerald-500/60 rounded"></span>
              <span>Linhas adicionadas no Teste B ({summary.addedCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500/40 border border-amber-500/60 rounded"></span>
              <span>Linhas alteradas ({summary.modifiedCount})</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Total avaliado:</span>
            <span className="text-zinc-300 font-bold">{displayedRows.length} linhas exibidas</span>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 px-3 py-1 rounded bg-[#202030] hover:bg-[#2c2c40] text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
