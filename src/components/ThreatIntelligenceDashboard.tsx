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
  FileText,
  Copy,
  Plus,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Check,
  ShieldCheck,
  Tag,
  Crosshair,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';

export interface SecurityAdvisoryItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  publishedDate: string;
  severity: Severity;
  category: string;
  cveIds: string[];
  cweIds: string[];
  affectedVendors: string[];
  summary: string;
  technicalExploitContext: string;
  bugBountyContext: string;
  matchedVulnerabilityTypes?: string[];
  remediation?: string;
}

export interface ThreatIntelligenceDashboardProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReportWithAdvisory?: (advisoryData: Partial<VulnerabilityReport>) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

export const ThreatIntelligenceDashboard: React.FC<ThreatIntelligenceDashboardProps> = ({
  reports = [],
  onSelectReport,
  onNewReportWithAdvisory,
  onNavigateToReports,
  className = ''
}) => {
  // Feed state
  const [advisories, setAdvisories] = useState<SecurityAdvisoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [engineSource, setEngineSource] = useState<string>('Buscando feeds em tempo real...');
  const [isLiveSearch, setIsLiveSearch] = useState<boolean>(false);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>([]);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Filter state
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedReportContextId, setSelectedReportContextId] = useState<string>('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [expandedAdvisoryId, setExpandedAdvisoryId] = useState<string | null>(null);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('threat_intel_advisory_bookmarks');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Selected report for specific context
  const selectedContextReport = useMemo(() => {
    if (selectedReportContextId === 'all') return null;
    return reports.find(r => r.id === selectedReportContextId) || null;
  }, [reports, selectedReportContextId]);

  // Fetch security advisory feeds from server API (with Google Search Grounding via Gemini)
  const fetchAdvisories = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    setErrorNotice(null);

    try {
      // Build vulnerability context to send to the server
      const vulnerabilityContexts = reports.slice(0, 12).map(r => ({
        id: r.id,
        title: r.title,
        target: r.target,
        vulnerabilityType: r.vulnerabilityType,
        cwe: r.cwe,
        severity: r.severity
      }));

      const payloadBody: Record<string, any> = {
        query: searchKeyword.trim(),
        category: selectedCategory,
        vulnerabilityContexts
      };

      if (selectedContextReport) {
        payloadBody.targetFilter = selectedContextReport.target;
        payloadBody.vulnTypeFilter = selectedContextReport.vulnerabilityType;
      }

      const response = await fetch('/api/threat-intel/advisories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Falha ao consultar feeds de inteligência de ameaças.`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.advisories)) {
        setAdvisories(data.advisories);
        setEngineSource(data.engine || 'Live Security Advisory Feed');
        setIsLiveSearch(!!data.isLiveSearch);
        setSources(data.sources || []);
        setSearchQueries(data.searchQueries || []);
        setLastUpdated(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        throw new Error('Formato de resposta inesperado.');
      }
    } catch (err: any) {
      console.error('ThreatIntelligenceDashboard fetch error:', err);
      setErrorNotice(err.message || 'Falha ao buscar feeds de segurança.');
    } finally {
      setLoading(false);
    }
  }, [reports, searchKeyword, selectedCategory, selectedContextReport]);

  // Initial load
  useEffect(() => {
    fetchAdvisories();
  }, [fetchAdvisories]);

  // Toggle bookmark
  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('threat_intel_advisory_bookmarks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Helper to cross-reference an advisory against user's existing vulnerability reports
  const getCorrelatedReportsForAdvisory = useCallback((advisory: SecurityAdvisoryItem) => {
    if (!reports.length) return [];

    const matches: Array<{
      report: VulnerabilityReport;
      matchReason: string;
      matchType: 'direct_cwe' | 'target_domain' | 'vuln_class' | 'cve';
      confidenceScore: number;
    }> = [];

    const advText = `${advisory.title} ${advisory.summary} ${advisory.technicalExploitContext} ${(advisory.matchedVulnerabilityTypes || []).join(' ')}`.toLowerCase();
    const advCves = (advisory.cveIds || []).map(c => c.toLowerCase());
    const advCwes = (advisory.cweIds || []).map(c => c.toLowerCase());
    const advVendors = (advisory.affectedVendors || []).map(v => v.toLowerCase());

    reports.forEach(report => {
      let matchType: 'direct_cwe' | 'target_domain' | 'vuln_class' | 'cve' | null = null;
      let matchReason = '';
      let score = 0;

      // 1. Direct CVE match
      if (report.cveIds && report.cveIds.length > 0) {
        const hasCveMatch = report.cveIds.some(c => advCves.includes(c.toLowerCase()));
        if (hasCveMatch) {
          matchType = 'cve';
          matchReason = `CVE idêntica referenciada (${report.cveIds.join(', ')})`;
          score = 100;
        }
      }

      // 2. Direct CWE match
      if (!matchType && report.cwe) {
        const reportCweNormalized = report.cwe.toLowerCase();
        const hasCweMatch = advCwes.some(c => c.includes(reportCweNormalized) || reportCweNormalized.includes(c.split(':')[0]));
        if (hasCweMatch) {
          matchType = 'direct_cwe';
          matchReason = `Mesma classe de fraqueza técnica (${report.cwe})`;
          score = 85;
        }
      }

      // 3. Target domain match
      if (!matchType && report.target) {
        const targetClean = report.target.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
        const hasVendorMatch = advVendors.some(v => targetClean.includes(v) || v.includes(targetClean));
        if (hasVendorMatch) {
          matchType = 'target_domain';
          matchReason = `Alvo ou vendor associado ao ativo auditado (${report.target})`;
          score = 80;
        }
      }

      // 4. Vulnerability family / class match
      if (!matchType && report.vulnerabilityType) {
        const typeTokens = report.vulnerabilityType.toLowerCase().split(/[\s/]+/);
        const hasTypeMatch = typeTokens.some(tok => tok.length > 3 && advText.includes(tok));
        if (hasTypeMatch) {
          matchType = 'vuln_class';
          matchReason = `Padrão de exploração similar para ${report.vulnerabilityType}`;
          score = 65;
        }
      }

      if (matchType) {
        matches.push({
          report,
          matchReason,
          matchType,
          confidenceScore: score
        });
      }
    });

    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }, [reports]);

  // Correlated statistics across all advisories
  const portfolioCorrelationStats = useMemo(() => {
    let totalCorrelatedAdvisories = 0;
    const matchedReportIds = new Set<string>();
    let criticalThreatsCount = 0;
    let cisaKevMatchesCount = 0;

    advisories.forEach(adv => {
      const correlated = getCorrelatedReportsForAdvisory(adv);
      if (correlated.length > 0) {
        totalCorrelatedAdvisories++;
        correlated.forEach(c => matchedReportIds.add(c.report.id));
      }
      if (adv.severity === 'CRITICAL') {
        criticalThreatsCount++;
      }
      if (adv.source.toLowerCase().includes('cisa') || adv.category.toLowerCase().includes('kev')) {
        cisaKevMatchesCount++;
      }
    });

    return {
      totalCorrelatedAdvisories,
      totalMatchedReports: matchedReportIds.size,
      criticalThreatsCount,
      cisaKevMatchesCount
    };
  }, [advisories, getCorrelatedReportsForAdvisory]);

  // Filtered advisories list
  const filteredAdvisories = useMemo(() => {
    return advisories.filter(advisory => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'zero_day' && !advisory.category.toLowerCase().includes('zero-day') && !advisory.category.toLowerCase().includes('exploit')) {
          return false;
        }
        if (selectedCategory === 'cisa_kev' && !advisory.source.toLowerCase().includes('cisa') && !advisory.title.toLowerCase().includes('cisa')) {
          return false;
        }
        if (selectedCategory === 'api_web' && !advisory.category.toLowerCase().includes('api') && !advisory.category.toLowerCase().includes('access') && !advisory.category.toLowerCase().includes('auth')) {
          return false;
        }
        if (selectedCategory === 'ransomware' && !advisory.category.toLowerCase().includes('ransomware') && !advisory.title.toLowerCase().includes('ransomware')) {
          return false;
        }
        if (selectedCategory === 'bookmarked' && !bookmarkedIds[advisory.id]) {
          return false;
        }
      }

      // Severity filter
      if (selectedSeverityFilter !== 'all' && advisory.severity !== selectedSeverityFilter) {
        return false;
      }

      // Specific report context filter
      if (selectedReportContextId !== 'all') {
        const correlated = getCorrelatedReportsForAdvisory(advisory);
        const matchesSelected = correlated.some(c => c.report.id === selectedReportContextId);
        if (!matchesSelected) return false;
      }

      // Search keyword filter
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const inTitle = advisory.title.toLowerCase().includes(q);
        const inSummary = advisory.summary.toLowerCase().includes(q);
        const inVendor = (advisory.affectedVendors || []).some(v => v.toLowerCase().includes(q));
        const inCve = (advisory.cveIds || []).some(c => c.toLowerCase().includes(q));
        const inSource = advisory.source.toLowerCase().includes(q);
        if (!inTitle && !inSummary && !inVendor && !inCve && !inSource) {
          return false;
        }
      }

      return true;
    });
  }, [advisories, selectedCategory, selectedSeverityFilter, selectedReportContextId, searchKeyword, bookmarkedIds, getCorrelatedReportsForAdvisory]);

  // Copy advisory citation for bug bounty report
  const handleCopyCitation = (advisory: SecurityAdvisoryItem) => {
    const citation = `### 🛡️ Contexto de Ameaça & Inteligência em Tempo Real (Google Search Grounding)
- **Aviso Oficial**: ${advisory.title}
- **Fonte de Autoridade**: [${advisory.source}](${advisory.sourceUrl})
- **Data de Divulgação**: ${advisory.publishedDate}
- **Classificação de Severidade**: ${advisory.severity} (Exploração Ativa no Mundo Real)
- **CVEs Relacionadas**: ${(advisory.cveIds || []).join(', ') || 'N/A'}
- **CWEs Associadas**: ${(advisory.cweIds || []).join(', ') || 'N/A'}
- **Vetor de Exploração / Mecanismo Técnico**:
${advisory.technicalExploitContext}
- **Justificativa de Impacto para Triagem**:
${advisory.bugBountyContext}
- **Recomendação de Correção**:
${advisory.remediation || 'Aplicar as diretrizes de atualização do fornecedor oficial.'}`;

    navigator.clipboard.writeText(citation);
    setCopiedCitationId(advisory.id);
    setTimeout(() => setCopiedCitationId(null), 2500);
  };

  // Quick action: Create new draft report from this advisory
  const handleCreateReportFromAdvisory = (advisory: SecurityAdvisoryItem) => {
    if (onNewReportWithAdvisory) {
      const primaryCve = advisory.cveIds?.[0] || '';
      const primaryCwe = advisory.cweIds?.[0] || 'CWE-20: Improper Input Validation';
      const initialTitle = primaryCve 
        ? `[${primaryCve}] ${advisory.title}`
        : advisory.title;

      onNewReportWithAdvisory({
        title: initialTitle,
        vulnerabilityType: advisory.matchedVulnerabilityTypes?.[0] || advisory.category || 'Known Exploit',
        severity: advisory.severity,
        cwe: primaryCwe,
        cveIds: advisory.cveIds || [],
        summary: advisory.summary,
        businessImpact: advisory.bugBountyContext,
        remediation: advisory.remediation || 'Aplicar os patches recomendados pelo fornecedor oficial.',
        proofOfConcept: `# Prova de Conceito baseada no Aviso Oficial: ${advisory.title}\n# Fonte: ${advisory.sourceUrl}\n\n# Contexto Técnico de Exploração:\n# ${advisory.technicalExploitContext.replace(/\n/g, '\n# ')}`
      });
    }
  };

  return (
    <div
      id="threat-intelligence-dashboard-root"
      className={`bg-[#0a0c14] border border-[#1b2034] rounded-2xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Top Header & Telemetry Bar */}
      <div className="p-4 sm:p-6 border-b border-[#1b2034] bg-[#0e1220]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-blue-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Threat Intelligence Dashboard</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE SEARCH FEEDS
                </span>
                {isLiveSearch && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Google Search Tool Grounding
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                Monitoramento em tempo real de Security Advisories oficiais (CISA, NVD/NIST, CERTs e fornecedores) contextualizados diretamente com seu portfólio de vulnerabilidades ativas.
              </p>
            </div>
          </div>

          {/* Quick Refresh & Telemetry Status */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              id="threat-intel-refresh-btn"
              type="button"
              onClick={() => fetchAdvisories(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-[#141828] hover:bg-[#1a2036] border border-[#242c48] text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Recarregar feeds em tempo real via Google Search"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Consultando Google Search...' : 'Atualizar Feeds'}</span>
            </button>

            {lastUpdated && (
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 bg-[#090b12] px-2.5 py-1 rounded-lg border border-[#1b2034]">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>Atualizado às {lastUpdated}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Context Correlation KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#1a2038]">
          <div className="bg-[#090b14]/80 border border-[#1b2034] rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Avisos Ativos</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1 font-mono">{advisories.length}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Feeds oficiais indexados</div>
          </div>

          <div className="bg-[#090b14]/80 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Correlacionados</span>
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
              {portfolioCorrelationStats.totalCorrelatedAdvisories}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">
              Conectados a {portfolioCorrelationStats.totalMatchedReports} dos seus relatórios
            </div>
          </div>

          <div className="bg-[#090b14]/80 border border-rose-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">Ameaças Críticas</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-400 mt-1 font-mono">
              {portfolioCorrelationStats.criticalThreatsCount}
            </div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">Explorações 0-Day / RCE ativas</div>
          </div>

          <div className="bg-[#090b14]/80 border border-amber-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">Alertas CISA / KEV</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
              {portfolioCorrelationStats.cisaKevMatchesCount}
            </div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Diretivas governamentais ativas</div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="p-4 sm:p-5 bg-[#0b0e19] border-b border-[#1b2034] flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Real-time search query input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="threat-intel-search-input"
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Pesquisar por alvo, CVE (ex: CVE-2024-3400), tecnologia (ex: Confluence, Palo Alto, Spring) ou CWE..."
              className="w-full bg-[#070910] border border-[#1d233c] focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Contextualize by Existing Vulnerability Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="context-report-selector" className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contexto do Relatório:</span>
            </label>
            <select
              id="context-report-selector"
              value={selectedReportContextId}
              onChange={(e) => setSelectedReportContextId(e.target.value)}
              className="bg-[#070910] border border-[#1d233c] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60 max-w-[280px] truncate"
            >
              <option value="all">🔍 Todos os Relatórios (Visão Ampla)</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.id} • {report.title.slice(0, 32)}... ({report.vulnerabilityType})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills & Categories */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              id="filter-category-all"
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-[#070910] text-zinc-400 hover:text-zinc-200 border border-[#1b2034]'
              }`}
            >
              Todos os Avisos ({advisories.length})
            </button>
            <button
              id="filter-category-zero-day"
              type="button"
              onClick={() => setSelectedCategory('zero_day')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'zero_day'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-[#070910] text-zinc-400 hover:text-zinc-200 border border-[#1b2034]'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              <span>0-Day & Explorações</span>
            </button>
            <button
              id="filter-category-cisa-kev"
              type="button"
              onClick={() => setSelectedCategory('cisa_kev')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'cisa_kev'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-[#070910] text-zinc-400 hover:text-zinc-200 border border-[#1b2034]'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>CISA KEV / Alertas</span>
            </button>
            <button
              id="filter-category-api-web"
              type="button"
              onClick={() => setSelectedCategory('api_web')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'api_web'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-[#070910] text-zinc-400 hover:text-zinc-200 border border-[#1b2034]'
              }`}
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>APIs & Broken Access (IDOR)</span>
            </button>
            <button
              id="filter-category-ransomware"
              type="button"
              onClick={() => setSelectedCategory('ransomware')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'ransomware'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'bg-[#070910] text-zinc-400 hover:text-zinc-200 border border-[#1b2034]'
              }`}
            >
              <Cpu className="w-3 h-3 text-purple-400" />
              <span>Ransomware & Perímetro</span>
            </button>
            <button
              id="filter-category-bookmarked"
              type="button"
              onClick={() => setSelectedCategory('bookmarked')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'bookmarked'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-[#070910] text-zinc-400 hover:text-zinc-200 border border-[#1b2034]'
              }`}
            >
              <Bookmark className="w-3 h-3 text-amber-400" />
              <span>Salvos ({Object.values(bookmarkedIds).filter(Boolean).length})</span>
            </button>
          </div>

          {/* Severity filter selector */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Severidade:</span>
            <select
              id="threat-intel-severity-filter"
              value={selectedSeverityFilter}
              onChange={(e) => setSelectedSeverityFilter(e.target.value)}
              className="bg-[#070910] border border-[#1d233c] rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Active Context Banner when a report is selected */}
        {selectedContextReport && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                <Crosshair className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white">Contexto Ativo:</span>{' '}
                <span className="text-emerald-300 font-semibold">{selectedContextReport.id}</span> •{' '}
                <span className="text-zinc-200">{selectedContextReport.title}</span>{' '}
                <span className="text-zinc-400">({selectedContextReport.target} | {selectedContextReport.vulnerabilityType})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReportContextId('all')}
              className="px-2.5 py-1 rounded bg-[#101424] hover:bg-[#182038] text-[11px] font-semibold text-zinc-300 border border-[#242e50] transition-colors"
            >
              Limpar Filtro de Contexto
            </button>
          </div>
        )}
      </div>

      {/* Advisories Feed List */}
      <div className="p-4 sm:p-6 space-y-4">
        {loading && advisories.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Consultando Feeds Oficiais de Segurança via Google Search...</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Recuperando alertas recentes de CISA, NVD/NIST, CERTs e correlacionando com seu inventário de vulnerabilidades.
            </p>
          </div>
        ) : filteredAdvisories.length === 0 ? (
          <div className="py-12 text-center bg-[#080a12] border border-[#1b2034] rounded-xl p-6">
            <Info className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-zinc-300">Nenhum aviso encontrado para os filtros selecionados</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Tente ajustar o termo de pesquisa, remover filtros de severidade ou selecionar "Todos os Relatórios".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchKeyword('');
                setSelectedCategory('all');
                setSelectedSeverityFilter('all');
                setSelectedReportContextId('all');
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-[#141828] text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-[#1b2238] transition-colors"
            >
              Redefinir Filtros
            </button>
          </div>
        ) : (
          filteredAdvisories.map((advisory) => {
            const isExpanded = expandedAdvisoryId === advisory.id;
            const isBookmarked = !!bookmarkedIds[advisory.id];
            const correlatedReports = getCorrelatedReportsForAdvisory(advisory);
            const hasCorrelation = correlatedReports.length > 0;

            return (
              <div
                key={advisory.id}
                id={`advisory-card-${advisory.id}`}
                className={`bg-[#0c0f1d] border transition-all rounded-xl overflow-hidden ${
                  hasCorrelation
                    ? 'border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                    : 'border-[#1b2034] hover:border-[#2b3352]'
                }`}
              >
                {/* Advisory Main Bar */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Badges: Severity, Source, Category, Date */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${getSeverityBadgeColor(advisory.severity)}`}>
                          {advisory.severity}
                        </span>

                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#161c2e] text-zinc-300 border border-[#242e4c]">
                          {advisory.source}
                        </span>

                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#121624] text-zinc-400 border border-[#1b2034]">
                          {advisory.category}
                        </span>

                        <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{advisory.publishedDate}</span>
                        </span>

                        {hasCorrelation && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Crosshair className="w-3 h-3 text-emerald-400" />
                            <span>Contextualiza {correlatedReports.length} {correlatedReports.length === 1 ? 'achado' : 'achados'}</span>
                          </span>
                        )}
                      </div>

                      {/* Advisory Title */}
                      <h3 className="text-base font-bold text-white tracking-tight hover:text-emerald-300 transition-colors">
                        <a
                          href={advisory.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5"
                        >
                          <span>{advisory.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400 hover:text-emerald-400 shrink-0" />
                        </a>
                      </h3>

                      {/* Summary */}
                      <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                        {advisory.summary}
                      </p>

                      {/* CVEs & Affected Vendors Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {advisory.cveIds.map((cve) => (
                          <span
                            key={cve}
                            className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25 flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            <span>{cve}</span>
                          </span>
                        ))}

                        {advisory.cweIds.map((cwe) => (
                          <span
                            key={cwe}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/25"
                          >
                            {cwe}
                          </span>
                        ))}

                        {advisory.affectedVendors.map((vendor) => (
                          <span
                            key={vendor}
                            className="text-[11px] px-2 py-0.5 rounded bg-[#101422] text-zinc-400 border border-[#1b2034]"
                          >
                            {vendor}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#1a2034]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleBookmark(advisory.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isBookmarked
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-[#101424] text-zinc-400 border-[#1f2640] hover:text-white'
                          }`}
                          title={isBookmarked ? 'Remover dos favoritos' : 'Salvar aviso'}
                        >
                          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyCitation(advisory)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#101424] hover:bg-[#182038] text-xs font-semibold text-zinc-200 border border-[#222a44] transition-colors flex items-center gap-1.5"
                          title="Copiar citação formatada para incluir no relatório de bug bounty"
                        >
                          {copiedCitationId === advisory.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Copiar Citação</span>
                            </>
                          )}
                        </button>
                      </div>

                      {onNewReportWithAdvisory && (
                        <button
                          type="button"
                          onClick={() => handleCreateReportFromAdvisory(advisory)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-semibold text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                          title="Criar novo relatório baseado neste aviso de segurança"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Criar Relatório</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedAdvisoryId(isExpanded ? null : advisory.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 py-1"
                      >
                        <span>{isExpanded ? 'Menos detalhes' : 'Exploração & Contexto'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* High Priority Banner: Direct Context to User's Existing Vulnerability Reports */}
                  {hasCorrelation && (
                    <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0c1220] to-[#0d1526] border border-emerald-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Crosshair className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Contexto Direto com seus Relatórios Existentes:
                        </h4>
                      </div>

                      <div className="space-y-2">
                        {correlatedReports.map(({ report, matchReason, confidenceScore }) => (
                          <div
                            key={report.id}
                            className="bg-[#070a14]/90 border border-[#1a233c] rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-emerald-300">
                                  {report.id}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${getSeverityBadgeColor(report.severity)}`}>
                                  {report.severity}
                                </span>
                                <span className="text-xs text-white font-semibold truncate max-w-sm">
                                  {report.title}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                                <span>Alvo: <strong className="text-zinc-300">{report.target}</strong></span>
                                <span>•</span>
                                <span>Tipo: <strong className="text-zinc-300">{report.vulnerabilityType}</strong></span>
                                <span>•</span>
                                <span className="text-emerald-400 font-medium">Relevância: {matchReason} ({confidenceScore}%)</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {onSelectReport && (
                                <button
                                  type="button"
                                  onClick={() => onSelectReport(report)}
                                  className="px-2.5 py-1 rounded bg-[#121728] hover:bg-[#1a223a] text-[11px] font-semibold text-zinc-200 border border-[#222c4a] transition-colors flex items-center gap-1"
                                >
                                  <span>Inspecionar Relatório</span>
                                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Strategic Guidance on How this Advisory strengthens the researcher's findings */}
                      <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-xs text-zinc-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-300">Como este aviso enriquece seu relatório: </strong>
                          <span>{advisory.bugBountyContext}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Technical & Remediation Accordion */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-[#090b14] border-t border-[#1b2034] space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Exploit Mechanism */}
                      <div className="bg-[#0e1220] border border-[#1d243a] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Mecanismo Técnico de Exploração</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {advisory.technicalExploitContext}
                        </p>
                      </div>

                      {/* Official Mitigation & Remediation */}
                      <div className="bg-[#0e1220] border border-[#1d243a] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Recomendações Técnicas & Mitigação</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {advisory.remediation || 'Consulte o boletim de segurança original para patches de fornecedor.'}
                        </p>
                      </div>
                    </div>

                    {/* External Link & Sources Grounding */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Fonte Original:</span>
                        <a
                          href={advisory.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>{advisory.sourceUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCitation(advisory)}
                          className="text-zinc-300 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar Contexto Completo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Grounding Attribution & Web Search Queries Footer */}
      <div className="p-4 bg-[#080a12] border-t border-[#1b2034] text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Feeds alimentados por <strong className="text-zinc-200">{engineSource}</strong>
          </span>
        </div>

        {searchQueries.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-zinc-500">
            <span>Buscas no Google:</span>
            {searchQueries.slice(0, 2).map((q, idx) => (
              <span key={idx} className="bg-[#101424] px-2 py-0.5 rounded border border-[#1b2034] text-zinc-400">
                "{q}"
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
