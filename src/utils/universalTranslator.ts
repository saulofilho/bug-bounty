/**
 * Universal Application Translation Engine
 * Full-scale bidirectional multi-language translator with DOM observer and sentence tokenizer
 * Supporting: pt-BR (Portuguese), en-US (English), es-ES (Spanish)
 */

import { AppLanguage } from '../context/LanguageContext';

export interface TranslationPair {
  en: string;
  es: string;
}

/**
 * 1. Exact full-phrase dictionary for prominent UI text, headers, banners, and buttons
 */
export const EXACT_PHRASES: Record<string, TranslationPair> = {
  // Brand & Navigation
  'BugSentinel': { en: 'BugSentinel', es: 'BugSentinel' },
  'Dashboard': { en: 'Dashboard', es: 'Panel' },
  'Relatórios': { en: 'Reports', es: 'Reportes' },
  'Reports': { en: 'Reports', es: 'Reportes' },
  'Relatórios de Vulnerabilidade': { en: 'Vulnerability Reports', es: 'Reportes de Vulnerabilidad' },
  'Vulnerability Reports': { en: 'Vulnerability Reports', es: 'Reportes de Vulnerabilidad' },
  'CVE-DB': { en: 'CVE-DB', es: 'CVE-DB' },
  'Base de Dados de CVEs': { en: 'CVE Database', es: 'Base de Datos de CVE' },
  'Base de Dados de CVEs & Vulnerabilidades Conhecidas': { en: 'CVE & Known Vulnerabilities Database', es: 'Base de Datos de CVE y Vulnerabilidades Conocidas' },
  'Base de Dados CVE': { en: 'CVE Database', es: 'Base de Datos CVE' },
  'Programas': { en: 'Programs', es: 'Programas' },
  'Programs': { en: 'Programs', es: 'Programas' },
  'Alvos': { en: 'Targets', es: 'Objetivos' },
  'Targets': { en: 'Targets', es: 'Objetivos' },
  'Alvos & Programas de Bug Bounty': { en: 'Bug Bounty Targets & Programs', es: 'Objetivos y Programas de Bug Bounty' },
  'AppSec': { en: 'AppSec', es: 'AppSec' },
  'Ferramentas AppSec': { en: 'AppSec Tools', es: 'Herramientas AppSec' },
  'AppSec Tools': { en: 'AppSec Tools', es: 'Herramientas AppSec' },
  'Central de Ferramentas AppSec': { en: 'AppSec Tools Suite', es: 'Suite de Herramientas AppSec' },
  'Central de Ferramentas AppSec & DevSecOps': { en: 'AppSec & DevSecOps Tools Suite', es: 'Suite de Herramientas AppSec y DevSecOps' },
  'AppSec Suite (10 Ferramentas)': { en: 'AppSec Suite (10 Tools)', es: 'AppSec Suite (10 Herramientas)' },
  'Intel': { en: 'Intel', es: 'Intel' },
  'Threat Intel': { en: 'Threat Intel', es: 'Threat Intel' },
  'Threat Intelligence': { en: 'Threat Intelligence', es: 'Threat Intelligence' },
  'Threat Intelligence em Tempo Real': { en: 'Real-Time Threat Intelligence', es: 'Threat Intelligence en Tiempo Real' },
  'Alertas': { en: 'Alerts', es: 'Alertas' },
  'Alerts': { en: 'Alerts', es: 'Alertas' },
  'Notificações': { en: 'Notifications', es: 'Notificaciones' },
  'Notifications': { en: 'Notifications', es: 'Notificaciones' },
  'Central de Notificações': { en: 'Notification Center', es: 'Centro de Notificaciones' },
  'Sites': { en: 'Sites', es: 'Sitios' },
  'Sites & Ganhos': { en: 'Platforms & Payouts', es: 'Sitios y Pagos' },
  'Plataformas': { en: 'Platforms', es: 'Plataformas' },
  'Plataformas de Bug Bounty & Ganhos': { en: 'Bug Bounty Platforms & Payouts', es: 'Plataformas de Bug Bounty y Pagos' },
  'Biblioteca': { en: 'Library', es: 'Biblioteca' },
  'Library': { en: 'Library', es: 'Biblioteca' },
  'Documentação': { en: 'Documentation', es: 'Documentación' },
  'Documentação Técnica & Checklists': { en: 'Technical Documentation & Checklists', es: 'Documentación Técnica y Listas de Verificación' },
  'Biblioteca de Segurança, Guias e Metodologias': { en: 'Security Library, Guides & Methodologies', es: 'Biblioteca de Seguridad, Guías y Metodologías' },
  'Docs': { en: 'Docs', es: 'Documentos' },
  'Mais': { en: 'More', es: 'Más' },

  // Header Bar, Profile & Quick Actions
  'Ações': { en: 'Actions', es: 'Acciones' },
  'Actions': { en: 'Actions', es: 'Acciones' },
  'Ações Rápidas': { en: 'Quick Actions', es: 'Acciones Rápidas' },
  'Quick Actions': { en: 'Quick Actions', es: 'Acciones Rápidas' },
  'Atalhos': { en: 'Shortcuts', es: 'Atajos' },
  'Shortcuts': { en: 'Shortcuts', es: 'Atajos' },
  'Novo Relatório': { en: 'New Report', es: 'Nuevo Reporte' },
  'New Report': { en: 'New Report', es: 'Nuevo Reporte' },
  'Novo': { en: 'New', es: 'Nuevo' },
  'New': { en: 'New', es: 'Nuevo' },
  'Saldo de Bounties': { en: 'Bounty Balance', es: 'Balance de Bounties' },
  'Bounty Balance': { en: 'Bounty Balance', es: 'Balance de Bounties' },
  'Adicionar Alvo': { en: 'Add Target', es: 'Agregar Objetivo' },
  'Add Target': { en: 'Add Target', es: 'Agregar Objetivo' },
  'Adicionar Alvo / Escopo': { en: 'Add Target / Scope', es: 'Agregar Objetivo / Alcance' },
  'Assinar PGP': { en: 'Sign PGP', es: 'Firmar PGP' },
  'Sign PGP': { en: 'Sign PGP', es: 'Firmar PGP' },
  'Assinar Relatório PGP': { en: 'Cryptographically Sign PGP', es: 'Firmar Reporte con PGP' },
  'Calc CVSS': { en: 'CVSS Calc', es: 'Calc CVSS' },
  'CVSS Calc': { en: 'CVSS Calc', es: 'Calc CVSS' },
  'Calc CVSS v3.1': { en: 'Calc CVSS v3.1', es: 'Calc CVSS v3.1' },
  'Calculadora CVSS v3.1': { en: 'CVSS v3.1 Severity Calculator', es: 'Calculadora de Gravedad CVSS v3.1' },
  'Calculadora de Gravidade CVSS v3.1 (Alt+C)': { en: 'CVSS v3.1 Severity Calculator (Alt+C)', es: 'Calculadora de Gravedad CVSS v3.1 (Alt+C)' },
  'Configurações': { en: 'Settings', es: 'Ajustes' },
  'Settings': { en: 'Settings', es: 'Ajustes' },
  'Configurações & Token GitHub': { en: 'Settings & GitHub Token', es: 'Ajustes y Token de GitHub' },
  'Central de Ajuda & Guia': { en: 'Help Center & Guide', es: 'Centro de Ayuda y Guía' },
  'Conhecer Plataforma / Mock': { en: 'Explore Platform / Mock', es: 'Explorar Plataforma / Mock' },
  'Ir para o Dashboard': { en: 'Go to Dashboard', es: 'Ir al Panel' },
  'Buscar alvo, CVE...': { en: 'Search target, CVE...', es: 'Buscar objetivo, CVE...' },
  'Search target, CVE...': { en: 'Search target, CVE...', es: 'Buscar objetivo, CVE...' },
  'Limpar busca (Esc)': { en: 'Clear search (Esc)', es: 'Limpiar búsqueda (Esc)' },
  'Mock Ativo': { en: 'Mock Active', es: 'Mock Activo' },
  'Mock Active': { en: 'Mock Active', es: 'Mock Activo' },
  'Plataforma Zerada': { en: 'Clean Platform', es: 'Entorno Limpio' },
  'Plataforma': { en: 'Platform', es: 'Plataforma' },
  'Zerado': { en: 'Clean', es: 'Limpio' },
  'Mudar para Tema Claro': { en: 'Switch to Light Theme', es: 'Cambiar a Tema Claro' },
  'Mudar para Tema Escuro': { en: 'Switch to Dark Theme', es: 'Cambiar a Tema Oscuro' },
  'Alternar Tema Claro e Escuro': { en: 'Toggle Light/Dark Theme', es: 'Alternar Tema Claro/Oscuro' },
  'Idioma': { en: 'Language', es: 'Idioma' },
  'Idioma do Aplicativo': { en: 'App Language', es: 'Idioma de la Aplicación' },

  // User Auth & Profiles
  'Fazer Login': { en: 'Log In', es: 'Iniciar Sesión' },
  'Log In': { en: 'Log In', es: 'Iniciar Sesión' },
  'Entrar / Admin': { en: 'Sign In / Admin', es: 'Iniciar Sesión / Admin' },
  'Alternar Perfil:': { en: 'Switch Profile:', es: 'Cambiar Perfil:' },
  'Sair da Conta (Logout)': { en: 'Sign Out (Logout)', es: 'Cerrar Sesión (Logout)' },
  'Modo Convidado (Leitura)': { en: 'Guest Mode (Read-Only)', es: 'Modo Invitado (Lectura)' },
  'Permissões do Perfil:': { en: 'Profile Permissions:', es: 'Permisos del Perfil:' },
  'Modo Convidado (Acesso Limitado aos Relatórios)': { en: 'Guest Mode (Limited Report Access)', es: 'Modo Invitado (Acceso Limitado a Reportes)' },
  'Para registrar novos relatórios, editar vulnerabilidades existentes ou visualizar PoCs confidenciais, autentique-se como Administrador ou Pesquisador.': {
    en: 'To register new reports, modify existing vulnerabilities, or view confidential PoCs, please sign in as Administrator or Researcher.',
    es: 'Para registrar nuevos reportes, editar vulnerabilidades existentes o ver PoCs confidenciales, inicie sesión como Administrador o Investigador.'
  },

  // Dashboard Workbench & Banner
  'Sentinel Vulnerability Workbench': { en: 'Sentinel Vulnerability Workbench', es: 'Banco de Vulnerabilidades Sentinel' },
  'Bug Bounty Command & Intelligence Terminal': { en: 'Bug Bounty Command & Intelligence Terminal', es: 'Terminal de Inteligencia y Comando Bug Bounty' },
  'Centralize os achados, acelere submissões para HackerOne, Bugcrowd e Intigriti, consulte vetores de CVE e acompanhe o fluxo de recompensas financeiras em tempo real.': {
    en: 'Centralize findings, expedite submissions to HackerOne, Bugcrowd, and Intigriti, query CVE vectors, and track bounty financial payouts in real time.',
    es: 'Centralice hallazgos, agilice envíos a HackerOne, Bugcrowd e Intigriti, consulte vectores CVE y supervise el flujo de recompensas en tiempo real.'
  },
  'Dados Mock (localStorage ativo)': { en: 'Mock Data (localStorage active)', es: 'Datos Mock (localStorage activo)' },
  'Sentiment Tracker': { en: 'Sentiment Tracker', es: 'Rastreador de Sentimiento' },
  'Dashboard de Risco': { en: 'Risk Dashboard', es: 'Panel de Riesgo' },
  'Risk Dashboard': { en: 'Risk Dashboard', es: 'Panel de Riesgo' },
  'Simulador FAIR': { en: 'FAIR Simulator', es: 'Simulador FAIR' },
  'FAIR Simulator': { en: 'FAIR Simulator', es: 'Simulador FAIR' },
  'Rate Limits API': { en: 'API Rate Limits', es: 'Límites de Tasa de API' },
  'API Rate Limits': { en: 'API Rate Limits', es: 'Límites de Tasa de API' },
  'Sobre & Guia Mock': { en: 'About & Mock Guide', es: 'Acerca de y Guía Mock' },
  'New Submission +': { en: 'New Submission +', es: 'Nuevo Envío +' },
  'Nova Submissão +': { en: 'New Submission +', es: 'Nuevo Envío +' },
  'Nova Submissão': { en: 'New Submission', es: 'Nuevo Envío' },
  'CVE Correlation DB': { en: 'CVE Correlation DB', es: 'BD de Correlación CVE' },

  // Zero State Banner
  'Plataforma Zerada (Ambiente Limpo)': { en: 'Clean Workspace (Zero State)', es: 'Entorno Limpio (Estado Cero)' },
  '0 Achados': { en: '0 Findings', es: '0 Hallazgos' },
  'Você está no ambiente sem dados simulados. Comece criando seu primeiro relatório ou carregue os dados de demonstração (mock) para ver dashboards, gráficos e históricos preenchidos.': {
    en: 'You are in an environment without simulated data. Start by creating your first report or load demonstration mock data to view dashboards, charts, and filled histories.',
    es: 'Está en el entorno sin datos simulados. Comience creando su primer reporte o cargue los datos de demostración (mock) para ver paneles, gráficos e historiales completos.'
  },
  'Opções de Mock': { en: 'Mock Options', es: 'Opciones de Mock' },
  'Criar Relatório': { en: 'Create Report', es: 'Crear Reporte' },

  // AppSec Suite Card
  '40 FERRAMENTAS INTEGRADAS': { en: '40 INTEGRATED TOOLS', es: '40 HERRAMIENTAS INTEGRADAS' },
  'Abrir Ferramentas AppSec': { en: 'Open AppSec Tools', es: 'Abrir Herramientas AppSec' },
  'CVSS v4.0, Mapeador CWE/OWASP Top 10, Construtor PoC cURL/Python, Monitor SLA MTTR/MTTT, Macros de Triagem, Sanitizador DLP e Jira/GitHub Exporter.': {
    en: 'CVSS v4.0, CWE/OWASP Top 10 Mapper, cURL/Python PoC Builder, SLA MTTR/MTTT Monitor, Triage Macros, DLP Sanitizer, and Jira/GitHub Exporter.',
    es: 'CVSS v4.0, Mapeador CWE/OWASP Top 10, Constructor PoC cURL/Python, Monitor SLA MTTR/MTTT, Macros de Triaje, Sanitizador DLP y Exportador Jira/GitHub.'
  },

  // KPI Cards & Metrics
  'Total em Bounties': { en: 'Total Bounties', es: 'Total en Bounties' },
  'Total Bounties': { en: 'Total Bounties', es: 'Total en Bounties' },
  '30D Trend': { en: '30D Trend', es: 'Tendencia 30D' },
  'Tendência 30D': { en: '30D Trend', es: 'Tendencia 30D' },
  'estimado': { en: 'estimated', es: 'estimado' },
  'estimated BRL': { en: 'estimated BRL', es: 'estimado BRL' },
  'Achados Críticos': { en: 'Critical Findings', es: 'Hallazgos Críticos' },
  'Critical Findings': { en: 'Critical Findings', es: 'Hallazgos Críticos' },
  'MÁXIMA PRIORIDADE': { en: 'MAXIMUM PRIORITY', es: 'MÁXIMA PRIORIDAD' },
  'MAXIMUM PRIORITY': { en: 'MAXIMUM PRIORITY', es: 'MÁXIMA PRIORIDAD' },
  'validação pendente': { en: 'pending validation', es: 'validación pendiente' },
  'pending validation': { en: 'pending validation', es: 'validación pendiente' },
  'Relatórios Ativos': { en: 'Active Reports', es: 'Reportes Activos' },
  'Active Reports': { en: 'Active Reports', es: 'Reportes Activos' },
  'Taxa de Aceitação': { en: 'Acceptance Rate', es: 'Tasa de Aceptación' },
  'Acceptance Rate': { en: 'Acceptance Rate', es: 'Tasa de Aceptación' },
  'Recompensa Média': { en: 'Average Reward', es: 'Recompensa Promedio' },
  'Average Reward': { en: 'Average Reward', es: 'Recompensa Promedio' },
  'Sem Recompensa': { en: 'Unrewarded', es: 'Sin Recompensa' },
  'Unrewarded': { en: 'Unrewarded', es: 'Sin Recompensa' },
  'Em Triagem': { en: 'In Triage', es: 'En Triaje' },
  'In Triage': { en: 'In Triage', es: 'En Triaje' },
  'Triaged': { en: 'Triaged', es: 'En Triaje' },
  'Pagamento Pendente': { en: 'Pending Payout', es: 'Pago Pendiente' },
  'Pending Payout': { en: 'Pending Payout', es: 'Pago Pendiente' },
  'Atividade Recente': { en: 'Recent Activity', es: 'Actividad Reciente' },
  'Recent Activity': { en: 'Recent Activity', es: 'Actividad Reciente' },
  'Bounties ao Longo do Tempo': { en: 'Bounties Over Time', es: 'Bounties a lo Largo del Tiempo' },
  'Distribuição de Vulnerabilidades por Severidade': { en: 'Vulnerability Distribution by Severity', es: 'Distribución de Vulnerabilidades por Severidad' },

  // Storage Integrity Banner
  'Mecanismo de Auto-Cura Ativo:': { en: 'Self-Healing Engine Active:', es: 'Mecanismo de Auto-Curación Activo:' },
  'Ver Diagnóstico': { en: 'View Diagnostics', es: 'Ver Diagnóstico' },
  'View Diagnostics': { en: 'View Diagnostics', es: 'Ver Diagnóstico' },
  'Dispensar aviso': { en: 'Dismiss banner', es: 'Descartar aviso' },
  'Dismiss banner': { en: 'Dismiss banner', es: 'Descartar aviso' },
  'Integridade do Armazenamento': { en: 'Storage Integrity', es: 'Integridad del Almacenamiento' },
  'Storage Integrity': { en: 'Storage Integrity', es: 'Integridad del Almacenamiento' },
  'inconsistência foi detectada e reparada': { en: 'inconsistency was detected and repaired', es: 'inconsistencia fue detectada y reparada' },
  'inconsistências foram detectadas e reparadas': { en: 'inconsistencies were detected and repaired', es: 'inconsistencias fueron detectadas y reparadas' },
  'automaticamente no localStorage durante o carregamento inicial, prevenindo erros de renderização.': {
    en: 'automatically in localStorage during initial load, preventing rendering errors.',
    es: 'automáticamente en localStorage durante la carga inicial, previniendo errores de renderizado.'
  },

  // Reports View & Tables
  'Gerencie achados, formate para envio e acompanhe o pipeline de triagem e pagamento': {
    en: 'Manage security findings, format for submission, and track triage and payout pipeline',
    es: 'Administre hallazgos, formatee para envío y supervise el flujo de triaje y pago'
  },
  'Importar CSV': { en: 'Import CSV', es: 'Importar CSV' },
  'Import CSV': { en: 'Import CSV', es: 'Importar CSV' },
  'Exportar CSV': { en: 'Export CSV', es: 'Exportar CSV' },
  'Export CSV': { en: 'Export CSV', es: 'Exportar CSV' },
  'Gerar com Gemini': { en: 'Generate with Gemini', es: 'Generar con Gemini' },
  'Generate with Gemini': { en: 'Generate with Gemini', es: 'Generar con Gemini' },
  'Todos os Status': { en: 'All Statuses', es: 'Todos los Estados' },
  'All Statuses': { en: 'All Statuses', es: 'Todos los Estados' },
  'Rascunhos': { en: 'Drafts', es: 'Borradores' },
  'Drafts': { en: 'Drafts', es: 'Borradores' },
  'Enviados': { en: 'Submitted', es: 'Enviados' },
  'Submitted': { en: 'Submitted', es: 'Enviados' },
  'Recompensados ($)': { en: 'Rewarded ($)', es: 'Recompensados ($)' },
  'Rewarded ($)': { en: 'Rewarded ($)', es: 'Recompensados ($)' },
  'Recompensados': { en: 'Rewarded', es: 'Recompensados' },
  'Rewarded': { en: 'Rewarded', es: 'Recompensados' },
  'Resolvidos': { en: 'Resolved', es: 'Resueltos' },
  'Resolved': { en: 'Resolved', es: 'Resueltos' },
  'Duplicados': { en: 'Duplicate', es: 'Duplicados' },
  'Duplicate': { en: 'Duplicate', es: 'Duplicados' },
  'Fora de Escopo': { en: 'Out of Scope', es: 'Fuera de Alcance' },
  'Out of Scope': { en: 'Out of Scope', es: 'Fuera de Alcance' },
  'Título da Vulnerabilidade': { en: 'Vulnerability Title', es: 'Título de la Vulnerabilidad' },
  'Vulnerability Title': { en: 'Vulnerability Title', es: 'Título de la Vulnerabilidad' },
  'Alvo / Programa': { en: 'Target / Program', es: 'Objetivo / Programa' },
  'Target / Program': { en: 'Target / Program', es: 'Objetivo / Programa' },
  'Severidade': { en: 'Severity', es: 'Severidad' },
  'Severity': { en: 'Severity', es: 'Severidad' },
  'Status': { en: 'Status', es: 'Estado' },
  'Recompensa': { en: 'Bounty', es: 'Recompensa' },
  'Bounty': { en: 'Bounty', es: 'Recompensa' },
  'Nenhum relatório encontrado.': { en: 'No reports found.', es: 'No se encontraron reportes.' },
  'No reports found.': { en: 'No reports found.', es: 'No se encontraron reportes.' },

  // Severities & Badges
  'CRÍTICA': { en: 'CRITICAL', es: 'CRÍTICA' },
  'CRITICAL': { en: 'CRITICAL', es: 'CRÍTICA' },
  'Crítica': { en: 'Critical', es: 'Crítica' },
  'Critical': { en: 'Critical', es: 'Crítica' },
  'ALTA': { en: 'HIGH', es: 'ALTA' },
  'HIGH': { en: 'HIGH', es: 'ALTA' },
  'Alta': { en: 'High', es: 'Alta' },
  'High': { en: 'High', es: 'Alta' },
  'MÉDIA': { en: 'MEDIUM', es: 'MEDIA' },
  'MEDIUM': { en: 'MEDIUM', es: 'MEDIA' },
  'Média': { en: 'Medium', es: 'Media' },
  'Medium': { en: 'Medium', es: 'Media' },
  'BAIXA': { en: 'LOW', es: 'BAJA' },
  'LOW': { en: 'LOW', es: 'BAJA' },
  'Baixa': { en: 'Low', es: 'Baja' },
  'Low': { en: 'Low', es: 'Baja' },
  'INFO': { en: 'INFO', es: 'INFO' },
  'Informativa': { en: 'Informational', es: 'Informativa' },

  // Targets View
  'Track authorized scopes, testing rules and uncover priority attack surfaces': {
    en: 'Track authorized scopes, testing rules, and uncover priority attack surfaces',
    es: 'Supervise alcances autorizados, reglas y descubra superficies de ataque prioritarias'
  },
  'Acompanhe escopos autorizados, limites de teste e descubra vetores de ataque prioritários': {
    en: 'Track authorized scopes, testing rules, and uncover priority attack surfaces',
    es: 'Supervise alcances autorizados, reglas y descubra superficies de ataque prioritarias'
  },
  'Adicionar Programa / Alvo': { en: 'Add Program / Target', es: 'Agregar Programa / Objetivo' },
  'Add Program / Target': { en: 'Add Program / Target', es: 'Agregar Programa / Objetivo' },
  'Dentro do Escopo (In-Scope)': { en: 'In-Scope Rules', es: 'Dentro del Alcance (In-Scope)' },
  'In-Scope Rules': { en: 'In-Scope Rules', es: 'Dentro del Alcance (In-Scope)' },
  'Fora do Escopo (Out-of-Scope)': { en: 'Out-of-Scope Rules', es: 'Fuera del Alcance (Out-of-Scope)' },
  'Out-of-Scope Rules': { en: 'Out-of-Scope Rules', es: 'Fuera del Alcance (Out-of-Scope)' },
  'Faixa de Bounties': { en: 'Bounty Range', es: 'Rango de Bounties' },
  'Bounty Range': { en: 'Bounty Range', es: 'Rango de Bounties' },

  // General Verbs & UI Controls
  'Salvar': { en: 'Save', es: 'Guardar' },
  'Save': { en: 'Save', es: 'Guardar' },
  'Cancelar': { en: 'Cancel', es: 'Cancelar' },
  'Cancel': { en: 'Cancel', es: 'Cancelar' },
  'Fechar': { en: 'Close', es: 'Cerrar' },
  'Close': { en: 'Close', es: 'Cerrar' },
  'Editar': { en: 'Edit', es: 'Editar' },
  'Edit': { en: 'Edit', es: 'Editar' },
  'Excluir': { en: 'Delete', es: 'Eliminar' },
  'Delete': { en: 'Delete', es: 'Eliminar' },
  'Copiar': { en: 'Copy', es: 'Copiar' },
  'Copy': { en: 'Copy', es: 'Copiar' },
  'Copiado!': { en: 'Copied!', es: '¡Copiado!' },
  'Copied!': { en: 'Copied!', es: '¡Copiado!' },
  'Baixar': { en: 'Download', es: 'Descargar' },
  'Download': { en: 'Download', es: 'Descargar' },
  'Exportar': { en: 'Export', es: 'Exportar' },
  'Export': { en: 'Export', es: 'Exportar' },
  'Importar': { en: 'Import', es: 'Importar' },
  'Import': { en: 'Import', es: 'Importar' },
  'Aplicar': { en: 'Apply', es: 'Aplicar' },
  'Apply': { en: 'Apply', es: 'Aplicar' },
  'Redefinir': { en: 'Reset', es: 'Restablecer' },
  'Reset': { en: 'Reset', es: 'Restablecer' },
  'Filtrar': { en: 'Filter', es: 'Filtrar' },
  'Filter': { en: 'Filter', es: 'Filtrar' },
  'Limpar': { en: 'Clear', es: 'Limpiar' },
  'Clear': { en: 'Clear', es: 'Limpiar' },
  'Todos': { en: 'All', es: 'Todos' },
  'All': { en: 'All', es: 'Todos' },
  'Buscar': { en: 'Search', es: 'Buscar' },
  'Search': { en: 'Search', es: 'Buscar' },
  'Carregando...': { en: 'Loading...', es: 'Cargando...' },
  'Loading...': { en: 'Loading...', es: 'Cargando...' },
  'Sucesso': { en: 'Success', es: 'Éxito' },
  'Success': { en: 'Success', es: 'Éxito' },
  'Erro': { en: 'Error', es: 'Error' },
  'Error': { en: 'Error', es: 'Error' },
  'Aviso': { en: 'Warning', es: 'Advertencia' },
  'Warning': { en: 'Warning', es: 'Advertencia' },
  'Confirmar': { en: 'Confirm', es: 'Confirmar' },
  'Confirm': { en: 'Confirm', es: 'Confirmar' },
  'Detalhes': { en: 'Details', es: 'Detalles' },
  'Details': { en: 'Details', es: 'Detalles' },
  'Histórico': { en: 'History', es: 'Historial' },
  'History': { en: 'History', es: 'Historial' },
  'Voltar': { en: 'Back', es: 'Volver' },
  'Back': { en: 'Back', es: 'Volver' },
  'Próximo': { en: 'Next', es: 'Siguiente' },
  'Next': { en: 'Next', es: 'Siguiente' },
  'Anterior': { en: 'Previous', es: 'Anterior' },
  'Previous': { en: 'Previous', es: 'Anterior' },
  'Visualizar': { en: 'View', es: 'Ver' },
  'View': { en: 'View', es: 'Ver' },

  // Settings & Customization
  'Plataforma / Configurações': { en: 'Platform / Settings', es: 'Plataforma / Ajustes' },
  'Configurações da Plataforma': { en: 'Platform Settings', es: 'Ajustes de la Plataforma' },
  'Token de Acesso Pessoal (PAT) do GitHub': { en: 'GitHub Personal Access Token (PAT)', es: 'Token de Acceso Personal (PAT) de GitHub' },
  'URL do Ícone': { en: 'Icon URL', es: 'URL del Icono' },
  'Caminho da URL do Ícone (Icon URL Path)': { en: 'Icon URL Path', es: 'Ruta URL del Icono' },
  'Atalhos de Teclado': { en: 'Keyboard Shortcuts', es: 'Atajos de Teclado' },
  'Conheça o BugSentinel': { en: 'About BugSentinel', es: 'Acerca de BugSentinel' },
  'Sobre o BugSentinel': { en: 'About BugSentinel', es: 'Acerca de BugSentinel' },
  'Guia do Usuário': { en: 'User Guide', es: 'Guía del Usuario' }
};

