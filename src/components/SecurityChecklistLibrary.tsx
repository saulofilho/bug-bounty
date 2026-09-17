import React, { useState, useMemo } from 'react';
import {
  ListChecks,
  ShieldCheck,
  CheckSquare,
  Square,
  Plus,
  Search,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Sparkles,
  Filter,
  Tag,
  ArrowRight,
  BookOpen,
  Save,
  RotateCcw,
  CheckCircle2,
  FolderPlus,
  ShieldAlert,
  ChevronRight,
  TerminalSquare
} from 'lucide-react';
import {
  SecurityChecklistTemplate,
  SecurityChecklistItem,
  ValidationChecklistItem,
  VulnerabilityReport,
  Severity,
  TechnicalDoc
} from '../types';
import { DEFAULT_SECURITY_CHECKLISTS } from '../data/defaultChecklists';
import { getSeverityBadgeColor } from '../utils/formatters';

interface SecurityChecklistLibraryProps {
  reports?: VulnerabilityReport[];
  onApplyChecklistToNewReport?: (reportData: Partial<VulnerabilityReport>) => void;
  onApplyChecklistToExistingReport?: (reportId: string, checklist: ValidationChecklistItem[]) => void;
  onSaveDoc?: (doc: TechnicalDoc) => void;
}

export const SecurityChecklistLibrary: React.FC<SecurityChecklistLibraryProps> = ({
  reports = [],
  onApplyChecklistToNewReport,
  onApplyChecklistToExistingReport,
  onSaveDoc
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(
    DEFAULT_SECURITY_CHECKLISTS[0].id
  );

  // Active testing state (which items are checked in current session)
  const [testedItems, setTestedItems] = useState<Record<string, boolean>>({});

  // Inclusion state (which items will be included when creating/applying report)
  const [includedItemIds, setIncludedItemIds] = useState<Record<string, boolean>>({});

  // Custom items added by user to the active checklist
  const [customItems, setCustomItems] = useState<Record<string, SecurityChecklistItem[]>>({});
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomGuidance, setNewCustomGuidance] = useState('');

  // UI state
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [savedAsDocMessage, setSavedAsDocMessage] = useState<string | null>(null);
  const [selectedReportIdForAttach, setSelectedReportIdForAttach] = useState<string>(
    reports[0]?.id || ''
  );
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachSuccessMessage, setAttachSuccessMessage] = useState<string | null>(null);

  // Active checklist template
  const activeTemplate = useMemo(() => {
    return (
      DEFAULT_SECURITY_CHECKLISTS.find((c) => c.id === selectedChecklistId) ||
      DEFAULT_SECURITY_CHECKLISTS[0]
    );
  }, [selectedChecklistId]);

  // Combined items (default template items + any custom items added)
  const allCurrentItems = useMemo(() => {
    const custom = customItems[activeTemplate.id] || [];
    return [...activeTemplate.items, ...custom];
  }, [activeTemplate, customItems]);

  // Filter categories
  const categories = useMemo(() => {
    const set = new Set(DEFAULT_SECURITY_CHECKLISTS.map((c) => c.category));
    return ['ALL', ...Array.from(set)];
  }, []);

  // Filtered checklists
  const filteredChecklists = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return DEFAULT_SECURITY_CHECKLISTS.filter((chk) => {
      const matchCategory =
        selectedCategory === 'ALL' || chk.category === selectedCategory;
      const matchSeverity =
        selectedSeverity === 'ALL' || chk.defaultSeverity === selectedSeverity;

      if (!matchCategory || !matchSeverity) return false;
      if (!q) return true;

      const inTitle = chk.title.toLowerCase().includes(q);
      const inType = chk.vulnerabilityType.toLowerCase().includes(q);
      const inOwasp = chk.owaspReference.toLowerCase().includes(q);
      const inCwe = chk.cwe.toLowerCase().includes(q);
      const inDesc = chk.description.toLowerCase().includes(q);
      const inTags = chk.tags.some((t) => t.toLowerCase().includes(q));
      const inItems = chk.items.some(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );

      return inTitle || inType || inOwasp || inCwe || inDesc || inTags || inItems;
    });
  }, [searchQuery, selectedCategory, selectedSeverity]);

  // Handle toggling testing check
  const handleToggleTested = (itemId: string) => {
    setTestedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Handle toggling inclusion in report
  const handleToggleInclusion = (itemId: string) => {
    setIncludedItemIds((prev) => {
      const current = prev[itemId] !== undefined ? prev[itemId] : true;
      return {
        ...prev,
        [itemId]: !current
      };
    });
  };

  const isItemIncluded = (itemId: string) => {
    return includedItemIds[itemId] !== undefined ? includedItemIds[itemId] : true;
  };

  // Select/Deselect All inclusions
  const handleSelectAllInclusions = () => {
    const update: Record<string, boolean> = {};
    allCurrentItems.forEach((item) => {
      update[item.id] = true;
    });
    setIncludedItemIds((prev) => ({ ...prev, ...update }));
  };

  const handleDeselectAllInclusions = () => {
    const update: Record<string, boolean> = {};
    allCurrentItems.forEach((item) => {
      update[item.id] = false;
    });
    setIncludedItemIds((prev) => ({ ...prev, ...update }));
  };

  // Reset testing progress
  const handleResetTesting = () => {
    const update: Record<string, boolean> = {};
    allCurrentItems.forEach((item) => {
      update[item.id] = false;
    });
    setTestedItems((prev) => ({ ...prev, ...update }));
  };

  // Add custom item to current checklist
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomTitle.trim()) return;

    const newItem: SecurityChecklistItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newCustomTitle.trim(),
      description: 'Critério customizado adicionado pelo pesquisador para este alvo.',
      guidance: newCustomGuidance.trim() || undefined,
      category: 'Custom Verification',
      required: false
    };

    setCustomItems((prev) => ({
      ...prev,
      [activeTemplate.id]: [...(prev[activeTemplate.id] || []), newItem]
    }));

    setNewCustomTitle('');
    setNewCustomGuidance('');
  };

  // Build ValidationChecklist items to attach/create
  const getSelectedValidationChecklist = (): ValidationChecklistItem[] => {
    return allCurrentItems
      .filter((item) => isItemIncluded(item.id))
      .map((item) => ({
        id: `vchk-${item.id}`,
        label: `${item.title} — ${item.description}`,
        completed: !!testedItems[item.id],
        completedAt: testedItems[item.id] ? new Date().toISOString() : undefined,
        category: item.category,
        guidance: item.guidance
      }));
  };

  // Trigger Apply to New Report
  const handleApplyToNewReport = () => {
    if (!onApplyChecklistToNewReport) return;

    const validationChecklist = getSelectedValidationChecklist();
    const selectedItems = allCurrentItems.filter((item) => isItemIncluded(item.id));

    const derivedSteps = selectedItems.length > 0
      ? selectedItems.map((item, idx) => `${idx + 1}. [${item.category || 'Validação'}] ${item.title}: ${item.description}`)
      : activeTemplate.defaultStepsToReproduce;

    const prefilledReport: Partial<VulnerabilityReport> = {
      title: `[${activeTemplate.owaspReference}] ${activeTemplate.vulnerabilityType} em api.target.com`,
      target: 'api.target.com',
      platform: 'HackerOne',
      vulnerabilityType: activeTemplate.vulnerabilityType,
      severity: activeTemplate.defaultSeverity,
      status: 'DRAFT',
      cvssVector: activeTemplate.recommendedCvssVector,
      cwe: activeTemplate.cwe,
      cveIds: [],
      tags: [...activeTemplate.tags],
      summary: activeTemplate.description,
      stepsToReproduce: derivedSteps,
      proofOfConcept: activeTemplate.proofOfConceptTemplate,
      businessImpact: activeTemplate.businessImpactSummary,
      remediation: activeTemplate.remediationSummary,
      validationChecklist: validationChecklist,
      bountyAmount: 0,
      currency: 'USD'
    };

    onApplyChecklistToNewReport(prefilledReport);
  };

  // Attach to Existing Report
  const handleAttachToExistingReport = () => {
    if (!onApplyChecklistToExistingReport || !selectedReportIdForAttach) return;

    const validationChecklist = getSelectedValidationChecklist();
    onApplyChecklistToExistingReport(selectedReportIdForAttach, validationChecklist);
    setShowAttachModal(false);
    setAttachSuccessMessage(
      `Checklist anexado com sucesso ao relatório ${selectedReportIdForAttach}!`
    );
    setTimeout(() => setAttachSuccessMessage(null), 4000);
  };

  // Save as Technical Doc
  const handleSaveAsTechnicalDoc = () => {
    if (!onSaveDoc) return;

    const checklistMarkdown = allCurrentItems
      .map(
        (item) =>
          `- [${testedItems[item.id] ? 'x' : ' '}] **${item.title}**\n  *${item.description}*\n  ${
            item.guidance ? `> 💡 Dica: ${item.guidance}\n` : ''
          }`
      )
      .join('\n');

    const fullContent = `## ${activeTemplate.title} (${activeTemplate.owaspReference})

**CWE:** ${activeTemplate.cwe}
**Severidade Recomendada:** ${activeTemplate.defaultSeverity}
**Vetor CVSS:** \`${activeTemplate.recommendedCvssVector}\`

### Descrição & Contexto de Ameaça
${activeTemplate.description}

### Critérios de Verificação Técnica
${checklistMarkdown}

### Template de Prova de Conceito (PoC)
\`\`\`http
${activeTemplate.proofOfConceptTemplate}
\`\`\`

### Impacto no Negócio
${activeTemplate.businessImpactSummary}

### Remediação Recomendada
${activeTemplate.remediationSummary}
`;

    const doc: TechnicalDoc = {
      id: `DOC-CHK-${Date.now()}`,
      title: `Checklist: ${activeTemplate.title}`,
      category: 'Checklist',
      content: fullContent,
      tags: ['checklist', ...activeTemplate.tags],
      updatedAt: new Date().toISOString().split('T')[0],
      isChecklist: true,
      checklistItems: allCurrentItems.map((item) => ({
        id: item.id,
        text: item.title,
        completed: !!testedItems[item.id],
        category: item.category
      }))
    };

    onSaveDoc(doc);
    setSavedAsDocMessage('Checklist salvo com sucesso na sua Documentação Técnica!');
    setTimeout(() => setSavedAsDocMessage(null), 4000);
  };

  // Copy Markdown
  const handleCopyMarkdown = () => {
    const md = `# Checklist de Verificação: ${activeTemplate.title}
**Referência:** ${activeTemplate.owaspReference} | **CWE:** ${activeTemplate.cwe}
**Severidade Base:** ${activeTemplate.defaultSeverity}

## Critérios de Teste:
${allCurrentItems
  .map(
    (item) =>
      `- [${testedItems[item.id] ? 'x' : ' '}] ${item.title} (${item.category || 'Geral'})\n  - Detalhes: ${item.description}${
        item.guidance ? `\n  - Verificação: ${item.guidance}` : ''
      }`
  )
  .join('\n\n')}

## PoC Sugerida:
\`\`\`http
${activeTemplate.proofOfConceptTemplate}
\`\`\`
`;
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  // Tested count
  const testedCount = allCurrentItems.filter((i) => testedItems[i.id]).length;
  const totalItemsCount = allCurrentItems.length;
  const testPercentage = totalItemsCount > 0 ? Math.round((testedCount / totalItemsCount) * 100) : 0;
  const includedCount = allCurrentItems.filter((i) => isItemIncluded(i.id)).length;

  return (
    <div id="security-checklist-library" className="space-y-6 animate-fadeIn">
      {/* Top Banner & Overview */}
      <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#1e2338] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Industry Standard
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                OWASP Top 10 • API Security • CWE Hardening
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Biblioteca de Checklists de Segurança Técnica</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Roteiros estruturados de validação para bug bounty. Teste cada critério
              em ambiente seguro e aplique os checklists pré-configurados diretamente
              a novos relatórios com CVSS, passos e evidências consistentes.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-[#141824] border border-[#1e2338] text-center">
              <span className="block text-base font-mono font-bold text-emerald-400">
                {DEFAULT_SECURITY_CHECKLISTS.length}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">
                Checklists
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#141824] border border-[#1e2338] text-center">
              <span className="block text-base font-mono font-bold text-zinc-200">
                {DEFAULT_SECURITY_CHECKLISTS.reduce(
                  (acc, c) => acc + c.items.length,
                  0
                )}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">
                Critérios
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#141824] border border-[#1e2338] text-center">
              <span className="block text-base font-mono font-bold text-zinc-300">
                {reports.length}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">
                Relatórios
              </span>
            </div>
          </div>
        </div>

        {/* Feedback messages */}
        {savedAsDocMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedAsDocMessage}</span>
          </div>
        )}
        {attachSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{attachSuccessMessage}</span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-security-checklists"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por vulnerabilidade (IDOR, SQLi, SSRF, XSS), CWE, OWASP..."
              className="w-full pl-9 pr-4 py-2 bg-[#08090d] border border-[#1e2338] rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#08090d] border border-[#1e2338] rounded-xl p-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1.5" />
              <select
                aria-label="Filtrar por Categoria"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-zinc-300 text-xs py-1 px-2 focus:outline-none cursor-pointer font-mono"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0e1017] text-zinc-200">
                    {cat === 'ALL' ? 'Todas Categorias' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#08090d] border border-[#1e2338] rounded-xl p-1 text-xs font-mono">
              <select
                aria-label="Filtrar por Severidade"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-zinc-300 text-xs py-1 px-2 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#0e1017]">Todas Severidades</option>
                <option value="CRITICAL" className="bg-[#0e1017]">CRITICAL</option>
                <option value="HIGH" className="bg-[#0e1017]">HIGH</option>
                <option value="MEDIUM" className="bg-[#0e1017]">MEDIUM</option>
                <option value="LOW" className="bg-[#0e1017]">LOW</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Templates */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-semibold text-zinc-400">
              {filteredChecklists.length} checklists disponíveis
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              Selecione para inspecionar
            </span>
          </div>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredChecklists.map((template) => {
              const isSelected = template.id === activeTemplate.id;
              const sevBadge = getSeverityBadgeColor(template.defaultSeverity);
              const customCount = (customItems[template.id] || []).length;
              const totalItems = template.items.length + customCount;

              return (
                <div
                  key={template.id}
                  id={`checklist-card-${template.id}`}
                  onClick={() => setSelectedChecklistId(template.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 text-left ${
                    isSelected
                      ? 'bg-[#121624] border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                      : 'bg-[#0a0a0a] hover:bg-[#11131c] border-[#1e2338]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1e2338] text-emerald-300 border border-emerald-500/20">
                      {template.owaspReference}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${sevBadge}`}
                    >
                      {template.defaultSeverity}
                    </span>
                  </div>

                  <div>
                    <h3
                      className={`text-xs font-bold leading-snug ${
                        isSelected ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {template.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 line-clamp-2">
                      {template.vulnerabilityType}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1e2338]/60 text-[10px] text-zinc-400 font-mono">
                    <span className="text-zinc-500">{template.cwe.split(':')[0]}</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ListChecks className="w-3 h-3" />
                      <span>{totalItems} critérios</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredChecklists.length === 0 && (
              <div className="p-8 text-center rounded-xl bg-[#0a0a0a] border border-[#1e2338] text-xs text-zinc-500 font-mono">
                Nenhum checklist corresponde aos filtros selecionados.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Checklist Workspace */}
        <div className="lg:col-span-8 rounded-2xl bg-[#0a0a0a] border border-[#1e2338] p-5 sm:p-6 space-y-6">
          {/* Active Template Header */}
          <div className="space-y-3 pb-5 border-b border-[#1e2338]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {activeTemplate.owaspReference}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-300 bg-[#141824] border border-[#1e2338]">
                  {activeTemplate.cwe}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase font-mono ${getSeverityBadgeColor(
                    activeTemplate.defaultSeverity
                  )}`}
                >
                  {activeTemplate.defaultSeverity}
                </span>
              </div>

              {/* Action buttons (Top) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1e2338] border border-[#1e2338] text-zinc-300 text-xs font-medium font-mono transition-colors"
                  title="Copiar checklist em formato Markdown"
                >
                  {copiedMarkdown ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedMarkdown ? 'Copiado' : 'Copiar MD'}</span>
                </button>

                {onSaveDoc && (
                  <button
                    type="button"
                    onClick={handleSaveAsTechnicalDoc}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1e2338] border border-[#1e2338] text-zinc-300 text-xs font-medium font-mono transition-colors"
                    title="Salvar na sua biblioteca de documentação"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salvar Doc</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {activeTemplate.title}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {activeTemplate.description}
              </p>
            </div>

            {/* Recommended CVSS Snippet */}
            <div className="p-3 rounded-xl bg-[#0d1017] border border-[#1e2338] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">CVSS v3.1 Vetor Base:</span>
                <span className="text-emerald-400 font-bold">
                  {activeTemplate.recommendedCvssVector}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeTemplate.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#161a29] text-zinc-400 border border-[#1e2338]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Testing Progress Bar & Batch Controls */}
          <div className="space-y-3 p-4 rounded-xl bg-[#0e1017] border border-[#1e2338]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  <span>Sessão de Teste Ativa ({testedCount}/{totalItemsCount} validados)</span>
                </h4>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {includedCount} de {totalItemsCount} critérios selecionados para inclusão no relatório.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={handleSelectAllInclusions}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline"
                >
                  Marcar Todos
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllInclusions}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                >
                  Desmarcar
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={handleResetTesting}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  title="Resetar estado de teste"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-[#1e2338] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${testPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Progresso da verificação técnica</span>
                <span>{testPercentage}% concluído</span>
              </div>
            </div>
          </div>

          {/* Interactive Checklist Criteria List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Critérios de Verificação Detalhada
            </h4>

            <div className="space-y-2.5">
              {allCurrentItems.map((item, idx) => {
                const isTested = !!testedItems[item.id];
                const isIncluded = isItemIncluded(item.id);

                return (
                  <div
                    key={item.id}
                    id={`checklist-item-${item.id}`}
                    className={`p-3.5 rounded-xl border transition-all text-left space-y-2 ${
                      isTested
                        ? 'bg-[#0f1712] border-emerald-500/40 shadow-sm'
                        : isIncluded
                        ? 'bg-[#0e1017] border-[#1e2338]'
                        : 'bg-[#07080b] border-[#141824] opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Live verification check */}
                      <button
                        type="button"
                        onClick={() => handleToggleTested(item.id)}
                        className="flex items-start gap-3 flex-1 group text-left"
                      >
                        <div className="mt-0.5 shrink-0">
                          {isTested ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isTested
                                  ? 'line-through text-zinc-400'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {idx + 1}. {item.title}
                            </span>
                            {item.required && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                Obrigatório
                              </span>
                            )}
                            {item.category && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1e2338] text-zinc-400">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </button>

                      {/* Include in report checkbox toggle */}
                      <label
                        className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0 select-none bg-[#141824] px-2 py-1 rounded-md border border-[#1e2338]"
                        title="Incluir este critério no novo relatório de vulnerabilidade"
                      >
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => handleToggleInclusion(item.id)}
                          className="rounded border-[#1e2338] text-emerald-500 focus:ring-0 w-3 h-3"
                        />
                        <span>No Relatório</span>
                      </label>
                    </div>

                    {/* Testing Guidance Callout */}
                    {item.guidance && (
                      <div className="ml-7 p-2.5 rounded-lg bg-[#141926] border border-[#1e2338] text-[11px] text-zinc-300 font-mono flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-amber-400 font-bold">Diretriz Técnica: </span>
                          <span>{item.guidance}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Custom Criterion to Active Checklist */}
            <form
              onSubmit={handleAddCustomItem}
              className="p-3.5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 font-mono">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Adicionar Critério Personalizado ao Checklist</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Ex: validação específica do alvo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                  placeholder="Título do critério (ex: Testar cabeçalho X-Custom-Tenant)"
                  className="px-3 py-2 bg-[#121624] border border-[#1e2338] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <input
                  type="text"
                  value={newCustomGuidance}
                  onChange={(e) => setNewCustomGuidance(e.target.value)}
                  placeholder="Instrução prática ou ferramenta recomendada (opcional)"
                  className="px-3 py-2 bg-[#121624] border border-[#1e2338] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newCustomTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold font-mono transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Item</span>
                </button>
              </div>
            </form>
          </div>

          {/* Technical Context & PoC Accordion Preview */}
          <div className="space-y-4 pt-4 border-t border-[#1e2338]">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <TerminalSquare className="w-4 h-4 text-emerald-400" />
                <span>Template de Prova de Conceito (PoC) Padronizado</span>
              </h4>
              <div className="p-3.5 rounded-xl bg-[#07080b] border border-[#1e2338] font-mono text-xs text-emerald-300/90 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-48">
                {activeTemplate.proofOfConceptTemplate}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0e1017] border border-[#1e2338] space-y-1.5">
                <span className="font-bold text-zinc-200 uppercase font-mono flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Impacto de Negócio Padrão</span>
                </span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  {activeTemplate.businessImpactSummary}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e1017] border border-[#1e2338] space-y-1.5">
                <span className="font-bold text-zinc-200 uppercase font-mono flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Diretrizes de Remediação</span>
                </span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  {activeTemplate.remediationSummary}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Primary Action Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1511] to-[#0c121e] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-left">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Aplicar Checklist ({includedCount} critérios selecionados)</span>
              </span>
              <p className="text-[11px] text-zinc-400 font-mono">
                Crie um novo relatório pré-preenchido ou anexe a um rascunho existente.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {reports.length > 0 && onApplyChecklistToExistingReport && (
                <button
                  type="button"
                  id="btn-attach-to-existing-report"
                  onClick={() => setShowAttachModal(true)}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-[#141824] hover:bg-[#1e2338] text-zinc-200 font-bold text-xs uppercase font-mono tracking-wider transition-all border border-[#1e2338] text-center"
                >
                  Anexar a Existente
                </button>
              )}

              {onApplyChecklistToNewReport && (
                <button
                  type="button"
                  id="btn-create-report-with-checklist"
                  onClick={handleApplyToNewReport}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 font-mono"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Novo Relatório</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Attach Checklist to Existing Report */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-[#1e2338] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                <span>Anexar Checklist a Relatório</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Selecione o relatório de destino para incorporar os {includedCount} critérios
              de verificação deste checklist ({activeTemplate.title}).
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 font-bold">
                Relatório de Destino:
              </label>
              <select
                value={selectedReportIdForAttach}
                onChange={(e) => setSelectedReportIdForAttach(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#121624] border border-[#1e2338] text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
              >
                {reports.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    [{rep.id}] {rep.title || 'Sem título'} ({rep.target})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1e2338] text-zinc-300 text-xs font-mono font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAttachToExistingReport}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar e Anexar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
