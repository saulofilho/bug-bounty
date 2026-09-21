import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  Send, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Code, 
  Plus, 
  Trash2, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { 
  generateCsrfPoc, 
  CsrfParam, 
  CsrfMethod, 
  CsrfEncoding, 
  SameSiteCookiePolicy 
} from '../utils/csrfPocEngine';

interface CsrfPocStudioProps {
  reportId?: string;
  targetEndpoint?: string;
}

export const CsrfPocStudio: React.FC<CsrfPocStudioProps> = ({
  reportId,
  targetEndpoint
}) => {
  const [targetUrl, setTargetUrl] = useState<string>(targetEndpoint || 'https://api.empresa.corp/v1/account/update-email');
  const [method, setMethod] = useState<CsrfMethod>('POST');
  const [encoding, setEncoding] = useState<CsrfEncoding>('application/x-www-form-urlencoded');
  const [params, setParams] = useState<CsrfParam[]>([
    { key: 'email', value: 'attacker@evil.corp' },
    { key: 'role', value: 'admin' },
    { key: 'newsletter_optin', value: 'false' }
  ]);
  const [customJsonBody, setCustomJsonBody] = useState<string>('{"email":"attacker@evil.corp","isAdmin":true}');
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [useHiddenIframe, setUseHiddenIframe] = useState<boolean>(true);
  const [sameSitePolicy, setSameSitePolicy] = useState<SameSiteCookiePolicy>('Lax');
  const [antiCsrfTokenPresent, setAntiCsrfTokenPresent] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const pocResult = useMemo(() => {
    return generateCsrfPoc({
      targetUrl,
      method,
      encoding,
      params,
      customJsonBody,
      autoSubmit,
      useHiddenIframe,
      sameSitePolicy,
      antiCsrfTokenPresent
    });
  }, [targetUrl, method, encoding, params, customJsonBody, autoSubmit, useHiddenIframe, sameSitePolicy, antiCsrfTokenPresent]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([pocResult.htmlSource], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csrf_poc_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddParam = () => {
    setParams(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveParam = (index: number) => {
    setParams(prev => prev.filter((_, i) => i !== index));
  };

  const handleParamChange = (index: number, field: 'key' | 'value', val: string) => {
    setParams(prev => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>CSRF PoC Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Gerador de Exploit HTML para Bug Bounty</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Gerador de Prova de Conceito CSRF</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Crie arquivos HTML reproduzíveis com submissão automática via <code className="text-amber-300">iframe</code> oculto para anexar a relatórios de Cross-Site Request Forgery, com matriz de viabilidade considerando cookies <code className="text-amber-300">SameSite (Lax / Strict / None)</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-download-csrf-poc"
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-mono font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo .html</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Parameters & Code Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Attack Vector Parameters */}
        <div className="lg:col-span-6 space-y-5">
          {/* Target URL & Method */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">1. Endpoint Alvo & Verbo HTTP</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">URL da Ação Vulnerável:</label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  placeholder="https://alvo.corp/api/change-password"
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#232330] text-zinc-200 font-mono text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 block mb-1">Método:</label>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                    {(['POST', 'GET'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`py-1.5 rounded-lg font-bold transition-all ${
                          method === m ? 'bg-amber-500 text-black shadow-sm' : 'bg-[#181824] text-zinc-400 hover:bg-[#202030]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 block mb-1">Tipo de Codificação (enctype):</label>
                  <select
                    value={encoding}
                    onChange={e => setEncoding(e.target.value as CsrfEncoding)}
                    disabled={method === 'GET'}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#181824] border border-[#232332] text-xs font-mono text-zinc-300 focus:outline-none"
                  >
                    <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                    <option value="multipart/form-data">multipart/form-data</option>
                    <option value="text/plain (JSON Trick)">text/plain (Truque JSON)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Parameters or Raw JSON */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                {encoding === 'text/plain (JSON Trick)' ? '2. Payload JSON (Raw Trick)' : `2. Parâmetros Forjados (${params.length})`}
              </h3>
              {encoding !== 'text/plain (JSON Trick)' && (
                <button
                  type="button"
                  onClick={handleAddParam}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] text-amber-400 text-xs font-mono flex items-center gap-1 border border-[#2c2c3e] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Campo</span>
                </button>
              )}
            </div>

            {encoding === 'text/plain (JSON Trick)' ? (
              <textarea
                rows={4}
                value={customJsonBody}
                onChange={e => setCustomJsonBody(e.target.value)}
                placeholder='{"email":"attacker@evil.corp","role":"admin"}'
                className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#232330] text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500/50"
              />
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {params.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.key}
                      onChange={e => handleParamChange(idx, 'key', e.target.value)}
                      placeholder="Nome do campo (ex: email)"
                      className="w-1/2 px-2.5 py-1.5 rounded-lg bg-[#0c0c10] border border-[#232330] text-zinc-300 font-mono text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={p.value}
                      onChange={e => handleParamChange(idx, 'value', e.target.value)}
                      placeholder="Valor forjado (ex: attacker@corp)"
                      className="w-1/2 px-2.5 py-1.5 rounded-lg bg-[#0c0c10] border border-[#232330] text-amber-300 font-mono text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveParam(idx)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environmental Checks: SameSite & Anti-CSRF */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">3. Políticas de Cookie & Token Anti-CSRF</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-zinc-400">Atributo SameSite do Cookie de Sessão:</label>
                <select
                  value={sameSitePolicy}
                  onChange={e => setSameSitePolicy(e.target.value as SameSiteCookiePolicy)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#181824] border border-[#232332] text-zinc-300 focus:outline-none"
                >
                  <option value="None">SameSite=None (Altamente Vulnerável)</option>
                  <option value="Lax">SameSite=Lax (Padrão Navegadores)</option>
                  <option value="Strict">SameSite=Strict (Bloqueio Total)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={antiCsrfTokenPresent}
                    onChange={e => setAntiCsrfTokenPresent(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>Endpoint exige Token Anti-CSRF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoSubmit}
                    onChange={e => setAutoSubmit(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>Auto-executar ao carregar (onload)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Viability Verdict + Generated HTML PoC Source */}
        <div className="lg:col-span-6 space-y-5">
          {/* Viability Verdict Card */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Viabilidade do Ataque</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                pocResult.viabilityStatus === 'HIGHLY_EXPLOITABLE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                pocResult.viabilityStatus === 'CONDITIONALLY_EXPLOITABLE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {pocResult.viabilityStatus === 'HIGHLY_EXPLOITABLE' ? 'Altamente Explorável (1-Click)' :
                 pocResult.viabilityStatus === 'CONDITIONALLY_EXPLOITABLE' ? 'Exploração Condicional' :
                 pocResult.viabilityStatus === 'BLOCKED_BY_SAMESITE' ? 'Bloqueado por SameSite' : 'Defendido com Token'}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {pocResult.viabilityExplanation}
            </p>
          </div>

          {/* Generated HTML Code */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Código HTML da PoC Gerada</h3>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('csrf-html', pocResult.htmlSource)}
                className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
              >
                {copiedKey === 'csrf-html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar HTML</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-amber-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[380px]">
                {pocResult.htmlSource}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