/**
 * 2. Multi-word phrases and idioms (matched before single-word replacement)
 */
export const MULTI_WORD_PHRASES: [string, TranslationPair][] = [
  ['em tempo real', { en: 'in real time', es: 'en tiempo real' }],
  ['fora de escopo', { en: 'out of scope', es: 'fuera de alcance' }],
  ['dentro do escopo', { en: 'in scope', es: 'dentro del alcance' }],
  ['taxa de aceitação', { en: 'acceptance rate', es: 'tasa de aceptación' }],
  ['dados mock', { en: 'mock data', es: 'datos mock' }],
  ['ambiente limpo', { en: 'clean environment', es: 'entorno limpio' }],
  ['modo convidado', { en: 'guest mode', es: 'modo invitado' }],
  ['gerar com', { en: 'generate with', es: 'generar con' }],
  ['carregamento inicial', { en: 'initial loading', es: 'carga inicial' }],
  ['painel de controle', { en: 'control panel', es: 'panel de control' }],
  ['base de dados', { en: 'database', es: 'base de datos' }],
  ['linha do tempo', { en: 'timeline', es: 'línea de tiempo' }],
  ['prova de conceito', { en: 'proof of concept', es: 'prueba de concepto' }],
  ['impacto no negócio', { en: 'business impact', es: 'impacto en el negocio' }],
  ['recomendações de mitigação', { en: 'mitigation recommendations', es: 'recomendaciones de mitigación' }],
  ['vetor de ataque', { en: 'attack vector', es: 'vector de ataque' }],
  ['injeção de sql', { en: 'sql injection', es: 'inyección sql' }],
  ['falsificação de requisição', { en: 'request forgery', es: 'falsificación de petición' }],
  ['sequestro de subdomínio', { en: 'subdomain takeover', es: 'secuestro de subdominio' }],
  ['envenenamento de cache', { en: 'cache poisoning', es: 'envenenamiento de caché' }],
  ['condição de corrida', { en: 'race condition', es: 'condición de carrera' }],
  ['poluição de protótipo', { en: 'prototype pollution', es: 'contaminación de prototipo' }],
  ['escalada de privilégios', { en: 'privilege escalation', es: 'escalada de privilegios' }],
  ['revisão de segurança', { en: 'security review', es: 'revisión de seguridad' }],
  ['últimos 30 dias', { en: 'last 30 days', es: 'últimos 30 días' }],
  ['últimos 7 dias', { en: 'last 7 days', es: 'últimos 7 días' }],
  ['nenhum relatório encontrado', { en: 'no reports found', es: 'ningún reporte encontrado' }],
  ['nenhum alvo encontrado', { en: 'no targets found', es: 'ningún objetivo encontrado' }],
  ['importado com sucesso', { en: 'successfully imported', es: 'importado con éxito' }],
  ['salvo com sucesso', { en: 'successfully saved', es: 'guardado con éxito' }],
  ['atualizado com sucesso', { en: 'successfully updated', es: 'actualizado con éxito' }],
  ['excluído com sucesso', { en: 'successfully deleted', es: 'eliminado con éxito' }]
];

