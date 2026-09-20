// CWE & OWASP Top 10 2021 Architecture and Security Mapping Database

export interface CweEntry {
  id: string; // e.g. 'CWE-79'
  name: string;
  owaspCategory: string; // e.g. 'A03:2021 - Injection'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  impact: string;
  remediation: string;
  commonPayloadSnippet?: string;
}

export interface OwaspCategory {
  id: string; // e.g. 'A01:2021'
  title: string;
  shortTitle: string;
  description: string;
  primaryCwEs: string[];
  preventativeMeasures: string[];
  color: string;
}

export const OWASP_TOP_10_2021: OwaspCategory[] = [
  {
    id: 'A01:2021',
    title: 'Broken Access Control',
    shortTitle: 'Controle de Acesso Quebrado',
    description: 'Falhas onde restrições do que usuários autenticados podem fazer não são devidamente aplicadas (IDOR, escalonamento de privilégios vertical/horizontal).',
    primaryCwEs: ['CWE-200', 'CWE-284', 'CWE-285', 'CWE-639', 'CWE-862'],
    preventativeMeasures: [
      'Implementar verificação de posse e controle de acesso no lado do servidor.',
      'Desativar listagem de diretórios no servidor web.',
      'Utilizar identificadores opacos/UUIDs ao invés de IDs numéricos sequenciais previsíveis.',
      'Aplicar o princípio do menor privilégio por padrão (deny-by-default).'
    ],
    color: 'from-rose-500/20 to-red-500/10 border-rose-500/40 text-rose-400'
  },
  {
    id: 'A02:2021',
    title: 'Cryptographic Failures',
    shortTitle: 'Falhas Criptográficas',
    description: 'Exposição de dados sensíveis em trânsito ou em repouso por ausência de TLS, algoritmos obsoletos (MD5, SHA1, DES) ou chaves fracas.',
    primaryCwEs: ['CWE-259', 'CWE-326', 'CWE-327', 'CWE-330'],
    preventativeMeasures: [
      'Criptografar todos os dados sensíveis em trânsito com TLS 1.3 e em repouso com AES-256-GCM.',
      'Utilizar funções de derivação de chave robustas (Argon2id, bcrypt, PBKDF2).',
      'Desativar cache para respostas HTTP com dados confidenciais (Cache-Control: no-store).'
    ],
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400'
  },
  {
    id: 'A03:2021',
    title: 'Injection',
    shortTitle: 'Injeção (SQL, NoSQL, OS Command, XSS)',
    description: 'Entrada de dados não confiável é interpretada como comando ou consulta em SQL, NoSQL, interpretadores de comandos ou navegador.',
    primaryCwEs: ['CWE-79', 'CWE-89', 'CWE-77', 'CWE-78', 'CWE-94'],
    preventativeMeasures: [
      'Utilizar queries parametrizadas (Prepared Statements) e ORMs seguros.',
      'Validar entradas através de listas permitidas (allowlist validation).',
      'Aplicar codificação de saída sensível ao contexto (HTML/JS Context Encoding).'
    ],
    color: 'from-red-500/20 to-red-600/10 border-red-500/40 text-red-400'
  },
  {
    id: 'A04:2021',
    title: 'Insecure Design',
    shortTitle: 'Design Inseguro',
    description: 'Fraquezas conceituais decorrentes da ausência de modelagem de ameaças e práticas de arquitetura segura desde o início do projeto.',
    primaryCwEs: ['CWE-209', 'CWE-256', 'CWE-501', 'CWE-522'],
    preventativeMeasures: [
      'Conduzir sessões periódicas de Threat Modeling (STRIDE/PASTA).',
      'Integrar controles de limitação de tentativas (Rate Limiting) e barreiras anti-automação.',
      'Definir limites claros de confiança entre camadas da aplicação.'
    ],
    color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400'
  },
  {
    id: 'A05:2021',
    title: 'Security Misconfiguration',
    shortTitle: 'Configuração Insegura',
    description: 'Serviços mal configurados, credenciais padrão não alteradas, portas desnecessárias abertas, headers de segurança ausentes ou mensagens de erro detalhadas.',
    primaryCwEs: ['CWE-16', 'CWE-209', 'CWE-611', 'CWE-1004'],
    preventativeMeasures: [
      'Garantir processo automatizado de hardening de ambientes e containers.',
      'Configurar headers HTTP de segurança (CSP, HSTS, X-Content-Type-Options, Referrer-Policy).',
      'Desativar recursos desnecessários e frameworks de depuração em produção.'
    ],
    color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40 text-yellow-400'
  },
  {
    id: 'A06:2021',
    title: 'Vulnerable and Outdated Components',
    shortTitle: 'Componentes Vulneráveis e Desatualizados',
    description: 'Bibliotecas terceiras, pacotes npm/pip ou imagens de containers contendo vulnerabilidades públicas (CVEs conhecidas).',
    primaryCwEs: ['CWE-1104', 'CWE-937'],
    preventativeMeasures: [
      'Manter inventário contínuo de dependências (SBOM - Software Bill of Materials).',
      'Automatizar scanners de dependências (npm audit, Snyk, Dependabot).',
      'Remover bibliotecas não utilizadas e manter dependências em versões com suporte ativo.'
    ],
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40 text-blue-400'
  },
  {
    id: 'A07:2021',
    title: 'Identification and Authentication Failures',
    shortTitle: 'Falhas de Autenticação e Identificação',
    description: 'Permitir ataques de força bruta, senhas fracas, credenciais em URLs, bypass de MFA ou fixação de sessão de usuário.',
    primaryCwEs: ['CWE-287', 'CWE-384', 'CWE-613', 'CWE-798'],
    preventativeMeasures: [
      'Exigir autenticação multifator (MFA) em contas com privilégios.',
      'Implementar proteção rigorosa contra força bruta e credential stuffing (Rate Limiter).',
      'Invalidar sessões antigas ao realizar logout ou troca de senha.'
    ],
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400'
  },
  {
    id: 'A08:2021',
    title: 'Software and Data Integrity Failures',
    shortTitle: 'Falhas de Integridade de Software e Dados',
    description: 'Dependências sem verificação de assinatura (Supply Chain attacks) ou desserialização insegura de objetos fornecidos pelo usuário.',
    primaryCwEs: ['CWE-494', 'CWE-502', 'CWE-829'],
    preventativeMeasures: [
      'Usar assinaturas digitais e hashes criptográficos verificados em pipelines CI/CD.',
      'Evitar desserialização de formatos complexos de fontes externas não autenticadas.',
      'Utilizar repositórios de pacotes privados e controlados.'
    ],
    color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/40 text-teal-400'
  },
  {
    id: 'A09:2021',
    title: 'Security Logging and Monitoring Failures',
    shortTitle: 'Falhas de Registro e Monitoramento de Segurança',
    description: 'Eventos de segurança auditáveis (logins falhos, acessos negados) não são registrados ou alertas não disparam a tempo para a equipe de SOC.',
    primaryCwEs: ['CWE-117', 'CWE-778'],
    preventativeMeasures: [
      'Registrar todas as tentativas de login, falhas de autorização e exceções de input do usuário.',
      'Centralizar logs em SIEM com retenção adequada e alertas de anomalias.',
      'Sanitizar logs para evitar Log Injection (CWE-117).'
    ],
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/40 text-emerald-400'
  },
  {
    id: 'A10:2021',
    title: 'Server-Side Request Forgery (SSRF)',
    shortTitle: 'Falsificação de Requisições do Servidor (SSRF)',
    description: 'O servidor web busca um recurso remoto sem validar a URL especificada pelo usuário, permitindo acessar serviços internos (metadados de nuvem 169.254.169.254).',
    primaryCwEs: ['CWE-918'],
    preventativeMeasures: [
      'Segmentar redes internas através de firewalls e VPCs.',
      'Restringir requisições de saída apenas a esquemas permitidos (https://) e domínios em allowlist.',
      'Bloquear requisições a endereços locais (127.0.0.1, 10.0.0.0/8, 169.254.169.254, 192.168.0.0/16).'
    ],
    color: 'from-orange-500/20 to-red-500/10 border-orange-500/40 text-orange-400'
  }
];

