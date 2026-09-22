import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Terminal, 
  Copy, 
  Check, 
  ShieldAlert, 
  Code2, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  Server, 
  Sparkles, 
  Lock, 
  Zap, 
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { 
  GRAPHQL_VULNERABILITIES, 
  GraphQLSecurityVulnerability, 
  generateGraphQLAuditSuite, 
  GraphQLEndpointAudit 
} from '../utils/graphqlSecurityEngine';

export const GraphQLSecurityAuditor: React.FC = () => {
  const [targetEndpoint, setTargetEndpoint] = useState<string>('https://api.empresa.com/graphql');
  const [selectedVulnId, setSelectedVulnId] = useState<string>('introspection-enabled');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const auditSuite: GraphQLEndpointAudit = useMemo(() => {
    return generateGraphQLAuditSuite(targetEndpoint);
  }, [targetEndpoint]);

  const selectedVuln = useMemo(() => {
    return GRAPHQL_VULNERABILITIES.find(v => v.id === selectedVulnId) || GRAPHQL_VULNERABILITIES[0];
  }, [selectedVulnId]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generatedCurl = useMemo(() => {
    const compactQuery = JSON.stringify({ query: selectedVuln.payloadTemplate });
    return `curl -X POST "${targetEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${compactQuery.replace(/'/g, "'\\''")}'`;
  }, [targetEndpoint, selectedVuln]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#13131c] border border-[#232332] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>GraphQL Security & Introspection Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">OWASP GraphQL Cheat Sheet Compliance</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Auditor de Segurança GraphQL & Introspecção
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              Avalie endpoints GraphQL contra riscos de introspecção exposta em produção, negação de serviço por recursão profunda (Query Depth DoS), bypass de rate limiting por múltiplos aliases (Batching Attack) e vazamento por sugestões de campos.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Risco Mais Crítico</span>
            <span className="text-sm font-mono font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20 inline-block mt-0.5">
              Schema Leak + Batching Bypass
            </span>
          </div>
        </div>

        {/* Vector Tabs */}
        <div className="mt-4 pt-3.5 border-t border-[#20202e] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-mono text-[11px] uppercase">Vetores de Auditoria:</span>
          {GRAPHQL_VULNERABILITIES.map(vuln => (
            <button
              key={vuln.id}
              onClick={() => setSelectedVulnId(vuln.id)}
              className={`px-3 py-1 rounded-lg font-mono text-xs transition-colors border ${
                selectedVulnId === vuln.id
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                  : 'bg-[#181824] text-zinc-400 hover:text-zinc-200 border-[#2a2a3c]'
              }`}
            >
              {vuln.name.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoint Input & Vector Selection */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>Configuração do Alvo GraphQL</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300">
                Endpoint URL da API:
              </label>
              <input
                type="text"
                value={targetEndpoint}
                onChange={e => setTargetEndpoint(e.target.value)}
                placeholder="https://api.empresa.com/graphql"
                className="w-full bg-[#1b1b26] border border-[#2d2d40] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Vector Card Description */}
            <div className="p-4 rounded-xl bg-[#191926] border border-[#272738] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{selectedVuln.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  CVSS {selectedVuln.cvssScore.toFixed(1)}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 block">
                Categoria: <strong className="text-zinc-200">{selectedVuln.category}</strong>
              </span>
              <p className="text-zinc-300 leading-relaxed pt-1">
                {selectedVuln.description}
              </p>
            </div>

            {/* Hardening Snippet */}
            <div className="space-y-2 pt-2 border-t border-[#20202e]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-mono font-bold text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Código de Mitigação (Apollo / Node.js):</span>
                </span>
                <button
                  onClick={() => copyToClipboard(selectedVuln.remediationSnippet, 'remed-code')}
                  className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] flex items-center gap-1"
                >
                  {copiedField === 'remed-code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-[#0e1610] border border-emerald-500/30 text-xs font-mono text-emerald-300 overflow-x-auto">
                {selectedVuln.remediationSnippet}
              </pre>
            </div>
          </div>

          {/* OWASP Checklist Box */}
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Checklist de Hardening GraphQL (OWASP)</span>
            </h4>
            <div className="space-y-2 text-xs">
              {auditSuite.securityChecklist.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#181826] border border-[#262638] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">{item.item}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      item.status === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: GraphQL Payload & PoC cURL */}
        <div className="lg:col-span-7 space-y-5">
          {/* Query Payload Editor */}
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#20202e] pb-3">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>Payload de Consulta GraphQL</span>
              </span>
              <button
                onClick={() => copyToClipboard(selectedVuln.payloadTemplate, 'payload-ql')}
                className="px-2.5 py-1 rounded bg-[#20202e] hover:bg-[#2b2b3d] text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1 transition-colors"
              >
                {copiedField === 'payload-ql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Query</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-black/60 border border-[#222234] text-xs font-mono text-purple-300 overflow-x-auto leading-relaxed max-h-[380px]">
              {selectedVuln.payloadTemplate}
            </pre>
          </div>

          {/* cURL Generation */}
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#20202e] pb-3">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Comando PoC de Reprodução cURL</span>
              </span>
              <button
                onClick={() => copyToClipboard(generatedCurl, 'curl-ql')}
                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-1 transition-colors border border-cyan-500/30"
              >
                {copiedField === 'curl-ql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar cURL</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-black/60 border border-[#222234] text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
              {generatedCurl}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
