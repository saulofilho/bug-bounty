import { VulnerabilityReport, Severity, ReportStatus, PlatformName } from '../types';

export interface CsvParseResult {
  reports: VulnerabilityReport[];
  warnings: string[];
  errors: string[];
  totalRowsParsed: number;
}

/**
 * Robust RFC 4180 compliant CSV Parser
 * Handles quotes, commas inside fields, multiline cells, escaped quotes ("")
 * and auto-detects delimiter (, or ; or \t)
 */
export function parseCsvContent(rawCsv: string): string[][] {
  // Strip UTF-8 BOM if present
  let text = rawCsv.replace(/^\uFEFF/, '');
  if (!text.trim()) return [];

  // Determine delimiter by looking at first non-empty line
  const firstLine = text.split(/\r?\n/).find(line => line.trim().length > 0) || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i += 2;
        } else {
          i++;
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  // Push final cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter(row => row.some(cell => cell.length > 0));
}

/**
 * Normalizes header names for flexible fuzzy matching across tools
 * (e.g. "Vulnerability Title", "vuln_title", "Title" -> "title")
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Severity mapper with fallback to MEDIUM
 */
export function parseSeverity(raw: string): Severity {
  const norm = raw.toUpperCase().trim();
  if (norm.includes('CRIT') || norm === 'P1') return 'CRITICAL';
  if (norm.includes('HIGH') || norm === 'P2') return 'HIGH';
  if (norm.includes('MED') || norm === 'P3') return 'MEDIUM';
  if (norm.includes('LOW') || norm === 'P4') return 'LOW';
  if (norm.includes('INFO') || norm.includes('NONE') || norm === 'P5') return 'INFO';
  return 'MEDIUM';
}

/**
 * Status mapper with fallback to TRIAGED or DRAFT
 */
export function parseStatus(raw: string): ReportStatus {
  const norm = raw.toUpperCase().trim();
  if (norm.includes('DRAFT') || norm.includes('RASCUNHO')) return 'DRAFT';
  if (norm.includes('SUBMIT') || norm.includes('NEW') || norm.includes('NOVO')) return 'SUBMITTED';
  if (norm.includes('TRIAG') || norm.includes('VAL')) return 'TRIAGED';
  if (norm.includes('REWARD') || norm.includes('PAID') || norm.includes('PAGO') || norm.includes('BOUNTY')) return 'REWARDED';
  if (norm.includes('RESOLV') || norm.includes('FIX') || norm.includes('CORRIGIDO')) return 'RESOLVED';
  if (norm.includes('DUP') || norm.includes('DUPLICADO')) return 'DUPLICATE';
  if (norm.includes('OUT') || norm.includes('SCOPE') || norm.includes('NA') || norm.includes('INFORM') || norm.includes('FORA')) return 'OUT_OF_SCOPE';
  return 'TRIAGED';
}

/**
 * Platform mapper with fallback to Direct / VDP
 */
export function parsePlatform(raw: string): PlatformName {
  const norm = raw.toLowerCase().trim();
  if (norm.includes('hackerone') || norm === 'h1') return 'HackerOne';
  if (norm.includes('bugcrowd') || norm === 'bc') return 'Bugcrowd';
  if (norm.includes('intigriti')) return 'Intigriti';
  if (norm.includes('yeswehack') || norm === 'ywh') return 'YesWeHack';
  if (norm.includes('synack')) return 'Synack';
  return 'Direct / VDP';
}

/**
 * Parses numeric bounty amount from string with currency symbols ($1,500.00 -> 1500)
 */
export function parseBountyAmount(raw: string): number {
  if (!raw) return 0;
  // Remove non-numeric chars except dot and comma
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return 0;

  // Handle European/Brazilian format: 1.500,00 -> 1500.00
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } else if (cleaned.includes(',')) {
    // Check if comma is decimal or thousands
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    return parseFloat(cleaned.replace(',', '')) || 0;
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Parses CVSS score and calculates reasonable score if only vector is provided
 */
export function parseCvssScore(rawScore: string, rawVector?: string): { score: number; vector: string } {
  let score = parseFloat(rawScore);
  let vector = rawVector ? rawVector.trim() : '';

  if (isNaN(score) || score < 0 || score > 10) {
    score = 7.5; // Reasonable default
  }

  if (!vector || !vector.startsWith('CVSS:3.')) {
    vector = `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`;
  }

  return { score: Number(score.toFixed(1)), vector };
}

/**
 * Parses a list of steps from a text block
 */
export function parseSteps(raw: string): string[] {
  if (!raw) return ['Identificar o endpoint afetado na aplicação.', 'Reproduzir a requisição com payload específico.', 'Confirmar a execução e impacto nos dados.'];
  
  // Split by numbered steps (1., 2., 1), etc) or newlines
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 1) {
    return lines.map(l => l.replace(/^\d+[\.\)]\s*/, ''));
  }

  // Split by semicolons
  if (raw.includes(';')) {
    return raw.split(';').map(s => s.trim()).filter(s => s.length > 0);
  }

  return [raw.trim()];
}

