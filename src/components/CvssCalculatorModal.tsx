import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  ShieldAlert, 
  X, 
  ArrowRight, 
  Info, 
  Sliders, 
  Flame, 
  Lock, 
  Eye, 
  Server, 
  FileText, 
  Send, 
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { CvssMetrics, calculateCvssScore, parseCvssVector, DEFAULT_CVSS } from '../utils/cvss';
import { Severity, VulnerabilityReport } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

export interface CvssCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports?: VulnerabilityReport[];
  initialVector?: string;
  initialReportId?: string;
  onApplyToReport?: (reportId: string, vector: string, score: number, severity: Severity) => void;
  onCreateReportWithVector?: (vector: string, score: number, severity: Severity) => void;
}

interface MetricOption<T> {
  value: T;
  label: string;
  shortLabel: string;
  description: string;
  severityLevel: 'critical' | 'high' | 'medium' | 'low' | 'neutral';
}

const ATTACK_VECTORS: MetricOption<CvssMetrics['av']>[] = [
  { value: 'N', label: 'Network (N)', shortLabel: 'Remoto / Internet', description: 'Explorável remotamente via IP/Internet sem requerer acesso local.', severityLevel: 'critical' },
  { value: 'A', label: 'Adjacent (A)', shortLabel: 'Rede Adjacente', description: 'Requer mesma rede física, VLAN, Bluetooth, WiFi ou subnet.', severityLevel: 'high' },
  { value: 'L', label: 'Local (L)', shortLabel: 'Local / Shell', description: 'Requer shell local, CLI ou upload interativo de arquivo no servidor.', severityLevel: 'medium' },
  { value: 'P', label: 'Physical (P)', shortLabel: 'Acesso Físico', description: 'Requer acesso físico direto ao hardware, console ou periférico.', severityLevel: 'low' }
];

const ATTACK_COMPLEXITIES: MetricOption<CvssMetrics['ac']>[] = [
  { value: 'L', label: 'Low (L)', shortLabel: 'Baixa Complexidade', description: 'Ataque repetível e determinístico sem depender de circunstâncias raras.', severityLevel: 'critical' },
  { value: 'H', label: 'High (H)', shortLabel: 'Alta Complexidade', description: 'Depende de race conditions, bypass de proteções estocásticas ou segredos.', severityLevel: 'medium' }
];

const PRIVILEGES_REQUIRED: MetricOption<CvssMetrics['pr']>[] = [
  { value: 'N', label: 'None (N)', shortLabel: 'Nenhum Privilégio', description: 'Não requer autenticação (acesso aberto a qualquer atacante anônimo).', severityLevel: 'critical' },
  { value: 'L', label: 'Low (L)', shortLabel: 'Usuário Comum', description: 'Requer conta básica de usuário cadastrado no sistema.', severityLevel: 'medium' },
  { value: 'H', label: 'High (H)', shortLabel: 'Administrador / Root', description: 'Requer credenciais elevadas de administrador ou operador.', severityLevel: 'low' }
];

const USER_INTERACTIONS: MetricOption<CvssMetrics['ui']>[] = [
  { value: 'N', label: 'None (N)', shortLabel: 'Sem Interação', description: 'Ataque totalmente autônomo sem nenhuma intervenção da vítima.', severityLevel: 'critical' },
  { value: 'R', label: 'Required (R)', shortLabel: 'Interação Requerida', description: 'Vítima precisa clicar em link, abrir arquivo malicioso ou aceitar diálogo.', severityLevel: 'medium' }
];

const SCOPES: MetricOption<CvssMetrics['s']>[] = [
  { value: 'U', label: 'Unchanged (U)', shortLabel: 'Escopo Não Alterado', description: 'O impacto de segurança é restrito apenas ao componente vulnerável.', severityLevel: 'neutral' },
  { value: 'C', label: 'Changed (C)', shortLabel: 'Escopo Alterado', description: 'Afeta recursos além da autoridade de segurança do componente (ex: XSS, VM Escape).', severityLevel: 'critical' }
];

