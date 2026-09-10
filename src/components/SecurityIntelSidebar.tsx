import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  ShieldAlert, 
  Newspaper, 
  AlertTriangle, 
  Copy, 
  Check, 
  ChevronRight, 
  SlidersHorizontal, 
  Sparkles, 
  Radio, 
  X,
  FileText,
  Clock,
  BookOpen
} from 'lucide-react';
import { SecurityIntelResult, SecurityIntelSource } from '../types';

interface SecurityIntelSidebarProps {
  target: string;
  vulnerabilityType: string;
  cwe?: string;
  onClose?: () => void;
  onApplyToReportNotes?: (intelSnippet: string) => void;
}

export const SecurityIntelSidebar: React.FC<SecurityIntelSidebarProps> = ({
  target,
  vulnerabilityType,
  cwe,
  onClose,
  onApplyToReportNotes,
}) => {
  const [searchMode, setSearchMode] = useState<'all' | 'target_news' | 'vulnerability_advisories'>('all');
  const [customQuery, setCustomQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [intelResult, setIntelResult] = useState<SecurityIntelResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'report' | 'sources'>('report');

  const fetchIntel = async (mode = searchMode, query = customQuery) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/target-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          vulnerabilityType,
          cwe,
          query: query.trim(),
          mode,
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        setIntelResult(data);
      } else {
        setErrorMessage(data?.error || 'Erro ao carregar notícias e avisos de segurança.');
        if (data?.fallback) {
          setIntelResult({
            success: false,
            text: 'Ocorreu uma falha na consulta em tempo real, mas reunimos as principais referências públicas de contingência.',
            sources: data.fallback.sources || [],
            target,
            vulnerabilityType,
            timestamp: new Date().toISOString(),
            error: data.error,
          });
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha de conexão com a API de inteligência.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount or when target/vulnerability changes
  useEffect(() => {
    if (target || vulnerabilityType) {
      fetchIntel('all', '');
    }
  }, [target, vulnerabilityType]);

  const handleCopyText = () => {
    if (!intelResult?.text) return;
    const sourcesFormatted = intelResult.sources?.length
      ? `\n\n### Fontes Citadas:\n` + intelResult.sources.map(s => `- [${s.title}](${s.url})`).join('\n')
      : '';
    navigator.clipboard.writeText(intelResult.text + sourcesFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplySnippet = () => {
    if (!intelResult?.text || !onApplyToReportNotes) return;
    const snippet = `> 🌐 **Google Search Threat Intel (${target} - ${vulnerabilityType}):**\n` +
      intelResult.text.slice(0, 500) + '...\n';
    onApplyToReportNotes(snippet);
  };

  // Render markdown with styled blocks
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Heading 3
          if (trimmed.startsWith('### ')) {
            return (
              <div key={idx} className="pt-3 pb-1 border-b border-[#262626] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <h4 className="font-mono font-bold text-emerald-400 text-xs uppercase tracking-wide">
                  {trimmed.replace('### ', '')}
                </h4>
              </div>
            );
          }

          // Heading 2 or 1
          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-mono font-bold text-white text-sm pt-2">
                {trimmed.replace(/^#+\s*/, '')}
              </h3>
            );
          }

          // Bullet list
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.replace(/^[-*]\s*/, '');
            // Highlight bold parts
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-emerald-500 font-bold text-xs mt-0.5">•</span>
                <span className="flex-1 text-zinc-300">
                  {renderInlineFormatting(content)}
                </span>
              </div>
            );
          }

          // Numbered list
          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\.\s/)?.[1] || '•';
            const content = trimmed.replace(/^\d+\.\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-zinc-500 font-mono text-[10px] bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a] mt-0.5">
                  {num}
                </span>
                <span className="flex-1 text-zinc-300">
                  {renderInlineFormatting(content)}
                </span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-zinc-300">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineFormatting = (content: string) => {
    // Basic parser for **bold** and `code`
    const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 rounded bg-[#171717] border border-[#262626] text-emerald-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <aside 
      id="sidebar-security-intel" 
      className="w-full lg:w-96 flex flex-col bg-[#0d0d0d] border-t lg:border-t-0 lg:border-l border-[#262626] h-full shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#262626] bg-[#0f0f0f] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Globe className="w-3.5 h-3.5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                Google Search Intel
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">Notícias & Advisories Recentes</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchIntel(searchMode, customQuery)}
              disabled={isLoading}
              className="p-1.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
              title="Recarregar busca"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Fechar painel lateral"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Current Query Context Badges */}
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222] space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase text-zinc-500">Alvo Auditado:</span>
            <span className="text-emerald-400 font-bold truncate max-w-[170px]" title={target}>
              {target || 'Geral'}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase text-zinc-500">Falha / CWE:</span>
            <span className="text-zinc-200 truncate max-w-[170px]" title={vulnerabilityType}>
              {cwe ? `${cwe} - ` : ''}{vulnerabilityType}
            </span>
          </div>
        </div>

        {/* Search Mode Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#141414] p-0.5 rounded-lg border border-[#222] text-[10px] font-mono">
          <button
            type="button"
            onClick={() => {
              setSearchMode('all');
              fetchIntel('all', customQuery);
            }}
            className={`py-1 px-1.5 rounded text-center truncate transition-colors ${
              searchMode === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Ambos
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode('vulnerability_advisories');
              fetchIntel('vulnerability_advisories', customQuery);
            }}
            className={`py-1 px-1.5 rounded text-center truncate transition-colors ${
              searchMode === 'vulnerability_advisories'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Avisos de Segurança & CVEs"
          >
            Advisories
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode('target_news');
              fetchIntel('target_news', customQuery);
            }}
            className={`py-1 px-1.5 rounded text-center truncate transition-colors ${
              searchMode === 'target_news'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Notícias sobre o Alvo"
          >
            Notícias Alvo
          </button>
        </div>

        {/* Custom Refinement Search Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            fetchIntel(searchMode, customQuery);
          }}
          className="flex items-center gap-1.5"
        >
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Refinar busca (ex: 0-day, bypass)..."
              className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-500/60 rounded-lg pl-7 pr-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-emerald-400 text-xs font-mono font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => {
              setCustomQuery('writeup bug bounty disclosure');
              fetchIntel(searchMode, 'writeup bug bounty disclosure');
            }}
            className="px-1.5 py-0.5 rounded bg-[#161616] hover:bg-[#222] text-zinc-400 hover:text-emerald-400 border border-[#222] transition-colors"
          >
            + Writeups
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomQuery('CISA KEV exploitation');
              fetchIntel(searchMode, 'CISA KEV exploitation');
            }}
            className="px-1.5 py-0.5 rounded bg-[#161616] hover:bg-[#222] text-zinc-400 hover:text-emerald-400 border border-[#222] transition-colors"
          >
            + CISA KEV
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomQuery('security advisory CVE 2024');
              fetchIntel(searchMode, 'security advisory CVE 2024');
            }}
            className="px-1.5 py-0.5 rounded bg-[#161616] hover:bg-[#222] text-zinc-400 hover:text-emerald-400 border border-[#222] transition-colors"
          >
            + CVE 2024
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Report vs Sources */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0a0a0a] border-b border-[#262626] text-[11px] font-mono">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveViewTab('report')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeViewTab === 'report'
                ? 'bg-[#181818] text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Inteligência
          </button>
          <button
            type="button"
            onClick={() => setActiveViewTab('sources')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
              activeViewTab === 'sources'
                ? 'bg-[#181818] text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Fontes Web</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
              {intelResult?.sources?.length || 0}
            </span>
          </button>
        </div>

        {intelResult?.timestamp && (
          <span className="text-[9px] text-zinc-500 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {new Date(intelResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Sidebar Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="p-6 text-center space-y-3">
            <div className="relative w-10 h-10 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-zinc-200">Consultando Google Search...</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Rastreando notícias e avisos de segurança para <strong className="text-zinc-400">{target}</strong>
              </p>
            </div>
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong className="block font-bold">Aviso na Consulta:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {intelResult?.warning && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="text-[11px] leading-tight block">{intelResult.warning}</span>
            </div>
          </div>
        )}

        {/* Search Queries Badges */}
        {intelResult?.searchQueries && intelResult.searchQueries.length > 0 && (
          <div className="space-y-1.5 p-2.5 rounded-lg bg-[#121212] border border-[#222]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide block">
              Consultas Executadas no Google Search:
            </span>
            <div className="flex flex-wrap gap-1">
              {intelResult.searchQueries.map((q, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-0.5 rounded bg-[#181818] border border-[#2a2a2a] text-emerald-300 text-[10px] font-mono truncate max-w-full"
                  title={q}
                >
                  🔍 {q}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Full Structured Report */}
        {activeViewTab === 'report' && intelResult && !isLoading && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#111] border border-[#262626]">
              {renderFormattedMarkdown(intelResult.text)}
            </div>

            {/* Inline Quick Sources preview */}
            {intelResult.sources && intelResult.sources.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    Fontes de Notícias & Advisories ({intelResult.sources.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('sources')}
                    className="text-[10px] font-mono text-emerald-400 hover:underline"
                  >
                    Ver Todas
                  </button>
                </div>

                <div className="space-y-1.5">
                  {intelResult.sources.slice(0, 3).map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] border border-[#222] hover:border-emerald-500/30 transition-all text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-zinc-200 group-hover:text-emerald-300 font-medium truncate block">
                          {src.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate block font-mono">
                          {src.url.replace(/^https?:\/\//, '').split('/')[0]}
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sources Only View */}
        {activeViewTab === 'sources' && intelResult && !isLoading && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono text-zinc-400">
                Páginas Web e Boletins Verificados
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {intelResult.sources?.length || 0} fontes
              </span>
            </div>

            {(!intelResult.sources || intelResult.sources.length === 0) ? (
              <div className="p-4 text-center text-zinc-500 text-xs font-mono">
                Nenhuma fonte com link direto retornada nesta busca.
              </div>
            ) : (
              <div className="space-y-2">
                {intelResult.sources.map((src, idx) => {
                  let hostname = '';
                  try {
                    hostname = new URL(src.url).hostname;
                  } catch {
                    hostname = src.url;
                  }

                  return (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-3 rounded-xl bg-[#121212] hover:bg-[#181818] border border-[#262626] hover:border-emerald-500/40 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 leading-snug line-clamp-2">
                            {src.title}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400/80 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Globe className="w-2.5 h-2.5" />
                            {hostname}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-[#0d0d0d] border-t border-[#262626] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCopyText}
          disabled={!intelResult?.text}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#161616] hover:bg-[#222] border border-[#2a2a2a] text-zinc-300 hover:text-white text-xs font-mono transition-colors disabled:opacity-50"
          title="Copiar relatório e fontes para a área de transferência"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado!' : 'Copiar Intel'}</span>
        </button>

        {onApplyToReportNotes && (
          <button
            type="button"
            onClick={handleApplySnippet}
            disabled={!intelResult?.text}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
            title="Anexar um resumo da inteligência às notas do relatório"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Citar no Relatório</span>
          </button>
        )}
      </div>
    </aside>
  );
};
