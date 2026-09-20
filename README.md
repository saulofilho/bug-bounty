# 🛡️ BugSentinel — Bug Bounty Manager & Vulnerability Tracker

> **Plataforma completa para caçadores de recompensas (Bug Hunters), pesquisadores de segurança e equipes de AppSec gerenciarem relatórios, calcularem vetores CVSS v3.1 e CVSS v4.0, analisarem riscos quantitativos (FAIR), sanitizarem segredos (DLP), monitorarem SLAs, acompanharem Threat Intelligence em tempo real e projetarem rendimentos futuros.**

[![Node.js Version](https://img.shields.io/badge/node-22.x%20LTS-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/recharts-3.10-22c55e.svg)](https://recharts.org/)
[![CVSS v4.0](https://img.shields.io/badge/CVSS-v4.0%20%7C%20v3.1-emerald.svg)](https://www.first.org/cvss/v4-0/)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-black.svg?logo=github)](https://pages.github.com/)

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Central de Ferramentas AppSec & DevSecOps (10 Módulos)](#-central-de-ferramentas-appsec--devsecops-10-módulos)
- [Como Usar as Novas Ferramentas (Guia Prático)](#-como-usar-as-novas-ferramentas-guia-prático)
- [Threat Intelligence Global em Tempo Real](#-threat-intelligence-global-em-tempo-real)
- [Simuladores Quantitativos de Risco & Impacto Financeiro](#-simuladores-quantitativos-de-risco--impacto-financeiro)
- [Métricas de Produtividade & Eficiência de Triagem](#-métricas-de-produtividade--eficiência-de-triagem)
- [Bibliotecas Técnicas: Payloads & Checklists](#-bibliotecas-técnicas-payloads--checklists)
- [Módulos de Gráficos e Analytics (Recharts)](#-módulos-de-gráficos-e-analytics-recharts)
- [Diretório de 14 Plataformas de Bug Bounty](#-diretório-de-14-plataformas-de-bug-bounty)
- [Interface Responsiva & Acessibilidade Mobile](#-interface-responsiva--acessibilidade-mobile)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Deploy no GitHub Pages (Node 22 LTS)](#-deploy-no-github-pages-node-22-lts)
- [Privacidade e Armazenamento](#-privacidade-e-armazenamento)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **BugSentinel** é uma estação de trabalho e central de comando voltada tanto para caçadores de recompensas (*Bug Hunters*) independentes quanto para engenheiros de segurança de aplicações (*AppSec/DevSecOps*) e analistas de triagem.

A plataforma cobre todas as fases do ciclo de vida de vulnerabilidades:
1. **Reconhecimento & Escopo**: Cadastro de ativos, políticas in-scope/out-of-scope e diretório das principais plataformas de recompensa.
2. **Descoberta & PoC**: Construtor de PoCs reproduzíveis (`cURL`, `Python`, `Raw HTTP/1.1`) e biblioteca categorizada de payloads.
3. **Avaliação de Risco & Severidade**: Cálculo simultâneo dos padrões oficiais **CVSS v3.1** e **CVSS v4.0 (FIRST.org)**, correlação com **CWE** e **OWASP Top 10 (2021)**, além de análise de impacto financeiro (FAIR e simulação de violação de dados).
4. **Higienização & Submissão Segura**: Sanitizador DLP preventivo contra vazamento acidental de tokens e chaves privadas, assinatura digital PGP e exportador de relatórios para Jira, GitHub Issues e GitLab.
5. **Triagem & SLA**: Gestão de prazos de atendimento (MTTA/MTTR), detecção de submissões duplicadas, macros de resposta rápida e cálculo de orçamentos de recompensa.
6. **Inteligência de Ameaças**: Feed em tempo real de vulnerabilidades globais, mapa mundial interativo e histórico de incidentes.

---

## 🛠️ Central de Ferramentas AppSec & DevSecOps (10 Módulos)

Acesse a aba **AppSec** no menu principal para utilizar a suíte integrada de utilitários técnicos:

| # | Ferramenta | Finalidade | Principais Recursos |
| :-: | :--- | :--- | :--- |
| **1** | **Calculadora CVSS v4.0** | Pontuação conforme a especificação oficial da FIRST.org | Suporte a grupos de métricas Base, Threat e Environmental; resolução por macro-vetores (EQ1 a EQ6); conversor e parser de vetor string. |
| **2** | **Mapeador CWE / OWASP Top 10** | Padronização taxonômica de vulnerabilidades | Catálogo das Top CWEs (2023/2024), correlação com OWASP Top 10 2021, descrições detalhadas, exemplos de código vulnerável e guia de mitigação. |
| **3** | **Construtor de PoC & HTTP** | Geração rápida de requisições de reprodução | Exportação instantânea em comando `cURL`, script em `Python Requests` e requisição `Raw HTTP/1.1` com headers e payloads estruturados. |
| **4** | **Monitor de SLA de Triagem** | Acompanhamento de conformidade de prazos | Rastreamento de MTTA (*Mean Time to Acknowledge*) e MTTR (*Mean Time to Resolve*); contagem regressiva para breach com base na severidade (Crítico: 24h/7d; Alto: 48h/14d). |
| **5** | **Macros de Resposta Rápida** | Comunicação padronizada para triadores e hunters | Templates pré-configurados (Solicitação de PoC, Confirmação de Triagem, Notificação de Duplicata, Concessão de Bounty) com interpolação de variáveis dinâmicas (`{hunter}`, `{report_title}`, `{bounty}`, `{cvss}`). |
| **6** | **Detector de Duplicatas** | Prevenção de relatórios duplicados | Comparador de similaridade de texto (Jaccard + Levenshtein), verificação de correspondência de endpoint e parâmetros vulneráveis em relação aos relatórios já existentes. |
| **7** | **Matriz & Simulador de Bounties** | Cálculo justo de recompensas e orçamento | Definição por Criticidade do Ativo (*Tier 1: Core/Auth/Payment*, *Tier 2: API/Customer*, *Tier 3: Marketing/Docs*) e simulação de impacto financeiro no orçamento anual. |
| **8** | **Exportador para Issue Trackers** | Conversão para times de desenvolvimento | Geração de tickets prontos em Markdown técnico para **Jira**, **GitHub Issues** e **GitLab Issues** com passos de reprodução, impacto de negócio e sugestões de correção. |
| **9** | **Sanitizador DLP (Segredos & PII)** | Proteção antes do envio de relatórios | Scanner em tempo real que detecta e ofusca chaves AWS (`AKIA...`), tokens de acesso GitHub (`ghp_...`), JWTs, senhas em URLs, chaves privadas RSA/OpenSSH e emails. |
| **10** | **Simulador de Webhooks** | Notificações e automação de alertas | Disparo e teste de payloads estruturados para **Slack**, **Discord** e **Microsoft Teams**, simulando avisos automáticos de vulnerabilidades críticas. |

---

## 📖 Como Usar as Novas Ferramentas (Guia Prático)

### 1. Como Avaliar uma Vulnerabilidade com o CVSS v4.0
1. Acesse a aba **AppSec** > selecione **CVSS v4.0 Calculator**.
2. Escolha um relatório na lista suspensa para pré-carregar os dados ou ajuste as métricas manualmente.
3. Defina os parâmetros das métricas Base:
   - **Vetor de Ataque (AV)**: *Network (N)*, *Adjacent (A)*, *Local (L)* ou *Physical (P)*.
   - **Complexidade do Ataque (AC)** e **Requisitos de Ataque (AT)**: Identifique se há condições de corrida ou dependências prévias.
   - **Privilégios Necessários (PR)** e **Interação do Usuário (UI)**.
   - **Impacto no Sistema Vulnerável (VC/VI/VA)** vs **Impacto em Sistemas Subsequentes (SC/SI/SA)** (novo conceito de separação de impacto do CVSS v4.0).
4. O sistema calcula a pontuação final (0.0 a 10.0), a classificação de severidade e gera o vetor oficial (ex: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`).
5. Clique em **Copiar Vetor** para incluir diretamente no seu formulário de submissão.

### 2. Como Sanitizar um Relatório antes do Envio (DLP Sanitizer)
1. Antes de publicar ou exportar um relatório, abra a aba **AppSec** > **DLP Sanitizer**.
2. Cole o texto completo do relatório ou carregue os dados do relatório selecionado.
3. O motor de DLP inspecionará o texto em busca de segredos: chaves AWS, tokens pessoais do GitHub, tokens Bearer JWT, senhas expostas em URLs ou chaves privadas.
4. Visualize os segredos identificados e clique em **Sanitizar Texto**: todas as credenciais sensíveis serão substituídas por máscaras seguras (ex: `[REDACTED-AWS-KEY]`).
5. Copie o texto seguro para anexar ao programa de Bug Bounty sem risco de vazamento de credenciais da empresa.

### 3. Como Gerar PoCs em cURL, Python ou Raw HTTP
1. Na aba **AppSec**, selecione **PoC & HTTP Builder**.
2. Escolha o método HTTP (`GET`, `POST`, `PUT`, `DELETE`), informe a URL do endpoint vulnerável, os cabeçalhos de autenticação e o corpo da requisição com o payload injetado.
3. O gerador cria instantaneamente três formatos com syntax highlighting:
   - **cURL**: Comando de terminal com headers (`-H`) e dados (`-d`), pronto para testes via CLI.
   - **Python Script**: Script em `requests` com tratamento de SSL e cabeçalhos adequados.
   - **Raw HTTP/1.1**: Formato clássico para colar em ferramentas como Burp Suite Repeater ou OWASP ZAP.
4. Clique em **Copiar** para anexar diretamente aos passos de reprodução do relatório.

### 4. Como Monitorar SLAs e Prevenir Atrasos de Resposta
1. Na aba **AppSec** > **SLA Tracker**, acompanhe a visão consolidada de todos os relatórios pendentes.
2. Cada relatório recebe um status visual:
   - 🟢 **Dentro do SLA**: Tempo de resposta ou resolução adequado.
   - 🟡 **Alerta de Risco**: Próximo do limite de resposta estabelecido para a severidade.
   - 🔴 **Breach / Vencido**: Prazo de atendimento ultrapassado (ideal para priorizar follow-up ou escalonamento).
3. Utilize os filtros de severidade para identificar rapidamente achados Críticos com mais de 24h sem resposta de triagem.

### 5. Como Exportar Relatórios para Jira, GitHub ou GitLab
1. Na aba **AppSec** > **Issue Exporter**, selecione o relatório que deseja despachar para a equipe de engenharia.
2. Escolha o destino: **Jira**, **GitHub Issues** ou **GitLab**.
3. O sistema compila automaticamente um documento estruturado contendo:
   - Resumo executivo e vetor CVSS;
   - Passos reproduzíveis e cURL correspondente;
   - Categoria CWE associada;
   - Recomendações de remediação e referências técnicas.
4. Copie com um clique ou baixe o arquivo em Markdown para abertura do chamado.

---

## 🌍 Threat Intelligence Global em Tempo Real

A aba **Intel** fornece visibilidade completa sobre o cenário mundial de segurança:

- **Mapa Global de Ameaças (`GlobalThreatMap`)**: Mapa interativo mundial destacando focos de campanhas ativas, ataques de negação de serviço, exploração de vulnerabilidades zero-day e atividades de grupos APT.
- **Linha do Tempo de Incidentes (`GlobalSecurityIncidentTimeline`)**: Histórico cronológico das maiores violações e vazamentos recentes com severidade, volume de registros afetados e lições aprendidas.
- **Feed de Inteligência Recente (`RecentGlobalThreatIntelligence`)**: Atualizações rápidas de novas técnicas de ataque, vulnerabilidades críticas recém-descobertas e avisos de segurança da CISA, NVD e CERT.
- **Tendência de Descobertas (`ThreatDiscoveryTrend`)**: Métricas de evolução dos tipos de vetores de exploração mais frequentes no trimestre.

---

## ⚖️ Simuladores Quantitativos de Risco & Impacto Financeiro

Para justificar o valor de cada vulnerabilidade além do aspecto puramente técnico, o BugSentinel oferece ferramentas financeiras e probabilísticas:

1. **Matriz de Risco 5x5 (`RiskAssessmentMatrix`)**:
   - Cruza a **Probabilidade de Exploração** (1 a 5) com o **Impacto no Negócio** (1 a 5).
   - Classifica os relatórios em zonas de risco: Desprezível, Baixo, Médio, Alto e Crítico.
   - Apresenta contadores de tempo relativo nos relatórios críticos para identificar achados prioritários urgentes.

2. **Simulador FAIR (Factor Analysis of Information Risk) (`FairImpactSimulator`)**:
   - Aplica a metodologia internacional padrão de análise quantitativa de risco cibernético.
   - Avalia a Frequência do Evento de Ameaça (TEF), Vulnerabilidade do Ativo (VULN) e Magnitude de Perda Primária e Secundária.
   - Calcula a **Perda Única Esperada (SLE - Single Loss Expectancy)** e a **Perda Anual Esperada (ALE - Annualized Loss Expectancy)** em moeda real (USD / BRL).

3. **Simulador de Violação de Dados & Multas Regulatórias (`BreachImpactSimulator`)**:
   - Estima custos diretos e indiretos de incidentes de dados (notificação de titulares, perícia forense, danos à reputação).
   - Modela riscos de multas regulatórias sob a **LGPD** (até 2% do faturamento ou R$ 50 milhões por infração) e o **GDPR** (até € 20 milhões ou 4% do faturamento global anual).

---

## ⏱️ Métricas de Produtividade & Eficiência de Triagem

- **Métricas de Taxa Horária Real (`HourlyRateMetrics`)**:
  - Calcula seu ganho horário real (*Hourly Rate*) dividindo o total de *bounties* recebidos pelas horas dedicadas à pesquisa de segurança.
  - Apresenta taxa de conversão entre dólares americanos (USD) e reais (BRL) em tempo real.
- **Eficiência de Triagem & SLA (`TriageEfficiencyCard`)**:
  - Mede o tempo médio decorrido entre a submissão e a validação do relatório pela equipe do programa.
  - Destaca o índice de *Signal-to-Noise* (percentual de relatórios aceitos vs descartados).
- **Detector Inteligente de Anomalias (`SmartAnomalyDetector`)**:
  - Identifica desvios comportamentais nos relatórios, como saltos de status atípicos (ex: submissão diretamente para fechada sem triagem prévia), pagamentos fora da faixa histórica ou severidades inconsistentes.

---

## 📚 Bibliotecas Técnicas: Payloads & Checklists

Na aba **Library**, o pesquisador encontra recursos prontos para o dia a dia:

- **Biblioteca de Payloads de Exploração (`PayloadLibrary`)**:
  - Centenas de payloads categorizados para testes de segurança:
    - *Cross-Site Scripting (XSS)*: Reflected, Stored, DOM e filtros com bypass de WAF.
    - *SQL Injection (SQLi)*: Error-based, Time-based blind, Boolean blind e Union-based.
    - *Server-Side Request Forgery (SSRF)*: Metadados de nuvem (AWS, GCP, Azure), bypasses de localhost e DNS rebinding.
    - *Server-Side Template Injection (SSTI)*: Jinja2, Twig, Freemarker, Thymeleaf.
    - *Command Injection (RCE)*: Payloads Unix/Windows com técnicas de concatenação e encoding.
    - *Local & Remote File Inclusion (LFI/RFI)*: Path traversal, PHP wrappers (`php://filter`) e null-byte bypasses.
  - Botão de cópia rápida e anotações de contexto de uso.

- **Checklists de Validação de Segurança (`SecurityChecklistLibrary`)**:
  - Listas de verificação baseadas nas melhores práticas internacionais:
    - *API Security Testing (OWASP API Security Top 10)*;
    - *Web Application Penetration Testing Checklist*;
    - *Mobile Application Security (OWASP MASVS)*;
    - *Cloud Infrastructure & IAM Security*.
  - Acompanhamento interativo do progresso percentual de cada auditoria.

---

## 📈 Módulos de Gráficos e Analytics (Recharts)

O sistema utiliza a biblioteca **Recharts** com paleta dark de alto contraste (`#0a0a0a`, `#10b981`, `#f59e0b`, `#06b6d4`, `#a855f7`):

| Componente | Tipo de Gráfico | Finalidade |
| :--- | :--- | :--- |
| `FutureEarningsProjectionChart` | `ComposedChart` (Area + Line) | Projeta rendimentos dos próximos 3, 6 ou 12 meses nos cenários Conservador, Esperado e Otimista com base no backlog em triagem e taxa de aceitação histórica. |
| `MonthlySubmissionCadenceChart` | `LineChart` | Acompanha a cadência histórica mensal de submissões, volume por severidade, média móvel (3M) e correlação com bounties. |
| `ReportsTrendChart` | `LineChart` / `AreaChart` | Exibe a cadência de entrega dos últimos 30 dias. |
| `SeverityPieChart` | `PieChart` | Distribuição percentual do portfólio de achados por severidade. |
| `SeverityBreakdownChart` | `BarChart` | Contagem e soma financeira agrupada por níveis de risco CVSS. |
| `ActivityHeatmap` | Grid SVG Interativo | Frequência diária de relatórios ao longo dos 365 dias do ano (estilo GitHub). |
| `BountySparklineChart` | Sparkline SVG | Tendência visual compacta da evolução de pagamentos de cada programa. |

---

## 🌐 Diretório de 14 Plataformas de Bug Bounty

Na aba **Sites**, consulte o guia detalhado das 14 principais plataformas globais:

1. **HackerOne**: A maior plataforma mundial de Bug Bounty e VDP.
2. **Bugcrowd**: Especialista em CrowdControl e programas gerenciados.
3. **Intigriti**: Principal plataforma de segurança ofensiva da Europa.
4. **YesWeHack**: Plataforma francesa com forte presença global e programas na Europa e Ásia.
5. **SynAck**: Modelo Red Team sob demanda com remuneração híbrida (fixa + bounty).
6. **HackenProof**: Especializada em Web3, smart contracts e exchanges de criptomoedas.
7. **Immunefi**: A maior plataforma de recompensas de Web3 e DeFi do mundo, com bounties de até US$ 10 milhões.
8. **Open Bug Bounty**: Plataforma sem fins lucrativos focada em submissões coordenadas sem remuneração obrigatória.
9. **Bugbounty.jp**: A principal plataforma japonesa de testes de invasão coletivos.
10. **Integrity**: Plataforma europeia focada em clientes corporativos de alto nível.
11. **SafeHacker**: Focada em segurança colaborativa e triagem rápida.
12. **Cobalt.io**: Plataforma Pentest-as-a-Service (PtaaS).
13. **Federacy**: Foco em startups e segurança ágil.
14. **Google VRP (Vulnerability Reward Program)**: O renomado programa de recompensas do ecossistema Google, Android e Chrome.

Cada página contém: modelos de pagamento suportados, exigências de KYC, políticas de *Safe Harbor*, prazos médios de triagem e estratégias para obter convites para programas privados (*private invites*).

---

## 📱 Interface Responsiva & Acessibilidade Mobile

A interface do BugSentinel foi desenhada para se adaptar fluidamente de telas grandes de desktop a smartphones e tablets:

- **Alvos de Toque Ergonômicos (Touch Targets)**: Botões de navegação e abas móveis possuem altura mínima de **44px** (`min-h-[44px]`), prevenindo toques acidentais e facilitando o uso com uma única mão.
- **Navegação com Centralização Automática**: Ao alternar entre as abas móveis, o botão ativo é automaticamente centralizado e posto em foco via rolagem suave (`scrollIntoView`).
- **Contadores de Tempo Relativo Dinâmicos**: Cards com achados críticos exibem selos de idade relativa (`formatRelativeTimeAgo`) como `Created 15m ago`, `Created 2h ago` ou `Created 3d ago`, permitindo priorização imediata.
- **Teclas de Atalho Globais**:
  - `/` ou `Ctrl + K`: Ativa a barra de busca unificada de relatórios.
  - `Alt + T`: Abre o modal de cadastro de novo alvo (*Add Target*).
  - `Esc`: Fecha modais e menus abertos.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visualização de Dados**: [Recharts 3](https://recharts.org/)
- **Criptografia & Assinatura**: [OpenPGP.js 6](https://openpgpjs.org/)
- **Notificações**: [react-hot-toast](https://react-hot-toast.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Servidor & Container**: [Express](https://expressjs.com/) + [tsx](https://github.com/privatenumber/tsx) + [Node.js 22 LTS](https://nodejs.org/)
- **CI/CD & Deploy**: [GitHub Actions](https://github.com/features/actions) & [GitHub Pages](https://pages.github.com/)

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- **Node.js 22.x LTS** (ou versão 20.x+)
- **npm** (versão 10+)

### Passos de Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/bugsentinel.git
   cd bugsentinel
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em: `http://localhost:3000`

4. **Verificação de tipos e lint:**
   ```bash
   npm run lint
   ```

5. **Build de produção:**
   ```bash
   npm run build
   ```

---

## 🌐 Deploy no GitHub Pages (Node 22 LTS)

O projeto está 100% configurado para publicação contínua e gratuita no **GitHub Pages** utilizando o **Node.js 22 LTS**.

### 1. Configuração Automática via GitHub Actions

O arquivo `.github/workflows/deploy.yml` já está configurado no repositório:

1. Faça o push do código para o seu repositório:
   ```bash
   git add .
   git commit -m "feat: setup BugSentinel with AppSec Suite and Node 22"
   git push origin main
   ```
2. No seu repositório no GitHub, acesse **Settings** > **Pages**.
3. Na seção **Build and deployment** > **Source**, selecione **GitHub Actions**.
4. A cada novo `push` na branch `main`, os assets estáticos serão compilados no Node 22 e publicados em:
   ```
   https://<seu-usuario>.github.io/<nome-do-repositorio>/
   ```

> 💡 **Compatibilidade de Caminhos Relativos**: O arquivo `vite.config.ts` utiliza `base: './'`, permitindo que a aplicação seja executada perfeitamente na raiz de domínios ou em subpastas de repositórios do GitHub Pages sem falhas no carregamento de scripts ou estilos.

---

## 🔒 Privacidade e Armazenamento

- **Arquitetura Offline-First**: Todos os relatórios, rascunhos, chaves PGP e configurações são salvos no `localStorage` do seu navegador.
- **Zero Envio Oculto de Dados**: Suas descobertas confidenciais de vulnerabilidades e credenciais nunca são enviadas para servidores externos.
- **Validador de Integridade de Dados (`StorageIntegrityModal`)**: Ferramenta embutida que inspeciona o `localStorage`, detecta potenciais corrupções de esquema JSON e permite exportação/backup seguro em arquivo `.json`.
- **Restauração a Qualquer Momento**: O sistema oferece restauração instantânea dos dados de demonstração (*seed*) pela Central de Ajuda.

---

## 📄 Licença

Este projeto é disponibilizado sob a licença **MIT**. Sinta-se livre para usar, estudar, aprimorar e estender a ferramenta para sua rotina de testes de segurança da informação e Bug Bounty.