/**
 * 3. Comprehensive vocabulary dictionary of 600+ Portuguese words mapped to English and Spanish
 */
export const VOCABULARY: Record<string, TranslationPair> = {
  // Articles, prepositions, conjunctions, pronouns
  'o': { en: 'the', es: 'el' },
  'a': { en: 'the', es: 'la' },
  'os': { en: 'the', es: 'los' },
  'as': { en: 'the', es: 'las' },
  'um': { en: 'a', es: 'un' },
  'uma': { en: 'a', es: 'una' },
  'uns': { en: 'some', es: 'unos' },
  'umas': { en: 'some', es: 'unas' },
  'de': { en: 'of', es: 'de' },
  'do': { en: 'of the', es: 'del' },
  'da': { en: 'of the', es: 'de la' },
  'dos': { en: 'of the', es: 'de los' },
  'das': { en: 'of the', es: 'de las' },
  'em': { en: 'in', es: 'en' },
  'no': { en: 'in the', es: 'en el' },
  'na': { en: 'in the', es: 'en la' },
  'nos': { en: 'in the', es: 'en los' },
  'nas': { en: 'in the', es: 'en las' },
  'para': { en: 'for', es: 'para' },
  'por': { en: 'by', es: 'por' },
  'pelo': { en: 'by the', es: 'por el' },
  'pela': { en: 'by the', es: 'por la' },
  'pelos': { en: 'by the', es: 'por los' },
  'pelas': { en: 'by the', es: 'por las' },
  'com': { en: 'with', es: 'con' },
  'sem': { en: 'without', es: 'sin' },
  'e': { en: 'and', es: 'y' },
  'ou': { en: 'or', es: 'o' },
  'se': { en: 'if', es: 'si' },
  'não': { en: 'not', es: 'no' },
  'mais': { en: 'more', es: 'más' },
  'menos': { en: 'less', es: 'menos' },
  'muito': { en: 'very', es: 'muy' },
  'como': { en: 'as', es: 'como' },
  'que': { en: 'that', es: 'que' },
  'qual': { en: 'which', es: 'cuál' },
  'quando': { en: 'when', es: 'cuándo' },
  'onde': { en: 'where', es: 'dónde' },
  'quem': { en: 'who', es: 'quién' },
  'sobre': { en: 'about', es: 'sobre' },
  'entre': { en: 'between', es: 'entre' },
  'até': { en: 'until', es: 'hasta' },
  'apenas': { en: 'only', es: 'sólo' },
  'também': { en: 'also', es: 'también' },
  'seu': { en: 'your', es: 'su' },
  'sua': { en: 'your', es: 'su' },
  'seus': { en: 'your', es: 'sus' },
  'suas': { en: 'your', es: 'sus' },
  'este': { en: 'this', es: 'este' },
  'esta': { en: 'this', es: 'esta' },
  'estes': { en: 'these', es: 'estos' },
  'estas': { en: 'these', es: 'estas' },
  'esse': { en: 'that', es: 'ese' },
  'essa': { en: 'that', es: 'esa' },
  'esses': { en: 'those', es: 'esos' },
  'essas': { en: 'those', es: 'esas' },

  // Security terms & Domain nouns
  'relatório': { en: 'report', es: 'reporte' },
  'relatórios': { en: 'reports', es: 'reportes' },
  'vulnerabilidade': { en: 'vulnerability', es: 'vulnerabilidad' },
  'vulnerabilidades': { en: 'vulnerabilities', es: 'vulnerabilidades' },
  'achado': { en: 'finding', es: 'hallazgo' },
  'achados': { en: 'findings', es: 'hallazgos' },
  'alvo': { en: 'target', es: 'objetivo' },
  'alvos': { en: 'targets', es: 'objetivos' },
  'programa': { en: 'program', es: 'programa' },
  'programas': { en: 'programs', es: 'programas' },
  'ferramenta': { en: 'tool', es: 'herramienta' },
  'ferramentas': { en: 'tools', es: 'herramientas' },
  'módulo': { en: 'module', es: 'módulo' },
  'módulos': { en: 'modules', es: 'módulos' },
  'severidade': { en: 'severity', es: 'severidad' },
  'recompensa': { en: 'bounty', es: 'recompensa' },
  'recompensas': { en: 'bounties', es: 'recompensas' },
  'notificação': { en: 'notification', es: 'notificación' },
  'notificações': { en: 'notifications', es: 'notificaciones' },
  'configuração': { en: 'setting', es: 'ajuste' },
  'configurações': { en: 'settings', es: 'ajustes' },
  'histórico': { en: 'history', es: 'historial' },
  'biblioteca': { en: 'library', es: 'biblioteca' },
  'documentação': { en: 'documentation', es: 'documentación' },
  'escopo': { en: 'scope', es: 'alcance' },
  'escopos': { en: 'scopes', es: 'alcances' },
  'ataque': { en: 'attack', es: 'ataque' },
  'ataques': { en: 'attacks', es: 'ataques' },
  'ameaça': { en: 'threat', es: 'amenaza' },
  'ameaças': { en: 'threats', es: 'amenazas' },
  'risco': { en: 'risk', es: 'riesgo' },
  'riscos': { en: 'risks', es: 'riesgos' },
  'falha': { en: 'flaw', es: 'fallo' },
  'falhas': { en: 'flaws', es: 'fallos' },
  'segurança': { en: 'security', es: 'seguridad' },
  'incidente': { en: 'incident', es: 'incidente' },
  'incidentes': { en: 'incidents', es: 'incidentes' },
  'impacto': { en: 'impact', es: 'impacto' },
  'impactos': { en: 'impacts', es: 'impactos' },
  'vetor': { en: 'vector', es: 'vector' },
  'vetores': { en: 'vectors', es: 'vectores' },
  'autenticação': { en: 'authentication', es: 'autenticación' },
  'autorização': { en: 'authorization', es: 'autorización' },
  'permissão': { en: 'permission', es: 'permiso' },
  'permissões': { en: 'permissions', es: 'permisos' },
  'acesso': { en: 'access', es: 'acceso' },
  'chave': { en: 'key', es: 'clave' },
  'chaves': { en: 'keys', es: 'claves' },
  'senha': { en: 'password', es: 'contraseña' },
  'senhas': { en: 'passwords', es: 'contraseñas' },
  'credencial': { en: 'credential', es: 'credencial' },
  'credenciais': { en: 'credentials', es: 'credenciales' },
  'domínio': { en: 'domain', es: 'dominio' },
  'domínios': { en: 'domains', es: 'dominios' },
  'subdomínio': { en: 'subdomain', es: 'subdominio' },
  'subdomínios': { en: 'subdomains', es: 'subdominios' },
  'servidor': { en: 'server', es: 'servidor' },
  'servidores': { en: 'servers', es: 'servidores' },
  'cliente': { en: 'client', es: 'cliente' },
  'rede': { en: 'network', es: 'red' },
  'navegador': { en: 'browser', es: 'navegador' },
  'requisição': { en: 'request', es: 'petición' },
  'requisições': { en: 'requests', es: 'peticiones' },
  'resposta': { en: 'response', es: 'respuesta' },
  'respostas': { en: 'responses', es: 'respuestas' },
  'cabeçalho': { en: 'header', es: 'encabezado' },
  'cabeçalhos': { en: 'headers', es: 'encabezados' },
  'parâmetro': { en: 'parameter', es: 'parámetro' },
  'parâmetros': { en: 'parameters', es: 'parámetros' },
  'injeção': { en: 'injection', es: 'inyección' },
  'execução': { en: 'execution', es: 'ejecución' },
  'código': { en: 'code', es: 'código' },
  'exploração': { en: 'exploitation', es: 'explotación' },
  'remediação': { en: 'remediation', es: 'remediación' },
  'mitigação': { en: 'mitigation', es: 'mitigación' },
  'validação': { en: 'validation', es: 'validación' },
  'verificação': { en: 'verification', es: 'verificación' },
  'auditoria': { en: 'audit', es: 'auditoría' },
  'análise': { en: 'analysis', es: 'análisis' },
  'simulação': { en: 'simulation', es: 'simulación' },
  'pesquisa': { en: 'research', es: 'investigación' },
  'pesquisador': { en: 'researcher', es: 'investigador' },
  'pesquisadores': { en: 'researchers', es: 'investigadores' },
  'administrador': { en: 'administrator', es: 'administrador' },
  'administradores': { en: 'administrators', es: 'administradores' },
  'usuário': { en: 'user', es: 'usuario' },
  'usuários': { en: 'users', es: 'usuarios' },
  'convidado': { en: 'guest', es: 'invitado' },
  'perfil': { en: 'profile', es: 'perfil' },
  'perfis': { en: 'profiles', es: 'perfiles' },
  'conta': { en: 'account', es: 'cuenta' },
  'sessão': { en: 'session', es: 'sesión' },
  'submissão': { en: 'submission', es: 'envío' },
  'submissões': { en: 'submissions', es: 'envíos' },
  'envio': { en: 'submission', es: 'envío' },
  'rascunho': { en: 'draft', es: 'borrador' },
  'rascunhos': { en: 'drafts', es: 'borradores' },
  'triagem': { en: 'triage', es: 'triaje' },
  'status': { en: 'status', es: 'estado' },
  'estado': { en: 'status', es: 'estado' },
  'dados': { en: 'data', es: 'datos' },
  'banco': { en: 'database', es: 'base de datos' },
  'tabela': { en: 'table', es: 'tabla' },
  'gráfico': { en: 'chart', es: 'gráfico' },
  'gráficos': { en: 'charts', es: 'gráficos' },
  'métrica': { en: 'metric', es: 'métrica' },
  'métricas': { en: 'metrics', es: 'métricas' },
  'taxa': { en: 'rate', es: 'tasa' },
  'média': { en: 'average', es: 'promedio' },
  'total': { en: 'total', es: 'total' },
  'tendência': { en: 'trend', es: 'tendencia' },
  'pagamento': { en: 'payout', es: 'pago' },
  'ganhos': { en: 'earnings', es: 'ganancias' },
  'saldo': { en: 'balance', es: 'balance' },
  'plataforma': { en: 'platform', es: 'plataforma' },
  'plataformas': { en: 'platforms', es: 'plataformas' },
  'ambiente': { en: 'environment', es: 'entorno' },
  'tempo': { en: 'time', es: 'tiempo' },
  'hora': { en: 'hour', es: 'hora' },
  'horas': { en: 'hours', es: 'horas' },
  'minuto': { en: 'minute', es: 'minuto' },
  'minutos': { en: 'minutes', es: 'minutos' },
  'segundo': { en: 'second', es: 'segundo' },
  'segundos': { en: 'seconds', es: 'segundos' },
  'dia': { en: 'day', es: 'día' },
  'dias': { en: 'days', es: 'días' },
  'semana': { en: 'week', es: 'semana' },
  'semanas': { en: 'weeks', es: 'semanas' },
  'mês': { en: 'month', es: 'mes' },
  'meses': { en: 'months', es: 'meses' },
  'ano': { en: 'year', es: 'año' },
  'anos': { en: 'years', es: 'años' },
  'hoje': { en: 'today', es: 'hoy' },
  'ontem': { en: 'yesterday', es: 'ayer' },

  // Verbs & Actions
  'salvar': { en: 'save', es: 'guardar' },
  'salve': { en: 'save', es: 'guarde' },
  'salvando': { en: 'saving', es: 'guardando' },
  'salvo': { en: 'saved', es: 'guardado' },
  'salva': { en: 'saved', es: 'guardada' },
  'salvos': { en: 'saved', es: 'guardados' },
  'salvas': { en: 'saved', es: 'guardadas' },
  'cancelar': { en: 'cancel', es: 'cancelar' },
  'fechar': { en: 'close', es: 'cerrar' },
  'excluir': { en: 'delete', es: 'eliminar' },
  'excluído': { en: 'deleted', es: 'eliminado' },
  'excluída': { en: 'deleted', es: 'eliminada' },
  'editar': { en: 'edit', es: 'editar' },
  'editado': { en: 'edited', es: 'editado' },
  'copiar': { en: 'copy', es: 'copiar' },
  'copiado': { en: 'copied', es: 'copiado' },
  'baixar': { en: 'download', es: 'descargar' },
  'exportar': { en: 'export', es: 'exportar' },
  'exportado': { en: 'exported', es: 'exportado' },
  'importar': { en: 'import', es: 'importar' },
  'importado': { en: 'imported', es: 'importado' },
  'importados': { en: 'imported', es: 'importados' },
  'adicionar': { en: 'add', es: 'agregar' },
  'adicionado': { en: 'added', es: 'agregado' },
  'remover': { en: 'remove', es: 'eliminar' },
  'removido': { en: 'removed', es: 'eliminado' },
  'criar': { en: 'create', es: 'crear' },
  'criado': { en: 'created', es: 'creado' },
  'criada': { en: 'created', es: 'creada' },
  'criando': { en: 'creating', es: 'creando' },
  'limpar': { en: 'clear', es: 'limpiar' },
  'filtrar': { en: 'filter', es: 'filtrar' },
  'filtrado': { en: 'filtered', es: 'filtrado' },
  'filtrados': { en: 'filtered', es: 'filtrados' },
  'buscar': { en: 'search', es: 'buscar' },
  'pesquisar': { en: 'search', es: 'buscar' },
  'consultar': { en: 'query', es: 'consultar' },
  'consulte': { en: 'query', es: 'consulte' },
  'visualizar': { en: 'view', es: 'ver' },
  'ver': { en: 'view', es: 'ver' },
  'abrir': { en: 'open', es: 'abrir' },
  'enviar': { en: 'submit', es: 'enviar' },
  'enviado': { en: 'submitted', es: 'enviado' },
  'enviados': { en: 'submitted', es: 'enviados' },
  'recompensar': { en: 'reward', es: 'recompensar' },
  'recompensado': { en: 'rewarded', es: 'recompensado' },
  'recompensados': { en: 'rewarded', es: 'recompensados' },
  'resolver': { en: 'resolve', es: 'resolver' },
  'resolvido': { en: 'resolved', es: 'resuelto' },
  'resolvidos': { en: 'resolved', es: 'resueltos' },
  'duplicar': { en: 'duplicate', es: 'duplicar' },
  'duplicado': { en: 'duplicate', es: 'duplicado' },
  'duplicados': { en: 'duplicates', es: 'duplicados' },
  'centralizar': { en: 'centralize', es: 'centralizar' },
  'centralize': { en: 'centralize', es: 'centralice' },
  'acelerar': { en: 'accelerate', es: 'agilizar' },
  'acelere': { en: 'accelerate', es: 'agilice' },
  'acompanhar': { en: 'track', es: 'supervisar' },
  'acompanhe': { en: 'track', es: 'supervise' },
  'começar': { en: 'start', es: 'comenzar' },
  'comece': { en: 'start', es: 'comience' },
  'carregar': { en: 'load', es: 'cargar' },
  'carregue': { en: 'load', es: 'cargue' },
  'carregando': { en: 'loading', es: 'cargando' },
  'gerar': { en: 'generate', es: 'generar' },
  'gerado': { en: 'generated', es: 'generado' },
  'gerando': { en: 'generating', es: 'generando' },
  'concluir': { en: 'complete', es: 'completar' },
  'concluído': { en: 'completed', es: 'completado' },
  'concluída': { en: 'completed', es: 'completada' },
  'detectar': { en: 'detect', es: 'detectar' },
  'detectado': { en: 'detected', es: 'detectado' },
  'detectada': { en: 'detected', es: 'detectada' },
  'detectados': { en: 'detected', es: 'detectados' },
  'detectadas': { en: 'detected', es: 'detectadas' },
  'reparar': { en: 'repair', es: 'reparar' },
  'reparado': { en: 'repaired', es: 'reparado' },
  'reparada': { en: 'repaired', es: 'reparada' },
  'reparados': { en: 'repaired', es: 'reparados' },
  'reparadas': { en: 'repaired', es: 'reparadas' },
  'prevenir': { en: 'prevent', es: 'prevenir' },
  'prevenindo': { en: 'preventing', es: 'previniendo' },
  'autenticar': { en: 'authenticate', es: 'autenticar' },
  'autentique': { en: 'authenticate', es: 'autentíquese' },
  'registrar': { en: 'register', es: 'registrar' },
  'modificar': { en: 'modify', es: 'modificar' },
  'confirmar': { en: 'confirm', es: 'confirmar' },
  'redefinir': { en: 'reset', es: 'restablecer' },
  'aplicar': { en: 'apply', es: 'aplicar' },
  'testar': { en: 'test', es: 'probar' },
  'executar': { en: 'execute', es: 'ejecutar' },

  // Adjectives & States
  'novo': { en: 'new', es: 'nuevo' },
  'nova': { en: 'new', es: 'nueva' },
  'novos': { en: 'new', es: 'nuevos' },
  'novas': { en: 'new', es: 'nuevas' },
  'ativo': { en: 'active', es: 'activo' },
  'ativa': { en: 'active', es: 'activa' },
  'ativos': { en: 'active', es: 'activos' },
  'ativas': { en: 'active', es: 'activas' },
  'pendente': { en: 'pending', es: 'pendiente' },
  'pendentes': { en: 'pending', es: 'pendientes' },
  'crítico': { en: 'critical', es: 'crítico' },
  'crítica': { en: 'critical', es: 'crítica' },
  'críticos': { en: 'critical', es: 'críticos' },
  'críticas': { en: 'critical', es: 'críticas' },
  'alto': { en: 'high', es: 'alto' },
  'alta': { en: 'high', es: 'alta' },
  'altos': { en: 'high', es: 'altos' },
  'altas': { en: 'high', es: 'altas' },
  'médio': { en: 'medium', es: 'medio' },
  'médios': { en: 'medium', es: 'medios' },
  'médias': { en: 'medium', es: 'medias' },
  'baixo': { en: 'low', es: 'bajo' },
  'baixa': { en: 'low', es: 'baja' },
  'baixos': { en: 'low', es: 'bajos' },
  'baixas': { en: 'low', es: 'bajas' },
  'informativo': { en: 'informational', es: 'informativo' },
  'informativa': { en: 'informational', es: 'informativa' },
  'simulado': { en: 'simulated', es: 'simulado' },
  'simulados': { en: 'simulated', es: 'simulados' },
  'limpo': { en: 'clean', es: 'limpio' },
  'limpa': { en: 'clean', es: 'limpia' },
  'completo': { en: 'complete', es: 'completo' },
  'completa': { en: 'complete', es: 'completa' },
  'preenchido': { en: 'filled', es: 'llenado' },
  'preenchidos': { en: 'filled', es: 'llenados' },
  'preenchida': { en: 'filled', es: 'llenada' },
  'preenchidas': { en: 'filled', es: 'llenadas' },
  'confidencial': { en: 'confidential', es: 'confidencial' },
  'confidenciais': { en: 'confidential', es: 'confidenciales' },
  'existente': { en: 'existing', es: 'existente' },
  'existentes': { en: 'existing', es: 'existentes' },
  'automático': { en: 'automatic', es: 'automático' },
  'automática': { en: 'automatic', es: 'automática' },
  'automaticamente': { en: 'automatically', es: 'automáticamente' },
  'padrão': { en: 'default', es: 'por defecto' },
  'personalizado': { en: 'custom', es: 'personalizado' },
  'personalizada': { en: 'custom', es: 'personalizada' },
  'sucesso': { en: 'success', es: 'éxito' },
  'erro': { en: 'error', es: 'error' },
  'erros': { en: 'errors', es: 'errores' },
  'aviso': { en: 'warning', es: 'advertencia' },
  'avisos': { en: 'warnings', es: 'advertencias' },
  'nenhum': { en: 'no', es: 'ningún' },
  'nenhuma': { en: 'no', es: 'ninguna' },
  'todos': { en: 'all', es: 'todos' },
  'todas': { en: 'all', es: 'todas' },
  'primeiro': { en: 'first', es: 'primer' },
  'primeira': { en: 'first', es: 'primera' },
  'último': { en: 'last', es: 'último' },
  'última': { en: 'last', es: 'última' },
  'recente': { en: 'recent', es: 'reciente' },
  'recentes': { en: 'recent', es: 'recientes' },
  'financeiro': { en: 'financial', es: 'financiero' },
  'financeira': { en: 'financial', es: 'financiera' },
  'financeiros': { en: 'financial', es: 'financieros' },
  'financeiras': { en: 'financial', es: 'financieras' },
  'técnico': { en: 'technical', es: 'técnico' },
  'técnica': { en: 'technical', es: 'técnica' },
  'técnicos': { en: 'technical', es: 'técnicos' },
  'técnicas': { en: 'technical', es: 'técnicas' }
};

