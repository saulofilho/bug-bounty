import { VulnerabilityReport, TargetProgram, TechnicalDoc, Severity, ReportStatus, PlatformName, TimelineEvent } from '../types';
import { INITIAL_REPORTS, INITIAL_TARGETS, INITIAL_DOCS } from '../data/initialData';

export type IntegrityIssueType = 
  | 'SYNTAX_ERROR' 
  | 'INVALID_DATA_TYPE' 
  | 'MISSING_REQUIRED_FIELD' 
  | 'MALFORMED_ARRAY' 
  | 'DUPLICATE_PRIMARY_KEY' 
  | 'INVALID_ENUM_VALUE'
  | 'NUMERIC_OUT_OF_BOUNDS';

export interface StorageIntegrityIssue {
  storageKey: string;
  itemId?: string;
  itemTitle?: string;
  issueType: IntegrityIssueType;
  description: string;
  actionTaken: string;
}

export interface StorageIntegrityResult {
  timestamp: string;
  healthy: boolean;
  totalRepairs: number;
  issues: StorageIntegrityIssue[];
  reportsRepaired: number;
  targetsRepaired: number;
  docsRepaired: number;
  auxiliaryRepaired: number;
  repairedReports: VulnerabilityReport[];
  repairedTargets: TargetProgram[];
  repairedDocs: TechnicalDoc[];
}

const VALID_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const VALID_STATUSES: ReportStatus[] = ['DRAFT', 'SUBMITTED', 'TRIAGED', 'REWARDED', 'RESOLVED', 'DUPLICATE', 'OUT_OF_SCOPE'];
const VALID_PLATFORMS: PlatformName[] = ['HackerOne', 'Bugcrowd', 'Intigriti', 'YesWeHack', 'Synack', 'Direct / VDP'];
const VALID_TIMELINE_TYPES = ['creation', 'status_change', 'bounty', 'dispatch', 'note', 'pgp_signature'] as const;

/**
 * Normalizes or repairs a single vulnerability report to guarantee all rendering invariants.
 */
