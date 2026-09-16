import React, { useState, useMemo } from 'react';
import { 
  MessageSquareWarning, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  Flame, 
  Smile, 
  Frown, 
  Meh, 
  Search, 
  Filter, 
  ExternalLink, 
  Copy, 
  Check, 
  RotateCcw, 
  Building2, 
  Shield, 
  ChevronRight,
  Sparkles,
  HelpCircle,
  Clock,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react';
import { VulnerabilityReport, Severity, PlatformName } from '../types';
import { 
  analyzeReportsSentiment, 
  analyzeMessageTone, 
  InteractionTone, 
  TimelineSentimentResult, 
  SingleMessageAnalysis 
} from '../utils/sentimentAnalyzer';

interface ReporterInteractionSentimentProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
}

export const ReporterInteractionSentiment: React.FC<ReporterInteractionSentimentProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports
}) => {
  // Analyze all reports timeline communications
  const summary = useMemo(() => analyzeReportsSentiment(reports), [reports]);

  // View tabs
  const [activeTab, setActiveTab] = useState<'feed' | 'programs' | 'tester'>('feed');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTone, setSelectedTone] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Tester state
  const [testerInput, setTesterInput] = useState('');
  const [testerResult, setTesterResult] = useState<SingleMessageAnalysis | null>(null);

  // Filtered timeline communications
  const filteredResults = useMemo(() => {
    return summary.allResults.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchNotes = item.notes.toLowerCase().includes(q);
        const matchReport = item.reportTitle.toLowerCase().includes(q);
        const matchTarget = item.target.toLowerCase().includes(q);
        const matchKeywords = item.matchedKeywords.some(k => k.word.toLowerCase().includes(q));
        if (!matchTitle && !matchNotes && !matchReport && !matchTarget && !matchKeywords) {
          return false;
        }
      }

      // Tone
      if (selectedTone === 'flagged') {
        if (!item.isFlagged) return false;
      } else if (selectedTone !== 'all' && item.tone !== selectedTone) {
        return false;
      }

      // Program
      if (selectedProgram !== 'all' && !item.target.toLowerCase().includes(selectedProgram.toLowerCase())) {
        return false;
      }

      // Platform
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) {
        return false;
      }

      return true;
    });
  }, [summary.allResults, searchQuery, selectedTone, selectedProgram, selectedPlatform]);

  // Handle Copy text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run tester on preset or input
  const handleTestMessage = (text: string) => {
    setTesterInput(text);
    const res = analyzeMessageTone(text);
    setTesterResult(res);
  };

  // Presets for the tester
  const presets = [
    {
      label: '🚨 Agressivo / Punitivo',
      text: 'Testes contínuos fora do escopo são uma violação inaceitável de conduta. Qualquer nova tentativa resultará em bloqueio de conta imediato e desqualificação do programa.'
    },
    {
      label: '🟠 Frustrado / Pings Repetidos',
      text: 'Já explicamos anteriormente que este comportamento é esperado. Por favor, pare de mandar mensagens repetidas na thread e não insista com novas reaberturas.'
    },
    {
      label: '⚠️ Evasivo / Descartado',
      text: 'Closed as Informational only. The reported attack scenario is purely hypothetical and has zero impact on user security. Non-issue, wontfix.'
    },
    {
      label: '🟢 Colaborativo / Agradecido',
      text: 'Thank you for the excellent report and clear reproduction steps! Great catch by your team. Bounty awarded and validated by engineering.'
    }
  ];

  // Helper for tone color styles
  const getToneBadge = (tone: InteractionTone, isFlagged: boolean) => {
    switch (tone) {
      case 'AGGRESSIVE':
        return {
          bg: 'bg-red-500/15 text-red-400 border-red-500/40',
          badge: 'Agressivo / Hostil',
          icon: <Flame className="w-3.5 h-3.5 text-red-400" />
        };
      case 'FRUSTRATED':
        return {
          bg: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
          badge: 'Frustrado / Impaciente',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
        };
      case 'DISMISSIVE':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
          badge: 'Evasivo / Descartado',
          icon: <ThumbsDown className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'CONSTRUCTIVE':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
          badge: 'Construtivo / Grato',
          icon: <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'NEUTRAL':
      default:
        return {
          bg: 'bg-neutral-800 text-neutral-400 border-neutral-700',
          badge: 'Neutro / Operacional',
          icon: <Meh className="w-3.5 h-3.5 text-neutral-400" />
        };
    }
  };

  return (
    <div id="reporter-interaction-sentiment-tracker" className="bg-[#121212] border border-neutral-800 rounded-xl p-6 shadow-sm">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mt-1">
            <MessageSquareWarning className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">Reporter Interaction Sentiment</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                Timeline Tone Tracker
              </span>
              {summary.flaggedCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {summary.flaggedCount} Alerta{summary.flaggedCount > 1 ? 's' : ''} de Tensão
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
              Análise heurística de tom nas comunicações da Timeline para identificar comunicações potencialmente agressivas, frustradas ou evasivas de gestores de programas e triadores.
            </p>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-lg border border-neutral-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            Feed de Comunicações ({summary.totalCommunications})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('programs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'programs'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Por Programa ({summary.programBreakdown.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tester')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'tester'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Auditor de Mensagens
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Metric 1: Health Score */}
        <div className="bg-[#181818] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Saúde de Interação</span>
            <div className={`p-1.5 rounded-md ${
              summary.overallHealthScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
              summary.overallHealthScore >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
            }`}>
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">{summary.overallHealthScore}%</span>
              <span className="text-xs text-neutral-400 font-medium">
                {summary.overallHealthScore >= 80 ? 'Clima Positivo' :
                 summary.overallHealthScore >= 60 ? 'Atenção / Ruído' : 'Alto Atrito'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  summary.overallHealthScore >= 80 ? 'bg-emerald-500' :
                  summary.overallHealthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${summary.overallHealthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Flagged Tension Alerts */}
        <div className="bg-[#181818] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Alertas de Atrito Crítico</span>
            <div className={`p-1.5 rounded-md ${summary.flaggedCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-400'}`}>
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold ${summary.flaggedCount > 0 ? 'text-red-400' : 'text-white'}`}>
                {summary.flaggedCount}
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                {summary.aggressiveCount} Hostil{summary.aggressiveCount === 1 ? '' : 'is'} · {summary.frustratedCount} Frustrado{summary.frustratedCount === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Exigem cuidado e resposta desescalonada</p>
          </div>
        </div>

        {/* Metric 3: Dismissive / Wontfix */}
        <div className="bg-[#181818] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Respostas Evasivas / WontFix</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <ThumbsDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-400">{summary.dismissiveCount}</span>
              <span className="text-xs text-neutral-400 font-medium">
                "Não é bug" / "Como projetado"
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Recomendado contestar com Business Impact</p>
          </div>
        </div>

        {/* Metric 4: Constructive / Positive */}
        <div className="bg-[#181818] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Comunicações Positivas</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-400">{summary.constructiveCount}</span>
              <span className="text-xs text-neutral-400 font-medium">
                Elogios & Parcerias
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Programas com alto índice de aprovação</p>
          </div>
        </div>
      </div>

      {/* Critical Tension Banner Callout (if any flagged incidents exist) */}
      {summary.flaggedIncidents.length > 0 && (
        <div className="mb-6 bg-red-950/20 border border-red-800/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-red-300">
                  Atenção: Comunicação com Risco de Escalada Detectada
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-red-900/60 text-red-200 border border-red-700/50">
                  {summary.flaggedIncidents[0].target}
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1 line-clamp-2">
                "{summary.flaggedIncidents[0].notes}"
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] text-neutral-400">Termos sinalizados:</span>
                {summary.flaggedIncidents[0].matchedKeywords.map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-red-900/40 text-red-300 border border-red-800/60">
                    {kw.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const rep = reports.find(r => r.id === summary.flaggedIncidents[0].reportId);
              if (rep) onSelectReport(rep);
            }}
            className="shrink-0 px-3.5 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            Examinar Relatório
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: FEED DE COMUNICAÇÕES */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#181818] border border-neutral-800 rounded-lg p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por termos, notas da timeline, programa ou palavras-chave..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-900 border border-neutral-700/80 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Dropdowns & Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tone Filter */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTone('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    selectedTone === 'all'
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-white bg-neutral-900'
                  }`}
                >
                  Todas ({summary.totalCommunications})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTone('flagged')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                    selectedTone === 'flagged'
                      ? 'bg-red-600 text-white'
                      : 'text-red-400 hover:bg-red-500/10 bg-neutral-900 border border-red-500/30'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  Sinalizadas ({summary.flaggedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTone('DISMISSIVE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    selectedTone === 'DISMISSIVE'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-400 hover:bg-amber-500/10 bg-neutral-900 border border-amber-500/30'
                  }`}
                >
                  Evasivas ({summary.dismissiveCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTone('CONSTRUCTIVE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    selectedTone === 'CONSTRUCTIVE'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:bg-emerald-500/10 bg-neutral-900 border border-emerald-500/30'
                  }`}
                >
                  Construtivas ({summary.constructiveCount})
                </button>
              </div>

              {/* Platform select */}
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-2.5 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-300 focus:outline-none focus:border-red-500"
              >
                <option value="all">Todas Plataformas</option>
                <option value="HackerOne">HackerOne</option>
                <option value="Bugcrowd">Bugcrowd</option>
                <option value="Intigriti">Intigriti</option>
                <option value="YesWeHack">YesWeHack</option>
                <option value="Synack">Synack</option>
              </select>
            </div>
          </div>

          {/* Results count & clear */}
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>
              Exibindo <strong className="text-white">{filteredResults.length}</strong> interações analisadas
            </span>
            {(searchQuery || selectedTone !== 'all' || selectedPlatform !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTone('all');
                  setSelectedPlatform('all');
                  setSelectedProgram('all');
                }}
                className="text-neutral-400 hover:text-white flex items-center gap-1 underline"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar Filtros
              </button>
            )}
          </div>

          {/* List of communication items */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 bg-[#181818] border border-neutral-800 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">Nenhuma interação encontrada para os filtros aplicados.</p>
              <p className="text-xs text-neutral-600 mt-1">Experimente limpar a busca ou selecionar outro tom.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((item, idx) => {
                const toneStyle = getToneBadge(item.tone, item.isFlagged);
                const relatedReport = reports.find(r => r.id === item.reportId);

                return (
                  <div
                    key={`${item.reportId}-${item.eventId}-${idx}`}
                    className={`bg-[#181818] border rounded-xl p-4 transition-all duration-150 ${
                      item.isFlagged
                        ? 'border-red-800/60 bg-gradient-to-r from-red-950/10 to-transparent'
                        : item.tone === 'DISMISSIVE'
                        ? 'border-amber-800/40'
                        : item.tone === 'CONSTRUCTIVE'
                        ? 'border-emerald-800/40'
                        : 'border-neutral-800'
                    }`}
                  >
                    {/* Item Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Target & Platform */}
                        <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-neutral-900 text-neutral-200 border border-neutral-700">
                          {item.target}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-neutral-800 text-neutral-400">
                          {item.platform}
                        </span>
                        <span className="text-neutral-500 text-xs">·</span>
                        <span className="text-xs text-neutral-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {item.date}
                        </span>
                        <span className="text-neutral-500 text-xs">·</span>
                        {/* Author Role */}
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700/50">
                          {item.authorRole === 'program_manager' ? 'Gestor do Programa' :
                           item.authorRole === 'triager' ? 'Triador da Plataforma' :
                           item.authorRole === 'reporter' ? 'Pesquisador' : 'Sistema'}
                        </span>
                      </div>

                      {/* Tone Badge & Friction Score */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 ${toneStyle.bg}`}>
                          {toneStyle.icon}
                          {toneStyle.badge}
                        </span>
                        {item.frictionScore > 0 && (
                          <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            Atrito: <strong className={item.frictionScore > 50 ? 'text-red-400' : 'text-amber-400'}>{item.frictionScore}%</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Report title reference */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-neutral-300 truncate">
                        <span className="text-neutral-500">Relatório:</span> {item.reportTitle}
                      </div>
                      {relatedReport && (
                        <button
                          type="button"
                          onClick={() => onSelectReport(relatedReport)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 shrink-0 font-medium"
                        >
                          Ver no App
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quoted Timeline Communication */}
                    <div className="mt-3 p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs leading-relaxed text-neutral-200">
                      <div className="font-semibold text-neutral-400 mb-1 text-[11px] uppercase tracking-wider">
                        {item.title}:
                      </div>
                      <p className="whitespace-pre-wrap">{item.notes || '(Sem notas adicionais registradas)'}</p>

                      {/* Matched Keywords Highlight tags */}
                      {item.matchedKeywords.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-neutral-500">Gatilhos identificados:</span>
                          {item.matchedKeywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 text-[10px] font-mono rounded font-medium ${
                                kw.category === 'AGGRESSIVE' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                kw.category === 'FRUSTRATED' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                kw.category === 'DISMISSIVE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              "{kw.word}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* De-escalation Advice Box (if flagged or dismissive) */}
                    {(item.isFlagged || item.tone === 'DISMISSIVE' || item.tone === 'CONSTRUCTIVE') && (
                      <div className={`mt-3 p-3 rounded-lg border text-xs ${
                        item.isFlagged
                          ? 'bg-red-950/20 border-red-800/30 text-red-200'
                          : item.tone === 'DISMISSIVE'
                          ? 'bg-amber-950/20 border-amber-800/30 text-amber-200'
                          : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-200'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                            <div>
                              <strong className="font-semibold block mb-0.5">
                                {item.isFlagged ? 'Protocolo de Desescalonamento Recomendado:' :
                                 item.tone === 'DISMISSIVE' ? 'Estratégia para Reverter Descarte:' :
                                 'Recomendação de Relacionamento:'}
                              </strong>
                              <p className="text-[11px] opacity-90">{item.deEscalationAdvice}</p>
                              <p className="text-[11px] opacity-75 mt-1 font-mono">
                                💡 Dica Tática: {item.actionRecommendation}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopy(item.eventId, item.deEscalationAdvice)}
                            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0"
                            title="Copiar recomendação"
                          >
                            {copiedId === item.eventId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANÁLISE POR PROGRAMA */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="text-xs text-neutral-400">
            Comparativo da saúde de comunicação por empresa e programa de bug bounty, calculado com base nas interações registradas na Timeline.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.programBreakdown.map((prog) => {
              return (
                <div 
                  key={prog.domain}
                  className="bg-[#181818] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{prog.displayName}</h3>
                          <span className="text-[11px] font-mono text-neutral-400">{prog.domain}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                        prog.status === 'CRITICAL_RISK' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                        prog.status === 'HIGH_FRICTION' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                        prog.status === 'MODERATE_TENSION' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {prog.status === 'CRITICAL_RISK' ? 'Risco Crítico' :
                         prog.status === 'HIGH_FRICTION' ? 'Atrito Alto' :
                         prog.status === 'MODERATE_TENSION' ? 'Atenção' : 'Saudável'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block">Total Mensagens</span>
                        <strong className="text-sm text-white font-mono">{prog.totalInteractions}</strong>
                      </div>
                      <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block">Sinalizações</span>
                        <strong className={`text-sm font-mono ${prog.flaggedCount > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                          {prog.flaggedCount}
                        </strong>
                      </div>
                      <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block">Score de Saúde</span>
                        <strong className={`text-sm font-mono ${
                          prog.healthScore >= 80 ? 'text-emerald-400' :
                          prog.healthScore >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {prog.healthScore}%
                        </strong>
                      </div>
                    </div>

                    {/* Tone Distribution Breakdown */}
                    <div className="mt-4">
                      <span className="text-[11px] text-neutral-400 mb-1 block">Distribuição de Tom:</span>
                      <div className="flex h-2 rounded-full overflow-hidden bg-neutral-800">
                        {prog.constructiveCount > 0 && (
                          <div 
                            className="bg-emerald-500" 
                            style={{ width: `${(prog.constructiveCount / prog.totalInteractions) * 100}%` }}
                            title={`Construtivo: ${prog.constructiveCount}`}
                          />
                        )}
                        {prog.dismissiveCount > 0 && (
                          <div 
                            className="bg-amber-500" 
                            style={{ width: `${(prog.dismissiveCount / prog.totalInteractions) * 100}%` }}
                            title={`Evasivo: ${prog.dismissiveCount}`}
                          />
                        )}
                        {prog.frustratedCount > 0 && (
                          <div 
                            className="bg-orange-500" 
                            style={{ width: `${(prog.frustratedCount / prog.totalInteractions) * 100}%` }}
                            title={`Frustrado: ${prog.frustratedCount}`}
                          />
                        )}
                        {prog.aggressiveCount > 0 && (
                          <div 
                            className="bg-red-500" 
                            style={{ width: `${(prog.aggressiveCount / prog.totalInteractions) * 100}%` }}
                            title={`Agressivo: ${prog.aggressiveCount}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProgram(prog.domain);
                        setActiveTab('feed');
                      }}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-medium"
                    >
                      Filtrar no Feed
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-neutral-500">{prog.platform}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AUDITOR DE MENSAGENS EM TEMPO REAL */}
      {activeTab === 'tester' && (
        <div className="space-y-6">
          <div className="bg-[#181818] border border-neutral-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Auditor de Tom e Atrito em Tempo Real
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Cole uma mensagem recebida de um gestor de programa para inspecionar o tom, ou rascunhe sua resposta para garantir uma postura técnica, desescalonada e profissional.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTesterInput('');
                  setTesterResult(null);
                }}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar
              </button>
            </div>

            {/* Presets buttons */}
            <div className="mb-4">
              <span className="text-[11px] text-neutral-500 block mb-1.5 font-medium">Carregar Cenários de Teste:</span>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTestMessage(preset.text)}
                    className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                value={testerInput}
                onChange={(e) => handleTestMessage(e.target.value)}
                placeholder="Cole o texto da mensagem do gestor ou rascunhe sua réplica aqui..."
                rows={4}
                className="w-full p-3 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors font-sans"
              />
            </div>

            {/* Live Analysis Output */}
            {testerResult && testerInput.trim() && (
              <div className="mt-4 pt-4 border-t border-neutral-800 space-y-4">
                {/* Result Top bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Tom Identificado:</span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 ${
                      getToneBadge(testerResult.tone, testerResult.isFlagged).bg
                    }`}>
                      {getToneBadge(testerResult.tone, testerResult.isFlagged).icon}
                      {getToneBadge(testerResult.tone, testerResult.isFlagged).badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400">
                      Índice de Atrito: <strong className={testerResult.frictionScore > 50 ? 'text-red-400' : 'text-amber-400'}>
                        {testerResult.frictionScore}%
                      </strong>
                    </span>
                    <span className="text-xs text-neutral-400">
                      Sentimento: <strong className={testerResult.sentimentScore >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {testerResult.sentimentScore > 0 ? `+${testerResult.sentimentScore}` : testerResult.sentimentScore}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Trigger keywords found */}
                {testerResult.matchedKeywords.length > 0 ? (
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                    <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                      Palavras-chave e Expressões Detectadas ({testerResult.matchedKeywords.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {testerResult.matchedKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-xs font-mono rounded ${
                            kw.category === 'AGGRESSIVE' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            kw.category === 'FRUSTRATED' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                            kw.category === 'DISMISSIVE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          "{kw.word}" (peso: {kw.weight})
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Nenhuma expressão hostil ou de frustração detectada. Texto calmo e factual.
                  </div>
                )}

                {/* Advice & Tactical tip */}
                <div className={`p-4 rounded-lg border text-xs leading-relaxed ${
                  testerResult.isFlagged
                    ? 'bg-red-950/20 border-red-800/40 text-red-200'
                    : testerResult.tone === 'DISMISSIVE'
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                }`}>
                  <strong className="block font-semibold mb-1">
                    Análise Estratégica:
                  </strong>
                  <p>{testerResult.deEscalationAdvice}</p>
                  <p className="mt-2 font-mono text-[11px] opacity-85">
                    🎯 Dica de Comunicação: {testerResult.tacticalTip}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
