import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  ShieldAlert,
  Send,
  Trash2,
  Edit3,
  SlidersHorizontal,
  ShieldCheck,
  Key,
  X,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles
} from 'lucide-react';
import { VulnerabilityReport, ReportStatus, Severity, PlatformName } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor, generateMarkdownForPlatform } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { AutoTagsFilterBar } from './AutoTagsFilterBar';
import { getReportAutoTags, getAllTagsFromReports, AutoExtractedTag } from '../utils/taggingEngine';

interface ReportsViewProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onEditReport: (report: VulnerabilityReport) => void;
  onDeleteReport: (id: string) => void;
  onNewReport: () => void;
  onUpdateStatus: (id: string, status: ReportStatus) => void;
  onOpenPgpSigner?: (reportId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedSeverity?: string;
  onSeverityChange?: (severity: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  onSelectReport,
  onEditReport,
  onDeleteReport,
  onNewReport,
  onUpdateStatus,
  onOpenPgpSigner,
  searchQuery: externalSearchQuery = '',
  onSearchChange,
  selectedSeverity: externalSelectedSeverity = 'ALL',
  onSeverityChange
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [internalSelectedSeverity, setInternalSelectedSeverity] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced Filters State (Date range & Reward thresholds)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateField, setDateField] = useState<'createdAt' | 'updatedAt'>('createdAt');
  const [datePreset, setDatePreset] = useState<string>('ALL');

  const [minReward, setMinReward] = useState<string>('');
  const [maxReward, setMaxReward] = useState<string>('');
  const [rewardPreset, setRewardPreset] = useState<string>('ALL');

  // Automatic & Manual Tag Filter State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique automatic and manual tags across reports
  const availableTags = useMemo(() => {
    return getAllTagsFromReports(reports);
  }, [reports]);

  // Precompute auto-tags map for fast filtering and rendering
  const reportAutoTagsMap = useMemo(() => {
    const map = new Map<string, AutoExtractedTag[]>();
    reports.forEach(r => {
      map.set(r.id, getReportAutoTags(r));
    });
    return map;
  }, [reports]);

  // Synchronize search query between global header and view
  const searchQuery = onSearchChange !== undefined ? externalSearchQuery : internalSearchQuery;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  // Synchronize selected severity
  const selectedSeverity = onSeverityChange !== undefined ? externalSelectedSeverity : internalSelectedSeverity;
  const handleSeverityChange = (sev: string) => {
    if (onSeverityChange) {
      onSeverityChange(sev);
    } else {
      setInternalSelectedSeverity(sev);
    }
  };

  // Advanced filter preset handlers
  const handleApplyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date().toISOString().split('T')[0];
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === '90D') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === '365D') {
      const d = new Date();
      d.setDate(d.getDate() - 365);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'THIS_YEAR') {
      const year = new Date().getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(today);
    }
  };

  const handleApplyRewardPreset = (preset: string) => {
    setRewardPreset(preset);
    if (preset === 'ALL') {
      setMinReward('');
      setMaxReward('');
    } else if (preset === 'REWARDED') {
      setMinReward('1');
      setMaxReward('');
    } else if (preset === 'LOW') {
      setMinReward('1');
      setMaxReward('499');
    } else if (preset === 'MID') {
      setMinReward('500');
      setMaxReward('1999');
    } else if (preset === 'HIGH') {
      setMinReward('2000');
      setMaxReward('4999');
    } else if (preset === 'CRITICAL') {
      setMinReward('5000');
      setMaxReward('');
    } else if (preset === 'UNREWARDED') {
      setMinReward('0');
      setMaxReward('0');
    }
  };

  const handleCustomStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('CUSTOM');
  };

  const handleCustomEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('CUSTOM');
  };

  const handleCustomMinRewardChange = (val: string) => {
    setMinReward(val);
    setRewardPreset('CUSTOM');
  };

  const handleCustomMaxRewardChange = (val: string) => {
    setMaxReward(val);
    setRewardPreset('CUSTOM');
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
  };

  const handleClearRewardFilter = () => {
    setMinReward('');
    setMaxReward('');
    setRewardPreset('ALL');
  };

  const handleClearAllAdvanced = () => {
    handleClearDateFilter();
    handleClearRewardFilter();
    setSelectedTag(null);
  };

  const isDateActive = Boolean(startDate || endDate);
  const isRewardActive = Boolean(minReward !== '' || maxReward !== '');
  const activeAdvancedCount = (isDateActive ? 1 : 0) + (isRewardActive ? 1 : 0);

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const autoTags = reportAutoTagsMap.get(r.id) || [];

      // Search matching title, target, vulnerabilityType, description/summary, CWE, CVE, and auto-tags
      const q = (searchQuery || '').toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        const tokens = q.split(/\s+/).filter(Boolean);
        matchesSearch = tokens.every(token => {
          const cleanToken = token.startsWith('#') ? token : `#${token}`;
          const inTitle = (r.title || '').toLowerCase().includes(token);
          const inTarget = (r.target || '').toLowerCase().includes(token);
          const inType = (r.vulnerabilityType || '').toLowerCase().includes(token);
          const inSummary = (r.summary || '').toLowerCase().includes(token);
          const inCwe = (r.cwe || '').toLowerCase().includes(token);
          const inCve = (r.cveIds || []).some(c => c.toLowerCase().includes(token));
          const inTags = (r.tags || []).some(t => t.toLowerCase().includes(token) || t.toLowerCase() === cleanToken);
          const inId = (r.id || '').toLowerCase().includes(token);
          const inAutoTags = autoTags.some(at => 
            at.tag.toLowerCase().includes(token) || 
            at.tag.toLowerCase() === cleanToken || 
            at.label.toLowerCase().includes(token) ||
            at.matchedKeyword.toLowerCase().includes(token) ||
            at.category.toLowerCase().includes(token)
          );
          return inTitle || inTarget || inType || inSummary || inCwe || inCve || inTags || inId || inAutoTags;
        });
      }

      // Tag Filter (Auto or Manual)
      let matchesTag = true;
      if (selectedTag) {
        const cleanSelectedTag = selectedTag.toLowerCase();
        const inAuto = autoTags.some(at => at.tag.toLowerCase() === cleanSelectedTag);
        const inManual = (r.tags || []).some(t => {
          const norm = t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`;
          return norm === cleanSelectedTag;
        });
        matchesTag = inAuto || inManual;
      }

      // Status
      const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;

      // Severity
      const matchesSeverity = selectedSeverity === 'ALL' || r.severity === selectedSeverity;

      // Platform
      const matchesPlatform = selectedPlatform === 'ALL' || r.platform === selectedPlatform;

      // Date Range filter
      let matchesDate = true;
      if (startDate || endDate) {
        const targetDateStr = dateField === 'updatedAt' 
          ? (r.updatedAt || r.createdAt) 
          : (r.createdAt || r.updatedAt);

        if (targetDateStr) {
          let dateOnly = '';
          if (targetDateStr.length >= 10 && targetDateStr[4] === '-' && targetDateStr[7] === '-') {
            dateOnly = targetDateStr.substring(0, 10);
          } else {
            try {
              dateOnly = new Date(targetDateStr).toISOString().substring(0, 10);
            } catch {
              dateOnly = targetDateStr;
            }
          }

          if (startDate && dateOnly < startDate) matchesDate = false;
          if (endDate && dateOnly > endDate) matchesDate = false;
        }
      }

      // Reward Amount Thresholds
      let matchesReward = true;
      const amount = r.bountyAmount !== undefined && r.bountyAmount !== null ? Number(r.bountyAmount) : 0;

      if (minReward !== '') {
        const min = parseFloat(minReward);
        if (!isNaN(min) && amount < min) {
          matchesReward = false;
        }
      }

      if (maxReward !== '') {
        const max = parseFloat(maxReward);
        if (!isNaN(max) && amount > max) {
          matchesReward = false;
        }
      }

      return matchesSearch && matchesTag && matchesStatus && matchesSeverity && matchesPlatform && matchesDate && matchesReward;
    });
  }, [
    reports, 
    searchQuery, 
    selectedTag,
    selectedStatus, 
    selectedSeverity, 
    selectedPlatform, 
    startDate, 
    endDate, 
    dateField, 
    minReward, 
    maxReward,
    reportAutoTagsMap
  ]);

  const handleCopyMarkdown = (e: React.MouseEvent, report: VulnerabilityReport) => {
    e.stopPropagation();
    const md = generateMarkdownForPlatform(report, report.platform as any);
    navigator.clipboard.writeText(md);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusList: { key: string; label: string }[] = [
    { key: 'ALL', label: 'Todos os Status' },
    { key: 'DRAFT', label: 'Rascunhos' },
    { key: 'SUBMITTED', label: 'Enviados' },
    { key: 'TRIAGED', label: 'Em Triagem' },
    { key: 'REWARDED', label: 'Recompensados ($)' },
    { key: 'RESOLVED', label: 'Resolvidos' },
    { key: 'DUPLICATE', label: 'Duplicados' },
    { key: 'OUT_OF_SCOPE', label: 'Fora de Escopo' }
  ];

  const totalRewardsFiltered = filteredReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-white flex items-center gap-2">
            <span>Vulnerability Reports</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-[#262626]">
              {filteredReports.length}
            </span>
          </h1>
          <p className="text-xs text-zinc-400">
            Gerencie achados, formate para envio e acompanhe o pipeline de triagem e pagamento
          </p>
        </div>

        <button
          onClick={onNewReport}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Submission +</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              id="reports-view-search-input"
              placeholder="Buscar por título, alvo ou tipo (ex: IDOR, SQLi, api.alvo.com, CWE-639)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-[#121212] border border-[#262626] rounded text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                id="btn-clear-reports-view-search"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity filter */}
          <select
            id="reports-view-severity-select"
            value={selectedSeverity}
            onChange={(e) => handleSeverityChange(e.target.value)}
            className="bg-[#121212] border border-[#262626] rounded px-3 py-2 text-xs text-zinc-300 font-medium focus:outline-none"
          >
            <option value="ALL">Todas as Severidades</option>
            <option value="CRITICAL">Crítico (9.0 - 10.0)</option>
            <option value="HIGH">Alto (7.0 - 8.9)</option>
            <option value="MEDIUM">Médio (4.0 - 6.9)</option>
            <option value="LOW">Baixo (0.1 - 3.9)</option>
          </select>

          {/* Platform filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-[#121212] border border-[#262626] rounded px-3 py-2 text-xs text-zinc-300 font-medium focus:outline-none"
          >
            <option value="ALL">Todas as Plataformas</option>
            <option value="HackerOne">HackerOne</option>
            <option value="Bugcrowd">Bugcrowd</option>
            <option value="Intigriti">Intigriti</option>
            <option value="YesWeHack">YesWeHack</option>
            <option value="Synack">Synack</option>
            <option value="Direct / VDP">Direto / VDP</option>
          </select>

          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            id="btn-toggle-advanced-filters"
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-medium transition-all shrink-0 ${
              showAdvancedFilters || activeAdvancedCount > 0
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'bg-[#121212] text-zinc-300 hover:text-white border border-[#262626]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros Avançados</span>
            {activeAdvancedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[10px] font-bold">
                {activeAdvancedCount}
              </span>
            )}
            {showAdvancedFilters ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider mr-1 flex items-center gap-1 font-bold">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {statusList.map(st => {
            const isSelected = selectedStatus === st.key;
            const badgeMeta = st.key !== 'ALL' ? getStatusBadgeColor(st.key as ReportStatus) : null;

            return (
              <button
                key={st.key}
                onClick={() => setSelectedStatus(st.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'bg-[#121212] text-zinc-400 hover:text-white border border-[#262626]'
                }`}
              >
                {badgeMeta && (
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeMeta.dot}`} />
                )}
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-[#222222] mt-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                  Configurar Intervalo de Datas & Limiares de Recompensa
                </span>
              </div>
              {activeAdvancedCount > 0 && (
                <button
                  type="button"
                  id="btn-clear-all-advanced-filters"
                  onClick={handleClearAllAdvanced}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400 font-mono transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetar Filtros Avançados</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Section 1: Date Range Filter */}
              <div className="p-3.5 rounded-lg bg-[#111111] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Intervalo de Datas</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className="text-zinc-500">Campo:</span>
                    <select
                      id="select-date-field"
                      value={dateField}
                      onChange={(e) => setDateField(e.target.value as any)}
                      className="bg-[#181818] border border-[#303030] rounded px-2 py-0.5 text-[11px] text-zinc-300 focus:outline-none"
                    >
                      <option value="createdAt">Criação / Submissão</option>
                      <option value="updatedAt">Última Atualização</option>
                    </select>
                  </div>
                </div>

                {/* Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'ALL', label: 'Todo o Período' },
                    { key: '7D', label: 'Últimos 7 dias' },
                    { key: '30D', label: 'Últimos 30 dias' },
                    { key: '90D', label: 'Últimos 90 dias' },
                    { key: '365D', label: 'Último Ano' },
                    { key: 'THIS_YEAR', label: 'Este Ano' }
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleApplyDatePreset(p.key)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                        datePreset === p.key
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border border-[#282828]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label htmlFor="input-date-start" className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Data Inicial (De):
                    </label>
                    <input
                      type="date"
                      id="input-date-start"
                      value={startDate}
                      onChange={(e) => handleCustomStartDateChange(e.target.value)}
                      className="w-full bg-[#181818] border border-[#303030] rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-date-end" className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Data Final (Até):
                    </label>
                    <input
                      type="date"
                      id="input-date-end"
                      value={endDate}
                      onChange={(e) => handleCustomEndDateChange(e.target.value)}
                      className="w-full bg-[#181818] border border-[#303030] rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {isDateActive && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-zinc-400 font-mono">
                      Filtro ativo: {startDate ? formatDisplayDate(startDate) : 'Início'} ➔ {endDate ? formatDisplayDate(endDate) : 'Hoje'}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearDateFilter}
                      className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                    >
                      Limpar datas
                    </button>
                  </div>
                )}
              </div>

              {/* Section 2: Reward Threshold Filter */}
              <div className="p-3.5 rounded-lg bg-[#111111] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Faixa de Recompensa (Bounty Thresholds)</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">Moeda: USD ($)</span>
                </div>

                {/* Reward Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'ALL', label: 'Todos' },
                    { key: 'REWARDED', label: 'Pagos (> $0)' },
                    { key: 'LOW', label: '< $500' },
                    { key: 'MID', label: '$500 - $1.999' },
                    { key: 'HIGH', label: '$2.000 - $4.999' },
                    { key: 'CRITICAL', label: '$5.000+' },
                    { key: 'UNREWARDED', label: 'Sem Bounty ($0)' }
                  ].map(rp => (
                    <button
                      key={rp.key}
                      type="button"
                      onClick={() => handleApplyRewardPreset(rp.key)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                        rewardPreset === rp.key
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border border-[#282828]'
                      }`}
                    >
                      {rp.label}
                    </button>
                  ))}
                </div>

                {/* Numeric Threshold Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label htmlFor="input-min-reward" className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Valor Mínimo ($):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-zinc-500 font-mono">$</span>
                      <input
                        type="number"
                        id="input-min-reward"
                        min="0"
                        step="50"
                        placeholder="Ex: 500"
                        value={minReward}
                        onChange={(e) => handleCustomMinRewardChange(e.target.value)}
                        className="w-full bg-[#181818] border border-[#303030] rounded pl-6 pr-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="input-max-reward" className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Valor Máximo ($):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-zinc-500 font-mono">$</span>
                      <input
                        type="number"
                        id="input-max-reward"
                        min="0"
                        step="50"
                        placeholder="Ex: 5000 (ou vazio)"
                        value={maxReward}
                        onChange={(e) => handleCustomMaxRewardChange(e.target.value)}
                        className="w-full bg-[#181818] border border-[#303030] rounded pl-6 pr-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {isRewardActive && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-zinc-400 font-mono">
                      Filtro ativo: {minReward !== '' ? `≥ $${Number(minReward).toLocaleString('en-US')}` : '$0'} 
                      {maxReward !== '' ? ` até ≤ $${Number(maxReward).toLocaleString('en-US')}` : ' (sem teto)'}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearRewardFilter}
                      className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                    >
                      Limpar valor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Advanced / Tag Filter Chips */}
        {(activeAdvancedCount > 0 || selectedTag) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
              Filtros Ativos:
            </span>

            {/* Selected Tag Chip */}
            {selectedTag && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-black font-mono text-[11px] font-bold shadow-sm">
                <Tag className="w-3 h-3 text-emerald-700" />
                <span>Tag: {selectedTag}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="hover:bg-black/15 p-0.5 rounded ml-0.5 cursor-pointer"
                  title="Remover filtro de tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {isDateActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>
                  {dateField === 'updatedAt' ? 'Atualizado: ' : 'Data: '}
                  {startDate ? formatDisplayDate(startDate) : 'Início'}
                  {' → '}
                  {endDate ? formatDisplayDate(endDate) : 'Hoje'}
                </span>
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="hover:text-white ml-0.5 p-0.5 rounded hover:bg-emerald-900/50"
                  title="Remover filtro de data"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isRewardActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span>
                  Recompensa:{' '}
                  {minReward !== '' && maxReward !== '' && minReward === maxReward
                    ? `$${Number(minReward).toLocaleString('en-US')}`
                    : `${minReward !== '' ? `≥ $${Number(minReward).toLocaleString('en-US')}` : '$0'} ${maxReward !== '' ? `a ≤ $${Number(maxReward).toLocaleString('en-US')}` : ''}`}
                </span>
                <button
                  type="button"
                  onClick={handleClearRewardFilter}
                  className="hover:text-white ml-0.5 p-0.5 rounded hover:bg-emerald-900/50"
                  title="Remover filtro de recompensa"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              id="btn-clear-all-chips"
              onClick={handleClearAllAdvanced}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 ml-1"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Interactive Automatic Tags & Categorization Bar */}
      <AutoTagsFilterBar
        availableTags={availableTags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        totalReports={reports.length}
        filteredReportsCount={filteredReports.length}
      />

      {/* Active Search Banner */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Filtro ativo: <span className="text-white font-bold bg-[#141414] px-1.5 py-0.5 rounded border border-[#2e2e2e]">"{searchQuery}"</span>
            </span>
            <span className="text-zinc-400">
              ({filteredReports.length} {filteredReports.length === 1 ? 'relatório correspondente' : 'relatórios correspondentes'} no título, alvo, tipo, descrição ou tags)
            </span>
          </div>
          <button
            type="button"
            id="btn-clear-search-banner"
            onClick={() => handleSearchChange('')}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white underline underline-offset-2 transition-colors ml-2 shrink-0"
          >
            <X className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        </div>
      )}

      {/* Filter summary */}
      {filteredReports.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-zinc-500 px-1">
          <div>
            <span>Mostrando <strong>{filteredReports.length}</strong> de {reports.length} relatórios</span>
            {(activeAdvancedCount > 0 || selectedTag) && (
              <span className="text-emerald-400 font-mono ml-2">
                (Filtros {selectedTag ? `de tag [${selectedTag}]` : ''} ativos)
              </span>
            )}
          </div>
          {totalRewardsFiltered > 0 && (
            <span>Total de recompensas nesta visão: <strong className="font-mono text-emerald-400">{formatCurrency(totalRewardsFiltered, 'USD')}</strong></span>
          )}
        </div>
      )}

      {/* Reports List Cards */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-3">
          <ShieldAlert className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-medium text-zinc-200">Nenhum relatório encontrado</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {selectedTag ? (
              <>
                Nenhum relatório possui a tag <strong className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{selectedTag}</strong> com os filtros atuais selecionados.
              </>
            ) : activeAdvancedCount > 0 ? (
              <>
                Nenhum relatório corresponde aos critérios selecionados (verifique o intervalo de datas, limiares de recompensa ou filtros de busca).
              </>
            ) : searchQuery.trim() ? (
              <>
                Nenhum relatório corresponde ao termo <strong className="text-zinc-300 font-mono">"{searchQuery}"</strong> no título, alvo, tipo, descrição ou tags.
              </>
            ) : (
              <>
                Tente ajustar os filtros de severidade, status ou plataforma para exibir mais relatórios.
              </>
            )}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-white text-black font-semibold text-xs transition-colors hover:bg-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remover Filtro de Tag ({selectedTag})</span>
              </button>
            )}
            {activeAdvancedCount > 0 && (
              <button
                type="button"
                id="btn-clear-advanced-empty-state"
                onClick={handleClearAllAdvanced}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 font-medium text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar Filtros Avançados</span>
              </button>
            )}
            {searchQuery.trim() && (
              <button
                type="button"
                id="btn-clear-search-empty-state"
                onClick={() => handleSearchChange('')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Busca</span>
              </button>
            )}
            <button
              onClick={onNewReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Relatório</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => {
            const sevBadge = getSeverityBadgeColor(report.severity);
            const statusBadge = getStatusBadgeColor(report.status);
            const autoTags = reportAutoTagsMap.get(report.id) || [];

            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="group p-5 rounded-xl bg-[#0a0a0a] hover:bg-[#121212] border border-[#262626] hover:border-zinc-700 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Badges, Title & Meta */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                        {report.severity} {report.cvssScore}
                      </span>
                      
                      <StatusBadge status={report.status} size="sm" />

                      <span className="text-xs font-mono text-zinc-400 bg-[#121212] px-2 py-0.5 rounded border border-[#262626]">
                        {report.platform}
                      </span>

                      <span className="text-xs font-mono text-zinc-400">
                        Alvo: <strong className="text-zinc-200">{report.target}</strong>
                      </span>

                      {report.cveIds.length > 0 && (
                        <div className="flex items-center gap-1">
                          {report.cveIds.map(cve => (
                            <span key={cve} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/20">
                              {cve}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Interactive Automatic Tags (Extracted from Title/Summary) & Manual Tags */}
                      {(autoTags.length > 0 || (report.tags && report.tags.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-1">
                          {/* Auto-extracted tags */}
                          {autoTags.map(at => {
                            const isTagSelected = selectedTag === at.tag;
                            return (
                              <button
                                key={at.tag}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(selectedTag === at.tag ? null : at.tag);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 transition-all cursor-pointer ${
                                  isTagSelected
                                    ? 'bg-white text-black border-white font-bold ring-2 ring-emerald-500/40 shadow-sm'
                                    : `${at.color.bg} ${at.color.text} ${at.color.border} hover:brightness-125`
                                }`}
                                title={`Tag automática: "${at.label}" detectada por "${at.matchedKeyword}" no conteúdo. Clique para filtrar.`}
                              >
                                <Sparkles className="w-2.5 h-2.5 opacity-80 shrink-0" />
                                <span>{at.tag}</span>
                              </button>
                            );
                          })}

                          {/* Extra Manual tags not covered by auto tags */}
                          {report.tags && report.tags
                            .filter(rawTag => {
                              const norm = rawTag.startsWith('#') ? rawTag.toLowerCase() : `#${rawTag.toLowerCase()}`;
                              return !autoTags.some(at => at.tag === norm);
                            })
                            .map(rawTag => {
                              const norm = rawTag.startsWith('#') ? rawTag.toLowerCase() : `#${rawTag.toLowerCase()}`;
                              const isTagSelected = selectedTag === norm;
                              return (
                                <button
                                  key={rawTag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTag(selectedTag === norm ? null : norm);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                                    isTagSelected
                                      ? 'bg-white text-black border-white font-bold shadow-sm'
                                      : 'bg-[#171717] text-zinc-400 hover:text-zinc-200 border-[#282828] hover:bg-[#222]'
                                  }`}
                                  title={`Tag manual: ${rawTag}. Clique para filtrar.`}
                                >
                                  <span>{rawTag}</span>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {report.pgpSignature && (
                        <span 
                          className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-semibold border border-emerald-500/30 flex items-center gap-1" 
                          title={`Assinado digitalmente via PGP (${report.pgpSignature.keyFingerprint.slice(0, 16)}...)`}
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          PGP Assinado
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors leading-snug">
                      {report.title}
                    </h3>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {report.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-1 font-mono">
                      <span className="text-zinc-400">{report.vulnerabilityType}</span>
                      <span>•</span>
                      <span>{report.cwe}</span>
                      <span>•</span>
                      <span>ID: <strong className="text-zinc-300">{report.id}</strong></span>
                      {report.submissionId && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Protocolo: {report.submissionId}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Financial Rewards & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#262626]">
                    
                    {/* Bounty display */}
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">Recompensa</span>
                      {report.bountyAmount > 0 ? (
                        <div className="text-lg font-light font-mono text-emerald-400">
                          {formatCurrency(report.bountyAmount, 'USD')}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 italic font-mono">Pendente</span>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Copy Formatted Markdown */}
                      <button
                        title="Copiar relatório formatado em Markdown"
                        onClick={(e) => handleCopyMarkdown(e, report)}
                        className="p-2 rounded bg-[#171717] hover:bg-[#262626] text-zinc-300 hover:text-white transition-colors border border-[#262626]"
                      >
                        {copiedId === report.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        title="Editar relatório"
                        onClick={() => onEditReport(report)}
                        className="p-2 rounded bg-[#171717] hover:bg-[#262626] text-zinc-300 hover:text-white transition-colors border border-[#262626]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        title="Excluir relatório"
                        onClick={() => {
                          if (confirm(`Deseja excluir o relatório "${report.title}"?`)) {
                            onDeleteReport(report.id);
                          }
                        }}
                        className="p-2 rounded bg-[#171717] hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors border border-[#262626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
