# 🛡️ BugSentinel — Bug Bounty Manager & Vulnerability Tracker

> **Plataforma completa para caçadores de recompensas (Bug Hunters), pesquisadores de segurança e equipes de AppSec gerenciarem relatórios, assinarem relatórios com PGP, calcularem vetores CVSS v3.1 e projetarem rendimentos futuros de recompensas.**

[![Node.js Version](https://img.shields.io/badge/node-22.x%20LTS-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/recharts-3.10-22c55e.svg)](https://recharts.org/)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-black.svg?logo=github)](https://pages.github.com/)

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Módulos de Gráficos e Analytics (Recharts)](#-módulos-de-gráficos-e-analytics-recharts)
- [Diretório de Plataformas de Bug Bounty & Tutoriais](#-diretório-de-plataformas-de-bug-bounty--tutoriais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Deploy no GitHub Pages (Node 22 LTS)](#-deploy-no-github-pages-node-22-lts)
- [Privacidade e Armazenamento](#-privacidade-e-armazenamento)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **BugSentinel** foi construído sob medida para atender as demandas reais de profissionais de segurança da informação e caçadores de recompensas (*Bug Hunters*). 

A ferramenta organiza o ciclo de vida completo de vulnerabilidades — desde o rascunho de PoC (*Proof of Concept*), cálculo de impacto com vetor oficial CVSS v3.1, assinatura criptográfica PGP para submissão responsável (*Responsible Disclosure*), até a gestão financeira de recompensas recebidas e projeção preditiva de ganhos.

---

## ✨ Funcionalidades Principais

### 1. 📊 Dashboard Executivo & Métricas
- **KPIs em Tempo Real**: Total de relatórios, taxa de aceitação (*Signal/Noise*), severidade média e valor total acumulado de *bounties* (USD e BRL).
- **Projeção de Rendimentos Futuros (Forecast)**: Modelo preditivo em `recharts` que calcula ganhos futuros (3, 6 ou 12 meses) com cenários **Conservador**, **Esperado** e **Otimista**, avaliando o backlog em triagem e simulando metas extras de submissão.
- **Cadência Mensal de Submissões**: Gráfico de linha temporal com 4 modos (Cadência, Severidade, Bounties e Acumulado) com suporte a média móvel de 3 meses.
- **Histórico de 30 Dias & Heatmap de 365 Dias**: Produtividade diária estilo GitHub para identificar consistência de pesquisa e dias de alta entrega.
- **Distribuição de Severidade**: Gráficos de rosca (*Pie*) e barras (*Bar*) mapeando achados Críticos, Altos, Médios e Baixos.
- **Ferramenta Visual de Comparação CVSS**: Permite comparar dois vetores CVSS v3.1 simultâneos, destacando métricas de ataque, privilégios, escopo e variações de pontuação com cálculo de delta visual.

### 2. 📝 Gestão de Relatórios de Vulnerabilidade (Workbench)
- Ciclo de vida completo: `Rascunho (DRAFT)`, `Enviado (SUBMITTED)`, `Em Triagem (TRIAGED)`, `Recompensado (REWARDED)`, `Resolvido (RESOLVED)` e `Fechado (CLOSED)`.
- Calculadora nativa integrada do padrão **CVSS v3.1 (FIRST.Org)**.
- Geração de vetores CVSS normalizados (ex: `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`).
- Exportação de relatórios em Markdown estruturado pronto para submissão no HackerOne, Bugcrowd, Intigriti e YesWeHack.

### 3. 🔐 Assinatura Criptográfica PGP
- Assinatura digital direta no navegador via `openpgp`.
- Garante integridade e autoria da submissão para programas de *Responsible Disclosure* que exigem envio de relatórios assinados ou criptografados com chave PGP pública da equipe de segurança.

### 4. 🌐 Diretório de 14 Plataformas de Bug Bounty
- Informações detalhadas de **14 grandes plataformas**: HackerOne, Bugcrowd, Intigriti, YesWeHack, SynAck, HackenProof, Immunefi, Open Bug Bounty, Bugbounty.jp, Integrity, SafeHacker, Cobalt.io, Federacy e Google VRP.
- **Guias Práticos**: Tutorial passo a passo de cadastro, requisitos de KYC, modelos de pagamento (PayPal, Crypto, Transferência Bancária), prazos médios de triagem e políticas de *Safe Harbor*.
- **Estratégias de Monetização**: Dicas de como construir reputação, garantir primeiros convites para programas privados (*private invites*) e encontrar falhas de alto impacto.

### 5. 🔍 Base de Conhecimento CVE & Documentação Técnica
- Pesquisa rápida em base de dados de vulnerabilidades conhecidas (CVEs).
- Biblioteca técnica de segurança com guias práticos sobre OWASP Top 10 (SQLi, SSRF, IDOR, RCE, Broken Auth, etc.) e checklists de testes.

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
| `ActivityHeatmap` | Grid SVG Interativo | Frequência diária de relatórios ao longo dos 365 dias do ano. |

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Gráficos e Visualização de Dados**: [Recharts 3](https://recharts.org/)
- **Criptografia**: [OpenPGP.js 6](https://openpgpjs.org/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Servidor & API**: [Express](https://expressjs.com/) + [tsx](https://github.com/privatenumber/tsx) + [Node.js 22 LTS](https://nodejs.org/)
- **Deploy**: [GitHub Actions](https://github.com/features/actions) & [GitHub Pages](https://pages.github.com/)

---

## 📁 Estrutura do Projeto

```text
├── .github/
│   └── workflows/
│       └── deploy.yml            # Pipeline de automação para GitHub Pages com Node 22
├── public/                       # Arquivos estáticos e ícones
├── src/
│   ├── components/
│   │   ├── FutureEarningsProjectionChart.tsx # Projeção de rendimentos futuros (Recharts)
│   │   ├── MonthlySubmissionCadenceChart.tsx # Cadência mensal de bugs (Recharts)
│   │   ├── CvssComparisonTool.tsx           # Comparador visual de vetores CVSS v3.1
│   │   ├── BugBountyDirectoryView.tsx       # Diretório das 14 plataformas e tutoriais
│   │   ├── ReportsTrendChart.tsx            # Tendência de 30 dias
│   │   ├── SeverityPieChart.tsx             # Gráfico de rosca por severidade
│   │   ├── SeverityBreakdownChart.tsx       # Gráfico de barras por severidade
│   │   ├── ActivityHeatmap.tsx              # Heatmap de 365 dias estilo GitHub
│   │   ├── DashboardView.tsx                # Painel principal consolidado
│   │   ├── ReportsView.tsx                  # Gerenciador e listagem de relatórios
│   │   ├── Header.tsx                       # Cabeçalho responsivo e navegação
│   │   └── ...
│   ├── data/
│   │   ├── initialData.ts                   # Relatórios mock e sementes de demonstração
│   │   └── bugBountyPlatformsData.ts        # Dados das 14 plataformas de Bug Bounty
│   ├── types.ts                             # Definições TypeScript (Vulnerabilidades, CVSS, etc.)
│   ├── utils/
│   │   ├── cvssCalculator.ts                # Calculadora matemática de score CVSS v3.1
│   │   ├── formatters.ts                    # Formatadores de moeda e badges
│   │   └── pgpSigner.ts                     # Utilitário de assinatura PGP
│   ├── App.tsx                              # Componente raiz e roteamento de abas
│   └── main.tsx                             # Ponto de entrada React
├── index.html                           # Entry point HTML
├── metadata.json                        # Metadados e configurações da aplicação
├── package.json                         # Dependências e scripts de automação
├── server.ts                            # Servidor Express de desenvolvimento/container
├── tsconfig.json                        # Configurações do TypeScript
└── vite.config.ts                       # Configurações do Vite (caminho relativo base: './')
```

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- **Node.js 22.x LTS** (ou versão 20.x+)
- **npm** (versão 10+)

### Passos

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
   O aplicativo estará disponível em: `http://localhost:3000`

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

O projeto já vem 100% configurado para publicação estática contínua e gratuita no **GitHub Pages** utilizando o **Node.js 22 LTS** mais atual.

### 1. Configuração Automática via GitHub Actions (Recomendado)

O arquivo `.github/workflows/deploy.yml` já está configurado no repositório:

1. Suba o código para o seu repositório no GitHub:
   ```bash
   git add .
   git commit -m "feat: setup BugSentinel for GitHub Pages with Node 22"
   git push origin main
   ```
2. No seu repositório no GitHub, acesse **Settings** > **Pages**.
3. Na seção **Build and deployment** > **Source**, selecione:
   - **GitHub Actions**
4. A cada novo `push` na branch `main` (ou disparo manual via *workflow_dispatch*), o GitHub Actions compilará os assets estáticos no Node 22 e publicará sua aplicação em:
   ```
   https://<seu-usuario>.github.io/<nome-do-repositorio>/
   ```

### 2. Por que o caminho relativo funciona perfeitamente?
O arquivo `vite.config.ts` utiliza:
```ts
export default defineConfig(() => {
  return {
    base: './', // Permite que a aplicação rode em subpastas no GitHub Pages sem quebrar assets
    plugins: [react(), tailwindcss()],
    // ...
  };
});
```

### 3. Build Manual para GitHub Pages
Se preferir gerar a pasta estática manualmente:
```bash
npm run build:gh-pages
```
Os arquivos otimizados prontos para publicação estarão na pasta `dist/`. Para testar localmente o build:
```bash
npm run preview
```

---

## 🔒 Privacidade e Armazenamento

- **Armazenamento Offline-First**: Todos os relatórios, rascunhos, chaves e preferências são persistidos localmente no `localStorage` do seu navegador.
- **Sem Envio Oculto de Dados**: Seus relatórios e chaves privadas nunca são transmitidos para servidores de terceiros.
- **Controle Total**: Você pode exportar relatórios em formato estruturado a qualquer momento ou restaurar os dados de demonstração pelo painel de ajuda.

---

## 📄 Licença

Este projeto é disponibilizado sob a licença **MIT**. Sinta-se livre para usar, personalizar e estender a ferramenta para sua rotina de pesquisas de segurança.
