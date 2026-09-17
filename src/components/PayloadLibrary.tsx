import React, { useState, useMemo, useEffect } from 'react';
import {
  Code,
  Database,
  Globe,
  Terminal,
  Cpu,
  FileCode,
  ShieldAlert,
  Folder,
  ExternalLink,
  Share2,
  Layers,
  Copy,
  Check,
  Search,
  Plus,
  Star,
  Trash2,
  Edit2,
  X,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Sliders,
  Eye,
  KeyRound,
  Zap,
  Tag,
  HelpCircle,
  Hash,
  TerminalSquare
} from 'lucide-react';
import { ExploitPayload, PayloadVulnerabilityCategory } from '../types';
import { DEFAULT_EXPLOIT_PAYLOADS, PAYLOAD_CATEGORIES } from '../data/defaultPayloads';

const STORAGE_KEY_CUSTOM_PAYLOADS = 'bb_researcher_custom_payloads';
const STORAGE_KEY_FAVORITES = 'bb_researcher_favorite_payloads';
const STORAGE_KEY_VARIABLES = 'bb_researcher_payload_variables';

interface PayloadVariables {
  collaborator: string;
  target: string;
  attackerIp: string;
}

const DEFAULT_VARIABLES: PayloadVariables = {
  collaborator: 'bxss.interactsh.com',
  target: 'target.com',
  attackerIp: '10.10.14.5'
};

export interface PayloadLibraryProps {
  onInsertPayloadIntoDoc?: (payload: ExploitPayload) => void;
}