function sanitizeReport(
  raw: any, 
  index: number, 
  seenIds: Set<string>, 
  issues: StorageIntegrityIssue[]
): VulnerabilityReport {
  let itemRepairs = 0;
  const storageKey = 'bounty_reports_v2';

  // Ensure object
  const reportObj = (typeof raw === 'object' && raw !== null) ? { ...raw } : {};
  if (typeof raw !== 'object' || raw === null) {
    issues.push({
      storageKey,
      itemId: `item_${index}`,
      issueType: 'INVALID_DATA_TYPE',
      description: `Entrada de relatório na posição #${index} não era um objeto válido.`,
      actionTaken: 'Objeto base reconstruído com valores padrão seguros.'
    });
    itemRepairs++;
  }

  // 1. ID uniqueness & validity
  let id = typeof reportObj.id === 'string' && reportObj.id.trim() ? reportObj.id.trim() : '';
  if (!id) {
    id = `REP-REPAIRED-${index + 1}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MISSING_REQUIRED_FIELD',
      description: `Relatório #${index} sem 'id' válido.`,
      actionTaken: `Atribuído novo identificador único: ${id}.`
    });
    itemRepairs++;
  } else if (seenIds.has(id)) {
    const originalId = id;
    id = `${id}-FIX-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'DUPLICATE_PRIMARY_KEY',
      description: `Identificador duplicado detectado: '${originalId}'.`,
      actionTaken: `Reatribuído identificador único '${id}' para evitar falhas de reconciliação no React.`
    });
    itemRepairs++;
  }
  seenIds.add(id);

  // 2. Title
  let title = typeof reportObj.title === 'string' && reportObj.title.trim() ? reportObj.title.trim() : '';
  if (!title) {
    title = `Vulnerabilidade Sem Título [Recuperada ${id}]`;
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MISSING_REQUIRED_FIELD',
      description: `Relatório '${id}' sem título.`,
      actionTaken: `Definido título provisório seguro: '${title}'.`
    });
    itemRepairs++;
  }

  // 3. Target
  let target = typeof reportObj.target === 'string' && reportObj.target.trim() ? reportObj.target.trim() : '';
  if (!target) {
    target = 'unknown-target.domain';
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MISSING_REQUIRED_FIELD',
      description: `Relatório '${id}' sem alvo (target) definido.`,
      actionTaken: `Definido alvo padrão: '${target}'.`
    });
    itemRepairs++;
  }

  // 4. Platform
  let platform: PlatformName = reportObj.platform;
  if (!VALID_PLATFORMS.includes(platform)) {
    platform = 'Direct / VDP';
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'INVALID_ENUM_VALUE',
      description: `Plataforma '${reportObj.platform}' inválida ou ausente.`,
      actionTaken: `Normalizado para '${platform}'.`
    });
    itemRepairs++;
  }

  // 5. Vulnerability Type
  let vulnerabilityType = typeof reportObj.vulnerabilityType === 'string' && reportObj.vulnerabilityType.trim()
    ? reportObj.vulnerabilityType.trim()
    : 'Security Finding';

  // 6. CVSS Score
  let cvssScore = typeof reportObj.cvssScore === 'number' && !isNaN(reportObj.cvssScore) && isFinite(reportObj.cvssScore)
    ? reportObj.cvssScore
    : parseFloat(reportObj.cvssScore);
  
  if (isNaN(cvssScore) || cvssScore < 0 || cvssScore > 10) {
    cvssScore = 5.0;
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'NUMERIC_OUT_OF_BOUNDS',
      description: `Pontuação CVSS inválida ('${reportObj.cvssScore}').`,
      actionTaken: 'Ajustado para pontuação padrão 5.0.'
    });
    itemRepairs++;
  }

  // 7. Severity
  let severity: Severity = reportObj.severity;
  if (typeof severity === 'string') {
    severity = severity.toUpperCase() as Severity;
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    // Infer from cvssScore
    if (cvssScore >= 9.0) severity = 'CRITICAL';
    else if (cvssScore >= 7.0) severity = 'HIGH';
    else if (cvssScore >= 4.0) severity = 'MEDIUM';
    else if (cvssScore > 0) severity = 'LOW';
    else severity = 'INFO';

    issues.push({
      storageKey,
      itemId: id,
      issueType: 'INVALID_ENUM_VALUE',
      description: `Severidade inválida ('${reportObj.severity}').`,
      actionTaken: `Derivada severidade '${severity}' com base no CVSS Score (${cvssScore}).`
    });
    itemRepairs++;
  }

  // 8. Status
  let status: ReportStatus = reportObj.status;
  if (typeof status === 'string') {
    status = status.toUpperCase() as ReportStatus;
  }
  // Mapping legacy status terms
  if ((status as string) === 'PENDING_VALIDATION') status = 'SUBMITTED';
  if ((status as string) === 'INFORMATIVE') status = 'RESOLVED';
  if ((status as string) === 'REJECTED') status = 'OUT_OF_SCOPE';
  if (!VALID_STATUSES.includes(status)) {
    status = 'TRIAGED';
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'INVALID_ENUM_VALUE',
      description: `Status do relatório inválido ('${reportObj.status}').`,
      actionTaken: `Definido status padrão seguro '${status}'.`
    });
    itemRepairs++;
  }

  // 9. cvssVector
  let cvssVector = typeof reportObj.cvssVector === 'string' && reportObj.cvssVector.trim()
    ? reportObj.cvssVector.trim()
    : 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N';

  // 10. cwe
  let cwe = typeof reportObj.cwe === 'string' && reportObj.cwe.trim()
    ? reportObj.cwe.trim()
    : 'CWE-Other';

  // 11. cveIds (CRITICAL ARRAY)
  let cveIds: string[] = [];
  if (Array.isArray(reportObj.cveIds)) {
    cveIds = reportObj.cveIds.filter((x: any) => typeof x === 'string');
  } else {
    cveIds = [];
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MALFORMED_ARRAY',
      description: `Campo 'cveIds' estava ausente ou não era um Array.`,
      actionTaken: `Inicializado como array vazio '[]' para prevenir falhas de leitura .map()/.length.`
    });
    itemRepairs++;
  }

  // 12. tags (CRITICAL ARRAY)
  let tags: string[] = [];
  if (Array.isArray(reportObj.tags)) {
    tags = reportObj.tags.filter((x: any) => typeof x === 'string');
  } else {
    tags = [];
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MALFORMED_ARRAY',
      description: `Campo 'tags' estava ausente ou corrompido.`,
      actionTaken: `Inicializado como array vazio '[]'.`
    });
    itemRepairs++;
  }

  // 13. stepsToReproduce (CRITICAL ARRAY)
  let stepsToReproduce: string[] = [];
  if (Array.isArray(reportObj.stepsToReproduce)) {
    stepsToReproduce = reportObj.stepsToReproduce.map((s: any) => String(s || ''));
  } else if (typeof reportObj.stepsToReproduce === 'string') {
    stepsToReproduce = reportObj.stepsToReproduce
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'INVALID_DATA_TYPE',
      description: `Campo 'stepsToReproduce' foi armazenado como string em vez de string[].`,
      actionTaken: `Convertido para array estruturado com ${stepsToReproduce.length} passos.`
    });
    itemRepairs++;
  } else {
    stepsToReproduce = ['1. Passos de reprodução a serem detalhados pelo pesquisador.'];
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MALFORMED_ARRAY',
      description: `Campo 'stepsToReproduce' ausente.`,
      actionTaken: `Inicializado com passo instrutivo padrão.`
    });
    itemRepairs++;
  }

  // 14. bountyAmount
  let bountyAmount = typeof reportObj.bountyAmount === 'number' && !isNaN(reportObj.bountyAmount) && isFinite(reportObj.bountyAmount)
    ? Math.max(0, reportObj.bountyAmount)
    : Math.max(0, parseFloat(reportObj.bountyAmount) || 0);

  // 15. currency
  let currency: 'USD' | 'BRL' = (reportObj.currency === 'BRL') ? 'BRL' : 'USD';

  // 16. Dates
  const nowIso = new Date().toISOString();
  let createdAt = reportObj.createdAt;
  if (!createdAt || isNaN(Date.parse(createdAt))) {
    createdAt = nowIso;
  }
  let updatedAt = reportObj.updatedAt;
  if (!updatedAt || isNaN(Date.parse(updatedAt))) {
    updatedAt = createdAt;
  }

  // 17. timeline (CRITICAL ARRAY OF OBJECTS)
  let timeline: TimelineEvent[] = [];
  if (Array.isArray(reportObj.timeline) && reportObj.timeline.length > 0) {
    timeline = reportObj.timeline.map((evt: any, evtIdx: number) => {
      const evtObj = (typeof evt === 'object' && evt !== null) ? evt : {};
      const evtId = typeof evtObj.id === 'string' && evtObj.id ? evtObj.id : `evt_${id}_${evtIdx}`;
      const evtDate = typeof evtObj.date === 'string' && evtObj.date ? evtObj.date : createdAt.split('T')[0];
      const evtTitle = typeof evtObj.title === 'string' && evtObj.title ? evtObj.title : 'Evento de Histórico';
      let evtType: any = evtObj.type;
      if (!VALID_TIMELINE_TYPES.includes(evtType)) {
        evtType = 'note';
      }
      return {
        id: evtId,
        date: evtDate,
        title: evtTitle,
        notes: typeof evtObj.notes === 'string' ? evtObj.notes : undefined,
        type: evtType,
        hoursSpent: typeof evtObj.hoursSpent === 'number' ? evtObj.hoursSpent : undefined,
        authorRole: evtObj.authorRole
      };
    });
  } else {
    timeline = [
      {
        id: `t1_${id}`,
        date: createdAt.split('T')[0],
        title: 'Relatório Criado',
        notes: 'Registro inicial sincronizado e validado pelo BugSentinel.',
        type: 'creation',
        hoursSpent: 1.0
      }
    ];
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MALFORMED_ARRAY',
      description: `Timeline de eventos ausente ou corrompida.`,
      actionTaken: `Inicializado evento base de criação para garantir renderização de histórico e métricas.`
    });
    itemRepairs++;
  }

  return {
    id,
    title,
    target,
    platform,
    vulnerabilityType,
    severity,
    status,
    cvssVector,
    cvssScore,
    cwe,
    cveIds,
    tags,
    summary: typeof reportObj.summary === 'string' ? reportObj.summary : '',
    stepsToReproduce,
    proofOfConcept: typeof reportObj.proofOfConcept === 'string' ? reportObj.proofOfConcept : '',
    businessImpact: typeof reportObj.businessImpact === 'string' ? reportObj.businessImpact : '',
    remediation: typeof reportObj.remediation === 'string' ? reportObj.remediation : '',
    bountyAmount,
    currency,
    submissionId: typeof reportObj.submissionId === 'string' ? reportObj.submissionId : undefined,
    submissionUrl: typeof reportObj.submissionUrl === 'string' ? reportObj.submissionUrl : undefined,
    createdAt,
    updatedAt,
    timeline,
    timeSpentHours: typeof reportObj.timeSpentHours === 'number' ? reportObj.timeSpentHours : undefined,
    attachments: Array.isArray(reportObj.attachments) ? reportObj.attachments : undefined,
    targetIp: typeof reportObj.targetIp === 'string' ? reportObj.targetIp : undefined,
    targetRegion: typeof reportObj.targetRegion === 'string' ? reportObj.targetRegion : undefined,
    targetCountry: typeof reportObj.targetCountry === 'string' ? reportObj.targetCountry : undefined,
    targetCoordinates: Array.isArray(reportObj.targetCoordinates) && reportObj.targetCoordinates.length === 2 ? reportObj.targetCoordinates : undefined,
    pgpSignature: reportObj.pgpSignature && typeof reportObj.pgpSignature === 'object' ? reportObj.pgpSignature : undefined,
    validationChecklist: Array.isArray(reportObj.validationChecklist) ? reportObj.validationChecklist : undefined
  };
}

/**
 * Validates and repairs the target programs collection.
 */
function sanitizeTarget(
  raw: any, 
  index: number, 
  seenIds: Set<string>, 
  issues: StorageIntegrityIssue[]
): TargetProgram {
  const storageKey = 'bounty_targets_v2';
  const targetObj = (typeof raw === 'object' && raw !== null) ? { ...raw } : {};

  let id = typeof targetObj.id === 'string' && targetObj.id.trim() ? targetObj.id.trim() : `TGT-${index + 1}`;
  if (seenIds.has(id)) {
    id = `${id}-${Math.random().toString(36).substring(2, 6)}`;
  }
  seenIds.add(id);

  const name = typeof targetObj.name === 'string' && targetObj.name.trim() ? targetObj.name.trim() : `Programa Alvo #${index + 1}`;
  const domain = typeof targetObj.domain === 'string' && targetObj.domain.trim() ? targetObj.domain.trim() : 'example.com';
  
  let platform: PlatformName = targetObj.platform;
  if (!VALID_PLATFORMS.includes(platform)) {
    platform = 'Direct / VDP';
  }

  let inScope: string[] = [];
  if (Array.isArray(targetObj.inScope)) {
    inScope = targetObj.inScope.filter((s: any) => typeof s === 'string');
  } else {
    inScope = [`*.${domain}`];
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MALFORMED_ARRAY',
      description: `Alvo '${name}' com lista 'inScope' corrompida ou inexistente.`,
      actionTaken: `Inicializado array padrão com subdomínios (*.${domain}).`
    });
  }

  let outOfScope: string[] = [];
  if (Array.isArray(targetObj.outOfScope)) {
    outOfScope = targetObj.outOfScope.filter((s: any) => typeof s === 'string');
  } else {
    outOfScope = [];
  }

  let status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' = targetObj.status;
  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    status = 'ACTIVE';
  }

  return {
    id,
    name,
    domain,
    platform,
    programUrl: typeof targetObj.programUrl === 'string' ? targetObj.programUrl : '',
    bountyRange: typeof targetObj.bountyRange === 'string' ? targetObj.bountyRange : '$100 - $5,000',
    inScope,
    outOfScope,
    notes: typeof targetObj.notes === 'string' ? targetObj.notes : '',
    status,
    reportsCount: typeof targetObj.reportsCount === 'number' ? targetObj.reportsCount : 0,
    totalRewarded: typeof targetObj.totalRewarded === 'number' ? targetObj.totalRewarded : 0
  };
}

