import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Flame,
  Lock,
  Eye,
  Server,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CvssMetrics, calculateCvssScore, parseCvssVector, DEFAULT_CVSS } from '../utils/cvss';
import { VulnerabilityReport, Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

export interface CvssComparisonToolProps {
  reports?: VulnerabilityReport[];
  initialVectorA?: string;
  initialVectorB?: string;
  onApplyVector?: (vector: string, score: number) => void;
}

interface MetricMeta {
  key: keyof CvssMetrics;
  label: string;
  name: string;
  type: 'exploitability' | 'impact' | 'scope';
  options: {
    value: string;
    label: string;
    description: string;
    severityWeight: number; // 0 low risk, 3 highest risk
  }[];
}

const CVSS_METRIC_DEFINITIONS: MetricMeta[] = [
  {
    key: 'av',
    label: 'AV',
    name: 'Attack Vector (Vetor de Ataque)',
    type: 'exploitability',
    options: [
      { value: 'N', label: 'Network (N)', description: 'Remoto pela Internet sem restrições', severityWeight: 3 },
      { value: 'A', label: 'Adjacent (A)', description: 'Rede local adjacente, WiFi ou subnet', severityWeight: 2 },
      { value: 'L', label: 'Local (L)', description: 'Requer shell local ou upload interativo', severityWeight: 1 },
      { value: 'P', label: 'Physical (P)', description: 'Acesso físico direto ao dispositivo', severityWeight: 0 }
    ]
  },
  {
    key: 'ac',
    label: 'AC',
    name: 'Attack Complexity (Complexidade)',
    type: 'exploitability',
    options: [
      { value: 'L', label: 'Low (L)', description: 'Ataque repetível e confiável', severityWeight: 2 },
      { value: 'H', label: 'High (H)', description: 'Requer race condition ou condições raras', severityWeight: 1 }
    ]
  },
  {
    key: 'pr',
    label: 'PR',
    name: 'Privileges Required (Privilégios)',
    type: 'exploitability',
    options: [
      { value: 'N', label: 'None (N)', description: 'Não requer autenticação (anônimo)', severityWeight: 3 },
      { value: 'L', label: 'Low (L)', description: 'Requer credenciais básicas de usuário', severityWeight: 2 },
      { value: 'H', label: 'High (H)', description: 'Requer privilégios de administrador / root', severityWeight: 1 }
    ]
  },
  {
    key: 'ui',
    label: 'UI',
    name: 'User Interaction (Interação)',
    type: 'exploitability',
    options: [
      { value: 'N', label: 'None (N)', description: 'Execução autônoma sem intervenção da vítima', severityWeight: 2 },
      { value: 'R', label: 'Required (R)', description: 'Vítima precisa clicar ou interagir', severityWeight: 1 }
    ]
  },
  {
    key: 's',
    label: 'S',
    name: 'Scope (Escopo)',
    type: 'scope',
    options: [
      { value: 'U', label: 'Unchanged (U)', description: 'Restrito ao componente afetado', severityWeight: 1 },
      { value: 'C', label: 'Changed (C)', description: 'Afeta outros componentes / segurança ampliada', severityWeight: 3 }
    ]
  },
  {
    key: 'c',
    label: 'C',
    name: 'Confidentiality (Confidencialidade)',
    type: 'impact',
    options: [
      { value: 'H', label: 'High (H)', description: 'Vazamento ou exfiltração total de dados', severityWeight: 3 },
      { value: 'L', label: 'Low (L)', description: 'Vazamento parcial de dados não críticos', severityWeight: 2 },
      { value: 'N', label: 'None (N)', description: 'Sem impacto em confidencialidade', severityWeight: 0 }
    ]
  },
  {
    key: 'i',
    label: 'I',
    name: 'Integrity (Integridade)',
    type: 'impact',
    options: [
      { value: 'H', label: 'High (H)', description: 'Modificação total de dados ou regras', severityWeight: 3 },
      { value: 'L', label: 'Low (L)', description: 'Modificação limitada de parâmetros', severityWeight: 2 },
      { value: 'N', label: 'None (N)', description: 'Sem alteração de integridade', severityWeight: 0 }
    ]
  },
  {
    key: 'a',
    label: 'A',
    name: 'Availability (Disponibilidade)',
    type: 'impact',
    options: [
      { value: 'H', label: 'High (H)', description: 'Parada total ou negação completa de serviço', severityWeight: 3 },
      { value: 'L', label: 'Low (L)', description: 'Degradação parcial de performance', severityWeight: 2 },
      { value: 'N', label: 'None (N)', description: 'Sem indisponibilidade', severityWeight: 0 }
    ]
  }
];

interface ComparisonPreset {
  id: string;
  name: string;
  scenario: string;
  vectorA: string;
  labelA: string;
  vectorB: string;
  labelB: string;
  note: string;
}

const COMPARISON_PRESETS: ComparisonPreset[] = [
  {
    id: 'scope-change',
    name: 'Stored XSS: Impacto de Escopo (Scope)',
    scenario: 'Comparação do impacto de um XSS contido no mesmo contexto vs execução em contexto com acesso a cookies HttpOnly ou escape para outra aplicação.',
    vectorA: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:N',
    labelA: 'XSS Escopo Normal (S:U)',
    vectorB: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N',
    labelB: 'XSS com Escopo Alterado (S:C)',
    note: 'A alteração de Escopo (S:U ➔ S:C) aplica multiplicador no cálculo CVSS e amplia drásticamente o score base.'
  },
  {
    id: 'auth-barrier',
    name: 'RCE: Pré-Autenticação vs Pós-Autenticação',
    scenario: 'Diferença entre uma Execução Remota de Código explorável por qualquer anônimo vs requerendo privilégios de Admin.',
    vectorA: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H',
    labelA: 'RCE Pós-Auth (Admin)',
    vectorB: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    labelB: 'RCE Pré-Auth (Anônimo)',
    note: 'Ausência de privilégios necessários (PR:H ➔ PR:N) eleva a vulnerabilidade para o score máximo de 9.8 (Critical).'
  },
  {
    id: 'ssrf-metadata',
    name: 'SSRF: Acesso Local vs Exfiltração de Metadados de Nuvem',
    scenario: 'Diferença de severidade quando um SSRF alcança o endpoint de metadados da AWS/GCP (169.254.169.254) comprometendo credenciais IAM.',
    vectorA: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    labelA: 'SSRF Port Scan Interno',
    vectorB: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
    labelB: 'SSRF Cloud IAM Exfiltration',
    note: 'A transição para Escopo C e Confidencialidade Alta reflete o risco de invasão na infraestrutura cloud inteira.'
  },
  {
    id: 'idor-read-vs-write',
    name: 'IDOR: Leitura de Dados (PII) vs Modificação Total (ATO)',
    scenario: 'Comparação entre ler registros de outros usuários vs alterar senhas / Account Takeover.',
    vectorA: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
    labelA: 'IDOR Leitura de PII',
    vectorB: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    labelB: 'IDOR Modificação (ATO)',
    note: 'A adição de impacto em Integridade (I:N ➔ I:H) eleva o risco para comprometimento direto de contas de usuários.'
  },
  {
    id: 'network-vs-local',
    name: 'LPE: Elevação de Privilégio Local vs RCE Remoto',
    scenario: 'Comparação entre uma vulnerabilidade explorável apenas com acesso shell prévio vs exploração remota via porta aberta na Internet.',
    vectorA: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
    labelA: 'Local Privilege Escalation (LPE)',
    vectorB: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    labelB: 'Remote Code Execution (RCE)',
    note: 'O vetor de ataque (AV:L ➔ AV:N) e privilégios requeridos multiplicam o índice de explorabilidade.'
  }
];

export const CvssComparisonTool: React.FC<CvssComparisonToolProps> = ({
  reports = [],
  initialVectorA = 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:N',
  initialVectorB = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N',
  onApplyVector
}) => {
  const [vectorAStr, setVectorAStr] = useState<string>(initialVectorA);
  const [vectorBStr, setVectorBStr] = useState<string>(initialVectorB);
  const [labelA, setLabelA] = useState<string>('Vetor A (Cenário Base)');
  const [labelB, setLabelB] = useState<string>('Vetor B (Re-avaliação)');
  const [copiedComparison, setCopiedComparison] = useState<boolean>(false);
  const [activeTabA, setActiveTabA] = useState<'metrics' | 'vector'>('metrics');
  const [activeTabB, setActiveTabB] = useState<'metrics' | 'vector'>('metrics');

  // Parse metrics
  const metricsA = useMemo(() => parseCvssVector(vectorAStr), [vectorAStr]);
  const metricsB = useMemo(() => parseCvssVector(vectorBStr), [vectorBStr]);

  // Compute full CVSS stats
  const resultA = useMemo(() => calculateCvssScore(metricsA), [metricsA]);
  const resultB = useMemo(() => calculateCvssScore(metricsB), [metricsB]);

  // Score deltas
  const scoreDelta = Math.round((resultB.score - resultA.score) * 10) / 10;
  const impactDelta = Math.round((resultB.impactScore - resultA.impactScore) * 10) / 10;
  const exploitabilityDelta = Math.round((resultB.exploitabilityScore - resultA.exploitabilityScore) * 10) / 10;

  const sevBadgeA = getSeverityBadgeColor(resultA.severity);
  const sevBadgeB = getSeverityBadgeColor(resultB.severity);

  // Compute individual metric diffs
  const metricDiffs = useMemo(() => {
    return CVSS_METRIC_DEFINITIONS.map(def => {
      const valA = metricsA[def.key];
      const valB = metricsB[def.key];
      const isDifferent = valA !== valB;

      const optA = def.options.find(o => o.value === valA);
      const optB = def.options.find(o => o.value === valB);

      const weightA = optA ? optA.severityWeight : 0;
      const weightB = optB ? optB.severityWeight : 0;
      const trend: 'up' | 'down' | 'equal' = weightB > weightA ? 'up' : weightB < weightA ? 'down' : 'equal';

      return {
        key: def.key,
        name: def.name,
        type: def.type,
        valA,
        valB,
        optA,
        optB,
        isDifferent,
        trend
      };
    });
  }, [metricsA, metricsB]);

  const diffCount = metricDiffs.filter(d => d.isDifferent).length;

  // Handle metric updates
  const updateMetricA = (key: keyof CvssMetrics, value: any) => {
    const updated = { ...metricsA, [key]: value };
    const res = calculateCvssScore(updated);
    setVectorAStr(res.vector);
  };

  const updateMetricB = (key: keyof CvssMetrics, value: any) => {
    const updated = { ...metricsB, [key]: value };
    const res = calculateCvssScore(updated);
    setVectorBStr(res.vector);
  };

  // Swap vectors
  const handleSwap = () => {
    const tempVec = vectorAStr;
    const tempLabel = labelA;
    setVectorAStr(vectorBStr);
    setLabelA(labelB);
    setVectorBStr(tempVec);
    setLabelB(tempLabel);
  };

  // Copy A to B
  const handleCloneAToB = () => {
    setVectorBStr(vectorAStr);
    setLabelB(`${labelA} (Cópia)`);
  };

  // Apply preset
  const handleApplyPreset = (preset: ComparisonPreset) => {
    setVectorAStr(preset.vectorA);
    setLabelA(preset.labelA);
    setVectorBStr(preset.vectorB);
    setLabelB(preset.labelB);
  };

  // Load from existing report
  const handleLoadFromReportA = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repId = e.target.value;
    const rep = reports.find(r => r.id === repId);
    if (rep && rep.cvssVector) {
      setVectorAStr(rep.cvssVector);
      setLabelA(`${rep.title.slice(0, 24)}... (${rep.severity})`);
    }
  };

  const handleLoadFromReportB = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repId = e.target.value;
    const rep = reports.find(r => r.id === repId);
    if (rep && rep.cvssVector) {
      setVectorBStr(rep.cvssVector);
      setLabelB(`${rep.title.slice(0, 24)}... (${rep.severity})`);
    }
  };

  // Generate Markdown comparison for triage discussions
  const handleCopyMarkdown = () => {
    const markdown = [
      `### Análise Diferencial de CVSS v3.1`,
      `**Cenário A:** ${labelA}`,
      `- Vetor: \`${resultA.vector}\``,
      `- Score: **${resultA.score} (${resultA.severity})** | Impacto: ${resultA.impactScore} | Explorabilidade: ${resultA.exploitabilityScore}`,
      ``,
      `**Cenário B:** ${labelB}`,
      `- Vetor: \`${resultB.vector}\``,
      `- Score: **${resultB.score} (${resultB.severity})** | Impacto: ${resultB.impactScore} | Explorabilidade: ${resultB.exploitabilityScore}`,
      ``,
      `**Diferencial (Δ):**`,
      `- **Score Base:** ${scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pontos`,
      `- **Impacto (CIA):** ${impactDelta > 0 ? `+${impactDelta}` : impactDelta}`,
      `- **Explorabilidade:** ${exploitabilityDelta > 0 ? `+${exploitabilityDelta}` : exploitabilityDelta}`,
      `- **Métricas Modificadas:** ${diffCount} de 8 parâmetros`,
      ``,
      `| Métrica | Cenário A | Cenário B | Impacto no Risco |`,
      `| :--- | :--- | :--- | :--- |`,
      ...metricDiffs.map(d => {
        const flag = d.isDifferent ? (d.trend === 'up' ? '▲ Elevou' : '▼ Reduziu') : '= Neutro';
        return `| **${d.name}** | \`${d.valA}\` (${d.optA?.label || ''}) | \`${d.valB}\` (${d.optB?.label || ''}) | ${flag} |`;
      })
    ].join('\n');

    navigator.clipboard.writeText(markdown);
    setCopiedComparison(true);
    setTimeout(() => setCopiedComparison(false), 2000);
  };

  return (
    <div
      id="cvss-comparison-tool"
      className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#111] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold uppercase text-zinc-100 tracking-wider">
                Comparador Diferencial de Vetores CVSS v3.1
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                DIFF ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compare dois vetores de severidade lado a lado, calculando variações de Score, Impacto (CIA) e Explorabilidade
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-cvss-swap"
            onClick={handleSwap}
            className="px-2.5 py-1.5 rounded bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
            title="Inverter Vetores A e B"
          >
            <GitCompare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Inverter (A ⇄ B)</span>
          </button>

          <button
            type="button"
            id="btn-cvss-clone-a-to-b"
            onClick={handleCloneAToB}
            className="px-2.5 py-1.5 rounded bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
            title="Copiar Vetor A para o Vetor B para testar pequenos ajustes"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Clonar A ➔ B</span>
          </button>

          <button
            type="button"
            id="btn-cvss-copy-markdown"
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Copiar relatório comparativo em formato Markdown para triagem"
          >
            {copiedComparison ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedComparison ? 'Markdown Copiado!' : 'Copiar Diff Markdown'}</span>
          </button>
        </div>
      </div>

      {/* Preset Scenarios Selector Bar */}
      <div className="p-3 bg-[#0d0d0d] border-b border-[#222] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1 font-semibold">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Cenários Prontos:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {COMPARISON_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 rounded bg-[#161616] hover:bg-[#222] hover:border-emerald-500/40 border border-[#2a2a2a] text-zinc-300 hover:text-emerald-300 text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-1"
              title={preset.scenario}
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Comparison KPI Display Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#222] border-b border-[#222] bg-[#0f0f0f]">
        
        {/* Scenario A Card */}
        <div className="md:col-span-4 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Cenário A
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${sevBadgeA.bg} ${sevBadgeA.text} ${sevBadgeA.border}`}>
              {resultA.severity}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-light font-mono text-white">
                {resultA.score.toFixed(1)}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-[220px]" title={labelA}>
                {labelA}
              </p>
            </div>

            <div className="text-right font-mono text-xs space-y-1 bg-[#151515] p-2 rounded border border-[#242424]">
              <div className="flex items-center justify-between gap-3 text-zinc-400">
                <span className="text-zinc-500">Impacto:</span>
                <span className="text-rose-400 font-bold">{resultA.impactScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-zinc-400">
                <span className="text-zinc-500">Explorab.:</span>
                <span className="text-amber-400 font-bold">{resultA.exploitabilityScore.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Vector String */}
          <div className="p-2 rounded bg-[#0a0a0a] border border-[#222] text-[11px] font-mono text-blue-300 truncate">
            {resultA.vector}
          </div>

          {/* Quick load from existing reports */}
          {reports.length > 0 && (
            <div className="pt-1">
              <select
                onChange={handleLoadFromReportA}
                defaultValue=""
                className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>Carregar de um Relatório existente...</option>
                {reports.map(r => (
                  <option key={`a-${r.id}`} value={r.id}>
                    {r.title.slice(0, 32)} ({r.severity} {r.cvssScore})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Differential Delta Center Card */}
        <div className="md:col-span-4 p-4 bg-[#121212] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              Diferencial de Risco (Δ B - A)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-[#333]">
              {diffCount} {diffCount === 1 ? 'métrica alterada' : 'métricas alteradas'}
            </span>
          </div>

          {/* Score Delta Display */}
          <div className="text-center py-1">
            <div className="flex items-center justify-center gap-2">
              {scoreDelta > 0 ? (
                <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
                  <TrendingUp className="w-4 h-4" />
                </div>
              ) : scoreDelta < 0 ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <TrendingDown className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-700">
                  <Minus className="w-4 h-4" />
                </div>
              )}

              <span
                className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${
                  scoreDelta > 0 ? 'text-red-400' : scoreDelta < 0 ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {scoreDelta > 0 ? `+${scoreDelta.toFixed(1)}` : scoreDelta.toFixed(1)}
              </span>
            </div>

            <p className="text-xs font-mono font-semibold text-zinc-300 mt-1">
              {scoreDelta > 0 ? (
                <span className="text-red-400">Risco Elevado ({resultA.severity} ➔ {resultB.severity})</span>
              ) : scoreDelta < 0 ? (
                <span className="text-emerald-400">Risco Mitigado ({resultA.severity} ➔ {resultB.severity})</span>
              ) : (
                <span className="text-zinc-400">Severidade Idêntica ({resultA.severity})</span>
              )}
            </p>
          </div>

          {/* Sub-score Delta Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-[#0a0a0a] border border-[#222] flex items-center justify-between">
              <span className="text-zinc-500">Δ Impacto:</span>
              <span className={`font-bold ${impactDelta > 0 ? 'text-rose-400' : impactDelta < 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {impactDelta > 0 ? `+${impactDelta.toFixed(1)}` : impactDelta.toFixed(1)}
              </span>
            </div>
            <div className="p-2 rounded bg-[#0a0a0a] border border-[#222] flex items-center justify-between">
              <span className="text-zinc-500">Δ Explorab.:</span>
              <span className={`font-bold ${exploitabilityDelta > 0 ? 'text-amber-400' : exploitabilityDelta < 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {exploitabilityDelta > 0 ? `+${exploitabilityDelta.toFixed(1)}` : exploitabilityDelta.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Scenario B Card */}
        <div className="md:col-span-4 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Cenário B
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${sevBadgeB.bg} ${sevBadgeB.text} ${sevBadgeB.border}`}>
              {resultB.severity}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-light font-mono text-white">
                {resultB.score.toFixed(1)}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-[220px]" title={labelB}>
                {labelB}
              </p>
            </div>

            <div className="text-right font-mono text-xs space-y-1 bg-[#151515] p-2 rounded border border-[#242424]">
              <div className="flex items-center justify-between gap-3 text-zinc-400">
                <span className="text-zinc-500">Impacto:</span>
                <span className="text-rose-400 font-bold">{resultB.impactScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-zinc-400">
                <span className="text-zinc-500">Explorab.:</span>
                <span className="text-amber-400 font-bold">{resultB.exploitabilityScore.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Vector String */}
          <div className="p-2 rounded bg-[#0a0a0a] border border-[#222] text-[11px] font-mono text-emerald-300 truncate">
            {resultB.vector}
          </div>

          {/* Quick load from existing reports */}
          {reports.length > 0 && (
            <div className="pt-1">
              <select
                onChange={handleLoadFromReportB}
                defaultValue=""
                className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="" disabled>Carregar de um Relatório existente...</option>
                {reports.map(r => (
                  <option key={`b-${r.id}`} value={r.id}>
                    {r.title.slice(0, 32)} ({r.severity} {r.cvssScore})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

      </div>

      {/* Side-by-Side Metric Diff Matrix */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#222]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Matriz Comparativa das 8 Métricas Base
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              (Clique nos seletores para ajustar parâmetros em tempo real)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Diferença Ativa
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-zinc-600" /> Idêntico
            </span>
          </div>
        </div>

        {/* Metric Comparison Rows */}
        <div className="space-y-2">
          {metricDiffs.map((diff) => {
            return (
              <div
                key={diff.key}
                id={`diff-metric-row-${diff.key}`}
                className={`p-3 rounded-xl border transition-all ${
                  diff.isDifferent
                    ? 'bg-[#151515] border-amber-500/40 shadow-md shadow-amber-950/10'
                    : 'bg-[#101010] border-[#222]'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                  
                  {/* Metric Identifier Column */}
                  <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#222] border border-[#333] flex items-center justify-center font-mono font-bold text-xs text-white shrink-0">
                        {diff.key.toUpperCase()}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block font-mono">
                          {diff.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono capitalize">
                          {diff.type === 'impact' ? 'Impacto CIA' : diff.type === 'scope' ? 'Escopo' : 'Explorabilidade'}
                        </span>
                      </div>
                    </div>

                    {diff.isDifferent ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 lg:hidden">
                        Diferença
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0 lg:hidden">
                        Idêntico
                      </span>
                    )}
                  </div>

                  {/* Scenario A Metric Selector */}
                  <div className="lg:col-span-4 space-y-1">
                    <span className="text-[10px] font-mono text-blue-400 block font-semibold lg:hidden">
                      Cenário A:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {CVSS_METRIC_DEFINITIONS.find(m => m.key === diff.key)?.options.map(opt => {
                        const isSelected = diff.valA === opt.value;
                        return (
                          <button
                            key={`a-${diff.key}-${opt.value}`}
                            type="button"
                            onClick={() => updateMetricA(diff.key, opt.value)}
                            className={`px-2 py-1 rounded text-center text-[10px] font-mono transition-all border ${
                              isSelected
                                ? 'bg-blue-500/25 text-blue-300 font-bold border-blue-500/60 shadow-sm'
                                : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                            }`}
                            title={opt.description}
                          >
                            {opt.label.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Center Diff Directional Indicator */}
                  <div className="lg:col-span-1 hidden lg:flex items-center justify-center">
                    {diff.isDifferent ? (
                      <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30 animate-pulse">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="text-zinc-600 font-mono text-xs">
                        =
                      </div>
                    )}
                  </div>

                  {/* Scenario B Metric Selector */}
                  <div className="lg:col-span-4 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 block font-semibold lg:hidden">
                      Cenário B:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {CVSS_METRIC_DEFINITIONS.find(m => m.key === diff.key)?.options.map(opt => {
                        const isSelected = diff.valB === opt.value;
                        return (
                          <button
                            key={`b-${diff.key}-${opt.value}`}
                            type="button"
                            onClick={() => updateMetricB(diff.key, opt.value)}
                            className={`px-2 py-1 rounded text-center text-[10px] font-mono transition-all border ${
                              isSelected
                                ? 'bg-emerald-500/25 text-emerald-300 font-bold border-emerald-500/60 shadow-sm'
                                : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                            }`}
                            title={opt.description}
                          >
                            {opt.label.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Subtext description when different */}
                {diff.isDifferent && (
                  <div className="mt-2 pt-2 border-t border-[#222] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-zinc-400 gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-blue-400">{diff.optA?.label}:</span>
                      <span className="text-zinc-500">{diff.optA?.description}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 hidden sm:block" />
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-emerald-400">{diff.optB?.label}:</span>
                      <span className="text-zinc-300 font-medium">{diff.optB?.description}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CIA Impact Sub-Score Visual Differential */}
      <div className="p-4 sm:p-5 border-t border-[#222] bg-[#0c0c0c] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Variação de Impacto na Tríade CIA (Confidencialidade, Integridade, Disponibilidade)
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Escopo: {metricsA.s === metricsB.s ? `Ambos ${metricsA.s === 'U' ? 'Unchanged (U)' : 'Changed (C)'}` : `${metricsA.s} ➔ ${metricsB.s}`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          
          {/* Confidentiality */}
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Eye className="w-3 h-3 text-rose-400" />
                Confidencialidade (C)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {metricsA.c} ➔ {metricsB.c}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-400">A: {metricsA.c === 'H' ? 'High' : metricsA.c === 'L' ? 'Low' : 'None'}</span>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <span className="text-emerald-400 font-bold">B: {metricsB.c === 'H' ? 'High' : metricsB.c === 'L' ? 'Low' : 'None'}</span>
            </div>
            <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: metricsB.c === 'H' ? '100%' : metricsB.c === 'L' ? '50%' : '0%' }}
              />
            </div>
          </div>

          {/* Integrity */}
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Integridade (I)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {metricsA.i} ➔ {metricsB.i}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-400">A: {metricsA.i === 'H' ? 'High' : metricsA.i === 'L' ? 'Low' : 'None'}</span>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <span className="text-emerald-400 font-bold">B: {metricsB.i === 'H' ? 'High' : metricsB.i === 'L' ? 'Low' : 'None'}</span>
            </div>
            <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: metricsB.i === 'H' ? '100%' : metricsB.i === 'L' ? '50%' : '0%' }}
              />
            </div>
          </div>

          {/* Availability */}
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Server className="w-3 h-3 text-blue-400" />
                Disponibilidade (A)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {metricsA.a} ➔ {metricsB.a}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-400">A: {metricsA.a === 'H' ? 'High' : metricsA.a === 'L' ? 'Low' : 'None'}</span>
              <ArrowRight className="w-3 h-3 text-zinc-600" />
              <span className="text-emerald-400 font-bold">B: {metricsB.a === 'H' ? 'High' : metricsB.a === 'L' ? 'Low' : 'None'}</span>
            </div>
            <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: metricsB.a === 'H' ? '100%' : metricsB.a === 'L' ? '50%' : '0%' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="px-4 sm:px-6 py-3 border-t border-[#222] bg-[#090909] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Padrão FIRST CVSS v3.1: O score base é derivado da combinação de ISS (Impact Sub-Score) e Explorabilidade.
          </span>
        </div>

        {onApplyVector && (
          <button
            type="button"
            onClick={() => onApplyVector(resultB.vector, resultB.score)}
            className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Usar Vetor B no Relatório ({resultB.score})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
