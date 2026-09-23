import React, { useState, useMemo, useEffect } from 'react';
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
  AlertTriangle,
  Globe,
  Link2,
  FolderTree,
  FileCode2,
  ShieldCheck,
  Send
} from 'lucide-react';
import { 
  FuzzCategory, 
  PlacementMode, 
  MutationType, 
  FuzzSeed, 
  GeneratedFuzzItem, 
  ParsedUrlDetails,
  ParsedUrlParam,
  FUZZ_CATEGORIES, 
  DEFAULT_FUZZ_SEEDS, 
  DEFAULT_MUTATION_OPTIONS, 
  DIRECTORY_TRAVERSAL_ENCODINGS,
  COMMON_TARGET_FILES,
  FUZZ_PRESETS,
  parseUrlParameters,
  reconstructUrlWithParam,
  generateFuzzItems,
  generateUrlParamFuzzItems
} from '../utils/payloadFuzzerEngine';

interface PayloadFuzzerStudioProps {
  initialTarget?: string;
  onSendToPocBuilder?: (url: string, payload: string) => void;
}

type StudioMode = 'url-param' | 'template-marker';

export const PayloadFuzzerStudio: React.FC<PayloadFuzzerStudioProps> = ({
  initialTarget,
  onSendToPocBuilder
}) => {
  // --- Studio Operating Mode ---
  const [studioMode, setStudioMode] = useState<StudioMode>('url-param');

  // --- 1. URL Parameter Fuzzing State ---
  const [targetUrl, setTargetUrl] = useState<string>(() => {
    if (initialTarget) {
      return `https://${initialTarget}/api/v1/download?file=report.pdf&user=admin&theme=dark`;
    }
    return 'https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=admin&theme=dark';
  });

  const parsedUrl = useMemo<ParsedUrlDetails>(() => {
    return parseUrlParameters(targetUrl);
  }, [targetUrl]);

  // Selected query parameter to fuzz
  const [selectedParam, setSelectedParam] = useState<string>('file');

  // Auto-sync selected parameter if available in parsed URL
  useEffect(() => {
    if (parsedUrl.params.length > 0) {
      const exists = parsedUrl.params.some(p => p.name === selectedParam);
      if (!exists) {
        setSelectedParam(parsedUrl.params[0].name);
      }
    }
  }, [parsedUrl, selectedParam]);

  // Inline add new parameter
  const [newParamKey, setNewParamKey] = useState<string>('');
  const [newParamVal, setNewParamVal] = useState<string>('');

  // --- Traversal & URL Encoding Specifics ---
  const [traversalDepths, setTraversalDepths] = useState<number[]>([3, 6, 8, 12]);
  const [selectedTraversalEncodings, setSelectedTraversalEncodings] = useState<string[]>([
    'raw',
    'full_url',
    'slash_only',
    'double_url',
    'non_recursive',
    'windows_backslash_url'
  ]);
  const [selectedTargetFiles, setSelectedTargetFiles] = useState<string[]>([
    'linux-passwd',
    'linux-environ',
    'win-ini',
    'app-env',
    'aws-creds',
    'php-filter'
  ]);
  const [includeNullByteSuffix, setIncludeNullByteSuffix] = useState<boolean>(false);
  const [nullByteExtension, setNullByteExtension] = useState<string>('%00');
  const [autoUrlEncodeCommonPayloads, setAutoUrlEncodeCommonPayloads] = useState<boolean>(true);

  // --- 2. Template / Marker Fuzzing State ---
  const [baseString, setBaseString] = useState<string>(
    initialTarget 
      ? `https://${initialTarget}/api/v1/search?q={FUZZ}&limit=20` 
      : 'https://alvo-bugbounty.com/api/v1/search?q={FUZZ}&limit=10'
  );
  const [placementMode, setPlacementMode] = useState<PlacementMode>('MARKER');
  
  // Active Categories
  const [selectedCategories, setSelectedCategories] = useState<Set<FuzzCategory>>(
    new Set<FuzzCategory>(['PATH_TRAVERSAL', 'SQLI', 'COMMAND_INJECTION'])
  );

  // Active Mutations
  const [selectedMutations, setSelectedMutations] = useState<Set<MutationType>>(
    new Set<MutationType>([
      'raw', 
      'url_encode', 
      'double_url_encode', 
      'traversal_dot_slash_url', 
      'traversal_slash_only_url', 
      'traversal_double_encoded', 
      'null_byte'
    ])
  );

  // Custom User Seeds
  const [customSeeds, setCustomSeeds] = useState<FuzzSeed[]>([]);
  const [showAddSeedModal, setShowAddSeedModal] = useState<boolean>(false);
  const [newSeedName, setNewSeedName] = useState<string>('');
  const [newSeedCategory, setNewSeedCategory] = useState<FuzzCategory>('PATH_TRAVERSAL');
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
        if (next.size > 1) next.delete(cat);
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
        if (next.size > 1) next.delete(mut);
      } else {
        next.add(mut);
      }
      return next;
    });
  };

  // Toggle Traversal Depth
  const toggleDepth = (d: number) => {
    setTraversalDepths(prev => {
      if (prev.includes(d)) {
        if (prev.length > 1) return prev.filter(x => x !== d);
        return prev;
      }
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  // Toggle Traversal Encoding
  const toggleTraversalEncoding = (id: string) => {
    setSelectedTraversalEncodings(prev => {
      if (prev.includes(id)) {
        if (prev.length > 1) return prev.filter(x => x !== id);
        return prev;
      }
      return [...prev, id];
    });
  };

  // Toggle Target File
  const toggleTargetFile = (id: string) => {
    setSelectedTargetFiles(prev => {
      if (prev.includes(id)) {
        if (prev.length > 1) return prev.filter(x => x !== id);
        return prev;
      }
      return [...prev, id];
    });
  };

  // Add parameter to URL helper
  const handleAddParamToUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParamKey.trim()) return;

    const key = newParamKey.trim();
    const val = newParamVal.trim() || 'value';

    const hasQuery = targetUrl.includes('?');
    const separator = hasQuery ? '&' : '?';
    const updatedUrl = `${targetUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    
    setTargetUrl(updatedUrl);
    setSelectedParam(key);
    setNewParamKey('');
    setNewParamVal('');
    showToast(`Parâmetro '${key}' adicionado à URL!`);
  };

  // Quick Preset Handlers for URL Parameters
  const handleApplyUrlParamPreset = (type: 'lfi' | 'waf-bypass' | 'null-byte' | 'sqli' | 'ssrf') => {
    switch (type) {
      case 'lfi':
        setTargetUrl('https://alvo-bugbounty.com/api/v1/download?file=report.pdf&lang=pt-BR');
        setSelectedParam('file');
        setSelectedCategories(new Set<FuzzCategory>(['PATH_TRAVERSAL']));
        setSelectedTraversalEncodings(['raw', 'full_url', 'slash_only', 'double_url', 'non_recursive']);
        setTraversalDepths([3, 6, 8, 12]);
        setIncludeNullByteSuffix(false);
        setAutoUrlEncodeCommonPayloads(true);
        showToast('Preset de Directory Traversal & LFI carregado!');
        break;

      case 'waf-bypass':
        setTargetUrl('https://alvo-bugbounty.com/api/v1/view?path=docs/readme.txt');
        setSelectedParam('path');
        setSelectedCategories(new Set<FuzzCategory>(['PATH_TRAVERSAL']));
        setSelectedTraversalEncodings(['full_url', 'double_url', 'non_recursive', 'utf8_overlong', '16bit_unicode', 'windows_full_url']);
        setTraversalDepths([6, 8, 12]);
        showToast('Preset WAF Evasion & Encodings Especiais ativado!');
        break;

      case 'null-byte':
        setTargetUrl('https://alvo-bugbounty.com/profile/avatar?image=avatar.png');
        setSelectedParam('image');
        setSelectedCategories(new Set<FuzzCategory>(['PATH_TRAVERSAL']));
        setIncludeNullByteSuffix(true);
        setNullByteExtension('%00.png');
        setSelectedTraversalEncodings(['raw', 'full_url', 'slash_only', 'double_url']);
        showToast('Preset de Bypass com Null-Byte (%00.png) ativado!');
        break;

      case 'sqli':
        setTargetUrl('https://alvo-bugbounty.com/api/v1/items?id=1024&category=electronics');
        setSelectedParam('id');
        setSelectedCategories(new Set<FuzzCategory>(['SQLI']));
        setSelectedMutations(new Set<MutationType>(['raw', 'url_encode', 'double_url_encode', 'whitespace_tamper']));
        setAutoUrlEncodeCommonPayloads(true);
        showToast('Preset de SQLi em Parâmetro de URL carregado!');
        break;

      case 'ssrf':
        setTargetUrl('https://alvo-bugbounty.com/api/integrations/fetch?url=https://cdn.example.com/asset.png');
        setSelectedParam('url');
        setSelectedCategories(new Set<FuzzCategory>(['SSRF']));
        setSelectedMutations(new Set<MutationType>(['raw', 'url_encode']));
        setAutoUrlEncodeCommonPayloads(true);
        showToast('Preset de SSRF em Parâmetro de URL carregado!');
        break;
    }
  };

  // Add Custom Seed
  const handleAddCustomSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeedName || !newSeedPayload) return;

    const seed: FuzzSeed = {
      id: `custom-${Date.now()}`,
      category: newSeedCategory,
      name: newSeedName,
      payload: newSeedPayload,
      description: newSeedDesc || 'Custom user-provided fuzz seed',
      targetContext: 'Custom user injection point',
      severity: 'HIGH'
    };

    setCustomSeeds(prev => [...prev, seed]);
    setNewSeedName('');
    setNewSeedPayload('');
    setNewSeedDesc('');
    setShowAddSeedModal(false);
    showToast('Payload customizado adicionado com sucesso!');
  };

  // Remove Custom Seed
  const handleRemoveCustomSeed = (id: string) => {
    setCustomSeeds(prev => prev.filter(s => s.id !== id));
    showToast('Seed customizado removido.');
  };

  // Generate Items based on Active Studio Mode
  const generatedItems = useMemo<GeneratedFuzzItem[]>(() => {
    if (studioMode === 'url-param') {
      return generateUrlParamFuzzItems({
        targetUrl,
        selectedParam,
        traversalDepths,
        selectedTraversalEncodings,
        selectedTargetFiles,
        includeNullByteSuffix,
        nullByteExtension,
        autoUrlEncodeCommonPayloads,
        selectedCategories,
        selectedMutations,
        customSeeds
      });
    }

    return generateFuzzItems(
      baseString,
      placementMode,
      selectedCategories,
      selectedMutations,
      customSeeds
    );
  }, [
    studioMode,
    targetUrl,
    selectedParam,
    traversalDepths,
    selectedTraversalEncodings,
    selectedTargetFiles,
    includeNullByteSuffix,
    nullByteExtension,
    autoUrlEncodeCommonPayloads,
    baseString,
    placementMode,
    selectedCategories,
    selectedMutations,
    customSeeds
  ]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return generatedItems.filter(item => {
      const matchSearch = 
        item.fuzzedString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.techniqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalSeed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mutationLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.parameterName && item.parameterName.toLowerCase().includes(searchQuery.toLowerCase()));

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
    link.download = `bugsentinel-url-fuzz-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredItems.length} URLs exportadas como Wordlist (.txt)`);
  };

  // Export Raw Payloads Wordlist
  const handleExportRawPayloads = () => {
    const lines = filteredItems.map(item => item.rawPayloadOnly || item.fuzzedString).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-raw-payloads-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredItems.length} payloads brutos exportados como Wordlist (.txt)`);
  };

  // Export to JSON
  const handleExportJson = () => {
    const data = {
      generator: 'BugSentinel URL Parameter Fuzzer & Mutation Engine',
      generatedAt: new Date().toISOString(),
      mode: studioMode,
      targetUrl: studioMode === 'url-param' ? targetUrl : baseString,
      targetParameter: studioMode === 'url-param' ? selectedParam : undefined,
      totalCount: filteredItems.length,
      items: filteredItems.map(item => ({
        category: item.category,
        technique: item.techniqueName,
        mutation: item.mutationLabel,
        assembledUrl: item.fuzzedString,
        parameter: item.parameterName,
        rawPayload: item.rawPayloadOnly,
        originalSeed: item.originalSeed,
        severity: item.severity
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-url-fuzz-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Relatório JSON exportado (${filteredItems.length} itens)!`);
  };

  // Copy All as Wordlist
  const handleCopyAllAsWordlist = () => {
    const lines = filteredItems.map(item => item.fuzzedString).join('\n');
    handleCopy('copy-all-wordlist', lines);
  };

  // Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    generatedItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [generatedItems]);

  // Live URL preview calculation
  const livePreviewUrl = useMemo(() => {
    if (studioMode !== 'url-param' || !parsedUrl.isValidUrl) return null;
    const samplePayload = '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd';
    return reconstructUrlWithParam(parsedUrl, selectedParam, samplePayload);
  }, [studioMode, parsedUrl, selectedParam]);

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
                <span>Payload Fuzzer & URL Parameter Engine</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-emerald-400 font-mono text-xs font-bold">
                Auto URL Encoding & Directory Traversal
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">
                {generatedItems.length} URLs Geradas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Fuzzer de Parâmetros de URL & Evasão de Filtros</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Audite parâmetros de consulta HTTP (GET/POST) com injeção seletiva, codificação automática de URL e matriz completa de travessia de diretório (<code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">../</code>, <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">%2e%2e%2f</code>, <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">..%2f</code>, <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">....//</code>, Unicode e Null-Bytes).
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#181824] border border-[#272738] rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStudioMode('url-param')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'url-param'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>URL Parameter Fuzzing</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('template-marker')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'template-marker'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Template {`{FUZZ}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Panel */}
      {studioMode === 'url-param' ? (
        /* --- MODE 1: URL PARAMETER FUZZING WORKBENCH --- */
        <div className="space-y-6">
          {/* Target URL & Query Parameter Parser Card */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">1. URL Alvo & Seleção de Parâmetro para Fuzzing</h3>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('lfi')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-all cursor-pointer"
                >
                  📁 LFI / Traversal Pack
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('waf-bypass')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                >
                  🛡️ WAF Evasion (%2e%2e%2f)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('null-byte')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
                >
                  🚫 Null-Byte (%00.png)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('sqli')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-all cursor-pointer"
                >
                  💉 SQLi Param
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('ssrf')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all cursor-pointer"
                >
                  🌐 SSRF Param
                </button>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-300 flex items-center justify-between">
                <span>Insira o Endpoint HTTP com Parâmetros de Consulta:</span>
                <span className="text-[10px] text-zinc-500">Ex: https://alvo.com/download?file=relatorio.pdf&id=42</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://alvo.com/api/v1/download?file=report.pdf&user=admin"
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl pl-3 pr-24 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTargetUrl('https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=admin&theme=dark');
                    setSelectedParam('file');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-[#20202e] border border-[#2d2d40] cursor-pointer"
                >
                  Restaurar
                </button>
              </div>
            </div>

            {/* Detected Parameters Selection Chips */}
            <div className="p-4 rounded-xl bg-[#171722] border border-[#252536] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Parâmetros Detectados na Query String ({parsedUrl.params.length}):
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    (Clique no parâmetro desejado para definir o alvo de injeção)
                  </span>
                </div>

                {/* Auto URL Encode toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoUrlEncodeCommonPayloads}
                    onChange={(e) => setAutoUrlEncodeCommonPayloads(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-cyan-300">
                    Auto URL Encode para caracteres especiais (%20, %22, %27, %3C, %3E)
                  </span>
                </label>
              </div>

              {parsedUrl.params.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {parsedUrl.params.map(param => {
                    const isSelected = selectedParam === param.name;
                    return (
                      <button
                        key={param.name}
                        type="button"
                        onClick={() => setSelectedParam(param.name)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-md font-bold ring-2 ring-cyan-500/30'
                            : 'bg-[#1b1b28] text-zinc-300 border-[#2a2a3e] hover:bg-[#232334] hover:border-zinc-500'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
                        <span>{param.name}</span>
                        <span className="text-[10px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded border border-zinc-700 truncate max-w-[120px]">
                          {param.value || 'vazio'}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500 text-black font-bold">
                            ALVO
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center justify-between">
                  <span>Nenhum parâmetro detectado na URL. Adicione um parâmetro abaixo para iniciar o fuzzing.</span>
                </div>
              )}

              {/* Add New Parameter Form */}
              <form onSubmit={handleAddParamToUrl} className="flex items-center gap-2 pt-2 border-t border-[#232332] flex-wrap">
                <span className="text-[11px] font-mono text-zinc-400">+ Adicionar Parâmetro:</span>
                <input
                  type="text"
                  placeholder="Nome (ex: file)"
                  value={newParamKey}
                  onChange={(e) => setNewParamKey(e.target.value)}
                  className="bg-[#12121a] border border-[#2d2d3e] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 w-32"
                />
                <span className="text-zinc-600 font-mono">=</span>
                <input
                  type="text"
                  placeholder="Valor padrão"
                  value={newParamVal}
                  onChange={(e) => setNewParamVal(e.target.value)}
                  className="bg-[#12121a] border border-[#2d2d3e] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 w-36"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-[#252536] hover:bg-[#303046] text-zinc-200 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  Adicionar
                </button>
              </form>
            </div>

            {/* Live Assembled URL Preview Box */}
            {livePreviewUrl && (
              <div className="p-3.5 rounded-xl bg-[#0e0e14] border border-[#1e1e2c] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pré-Visualização do Endpoint Fuzzed (Parâmetro Alvo: <code className="text-cyan-400">{selectedParam}</code>):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('live-preview', livePreviewUrl)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar Exemplo</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-300 break-all bg-black/50 p-2.5 rounded-lg border border-[#222230]">
                  <span>{parsedUrl.pathname}?</span>
                  {parsedUrl.params.map((p, idx) => (
                    <React.Fragment key={p.name}>
                      {idx > 0 && <span>&</span>}
                      {p.name === selectedParam ? (
                        <span className="bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40 font-bold">
                          {p.name}=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
                        </span>
                      ) : (
                        <span className="text-zinc-500">{p.name}={p.value}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Directory Traversal & Character Encodings Specialty Controls */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">
                  2. Matriz de Directory Traversal & Codificações de Evasão (../, %2e%2e%2f, etc.)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                {selectedTraversalEncodings.length} Encodings Selecionados
              </span>
            </div>

            {/* Traversal Character Encodings Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300">
                  Variações de Codificação de Travessia (Dot-Dot-Slash & Backslash):
                </label>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedTraversalEncodings(DIRECTORY_TRAVERSAL_ENCODINGS.map(e => e.id))}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-zinc-600">/</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTraversalEncodings(['raw', 'full_url', 'slash_only', 'double_url'])}
                    className="text-zinc-400 hover:underline cursor-pointer"
                  >
                    Padrão WAF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {DIRECTORY_TRAVERSAL_ENCODINGS.map(enc => {
                  const isChecked = selectedTraversalEncodings.includes(enc.id);
                  return (
                    <button
                      key={enc.id}
                      type="button"
                      onClick={() => toggleTraversalEncoding(enc.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                        isChecked
                          ? 'bg-orange-500/10 border-orange-500/30 text-zinc-200 ring-1 ring-orange-500/20'
                          : 'bg-[#161622] border-[#222232] text-zinc-500 hover:bg-[#1b1b2a]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-orange-400' : 'bg-zinc-600'}`} />
                          <span className={isChecked ? 'text-white' : 'text-zinc-400'}>{enc.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">{enc.description}</p>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-orange-300 font-bold shrink-0 border border-zinc-700">
                        {enc.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Traversal Depths & Target Files Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-[#1e1e28]">
              {/* Depths Selector */}
              <div className="md:col-span-4 space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 block">
                  Profundidade de Recursão (Saltos):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { depth: 3, label: '3 Níveis (../../../)' },
                    { depth: 6, label: '6 Níveis (Linux Root)' },
                    { depth: 8, label: '8 Níveis (Deep Web)' },
                    { depth: 12, label: '12 Níveis (Chroot Esc)' }
                  ].map(d => {
                    const isChecked = traversalDepths.includes(d.depth);
                    return (
                      <button
                        key={d.depth}
                        type="button"
                        onClick={() => toggleDepth(d.depth)}
                        className={`p-2 rounded-xl text-center border text-xs font-mono transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-orange-500/20 text-orange-200 border-orange-500/40 font-bold'
                            : 'bg-[#161622] text-zinc-500 border-[#222232] hover:bg-[#1c1c2a]'
                        }`}
                      >
                        <div>{d.depth}x</div>
                        <div className="text-[9px] text-zinc-400 truncate">{d.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Null Byte & Suffix Bypass Control */}
                <div className="pt-3 border-t border-[#1e1e28] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeNullByteSuffix}
                      onChange={(e) => setIncludeNullByteSuffix(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      Bypass de Extensão / Null Byte:
                    </span>
                  </label>

                  {includeNullByteSuffix && (
                    <div className="space-y-1.5 pl-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['%00', '%00.png', '%00.jpg', '%2500.pdf'].map(suffix => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => setNullByteExtension(suffix)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                              nullByteExtension === suffix
                                ? 'bg-orange-500 text-black font-bold border-orange-400'
                                : 'bg-black/40 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={nullByteExtension}
                        onChange={(e) => setNullByteExtension(e.target.value)}
                        placeholder="Ex: %00.png ou %2500"
                        className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2 py-1 text-xs font-mono text-orange-300"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Target Files Selector */}
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-zinc-300">
                    Arquivos Alvo Sensíveis ({selectedTargetFiles.length} selecionados):
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedTargetFiles(COMMON_TARGET_FILES.map(f => f.id))}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-zinc-600">/</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTargetFiles(['linux-passwd', 'win-ini', 'app-env'])}
                      className="text-zinc-400 hover:underline cursor-pointer"
                    >
                      Essenciais
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {COMMON_TARGET_FILES.map(file => {
                    const isChecked = selectedTargetFiles.includes(file.id);
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => toggleTargetFile(file.id)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 text-zinc-200'
                            : 'bg-[#161622] border-[#222232] text-zinc-500 hover:bg-[#1b1b2a]'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-mono font-bold text-white truncate">{file.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{file.path}</div>
                        </div>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                          file.os === 'Linux' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          file.os === 'Windows' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {file.os}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Additional Injections: SQLi, CMDi, SSRF in URL Parameter */}
            <div className="pt-3 border-t border-[#1e1e28] space-y-2">
              <label className="text-xs font-mono font-bold text-zinc-300 block">
                Outras Categorias de Injeção em Parâmetros de URL:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {FUZZ_CATEGORIES.map(cat => {
                  const isChecked = selectedCategories.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? `${cat.badgeClass} shadow-sm`
                          : 'bg-[#161622] text-zinc-500 border-[#222232] hover:text-zinc-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-current' : 'bg-zinc-600'}`} />
                      <span>{cat.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* --- MODE 2: CLASSIC TEMPLATE {FUZZ} WORKBENCH --- */
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
                    onClick={() => {
                      setBaseString(preset.base);
                      setPlacementMode(preset.mode);
                      setSelectedCategories(new Set(preset.categories));
                      showToast(`Preset "${preset.name}" aplicado!`);
                    }}
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
                  <span>Mutações & Evasões ({selectedMutations.size} ativas):</span>
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
                    onClick={() => setSelectedMutations(new Set(['raw', 'url_encode', 'traversal_dot_slash_url']))}
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
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">2. Categorias de Vulnerabilidade</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedCategories.size} de {FUZZ_CATEGORIES.length} selecionadas
              </span>
            </div>

            <div className="space-y-2">
              {FUZZ_CATEGORIES.map(cat => {
                const isChecked = selectedCategories.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked
                        ? 'bg-[#171722] border-zinc-600 shadow-sm'
                        : 'bg-[#14141d] border-[#20202d] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isChecked ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                        <span className="text-xs font-bold text-white">{cat.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                          {cat.shortLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{cat.description}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 shrink-0">
                      {DEFAULT_FUZZ_SEEDS.filter(s => s.category === cat.id).length} seeds
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Seeds Section */}
            <div className="pt-3 border-t border-[#1e1e28] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    Seeds Customizados ({customSeeds.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSeedModal(true)}
                  className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo Seed</span>
                </button>
              </div>

              {customSeeds.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {customSeeds.map(seed => (
                    <div
                      key={seed.id}
                      className="p-2 rounded-lg bg-[#181824] border border-[#252538] flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div className="truncate">
                        <span className="text-white font-bold">{seed.name}: </span>
                        <code className="text-amber-300">{seed.payload}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSeed(seed.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#151520] border border-dashed border-[#252535] text-center text-zinc-500 text-[11px] font-mono">
                  Nenhum seed customizado adicionado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generated Workbench & Output Results */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e1e28]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Resultados Gerados ({filteredItems.length} de {generatedItems.length})</span>
            </h3>
            <span className="text-zinc-500">•</span>
            <span className="text-xs font-mono text-zinc-400">
              {studioMode === 'url-param' ? `Alvo: Parâmetro [${selectedParam}]` : 'Modo Template'}
            </span>
          </div>

          {/* Bulk Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAllAsWordlist}
              className="px-3 py-1.5 rounded-xl bg-[#1a1a26] hover:bg-[#232336] border border-[#2c2c40] text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar todas as URLs geradas como wordlist"
            >
              {copiedKey === 'copy-all-wordlist' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar URLs (Wordlist)</span>
            </button>

            <button
              type="button"
              onClick={handleExportRawPayloads}
              className="px-3 py-1.5 rounded-xl bg-[#1a1a26] hover:bg-[#232336] border border-[#2c2c40] text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Exportar apenas os payloads do parâmetro"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Payloads Brutos (.txt)</span>
            </button>

            <button
              type="button"
              onClick={handleExportTextWordlist}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar URLs (.txt)</span>
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

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por URL fuzzed, técnica, encoding (%2e%2e%2f), arquivo alvo..."
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
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredItems.map((item, idx) => {
              const isUrl = item.fuzzedString.startsWith('http://') || item.fuzzedString.startsWith('https://');
              return (
                <div
                  key={item.id}
                  className="bg-[#151520] border border-[#232333] hover:border-zinc-700 rounded-xl p-3.5 transition-all space-y-2.5 group"
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

                      {item.parameterName && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          Param: [{item.parameterName}]
                        </span>
                      )}

                      <span className="text-xs font-bold text-white">{item.techniqueName}</span>

                      {item.encodingApplied && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-300 border border-orange-500/25">
                          {item.encodingApplied}
                        </span>
                      )}
                    </div>

                    {/* Actions per item */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">{item.length} chars</span>
                      
                      {/* Copy Assembled URL */}
                      <button
                        type="button"
                        onClick={() => handleCopy(`fuzz-${item.id}`, item.fuzzedString)}
                        className="px-2.5 py-1 rounded-lg bg-[#1f1f2e] hover:bg-[#2a2a3e] text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar URL completa fuzzed"
                      >
                        {copiedKey === `fuzz-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copiar URL</span>
                      </button>

                      {/* Copy Raw Parameter Payload */}
                      {item.rawPayloadOnly && (
                        <button
                          type="button"
                          onClick={() => handleCopy(`raw-${item.id}`, item.rawPayloadOnly!)}
                          className="px-2 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] text-zinc-400 hover:text-zinc-200 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copiar apenas o payload injetado"
                        >
                          {copiedKey === `raw-${item.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Code2 className="w-3 h-3" />
                          )}
                          <span className="hidden md:inline">Payload</span>
                        </button>
                      )}

                      {/* Send to PoC Builder */}
                      {onSendToPocBuilder && isUrl && (
                        <button
                          type="button"
                          onClick={() => onSendToPocBuilder(item.fuzzedString, '')}
                          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Enviar esta URL para o PoC Request Builder"
                        >
                          <Send className="w-3 h-3 text-amber-400" />
                          <span className="hidden md:inline">PoC</span>
                        </button>
                      )}

                      {/* Test in Browser */}
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

                  {/* Assembled Output Codebox with Highlighted Injection */}
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
              Ajuste sua busca textual ou marque mais encodings e arquivos alvo no painel acima.
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
                className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
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
                  placeholder="Ex: Custom Traversal bypass Nginx"
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Categoria:</label>
                  <select
                    value={newSeedCategory}
                    onChange={(e) => setNewSeedCategory(e.target.value as FuzzCategory)}
                    className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  >
                    {FUZZ_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Contexto Alvo:</label>
                  <input
                    type="text"
                    value={newSeedDesc}
                    onChange={(e) => setNewSeedDesc(e.target.value)}
                    placeholder="Ex: Parâmetro file de download"
                    className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Payload String:</label>
                <textarea
                  rows={2}
                  required
                  value={newSeedPayload}
                  onChange={(e) => setNewSeedPayload(e.target.value)}
                  placeholder="Ex: %2e%2e%2f%2e%2e%2fetc/passwd"
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232332]">
                <button
                  type="button"
                  onClick={() => setShowAddSeedModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-colors cursor-pointer"
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