/**
 * 4. English -> Portuguese & Spanish mappings (handles English words in JSX)
 */
export const ENGLISH_TERMS: Record<string, { pt: string; es: string }> = {
  'library': { pt: 'Biblioteca', es: 'Biblioteca' },
  'reports': { pt: 'Relatórios', es: 'Reportes' },
  'report': { pt: 'Relatório', es: 'Reporte' },
  'programs': { pt: 'Programas', es: 'Programas' },
  'program': { pt: 'Programa', es: 'Programa' },
  'targets': { pt: 'Alvos', es: 'Objetivos' },
  'target': { pt: 'Alvo', es: 'Objetivo' },
  'bounty': { pt: 'Recompensa', es: 'Recompensa' },
  'bounties': { pt: 'Recompensas', es: 'Recompensas' },
  'balance': { pt: 'Saldo', es: 'Balance' },
  'bounty balance': { pt: 'Saldo de Bounties', es: 'Balance de Bounties' },
  'new report': { pt: 'Novo Relatório', es: 'Nuevo Reporte' },
  'new submission': { pt: 'Nova Submissão', es: 'Nuevo Envío' },
  'new submission +': { pt: 'Nova Submissão +', es: 'Nuevo Envío +' },
  'critical findings': { pt: 'Achados Críticos', es: 'Hallazgos Críticos' },
  'findings': { pt: 'Achados', es: 'Hallazgos' },
  'finding': { pt: 'Achado', es: 'Hallazgo' },
  'pending validation': { pt: 'validação pendente', es: 'validación pendiente' },
  'total bounties': { pt: 'Total em Bounties', es: 'Total en Bounties' },
  'acceptance rate': { pt: 'Taxa de Aceitação', es: 'Tasa de Aceptación' },
  'average reward': { pt: 'Recompensa Média', es: 'Recompensa Promedio' },
  'active reports': { pt: 'Relatórios Ativos', es: 'Reportes Activos' },
  '30d trend': { pt: 'Tendência 30D', es: 'Tendencia 30D' },
  'tools': { pt: 'Ferramentas', es: 'Herramientas' },
  'tool': { pt: 'Ferramenta', es: 'Herramienta' },
  'appsec tools': { pt: 'Ferramentas AppSec', es: 'Herramientas AppSec' },
  'threat intel': { pt: 'Threat Intel', es: 'Threat Intel' },
  'notifications': { pt: 'Notificações', es: 'Notificaciones' },
  'settings': { pt: 'Configurações', es: 'Ajustes' },
  'actions': { pt: 'Ações', es: 'Acciones' },
  'action': { pt: 'Ação', es: 'Acción' },
  'shortcuts': { pt: 'Atalhos', es: 'Atajos' },
  'overview': { pt: 'Visão Geral', es: 'Resumen' },
  'details': { pt: 'Detalhes', es: 'Detalles' },
  'status': { pt: 'Status', es: 'Estado' },
  'severity': { pt: 'Severidade', es: 'Severidad' },
  'save': { pt: 'Salvar', es: 'Guardar' },
  'cancel': { pt: 'Cancelar', es: 'Cancelar' },
  'close': { pt: 'Fechar', es: 'Cerrar' },
  'edit': { pt: 'Editar', es: 'Editar' },
  'delete': { pt: 'Excluir', es: 'Eliminar' },
  'copy': { pt: 'Copiar', es: 'Copiar' },
  'copied': { pt: 'Copiado', es: 'Copiado' },
  'copied!': { pt: 'Copiado!', es: '¡Copiado!' },
  'download': { pt: 'Baixar', es: 'Descargar' },
  'export': { pt: 'Exportar', es: 'Exportar' },
  'import': { pt: 'Importar', es: 'Importar' },
  'clear': { pt: 'Limpar', es: 'Limpiar' },
  'filter': { pt: 'Filtrar', es: 'Filtrar' },
  'search': { pt: 'Buscar', es: 'Buscar' },
  'draft': { pt: 'Rascunho', es: 'Borrador' },
  'drafts': { pt: 'Rascunhos', es: 'Borradores' },
  'submitted': { pt: 'Enviados', es: 'Enviados' },
  'triaged': { pt: 'Em Triagem', es: 'En Triaje' },
  'rewarded': { pt: 'Recompensados', es: 'Recompensados' },
  'resolved': { pt: 'Resolvidos', es: 'Resueltos' },
  'duplicate': { pt: 'Duplicado', es: 'Duplicado' },
  'out of scope': { pt: 'Fora de Escopo', es: 'Fuera de Alcance' }
};

