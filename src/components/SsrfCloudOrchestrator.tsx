import React, { useState, useMemo } from 'react';
import { 
  Cloud, 
  Terminal, 
  Copy, 
  Check, 
  ShieldAlert, 
  Zap, 
  ExternalLink, 
  Server, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Radio,
  FileCode
} from 'lucide-react';
import { 
  CLOUD_METADATA_DATABASE, 
  CloudMetadataEndpoint, 
  generateSsrfBypasses, 
  SsrfBypassVariation 
} from '../utils/ssrfCloudEngine';

export const SsrfCloudOrchestrator: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string>('AWS');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('aws-iam-role');
  const [targetPath, setTargetPath] = useState<string>('/latest/meta-data/iam/security-credentials/');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Available endpoints for current provider
  const availableEndpoints = useMemo(() => {
    return CLOUD_METADATA_DATABASE.filter(ep => ep.provider === selectedProvider);
  }, [selectedProvider]);

  // Active endpoint
  const activeEndpoint = useMemo(() => {
    return CLOUD_METADATA_DATABASE.find(ep => ep.id === selectedEndpointId) || availableEndpoints[0];
  }, [selectedEndpointId, availableEndpoints]);

  // Bypass variations
  const bypassVariations: SsrfBypassVariation[] = useMemo(() => {
    return generateSsrfBypasses(targetPath);
  }, [targetPath]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const firstEp = CLOUD_METADATA_DATABASE.find(ep => ep.provider === provider);
    if (firstEp) {
      setSelectedEndpointId(firstEp.id);
      // Auto-adjust path
      try {
        const url = new URL(firstEp.endpointUrl);
        setTargetPath(url.pathname + url.search);
      } catch {
        setTargetPath(firstEp.endpointUrl);
      }
    }
  };

  const providers = ['AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'DigitalOcean'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#13131c] border border-[#232332] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                <span>Cloud SSRF & Metadata Exploitation Suite</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">CWE-918 Server-Side Request Forgery</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Orquestrador de Payloads SSRF & Metadados em Nuvem
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              Catálogo de vetores para exfiltração de credenciais de instâncias em nuvem (AWS IMDSv1/v2, GCP Metadata, Azure Managed Identity, Kubelet e Docker API), com gerador de evasão de filtros (Decimal DWORD, Hex, Octal e IPv6).
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Alvo Mais Comum</span>
            <span className="text-sm font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 inline-block mt-0.5">
              169.254.169.254 (Link-Local)
            </span>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="mt-4 pt-3.5 border-t border-[#20202e] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-mono text-[11px] uppercase">Provedor Cloud:</span>
          {providers.map(p => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`px-3 py-1 rounded-lg font-mono text-xs transition-colors border ${
                selectedProvider === p
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-[#181824] text-zinc-400 hover:text-zinc-200 border-[#2a2a3c]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoints & Configurations */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Endpoints & Vetores Disponíveis ({selectedProvider})</span>
            </h3>

            <div className="space-y-2">
              {availableEndpoints.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => {
                    setSelectedEndpointId(ep.id);
                    try {
                      const url = new URL(ep.endpointUrl);
                      setTargetPath(url.pathname + url.search);
                    } catch {
                      setTargetPath(ep.endpointUrl);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    activeEndpoint?.id === ep.id
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                      : 'bg-[#181826] border-[#272738] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold">{ep.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300">
                      {ep.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">
                    {ep.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom Path Override */}
            <div className="pt-2 border-t border-[#20202e] space-y-1.5">
              <label className="text-xs font-mono text-zinc-300">
                Caminho Alvo de Consulta (Path):
              </label>
              <input
                type="text"
                value={targetPath}
                onChange={e => setTargetPath(e.target.value)}
                className="w-full bg-[#1b1b26] border border-[#2d2d40] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Remediation Hardening Box */}
          <div className="bg-[#121915] border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Mitigação & Hardening para Cloud Ops</span>
            </h4>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed font-mono">
              <p>
                <strong>1. Forçar IMDSv2 (AWS):</strong>
              </p>
              <pre className="p-2 rounded bg-black/50 text-[10px] text-emerald-300 overflow-x-auto">
{`aws ec2 modify-instance-metadata-options \\
  --instance-id i-1234567890abcdef0 \\
  --http-tokens required \\
  --http-put-response-hop-limit 1`}
              </pre>
              <p>
                <strong>2. Regra IPTables Local:</strong>
              </p>
              <pre className="p-2 rounded bg-black/50 text-[10px] text-emerald-300 overflow-x-auto">
{`iptables -A OUTPUT -m owner ! --uid-owner root \\
  -d 169.254.169.254 -j DROP`}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Exploit Generator & Evasion Variations */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Exploit Inspector */}
          {activeEndpoint && (
            <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#20202e] pb-3">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    {activeEndpoint.provider} Exploitation Vector
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {activeEndpoint.name}
                  </h3>
                </div>
                <button
                  onClick={() => copyToClipboard(activeEndpoint.curlCommand, 'curl-main')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors border border-cyan-500/30"
                >
                  {copiedField === 'curl-main' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Comando cURL</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400">Comando de Teste Direto:</span>
                <pre className="p-3 rounded-xl bg-black/50 border border-[#222234] text-xs font-mono text-cyan-300 overflow-x-auto">
                  {activeEndpoint.curlCommand}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400">Resposta Esperada & Impacto:</span>
                <div className="p-3 rounded-xl bg-[#191926] border border-[#272738] text-xs text-zinc-300 font-mono leading-relaxed">
                  {activeEndpoint.returnedData}
                </div>
              </div>
            </div>
          )}

          {/* Evasion Variations Table */}
          <div className="bg-[#13131c] border border-[#232332] rounded-2xl overflow-hidden shadow-lg space-y-0">
            <div className="px-5 py-3.5 border-b border-[#20202e] bg-[#161622] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
                  Matriz de Evasão de Filtros SSRF & WAF
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Alternativas sintáticas para burlar filtros baseados em regex para `169.254.169.254`.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {bypassVariations.length} Formatos
              </span>
            </div>

            <div className="divide-y divide-[#1e1e2c]">
              {bypassVariations.map((item, idx) => (
                <div key={idx} className="p-3.5 hover:bg-[#181824] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-cyan-400 font-bold block">{item.encodingName}</span>
                    <span className="text-zinc-200 select-all font-semibold block">{item.payload}</span>
                    <span className="text-[11px] text-zinc-500 block">{item.technique}</span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(item.payload, `bypass-${idx}`)}
                    className="px-2.5 py-1 rounded bg-[#20202e] hover:bg-[#2c2c3e] text-zinc-300 hover:text-white shrink-0 self-start sm:self-center flex items-center gap-1 text-[11px] transition-colors"
                  >
                    {copiedField === `bypass-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
