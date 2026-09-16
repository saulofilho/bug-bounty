import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Check,
  Trash2,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Code2,
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Zap,
  Info
} from 'lucide-react';
import { ReportTemplate, Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';
import {
  getReportTemplates,
  saveCustomTemplate,
  deleteReportTemplate,
  resetReportTemplatesToDefault,
  exportTemplatesToJson,
  importTemplatesFromJson,
  interpolateTemplateVariables
} from '../utils/reportTemplatesEngine';
import { showSuccessToast, showErrorToast, showInfoToast } from '../utils/toastNotifications';

interface ReportTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: ReportTemplate) => void;
  currentTarget?: string;
}

const CATEGORIES: Array<ReportTemplate['category'] | 'TODAS'> = [
  'TODAS',
  'Web / OWASP',
  'API Security',
  'Cloud & Infra',
  'Auth & Session',
  'Custom'
];

export const ReportTemplatesModal: React.FC<ReportTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  currentTarget = 'api.target.com'
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>(() => getReportTemplates());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    const list = getReportTemplates();
    return list[0]?.id || '';
  });

  // State for creating or editing custom template
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  // Form fields for create/edit
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<ReportTemplate['category']>('Web / OWASP');
  const [formVulnType, setFormVulnType] = useState('');
  const [formCwe, setFormCwe] = useState('');
  const [formCvssVector, setFormCvssVector] = useState('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N');
  const [formCvssScore, setFormCvssScore] = useState<number>(7.5);
  const [formSeverity, setFormSeverity] = useState<Severity>('HIGH');
  const [formTitlePattern, setFormTitlePattern] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formSteps, setFormSteps] = useState<string[]>(['1. ', '2. ', '3. ']);
  const [formPoc, setFormPoc] = useState('');
  const [formImpact, setFormImpact] = useState('');
  const [formRemediation, setFormRemediation] = useState('');
  const [formTags, setFormTags] = useState('');

  // Reload list
  const refreshTemplates = () => {
    const loaded = getReportTemplates();
    setTemplates(loaded);
  };

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter(tpl => {
      const matchesCategory = selectedCategory === 'TODAS' || tpl.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.vulnerabilityType.toLowerCase().includes(q) ||
        tpl.cwe.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.titlePattern.toLowerCase().includes(q) ||
        (tpl.tags && tpl.tags.some(t => t.toLowerCase().includes(q)))
      );
    });
  }, [templates, selectedCategory, searchQuery]);

  // Currently viewed template details
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === activeTemplateId) || filteredTemplates[0] || templates[0];
  }, [templates, activeTemplateId, filteredTemplates]);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: ReportTemplate) => {
    setActiveTemplateId(tpl.id);
  };

  const handleApply = (tpl: ReportTemplate) => {
    onApplyTemplate(tpl);
    showSuccessToast(`Template "${tpl.name}" aplicado ao rascunho com sucesso!`);
    onClose();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o template "${name}"?`)) {
      deleteReportTemplate(id);
      refreshTemplates();
      showInfoToast(`Template "${name}" removido.`);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar todos os templates padrão de fábrica? Templates customizados serão preservados se possível.')) {
      const defs = resetReportTemplatesToDefault();
      setTemplates(defs);
      setActiveTemplateId(defs[0]?.id || '');
      showSuccessToast('Templates de relatório restaurados para os padrões oficiais.');
    }
  };

  const handleExportJson = () => {
    const json = exportTemplatesToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugsentinel-report-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccessToast('Arquivo de templates exportado com sucesso.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const res = importTemplatesFromJson(content);
      if (res.success) {
        refreshTemplates();
        showSuccessToast(`${res.count} template(s) importados com sucesso!`);
      } else {
        showErrorToast(res.error || 'Falha ao importar templates.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenCreateModal = (tplToDuplicate?: ReportTemplate) => {
    if (tplToDuplicate) {
      setFormName(`${tplToDuplicate.name} (Cópia Personalizada)`);
      setFormDesc(tplToDuplicate.description);
      setFormCategory('Custom');
      setFormVulnType(tplToDuplicate.vulnerabilityType);
      setFormCwe(tplToDuplicate.cwe);
      setFormCvssVector(tplToDuplicate.cvssVector);
      setFormCvssScore(tplToDuplicate.cvssScore);
      setFormSeverity(tplToDuplicate.severity);
      setFormTitlePattern(tplToDuplicate.titlePattern);
      setFormSummary(tplToDuplicate.summary);
      setFormSteps([...tplToDuplicate.stepsToReproduce]);
      setFormPoc(tplToDuplicate.proofOfConcept);
      setFormImpact(tplToDuplicate.businessImpact);
      setFormRemediation(tplToDuplicate.remediation);
      setFormTags((tplToDuplicate.tags || []).join(', '));
      setEditingTemplate(null);
    } else {
      setFormName('');
      setFormDesc('');
      setFormCategory('Custom');
      setFormVulnType('Injeção / Falha Lógica');
      setFormCwe('CWE-20: Improper Input Validation');
      setFormCvssVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N');
      setFormCvssScore(7.5);
      setFormSeverity('HIGH');
      setFormTitlePattern('[{vuln}] Falha de segurança em {endpoint}');
      setFormSummary('Descrição detalhada do achado e contexto de execução.');
      setFormSteps(['1. Intercepte a requisição...', '2. Modifique o parâmetro...', '3. Observe a resposta do servidor...']);
      setFormPoc('GET /api/v1/resource HTTP/1.1\nHost: {target}\nAuthorization: Bearer [TOKEN]');
      setFormImpact('Impacto direto ao negócio, conformidade regulatória e risco de dados.');
      setFormRemediation('Recomendação técnica direta para o time de desenvolvimento.');
      setFormTags('#custom, #security');
      setEditingTemplate(null);
    }
    setIsCreatingCustom(true);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formVulnType.trim() || !formSummary.trim()) {
      showErrorToast('Por favor preencha nome, tipo de vulnerabilidade e resumo.');
      return;
    }

    const tagList = formTags
      .split(',')
      .map(t => t.trim().replace(/^#*/, '#'))
      .filter(Boolean);

    const saved = saveCustomTemplate({
      id: editingTemplate ? editingTemplate.id : undefined,
      name: formName.trim(),
      description: formDesc.trim(),
      category: formCategory,
      vulnerabilityType: formVulnType.trim(),
      cwe: formCwe.trim(),
      cvssVector: formCvssVector.trim(),
      cvssScore: formCvssScore,
      severity: formSeverity,
      titlePattern: formTitlePattern.trim() || formName.trim(),
      summary: formSummary.trim(),
      stepsToReproduce: formSteps.filter(s => s.trim().length > 0),
      proofOfConcept: formPoc.trim(),
      businessImpact: formImpact.trim(),
      remediation: formRemediation.trim(),
      tags: tagList.length > 0 ? tagList : ['#custom']
    });

    refreshTemplates();
    setActiveTemplateId(saved.id);
    setIsCreatingCustom(false);
    showSuccessToast(`Template "${saved.name}" salvo com sucesso!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0d0f18] border border-[#232738] rounded-xl shadow-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#232738] bg-[#090a12]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-wide">
                  Biblioteca de Templates de Relatório
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {templates.length} Esqueletos Prontos
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Carregue esqueletos padrão com CVSS, passos e impacto calibrados para triagem rápida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Criar novo template personalizado do zero"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Template</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="px-4 py-3 bg-[#0a0c14] border-b border-[#1f2436] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por XSS, SQLi, CWE, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121524] border border-[#232738] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 font-mono text-[11px]">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tool actions (Export, Import, Reset) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExportJson}
              className="p-1.5 rounded bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
              title="Exportar todos os templates em JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <label
              className="p-1.5 rounded bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
              title="Importar templates de arquivo JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              onClick={handleResetDefaults}
              className="p-1.5 rounded bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 text-xs transition-colors"
              title="Restaurar templates padrão originais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Area: 2 Columns (List on left, preview & details on right) */}
        {!isCreatingCustom ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[460px]">
            
            {/* Column 1: Templates List (5 cols) */}
            <div className="md:col-span-5 border-r border-[#1e2335] overflow-y-auto p-3 space-y-2 bg-[#090b14]">
              {filteredTemplates.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  Nenhum template encontrado para "{searchQuery}".
                </div>
              ) : (
                filteredTemplates.map(tpl => {
                  const isSelected = activeTemplate?.id === tpl.id;
                  const sevBadge = getSeverityBadgeColor(tpl.severity);
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#151928] border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-[#0e101a] border-[#1d2235] hover:border-zinc-700 hover:bg-[#121422]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white font-mono leading-tight flex items-center gap-1.5">
                            <span className="truncate">{tpl.name}</span>
                          </h4>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${sevBadge}`}>
                            {tpl.severity}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-semibold">{tpl.category}</span>
                          <span>•</span>
                          <span className="text-zinc-400">CVSS {tpl.cvssScore}</span>
                        </div>
                        {tpl.isBuiltIn ? (
                          <span className="text-zinc-500 italic">Oficial</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">Personalizado</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Column 2: Template Preview & Apply Action (7 cols) */}
            <div className="md:col-span-7 flex flex-col bg-[#0b0d16] overflow-y-auto">
              {activeTemplate ? (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 font-mono text-xs">
                  <div className="space-y-4">
                    
                    {/* Top Header of Active Template */}
                    <div className="pb-3 border-b border-[#212638] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeColor(activeTemplate.severity)}`}>
                            {activeTemplate.severity} • CVSS {activeTemplate.cvssScore}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] border border-zinc-700">
                            {activeTemplate.category}
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            {activeTemplate.cwe}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-white mt-1.5">
                          {activeTemplate.name}
                        </h2>
                        <p className="text-xs text-zinc-400 font-sans mt-0.5">
                          {activeTemplate.description}
                        </p>
                      </div>

                      {/* Top Action Buttons (Duplicate, Delete) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenCreateModal(activeTemplate)}
                          className="px-2.5 py-1 rounded bg-[#161a29] border border-zinc-700 hover:border-cyan-500/50 text-zinc-300 text-[11px] flex items-center gap-1 transition-all"
                          title="Duplicar este template para criar uma variante personalizada"
                        >
                          <Copy className="w-3 h-3 text-cyan-400" />
                          <span>Duplicar</span>
                        </button>
                        {!activeTemplate.isBuiltIn && (
                          <button
                            onClick={() => handleDelete(activeTemplate.id, activeTemplate.name)}
                            className="p-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                            title="Excluir template personalizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title Template Pattern */}
                    <div className="bg-[#090b12] border border-[#1e2335] rounded-lg p-3">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                        Padrão de Título Automático
                      </span>
                      <div className="text-xs text-cyan-300 font-semibold">
                        {interpolateTemplateVariables(activeTemplate.titlePattern, {
                          target: currentTarget,
                          endpoint: 'endpoint_alvo',
                          param: 'parametro_vulneravel',
                          resource: 'recurso_critico'
                        })}
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                        Resumo Técnico (Summary)
                      </span>
                      <p className="text-xs text-zinc-300 bg-[#090b12] border border-[#1e2335] rounded-lg p-3 leading-relaxed font-sans">
                        {activeTemplate.summary}
                      </p>
                    </div>

                    {/* Steps to Reproduce */}
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                        Passos para Reprodução ({activeTemplate.stepsToReproduce.length} etapas)
                      </span>
                      <div className="bg-[#090b12] border border-[#1e2335] rounded-lg p-3 space-y-1.5 text-xs text-zinc-300">
                        {activeTemplate.stepsToReproduce.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                            <span className="font-sans text-zinc-300">
                              {interpolateTemplateVariables(step, { target: currentTarget, endpoint: 'api/v1/resource', param: 'query' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Proof of Concept */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        <span>Requisição / Prova de Conceito (PoC)</span>
                        <span className="text-zinc-600 font-normal">HTTP & Scripts</span>
                      </div>
                      <pre className="bg-[#07080e] border border-[#1b2033] rounded-lg p-3 text-[11px] text-emerald-400/90 overflow-x-auto font-mono whitespace-pre-wrap max-h-36">
                        {interpolateTemplateVariables(activeTemplate.proofOfConcept, { target: currentTarget, endpoint: 'api/v1/resource', param: 'query' })}
                      </pre>
                    </div>

                    {/* Business Impact & Remediation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#090b12] border border-[#1e2335] rounded-lg p-3">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                          Impacto nos Negócios
                        </span>
                        <p className="text-[11px] text-zinc-300 font-sans leading-relaxed line-clamp-3">
                          {activeTemplate.businessImpact}
                        </p>
                      </div>

                      <div className="bg-[#090b12] border border-[#1e2335] rounded-lg p-3">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                          Remediação Recomendada
                        </span>
                        <p className="text-[11px] text-zinc-300 font-sans leading-relaxed line-clamp-3">
                          {activeTemplate.remediation}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {activeTemplate.tags && activeTemplate.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeTemplate.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Bottom Apply Action Banner */}
                  <div className="pt-4 border-t border-[#212638] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0c14] -mx-5 -mb-5 p-4 mt-4">
                    <div className="text-xs text-zinc-400 font-sans">
                      Preencherá automaticamente título, CWE, CVSS, passos e PoC no rascunho atual.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApply(activeTemplate)}
                      className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Carregar no Rascunho</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  Selecione um template na lista lateral para visualizar os detalhes.
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Create / Edit Custom Template Form */
          <form onSubmit={handleSaveCustom} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#212638]">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {editingTemplate ? 'Editar Template Customizado' : 'Criar Novo Template Customizado'}
                </h4>
                <p className="text-xs text-zinc-400 font-sans">
                  Defina um esqueleto reutilizável para novas vulnerabilidades encontradas na sua rotina de caça.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1"
              >
                Voltar à Lista
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Nome do Template *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: XSS Armazenado em Comentários"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Categoria</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                >
                  <option value="Web / OWASP">Web / OWASP</option>
                  <option value="API Security">API Security</option>
                  <option value="Cloud & Infra">Cloud & Infra</option>
                  <option value="Auth & Session">Auth & Session</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase">Descrição Resumida</label>
              <input
                type="text"
                placeholder="Breve resumo da finalidade deste esqueleto"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Tipo de Vulnerabilidade *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Stored XSS, IDOR, SSRF"
                  value={formVulnType}
                  onChange={(e) => setFormVulnType(e.target.value)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">CWE Associado</label>
                <input
                  type="text"
                  placeholder="ex: CWE-79: Cross-site Scripting"
                  value={formCwe}
                  onChange={(e) => setFormCwe(e.target.value)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Severidade Padrão</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as Severity)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase">Padrão de Título (Suporta {'{target}'}, {'{endpoint}'}, {'{param}'})</label>
              <input
                type="text"
                placeholder="ex: [Stored XSS] Injeção permanente no mural de comentários em {endpoint}"
                value={formTitlePattern}
                onChange={(e) => setFormTitlePattern(e.target.value)}
                className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase">Resumo Técnico (Summary) *</label>
              <textarea
                rows={2}
                required
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase">Passos para Reprodução (um por linha)</label>
              <textarea
                rows={3}
                value={formSteps.join('\n')}
                onChange={(e) => setFormSteps(e.target.value.split('\n'))}
                className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase">Requisição / Prova de Conceito (PoC)</label>
              <textarea
                rows={3}
                value={formPoc}
                onChange={(e) => setFormPoc(e.target.value)}
                className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Impacto nos Negócios</label>
                <textarea
                  rows={2}
                  value={formImpact}
                  onChange={(e) => setFormImpact(e.target.value)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Remediação Sugerida</label>
                <textarea
                  rows={2}
                  value={formRemediation}
                  onChange={(e) => setFormRemediation(e.target.value)}
                  className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase">Tags (separadas por vírgula)</label>
              <input
                type="text"
                placeholder="#xss, #stored, #owasp"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="w-full bg-[#121524] border border-[#232738] rounded p-2 text-white"
              />
            </div>

            <div className="pt-3 border-t border-[#212638] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="px-4 py-2 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Salvar Template
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