const IMPACT_LEVELS: MetricOption<'H' | 'L' | 'N'>[] = [
  { value: 'H', label: 'High (H)', shortLabel: 'Alto Impacto', description: 'Comprometimento total do componente ou vazamento irrestrito de dados.', severityLevel: 'critical' },
  { value: 'L', label: 'Low (L)', shortLabel: 'Baixo Impacto', description: 'Comprometimento parcial ou acesso a informações públicas/não críticas.', severityLevel: 'medium' },
  { value: 'N', label: 'None (N)', shortLabel: 'Nenhum Impacto', description: 'Nenhum efeito perceptível nesta dimensão de segurança.', severityLevel: 'neutral' }
];

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  tag: string;
  metrics: CvssMetrics;
}

const POPULAR_PRESETS: PresetItem[] = [
  {
    id: 'rce-unauth',
    name: 'RCE Não Autenticado',
    desc: 'Execução Remota de Código sem autenticação com controle total',
    tag: '9.8 CRIT',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'H' }
  },
  {
    id: 'sqli-dump',
    name: 'SQL Injection Crítico',
    desc: 'Injeção SQL permitindo dump completo do banco de dados e bypass',
    tag: '9.8 CRIT',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'H' }
  },
  {
    id: 'cloud-ssrf',
    name: 'Cloud SSRF (Metadata)',
    desc: 'Requisição ao 169.254.169.254 com exfiltração de chaves IAM temporárias',
    tag: '8.6 HIGH',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'C', c: 'H', i: 'N', a: 'N' }
  },
  {
    id: 'idor-pii',
    name: 'IDOR Exfiltração de PII',
    desc: 'Enumeração de identificadores expondo dados pessoais e fiscais',
    tag: '7.5 HIGH',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'N', a: 'N' }
  },
  {
    id: 'stored-xss',
    name: 'Stored XSS (Scope Changed)',
    desc: 'Script persistente no navegador afetando sessões de outros clientes',
    tag: '6.5 MED',
    metrics: { av: 'N', ac: 'L', pr: 'L', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' }
  },
  {
    id: 'reflected-xss',
    name: 'Reflected XSS',
    desc: 'Injeção via URL requerendo que a vítima clique em link malicioso',
    tag: '6.1 MED',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' }
  },
  {
    id: 'csrf-action',
    name: 'CSRF em Ação Crítica',
    desc: 'Forjamento de requisição para alteração de email ou senha',
    tag: '4.3 MED',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'U', c: 'N', i: 'L', a: 'N' }
  },
  {
    id: 'info-disclosure',
    name: 'Vazamento de Chaves / PII',
    desc: 'Endpoint expõe segredos de API ou credenciais sem escrita',
    tag: '5.3 MED',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'L', i: 'N', a: 'N' }
  },
  {
    id: 'open-redirect',
    name: 'Open Redirect',
    desc: 'Redirecionamento aberto para phishing sem compromisso de dados',
    tag: '4.7 MED',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'C', c: 'N', i: 'L', a: 'N' }
  }
];

