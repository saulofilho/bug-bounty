import { VulnerabilityReport, Severity } from '../types';

export type AttackStage = 'initial_entry' | 'privilege_escalation' | 'lateral_movement' | 'final_objective';

export type NodeType = 'threat_actor' | 'entry_point' | 'vulnerability' | 'pivot' | 'crown_jewel';

export interface AttackGraphNode {
  id: string;
  label: string;
  sublabel?: string;
  stage: AttackStage;
  type: NodeType;
  severity?: Severity;
  cvssScore?: number;
  cwe?: string;
  target?: string;
  reportId?: string;
  report?: VulnerabilityReport;
  description: string;
  impact?: string;
  remediation?: string;
  mitreTactic?: string;
  mitreTechnique?: string;
  chokePoint?: boolean;
  // D3 force simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface AttackGraphLink {
  id: string;
  source: string | AttackGraphNode;
  target: string | AttackGraphNode;
  label: string;
  exploitVector?: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requiresAuth?: boolean;
}

export interface AttackPathScenario {
  id: string;
  name: string;
  description: string;
  threatActor: string;
  crownJewelTarget: string;
  nodeIds: string[];
  maxCvss: number;
  stagesCount: number;
}

export const STAGE_CONFIG: Record<AttackStage, {
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  order: number;
}> = {
  initial_entry: {
    label: '1. Acesso Inicial & Perímetro',
    sublabel: 'Superfície externa, APIs públicas e portas de entrada',
    color: '#06b6d4', // cyan-500
    bgColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    order: 0,
  },
  privilege_escalation: {
    label: '2. Exploração & Escalação',
    sublabel: 'Falhas de autenticação, IDOR e injeção de privilégios',
    color: '#f59e0b', // amber-500
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    order: 1,
  },
  lateral_movement: {
    label: '3. Movimentação Lateral & Pivoting',
    sublabel: 'Salto interno, metadados em nuvem e tokens de microsserviço',
    color: '#818cf8', // indigo-400
    bgColor: 'rgba(129, 140, 248, 0.08)',
    borderColor: 'rgba(129, 140, 248, 0.3)',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    order: 2,
  },
  final_objective: {
    label: '4. Objetivo Final & Crown Jewels',
    sublabel: 'Exfiltração de PII, controle de infraestrutura e impacto financeiro',
    color: '#ef4444', // red-500
    bgColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    badgeBg: 'bg-red-500/15 text-red-300 border-red-500/30',
    order: 3,
  },
};

/**
 * Builds a comprehensive attack graph from user's VulnerabilityReports.
 */