export const TOP_CWES: CweEntry[] = [
  {
    id: 'CWE-79',
    name: 'Cross-Site Scripting (XSS)',
    owaspCategory: 'A03:2021 - Injection',
    severity: 'HIGH',
    category: 'Injection / Client-Side',
    description: 'O software não neutraliza ou neutraliza incorretamente entradas controláveis pelo usuário antes de colocá-las na saída servida a outros usuários.',
    impact: 'Roubo de cookies de sessão, sequestro de conta, execução de ações não autorizadas em nome da vítima.',
    remediation: 'Utilizar Context-Aware Output Encoding, adotar Content-Security-Policy (CSP) estrita e sanitize libraries como DOMPurify.',
    commonPayloadSnippet: '<script>alert(document.domain)</script>'
  },
  {
    id: 'CWE-89',
    name: 'SQL Injection (SQLi)',
    owaspCategory: 'A03:2021 - Injection',
    severity: 'CRITICAL',
    category: 'Injection / Database',
    description: 'Entrada do usuário é concatenada diretamente em queries SQL dinâmicas, permitindo ao atacante modificar a lógica original da consulta.',
    impact: 'Exfiltração de todo o banco de dados, modificação de dados, escalonamento para execução de comandos no host.',
    remediation: 'Uso obrigatório de Prepared Statements com queries parametrizadas em todas as chamadas SQL.',
    commonPayloadSnippet: "' UNION SELECT NULL, username, password FROM users--"
  },
  {
    id: 'CWE-639',
    name: 'Insecure Direct Object Reference (IDOR)',
    owaspCategory: 'A01:2021 - Broken Access Control',
    severity: 'HIGH',
    category: 'Access Control',
    description: 'A aplicação expõe uma referência direta a um objeto de implementação interna (como uma chave primária ou arquivo) sem verificar se o solicitante possui permissão.',
    impact: 'Leitura, modificação ou exclusão de dados pertencentes a outros usuários ou empresas.',
    remediation: 'Verificar autorização em nível de registro no backend (WHERE user_id = current_user_id).',
    commonPayloadSnippet: 'GET /api/v1/invoices/1042 -> GET /api/v1/invoices/1043'
  },
  {
    id: 'CWE-918',
    name: 'Server-Side Request Forgery (SSRF)',
    owaspCategory: 'A10:2021 - Server-Side Request Forgery',
    severity: 'CRITICAL',
    category: 'Server-Side Communication',
    description: 'O servidor web busca um recurso remoto sem validar a URL informada pelo cliente, permitindo escanear a rede interna ou ler credenciais de instâncias cloud.',
    impact: 'Acesso a instâncias internas, roubo de tokens do AWS/GCP Metadata Service (169.254.169.254).',
    remediation: 'Validar URLs contra allowlist restrita e desativar suporte a redirecionamentos HTTP na biblioteca cliente.',
    commonPayloadSnippet: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/'
  },
  {
    id: 'CWE-287',
    name: 'Improper Authentication',
    owaspCategory: 'A07:2021 - Identification and Authentication Failures',
    severity: 'CRITICAL',
    category: 'Authentication',
    description: 'O sistema falha em validar corretamente a identidade do ator antes de conceder acesso a recursos protegidos.',
    impact: 'Bypass completo de autenticação e tomada de controle de contas privilegiadas.',
    remediation: 'Adotar padrões maduros (OAuth2, OIDC), revogar tokens expirados e implementar MFA.',
    commonPayloadSnippet: 'Authorization: Bearer null / Header Spoofing (X-Forwarded-User: admin)'
  },
  {
    id: 'CWE-78',
    name: 'OS Command Injection',
    owaspCategory: 'A03:2021 - Injection',
    severity: 'CRITICAL',
    category: 'Execution',
    description: 'A aplicação constrói comandos do sistema operacional com dados externos sem neutralizar separadores de comando ou metacaracteres de shell.',
    impact: 'Execução arbitrária de comandos no sistema operacional hospedeiro com os privilégios do servidor web.',
    remediation: 'Evitar invocar o shell (`exec`, `system`). Utilizar APIs nativas da linguagem com passagem de argumentos em array.',
    commonPayloadSnippet: '; id; uname -a #'
  },
  {
    id: 'CWE-502',
    name: 'Deserialization of Untrusted Data',
    owaspCategory: 'A08:2021 - Software and Data Integrity Failures',
    severity: 'CRITICAL',
    category: 'Integrity',
    description: 'A aplicação desserializa dados de fontes não confiáveis sem garantir a integridade dos dados ou sem restringir os tipos de objetos que podem ser instanciados.',
    impact: 'Execução Remota de Código (RCE), corrupção de estado, negação de serviço.',
    remediation: 'Substituir formatos complexos (Java Serialization, Python pickle, PHP serialize) por formatos seguros como JSON estrito.',
    commonPayloadSnippet: 'ysoserial / gadget chains payload'
  },
  {
    id: 'CWE-352',
    name: 'Cross-Site Request Forgery (CSRF)',
    owaspCategory: 'A01:2021 - Broken Access Control',
    severity: 'MEDIUM',
    category: 'Client-Side / State Modification',
    description: 'A aplicação web não verifica se uma requisição HTTP originou-se de uma interação legítima do usuário dentro do próprio site.',
    impact: 'Alteração de e-mail, senha, transferências financeiras forçadas sem conhecimento do usuário.',
    remediation: 'Implementar tokens Anti-CSRF sincronizados (Synchronizer Token Pattern) e cookies com SameSite=Strict ou Lax.',
    commonPayloadSnippet: '<form action="https://target.com/api/change-password" method="POST">...'
  },
  {
    id: 'CWE-862',
    name: 'Missing Authorization',
    owaspCategory: 'A01:2021 - Broken Access Control',
    severity: 'HIGH',
    category: 'Authorization',
    description: 'A aplicação não realiza verificação de autorização antes de executar uma ação em endpoints sensíveis ou administrativos.',
    impact: 'Acesso a painéis administrativos e comandos de gestão por usuários comuns.',
    remediation: 'Aplicar middleware centralizado de autorização declarativo baseado em papéis (RBAC/ABAC).',
    commonPayloadSnippet: 'POST /api/admin/users/promote (sem token de admin)'
  },
  {
    id: 'CWE-22',
    name: 'Path Traversal / Local File Inclusion (LFI)',
    owaspCategory: 'A01:2021 - Broken Access Control',
    severity: 'HIGH',
    category: 'File Operations',
    description: 'O software usa entrada externa para construir um caminho de arquivo sem neutralizar adequadamente sequências de escape como `../`.',
    impact: 'Leitura de arquivos confidenciais do servidor (/etc/passwd, application.properties, chaves privadas).',
    remediation: 'Garantir validação canônica de caminho (`realpath`) e manter arquivos em diretórios dedicados com allowlist.',
    commonPayloadSnippet: '../../../../../../../../etc/passwd'
  }
];
