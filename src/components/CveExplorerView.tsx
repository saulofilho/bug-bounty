import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  ExternalLink, 
  Plus, 
  ShieldAlert, 
  RefreshCw, 
  Tag, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { CVERecord, Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

interface CveExplorerViewProps {
  onLinkToNewReport: (cve: CVERecord) => void;
}

export const CveExplorerView: React.FC<CveExplorerViewProps> = ({ onLinkToNewReport }) => {
  const [query, setQuery] = useState('');
  const [cves, setCves] = useState<CVERecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>('curated');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const searchCveApi = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cve/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results) {
        setCves(data.results);
        setSource(data.source || 'live_cve_database');
      }
    } catch (err) {
      console.error('Error fetching CVEs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchCveApi('');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchCveApi(query);
  };

  const quickFilters = [
    { label: 'Todos', query: '' },
    { label: 'RCE Críticos', query: 'Remote Code Execution' },
    { label: 'Auth Bypass', query: 'Authentication Bypass' },
    { label: 'SSRF & Cloud', query: 'SSRF' },
    { label: 'SQL Injection', query: 'SQL Injection' },
    { label: 'Log4Shell / Spring', query: 'Log4j' },
    { label: 'Atlassian / Confluence', query: 'Confluence' }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-[#0a0a0a] border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>NVD & CIRCL CVE Global Database</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-white">
            Base de Dados de CVEs & Vulnerabilidades Conhecidas
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Consulte vulnerabilidades conhecidas (Known Exploits), verifique pontuação CVSS, detalhes técnicos de CWE e vincule diretamente a novos relatórios de bug bounty em 1 clique.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-zinc-500 uppercase font-mono block tracking-wider">Feed Status</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {source === 'live_cve_database' ? 'Online CVE Feed' : 'Curated Bounty Dataset'}
          </span>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar por código (ex: CVE-2024-21413) ou software (ex: Fortinet, WordPress, Apache, Ivanti)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#262626] rounded text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Buscar</span>
          </button>
        </form>

        {/* Quick Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1 tracking-wider">Filtros Rápidos:</span>
          {quickFilters.map(filter => (
            <button
              key={filter.label}
              onClick={() => {
                setQuery(filter.query);
                searchCveApi(filter.query);
              }}
              className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-zinc-400 hover:text-white text-xs font-mono transition-all whitespace-nowrap"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* CVE Records Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center rounded-xl bg-[#0a0a0a] border border-[#262626] text-zinc-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Consultando bases de dados CVE...</span>
          </div>
        ) : cves.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#0a0a0a] border border-[#262626] text-zinc-500 text-xs">
            Nenhuma vulnerabilidade CVE encontrada para este termo de busca.
          </div>
        ) : (
          cves.map(cve => {
            const sevBadge = getSeverityBadgeColor(cve.severity as Severity);

            return (
              <div
                key={cve.id}
                className="p-5 rounded-xl bg-[#0a0a0a] border border-[#262626] hover:border-zinc-700 transition-all space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-[#121212] font-mono text-xs font-bold text-blue-400 border border-[#262626]">
                      {cve.id}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                      CVSS {cve.cvss} • {cve.severity}
                    </span>

                    <span className="text-xs text-zinc-400 bg-[#121212] border border-[#262626] px-2 py-0.5 rounded font-mono">
                      {cve.cwe}
                    </span>

                    <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {cve.published}
                    </span>
                  </div>

                  <button
                    onClick={() => onLinkToNewReport(cve)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Relatório Deste CVE</span>
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-zinc-200">
                  {cve.title}
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {cve.description}
                </p>

                {cve.references && cve.references.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-500 font-mono">
                    <span className="text-zinc-400 font-medium">Fontes Oficiais:</span>
                    {cve.references.slice(0, 3).map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate max-w-xs"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ref}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
