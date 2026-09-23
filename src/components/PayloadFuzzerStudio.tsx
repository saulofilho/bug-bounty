import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  RotateCcw, 
  Sliders, 
  Search, 
  Download, 
  Filter, 
  Terminal, 
  FileText, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Sparkles, 
  Eye, 
  ShieldAlert, 
  Layers, 
  ArrowRight,
  Code2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  FuzzCategory, 
  PlacementMode, 
  MutationType, 
  FuzzSeed, 
  GeneratedFuzzItem, 
  FUZZ_CATEGORIES, 
  DEFAULT_FUZZ_SEEDS, 
  DEFAULT_MUTATION_OPTIONS, 
  FUZZ_PRESETS,
  generateFuzzItems 
} from '../utils/payloadFuzzerEngine';

interface PayloadFuzzerStudioProps {
  initialTarget?: string;
  onSendToPocBuilder?: (url: string, payload: string) => void;
}

export const PayloadFuzzerStudio: React.FC<PayloadFuzzerStudioProps> = ({
  initialTarget,
  onSendToPocBuilder
}) => {
  // --- Core State ---
  const [baseString, setBaseString] = useState<string>(
    initialTarget 
      ? `https://${initialTarget}/api/v1/search?q={FUZZ}&limit=20` 
      : 'https://alvo-bugbounty.com/api/v1/search?q={FUZZ}&limit=10'
  );
  const [placementMode, setPlacementMode] = useState<PlacementMode>('MARKER');
  
  // Active Categories (default: SQLi, XSS, Path Traversal, CMDi)
  const [selectedCategories, setSelectedCategories] = useState<Set<FuzzCategory>>(
    new Set<FuzzCategory>(['SQLI', 'XSS', 'PATH_TRAVERSAL', 'COMMAND_INJECTION'])
  );

  // Active Mutations
  const [selectedMutations, setSelectedMutations] = useState<Set<MutationType>>(
    new Set<MutationType>(['raw', 'url_encode', 'double_url_encode', 'case_alternate', 'whitespace_tamper'])
  );

  // Custom User Seeds
  const [customSeeds, setCustomSeeds] = useState<FuzzSeed[]>([]);
  const [showAddSeedModal, setShowAddSeedModal] = useState<boolean>(false);
  const [newSeedName, setNewSeedName] = useState<string>('');
  const [newSeedCategory, setNewSeedCategory] = useState<FuzzCategory>('SQLI');
  const [newSeedPayload, setNewSeedPayload] = useState<string>('');
  const [newSeedDesc, setNewSeedDesc] = useState<string>('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // UI Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle Category
  const toggleCategory = (cat: FuzzCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat); // keep at least one
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Toggle Mutation
  const toggleMutation = (mut: MutationType) => {
    setSelectedMutations(prev => {
      const next = new Set(prev);
      if (next.has(mut)) {
        if (next.size > 1) next.delete(mut); // keep at least one
      } else {
        next.add(mut);
      }
      return next;
    });
  };

  // Select All / Deselect All Categories
  const handleSelectAllCategories = () => {
    setSelectedCategories(new Set(FUZZ_CATEGORIES.map(c => c.id)));
  };

  const handleSelectOnlyCritical = () => {
    setSelectedCategories(new Set(['SQLI', 'COMMAND_INJECTION', 'PATH_TRAVERSAL']));
  };

  // Apply Preset
  const handleApplyPreset = (preset: typeof FUZZ_PRESETS[0]) => {
    setBaseString(preset.base);
    setPlacementMode(preset.mode);
    setSelectedCategories(new Set(preset.categories));
    showToast(`Preset aplicado: "${preset.name}"`);
  };

  // Add Custom Seed
  const handleAddCustomSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeedPayload.trim()) return;

    const newSeed: FuzzSeed = {
      id: `custom-${Date.now()}`,
      category: newSeedCategory,
      name: newSeedName.trim() || `Custom ${newSeedCategory} #${customSeeds.length + 1}`,
      payload: newSeedPayload.trim(),
      description: newSeedDesc.trim() || 'Seed customizado definido pelo pesquisador.',
      targetContext: 'Custom input context',
      severity: 'HIGH'
    };

    setCustomSeeds(prev => [newSeed, ...prev]);
    // Ensure the category is enabled
    setSelectedCategories(prev => new Set(prev).add(newSeedCategory));

    setNewSeedName('');
    setNewSeedPayload('');
    setNewSeedDesc('');
    setShowAddSeedModal(false);
    showToast('Payload customizado adicionado com sucesso!');
  };

  // Generate All Mutated Strings
  const generatedItems = useMemo(() => {
    return generateFuzzItems(
      baseString,
      placementMode,
      selectedCategories,
      selectedMutations,
      customSeeds
    );
  }, [baseString, placementMode, selectedCategories, selectedMutations, customSeeds]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return generatedItems.filter(item => {
      const matchSearch = 
        item.fuzzedString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.techniqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalSeed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mutationLabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
      const matchSeverity = filterSeverity === 'ALL' || item.severity === filterSeverity;

      return matchSearch && matchCategory && matchSeverity;
    });
  }, [generatedItems, searchQuery, filterCategory, filterSeverity]);

  // Export to Text Wordlist (for Burp Intruder / ffuf / wfuzz)
  const handleExportTextWordlist = () => {
    const lines = filteredItems.map(item => item.fuzzedString).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-fuzz-wordlist-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredItems.length} strings exportadas como Wordlist (.txt)`);
  };

  // Export to JSON
  const handleExportJson = () => {
    const data = {
      generator: 'BugSentinel Payload Fuzzer & Mutation Engine',
      generatedAt: new Date().toISOString(),
      baseTemplate: baseString,
      placementMode,
      totalCount: filteredItems.length,
      items: filteredItems.map(item => ({
        category: item.category,
        technique: item.techniqueName,
        mutation: item.mutationLabel,
        payload: item.fuzzedString,
        originalSeed: item.originalSeed,
        severity: item.severity
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-fuzzed-payloads-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredItems.length} payloads exportados como JSON!`);
  };

  // Copy All as Text
  const handleCopyAllAsWordlist = () => {
    const lines = filteredItems.map(item => item.fuzzedString).join('\n');
    handleCopy('copy-all-wordlist', lines);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    generatedItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [generatedItems]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Payload Fuzzer & Mutation Engine</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">
                {generatedItems.length} Test Strings Geradas
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">
                {selectedCategories.size} Categorias Ativas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Fuzzer de Payloads & Evasão de Filtros</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Defina um payload base ou template com marcador <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">{`{FUZZ}`}</code> e selecione técnicas de injeção e mutações para gerar automaticamente combinações de teste manual, prontas para Burp Intruder, ffuf ou validação direta via cURL.
            </p>
          </div>

          {/* Metric Summary Counters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#181824] border border-[#272738] rounded-xl p-3 text-center min-w-[100px]">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block font-bold">Total Mutado</span>
              <span className="text-xl font-bold font-mono text-amber-400">{generatedItems.length}</span>
            </div>
            <div className="bg-[#181824] border border-[#272738] rounded-xl p-3 text-center min-w-[100px]">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block font-bold">Mutações</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{selectedMutations.size}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Base Payload, Placement, Quick Presets */}
        <div className="lg:col-span-7 space-y-5 bg-[#121218] border border-[#22222d] rounded-2xl p-5">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">1. Template Base & Posição de Injeção</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setBaseString('https://alvo-bugbounty.com/api/v1/search?q={FUZZ}&limit=10');
                setPlacementMode('MARKER');
              }}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Padrão</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-zinc-400">Presets Rápidos de Teste:</label>
            <div className="flex items-center gap-2 flex-wrap">
              {FUZZ_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#181824] hover:bg-[#222233] border border-[#2a2a3b] text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Base Template Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <span>Payload Base / URL Alvo:</span>
                <span className="text-zinc-500 font-normal">(Insira <code className="text-amber-400">{`{FUZZ}`}</code> para definir o ponto exato)</span>
              </label>
              {baseString.includes('{FUZZ}') ? (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                  Marcador {`{FUZZ}`} detectado
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded">
                  Modo {placementMode} ativo
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={baseString}
              onChange={(e) => setBaseString(e.target.value)}
              placeholder="Ex: https://api.alvo.com/search?q={FUZZ}&status=active ou {'query': '{FUZZ}'}"
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 resize-y"
            />
          </div>

          {/* Placement Mode Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold text-zinc-400">Estratégia de Posicionamento:</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              {[
                { id: 'MARKER', label: '{FUZZ} Marker', desc: 'Substitui o marcador {FUZZ}' },
                { id: 'SUFFIX', label: 'Suffix (Append)', desc: 'Anexa ao final do texto base' },
                { id: 'PREFIX', label: 'Prefix (Prepend)', desc: 'Insere antes do texto base' },
                { id: 'REPLACE', label: 'Raw Only', desc: 'Apenas a injeção pura' },
                { id: 'QUOTE_WRAP', label: 'Delim Wrap', desc: 'Envolve em aspas/concat' }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPlacementMode(mode.id as PlacementMode)}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    placementMode === mode.id
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm font-bold'
                      : 'bg-[#161622] text-zinc-400 border-[#232333] hover:bg-[#1d1d2c]'
                  }`}
                >
                  <span className="text-[11px]">{mode.label}</span>
                  <span className="text-[9px] text-zinc-500 truncate max-w-full">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mutation & Evasion Strategies */}
          <div className="space-y-3 pt-2 border-t border-[#1e1e28]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mutações & Evasões de WAF ({selectedMutations.size} ativas):</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setSelectedMutations(new Set(DEFAULT_MUTATION_OPTIONS.map(m => m.id)))}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  Todas
                </button>
                <span className="text-zinc-600">/</span>
                <button
                  type="button"
                  onClick={() => setSelectedMutations(new Set(['raw', 'url_encode']))}
                  className="text-zinc-400 hover:underline cursor-pointer"
                >
                  Essenciais
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFAULT_MUTATION_OPTIONS.map(mut => {
                const isChecked = selectedMutations.has(mut.id);
                return (
                  <button
                    key={mut.id}
                    type="button"
                    onClick={() => toggleMutation(mut.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isChecked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-200'
                        : 'bg-[#161622] border-[#222232] text-zinc-500 hover:bg-[#1b1b2a]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        <span className={isChecked ? 'text-white' : 'text-zinc-400'}>{mut.name}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">{mut.description}</p>
                    </div>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                      {mut.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Injection Categories & Custom Seeds */}
        <div className="lg:col-span-5 space-y-5 bg-[#121218] border border-[#22222d] rounded-2xl p-5">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white">2. Técnicas & Vetores de Ataque</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllCategories}
                className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
              >
                Todas
              </button>
              <span className="text-zinc-600">/</span>
              <button
                type="button"
                onClick={handleSelectOnlyCritical}
                className="text-[11px] font-mono text-zinc-400 hover:underline cursor-pointer"
              >
                Críticas
              </button>
            </div>
          </div>

          {/* Categories Toggles */}
          <div className="space-y-2">
            {FUZZ_CATEGORIES.map(cat => {
              const isSelected = selectedCategories.has(cat.id);
              const count = categoryCounts[cat.id] || 0;
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#181826] border-zinc-600 shadow-sm'
                      : 'bg-[#14141d] border-[#20202d] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono border font-bold ${cat.badgeClass}`}>
                          {cat.shortLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{cat.description}</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">
                    {count} var.
                  </span>
                </div>
              );
            })}
          </div>

          {/* Custom Seed Adder */}
          <div className="pt-2 border-t border-[#1e1e28] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Seeds Customizados ({customSeeds.length}):</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddSeedModal(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Novo Seed</span>
              </button>
            </div>

            {customSeeds.length > 0 ? (
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                {customSeeds.map(seed => (
                  <div key={seed.id} className="p-2 rounded-lg bg-[#161622] border border-[#242436] flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="truncate">
                      <span className="text-white font-bold block truncate">{seed.name}</span>
                      <span className="text-amber-300 text-[10px] truncate block">{seed.payload}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomSeeds(prev => prev.filter(s => s.id !== seed.id))}
                      className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                      title="Remover seed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 italic">
                Nenhum seed customizado inserido. Clique em "Novo Seed" para adicionar seus próprios payloads.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Workbench & Generated Payloads List */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
        {/* Table Controls & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e1e28]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Resultados Gerados ({filteredItems.length} de {generatedItems.length})</span>
            </h3>
            <span className="text-zinc-500">•</span>
            <span className="text-xs font-mono text-zinc-400">
              Pronto para envio ou cópia em massa
            </span>
          </div>

          {/* Bulk Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAllAsWordlist}
              className="px-3 py-1.5 rounded-xl bg-[#1a1a26] hover:bg-[#232336] border border-[#2c2c40] text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'copy-all-wordlist' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Tudo (Wordlist)</span>
            </button>

            <button
              type="button"
              onClick={handleExportTextWordlist}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar .TXT</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por string fuzzed, técnica, payload original ou mutação..."
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas as Categorias ({generatedItems.length})</option>
              {FUZZ_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({categoryCounts[c.id] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas as Severidades</option>
              <option value="CRITICAL">Apenas Críticas (CRITICAL)</option>
              <option value="HIGH">Apenas Altas (HIGH)</option>
              <option value="MEDIUM">Apenas Médias (MEDIUM)</option>
            </select>
          </div>
        </div>

        {/* Generated Items List */}
        {filteredItems.length > 0 ? (
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredItems.map((item, idx) => {
              const isUrl = item.fuzzedString.startsWith('http://') || item.fuzzedString.startsWith('https://');
              return (
                <div
                  key={item.id}
                  className="bg-[#151520] border border-[#232333] hover:border-zinc-700 rounded-xl p-3 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        item.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        item.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {item.categoryLabel}
                      </span>
                      <span className="text-xs font-bold text-white">{item.techniqueName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        Mutação: {item.mutationLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">{item.length} chars</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`fuzz-${item.id}`, item.fuzzedString)}
                        className="px-2.5 py-1 rounded-lg bg-[#1f1f2e] hover:bg-[#2a2a3e] text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar string mutada"
                      >
                        {copiedKey === `fuzz-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Copiar</span>
                      </button>

                      {isUrl && (
                        <a
                          href={item.fuzzedString}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center gap-1 transition-colors"
                          title="Testar requisição GET no navegador"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Fuzzed Output Codebox */}
                  <div className="bg-[#0b0b10] border border-[#1b1b26] rounded-lg p-2.5 font-mono text-xs text-amber-300 break-all select-all flex items-start justify-between gap-3">
                    <span>{item.fuzzedString}</span>
                  </div>

                  {/* Description & Seed Meta */}
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between gap-3 pt-0.5">
                    <span className="truncate">{item.description}</span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      Seed base: <code className="text-zinc-400">{item.originalSeed}</code>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#151520] border border-dashed border-[#282838] rounded-xl p-8 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Nenhum payload correspondente encontrado</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Ajuste sua busca textual ou marque mais categorias e mutações no painel acima.
            </p>
          </div>
        )}
      </div>

      {/* Add Custom Seed Modal */}
      {showAddSeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151520] border border-[#2a2a3b] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#232332] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Adicionar Seed Customizado</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSeedModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleAddCustomSeed} className="space-y-3">
              <div>
                <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Nome do Vetor / Técnica:</label>
                <input
                  type="text"
                  required
                  value={newSeedName}
                  onChange={(e) => setNewSeedName(e.target.value)}
                  placeholder="Ex: My Custom Polyglot Payload"
                  className="w-full bg-[#181824] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Categoria de Ataque:</label>
                <select
                  value={newSeedCategory}
                  onChange={(e) => setNewSeedCategory(e.target.value as FuzzCategory)}
                  className="w-full bg-[#181824] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                >
                  {FUZZ_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">String de Payload Bruta:</label>
                <textarea
                  rows={2}
                  required
                  value={newSeedPayload}
                  onChange={(e) => setNewSeedPayload(e.target.value)}
                  placeholder="Ex: '><script>alert(1)</script>"
                  className="w-full bg-[#181824] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Descrição / Contexto:</label>
                <input
                  type="text"
                  value={newSeedDesc}
                  onChange={(e) => setNewSeedDesc(e.target.value)}
                  placeholder="Ex: Polyglot para bypass de filtros que filtram tags simples"
                  className="w-full bg-[#181824] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232332]">
                <button
                  type="button"
                  onClick={() => setShowAddSeedModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold shadow-md cursor-pointer"
                >
                  Salvar Seed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