/**
 * Main function to parse CSV into VulnerabilityReport array
 */
export function parseVulnerabilityReportsFromCsv(csvText: string): CsvParseResult {
  const rows = parseCsvContent(csvText);
  const warnings: string[] = [];
  const errors: string[] = [];
  const reports: VulnerabilityReport[] = [];

  if (rows.length < 2) {
    errors.push('O arquivo CSV está vazio ou contém apenas a linha de cabeçalho.');
    return { reports: [], warnings, errors, totalRowsParsed: 0 };
  }

  const headerRow = rows[0];
  const colMap = new Map<string, number>();

  headerRow.forEach((col, idx) => {
    colMap.set(normalizeKey(col), idx);
  });

  // Helper to find column index by multiple synonyms
  const findCol = (...synonyms: string[]): number | undefined => {
    for (const syn of synonyms) {
      const norm = normalizeKey(syn);
      if (colMap.has(norm)) {
        return colMap.get(norm);
      }
    }
    // Partial inclusion match
    for (const [key, idx] of colMap.entries()) {
      for (const syn of synonyms) {
        const norm = normalizeKey(syn);
        if (key.includes(norm) || norm.includes(key)) {
          return idx;
        }
      }
    }
    return undefined;
  };

  // Map common column indexes
  const titleIdx = findCol('title', 'vulnerability', 'name', 'summary', 'issue', 'heading');
  const targetIdx = findCol('target', 'program', 'asset', 'scope', 'domain', 'host');
  const platformIdx = findCol('platform', 'source', 'portal', 'programplatform');
  const vulnTypeIdx = findCol('vulnerabilitytype', 'vulntype', 'type', 'category', 'class');
  const severityIdx = findCol('severity', 'priority', 'rating', 'sev');
  const statusIdx = findCol('status', 'state', 'reportstatus', 'disposition');
  const cvssScoreIdx = findCol('cvssscore', 'cvss', 'score');
  const cvssVectorIdx = findCol('cvssvector', 'vector');
  const cweIdx = findCol('cwe', 'cweid');
  const cveIdx = findCol('cve', 'cves', 'cveid', 'cveids');
  const summaryIdx = findCol('summary', 'description', 'details', 'overview');
  const stepsIdx = findCol('stepstoreproduce', 'steps', 'reproductionsteps', 'repro');
  const pocIdx = findCol('proofofconcept', 'poc', 'exploit', 'payload', 'poccode');
  const impactIdx = findCol('businessimpact', 'impact', 'consequence');
  const remediationIdx = findCol('remediation', 'recommendation', 'solution', 'fix', 'mitigation');
  const bountyIdx = findCol('bountyamount', 'bounty', 'reward', 'payout', 'amount');
  const currencyIdx = findCol('currency', 'moeda');
  const submissionIdIdx = findCol('submissionid', 'reportid', 'id', 'h1id', 'bugcrowdid');
  const submissionUrlIdx = findCol('submissionurl', 'url', 'link', 'reporturl');
  const dateIdx = findCol('createdat', 'date', 'submittedat', 'timestamp', 'created');
  const tagsIdx = findCol('tags', 'labels', 'categories', 'tag');

  if (titleIdx === undefined && summaryIdx === undefined) {
    errors.push('Não foi possível identificar a coluna de título do relatório (ex: "title", "vulnerability", "name").');
    return { reports: [], warnings, errors, totalRowsParsed: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
      continue; // skip blank line
    }

    const getVal = (idx?: number): string => {
      if (idx === undefined || idx >= row.length) return '';
      return row[idx] || '';
    };

    const title = getVal(titleIdx) || getVal(summaryIdx).slice(0, 70) || `Relatório Importado #${r}`;
    const target = getVal(targetIdx) || 'Target Desconhecido';
    const platform = parsePlatform(getVal(platformIdx));
    const vulnerabilityType = getVal(vulnTypeIdx) || 'Vulnerabilidade Web';
    const severity = parseSeverity(getVal(severityIdx));
    const status = parseStatus(getVal(statusIdx));
    const { score: cvssScore, vector: cvssVector } = parseCvssScore(getVal(cvssScoreIdx), getVal(cvssVectorIdx));
    const cwe = getVal(cweIdx) || 'CWE-200';
    
    // Parse CVEs
    const rawCves = getVal(cveIdx);
    const cveIds = rawCves 
      ? rawCves.split(/[,;\s]+/).map(c => c.trim()).filter(c => /^CVE-\d{4}-\d{4,}$/i.test(c))
      : [];

    const summary = getVal(summaryIdx) || `Relatório importado de ${platform} referente ao alvo ${target}.`;
    const stepsToReproduce = parseSteps(getVal(stepsIdx));
    const proofOfConcept = getVal(pocIdx) || '// PoC não especificada no arquivo CSV.';
    const businessImpact = getVal(impactIdx) || 'Impacto não informado no registro CSV original.';
    const remediation = getVal(remediationIdx) || 'Aplicar validação rigorosa de entrada e controle de acessos em conformidade com as diretrizes do OWASP Top 10.';
    const bountyAmount = parseBountyAmount(getVal(bountyIdx));
    const rawCurrency = getVal(currencyIdx).toUpperCase();
    const currency: 'USD' | 'BRL' = rawCurrency.includes('BRL') || rawCurrency.includes('R$') ? 'BRL' : 'USD';
    const submissionId = getVal(submissionIdIdx) || `#IMP-${Math.floor(100000 + Math.random() * 900000)}`;
    const submissionUrl = getVal(submissionUrlIdx) || undefined;
    
    // Parse Date
    let createdAt = getVal(dateIdx);
    if (!createdAt || isNaN(Date.parse(createdAt))) {
      createdAt = todayStr;
    } else {
      createdAt = new Date(createdAt).toISOString().split('T')[0];
    }

    // Parse Tags
    const rawTags = getVal(tagsIdx);
    const tags = rawTags
      ? rawTags.split(/[,;]+/).map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`).filter(t => t.length > 1)
      : [];

    const id = `rep-import-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`;

    const report: VulnerabilityReport = {
      id,
      title,
      target,
      platform,
      vulnerabilityType,
      severity,
      status,
      cvssScore,
      cvssVector,
      cwe,
      cveIds,
      summary,
      stepsToReproduce,
      proofOfConcept,
      businessImpact,
      remediation,
      bountyAmount,
      currency,
      submissionId,
      submissionUrl,
      createdAt,
      updatedAt: todayStr,
      tags,
      timeline: [
        {
          id: `tl-${Date.now()}-${r}`,
          date: createdAt,
          title: `Importado via migração CSV (${platform})`,
          notes: `Relatório importado automaticamente a partir de exportação CSV. Identificador original: ${submissionId}`,
          type: 'creation'
        }
      ]
    };

    reports.push(report);
  }

  if (reports.length === 0) {
    errors.push('Nenhuma linha de relatório válida pôde ser extraída do arquivo CSV.');
  }

  return {
    reports,
    warnings,
    errors,
    totalRowsParsed: rows.length - 1
  };
}

/**
 * Generates ready-to-fill sample CSV template content with standard bug bounty headers
 */
export function generateSampleCsvTemplate(): string {
  const headers = [
    'title',
    'target',
    'platform',
    'vulnerability_type',
    'severity',
    'status',
    'cvss_score',
    'cvss_vector',
    'cwe',
    'cve_ids',
    'bounty_amount',
    'currency',
    'summary',
    'steps_to_reproduce',
    'proof_of_concept',
    'business_impact',
    'remediation',
    'submission_id',
    'created_at',
    'tags'
  ];

  const sampleRows = [
    [
      '"IDOR no endpoint de visualização de perfil corporativo"',
      '"api.targetcorp.com"',
      '"HackerOne"',
      '"Insecure Direct Object Reference (IDOR)"',
      '"HIGH"',
      '"REWARDED"',
      '8.6',
      '"CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N"',
      '"CWE-639"',
      '""',
      '2500',
      '"USD"',
      '"Possibilidade de ler dados de outros usuários alterando o parâmetro user_id na API REST."',
      '"1. Autenticar como user A\n2. Enviar GET /v1/user/1023\n3. Alterar user_id para 1024 e receber dados restritos do user B"',
      '"GET /api/v1/users/1024 HTTP/1.1\nHost: api.targetcorp.com\nAuthorization: Bearer <TOKEN_USER_A>"',
      '"Vazamento massivo de PII e documentos de identidade corporativos."',
      '"Implementar autorização no nível do objeto (ABAC/RBAC) no middleware de roteamento."',
      '"#H1-892104"',
      '"2026-08-10"',
      '"#idor,#api,#bounty"'
    ],
    [
      '"SQL Injection cego baseado em tempo no portal de parceiros"',
      '"partners.fintech-sec.io"',
      '"Bugcrowd"',
      '"SQL Injection (Blind)"',
      '"CRITICAL"',
      '"TRIAGED"',
      '9.8',
      '"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"',
      '"CWE-89"',
      '"CVE-2024-3400"',
      '5000',
      '"USD"',
      '"Parâmetro partner_token vulnerável a injeção SQL em consultas PostgreSQL."',
      '"1. Acessar endpoint /partner/auth\n2. Injetar payload PG_SLEEP(5)\n3. Constatar atraso determinístico na resposta HTTP"',
      '"POST /partner/auth HTTP/1.1\nHost: partners.fintech-sec.io\nContent-Type: application/json\n\n{\\"partner_token\\": \\"1\' UNION SELECT pg_sleep(5)--\\"}"',
      '"Acesso irrestrito a dados bancários e possibilidade de RCE via extensões postgres."',
      '"Utilizar consultas preparadas parametrizadas (Prepared Statements) e ORM seguro."',
      '"#BC-44912"',
      '"2026-09-02"',
      '"#sqli,#critical,#financial"'
    ],
    [
      '"Armazenamento inseguro de tokens JWT em LocalStorage com XSS DOM"',
      '"app.cloudpay.com.br"',
      '"Intigriti"',
      '"Cross-Site Scripting (DOM XSS)"',
      '"MEDIUM"',
      '"RESOLVED"',
      '6.1',
      '"CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"',
      '"CWE-79"',
      '""',
      '800',
      '"USD"',
      '"Vulnerabilidade de XSS baseado em DOM permite extração do token de autenticação de sessão."',
      '"1. Enviar URL com parâmetro hash malicioso\n2. Vítima clica no link e script arbitrário é executado no contexto da origem"',
      '"https://app.cloudpay.com.br/dashboard#theme=\\"/><svg/onload=alert(document.domain)>"',
      '"Comprometimento de contas de usuários finais por meio de spear-phishing."',
      '"Sanitizar adequadamente valores lidos de window.location e utilizar cookies HttpOnly SameSite=Strict."',
      '"#INT-90182"',
      '"2026-08-25"',
      '"#xss,#dom,#frontend"'
    ]
  ];

  return [
    headers.join(','),
    ...sampleRows.map(r => r.join(','))
  ].join('\n');
}

/**
 * Triggers download of sample CSV template
 */
export function downloadSampleCsvTemplate(): void {
  const csvContent = generateSampleCsvTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bugsentinel_template_import_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports current reports to CSV
 */
export function exportReportsToCsv(reports: VulnerabilityReport[]): void {
  const headers = [
    'id',
    'title',
    'target',
    'platform',
    'vulnerability_type',
    'severity',
    'status',
    'cvss_score',
    'cvss_vector',
    'cwe',
    'cve_ids',
    'bounty_amount',
    'currency',
    'summary',
    'steps_to_reproduce',
    'proof_of_concept',
    'business_impact',
    'remediation',
    'submission_id',
    'created_at',
    'tags'
  ];

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = reports.map(r => [
    escapeCsv(r.id),
    escapeCsv(r.title),
    escapeCsv(r.target),
    escapeCsv(r.platform),
    escapeCsv(r.vulnerabilityType),
    escapeCsv(r.severity),
    escapeCsv(r.status),
    r.cvssScore,
    escapeCsv(r.cvssVector),
    escapeCsv(r.cwe),
    escapeCsv(r.cveIds.join('; ')),
    r.bountyAmount || 0,
    escapeCsv(r.currency),
    escapeCsv(r.summary),
    escapeCsv(r.stepsToReproduce.join('\n')),
    escapeCsv(r.proofOfConcept),
    escapeCsv(r.businessImpact),
    escapeCsv(r.remediation),
    escapeCsv(r.submissionId || ''),
    escapeCsv(r.createdAt),
    escapeCsv((r.tags || []).join('; '))
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bugsentinel_reports_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
