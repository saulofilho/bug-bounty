# 📘 BugSentinel — Guia Oficial & Tutorial de Uso Completo

Bem-vindo ao manual operacional do **BugSentinel**, a estação de trabalho definitiva para pesquisadores de segurança (*Bug Hunters*), engenheiros de segurança de aplicações (*AppSec / DevSecOps*) e analistas de resposta a incidentes.

---

## 📑 Sumário

1. [Visão Geral & Primeiros Passos](#1-visão-geral--primeiros-passos)
2. [Ciclo de Vida do Relatório (Do Recon ao Payout)](#2-ciclo-de-vida-do-relatório-do-recon-ao-payout)
3. [Tutorial Detalhado das 36 Ferramentas da Suíte AppSec](#3-tutorial-detalhado-das-36-ferramentas-da-suíte-appsec)
   - [3.1. Calculadoras de Risco & Severidade (CVSS, EPSS & Supply Chain)](#31-calculadoras-de-risco--severidade)
   - [3.2. Laboratório de Evasão de Filtros, Codificação & Ofuscação](#32-laboratório-de-evasão-de-filtros-codificação--ofuscação)
   - [3.3. Autenticação, Identidade & Controle de Acesso (OAuth, SAML, IDOR & IAM)](#33-autenticação-identidade--controle-de-acesso)
   - [3.4. Infraestrutura Web, Protocolos & Cache (Smuggling, Desync, Cache & CORS)](#34-infraestrutura-web-protocolos--cache)
   - [3.5. Ataques de Aplicação Avançados (Prototype Pollution, Race Condition & ReDoS)](#35-ataques-de-aplicação-avançados)
   - [3.6. Segurança em Nuvem & SSRF](#36-segurança-em-nuvem--ssrf)
   - [3.7. Higienização, Governança & Gestão de Triagem](#37-higienização-governança--gestão-de-triagem)
4. [Monitores de Rate Limit & Proteção Anti-Bloqueio](#4-monitores-de-rate-limit--proteção-anti-bloqueio)
5. [Backup, Restauração & Privacidade](#5-backup-restauração--privacidade)

---

## 1. Visão Geral & Primeiros Passos

O **BugSentinel** funciona como uma Single Page Application (SPA) reativa e rápida, armazenando todos os seus alvos, relatórios e templates no armazenamento local do navegador (**LocalStorage**), garantindo total privacidade sem envio de dados a servidores de terceiros.

### Interface & Módulos Principais:
* **📊 Dashboard**: Visão executiva com métricas de relatórios, gráficos de severidade, total de recompensas (bounties em USD e BRL), prazos de SLA e feed de atividades recentes.
* **🎯 Programs (Alvos)**: Cadastro de escopos (*in-scope* / *out-of-scope*), plataformas associadas (HackerOne, Bugcrowd, Intigriti, etc.) e taxas de payout.
* **📝 Reports**: Listagem e edição detalhada de vulnerabilidades, passos de reprodução em Markdown, vetores CVSS calculados e histórico de triagem.
* **🛡️ AppSec Suite**: Central com 36 ferramentas técnicas para avaliação, testes de exploração, cálculos matemáticos de risco e remediação.
* **🌐 Threat Intel**: Radar mundial interativo de ciberameaças em tempo real e monitoramento de incidentes globais.
* **💰 Risk Simulator**: Modelagem de perdas financeiras com os métodos quantitativos FAIR e simulador de custos de violação de dados.
* **📚 Docs & Checklists**: Metodologias de teste de invasão (OWASP WSTG, ASVS, API Security Top 10) e bibliotecas de payloads prontos.

---

## 2. Ciclo de Vida do Relatório (Do Recon ao Payout)

### Passo 1: Cadastre o Alvo
1. Acesse o menu **Programs** e clique em **Add Target +**.
2. Preencha o nome do programa, plataforma hospedeira, URL da política e adicione os domínios permitidos (*in-scope*) e proibidos (*out-of-scope*).
3. Isso garante que seus testes fiquem estritamente dentro das regras de engajamento (*Rules of Engagement - RoE*).

### Passo 2: Documente a Vulnerabilidade
1. No menu **Reports**, clique em **New Submission +**.
2. Selecione o alvo cadastrado e insira o título técnico (ex: `BOLA no endpoint /api/v1/invoices/:id expondo dados financeiros`).
3. Utilize a **Calculadora CVSS** integrada no formulário para ajustar as métricas Base e obter o score formal exato.
4. Escreva os passos de reprodução com blocos de código e anexe as evidências.

### Passo 3: Higienize o Relatório com DLP
1. Antes de submeter na plataforma de Bug Bounty, acesse **AppSec > DLP Sanitizer**.
2. Cole o texto completo da prova de conceito.
3. O scanner automático identificará chaves privadas, tokens AWS, chaves de API e credenciais sensíveis, substituindo-as por tags como `[REDACTED-AWS-KEY]`.

### Passo 4: Assine com PGP & Exporte
1. Se o programa exigir verificação de autoria, use a ferramenta **PGP Signer** no cabeçalho para gerar a assinatura digital do achado via OpenPGP.
2. Utilize o **Issue Exporter** para despachar o relatório em formato compatível com **Jira**, **GitHub Issues** ou **GitLab**.

### Passo 5: Acompanhe a Triagem e o Pagamento
1. Atualize o status do relatório conforme o feedback do programa (*NEW* ➔ *TRIAGED* ➔ *RESOLVED* ➔ *REWARDED*).
2. Ao receber o pagamento, registre o valor em dólares (USD). O sistema converterá automaticamente para reais (BRL) e atualizará suas estatísticas de rendimento por hora e gráficos de ROI.

---

## 3. Tutorial Detalhado das 36 Ferramentas da Suíte AppSec

Acesse a aba **AppSec** na barra de navegação superior para abrir a central técnica. Navegue através da barra horizontal de abas para utilizar cada módulo:

---

### 3.1. Calculadoras de Risco & Severidade

#### 1. Calculadora CVSS v4.0 (FIRST.org)
* **Objetivo:** Calcular o vetor e a pontuação oficial do mais moderno padrão internacional de severidade.
* **Passo a Passo:**
  1. Selecione um relatório pré-existente na caixa de seleção ou inicie uma pontuação limpa.
  2. Ajuste as métricas do grupo **Base**: Vetor de Ataque (`AV`), Complexidade (`AC`), Requisitos de Ataque (`AT`), Privilégios (`PR`) e Interação do Usuário (`UI`).
  3. Configure a grande novidade do CVSS v4.0: a separação entre **Impacto no Sistema Vulnerável** (`VC`/`VI`/`VA`) e **Impacto em Sistemas Subsequentes** (`SC`/`SI`/`SA`).
  4. O painel recalcula instantaneamente a nota (0.0 a 10.0) e gera a string oficial do vetor (ex: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`).
  5. Clique em **Copiar Vetor** para colar diretamente no formulário da HackerOne ou Bugcrowd.

#### 2. CVSS v4.0 Component Calculator (Supply Chain / SCA)
* **Objetivo:** Determinar a real explorabilidade de vulnerabilidades em dependências e bibliotecas terceiras de acordo com o padrão CISA VEX.
* **Passo a Passo:**
  1. Escolha a **Camada de Dependência**: Direta, Transitiva Rasa (1-2 saltos), Transitiva Profunda (>2 saltos), Ferramenta de Build ou Plugin.
  2. Selecione a **Alcançabilidade de Código (*Call-Graph Reachability*)**: se a função vulnerável é invocada diretamente em rota de produção ou se trata de código morto (*Dead Code*).
  3. Defina os **Requisitos de Ambiente (`AT:P`)** e a **Superfície de Entrada**.
  4. Visualize o status VEX formal gerado (`affected`, `not_affected`, `under_investigation`, `fixed`).
  5. Clique no botão **Injetar Métricas na Calculadora CVSS v4.0 Principal** para transferir o resultado diretamente para o motor principal.

#### 3. CVSS v4 + FIRST EPSS Matrix
* **Objetivo:** Priorização pragmática correlacionando severidade teórica (CVSS) com probabilidade estatística de exploração ativa em circulação nos próximos 30 dias (EPSS).
* **Passo a Passo:**
  1. Digite a nota CVSS ou carregue um relatório existente.
  2. Insira o percentual EPSS (0 a 100%) fornecido pelo feed do FIRST.org.
  3. A matriz bidimensional classifica a vulnerabilidade nos quadrantes: **P0 Ação Imediata** (Alto CVSS + Alto EPSS), **P1 Risco Latente**, **P2 Baixa Probabilidade** ou **P3 Baixa Prioridade**.
  4. Obtenha o prazo de SLA recomendado para mitigação.

---

### 3.2. Laboratório de Evasão de Filtros, Codificação & Ofuscação

#### 4. Payload Obfuscator (Cifra XOR, Base64 & URL Encoding)
* **Objetivo:** Ofuscar strings e payloads de exploração para contornar assinaturas estáticas de WAFs (ModSecurity, Cloudflare WAF, AWS WAF).
* **Passo a Passo:**
  1. Digite ou cole o payload no campo de texto (ex: `<script>alert(1)</script>` ou `UNION SELECT 1,2,3--`).
  2. No painel **Cifra XOR**, insira uma chave de criptografia de 1 a 32 caracteres (ex: `secKey`).
  3. Visualize instantaneamente a saída cifrada em Hexadecimal (`\x0b\x0e...`) e em Base64, acompanhada do código de decodificação em Python, Node.js e Bash.
  4. Alterne para o **Pipeline de Transformação Sequencial**:
     - Ative as etapas desejadas: *URL Encoding Simples* ➔ *Double URL Encoding* ➔ *Base64* ➔ *XOR Cipher*.
     - Reordene a sequência para gerar ofuscações compostas de múltiplas camadas.
  5. Clique em **Copiar** na saída final para testar contra o alvo.

#### 5. Payload Multi-Encoder / Decoder em Tempo Real
* **Objetivo:** Conversor instantâneo multifuncional para decodificar e codificar strings em mais de 8 formatos simultaneamente.
* **Passo a Passo:**
  1. Digite qualquer texto ou payload no campo superior.
  2. Veja a conversão em tempo real nos blocos:
     - **URL Encode** e **Double URL Encode**;
     - **Base64** e **Base64URL** (RFC 4648);
     - **Hexadecimal** (`\x41` e `0x41`);
     - **HTML Entities** (decimais e hexadecimais);
     - **Unicode Escaped** (`\u0041`);
     - **PowerShell EncodedCommand** (`-Enc` UTF-16LE em Base64);
     - **SQL String CHAR()** (para bypass de aspas em SQLi).
  3. Clique no ícone de cópia ao lado de qualquer formato desejado.

---

### 3.3. Autenticação, Identidade & Controle de Acesso

#### 6. OAuth 2.0 & OIDC Security Inspector
* **Objetivo:** Auditar fluxos de autorização OAuth 2.0 / OpenID Connect contra falhas de CSRF, Account Takeover e roubo de tokens.
* **Passo a Passo:**
  1. Cole a URL de autorização do alvo no campo de entrada (ex: `https://auth.target.com/oauth/authorize?client_id=...`).
  2. O inspetor disseca automaticamente cada query parameter (`client_id`, `redirect_uri`, `response_type`, `scope`, `state`, `code_challenge`).
  3. **Diagnóstico Automatizado:**
     - Alerta se o parâmetro `state` estiver ausente ou possuir baixa entropia (vulnerabilidade crítica a CSRF e login forçado).
     - Detecta uso do **Implicit Flow** depreciado (`response_type=token`).
     - Verifica conformidade com **PKCE** (RFC 7636) e alerta se o método `code_challenge_method` for `plain` em vez de `S256`.
     - Inspeciona `redirect_uri` em busca de vulnerabilidades de *path traversal* (`/callback/../../attacker`) e caracteres curinga (*wildcards*).
  4. Consulte a pontuação de conformidade e o guia de correção para o backend.

#### 7. BOLA / IDOR Authorization Matrix (OWASP API #1)
* **Objetivo:** Avaliar a segregação de acesso entre diferentes usuários e tenants e verificar a previsibilidade de identificadores de recursos.
* **Passo a Passo:**
  1. Na aba **Matriz de Permissões**:
     - Alterne os perfis de teste (Usuário A, Usuário B, Admin de Tenant, Usuário Não Autenticado).
     - Teste o acesso a endpoints protegidos (ex: `GET /api/v1/invoices/1042`) e veja se o sistema verifica explicitamente se `resource.ownerId == request.user.id`.
  2. Na aba **Analisador de Entropia de Identificadores**:
     - Cole um exemplo de ID retornado pela aplicação (ex: `10023`, `uuid-v1`, `uuid-v4`).
     - O motor analisa a entropia: avisa se o ID é sequencial/adivinhável por enumeração rápida, se é UUID v1 (que vaza o endereço MAC do servidor e o carimbo de data/hora), ou se é UUID v4 criptograficamente seguro.
  3. Copie o snippet seguro de consulta com Prisma / ORM que vincula o escopo de usuário na cláusula `WHERE`.

#### 8. SAML 2.0 & XML Signature Workbench
* **Objetivo:** Inspecionar asserções SAML de provedores corporativos (Okta, Azure AD, ADFS, Ping Identity) e auditar riscos de falsificação de identidade.
* **Passo a Passo:**
  1. Cole o documento XML da resposta SAML (`samlp:Response`).
  2. O auditor extrai o `NameID` do usuário autenticado, valida a presença de assinaturas digitais (`ds:Signature`), o destinatário (`AudienceRestriction`) e as janelas temporais de validade (`NotBefore`/`NotOnOrAfter`).
  3. Identifica riscos como uso de algoritmo de hash fraco **SHA-1**.
  4. Explore a **Matriz XSW (1 a 8)**: entenda como variantes de *XML Signature Wrapping* clonam ou reposicionam a asserção assinada para forjar identidades administrativas sem quebrar a assinatura digital.
  5. Consulte as recomendações para endurecimento de parsers XML contra ataques XXE.

#### 9. AWS IAM Privilege Escalation Auditor
* **Objetivo:** Detectar caminhos de escalonamento de privilégios onde permissões aparentemente restritas concedem controle total de administrador sobre a conta AWS.
* **Passo a Passo:**
  1. Cole o documento JSON da política IAM no editor.
  2. O motor examina as ações declaradas no bloco `Statement` contra os **21 métodos clássicos de escalonamento IAM** (documentados pela Rhino Security Labs).
  3. Detecta vetores como:
     - `iam:CreatePolicyVersion` (criação de versão de política com `Action: "*"` definida como padrão);
     - `iam:AttachUserPolicy` (anexação direta de `AdministratorAccess`);
     - `iam:PassRole` + `ec2:RunInstances` (inicialização de máquina com Role privilegiada e roubo de credenciais via IMDS);
     - `iam:PassRole` + `lambda:CreateFunction` (execução de comandos com função serverless privilegiada).
  4. Revise os métodos identificados e aplique as diretrizes de *Permission Boundaries* e *Service Control Policies (SCPs)*.

#### 10. JWT Security Analyzer
* **Objetivo:** Auditoria de integridade e ataques contra JSON Web Tokens.
* **Passo a Passo:**
  1. Cole o JWT completo no formato `header.payload.signature`.
  2. O decodificador disseca os cabeçalhos e os claims do payload.
  3. Testa automaticamente:
     - Vulnerabilidade de algoritmo `none` (aceitação de tokens sem assinatura);
     - Manipulação de chave pública com injeção de parâmetros `jwk`, `jku` ou `kid` (ataque de diretório transversal no `kid`);
     - Expiração temporal e tokens de longa duração.
  4. Gera tokens forjados com algoritmo nulo para comprovação em relatórios de PoC.

---

### 3.4. Infraestrutura Web, Protocolos & Cache

#### 11. Web Cache Poisoning & Cache Deception Studio
* **Objetivo:** Identificar vulnerabilidades de envenenamento e deceptivação de cache HTTP em CDNs e proxies reversos.
* **Passo a Passo:**
  1. Configure o caminho base testado (ex: `/account/settings`).
  2. Selecione a extensão de recurso estático utilizada no teste (ex: `;style.css`, `.js`, `.ico`).
  3. **Diagnóstico de Web Cache Deception:** O simulador avalia se o servidor de origem processa a requisição dinâmica enquanto a CDN, baseada na extensão final, armazena em cache dados confidenciais do usuário.
  4. **Inspeção de Cabeçalhos Não-Chaveados (*Unkeyed Headers*):** Adicione cabeçalhos como `X-Forwarded-Host: attacker.com` ou `X-Original-URL` e observe como a resposta gerada pode ser distribuída para todos os usuários subsequentes.
  5. Aplique as regras de cabeçalho `Cache-Control: no-store, private` recomendadas.

#### 12. HTTP Request Smuggling & Desync Inspector
* **Objetivo:** Diagnosticar discrepâncias de parsing entre servidores de borda (Front-end/CDN) e servidores de aplicação (Back-end).
* **Passo a Passo:**
  1. Selecione o vetor de desincronização: **CL.TE**, **TE.CL**, **TE.TE** (ofuscação de header), **H2.TE** (downgrade HTTP/2) ou **CL.0**.
  2. Observe o **Visualizador Diferencial de Stream**: veja em tempo real como o Front-end lê o corpo da requisição e onde o Back-end encerra o processamento, deixando o **Prefixo Contrabandeado** na fila do socket TCP.
  3. Copie o script de teste de timing em Python ou o payload para a extensão **Turbo Intruder** do Burp Suite para validação segura sem causar negação de serviço.

#### 13. CORS Misconfiguration Studio
* **Objetivo:** Avaliar políticas de compartilhamento de recursos de origem cruzada e gerar exploits de exfiltração em HTML.
* **Passo a Passo:**
  1. Configure a URL do endpoint vulnerável e selecione o cenário:
     - Reflexão arbitrária de `Origin` com `Access-Control-Allow-Credentials: true`;
     - Confiança indevida na origem especial `null` (explorável via `<iframe sandbox>`);
     - Expressão regular com ponto não escapado (ex: `targetXcom.com`).
  2. Verifique o diagnóstico de conformidade dos navegadores modernos.
  3. Clique em **Gerar Exploit HTML** para baixar um arquivo pronto que realiza a requisição com credenciais ativas e exfiltra os dados roubados.

#### 14. CSRF PoC Studio & SameSite Matrix
* **Objetivo:** Gerar Provas de Conceito funcionais de Cross-Site Request Forgery considerando as restrições de cookies `SameSite`.
* **Passo a Passo:**
  1. Defina o método da ação (`POST` ou `GET`), endpoint de destino e parâmetros (ex: `transferAmount=1000&recipient=attacker`).
  2. Selecione se o alvo requer formulário tradicional `application/x-www-form-urlencoded` ou payload JSON (via truque com `text/plain`).
  3. O gerador cria o arquivo HTML autocontido com submissão automática via JavaScript.
  4. Consulte a **Matriz SameSite**: entenda como cookies configurados como `Strict`, `Lax` ou `None` se comportam em navegações top-level vs requisições de subrecursos.

#### 15. Security Headers Auditor
* **Objetivo:** Auditar e endurecer os cabeçalhos de proteção HTTP do servidor.
* **Passo a Passo:**
  1. Insira os cabeçalhos retornados pelo servidor ou clique em carregar preset.
  2. O auditor inspeciona:
     - `Strict-Transport-Security (HSTS)` com `includeSubDomains` e `preload`;
     - `X-Content-Type-Options: nosniff` (prevenção de MIME-sniffing);
     - `X-Frame-Options` ou `frame-ancestors` (anti-clickjacking);
     - `Referrer-Policy` e `Permissions-Policy`;
     - Presença de cabeçalhos de vazamento de tecnologia (`Server`, `X-Powered-By`).
  3. Obtenha a nota de conformidade (A+ a F) e snippets de configuração para Nginx, Apache e Express Helmet.

#### 16. CSP Studio & Evaluator (W3C Level 3)
* **Objetivo:** Avaliar e gerar diretivas de Content Security Policy seguras contra XSS.
* **Passo a Passo:**
  1. Cole a string da sua CSP no campo de análise.
  2. O avaliador identifica vulnerabilidades críticas: uso de `'unsafe-inline'`, `'unsafe-eval'`, domínios com JSONP aberto, esquemas `data:` ou curingas `*`.
  3. Use o gerador interativo para montar uma política baseada em nonces (`'nonce-...'`) ou hashes SHA-256 recomendados pelo padrão moderno W3C Level 3.

---

### 3.5. Ataques de Aplicação Avançados

#### 17. Prototype Pollution & Gadget Chains Studio
* **Objetivo:** Identificar mutações do protótipo de objetos em JavaScript e mapear cadeias de gadgets para escalonamento a XSS ou RCE no Node.js.
* **Passo a Passo:**
  1. No editor de JSON, insira ou ajuste o payload contendo chaves como `__proto__`, `constructor.prototype` ou `prototype`.
  2. O analisador detecta se operações de *deep recursive merge* ou *path assignment* (como versões vulneráveis do `lodash.merge` ou `deep-extend`) poluirão objetos novos criados na memória.
  3. **Catálogo de Gadgets Conhecidos:**
     - **Node.js `child_process.fork`:** Poluição de `execArgv` com `--eval` para execução remota de código (RCE);
     - **EJS Template Engine:** Poluição de `outputFunctionName` para injetar comandos durante a compilação do template;
     - **Client-Side DOM XSS:** Poluição de propriedades `src` ou resolvedores de transporte assíncrono.
  4. Copie os snippets de mitigação com `Object.freeze(Object.prototype)` e `Object.create(null)`.

#### 18. Race Condition & Concurrency Studio
* **Objetivo:** Simular vulnerabilidades de concorrência e janelas temporais de verificação e uso (TOCTOU).
* **Passo a Passo:**
  1. Defina o **Saldo Inicial** da conta de demonstração (ex: `$100`), o **Valor do Saque** (ex: `$80`) e o número de **Requisições Concorrentes** (ex: 5 threads simultâneas).
  2. **Sem Proteção:** Observe a falha TOCTOU crítica — todas as 5 requisições leem o saldo antes que a primeira conclua a gravação, resultando em um saque total de `$400` e saldo negativo de `-$300`!
  3. Ative o alternador **Bloqueio Pessimista de Banco (`SELECT ... FOR UPDATE`)** e observe como o banco serializa as transações, permitindo apenas 1 saque e rejeitando os demais.
  4. Ative o alternador **Chave de Idempotência (`Idempotency-Key` via Redis)** e comprove a rejeição de requisições duplicadas dentro da mesma janela temporal.
  5. Copie o código de atualização atômica em SQL em linha única.

#### 19. Mass Assignment & Parameter Pollution (HPP) Matrix
* **Objetivo:** Inspecionar sobreposição de campos de modelo (Over-Posting) e divergências de precedência entre frameworks em parâmetros repetidos.
* **Passo a Passo:**
  1. Na aba **Mass Assignment**:
     - Insira o payload JSON enviado pelo usuário no cadastro ou atualização de perfil.
     - O motor audita o objeto contra campos restritos (`role: "admin"`, `is_admin: true`, `balance: 99999`, `subscription_tier: "enterprise"`).
     - Alerta se a aplicação fizer binding direto na entidade do banco sem o uso de DTOs (*Data Transfer Objects*) com allowlist estrita.
  2. Na aba **Matriz de Precedência HPP**:
     - Digite uma query string com parâmetros repetidos (ex: `id=1&action=view&id=2`).
     - Compare o comportamento:
       - **Node.js / Express:** Cria um array `["1", "2"]` (risco de *Type Confusion*);
       - **PHP / Apache:** Considera o **último** parâmetro informado (`id=2`);
       - **Python / Flask:** Considera o **primeiro** parâmetro informado (`id=1`);
       - **ASP.NET:** Concatena com vírgula (`id=1,2`).
     - Entenda como invasores usam essa discrepância para contornar assinaturas de WAFs.

#### 20. ReDoS Studio & Catastrophic Backtracking
* **Objetivo:** Diagnosticar expressões regulares vulneráveis a retrocesso exponencial e negação de serviço de CPU.
* **Passo a Passo:**
  1. Digite a regex ou carregue um preset vulnerável (quantificadores aninhados `(a+)+`, alternâncias sobrepostas `(a|aa)+`).
  2. Ajuste o tamanho da entrada de teste ($N = 10$ a $40$ caracteres).
  3. O simulador projeta a progressão da complexidade assintótica de passos ($O(2^n)$) e o tempo estimado de travamento do Event Loop do Node.js de forma não-bloqueante.
  4. Copie a regex segura equivalente e a recomendação de migração para o motor linear **Google RE2**.

#### 21. GraphQL Security & Introspection Studio
* **Objetivo:** Auditar endpoints GraphQL contra vazamento de schema e negação de serviço por recursão.
* **Passo a Passo:**
  1. Gere a query completa de **Introspecção de Schema** (`__schema`) para mapear tipos, queries e mutations ocultas.
  2. Teste o vetor de **Recursão Profunda (Query Depth DoS)** com consultas circulares para verificar se o servidor impõe `depthLimit`.
  3. Gere consultas com **Amplificação de Aliases (Batching Attack)** para demonstrar como testar múltiplos códigos de autenticação em uma única requisição HTTP.
  4. Copie os snippets de mitigação para Apollo Server e Express GraphQL.

---

### 3.6. Segurança em Nuvem & SSRF

#### 22. Cloud SSRF & Metadata Exploitation Suite
* **Objetivo:** Construir requisições de exploração SSRF direcionadas a serviços de metadados de nuvem e evasão de filtros de IP.
* **Passo a Passo:**
  1. Escolha o provedor de nuvem alvo: **AWS**, **GCP**, **Azure**, **Kubernetes** ou **Docker**.
  2. Selecione o endpoint desejado (ex: extração de credenciais de Role no AWS IMDSv1 ou tokens OAuth no GCP Metadata).
  3. Utilize a **Matriz de Evasão de Filtros**: o IP link-local `169.254.169.254` é convertido automaticamente em Decimal DWORD (`2852039166`), Hexadecimal (`0xa9fea9fe`), Octal (`0251.0376.0251.0376`), IPv6-mapped e DNS Rebinding via `nip.io`.
  4. Copie o comando cURL pronto com cabeçalhos exigidos (`Metadata-Flavor: Google`, `X-aws-ec2-metadata-token`).

#### 23. Out-of-Band (OOB) Interaction Studio
* **Objetivo:** Central Collaborator para comprovação de vulnerabilidades cegas (Blind SSRF, Blind XXE, Blind RCE e Blind SQLi).
* **Passo a Passo:**
  1. O sistema gera um domínio de escuta dinâmico exclusivo (ex: `bb-x7k9p2.bounty-oob.net`).
  2. Selecione o vetor de ataque desejado na biblioteca de payloads formatados:
     - **Blind SSRF:** Invocação de webhook com callback OOB;
     - **Blind XXE:** DTD externo exfiltrando `/etc/passwd` via HTTP;
     - **Blind RCE:** Exfiltração de dados via subdomínio DNS (`ping $(whoami).${oob}`);
     - **OOB-SQLi:** Triggers de resolução de rede para MSSQL (`master..xp_dirtree`) e Oracle.
  3. Monitore os callbacks recebidos no painel em tempo real.
  4. Use o **Decodificador Integrado** para converter automaticamente dados exfiltrados em hexadecimal ou base64.

#### 24. Subdomain Takeover Analyzer
* **Objetivo:** Auditar registros CNAME órfãos para detectar sequestro de subdomínios em provedores de nuvem.
* **Passo a Passo:**
  1. Insira o subdomínio investigado e o registro CNAME retornado na consulta DNS.
  2. O motor correlaciona com a base de 15 assinaturas de serviços (AWS S3, GitHub Pages, Heroku, Azure, Vercel, Shopify, etc.).
  3. Verifique o corpo da resposta HTTP (ex: `404 Not Found - There isn't a GitHub Pages site here`).
  4. O sistema classifica o risco (*Vulnerable* ou *Edge Case*) e calcula a severidade CVSS correspondente.

#### 25. Grafo de Ataque D3.js & Movimentação Lateral
* **Objetivo:** Visualizar a topologia de conexões entre Domínios Alvo, Relatórios de Vulnerabilidades, CVEs e Crown Jewels.
* **Passo a Passo:**
  1. Alterne entre os modos **Grafo de Força D3.js** (física gravitacional interativa) e **Colunas Kill Chain** (raias sequenciais do MITRE ATT&CK).
  2. Arraste os nós para inspecionar clusters densos e identifique os **Choke Points** (destacados com anel pulsante vermelho).
  3. Selecione cenários de movimentação lateral e utilize os controles de reprodução passo a passo para visualizar o caminho de invasão.
  4. Exporte o diagrama em **SVG** de alta resolução ou em formato **JSON**.

---

### 3.7. Higienização, Governança & Gestão de Triagem

#### 26. Sanitizador DLP (Anti-Vazamento de Segredos)
* Cole o texto do seu relatório para identificar e ofuscar chaves AWS, tokens pessoais do GitHub, chaves privadas e senhas antes do envio à plataforma de recompensa.

#### 27. Guia de Remediação de Segredos & Batch Fix
* Procedimento Operacional Padrão (SOP) com checklist em 4 etapas (Rotacionar, Revogar, Auditar no CloudTrail/Usage e Encerrar alerta no GitHub Secret Scanning) com suporte a ações em lote (*Batch Mode*).

#### 28. Construtor de PoC & HTTP (cURL, Python & Raw)
* Insira método, endpoint, headers e body com o payload para gerar instantaneamente requisições reproduzíveis em comando cURL para terminal, script em Python Requests e formato bruto HTTP/1.1 para o Burp Suite Repeater.

#### 29. Mapeador CWE / OWASP Top 10
* Catálogo das principais falhas de software (Top CWEs e OWASP Top 10 2021) com explicações conceituais, cenários de exploração e snippets de código seguro.

#### 30. Monitor de SLA de Triagem (MTTA / MTTR)
* Acompanhe prazos de atendimento e contagens regressivas para evitar atrasos na primeira resposta ou na remediação de bugs críticos e altos.

#### 31. Macros de Resposta Rápida
* Modelos de mensagens padronizadas e diplomáticas para comunicação ágil com triadores e pesquisadores (solicitação de PoC adicional, notificação de duplicata, confirmação de triagem e concessão de bounty).

#### 32. Detector de Duplicatas
* Comparador de sobreposição de texto (Jaccard + Levenshtein) para verificar se uma nova descoberta coincide com relatórios já submetidos anteriormente para o mesmo endpoint.

#### 33. Matriz de Bounties & Budget
* Defina regras de recompensa balanceando a severidade do achado e a importância do ativo (Tier 1 Core, Tier 2 API, Tier 3 Auxiliar), monitorando o impacto no orçamento financeiro anual.

#### 34. Calculadora de ROI de Programas & Yield
* Ranqueie programas de bug bounty por rendimento financeiro por hora (`$/h`) considerando histórico de payouts, amplitude de escopo (*wildcard* vs aplicação única) e velocidade média de triagem.

#### 35. Exportador para Issue Trackers
* Gere chamados técnicos estruturados em Markdown formatados especificamente para abertura de tickets no **Jira**, **GitHub Issues** e **GitLab**.

#### 36. Simulador de Webhooks
* Teste e envie notificações estruturadas de segurança em tempo real para canais de resposta a incidentes no **Slack**, **Discord** e **Microsoft Teams**.

---

## 4. Monitores de Rate Limit & Proteção Anti-Bloqueio

O BugSentinel monitora ativamente as taxas de requisições enviadas durante seus testes:

1. **Monitor de APIs Globais (`RateLimitMonitor`)**:
   - Monitore o consumo de requisições de serviços externos (GitHub REST API, Google Gemini, Shodan, NVD CVE Feed).
   - Acompanhe o percentual consumido e o tempo restante para a renovação das cotas.

2. **Monitor por Alvo / Programa (`TargetRateLimitMonitor`)**:
   - Registre o ritmo de envio de pacotes contra o alvo para garantir que seus scanners e scripts manuais não ultrapassem os limites acordados nas regras de engajamento (*Rules of Engagement*).

---

## 5. Backup, Restauração & Privacidade

### Exportação de Dados:
* Acesse a engrenagem de **Configurações** no menu superior.
* Clique em **Exportar Backup (JSON)** para salvar uma cópia completa de todos os seus relatórios, alvos cadastrados e configurações locais.
* Para relatórios tabulares, utilize o botão **Exportar CSV** na tela de relatórios.

### Restauração de Dados:
* Em uma nova máquina ou navegador, abra as Configurações e selecione **Importar Backup (JSON)**.
* Seus relatórios serão restaurados instantaneamente sem necessidade de autenticação em nuvem.

### Modo Demonstração (Seed Data):
* Se desejar restaurar os relatórios e alvos de exemplo para fins de treinamento ou apresentação, abra a **Central de Ajuda (ícone de interrogação no topo)** e clique em **Restaurar Dados de Demonstração**.

---

*BugSentinel — Desenvolvido para a comunidade global de Bug Hunters e Engenheiros de AppSec.*
