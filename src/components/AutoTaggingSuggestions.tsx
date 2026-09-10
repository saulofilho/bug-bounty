import React from 'react';
import { 
  Tag, 
  Sparkles, 
  ShieldAlert, 
  Database, 
  BookOpen, 
  Check, 
  Plus, 
  ArrowUpRight, 
  Zap,
  Info,
  Loader2
} from 'lucide-react';
import { AutoTagSuggestion } from '../types';

interface AutoTaggingSuggestionsProps {
  suggestion: AutoTagSuggestion | null;
  isLoading: boolean;
  activeTags: string[];
  currentCwe: string;
  currentCves: string[];
  onApplyCwe: (cweIdAndName: string, cvssVector?: string) => void;
  onApplyCve: (cveId: string) => void;
  onApplyTag: (tag: string) => void;
  onApplyAllTags: (tags: string[]) => void;
  onTriggerAnalysis: () => void;
}

export const AutoTaggingSuggestions: React.FC<AutoTaggingSuggestionsProps> = ({
  suggestion,
  isLoading,
  activeTags,
  currentCwe,
  currentCves,
  onApplyCwe,
  onApplyCve,
  onApplyTag,
  onApplyAllTags,
  onTriggerAnalysis
}) => {
  if (!suggestion && !isLoading) {
    return (
      <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-zinc-300 font-medium">
            Tagging Automático: Analise a descrição para sugerir CWE, CVEs e tags baseadas na sua documentação técnica.
          </span>
        </div>
        <button
          type="button"
          onClick={onTriggerAnalysis}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-mono text-[11px] font-semibold transition-all shrink-0 uppercase tracking-wider"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sugerir Tags & CWE/CVE</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[#0e0e0e] border border-emerald-500/30 p-4 space-y-4 shadow-lg transition-all">
      
      {/* Top Header of Suggestions Engine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Motor de Tagging & Correlação CWE/CVE
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] border border-emerald-500/20">
                Baseado em Documentação
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {suggestion?.analysisSummary || 'Analisando correlações conceituais com a biblioteca de documentos...'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onTriggerAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-emerald-400 transition-colors uppercase tracking-wider self-end sm:self-center"
        >
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>{isLoading ? 'Analisando...' : 'Reavaliar'}</span>
        </button>
      </div>

      {suggestion && (
        <div className="space-y-4">
          
          {/* Section 1: Suggested Tags */}
          {suggestion.suggestedTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-emerald-400" />
                  Tags Técnicas Recomendadas
                </span>
                <button
                  type="button"
                  onClick={() => onApplyAllTags(suggestion.suggestedTags)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono underline"
                >
                  + Aplicar Todas as Tags
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {suggestion.suggestedTags.map((tag) => {
                  const isSelected = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onApplyTag(tag)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1.5 border ${
                        isSelected 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                          : 'bg-[#141414] hover:bg-[#1a1a1a] text-zinc-300 hover:text-white border-[#262626]'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-zinc-500" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Suggested CWE Categories */}
          {suggestion.suggestedCwes.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-emerald-400" />
                Categorias CWE Identificadas
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {suggestion.suggestedCwes.map((cweItem) => {
                  const isApplied = currentCwe.includes(cweItem.id);
                  const confidencePct = Math.round(cweItem.confidence * 100);

                  return (
                    <div 
                      key={cweItem.id}
                      className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-2.5 ${
                        isApplied 
                          ? 'bg-emerald-950/20 border-emerald-500/40' 
                          : 'bg-[#121212] border-[#262626] hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {cweItem.id}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {confidencePct}% afinidade
                            </span>
                          </div>

                          {cweItem.owaspCategory && (
                            <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[150px]" title={cweItem.owaspCategory}>
                              {cweItem.owaspCategory.split(' - ')[0]}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-semibold text-zinc-200 leading-snug">
                          {cweItem.name}
                        </h4>

                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                          {cweItem.explanation || cweItem.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#1e1e1e]">
                        <span className="text-[9px] font-mono text-zinc-500">
                          {cweItem.recommendedCvssVector ? 'CVSS 3.1 sugerido' : 'Taxonomia oficial'}
                        </span>

                        <button
                          type="button"
                          onClick={() => onApplyCwe(`${cweItem.id}: ${cweItem.name}`, cweItem.recommendedCvssVector)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1 transition-all ${
                            isApplied
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                              : 'bg-[#1a1a1a] hover:bg-emerald-600 text-zinc-200 hover:text-white border border-[#333]'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Aplicado</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Aplicar CWE</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Suggested Correlated CVEs */}
          {suggestion.suggestedCves.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Database className="w-3 h-3 text-emerald-400" />
                CVEs Correlacionados para Referência Técnica
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {suggestion.suggestedCves.map((cve) => {
                  const isLinked = currentCves.includes(cve.id);
                  return (
                    <div
                      key={cve.id}
                      className="p-2.5 rounded bg-[#121212] border border-[#262626] flex flex-col justify-between gap-1.5 text-[11px]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-blue-400 text-xs">
                            {cve.id}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                            CVSS {cve.cvss}
                          </span>
                        </div>
                        <p className="text-zinc-300 font-medium line-clamp-1 mt-0.5" title={cve.title}>
                          {cve.title}
                        </p>
                        <p className="text-zinc-500 text-[10px] line-clamp-2 mt-0.5">
                          {cve.relevance}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onApplyCve(cve.id)}
                        disabled={isLinked}
                        className={`w-full mt-1 py-1 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-all ${
                          isLinked
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                            : 'bg-[#181818] hover:bg-[#202020] text-zinc-300 hover:text-emerald-400 border border-[#2a2a2a]'
                        }`}
                      >
                        {isLinked ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Já Vinculado</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Vincular CVE</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Existing Documentation Matches */}
          {suggestion.matchedDocs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-emerald-400" />
                Documentação Técnica Vinculada (Sua Biblioteca)
              </span>

              <div className="space-y-1.5">
                {suggestion.matchedDocs.map((doc) => (
                  <div 
                    key={doc.id}
                    className="p-2.5 rounded bg-[#121212] border border-[#262626] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">
                          {doc.title}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 bg-[#171717] px-1.5 py-0.5 rounded border border-[#2a2a2a]">
                          {doc.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 italic">
                        "{doc.relevanceSnippet}"
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {doc.matchScore}% Match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
