import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe,
  Radio,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Bookmark,
  BookmarkCheck,
  Share2,
  Filter,
  Sparkles,
  Zap,
  Info,
  Layers,
  ArrowUpRight,
  Target,
  FileText
} from 'lucide-react';
import { VulnerabilityReport } from '../types';

export interface ThreatArticle {
  id: string;
  title: string;
  source: 'BleepingComputer' | 'The Hacker News' | string;
  sourceUrl: string;
  publishedAt: string;
  category: '0-Day / Exploit' | 'Vulnerability' | 'Ransomware' | 'Data Breach' | 'Advisory' | string;
  severityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  summary: string;
  affectedVendors: string[];
  cves: string[];
  actionRecommendation: string;
}

interface RecentGlobalThreatIntelligenceProps {
  reports?: VulnerabilityReport[];
  onSelectCve?: (cveId: string) => void;
  onNavigateToCve?: () => void;
  onNewReport?: () => void;
}

export const RecentGlobalThreatIntelligence: React.FC<RecentGlobalThreatIntelligenceProps> = ({
  reports = [],
  onSelectCve,
  onNavigateToCve,
  onNewReport
}) => {
  // Articles and status
  const [articles, setArticles] = useState<ThreatArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [engineSource, setEngineSource] = useState<string>('Carregando inteligência...');
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isQuotaLimited, setIsQuotaLimited] = useState<boolean>(false);

  // Filters
  const [selectedSource, setSelectedSource] = useState<'all' | 'bleepingcomputer' | 'thehackernews'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [savedBookmarks, setSavedBookmarks] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('threat_intel_bookmarks');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Fetch threat intel headlines from server API
  const fetchHeadlines = useCallback(async (isRefresh = false) => {
    const sessionKey = `threat_intel_${selectedSource}_${selectedCategory}`;

    // Use session cache if available and not explicitly refreshing
    if (!isRefresh) {
      try {
        const cachedRaw = sessionStorage.getItem(sessionKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && Array.isArray(cached.articles) && cached.articles.length > 0) {
            setArticles(cached.articles);
            setLastUpdated(cached.lastUpdated || '');
            setEngineSource(cached.engine || 'Live Threat Feed');
            setIsQuotaLimited(!!cached.isQuotaLimited);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setErrorNotice(null);

    try {
      const url = new URL('/api/threat-intel/headlines', window.location.origin);
      if (selectedSource !== 'all') {
        url.searchParams.set('source', selectedSource);
      }
      if (selectedCategory !== 'all') {
        url.searchParams.set('category', selectedCategory);
      }
      if (isRefresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Falha ao buscar inteligência.`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.articles)) {
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setArticles(data.articles);
        setLastUpdated(timeStr);
        setEngineSource(data.engine || 'Google Search Tool Grounding');
        setIsQuotaLimited(!!data.isQuotaLimited);
        if (Array.isArray(data.searchQueries)) {
          setSearchQueries(data.searchQueries);
        }

        // Cache in session
        try {
          sessionStorage.setItem(sessionKey, JSON.stringify({
            articles: data.articles,
            lastUpdated: timeStr,
            engine: data.engine,
            isQuotaLimited: !!data.isQuotaLimited
          }));
        } catch {}
      } else {
        throw new Error('Formato inesperado retornado pelo feed de inteligência.');
      }
    } catch (err: any) {
      console.warn('Threat intelligence fetch notice:', err?.message || err);
      // Fallback silently without alarming users
    } finally {
      setLoading(false);
    }
  }, [selectedSource, selectedCategory]);

  // Initial fetch on mount
  useEffect(() => {
    fetchHeadlines(false);
  }, [fetchHeadlines]);

  // Toggle bookmark handler
  const toggleBookmark = (id: string) => {
    setSavedBookmarks(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('threat_intel_bookmarks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Client-side filtering
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      // Source filter
      if (selectedSource === 'bleepingcomputer' && !art.source.toLowerCase().includes('bleepingcomputer')) {
        return false;
      }
      if (selectedSource === 'thehackernews' && !art.source.toLowerCase().includes('hacker news') && !art.source.toLowerCase().includes('thehackernews')) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && art.category !== selectedCategory) {
        return false;
      }

      // Keyword search
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchesTitle = art.title.toLowerCase().includes(query);
        const matchesSummary = art.summary.toLowerCase().includes(query);
        const matchesVendor = art.affectedVendors.some(v => v.toLowerCase().includes(query));
        const matchesCve = art.cves.some(c => c.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSummary && !matchesVendor && !matchesCve) return false;
      }

      return true;
    });
  }, [articles, selectedSource, selectedCategory, searchKeyword]);

  // Top Critical Headline for Breaking Alert Banner
  const breakingAlert = useMemo(() => {
    return articles.find(a => a.severityLevel === 'CRITICAL' && (a.category.includes('0-Day') || a.category.includes('Ransomware') || a.category.includes('Vulnerability'))) || articles[0];
  }, [articles]);

  // Extract all unique vendors & CVEs
  const uniqueVendorsCount = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => a.affectedVendors.forEach(v => set.add(v)));
    return set.size;
  }, [articles]);

  const uniqueCvesCount = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => a.cves.forEach(c => set.add(c)));
    return set.size;
  }, [articles]);

  // Severity styling helper
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/15',
          text: 'text-red-400',
          border: 'border-red-500/30',
          dot: 'bg-red-500',
          label: 'CRITICAL'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-500/15',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
          dot: 'bg-orange-500',
          label: 'HIGH'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-500/15',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          dot: 'bg-yellow-500',
          label: 'MEDIUM'
        };
      default:
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          dot: 'bg-blue-500',
          label: 'INFO'
        };
    }
  };

  return (
    <div id="recent-threat-intelligence-card" className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-xl mb-8">
      {/* 1. Header with Live Pulse, Engine Badge & Refresh Button */}
      <div className="p-4 sm:p-6 border-b border-[#262626] bg-[#0d0f17]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide font-mono">
                    Recent Global Threat Intelligence
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/30 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    LIVE HEADLINES
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Notícias e avisos de segurança em tempo real com fontes de inteligência como BleepingComputer e The Hacker News
                </p>
              </div>
            </div>
          </div>

          {/* Right Controls & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-lg bg-[#141724] border border-[#22273d] text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isQuotaLimited ? 'text-amber-400' : 'text-emerald-400'} animate-pulse`} />
              <span className="text-zinc-300 font-bold truncate max-w-[200px] sm:max-w-none" title={engineSource}>
                {isQuotaLimited ? 'BleepingComputer & THN (Modo Otimizado)' : engineSource.includes('Google Search') ? 'Google Search Tool Grounding' : 'Live Threat Feed'}
              </span>
              {lastUpdated && <span className="text-zinc-500">({lastUpdated})</span>}
            </div>

            <button
              type="button"
              onClick={() => fetchHeadlines(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Buscar notícias mais recentes agora usando Google Search Tool"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Buscando...' : 'Atualizar Notícias'}</span>
            </button>
          </div>
        </div>

        {/* 2. Top Breaking Threat Alert Marquee Banner */}
        {breakingAlert && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/25 border border-red-600/30 flex items-center justify-between gap-3 font-mono text-xs text-red-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 rounded bg-red-500 text-black font-extrabold text-[10px] shrink-0 uppercase tracking-wide">
                DESTAQUE CRÍTICO
              </span>
              <span className="font-bold text-white truncate hover:underline cursor-pointer" onClick={() => window.open(breakingAlert.sourceUrl, '_blank')}>
                {breakingAlert.title}
              </span>
              <span className="text-zinc-400 text-[10px] hidden md:inline shrink-0">
                via {breakingAlert.source}
              </span>
            </div>

            <a
              href={breakingAlert.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
            >
              <span>Ler Artigo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* 3. Executive Threat Intelligence Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#1e2335]">
          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-[#22273d]">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Manchetes Monitoradas</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-white">{articles.length}</span>
              <span className="text-[10px] font-mono text-zinc-400">artigos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-red-500/20">
            <p className="text-[10px] font-mono text-red-400 uppercase">Avisos Críticos / 0-Days</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-red-400">
                {articles.filter(a => a.severityLevel === 'CRITICAL').length}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">em exploração</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-[#22273d]">
            <p className="text-[10px] font-mono text-indigo-400 uppercase">CVEs Identificadas</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-indigo-300">{uniqueCvesCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">vulnerabilidades</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141724]/80 border border-[#22273d]">
            <p className="text-[10px] font-mono text-emerald-400 uppercase">Tecnologias Afetadas</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-emerald-300">{uniqueVendorsCount}</span>
              <span className="text-[10px] font-mono text-zinc-400">vendors/softwares</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error notice if fallback occurred */}
      {errorNotice && (
        <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-600/30 text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button type="button" onClick={() => setErrorNotice(null)} className="text-amber-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 4. Filter Toolbar: Source Buttons, Category Tabs & Keyword Search */}
      <div className="p-3 sm:px-6 bg-[#0a0c14] border-b border-[#1f2436] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Source selector */}
        <div className="flex items-center gap-1 bg-[#131625] border border-[#23283c] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setSelectedSource('all')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
              selectedSource === 'all'
                ? 'bg-zinc-800 text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todas as Fontes
          </button>
          <button
            type="button"
            onClick={() => setSelectedSource('bleepingcomputer')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5 ${
              selectedSource === 'bleepingcomputer'
                ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>BleepingComputer</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSource('thehackernews')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5 ${
              selectedSource === 'thehackernews'
                ? 'bg-orange-600/30 text-orange-300 font-bold border border-orange-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>The Hacker News</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {['all', '0-Day / Exploit', 'Vulnerability', 'Ransomware', 'Data Breach'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-[#141726] text-zinc-400 border-[#23283c] hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Todas Categorias' : cat}
            </button>
          ))}
        </div>

        {/* Keyword Search Input */}
        <div className="relative min-w-[200px] max-w-xs w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por CVE, alvo, vendor..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-[#141726] border border-[#23283c] rounded-lg pl-8 pr-3 py-1 text-zinc-300 placeholder-zinc-500 text-xs focus:outline-none focus:border-red-500/50"
          />
        </div>
      </div>

      {/* 5. Article Feed Cards Grid */}
      <div className="p-4 sm:p-6 bg-[#0e1017]">
        {loading && articles.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 font-mono text-xs">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
            <p className="font-bold text-white text-sm">Consultando Google Search Tool...</p>
            <p className="text-zinc-500 mt-1">Buscando as últimas manchetes de cibersegurança e avisos críticos</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 font-mono text-xs">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-500" />
            <p>Nenhuma notícia encontrada com os filtros selecionados.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedSource('all');
                setSelectedCategory('all');
                setSearchKeyword('');
              }}
              className="mt-2 text-indigo-400 hover:underline"
            >
              Redefinir filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredArticles.map(article => {
              const sev = getSeverityBadge(article.severityLevel);
              const isBleeping = article.source.toLowerCase().includes('bleepingcomputer');
              const isTHN = article.source.toLowerCase().includes('hacker news') || article.source.toLowerCase().includes('thehackernews');
              const isBookmarked = !!savedBookmarks[article.id];

              return (
                <div
                  key={article.id}
                  className="bg-[#101320] border border-[#1e2338] hover:border-zinc-500/40 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    {/* Top Metadata Row */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#181d30]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Source Tag */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                            isBleeping
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : isTHN
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isBleeping ? 'bg-blue-400' : isTHN ? 'bg-orange-400' : 'bg-zinc-400'
                            }`}
                          />
                          {article.source}
                        </span>

                        {/* Category */}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#161a2b] text-zinc-300 border border-[#242b46]">
                          {article.category}
                        </span>

                        {/* Severity */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${sev.bg} ${sev.text} ${sev.border}`}>
                          {article.severityLevel}
                        </span>
                      </div>

                      {/* Right Actions (Time & Bookmark) */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {article.publishedAt}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(article.id)}
                          className="p-1 text-zinc-400 hover:text-yellow-400 transition-colors"
                          title={isBookmarked ? 'Remover dos favoritos' : 'Salvar manchete'}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-yellow-400" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Headline Title */}
                    <h4 className="mt-3 text-sm font-bold text-white font-mono leading-snug hover:text-indigo-300 transition-colors">
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1.5 group"
                      >
                        <span>{article.title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                      </a>
                    </h4>

                    {/* Executive Summary */}
                    <p className="mt-2 text-xs font-mono text-zinc-300 leading-relaxed">
                      {article.summary}
                    </p>

                    {/* Action Recommendation for Bug Hunters */}
                    {article.actionRecommendation && (
                      <div className="mt-3 p-2 rounded-lg bg-[#0b0d18] border border-[#1b213b] text-[11px] font-mono text-zinc-400 flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">
                          <strong className="text-zinc-200">Takeaway para Hunters: </strong>
                          {article.actionRecommendation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Row: Affected Tech & CVE Tags */}
                  <div className="mt-3 pt-2.5 border-t border-[#181d30] flex flex-wrap items-center justify-between gap-2">
                    {/* Affected Vendors */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-zinc-400">
                      {article.affectedVendors.map(vendor => (
                        <span
                          key={vendor}
                          className="px-1.5 py-0.5 rounded bg-[#161a29] text-zinc-300 border border-[#22283e]"
                        >
                          #{vendor}
                        </span>
                      ))}
                    </div>

                    {/* CVE Badges with direct search trigger */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {article.cves.map(cve => (
                        <button
                          key={cve}
                          type="button"
                          onClick={() => {
                            if (onSelectCve) {
                              onSelectCve(cve);
                            } else if (onNavigateToCve) {
                              onNavigateToCve();
                            }
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 transition-colors"
                          title={`Buscar detalhes de ${cve}`}
                        >
                          <span>{cve}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      ))}

                      {/* Direct Link to Article */}
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1"
                      >
                        <span>Fonte Original</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info banner */}
        <div className="mt-4 pt-3 border-t border-[#1c2033] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Inteligência de ameaças indexada via Google Search Tool Grounding consultando BleepingComputer e The Hacker News.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {searchQueries.length > 0 && (
              <span className="hidden sm:inline text-zinc-400 truncate max-w-xs" title={searchQueries.join(' • ')}>
                Buscas: {searchQueries[0]}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchHeadlines(true)}
              className="text-indigo-400 hover:underline"
            >
              Reconsultar feeds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
