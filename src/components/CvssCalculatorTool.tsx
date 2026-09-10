import React, { useState } from 'react';
import { 
  Calculator, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight,
  Info,
  Sliders,
  Flame,
  Lock,
  Eye,
  Server
} from 'lucide-react';
import { CvssMetrics, calculateCvssScore, parseCvssVector, DEFAULT_CVSS } from '../utils/cvss';
import { Severity } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

interface CvssCalculatorToolProps {
  metrics: CvssMetrics;
  onChange: (metrics: CvssMetrics) => void;
  onApplyPreset?: (metrics: CvssMetrics) => void;
}

interface MetricOption<T> {
  value: T;
  label: string;
  shortLabel: string;
  description: string;
  highlight?: 'red' | 'orange' | 'yellow' | 'blue' | 'zinc';
}

const ATTACK_VECTORS: MetricOption<CvssMetrics['av']>[] = [
  { value: 'N', label: 'Network (N)', shortLabel: 'Network', description: 'Remoto pela Internet, sem restrições lógicas de rede.', highlight: 'red' },
  { value: 'A', label: 'Adjacent (A)', shortLabel: 'Adjacent', description: 'Mesma rede física, VLAN, Bluetooth ou subnet.', highlight: 'orange' },
  { value: 'L', label: 'Local (L)', shortLabel: 'Local', description: 'Requer shell local, CLI ou upload de arquivo interativo.', highlight: 'yellow' },
  { value: 'P', label: 'Physical (P)', shortLabel: 'Physical', description: 'Requer acesso físico direto ao dispositivo/servidor.', highlight: 'blue' }
];

const ATTACK_COMPLEXITIES: MetricOption<CvssMetrics['ac']>[] = [
  { value: 'L', label: 'Low (L)', shortLabel: 'Baixa', description: 'Ataque confiável e repetível sem condições especiais.', highlight: 'red' },
  { value: 'H', label: 'High (H)', shortLabel: 'Alta', description: 'Requer race condition, bypass estocástico ou coleta de segredos.', highlight: 'yellow' }
];

const PRIVILEGES_REQUIRED: MetricOption<CvssMetrics['pr']>[] = [
  { value: 'N', label: 'None (N)', shortLabel: 'Nenhum', description: 'Não requer autenticação (usuário anônimo/externo).', highlight: 'red' },
  { value: 'L', label: 'Low (L)', shortLabel: 'Baixo', description: 'Requer credenciais de usuário comum padrão.', highlight: 'yellow' },
  { value: 'H', label: 'High (H)', shortLabel: 'Alto', description: 'Requer privilégios administrativos ou de root.', highlight: 'blue' }
];

const USER_INTERACTIONS: MetricOption<CvssMetrics['ui']>[] = [
  { value: 'N', label: 'None (N)', shortLabel: 'Nenhuma', description: 'Execução autônoma sem qualquer ação da vítima.', highlight: 'red' },
  { value: 'R', label: 'Required (R)', shortLabel: 'Requerida', description: 'Vítima precisa clicar em link, baixar arquivo ou autorizar.', highlight: 'yellow' }
];

const SCOPES: MetricOption<CvssMetrics['s']>[] = [
  { value: 'U', label: 'Unchanged (U)', shortLabel: 'Não Alterado', description: 'Impacto contido apenas no componente vulnerável.', highlight: 'yellow' },
  { value: 'C', label: 'Changed (C)', shortLabel: 'Alterado', description: 'Afeta outros componentes além da autoridade do recurso (ex: XSS, VM escape).', highlight: 'red' }
];

const IMPACT_LEVELS: MetricOption<'H' | 'L' | 'N'>[] = [
  { value: 'H', label: 'High (H)', shortLabel: 'Alto', description: 'Compromisso total de confidencialidade/integridade/disponibilidade.', highlight: 'red' },
  { value: 'L', label: 'Low (L)', shortLabel: 'Baixo', description: 'Impacto parcial ou acesso a dados não sensíveis.', highlight: 'yellow' },
  { value: 'N', label: 'None (N)', shortLabel: 'Nenhum', description: 'Nenhum impacto observável neste componente.', highlight: 'zinc' }
];

const PRESETS: { name: string; desc: string; score: string; metrics: CvssMetrics }[] = [
  {
    name: 'RCE Não Autenticado',
    desc: 'Execução Remota de Código sem credenciais',
    score: '9.8 CRITICAL',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'H' }
  },
  {
    name: 'IDOR com Exfiltração de PII',
    desc: 'Leitura de dados pessoais de outros usuários',
    score: '7.5 HIGH',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'N', a: 'N' }
  },
  {
    name: 'Stored XSS (Scope Changed)',
    desc: 'Script persistente no navegador de outros clientes',
    score: '6.5 MEDIUM',
    metrics: { av: 'N', ac: 'L', pr: 'L', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' }
  },
  {
    name: 'SSRF em Nuvem (Cloud Metadata)',
    desc: 'Requisições ao endpoint 169.254.169.254 com token IAM',
    score: '8.6 HIGH',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'C', c: 'H', i: 'N', a: 'N' }
  },
  {
    name: 'Reflected XSS',
    desc: 'Injeção de script via parâmetro com interação do usuário',
    score: '6.1 MEDIUM',
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' }
  }
];