export const CvssCalculatorModal: React.FC<CvssCalculatorModalProps> = ({
  isOpen,
  onClose,
  reports = [],
  initialVector,
  initialReportId,
  onApplyToReport,
  onCreateReportWithVector
}) => {
  // Initialize metrics from vector or fallback to default
  const [metrics, setMetrics] = useState<CvssMetrics>(() => {
    if (initialVector) {
      try {
        return parseCvssVector(initialVector);
      } catch {
        return { ...DEFAULT_CVSS };
      }
    }
    return { ...DEFAULT_CVSS };
  });

  const [vectorInput, setVectorInput] = useState('');
  const [vectorInputError, setVectorInputError] = useState<string | null>(null);
  const [copiedVector, setCopiedVector] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [selectedTargetReportId, setSelectedTargetReportId] = useState<string>(initialReportId || (reports[0]?.id || ''));
  const [appliedSuccessMessage, setAppliedSuccessMessage] = useState<string | null>(null);

  // Sync state when initialVector or initialReportId changes
  useEffect(() => {
    if (initialVector) {
      try {
        const parsed = parseCvssVector(initialVector);
        setMetrics(parsed);
      } catch {
        // ignore
      }
    }
    if (initialReportId) {
      setSelectedTargetReportId(initialReportId);
    } else if (reports.length > 0 && !selectedTargetReportId) {
      setSelectedTargetReportId(reports[0].id);
    }
  }, [initialVector, initialReportId, reports]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time calculation
  const { score, vector, severity, impactScore, exploitabilityScore } = useMemo(() => {
    return calculateCvssScore(metrics);
  }, [metrics]);

  const sevBadge = getSeverityBadgeColor(severity);

  const handleMetricChange = <K extends keyof CvssMetrics>(key: K, value: CvssMetrics[K]) => {
    setMetrics(prev => ({
      ...prev,
      [key]: value
    }));
    setVectorInputError(null);
    setAppliedSuccessMessage(null);
  };

  const handleApplyPreset = (preset: PresetItem) => {
    setMetrics(preset.metrics);
    setVectorInputError(null);
    setAppliedSuccessMessage(null);
  };

  const handleReset = () => {
    setMetrics({ ...DEFAULT_CVSS });
    setVectorInput('');
    setVectorInputError(null);
    setAppliedSuccessMessage(null);
  };

  const handleParseVector = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = vectorInput.trim();
    if (!clean) return;

    if (!clean.toUpperCase().includes('CVSS:3.1') && !clean.toUpperCase().includes('AV:')) {
      setVectorInputError('Vetor inválido. O formato oficial deve ser CVSS:3.1/AV:.../AC:... etc.');
      return;
    }

    try {
      const parsed = parseCvssVector(clean);
      setMetrics(parsed);
      setVectorInput('');
      setVectorInputError(null);
      setAppliedSuccessMessage(null);
    } catch {
      setVectorInputError('Erro ao interpretar o vetor CVSS fornecido.');
    }
  };

  const handleCopyVectorOnly = () => {
    navigator.clipboard.writeText(vector);
    setCopiedVector(true);
    setTimeout(() => setCopiedVector(false), 2200);
  };

  const handleCopyMarkdown = () => {
    const md = `**Gravidade CVSS v3.1:** ${severity} ${score.toFixed(1)}\n**Vetor Técnico:** \`${vector}\`\n- Sub-score de Impacto: ${impactScore}/6.0\n- Sub-score de Explorabilidade: ${exploitabilityScore}/3.9`;
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2200);
  };

  const handleApplyToSelectedReport = () => {
    if (!selectedTargetReportId) return;
    if (onApplyToReport) {
      onApplyToReport(selectedTargetReportId, vector, score, severity);
      const targetRep = reports.find(r => r.id === selectedTargetReportId);
      setAppliedSuccessMessage(`Vetor aplicado com sucesso ao relatório [${selectedTargetReportId}] ${targetRep ? `"${targetRep.title.substring(0, 30)}..."` : ''}!`);
      setTimeout(() => setAppliedSuccessMessage(null), 3500);
    }
  };

  const handleCreateNewWithThisVector = () => {
    if (onCreateReportWithVector) {
      onCreateReportWithVector(vector, score, severity);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Visual score gradient
  const getScoreGradient = (s: number) => {
    if (s >= 9.0) return 'from-red-500 via-rose-500 to-red-600';
    if (s >= 7.0) return 'from-orange-500 via-amber-500 to-orange-600';
    if (s >= 4.0) return 'from-yellow-400 via-amber-400 to-yellow-500';
    if (s > 0) return 'from-blue-400 via-cyan-400 to-indigo-500';
    return 'from-zinc-500 to-zinc-600';
  };

  const scorePercentage = Math.min(Math.max((score / 10) * 100, 0), 100);

  const getOptionButtonClass = (isActive: boolean, option: MetricOption<any>) => {
    if (!isActive) {
      return 'bg-[#121214] border-[#222226] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 hover:bg-[#18181c]';
    }

    switch (option.severityLevel) {
      case 'critical':
        return 'bg-red-950/70 border-red-500 text-red-300 font-bold shadow-[0_0_12px_rgba(239,68,68,0.25)] ring-1 ring-red-400/50';
      case 'high':
        return 'bg-amber-950/70 border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50';
      case 'medium':
        return 'bg-yellow-950/60 border-yellow-500 text-yellow-300 font-bold shadow-[0_0_10px_rgba(234,179,8,0.2)] ring-1 ring-yellow-400/50';
      case 'low':
        return 'bg-blue-950/60 border-blue-500 text-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-blue-400/50';
      case 'neutral':
      default:
        return 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/50';
    }
  };

  return (
    <div 
      id="cvss-calculator-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="cvss-calculator-modal-container"
        className="relative w-full max-w-5xl bg-[#0a0a0c] border border-[#27272a] rounded-2xl shadow-2xl max-h-[94vh] flex flex-col my-auto overflow-hidden text-zinc-200 font-sans"
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222226] bg-[#0e0e12] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Calculadora CVSS v3.1</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    FIRST.Org Standard
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Calcule a severidade matemática de vulnerabilidades, gere o vetor oficial e aplique diretamente nos seus relatórios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cvss-reset-all"
              onClick={handleReset}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#222226] border border-[#2e2e34] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors"
              title="Restaurar valores padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar</span>
            </button>

            <button
              type="button"
              id="btn-cvss-close-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1f1f24] transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Top Scorecard Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-[#141418] to-[#0f0f13] border border-[#27272e] shadow-inner flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
            
            {/* Left: Big Score & Gauge */}
            <div className="flex items-center gap-4 sm:gap-5 min-w-[280px]">
              <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-[#09090b] border border-[#2a2a30] shadow-xl shrink-0 relative overflow-hidden">
                <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${getScoreGradient(score)}`} />
                <span className="text-4xl font-extralight tracking-tighter text-white font-mono leading-none">
                  {score.toFixed(1)}
                </span>
                <span className={`mt-1.5 px-2 py-0.5 text-[10px] rounded font-mono font-bold border uppercase ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                  {severity}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    <span>Pontuação Base</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {score >= 9.0 ? 'Crítico (Ação Imediata)' : score >= 7.0 ? 'Alto Risco para Negócio' : score >= 4.0 ? 'Severidade Média' : score > 0 ? 'Baixo Impacto' : 'Informativo'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1e1e24] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#2d2d36]">
                  <div 
                    className={`h-full bg-gradient-to-r ${getScoreGradient(score)} rounded-full transition-all duration-300`}
                    style={{ width: `${scorePercentage}%` }}
                  />
                </div>

                {/* Sub-scores */}
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-[10px] font-mono text-zinc-400">
                  <div className="bg-[#18181d] px-2 py-1 rounded border border-[#26262e]">
                    <span className="text-zinc-500 block text-[9px]">Explorabilidade</span>
                    <strong className="text-zinc-200 text-xs">{exploitabilityScore}</strong> / 3.9
                  </div>
                  <div className="bg-[#18181d] px-2 py-1 rounded border border-[#26262e]">
                    <span className="text-zinc-500 block text-[9px]">Impacto (ISS)</span>
                    <strong className="text-zinc-200 text-xs">{impactScore}</strong> / 6.0
                  </div>
                  <div className="bg-[#18181d] px-2 py-1 rounded border border-[#26262e]">
                    <span className="text-zinc-500 block text-[9px]">Escopo</span>
                    <strong className={metrics.s === 'C' ? 'text-red-400 text-xs' : 'text-zinc-200 text-xs'}>
                      {metrics.s === 'C' ? 'Alterado (C)' : 'Contido (U)'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Vector String Output & Copy Actions */}
            <div className="flex flex-col justify-between gap-3 lg:border-l lg:border-[#222228] lg:pl-5 flex-1 min-w-[300px]">
              
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center justify-between">
                  <span>Vetor Oficial CVSS v3.1:</span>
                  <span className="text-[10px] text-zinc-500 lowercase">primeiro padrão global</span>
                </span>
                <div className="p-2.5 rounded-lg bg-[#09090c] border border-[#2a2a32] font-mono text-xs text-emerald-400 select-all break-all leading-relaxed shadow-inner">
                  {vector}
                </div>
              </div>

              {/* Copy & Export Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-cvss-vector"
                  onClick={handleCopyVectorOnly}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                    copiedVector 
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                      : 'bg-[#1e1e24] hover:bg-[#27272f] border-[#33333e] text-zinc-200 hover:text-white'
                  }`}
                  title="Copiar apenas a string do vetor para a área de transferência"
                >
                  {copiedVector ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedVector ? 'Vetor Copiado!' : 'Copiar Vetor'}</span>
                </button>

                <button
                  type="button"
                  id="btn-copy-cvss-markdown"
                  onClick={handleCopyMarkdown}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                    copiedMarkdown 
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                      : 'bg-[#18181d] hover:bg-[#202026] border-[#2c2c34] text-zinc-300 hover:text-white'
                  }`}
                  title="Copiar trecho formatado em Markdown para colar na descrição do bug"
                >
                  {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedMarkdown ? 'Markdown Copiado!' : 'Copiar em Markdown'}</span>
                </button>

                {onCreateReportWithVector && (
                  <button
                    type="button"
                    id="btn-create-report-from-cvss"
                    onClick={handleCreateNewWithThisVector}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-sm ml-auto"
                    title="Abrir novo formulário de relatório com este vetor pré-preenchido"
                  >
                    <span>+ Novo Relatório</span>
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Quick Apply to an Existing Report Banner (when reports exist) */}
          {reports.length > 0 && onApplyToReport && (
            <div className="p-3.5 rounded-xl bg-[#111115] border border-[#24242a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-200 block truncate">
                    Injetar este vetor em um Relatório Existente:
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Atualiza automaticamente o score, severidade e vetor do relatório selecionado.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedTargetReportId}
                  onChange={(e) => {
                    setSelectedTargetReportId(e.target.value);
                    setAppliedSuccessMessage(null);
                  }}
                  className="bg-[#18181e] border border-[#2f2f38] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono max-w-[220px] focus:border-emerald-500 outline-none truncate"
                >
                  {reports.map(rep => (
                    <option key={rep.id} value={rep.id}>
                      [{rep.id}] {rep.title.substring(0, 30)}...
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  id="btn-apply-vector-to-report"
                  onClick={handleApplyToSelectedReport}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-mono font-bold rounded-lg transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar ao Relatório</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {appliedSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{appliedSuccessMessage}</span>
            </div>
          )}

          {/* Vector String Reverse Parser Input Bar */}
          <form onSubmit={handleParseVector} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>Colar ou Importar Vetor CVSS Existente:</span>
              </label>
              <span className="text-[10px] text-zinc-500">Ex: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vectorInput}
                onChange={(e) => {
                  setVectorInput(e.target.value);
                  setVectorInputError(null);
                }}
                placeholder="Cole um vetor aqui (ex: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)"
                className="flex-1 bg-[#121216] border border-[#2b2b34] rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                id="btn-parse-cvss-vector"
                className="px-3 py-1.5 bg-[#1e1e24] hover:bg-[#272730] border border-[#33333e] text-zinc-200 text-xs font-mono rounded-lg transition-colors shrink-0"
              >
                Carregar Vetor
              </button>
            </div>

            {vectorInputError && (
              <p className="text-[11px] font-mono text-red-400 flex items-center gap-1 mt-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 inline" />
                <span>{vectorInputError}</span>
              </p>
            )}
          </form>

          {/* Presets Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Modelos & Presets de Vulnerabilidades Frequentes</span>
              </span>
              <span className="text-[10px] text-zinc-500">Clique para aplicar instantaneamente</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono text-xs">
              {POPULAR_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2.5 rounded-lg bg-[#121216] border border-[#24242a] hover:border-emerald-500/40 hover:bg-[#181820] transition-all text-left group flex flex-col justify-between"
                  title={p.desc}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-zinc-200 group-hover:text-emerald-300 transition-colors truncate">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 line-clamp-1">{p.desc.substring(0, 24)}...</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 shrink-0 font-bold">
                      {p.tag}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#202026] my-4" />

          {/* Metric Groups: 2 Column Layout (Exploitability vs Impact) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1: Exploitability Metrics */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-[#222228]">
                <Server className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  1. Métricas de Explorabilidade (Exploitability)
                </h3>
              </div>

              {/* Attack Vector (AV) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300">Vetor de Ataque (Attack Vector - AV)</span>
                  <span className="text-emerald-400 text-[11px] font-bold">AV:{metrics.av}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-xs">
                  {ATTACK_VECTORS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('av', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.av === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attack Complexity (AC) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300">Complexidade do Ataque (Attack Complexity - AC)</span>
                  <span className="text-emerald-400 text-[11px] font-bold">AC:{metrics.ac}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                  {ATTACK_COMPLEXITIES.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('ac', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.ac === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privileges Required (PR) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-300">Privilégios Requeridos (Privileges Required - PR)</span>
                    {metrics.s === 'C' && (
                      <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-500/30">
                        Ponderado por Escopo Alterado
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-400 text-[11px] font-bold">PR:{metrics.pr}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                  {PRIVILEGES_REQUIRED.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('pr', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.pr === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* User Interaction (UI) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300">Interação do Usuário (User Interaction - UI)</span>
                  <span className="text-emerald-400 text-[11px] font-bold">UI:{metrics.ui}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                  {USER_INTERACTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('ui', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.ui === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* COLUMN 2: Scope & Impact Metrics */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-[#222228]">
                <Flame className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  2. Escopo & Impacto Técnico (Impact & Scope)
                </h3>
              </div>

              {/* Scope (S) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-300">Escopo de Autoridade (Scope - S)</span>
                    <span className="text-[10px] text-zinc-500">(Altera a fórmula de impacto e PR)</span>
                  </div>
                  <span className="text-emerald-400 text-[11px] font-bold">S:{metrics.s}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                  {SCOPES.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('s', opt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.s === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidentiality Impact (C) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Confidencialidade (Confidentiality - C)</span>
                  </span>
                  <span className="text-emerald-400 text-[11px] font-bold">C:{metrics.c}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                  {IMPACT_LEVELS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('c', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.c === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrity Impact (I) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Integridade (Integrity - I)</span>
                  </span>
                  <span className="text-emerald-400 text-[11px] font-bold">I:{metrics.i}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                  {IMPACT_LEVELS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('i', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.i === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Impact (A) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Disponibilidade (Availability - A)</span>
                  </span>
                  <span className="text-emerald-400 text-[11px] font-bold">A:{metrics.a}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                  {IMPACT_LEVELS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleMetricChange('a', opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${getOptionButtonClass(metrics.a === opt.value, opt)}`}
                      title={opt.description}
                    >
                      <div className="font-bold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{opt.shortLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Educational Guidelines Pill */}
          <div className="p-3.5 rounded-xl bg-[#0e0e12] border border-[#222228] text-zinc-400 text-xs font-mono flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-zinc-300 font-bold block">
                Diretriz de Triagem FIRST CVSS v3.1 para Bug Bounty:
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Plataformas como HackerOne, Bugcrowd e Intigriti usam o CVSS v3.1 Base Score para triar e determinar faixas de recompensa. Certifique-se de justificar a <strong>Interação do Usuário</strong> (UI:R vs UI:N) e a alteração de <strong>Escopo</strong> (S:C vs S:U) nos passos de reprodução do relatório.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#222226] bg-[#0c0c10] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="text-zinc-500">Pressione <kbd className="bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700 text-zinc-300">Esc</kbd> para fechar</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{score.toFixed(1)} {severity}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-footer-close-cvss"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#18181c] hover:bg-[#222226] text-zinc-300 hover:text-white text-xs font-mono transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              id="btn-footer-copy-cvss"
              onClick={handleCopyVectorOnly}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-mono font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              {copiedVector ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedVector ? 'Copiado!' : 'Copiar Vetor String'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
