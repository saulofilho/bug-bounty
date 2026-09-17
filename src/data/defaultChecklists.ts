import { SecurityChecklistTemplate } from '../types';

export const DEFAULT_SECURITY_CHECKLISTS: SecurityChecklistTemplate[] = [
  {
    id: 'chk-owasp-a01-broken-access-control',
    title: 'Broken Access Control & IDOR / BOLA Verification',
    category: 'Broken Access Control',
    owaspReference: 'OWASP A01:2021',
    cwe: 'CWE-639: Authorization Bypass Through User-Controlled Key',
    defaultSeverity: 'HIGH',
    vulnerabilityType: 'Broken Access Control (IDOR / BOLA)',
    description: 'Verificação exaustiva de autorização horizontal e vertical, manipulação de IDs sequenciais/UUIDs, escalonamento de privilégios e violações de isolamento multi-tenant.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    defaultStepsToReproduce: [
      '1. Autentique-se com a Conta A (Vítima) e identifique o ID de um recurso privado pertencente a ela.',
      '2. Autentique-se em uma sessão separada com a Conta B (Atacante) sem permissão sobre o recurso da Conta A.',
      '3. Através do proxy HTTP (Burp Suite), substitua o identificador do recurso da Conta B pelo ID da Conta A.',
      '4. Observe que o backend processa e retorna os dados confidenciais com código HTTP 200 OK sem validar propriedade.'
    ],
    proofOfConceptTemplate: `GET /api/v2/users/10492/financial-statements HTTP/1.1
Host: target.com
Authorization: Bearer <TOKEN_CONTA_B_SEM_ACESSO>
X-Requested-With: XMLHttpRequest

HTTP/1.1 200 OK
Content-Type: application/json

{
  "account_id": "10492",
  "owner_name": "Conta Vitima",
  "ssn": "XXX-XX-8921",
  "balance": 184500.00
}`,
    businessImpactSummary: 'Permite que usuários não autorizados visualizem, modifiquem ou excluam registros confidenciais de outros clientes, gerando vazamento massivo de PII e violação de LGPD/GDPR.',
    remediationSummary: 'Implementar verificações estritas de controle de acesso no nível de objeto (ABAC/RBAC) no servidor. Nunca confiar em parâmetros enviados pelo cliente para determinar a propriedade do recurso.',
    tags: ['owasp-top-10', 'a01', 'idor', 'bola', 'access-control', 'privilege-escalation'],
    items: [
      {
        id: 'a01-item-1',
        title: 'Verificar autorização em nível de objeto (BOLA/IDOR) em endpoints REST e GraphQL',
        description: 'Testar substituição de IDs em parâmetros de rota (/users/{id}), query string (?user_id=) e corpo JSON.',
        guidance: 'Utilize duas contas de teste (Privileged e Unprivileged) no Burp Suite com a extensão Match & Replace ou AutoRepeater.',
        category: 'Horizontal Privilege Escalation',
        required: true
      },
      {
        id: 'a01-item-2',
        title: 'Validar escalonamento vertical de privilégios (Usuário Comum vs. Admin/Staff)',
        description: 'Acessar rotas administrativas (/admin, /api/v1/internal, /manage) com token de usuário padrão.',
        guidance: 'Verifique se métodos privilegiados validam claims de role no backend em vez de apenas no roteamento client-side.',
        category: 'Vertical Privilege Escalation',
        required: true
      },
      {
        id: 'a01-item-3',
        title: 'Testar manipulação de métodos HTTP (Verb Tampering & Method Override)',
        description: 'Substituir GET por POST, PUT ou DELETE, ou adicionar cabeçalhos como X-HTTP-Method-Override: PUT.',
        guidance: 'Alguns gateways bloqueiam GET /admin/users mas permitem PUT ou POST sem inspeção de autorização.',
        category: 'HTTP Method Tampering'
      },
      {
        id: 'a01-item-4',
        title: 'Verificar isolamento de dados entre empresas (Multi-Tenant Data Isolation)',
        description: 'Tentar acessar ou alterar registros de Tenant ID diferente alterando o cabeçalho X-Tenant-ID ou Org-ID.',
        guidance: 'Confirme se o contexto do banco de dados aplica escopo obrigatório por organização em todas as consultas SQL/ORM.',
        category: 'Multi-Tenancy',
        required: true
      },
      {
        id: 'a01-item-5',
        title: 'Testar parâmetro Mass Assignment / Auto-binding de privilégios',
        description: 'Injetar campos sensíveis no payload de cadastro ou edição (ex: "isAdmin": true, "role": "superuser").',
        guidance: 'Verifique a resposta da API para confirmar se o atributo foi persistido no banco de dados do usuário.',
        category: 'Mass Assignment'
      },
      {
        id: 'a01-item-6',
        title: 'Confirmar que a validação de autorização é feita estritamente no backend',
        description: 'Inspecionar código frontend para garantir que rotas e botões ocultos não sejam o único mecanismo de proteção.',
        guidance: 'Requisite diretamente as APIs sem passar pela interface gráfica da aplicação.',
        category: 'Architecture'
      }
    ]
  },
  {
    id: 'chk-owasp-a03-injection',
    title: 'SQL, NoSQL & Command Injection Verification',
    category: 'Injection',
    owaspReference: 'OWASP A03:2021',
    cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
    defaultSeverity: 'CRITICAL',
    vulnerabilityType: 'Injection (SQLi / NoSQLi / Command Injection)',
    description: 'Protocolo de validação de vulnerabilidades de injeção em banco de dados relacional, NoSQL e comandos do sistema operacional.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    defaultStepsToReproduce: [
      '1. Identifique o parâmetro de entrada vulnerável (ex: termo de busca, filtro de data ou campo de ordenação).',
      '2. Injete um payload de teste inofensivo baseado em tempo: \'; WAITFOR DELAY \'0:0:5\'-- ou \'; SELECT pg_sleep(5);--.',
      '3. Meça o tempo de resposta do servidor (RTT) e confirme a latência induzida de exatamente 5 segundos.',
      '4. Valide a extração da versão do banco ou usuário corrente sem extrair dados confidenciais desnecessários.'
    ],
    proofOfConceptTemplate: `GET /api/products/search?sort=name+(CASE+WHEN+(1=1)+THEN+pg_sleep(5)+ELSE+pg_sleep(0)+END) HTTP/1.1
Host: api.target.com
User-Agent: BugBounty-Verifier

HTTP/1.1 200 OK
Response-Time: 5.124s
Content-Type: application/json

[{"id": 1, "name": "Produto Teste"}]`,
    businessImpactSummary: 'Execução arbitrária de comandos SQL pode permitir exfiltração integral do banco de dados, modificação de saldo financeiro, bypass total de autenticação e potencial RCE através de extensões do SGBD.',
    remediationSummary: 'Utilizar exclusivamente consultas parametrizadas (Prepared Statements) ou ORMs seguros. Sanitizar e validar entradas de acordo com listas de permissão (allowlist) para cláusulas ORDER BY e identificadores.',
    tags: ['owasp-top-10', 'a03', 'sqli', 'injection', 'command-injection', 'rce'],
    items: [
      {
        id: 'a03-item-1',
        title: 'Testar injeção booleana e baseada em tempo (Time-based Blind SQLi)',
        description: 'Injetar funções como pg_sleep(), SLEEP() ou DBMS_LOCK.SLEEP() para avaliar execução condicionada no banco.',
        guidance: 'Utilize pausas de 5 e 10 segundos com múltiplas iterações para afastar falsos positivos decorrentes de instabilidade de rede.',
        category: 'SQL Injection',
        required: true
      },
      {
        id: 'a03-item-2',
        title: 'Verificar injeção em cláusulas ORDER BY, GROUP BY e nomes de tabelas',
        description: 'Parâmetros de ordenação comumente não podem ser parametrizados por Prepared Statements nativos.',
        guidance: 'Valide se a aplicação utiliza validação estrita por lista branca (ex: apenas "asc", "desc", "id", "created_at").',
        category: 'SQL Injection'
      },
      {
        id: 'a03-item-3',
        title: 'Testar NoSQL Injection em APIs MongoDB / DynamoDB',
        description: 'Injetar operadores MongoDB como {"$gt": ""}, {"$ne": null} ou {"$regex": ".*"} em campos de autenticação ou filtro.',
        guidance: 'Altere o Content-Type para application/json e substitua strings por objetos com operadores NoSQL.',
        category: 'NoSQL Injection'
      },
      {
        id: 'a03-item-4',
        title: 'Verificar OS Command Injection em utilitários de sistema (ffmpeg, ImageMagick, curl)',
        description: 'Testar metacaracteres shell (| ; & ` $(command)) em nomes de arquivos enviados ou parâmetros de conversão.',
        guidance: 'Utilize payloads assíncronos com OOB (Out-of-band) DNS/HTTP interaction através de ferramentas autorizadas.',
        category: 'Command Injection',
        required: true
      },
      {
        id: 'a03-item-5',
        title: 'Validar proteção contra Second-Order SQL Injection',
        description: 'Injetar payloads em campos armazenados (ex: nome de usuário) que são lidos e concatenados em consultas posteriores.',
        guidance: 'Rastreie o ciclo de vida do dado desde o cadastro até relatórios e telas de administração.',
        category: 'Second-Order Injection'
      },
      {
        id: 'a03-item-6',
        title: 'Garantir desativação de mensagens de erro detalhadas do banco em produção',
        description: 'Confirmar que exceções do driver JDBC/PostgreSQL não vazam schema, consultas internas ou caminhos.',
        guidance: 'Verifique se respostas de erro retornam mensagens genéricas e códigos de status padronizados.',
        category: 'Information Disclosure'
      }
    ]
  },
  {
    id: 'chk-owasp-a10-ssrf',
    title: 'Server-Side Request Forgery (SSRF) & Cloud Metadata Verification',
    category: 'SSRF',
    owaspReference: 'OWASP A10:2021',
    cwe: 'CWE-918: Server-Side Request Forgery (SSRF)',
    defaultSeverity: 'CRITICAL',
    vulnerabilityType: 'Server-Side Request Forgery (SSRF)',
    description: 'Protocolo de validação de requisições forjadas a partir do servidor para recursos internos, metadados da nuvem (AWS/GCP/Azure) e serviços de loopback.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
    defaultStepsToReproduce: [
      '1. Identifique um recurso na aplicação que processa URLs externas (ex: importação de avatar, webhook, geração de PDF).',
      '2. Forneça como URL o endpoint de metadados da nuvem do provedor de hospedagem (ex: http://169.254.169.254/latest/meta-data/).',
      '3. Caso haja bloqueio por filtro de IP, teste representações alternativas (ex: 0177.0.0.1, hex 0x7f000001, dns rebinding).',
      '4. Valide a resposta ou use canal OOB (Burp Collaborator / Interactsh) para confirmar a requisição originada do IP interno da nuvem.'
    ],
    proofOfConceptTemplate: `POST /api/v1/import/webhook-test HTTP/1.1
Host: target.com
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "webhook_url": "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token",
  "headers": {
    "Metadata-Flavor": "Google"
  }
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "ya29.c.b0AXv0zT...",
  "expires_in": 3599,
  "token_type": "Bearer"
}`,
    businessImpactSummary: 'Acesso a credenciais temporárias de IAM da instância de computação (AWS EC2 / GCP Compute Engine / Azure VM), permitindo movimentação lateral e comprometimento completo da infraestrutura de nuvem.',
    remediationSummary: 'Implementar validação estrita de lista de permissões (allowlist) de domínios. Desativar redirecionamentos HTTP automáticos. Habilitar IMDSv2 no AWS e cabeçalho obrigatório Metadata-Flavor no GCP. Isolar requisições de egress via rede com firewall.',
    tags: ['owasp-top-10', 'a10', 'ssrf', 'cloud-metadata', 'aws', 'gcp', 'oob'],
    items: [
      {
        id: 'a10-item-1',
        title: 'Testar acesso ao endpoint de metadados da nuvem (169.254.169.254 / 100.100.100.200)',
        description: 'Testar endpoints AWS IAM Role (/latest/meta-data/iam/security-credentials/), GCP Metadata e Azure Instance Metadata.',
        guidance: 'Para GCP, adicione o cabeçalho Metadata-Flavor: Google se o endpoint permitir envio de headers personalizados.',
        category: 'Cloud Metadata Exploitation',
        required: true
      },
      {
        id: 'a10-item-2',
        title: 'Testar técnicas de bypass de filtro de IP (Octal, Hex, Decimal, DNS Rebinding)',
        description: 'Avaliar resoluções alternativas para 127.0.0.1 como 2130706433, 0177.0000.0000.0001, 0x7f.0.0.1 ou localhost.',
        guidance: 'Utilize domínios de DNS Rebinding ou serviços como nip.io / 127.0.0.1.nip.io para contornar validações baseadas em regex simples.',
        category: 'Filter Bypass'
      },
      {
        id: 'a10-item-3',
        title: 'Verificar varredura de portas internas na rede local (Loopback & Private Subnets)',
        description: 'Testar conexões com portas comuns de infraestrutura interna: 6379 (Redis), 9200 (Elasticsearch), 2375 (Docker), 8080.',
        guidance: 'Compare o tempo de resposta e mensagens de erro entre portas abertas e fechadas para confirmar varredura interna cega.',
        category: 'Port Scanning'
      },
      {
        id: 'a10-item-4',
        title: 'Validar suporte a esquemas de protocolo alternativos (gopher://, file://, dict://)',
        description: 'Testar se a biblioteca de cliente HTTP permite protocolos que possibilitam escrita arbitrária em sockets TCP.',
        guidance: 'O protocolo gopher:// pode ser explorado para injetar comandos em instâncias desprotegidas do Redis na rede local.',
        category: 'Protocol Smuggling'
      },
      {
        id: 'a10-item-5',
        title: 'Testar redirecionamento aberto (Open Redirect) como trampolim para SSRF',
        description: 'Fornecer uma URL externa permitida que redireciona (302/301) para 169.254.169.254 ou rede interna.',
        guidance: 'Muitos parsers validam o domínio inicial, mas seguem redirecionamentos cegamente sem revalidar o destino final.',
        category: 'Chained Vulnerability',
        required: true
      }
    ]
  },
  {
    id: 'chk-owasp-a07-auth-failures',
    title: 'Authentication & Session Management Verification',
    category: 'Authentication & Session',
    owaspReference: 'OWASP A07:2021',
    cwe: 'CWE-287: Improper Authentication',
    defaultSeverity: 'HIGH',
    vulnerabilityType: 'Authentication Failures (MFA Bypass / Session Hijacking)',
    description: 'Checklist rigoroso para validação de fluxos de login, recuperação de senha, autenticação multifator (MFA), segurança de tokens JWT e gestão de sessões.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    defaultStepsToReproduce: [
      '1. Inicie o fluxo de login com credenciais válidas e solicitação de código 2FA / OTP.',
      '2. Ao receber a tela de verificação 2FA, intercepte a resposta do servidor no Burp Suite.',
      '3. Altere a resposta de erro {"status":"invalid_token","code":401} para {"status":"success","code":200}.',
      '4. Observe que o cliente concede acesso integral à conta sem validar o token criptográfico no backend.'
    ],
    proofOfConceptTemplate: `POST /api/v1/auth/verify-mfa HTTP/1.1
Host: target.com
Content-Type: application/json

{
  "session_token": "temp_sess_908234",
  "mfa_code": "000000"
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "authenticated": true,
  "access_token": "eyJhbGciOiJSUzI1NiIsIn...",
  "user": { "id": 4921, "role": "admin" }
}`,
    businessImpactSummary: 'Bypass de autenticação permite que atacantes assumam controle irrestrito de qualquer conta de usuário ou administrador na plataforma sem conhecimento prévio do segundo fator de autenticação.',
    remediationSummary: 'Exigir que todas as verificações de estado ocorram estritamente no backend. Invalidar sessões antigas após elevação de privilégios. Implementar rate-limiting rígido contra brute force e adotar bibliotecas padrão de JWT com verificação de assinatura assimétrica.',
    tags: ['owasp-top-10', 'a07', 'authentication', 'mfa-bypass', 'jwt', 'session-management'],
    items: [
      {
        id: 'a07-item-1',
        title: 'Verificar proteção contra força bruta e rate-limiting em endpoints de autenticação',
        description: 'Testar envio de 50+ requisições com senhas incorretas ou códigos OTP sequenciais sem bloqueio.',
        guidance: 'Avalie se cabeçalhos como X-Forwarded-For ou X-Real-IP podem ser manipulados para contornar o bloqueio por IP.',
        category: 'Brute Force Protection',
        required: true
      },
      {
        id: 'a07-item-2',
        title: 'Testar bypass de 2FA/MFA via manipulação de resposta ou omissão de parâmetros',
        description: 'Tentar acessar rotas pós-login diretamente (/dashboard, /settings) antes de preencher o código 2FA.',
        guidance: 'Verifique se a sessão provisória emitida antes do 2FA possui privilégios de acesso a APIs autenticadas.',
        category: 'MFA Bypass',
        required: true
      },
      {
        id: 'a07-item-3',
        title: 'Validar segurança da assinatura e estrutura de tokens JWT',
        description: 'Testar ataques clássicos de JWT: algoritmo "none", troca de RS256 para HS256 com chave pública, e bypass de expiração.',
        guidance: 'Utilize extensões como JWT Heartbreaker no Burp para auditar a validação de assinatura no backend.',
        category: 'JWT Security'
      },
      {
        id: 'a07-item-4',
        title: 'Verificar invalidação completa de sessão no logout e na alteração de senha',
        description: 'Tentar reutilizar o token ou cookie de sessão capturado antes da ação de logout ou troca de senha.',
        guidance: 'Se o token antigo continuar válido, a aplicação não gerencia uma revogação de tokens em lista de invalidação (revocation list).',
        category: 'Session Revocation'
      },
      {
        id: 'a07-item-5',
        title: 'Testar fluxo de recuperação de senha contra vazamento de token de reset',
        description: 'Verificar se o token de recuperação é vazado em cabeçalhos Referer para domínios terceiros ou logs.',
        guidance: 'Inspecione links de rastreamento de e-mail (SendGrid, Mailgun) e requisições a CDNs disparadas na tela de redefinição.',
        category: 'Password Reset Flow'
      }
    ]
  },
  {
    id: 'chk-owasp-api1-bola',
    title: 'OWASP API Security Top 10 - BOLA & BFLA Protocol',
    category: 'API Security',
    owaspReference: 'OWASP API1:2023',
    cwe: 'CWE-284: Improper Access Control',
    defaultSeverity: 'HIGH',
    vulnerabilityType: 'Broken Object Level Authorization (API BOLA)',
    description: 'Roteiro de teste focado em interfaces modernas de API (REST, JSON-RPC, GraphQL) para detecção de BOLA (API1), Broken Authentication (API2) e Broken Object Property Level Authorization (API3).',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    defaultStepsToReproduce: [
      '1. Mapeie os endpoints da API através da documentação (Swagger / OpenAPI / GraphQL Schema).',
      '2. Localize rotas que realizam operações de leitura e gravação recebendo identificadores de objeto.',
      '3. Requisite o recurso com o Bearer token de um usuário que não é proprietário do registro.',
      '4. Comprove a alteração ou leitura indevida dos dados do outro cliente.'
    ],
    proofOfConceptTemplate: `PUT /api/v3/organizations/981/billing-settings HTTP/1.1
Host: api.target.com
Authorization: Bearer <TOKEN_USUARIO_EXTERNO>
Content-Type: application/json

{
  "payout_email": "attacker@exploit.com",
  "invoice_threshold": 100000
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "updated",
  "organization_id": 981
}`,
    businessImpactSummary: 'Acesso e manipulação direta de propriedades críticas em endpoints de APIs consumidas por apps mobile ou SPAs, expondo credenciais corporativas e dados sensíveis.',
    remediationSummary: 'Centralizar verificações de autorização baseadas em identidade do usuário na camada de serviços ou repositório. Validar que o objeto consultado pertence ao tenant autenticado antes de qualquer operação.',
    tags: ['owasp-api-top-10', 'api1', 'bola', 'bfla', 'graphql', 'rest-api'],
    items: [
      {
        id: 'api-item-1',
        title: 'Verificar autorização em nível de objeto (BOLA) em todos os verbos (GET, PUT, PATCH, DELETE)',
        description: 'Garantir que endpoints de atualização ou exclusão validem posse com o mesmo rigor dos de leitura.',
        guidance: 'Frequentemente GET /records/{id} valida permissão, mas DELETE /records/{id} ou PUT /records/{id} não valida.',
        category: 'Object Level Authorization',
        required: true
      },
      {
        id: 'api-item-2',
        title: 'Testar Broken Object Property Level Authorization (API3:2023)',
        description: 'Verificar se a API expõe dados confidenciais nos payloads JSON ou permite alteração de propriedades sensíveis.',
        guidance: 'Inspecione a resposta bruta HTTP; campos como internal_notes, password_hash ou balance podem estar presentes.',
        category: 'Property Level Authorization'
      },
      {
        id: 'api-item-3',
        title: 'Validar Broken Function Level Authorization (BFLA / API5:2023)',
        description: 'Testar endpoints administrativos da API com contas de baixo privilégio ou sem token.',
        guidance: 'Exemplo: /api/v1/users (permitido) vs /api/v1/admin/users/export (deve retornar 403 Forbidden).',
        category: 'Function Level Authorization',
        required: true
      },
      {
        id: 'api-item-4',
        title: 'Auditar consultas GraphQL contra Introspection e Batching Queries',
        description: 'Confirmar se o schema introspection está desativado em produção e se queries aninhadas profundas são limitadas.',
        guidance: 'Envie a query { __schema { types { name } } } para verificar se o catálogo completo da API está público.',
        category: 'GraphQL Security'
      },
      {
        id: 'api-item-5',
        title: 'Verificar consumo irrestrito de recursos (Unrestricted Resource Consumption / API4:2023)',
        description: 'Testar parâmetros de paginação abusivos como ?limit=1000000 ou uploads gigantescos sem limitação.',
        guidance: 'Avalie se a API estabelece tetos rígidos para evitar esgotamento de memória no servidor Node.js/Python.',
        category: 'Resource Throttling'
      }
    ]
  },
  {
    id: 'chk-client-side-xss',
    title: 'Cross-Site Scripting (XSS) & CSP Bypass Verification',
    category: 'Injection',
    owaspReference: 'OWASP A03:2021',
    cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation',
    defaultSeverity: 'MEDIUM',
    vulnerabilityType: 'Cross-Site Scripting (Reflected / Stored / DOM XSS)',
    description: 'Procedimento padronizado para validação de execução de JavaScript arbitrário no navegador da vítima, roubo de sessões e avaliação de Content-Security-Policy (CSP).',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
    defaultStepsToReproduce: [
      '1. Localize o campo de entrada ou parâmetro de consulta refletido na resposta HTML.',
      '2. Injete caracteres especiais de teste: \' " < > & ` para identificar sanitização contextual.',
      '3. Formule um payload executável sem causar danos permanentes (ex: <script>print()</script> ou <svg onload=print()>).',
      '4. Valide a execução no contexto de origem do domínio com a política CSP ativa.'
    ],
    proofOfConceptTemplate: `GET /search?q=%3Csvg%2Fonload%3Dalert%28document.domain%29%3E HTTP/1.1
Host: app.target.com
User-Agent: BugBounty-Hunter

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<div class="search-results">
  Resultados para: <svg/onload=alert(document.domain)>
</div>`,
    businessImpactSummary: 'Execução de script no navegador de usuários autenticados possibilita sequestro de sessões, realização de ações em nome da vítima, defacement e roubo de credenciais via phishing contextual.',
    remediationSummary: 'Aplicar codificação contextual de saída (Context-Aware Output Encoding) em todos os dados controlados pelo usuário. Implementar política rigorosa de Content-Security-Policy (CSP) com nonces criptográficos.',
    tags: ['owasp-top-10', 'xss', 'stored-xss', 'dom-xss', 'csp-bypass', 'client-side'],
    items: [
      {
        id: 'xss-item-1',
        title: 'Verificar reflexão direta de caracteres em parâmetros HTML (Reflected XSS)',
        description: 'Testar reflexão em parâmetros de busca, mensagens de erro, cabeçalhos User-Agent e Referer.',
        guidance: 'Inspecione o código fonte da resposta para entender em qual contexto (HTML body, atributo, script tag) o dado cai.',
        category: 'Reflected XSS',
        required: true
      },
      {
        id: 'xss-item-2',
        title: 'Testar persistência de dados em formulários e perfis (Stored XSS)',
        description: 'Injetar payloads em nomes, bios, comentários e títulos de tickets visualizados por outros usuários ou administradores.',
        guidance: 'Stored XSS em telas de suporte interno ou moderação de conteúdo geralmente atinge severidade CRITICAL.',
        category: 'Stored XSS',
        required: true
      },
      {
        id: 'xss-item-3',
        title: 'Auditar fontes perigosas de DOM XSS (location.hash, document.referrer) e sinks',
        description: 'Identificar passagens de parâmetros não sanitizados para sinks como element.innerHTML, eval() ou document.write().',
        guidance: 'Utilize as ferramentas de depuração do navegador (DOM Invader ou depurador JavaScript) para rastrear o fluxo.',
        category: 'DOM XSS'
      },
      {
        id: 'xss-item-4',
        title: 'Avaliar cabeçalhos Content-Security-Policy (CSP) contra bypass de script-src',
        description: 'Verificar se o CSP permite \'unsafe-inline\', domínios com endpoints JSONP conhecidos ou carregamento de CDNs amplas.',
        guidance: 'Valide o CSP através do Google CSP Evaluator para confirmar a eficácia contra payloads modernos.',
        category: 'CSP Validation'
      }
    ]
  },
  {
    id: 'chk-business-logic-race-conditions',
    title: 'Business Logic Flaws & Race Conditions Verification',
    category: 'Business Logic',
    owaspReference: 'OWASP A04:2021',
    cwe: 'CWE-840: Business Logic Errors',
    defaultSeverity: 'HIGH',
    vulnerabilityType: 'Business Logic Flaw / Race Condition',
    description: 'Validação de integridade nas regras de negócio, concorrência de requisições paralelas (Limit Overrun), cupons de desconto, checkout e precificação.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
    defaultStepsToReproduce: [
      '1. Identifique uma ação de consumo único no sistema (ex: resgate de cupom de desconto ou transferência de fundos).',
      '2. Configure múltiplas requisições idênticas no Burp Suite Turbo Intruder ou ferramenta de concorrência com HTTP/2.',
      '3. Dispare todas as requisições na mesma janela de tempo (Single-Packet Attack) para explorar a janela de concorrência.',
      '4. Observe que o benefício foi concedido múltiplas vezes sem débito correspondente.'
    ],
    proofOfConceptTemplate: `POST /api/v1/promotions/redeem HTTP/2
Host: shop.target.com
Authorization: Bearer <TOKEN>
Content-Type: application/json

{"coupon_code": "DESCONTO-50-BRL"}

# 20 requisições simultâneas via Turbo Intruder resultaram em:
# 18 requisições retornaram HTTP 200 OK
# Crédito aplicado: R$ 900,00 (em vez do limite único de R$ 50,00)`,
    businessImpactSummary: 'Impacto financeiro direto, fraude em programas de fidelidade, geração ilimitada de créditos ou compra de mercadorias com valores manipulados.',
    remediationSummary: 'Utilizar transações atômicas com locks adequados no banco de dados (SELECT FOR UPDATE ou locks distribuídos via Redis). Adotar idempotency keys e constraints de unicidade.',
    tags: ['business-logic', 'race-condition', 'financial-fraud', 'http2-multiplexing'],
    items: [
      {
        id: 'logic-item-1',
        title: 'Testar concorrência de requisições simultâneas (Race Condition / Single-packet attack)',
        description: 'Disparar requisições concorrentes contra ações de uso único (resgate de saldo, cupons, votos, curtidas).',
        guidance: 'Utilize o Burp Turbo Intruder com HTTP/2 connection reuse para garantir chegada dos pacotes no mesmo microssegundo.',
        category: 'Concurrency',
        required: true
      },
      {
        id: 'logic-item-2',
        title: 'Verificar manipulação de preços, quantidades negativas e arredondamento',
        description: 'Testar envio de quantity: -1, quantity: 0.0001 ou prices modificados no payload do carrinho de compras.',
        guidance: 'Confirme se o backend recalcula os preços consultando a tabela de produtos original e rejeita valores <= 0.',
        category: 'Pricing Integrity',
        required: true
      },
      {
        id: 'logic-item-3',
        title: 'Validar integridade de etapas sequenciais (Step Skipping no fluxo de checkout)',
        description: 'Tentar pular diretamente para a etapa de confirmação de pedido sem passar pela etapa de pagamento aprovado.',
        guidance: 'Altere IDs de status de pedido em rotas intermediárias para verificar se o fluxo força validação em máquina de estados.',
        category: 'Workflow Integrity'
      },
      {
        id: 'logic-item-4',
        title: 'Testar reutilização de vouchers ou tokens descartáveis após encerramento de sessão',
        description: 'Verificar se códigos promocionais de boas-vindas podem ser reutilizados em contas com o mesmo cartão ou documento.',
        guidance: 'Avalie a persistência do vínculo entre o documento/identificador fiscal e o uso do cupom.',
        category: 'Coupon Fraud'
      }
    ]
  },
  {
    id: 'chk-owasp-a05-security-misconfiguration',
    title: 'Security Misconfiguration & Cloud Leaks Verification',
    category: 'Cloud & Server',
    owaspReference: 'OWASP A05:2021',
    cwe: 'CWE-16: Configuration',
    defaultSeverity: 'MEDIUM',
    vulnerabilityType: 'Security Misconfiguration',
    description: 'Auditoria de cabeçalhos de segurança, arquivos de configuração expostos (.env, .git), buckets S3/GCS abertos e interfaces de depuração ativas.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    defaultStepsToReproduce: [
      '1. Efetue requisições para caminhos de diagnóstico conhecidos: /.git/HEAD, /.env, /actuator/env, /swagger-ui.html.',
      '2. Verifique se o servidor retorna código HTTP 200 com conteúdo confidencial.',
      '3. Demonstre a leitura do artefato sem realizar alterações nos arquivos.'
    ],
    proofOfConceptTemplate: `GET /.env HTTP/1.1
Host: api.target.com

HTTP/1.1 200 OK
Content-Type: text/plain

DB_HOST=10.0.0.12
DB_PASS=ProductionSecretPassword!
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`,
    businessImpactSummary: 'Vazamento de credenciais mestre, segredos de API e topologia de rede interna, facilitando ataques de larga escala contra a organização.',
    remediationSummary: 'Restringir acesso a arquivos ocultos no servidor web (Nginx/Apache), desativar endpoints de actuator e debug em builds de produção e habilitar inspeção contínua de configurações de nuvem.',
    tags: ['owasp-top-10', 'a05', 'misconfiguration', 'cloud-leak', 'git-exposed', 'env-file'],
    items: [
      {
        id: 'a05-item-1',
        title: 'Verificar exposição de repositórios de código e arquivos de configuração (.git, .env, docker-compose.yml)',
        description: 'Testar acesso direto a /.git/config, /.git/HEAD e /.env em todos os subdomínios descobertos.',
        guidance: 'Se o /.git/ estiver exposto, certifique-se de não realizar download em massa se o escopo proibir.',
        category: 'Exposed Files',
        required: true
      },
      {
        id: 'a05-item-2',
        title: 'Auditar permissões públicas em buckets de nuvem (AWS S3, GCP Storage, Azure Blobs)',
        description: 'Testar listagem pública de arquivos ou escrita em buckets vinculados a uploads ou assets estáticos.',
        guidance: 'Utilize comandos AWS CLI como aws s3 ls s3://bucket-name --no-sign-request para comprovar a permissão.',
        category: 'Cloud Storage',
        required: true
      },
      {
        id: 'a05-item-3',
        title: 'Verificar interfaces de diagnóstico e documentação interativa (Swagger UI, Spring Actuators, GraphQL Playground)',
        description: 'Avaliar se rotas como /actuator/heapdump, /actuator/env ou /graphiql estão abertas ao público.',
        guidance: 'O endpoint heapdump pode conter senhas em texto claro residentes na memória da aplicação Java.',
        category: 'Debug Interfaces'
      },
      {
        id: 'a05-item-4',
        title: 'Auditar cabeçalhos HTTP defensivos (Strict-Transport-Security, X-Frame-Options, CSP)',
        description: 'Verificar ausência de proteção contra clickjacking (X-Frame-Options / frame-ancestors) em páginas sensíveis.',
        guidance: 'Relate apenas se houver impacto demonstrável (ex: clickjacking em botão de transferência ou exclusão de conta).',
        category: 'Security Headers'
      }
    ]
  },
  {
    id: 'chk-owasp-a08-insecure-deserialization',
    title: 'Software & Data Integrity Failures (Insecure Deserialization)',
    category: 'Cloud & Server',
    owaspReference: 'OWASP A08:2021',
    cwe: 'CWE-502: Deserialization of Untrusted Data',
    defaultSeverity: 'CRITICAL',
    vulnerabilityType: 'Insecure Deserialization',
    description: 'Protocolo para identificação de objetos serializados não confiáveis em Java, Python, PHP, Ruby e Node.js com potencial de Execução Remota de Código (RCE).',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    defaultStepsToReproduce: [
      '1. Identifique dados serializados transitando em cookies, cabeçalhos ou corpos de requisição (ex: rO0AB em Java, O:4: em PHP).',
      '2. Formule um payload inofensivo de prova de conceito que comprove a desserialização (ex: DNS resolution via ysoserial URLDNS).',
      '3. Monitore as requisições de DNS recebidas no servidor de colaboração.',
      '4. Documente a cadeia de gadgets sem invadir ou degradar o ambiente de produção.'
    ],
    proofOfConceptTemplate: `POST /api/session/state HTTP/1.1
Host: internal.target.com
Content-Type: application/x-java-serialized-object

rO0ABXNyABFqYXZhLm5ldC5VUkw4n9730oU... (ysoserial URLDNS payload)`,
    businessImpactSummary: 'Execução Remota de Código imediata com os privilégios do processo do servidor web, permitindo controle completo da máquina hospedeira.',
    remediationSummary: 'Nunca aceitar objetos serializados de fontes não confiáveis. Substituir formatos binários nativos por formatos estruturados seguros (JSON/Protobuf) com schema validation estrito.',
    tags: ['owasp-top-10', 'a08', 'deserialization', 'rce', 'java', 'python', 'php'],
    items: [
      {
        id: 'a08-item-1',
        title: 'Mapear assinaturas de serialização conhecidas nos parâmetros da aplicação',
        description: 'Identificar magic bytes de serialização: Java (0xAC ED / rO0AB), PHP (O:), Python Pickle (cos, c__builtin__), .NET (TypeObject).',
        guidance: 'Inspecione cookies de sessão antigos como "remember_me" ou "state" codificados em Base64.',
        category: 'Detection',
        required: true
      },
      {
        id: 'a08-item-2',
        title: 'Validar execução remota segura via gadgets não destrutivos (URLDNS / Sleep)',
        description: 'Utilizar payloads que apenas realizam consulta de DNS externa para comprovar desserialização sem riscos operacionais.',
        guidance: 'Gadgets URLDNS não dependem de bibliotecas de terceiros (usam apenas classes padrão do JDK).',
        category: 'Proof of Concept',
        required: true
      },
      {
        id: 'a08-item-3',
        title: 'Verificar integridade de pipelines de CI/CD e pacotes de terceiros (Supply Chain)',
        description: 'Checar assinaturas digitais em atualizações de software e dependências NPM/PyPI carregadas dinamicamente.',
        guidance: 'Valide se a aplicação instala pacotes sem lockfile (package-lock.json / poetry.lock) em tempo de execução.',
        category: 'Integrity'
      }
    ]
  },
  {
    id: 'chk-owasp-a02-cryptographic-failures',
    title: 'Cryptographic Failures & Sensitive Data Exposure',
    category: 'Cloud & Server',
    owaspReference: 'OWASP A02:2021',
    cwe: 'CWE-311: Missing Encryption of Sensitive Data',
    defaultSeverity: 'MEDIUM',
    vulnerabilityType: 'Cryptographic Failure',
    description: 'Avaliação de armazenamento e transmissão de dados sigilosos, cifras obsoletas, certificados TLS e vazamentos em logs e URLs.',
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    defaultStepsToReproduce: [
      '1. Analise os fluxos onde trafegam informações sensíveis (PII, senhas, chaves de API, números de cartão).',
      '2. Verifique se dados sensíveis aparecem em URLs de requisições GET (gerando histórico no browser e logs de proxy).',
      '3. Inspecione os cabeçalhos de resposta para verificar as diretrizes Cache-Control e HSTS.',
      '4. Comprove o armazenamento ou transmissão sem cifras robustas.'
    ],
    proofOfConceptTemplate: `GET /reset-password?token=secret_981249124892184912&user_email=target@example.com HTTP/1.1
Host: auth.target.com
Referer: https://auth.target.com/login

HTTP/1.1 200 OK
Cache-Control: public, max-age=86400`,
    businessImpactSummary: 'Exposição de credenciais e dados pessoais regulados por normas de conformidade (LGPD, GDPR, PCI-DSS), acarretando multas e danos à reputação corporativa.',
    remediationSummary: 'Exigir HTTPS exclusivo com HSTS preload. Não trafegar tokens ou senhas na URL (utilizar POST com corpo JSON). Armazenar senhas com Argon2id ou bcrypt e garantir Cache-Control: no-store para dados confidenciais.',
    tags: ['owasp-top-10', 'a02', 'cryptography', 'data-exposure', 'pii', 'hsts'],
    items: [
      {
        id: 'a02-item-1',
        title: 'Verificar tráfego de dados sensíveis e credenciais via query string (GET requests)',
        description: 'Identificar senhas, tokens de API ou PII em URLs que ficam registradas em logs de acesso e histórico do navegador.',
        guidance: 'Troque métodos GET por requisições POST/PUT com corpo JSON para evitar que o token apareça no cabeçalho Referer.',
        category: 'Sensitive Data in URL',
        required: true
      },
      {
        id: 'a02-item-2',
        title: 'Auditar cabeçalhos de Cache-Control em telas que exibem dados confidenciais',
        description: 'Confirmar se respostas contendo extratos bancários, dados médicos ou tokens possuem "Cache-Control: no-store, private".',
        guidance: 'Sem esse cabeçalho, proxies intermediários e caches locais podem manter cópias persistentes dos dados confidenciais.',
        category: 'Caching Policies'
      },
      {
        id: 'a02-item-3',
        title: 'Validar atributos de proteção de cookies sensíveis (Secure, HttpOnly, SameSite)',
        description: 'Garantir que cookies de sessão não possam ser lidos via JavaScript (HttpOnly) e só trafeguem em HTTPS (Secure).',
        guidance: 'A falta de HttpOnly em conjunto com qualquer vulnerabilidade XSS permite sequestro imediato da conta.',
        category: 'Cookie Security'
      }
    ]
  }
];