export const CvssCalculatorTool: React.FC<CvssCalculatorToolProps> = ({
  metrics,
  onChange
}) => {
  const [copied, setCopied] = useState(false);
  const [vectorInput, setVectorInput] = useState('');
  const [vectorInputError, setVectorInputError] = useState<string | null>(null);

  const { score, vector, severity, impactScore, exploitabilityScore } = calculateCvssScore(metrics);
  const sevBadge = getSeverityBadgeColor(severity);

  const handleCopyVector = () => {
    navigator.clipboard.writeText(vector);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPreset = (presetMetrics: CvssMetrics) => {
    onChange(presetMetrics);
    setVectorInputError(null);
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_CVSS });
    setVectorInput('');
    setVectorInputError(null);
  };

  const handleParseManualVector = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = vectorInput.trim();
    if (!clean) return;

    if (!clean.toUpperCase().includes('CVSS:3.1') && !clean.toUpperCase().includes('AV:')) {
      setVectorInputError('Vetor inválido. O formato esperado é CVSS:3.1/AV:.../AC:... etc.');
      return;
    }

    try {
      const parsed = parseCvssVector(clean);
      onChange(parsed);
      setVectorInput('');
      setVectorInputError(null);
    } catch {
      setVectorInputError('Falha ao processar vetor CVSS.');
    }
  };

  // Score bar percentage
  const scorePercent = Math.min(Math.max((score / 10) * 100, 0), 100);

  const getScoreGradientColor = (s: number) => {
    if (s >= 9.0) return 'from-red-500 to-rose-600';
    if (s >= 7.0) return 'from-orange-500 to-amber-600';
    if (s >= 4.0) return 'from-yellow-400 to-amber-500';
    if (s > 0) return 'from-blue-400 to-indigo-500';
    return 'from-zinc-500 to-zinc-600';
  };

  return (
    <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl flex flex-col space-y-4 p-4 sm:p-5 font-mono text-xs">
      
      {/* Top Bar: Title & Scorecard */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
        
        {/* Left: Score & Severity Gauge */}
        <div className="flex items-center gap-4">
          <div className="relative flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] shadow-lg">
            <span className="text-3xl font-light tracking-tighter text-white font-mono leading-none">
              {score.toFixed(1)}
            </span>
            <span className={`mt-1 px-1.5 py-0.2 text-[9px] rounded font-bold border uppercase ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
              {severity}
            </span>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                <span>FIRST CVSS v3.1 Base Score</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {score >= 9.0 ? 'Ação Crítica Imediata' : score >= 7.0 ? 'Alto Risco para o Negócio' : score >= 4.0 ? 'Severidade Moderada' : 'Baixo Impacto'}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden relative">
              <div 
                className={`h-full bg-gradient-to-r ${getScoreGradientColor(score)} transition-all duration-300 rounded-full`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>

            {/* Subscores */}
            <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
              <span>Explorabilidade: <strong className="text-zinc-200">{exploitabilityScore}</strong>/3.9</span>
              <span>Impacto (ISS): <strong className="text-zinc-200">{impactScore}</strong>/6.0</span>
              <span>Escopo: <strong className={metrics.s === 'C' ? 'text-red-400' : 'text-zinc-300'}>{metrics.s === 'C' ? 'Alterado' : 'Contido'}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Copy Vector Button & Reset */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyVector}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#282828] border border-[#333] text-zinc-200 text-[11px] transition-colors"
              title="Copiar vetor CVSS completo"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? 'Vetor Copiado!' : 'Copiar Vetor'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors"
              title="Restaurar valores padrão"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <span className="text-[10px] text-zinc-500 select-all font-mono truncate max-w-[280px]">
            {vector}
          </span>
        </div>

      </div>

      {/* Vector Direct Input Bar & Quick Security Presets */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          
          {/* Quick Presets Dropdown Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Presets:</span>
            </span>
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset.metrics)}
                className="shrink-0 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#222] border border-[#262626] hover:border-zinc-500 text-[10px] text-zinc-300 transition-colors flex items-center gap-1.5"
                title={`${preset.desc} (${preset.score})`}
              >
                <span>{preset.name}</span>
                <span className="text-zinc-500">[{preset.score.split(' ')[0]}]</span>
              </button>
            ))}
          </div>

          {/* Direct Vector String Input */}
          <form onSubmit={handleParseManualVector} className="flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              placeholder="Colar vetor CVSS:3.1/..."
              value={vectorInput}
              onChange={(e) => {
                setVectorInput(e.target.value);
                setVectorInputError(null);
              }}
              className="bg-[#121212] border border-[#262626] rounded px-2.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none font-mono w-44 sm:w-48"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold border border-zinc-700 transition-colors"
            >
              Importar
            </button>
          </form>
        </div>

        {vectorInputError && (
          <p className="text-[10px] text-rose-400 font-mono">{vectorInputError}</p>
        )}
      </div>

      {/* Metric Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        
        {/* Column 1: Exploitability Metrics */}
        <div className="space-y-3 bg-[#111111] p-3.5 rounded-xl border border-[#222]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#222]">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Métricas de Explorabilidade (Exploitability)
            </span>
          </div>

          {/* Attack Vector (AV) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Attack Vector (AV)
              </label>
              <span className="text-[10px] text-zinc-500">
                {ATTACK_VECTORS.find(o => o.value === metrics.av)?.description}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {ATTACK_VECTORS.map(opt => {
                const isSelected = metrics.av === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...metrics, av: opt.value })}
                    className={`px-2 py-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500/50 text-white shadow-sm'
                        : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">{opt.shortLabel}</span>
                      <span className="text-[9px] font-mono opacity-70">({opt.value})</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attack Complexity (AC) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Attack Complexity (AC)
              </label>
              <span className="text-[10px] text-zinc-500">
                {ATTACK_COMPLEXITIES.find(o => o.value === metrics.ac)?.description}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ATTACK_COMPLEXITIES.map(opt => {
                const isSelected = metrics.ac === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...metrics, ac: opt.value })}
                    className={`px-2.5 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                        : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-bold text-[11px]">{opt.label}</span>
                    <span className="text-[9px] text-zinc-500">{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privileges Required (PR) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Privileges Required (PR)
              </label>
              <span className="text-[10px] text-zinc-500">
                {PRIVILEGES_REQUIRED.find(o => o.value === metrics.pr)?.description}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PRIVILEGES_REQUIRED.map(opt => {
                const isSelected = metrics.pr === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...metrics, pr: opt.value })}
                    className={`px-2 py-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/50 text-white shadow-sm'
                        : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">{opt.shortLabel}</span>
                      <span className="text-[9px] font-mono opacity-70">({opt.value})</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Interaction (UI) & Scope (S) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            
            {/* User Interaction */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                User Interaction (UI)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {USER_INTERACTIONS.map(opt => {
                  const isSelected = metrics.ui === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...metrics, ui: opt.value })}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                          : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-bold text-[11px]">{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Scope (S)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SCOPES.map(opt => {
                  const isSelected = metrics.s === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...metrics, s: opt.value })}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                        isSelected
                          ? opt.value === 'C'
                            ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-sm'
                            : 'bg-zinc-700/30 border-zinc-500 text-white shadow-sm'
                          : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-bold text-[11px]">{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Column 2: Impact Metrics (CIA Triad) */}
        <div className="space-y-3 bg-[#111111] p-3.5 rounded-xl border border-[#222]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#222]">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Métricas de Impacto (Tríade CIA)
            </span>
          </div>

          {/* Confidentiality Impact (C) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-red-400" />
                <span>Confidencialidade (C)</span>
              </label>
              <span className="text-[10px] text-zinc-500">
                {IMPACT_LEVELS.find(o => o.value === metrics.c)?.description}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {IMPACT_LEVELS.map(opt => {
                const isSelected = metrics.c === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...metrics, c: opt.value })}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? opt.value === 'H' 
                          ? 'bg-red-500/20 border-red-500/60 text-white font-bold shadow-sm'
                          : opt.value === 'L'
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-white font-bold'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-300'
                        : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Integrity Impact (I) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-amber-400" />
                <span>Integridade (I)</span>
              </label>
              <span className="text-[10px] text-zinc-500">
                {IMPACT_LEVELS.find(o => o.value === metrics.i)?.description}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {IMPACT_LEVELS.map(opt => {
                const isSelected = metrics.i === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...metrics, i: opt.value })}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? opt.value === 'H' 
                          ? 'bg-red-500/20 border-red-500/60 text-white font-bold shadow-sm'
                          : opt.value === 'L'
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-white font-bold'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-300'
                        : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Availability Impact (A) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3 h-3 text-blue-400" />
                <span>Disponibilidade (A)</span>
              </label>
              <span className="text-[10px] text-zinc-500">
                {IMPACT_LEVELS.find(o => o.value === metrics.a)?.description}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {IMPACT_LEVELS.map(opt => {
                const isSelected = metrics.a === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...metrics, a: opt.value })}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? opt.value === 'H' 
                          ? 'bg-red-500/20 border-red-500/60 text-white font-bold shadow-sm'
                          : opt.value === 'L'
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-white font-bold'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-300'
                        : 'bg-[#161616] border-[#242424] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Practical Bug Bounty Tip */}
          <div className="p-2.5 rounded-lg bg-[#161616] border border-[#262626] text-[10px] text-zinc-400 leading-relaxed">
            <span className="font-bold text-zinc-300">Dica de Triagem:</span> O impacto da tríade CIA define o teto do bounty. Para atingir <span className="text-red-400 font-bold">Critical (9.0+)</span> no CVSS v3.1, demonstre pelo menos dois impactos em nível High (ex: C:H e I:H em RCE) combinados com AV:N e AC:L.
          </div>

        </div>

      </div>

    </div>
  );
};
