import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  CheckCircle2, 
  Server, 
  Terminal, 
  Flame, 
  Layers,
  Info
} from 'lucide-react';
import { auditSecurityHeaders, SAMPLE_HTTP_HEADERS } from '../utils/securityHeadersEngine';

export const SecurityHeadersAuditor: React.FC = () => {
  const [headersInput, setHeadersInput] = useState<string>(SAMPLE_HTTP_HEADERS[0].raw);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'nginx' | 'apache' | 'caddy' | 'expressHelmet'>('nginx');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const auditResult = useMemo(() => {
    return auditSecurityHeaders(headersInput);
  }, [headersInput]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
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
      {/* Top Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Security Headers Auditor</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Auditoria de Defesa em Profundidade</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Auditor e Gerador de Cabeçalhos HTTP Seguros</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Analise instantaneamente os cabeçalhos de resposta HTTP do servidor: verifique <code className="text-emerald-300">HSTS</code>, <code className="text-emerald-300">X-Content-Type-Options</code>, <code className="text-emerald-300">X-Frame-Options</code>, <code className="text-emerald-300">Referrer-Policy</code>, <code className="text-emerald-300">Permissions-Policy</code> e detecte vazamentos de fingerprint em <code className="text-emerald-300">Server</code> e <code className="text-emerald-300">X-Powered-By</code>.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap md:flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Amostras de Headers:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_HTTP_HEADERS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`btn-headers-sample-${idx}`}
                  onClick={() => setHeadersInput(sample.raw)}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] border border-[#29293c] text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  {sample.name.split(' ')[0]} {sample.name.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Raw Headers Input + Grade & Specific Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Headers Input & Snippet Generator */}
        <div className="lg:col-span-6 space-y-5">
          {/* Headers Raw Input */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="headers-raw-input" className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Headers HTTP Brutos (Cole curl -I ou resposta do browser):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('raw-headers', headersInput)}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
                >
                  {copiedKey === 'raw-headers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeadersInput('')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            <textarea
              id="headers-raw-input"
              rows={6}
              value={headersInput}
              onChange={e => setHeadersInput(e.target.value)}
              placeholder="HTTP/1.1 200 OK&#10;strict-transport-security: max-age=31536000&#10;x-content-type-options: nosniff"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-emerald-300/90 font-mono text-xs focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
            />

            {/* Information Leakage Warning */}
            {auditResult.disclosedServers.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Vazamento de Fingerprint Tecnológico Detectado:</span>
                </div>
                <div className="font-mono text-[11px] text-rose-200">
                  {auditResult.disclosedServers.join(' | ')}
                </div>
                <div className="text-[10px] text-zinc-400">
                  Atacantes usam essas versões para buscar exploits específicos conhecidos de CVEs no NVD.
                </div>
              </div>
            )}
          </div>

          {/* Hardened Web Server Configuration Snippets */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Configuração Pronta para Produção</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {(['nginx', 'apache', 'caddy', 'expressHelmet'] as const).map(target => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setActiveSnippetTab(target)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeSnippetTab === target ? 'bg-emerald-500 text-black font-bold' : 'bg-[#1b1b26] text-zinc-400'}`}
                  >
                    {target === 'nginx' ? 'Nginx' : target === 'apache' ? 'Apache' : target === 'caddy' ? 'Caddy' : 'Express'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px]">
                {auditResult.remediationSnippets[activeSnippetTab]}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(activeSnippetTab, auditResult.remediationSnippets[activeSnippetTab])}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedKey === activeSnippetTab ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Overall Grade & Audit Breakdown */}
        <div className="lg:col-span-6 space-y-5">
          {/* Grade Card */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-6 text-center space-y-3">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Classificação de Cabeçalhos de Segurança</span>
            <div className="flex items-baseline justify-center gap-3">
              <span className={`text-6xl font-black font-mono px-4 py-1 rounded-2xl border ${getGradeBadge(auditResult.grade)}`}>
                {auditResult.grade}
              </span>
              <div className="text-left font-mono">
                <div className="text-2xl font-bold text-white">{auditResult.score}</div>
                <div className="text-xs text-zinc-500">/ 100 pts</div>
              </div>
            </div>

            <div className="flex justify-center gap-4 text-xs font-mono pt-1">
              <span className="text-emerald-400 font-bold">{auditResult.passedCount} Passaram</span>
              <span className="text-yellow-400 font-bold">{auditResult.warnCount} Alertas</span>
              <span className="text-rose-400 font-bold">{auditResult.failCount} Ausentes</span>
            </div>
          </div>

          {/* Audit Items */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Inspeção Detalhada por Cabeçalho</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">OWASP Secure Headers Project</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {auditResult.audits.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    item.status === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    item.status === 'WARN' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                      {item.status === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {item.status === 'WARN' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                      {item.status === 'FAIL' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                      <span>{item.name}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      item.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-300' :
                      item.status === 'WARN' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-rose-500/20 text-rose-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="p-2 rounded-lg bg-[#0c0c10]/70 border border-[#20202e] text-[11px] text-zinc-300 space-y-1">
                    <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Configuração Recomendada:</div>
                    <code className="text-emerald-300 font-mono text-[10px] break-all">{item.recommendedValue}</code>
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
