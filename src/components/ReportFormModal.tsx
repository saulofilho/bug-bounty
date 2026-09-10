import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Shield, 
  Check, 
  Database,
  ChevronDown,
  ChevronUp,
  Tag,
  Hash
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus, PlatformName, TargetProgram, TechnicalDoc, AutoTagSuggestion } from '../types';
import { calculateCvssScore, parseCvssVector, CvssMetrics } from '../utils/cvss';
import { getSeverityBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { AutoTaggingSuggestions } from './AutoTaggingSuggestions';
import { fetchAutomatedTags } from '../utils/taggingEngine';
import { CvssCalculatorTool } from './CvssCalculatorTool';
import { MiniCvssCalculator } from './MiniCvssCalculator';

interface ReportFormModalProps {
  initialReport?: VulnerabilityReport | null;
  targets: TargetProgram[];
  docs?: TechnicalDoc[];
  onClose: () => void;
  onSave: (report: VulnerabilityReport) => void;
}

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  initialReport,
  targets,
  docs = [],
  onClose,
  onSave
}) => {
  const isEditing = !!initialReport;

  // Basic Form State
  const [title, setTitle] = useState(initialReport?.title || '');
  const [target, setTarget] = useState(initialReport?.target || (targets[0]?.domain || 'api.target.com'));
  const [platform, setPlatform] = useState<PlatformName>(initialReport?.platform || 'HackerOne');
  const [vulnerabilityType, setVulnerabilityType] = useState(initialReport?.vulnerabilityType || 'IDOR / BOLA');
  const [status, setStatus] = useState<ReportStatus>(initialReport?.status || 'DRAFT');
  const [bountyAmount, setBountyAmount] = useState<number>(initialReport?.bountyAmount || 0);

  // Technical Classification & CVSS
  const initialMetrics: CvssMetrics = initialReport?.cvssVector 
    ? parseCvssVector(initialReport.cvssVector) 
    : { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'N', a: 'N' };
  const initialCalculated = calculateCvssScore(initialMetrics);

  const [cvssMetrics, setCvssMetrics] = useState<CvssMetrics>(initialMetrics);
  const [cvssScore, setCvssScore] = useState<number>(
    initialReport?.cvssScore !== undefined ? initialReport.cvssScore : initialCalculated.score
  );
  const [cvssVector, setCvssVector] = useState<string>(
    initialReport?.cvssVector || initialCalculated.vector
  );
  const [showAdvancedCvss, setShowAdvancedCvss] = useState(false);

  const [cwe, setCwe] = useState(initialReport?.cwe || 'CWE-639: Authorization Bypass Through User-Controlled Key');
  const [cveInput, setCveInput] = useState((initialReport?.cveIds || []).join(', '));
  const [tags, setTags] = useState<string[]>(initialReport?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Automated Tagging & CWE/CVE Suggestions State
  const [autoTagSuggestion, setAutoTagSuggestion] = useState<AutoTagSuggestion | null>(null);
  const [isTaggingLoading, setIsTaggingLoading] = useState(false);

  // Narratives
  const [summary, setSummary] = useState(initialReport?.summary || '');
  const [steps, setSteps] = useState<string[]>(
    initialReport?.stepsToReproduce && initialReport.stepsToReproduce.length > 0
      ? initialReport.stepsToReproduce
      : ['Acesse o endpoint alvo com duas contas de teste distintas.', 'Capture a requisição no proxy (Burp Suite).', 'Altere o identificador do recurso para o ID do segundo usuário.']
  );
  const [proofOfConcept, setProofOfConcept] = useState(initialReport?.proofOfConcept || 'GET /api/v1/user/profile?id=1024 HTTP/1.1\nHost: api.target.com\nAuthorization: Bearer [TOKEN_A]');
  const [businessImpact, setBusinessImpact] = useState(initialReport?.businessImpact || '');
  const [remediation, setRemediation] = useState(initialReport?.remediation || '');

  // AI Assistant State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Synchronized CVSS Handlers
  const handleCvssMetricsChange = (newMetrics: CvssMetrics) => {
    setCvssMetrics(newMetrics);
    const { score, vector } = calculateCvssScore(newMetrics);
    setCvssScore(score);
    setCvssVector(vector);
  };

  const handleCvssScoreChange = (score: number) => {
    setCvssScore(score);
  };

  const handleCvssVectorChange = (vector: string) => {
    setCvssVector(vector);
    try {
      const parsed = parseCvssVector(vector);
      setCvssMetrics(parsed);
      const { score } = calculateCvssScore(parsed);
      setCvssScore(score);
    } catch {
      // keep raw string while typing
    }
  };

  // Compute live severity based on score
  const effectiveScore = typeof cvssScore === 'number' ? cvssScore : initialCalculated.score;
  let currentSeverity: Severity = 'INFO';
  if (effectiveScore >= 9.0) currentSeverity = 'CRITICAL';
  else if (effectiveScore >= 7.0) currentSeverity = 'HIGH';
  else if (effectiveScore >= 4.0) currentSeverity = 'MEDIUM';
  else if (effectiveScore > 0.0) currentSeverity = 'LOW';

  const sevBadge = getSeverityBadgeColor(currentSeverity);

  // Step helpers
  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleUpdateStep = (index: number, val: string) => {
    const updated = [...steps];
    updated[index] = val;
    setSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  // AI Assistant Trigger
  const handleAiRefine = async () => {
    if (!title && !summary && !proofOfConcept) {
      setAiError('Preencha pelo menos um título provisório, resumo rápido ou requisição HTTP para a IA analisar.');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const response = await fetch('/api/gemini/enhance-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          target,
          vulnerabilityType,
          roughNotes: `${summary}\n${steps.join('\n')}`,
          proofOfConcept
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Falha ao consultar assistente de IA.');
      }

      const data = resData.data;
      if (data.polishedTitle) setTitle(data.polishedTitle);
      if (data.summary) setSummary(data.summary);
      if (data.businessImpact) setBusinessImpact(data.businessImpact);
      if (data.remediation) setRemediation(data.remediation);
      if (data.cwe) setCwe(data.cwe);
      if (Array.isArray(data.stepsToReproduce) && data.stepsToReproduce.length > 0) {
        setSteps(data.stepsToReproduce);
      }
      if (data.cvssVector) {
        try {
          const parsed = parseCvssVector(data.cvssVector);
          setCvssMetrics(parsed);
          const { score, vector } = calculateCvssScore(parsed);
          setCvssScore(score);
          setCvssVector(vector);
        } catch (e) {
          console.error('Failed to parse AI CVSS vector:', e);
        }
      }

      setAiSuccessMessage('Relatório enriquecido com sucesso com foco em aprovação de triagem e cálculo de impacto!');
      setTimeout(() => setAiSuccessMessage(null), 4000);
      // Trigger tagging update
      handleRunAutoTagging();
    } catch (err: any) {
      console.error('AI refine error:', err);
      setAiError(err.message || 'Erro ao conectar ao assistente Gemini.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Automated Tagging Engine Trigger
  const handleRunAutoTagging = async () => {
    if (!summary && !title && !proofOfConcept) return;
    setIsTaggingLoading(true);
    try {
      const res = await fetchAutomatedTags({
        title,
        summary,
        vulnerabilityType,
        proofOfConcept,
        docs
      });
      setAutoTagSuggestion(res);
    } catch (err) {
      console.error('Error running automated tagging:', err);
    } finally {
      setIsTaggingLoading(false);
    }
  };

  // Run initial auto-tagging when opening modal with content
  React.useEffect(() => {
    if (summary || title) {
      handleRunAutoTagging();
    }
  }, []);

  const handleApplyCwe = (cweIdAndName: string, recommendedCvssVector?: string) => {
    setCwe(cweIdAndName);
    if (recommendedCvssVector) {
      try {
        const parsed = parseCvssVector(recommendedCvssVector);
        setCvssMetrics(parsed);
        const { score, vector } = calculateCvssScore(parsed);
        setCvssScore(score);
        setCvssVector(vector);
      } catch (err) {
        console.error('Failed to parse cvss vector:', err);
      }
    }
  };

  const handleApplyCve = (cveId: string) => {
    const current = cveInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!current.includes(cveId)) {
      setCveInput([...current, cveId].join(', '));
    }
  };

  const handleApplyTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleApplyAllTags = (newTags: string[]) => {
    setTags(prev => Array.from(new Set([...prev, ...newTags])));
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = tagInput.trim().replace(/^#*/, '#');
    if (clean.length > 1 && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !target.trim()) {
      alert('Por favor informe o título e o alvo da vulnerabilidade.');
      return;
    }

    const cveIds = cveInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.startsWith('CVE-'));

    const newReport: VulnerabilityReport = {
      id: initialReport?.id || `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      target: target.trim(),
      platform,
      vulnerabilityType,
      severity: currentSeverity,
      status,
      cvssVector: (cvssVector || initialCalculated.vector).trim(),
      cvssScore: typeof cvssScore === 'number' ? cvssScore : initialCalculated.score,
      cwe: cwe.trim(),
      cveIds,
      tags,
      summary: summary.trim(),
      stepsToReproduce: steps.filter(s => s.trim().length > 0),
      proofOfConcept: proofOfConcept.trim(),
      businessImpact: businessImpact.trim(),
      remediation: remediation.trim(),
      bountyAmount: Number(bountyAmount) || 0,
      currency: 'USD',
      createdAt: initialReport?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: initialReport?.timeline || [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Relatório Criado',
          notes: 'Registrado no workbench de Bug Bounty.',
          type: 'creation'
        }
      ]
    };

    onSave(newReport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626] bg-[#0a0a0a]">
          <div>
            <h2 className="text-base sm:text-lg font-light text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>{isEditing ? 'Editar Relatório de Vulnerabilidade' : 'Novo Relatório de Vulnerabilidade'}</span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Formate seu relatório de bug bounty com impacto técnico e justificativa para triadores
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Banner Bar */}
        <div className="p-4 bg-[#121212] border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Assistente Gemini de Triagem</span>
              <p className="text-xs text-zinc-400">
                Transforma notas brutas e PoC em título profissional, impacto de negócio e passos determinísticos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAiRefine}
            disabled={isAiLoading}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAiLoading ? 'Analisando...' : '🪄 Refinar com IA'}</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {aiError && (
          <div className="mx-6 mt-4 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}
        {aiSuccessMessage && (
          <div className="mx-6 mt-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Row 1: Target, Platform, Vuln Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Alvo / Host Afetado *</label>
              <input
                type="text"
                required
                placeholder="ex: api.empresa.com"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Plataforma Parceira</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformName)}
                className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono text-xs"
              >
                <option value="HackerOne">HackerOne</option>
                <option value="Bugcrowd">Bugcrowd</option>
                <option value="Intigriti">Intigriti</option>
                <option value="YesWeHack">YesWeHack</option>
                <option value="Synack">Synack</option>
                <option value="Direct / VDP">Direto / VDP</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Tipo de Vulnerabilidade</label>
              <input
                type="text"
                placeholder="ex: IDOR, SSRF, Stored XSS, RCE"
                value={vulnerabilityType}
                onChange={(e) => setVulnerabilityType(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono text-xs"
              />
            </div>
          </div>

          {/* Row 2: Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Título do Relatório *</label>
            <input
              type="text"
              required
              placeholder="ex: [IDOR] em /api/v2/orders expõe histórico de pedidos e faturas de outros clientes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 focus:border-zinc-500 focus:outline-none text-xs font-mono"
            />
          </div>

          {/* Row 3: Mini CVSS 3.1 Calculator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  Calculador CVSS 3.1 & Vetor Técnico
                </label>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                  {currentSeverity} {typeof cvssScore === 'number' ? cvssScore.toFixed(1) : effectiveScore.toFixed(1)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedCvss(!showAdvancedCvss)}
                className="text-[10px] text-zinc-400 hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                title="Alternar entre mini calculadora e especificações estendidas"
              >
                <span>{showAdvancedCvss ? 'Ocultar Guia Completo' : 'Ver Guia FIRST Detalhado'}</span>
                {showAdvancedCvss ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Mini CVSS 3.1 Calculator with synchronized cvssScore and cvssVector */}
            <MiniCvssCalculator
              metrics={cvssMetrics}
              cvssScore={typeof cvssScore === 'number' ? cvssScore : effectiveScore}
              cvssVector={cvssVector || initialCalculated.vector}
              onMetricsChange={handleCvssMetricsChange}
              onScoreChange={handleCvssScoreChange}
              onVectorChange={handleCvssVectorChange}
            />

            {/* Optional Full Educational Tool */}
            {showAdvancedCvss && (
              <div className="border border-[#262626] rounded-xl overflow-hidden mt-2">
                <div className="p-2.5 bg-[#141414] border-b border-[#262626] flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="text-zinc-300">Guia de Especificação FIRST CVSS v3.1 Completo:</span>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCvss(false)}
                    className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                  >
                    Ocultar
                  </button>
                </div>
                <CvssCalculatorTool
                  metrics={cvssMetrics}
                  onChange={handleCvssMetricsChange}
                />
              </div>
            )}
          </div>

          {/* Row 4: CWE & Linked CVEs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Fraqueza / CWE</label>
              <input
                type="text"
                placeholder="ex: CWE-639 ou CWE-79"
                value={cwe}
                onChange={(e) => setCwe(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Bases de CVE Relacionadas</label>
              <input
                type="text"
                placeholder="ex: CVE-2023-46805, CVE-2024-3400"
                value={cveInput}
                onChange={(e) => setCveInput(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono text-xs"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Resumo Executivo da Falha (Descrição)</label>
              <button
                type="button"
                onClick={handleRunAutoTagging}
                disabled={isTaggingLoading || (!summary && !title)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 uppercase tracking-wider"
              >
                <Tag className="w-3 h-3" />
                <span>{isTaggingLoading ? 'Analisando...' : 'Sugerir Tags & CWE/CVE'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Explique concisamente o que foi encontrado, o endpoint e a causa raiz..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 focus:border-zinc-500 focus:outline-none leading-relaxed font-mono text-xs"
            />
          </div>

          {/* Automated Tagging & CWE/CVE Intelligence */}
          <AutoTaggingSuggestions
            suggestion={autoTagSuggestion}
            isLoading={isTaggingLoading}
            activeTags={tags}
            currentCwe={cwe}
            currentCves={cveInput.split(',').map(s => s.trim()).filter(Boolean)}
            onApplyCwe={handleApplyCwe}
            onApplyCve={handleApplyCve}
            onApplyTag={handleApplyTag}
            onApplyAllTags={handleApplyAllTags}
            onTriggerAnalysis={handleRunAutoTagging}
          />

          {/* Active Tags Badge Section */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#101010] border border-[#262626]">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-emerald-400" />
                Tags Atribuídas ao Relatório ({tags.length})
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Pressione Enter para adicionar</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
              {tags.length === 0 && (
                <span className="text-zinc-600 text-xs font-mono italic">
                  Nenhuma tag atribuída. Use as sugestões automáticas acima ou adicione manualmente.
                </span>
              )}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs"
                >
                  <Hash className="w-3 h-3 opacity-60" />
                  <span>{tag.replace(/^#/, '')}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-emerald-400 hover:text-rose-400 text-xs font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="#nova-tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddCustomTag}
                  className="bg-[#141414] border border-[#262626] rounded px-2.5 py-1 text-zinc-200 text-xs font-mono focus:outline-none focus:border-zinc-500 w-32"
                />
                {tagInput && (
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-mono"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Steps To Reproduce */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Passos para Reproduzir (Determinísticos)</label>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-xs uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Passo</span>
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#171717] border border-[#262626] text-zinc-400 flex items-center justify-center font-mono text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Passo ${idx + 1}...`}
                    value={step}
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    className="flex-1 bg-[#121212] border border-[#262626] rounded px-3 py-1.5 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono text-xs"
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PoC */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Prova de Conceito (HTTP Request / Response / Payload)</label>
            <textarea
              rows={4}
              placeholder="Cole a requisição HTTP bruta capturada no Burp Suite..."
              value={proofOfConcept}
              onChange={(e) => setProofOfConcept(e.target.value)}
              className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-emerald-400 font-mono text-xs focus:border-zinc-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Business Impact & Remediation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Impacto no Negócio</label>
              <textarea
                rows={3}
                placeholder="Por que o cliente deve pagar alta recompensa? Exposição de PII, risco LGPD, etc."
                value={businessImpact}
                onChange={(e) => setBusinessImpact(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 focus:border-zinc-500 focus:outline-none leading-relaxed text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Remediação Sugerida</label>
              <textarea
                rows={3}
                placeholder="Recomendações técnicas para a equipe de desenvolvimento corrigir..."
                value={remediation}
                onChange={(e) => setRemediation(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 focus:border-zinc-500 focus:outline-none leading-relaxed text-xs"
              />
            </div>
          </div>

          {/* Status and Bounty */}
          <div className="p-4 rounded-lg bg-[#121212] border border-[#262626] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Status do Envio</label>
                <StatusBadge status={status} size="xs" />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 font-mono text-xs"
              >
                <option value="DRAFT">Rascunho (Não enviado)</option>
                <option value="SUBMITTED">Enviado para Plataforma</option>
                <option value="TRIAGED">Em Triagem</option>
                <option value="REWARDED">Recompensado ($ Bounty Pago)</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="DUPLICATE">Duplicado</option>
                <option value="OUT_OF_SCOPE">Fora de Escopo</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Valor da Recompensa ($ USD)</label>
              <input
                type="number"
                placeholder="0"
                value={bountyAmount || ''}
                onChange={(e) => setBountyAmount(Number(e.target.value))}
                className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-emerald-400 font-mono font-bold text-xs"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#171717] hover:bg-[#262626] text-zinc-300 border border-[#262626] font-semibold text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Atualizar Relatório' : 'Salvar Relatório'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
