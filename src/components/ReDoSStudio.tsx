import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  ShieldAlert, 
  Terminal, 
  Copy, 
  Check, 
  Clock, 
  TrendingUp, 
  Code2, 
  ShieldCheck, 
  RotateCcw, 
  Cpu, 
  Activity, 
  Sparkles,
  Info
} from 'lucide-react';
import { analyzeReDosRegex, ReDosAuditReport } from '../utils/redosEngine';

export const ReDoSStudio: React.FC = () => {
  const [regexInput, setRegexInput] = useState<string>('^([a-zA-Z0-9]+)+$');
  const [flags, setFlags] = useState<string>('i');
  const [payloadLength, setPayloadLength] = useState<number>(30);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const report: ReDosAuditReport = useMemo(() => {
    return analyzeReDosRegex(regexInput, flags);
  }, [regexInput, flags]);

  const evilPayload = useMemo(() => {
    return report.finding.evilPayloadGenerator(payloadLength);
  }, [report, payloadLength]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadPreset = (preset: string) => {
    if (preset === 'nested') {
      setRegexInput('^([a-zA-Z0-9]+)+$');
      setFlags('i');
    } else if (preset === 'email') {
      setRegexInput('^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})$');
      setFlags('');
    } else if (preset === 'alternation') {
      setRegexInput('^(a|aa)+$');
      setFlags('');
    } else if (preset === 'url') {
      setRegexInput('^https?://([a-zA-Z0-9]+(\\.[a-zA-Z0-9]+)+)+/.*$');
      setFlags('i');
    } else if (preset === 'safe') {
      setRegexInput('^[a-zA-Z0-9_]{3,32}$');
      setFlags('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#13131c] border border-[#232332] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>ReDoS Studio & Catastrophic Backtracking</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">CWE-1333 Algorithmic Complexity</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Analisador de ReDoS & Complexidade de Regex
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              Detecte expressões regulares vulneráveis a retrocesso catastrófico (backtracking exponencial O(2^n) e polinomial O(n^k)), simule o esgotamento do Event Loop e gere vetores de teste para relatórios de Bug Bounty.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Impacto de Concorrência</span>
            <span className="text-sm font-mono font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20 inline-block mt-0.5">
              Trava 100% da Thread Node.js / Python
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 pt-3.5 border-t border-[#20202e] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-mono text-[11px] uppercase">Cenários Vulneráveis:</span>
          <button
            onClick={() => loadPreset('nested')}
            className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
          >
            Quantificador Aninhado (a+)+
          </button>
          <button
            onClick={() => loadPreset('alternation')}
            className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
          >
            Alternância com Sobreposição (a|aa)+
          </button>
          <button
            onClick={() => loadPreset('email')}
            className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
          >
            Validador de Email Frágil
          </button>
          <button
            onClick={() => loadPreset('url')}
            className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
          >
            Parser de URLs com Domínios
          </button>
          <button
            onClick={() => loadPreset('safe')}
            className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-colors"
          >
            Regex Seguro Linear O(n)
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Regex Input & Parameters */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Expressão Regular Alvo</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300">
                Padrão Regex (Regex Pattern):
              </label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-mono text-base">/</span>
                <input
                  type="text"
                  value={regexInput}
                  onChange={e => setRegexInput(e.target.value)}
                  placeholder="ex: ^([a-zA-Z0-9]+)+$"
                  className="flex-1 bg-[#1b1b26] border border-[#2d2d40] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-zinc-500 font-mono text-base">/</span>
                <input
                  type="text"
                  value={flags}
                  onChange={e => setFlags(e.target.value)}
                  placeholder="flags"
                  className="w-14 bg-[#1b1b26] border border-[#2d2d40] rounded-xl px-2 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Simulated Evil Payload Generator */}
            <div className="space-y-2 pt-2 border-t border-[#20202e]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-zinc-300">
                  Comprimento do Payload Malicioso ({payloadLength} chars):
                </label>
                <span className="text-[11px] font-mono text-amber-400">
                  {payloadLength} iterações
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                value={payloadLength}
                onChange={e => setPayloadLength(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-mono text-[11px]">Payload de Gatilho (Worst-case string):</span>
                  <button
                    onClick={() => copyToClipboard(evilPayload, 'payload')}
                    className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                  >
                    {copiedField === 'payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar Payload</span>
                  </button>
                </div>
                <div className="bg-[#0e0e16] border border-[#20202e] rounded-xl p-2.5 font-mono text-xs text-amber-300 break-all select-all">
                  {evilPayload}
                </div>
              </div>
            </div>

            {/* Remediation code preview */}
            <div className="pt-2 border-t border-[#20202e] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-mono font-bold text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Substituição Segura Sugerida:</span>
                </span>
                <button
                  onClick={() => copyToClipboard(report.recommendedRegex, 'fixed-regex')}
                  className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] flex items-center gap-1"
                >
                  {copiedField === 'fixed-regex' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Regex Seguro</span>
                </button>
              </div>
              <div className="bg-[#0e1610] border border-emerald-500/30 rounded-xl p-2.5 font-mono text-xs text-emerald-300">
                /{report.recommendedRegex}/{flags}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Complexity Growth Curve & Diagnosis */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`border rounded-2xl p-5 shadow-lg space-y-4 ${
            report.finding.type === 'EXPONENTIAL' 
              ? 'bg-[#181010] border-red-500/40' 
              : report.finding.type === 'POLYNOMIAL'
              ? 'bg-[#181410] border-amber-500/40'
              : 'bg-[#101813] border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {report.finding.type === 'EXPONENTIAL' ? (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-mono font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>BACKTRACKING EXPONENCIAL O(2^N)</span>
                  </span>
                ) : report.finding.type === 'POLYNOMIAL' ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>COMPLEXIDADE POLINOMIAL O(N^K)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>TEMPO LINEAR O(N)</span>
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-zinc-400 font-bold">
                CVSS {report.finding.cvssScore.toFixed(1)}
              </span>
            </div>

            <p className="text-xs text-zinc-200 leading-relaxed font-mono bg-black/30 p-3 rounded-xl border border-zinc-800">
              {report.summary}
            </p>

            {/* Growth Table / Progression */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Escalada de Passos & Congelamento da Thread (Estimativa)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-[#2a2a3c] text-[11px] text-zinc-400">
                      <th className="py-1.5 px-2">Tamanho (N)</th>
                      <th className="py-1.5 px-2">Passos de Retrocesso</th>
                      <th className="py-1.5 px-2">Tempo Estimado</th>
                      <th className="py-1.5 px-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202030]">
                    {report.benchmarkSteps.map((step, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 px-2 text-white font-bold">{step.inputLength} chars</td>
                        <td className="py-2 px-2 text-zinc-300">{step.stepCount.toLocaleString()}</td>
                        <td className="py-2 px-2 text-amber-300">{step.timeMs >= 1000 ? `${(step.timeMs / 1000).toFixed(1)}s` : `${step.timeMs}ms`}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            step.status === 'TIMEOUT_RISK' ? 'bg-red-500/20 text-red-300' :
                            step.status === 'DEGRADED' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {step.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Defensive code guards */}
            <div className="pt-2 border-t border-[#26263a] space-y-1.5 text-xs">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                Defesa em Camadas (Node.js / Express Guard)
              </span>
              <pre className="p-2.5 rounded-xl bg-black/50 text-[11px] font-mono text-zinc-300 overflow-x-auto border border-[#222234]">
{`// 1. Guard de Comprimento Máximo (Prevenção Imediata)
if (userInput.length > 64) {
  return res.status(400).json({ error: "Input excede limite aceito" });
}

// 2. Uso de motor linear RE2 (Google RE2)
// npm install re2
const RE2 = require('re2');
const safeRegex = new RE2(/${report.recommendedRegex}/);`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
