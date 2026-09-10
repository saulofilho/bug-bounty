import React, { useState } from 'react';
import { 
  Calculator, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  ShieldAlert, 
  Sliders, 
  Flame, 
  Lock, 
  Eye, 
  Server,
  Zap,
  Info
} from 'lucide-react';
import { CvssMetrics, calculateCvssScore, parseCvssVector, DEFAULT_CVSS } from '../utils/cvss';
import { Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

interface MiniCvssCalculatorProps {
  metrics: CvssMetrics;
  cvssScore: number;
  cvssVector: string;
  onMetricsChange: (metrics: CvssMetrics) => void;
  onScoreChange?: (score: number) => void;
  onVectorChange?: (vector: string) => void;
}

interface MetricItem<T> {
  value: T;
  label: string;
  tooltip: string;
  color?: 'danger' | 'warning' | 'neutral' | 'safe';
}

const ATTACK_VECTORS: MetricItem<CvssMetrics['av']>[] = [
  { value: 'N', label: 'Network (N)', tooltip: 'Remoto via Internet sem restrições de rede', color: 'danger' },
  { value: 'A', label: 'Adjacent (A)', tooltip: 'Rede adjacente, VLAN, WiFi local ou Bluetooth', color: 'warning' },
  { value: 'L', label: 'Local (L)', tooltip: 'Requer shell local ou upload de arquivo', color: 'neutral' },
  { value: 'P', label: 'Physical (P)', tooltip: 'Requer acesso físico direto ao hardware', color: 'safe' },
];

const ATTACK_COMPLEXITIES: MetricItem<CvssMetrics['ac']>[] = [
  { value: 'L', label: 'Low (L)', tooltip: 'Ataque confiável e repetível sem condições especiais', color: 'danger' },
  { value: 'H', label: 'High (H)', tooltip: 'Depende de race condition ou circunstâncias raras', color: 'neutral' },
];

const PRIVILEGES_REQUIRED: MetricItem<CvssMetrics['pr']>[] = [
  { value: 'N', label: 'None (N)', tooltip: 'Não requer autenticação (anônimo / externo)', color: 'danger' },
  { value: 'L', label: 'Low (L)', tooltip: 'Requer usuário comum ou privilégio básico', color: 'warning' },
  { value: 'H', label: 'High (H)', tooltip: 'Requer credencial de administrador ou root', color: 'neutral' },
];

const USER_INTERACTIONS: MetricItem<CvssMetrics['ui']>[] = [
  { value: 'N', label: 'None (N)', tooltip: 'Execução autônoma sem intervenção da vítima', color: 'danger' },
  { value: 'R', label: 'Required (R)', tooltip: 'Vítima precisa clicar em link ou executar ação', color: 'warning' },
];

const SCOPES: MetricItem<CvssMetrics['s']>[] = [
  { value: 'U', label: 'Unchanged (U)', tooltip: 'Impacto contido apenas no componente vulnerável', color: 'neutral' },
  { value: 'C', label: 'Changed (C)', tooltip: 'Impacta outros componentes / autoridade (ex: XSS, VM Escape)', color: 'danger' },
];

const IMPACT_OPTIONS: MetricItem<'N' | 'L' | 'H'>[] = [
  { value: 'N', label: 'None (N)', tooltip: 'Nenhum impacto observável', color: 'safe' },
  { value: 'L', label: 'Low (L)', tooltip: 'Impacto parcial ou dados não confidenciais', color: 'warning' },
  { value: 'H', label: 'High (H)', tooltip: 'Compromisso total do componente', color: 'danger' },
];

const PRESETS: { name: string; tag: string; metrics: CvssMetrics }[] = [
  {
    name: 'RCE Não Autenticado',
    tag: '9.8 CRIT',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'H' }
  },
  {
    name: 'IDOR Exfiltração PII',
    tag: '7.5 HIGH',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'N', a: 'N' }
  },
  {
    name: 'Cloud SSRF (Metadata)',
    tag: '8.6 HIGH',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'C', c: 'H', i: 'N', a: 'N' }
  },
  {
    name: 'Stored XSS (Scope Changed)',
    tag: '6.5 MED',
    metrics: { av: 'N', ac: 'L', pr: 'L', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' }
  },
  {
    name: 'Reflected XSS',
    tag: '6.1 MED',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' }
  },
  {
    name: 'CSRF com Mudança de Estado',
    tag: '4.3 MED',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'U', c: 'N', i: 'L', a: 'N' }
  }
];

