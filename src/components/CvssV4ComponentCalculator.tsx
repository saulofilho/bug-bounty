import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Sliders,
  Sparkles,
  Info,
  Terminal,
  FileCode2,
  Share2,
  RotateCcw,
  Zap,
  Tag,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Cpu
} from 'lucide-react';
import {
  SupplyChainComponentInput,
  SupplyChainExploitabilityResult,
  DependencyTier,
  CallPathReachability,
  DeploymentRequirement,
  DEFAULT_SUPPLY_CHAIN_INPUT,
  SUPPLY_CHAIN_PRESETS,
  calculateSupplyChainExploitability,
  VexStatus
} from '../utils/supplyChainExploitability';
import { CvssV4Metrics } from '../utils/cvssV4';

interface CvssV4ComponentCalculatorProps {
  onApplyToCvssV4?: (metrics: Pick<CvssV4Metrics, 'av' | 'ac' | 'at' | 'pr' | 'ui'>) => void;
  onBackToStandardCalculator?: () => void;
  reportId?: string;
  reportTitle?: string;
}

export const CvssV4ComponentCalculator: React.FC<CvssV4ComponentCalculatorProps> = ({
  onApplyToCvssV4,
  onBackToStandardCalculator,
  reportId,
  reportTitle
}) => {
  const [input, setInput] = useState<SupplyChainComponentInput>({
    ...DEFAULT_SUPPLY_CHAIN_INPUT,
    componentName: reportTitle ? reportTitle.split(' ')[0] : DEFAULT_SUPPLY_CHAIN_INPUT.componentName
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const result: SupplyChainExploitabilityResult = useMemo(() => {
    return calculateSupplyChainExploitability(input);
  }, [input]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = SUPPLY_CHAIN_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setInput({ ...preset.config });
    }
  };

  // Generate Markdown VEX statement
  const vexStatementMarkdown = useMemo(() => {
    return `### Avaliação de Explorabilidade de Componente (CVSS v4.0 / VEX)
- **Componente**: \`${input.componentName}@${input.componentVersion}\` (${input.ecosystem})
- **CVE Relacionada**: \`${input.cveId}\` (Score NVD Base: ${input.upstreamCvssScore || 'N/A'})
- **Camada de Dependência**: ${input.dependencyTier}
- **Alcançabilidade de Código**: ${input.callPathReachability}
- **Requisitos de Deployment (AT)**: ${input.deploymentRequirement === 'default_config' ? 'AT:N (Padrão)' : 'AT:P (Presente/Específico)'}
- **Sub-score de Explorabilidade Calculado**: **${result.exploitabilityScore.toFixed(1)} / 10.0** (${result.exploitabilityRating})
- **Status VEX (CISA)**: \`${result.vexStatus}\`
- **Métricas CVSS v4 Recomendadas**: \`AV:${result.recommendedMetrics.av} / AC:${result.recommendedMetrics.ac} / AT:${result.recommendedMetrics.at} / PR:${result.recommendedMetrics.pr} / UI:${result.recommendedMetrics.ui}\`

#### Justificativa Técnica:
${result.vexJustification}
${result.analysisSummary}`;
  }, [input, result]);

  return (
    <div id="cvss-v4-component-calculator" className="space-y-6">
      {/* Top Context Header Card */}
      <div className="bg-gradient-to-r from-[#141824] via-[#101420] to-[#0c0f18] border border-[#232b45] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span>CVSS v4.0 Software Supply Chain</span>
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Exploitability Sub-Score Estimator</span>
              <span className="text-zinc-600 text-xs">•</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                CISA VEX Compatible
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Calculador de Componentes & Dependências CVSS v4.0</span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Avalie o sub-score real de <strong>explorabilidade (AV, AC, AT, PR, UI)</strong> para vulnerabilidades em bibliotecas de terceiros (SCA), considerando <strong>camada da dependência</strong>, <strong>alcançabilidade de call-graph</strong> e <strong>requisitos de deployment (AT:P)</strong> para evitar alarmes falsos de notas 9.8 teóricas.
            </p>
          </div>

          {onBackToStandardCalculator && (
            <button
              type="button"
              onClick={onBackToStandardCalculator}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer self-start md:self-auto"
            >
              <span>← Voltar ao CVSS v4.0 Completo</span>
            </button>
          )}
        </div>

        {/* 1-Click Supply Chain Presets */}
        <div className="mt-5 pt-4 border-t border-[#1e253c] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Cenários Típicos de Supply Chain (Carregamento Rápido):</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">6 Arquétipos Prontos</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {SUPPLY_CHAIN_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className="p-2 rounded-xl bg-[#151928] hover:bg-[#1c2338] border border-[#26304d] hover:border-indigo-500/50 text-left transition-all group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-zinc-200 group-hover:text-indigo-300 truncate">
                  {preset.title.split('/')[0]}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                  {preset.config.componentName} • {preset.config.cveId}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form & Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Sub-score Parameters (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Component Metadata Section */}
          <div className="bg-[#12141e] border border-[#21273d] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1c2235] pb-2.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <span>1. Identificação do Componente de Software</span>
              </h3>
              <button
                type="button"
                onClick={() => setInput({ ...DEFAULT_SUPPLY_CHAIN_INPUT })}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Redefinir</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Nome do Pacote / Artefato:</label>
                <input
                  type="text"
                  value={input.componentName}
                  onChange={e => setInput(prev => ({ ...prev, componentName: e.target.value }))}
                  placeholder="ex: lodash, log4j-core"
                  className="w-full bg-[#171b29] border border-[#29324e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Versão Afetada:</label>
                <input
                  type="text"
                  value={input.componentVersion}
                  onChange={e => setInput(prev => ({ ...prev, componentVersion: e.target.value }))}
                  placeholder="ex: 4.17.15"
                  className="w-full bg-[#171b29] border border-[#29324e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Ecossistema / Gerenciador:</label>
                <select
                  value={input.ecosystem}
                  onChange={e => setInput(prev => ({ ...prev, ecosystem: e.target.value as any }))}
                  className="w-full bg-[#171b29] border border-[#29324e] rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value="npm">npm (Node.js)</option>
                  <option value="pypi">PyPI (Python)</option>
                  <option value="maven">Maven (Java)</option>
                  <option value="golang">Go Modules</option>
                  <option value="crates">Crates.io (Rust)</option>
                  <option value="nuget">NuGet (.NET)</option>
                  <option value="docker">Docker / OCI Image</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">CVE / NVD Score Original:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={input.cveId}
                    onChange={e => setInput(prev => ({ ...prev, cveId: e.target.value }))}
                    placeholder="CVE-2023-XXXX"
                    className="flex-1 bg-[#171b29] border border-[#29324e] rounded-lg px-2 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={input.upstreamCvssScore || 9.8}
                    onChange={e => setInput(prev => ({ ...prev, upstreamCvssScore: parseFloat(e.target.value) || 0 }))}
                    title="Score NVD Base original"
                    className="w-14 bg-[#171b29] border border-[#29324e] rounded-lg px-1.5 py-1.5 text-amber-400 font-bold text-center font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dependency Tier & Architectural Position */}
          <div className="bg-[#12141e] border border-[#21273d] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-blue-400" />
                <span>2. Camada da Dependência (Dependency Tier)</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Onde o pacote está posicionado no projeto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'direct_runtime',
                  label: 'Direta em Runtime',
                  tag: 'Top-Level (100% peso)',
                  desc: 'Declarada no manifest principal; importada diretamente pelos endpoints da aplicação.'
                },
                {
                  id: 'transitive_runtime',
                  label: 'Transitiva em Runtime',
                  tag: 'Nested (75% peso)',
                  desc: 'Dependência de dependência; carregada em tempo de execução de forma indireta.'
                },
                {
                  id: 'optional_plugin',
                  label: 'Módulo Opcional / Flagged',
                  tag: 'Feature Flag (50% peso)',
                  desc: 'Módulo de terceiros que só é ativado se parâmetros ou plugins opcionais forem habilitados.'
                },
                {
                  id: 'isolated_sidecar',
                  label: 'Worker / Sidecar Isolado',
                  tag: 'Sandboxed (40% peso)',
                  desc: 'Executa em container ou processo secundário isolado, sem acesso ao banco principal.'
                },
                {
                  id: 'build_ci',
                  label: 'Build-Time / DevDependency',
                  tag: 'CI/CD Only (15% peso)',
                  desc: 'Utilizado apenas na compilação, testes ou linters locais; não faz parte do bundle final.'
                }
              ].map(tier => {
                const isSelected = input.dependencyTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setInput(prev => ({ ...prev, dependencyTier: tier.id as DependencyTier }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/30'
                        : 'bg-[#161a26] border-[#252c42] hover:border-zinc-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold font-mono ${isSelected ? 'text-blue-300' : 'text-zinc-200'}`}>
                          {tier.label}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${isSelected ? 'bg-blue-900/60 text-blue-200' : 'bg-zinc-800 text-zinc-400'}`}>
                          {tier.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed font-sans">
                        {tier.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Call-Path & Symbol Reachability Analysis (SCA) */}
          <div className="bg-[#12141e] border border-[#21273d] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>3. Alcançabilidade de Código & Fluxo de Chamada (SCA Reachability)</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">Fator Chave para VEX</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'public_input_flow',
                  label: 'Fluxo Direto de Entrada Pública',
                  sub: 'Reachable & Unsanitized (1.0x)',
                  status: 'affected',
                  desc: 'Dados externos da internet fluem diretamente para o método vulnerável sem filtros impeditivos.'
                },
                {
                  id: 'sanitized_guarded',
                  label: 'Guarnecido por Validação / Schema',
                  sub: 'Sanitized / Constrained (0.65x)',
                  status: 'not_affected_mitigated',
                  desc: 'A aplicação valida formato, tamanho ou tipos antes de repassar os argumentos à biblioteca.'
                },
                {
                  id: 'internal_admin_only',
                  label: 'Apenas Rotas Administrativas Internas',
                  sub: 'Privileged / Internal (0.40x)',
                  status: 'affected',
                  desc: 'A biblioteca só é alcançável por administradores de sistema autenticados ou scripts internos.'
                },
                {
                  id: 'unreachable_symbol',
                  label: 'Símbolo Inalcançável (Dead Code / Sem Uso)',
                  sub: 'Dead Code / Not Called (0.05x)',
                  status: 'not_affected_not_in_path',
                  desc: 'O pacote está no manifest/lockfile, mas os métodos e classes vulneráveis nunca são invocados.'
                }
              ].map(reach => {
                const isSelected = input.callPathReachability === reach.id;
                return (
                  <button
                    key={reach.id}
                    type="button"
                    onClick={() => setInput(prev => ({ ...prev, callPathReachability: reach.id as CallPathReachability }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30'
                        : 'bg-[#161a26] border-[#252c42] hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono ${isSelected ? 'text-emerald-300' : 'text-zinc-200'}`}>
                        {reach.label}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        reach.id === 'unreachable_symbol'
                          ? 'bg-zinc-800 text-zinc-300'
                          : reach.id === 'public_input_flow'
                          ? 'bg-red-950 text-red-300 border border-red-500/30'
                          : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {reach.sub}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">
                      {reach.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: CVSS v4 Attack Requirements (AT) & Attack Vector in Supply Chain */}
          <div className="bg-[#12141e] border border-[#21273d] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>4. Métricas de Exploração no Contexto do Sistema (AV, AC, AT, PR, UI)</span>
              </h3>
              <span className="text-[10px] font-mono text-amber-400">Requisitos do FIRST CVSS v4.0</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Attack Vector (AV) */}
              <div className="bg-[#161a26] p-3 rounded-xl border border-[#252c42] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">Attack Vector (AV):</label>
                  <span className="text-[10px] font-mono text-zinc-400">{input.attackVector === 'N' ? 'Network' : input.attackVector === 'A' ? 'Adjacent' : input.attackVector === 'L' ? 'Local' : 'Physical'}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs font-mono font-bold">
                  {(['N', 'A', 'L', 'P'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInput(prev => ({ ...prev, attackVector: v }))}
                      className={`py-1.5 rounded transition-all cursor-pointer ${
                        input.attackVector === v
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#1e2335] text-zinc-400 hover:bg-[#282f47]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500">
                  {input.attackVector === 'N' ? 'Entrada atinge o componente via requisição de rede pública' : input.attackVector === 'L' ? 'Requer ingestão de arquivo local ou comando de terminal' : 'Acesso adjacente ou físico'}
                </p>
              </div>

              {/* Attack Requirements (AT) */}
              <div className="bg-[#161a26] p-3 rounded-xl border border-[#252c42] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">Attack Requirements (AT):</label>
                  <span className="text-[10px] font-mono text-amber-400">{input.deploymentRequirement === 'default_config' ? 'None (AT:N)' : 'Present (AT:P)'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setInput(prev => ({ ...prev, deploymentRequirement: 'default_config' }))}
                    className={`py-1.5 rounded transition-all cursor-pointer ${
                      input.deploymentRequirement === 'default_config'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-[#1e2335] text-zinc-400 hover:bg-[#282f47]'
                    }`}
                  >
                    Padrão (AT:N)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput(prev => ({ ...prev, deploymentRequirement: 'specific_env' }))}
                    className={`py-1.5 rounded transition-all cursor-pointer ${
                      input.deploymentRequirement !== 'default_config'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-[#1e2335] text-zinc-400 hover:bg-[#282f47]'
                    }`}
                  >
                    Config. Específica (AT:P)
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  {input.deploymentRequirement === 'default_config' ? 'Explorável na configuração padrão do deployment' : 'Exige flags atípicas, módulos legados ou estados raros'}
                </p>
              </div>

              {/* Privileges Required (PR) */}
              <div className="bg-[#161a26] p-3 rounded-xl border border-[#252c42] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">Privileges Required (PR):</label>
                  <span className="text-[10px] font-mono text-zinc-400">{input.privilegesRequired === 'N' ? 'None' : input.privilegesRequired === 'L' ? 'Low' : 'High'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs font-mono font-bold">
                  {(['N', 'L', 'H'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInput(prev => ({ ...prev, privilegesRequired: p }))}
                      className={`py-1.5 rounded transition-all cursor-pointer ${
                        input.privilegesRequired === p
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#1e2335] text-zinc-400 hover:bg-[#282f47]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500">
                  {input.privilegesRequired === 'N' ? 'Nenhuma autenticação necessária' : input.privilegesRequired === 'L' ? 'Requer login comum de usuário' : 'Requer credencial de administrador'}
                </p>
              </div>

              {/* User Interaction (UI) */}
              <div className="bg-[#161a26] p-3 rounded-xl border border-[#252c42] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">User Interaction (UI):</label>
                  <span className="text-[10px] font-mono text-zinc-400">{input.userInteraction === 'N' ? 'None' : input.userInteraction === 'P' ? 'Passive' : 'Active'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs font-mono font-bold">
                  {(['N', 'P', 'A'] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setInput(prev => ({ ...prev, userInteraction: u }))}
                      className={`py-1.5 rounded transition-all cursor-pointer ${
                        input.userInteraction === u
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#1e2335] text-zinc-400 hover:bg-[#282f47]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500">
                  {input.userInteraction === 'N' ? 'Exploração autônoma sem intervenção humana' : input.userInteraction === 'P' ? 'Usuário abre arquivo ou visita tela' : 'Usuário executa ação manual específica'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Results & VEX Assessment (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Main Sub-Score Card */}
          <div className="bg-[#12141e] border border-[#22283d] rounded-2xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Exploitability Sub-Score
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Escala 0.0 - 10.0</span>
            </div>

            {/* Calculated Number */}
            <div className="flex items-baseline justify-center gap-2">
              <span
                className={`text-6xl font-black font-mono tracking-tight ${
                  result.exploitabilityRating === 'CRITICAL'
                    ? 'text-red-400'
                    : result.exploitabilityRating === 'HIGH'
                    ? 'text-amber-400'
                    : result.exploitabilityRating === 'MODERATE'
                    ? 'text-yellow-400'
                    : result.exploitabilityRating === 'LOW'
                    ? 'text-emerald-400'
                    : 'text-zinc-500'
                }`}
              >
                {result.exploitabilityScore.toFixed(1)}
              </span>
              <span className="text-xl font-mono text-zinc-500">/ 10.0</span>
            </div>

            {/* Rating Tag */}
            <div className="flex items-center justify-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${
                  result.exploitabilityRating === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : result.exploitabilityRating === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : result.exploitabilityRating === 'MODERATE'
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                    : result.exploitabilityRating === 'LOW'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {result.exploitabilityRating} EXPOSURE
              </span>
            </div>

            {/* Score Delta vs Upstream CVE Score */}
            <div className="bg-[#171b29] p-3 rounded-xl border border-[#27304b] text-left text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Score NVD / Upstream:</span>
                <span className="text-zinc-200 font-bold">{result.upstreamCvssScore.toFixed(1)} / 10.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ajuste Contextual:</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    result.scoreAdjustmentDelta < 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {result.scoreAdjustmentDelta < 0 && <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{result.scoreAdjustmentDelta > 0 ? `+${result.scoreAdjustmentDelta}` : result.scoreAdjustmentDelta} pts</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 pt-0.5">
                {result.scoreAdjustmentDelta <= -3.0
                  ? 'Redução expressiva devido à falta de alcançabilidade ou camada de build.'
                  : 'Risco alinhado à severidade upstream do componente.'}
              </p>
            </div>

            {/* VEX Status Badge & Justification */}
            <div className="bg-[#171b29] p-3 rounded-xl border border-[#27304b] text-left space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400 font-bold">Status CISA VEX:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    result.vexStatus === 'affected'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {result.vexStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                {result.vexJustification}
              </p>
            </div>

            {/* Macro-Vector EQ1 and EQ2 Impact */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-[#171b29] rounded-lg border border-[#27304b]">
                <span className="text-zinc-500 text-[10px] block">EQ1 (Exploitability)</span>
                <span className="font-bold text-emerald-400 text-sm">Nível {result.macroVectors.eq1}</span>
              </div>
              <div className="p-2 bg-[#171b29] rounded-lg border border-[#27304b]">
                <span className="text-zinc-500 text-[10px] block">EQ2 (Complexity/AT)</span>
                <span className="font-bold text-indigo-400 text-sm">Nível {result.macroVectors.eq2}</span>
              </div>
            </div>

            {/* Recommended CVSS v4 Vector String */}
            <div className="bg-[#171b29] p-2.5 rounded-xl border border-[#27304b] flex items-center justify-between text-left text-xs font-mono">
              <span className="text-zinc-300 truncate font-semibold" title={`AV:${result.recommendedMetrics.av}/AC:${result.recommendedMetrics.ac}/AT:${result.recommendedMetrics.at}/PR:${result.recommendedMetrics.pr}/UI:${result.recommendedMetrics.ui}`}>
                {`AV:${result.recommendedMetrics.av}/AC:${result.recommendedMetrics.ac}/AT:${result.recommendedMetrics.at}/PR:${result.recommendedMetrics.pr}/UI:${result.recommendedMetrics.ui}`}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'sub-vector',
                    `AV:${result.recommendedMetrics.av}/AC:${result.recommendedMetrics.ac}/AT:${result.recommendedMetrics.at}/PR:${result.recommendedMetrics.pr}/UI:${result.recommendedMetrics.ui}`
                  )
                }
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                title="Copiar fragmento do vetor"
              >
                {copiedKey === 'sub-vector' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Action 1: Apply to Base CVSS v4.0 Calculator */}
            {onApplyToCvssV4 && (
              <button
                type="button"
                id="btn-apply-supply-chain-to-cvss"
                onClick={() => {
                  onApplyToCvssV4(result.recommendedMetrics);
                  handleCopy('applied-metrics', 'Applied');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-emerald-200" />
                <span>
                  {copiedKey === 'applied-metrics'
                    ? 'Métricas Aplicadas ao CVSS v4.0!'
                    : 'Aplicar Métricas ao Calculador CVSS v4.0'}
                </span>
              </button>
            )}

            {/* Action 2: Copy VEX Justification */}
            <button
              type="button"
              id="btn-copy-vex-statement"
              onClick={() => handleCopy('vex-markdown', vexStatementMarkdown)}
              className="w-full py-2 px-3 rounded-xl bg-[#1c2236] hover:bg-[#252d47] text-zinc-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#2b3554]"
            >
              {copiedKey === 'vex-markdown' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Parecer VEX Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copiar Parecer VEX / Justificativa SCA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
