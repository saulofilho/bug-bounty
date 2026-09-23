import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Zap, 
  RefreshCw,
  Sliders,
  Server
} from 'lucide-react';

interface CacheSimulationResult {
  isPoisoned: boolean;
  isDeceptionRisk: boolean;
  cacheKey: string;
  cachedResponseSnippet: string;
  riskDescription: string;
  remediation: string;
}

export const WebCacheSecurityStudio: React.FC = () => {
  const [requestPath, setRequestPath] = useState<string>('/my-account/invoices;style.css');
  const [cacheControlHeader, setCacheControlHeader] = useState<string>('public, max-age=86400');
  const [unkeyedHeaderName, setUnkeyedHeaderName] = useState<string>('X-Forwarded-Host');
  const [unkeyedHeaderValue, setUnkeyedHeaderValue] = useState<string>('attacker-controlled.com');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulation Evaluation
  const simulation = useMemo<CacheSimulationResult>(() => {
    const isPublicCache = cacheControlHeader.toLowerCase().includes('public');
    const isNoStore = cacheControlHeader.toLowerCase().includes('no-store');
    const endsWithStaticExt = /\.(css|js|png|jpg|ico|svg|woff2)$/i.test(requestPath);
    const hasDelimiter = requestPath.includes(';') || requestPath.includes('%0a') || requestPath.includes('..');

    // Web Cache Deception detection
    const isDeceptionRisk = isPublicCache && !isNoStore && endsWithStaticExt && hasDelimiter;

    // Web Cache Poisoning detection
    const isPoisoned = !isNoStore && unkeyedHeaderValue.includes('attacker');

    const cacheKey = `GET https://target.com${requestPath.split('?')[0]}`;
    let cachedSnippet = `HTTP/1.1 200 OK\nCache-Control: ${cacheControlHeader}\nCF-Cache-Status: HIT\nAge: 42\n\n`;

    if (isDeceptionRisk) {
      cachedSnippet += `<!-- Resposta sensível do usuário armazenada em cache CDN por terminação estática -->\n{"user_id": 9921, "api_key": "sec_live_9a8f...", "balance": 14200.00}`;
    } else if (isPoisoned) {
      cachedSnippet += `<script src="https://${unkeyedHeaderValue}/static/analytics.js"></script>\n<h1>Bem-vindo à Loja</h1>`;
    } else {
      cachedSnippet += `<!DOCTYPE html>\n<html><head><title>App Normal</title></head><body>OK</body></html>`;
    }

    let risk = 'Comportamento seguro de cache.';
    let remed = 'Manter cabeçalhos de controle estritos.';

    if (isDeceptionRisk) {
      risk = 'Vulnerabilidade Crítica de Web Cache Deception! A CDN interpretou a terminação como arquivo estático e armazenou dados privados de sessão em cache público compartilhável.';
      remed = 'Configure a CDN para respeitar o Content-Type retornado pelo origin em vez de julgar apenas pela extensão da URL. Adicione Cache-Control: no-store em todas as respostas com dados autenticados.';
    } else if (isPoisoned) {
      risk = 'Vulnerabilidade de Web Cache Poisoning! O cabeçalho ' + unkeyedHeaderName + ' foi refletido no corpo da resposta sem fazer parte da Cache Key da CDN.';
      remed = 'Remova cabeçalhos de encaminhamento (X-Forwarded-Host, X-Original-URL) no proxy reverso de borda ou inclua-os explicitamente na Cache Key.';
    }

    return {
      isPoisoned,
      isDeceptionRisk,
      cacheKey,
      cachedResponseSnippet: cachedSnippet,
      riskDescription: risk,
      remediation: remed
    };
  }, [requestPath, cacheControlHeader, unkeyedHeaderName, unkeyedHeaderValue]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Web Cache Poisoning & Deception Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">CDNs & Proxies Reversos (RFC 7234)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Laboratório de Envenenamento de Cache e Web Cache Deception
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Analise discrepâncias entre a Cache Key computada pela borda (Cloudflare, Fastly, Akamai) e o processamento no servidor de aplicação. Identifique cabeçalhos unkeyed que causam XSS armazenado no cache e confusões de caminho estático.
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Inputs */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Configuração da Requisição & Cabeçalhos de Borda</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-300">Caminho da Requisição (Path):</label>
            <input
              type="text"
              value={requestPath}
              onChange={e => setRequestPath(e.target.value)}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-300">Cabeçalho Cache-Control Retornado:</label>
            <input
              type="text"
              value={cacheControlHeader}
              onChange={e => setCacheControlHeader(e.target.value)}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-300">Cabeçalho Não-Chaveado (Unkeyed Header):</label>
            <input
              type="text"
              value={unkeyedHeaderName}
              onChange={e => setUnkeyedHeaderName(e.target.value)}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-300">Valor Injetado no Cabeçalho:</label>
            <input
              type="text"
              value={unkeyedHeaderValue}
              onChange={e => setUnkeyedHeaderValue(e.target.value)}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-2 pt-1 text-[11px] font-mono overflow-x-auto scrollbar-none">
          <span className="text-zinc-500 text-[10px] uppercase font-bold shrink-0">Cenários:</span>
          <button
            type="button"
            onClick={() => {
              setRequestPath('/user/dashboard;style.css');
              setCacheControlHeader('public, max-age=3600');
              setUnkeyedHeaderValue('clean.com');
            }}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-rose-300 border border-rose-500/30 whitespace-nowrap"
          >
            Web Cache Deception (.css path delimiter)
          </button>
          <button
            type="button"
            onClick={() => {
              setRequestPath('/home');
              setCacheControlHeader('public, s-maxage=3600');
              setUnkeyedHeaderName('X-Forwarded-Host');
              setUnkeyedHeaderValue('attacker-js-host.com');
            }}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-amber-300 border border-amber-500/30 whitespace-nowrap"
          >
            Host Header Poisoning
          </button>
          <button
            type="button"
            onClick={() => {
              setRequestPath('/api/user');
              setCacheControlHeader('private, no-cache, no-store');
              setUnkeyedHeaderValue('clean.com');
            }}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-emerald-300 border border-emerald-500/30 whitespace-nowrap"
          >
            Configuração Segura (no-store)
          </button>
        </div>
      </div>

      {/* Simulation Result Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Status & Diagnostics */}
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Diagnóstico do Cache de Borda (CDN Cache Key)</span>
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
              <span className="text-zinc-400">Cache Key Computada:</span>
              <div className="text-cyan-300 font-bold break-all">{simulation.cacheKey}</div>
            </div>

            <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Status de Risco:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  simulation.isDeceptionRisk ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  simulation.isPoisoned ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {simulation.isDeceptionRisk ? 'CACHE DECEPTION CRÍTICO' : simulation.isPoisoned ? 'CACHE POISONING ATIVO' : 'PROTEGIDO'}
                </span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">{simulation.riskDescription}</p>
              <div className="text-emerald-400 text-[11px] pt-1">
                <strong>Remediação:</strong> {simulation.remediation}
              </div>
            </div>
          </div>
        </div>

        {/* Cached Response Preview */}
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Resposta Armazenada no Cache (Servida a Outros Usuários)</span>
            </h3>
            <button
              type="button"
              onClick={() => handleCopy('cache-resp', simulation.cachedResponseSnippet)}
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedKey === 'cache-resp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2a] text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
            {simulation.cachedResponseSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
