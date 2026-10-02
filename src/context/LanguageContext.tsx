import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

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
export const DEFAULT_APP_ICON_URL = '/icon.svg';

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  'pt-BR': {
    // Navigation
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

    // Header & Actions
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
    'icon.updated': 'URL do ícone atualizada com sucesso!'
  },

  'en-US': {
    // Navigation
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

    // Header & Actions
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
    'icon.updated': 'Icon URL path updated successfully!'
  },

  'es-ES': {
    // Navigation
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

    // Header & Actions
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
    'icon.updated': '¡Ruta del icono actualizada con éxito!'
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

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  cycleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  appIconUrl: string;
  setAppIconUrl: (url: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    const message = TRANSLATIONS[lang]['lang.changed'] || `Language changed to ${lang}`;
    toast.success(message, { 
      duration: 3000,
      icon: lang === 'en-US' ? '🇺🇸' : lang === 'es-ES' ? '🇪🇸' : '🇧🇷'
    });
  };

  const cycleLanguage = () => {
    const order: AppLanguage[] = ['pt-BR', 'en-US', 'es-ES'];
    const nextIndex = (order.indexOf(language) + 1) % order.length;
    setLanguage(order[nextIndex]);
  };

  const setAppIconUrl = (url: string) => {
    const clean = url.trim() || DEFAULT_APP_ICON_URL;
    setAppIconUrlState(clean);
    try {
      localStorage.setItem(APP_ICON_URL_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    if (!key) return '';
    // 1. Direct key match (e.g. 'nav.dashboard')
    if (TRANSLATIONS[language]?.[key]) {
      return TRANSLATIONS[language][key];
    }
    // 2. Phrase dictionary match (e.g. 'Total Bounties' -> 'Total em Bounties')
    const trimmed = key.trim();
    if (PHRASE_DICTIONARY[language]?.[trimmed]) {
      return PHRASE_DICTIONARY[language][trimmed];
    }
    // 3. Fallback to pt-BR if available
    if (TRANSLATIONS['pt-BR']?.[key]) {
      return TRANSLATIONS['pt-BR'][key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        cycleLanguage,
        t,
        appIconUrl,
        setAppIconUrl
      }}
    >
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
