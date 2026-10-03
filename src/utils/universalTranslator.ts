/**
 * Universal Application Translator Engine
 * Comprehensive bidirectional multi-language dictionaries and dynamic DOM text translation
 * Supporting: pt-BR (Portuguese), en-US (English), es-ES (Spanish)
 */

import { AppLanguage } from '../context/LanguageContext';

export interface TranslationEntry {
  pt: string;
  en: string;
  es: string;
}

/**
 * Master multi-directional dictionary.
 * Each entry defines the phrase in Portuguese, English, and Spanish.
 */
export const CANONICAL_DICTIONARY: TranslationEntry[] = [
  // Brand & Navigation
  { pt: 'BugSentinel', en: 'BugSentinel', es: 'BugSentinel' },
  { pt: 'Dashboard', en: 'Dashboard', es: 'Panel' },
  { pt: 'Relatórios', en: 'Reports', es: 'Reportes' },
  { pt: 'Reports', en: 'Reports', es: 'Reportes' },
  { pt: 'Relatórios de Vulnerabilidade', en: 'Vulnerability Reports', es: 'Reportes de Vulnerabilidad' },
  { pt: 'Vulnerability Reports', en: 'Vulnerability Reports', es: 'Reportes de Vulnerabilidad' },
  { pt: 'CVE-DB', en: 'CVE-DB', es: 'CVE-DB' },
  { pt: 'Base de Dados de CVEs', en: 'CVE Database', es: 'Base de Datos de CVE' },
  { pt: 'Base de Dados de CVEs & Vulnerabilidades Conhecidas', en: 'CVE & Known Vulnerabilities Database', es: 'Base de Datos de CVE y Vulnerabilidades Conocidas' },
  { pt: 'Programas', en: 'Programs', es: 'Programas' },
  { pt: 'Programs', en: 'Programs', es: 'Programas' },
  { pt: 'Alvos', en: 'Targets', es: 'Objetivos' },
  { pt: 'Targets', en: 'Targets', es: 'Objetivos' },
  { pt: 'Alvos & Programas de Bug Bounty', en: 'Bug Bounty Targets & Programs', es: 'Objetivos y Programas de Bug Bounty' },
  { pt: 'AppSec', en: 'AppSec', es: 'AppSec' },
  { pt: 'Ferramentas AppSec', en: 'AppSec Tools', es: 'Herramientas AppSec' },
  { pt: 'AppSec Tools', en: 'AppSec Tools', es: 'Herramientas AppSec' },
  { pt: 'Central de Ferramentas AppSec', en: 'AppSec Tools Suite', es: 'Suite de Herramientas AppSec' },
  { pt: 'Central de Ferramentas AppSec & DevSecOps', en: 'AppSec & DevSecOps Tools Suite', es: 'Suite de Herramientas AppSec y DevSecOps' },
  { pt: 'Central de Ferramentas AppSec & DevSecOps (10 Módulos)', en: 'AppSec & DevSecOps Tools Suite (10 Modules)', es: 'Suite de Herramientas AppSec y DevSecOps (10 Módulos)' },
  { pt: 'AppSec Suite (10 Ferramentas)', en: 'AppSec Suite (10 Tools)', es: 'AppSec Suite (10 Herramientas)' },
  { pt: 'Intel', en: 'Intel', es: 'Intel' },
  { pt: 'Threat Intel', en: 'Threat Intel', es: 'Threat Intel' },
  { pt: 'Threat Intelligence', en: 'Threat Intelligence', es: 'Threat Intelligence' },
  { pt: 'Threat Intelligence em Tempo Real', en: 'Real-Time Threat Intelligence', es: 'Threat Intelligence en Tiempo Real' },
  { pt: 'Alertas', en: 'Alerts', es: 'Alertas' },
  { pt: 'Alerts', en: 'Alerts', es: 'Alertas' },
  { pt: 'Notificações', en: 'Notifications', es: 'Notificaciones' },
  { pt: 'Notifications', en: 'Notifications', es: 'Notificaciones' },
  { pt: 'Central de Notificações', en: 'Notification Center', es: 'Centro de Notificaciones' },
  { pt: 'Sites', en: 'Sites', es: 'Sitios' },
  { pt: 'Sites & Ganhos', en: 'Platforms & Payouts', es: 'Sitios y Pagos' },
  { pt: 'Plataformas', en: 'Platforms', es: 'Plataformas' },
  { pt: 'Plataformas de Bug Bounty & Ganhos', en: 'Bug Bounty Platforms & Payouts', es: 'Plataformas de Bug Bounty y Pagos' },
  { pt: 'Biblioteca', en: 'Library', es: 'Biblioteca' },
  { pt: 'Library', en: 'Library', es: 'Biblioteca' },
  { pt: 'Documentação', en: 'Documentation', es: 'Documentación' },
  { pt: 'Documentação Técnica & Checklists', en: 'Technical Documentation & Checklists', es: 'Documentación Técnica y Listas de Verificación' },
  { pt: 'Biblioteca de Segurança, Guias e Metodologias', en: 'Security Library, Guides & Methodologies', es: 'Biblioteca de Seguridad, Guías y Metodologías' },
  { pt: 'Docs', en: 'Docs', es: 'Documentos' },
  { pt: 'Mais', en: 'More', es: 'Más' },

  // Header Bar, Profile & Quick Actions
  { pt: 'Ações', en: 'Actions', es: 'Acciones' },
  { pt: 'Actions', en: 'Actions', es: 'Acciones' },
  { pt: 'Ações Rápidas', en: 'Quick Actions', es: 'Acciones Rápidas' },
  { pt: 'Quick Actions', en: 'Quick Actions', es: 'Acciones Rápidas' },
  { pt: 'Atalhos', en: 'Shortcuts', es: 'Atajos' },
  { pt: 'Shortcuts', en: 'Shortcuts', es: 'Atajos' },
  { pt: 'Novo Relatório', en: 'New Report', es: 'Nuevo Reporte' },
  { pt: 'New Report', en: 'New Report', es: 'Nuevo Reporte' },
  { pt: 'Novo', en: 'New', es: 'Nuevo' },
  { pt: 'New', en: 'New', es: 'Nuevo' },
  { pt: 'Saldo de Bounties', en: 'Bounty Balance', es: 'Balance de Bounties' },
  { pt: 'Bounty Balance', en: 'Bounty Balance', es: 'Balance de Bounties' },
  { pt: 'Adicionar Alvo', en: 'Add Target', es: 'Agregar Objetivo' },
  { pt: 'Add Target', en: 'Add Target', es: 'Agregar Objetivo' },
  { pt: 'Adicionar Alvo / Escopo', en: 'Add Target / Scope', es: 'Agregar Objetivo / Alcance' },
  { pt: 'Assinar PGP', en: 'Sign PGP', es: 'Firmar PGP' },
  { pt: 'Sign PGP', en: 'Sign PGP', es: 'Firmar PGP' },
  { pt: 'Assinar Relatório PGP', en: 'Cryptographically Sign PGP', es: 'Firmar Reporte con PGP' },
  { pt: 'Calc CVSS', en: 'CVSS Calc', es: 'Calc CVSS' },
  { pt: 'CVSS Calc', en: 'CVSS Calc', es: 'Calc CVSS' },
  { pt: 'Calc CVSS v3.1', en: 'Calc CVSS v3.1', es: 'Calc CVSS v3.1' },
  { pt: 'Calculadora CVSS v3.1', en: 'CVSS v3.1 Severity Calculator', es: 'Calculadora de Gravedad CVSS v3.1' },
  { pt: 'Calculadora de Gravidade CVSS v3.1 (Alt+C)', en: 'CVSS v3.1 Severity Calculator (Alt+C)', es: 'Calculadora de Gravedad CVSS v3.1 (Alt+C)' },
  { pt: 'Configurações', en: 'Settings', es: 'Ajustes' },
  { pt: 'Settings', en: 'Settings', es: 'Ajustes' },
  { pt: 'Configurações & Token GitHub', en: 'Settings & GitHub Token', es: 'Ajustes y Token de GitHub' },
  { pt: 'Central de Ajuda & Guia', en: 'Help Center & Guide', es: 'Centro de Ayuda y Guía' },
  { pt: 'Conhecer Plataforma / Mock', en: 'Explore Platform / Mock', es: 'Explorar Plataforma / Mock' },
  { pt: 'Ir para o Dashboard', en: 'Go to Dashboard', es: 'Ir al Panel' },
  { pt: 'Buscar alvo, CVE...', en: 'Search target, CVE...', es: 'Buscar objetivo, CVE...' },
  { pt: 'Search target, CVE...', en: 'Search target, CVE...', es: 'Buscar objetivo, CVE...' },
  { pt: 'Limpar busca (Esc)', en: 'Clear search (Esc)', es: 'Limpiar búsqueda (Esc)' },
  { pt: 'Mock Ativo', en: 'Mock Active', es: 'Mock Activo' },
  { pt: 'Mock Active', en: 'Mock Active', es: 'Mock Activo' },
  { pt: 'Plataforma Zerada', en: 'Clean Platform', es: 'Entorno Limpio' },
  { pt: 'Plataforma', en: 'Platform', es: 'Plataforma' },
  { pt: 'Zerado', en: 'Clean', es: 'Limpio' },
  { pt: 'Mudar para Tema Claro', en: 'Switch to Light Theme', es: 'Cambiar a Tema Claro' },
  { pt: 'Mudar para Tema Escuro', en: 'Switch to Dark Theme', es: 'Cambiar a Tema Oscuro' },
  { pt: 'Alternar Tema Claro e Escuro', en: 'Toggle Light/Dark Theme', es: 'Alternar Tema Claro/Oscuro' },
  { pt: 'Idioma', en: 'Language', es: 'Idioma' },
  { pt: 'Idioma do Aplicativo', en: 'App Language', es: 'Idioma de la Aplicación' },

  // User Auth & Profiles
  { pt: 'Fazer Login', en: 'Log In', es: 'Iniciar Sesión' },
  { pt: 'Log In', en: 'Log In', es: 'Iniciar Sesión' },
  { pt: 'Entrar / Admin', en: 'Sign In / Admin', es: 'Iniciar Sesión / Admin' },
  { pt: 'Alternar Perfil:', en: 'Switch Profile:', es: 'Cambiar Perfil:' },
  { pt: 'Sair da Conta (Logout)', en: 'Sign Out (Logout)', es: 'Cerrar Sesión (Logout)' },
  { pt: 'Modo Convidado (Leitura)', en: 'Guest Mode (Read-Only)', es: 'Modo Invitado (Lectura)' },
  { pt: 'Permissões do Perfil:', en: 'Profile Permissions:', es: 'Permisos del Perfil:' },
  { pt: 'Modo Convidado (Acesso Limitado aos Relatórios)', en: 'Guest Mode (Limited Report Access)', es: 'Modo Invitado (Acceso Limitado a Reportes)' },
  { pt: 'Para registrar novos relatórios, editar vulnerabilidades existentes ou visualizar PoCs confidenciais, autentique-se como Administrador ou Pesquisador.', en: 'To register new reports, modify existing vulnerabilities, or view confidential PoCs, please sign in as Administrator or Researcher.', es: 'Para registrar nuevos reportes, editar vulnerabilidades existentes o ver PoCs confidenciales, inicie sesión como Administrador o Investigador.' },

  // Dashboard Workbench & Banner
  { pt: 'Sentinel Vulnerability Workbench', en: 'Sentinel Vulnerability Workbench', es: 'Banco de Vulnerabilidades Sentinel' },
  { pt: 'Bug Bounty Command & Intelligence Terminal', en: 'Bug Bounty Command & Intelligence Terminal', es: 'Terminal de Inteligencia y Comando Bug Bounty' },
  { pt: 'Centralize os achados, acelere submissões para HackerOne, Bugcrowd e Intigriti, consulte vetores de CVE e acompanhe o fluxo de recompensas financeiras em tempo real.', en: 'Centralize findings, expedite submissions to HackerOne, Bugcrowd, and Intigriti, query CVE vectors, and track bounty financial payouts in real time.', es: 'Centralice hallazgos, agilice envíos a HackerOne, Bugcrowd e Intigriti, consulte vectores CVE y supervise el flujo de recompensas en tiempo real.' },
  { pt: 'Dados Mock (localStorage ativo)', en: 'Mock Data (localStorage active)', es: 'Datos Mock (localStorage activo)' },
  { pt: 'Sentiment Tracker', en: 'Sentiment Tracker', es: 'Rastreador de Sentimiento' },
  { pt: 'Dashboard de Risco', en: 'Risk Dashboard', es: 'Panel de Riesgo' },
  { pt: 'Risk Dashboard', en: 'Risk Dashboard', es: 'Panel de Riesgo' },
  { pt: 'Simulador FAIR', en: 'FAIR Simulator', es: 'Simulador FAIR' },
  { pt: 'FAIR Simulator', en: 'FAIR Simulator', es: 'Simulador FAIR' },
  { pt: 'Rate Limits API', en: 'API Rate Limits', es: 'Límites de Tasa de API' },
  { pt: 'API Rate Limits', en: 'API Rate Limits', es: 'Límites de Tasa de API' },
  { pt: 'Sobre & Guia Mock', en: 'About & Mock Guide', es: 'Acerca de y Guía Mock' },
  { pt: 'New Submission +', en: 'New Submission +', es: 'Nuevo Envío +' },
  { pt: 'Nova Submissão +', en: 'New Submission +', es: 'Nuevo Envío +' },
  { pt: 'Nova Submissão', en: 'New Submission', es: 'Nuevo Envío' },
  { pt: 'CVE Correlation DB', en: 'CVE Correlation DB', es: 'BD de Correlación CVE' },
  { pt: 'Base de Correlação CVE', en: 'CVE Correlation DB', es: 'BD de Correlación CVE' },

  // Zero State Banner
  { pt: 'Plataforma Zerada (Ambiente Limpo)', en: 'Clean Workspace (Zero State)', es: 'Entorno Limpio (Estado Cero)' },
  { pt: '0 Achados', en: '0 Findings', es: '0 Hallazgos' },
  { pt: 'Você está no ambiente sem dados simulados. Comece criando seu primeiro relatório ou carregue os dados de demonstração (mock) para ver dashboards, gráficos e históricos preenchidos.', en: 'You are in an environment without simulated data. Start by creating your first report or load demonstration mock data to view dashboards, charts, and filled histories.', es: 'Está en el entorno sin datos simulados. Comience creando su primer reporte o cargue los datos de demostración (mock) para ver paneles, gráficos e historiales completos.' },
  { pt: 'Opções de Mock', en: 'Mock Options', es: 'Opciones de Mock' },
  { pt: 'Criar Relatório', en: 'Create Report', es: 'Crear Reporte' },

  // AppSec Suite Card
  { pt: '40 FERRAMENTAS INTEGRADAS', en: '40 INTEGRATED TOOLS', es: '40 HERRAMIENTAS INTEGRADAS' },
  { pt: 'Abrir Ferramentas AppSec', en: 'Open AppSec Tools', es: 'Abrir Herramientas AppSec' },
  { pt: 'CVSS v4.0, Mapeador CWE/OWASP Top 10, Construtor PoC cURL/Python, Monitor SLA MTTR/MTTT, Macros de Triagem, Sanitizador DLP e Jira/GitHub Exporter.', en: 'CVSS v4.0, CWE/OWASP Top 10 Mapper, cURL/Python PoC Builder, SLA MTTR/MTTT Monitor, Triage Macros, DLP Sanitizer, and Jira/GitHub Exporter.', es: 'CVSS v4.0, Mapeador CWE/OWASP Top 10, Constructor PoC cURL/Python, Monitor SLA MTTR/MTTT, Macros de Triaje, Sanitizador DLP y Exportador Jira/GitHub.' },

  // KPI Cards & Metrics
  { pt: 'Total em Bounties', en: 'Total Bounties', es: 'Total en Bounties' },
  { pt: 'Total Bounties', en: 'Total Bounties', es: 'Total en Bounties' },
  { pt: '30D Trend', en: '30D Trend', es: 'Tendencia 30D' },
  { pt: 'Tendência 30D', en: '30D Trend', es: 'Tendencia 30D' },
  { pt: 'estimado', en: 'estimated', es: 'estimado' },
  { pt: 'estimated BRL', en: 'estimated BRL', es: 'estimado BRL' },
  { pt: 'Achados Críticos', en: 'Critical Findings', es: 'Hallazgos Críticos' },
  { pt: 'Critical Findings', en: 'Critical Findings', es: 'Hallazgos Críticos' },
  { pt: 'MÁXIMA PRIORIDADE', en: 'MAXIMUM PRIORITY', es: 'MÁXIMA PRIORIDAD' },
  { pt: 'MAXIMUM PRIORITY', en: 'MAXIMUM PRIORITY', es: 'MÁXIMA PRIORIDAD' },
  { pt: 'validação pendente', en: 'pending validation', es: 'validación pendiente' },
  { pt: 'pending validation', en: 'pending validation', es: 'validación pendiente' },
  { pt: 'Relatórios Ativos', en: 'Active Reports', es: 'Reportes Activos' },
  { pt: 'Active Reports', en: 'Active Reports', es: 'Reportes Activos' },
  { pt: 'Taxa de Aceitação', en: 'Acceptance Rate', es: 'Tasa de Aceptación' },
  { pt: 'Acceptance Rate', en: 'Acceptance Rate', es: 'Tasa de Aceptación' },
  { pt: 'Recompensa Média', en: 'Average Reward', es: 'Recompensa Promedio' },
  { pt: 'Average Reward', en: 'Average Reward', es: 'Recompensa Promedio' },
  { pt: 'Sem Recompensa', en: 'Unrewarded', es: 'Sin Recompensa' },
  { pt: 'Unrewarded', en: 'Unrewarded', es: 'Sin Recompensa' },
  { pt: 'Em Triagem', en: 'In Triage', es: 'En Triaje' },
  { pt: 'In Triage', en: 'In Triage', es: 'En Triaje' },
  { pt: 'Triaged', en: 'Triaged', es: 'En Triaje' },
  { pt: 'Pagamento Pendente', en: 'Pending Payout', es: 'Pago Pendiente' },
  { pt: 'Pending Payout', en: 'Pending Payout', es: 'Pago Pendiente' },
  { pt: 'Atividade Recente', en: 'Recent Activity', es: 'Actividad Reciente' },
  { pt: 'Recent Activity', en: 'Recent Activity', es: 'Actividad Reciente' },
  { pt: 'Bounties ao Longo do Tempo', en: 'Bounties Over Time', es: 'Bounties a lo Largo del Tiempo' },
  { pt: 'Distribuição de Vulnerabilidades por Severidade', en: 'Vulnerability Distribution by Severity', es: 'Distribución de Vulnerabilidades por Severidad' },

  // Storage Integrity Banner
  { pt: 'Mecanismo de Auto-Cura Ativo:', en: 'Self-Healing Engine Active:', es: 'Mecanismo de Auto-Curación Activo:' },
  { pt: 'Ver Diagnóstico', en: 'View Diagnostics', es: 'Ver Diagnóstico' },
  { pt: 'View Diagnostics', en: 'View Diagnostics', es: 'Ver Diagnóstico' },
  { pt: 'Dispensar aviso', en: 'Dismiss banner', es: 'Descartar aviso' },
  { pt: 'Dismiss banner', en: 'Dismiss banner', es: 'Descartar aviso' },
  { pt: 'Integridade do Armazenamento', en: 'Storage Integrity', es: 'Integridad del Almacenamiento' },
  { pt: 'Storage Integrity', en: 'Storage Integrity', es: 'Integridad del Almacenamiento' },
  { pt: 'inconsistência foi detectada e reparada', en: 'inconsistency was detected and repaired', es: 'inconsistencia fue detectada y reparada' },
  { pt: 'inconsistências foram detectadas e reparadas', en: 'inconsistencies were detected and repaired', es: 'inconsistencias fueron detectadas y reparadas' },
  { pt: 'automaticamente no localStorage durante o carregamento inicial, prevenindo erros de renderização.', en: 'automatically in localStorage during initial load, preventing rendering errors.', es: 'automáticamente en localStorage durante la carga inicial, previniendo errores de renderizado.' },

  // Reports View & Tables
  { pt: 'Gerencie achados, formate para envio e acompanhe o pipeline de triagem e pagamento', en: 'Manage security findings, format for submission, and track triage and payout pipeline', es: 'Administre hallazgos, formatee para envío y supervise el flujo de triaje y pago' },
  { pt: 'Importar CSV', en: 'Import CSV', es: 'Importar CSV' },
  { pt: 'Import CSV', en: 'Import CSV', es: 'Importar CSV' },
  { pt: 'Exportar CSV', en: 'Export CSV', es: 'Exportar CSV' },
  { pt: 'Export CSV', en: 'Export CSV', es: 'Exportar CSV' },
  { pt: 'Gerar com Gemini', en: 'Generate with Gemini', es: 'Generar con Gemini' },
  { pt: 'Generate with Gemini', en: 'Generate with Gemini', es: 'Generar con Gemini' },
  { pt: 'Todos os Status', en: 'All Statuses', es: 'Todos los Estados' },
  { pt: 'All Statuses', en: 'All Statuses', es: 'Todos los Estados' },
  { pt: 'Rascunhos', en: 'Drafts', es: 'Borradores' },
  { pt: 'Drafts', en: 'Drafts', es: 'Borradores' },
  { pt: 'Enviados', en: 'Submitted', es: 'Enviados' },
  { pt: 'Submitted', en: 'Submitted', es: 'Enviados' },
  { pt: 'Recompensados ($)', en: 'Rewarded ($)', es: 'Recompensados ($)' },
  { pt: 'Rewarded ($)', en: 'Rewarded ($)', es: 'Recompensados ($)' },
  { pt: 'Recompensados', en: 'Rewarded', es: 'Recompensados' },
  { pt: 'Rewarded', en: 'Rewarded', es: 'Recompensados' },
  { pt: 'Resolvidos', en: 'Resolved', es: 'Resueltos' },
  { pt: 'Resolved', en: 'Resolved', es: 'Resueltos' },
  { pt: 'Duplicados', en: 'Duplicate', es: 'Duplicados' },
  { pt: 'Duplicate', en: 'Duplicate', es: 'Duplicados' },
  { pt: 'Fora de Escopo', en: 'Out of Scope', es: 'Fuera de Alcance' },
  { pt: 'Out of Scope', en: 'Out of Scope', es: 'Fuera de Alcance' },
  { pt: 'Título da Vulnerabilidade', en: 'Vulnerability Title', es: 'Título de la Vulnerabilidad' },
  { pt: 'Vulnerability Title', en: 'Vulnerability Title', es: 'Título de la Vulnerabilidad' },
  { pt: 'Alvo / Programa', en: 'Target / Program', es: 'Objetivo / Programa' },
  { pt: 'Target / Program', en: 'Target / Program', es: 'Objetivo / Programa' },
  { pt: 'Severidade', en: 'Severity', es: 'Severidad' },
  { pt: 'Severity', en: 'Severity', es: 'Severidad' },
  { pt: 'Status', en: 'Status', es: 'Estado' },
  { pt: 'Recompensa', en: 'Bounty', es: 'Recompensa' },
  { pt: 'Bounty', en: 'Bounty', es: 'Recompensa' },
  { pt: 'Nenhum relatório encontrado.', en: 'No reports found.', es: 'No se encontraron reportes.' },
  { pt: 'No reports found.', en: 'No reports found.', es: 'No se encontraron reportes.' },

  // Severities & Badges
  { pt: 'CRÍTICA', en: 'CRITICAL', es: 'CRÍTICA' },
  { pt: 'CRITICAL', en: 'CRITICAL', es: 'CRÍTICA' },
  { pt: 'Crítica', en: 'Critical', es: 'Crítica' },
  { pt: 'Critical', en: 'Critical', es: 'Crítica' },
  { pt: 'ALTA', en: 'HIGH', es: 'ALTA' },
  { pt: 'HIGH', en: 'HIGH', es: 'ALTA' },
  { pt: 'Alta', en: 'High', es: 'Alta' },
  { pt: 'High', en: 'High', es: 'Alta' },
  { pt: 'MÉDIA', en: 'MEDIUM', es: 'MEDIA' },
  { pt: 'MEDIUM', en: 'MEDIUM', es: 'MEDIA' },
  { pt: 'Média', en: 'Medium', es: 'Media' },
  { pt: 'Medium', en: 'Medium', es: 'Media' },
  { pt: 'BAIXA', en: 'LOW', es: 'BAJA' },
  { pt: 'LOW', en: 'LOW', es: 'BAJA' },
  { pt: 'Baixa', en: 'Low', es: 'Baja' },
  { pt: 'Low', en: 'Low', es: 'Baja' },
  { pt: 'INFO', en: 'INFO', es: 'INFO' },
  { pt: 'Informativa', en: 'Informational', es: 'Informativa' },

  // Targets View
  { pt: 'Track authorized scopes, testing rules and uncover priority attack surfaces', en: 'Track authorized scopes, testing rules, and uncover priority attack surfaces', es: 'Supervise alcances autorizados, reglas y descubra superficies de ataque prioritarias' },
  { pt: 'Acompanhe escopos autorizados, limites de teste e descubra vetores de ataque prioritários', en: 'Track authorized scopes, testing rules, and uncover priority attack surfaces', es: 'Supervise alcances autorizados, reglas y descubra superficies de ataque prioritarias' },
  { pt: 'Adicionar Programa / Alvo', en: 'Add Program / Target', es: 'Agregar Programa / Objetivo' },
  { pt: 'Add Program / Target', en: 'Add Program / Target', es: 'Agregar Programa / Objetivo' },
  { pt: 'Dentro do Escopo (In-Scope)', en: 'In-Scope Rules', es: 'Dentro del Alcance (In-Scope)' },
  { pt: 'In-Scope Rules', en: 'In-Scope Rules', es: 'Dentro del Alcance (In-Scope)' },
  { pt: 'Fora do Escopo (Out-of-Scope)', en: 'Out-of-Scope Rules', es: 'Fuera del Alcance (Out-of-Scope)' },
  { pt: 'Out-of-Scope Rules', en: 'Out-of-Scope Rules', es: 'Fuera del Alcance (Out-of-Scope)' },
  { pt: 'Faixa de Bounties', en: 'Bounty Range', es: 'Rango de Bounties' },
  { pt: 'Bounty Range', en: 'Bounty Range', es: 'Rango de Bounties' },

  // General Verbs & UI Controls
  { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  { pt: 'Save', en: 'Save', es: 'Guardar' },
  { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
  { pt: 'Cancel', en: 'Cancel', es: 'Cancelar' },
  { pt: 'Fechar', en: 'Close', es: 'Cerrar' },
  { pt: 'Close', en: 'Close', es: 'Cerrar' },
  { pt: 'Editar', en: 'Edit', es: 'Editar' },
  { pt: 'Edit', en: 'Edit', es: 'Editar' },
  { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
  { pt: 'Delete', en: 'Delete', es: 'Eliminar' },
  { pt: 'Copiar', en: 'Copy', es: 'Copiar' },
  { pt: 'Copy', en: 'Copy', es: 'Copiar' },
  { pt: 'Copiado!', en: 'Copied!', es: '¡Copiado!' },
  { pt: 'Copied!', en: 'Copied!', es: '¡Copiado!' },
  { pt: 'Baixar', en: 'Download', es: 'Descargar' },
  { pt: 'Download', en: 'Download', es: 'Descargar' },
  { pt: 'Exportar', en: 'Export', es: 'Exportar' },
  { pt: 'Export', en: 'Export', es: 'Exportar' },
  { pt: 'Importar', en: 'Import', es: 'Importar' },
  { pt: 'Import', en: 'Import', es: 'Importar' },
  { pt: 'Aplicar', en: 'Apply', es: 'Aplicar' },
  { pt: 'Apply', en: 'Apply', es: 'Aplicar' },
  { pt: 'Redefinir', en: 'Reset', es: 'Restablecer' },
  { pt: 'Reset', en: 'Reset', es: 'Restablecer' },
  { pt: 'Filtrar', en: 'Filter', es: 'Filtrar' },
  { pt: 'Filter', en: 'Filter', es: 'Filtrar' },
  { pt: 'Limpar', en: 'Clear', es: 'Limpiar' },
  { pt: 'Clear', en: 'Clear', es: 'Limpiar' },
  { pt: 'Todos', en: 'All', es: 'Todos' },
  { pt: 'All', en: 'All', es: 'Todos' },
  { pt: 'Buscar', en: 'Search', es: 'Buscar' },
  { pt: 'Search', en: 'Search', es: 'Buscar' },
  { pt: 'Carregando...', en: 'Loading...', es: 'Cargando...' },
  { pt: 'Loading...', en: 'Loading...', es: 'Cargando...' },
  { pt: 'Sucesso', en: 'Success', es: 'Éxito' },
  { pt: 'Success', en: 'Success', es: 'Éxito' },
  { pt: 'Erro', en: 'Error', es: 'Error' },
  { pt: 'Error', en: 'Error', es: 'Error' },
  { pt: 'Aviso', en: 'Warning', es: 'Advertencia' },
  { pt: 'Warning', en: 'Warning', es: 'Advertencia' },
  { pt: 'Confirmar', en: 'Confirm', es: 'Confirmar' },
  { pt: 'Confirm', en: 'Confirm', es: 'Confirmar' },
  { pt: 'Detalhes', en: 'Details', es: 'Detalles' },
  { pt: 'Details', en: 'Details', es: 'Detalles' },
  { pt: 'Histórico', en: 'History', es: 'Historial' },
  { pt: 'History', en: 'History', es: 'Historial' },
  { pt: 'Voltar', en: 'Back', es: 'Volver' },
  { pt: 'Back', en: 'Back', es: 'Volver' },
  { pt: 'Próximo', en: 'Next', es: 'Siguiente' },
  { pt: 'Next', en: 'Next', es: 'Siguiente' },
  { pt: 'Anterior', en: 'Previous', es: 'Anterior' },
  { pt: 'Previous', en: 'Previous', es: 'Anterior' },
  { pt: 'Visualizar', en: 'View', es: 'Ver' },
  { pt: 'View', en: 'View', es: 'Ver' },

  // Settings & Customization
  { pt: 'Plataforma / Configurações', en: 'Platform / Settings', es: 'Plataforma / Ajustes' },
  { pt: 'Configurações da Plataforma', en: 'Platform Settings', es: 'Ajustes de la Plataforma' },
  { pt: 'Token de Acesso Pessoal (PAT) do GitHub', en: 'GitHub Personal Access Token (PAT)', es: 'Token de Acceso Personal (PAT) de GitHub' },
  { pt: 'URL do Ícone', en: 'Icon URL', es: 'URL del Icono' },
  { pt: 'Caminho da URL do Ícone (Icon URL Path)', en: 'Icon URL Path', es: 'Ruta URL del Icono' },
  { pt: 'Atalhos de Teclado', en: 'Keyboard Shortcuts', es: 'Atajos de Teclado' },
  { pt: 'Conheça o BugSentinel', en: 'About BugSentinel', es: 'Acerca de BugSentinel' },
  { pt: 'Sobre o BugSentinel', en: 'About BugSentinel', es: 'Acerca de BugSentinel' },
  { pt: 'Guia do Usuário', en: 'User Guide', es: 'Guía del Usuario' }
];

// Multi-directional fast lookup map (keyed by normalized lowercase string)
const FAST_LOOKUP = new Map<string, TranslationEntry>();

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Populate the fast lookup map with pt, en, and es variations
CANONICAL_DICTIONARY.forEach(entry => {
  if (entry.pt) FAST_LOOKUP.set(normalizeKey(entry.pt), entry);
  if (entry.en) FAST_LOOKUP.set(normalizeKey(entry.en), entry);
  if (entry.es) FAST_LOOKUP.set(normalizeKey(entry.es), entry);
});

/**
 * Translates a given text string into the target language.
 * Handles exact matches, case preservation, leading/trailing whitespace, and dynamic patterns.
 */
export function translateString(text: string, targetLang: AppLanguage): string {
  if (!text) return text;

  const trimmed = text.trim();
  if (!trimmed) return text;

  const normalized = normalizeKey(trimmed);

  // 1. Direct fast lookup in canonical dictionary
  const entry = FAST_LOOKUP.get(normalized);
  if (entry) {
    const translation = targetLang === 'pt-BR' ? entry.pt : targetLang === 'en-US' ? entry.en : entry.es;
    return text.replace(trimmed, translation);
  }

  // 2. Dynamic numeric patterns (e.g., "5 pending validation", "0 Achados", "12 relatórios encontrados")
  const pendingMatch = trimmed.match(/^(\d+)\s+(pending validation|validações pendentes|validaciones pendientes)$/i);
  if (pendingMatch) {
    const count = pendingMatch[1];
    const phrase = targetLang === 'pt-BR' 
      ? `${count} validações pendentes` 
      : targetLang === 'en-US' 
      ? `${count} pending validation` 
      : `${count} validaciones pendientes`;
    return text.replace(trimmed, phrase);
  }

  const findingsMatch = trimmed.match(/^(\d+)\s+(Achados|Findings|Hallazgos)$/i);
  if (findingsMatch) {
    const count = findingsMatch[1];
    const phrase = targetLang === 'pt-BR' ? `${count} Achados` : targetLang === 'en-US' ? `${count} Findings` : `${count} Hallazgos`;
    return text.replace(trimmed, phrase);
  }

  const reportsFoundMatch = trimmed.match(/^(\d+)\s+(relatório\(s\)\s+encontrado\(s\)|relatórios encontrados|reports found|reportes encontrados)$/i);
  if (reportsFoundMatch) {
    const count = reportsFoundMatch[1];
    const phrase = targetLang === 'pt-BR' ? `${count} relatórios encontrados` : targetLang === 'en-US' ? `${count} reports found` : `${count} reportes encontrados`;
    return text.replace(trimmed, phrase);
  }

  const mappedPlatformsMatch = trimmed.match(/^(\d+)\s+(Plataformas Mapeadas|Mapped Platforms)$/i);
  if (mappedPlatformsMatch) {
    const count = mappedPlatformsMatch[1];
    const phrase = targetLang === 'pt-BR' ? `${count} Plataformas Mapeadas` : targetLang === 'en-US' ? `${count} Mapped Platforms` : `${count} Plataformas Mapeadas`;
    return text.replace(trimmed, phrase);
  }

  const integratedToolsMatch = trimmed.match(/^(\d+)\s+(Ferramentas Integradas|Integrated Tools|Herramientas Integradas)$/i);
  if (integratedToolsMatch) {
    const count = integratedToolsMatch[1];
    const phrase = targetLang === 'pt-BR' ? `${count} Ferramentas Integradas` : targetLang === 'en-US' ? `${count} Integrated Tools` : `${count} Herramientas Integradas`;
    return text.replace(trimmed, phrase);
  }

  const viewDiagMatch = trimmed.match(/^(Ver Diagnóstico|View Diagnostics)\s*\((\d+)\)$/i);
  if (viewDiagMatch) {
    const count = viewDiagMatch[2];
    const phrase = targetLang === 'pt-BR' ? `Ver Diagnóstico (${count})` : targetLang === 'en-US' ? `View Diagnostics (${count})` : `Ver Diagnóstico (${count})`;
    return text.replace(trimmed, phrase);
  }

  const docCountMatch = trimmed.match(/^(Documentação|Documentation|Documentación)\s*\((\d+)\)$/i);
  if (docCountMatch) {
    const count = docCountMatch[2];
    const phrase = targetLang === 'pt-BR' ? `Documentação (${count})` : targetLang === 'en-US' ? `Documentation (${count})` : `Documentación (${count})`;
    return text.replace(trimmed, phrase);
  }

  // 3. Multi-word phrase replacement in sentences
  let processed = text;
  // Replace prominent multi-word phrases if present
  for (const item of CANONICAL_DICTIONARY) {
    if (item.pt.length > 7) {
      const targetWord = targetLang === 'pt-BR' ? item.pt : targetLang === 'en-US' ? item.en : item.es;
      if (targetWord) {
        if (targetLang !== 'pt-BR' && processed.includes(item.pt)) {
          processed = processed.replaceAll(item.pt, targetWord);
        }
        if (targetLang !== 'en-US' && processed.includes(item.en)) {
          processed = processed.replaceAll(item.en, targetWord);
        }
        if (targetLang !== 'es-ES' && processed.includes(item.es)) {
          processed = processed.replaceAll(item.es, targetWord);
        }
      }
    }
  }

  return processed;
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