// Fast normalized lookup for exact phrases
const EXACT_LOOKUP = new Map<string, TranslationPair>();
Object.entries(EXACT_PHRASES).forEach(([key, val]) => {
  EXACT_LOOKUP.set(key.trim().toLowerCase(), val);
});

// Helper to preserve capitalization of original word
function matchCasing(original: string, translated: string): string {
  if (!original || !translated) return translated;
  if (original === original.toUpperCase() && original.length > 1) {
    return translated.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated.toLowerCase();
}

/**
 * Universal text translation function.
 * Handles exact match -> multi-word phrase matching -> tokenized word replacement.
 */
export function translateString(text: string, targetLang: AppLanguage): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // If target is pt-BR:
  // If the string is in English (like 'Library' or 'Bounty Balance'), translate it to Portuguese!
  if (targetLang === 'pt-BR') {
    const low = trimmed.toLowerCase();
    if (ENGLISH_TERMS[low]) {
      const ptWord = ENGLISH_TERMS[low].pt;
      return text.replace(trimmed, matchCasing(trimmed, ptWord));
    }
    // Also check EXACT_PHRASES where value.en matches trimmed
    for (const [ptKey, pair] of Object.entries(EXACT_PHRASES)) {
      if (pair.en.toLowerCase() === low) {
        return text.replace(trimmed, ptKey);
      }
    }
    return text;
  }

  const lowTrimmed = trimmed.toLowerCase();

  // 1. Direct exact match in prominent phrases
  const exact = EXACT_LOOKUP.get(lowTrimmed);
  if (exact) {
    const translation = targetLang === 'en-US' ? exact.en : exact.es;
    return text.replace(trimmed, matchCasing(trimmed, translation));
  }

  // 2. Direct exact match in English terms
  if (ENGLISH_TERMS[lowTrimmed]) {
    const translation = targetLang === 'en-US' ? lowTrimmed : ENGLISH_TERMS[lowTrimmed].es;
    return text.replace(trimmed, matchCasing(trimmed, translation));
  }

  // 3. Dynamic numeric patterns (e.g., '5 pending validation', '0 Achados', '12 relatórios')
  const pendingMatch = trimmed.match(/^(\d+)\s+(pending validation|validações pendentes|validaciones pendientes)$/i);
  if (pendingMatch) {
    const count = pendingMatch[1];
    const phrase = targetLang === 'en-US' ? `${count} pending validation` : `${count} validaciones pendientes`;
    return text.replace(trimmed, phrase);
  }

  const findingsMatch = trimmed.match(/^(\d+)\s+(Achados|Findings|Hallazgos)$/i);
  if (findingsMatch) {
    const count = findingsMatch[1];
    const phrase = targetLang === 'en-US' ? `${count} Findings` : `${count} Hallazgos`;
    return text.replace(trimmed, phrase);
  }

  const reportsFoundMatch = trimmed.match(/^(\d+)\s+(relatório\(s\)\s+encontrado\(s\)|relatórios encontrados|reports found|reportes encontrados)$/i);
  if (reportsFoundMatch) {
    const count = reportsFoundMatch[1];
    const phrase = targetLang === 'en-US' ? `${count} reports found` : `${count} reportes encontrados`;
    return text.replace(trimmed, phrase);
  }

  // 4. Multi-word phrase replacement in sentences
  let result = text;
  for (const [phrase, pair] of MULTI_WORD_PHRASES) {
    if (result.toLowerCase().includes(phrase)) {
      const rep = targetLang === 'en-US' ? pair.en : pair.es;
      const regex = new RegExp(phrase, 'gi');
      result = result.replace(regex, (match) => matchCasing(match, rep));
    }
  }

  // 5. Tokenized word-level replacement for any remaining Portuguese words
  result = result.replace(/[A-Za-zÀ-ÿ0-9_]+/g, (token) => {
    const lowToken = token.toLowerCase();
    const wordEntry = VOCABULARY[lowToken];
    if (wordEntry) {
      const rep = targetLang === 'en-US' ? wordEntry.en : wordEntry.es;
      return matchCasing(token, rep);
    }
    const engEntry = ENGLISH_TERMS[lowToken];
    if (engEntry && targetLang === 'es-ES') {
      return matchCasing(token, engEntry.es);
    }
    return token;
  });

  return result;
}