export function buildAttackGraphFromReports(reports: VulnerabilityReport[]): {
  nodes: AttackGraphNode[];
  links: AttackGraphLink[];
  scenarios: AttackPathScenario[];
} {
  const nodesMap = new Map<string, AttackGraphNode>();
  const links: AttackGraphLink[] = [];

  // 1. Root Threat Actor node (adversary initial state)
  const rootActorNode: AttackGraphNode = {
    id: 'actor-external',
    label: 'Ameaça Externa (Hacker / Adversário)',
    sublabel: 'Internet Pública / Não Autenticado',
    stage: 'initial_entry',
    type: 'threat_actor',
    description: 'Adversário externo operando a partir da rede pública com ferramentas de escaneamento de perímetro e reconhecimento.',
    mitreTactic: 'TA0001: Initial Access',
    mitreTechnique: 'T1190: Exploit Public-Facing Application'
  };
  nodesMap.set(rootActorNode.id, rootActorNode);

  // Group reports by target to create Entry Point nodes
  const targets = Array.from(new Set(reports.map(r => r.target || 'api.target.com')));

  targets.forEach((target, idx) => {
    const entryId = `entry-${target.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (!nodesMap.has(entryId)) {
      const entryNode: AttackGraphNode = {
        id: entryId,
        label: `Alvo: ${target}`,
        sublabel: 'Perímetro Exposto (DNS / Ingress)',
        stage: 'initial_entry',
        type: 'entry_point',
        target,
        description: `Superfície externa exposta na internet sob o domínio ${target}. Ponto de contato de entrada para requisições de clientes e atacantes.`,
        mitreTactic: 'TA0001: Initial Access',
        mitreTechnique: 'T1190: Exploit Public-Facing Application'
      };
      nodesMap.set(entryId, entryNode);

      // Link from External Actor to this Entry Point
      links.push({
        id: `link-actor-${entryId}`,
        source: rootActorNode.id,
        target: entryId,
        label: 'Reconhecimento & Conexão Externa',
        riskLevel: 'LOW',
        requiresAuth: false,
        exploitVector: 'DNS Query / TLS Handshake / Port Scan'
      });
    }
  });

  // Track created pivots and crown jewels to deduplicate where relevant
  const createdPivots = new Map<string, AttackGraphNode>();
  const createdObjectives = new Map<string, AttackGraphNode>();

  // Process each vulnerability report
  reports.forEach((report, index) => {
    const targetEntryId = `entry-${(report.target || 'api.target.com').replace(/[^a-zA-Z0-9]/g, '_')}`;
    const vulnNodeId = `vuln-${report.id}`;

    // Determine Stage for Vulnerability
    let vulnStage: AttackStage = 'privilege_escalation';
    const typeUpper = (report.vulnerabilityType || '').toUpperCase();
    const cweUpper = (report.cwe || '').toUpperCase();
    const titleUpper = (report.title || '').toUpperCase();

    if (typeUpper.includes('SSRF') || typeUpper.includes('OPEN REDIRECT') || typeUpper.includes('SUBDOMAIN')) {
      vulnStage = 'initial_entry';
    } else if (typeUpper.includes('RCE') || typeUpper.includes('DESERIALIZATION') || typeUpper.includes('METADATA') || typeUpper.includes('PIVOT')) {
      vulnStage = 'lateral_movement';
    } else {
      vulnStage = 'privilege_escalation';
    }

    // Determine MITRE classification
    let mitreTactic = 'TA0004: Privilege Escalation';
    let mitreTechnique = 'T1068: Exploitation for Privilege Escalation';

    if (typeUpper.includes('SSRF')) {
      mitreTactic = 'TA0008: Lateral Movement';
      mitreTechnique = 'T1210: Exploitation of Remote Services';
    } else if (typeUpper.includes('IDOR') || typeUpper.includes('BOLA') || typeUpper.includes('ACCESS CONTROL')) {
      mitreTactic = 'TA0004: Privilege Escalation';
      mitreTechnique = 'T1078: Valid Accounts (Abuse of Permissions)';
    } else if (typeUpper.includes('XSS') || typeUpper.includes('CSRF')) {
      mitreTactic = 'TA0001: Initial Access';
      mitreTechnique = 'T1189: Drive-by Compromise';
    } else if (typeUpper.includes('INJECTION') || typeUpper.includes('SQL')) {
      mitreTactic = 'TA0004: Privilege Escalation';
      mitreTechnique = 'T1190: Exploit Public-Facing Application';
    }

    const vulnNode: AttackGraphNode = {
      id: vulnNodeId,
      label: report.title.length > 52 ? `${report.title.substring(0, 50)}...` : report.title,
      sublabel: `${report.id} • ${report.vulnerabilityType} (CVSS ${report.cvssScore})`,
      stage: vulnStage,
      type: 'vulnerability',
      severity: report.severity,
      cvssScore: report.cvssScore,
      cwe: report.cwe,
      target: report.target,
      reportId: report.id,
      report,
      description: report.summary,
      impact: report.businessImpact,
      remediation: report.remediation,
      mitreTactic,
      mitreTechnique,
    };
    nodesMap.set(vulnNodeId, vulnNode);

    // Link Entry Point to Vulnerability
    links.push({
      id: `link-entry-${vulnNodeId}`,
      source: targetEntryId,
      target: vulnNodeId,
      label: `Exploração de ${report.vulnerabilityType}`,
      riskLevel: report.severity === 'CRITICAL' ? 'CRITICAL' : report.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      requiresAuth: report.cvssVector.includes('PR:L') || report.cvssVector.includes('PR:H'),
      exploitVector: report.stepsToReproduce?.[0] || 'Injeção de payload malicioso via HTTP',
    });

    // Create Stage 3: Lateral Movement / Pivot node based on the report
    let pivotId = `pivot-generic-${report.target.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let pivotLabel = 'Barramento Interno de Serviços (VPC)';
    let pivotDesc = 'Segmento de rede interno ou cache compartilhado acessível após ultrapassar a camada perimetral.';
    let pivotMitre = 'T1557: Adversary-in-the-Middle / Pivoting';

    if (typeUpper.includes('SSRF') || titleUpper.includes('METADATA') || titleUpper.includes('IMDS')) {
      pivotId = 'pivot-cloud-metadata';
      pivotLabel = 'AWS/GCP Cloud Metadata (169.254.169.254)';
      pivotDesc = 'Instância do serviço de metadados da infraestrutura de nuvem com credenciais temporárias do IAM Worker Role.';
      pivotMitre = 'T1552.005: Cloud Instance Metadata API';
    } else if (typeUpper.includes('IDOR') || typeUpper.includes('BOLA') || titleUpper.includes('INVOICE') || titleUpper.includes('BILLING')) {
      pivotId = 'pivot-db-ledger';
      pivotLabel = 'Microsserviço de Faturamento & Core DB';
      pivotDesc = 'Acesso direto não segregado aos registros de múltiplos tenants através de chaves de referência não validadas.';
      pivotMitre = 'T1005: Data from Local System';
    } else if (typeUpper.includes('XSS') || typeUpper.includes('CSRF') || typeUpper.includes('TOKEN')) {
      pivotId = 'pivot-admin-session';
      pivotLabel = 'Sessão / Token de Administrador';
      pivotDesc = 'Captura de credencial de usuário privilegiado permitindo execução de rotinas administrativas autenticadas.';
      pivotMitre = 'T1539: Steal Web Session Cookie';
    } else if (typeUpper.includes('RCE') || typeUpper.includes('INJECTION')) {
      pivotId = 'pivot-host-shell';
      pivotLabel = 'Execução de Comandos no Container/Host';
      pivotDesc = 'Shell interativo ou execução remota de código no container de backend com acesso à rede local do cluster.';
      pivotMitre = 'T1059: Command and Scripting Interpreter';
    }

    let pivotNode = nodesMap.get(pivotId);
    if (!pivotNode) {
      pivotNode = {
        id: pivotId,
        label: pivotLabel,
        sublabel: 'Ponto de Salto Interno (Pivoting)',
        stage: 'lateral_movement',
        type: 'pivot',
        description: pivotDesc,
        mitreTactic: 'TA0008: Lateral Movement',
        mitreTechnique: pivotMitre,
        chokePoint: true,
      };
      nodesMap.set(pivotId, pivotNode);
    } else {
      // Mark as choke point since multiple vulnerabilities route through here
      pivotNode.chokePoint = true;
    }

    // Link Vulnerability to Pivot
    links.push({
      id: `link-vuln-${vulnNodeId}-${pivotId}`,
      source: vulnNodeId,
      target: pivotId,
      label: 'Salto Lateral / Elevação',
      riskLevel: report.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      exploitVector: 'Reutilização de privilégios e consulta a interfaces internas',
    });

    // Create Stage 4: Final Objective / Crown Jewel node
    let objectiveId = 'obj-data-exfiltration';
    let objectiveLabel = 'Vazamento Massivo de Dados PII & Faturas';
    let objectiveDesc = 'Extração de informações confidenciais de clientes, violação direta de LGPD/GDPR e impacto financeiro regulatório.';
    let objectiveMitre = 'T1048: Exfiltration Over Alternative Protocol';

    if (pivotId === 'pivot-cloud-metadata') {
      objectiveId = 'obj-cloud-takeover';
      objectiveLabel = 'Comprometimento Total do Cluster Cloud & S3';
      objectiveDesc = 'Uso das credenciais IAM para listar e clonar buckets S3 restritos, acessar secrets managers e comprometer o cluster de produção.';
      objectiveMitre = 'T1530: Data from Cloud Storage Object';
    } else if (typeUpper.includes('IDOR') || typeUpper.includes('BOLA')) {
      objectiveId = 'obj-financial-records';
      objectiveLabel = 'Exfiltração de Faturas e Cartões de Clientes';
      objectiveDesc = 'Download irrestrito de contratos corporativos, dados bancários e últimas cifras de cartões de milhares de tenants.';
      objectiveMitre = 'T1565: Data Manipulation & Stealing';
    } else if (typeUpper.includes('RACE CONDITION') || titleUpper.includes('BOUNTY') || titleUpper.includes('COUPON') || titleUpper.includes('BALANCE')) {
      objectiveId = 'obj-financial-drain';
      objectiveLabel = 'Fraude Financeira Direta / Double-Spending';
      objectiveDesc = 'Desvio sistemático de créditos de conta, evasão de liquidação financeira e dano patrimonial direto.';
      objectiveMitre = 'T1499: Endpoint Denial of Service / Financial Impact';
    } else if (pivotId === 'pivot-admin-session') {
      objectiveId = 'obj-full-account-takeover';
      objectiveLabel = 'Takeover Completo de Contas Master';
      objectiveDesc = 'Domínio irrestrito sobre configurações globais, exclusão de usuários e alteração de regras de roteamento.';
      objectiveMitre = 'T1078.004: Cloud Accounts Takeover';
    }

    let objectiveNode = nodesMap.get(objectiveId);
    if (!objectiveNode) {
      objectiveNode = {
        id: objectiveId,
        label: objectiveLabel,
        sublabel: 'Crown Jewels / Impacto no Negócio',
        stage: 'final_objective',
        type: 'crown_jewel',
        description: objectiveDesc,
        impact: report.businessImpact || 'Impacto crítico na confidencialidade, integridade e conformidade jurídica.',
        mitreTactic: 'TA0040: Impact',
        mitreTechnique: objectiveMitre,
        chokePoint: true,
      };
      nodesMap.set(objectiveId, objectiveNode);
    }

    // Link Pivot to Final Objective
    const pivotToObjLinkId = `link-pivot-${pivotId}-${objectiveId}`;
    if (!links.some(l => l.id === pivotToObjLinkId)) {
      links.push({
        id: pivotToObjLinkId,
        source: pivotId,
        target: objectiveId,
        label: 'Acesso Irrestrito / Exfiltração',
        riskLevel: 'CRITICAL',
        exploitVector: 'Dump de banco de dados e execução de ações destrutivas',
      });
    }
  });

  // Synthesize Attack Scenarios for the interactive walkthrough
  const scenarios: AttackPathScenario[] = [];

  // 1. Cloud Infrastructure Takeover Scenario (if SSRF or Cloud related)
  const ssrfReport = reports.find(r => r.vulnerabilityType.toUpperCase().includes('SSRF') || r.title.toUpperCase().includes('SSRF'));
  if (ssrfReport) {
    const targetEntryId = `entry-${(ssrfReport.target || 'api.target.com').replace(/[^a-zA-Z0-9]/g, '_')}`;
    scenarios.push({
      id: 'scenario-cloud-pivoting',
      name: 'Pivoting em Nuvem via Blind SSRF & IMDSv1',
      description: 'Cadeia completa partindo do webhook público até o sequestro de credenciais temporárias do IAM Worker Role na AWS.',
      threatActor: 'Hacker Externo Não Autenticado',
      crownJewelTarget: 'Cluster Cloud & Buckets S3 Privados',
      nodeIds: [
        'actor-external',
        targetEntryId,
        `vuln-${ssrfReport.id}`,
        'pivot-cloud-metadata',
        'obj-cloud-takeover'
      ].filter(id => nodesMap.has(id)),
      maxCvss: ssrfReport.cvssScore,
      stagesCount: 4,
    });
  }

  // 2. Financial BOLA/IDOR Mass Extraction Scenario
  const idorReport = reports.find(r => r.vulnerabilityType.toUpperCase().includes('IDOR') || r.vulnerabilityType.toUpperCase().includes('BOLA'));
  if (idorReport) {
    const targetEntryId = `entry-${(idorReport.target || 'api.target.com').replace(/[^a-zA-Z0-9]/g, '_')}`;
    scenarios.push({
      id: 'scenario-mass-financial-exfiltration',
      name: 'Vazamento Massivo Multi-Tenant via BOLA/IDOR',
      description: 'Exploração de controle de acesso quebrado para iterar sobre identificadores numéricos de faturas e vazar dados financeiros de múltiplos clientes.',
      threatActor: 'Usuário Autenticado Malicioso (Tenant B)',
      crownJewelTarget: 'Faturamento Corporativo & Dados de Cartão',
      nodeIds: [
        'actor-external',
        targetEntryId,
        `vuln-${idorReport.id}`,
        'pivot-db-ledger',
        'obj-financial-records'
      ].filter(id => nodesMap.has(id)),
      maxCvss: idorReport.cvssScore,
      stagesCount: 4,
    });
  }

  // 3. High Severity / Highest CVSS Fallback Scenario
  const topReport = [...reports].sort((a, b) => b.cvssScore - a.cvssScore)[0];
  if (topReport && !scenarios.some(s => s.nodeIds.includes(`vuln-${topReport.id}`))) {
    const targetEntryId = `entry-${(topReport.target || 'api.target.com').replace(/[^a-zA-Z0-9]/g, '_')}`;
    const linkedPivot = links.find(l => (typeof l.source === 'string' ? l.source : l.source.id) === `vuln-${topReport.id}`);
    const pivotId = linkedPivot ? (typeof linkedPivot.target === 'string' ? linkedPivot.target : linkedPivot.target.id) : 'pivot-db-ledger';
    const linkedObj = links.find(l => (typeof l.source === 'string' ? l.source : l.source.id) === pivotId);
    const objId = linkedObj ? (typeof linkedObj.target === 'string' ? linkedObj.target : linkedObj.target.id) : 'obj-data-exfiltration';

    scenarios.push({
      id: 'scenario-critical-exploit-chain',
      name: `Cadeia Crítica: ${topReport.vulnerabilityType} (${topReport.id})`,
      description: `Caminho de exploração com base no achado de maior severidade técnica do programa (${topReport.title}).`,
      threatActor: 'Atacante Externo',
      crownJewelTarget: nodesMap.get(objId)?.label || 'Ativos Críticos do Negócio',
      nodeIds: [
        'actor-external',
        targetEntryId,
        `vuln-${topReport.id}`,
        pivotId,
        objId
      ].filter(id => nodesMap.has(id)),
      maxCvss: topReport.cvssScore,
      stagesCount: 4,
    });
  }

  return {
    nodes: Array.from(nodesMap.values()),
    links,
    scenarios,
  };
}
