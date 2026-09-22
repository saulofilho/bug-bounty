import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  ShieldAlert, 
  Terminal, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Search, 
  ExternalLink, 
  Server, 
  Cloud, 
  Flame, 
  Sparkles,
  Info,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  TAKEOVER_SERVICE_DATABASE, 
  TakeoverServiceSignature, 
  analyzeSubdomainTakeover, 
  SubdomainAuditResult 
} from '../utils/subdomainTakeoverEngine';

interface SubdomainTakeoverAnalyzerProps {
  initialSubdomain?: string;
}

export const SubdomainTakeoverAnalyzer: React.FC<SubdomainTakeoverAnalyzerProps> = ({
  initialSubdomain
}) => {
  // Input states
  const [subdomain, setSubdomain] = useState<string>(initialSubdomain || 'docs.finpay-global.com');
  const [cnameTarget, setCnameTarget] = useState<string>('finpay-docs.github.io');
  const [simulatedBody, setSimulatedBody] = useState<string>("There isn't a GitHub Pages site here.");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analyzer' | 'database' | 'batch'>('analyzer');

  // Batch analysis state
  const [batchInput, setBatchInput] = useState<string>(
`docs.finpay-global.com,finpay-docs.github.io
assets.cloudmetrics.io,cloudmetrics-assets.s3.amazonaws.com
support.finpay-global.com,finpay.zendesk.com
staging.cloudmetrics.io,cloudmetrics-staging.herokuapp.com
cdn.target-shop.com,target-shop.na-west1.surge.sh`
  );

  // Analyze single target
  const auditResult: SubdomainAuditResult = useMemo(() => {
    return analyzeSubdomainTakeover(subdomain, cnameTarget, simulatedBody);
  }, [subdomain, cnameTarget, simulatedBody]);

  // Batch results
  const batchResults: SubdomainAuditResult[] = useMemo(() => {
    const lines = batchInput.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(',');
      const sub = parts[0]?.trim() || '';
      const cname = parts[1]?.trim() || '';
      return analyzeSubdomainTakeover(sub, cname);
    });
  }, [batchInput]);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    if (!searchCatalogQuery) return TAKEOVER_SERVICE_DATABASE;
    const q = searchCatalogQuery.toLowerCase();
    return TAKEOVER_SERVICE_DATABASE.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.cnamePatterns.some(p => p.toLowerCase().includes(q))
    );
  }, [searchCatalogQuery]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quick Preset Handlers
  const loadPreset = (presetName: string) => {
    if (presetName === 'github') {
      setSubdomain('blog.finpay-global.com');
      setCnameTarget('finpay-blog.github.io');
      setSimulatedBody("There isn't a GitHub Pages site here.");
    } else if (presetName === 's3') {
      setSubdomain('assets.cloudmetrics.io');
      setCnameTarget('metrics-assets-backup.s3.amazonaws.com');
      setSimulatedBody("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>");
    } else if (presetName === 'heroku') {
      setSubdomain('api-legacy.cloudmetrics.io');
      setCnameTarget('cloudmetrics-legacy.herokuapp.com');
      setSimulatedBody("<html><head><title>No such app</title></head><body><h1>Heroku | No such app</h1></body></html>");
    } else if (presetName === 'azure') {
      setSubdomain('portal-partner.finpay-global.com');
      setCnameTarget('finpay-partner.azurewebsites.net');
      setSimulatedBody("404 Web Site not found.");
    } else if (presetName === 'safe') {
      setSubdomain('secure.finpay-global.com');
      setCnameTarget('elb-10491.us-east-1.elb.amazonaws.com');
      setSimulatedBody("HTTP/1.1 200 OK\nServer: nginx");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#13131c] border border-[#232332] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>DNS Recon & Subdomain Takeover Analyzer</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Dangling CNAMEs & Cloud Orphan Detection</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Analisador de Subdomínio Órfão & Sequestro de DNS
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              Auditoria de registros DNS CNAME apontando para serviços desativados em nuvem (AWS S3, GitHub Pages, Heroku, Azure, Zendesk, Fastly, Shopify). Detecte vetores de Account Takeover, roubo de cookies wildcard e gere comandos de PoC para seus relatórios.
            </p>
          </div>

          {/* Quick Sub-Tabs */}
          <div className="inline-flex rounded-xl bg-[#1a1a26] p-1 border border-[#2b2b3d] shrink-0">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'analyzer' 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Auditor Individual
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'batch' 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Scanner em Lote ({batchResults.length})
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'database' 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Base de Assinaturas ({TAKEOVER_SERVICE_DATABASE.length})
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        {activeTab === 'analyzer' && (
          <div className="mt-4 pt-3.5 border-t border-[#20202e] flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500 font-mono text-[11px] uppercase">Cenários Prontos:</span>
            <button
              onClick={() => loadPreset('github')}
              className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
            >
              GitHub Pages (404 Orphan)
            </button>
            <button
              onClick={() => loadPreset('s3')}
              className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
            >
              AWS S3 (NoSuchBucket)
            </button>
            <button
              onClick={() => loadPreset('heroku')}
              className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
            >
              Heroku (No Such App)
            </button>
            <button
              onClick={() => loadPreset('azure')}
              className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
            >
              Azure App Service (404)
            </button>
            <button
              onClick={() => loadPreset('safe')}
              className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252536] text-zinc-300 hover:text-white border border-[#2c2c3e] transition-colors"
            >
              Alvo Seguro (ELB Ativo)
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: INDIVIDUAL ANALYZER */}
      {activeTab === 'analyzer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-red-400" />
                <span>Parâmetros de Auditoria DNS</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300">
                  Subdomínio Alvo:
                </label>
                <input
                  type="text"
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  placeholder="ex: docs.empresa.com"
                  className="w-full bg-[#1b1b26] border border-[#2d2d40] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300">
                  Registro CNAME / Alias Apontado:
                </label>
                <input
                  type="text"
                  value={cnameTarget}
                  onChange={e => setCnameTarget(e.target.value)}
                  placeholder="ex: empresa-docs.github.io ou bucket.s3.amazonaws.com"
                  className="w-full bg-[#1b1b26] border border-[#2d2d40] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-300">
                    Resposta HTTP (Fingerprint / Corpo do Erro):
                  </label>
                  <button
                    onClick={() => setSimulatedBody('')}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200"
                  >
                    Limpar
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={simulatedBody}
                  onChange={e => setSimulatedBody(e.target.value)}
                  placeholder="Cole aqui o corpo da resposta HTTP (ex: NoSuchBucket, There isn't a GitHub Pages site here, etc.)"
                  className="w-full bg-[#1b1b26] border border-[#2d2d40] rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                />
              </div>

              <div className="bg-[#191924] border border-[#27273a] rounded-xl p-3 text-xs text-zinc-400 space-y-1">
                <span className="font-mono text-[10px] text-zinc-300 font-bold uppercase block">
                  Como obter esses dados:
                </span>
                <p className="font-mono text-[11px] text-zinc-300">
                  $ dig CNAME {subdomain || 'alvo.com'} +short
                </p>
                <p className="font-mono text-[11px] text-zinc-300">
                  $ curl -I http://{subdomain || 'alvo.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Audit Findings & Risk Card */}
          <div className="lg:col-span-7 space-y-5">
            <div className={`border rounded-2xl p-6 shadow-xl space-y-5 transition-all ${
              auditResult.status === 'VULNERABLE'
                ? 'bg-[#181014] border-red-500/40 shadow-red-500/5'
                : auditResult.status === 'SUSPICIOUS'
                ? 'bg-[#171410] border-amber-500/40'
                : 'bg-[#101714] border-emerald-500/30'
            }`}>
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {auditResult.status === 'VULNERABLE' ? (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>VULNERÁVEL A SUBDOMAIN TAKEOVER</span>
                      </span>
                    ) : auditResult.status === 'SUSPICIOUS' ? (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>SUSPEITO / REQUER VERIFICAÇÃO</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>NÃO VULNERÁVEL OU PROTEGIDO</span>
                      </span>
                    )}

                    {auditResult.matchedService && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
                        {auditResult.matchedService.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {auditResult.subdomain}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    CNAME: {auditResult.cnameRecord}
                  </p>
                </div>

                <div className="text-right sm:text-right shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Impacto Estimado</span>
                  <div className="flex items-center gap-1.5 sm:justify-end mt-0.5">
                    <span className="text-xl font-bold font-mono text-white">
                      CVSS {auditResult.riskAssessment.cvssScore.toFixed(1)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      auditResult.riskAssessment.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                      auditResult.riskAssessment.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {auditResult.riskAssessment.severity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  Evidência Técnica & Análise:
                </span>
                <p className="text-xs text-zinc-200 bg-[#0d0d14] p-3 rounded-xl border border-[#1f1f2e] leading-relaxed font-mono">
                  {auditResult.evidence}
                </p>
              </div>

              {/* Risk Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#14141e] border border-[#242436] space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Risco de Roubo de Cookies Wildcard</span>
                  <span className={`font-semibold block ${auditResult.riskAssessment.cookieHijackingRisk ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {auditResult.riskAssessment.cookieHijackingRisk ? '⚠️ Alto — Subdomínio sob domínio raiz compartilhado' : 'Baixo — Domínio segregado'}
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Se o domínio principal emitir cookies de sessão com `domain=.target.com`, o invasor interceptará tokens de autenticação de todos os usuários.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#14141e] border border-[#242436] space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Dificuldade de Exploração</span>
                  <span className="font-semibold text-white block">
                    {auditResult.matchedService?.takeoverDifficulty || 'N/A'} (Registro de recurso na nuvem)
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Classificação CWE: {auditResult.matchedService?.cwe || 'CWE-284'}
                  </p>
                </div>
              </div>

              {/* Claim / PoC Instructions */}
              {auditResult.matchedService && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Procedimento de Reivindicação (Proof of Concept):</span>
                  </span>
                  <div className="bg-[#12121a] p-3.5 rounded-xl border border-[#26263a] text-xs text-zinc-200 space-y-2">
                    <p className="leading-relaxed">
                      {auditResult.reproductionCommands.pocProof}
                    </p>
                    <div className="pt-2 border-t border-[#1f1f2e] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-400">Comando de verificação CLI:</span>
                      <button
                        onClick={() => copyToClipboard(auditResult.reproductionCommands.httpProbe, 'probe-cli')}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedField === 'probe-cli' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copiar cURL Probe</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-zinc-300 bg-black/40 p-2 rounded overflow-x-auto">
                      {auditResult.reproductionCommands.httpProbe}
                    </pre>
                  </div>
                </div>
              )}

              {/* Remediation Guide */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Passos de Remediação Recomendados:</span>
                </span>
                <p className="text-xs text-zinc-300 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 leading-relaxed">
                  {auditResult.remediationAdvice}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BATCH SCANNER */}
      {activeTab === 'batch' && (
        <div className="space-y-4">
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Auditor em Lote de Subdomínios & CNAMEs</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Insira uma lista no formato: <code>subdominio,cname_apontado</code> (um por linha).
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400 bg-[#1b1b26] px-3 py-1.5 rounded-lg border border-[#2c2c3e]">
                {batchResults.length} alvos parseados
              </span>
            </div>

            <textarea
              rows={5}
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              className="w-full bg-[#1b1b26] border border-[#2d2d40] rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-red-500 resize-y"
            />
          </div>

          {/* Results Table */}
          <div className="bg-[#13131c] border border-[#232332] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#20202e] flex items-center justify-between bg-[#161622]">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Resultados do Scan de Orfandade
              </span>
              <span className="text-xs text-red-400 font-mono font-bold">
                {batchResults.filter(r => r.matchedService).length} Suscetíveis a Takeover
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#20202e] bg-[#14141e] text-[11px] font-mono text-zinc-400">
                    <th className="py-2.5 px-4">Subdomínio</th>
                    <th className="py-2.5 px-4">CNAME Destino</th>
                    <th className="py-2.5 px-4">Serviço Identificado</th>
                    <th className="py-2.5 px-4">Status & Severidade</th>
                    <th className="py-2.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2c]">
                  {batchResults.map((res, i) => (
                    <tr key={i} className="hover:bg-[#181824] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {res.subdomain}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {res.cnameRecord}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {res.matchedService ? (
                          <span className="text-cyan-400 font-semibold">{res.matchedService.name}</span>
                        ) : (
                          <span className="text-zinc-500">Desconhecido / Ativo</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {res.matchedService ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SUSPEITO (CVSS {res.matchedService.cvssScore})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            SEGURO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSubdomain(res.subdomain);
                            setCnameTarget(res.cnameRecord);
                            setActiveTab('analyzer');
                          }}
                          className="px-2.5 py-1 rounded bg-[#20202e] hover:bg-[#2b2b3d] text-zinc-200 hover:text-white font-mono text-[11px] transition-colors"
                        >
                          Inspecionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIGNATURE DATABASE CATALOG */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="bg-[#14141d] border border-[#232332] rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchCatalogQuery}
                onChange={e => setSearchCatalogQuery(e.target.value)}
                placeholder="Filtrar por provedor, CNAME ou tecnologia..."
                className="w-full bg-[#1b1b26] border border-[#2c2c3e] rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {filteredCatalog.length} provedores indexados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCatalog.map(sig => (
              <div key={sig.id} className="bg-[#14141e] border border-[#242436] rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      {sig.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      {sig.name}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-300 border border-red-500/30">
                    CVSS {sig.cvssScore}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="text-zinc-400">
                    Padrões CNAME:
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sig.cnamePatterns.map((pat, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[#1e1e2c] text-cyan-300 text-[10px]">
                          {pat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-zinc-400 pt-1">
                    Fingerprint de Resposta:
                    <div className="mt-1 p-2 rounded bg-black/40 text-[11px] text-amber-300 font-mono truncate">
                      {sig.responseFingerprints[0]}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#20202e] flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-mono text-[11px]">
                    Dificuldade: <strong className="text-white">{sig.takeoverDifficulty}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setSubdomain(`alvo.${sig.cnamePatterns[0].replace('.', '')}`);
                      setCnameTarget(`cliente${sig.cnamePatterns[0]}`);
                      setSimulatedBody(sig.responseFingerprints[0]);
                      setActiveTab('analyzer');
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-xs flex items-center gap-1"
                  >
                    <span>Testar Assinatura</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
