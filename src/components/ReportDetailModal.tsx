import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  DollarSign, 
  Clock, 
  ShieldAlert, 
  FileCode, 
  FileText, 
  ListChecks, 
  Sparkles,
  Share2,
  CheckCircle2,
  Key,
  ShieldCheck,
  Lock,
  Plus,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle,
  BookOpen,
  Maximize2,
  Minimize2,
  HelpCircle,
  Type,
  Info,
  Layers,
  CheckCheck,
  Globe,
  Timer
} from 'lucide-react';
import { VulnerabilityReport, ReportStatus, Severity, TimelineEvent, ValidationChecklistItem } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor, generateMarkdownForPlatform } from '../utils/formatters';
import { ToolExplanationCard } from './ToolExplanationCard';
import { SecurityIntelSidebar } from './SecurityIntelSidebar';
import { getReportAutoTags } from '../utils/taggingEngine';
import { calculateReportHoursFromTimeline } from '../utils/hourlyRateEngine';
import { StatusBadge } from './StatusBadge';

interface ReportDetailModalProps {
  report: VulnerabilityReport | null;
  onClose: () => void;
  onEdit: (report: VulnerabilityReport) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
  onAddTimelineEvent: (id: string, event: Omit<TimelineEvent, 'id'>) => void;
  onOpenPgpSigner?: (reportId: string) => void;
  onUpdateChecklist?: (reportId: string, checklist: ValidationChecklistItem[]) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddTimelineEvent,
  onOpenPgpSigner,
  onUpdateChecklist
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'poc' | 'checklist' | 'timeline' | 'export'>('details');
  const [copied, setCopied] = useState(false);
  const [copiedPgp, setCopiedPgp] = useState(false);
  const [exportPlatform, setExportPlatform] = useState<'HackerOne' | 'Bugcrowd' | 'Intigriti' | 'General'>('HackerOne');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchReceipt, setDispatchReceipt] = useState<any | null>(null);

  // Focused Reading Mode & Tool Guide state
  const [isFocusedReading, setIsFocusedReading] = useState(false);
  const [readingFontSize, setReadingFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [showToolExplanation, setShowToolExplanation] = useState(false);
  const [showIntelSidebar, setShowIntelSidebar] = useState(false);

  // Quick bounty & status update form state
  const [newStatus, setNewStatus] = useState<ReportStatus>(report?.status || 'DRAFT');
  const [newBounty, setNewBounty] = useState<number>(report?.bountyAmount || 0);
  const [timelineNote, setTimelineNote] = useState('');

  // Inline timeline event state
  const [showAddTimelineEvent, setShowAddTimelineEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('Sessão de Pesquisa & Validação');
  const [newEventNotes, setNewEventNotes] = useState('');
  const [newEventHours, setNewEventHours] = useState<number>(2);

  // Validation Checklist state
  const [newTaskInput, setNewTaskInput] = useState('');
  const [quickAddInput, setQuickAddInput] = useState('');

  if (!report) return null;

  const defaultValidationChecklist: ValidationChecklistItem[] = [
    { id: 'chk-repro', label: 'Verificar reprodução determinística (passo a passo em ambiente limpo)', completed: report.status !== 'DRAFT' },
    { id: 'chk-impact', label: 'Confirmar impacto real no negócio (sem suposições teóricas)', completed: report.status !== 'DRAFT' },
    { id: 'chk-scope', label: 'Confirmar escopo autorizado do programa e regras de engajamento (In-Scope)', completed: true },
    { id: 'chk-poc', label: 'Validar PoC com requisição HTTP / script reproduzível', completed: !!report.proofOfConcept },
    { id: 'chk-safe', label: 'Garantir integridade dos dados (sem causar DoS ou corrupção)', completed: true },
    { id: 'chk-sanitize', label: 'Sanitizar tokens, cookies e credenciais confidenciais de terceiros', completed: true },
  ];

  const checklist: ValidationChecklistItem[] = (report.validationChecklist && report.validationChecklist.length > 0)
    ? report.validationChecklist
    : defaultValidationChecklist;

  const completedCount = checklist.filter(t => t.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleTask = (taskId: string) => {
    const updated = checklist.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return t;
    });
    if (onUpdateChecklist) {
      onUpdateChecklist(report.id, updated);
    }
  };

  const handleAddTask = (taskLabel?: string) => {
    const label = (taskLabel || newTaskInput).trim();
    if (!label) return;

    const newItem: ValidationChecklistItem = {
      id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label,
      completed: false
    };

    const updated = [...checklist, newItem];
    if (onUpdateChecklist) {
      onUpdateChecklist(report.id, updated);
    }
    if (!taskLabel) {
      setNewTaskInput('');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = checklist.filter(t => t.id !== taskId);
    if (onUpdateChecklist) {
      onUpdateChecklist(report.id, updated);
    }
  };

  const handleToggleAll = (completed: boolean) => {
    const updated = checklist.map(t => ({
      ...t,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined
    }));
    if (onUpdateChecklist) {
      onUpdateChecklist(report.id, updated);
    }
  };

  const handleResetToDefaults = () => {
    const baseDefaults: ValidationChecklistItem[] = [
      { id: 'chk-repro', label: 'Verificar reprodução determinística (passo a passo em ambiente limpo)', completed: false },
      { id: 'chk-impact', label: 'Confirmar impacto real no negócio (sem suposições teóricas)', completed: false },
      { id: 'chk-scope', label: 'Confirmar escopo autorizado do programa e regras de engajamento (In-Scope)', completed: true },
      { id: 'chk-poc', label: 'Validar PoC com requisição HTTP / script reproduzível', completed: false },
      { id: 'chk-safe', label: 'Garantir integridade dos dados (sem causar DoS ou corrupção)', completed: true },
      { id: 'chk-sanitize', label: 'Sanitizar tokens, cookies e credenciais confidenciais de terceiros', completed: true },
    ];
    if (onUpdateChecklist) {
      onUpdateChecklist(report.id, baseDefaults);
    }
  };

  const sevBadge = getSeverityBadgeColor(report.severity);
  const statusBadge = getStatusBadgeColor(report.status);
  const formattedMarkdown = generateMarkdownForPlatform(report, exportPlatform);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchToPlatform = async () => {
    setIsDispatching(true);
    try {
      const response = await fetch('/api/submissions/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          platform: report.platform,
          title: report.title,
          target: report.target,
          severity: report.severity,
          reportMarkdown: formattedMarkdown
        })
      });

      const data = await response.json();
      if (data.success) {
        setDispatchReceipt(data.receipt);
        onUpdateStatus(report.id, 'SUBMITTED');
        onAddTimelineEvent(report.id, {
          date: new Date().toISOString().split('T')[0],
          title: `Relatório Despachado para ${report.platform}`,
          notes: `Protocolo de submissão gerado: ${data.receipt.submissionId}. Aguardando triagem do programa parceiro.`,
          type: 'dispatch'
        });
      }
    } catch (err) {
      console.error('Dispatch error:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSaveStatus = () => {
    onUpdateStatus(report.id, newStatus, newBounty);
    if (timelineNote.trim()) {
      onAddTimelineEvent(report.id, {
        date: new Date().toISOString().split('T')[0],
        title: `Status alterado para ${newStatus}`,
        notes: timelineNote.trim(),
        type: newBounty > (report.bountyAmount || 0) ? 'bounty' : 'status_change'
      });
      setTimelineNote('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className={`relative w-full ${
        showIntelSidebar
          ? 'max-w-7xl bg-[#0a0a0a] border-[#262626]'
          : isFocusedReading 
            ? 'max-w-5xl bg-[#080808] border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.1)]' 
            : 'max-w-4xl bg-[#0a0a0a] border-[#262626]'
      } border rounded-xl shadow-2xl max-h-[94vh] flex flex-col my-auto overflow-hidden transition-all duration-200`}>
        
        {/* Header: adapts between Standard and Focused Reading Mode */}
        {!isFocusedReading ? (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between p-5 border-b border-[#262626] bg-[#0a0a0a] gap-4">
            <div className="space-y-2 pr-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                  {report.severity} {report.cvssScore}
                </span>
                <StatusBadge status={report.status} size="sm" />
                <span className="text-xs font-mono text-zinc-400 bg-[#121212] px-2 py-0.5 rounded border border-[#262626]">
                  {report.platform}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Alvo: <strong className="text-white font-mono">{report.target}</strong>
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-light text-white leading-snug">
                {report.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
              <button
                id="btn-toggle-intel-sidebar"
                type="button"
                onClick={() => setShowIntelSidebar(!showIntelSidebar)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all border ${
                  showIntelSidebar 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm' 
                    : 'bg-[#141414] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#1a1a1a]'
                }`}
                title="Pesquisar notícias recentes e avisos de segurança no Google Search"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Intel & Advisories</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              <button
                id="btn-how-it-works"
                type="button"
                onClick={() => setShowToolExplanation(!showToolExplanation)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all border ${
                  showToolExplanation 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-[#141414] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#1a1a1a]'
                }`}
                title="Explicar como funciona a ferramenta"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Como Funciona</span>
              </button>

              <button
                id="btn-activate-focus-reading"
                type="button"
                onClick={() => setIsFocusedReading(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold transition-all hover:border-emerald-500/50 shadow-sm"
                title="Ativar modo de leitura focada para revisão técnica"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Leitura Focada</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#171717] transition-colors ml-1"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* Focused Reading Header */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-[#262626] bg-[#0c0c0c] gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  MODO LEITURA FOCADA
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                  {report.severity} {report.cvssScore}
                </span>
                <StatusBadge status={report.status} size="xs" />
                <span className="text-xs font-mono text-zinc-400">
                  Alvo: <strong className="text-zinc-200">{report.target}</strong>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-normal text-white leading-snug truncate">
                {report.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {/* Font size picker */}
              <div className="flex items-center bg-[#141414] border border-[#262626] rounded-lg p-0.5 text-xs font-mono">
                <span className="text-[10px] text-zinc-500 px-2 uppercase font-semibold hidden md:inline">Fonte:</span>
                <button
                  type="button"
                  onClick={() => setReadingFontSize('normal')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    readingFontSize === 'normal'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Tamanho normal (16px)"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setReadingFontSize('large')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    readingFontSize === 'large'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Tamanho grande (18px)"
                >
                  Grande
                </button>
                <button
                  type="button"
                  onClick={() => setReadingFontSize('xlarge')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    readingFontSize === 'xlarge'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Tamanho extra grande (20px)"
                >
                  Extra
                </button>
              </div>

              <button
                id="btn-focus-toggle-intel-sidebar"
                type="button"
                onClick={() => setShowIntelSidebar(!showIntelSidebar)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all border ${
                  showIntelSidebar 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm' 
                    : 'bg-[#141414] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#1a1a1a]'
                }`}
                title="Pesquisar notícias recentes e avisos de segurança no Google Search"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Intel & Advisories</span>
              </button>

              <button
                type="button"
                onClick={() => setShowToolExplanation(!showToolExplanation)}
                className={`p-2 rounded text-xs font-mono transition-all border ${
                  showToolExplanation 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-[#141414] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#1a1a1a]'
                }`}
                title="Explicar como funciona a ferramenta"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                id="btn-exit-focus-reading"
                type="button"
                onClick={() => setIsFocusedReading(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#222] text-zinc-300 hover:text-white border border-[#2a2a2a] text-xs font-mono transition-colors"
                title="Sair do modo focado e voltar à visão padrão"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visão Normal</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#171717] transition-colors"
                title="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher - Completely hidden in Focused Reading Mode */}
        {!isFocusedReading && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a] border-b border-[#262626] text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
                activeTab === 'details' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório & Impacto</span>
            </button>

            <button
              onClick={() => setActiveTab('poc')}
              className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
                activeTab === 'poc' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>PoC & Passos</span>
            </button>

            <button
              id="tab-btn-checklist"
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
                activeTab === 'checklist' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Checklist ({completedCount}/{totalCount})</span>
              {completionPercentage === 100 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
                activeTab === 'timeline' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Linha do Tempo ({report.timeline.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
                activeTab === 'export' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Exportar & Despacho</span>
            </button>
          </div>
        )}

        {/* Modal Body: Outer flex container to host the main content and Google Search Intel Sidebar side-by-side */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* Main content column: Focused Reading View vs Standard Tabbed View */}
          <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
            {isFocusedReading ? (
              <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1 text-zinc-300">
                {/* Explanation card if toggled */}
            {showToolExplanation && (
              <ToolExplanationCard 
                onClose={() => setShowToolExplanation(false)} 
                isFocusModeActive={true} 
              />
            )}

            {/* Quick Metadata Bar for Focused Review */}
            <div className="p-4 rounded-xl bg-[#101010] border border-[#262626] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Alvo Auditado</span>
                <span className="text-zinc-200 font-bold truncate block">{report.target}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Tipo de Vulnerabilidade</span>
                <span className="text-zinc-200 font-bold truncate block">{report.vulnerabilityType}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Fraqueza CWE</span>
                <span className="text-zinc-200 font-bold truncate block">{report.cwe}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Vetor CVSS 3.1</span>
                <span className="text-emerald-400 font-bold truncate block">{report.cvssVector}</span>
              </div>
            </div>

            {/* 1. Sumário Executivo com tipografia ampliada */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  1. Sumário Executivo
                </h3>
              </div>
              <div className={`p-5 sm:p-6 rounded-xl bg-[#121212] border border-[#262626] ${
                readingFontSize === 'xlarge' 
                  ? 'text-xl leading-relaxed text-zinc-100 font-sans' 
                  : readingFontSize === 'large' 
                    ? 'text-lg leading-relaxed text-zinc-100 font-sans' 
                    : 'text-base leading-relaxed text-zinc-200 font-sans'
              } shadow-inner`}>
                {report.summary}
              </div>
            </div>

            {/* 2. Passos para Reprodução Determinística com tipografia ampliada */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    2. Etapas para Reprodução Determinística
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {report.stepsToReproduce.length} passos verificáveis
                </span>
              </div>

              <div className="space-y-3.5">
                {report.stepsToReproduce.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-[#121212] border border-[#262626] hover:border-emerald-500/30 transition-colors shadow-sm"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 mt-0.5 shadow-inner">
                      {idx + 1}
                    </div>
                    <div className={`flex-1 ${
                      readingFontSize === 'xlarge' 
                        ? 'text-lg leading-relaxed text-zinc-100 font-mono' 
                        : readingFontSize === 'large' 
                          ? 'text-base leading-relaxed text-zinc-100 font-mono' 
                          : 'text-sm leading-relaxed text-zinc-200 font-mono'
                    }`}>
                      {step.replace(/^\d+\.\s*/, '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Prova de Conceito (PoC) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    3. Prova de Conceito (HTTP Request / Payload)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(report.proofOfConcept);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-emerald-500/20 border border-[#262626] text-xs font-mono text-emerald-400 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar PoC'}</span>
                </button>
              </div>

              <div className="relative rounded-xl bg-[#0e0e0e] border border-[#262626] p-5 font-mono text-xs sm:text-sm text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                {report.proofOfConcept}
              </div>
            </div>

            {/* 4. Impacto Técnico & Risco Corporativo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  4. Impacto no Negócio & Análise de Risco
                </h3>
              </div>
              <div className={`p-5 rounded-xl bg-[#121212] border border-[#262626] ${
                readingFontSize === 'xlarge' 
                  ? 'text-lg leading-relaxed text-zinc-100 font-sans' 
                  : readingFontSize === 'large' 
                    ? 'text-base leading-relaxed text-zinc-100 font-sans' 
                    : 'text-sm leading-relaxed text-zinc-200 font-sans'
              }`}>
                {report.businessImpact}
              </div>
            </div>

            {/* 5. Recomendação de Remediação */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  5. Recomendação de Remediação
                </h3>
              </div>
              <div className={`p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-100 leading-relaxed whitespace-pre-line ${
                readingFontSize === 'xlarge' 
                  ? 'text-lg font-sans' 
                  : readingFontSize === 'large' 
                    ? 'text-base font-sans' 
                    : 'text-sm font-sans'
              }`}>
                {report.remediation}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Tabbed Body */
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-zinc-300">
            
            {/* TAB 1: DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-6">

                {/* Tool Explanation Card if open in normal mode */}
                {showToolExplanation && (
                  <ToolExplanationCard 
                    onClose={() => setShowToolExplanation(false)}
                    onActivateFocusMode={() => setIsFocusedReading(true)}
                    isFocusModeActive={false}
                  />
                )}

                {/* Informational Guidance Banner about Focused Reading & Tool */}
                <div className="p-3.5 rounded-xl bg-emerald-950/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-100 font-mono">Modo de Leitura Focada Disponível:</span>
                      <p className="text-[11px] text-zinc-400">Oculte formulários e amplie a tipografia do sumário e passos para facilitar a revisão técnica.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowIntelSidebar(true)}
                      className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#222] text-emerald-400 border border-emerald-500/30 text-[11px] font-mono transition-colors flex items-center gap-1"
                      title="Abrir painel lateral de notícias e avisos de segurança via Google Search"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Notícias & Avisos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowToolExplanation(true)}
                      className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#222] text-zinc-300 border border-[#2a2a2a] text-[11px] font-mono transition-colors"
                    >
                      Como Funciona
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFocusedReading(true)}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] transition-colors shadow-sm"
                    >
                      Ativar Leitura Focada
                    </button>
                  </div>
                </div>
              
              {/* Executive Summary */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">1. Resumo Executivo</h4>
                <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] leading-relaxed text-zinc-200 font-mono text-xs">
                  {report.summary}
                </div>
              </div>

              {/* Technical Classification Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Tipo de Falha</span>
                  <p className="font-semibold text-zinc-200">{report.vulnerabilityType}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Fraqueza (CWE)</span>
                  <p className="font-semibold text-zinc-200 truncate">{report.cwe}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">CVSS 3.1 Vector</span>
                  <p className="font-mono text-xs text-emerald-400 truncate">{report.cvssVector}</p>
                </div>
              </div>

              {/* Tags & Categorization (Automatic & Manual) */}
              {(() => {
                const autoTags = getReportAutoTags(report);
                const hasTags = autoTags.length > 0 || (report.tags && report.tags.length > 0);
                if (!hasTags) return null;

                return (
                  <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                        Tags & Categorização
                      </span>
                      {autoTags.length > 0 && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Classificação Inteligente</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {/* Auto-extracted tags */}
                      {autoTags.map(at => (
                        <span 
                          key={at.tag} 
                          className={`px-2 py-0.5 rounded text-xs font-mono border flex items-center gap-1.5 ${at.color.bg} ${at.color.text} ${at.color.border}`}
                          title={`Tag automática: ${at.label} (${at.category}) detectada pela palavra-chave "${at.matchedKeyword}"`}
                        >
                          <Sparkles className="w-2.5 h-2.5 opacity-80" />
                          <span>{at.tag}</span>
                          <span className="text-[9px] opacity-70 border-l border-current pl-1 ml-0.5">
                            {at.category}
                          </span>
                        </span>
                      ))}

                      {/* Manual tags not matching auto tags */}
                      {report.tags && report.tags
                        .filter(rawTag => {
                          const norm = rawTag.startsWith('#') ? rawTag.toLowerCase() : `#${rawTag.toLowerCase()}`;
                          return !autoTags.some(at => at.tag === norm);
                        })
                        .map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-xs font-mono text-zinc-300">
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })()}

              {/* CVEs Linked */}
              {report.cveIds.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Bases de CVE Vinculadas</span>
                  <div className="flex flex-wrap gap-2">
                    {report.cveIds.map(cve => (
                      <span key={cve} className="px-2 py-0.5 rounded bg-[#171717] border border-[#262626] text-xs font-mono text-blue-400 font-bold">
                        {cve}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Business Impact */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">2. Impacto no Negócio & Risco Corporativo</h4>
                <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] leading-relaxed text-zinc-200 text-xs">
                  {report.businessImpact}
                </div>
              </div>

              {/* Remediation */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">3. Recomendação de Remediação</h4>
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-100 leading-relaxed whitespace-pre-line text-xs">
                  {report.remediation}
                </div>
              </div>

              {/* Section 4: Checklist de Validação Técnica Pré-Submissão */}
              <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <ListChecks className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        4. Checklist de Validação Técnica Pré-Submissão
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        completionPercentage === 100 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {completedCount}/{totalCount} ({completionPercentage}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Marque as tarefas validadas para este achado antes do envio ou despacho às plataformas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-emerald-400 text-[11px] font-mono uppercase tracking-wider transition-colors shrink-0"
                  >
                    <span>Abrir Aba Checklist</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden border border-[#262626]">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        completionPercentage === 100 ? 'bg-emerald-400' : 'bg-emerald-500/80'
                      }`}
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Tasks List with interactive checkbox toggle */}
                <div className="space-y-2">
                  {checklist.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        task.completed 
                          ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/30' 
                          : 'bg-[#171717] border-[#262626] hover:border-zinc-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTask(task.id);
                          }}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
                            task.completed 
                              ? 'bg-emerald-500 text-black font-bold' 
                              : 'border border-zinc-500 hover:border-emerald-400'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <span className={`text-xs font-mono transition-colors truncate ${
                          task.completed ? 'text-zinc-400 line-through' : 'text-zinc-200 font-medium'
                        }`}>
                          {task.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.completed ? (
                          <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Validado
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-500 bg-[#121212] px-2 py-0.5 rounded border border-[#262626]">
                            Pendente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remover tarefa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline Add Task Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddTask(quickAddInput);
                    setQuickAddInput('');
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={quickAddInput}
                    onChange={(e) => setQuickAddInput(e.target.value)}
                    placeholder="Adicionar tarefa específica (ex: 'Verificar reprodução', 'Confirmar impacto')..."
                    className="flex-1 bg-[#171717] border border-[#262626] rounded px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!quickAddInput.trim()}
                    className="px-3 py-1.5 rounded bg-[#1f1f1f] hover:bg-emerald-600 hover:text-white text-zinc-300 border border-[#2e2e2e] text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </form>
              </div>

              {/* Bounty info & Quick Update Box */}
              <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Recompensa Atual</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {report.bountyAmount > 0 ? formatCurrency(report.bountyAmount, 'USD') : 'Pendente / Não concedido'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                      className="bg-[#171717] border border-[#262626] text-zinc-200 text-xs rounded px-3 py-1.5 font-mono"
                    >
                      <option value="DRAFT">Rascunho</option>
                      <option value="SUBMITTED">Enviado</option>
                      <option value="TRIAGED">Em Triagem</option>
                      <option value="REWARDED">Recompensado ($)</option>
                      <option value="RESOLVED">Resolvido</option>
                      <option value="DUPLICATE">Duplicado</option>
                      <option value="OUT_OF_SCOPE">Fora de Escopo</option>
                    </select>

                    <StatusBadge status={newStatus} size="xs" />

                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-2" />
                      <input
                        type="number"
                        placeholder="Valor $"
                        value={newBounty || ''}
                        onChange={(e) => setNewBounty(Number(e.target.value))}
                        className="w-28 pl-6 pr-2 py-1.5 bg-[#171717] border border-[#262626] rounded text-xs text-zinc-200 font-mono"
                      />
                    </div>

                    <button
                      onClick={handleSaveStatus}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Salvar Status
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Adicionar nota de triagem ou comentário ao salvar status (opcional)..."
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                  className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 font-mono"
                />
              </div>

            </div>
          )}

          {/* TAB 2: POC & STEPS */}
          {activeTab === 'poc' && (
            <div className="space-y-6">
              
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Passos para Reprodução Determinística</h4>
                <div className="space-y-2">
                  {report.stepsToReproduce.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#121212] border border-[#262626]">
                      <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-zinc-200 leading-relaxed font-mono text-xs">{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Prova de Conceito (HTTP Request / Script / Payload)</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(report.proofOfConcept);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 font-mono transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar PoC'}</span>
                  </button>
                </div>

                <div className="relative rounded-lg bg-[#121212] border border-[#262626] p-4 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                  {report.proofOfConcept}
                </div>
              </div>

            </div>
          )}

          {/* TAB: CHECKLIST DE VALIDAÇÃO WORKSPACE */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              {/* Header Banner & Status */}
              <div className={`p-4 rounded-lg border ${
                completionPercentage === 100
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-[#121212] border-[#262626] text-zinc-300'
              } space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded flex items-center justify-center ${
                        completionPercentage === 100
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-[#2b2b2b]'
                      }`}>
                        <ListChecks className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-white font-mono">
                        Protocolo de Validação & Controle de Qualidade
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Critérios específicos de validação para <strong className="text-zinc-200 font-mono">{report.id}</strong> ({report.vulnerabilityType} em {report.target}).
                    </p>
                  </div>

                  {/* Summary Metric */}
                  <div className="flex items-center gap-3 bg-[#0a0a0a] p-2.5 rounded-lg border border-[#262626]">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-zinc-500">Progresso</div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {completedCount} / {totalCount} ({completionPercentage}%)
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-300">
                      {completionPercentage}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#171717] rounded-full h-2 overflow-hidden border border-[#262626]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      completionPercentage === 100 ? 'bg-emerald-400' : 'bg-emerald-500/80'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAll(true)}
                      className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#242424] text-zinc-300 border border-[#2b2b2b] text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3 h-3 text-emerald-400" />
                      <span>Marcar Todas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAll(false)}
                      className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#242424] text-zinc-300 border border-[#2b2b2b] text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Square className="w-3 h-3 text-zinc-500" />
                      <span>Desmarcar Todas</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#242424] text-zinc-400 hover:text-white border border-[#2b2b2b] text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    title="Restaurar lista padrão de tarefas"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrões</span>
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                {checklist.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between gap-4 ${
                      task.completed
                        ? 'bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/40'
                        : 'bg-[#121212] border-[#262626] hover:border-zinc-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTask(task.id);
                        }}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-all shrink-0 ${
                          task.completed
                            ? 'bg-emerald-500 text-black shadow-sm'
                            : 'border-2 border-zinc-600 hover:border-emerald-400'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="space-y-0.5 min-w-0">
                        <div className={`text-xs font-mono transition-colors ${
                          task.completed ? 'text-zinc-400 line-through' : 'text-white font-medium'
                        }`}>
                          {task.label}
                        </div>
                        {task.completedAt && (
                          <div className="text-[10px] font-mono text-zinc-500">
                            Validado em: {new Date(task.completedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.completed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          VALIDADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#171717] text-amber-400 border border-amber-500/20">
                          PENDENTE
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Task Form */}
              <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Adicionar Nova Tarefa de Validação
                </h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddTask();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="ex: 'Verificar reprodução', 'Confirmar impacto', 'Testar bypass em sessão privada'..."
                    className="flex-1 bg-[#171717] border border-[#262626] rounded px-3 py-2 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskInput.trim()}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider font-mono transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </form>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Sugestões Rápidas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Verificar reprodução em janela anônima',
                      'Confirmar impacto no negócio',
                      'Testar bypass de WAF / rate limiting',
                      'Checar se o alvo ainda está in-scope',
                      'Validar cabeçalhos CORS / CSRF Token',
                      'Conferir ausência de dados de outros usuários no PoC'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddTask(preset)}
                        className="px-2 py-1 rounded bg-[#171717] hover:bg-[#202020] border border-[#2b2b2b] text-[11px] font-mono text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bug Bounty Triager Advice */}
              <div className="p-4 rounded-lg bg-[#0d0d0d] border border-emerald-500/20 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Dicas dos Triadores (HackerOne & Bugcrowd)</span>
                </div>
                <ul className="text-zinc-400 space-y-1 text-[11px] list-disc list-inside">
                  <li><strong>Reprodutibilidade:</strong> Triadores descartam relatórios que falham ao ser reproduzidos no primeiro teste. Inclua sempre parâmetros exatos e cookies de teste.</li>
                  <li><strong>Impacto Real:</strong> Evite conjecturas teóricas ("o invasor poderia um dia..."). Demonstre exatamente qual dado confidencial ou ação administrativa foi violada.</li>
                  <li><strong>Respeito ao Escopo:</strong> Nunca teste contas ou dados que não pertençam ao seu usuário de teste.</li>
                </ul>
              </div>

            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (() => {
            const { totalHours: reportTimelineHours } = calculateReportHoursFromTimeline(report);
            const reportBountyUSD = report.bountyAmount || 0;
            const reportHourlyRate = reportTimelineHours > 0 ? Math.round((reportBountyUSD / reportTimelineHours) * 100) / 100 : 0;

            const handleAddEventSubmit = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newEventTitle.trim()) return;
              onAddTimelineEvent(report.id, {
                date: new Date().toISOString().split('T')[0],
                title: newEventTitle.trim(),
                notes: newEventNotes.trim() ? `${newEventNotes.trim()} (${newEventHours}h investidas)` : `Sessão de trabalho: ${newEventHours}h investidas`,
                type: 'note',
                hoursSpent: newEventHours
              });
              setShowAddTimelineEvent(false);
              setNewEventNotes('');
              setNewEventHours(2);
            };

            return (
              <div className="space-y-5">
                {/* Timeline & Hourly Yield Summary Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#121613] to-[#121212] border border-emerald-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>Tempo no Cronograma</span>
                    </span>
                    <p className="text-xl font-mono font-light text-white">
                      {reportTimelineHours} <span className="text-xs text-zinc-400">horas</span>
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {report.timeline.length} etapas registradas
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-amber-400" />
                      <span>Recompensa Total</span>
                    </span>
                    <p className="text-xl font-mono font-light text-white">
                      {formatCurrency(reportBountyUSD, 'USD')}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {report.currency || 'USD'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Timer className="w-3 h-3 text-emerald-400" />
                      <span>Valor por Hora ($/h)</span>
                    </span>
                    <p className="text-xl font-mono font-light text-emerald-400">
                      {reportBountyUSD > 0 ? `${formatCurrency(reportHourlyRate, 'USD')} / h` : 'Pendente'}
                    </p>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {reportHourlyRate >= 200 ? '🔥 Alto Retorno' : 'Rentabilidade calculada'}
                    </span>
                  </div>
                </div>

                {/* Toolbar & Add Event Toggle */}
                <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    Histórico Cronológico ({report.timeline.length} eventos)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddTimelineEvent(!showAddTimelineEvent)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>{showAddTimelineEvent ? 'Fechar Formulário' : '+ Registrar Horas / Etapa'}</span>
                  </button>
                </div>

                {/* Inline Time Logging Form */}
                {showAddTimelineEvent && (
                  <form onSubmit={handleAddEventSubmit} className="p-4 rounded-xl bg-[#141414] border border-[#2e2e2e] space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-zinc-200 uppercase">
                        Nova Etapa com Registro de Horas
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Atualiza o cálculo de $/h automaticamente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 font-mono mb-1">
                          Título da Atividade:
                        </label>
                        <input
                          type="text"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          placeholder="Ex: Fuzzing de endpoints ou Exploração de PoC"
                          className="w-full bg-[#181818] border border-[#333] text-zinc-200 text-xs rounded p-2 font-sans outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 font-mono mb-1">
                          Horas Dedicadas:
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.25"
                          max="80"
                          value={newEventHours}
                          onChange={(e) => setNewEventHours(parseFloat(e.target.value) || 1)}
                          className="w-full bg-[#181818] border border-[#333] text-zinc-200 text-xs rounded p-2 font-mono outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 font-mono mb-1">
                        Notas & Evidências da Sessão:
                      </label>
                      <textarea
                        value={newEventNotes}
                        onChange={(e) => setNewEventNotes(e.target.value)}
                        rows={2}
                        placeholder="Descreva as técnicas aplicadas, parâmetros testados e resultados..."
                        className="w-full bg-[#181818] border border-[#333] text-zinc-200 text-xs rounded p-2 font-sans outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddTimelineEvent(false)}
                        className="px-3 py-1 bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono rounded"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded transition-colors"
                      >
                        Salvar no Cronograma
                      </button>
                    </div>
                  </form>
                )}

                {/* Timeline Events List */}
                <div className="space-y-4 pl-2 border-l-2 border-[#262626] ml-3">
                  {report.timeline.map((event) => (
                    <div key={event.id} className="relative pl-6 space-y-1">
                      <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-[#0a0a0a]" />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-semibold text-zinc-200">{event.title}</h5>
                          {event.hoursSpent !== undefined && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {event.hoursSpent}h investidas
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-zinc-500">{event.date}</span>
                      </div>
                      {event.notes && (
                        <p className="text-xs text-zinc-400 leading-relaxed bg-[#121212] p-2.5 rounded border border-[#262626] font-mono">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: EXPORT & DISPATCH */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#121212] border border-[#262626]">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Formatação para Plataformas Parceiras</h4>
                  <p className="text-xs text-zinc-400">
                    Gere o relatório formatado de acordo com a sintaxe exigida pelo programa para agilizar a triagem.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={exportPlatform}
                    onChange={(e) => setExportPlatform(e.target.value as any)}
                    className="bg-[#171717] border border-[#262626] text-zinc-200 text-xs rounded px-3 py-1.5 font-mono"
                  >
                    <option value="HackerOne">HackerOne Markdown</option>
                    <option value="Bugcrowd">Bugcrowd Template</option>
                    <option value="Intigriti">Intigriti Format</option>
                    <option value="General">Markdown Padrão</option>
                  </select>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-200 font-semibold text-xs uppercase tracking-wider transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Automated Dispatch Action */}
              <div className="p-4 rounded-lg bg-[#121212] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      Automação de Envio (API / Webhook)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Transmita este achado diretamente para o endpoint de triagem ou webhook da plataforma <strong className="text-zinc-200 font-mono">{report.platform}</strong>.
                  </p>
                </div>

                <button
                  onClick={handleDispatchToPlatform}
                  disabled={isDispatching}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{isDispatching ? 'Transmitindo...' : `Despachar para ${report.platform}`}</span>
                </button>
              </div>

              {/* Receipt if dispatched */}
              {dispatchReceipt && (
                <div className="p-4 rounded-lg bg-[#121212] border border-emerald-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono uppercase">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Recibo de Envio Confirmado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
                    <div>Protocolo: <strong className="text-emerald-400">{dispatchReceipt.submissionId}</strong></div>
                    <div>Horário: {new Date(dispatchReceipt.submittedAt).toLocaleTimeString()}</div>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">{dispatchReceipt.message}</p>
                </div>
              )}

              {/* PGP Cryptographic Signing Section */}
              <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Key className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Assinatura Criptográfica PGP (OpenPGP / RFC 4880)
                      </span>
                      {report.pgpSignature && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Assinado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Garanta não-repúdio, integridade e conformidade com diretrizes de Responsible Disclosure assinando este relatório com chave PGP.
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenPgpSigner && onOpenPgpSigner(report.id)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shrink-0"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{report.pgpSignature ? 'Reassinar / Gerenciar' : 'Assinar com PGP'}</span>
                  </button>
                </div>

                {report.pgpSignature && (
                  <div className="p-3 rounded bg-[#0a0a0a] border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                      <div>
                        Fingerprint: <strong className="text-emerald-400">{report.pgpSignature.keyFingerprint}</strong>
                      </div>
                      <div>
                        Data: {new Date(report.pgpSignature.signedAt).toLocaleString()}
                      </div>
                      <button
                        onClick={() => {
                          if (report.pgpSignature?.signedText) {
                            navigator.clipboard.writeText(report.pgpSignature.signedText);
                            setCopiedPgp(true);
                            setTimeout(() => setCopiedPgp(false), 2000);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-200 text-[10px] uppercase tracking-wider font-semibold transition-all"
                      >
                        {copiedPgp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPgp ? 'Copiado!' : 'Copiar Bloco Assinado'}</span>
                      </button>
                    </div>

                    <pre className="p-2.5 rounded bg-[#121212] border border-[#262626] text-[10px] text-emerald-300 font-mono overflow-x-auto whitespace-pre max-h-32">
                      {report.pgpSignature.signedText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Markdown Preview Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>Pré-visualização do Relatório</span>
                  <span>{formattedMarkdown.length} caracteres</span>
                </div>
                <pre className="p-4 rounded-lg bg-[#121212] border border-[#262626] text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed max-h-72">
                  {formattedMarkdown}
                </pre>
              </div>

            </div>
          )}

        </div>
        )}

          </div>

          {/* Google Search Security Intel Sidebar */}
          {showIntelSidebar && (
            <SecurityIntelSidebar
              target={report.target}
              vulnerabilityType={report.vulnerabilityType}
              cwe={report.cwe}
              onClose={() => setShowIntelSidebar(false)}
              onApplyToReportNotes={(snippet) => {
                if (onAddTimelineEvent) {
                  onAddTimelineEvent(report.id, {
                    date: new Date().toISOString().split('T')[0],
                    title: 'Inteligência de Ameaça (Google Search)',
                    notes: snippet,
                    type: 'note'
                  });
                }
              }}
            />
          )}

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border-t border-[#262626] text-xs">
          {isFocusedReading ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                  {statusBadge.label}
                </span>
                <span>•</span>
                <span>Recompensa: <strong className="text-emerald-400">{report.bountyAmount > 0 ? formatCurrency(report.bountyAmount, 'USD') : 'Pendente'}</strong></span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline text-[11px] text-zinc-400">Modo de Leitura Focada Ativo</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 bg-[#171717] hover:bg-[#222] text-zinc-300 border border-[#262626] font-semibold px-3 py-1.5 rounded uppercase tracking-wider text-xs transition-all"
                  title="Copiar relatório completo em formato Markdown"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Markdown'}</span>
                </button>

                <button
                  onClick={() => {
                    onEdit(report);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 bg-[#171717] hover:bg-[#262626] text-zinc-300 border border-[#262626] font-semibold px-3 py-1.5 rounded uppercase tracking-wider text-xs transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar</span>
                </button>

                <button
                  id="btn-footer-exit-focus"
                  onClick={() => setIsFocusedReading(false)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded uppercase tracking-wider text-xs transition-all shadow-sm"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair da Leitura Focada</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este relatório?')) {
                    onDelete(report.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded hover:bg-rose-500/10 uppercase tracking-wider text-xs transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onEdit(report);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 bg-[#171717] hover:bg-[#262626] text-zinc-300 border border-[#262626] font-semibold px-3 py-1.5 rounded uppercase tracking-wider text-xs transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-[#262626] hover:bg-[#333333] text-zinc-200 font-semibold px-3 py-1.5 rounded uppercase tracking-wider text-xs transition-all"
                >
                  Fechar
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
