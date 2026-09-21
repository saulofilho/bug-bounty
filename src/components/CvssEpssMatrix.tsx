import React, { useState, useMemo } from 'react';
import { 
  Crosshair, 
  TrendingUp, 
  Flame, 
  AlertOctagon, 
  Clock, 
  ShieldAlert, 
  Zap, 
  Copy, 
  Check, 
  Sliders, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { 
  computeEpssPriority, 
  SAMPLE_EPSS_DATASET, 
  EpssPrioritizationItem, 
  RemediationPriority 
} from '../utils/epssPrioritizerEngine';

interface CvssEpssMatrixProps {
  reportId?: string;
  reportTitle?: string;
  cvssScore?: number;
}

export const CvssEpssMatrix: React.FC<CvssEpssMatrixProps> = ({
  reportId,
  reportTitle,
  cvssScore = 8.5
}) => {
  const [customCvss, setCustomCvss] = useState<number>(cvssScore);
  const [customEpssProb, setCustomEpssProb] = useState<number>(0.35); // 35% probability
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<EpssPrioritizationItem>(SAMPLE_EPSS_DATASET[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Computed priority for interactive sliders
  const activePriorityResult = useMemo(() => {
    return computeEpssPriority(customCvss, customEpssProb);
  }, [customCvss, customEpssProb]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredDataset = useMemo(() => {
    if (filterPriority === 'ALL') return SAMPLE_EPSS_DATASET;
    return SAMPLE_EPSS_DATASET.filter(item => item.priority === filterPriority);
  }, [filterPriority]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                <span>CVSS v4.0 + FIRST EPSS Prioritizer</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Threat-Informed Remediation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Priorização de Vulnerabilidades: CVSS v4 vs. EPSS</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Combine a severidade teórica do <strong className="text-zinc-200">CVSS v4.0</strong> com a probabilidade empírica de exploração real nos próximos 30 dias pelo <strong className="text-zinc-200">FIRST EPSS (Exploit Prediction Scoring System)</strong> para focar remediações nos alvos prioritários (P0 / P1).
            </p>
          </div>

          <div className="bg-[#171722] border border-[#272738] rounded-xl p-3 shrink-0 flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Contexto Atual</div>
              <div className="text-xs font-mono font-bold text-white truncate max-w-[150px]">{reportId || 'Custom Eval'}</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center font-mono font-bold text-sm border border-red-500/30">
              {customCvss.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive 2D Matrix / Sliders + Remediation Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Sliders & Visual 2D Risk Quadrant */}
        <div className="lg:col-span-7 space-y-5">
          {/* Interactive Calculator Controls */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">Simulador Dinâmico de Prioridade</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">Arraste para calibrar</span>
            </div>

            <div className="space-y-4">
              {/* CVSS v4 Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">1. Pontuação CVSS v4.0 (Severidade Base):</span>
                  <span className="text-emerald-400 font-bold text-sm">{customCvss.toFixed(1)} / 10.0</span>
                </div>
                <input
                  type="range"
                  id="range-cvss-slider"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={customCvss}
                  onChange={e => setCustomCvss(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>0.0 (Baixo Risco)</span>
                  <span>7.0 (Threshold Alto)</span>
                  <span>10.0 (Crítico)</span>
                </div>
              </div>

              {/* EPSS Probability Slider */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">2. Probabilidade EPSS (Exploração em 30 dias):</span>
                  <span className="text-red-400 font-bold text-sm">{(customEpssProb * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  id="range-epss-slider"
                  min="0.001"
                  max="1.0"
                  step="0.005"
                  value={customEpssProb}
                  onChange={e => setCustomEpssProb(parseFloat(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>0% (Sem exploit no horizonte)</span>
                  <span>10% (Threshold Crítico de Arma)</span>
                  <span>100% (Arma em circulação massiva)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2D Matrix Visual Representation */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span>Matriz 2D de Risco Correlacionado</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              {/* Quadrant P1: High CVSS, Low EPSS */}
              <div className={`p-4 rounded-xl border transition-all ${
                activePriorityResult.priority === 'P1_HIGH' ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-2 ring-amber-500/40 shadow-lg' : 'bg-[#151520] border-[#222232] text-zinc-400'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">P1 - Risco Inerente</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">SLA: 7 dias</span>
                </div>
                <p className="text-[11px] leading-relaxed">CVSS ≥ 7.0 & EPSS &lt; 10%</p>
                <div className="text-[10px] text-zinc-500 mt-2">Dano severo, sem campanha massiva ativa ainda.</div>
              </div>

              {/* Quadrant P0: High CVSS, High EPSS */}
              <div className={`p-4 rounded-xl border transition-all ${
                activePriorityResult.priority === 'P0_IMMEDIATE' ? 'bg-rose-500/25 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 shadow-lg' : 'bg-[#151520] border-[#222232] text-zinc-400'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>P0 - Ação Imediata</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold">SLA: 24-48h</span>
                </div>
                <p className="text-[11px] leading-relaxed">CVSS ≥ 7.0 & EPSS ≥ 10%</p>
                <div className="text-[10px] text-zinc-500 mt-2">Alvo de campanhas de exploração ativa.</div>
              </div>

              {/* Quadrant P3: Low CVSS, Low EPSS */}
              <div className={`p-4 rounded-xl border transition-all ${
                activePriorityResult.priority === 'P3_STANDARD' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40 shadow-lg' : 'bg-[#151520] border-[#222232] text-zinc-400'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">P3 - Manutenção Padrão</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">SLA: 30 dias</span>
                </div>
                <p className="text-[11px] leading-relaxed">CVSS &lt; 7.0 & EPSS &lt; 10%</p>
                <div className="text-[10px] text-zinc-500 mt-2">Baixa severidade e sem exploit ativo.</div>
              </div>

              {/* Quadrant P2: Low CVSS, High EPSS */}
              <div className={`p-4 rounded-xl border transition-all ${
                activePriorityResult.priority === 'P2_ELEVATED' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200 ring-2 ring-yellow-500/40 shadow-lg' : 'bg-[#151520] border-[#222232] text-zinc-400'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">P2 - Oportunista</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">SLA: 14 dias</span>
                </div>
                <p className="text-[11px] leading-relaxed">CVSS &lt; 7.0 & EPSS ≥ 10%</p>
                <div className="text-[10px] text-zinc-500 mt-2">Scanners e bots mirando em massa.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Verdict Card & Benchmark Dataset */}
        <div className="lg:col-span-5 space-y-5">
          {/* Priority Verdict Card */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-6 space-y-4">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Parecer de Remediação & SLA</span>
            <div className="p-4 rounded-xl border space-y-2.5 bg-[#161622] border-[#252538]">
              <div className="flex items-center justify-between">
                <span className={`text-base font-bold font-mono ${
                  activePriorityResult.priority === 'P0_IMMEDIATE' ? 'text-rose-400' :
                  activePriorityResult.priority === 'P1_HIGH' ? 'text-amber-400' :
                  activePriorityResult.priority === 'P2_ELEVATED' ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {activePriorityResult.label}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#202030] text-zinc-300 text-xs font-mono font-bold border border-[#2c2c40]">
                  SLA: {activePriorityResult.slaDays} dias
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {activePriorityResult.rationale}
              </p>

              <div className="pt-2 border-t border-[#232332] space-y-1 text-xs">
                <div className="font-mono font-bold text-red-400 text-[11px] uppercase">Ação Tática Imediata:</div>
                <div className="text-zinc-300">{activePriorityResult.tacticalAction}</div>
              </div>
            </div>
          </div>

          {/* Benchmark CVE Dataset Table */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">CVEs Reais com EPSS Ativo</h3>
              </div>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="px-2 py-1 rounded-lg bg-[#181824] border border-[#272738] text-xs font-mono text-zinc-300 focus:outline-none"
              >
                <option value="ALL">Todas Prioridades</option>
                <option value="P0_IMMEDIATE">P0 Ação Imediata</option>
                <option value="P1_HIGH">P1 Risco Alto</option>
                <option value="P2_ELEVATED">P2 Oportunista</option>
                <option value="P3_STANDARD">P3 Padrão</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredDataset.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setCustomCvss(item.cvssV4Score);
                    setCustomEpssProb(item.epssProbability);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedItem.id === item.id ? 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/30' : 'bg-[#151520] border-[#222232] hover:bg-[#1a1a28]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-zinc-200">{item.cve}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      item.priority === 'P0_IMMEDIATE' ? 'bg-rose-500/20 text-rose-300' :
                      item.priority === 'P1_HIGH' ? 'bg-amber-500/20 text-amber-300' :
                      item.priority === 'P2_ELEVATED' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {item.priority.split('_')[0]}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate mt-1">{item.title}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-zinc-500">
                    <span>CVSS v4: <strong className="text-zinc-300">{item.cvssV4Score.toFixed(1)}</strong></span>
                    <span>EPSS: <strong className="text-red-400">{(item.epssProbability * 100).toFixed(1)}%</strong></span>
                    <span>Percentil: <strong className="text-zinc-300">{(item.epssPercentile * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