export const MiniCvssCalculator: React.FC<MiniCvssCalculatorProps> = ({
  metrics,
  cvssScore,
  cvssVector,
  onMetricsChange,
  onScoreChange,
  onVectorChange
}) => {
  const [copied, setCopied] = useState(false);
  const [vectorInputError, setVectorInputError] = useState<string | null>(null);

  const { score: computedScore, vector: computedVector, severity, impactScore, exploitabilityScore } = calculateCvssScore(metrics);
  const sevBadge = getSeverityBadgeColor(severity);

  const updateMetric = <K extends keyof CvssMetrics>(key: K, value: CvssMetrics[K]) => {
    const updated = { ...metrics, [key]: value };
    onMetricsChange(updated);
    const result = calculateCvssScore(updated);
    if (onScoreChange) onScoreChange(result.score);
    if (onVectorChange) onVectorChange(result.vector);
    setVectorInputError(null);
  };

  const applyPreset = (presetMetrics: CvssMetrics) => {
    onMetricsChange(presetMetrics);
    const result = calculateCvssScore(presetMetrics);
    if (onScoreChange) onScoreChange(result.score);
    if (onVectorChange) onVectorChange(result.vector);
    setVectorInputError(null);
  };

  const handleCopyVector = () => {
    navigator.clipboard.writeText(cvssVector || computedVector);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVectorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onVectorChange) onVectorChange(val);

    try {
      const parsed = parseCvssVector(val);
      onMetricsChange(parsed);
      const result = calculateCvssScore(parsed);
      if (onScoreChange) onScoreChange(result.score);
      setVectorInputError(null);
    } catch {
      setVectorInputError('Formato de vetor inválido');
    }
  };

  const handleScoreInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0 && val <= 10 && onScoreChange) {
      onScoreChange(Math.round(val * 10) / 10);
    }
  };

  return (
    <div id="mini-cvss-calculator" className="space-y-3.5 p-4 rounded-xl bg-[#0f0f0f] border border-[#262626]">
      {/* Header with Title and Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-mono font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              Mini Calculador CVSS 3.1
              <span className="text-[10px] text-zinc-500 font-normal">FIRST v3.1 Spec</span>
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0 mr-1">Presets:</span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p.metrics)}
              className="px-2 py-0.5 rounded bg-[#171717] hover:bg-[#242424] hover:border-emerald-500/40 border border-[#2a2a2a] text-zinc-300 hover:text-emerald-300 text-[10px] font-mono whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
              title={`${p.name} - CVSS ${p.tag}`}
            >
              <span>{p.name.split(' ')[0]}</span>
              <span className="text-[9px] text-emerald-400/90 font-bold">{p.tag.split(' ')[0]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyPreset(DEFAULT_CVSS)}
            className="p-1 rounded bg-[#171717] hover:bg-[#242424] text-zinc-500 hover:text-zinc-300 border border-[#2a2a2a] transition-colors shrink-0"
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Synchronized cvssScore and cvssVector Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg bg-[#141414] border border-[#222]">
        {/* Score Field */}
        <div className="sm:col-span-4 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Score CVSS 3.1 *
            </label>
            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
              {severity}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="input-cvss-score"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={cvssScore !== undefined ? cvssScore : computedScore}
                onChange={handleScoreInputChange}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-emerald-500 rounded px-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">/ 10</span>
            </div>

            <div className="text-[10px] font-mono text-zinc-400 space-y-0.5 shrink-0 bg-[#0a0a0a] px-2 py-1 rounded border border-[#222]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-zinc-500">Exp:</span>
                <span className="text-amber-400 font-semibold">{exploitabilityScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-zinc-500">Imp:</span>
                <span className="text-rose-400 font-semibold">{impactScore.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vector Field */}
        <div className="sm:col-span-8 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Vetor CVSS Oficial (Sincronizado) *
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">Auto-gerado pelas métricas</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                id="input-cvss-vector"
                type="text"
                value={cvssVector || computedVector}
                onChange={handleVectorInputChange}
                placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"
                className={`w-full bg-[#0a0a0a] border ${vectorInputError ? 'border-rose-500' : 'border-[#2a2a2a] focus:border-emerald-500'} rounded px-2.5 py-1.5 text-emerald-300 font-mono text-xs focus:outline-none truncate`}
              />
            </div>
            <button
              type="button"
              onClick={handleCopyVector}
              className="px-2.5 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors shrink-0"
              title="Copiar vetor CVSS"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          {vectorInputError && (
            <span className="text-[10px] text-rose-400 font-mono block">{vectorInputError}</span>
          )}
        </div>
      </div>

      {/* Metrics Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        
        {/* Exploitability Metrics Group */}
        <div className="p-3 rounded-lg bg-[#121212] border border-[#222] space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1f1f1f]">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-amber-400" />
              Métricas de Explorabilidade (Exploitability)
            </span>
            <span className="text-[9px] font-mono text-zinc-500">Sub-Score: {exploitabilityScore.toFixed(1)}</span>
          </div>

          {/* AV - Attack Vector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 font-bold">AV (Attack Vector):</span>
              <span className="text-zinc-500">
                {ATTACK_VECTORS.find(o => o.value === metrics.av)?.tooltip}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {ATTACK_VECTORS.map(opt => {
                const active = metrics.av === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateMetric('av', opt.value)}
                    className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                      active
                        ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                        : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                    }`}
                    title={opt.tooltip}
                  >
                    {opt.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AC & UI (2 columns) */}
          <div className="grid grid-cols-2 gap-2">
            {/* AC - Attack Complexity */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-400 block">AC (Complexidade):</span>
              <div className="grid grid-cols-2 gap-1">
                {ATTACK_COMPLEXITIES.map(opt => {
                  const active = metrics.ac === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateMetric('ac', opt.value)}
                      className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                        active
                          ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                          : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                      }`}
                      title={opt.tooltip}
                    >
                      {opt.value === 'L' ? 'Baixa (L)' : 'Alta (H)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UI - User Interaction */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-400 block">UI (Interação):</span>
              <div className="grid grid-cols-2 gap-1">
                {USER_INTERACTIONS.map(opt => {
                  const active = metrics.ui === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateMetric('ui', opt.value)}
                      className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                        active
                          ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                          : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                      }`}
                      title={opt.tooltip}
                    >
                      {opt.value === 'N' ? 'Nenhuma (N)' : 'Requer (R)'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PR & Scope (2 columns) */}
          <div className="grid grid-cols-2 gap-2">
            {/* PR - Privileges Required */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-400 block">PR (Privilégios):</span>
              <div className="grid grid-cols-3 gap-1">
                {PRIVILEGES_REQUIRED.map(opt => {
                  const active = metrics.pr === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateMetric('pr', opt.value)}
                      className={`py-1 px-0.5 rounded text-center text-[10px] font-mono transition-all border ${
                        active
                          ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                          : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                      }`}
                      title={opt.tooltip}
                    >
                      {opt.value}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-400 block">S (Escopo):</span>
              <div className="grid grid-cols-2 gap-1">
                {SCOPES.map(opt => {
                  const active = metrics.s === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateMetric('s', opt.value)}
                      className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                        active
                          ? 'bg-rose-500/20 text-rose-300 font-bold border-rose-500/50 shadow-sm'
                          : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                      }`}
                      title={opt.tooltip}
                    >
                      {opt.value === 'U' ? 'Normal (U)' : 'Alterado (C)'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Impact Metrics Group */}
        <div className="p-3 rounded-lg bg-[#121212] border border-[#222] space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1f1f1f]">
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Métricas de Impacto (CIA Impact)
            </span>
            <span className="text-[9px] font-mono text-zinc-500">Sub-Score: {impactScore.toFixed(1)}</span>
          </div>

          {/* C - Confidentiality */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Eye className="w-2.5 h-2.5 text-rose-400" />
                C - Confidencialidade:
              </span>
              <span className="text-zinc-500">
                {metrics.c === 'H' ? 'Compromisso total de dados' : metrics.c === 'L' ? 'Acesso parcial' : 'Nenhum vazamento'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {IMPACT_OPTIONS.map(opt => {
                const active = metrics.c === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateMetric('c', opt.value)}
                    className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                      active
                        ? opt.value === 'H' 
                          ? 'bg-rose-500/25 text-rose-300 font-bold border-rose-500/60 shadow-sm'
                          : opt.value === 'L'
                            ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                            : 'bg-zinc-700/40 text-zinc-200 font-bold border-zinc-500 shadow-sm'
                        : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                    }`}
                    title={opt.tooltip}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* I - Integrity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-rose-400" />
                I - Integridade:
              </span>
              <span className="text-zinc-500">
                {metrics.i === 'H' ? 'Modificação total / Bypass' : metrics.i === 'L' ? 'Alteração parcial' : 'Nenhuma alteração'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {IMPACT_OPTIONS.map(opt => {
                const active = metrics.i === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateMetric('i', opt.value)}
                    className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                      active
                        ? opt.value === 'H' 
                          ? 'bg-rose-500/25 text-rose-300 font-bold border-rose-500/60 shadow-sm'
                          : opt.value === 'L'
                            ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                            : 'bg-zinc-700/40 text-zinc-200 font-bold border-zinc-500 shadow-sm'
                        : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                    }`}
                    title={opt.tooltip}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* A - Availability */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Server className="w-2.5 h-2.5 text-rose-400" />
                A - Disponibilidade:
              </span>
              <span className="text-zinc-500">
                {metrics.a === 'H' ? 'Derrubada total de serviço' : metrics.a === 'L' ? 'Degradação parcial' : 'Sem impacto'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {IMPACT_OPTIONS.map(opt => {
                const active = metrics.a === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateMetric('a', opt.value)}
                    className={`py-1 px-1 rounded text-center text-[10px] font-mono transition-all border ${
                      active
                        ? opt.value === 'H' 
                          ? 'bg-rose-500/25 text-rose-300 font-bold border-rose-500/60 shadow-sm'
                          : opt.value === 'L'
                            ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50 shadow-sm'
                            : 'bg-zinc-700/40 text-zinc-200 font-bold border-zinc-500 shadow-sm'
                        : 'bg-[#181818] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:bg-[#202020]'
                    }`}
                    title={opt.tooltip}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