/**
 * Validates and repairs the technical documentation collection.
 */
function sanitizeDoc(
  raw: any, 
  index: number, 
  seenIds: Set<string>, 
  issues: StorageIntegrityIssue[]
): TechnicalDoc {
  const storageKey = 'bounty_docs_v2';
  const docObj = (typeof raw === 'object' && raw !== null) ? { ...raw } : {};

  let id = typeof docObj.id === 'string' && docObj.id.trim() ? docObj.id.trim() : `DOC-${index + 1}`;
  if (seenIds.has(id)) {
    id = `${id}-${Math.random().toString(36).substring(2, 6)}`;
  }
  seenIds.add(id);

  const title = typeof docObj.title === 'string' && docObj.title.trim() ? docObj.title.trim() : `Documento Técnico #${index + 1}`;
  
  let tags: string[] = [];
  if (Array.isArray(docObj.tags)) {
    tags = docObj.tags.filter((t: any) => typeof t === 'string');
  } else {
    tags = [];
    issues.push({
      storageKey,
      itemId: id,
      issueType: 'MALFORMED_ARRAY',
      description: `Documento '${title}' com lista de 'tags' corrompida.`,
      actionTaken: `Inicializado array de tags vazio.`
    });
  }

  return {
    id,
    title,
    category: docObj.category || 'Methodology',
    content: typeof docObj.content === 'string' ? docObj.content : '# ' + title,
    tags,
    updatedAt: docObj.updatedAt || new Date().toISOString().split('T')[0],
    isChecklist: typeof docObj.isChecklist === 'boolean' ? docObj.isChecklist : undefined,
    checklistItems: Array.isArray(docObj.checklistItems) ? docObj.checklistItems : undefined
  };
}

