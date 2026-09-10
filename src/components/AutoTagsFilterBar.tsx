import React, { useState } from 'react';
import { 
  Tag, 
  Sparkles, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { TagSummaryItem } from '../utils/taggingEngine';

interface AutoTagsFilterBarProps {
  availableTags: TagSummaryItem[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  totalReports: number;
  filteredReportsCount: number;
}

export const AutoTagsFilterBar: React.FC<AutoTagsFilterBarProps> = ({
  availableTags,
  selectedTag,
  onSelectTag,
  totalReports,
  filteredReportsCount
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showInfo, setShowInfo] = useState(false);

  // Group categories
  const categories = ['ALL', 'Vulnerabilidade', 'Superfície', 'Impacto', 'Infraestrutura'];

  const filteredTags = availableTags.filter(item => {
    if (categoryFilter === 'ALL') return true;
    return item.category === categoryFilter;
  });

  return (
    <div className="rounded-xl bg-[#0d0d0d] border border-[#222222] overflow-hidden transition-all shadow-sm">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-[#121212] border-b border-[#202020] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Tags Automáticas & Categorização
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-mono">
                {availableTags.length} tags ativas
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Extração inteligente de categorias a partir de termos no título e na descrição.
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Info trigger */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded text-xs transition-colors border ${
              showInfo 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#2b2b2b]'
            }`}
            title="Como funciona a categorização automática por palavras-chave"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Reset tag button if active */}
          {selectedTag && (
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Limpar Tag ({selectedTag})</span>
            </button>
          )}

          {/* Collapse/Expand */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-[#2b2b2b] transition-colors"
          >
            {isCollapsed ? (
              <>
                <span>Expandir Tags</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Recolher</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explanatory Info Card (Collapsible) */}
      {showInfo && (
        <div className="px-4 py-3 bg-emerald-950/20 border-b border-emerald-500/20 text-xs text-zinc-300 space-y-1.5 font-sans">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold">
            <Tag className="w-3.5 h-3.5" />
            <span>Sistema de Reconhecimento Automático de Palavras-Chave</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            O motor analisa dinamicamente cada relatório buscando padrões de ataque e fraquezas (ex: <em>IDOR</em>, <em>SSRF</em>, <em>SQL Injection</em>, <em>XSS</em>, <em>Auth Bypass</em>, <em>Data Leak</em>, <em>API Security</em>, <em>Cloud</em>). 
            Ao clicar em qualquer tag, a listagem e a busca são filtradas instantaneamente pelo achado correspondente.
          </p>
        </div>
      )}

      {/* Body Content */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs border-b border-[#1c1c1c] pb-2.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mr-1">
              Categoria:
            </span>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  categoryFilter === cat
                    ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                    : 'bg-[#161616] text-zinc-400 hover:text-zinc-200 border border-[#262626]'
                }`}
              >
                {cat === 'ALL' ? 'Todas' : cat}
              </button>
            ))}

            {selectedTag && (
              <div className="ml-auto text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span>Filtro:</span>
                <strong className="text-white bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#333]">
                  {selectedTag}
                </strong>
                <span className="text-zinc-500">
                  ({filteredReportsCount} {filteredReportsCount === 1 ? 'relatório' : 'relatórios'})
                </span>
              </div>
            )}
          </div>

          {/* Tags Chips Cloud */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* "All" Tag Button */}
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedTag === null
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-semibold'
                  : 'bg-[#151515] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#1a1a1a]'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-zinc-400 font-mono">
                {totalReports}
              </span>
            </button>

            {/* Individual Tag Buttons */}
            {filteredTags.map(item => {
              const isSelected = selectedTag === item.tag;

              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => onSelectTag(isSelected ? null : item.tag)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-md font-bold ring-2 ring-emerald-500/40'
                      : `${item.color.bg} ${item.color.text} ${item.color.border} hover:brightness-125`
                  }`}
                  title={`${item.label} (${item.category}): ${item.count} ${item.count === 1 ? 'relatório' : 'relatórios'}`}
                >
                  {item.isAuto && (
                    <Sparkles className={`w-3 h-3 ${isSelected ? 'text-emerald-700' : 'opacity-70'}`} />
                  )}
                  <span>{item.tag}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-black/10 text-black' : 'bg-black/30 opacity-80'
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