export const PayloadLibrary: React.FC<PayloadLibraryProps> = ({
  onInsertPayloadIntoDoc
}) => {
  // --- Persistent States ---
  const [customPayloads, setCustomPayloads] = useState<ExploitPayload[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_PAYLOADS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (saved) return JSON.parse(saved);
      // Default favorites from initial dataset
      return DEFAULT_EXPLOIT_PAYLOADS.filter((p) => p.isFavorite).map((p) => p.id);
    } catch {
      return DEFAULT_EXPLOIT_PAYLOADS.filter((p) => p.isFavorite).map((p) => p.id);
    }
  });

  const [variables, setVariables] = useState<PayloadVariables>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VARIABLES);
      return saved ? JSON.parse(saved) : DEFAULT_VARIABLES;
    } catch {
      return DEFAULT_VARIABLES;
    }
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PAYLOADS, JSON.stringify(customPayloads));
    } catch (err) {
      console.error('Failed to persist custom payloads', err);
    }
  }, [customPayloads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favoriteIds));
    } catch (err) {
      console.error('Failed to persist favorite payloads', err);
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VARIABLES, JSON.stringify(variables));
    } catch (err) {
      console.error('Failed to persist payload variables', err);
    }
  }, [variables]);

  // Combine default and custom payloads
  const allPayloads = useMemo(() => {
    return [...customPayloads, ...DEFAULT_EXPLOIT_PAYLOADS];
  }, [customPayloads]);

  // --- Filtering States ---
  const [selectedCategory, setSelectedCategory] = useState<PayloadVulnerabilityCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FAVORITES' | 'CUSTOM'>('ALL');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // --- UI States ---
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showVariableBar, setShowVariableBar] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPayload, setEditingPayload] = useState<ExploitPayload | null>(null);
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);
  const [encodingFormat, setEncodingFormat] = useState<Record<string, 'raw' | 'url' | 'base64' | 'hex' | 'html'>>({});

  // Form states for Create/Edit Modal
  const [formData, setFormData] = useState({
    title: '',
    category: 'XSS' as PayloadVulnerabilityCategory,
    payload: '',
    description: '',
    context: '',
    tags: '',
    notes: ''
  });

  // Variable replacement helper
  const interpolatePayload = (raw: string): string => {
    let result = raw;
    result = result.replace(/\{\{COLLABORATOR\}\}/g, variables.collaborator || 'interactsh.com');
    result = result.replace(/\{\{TARGET\}\}/g, variables.target || 'target.com');
    result = result.replace(/\{\{ATTACKER_IP\}\}/g, variables.attackerIp || '10.10.14.5');
    result = result.replace(/\{\{TIMESTAMP\}\}/g, Date.now().toString());
    return result;
  };

  // Encoders helper
  const getEncodedValue = (text: string, format: 'raw' | 'url' | 'base64' | 'hex' | 'html'): string => {
    switch (format) {
      case 'url':
        return encodeURIComponent(text);
      case 'base64':
        try {
          return btoa(unescape(encodeURIComponent(text)));
        } catch {
          return btoa(text);
        }
      case 'hex':
        return Array.from(text)
          .map((c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
      case 'html':
        return text.replace(/[&<>"']/g, (m) => {
          const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return map[m] || m;
        });
      default:
        return text;
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Copy handler with variable interpolation and active encoding
  const handleCopy = (id: string, rawPayload: string, format: 'raw' | 'url' | 'base64' | 'hex' | 'html' = 'raw') => {
    const interpolated = interpolatePayload(rawPayload);
    const finalContent = getEncodedValue(interpolated, format);

    navigator.clipboard.writeText(finalContent);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Delete custom payload
  const handleDeleteCustomPayload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza de que deseja remover este payload customizado?')) {
      setCustomPayloads((prev) => prev.filter((p) => p.id !== id));
      setFavoriteIds((prev) => prev.filter((fId) => fId !== id));
      if (expandedPayloadId === id) setExpandedPayloadId(null);
    }
  };

  // Start edit
  const handleOpenEdit = (p: ExploitPayload, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPayload(p);
    setFormData({
      title: p.title,
      category: p.category,
      payload: p.payload,
      description: p.description,
      context: p.context || '',
      tags: p.tags.join(', '),
      notes: p.notes || ''
    });
    setShowCreateModal(true);
  };

  // Open create
  const handleOpenCreate = () => {
    setEditingPayload(null);
    setFormData({
      title: '',
      category: selectedCategory === 'ALL' ? 'XSS' : selectedCategory,
      payload: '',
      description: '',
      context: 'Generic Parameter',
      tags: 'quick-test, custom',
      notes: ''
    });
    setShowCreateModal(true);
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.payload.trim()) return;

    const tagsArray = formData.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (editingPayload) {
      // Update existing custom payload
      setCustomPayloads((prev) =>
        prev.map((p) =>
          p.id === editingPayload.id
            ? {
                ...p,
                title: formData.title.trim(),
                category: formData.category,
                payload: formData.payload,
                description: formData.description.trim(),
                context: formData.context.trim() || undefined,
                tags: tagsArray,
                notes: formData.notes.trim() || undefined,
                updatedAt: new Date().toISOString().split('T')[0]
              }
            : p
        )
      );
    } else {
      // Create new custom payload
      const newPayload: ExploitPayload = {
        id: `payload-custom-${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        payload: formData.payload,
        description: formData.description.trim() || 'Payload customizado criado pelo pesquisador.',
        context: formData.context.trim() || 'Custom Context',
        tags: tagsArray.length > 0 ? tagsArray : ['custom'],
        isFavorite: true,
        isCustom: true,
        notes: formData.notes.trim() || undefined,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setCustomPayloads((prev) => [newPayload, ...prev]);
      setFavoriteIds((prev) => [...prev, newPayload.id]);
    }

    setShowCreateModal(false);
    setEditingPayload(null);
  };

  // Export payloads as JSON
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allPayloads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `payload-library-export-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const formatted: ExploitPayload[] = imported.map((item, idx) => ({
            id: item.id || `payload-imported-${Date.now()}-${idx}`,
            title: item.title || 'Payload Importado',
            category: item.category || 'Other',
            payload: item.payload || '',
            description: item.description || '',
            context: item.context,
            tags: Array.isArray(item.tags) ? item.tags : ['imported'],
            isFavorite: Boolean(item.isFavorite),
            isCustom: true,
            notes: item.notes,
            createdAt: item.createdAt || new Date().toISOString().split('T')[0]
          }));

          setCustomPayloads((prev) => [...formatted, ...prev]);
          alert(`${formatted.length} payloads importados com sucesso!`);
        }
      } catch {
        alert('Erro ao importar arquivo JSON de payloads.');
      }
    };
    reader.readAsText(file);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allPayloads.length };
    PAYLOAD_CATEGORIES.forEach((cat) => {
      counts[cat.category] = 0;
    });
    allPayloads.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [allPayloads]);

  // Tag list
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allPayloads.forEach((p) => {
      p.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [allPayloads]);

  // Filtered payloads
  const filteredPayloads = useMemo(() => {
    return allPayloads.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Type filter
      if (filterType === 'FAVORITES' && !favoriteIds.includes(p.id)) {
        return false;
      }
      if (filterType === 'CUSTOM' && !p.isCustom) {
        return false;
      }

      // Tag filter
      if (activeTag && !p.tags.includes(activeTag)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchPayload = p.payload.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        const matchContext = p.context?.toLowerCase().includes(q);
        const matchNotes = p.notes?.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));

        if (
          !matchTitle &&
          !matchPayload &&
          !matchDesc &&
          !matchCategory &&
          !matchContext &&
          !matchNotes &&
          !matchTags
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allPayloads, selectedCategory, filterType, activeTag, searchQuery, favoriteIds]);

  // Helper icon selector
  const renderCategoryIcon = (category: PayloadVulnerabilityCategory, className = 'w-4 h-4') => {
    switch (category) {
      case 'XSS':
        return <Code className={className} />;
      case 'SQLi':
        return <Database className={className} />;
      case 'SSRF':
        return <Globe className={className} />;
      case 'RCE':
        return <Terminal className={className} />;
      case 'SSTI':
        return <Cpu className={className} />;
      case 'XXE':
        return <FileCode className={className} />;
      case 'IDOR':
        return <ShieldAlert className={className} />;
      case 'LFI':
        return <Folder className={className} />;
      case 'Open Redirect':
        return <ExternalLink className={className} />;
      case 'CORS / CSRF':
        return <Share2 className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  const getCategoryBadgeClass = (category: PayloadVulnerabilityCategory) => {
    const found = PAYLOAD_CATEGORIES.find((c) => c.category === category);
    return found ? found.badgeColor : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  };

  return (
    <div id="payload-library-root" className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e1017] border border-[#1e2338] shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400">
              <TerminalSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Biblioteca de Payloads & Exploits</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#171d2e] text-emerald-300 border border-emerald-500/30">
                  {allPayloads.length} Vetores
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Organize, personalize e injete vetores de teste (XSS, SQLi, SSRF, RCE, SSTI) com substituição dinâmica de variáveis e codificadores rápidos.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="payload-vars-toggle-btn"
            type="button"
            onClick={() => setShowVariableBar((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showVariableBar
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-[#121522] border-[#22283e] text-zinc-300 hover:text-white hover:bg-[#171b2b]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Variáveis de Alvo</span>
          </button>

          <label
            htmlFor="payload-import-input"
            className="px-3 py-2 rounded-xl bg-[#121522] border border-[#22283e] text-zinc-300 hover:text-white hover:bg-[#171b2b] font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Importar</span>
            <input
              id="payload-import-input"
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            id="payload-export-btn"
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-[#121522] border border-[#22283e] text-zinc-300 hover:text-white hover:bg-[#171b2b] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Exportar</span>
          </button>

          <button
            id="payload-create-new-btn"
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold tracking-wide flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Payload</span>
          </button>
        </div>
      </div>

      {/* Target & Collaborator Variables Bar */}
      {showVariableBar && (
        <div className="p-4 rounded-2xl bg-[#0b0f19] border border-cyan-500/30 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1b253b]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">
                Variáveis Dinâmicas de Substituição (Live Interpolation)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setVariables(DEFAULT_VARIABLES)}
              className="text-[10px] font-mono text-zinc-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resetar Padrões</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                Servidor OOB / Collaborator ({'{{COLLABORATOR}}'})
              </label>
              <input
                type="text"
                value={variables.collaborator}
                onChange={(e) => setVariables({ ...variables, collaborator: e.target.value })}
                placeholder="ex: oastify.com ou interactsh.com"
                className="w-full bg-[#121828] border border-[#22304d] rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                Alvo em Teste ({'{{TARGET}}'})
              </label>
              <input
                type="text"
                value={variables.target}
                onChange={(e) => setVariables({ ...variables, target: e.target.value })}
                placeholder="ex: app.target.com"
                className="w-full bg-[#121828] border border-[#22304d] rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                IP do Pesquisador ({'{{ATTACKER_IP}}'})
              </label>
              <input
                type="text"
                value={variables.attackerIp}
                onChange={(e) => setVariables({ ...variables, attackerIp: e.target.value })}
                placeholder="ex: 10.10.14.5"
                className="w-full bg-[#121828] border border-[#22304d] rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mt-2">
            * Ao clicar em "Copiar", os marcadores correspondentes nos payloads serão automaticamente substituídos por estes valores.
          </p>
        </div>
      )}

      {/* Categories Horizontal Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          id="payload-cat-all-btn"
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setActiveTag(null);
          }}
          className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shrink-0 transition-all border ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-[#0e1017] border-[#1e2338] text-zinc-400 hover:text-zinc-200 hover:bg-[#131622]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos</span>
          <span className="text-[10px] opacity-70">({categoryCounts.ALL || 0})</span>
        </button>

        {PAYLOAD_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          const count = categoryCounts[cat.category] || 0;
          return (
            <button
              key={cat.category}
              id={`payload-cat-${cat.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}-btn`}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.category);
                setActiveTag(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shrink-0 transition-all border ${
                isSelected
                  ? `${cat.badgeColor} shadow-sm ring-1 ring-white/10`
                  : 'bg-[#0e1017] border-[#1e2338] text-zinc-400 hover:text-zinc-200 hover:bg-[#131622]'
              }`}
            >
              {renderCategoryIcon(cat.category, 'w-3.5 h-3.5')}
              <span>{cat.category}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0c0e17] border border-[#1e2338] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Quick Filter Type: All, Starred, Custom */}
        <div className="flex items-center gap-1.5 bg-[#121522] p-1 rounded-xl border border-[#20273d] text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterType === 'ALL'
                ? 'bg-[#1e243a] text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({allPayloads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('FAVORITES')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
              filterType === 'FAVORITES'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>Favoritos ({favoriteIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('CUSTOM')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
              filterType === 'CUSTOM'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Meus Payloads ({customPayloads.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título, payload, tag ou contexto..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#121522] border border-[#22283e] text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeTag && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">Filtrando pela tag:</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <Tag className="w-3 h-3" />
            <span>#{activeTag}</span>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="hover:text-white ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Payloads Grid List */}
      {filteredPayloads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPayloads.map((item) => {
            const isFav = favoriteIds.includes(item.id);
            const isExpanded = expandedPayloadId === item.id;
            const currentEncoding = encodingFormat[item.id] || 'raw';
            const interpolated = interpolatePayload(item.payload);
            const displayedCode = getEncodedValue(interpolated, currentEncoding);

            return (
              <div
                key={item.id}
                id={`payload-card-${item.id}`}
                className="bg-[#0e1017] border border-[#1e2338] hover:border-[#2a324d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-md group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {renderCategoryIcon(item.category, 'w-3 h-3')}
                        <span>{item.category}</span>
                      </span>

                      {item.isCustom && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                          Custom
                        </span>
                      )}

                      {item.context && (
                        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">
                          [{item.context}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isFav
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#161a29]'
                        }`}
                        title={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>

                      {item.isCustom && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(item, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#161a29] transition-colors"
                            title="Editar Payload"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPayload(item.id, e)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                            title="Excluir Payload"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-zinc-100 mb-1 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Encoders Toolbar */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Formato de Cópia:
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      {(['raw', 'url', 'base64', 'hex'] as const).map((enc) => (
                        <button
                          key={enc}
                          type="button"
                          onClick={() =>
                            setEncodingFormat((prev) => ({
                              ...prev,
                              [item.id]: enc
                            }))
                          }
                          className={`px-1.5 py-0.5 rounded uppercase font-semibold transition-colors ${
                            currentEncoding === enc
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {enc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payload Code Block with 1-click copy */}
                  <div className="relative rounded-xl bg-[#06080e] border border-[#1b2238] p-3 text-xs font-mono text-emerald-400 overflow-x-auto group/code">
                    <pre className="whitespace-pre-wrap break-all leading-relaxed select-all">
                      {displayedCode}
                    </pre>

                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.payload, currentEncoding)}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1e2438] border border-[#2a334d] text-zinc-200 text-xs font-mono flex items-center gap-1 shadow transition-all active:scale-95"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-zinc-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Notes / Tips (expandable) */}
                  {item.notes && (
                    <div className="mt-2 text-[11px] text-zinc-400 bg-[#121522] border border-[#1d2338] p-2.5 rounded-lg flex items-start gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{item.notes}</span>
                    </div>
                  )}
                </div>

                {/* Footer Tags & Optional Insert */}
                <div className="mt-3 pt-2.5 border-t border-[#171c2c] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors ${
                          activeTag === tag
                            ? 'bg-emerald-500/30 text-emerald-300 font-bold'
                            : 'bg-[#141824] text-zinc-400 hover:text-zinc-200 hover:bg-[#1a2030]'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  {onInsertPayloadIntoDoc && (
                    <button
                      type="button"
                      onClick={() => onInsertPayloadIntoDoc(item)}
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors ml-auto"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Inserir em Documento</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#0e1017] border border-[#1e2338] text-center flex flex-col items-center justify-center text-zinc-500 font-mono text-xs">
          <TerminalSquare className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-300 font-bold mb-1">Nenhum payload encontrado para estes filtros.</p>
          <p className="text-zinc-500 mb-4">
            Ajuste os termos de busca ou clique no botão abaixo para registrar um novo vetor de teste.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Payload</span>
          </button>
        </div>
      )}

      {/* Modal for Creating or Editing Custom Payload */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1017] border border-[#1e2338] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Terminal className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white font-mono uppercase tracking-wide">
                  {editingPayload ? 'Editar Payload Customizado' : 'Novo Payload Customizado'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#161a29]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                  Título do Payload *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: SVG onload com Cookie alert ou Blind OOB Trigger"
                  className="w-full bg-[#121522] border border-[#22283e] rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                    Categoria de Vulnerabilidade *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as PayloadVulnerabilityCategory
                      })
                    }
                    className="w-full bg-[#121522] border border-[#22283e] rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none font-mono"
                  >
                    {PAYLOAD_CATEGORIES.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                    Contexto de Injeção
                  </label>
                  <input
                    type="text"
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    placeholder="ex: HTML Attribute, JSON parameter, SOAP Body"
                    className="w-full bg-[#121522] border border-[#22283e] rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                  Código do Payload (Raw Exploit) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.payload}
                  onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                  placeholder="<svg onload=alert(document.domain)> ou ' OR 1=1 -- - (suporta {{COLLABORATOR}}, {{TARGET}}, {{ATTACKER_IP}})"
                  className="w-full bg-[#07090e] border border-[#22283e] rounded-xl p-3 text-emerald-400 font-mono text-xs focus:border-emerald-500 focus:outline-none leading-relaxed"
                />
                <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                  Dica: Utilize tags como <code>{'{{COLLABORATOR}}'}</code> ou <code>{'{{TARGET}}'}</code> para substituição dinâmica em tempo de execução.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                  Descrição / Objetivo do Teste
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explique o mecanismo da técnica, comportamento esperado e impacto..."
                  className="w-full bg-[#121522] border border-[#22283e] rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="waf-bypass, oob, polyglot, critical"
                  className="w-full bg-[#121522] border border-[#22283e] rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block mb-1">
                  Notas de Validação / Dicas
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ex: Funciona em versões Linux >= 5.x ou requer header Content-Type: application/json"
                  className="w-full bg-[#121522] border border-[#22283e] rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2338]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#141824] hover:bg-[#1d2235] text-zinc-300 font-mono text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-sm"
                >
                  {editingPayload ? 'Salvar Alterações' : 'Salvar Payload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
