import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { translateString, enableUniversalDomTranslation } from '../utils/universalTranslator';

export type AppLanguage = 'pt-BR' | 'en-US' | 'es-ES';

export interface LanguageOption {
  code: AppLanguage;
  shortLabel: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'pt-BR', shortLabel: 'PT', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en-US', shortLabel: 'EN', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', shortLabel: 'ES', name: 'Español (ES)', flag: '🇪🇸' }
];

export const LANGUAGE_STORAGE_KEY = 'bbm_app_language';
export const APP_ICON_URL_STORAGE_KEY = 'bbm_app_icon_url';
export const I18N_ENABLED_STORAGE_KEY = 'bbm_i18n_enabled';
export const DEFAULT_APP_ICON_URL = '/icon.svg';

export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  'pt-BR': {
    // Navigation
    'nav.home': 'Início',
    'nav.dashboard': 'Dashboard',
    'nav.reports': 'Relatórios',
    'nav.cve': 'CVE-DB',
    'nav.targets': 'Programas',
    'nav.docs': 'Biblioteca',
    'nav.platforms': 'Sites & Ganhos',
    'nav.platformsShort': 'Sites',
    'nav.threatIntel': 'Threat Intel',
    'nav.notifications': 'Notificações',
    'nav.alertsShort': 'Alertas',
    'nav.tools': 'Ferramentas AppSec',
    'nav.appsecShort': 'AppSec',
    'nav.intelShort': 'Intel',
    'nav.more': 'Mais',
    'nav.homeTitle': 'Página Inicial de Apresentação e Boas-Vindas',
    'nav.dashTitle': 'Ir para o Dashboard',
    'nav.reportsTitle': 'Relatórios de Vulnerabilidade',
    'nav.cveTitle': 'Base de Dados de CVEs e Exploits',
    'nav.targetsTitle': 'Programas e Alvos Bug Bounty',
    'nav.toolsTitle': 'Central de Ferramentas AppSec & DevSecOps (10 Módulos)',
    'nav.threatIntelTitle': 'Threat Intelligence em Tempo Real',
    'nav.notificationsTitle': 'Notificações do Sistema',
    'nav.platformsTitle': 'Plataformas de Bug Bounty & Ganhos',
    'nav.docsTitle': 'Biblioteca de Segurança, Guias e Metodologias',

    // Header & Actions
    'header.brandTooltip': 'Ir para a Página Inicial (Boas-vindas)',
    'header.searchPlaceholder': 'Buscar alvo, CVE...',
    'header.addTarget': 'Novo Alvo',
    'header.signPgp': 'Assinar PGP',
    'header.cvssCalc': 'Calc CVSS',
    'header.mockActive': 'Mock Ativo',
    'header.mockEmpty': 'Plataforma Zerada',
    'header.settings': 'Configurações',
    'header.newReport': 'Novo Relatório',
    'header.newShort': 'Novo',
    'header.themeLight': 'Claro',
    'header.themeDark': 'Escuro',
    'header.bountyBalance': 'Saldo de Bounties',
    'header.quickActions': 'Ações Rápidas',
    'header.shortcuts': 'Atalhos',
    'header.addScope': 'Adicionar Alvo / Escopo',
    'header.signReport': 'Assinar Relatório PGP',
    'header.cvssCalcTitle': 'Calculadora CVSS v3.1',
    'header.notifHub': 'Central de Notificações',
    'header.cveBase': 'Base de Vulnerabilidades (CVE)',
    'header.docsChecklists': 'Biblioteca & Checklists',
    'header.platformsEarnings': 'Sites de Bug Bounty & Ganhos',
    'header.threatIntelLive': 'Threat Intel em Tempo Real',
    'header.login': 'Fazer Login',

    // Dashboard KPIs
    'kpi.totalBounties': 'Total em Bounties',
    'kpi.estimatedBrl': 'estimado',
    'kpi.activeReports': 'Relatórios Ativos',
    'kpi.acceptanceRate': 'Taxa de Aceitação',
    'kpi.criticalFindings': 'Achados Críticos',
    'kpi.avgReward': 'Recompensa Média',
    'kpi.trend30d': 'Tendência 30D',
    'kpi.unrewarded': 'Sem Recompensa',
    'kpi.triaged': 'Em Triagem',
    'kpi.pendingPayout': 'Pagamento Pendente',

    // Dashboard Sections
    'dash.statSummaryTitle': 'Resumo Estatístico Operacional',
    'dash.totalBountiesReceived': 'Total de Bounties Recebidos (USD)',
    'dash.rewardSuccessRate': 'Taxa de Sucesso de Recompensas',
    'dash.avgTimeToTriage': 'Tempo Médio de Triagem (TTT)',
    'dash.criticalPending': 'Vulnerabilidades Críticas Pendentes',
    'dash.monitoredTargets': 'Alvos Monitorados',
    'dash.monthlyBountiesTitle': 'Histórico Mensal de Recompensas Ganhas',
    'dash.monthlyBountiesDesc': 'Distribuição e evolução de recompensas financeiras por mês baseadas na data de pagamento/atualização (updatedAt) dos relatórios.',
    'dash.monthlyBountiesShort': 'Histórico Mensal ($)',
    'dash.fairTolerance': 'Tolerância FAIR',
    'dash.tttComparative': 'TTT Mensal',
    'dash.tttComparativeTitle': 'Painel Comparativo de Tempo de Triagem (TTT)',
    'dash.tttHistogram': 'Histograma TTT',
    'dash.tttHistogramTitle': 'Distribuição do Tempo Médio de Triagem & Gargalos',
    'dash.appSecToolsTitle': 'Central de Ferramentas AppSec & DevSecOps',
    'dash.toolsIntegrated': '40 FERRAMENTAS INTEGRADAS',
    'dash.openTools': 'Abrir Ferramentas AppSec',
    'dash.recentActivity': 'Atividade Recente',
    'dash.bountiesOverTime': 'Bounties ao Longo do Tempo',
    'dash.severityDistribution': 'Distribuição de Vulnerabilidades por Severidade',
    'dash.authPromptTitle': 'Modo Somente Leitura Ativo',
    'dash.authPromptDesc': 'Para registrar novos relatórios, editar vulnerabilidades ou visualizar PoCs, faça login.',

    // Reports View
    'reports.title': 'Relatórios de Vulnerabilidade',
    'reports.subtitle': 'Gerencie achados, formate para envio e acompanhe o pipeline de triagem e pagamento',
    'reports.importCsv': 'Importar CSV',
    'reports.exportCsv': 'Exportar CSV',
    'reports.searchPlaceholder': 'Buscar por título, alvo, CVE, CWE ou tags...',
    'reports.statusAll': 'Todos os Status',
    'reports.statusDraft': 'Rascunhos',
    'reports.statusSubmitted': 'Enviados',
    'reports.statusTriaged': 'Em Triagem',
    'reports.statusRewarded': 'Recompensados ($)',
    'reports.statusResolved': 'Resolvidos',
    'reports.statusDuplicate': 'Duplicados',
    'reports.statusOutOfScope': 'Fora de Escopo',
    'reports.colTitle': 'Título da Vulnerabilidade',
    'reports.colTarget': 'Alvo / Programa',
    'reports.colSeverity': 'Severidade',
    'reports.colStatus': 'Status',
    'reports.colBounty': 'Recompensa',
    'reports.colActions': 'Ações',
    'reports.empty': 'Nenhum relatório encontrado.',

    // Targets View
    'targets.title': 'Alvos & Programas de Bug Bounty',
    'targets.subtitle': 'Acompanhe escopos autorizados, limites de teste e descubra vetores de ataque prioritários',
    'targets.addTarget': 'Adicionar Programa / Alvo',
    'targets.inScope': 'Dentro do Escopo (In-Scope)',
    'targets.outScope': 'Fora do Escopo (Out-of-Scope)',
    'targets.bountyRange': 'Faixa de Bounties',

    // Welcome / Home Page
    'welcome.badge': 'BugSentinel Platform v2.4.0',
    'welcome.badgeSub': 'AppSec Operations & Bug Bounty Management',
    'welcome.hero.titlePrefix': 'Central de Operações para',
    'welcome.hero.titleHighlight': 'Security Researchers & Bug Bounty Hunters',
    'welcome.hero.desc': 'Uma estação de trabalho profissional para catalogar vulnerabilidades, calcular severidades com precisão matemática (CVSS v3.1 / v4.0), gerar relatórios executivos com inteligência artificial, simular riscos corporativos (FAIR) e sincronizar achados em tempo real na nuvem ou no GitHub.',
    'welcome.hero.enterDashboard': 'Acessar a Ferramenta (Dashboard)',
    'welcome.hero.exploreMock': 'Explorar com Dados Demonstrativos',
    'welcome.hero.login': 'Login / Criar Conta',
    'welcome.metric.baseStatus': 'Status da Base:',
    'welcome.metric.mockActive': 'Mock Demonstrativo',
    'welcome.metric.mockClean': 'Ambiente Zerado',
    'welcome.metric.currentReports': 'Relatórios Atuais:',
    'welcome.metric.registered': 'cadastrado',
    'welcome.metric.registeredPlural': 'cadastrados',
    'welcome.metric.targets': 'Alvos & Programas:',
    'welcome.metric.program': 'programa',
    'welcome.metric.programPlural': 'programas',
    'welcome.metric.persistence': 'Persistência em Nuvem:',
    'welcome.metric.cloudConnected': 'Firebase Conectado',
    'welcome.metric.offline': 'Offline / Local',
    'welcome.mode.title': 'Como você deseja inicializar a plataforma?',
    'welcome.mode.desc': 'Você pode alternar entre uma demonstração completa pré-populada ou um espaço de trabalho 100% limpo a qualquer momento:',
    'welcome.card.mockBadge': 'Recomendado para Primeira Visita',
    'welcome.card.activeNow': 'Ativo agora',
    'welcome.card.mockTitle': 'Explorar com Dados Demonstrativos',
    'welcome.card.mockDesc': 'Inicie com relatórios realistas já cadastrados (BOLA/IDOR em APIs financeiras, XSS, CSRF), programas de bug bounty configurados, gráficos de recompensas preenchidos e timelines de auditoria.',
    'welcome.card.mockBullet1': 'Visualize todos os gráficos de evolução, matrizes 5x5 e simulações FAIR em funcionamento.',
    'welcome.card.mockBullet2': 'Teste o exportador em PDF Executivo, calculadora CVSS v3.1/v4.0 e assinatura PGP.',
    'welcome.card.mockBullet3': 'Zere ou recarregue a base de testes quando desejar com um clique.',
    'welcome.card.mockBtn': 'Carregar Demonstração & Entrar na Ferramenta',
    'welcome.card.cleanBadge': 'Ambiente Limpo / Produção',
    'welcome.card.cleanTitle': 'Iniciar com Espaço 100% Zerado',
    'welcome.card.cleanDesc': 'Remove os dados simulados e deixa a aplicação completamente limpa, pronta para você cadastrar seus próprios programas corporativos e vulnerabilidades reais confidenciais.',
    'welcome.card.cleanBullet1': 'Base com 0 relatórios e 0 alvos, pronta para uso pessoal ou em equipe.',
    'welcome.card.cleanBullet2': 'Privacidade total: seus achados são sincronizados no seu próprio usuário no Firebase.',
    'welcome.card.cleanBullet3': 'Possibilidade de restaurar os mocks a qualquer momento na central de configurações.',
    'welcome.card.cleanBtn': 'Limpar Mock & Entrar com Base Limpa',
    'welcome.modules.title': 'Módulos e Recursos Integrados',
    'welcome.modules.desc': 'Conheça as ferramentas disponíveis na plataforma e navegue diretamente para cada uma:',
    'welcome.modules.dashTitle': 'Dashboard Operacional',
    'welcome.modules.dashDesc': 'Métricas de aceitação, evolução de recompensas ao longo do tempo (Recharts), matriz de risco 5x5 e linha do tempo de auditoria.',
    'welcome.modules.dashBtn': 'Abrir Dashboard',
    'welcome.modules.reportsTitle': 'Relatórios de Vulnerabilidade',
    'welcome.modules.reportsDesc': 'Criação assistida por IA, passos de reprodução estruturados, exportação em PDF executivo, assinatura digital PGP e importação CSV.',
    'welcome.modules.reportsBtn': 'Ver Relatórios',
    'welcome.modules.toolsTitle': 'Suíte AppSec (37 Ferramentas)',
    'welcome.modules.toolsDesc': 'BOLA/IDOR Matrix, Payload Obfuscator (XOR/B64), HTTP Smuggling (CL.TE), Sanitizador DLP de tokens, ReDoS Analyzer e mais.',
    'welcome.modules.toolsBtn': 'Explorar Ferramentas',
    'welcome.modules.intelTitle': 'Threat Intelligence Global',
    'welcome.modules.intelDesc': 'Feed em tempo real com avisos oficiais da CISA, NVD e OWASP, além de notícias globais de exploração e ameaças em 0-day.',
    'welcome.modules.intelBtn': 'Acessar Threat Intel',
    'welcome.modules.cveTitle': 'CVE Explorer & CVSS Calculator',
    'welcome.modules.cveDesc': 'Cálculo de score base, temporal e ambiental segundo a especificação oficial FIRST.org, com busca em catálogo local e NVD.',
    'welcome.modules.cveBtn': 'Abrir CVE & CVSS',
    'welcome.modules.targetsTitle': 'Alvos, Escopos & 14 Plataformas',
    'welcome.modules.targetsDesc': 'Controle estrito de escopo (in-scope / out-of-scope), histórico por domínio e diretório de 14 plataformas com regras e limites.',
    'welcome.modules.targetsBtn': 'Gerenciar Alvos',
    'welcome.arch.tag': 'Arquitetura Híbrida Segura',
    'welcome.arch.title': 'Persistência em Nuvem Firebase + Auto-Cura Local',
    'welcome.arch.desc': 'Seus dados são protegidos por regras estritas de Attribute-Based Access Control no Firestore. Você pode trabalhar offline sem perder nada ou acessar de qualquer dispositivo conectando sua conta.',
    'welcome.arch.btn': 'Ir para o Dashboard',

    // General / Common
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.close': 'Fechar',
    'common.edit': 'Editar',
    'common.delete': 'Excluir',
    'common.actions': 'Ações',
    'common.status': 'Status',
    'common.severity': 'Severidade',
    'common.apply': 'Aplicar',
    'common.reset': 'Redefinir',
    'common.all': 'Todos',
    'lang.label': 'Idioma',
    'lang.changed': 'Idioma alterado para Português (BR)',
    'icon.label': 'Caminho da URL do Ícone (Icon URL Path)',
    'icon.updated': 'URL do ícone atualizada com sucesso!',
    
    // i18n System Keys
    'i18n.title': 'Internacionalização & Tradução Global (i18n)',
    'i18n.description': 'Alterne o idioma global do aplicativo para reconstruir síncronamente toda a interface e recarregar os pacotes de recursos de texto correspondentes ao locale selecionado.',
    'i18n.toggleLabel': 'Alternador Global de Idioma (i18n)',
    'i18n.toggleDesc': 'Selecione abaixo o locale desejado para forçar a re-renderização de todos os componentes da UI com os recursos de texto correspondentes.',
    'i18n.forceBtn': 'Forçar Re-renderização da UI',
    'i18n.engineActive': 'MOTOR I18N ATIVO',
    'i18n.masterToggle': 'Ativar Tradução Global i18n',
    'i18n.masterToggleDesc': 'Mantém o motor de internacionalização ativo em tempo real para sincronizar strings e nós do DOM.',
    'i18n.previewTitle': 'Verificação de Recursos de Texto em Tempo Real',
    'i18n.previewDesc': 'Amostra ao vivo de strings da interface renderizadas dinamicamente com o locale selecionado:',
    'i18n.activeLocale': 'Locale Ativo',
    'i18n.coverageTitle': 'Módulos da Aplicação com Tradução Ativa',
    'i18n.rerenderSuccess': 'Interface re-renderizada com sucesso com os recursos de texto selecionados.'
  },

  'en-US': {
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.reports': 'Reports',
    'nav.cve': 'CVE-DB',
    'nav.targets': 'Programs',
    'nav.docs': 'Library',
    'nav.platforms': 'Platforms & Bounties',
    'nav.platformsShort': 'Platforms',
    'nav.threatIntel': 'Threat Intel',
    'nav.notifications': 'Notifications',
    'nav.alertsShort': 'Alerts',
    'nav.tools': 'AppSec Tools',
    'nav.appsecShort': 'AppSec',
    'nav.intelShort': 'Intel',
    'nav.more': 'More',
    'nav.homeTitle': 'Home Page & Welcome Guide',
    'nav.dashTitle': 'Go to Dashboard',
    'nav.reportsTitle': 'Vulnerability Reports',
    'nav.cveTitle': 'CVE & Exploits Database',
    'nav.targetsTitle': 'Bug Bounty Programs & Targets',
    'nav.toolsTitle': 'AppSec & DevSecOps Tools Suite (10 Modules)',
    'nav.threatIntelTitle': 'Real-Time Threat Intelligence',
    'nav.notificationsTitle': 'System Notifications',
    'nav.platformsTitle': 'Bug Bounty Platforms & Payouts',
    'nav.docsTitle': 'Security Library, Guides & Methodologies',

    // Header & Actions
    'header.brandTooltip': 'Go to Home Page (Welcome Guide)',
    'header.searchPlaceholder': 'Search target, CVE...',
    'header.addTarget': 'Add Target',
    'header.signPgp': 'Sign PGP',
    'header.cvssCalc': 'CVSS Calc',
    'header.mockActive': 'Mock Active',
    'header.mockEmpty': 'Clean Workspace',
    'header.settings': 'Settings',
    'header.newReport': 'New Report',
    'header.newShort': 'New',
    'header.themeLight': 'Light',
    'header.themeDark': 'Dark',
    'header.bountyBalance': 'Bounty Balance',
    'header.quickActions': 'Quick Actions',
    'header.shortcuts': 'Shortcuts',
    'header.addScope': 'Add Target / Scope',
    'header.signReport': 'Cryptographically Sign PGP',
    'header.cvssCalcTitle': 'CVSS v3.1 Severity Calculator',
    'header.notifHub': 'Notification Center',
    'header.cveBase': 'Vulnerability Database (CVE)',
    'header.docsChecklists': 'Library & Checklists',
    'header.platformsEarnings': 'Bug Bounty Platforms & Payouts',
    'header.threatIntelLive': 'Real-Time Threat Intelligence',
    'header.login': 'Log In',

    // Dashboard KPIs
    'kpi.totalBounties': 'Total Bounties',
    'kpi.estimatedBrl': 'estimated BRL',
    'kpi.activeReports': 'Active Reports',
    'kpi.acceptanceRate': 'Acceptance Rate',
    'kpi.criticalFindings': 'Critical Findings',
    'kpi.avgReward': 'Average Reward',
    'kpi.trend30d': '30D Trend',
    'kpi.unrewarded': 'Unrewarded',
    'kpi.triaged': 'In Triage',
    'kpi.pendingPayout': 'Pending Payout',

    // Dashboard Sections
    'dash.statSummaryTitle': 'Operational Statistical Summary',
    'dash.totalBountiesReceived': 'Total Bounties Received (USD)',
    'dash.rewardSuccessRate': 'Reward Success Rate',
    'dash.avgTimeToTriage': 'Average Time to Triaged (TTT)',
    'dash.criticalPending': 'Pending Critical Vulnerabilities',
    'dash.monitoredTargets': 'Monitored Targets',
    'dash.monthlyBountiesTitle': 'Monthly Bounty Earnings History',
    'dash.monthlyBountiesDesc': 'Distribution and timeline of financial rewards per month based on the reports payment/update date (updatedAt).',
    'dash.monthlyBountiesShort': 'Monthly History ($)',
    'dash.fairTolerance': 'FAIR Tolerance',
    'dash.tttComparative': 'Monthly TTT',
    'dash.tttComparativeTitle': 'Monthly Comparative Time to Triaged (TTT) Panel',
    'dash.tttHistogram': 'TTT Histogram',
    'dash.tttHistogramTitle': 'Time to Triage Distribution & Bottlenecks',
    'dash.appSecToolsTitle': 'AppSec & DevSecOps Tools Suite',
    'dash.toolsIntegrated': '40 INTEGRATED TOOLS',
    'dash.openTools': 'Open AppSec Tools',
    'dash.recentActivity': 'Recent Activity',
    'dash.bountiesOverTime': 'Bounties Over Time',
    'dash.severityDistribution': 'Vulnerability Distribution by Severity',
    'dash.authPromptTitle': 'Read-Only Mode Active',
    'dash.authPromptDesc': 'To submit new reports, modify findings or view secret PoCs, please log in.',

    // Reports View
    'reports.title': 'Vulnerability Reports',
    'reports.subtitle': 'Manage security findings, format for submission, and track triage and payout pipeline',
    'reports.importCsv': 'Import CSV',
    'reports.exportCsv': 'Export CSV',
    'reports.searchPlaceholder': 'Search by title, target, CVE, CWE or tags...',
    'reports.statusAll': 'All Statuses',
    'reports.statusDraft': 'Drafts',
    'reports.statusSubmitted': 'Submitted',
    'reports.statusTriaged': 'Triaged',
    'reports.statusRewarded': 'Rewarded ($)',
    'reports.statusResolved': 'Resolved',
    'reports.statusDuplicate': 'Duplicate',
    'reports.statusOutOfScope': 'Out of Scope',
    'reports.colTitle': 'Vulnerability Title',
    'reports.colTarget': 'Target / Program',
    'reports.colSeverity': 'Severity',
    'reports.colStatus': 'Status',
    'reports.colBounty': 'Bounty',
    'reports.colActions': 'Actions',
    'reports.empty': 'No vulnerability reports found.',

    // Targets View
    'targets.title': 'Bug Bounty Targets & Programs',
    'targets.subtitle': 'Track authorized scopes, testing rules and uncover priority attack surfaces',
    'targets.addTarget': 'Add Program / Target',
    'targets.inScope': 'In-Scope Rules',
    'targets.outScope': 'Out-of-Scope Rules',
    'targets.bountyRange': 'Bounty Range',

    // Welcome / Home Page
    'welcome.badge': 'BugSentinel Platform v2.4.0',
    'welcome.badgeSub': 'AppSec Operations & Bug Bounty Management',
    'welcome.hero.titlePrefix': 'Operations Center for',
    'welcome.hero.titleHighlight': 'Security Researchers & Bug Bounty Hunters',
    'welcome.hero.desc': 'A professional workstation to catalog vulnerabilities, calculate severity with mathematical precision (CVSS v3.1 / v4.0), generate executive AI reports, simulate enterprise risk (FAIR), and sync findings in real time to the cloud or GitHub.',
    'welcome.hero.enterDashboard': 'Access Tool (Dashboard)',
    'welcome.hero.exploreMock': 'Explore with Demo Data',
    'welcome.hero.login': 'Login / Sign Up',
    'welcome.metric.baseStatus': 'Database Status:',
    'welcome.metric.mockActive': 'Demo Mock Active',
    'welcome.metric.mockClean': 'Clean Workspace',
    'welcome.metric.currentReports': 'Current Reports:',
    'welcome.metric.registered': 'registered',
    'welcome.metric.registeredPlural': 'registered',
    'welcome.metric.targets': 'Targets & Programs:',
    'welcome.metric.program': 'program',
    'welcome.metric.programPlural': 'programs',
    'welcome.metric.persistence': 'Cloud Persistence:',
    'welcome.metric.cloudConnected': 'Firebase Connected',
    'welcome.metric.offline': 'Offline / Local',
    'welcome.mode.title': 'How would you like to initialize the platform?',
    'welcome.mode.desc': 'You can toggle between a full pre-populated demo or a 100% clean workspace at any time:',
    'welcome.card.mockBadge': 'Recommended for First Visit',
    'welcome.card.activeNow': 'Active now',
    'welcome.card.mockTitle': 'Explore with Demo Data',
    'welcome.card.mockDesc': 'Start with realistic pre-configured reports (BOLA/IDOR in financial APIs, XSS, CSRF), bug bounty programs, populated reward graphs, and audit timelines.',
    'welcome.card.mockBullet1': 'View all progress charts, 5x5 risk matrices, and FAIR simulations in action.',
    'welcome.card.mockBullet2': 'Test executive PDF export, CVSS v3.1/v4.0 calculator, and PGP cryptographic signing.',
    'welcome.card.mockBullet3': 'Reset or reload the test workspace whenever you want with a single click.',
    'welcome.card.mockBtn': 'Load Demo & Enter Tool',
    'welcome.card.cleanBadge': 'Clean Workspace / Production',
    'welcome.card.cleanTitle': 'Start with 100% Clean Workspace',
    'welcome.card.cleanDesc': 'Removes mock data and leaves the workspace completely clean, ready for your own private corporate programs and real confidential vulnerabilities.',
    'welcome.card.cleanBullet1': 'Database with 0 reports and 0 targets, ready for personal or team use.',
    'welcome.card.cleanBullet2': 'Total privacy: your findings are synchronized securely under your user account.',
    'welcome.card.cleanBullet3': 'Ability to restore demo mocks at any time from settings.',
    'welcome.card.cleanBtn': 'Clear Mock & Enter Clean Workspace',
    'welcome.modules.title': 'Integrated Modules & Capabilities',
    'welcome.modules.desc': 'Discover tools available on the platform and navigate directly to each:',
    'welcome.modules.dashTitle': 'Operations Dashboard',
    'welcome.modules.dashDesc': 'Acceptance metrics, reward timeline progression (Recharts), 5x5 risk matrix, and audit timeline.',
    'welcome.modules.dashBtn': 'Open Dashboard',
    'welcome.modules.reportsTitle': 'Vulnerability Reports',
    'welcome.modules.reportsDesc': 'AI-assisted generation, structured reproduction steps, executive PDF export, PGP digital signing, and CSV import.',
    'welcome.modules.reportsBtn': 'View Reports',
    'welcome.modules.toolsTitle': 'AppSec Suite (37 Tools)',
    'welcome.modules.toolsDesc': 'BOLA/IDOR Matrix, Payload Obfuscator (XOR/B64), HTTP Smuggling (CL.TE), Token DLP Sanitizer, ReDoS Analyzer, and more.',
    'welcome.modules.toolsBtn': 'Explore Tools',
    'welcome.modules.intelTitle': 'Global Threat Intelligence',
    'welcome.modules.intelDesc': 'Real-time feed with official advisories from CISA, NVD, and OWASP, plus global 0-day threat alerts.',
    'welcome.modules.intelBtn': 'Access Threat Intel',
    'welcome.modules.cveTitle': 'CVE Explorer & CVSS Calculator',
    'welcome.modules.cveDesc': 'Base, temporal, and environmental score calculation following official FIRST.org spec, with local and NVD search.',
    'welcome.modules.cveBtn': 'Open CVE & CVSS',
    'welcome.modules.targetsTitle': 'Targets, Scopes & 14 Platforms',
    'welcome.modules.targetsDesc': 'Strict scope enforcement (in-scope / out-of-scope), domain history, and 14 platform directory with rules and payout tiers.',
    'welcome.modules.targetsBtn': 'Manage Targets',
    'welcome.arch.tag': 'Secure Hybrid Architecture',
    'welcome.arch.title': 'Firebase Cloud Persistence + Local Auto-Healing',
    'welcome.arch.desc': 'Your data is secured by strict Attribute-Based Access Control rules in Firestore. Work offline without losing data, or sync across devices by connecting your account.',
    'welcome.arch.btn': 'Go to Dashboard',

    // General / Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.severity': 'Severity',
    'common.apply': 'Apply',
    'common.reset': 'Reset',
    'common.all': 'All',
    'lang.label': 'Language',
    'lang.changed': 'Language switched to English (US)',
    'icon.label': 'Icon URL Path',
    'icon.updated': 'Icon URL path updated successfully!',

    // i18n System Keys
    'i18n.title': 'Internationalization & Global Translation (i18n)',
    'i18n.description': 'Toggle the application global locale to synchronously rebuild the full UI and reload the corresponding text resource bundle for the selected locale.',
    'i18n.toggleLabel': 'Global i18n Language Toggle',
    'i18n.toggleDesc': 'Select your desired locale below to trigger a forced re-render across all UI components with the selected locale text resources.',
    'i18n.forceBtn': 'Force UI Re-render',
    'i18n.engineActive': 'I18N ENGINE ACTIVE',
    'i18n.masterToggle': 'Enable Global i18n Translation',
    'i18n.masterToggleDesc': 'Keeps the real-time internationalization engine active to synchronize strings and DOM text nodes.',
    'i18n.previewTitle': 'Real-Time Text Resource Verification',
    'i18n.previewDesc': 'Live sample of UI strings dynamically rendered with the selected locale:',
    'i18n.activeLocale': 'Active Locale',
    'i18n.coverageTitle': 'Application Modules with Active Translation',
    'i18n.rerenderSuccess': 'All UI components re-rendered successfully with the selected locale resources.'
  },

  'es-ES': {
    // Navigation
    'nav.home': 'Inicio',
    'nav.dashboard': 'Panel',
    'nav.reports': 'Reportes',
    'nav.cve': 'CVE-DB',
    'nav.targets': 'Programas',
    'nav.docs': 'Biblioteca',
    'nav.platforms': 'Sitios y Pagos',
    'nav.platformsShort': 'Sitios',
    'nav.threatIntel': 'Threat Intel',
    'nav.notifications': 'Notificaciones',
    'nav.alertsShort': 'Alertas',
    'nav.tools': 'Herramientas AppSec',
    'nav.appsecShort': 'AppSec',
    'nav.intelShort': 'Intel',
    'nav.more': 'Más',
    'nav.homeTitle': 'Página de Inicio y Guía de Bienvenida',
    'nav.dashTitle': 'Ir al Panel',
    'nav.reportsTitle': 'Reportes de Vulnerabilidad',
    'nav.cveTitle': 'Base de Datos de CVEs y Exploits',
    'nav.targetsTitle': 'Programas y Objetivos de Bug Bounty',
    'nav.toolsTitle': 'Suite de Herramientas AppSec y DevSecOps (10 Módulos)',
    'nav.threatIntelTitle': 'Threat Intelligence en Tiempo Real',
    'nav.notificationsTitle': 'Notificaciones del Sistema',
    'nav.platformsTitle': 'Plataformas de Bug Bounty y Pagos',
    'nav.docsTitle': 'Biblioteca de Seguridad, Guías y Metodologías',

    // Header & Actions
    'header.brandTooltip': 'Ir a la Página de Inicio (Guía de Bienvenida)',
    'header.searchPlaceholder': 'Buscar objetivo, CVE...',
    'header.addTarget': 'Nuevo Objetivo',
    'header.signPgp': 'Firmar PGP',
    'header.cvssCalc': 'Calc CVSS',
    'header.mockActive': 'Mock Activo',
    'header.mockEmpty': 'Entorno Limpio',
    'header.settings': 'Ajustes',
    'header.newReport': 'Nuevo Reporte',
    'header.newShort': 'Nuevo',
    'header.themeLight': 'Claro',
    'header.themeDark': 'Oscuro',
    'header.bountyBalance': 'Balance de Bounties',
    'header.quickActions': 'Acciones Rápidas',
    'header.shortcuts': 'Atajos',
    'header.addScope': 'Agregar Objetivo / Alcance',
    'header.signReport': 'Firmar Reporte con PGP',
    'header.cvssCalcTitle': 'Calculadora de Gravedad CVSS v3.1',
    'header.notifHub': 'Centro de Notificaciones',
    'header.cveBase': 'Base de Vulnerabilidades (CVE)',
    'header.docsChecklists': 'Biblioteca & Listas de Verificación',
    'header.platformsEarnings': 'Plataformas de Bug Bounty & Ganancias',
    'header.threatIntelLive': 'Threat Intelligence en Tiempo Real',
    'header.login': 'Iniciar Sesión',

    // Dashboard KPIs
    'kpi.totalBounties': 'Total en Bounties',
    'kpi.estimatedBrl': 'estimado',
    'kpi.activeReports': 'Reportes Activos',
    'kpi.acceptanceRate': 'Tasa de Aceptación',
    'kpi.criticalFindings': 'Hallazgos Críticos',
    'kpi.avgReward': 'Recompensa Promedio',
    'kpi.trend30d': 'Tendencia 30D',
    'kpi.unrewarded': 'Sin Recompensa',
    'kpi.triaged': 'En Triaje',
    'kpi.pendingPayout': 'Pago Pendiente',

    // Dashboard Sections
    'dash.statSummaryTitle': 'Resumen Estadístico Operativo',
    'dash.totalBountiesReceived': 'Total de Bounties Recibidos (USD)',
    'dash.rewardSuccessRate': 'Tasa de Éxito de Recompensas',
    'dash.avgTimeToTriage': 'Tiempo Medio de Triaje (TTT)',
    'dash.criticalPending': 'Vulnerabilidades Críticas Pendientes',
    'dash.monitoredTargets': 'Objetivos Monitoreados',
    'dash.monthlyBountiesTitle': 'Historial Mensual de Recompensas Ganadas',
    'dash.monthlyBountiesDesc': 'Distribución y evolución de recompensas financieras por mes basadas en la fecha de actualización (updatedAt) de los reportes.',
    'dash.monthlyBountiesShort': 'Historial Mensual ($)',
    'dash.fairTolerance': 'Tolerancia FAIR',
    'dash.tttComparative': 'TTT Mensual',
    'dash.tttComparativeTitle': 'Panel Comparativo de Tiempo de Triaje (TTT)',
    'dash.tttHistogram': 'Histograma TTT',
    'dash.tttHistogramTitle': 'Distribución del Tiempo de Triaje y Cuellos de Botella',
    'dash.appSecToolsTitle': 'Suite de Herramientas AppSec & DevSecOps',
    'dash.toolsIntegrated': '40 HERRAMIENTAS INTEGRADAS',
    'dash.openTools': 'Abrir Herramientas AppSec',
    'dash.recentActivity': 'Actividad Reciente',
    'dash.bountiesOverTime': 'Bounties a lo Largo del Tiempo',
    'dash.severityDistribution': 'Distribución de Vulnerabilidades por Severidad',
    'dash.authPromptTitle': 'Modo de Sólo Lectura Activo',
    'dash.authPromptDesc': 'Para registrar reportes, editar hallazgos o ver PoCs, inicie sesión.',

    // Reports View
    'reports.title': 'Reportes de Vulnerabilidad',
    'reports.subtitle': 'Administre hallazgos, formatee para envío y supervise el flujo de triaje y pago',
    'reports.importCsv': 'Importar CSV',
    'reports.exportCsv': 'Exportar CSV',
    'reports.searchPlaceholder': 'Buscar por título, objetivo, CVE, CWE o etiquetas...',
    'reports.statusAll': 'Todos los Estados',
    'reports.statusDraft': 'Borradores',
    'reports.statusSubmitted': 'Enviados',
    'reports.statusTriaged': 'En Triaje',
    'reports.statusRewarded': 'Recompensados ($)',
    'reports.statusResolved': 'Resueltos',
    'reports.statusDuplicate': 'Duplicados',
    'reports.statusOutOfScope': 'Fuera de Alcance',
    'reports.colTitle': 'Título de la Vulnerabilidad',
    'reports.colTarget': 'Objetivo / Programa',
    'reports.colSeverity': 'Severidad',
    'reports.colStatus': 'Estado',
    'reports.colBounty': 'Recompensa',
    'reports.colActions': 'Acciones',
    'reports.empty': 'No se encontraron reportes.',

    // Targets View
    'targets.title': 'Objetivos & Programas de Bug Bounty',
    'targets.subtitle': 'Supervise alcances autorizados, reglas y descubra superficies de ataque prioritarias',
    'targets.addTarget': 'Agregar Programa / Objetivo',
    'targets.inScope': 'Dentro del Alcance (In-Scope)',
    'targets.outScope': 'Fuera del Alcance (Out-of-Scope)',
    'targets.bountyRange': 'Rango de Bounties',

    // Welcome / Home Page
    'welcome.badge': 'BugSentinel Platform v2.4.0',
    'welcome.badgeSub': 'AppSec Operations & Bug Bounty Management',
    'welcome.hero.titlePrefix': 'Centro de Operaciones para',
    'welcome.hero.titleHighlight': 'Security Researchers & Bug Bounty Hunters',
    'welcome.hero.desc': 'Una estación de trabajo profesional para catalogar vulnerabilidades, calcular gravedades con precisión matemática (CVSS v3.1 / v4.0), generar reportes ejecutivos con IA, simular riesgos corporativos (FAIR) y sincronizar hallazgos en la nube o en GitHub.',
    'welcome.hero.enterDashboard': 'Acceder a la Herramienta (Dashboard)',
    'welcome.hero.exploreMock': 'Explorar con Datos Demostrativos',
    'welcome.hero.login': 'Iniciar Sesión / Crear Cuenta',
    'welcome.metric.baseStatus': 'Estado de la Base:',
    'welcome.metric.mockActive': 'Mock Demostrativo',
    'welcome.metric.mockClean': 'Entorno Limpio',
    'welcome.metric.currentReports': 'Reportes Actuales:',
    'welcome.metric.registered': 'registrado',
    'welcome.metric.registeredPlural': 'registrados',
    'welcome.metric.targets': 'Objetivos & Programas:',
    'welcome.metric.program': 'programa',
    'welcome.metric.programPlural': 'programas',
    'welcome.metric.persistence': 'Persistencia en la Nube:',
    'welcome.metric.cloudConnected': 'Firebase Conectado',
    'welcome.metric.offline': 'Offline / Local',
    'welcome.mode.title': '¿Cómo deseas inicializar la plataforma?',
    'welcome.mode.desc': 'Puedes alternar entre una demostración completa precargada o un espacio de trabajo 100% limpio en cualquier momento:',
    'welcome.card.mockBadge': 'Recomendado para Primera Visita',
    'welcome.card.activeNow': 'Activo ahora',
    'welcome.card.mockTitle': 'Explorar con Datos Demostrativos',
    'welcome.card.mockDesc': 'Inicia con reportes realistas ya cargados (BOLA/IDOR en APIs financieras, XSS, CSRF), programas de bug bounty configurados, gráficos de recompensas y líneas de tiempo.',
    'welcome.card.mockBullet1': 'Visualiza todos los gráficos de evolución, matrices 5x5 y simulaciones FAIR en funcionamiento.',
    'welcome.card.mockBullet2': 'Prueba el exportador de PDF ejecutivo, calculadora CVSS v3.1/v4.0 y firma PGP.',
    'welcome.card.mockBullet3': 'Reinicia o recarga la base de pruebas cuando desees con un clic.',
    'welcome.card.mockBtn': 'Cargar Demostración y Entrar a la Herramienta',
    'welcome.card.cleanBadge': 'Entorno Limpio / Producción',
    'welcome.card.cleanTitle': 'Iniciar con Espacio 100% Limpio',
    'welcome.card.cleanDesc': 'Elimina los datos simulados y deja la aplicación limpia, lista para registrar tus propios programas y vulnerabilidades confidenciales reales.',
    'welcome.card.cleanBullet1': 'Base con 0 reportes y 0 objetivos, lista para uso personal o en equipo.',
    'welcome.card.cleanBullet2': 'Privacidad total: tus hallazgos se sincronizan de forma segura bajo tu cuenta.',
    'welcome.card.cleanBullet3': 'Posibilidad de restaurar los datos de prueba en cualquier momento desde configuración.',
    'welcome.card.cleanBtn': 'Limpiar Mock y Entrar con Base Limpia',
    'welcome.modules.title': 'Módulos y Capacidades Integradas',
    'welcome.modules.desc': 'Conoce las herramientas disponibles en la plataforma y navega directamente a cada una:',
    'welcome.modules.dashTitle': 'Panel Operativo',
    'welcome.modules.dashDesc': 'Métricas de aceptación, evolución de recompensas (Recharts), matriz de riesgo 5x5 y línea de tiempo de auditoría.',
    'welcome.modules.dashBtn': 'Abrir Panel',
    'welcome.modules.reportsTitle': 'Reportes de Vulnerabilidad',
    'welcome.modules.reportsDesc': 'Creación asistida por IA, pasos de reproducción estructurados, exportación en PDF ejecutivo, firma digital PGP e importación CSV.',
    'welcome.modules.reportsBtn': 'Ver Reportes',
    'welcome.modules.toolsTitle': 'Suite AppSec (37 Herramientas)',
    'welcome.modules.toolsDesc': 'BOLA/IDOR Matrix, Ofuscador de Payloads (XOR/B64), HTTP Smuggling (CL.TE), Sanitizador DLP, ReDoS Analyzer y más.',
    'welcome.modules.toolsBtn': 'Explorar Herramientas',
    'welcome.modules.intelTitle': 'Threat Intelligence Global',
    'welcome.modules.intelDesc': 'Feed en tiempo real con avisos oficiales de CISA, NVD y OWASP, además de noticias globales de explotación y amenazas 0-day.',
    'welcome.modules.intelBtn': 'Acceder a Threat Intel',
    'welcome.modules.cveTitle': 'CVE Explorer y Calculadora CVSS',
    'welcome.modules.cveDesc': 'Cálculo de puntaje base, temporal y ambiental según la especificación FIRST.org, con búsqueda local y NVD.',
    'welcome.modules.cveBtn': 'Abrir CVE y CVSS',
    'welcome.modules.targetsTitle': 'Objetivos, Alcances y 14 Plataformas',
    'welcome.modules.targetsDesc': 'Control estricto de alcance (in-scope / out-of-scope), historial por dominio y directorio de 14 plataformas.',
    'welcome.modules.targetsBtn': 'Administrar Objetivos',
    'welcome.arch.tag': 'Arquitectura Híbrida Segura',
    'welcome.arch.title': 'Persistencia en la Nube Firebase + Auto-Sanación Local',
    'welcome.arch.desc': 'Tus datos están protegidos por reglas estrictas de control de acceso en Firestore. Trabaja sin conexión sin perder nada o sincroniza entre dispositivos.',
    'welcome.arch.btn': 'Ir al Panel',

    // General / Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.actions': 'Acciones',
    'common.status': 'Estado',
    'common.severity': 'Severidad',
    'common.apply': 'Aplicar',
    'common.reset': 'Restablecer',
    'common.all': 'Todos',
    'lang.label': 'Idioma',
    'lang.changed': 'Idioma cambiado a Español (ES)',
    'icon.label': 'Ruta URL del Icono (Icon URL Path)',
    'icon.updated': '¡Ruta del icono actualizada con éxito!',

    // i18n System Keys
    'i18n.title': 'Internacionalización y Traducción Global (i18n)',
    'i18n.description': 'Alterne el idioma global de la aplicación para reconstruir sincrónicamente toda la interfaz y recargar los recursos de texto correspondientes al locale seleccionado.',
    'i18n.toggleLabel': 'Alternador Global de Idioma (i18n)',
    'i18n.toggleDesc': 'Seleccione a continuación el locale deseado para forzar la re-renderización de todos los componentes de la interfaz con los recursos correspondientes.',
    'i18n.forceBtn': 'Forzar Re-renderizado de la UI',
    'i18n.engineActive': 'MOTOR I18N ACTIVO',
    'i18n.masterToggle': 'Habilitar Traducción Global i18n',
    'i18n.masterToggleDesc': 'Mantiene activo el motor de internacionalización en tiempo real para sincronizar textos y nodos del DOM.',
    'i18n.previewTitle': 'Verificación de Recursos de Texto en Tiempo Real',
    'i18n.previewDesc': 'Muestra en vivo de textos de la interfaz renderizados dinámicamente con el locale seleccionado:',
    'i18n.activeLocale': 'Locale Activo',
    'i18n.coverageTitle': 'Módulos de la Aplicación con Traducción Activa',
    'i18n.rerenderSuccess': 'Todos los componentes de la interfaz fueron re-renderizados con éxito con los recursos seleccionados.'
  }
};