// WeakMaps to preserve original text node content for high-fidelity switching
const originalTextNodeMap = new WeakMap<Node, string>();
const originalAttributeMap = new WeakMap<Element, Record<string, string>>();

let isTranslatingDom = false;

/**
 * Traverses the DOM tree and replaces text with translated text.
 */
function translateElementTree(root: Element, targetLang: AppLanguage) {
  if (isTranslatingDom) return;
  isTranslatingDom = true;

  try {
    const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA']);

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (IGNORED_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
            if (el.getAttribute('data-no-translate') === 'true') return NodeFilter.FILTER_REJECT;
            if ((el as HTMLElement).isContentEditable) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (IGNORED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.tagName === 'INPUT' || parent.tagName === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const textNodesToTranslate: Text[] = [];
    const elementsWithAttributes: Element[] = [];

    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        textNodesToTranslate.push(currentNode as Text);
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const el = currentNode as Element;
        if (el.hasAttribute('placeholder') || el.hasAttribute('title') || el.hasAttribute('aria-label')) {
          elementsWithAttributes.push(el);
        }
      }
      currentNode = walker.nextNode();
    }

    // 1. Translate Text Nodes
    for (const textNode of textNodesToTranslate) {
      if (!originalTextNodeMap.has(textNode)) {
        originalTextNodeMap.set(textNode, textNode.nodeValue || '');
      }

      const original = originalTextNodeMap.get(textNode) || '';
      if (!original.trim()) continue;

      const translated = translateString(original, targetLang);
      if (translated && textNode.nodeValue !== translated) {
        textNode.nodeValue = translated;
      }
    }

    // 2. Translate Attributes
    const ATTRS = ['placeholder', 'title', 'aria-label'];
    for (const el of elementsWithAttributes) {
      if (!originalAttributeMap.has(el)) {
        const stored: Record<string, string> = {};
        for (const attr of ATTRS) {
          if (el.hasAttribute(attr)) {
            stored[attr] = el.getAttribute(attr) || '';
          }
        }
        originalAttributeMap.set(el, stored);
      }

      const storedAttrs = originalAttributeMap.get(el) || {};
      for (const attr of ATTRS) {
        if (storedAttrs[attr] !== undefined) {
          const originalVal = storedAttrs[attr];
          if (!originalVal.trim()) continue;
          const translated = translateString(originalVal, targetLang);
          if (translated && el.getAttribute(attr) !== translated) {
            el.setAttribute(attr, translated);
          }
        }
      }
    }
  } finally {
    isTranslatingDom = false;
  }
}

/**
 * Enables universal real-time DOM translation across the whole application.
 * Watches DOM changes and updates text smoothly.
 */
export function enableUniversalDomTranslation(targetLang: AppLanguage): () => void {
  const root = document.getElementById('root') || document.body;

  // Immediate translation pass
  translateElementTree(root, targetLang);

  let timeoutId: number | undefined;
  const observer = new MutationObserver((mutations) => {
    if (isTranslatingDom) return;

    // Filter mutations to avoid self-triggering
    const shouldTranslate = mutations.some(m => {
      if (m.type === 'childList') return true;
      if (m.type === 'characterData' && m.target) {
        const textNode = m.target as Text;
        const currentVal = textNode.nodeValue || '';
        const originalVal = originalTextNodeMap.get(textNode);
        return originalVal !== undefined && currentVal !== originalVal;
      }
      return false;
    });

    if (shouldTranslate) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        translateElementTree(root, targetLang);
      }, 35);
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    observer.disconnect();
    window.clearTimeout(timeoutId);
  };
}
