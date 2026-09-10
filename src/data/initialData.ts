import { VulnerabilityReport, TargetProgram, TechnicalDoc, CVERecord } from '../types';

export const getDaysAgoDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const INITIAL_REPORTS: VulnerabilityReport[] = [
  {
    id: "REP-2024-001",
    title: "Broken Object Level Authorization (IDOR) em /api/v2/invoices/{id} expõe faturas e dados de cartão",
    target: "api.finpay-global.com",
    platform: "HackerOne",
    vulnerabilityType: "IDOR / BOLA",
    severity: "CRITICAL",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    cvssScore: 9.1,
    cwe: "CWE-639: Authorization Bypass Through User-Controlled Key",
    cveIds: [],
    tags: ["#idor", "#bola", "#api-security", "#cwe-639", "#high-bounty"],
    summary: "O endpoint de recuperação de faturas em PDF e JSON não valida se a organização do usuário autenticado é proprietária do identificador GUID solicitado, permitindo que qualquer usuário autenticado acesse dados sensíveis de faturamento de milhares de clientes corporativos.",
    stepsToReproduce: [
      "1. Autentique-se como Usuário A e emita uma fatura de teste, anotando o invoice_id retornado (ex: 8841-fa90).",
      "2. Autentique-se como Usuário B (de outra organização e tenant).",
      "3. Como Usuário B, envie GET /api/v2/invoices/8841-fa90 com o token Bearer do Usuário B.",
      "4. Observe que o servidor retorna HTTP 200 OK com os dados completos de faturamento do Usuário A."
    ],
    proofOfConcept: "GET /api/v2/invoices/9924-ac12 HTTP/1.1\nHost: api.finpay-global.com\nAuthorization: Bearer eyJhbGciOi...[UserB_Token]\nAccept: application/json\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  \"invoice_id\": \"9924-ac12\",\n  \"customer_name\": \"Acme Corp\",\n  \"tax_id\": \"XX.XXX.XXX/0001-XX\",\n  \"amount\": 14850.00,\n  \"last4_card\": \"4242\"\n}",
    businessImpact: "Vazamento em massa de dados financeiros corporativos confidenciais (PII e LGPD/GDPR), com impacto direto na reputação da empresa e multas regulatórias severas.",
    remediation: "Implementar validação estrita de autorização em nível de objeto (Object-Level Access Control), verificando se `invoice.tenant_id == current_user.tenant_id` no repositório de dados antes de retornar o registro.",
    bountyAmount: 3500,
    currency: "USD",
    submissionId: "H1-2481092",
    submissionUrl: "https://hackerone.com/reports/2481092",
    createdAt: getDaysAgoDate(25),
    updatedAt: getDaysAgoDate(14),
    timeline: [
      { id: "t1", date: getDaysAgoDate(25), title: "Relatório Submetido", notes: "Enviado através do programa de Bug Bounty da FinPay no HackerOne.", type: "creation" },
      { id: "t2", date: getDaysAgoDate(24), title: "Triagem Confirmada", notes: "Triador do HackerOne reproduziu o achado com sucesso. Severidade ajustada para Crítica.", type: "status_change" },
      { id: "t3", date: getDaysAgoDate(18), title: "Recompensa Concedida", notes: "Equipe de segurança aprovou bounty de $3,500 USD.", type: "bounty" },
      { id: "t4", date: getDaysAgoDate(14), title: "Vulnerabilidade Mitigada", notes: "Hotfix em produção e relatório fechado como Resolvido.", type: "status_change" }
    ]
  },
  {
    id: "REP-2024-002",
    title: "Server-Side Request Forgery (Blind SSRF) via Webhook URL Parser para Cloud Metadata Service",
    target: "app.cloudmetrics.io",
    platform: "Bugcrowd",
    vulnerabilityType: "SSRF",
    severity: "HIGH",
    status: "TRIAGED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N",
    cvssScore: 8.5,
    cwe: "CWE-918: Server-Side Request Forgery",
    cveIds: ["CVE-2023-46805"],
    tags: ["#ssrf", "#cloud", "#cwe-918", "#aws-metadata", "#imds"],
    summary: "A funcionalidade de teste de integrações de Webhook permite especificar URLs arbitrárias. O mecanismo interno de validação é suscetível a DNS Rebinding e não bloqueia intervalos privados IPv4 mapeados em IPv6 (ex: ::ffff:169.254.169.254), permitindo atingir o AWS Instance Metadata Service (IMDSv1).",
    stepsToReproduce: [
      "1. Acesse o painel de configurações em 'Integrations > Webhooks'.",
      "2. Configure um novo endpoint apontando para um servidor Burp Collaborator ou DNS Rebinding.",
      "3. Execute o botão 'Test Webhook'. O servidor backend efetua uma requisição HTTP direta sem validação de IP pós-resolução.",
      "4. Utilizando o bypass 'http://[::ffff:169.254.169.254]/latest/meta-data/', dados de instâncias internas são alcançáveis."
    ],
    proofOfConcept: "POST /api/webhooks/test HTTP/1.1\nHost: app.cloudmetrics.io\nContent-Type: application/json\n\n{\n  \"target_url\": \"http://[::ffff:a9fe:a9fe]/latest/meta-data/iam/security-credentials/\"\n}\n\nHTTP/1.1 200 OK\n{\"response_time_ms\": 42, \"status_code\": 200, \"body_preview\": \"app-eks-worker-role\"}",
    businessImpact: "Potencial extração de credenciais temporárias do IAM da AWS caso IMDSv2 não esteja forçado com hop limit 1, viabilizando movimentação lateral e acesso a buckets S3 internos.",
    remediation: "1. Forçar o uso de IMDSv2 com Token HTTP PUT e Hop Limit 1 na AWS.\n2. Implementar biblioteca de verificação de IP segura no backend que faça a resolução DNS e valide se o IP resultante não pertence a RFC 1918, RFC 3927 (Link-Local) ou Loopback antes de realizar a requisição.",
    bountyAmount: 2000,
    currency: "USD",
    submissionId: "BC-981240",
    submissionUrl: "https://bugcrowd.com/submissions/981240",
    createdAt: getDaysAgoDate(19),
    updatedAt: getDaysAgoDate(16),
    timeline: [
      { id: "t1", date: getDaysAgoDate(19), title: "Relatório Enviado no Bugcrowd", notes: "Aguardando triagem inicial da equipe.", type: "creation" },
      { id: "t2", date: getDaysAgoDate(16), title: "Triado como P2 (High)", notes: "Triador validou o SSRF e enviou para o time de engenharia do cliente.", type: "status_change" }
    ]
  },
  {
    id: "REP-2024-003",
    title: "Stored XSS em Markdown Preview de Bio de Perfil de Desenvolvedor",
    target: "hub.devspace.net",
    platform: "Intigriti",
    vulnerabilityType: "Stored XSS",
    severity: "MEDIUM",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N",
    cvssScore: 6.4,
    cwe: "CWE-79: Improper Neutralization of Input During Web Page Generation",
    cveIds: [],
    tags: ["#xss", "#stored-xss", "#cwe-79", "#dompurify", "#markdown"],
    summary: "O parser de Markdown utilizado na página de perfil público não sanitiza tags HTML embutidas com links manipulados (atributo href com javascript: e sanitização defeituosa via bypass de SVG com onload). Qualquer usuário visitante que visualize o perfil executa script no contexto da aplicação.",
    stepsToReproduce: [
      "1. Entre em 'Configurações de Perfil > Biografia'.",
      "2. Insira o payload de prova de conceito.",
      "3. Salve as alterações.",
      "4. Abra o perfil público a partir de outro navegador ou sessão anônima."
    ],
    proofOfConcept: "<svg><animate onbegin=alert(document.domain) attributeName=x dur=1s>",
    businessImpact: "Roubo de tokens de sessão armazenados em localStorage/cookies acessíveis, ou execução de ações indesejadas em nome da vítima através de requisições CSRF automatizadas no DOM.",
    remediation: "Utilizar biblioteca consagrada de sanitização como DOMPurify no frontend ou sanitizar rigorosamente a árvore AST do Markdown no backend antes do armazenamento.",
    bountyAmount: 750,
    currency: "USD",
    submissionId: "INT-341908",
    submissionUrl: "https://app.intigriti.com/submissions/341908",
    createdAt: getDaysAgoDate(14),
    updatedAt: getDaysAgoDate(6),
    timeline: [
      { id: "t1", date: getDaysAgoDate(14), title: "Relatório Submetido", notes: "Enviado via Intigriti.", type: "creation" },
      { id: "t2", date: getDaysAgoDate(12), title: "Triagem Aprovada", notes: "Triador do Intigriti confirmou o XSS armazenado.", type: "status_change" },
      { id: "t3", date: getDaysAgoDate(6), title: "Recompensa Paga", notes: "Bounty de 750 EUR (~$815 USD) liberado para saque.", type: "bounty" }
    ]
  },
  {
    id: "REP-2024-004",
    title: "Account Takeover via Pre-Account Creation em OAuth Login sem verificação de email",
    target: "auth.streamflow.com",
    platform: "HackerOne",
    vulnerabilityType: "OAuth Misconfiguration",
    severity: "HIGH",
    status: "RESOLVED",
    cvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N",
    cvssScore: 8.1,
    cwe: "CWE-287: Improper Authentication",
    cveIds: [],
    tags: ["#oauth", "#account-takeover", "#cwe-287", "#authentication", "#pre-account"],
    summary: "Se um atacante criar uma conta clássica com o email da vítima e senha conhecida antes que a vítima use o login social 'Sign in with Google', o sistema funde silenciosamente os logins sem exigir confirmação de propriedade de email, permitindo que o atacante continue acessando a conta criada posteriormente pela vítima.",
    stepsToReproduce: [
      "1. Atacante registra nova conta clássica com o email vitima@alvo.com e senha 'Atacante123!'.",
      "2. O sistema não exige confirmação de email para logar.",
      "3. A vítima mais tarde clica em 'Continuar com Google' usando vitima@alvo.com.",
      "4. O sistema vincula o Google ID à conta pré-existente.",
      "5. O atacante ainda pode fazer login com vitima@alvo.com e 'Atacante123!' e visualizar todos os novos dados gerados pela vítima."
    ],
    proofOfConcept: "POST /auth/register\n{\n  \"email\": \"victim@target.com\",\n  \"password\": \"AttackerPass123!\"\n}\n\n-> Conta ativa sem link de confirmação verificado.",
    businessImpact: "Comprometimento completo e silencioso da conta da vítima (Account Takeover), persistência de acesso mesmo após a vítima adotar autenticação federada.",
    remediation: "Exigir verificação obrigatória de email antes de ativar login por senha, ou ao conectar conta OAuth, solicitar revalidação da senha ou envio de código OTP para confirmar a titularidade.",
    bountyAmount: 1800,
    currency: "USD",
    submissionId: "H1-2294101",
    submissionUrl: "https://hackerone.com/reports/2294101",
    createdAt: getDaysAgoDate(9),
    updatedAt: getDaysAgoDate(3),
    timeline: [
      { id: "t1", date: getDaysAgoDate(9), title: "Submissão", notes: "Relatado com vídeo PoC e passos detalhados.", type: "creation" },
      { id: "t2", date: getDaysAgoDate(7), title: "Triagem", notes: "Equipe de segurança do cliente confirmou o fluxo vulnerável.", type: "status_change" },
      { id: "t3", date: getDaysAgoDate(4), title: "Bounty Concedido", notes: "$1,800 USD creditados.", type: "bounty" },
      { id: "t4", date: getDaysAgoDate(3), title: "Correção em Produção", notes: "Email verification agora é mandatório.", type: "status_change" }
    ]
  },
  {
    id: "REP-2024-005",
    title: "Subdomain Takeover em static-assets.enterprise-store.com via CNAME apontando para AWS S3 órfão",
    target: "static-assets.enterprise-store.com",
    platform: "Bugcrowd",
    vulnerabilityType: "Subdomain Takeover",
    severity: "MEDIUM",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
    cvssScore: 5.3,
    cwe: "CWE-15: External Control of System or Configuration Setting",
    cveIds: [],
    tags: ["#subdomain-takeover", "#dns", "#cwe-15", "#s3-bucket", "#recon"],
    summary: "O registro DNS CNAME `static-assets.enterprise-store.com` aponta para `enterprise-assets-2022.s3.amazonaws.com`. O bucket S3 havia sido deletado pela equipe de infraestrutura mas o apontamento DNS foi esquecido, permitindo que qualquer pessoa registrasse o mesmo nome de bucket e servisse scripts maliciosos com certificados e domínio da empresa.",
    stepsToReproduce: [
      "1. Execute `dig CNAME static-assets.enterprise-store.com` e note o target.",
      "2. Verifique via curl que o bucket retorna `NoSuchBucket`.",
      "3. Registre um bucket com o mesmo nome na região us-east-1.",
      "4. Faça upload de arquivo de prova de conceito seguro comprovando a titularidade."
    ],
    proofOfConcept: ";; ANSWER SECTION:\nstatic-assets.enterprise-store.com. 300 IN CNAME enterprise-assets-2022.s3.amazonaws.com.\n\nHTTP/1.1 404 Not Found\n<Code>NoSuchBucket</Code>",
    businessImpact: "Possibilidade de hospedar páginas de phishing convincentes, servir JavaScript malicioso para sequestrar credenciais ou burlar políticas de Same-Origin.",
    remediation: "Remover imediatamente o registro CNAME no Cloudflare/Route53 ou recriar o bucket S3 na conta oficial da empresa para proteger o namespace.",
    bountyAmount: 500,
    currency: "USD",
    submissionId: "BC-904121",
    submissionUrl: "https://bugcrowd.com/submissions/904121",
    createdAt: getDaysAgoDate(5),
    updatedAt: getDaysAgoDate(2),
    timeline: [
      { id: "t1", date: getDaysAgoDate(5), title: "Relatado", notes: "Submetido com aviso de responsabilidade ética.", type: "creation" },
      { id: "t2", date: getDaysAgoDate(3), title: "Aceito", notes: "Registro DNS removido em poucas horas.", type: "status_change" },
      { id: "t3", date: getDaysAgoDate(2), title: "Recompensa Paga", notes: "$500 USD aprovados.", type: "bounty" }
    ]
  },
  {
    id: "REP-2024-006",
    title: "GraphQL Batching Attack permite Bypass de Rate-Limit em endpoint de autenticação 2FA SMS",
    target: "api.globaltravel.com",
    platform: "Intigriti",
    vulnerabilityType: "Rate Limit Bypass / Brute Force",
    severity: "HIGH",
    status: "DRAFT",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N",
    cvssScore: 7.7,
    cwe: "CWE-307: Improper Restriction of Excessive Authentication Attempts",
    cveIds: [],
    tags: ["#graphql", "#rate-limit-bypass", "#cwe-307", "#brute-force", "#batching"],
    summary: "O endpoint GraphQL `/graphql` permite envio de arrays de queries em uma única requisição HTTP POST (Batching). O rate limiter é aplicado apenas por requisição HTTP, permitindo testar milhares de códigos OTP de 6 dígitos em menos de 30 segundos sem sofrer bloqueio ou aviso.",
    stepsToReproduce: [
      "1. Inicie o fluxo de login de dois fatores para receber um código SMS.",
      "2. Intercepte a requisição enviada para /graphql.",
      "3. Envie uma requisição com array contendo 500 chamadas da mutação `verifyTwoFactor(code: $code)` simultaneamente.",
      "4. Note que todas as 500 tentativas são processadas e retornam sem erro 429 Too Many Requests."
    ],
    proofOfConcept: "POST /graphql HTTP/1.1\nHost: api.globaltravel.com\nContent-Type: application/json\n\n[\n  {\"query\": \"mutation { verifyTwoFactor(code: \\\"100001\\\") { success token } }\"},\n  {\"query\": \"mutation { verifyTwoFactor(code: \\\"100002\\\") { success token } }\"},\n  {\"query\": \"mutation { verifyTwoFactor(code: \\\"100003\\\") { success token } }\"}\n]",
    businessImpact: "Quebra da proteção do segundo fator de autenticação por força bruta viável (1 milhão de combinações reduzidas a poucas centenas de requisições de batch), resultando em bypass total de 2FA.",
    remediation: "Desativar batching no Apollo/GraphQL Server ou calcular a taxa de rate limiting ponderada pela quantidade de operações contidas no payload.",
    bountyAmount: 1500,
    currency: "USD",
    createdAt: getDaysAgoDate(1),
    updatedAt: getDaysAgoDate(1),
    timeline: [
      { id: "t1", date: getDaysAgoDate(1), title: "Rascunho criado", notes: "Finalizando testes locais de confirmação.", type: "creation" }
    ]
  },
  {
    id: "REP-2024-007",
    title: "SQL Injection Blind via Time-based Delay no parâmetro sort_order da API de catálogo",
    target: "api.finpay-global.com",
    platform: "HackerOne",
    vulnerabilityType: "SQL Injection",
    severity: "CRITICAL",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    cvssScore: 9.8,
    cwe: "CWE-89: Improper Neutralization of Special Elements used in an SQL Command",
    cveIds: [],
    tags: ["#sqli", "#blind-sqli", "#database", "#hackerone"],
    summary: "O parâmetro de ordenação não é sanitizado ou parametrizado antes da concatenação direta com a cláusula ORDER BY no PostgreSQL.",
    stepsToReproduce: ["Envio de payload time-based: pg_sleep(5)."],
    proofOfConcept: "GET /api/v1/products?sort=(CASE+WHEN+(1=1)+THEN+pg_sleep(5)+ELSE+pg_sleep(0)+END)",
    businessImpact: "Extração irrestrita de credenciais de administradores e tabelas de faturamento.",
    remediation: "Utilizar whitelist de campos permitidos para ordenação.",
    bountyAmount: 4000,
    currency: "USD",
    createdAt: getDaysAgoDate(36),
    updatedAt: getDaysAgoDate(28),
    timeline: [
      { id: "t1", date: getDaysAgoDate(36), title: "Relatório Submetido", type: "creation" },
      { id: "t2", date: getDaysAgoDate(28), title: "Recompensa Concedida ($4,000)", type: "bounty" }
    ]
  },
  {
    id: "REP-2024-008",
    title: "Vazamento de Chaves de API de Produção em SourceMap JavaScript esquecido no CDN",
    target: "cdn.devspace.net",
    platform: "Intigriti",
    vulnerabilityType: "Information Disclosure",
    severity: "LOW",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    cvssScore: 3.7,
    cwe: "CWE-200: Exposure of Sensitive Information",
    cveIds: [],
    tags: ["#sourcemap", "#recon", "#info-disclosure"],
    summary: "Arquivos .map no CDN expõem endpoints internos e chaves de telemetria.",
    stepsToReproduce: ["Acessar /static/js/bundle.js.map diretamente via GET."],
    proofOfConcept: "GET https://cdn.devspace.net/static/js/main.chunk.js.map",
    businessImpact: "Exposição de código-fonte interno de componentes confidenciais.",
    remediation: "Remover upload de sourcemaps no pipeline de CI/CD para o CDN público.",
    bountyAmount: 250,
    currency: "USD",
    createdAt: getDaysAgoDate(52),
    updatedAt: getDaysAgoDate(48),
    timeline: [
      { id: "t1", date: getDaysAgoDate(52), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-009",
    title: "CORS Misconfiguration com Access-Control-Allow-Origin: null e credenciais habilitadas",
    target: "hub.devspace.net",
    platform: "Intigriti",
    vulnerabilityType: "CORS Misconfiguration",
    severity: "MEDIUM",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N",
    cvssScore: 6.5,
    cwe: "CWE-942: Permissive Cross-domain Policy with Untrusted Domains",
    cveIds: [],
    tags: ["#cors", "#null-origin", "#api"],
    summary: "Configuração frouxa aceita Origin: null via iframes sandbox, permitindo leitura de dados privados do perfil.",
    stepsToReproduce: ["Carregar página de teste com iframe sandbox 'allow-scripts' disparando fetch com credenciais."],
    proofOfConcept: "<iframe sandbox=\"allow-scripts\" srcdoc=\"<script>fetch('https://hub.devspace.net/api/me',{credentials:'include'}).then(r=>r.text()).then(d=>alert(d))</script>\"></iframe>",
    businessImpact: "Exposição de tokens e configurações confidenciais de perfil.",
    remediation: "Remover reflexão de Origin: null e validar estritamente origens permitidas.",
    bountyAmount: 800,
    currency: "USD",
    createdAt: getDaysAgoDate(52),
    updatedAt: getDaysAgoDate(45),
    timeline: [
      { id: "t1", date: getDaysAgoDate(52), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-010",
    title: "Bypass de MFA via Manipulação de Resposta HTTP no Endpoint de Validação",
    target: "auth.streamflow.com",
    platform: "HackerOne",
    vulnerabilityType: "Authentication Bypass",
    severity: "CRITICAL",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
    cvssScore: 8.8,
    cwe: "CWE-287: Improper Authentication",
    cveIds: [],
    tags: ["#mfa-bypass", "#response-manipulation", "#auth"],
    summary: "O frontend confiava exclusivamente no atributo {\"verified\": true} retornado no corpo da resposta sem validação criptográfica no servidor.",
    stepsToReproduce: ["Inserir código OTP inválido e reescrever resposta para {\"success\": true, \"verified\": true}."],
    proofOfConcept: "HTTP/1.1 200 OK\n{\"status\":\"SUCCESS\",\"verified\":true}",
    businessImpact: "Invasão de contas de alto privilégio com proteção de dois fatores ativada.",
    remediation: "Emitir tokens de sessão assinados no backend apenas após checagem interna do OTP.",
    bountyAmount: 3200,
    currency: "USD",
    createdAt: getDaysAgoDate(78),
    updatedAt: getDaysAgoDate(65),
    timeline: [
      { id: "t1", date: getDaysAgoDate(78), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-011",
    title: "Path Traversal em Gerador de Relatórios Exportáveis via Parâmetro template_path",
    target: "app.cloudmetrics.io",
    platform: "Bugcrowd",
    vulnerabilityType: "Path Traversal",
    severity: "HIGH",
    status: "RESOLVED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    cvssScore: 7.7,
    cwe: "CWE-22: Improper Limitation of a Pathname to a Restricted Directory",
    cveIds: [],
    tags: ["#path-traversal", "#lfi", "#cwe-22"],
    summary: "Parâmetro template_path não filtra sequências '../', permitindo leitura arbitrária de arquivos de configuração.",
    stepsToReproduce: ["POST /api/export com template_path=../../../../etc/hosts."],
    proofOfConcept: "POST /api/export\n{\"template_path\": \"../../../../etc/passwd\"}",
    businessImpact: "Vazamento de configurações do sistema operacional e variáveis de ambiente.",
    remediation: "Usar paths canônicos e validar contra diretório base fixo.",
    bountyAmount: 1600,
    currency: "USD",
    createdAt: getDaysAgoDate(105),
    updatedAt: getDaysAgoDate(95),
    timeline: [
      { id: "t1", date: getDaysAgoDate(105), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-012",
    title: "Race Condition na Transferência de Saldo entre Subcontas gerando Créditos Duplicados",
    target: "api.finpay-global.com",
    platform: "HackerOne",
    vulnerabilityType: "Business Logic / Race Condition",
    severity: "HIGH",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:H/A:N",
    cvssScore: 7.5,
    cwe: "CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization",
    cveIds: [],
    tags: ["#race-condition", "#fintech", "#cwe-362"],
    summary: "Requisições simultâneas de transferência exploram ausência de lock pessimista no banco de dados.",
    stepsToReproduce: ["Disparar 10 requisições HTTP simultâneas com Turbo Intruder no endpoint /transfer."],
    proofOfConcept: "10 requisições enviadas no mesmo pacote TCP sincronizado.",
    businessImpact: "Criação artificial de fundos e duplicidade de saldo financeiro.",
    remediation: "Aplicar SELECT FOR UPDATE ou controle distribuído de lock via Redis/Postgres.",
    bountyAmount: 2800,
    currency: "USD",
    createdAt: getDaysAgoDate(134),
    updatedAt: getDaysAgoDate(120),
    timeline: [
      { id: "t1", date: getDaysAgoDate(134), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-013",
    title: "Privilege Escalation Horizontal em Configurações de Equipe via PATCH /api/teams/{id}",
    target: "hub.devspace.net",
    platform: "Intigriti",
    vulnerabilityType: "Broken Access Control",
    severity: "HIGH",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:N",
    cvssScore: 8.1,
    cwe: "CWE-285: Improper Authorization",
    cveIds: [],
    tags: ["#access-control", "#bfla", "#rbac"],
    summary: "Membros com papel de visualizador (Viewer) conseguem alterar permissões de administradores manipulando o payload.",
    stepsToReproduce: ["Enviar PATCH /api/teams/org_991/roles com novo cargo."],
    proofOfConcept: "PATCH /api/teams/412/members/999\n{\"role\": \"OWNER\"}",
    businessImpact: "Tomada de controle administrativa de organizações terceiras.",
    remediation: "Verificar rigorosamente permissões do usuário antes de atualizar atributos no banco.",
    bountyAmount: 1900,
    currency: "USD",
    createdAt: getDaysAgoDate(160),
    updatedAt: getDaysAgoDate(150),
    timeline: [
      { id: "t1", date: getDaysAgoDate(160), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-014",
    title: "Remote Code Execution (RCE) via Deserialização Insegura de Objeto Java em Endpoint de Monitoramento",
    target: "collector.cloudmetrics.io",
    platform: "Bugcrowd",
    vulnerabilityType: "RCE / Insecure Deserialization",
    severity: "CRITICAL",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
    cvssScore: 10.0,
    cwe: "CWE-502: Deserialization of Untrusted Data",
    cveIds: ["CVE-2023-22515"],
    tags: ["#rce", "#critical", "#deserialization", "#ysoserial"],
    summary: "Endpoint de ingestão de métricas utilizava ObjectInputStream com dados recebidos diretamente pela rede sem filtro de classes.",
    stepsToReproduce: ["Enviar payload gadget CommonsCollections através do header de métricas."],
    proofOfConcept: "POST /ingest/v1/metrics com serialized stream binário.",
    businessImpact: "Execução remota completa de comandos no servidor backend como usuário root/container.",
    remediation: "Substituir serialização binária nativa por formatos de troca seguros como JSON ou Protobuf.",
    bountyAmount: 6000,
    currency: "USD",
    createdAt: getDaysAgoDate(192),
    updatedAt: getDaysAgoDate(175),
    timeline: [
      { id: "t1", date: getDaysAgoDate(192), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-015",
    title: "Open Redirect no Endpoint de Logout levando a Phishing de Credenciais",
    target: "auth.streamflow.com",
    platform: "HackerOne",
    vulnerabilityType: "Open Redirect",
    severity: "LOW",
    status: "RESOLVED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:N/I:L/A:N",
    cvssScore: 4.7,
    cwe: "CWE-601: URL Redirection to Untrusted Site",
    cveIds: [],
    tags: ["#open-redirect", "#cwe-601", "#phishing"],
    summary: "Parâmetro return_to aceitava URLs absolutas iniciando com //evil.com sem restrição.",
    stepsToReproduce: ["Acessar /logout?return_to=//attacker.com."],
    proofOfConcept: "GET /auth/logout?return_to=https://attacker-phishing.com",
    businessImpact: "Redirecionamento de usuários desavisados para telas falsas de autenticação.",
    remediation: "Validar se URL de retorno é relativa ou pertence a domínios de confiança.",
    bountyAmount: 300,
    currency: "USD",
    createdAt: getDaysAgoDate(220),
    updatedAt: getDaysAgoDate(215),
    timeline: [
      { id: "t1", date: getDaysAgoDate(220), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-016",
    title: "Exposição de Métricas Prometheus com Tokens e Segredos em Memória em /actuator/prometheus",
    target: "api.finpay-global.com",
    platform: "HackerOne",
    vulnerabilityType: "Information Disclosure",
    severity: "MEDIUM",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    cvssScore: 5.3,
    cwe: "CWE-200: Exposure of Sensitive Information",
    cveIds: [],
    tags: ["#actuator", "#prometheus", "#spring-boot"],
    summary: "Endpoints do Spring Boot Actuator estavam publicamente expostos na internet sem autenticação.",
    stepsToReproduce: ["GET /actuator/prometheus."],
    proofOfConcept: "GET /actuator/prometheus HTTP/1.1\nHost: api.finpay-global.com",
    businessImpact: "Exposição de estatísticas de conexões, nomes de microserviços e rotas internas.",
    remediation: "Restringir acesso a actuator via rede interna ou porta gerencial protegida.",
    bountyAmount: 750,
    currency: "USD",
    createdAt: getDaysAgoDate(255),
    updatedAt: getDaysAgoDate(245),
    timeline: [
      { id: "t1", date: getDaysAgoDate(255), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-017",
    title: "Server-Side Template Injection (SSTI) em Notificações Personalizadas por Email (Jinja2)",
    target: "hub.devspace.net",
    platform: "Intigriti",
    vulnerabilityType: "SSTI",
    severity: "HIGH",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N",
    cvssScore: 8.8,
    cwe: "CWE-1336: Improper Neutralization of Special Elements Used in a Template Engine",
    cveIds: [],
    tags: ["#ssti", "#jinja2", "#python", "#cwe-1336"],
    summary: "O template de email aceitava tags Jinja2 brutas no nome do remetente, permitindo escape da sandbox.",
    stepsToReproduce: ["Cadastrar nome de projeto como {{7*7}} e solicitar envio de convite por email."],
    proofOfConcept: "{{ self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read() }}",
    businessImpact: "Leitura de variáveis de ambiente e execução de comandos no worker de emails.",
    remediation: "Renderizar templates passando dados como variáveis de contexto em vez de interpolar strings.",
    bountyAmount: 2500,
    currency: "USD",
    createdAt: getDaysAgoDate(290),
    updatedAt: getDaysAgoDate(270),
    timeline: [
      { id: "t1", date: getDaysAgoDate(290), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-018",
    title: "Weak Cryptographic Key Derivation em Tokens de Redefinição de Senha gerados por PRNG inseguro",
    target: "auth.streamflow.com",
    platform: "HackerOne",
    vulnerabilityType: "Cryptographic Weakness",
    severity: "HIGH",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N",
    cvssScore: 7.4,
    cwe: "CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)",
    cveIds: [],
    tags: ["#crypto", "#prng", "#token-prediction"],
    summary: "Tokens de recuperação eram gerados com Math.random() e timestamp de milissegundos, tornando sementes previsíveis.",
    stepsToReproduce: ["Disparar recuperação de senha e reproduzir geração sequencial em script."],
    proofOfConcept: "Script prevendo token com precisão em menos de 100 tentativas.",
    businessImpact: "Recuperação não autorizada de senhas de usuários corporativos.",
    remediation: "Utilizar crypto.randomBytes() com 32 bytes de entropia criptográfica.",
    bountyAmount: 2200,
    currency: "USD",
    createdAt: getDaysAgoDate(320),
    updatedAt: getDaysAgoDate(305),
    timeline: [
      { id: "t1", date: getDaysAgoDate(320), title: "Submissão", type: "creation" }
    ]
  },
  {
    id: "REP-2024-019",
    title: "Cross-Site WebSocket Hijacking (CSWSH) no Feed de Atividades em Tempo Real",
    target: "hub.devspace.net",
    platform: "Intigriti",
    vulnerabilityType: "CSWSH",
    severity: "MEDIUM",
    status: "RESOLVED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N",
    cvssScore: 6.5,
    cwe: "CWE-346: Origin Validation Error",
    cveIds: [],
    tags: ["#cswsh", "#websocket", "#cross-origin"],
    summary: "Handshake do WebSocket em /ws/live não validava o cabeçalho Origin durante a negociação.",
    stepsToReproduce: ["Página maliciosa abrindo WebSocket para wss://hub.devspace.net/ws/live."],
    proofOfConcept: "var ws = new WebSocket('wss://hub.devspace.net/ws/live'); ws.onmessage = function(e){ console.log(e.data); }",
    businessImpact: "Espionagem e captura de mensagens privadas de projetos em tempo real.",
    remediation: "Validar rigorosamente cabeçalho Origin no servidor WebSocket e exigir token de canal único.",
    bountyAmount: 900,
    currency: "USD",
    createdAt: getDaysAgoDate(345),
    updatedAt: getDaysAgoDate(330),
    timeline: [
      { id: "t1", date: getDaysAgoDate(345), title: "Submissão", type: "creation" }
    ]
  }
];

export const INITIAL_TARGETS: TargetProgram[] = [
  {
    id: "TGT-001",
    name: "FinPay Global",
    domain: "finpay-global.com",
    platform: "HackerOne",
    programUrl: "https://hackerone.com/finpay-global",
    bountyRange: "$200 - $10,000",
    inScope: ["*.finpay-global.com", "api.finpay-global.com", "app.finpay-global.com", "iOS / Android apps"],
    outOfScope: ["blog.finpay-global.com", "Social Engineering", "DDoS/DoS", "Physical attacks"],
    notes: "Foco principal em APIs de pagamento e endpoints de usuários. Respondem em média em 2 dias.",
    status: "ACTIVE",
    reportsCount: 1,
    totalRewarded: 3500
  },
  {
    id: "TGT-002",
    name: "CloudMetrics IO",
    domain: "cloudmetrics.io",
    platform: "Bugcrowd",
    programUrl: "https://bugcrowd.com/cloudmetrics",
    bountyRange: "$150 - $5,000",
    inScope: ["app.cloudmetrics.io", "*.cloudmetrics.net", "collector.cloudmetrics.io"],
    outOfScope: ["Third-party integrations", "Rate-limit sem impacto demonstrado", "SPF/DMARC puro"],
    notes: "Tecnologia principal: Node.js, AWS EKS, PostgreSQL, Redis. Webhooks e integrações de dados são ótimos vetores.",
    status: "ACTIVE",
    reportsCount: 1,
    totalRewarded: 0
  },
  {
    id: "TGT-003",
    name: "DevSpace Network",
    domain: "devspace.net",
    platform: "Intigriti",
    programUrl: "https://app.intigriti.com/programs/devspace",
    bountyRange: "€100 - €4,000",
    inScope: ["*.devspace.net", "hub.devspace.net", "auth.devspace.net"],
    outOfScope: ["Clickjacking em páginas públicas sem dados", "Self-XSS"],
    notes: "Comunidade de devs com muito processamento de markdown e uploads de avatar. Pagamentos rápidos em Euro.",
    status: "ACTIVE",
    reportsCount: 1,
    totalRewarded: 750
  },
  {
    id: "TGT-004",
    name: "StreamFlow Media",
    domain: "streamflow.com",
    platform: "HackerOne",
    programUrl: "https://hackerone.com/streamflow",
    bountyRange: "$500 - $15,000",
    inScope: ["*.streamflow.com", "auth.streamflow.com", "player.streamflow.com"],
    outOfScope: ["Infraestrutura de CDN Akamai externa"],
    notes: "Plataforma de streaming. Excelente retorno para bugs de autenticação e bypass de DRM/assinatura.",
    status: "ACTIVE",
    reportsCount: 1,
    totalRewarded: 1800
  }
];

export const INITIAL_DOCS: TechnicalDoc[] = [
  {
    id: "DOC-001",
    title: "Metodologia de Caça a IDOR / BOLA de Alto Impacto",
    category: "Methodology",
    content: `### Metodologia de Teste para IDOR (Insecure Direct Object Reference)

O IDOR é uma das vulnerabilidades mais recompensadas em Bug Bounty ($1,000 - $15,000).

#### 1. Mapeamento de Identificadores
- Procure por identificadores numéricos (\`id=1240\`), UUIDs (\`fa84-912a...\`), hashes MD5 ou nomes de usuário em rotas e query params.
- Identifique a diferença entre rotas públicas e rotas que exigem autorização.

#### 2. Matriz de Contas (Dual Session Setup)
- Crie **duas contas distintas** (Usuário A e Usuário B) em organizações/workspaces diferentes.
- Guarde os cookies/tokens de ambas no Burp Suite usando extensões como **Autorize** ou **Match and Replace**.

#### 3. Vetores de Bypass Comuns
- **Troca de Verbo HTTP**: Substitua \`GET /api/user/10\` por \`POST /api/user/10\` ou \`PATCH /api/user/10\`.
- **Content-Type Juggling**: Mude de \`application/json\` para \`application/xml\` ou \`application/x-www-form-urlencoded\`.
- **Parameter Pollution**: \`GET /api/user?id=10&id=20\` ou \`GET /api/user?id[]=10&id[]=20\`.
- **Manipulação de Formato de Resposta**: Adicione \`.json\`, \`.xml\` ao final do endpoint: \`/api/invoice/450.json\`.
- **IDOR em Recursos Aninhados**: \`/api/organization/1/users/50\` -> tente trocar apenas o \`1\` ou apenas o \`50\`.`,
    tags: ["IDOR", "BOLA", "API", "Burp Suite", "High Bounty"],
    updatedAt: "2024-04-01"
  },
  {
    id: "DOC-002",
    title: "Checklist de Reconhecimento & Descoberta de Ativos (Bug Bounty)",
    category: "Checklist",
    isChecklist: true,
    checklistItems: [
      { id: "c1", text: "Enumeração passiva de subdomínios (Subfinder, Amass, Chaos)", completed: true, category: "Recon Passivo" },
      { id: "c2", text: "Consulta a certificados SSL transparentes (crt.sh, Certspotter)", completed: true, category: "Recon Passivo" },
      { id: "c3", text: "Resolução DNS e filtragem de hosts ativos (httpx, dnsx)", completed: true, category: "Recon Ativo" },
      { id: "c4", text: "Varredura de portas abertas em faixas declaradas (Naabu, Nmap)", completed: false, category: "Recon Ativo" },
      { id: "c5", text: "Detecção de Subdomain Takeover (apontamentos CNAME órfãos)", completed: true, category: "Takeover" },
      { id: "c6", text: "Spidering e extração de endpoints JavaScript (Katana, Waybackurls, Gau)", completed: false, category: "Content Discovery" },
      { id: "c7", text: "Fuzzing de parâmetros ocultos em rotas de API (Arjun, x8)", completed: false, category: "Param Mining" },
      { id: "c8", text: "Inspeção de arquivos .git, .env, swagger.json expostos", completed: false, category: "Sensitive Files" }
    ],
    content: "Checklist essencial a ser executado em novos alvos para maximizar a superfície de ataque e encontrar portas de entrada esquecidas pela equipe de desenvolvimento.",
    tags: ["Recon", "Checklist", "Subfinder", "Httpx", "OWASP"],
    updatedAt: "2024-04-08"
  },
  {
    id: "DOC-003",
    title: "Payloads & Técnicas de Bypass para SSRF em Nuvens (AWS, GCP, Azure)",
    category: "Payloads",
    content: `### Cheat Sheet de SSRF para Cloud Metadata

#### AWS (IMDSv1 & IMDSv2)
- Direto IMDSv1: \`http://169.254.169.254/latest/meta-data/\`
- Credenciais IAM: \`http://169.254.169.254/latest/meta-data/iam/security-credentials/\`
- User-Data (senhas e chaves SSH): \`http://169.254.169.254/latest/user-data\`

#### Bypasses de Validação de IP (Bypass Blacklist)
- **Decimal / Dword IP**: \`http://2852039166/\` (equivale a 169.254.169.254)
- **Hexadecimal IP**: \`http://0xa9fea9fe/\`
- **Octal IP**: \`http://0251.0376.0251.0376/\`
- **IPv6 Mapped IPv4**: \`http://[::ffff:169.254.169.254]/\`
- **DNS Rebinding**: Configure serviço como \`rbndr.us\` alternando entre 127.0.0.1 e 169.254.169.254 com TTL 0.

#### Google Cloud Platform (GCP)
- Endpoint: \`http://metadata.google.internal/computeMetadata/v1/\`
- Requisito: Exige o header \`Metadata-Flavor: Google\`. Procure por endpoints que permitam injeção de headers (CRLF).

#### Azure
- Endpoint: \`http://169.254.169.254/metadata/instance?api-version=2021-02-01\`
- Header: \`Metadata: true\``,
    tags: ["SSRF", "Cloud", "AWS", "Bypass", "Critical"],
    updatedAt: "2024-03-20"
  },
  {
    id: "DOC-004",
    title: "Estrutura Perfeita de Relatório para Triadores Aceitarem na 1ª Leitura",
    category: "Writeup",
    content: `### O Guia do Relatório que Maximiza Recompensas

Triadores analisam dezenas de relatórios por hora. Relatórios confusos são frequentemente rebaixados para 'Informative' ou rejeitados como 'Needs More Info'.

#### 1. Título Padrão Ouro
Formato: \`[Tipo de Vulnerabilidade] em [Local / Endpoint] permite [Impacto Crítico no Negócio]\`
- Ruim: *"Bug de segurança no site"*
- Excelente: *"Broken Object Level Authorization em /api/v2/orders expõe histórico de compras de outros usuários"*

#### 2. Resumo Executivo
Em 2 a 3 parágrafos claros:
- O que é o problema
- Onde reside a causa raiz (ex: falta de validação no middleware de sessão)
- Qual o pior cenário plausível

#### 3. Passos Determinísticos
- Cada passo deve ser reproduzível por qualquer analista.
- Inclua credenciais ou estados prévios necessários (ex: "Necessita de duas contas ativas: Atacante e Vítima").

#### 4. Prova de Conceito Limpa
- Envie a requisição HTTP bruta (Raw Request) e a resposta.
- Destaque o payload exato em bloco de código.
- NUNCA altere dados reais de outros clientes; use suas próprias contas de teste.`,
    tags: ["Writing", "Triage", "Best Practices", "Bounty Optimization"],
    updatedAt: "2024-04-05"
  }
];