// Automatic phrase dictionary mapping common English/Portuguese phrases
const PHRASE_DICTIONARY: Record<AppLanguage, Record<string, string>> = {
  'pt-BR': {
    'Total Bounties': 'Total em Bounties',
    'Active Reports': 'Relatórios Ativos',
    'Acceptance Rate': 'Taxa de Aceitação',
    'Critical Findings': 'Achados Críticos',
    'Average Reward': 'Recompensa Média',
    'Dashboard': 'Dashboard',
    'Reports': 'Relatórios',
    'Vulnerability Reports': 'Relatórios de Vulnerabilidade',
    'Programs': 'Programas',
    'Library': 'Biblioteca',
    'Threat Intel': 'Threat Intel',
    'Notifications': 'Notificações',
    'AppSec Tools': 'Ferramentas AppSec',
    'Add Target': 'Novo Alvo',
    'Sign PGP': 'Assinar PGP',
    'CVSS Calc': 'Calc CVSS',
    'Settings': 'Configurações',
    'New Report': 'Novo Relatório',
    'Import CSV': 'Importar CSV',
    'Export CSV': 'Exportar CSV',
    'All Statuses': 'Todos os Status',
    'Drafts': 'Rascunhos',
    'Submitted': 'Enviados',
    'In Triage': 'Em Triagem',
    'Rewarded': 'Recompensados',
    'Resolved': 'Resolvidos',
    'Duplicate': 'Duplicados',
    'Out of Scope': 'Fora de Escopo'
  },
  'en-US': {
    'Total em Bounties': 'Total Bounties',
    'Relatórios Ativos': 'Active Reports',
    'Taxa de Aceitação': 'Acceptance Rate',
    'Achados Críticos': 'Critical Findings',
    'Recompensa Média': 'Average Reward',
    'Dashboard': 'Dashboard',
    'Relatórios': 'Reports',
    'Relatórios de Vulnerabilidade': 'Vulnerability Reports',
    'Programas': 'Programs',
    'Biblioteca': 'Library',
    'Sites & Ganhos': 'Platforms & Bounties',
    'Notificações': 'Notifications',
    'Ferramentas AppSec': 'AppSec Tools',
    'Novo Alvo': 'Add Target',
    'Adicionar Programa / Alvo': 'Add Program / Target',
    'Assinar PGP': 'Sign PGP',
    'Calc CVSS': 'CVSS Calc',
    'Configurações': 'Settings',
    'Novo Relatório': 'New Report',
    'Importar CSV': 'Import CSV',
    'Exportar CSV': 'Export CSV',
    'Todos os Status': 'All Statuses',
    'Rascunhos': 'Drafts',
    'Enviados': 'Submitted',
    'Em Triagem': 'Triaged',
    'Recompensados ($)': 'Rewarded ($)',
    'Recompensados': 'Rewarded',
    'Resolvidos': 'Resolved',
    'Duplicados': 'Duplicate',
    'Fora de Escopo': 'Out of Scope',
    'Dentro do Escopo (In-Scope)': 'In-Scope Rules',
    'Fora do Escopo (Out-of-Scope)': 'Out-of-Scope Rules',
    'Faixa de Bounties': 'Bounty Range',
    'Fazer Login': 'Log In',
    'Claro': 'Light',
    'Escuro': 'Dark'
  },
  'es-ES': {
    'Total em Bounties': 'Total en Bounties',
    'Total Bounties': 'Total en Bounties',
    'Relatórios Ativos': 'Reportes Activos',
    'Active Reports': 'Reportes Activos',
    'Taxa de Aceitação': 'Tasa de Aceptación',
    'Acceptance Rate': 'Tasa de Aceptación',
    'Achados Críticos': 'Hallazgos Críticos',
    'Critical Findings': 'Hallazgos Críticos',
    'Recompensa Média': 'Recompensa Promedio',
    'Average Reward': 'Recompensa Promedio',
    'Dashboard': 'Panel',
    'Relatórios': 'Reportes',
    'Reports': 'Reportes',
    'Relatórios de Vulnerabilidade': 'Reportes de Vulnerabilidad',
    'Vulnerability Reports': 'Reportes de Vulnerabilidad',
    'Programas': 'Programas',
    'Programs': 'Programas',
    'Biblioteca': 'Biblioteca',
    'Library': 'Biblioteca',
    'Sites & Ganhos': 'Sitios y Pagos',
    'Platforms & Bounties': 'Sitios y Pagos',
    'Notificações': 'Notificaciones',
    'Notifications': 'Notificaciones',
    'Ferramentas AppSec': 'Herramientas AppSec',
    'AppSec Tools': 'Herramientas AppSec',
    'Novo Alvo': 'Nuevo Objetivo',
    'Add Target': 'Nuevo Objetivo',
    'Adicionar Programa / Alvo': 'Agregar Programa / Objetivo',
    'Assinar PGP': 'Firmar PGP',
    'Sign PGP': 'Firmar PGP',
    'Calc CVSS': 'Calc CVSS',
    'CVSS Calc': 'Calc CVSS',
    'Configurações': 'Ajustes',
    'Settings': 'Ajustes',
    'Novo Relatório': 'Nuevo Reporte',
    'New Report': 'Nuevo Reporte',
    'Importar CSV': 'Importar CSV',
    'Import CSV': 'Importar CSV',
    'Exportar CSV': 'Exportar CSV',
    'Export CSV': 'Exportar CSV',
    'Todos os Status': 'Todos los Estados',
    'All Statuses': 'Todos los Estados',
    'Rascunhos': 'Borradores',
    'Drafts': 'Borradores',
    'Enviados': 'Enviados',
    'Submitted': 'Enviados',
    'Em Triagem': 'En Triaje',
    'Triaged': 'En Triaje',
    'Recompensados ($)': 'Recompensados ($)',
    'Recompensados': 'Recompensados',
    'Rewarded': 'Recompensados',
    'Resolvidos': 'Resueltos',
    'Resolved': 'Resueltos',
    'Duplicados': 'Duplicados',
    'Duplicate': 'Duplicados',
    'Fora de Escopo': 'Fuera de Alcance',
    'Out of Scope': 'Fuera de Alcance',
    'Dentro do Escopo (In-Scope)': 'Dentro del Alcance',
    'Fora do Escopo (Out-of-Scope)': 'Fuera del Alcance',
    'Faixa de Bounties': 'Rango de Bounties',
    'Fazer Login': 'Iniciar Sesión',
    'Log In': 'Iniciar Sesión',
    'Claro': 'Claro',
    'Escuro': 'Oscuro'
  }
};

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  cycleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  appIconUrl: string;
  setAppIconUrl: (url: string) => void;
  rerenderVersion: number;
  forceRerender: (targetLocale?: AppLanguage) => void;
  isI18nEnabled: boolean;
  setIsI18nEnabled: (enabled: boolean) => void;
  toggleI18n: (targetLocale?: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rerenderVersion, setRerenderVersion] = useState<number>(0);
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage;
      if (saved === 'pt-BR' || saved === 'en-US' || saved === 'es-ES') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'pt-BR';
  });

  const [isI18nEnabled, setIsI18nEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(I18N_ENABLED_STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [appIconUrl, setAppIconUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem(APP_ICON_URL_STORAGE_KEY) || DEFAULT_APP_ICON_URL;
    } catch {
      return DEFAULT_APP_ICON_URL;
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Universal real-time DOM text translator for the whole app
  useEffect(() => {
    if (!isI18nEnabled) return;
    const cleanup = enableUniversalDomTranslation(language);
    return cleanup;
  }, [language, isI18nEnabled]);

  useEffect(() => {
    const cleanIconUrl = appIconUrl.trim() || DEFAULT_APP_ICON_URL;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = cleanIconUrl;
  }, [appIconUrl]);

  const setIsI18nEnabled = (enabled: boolean) => {
    setIsI18nEnabledState(enabled);
    try {
      localStorage.setItem(I18N_ENABLED_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
    setRerenderVersion(v => v + 1);
    if (enabled) {
      enableUniversalDomTranslation(language);
      toast.success(
        language === 'pt-BR'
          ? 'Tradução global i18n ativada!'
          : language === 'en-US'
          ? 'Global i18n translation enabled!'
          : '¡Traducción global i18n activada!',
        { icon: '🌐' }
      );
    } else {
      toast(
        language === 'pt-BR'
          ? 'Tradução global i18n pausada.'
          : language === 'en-US'
          ? 'Global i18n translation paused.'
          : 'Traducción global i18n pausada.',
        { icon: '⏸️' }
      );
    }
  };

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    setRerenderVersion(v => v + 1);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-language', lang);
    const message = TRANSLATIONS[lang]?.['lang.changed'] || `Language changed to ${lang}`;
    toast.success(message, { 
      duration: 3000,
      icon: lang === 'en-US' ? '🇺🇸' : lang === 'es-ES' ? '🇪🇸' : '🇧🇷'
    });
  }, []);

  const forceRerender = useCallback((targetLocale?: AppLanguage) => {
    const nextLang = targetLocale && (targetLocale === 'pt-BR' || targetLocale === 'en-US' || targetLocale === 'es-ES')
      ? targetLocale
      : language;

    setLanguageState(nextLang);
    setRerenderVersion(v => v + 1);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // ignore
    }

    document.documentElement.lang = nextLang;
    document.documentElement.setAttribute('data-language', nextLang);
    if (isI18nEnabled) {
      enableUniversalDomTranslation(nextLang);
    }

    const msg = nextLang === 'pt-BR'
      ? `Interface atualizada com os recursos de texto em Português!`
      : nextLang === 'en-US'
      ? `Interface updated with English text resources!`
      : `¡Interfaz actualizada con los recursos de texto en Español!`;

    toast.success(msg, {
      duration: 3000,
      icon: nextLang === 'en-US' ? '🇺🇸' : nextLang === 'es-ES' ? '🇪🇸' : '🇧🇷'
    });
  }, [language, isI18nEnabled]);

  const toggleI18n = useCallback((targetLocale?: AppLanguage) => {
    if (targetLocale) {
      forceRerender(targetLocale);
    } else {
      const order: AppLanguage[] = ['pt-BR', 'en-US', 'es-ES'];
      const nextIndex = (order.indexOf(language) + 1) % order.length;
      forceRerender(order[nextIndex]);
    }
  }, [forceRerender, language]);

  const cycleLanguage = useCallback(() => {
    const order: AppLanguage[] = ['pt-BR', 'en-US', 'es-ES'];
    const nextIndex = (order.indexOf(language) + 1) % order.length;
    setLanguage(order[nextIndex]);
  }, [language, setLanguage]);

  const setAppIconUrl = useCallback((url: string) => {
    const clean = url.trim() || DEFAULT_APP_ICON_URL;
    setAppIconUrlState(clean);
    try {
      localStorage.setItem(APP_ICON_URL_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    if (!key) return '';
    const trimmed = key.trim();
    // 1. Direct key match in active language
    if (TRANSLATIONS[language]?.[trimmed]) {
      return TRANSLATIONS[language][trimmed];
    }
    if (TRANSLATIONS[language]?.[key]) {
      return TRANSLATIONS[language][key];
    }
    // 2. Exact phrase dictionary match
    if (PHRASE_DICTIONARY[language]?.[trimmed]) {
      return PHRASE_DICTIONARY[language][trimmed];
    }
    // 3. Universal translation match
    const translatedKey = translateString(trimmed, language);
    if (translatedKey && translatedKey !== trimmed) {
      return translatedKey;
    }
    // 4. Try translating fallback if provided
    if (fallback !== undefined) {
      const trimmedFallback = fallback.trim();
      if (language === 'pt-BR') {
        return fallback;
      }
      if (PHRASE_DICTIONARY[language]?.[trimmedFallback]) {
        return PHRASE_DICTIONARY[language][trimmedFallback];
      }
      const translatedFallback = translateString(trimmedFallback, language);
      if (translatedFallback && translatedFallback !== trimmedFallback) {
        return fallback.replace(trimmedFallback, translatedFallback);
      }
      return fallback;
    }
    // 5. Fallback to pt-BR if available
    if (TRANSLATIONS['pt-BR']?.[trimmed]) {
      const ptVal = TRANSLATIONS['pt-BR'][trimmed];
      if (language !== 'pt-BR') {
        const transPt = translateString(ptVal, language);
        if (transPt && transPt !== ptVal) return transPt;
      }
      return ptVal;
    }
    return key;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    cycleLanguage,
    t,
    appIconUrl,
    setAppIconUrl,
    rerenderVersion,
    forceRerender,
    isI18nEnabled,
    setIsI18nEnabled,
    toggleI18n
  }), [
    language,
    setLanguage,
    cycleLanguage,
    t,
    appIconUrl,
    setAppIconUrl,
    rerenderVersion,
    forceRerender,
    isI18nEnabled
  ]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
