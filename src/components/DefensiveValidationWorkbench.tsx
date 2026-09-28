import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Code2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Sparkles, 
  Terminal, 
  Layers, 
  ArrowRight, 
  FileCode2, 
  Sliders, 
  Eye, 
  RotateCcw, 
  Lock, 
  Cpu, 
  Database, 
  CheckSquare, 
  Download,
  Info
} from 'lucide-react';
import { 
  InjectionCategory, 
  DefenseProfile, 
  DefenseStatus, 
  DefenseEvaluationItem,
  DEFENSE_BENCHMARK_SUITE,
  CODE_REMEDIATION_GUIDES,
  evaluateInputAgainstDefense
} from '../utils/defenseSimulatorEngine';

interface DefensiveValidationWorkbenchProps {
  initialInput?: string;
  onSendToPocBuilder?: (url: string, payload: string) => void;
}

export const DefensiveValidationWorkbench: React.FC<DefensiveValidationWorkbenchProps> = ({
  initialInput,
  onSendToPocBuilder
}) => {
  // Navigation Sub-tabs within the Workbench
  const [activeSubView, setActiveSubView] = useState<'matrix' | 'sandbox' | 'remediation' | 'middleware'>('matrix');

  // Filters for Defense Matrix
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected item for Detailed Inspection Modal
  const [inspectedItem, setInspectedItem] = useState<DefenseEvaluationItem | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- Real-Time Sandbox State ---
  const [sandboxInput, setSandboxInput] = useState<string>(initialInput || "' OR '1'='1' --");
  const [sandboxProfile, setSandboxProfile] = useState<DefenseProfile>('PARAMETERIZED_SQL');

  useEffect(() => {
    if (initialInput && initialInput.trim()) {
      setSandboxInput(initialInput.trim());
      // Automatically detect most relevant defense profile
      if (initialInput.includes('<') || initialInput.includes('script') || initialInput.includes('onerror')) {
        setSandboxProfile('HTML_SANITIZER');
      } else if (initialInput.includes('..') || initialInput.includes('%2e')) {
        setSandboxProfile('PATH_CANONICALIZATION');
      } else if (initialInput.includes(';') || initialInput.includes('|') || initialInput.includes('`')) {
        setSandboxProfile('SAFE_PROCESS_EXEC');
      } else {
        setSandboxProfile('PARAMETERIZED_SQL');
      }
      setActiveSubView('sandbox');
    }
  }, [initialInput]);

  // Evaluate sandbox live
  const sandboxResult = useMemo(() => {
    return evaluateInputAgainstDefense(sandboxInput, sandboxProfile);
  }, [sandboxInput, sandboxProfile]);

  // --- Remediation Lab State ---
  const [selectedRemediationCategory, setSelectedRemediationCategory] = useState<InjectionCategory>('SQLI');
  const [selectedLang, setSelectedLang] = useState<'nodejs' | 'python' | 'go' | 'java'>('nodejs');

  const activeRemediationGuide = useMemo(() => {
    return CODE_REMEDIATION_GUIDES.find(g => g.category === selectedRemediationCategory) || CODE_REMEDIATION_GUIDES[0];
  }, [selectedRemediationCategory]);

  const activeLangSnippet = useMemo(() => {
    return activeRemediationGuide.languages.find(l => l.id === selectedLang) || activeRemediationGuide.languages[0];
  }, [activeRemediationGuide, selectedLang]);

  // Filtered Benchmark Suite
  const filteredBenchmark = useMemo(() => {
    return DEFENSE_BENCHMARK_SUITE.filter(item => {
      const matchCategory = selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;
      const matchSearch = 
        item.sampleInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.appliedDefense.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cwe.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchStatus && matchSearch;
    });
  }, [selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Status Badge Colors & Labels
  const getStatusBadge = (status: DefenseStatus) => {
    switch (status) {
      case 'BLOCKED':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          label: 'INTERCEPTADO / BLOCKED',
          icon: ShieldCheck
        };
      case 'SANITIZED':
        return {
          bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
          label: 'SANITIZADO / ESCAPED',
          icon: CheckCircle2
        };
      case 'FLAGGED':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          label: 'ALERTA / FLAGGED',
          icon: AlertTriangle
        };
      case 'PASS_THROUGH':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          label: 'PASS-THROUGH',
          icon: ShieldAlert
        };
    }
  };

  const getCategoryColor = (cat: InjectionCategory) => {
    switch (cat) {
      case 'SQLI':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'XSS':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'COMMAND_INJECTION':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'PATH_TRAVERSAL':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'SSTI':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'NOSQLI':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  // Quick Preset Handlers for Sandbox
  const setPreset = (category: InjectionCategory, payload: string, profile: DefenseProfile) => {
    setSandboxInput(payload);
    setSandboxProfile(profile);
    setActiveSubView('sandbox');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121620] via-[#10131d] to-[#0c0f17] border border-[#232d42] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Defensive AppSec & Input Validation Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Simulador & Matriz de Defesa</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Bancada de Hardening & Validação de Entrada</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Avalie como controles defensivos (Prepared Statements, schemas Zod, sanitização DOMPurify, isolamento de processos e regras WAF) neutralizam injeções comuns (SQLi, XSS, Command Injection, Path Traversal, SSTI). Visualize o status de bloqueio em uma tabela codificada por cores e acesse códigos seguros de remediação.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="bg-[#151a26] border border-[#253248] rounded-xl p-3 text-center">
              <div className="text-xl font-bold font-mono text-emerald-400">100%</div>
              <div className="text-[10px] text-zinc-400 font-mono">Taxa de Neutralização</div>
            </div>
            <div className="bg-[#151a26] border border-[#253248] rounded-xl p-3 text-center">
              <div className="text-xl font-bold font-mono text-cyan-400">6 Classes</div>
              <div className="text-[10px] text-zinc-400 font-mono">Vetores Defendidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-[#22222f] pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubView('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'matrix'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-[#14141c] text-zinc-400 border border-[#23232f] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriz de Validação & Regras ({DEFENSE_BENCHMARK_SUITE.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('sandbox')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'sandbox'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-[#14141c] text-zinc-400 border border-[#23232f] hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Simulador Defensivo em Tempo Real</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('remediation')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'remediation'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-[#14141c] text-zinc-400 border border-[#23232f] hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Laboratório de Código Seguro (Multi-Linguagem)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('middleware')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'middleware'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-[#14141c] text-zinc-400 border border-[#23232f] hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Middleware & Regras WAF de Produção</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: DEFENSE MATRIX & EVALUATION TABLE */}
      {/* ========================================================================= */}
      {activeSubView === 'matrix' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por vetor, parâmetro, técnica defensiva ou regra..."
                className="w-full bg-[#171722] border border-[#262636] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[11px] font-mono text-zinc-400 font-bold shrink-0">Categoria:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[#171722] border border-[#262636] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todas as Classes ({DEFENSE_BENCHMARK_SUITE.length})</option>
                <option value="SQLI">SQL Injection</option>
                <option value="XSS">Cross-Site Scripting (XSS)</option>
                <option value="COMMAND_INJECTION">Command Injection</option>
                <option value="PATH_TRAVERSAL">Path Traversal</option>
                <option value="SSTI">Template Injection (SSTI)</option>
                <option value="NOSQLI">NoSQL Injection</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-[#171722] border border-[#262636] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos os Resultados</option>
                <option value="BLOCKED">Apenas Bloqueados</option>
                <option value="SANITIZED">Apenas Sanitizados</option>
                <option value="FLAGGED">Apenas Alertas</option>
              </select>
            </div>
          </div>

          {/* Color-Coded Table */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#161622] border-b border-[#22222f] text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Vetor & Categoria</th>
                    <th className="py-3 px-4">Entrada de Teste (Payload)</th>
                    <th className="py-3 px-4">Camada Defensiva Aplicada</th>
                    <th className="py-3 px-4">Veredito / Status</th>
                    <th className="py-3 px-4">Saída Sanitizada / Transformada</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2b] text-xs font-mono">
                  {filteredBenchmark.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                        Nenhum vetor correspondente aos filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredBenchmark.map((item) => {
                      const badge = getStatusBadge(item.status);
                      const BadgeIcon = badge.icon;
                      return (
                        <tr key={item.id} className="hover:bg-[#161624] transition-colors group">
                          {/* Vector & Category */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryColor(item.category)}`}>
                                {item.categoryName}
                              </span>
                              <div className="text-[10px] text-zinc-400 font-bold">
                                Parâmetro: <span className="text-zinc-200">?{item.targetParam}=</span>
                              </div>
                            </div>
                          </td>

                          {/* Sample Input */}
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="bg-[#0e0e14] border border-[#20202d] rounded-lg p-2 font-mono text-[11px] text-amber-300 break-all select-all flex items-center justify-between gap-1">
                              <span className="truncate">{item.sampleInput}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(`input-${item.id}`, item.sampleInput)}
                                className="text-zinc-400 hover:text-white shrink-0 p-0.5"
                                title="Copiar amostra"
                              >
                                {copiedKey === `input-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{item.description}</div>
                          </td>

                          {/* Applied Defense */}
                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="text-zinc-200 font-bold text-xs">{item.appliedDefense}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{item.cwe} • {item.owasp}</div>
                          </td>

                          {/* Verdict / Status */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              <BadgeIcon className="w-3 h-3" />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Sanitized Output */}
                          <td className="py-3 px-4 max-w-[260px]">
                            <div className="bg-[#0b0f14] border border-[#1b2633] rounded-lg p-2 text-[11px] text-emerald-300 font-mono break-all line-clamp-2">
                              {item.sanitizedOutput}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                              <span>Tokens interceptados:</span>
                              <span className="text-rose-400 font-bold">{item.offendingTokens.join(', ')}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreset(item.category, item.sampleInput, item.defenseProfile)}
                                className="px-2.5 py-1 rounded-lg bg-[#1f1f2e] hover:bg-[#29293d] text-zinc-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                                title="Testar no Simulador Interativo"
                              >
                                Testar
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectedItem(item)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-indigo-200 border border-indigo-500/40 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detalhes</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: INTERACTIVE DEFENSE SANDBOX */}
      {/* ========================================================================= */}
      {activeSubView === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Sandbox Configuration & Input */}
          <div className="lg:col-span-1 space-y-4 bg-[#121218] border border-[#22222f] rounded-2xl p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Configuração do Teste Defensivo</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Digite qualquer payload ou caractere e selecione o filtro defensivo para simular a resposta do sistema.
              </p>
            </div>

            {/* Defense Profile Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-300">Perfil de Defesa a Aplicar:</label>
              <select
                value={sandboxProfile}
                onChange={(e) => setSandboxProfile(e.target.value as DefenseProfile)}
                className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PARAMETERIZED_SQL">1. Parameterized Prepared Statement (SQL Isolation)</option>
                <option value="STRICT_ALLOWLIST">2. Schema Estrito / Whitelist (Zod / Alphanumeric)</option>
                <option value="HTML_SANITIZER">3. Codificação de Entidades HTML & DOMPurify</option>
                <option value="SAFE_PROCESS_EXEC">4. Execução de Processos Segura (execFile sem Shell)</option>
                <option value="PATH_CANONICALIZATION">5. Canonicalização de Caminhos (path.resolve + basename)</option>
                <option value="WAF_SIGNATURE_RULESET">6. Inspeção de WAF (OWASP Core Rule Set)</option>
              </select>
            </div>

            {/* Input Payload Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300">Entrada / Valor do Parâmetro:</label>
                <button
                  type="button"
                  onClick={() => setSandboxInput('')}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Limpar
                </button>
              </div>
              <textarea
                rows={4}
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                placeholder="Exemplo: ' OR 1=1 -- ou <script>alert(1)</script>"
                className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl p-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-2 pt-2 border-t border-[#1e1e29]">
              <span className="text-[11px] font-mono text-zinc-400 font-bold block">Amostras Rápidas:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'SQLi Tautology', val: "' OR '1'='1", prof: 'PARAMETERIZED_SQL' as DefenseProfile },
                  { label: 'XSS Script Tag', val: '<script>alert(document.domain)</script>', prof: 'HTML_SANITIZER' as DefenseProfile },
                  { label: 'XSS Event Handler', val: '<img src=x onerror=alert(1)>', prof: 'HTML_SANITIZER' as DefenseProfile },
                  { label: 'Command Chaining', val: '127.0.0.1; whoami', prof: 'SAFE_PROCESS_EXEC' as DefenseProfile },
                  { label: 'Path Traversal', val: '../../../../etc/passwd', prof: 'PATH_CANONICALIZATION' as DefenseProfile },
                  { label: 'Schema Bypass', val: 'admin!@#$%^', prof: 'STRICT_ALLOWLIST' as DefenseProfile }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSandboxInput(preset.val);
                      setSandboxProfile(preset.prof);
                    }}
                    className="px-2 py-1 rounded bg-[#1c1c28] hover:bg-[#252538] text-[10px] font-mono text-zinc-300 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Live Evaluation Verdict */}
          <div className="lg:col-span-2 space-y-4 bg-[#121218] border border-[#22222f] rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-[#1e1e29] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Veredito do Mecanismo Defensivo</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">{sandboxResult.profileName}</span>
            </div>

            {/* Verdict Card */}
            {(() => {
              const badge = getStatusBadge(sandboxResult.status);
              const BadgeIcon = badge.icon;
              return (
                <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${badge.bg}`}>
                  <div className="p-2 rounded-lg bg-black/20 shrink-0">
                    <BadgeIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black uppercase tracking-wider">{badge.label}</span>
                      <span className="text-xs opacity-75">•</span>
                      <span className="text-xs font-mono">{sandboxResult.isSafeToProcess ? 'Execução Segura' : 'Requisição Interrompida'}</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {sandboxResult.reasons.join(' ')}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Offending Tokens Highlight */}
            {sandboxResult.detectedTokens.length > 0 && (
              <div className="bg-[#171722] border border-[#28283a] rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tokens de Risco Identificados pelo Filtro:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sandboxResult.detectedTokens.map((token, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sanitized / Transformed Representation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-400">Saída Gerada para a Aplicação:</span>
                <button
                  type="button"
                  onClick={() => handleCopy('sandbox-output', sandboxResult.sanitizedOutput)}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'sandbox-output' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Saída</span>
                </button>
              </div>
              <pre className="bg-[#0b0e14] border border-[#1f2736] rounded-xl p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                {sandboxResult.sanitizedOutput}
              </pre>
            </div>

            {/* Recommended Fix Snippet */}
            <div className="bg-[#161622] border border-[#232333] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Padrão de Código Recomendado ({sandboxResult.recommendedFix.language})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('fix-snippet', sandboxResult.recommendedFix.secureSnippet)}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'fix-snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Fix</span>
                </button>
              </div>
              <pre className="bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg p-3 text-[11px] font-mono text-zinc-200 overflow-x-auto">
                {sandboxResult.recommendedFix.secureSnippet}
              </pre>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                {sandboxResult.recommendedFix.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: SECURE CODE REMEDIATION LAB (MULTI-LANG) */}
      {/* ========================================================================= */}
      {activeSubView === 'remediation' && (
        <div className="space-y-6">
          {/* Category Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CODE_REMEDIATION_GUIDES.map(guide => (
              <button
                key={guide.category}
                type="button"
                onClick={() => setSelectedRemediationCategory(guide.category)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  selectedRemediationCategory === guide.category
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#14141c] text-zinc-400 border border-[#23232f] hover:text-white'
                }`}
              >
                <span>{guide.title.split(' ')[0]} {guide.title.split(' ')[1]}</span>
              </button>
            ))}
          </div>

          {/* Guide Header Info */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e1e29] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{activeRemediationGuide.title}</h3>
                <div className="text-xs font-mono text-zinc-400 mt-0.5">
                  {activeRemediationGuide.cwe} • {activeRemediationGuide.owasp}
                </div>
              </div>

              {/* Language Pills */}
              <div className="flex items-center gap-1.5 bg-[#171722] p-1 rounded-xl border border-[#262636]">
                {(['nodejs', 'python', 'go', 'java'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedLang === lang ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lang === 'nodejs' ? 'Node.js' : lang === 'python' ? 'Python' : lang === 'go' ? 'Go' : 'Java'}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              {activeRemediationGuide.description}
            </p>

            <div className="flex items-center gap-2 pt-1 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Técnica aplicada: {activeLangSnippet.defenseTechnique}</span>
            </div>
          </div>

          {/* Side-by-Side Insecure vs Secure Code Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Insecure Anti-Pattern */}
            <div className="bg-[#121218] border border-rose-900/40 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#25171e] pb-2">
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>❌ Anti-Padrão Vulnerável (Inseguro)</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{activeLangSnippet.name}</span>
                </div>
                <pre className="bg-[#0e0a0d] border border-rose-950/60 rounded-xl p-3.5 text-xs font-mono text-rose-300 mt-2.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {activeLangSnippet.vulnerableCode}
                </pre>
              </div>
              <div className="text-[11px] text-zinc-400 pt-2 border-t border-[#1e1e28]">
                A interpolação direta permite que a entrada do atacante altere a sintaxe da linguagem.
              </div>
            </div>

            {/* Secure Hardened Pattern */}
            <div className="bg-[#121218] border border-emerald-900/40 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#14281e] pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>✅ Implementação Segura (Hardened)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('secure-code', activeLangSnippet.secureCode)}
                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'secure-code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar Código</span>
                  </button>
                </div>
                <pre className="bg-[#080f0c] border border-emerald-950/60 rounded-xl p-3.5 text-xs font-mono text-emerald-300 mt-2.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {activeLangSnippet.secureCode}
                </pre>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#1e1e28] text-[11px] font-mono text-zinc-400">
                <span>Dependências recomendadas:</span>
                <span className="text-zinc-200">{activeLangSnippet.keyDependencies.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: PRODUCTION MIDDLEWARE & WAF RULES */}
      {/* ========================================================================= */}
      {activeSubView === 'middleware' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Middleware Defensivo em Node.js / Express</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Padrão recomendado para interceptação prévia de entradas maliciosas e headers HTTP em camadas DevSecOps.
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopy('express-middleware', `import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// 1. HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// 2. Strict Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// 3. Schema Validation Middleware Helper
export const validateQuery = (schema: z.ZodSchema) => (req, res, next) => {
  try {
    req.validatedQuery = schema.parse(req.query);
    next();
  } catch (err) {
    res.status(400).json({ error: 'Validation failed', issues: err.issues });
  }
};`)}
                className="absolute right-3 top-3 px-2.5 py-1 rounded bg-[#1e1e2d] hover:bg-[#28283c] text-xs font-mono text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedKey === 'express-middleware' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Middleware</span>
              </button>
              <pre className="bg-[#090b10] border border-[#1b2230] rounded-xl p-4 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// 1. HTTP Security Headers (Proteção XSS, Clickjacking e MIME Sniffing)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// 2. Strict Rate Limiting (Mitigação de Bruteforce e Fuzzing Automatizado)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// 3. Schema Validation Middleware Helper (Validação Estrita Zod)
export const validateQuery = (schema: z.ZodSchema) => (req, res, next) => {
  try {
    req.validatedQuery = schema.parse(req.query);
    next();
  } catch (err) {
    res.status(400).json({ error: 'Validation failed', issues: err.issues });
  }
};`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED INSPECTION MODAL */}
      {/* ========================================================================= */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-[#2b2b3d] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#22222f] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getCategoryColor(inspectedItem.category)}`}>
                    {inspectedItem.categoryName}
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-xs font-mono text-zinc-400">{inspectedItem.cwe}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{inspectedItem.description}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1a24] text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-400 font-bold block mb-1">Entrada de Teste Avaliada:</span>
                <div className="bg-[#0b0b10] border border-[#1f1f2d] rounded-xl p-3 text-amber-300 break-all select-all">
                  {inspectedItem.sampleInput}
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-bold block mb-1">Camada Defensiva & Explicação Técnica:</span>
                <div className="bg-[#161622] border border-[#262638] rounded-xl p-3 text-zinc-200 font-sans leading-relaxed">
                  {inspectedItem.explanation}
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-bold block mb-1">Resultado / Saída Transformada:</span>
                <div className="bg-[#090f14] border border-[#192b3a] rounded-xl p-3 text-emerald-300 break-all">
                  {inspectedItem.sanitizedOutput}
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-bold block mb-1">Remediação Segura Recomendada:</span>
                <div className="bg-[#121a1f] border border-[#1b3438] rounded-xl p-3 text-cyan-300">
                  {inspectedItem.remediationSummary}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#22222f] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPreset(inspectedItem.category, inspectedItem.sampleInput, inspectedItem.defenseProfile);
                  setInspectedItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Abrir no Simulador Interativo
              </button>

              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="px-4 py-2 rounded-xl bg-[#1c1c28] hover:bg-[#252538] text-zinc-300 font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
