import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Copy, 
  Check, 
  Code, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Terminal,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { evaluateCsp, SAMPLE_CSP_POLICIES } from '../utils/cspEvaluatorEngine';

export const CspStudio: React.FC = () => {
  const [policyInput, setPolicyInput] = useState<string>(SAMPLE_CSP_POLICIES[0].policy);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'nginx' | 'apache' | 'expressHelmet' | 'htmlMeta'>('nginx');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const evalResult = useMemo(() => {
    return evaluateCsp(policyInput);
  }, [policyInput]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/20';
      case 'B':
        return 'text-blue-400 border-blue-500/30 bg-blue-500/20';
      case 'C':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/20';
      case 'D':
      case 'F':
      default:
        return 'text-rose-400 border-rose-500/30 bg-rose-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CSP Studio & Evaluator</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Análise de Diretivas & Hardening</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Avaliador & Gerador de Content Security Policy</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Audite sua política de Content Security Policy contra injeção de XSS, bypass via CDNs conhecidas, permissões <code className="text-indigo-300">'unsafe-inline'</code> e ausência de mitigação para clickjacking (<code className="text-indigo-300">frame-ancestors</code>).
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap md:flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Modelos Pré-definidos:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_CSP_POLICIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`btn-sample-csp-${idx}`}
                  onClick={() => setPolicyInput(p.policy)}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#232336] border border-[#2c2c3e] text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer"
                  title={p.description}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Policy Input & Rating + Directives Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Policy Editor & Directives Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          {/* Policy Textarea */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="csp-input" className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                <span>Política CSP Ativa:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('csp-raw', policyInput)}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
                >
                  {copiedKey === 'csp-raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPolicyInput('')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            <textarea
              id="csp-input"
              rows={4}
              value={policyInput}
              onChange={e => setPolicyInput(e.target.value)}
              placeholder="Cole sua string de Content-Security-Policy aqui (ex: default-src 'self'; script-src ...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-indigo-300/90 font-mono text-xs focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Parsed Directives Viewer */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Diretivas Identificadas ({Object.keys(evalResult.parsedDirectives).length})</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">Mapeamento em Tempo Real</span>
            </div>

            {Object.keys(evalResult.parsedDirectives).length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">Nenhuma diretiva detectada. Insira uma política válida acima.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(Object.entries(evalResult.parsedDirectives) as [string, string[]][]).map(([dir, vals]) => (
                  <div key={dir} className="p-2.5 rounded-xl bg-[#161622] border border-[#242436] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">{dir}</span>
                    <div className="flex flex-wrap gap-1">
                      {vals.map((v, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            v === "'unsafe-inline'" || v === '*' || v === 'data:' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            v === "'unsafe-eval'" ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            v === "'self'" || v === "'none'" ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                            'bg-[#202030] text-zinc-300'
                          }`}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ready-to-use Configurations Snippets */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Exportação para Servidores Web</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {(['nginx', 'apache', 'expressHelmet', 'htmlMeta'] as const).map(target => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setActiveSnippetTab(target)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeSnippetTab === target ? 'bg-emerald-500 text-black font-bold' : 'bg-[#1b1b26] text-zinc-400'}`}
                  >
                    {target === 'nginx' ? 'Nginx' : target === 'apache' ? 'Apache' : target === 'expressHelmet' ? 'Express' : 'HTML'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {evalResult.generatedConfigs[activeSnippetTab]}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(activeSnippetTab, evalResult.generatedConfigs[activeSnippetTab])}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedKey === activeSnippetTab ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Config</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Rating Badge & Security Findings */}
        <div className="lg:col-span-5 space-y-5">
          {/* Rating Meter */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-6 text-center space-y-3">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Nota de Proteção CSP</span>
            <div className="flex items-baseline justify-center gap-3">
              <span className={`text-6xl font-black font-mono px-4 py-1 rounded-2xl border ${getRatingColor(evalResult.rating)}`}>
                {evalResult.rating}
              </span>
              <div className="text-left font-mono">
                <div className="text-2xl font-bold text-white">{evalResult.score}</div>
                <div className="text-xs text-zinc-500">/ 100 pts</div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              {evalResult.score >= 85 ? 'Excelente postura com mitigação ativa de XSS e clickjacking.' :
               evalResult.score >= 50 ? 'Proteção moderada; presença de permissões amplas ou ausência de fallbacks.' :
               'Política vulnerável ou ineficiente contra bypass de scripts.'}
            </p>
          </div>

          {/* Audit Findings */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Achados de Hardening ({evalResult.findings.length})</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">W3C CSP Level 3</span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {evalResult.findings.map(finding => (
                <div
                  key={finding.id}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    finding.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' :
                    finding.severity === 'HIGH' ? 'bg-amber-500/10 border-amber-500/30' :
                    finding.severity === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    finding.severity === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    'bg-[#171722] border-[#252538]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {finding.severity === 'CRITICAL' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                      {finding.severity === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {finding.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      finding.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                      finding.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                      finding.severity === 'PASS' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {finding.severity}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {finding.description}
                  </p>

                  <div className="p-2 rounded-lg bg-[#0c0c10]/70 border border-[#20202e] text-[11px] text-zinc-300 space-y-1">
                    <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase">Recomendação:</div>
                    <div>{finding.remediation}</div>
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