/**
 * Comprehensive Storage Integrity Validator and Self-Healing Engine.
 * Executed on initial application bootstrap.
 */
export function validateAndRepairStorageIntegrity(): StorageIntegrityResult {
  const issues: StorageIntegrityIssue[] = [];
  let reportsRepaired = 0;
  let targetsRepaired = 0;
  let docsRepaired = 0;
  let auxiliaryRepaired = 0;

  const isMockExplicitlyCleared = typeof window !== 'undefined' && localStorage.getItem('bounty_mock_cleared') === 'true';

  // -------------------------------------------------------------
  // 1. Validate & Repair bounty_reports_v2
  // -------------------------------------------------------------
  let repairedReports: VulnerabilityReport[] = [];
  const rawReportsStr = localStorage.getItem('bounty_reports_v2');

  if (!rawReportsStr) {
    // Fresh initialization from seed (or empty if mock was explicitly cleared)
    repairedReports = isMockExplicitlyCleared ? [] : [...INITIAL_REPORTS];
    try {
      localStorage.setItem('bounty_reports_v2', JSON.stringify(repairedReports));
    } catch (e) {
      console.error('Storage write error on seed:', e);
    }
  } else {
    let parsed: any = null;
    let parseFailed = false;

    try {
      parsed = JSON.parse(rawReportsStr);
    } catch (err: any) {
      parseFailed = true;
      issues.push({
        storageKey: 'bounty_reports_v2',
        issueType: 'SYNTAX_ERROR',
        description: `JSON corrompido em 'bounty_reports_v2': ${err?.message || 'Erro de sintaxe'}`,
        actionTaken: isMockExplicitlyCleared 
          ? 'Conjunto limpo redefinido para array vazio.' 
          : 'Conjunto restaurado com base nos relatórios padrão do sistema para restabelecer renderização.'
      });
      reportsRepaired++;
      parsed = isMockExplicitlyCleared ? [] : [...INITIAL_REPORTS];
    }

    if (!Array.isArray(parsed)) {
      issues.push({
        storageKey: 'bounty_reports_v2',
        issueType: 'INVALID_DATA_TYPE',
        description: `O valor salvo em 'bounty_reports_v2' não era um Array (tipo: ${typeof parsed}).`,
        actionTaken: 'Convertido para Array e validado.'
      });
      reportsRepaired++;
      parsed = Array.isArray(parsed?.reports) ? parsed.reports : (isMockExplicitlyCleared ? [] : [...INITIAL_REPORTS]);
    }

    const seenReportIds = new Set<string>();
    const sanitizedReportsList: VulnerabilityReport[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const prevIssuesCount = issues.length;
      const sanitized = sanitizeReport(parsed[i], i, seenReportIds, issues);
      sanitizedReportsList.push(sanitized);
      if (issues.length > prevIssuesCount) {
        reportsRepaired++;
      }
    }

    // Merge any missing initial reports if empty or all lost, UNLESS mock was cleared by user
    if (sanitizedReportsList.length === 0) {
      if (isMockExplicitlyCleared) {
        repairedReports = [];
      } else {
        repairedReports = [...INITIAL_REPORTS];
        reportsRepaired++;
      }
    } else {
      repairedReports = sanitizedReportsList;
    }

    // If repairs occurred, write clean data back
    if (reportsRepaired > 0 || parseFailed) {
      try {
        localStorage.setItem('bounty_reports_v2', JSON.stringify(repairedReports));
      } catch (err) {
        console.error('Failed writing repaired reports to localStorage:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Validate & Repair bounty_targets_v2
  // -------------------------------------------------------------
  let repairedTargets: TargetProgram[] = [];
  const rawTargetsStr = localStorage.getItem('bounty_targets_v2');

  if (!rawTargetsStr) {
    repairedTargets = isMockExplicitlyCleared ? [] : [...INITIAL_TARGETS];
    try {
      localStorage.setItem('bounty_targets_v2', JSON.stringify(repairedTargets));
    } catch (e) {
      console.error(e);
    }
  } else {
    let parsedTargets: any = null;
    let targetsParseFailed = false;

    try {
      parsedTargets = JSON.parse(rawTargetsStr);
    } catch (err: any) {
      targetsParseFailed = true;
      issues.push({
        storageKey: 'bounty_targets_v2',
        issueType: 'SYNTAX_ERROR',
        description: `JSON corrompido em 'bounty_targets_v2': ${err?.message || 'Erro de sintaxe'}`,
        actionTaken: isMockExplicitlyCleared ? 'Alvos limpos para array vazio.' : 'Alvos restaurados a partir dos dados padrão.'
      });
      targetsRepaired++;
      parsedTargets = isMockExplicitlyCleared ? [] : [...INITIAL_TARGETS];
    }

    if (!Array.isArray(parsedTargets)) {
      issues.push({
        storageKey: 'bounty_targets_v2',
        issueType: 'INVALID_DATA_TYPE',
        description: `'bounty_targets_v2' não continha um Array.`,
        actionTaken: 'Estrutura restaurada.'
      });
      targetsRepaired++;
      parsedTargets = isMockExplicitlyCleared ? [] : [...INITIAL_TARGETS];
    }

    const seenTargetIds = new Set<string>();
    const sanitizedTargetsList: TargetProgram[] = [];

    for (let i = 0; i < parsedTargets.length; i++) {
      const prevIssues = issues.length;
      const sanitized = sanitizeTarget(parsedTargets[i], i, seenTargetIds, issues);
      sanitizedTargetsList.push(sanitized);
      if (issues.length > prevIssues) {
        targetsRepaired++;
      }
    }

    if (sanitizedTargetsList.length > 0) {
      repairedTargets = sanitizedTargetsList;
    } else if (isMockExplicitlyCleared) {
      repairedTargets = [];
    } else {
      repairedTargets = [...INITIAL_TARGETS];
    }

    if (targetsRepaired > 0 || targetsParseFailed) {
      try {
        localStorage.setItem('bounty_targets_v2', JSON.stringify(repairedTargets));
      } catch (err) {
        console.error('Failed writing repaired targets to localStorage:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 3. Validate & Repair bounty_docs_v2
  // -------------------------------------------------------------
  let repairedDocs: TechnicalDoc[] = [];
  const rawDocsStr = localStorage.getItem('bounty_docs_v2');

  if (!rawDocsStr) {
    repairedDocs = isMockExplicitlyCleared ? [] : [...INITIAL_DOCS];
    try {
      localStorage.setItem('bounty_docs_v2', JSON.stringify(repairedDocs));
    } catch (e) {
      console.error(e);
    }
  } else {
    let parsedDocs: any = null;
    let docsParseFailed = false;

    try {
      parsedDocs = JSON.parse(rawDocsStr);
    } catch (err: any) {
      docsParseFailed = true;
      issues.push({
        storageKey: 'bounty_docs_v2',
        issueType: 'SYNTAX_ERROR',
        description: `JSON corrompido em 'bounty_docs_v2': ${err?.message || 'Erro de sintaxe'}`,
        actionTaken: isMockExplicitlyCleared ? 'Documentos limpos para array vazio.' : 'Documentos restaurados a partir dos dados padrão.'
      });
      docsRepaired++;
      parsedDocs = isMockExplicitlyCleared ? [] : [...INITIAL_DOCS];
    }

    if (!Array.isArray(parsedDocs)) {
      issues.push({
        storageKey: 'bounty_docs_v2',
        issueType: 'INVALID_DATA_TYPE',
        description: `'bounty_docs_v2' não continha um Array.`,
        actionTaken: 'Estrutura restaurada.'
      });
      docsRepaired++;
      parsedDocs = isMockExplicitlyCleared ? [] : [...INITIAL_DOCS];
    }

    const seenDocIds = new Set<string>();
    const sanitizedDocsList: TechnicalDoc[] = [];

    for (let i = 0; i < parsedDocs.length; i++) {
      const prevIssues = issues.length;
      const sanitized = sanitizeDoc(parsedDocs[i], i, seenDocIds, issues);
      sanitizedDocsList.push(sanitized);
      if (issues.length > prevIssues) {
        docsRepaired++;
      }
    }

    if (sanitizedDocsList.length > 0) {
      repairedDocs = sanitizedDocsList;
    } else if (isMockExplicitlyCleared) {
      repairedDocs = [];
    } else {
      repairedDocs = [...INITIAL_DOCS];
    }

    if (docsRepaired > 0 || docsParseFailed) {
      try {
        localStorage.setItem('bounty_docs_v2', JSON.stringify(repairedDocs));
      } catch (err) {
        console.error('Failed writing repaired docs to localStorage:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Validate & Repair Auxiliary Keys (Notifications, Bookmarks, Anomalies)
  // -------------------------------------------------------------
  const auxKeys = [
    { key: 'bugsentinel_dismissed_alerts', defaultVal: '[]', isArray: true },
    { key: 'threat_intel_bookmarks', defaultVal: '[]', isArray: true },
    { key: 'smart_anomalies_dismissed', defaultVal: '{}', isArray: false },
    { key: 'bounty_report_templates_v1', defaultVal: '[]', isArray: true },
    { key: 'bounty_pgp_keys_v1', defaultVal: '[]', isArray: true }
  ];

  for (const aux of auxKeys) {
    const rawVal = localStorage.getItem(aux.key);
    if (rawVal !== null) {
      try {
        const parsedAux = JSON.parse(rawVal);
        if (aux.isArray && !Array.isArray(parsedAux)) {
          issues.push({
            storageKey: aux.key,
            issueType: 'INVALID_DATA_TYPE',
            description: `Chave auxiliar '${aux.key}' continha tipo incorreto (esperado Array).`,
            actionTaken: 'Redefinido para array vazio seguro.'
          });
          localStorage.setItem(aux.key, '[]');
          auxiliaryRepaired++;
        } else if (!aux.isArray && (typeof parsedAux !== 'object' || parsedAux === null)) {
          issues.push({
            storageKey: aux.key,
            issueType: 'INVALID_DATA_TYPE',
            description: `Chave auxiliar '${aux.key}' continha tipo incorreto (esperado Objeto).`,
            actionTaken: 'Redefinido para objeto vazio seguro.'
          });
          localStorage.setItem(aux.key, '{}');
          auxiliaryRepaired++;
        }
      } catch (err) {
        issues.push({
          storageKey: aux.key,
          issueType: 'SYNTAX_ERROR',
          description: `Sintaxe JSON inválida na chave '${aux.key}'.`,
          actionTaken: `Redefinido para valor padrão: ${aux.defaultVal}.`
        });
        localStorage.setItem(aux.key, aux.defaultVal);
        auxiliaryRepaired++;
      }
    }
  }

  const totalRepairs = reportsRepaired + targetsRepaired + docsRepaired + auxiliaryRepaired;

  const result: StorageIntegrityResult = {
    timestamp: new Date().toISOString(),
    healthy: totalRepairs === 0,
    totalRepairs,
    issues,
    reportsRepaired,
    targetsRepaired,
    docsRepaired,
    auxiliaryRepaired,
    repairedReports,
    repairedTargets,
    repairedDocs
  };

  // Cache last audit result in sessionStorage for inspection UI
  try {
    sessionStorage.setItem('bugsentinel_last_storage_audit', JSON.stringify(result));
  } catch {
    // ignore
  }

  return result;
}

/**
 * Creates a verified JSON export backup of current valid state.
 */
export function exportStorageBackup(): void {
  try {
    const reports = localStorage.getItem('bounty_reports_v2') || '[]';
    const targets = localStorage.getItem('bounty_targets_v2') || '[]';
    const docs = localStorage.getItem('bounty_docs_v2') || '[]';

    const backupData = {
      exportedAt: new Date().toISOString(),
      generator: 'BugSentinel Storage Integrity Engine v2.4',
      data: {
        reports: JSON.parse(reports),
        targets: JSON.parse(targets),
        docs: JSON.parse(docs)
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export backup:', err);
  }
}
