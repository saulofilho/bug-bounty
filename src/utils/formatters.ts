import { VulnerabilityReport, Severity, ReportStatus } from '../types';

export function formatCurrency(amount: number, currency: 'USD' | 'BRL' = 'USD'): string {
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

export function getSeverityBadgeColor(severity: Severity): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'CRITICAL':
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
    case 'HIGH':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
    case 'MEDIUM':
      return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
    case 'LOW':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'INFO':
    default:
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
  }
}

export function getStatusBadgeColor(status: ReportStatus): { bg: string; text: string; border: string; label: string; dot: string } {
  switch (status) {
    case 'REWARDED':
      return { 
        bg: 'bg-emerald-500/15', 
        text: 'text-emerald-400', 
        border: 'border-emerald-500/30', 
        dot: 'bg-emerald-400', 
        label: 'Recompensado ($)' 
      };
    case 'TRIAGED':
      return { 
        bg: 'bg-blue-500/15', 
        text: 'text-blue-400', 
        border: 'border-blue-500/30', 
        dot: 'bg-blue-400', 
        label: 'Em Triagem' 
      };
    case 'DRAFT':
      return { 
        bg: 'bg-zinc-800/80', 
        text: 'text-zinc-400', 
        border: 'border-zinc-700/60', 
        dot: 'bg-zinc-500', 
        label: 'Rascunho' 
      };
    case 'SUBMITTED':
      return { 
        bg: 'bg-cyan-500/15', 
        text: 'text-cyan-400', 
        border: 'border-cyan-500/30', 
        dot: 'bg-cyan-400', 
        label: 'Enviado' 
      };
    case 'RESOLVED':
      return { 
        bg: 'bg-teal-500/15', 
        text: 'text-teal-300', 
        border: 'border-teal-500/30', 
        dot: 'bg-teal-400', 
        label: 'Resolvido' 
      };
    case 'DUPLICATE':
      return { 
        bg: 'bg-amber-950/25', 
        text: 'text-amber-400', 
        border: 'border-amber-800/40', 
        dot: 'bg-amber-500', 
        label: 'Duplicado' 
      };
    case 'OUT_OF_SCOPE':
      return { 
        bg: 'bg-rose-500/15', 
        text: 'text-rose-400', 
        border: 'border-rose-500/30', 
        dot: 'bg-rose-400', 
        label: 'Fora de Escopo' 
      };
    default:
      return { 
        bg: 'bg-zinc-800/80', 
        text: 'text-zinc-400', 
        border: 'border-zinc-700/60', 
        dot: 'bg-zinc-500', 
        label: status || 'Desconhecido' 
      };
  }
}

export function generateMarkdownForPlatform(report: VulnerabilityReport, platformTarget: 'HackerOne' | 'Bugcrowd' | 'Intigriti' | 'General' = 'General'): string {
  const stepsText = report.stepsToReproduce.map((s, idx) => `${idx + 1}. ${s.replace(/^\d+\.\s*/, '')}`).join('\n');
  const cveNotice = report.cveIds.length > 0 ? `**CVEs Relacionados:** ${report.cveIds.join(', ')}\n` : '';

  if (platformTarget === 'HackerOne') {
    return `## Summary:
${report.summary}

## Vulnerability Details:
- **Asset/Target:** ${report.target}
- **Vulnerability Type:** ${report.vulnerabilityType}
- **Severity / CVSS:** ${report.severity} (${report.cvssScore}) - \`${report.cvssVector}\`
- **Weakness (CWE):** ${report.cwe}
${cveNotice}
## Steps To Reproduce:
${stepsText}

## Proof of Concept:
\`\`\`http
${report.proofOfConcept}
\`\`\`

## Business Impact:
${report.businessImpact}

## Remediation / Suggested Mitigation:
${report.remediation}
`;
  }

  if (platformTarget === 'Bugcrowd') {
    return `### Vulnerability Name
${report.title}

### Target and URL
${report.target}

### VRT / Category
${report.vulnerabilityType} (${report.cwe})

### Description & Background
${report.summary}

### Steps to Reproduce
${stepsText}

### Proof of Concept
\`\`\`
${report.proofOfConcept}
\`\`\`

### Impact Assessment
${report.businessImpact}

### Suggested Fix
${report.remediation}
`;
  }

  // Default / Intigriti / General
  return `# [${report.severity}] ${report.title}

**Alvo:** ${report.target}  
**Plataforma:** ${report.platform}  
**CVSS 3.1:** ${report.cvssScore} (\`${report.cvssVector}\`)  
**CWE:** ${report.cwe}  
${cveNotice}
---

### 1. Resumo Executivo
${report.summary}

### 2. Passos para Reproduzir
${stepsText}

### 3. Prova de Conceito (PoC)
\`\`\`http
${report.proofOfConcept}
\`\`\`

### 4. Impacto no Negócio
${report.businessImpact}

### 5. Recomendação de Remediação
${report.remediation}
`;
}

/**
 * Formats a report timestamp into a relative timestamp counter
 * e.g., 'Created 2h ago', 'Created 15m ago', 'Created 3d ago', 'Created just now'
 */
export function formatRelativeTimeAgo(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'Created recently';

  let timestamp: number;
  if (typeof dateInput === 'number') {
    timestamp = dateInput;
  } else if (dateInput instanceof Date) {
    timestamp = dateInput.getTime();
  } else {
    const parsed = Date.parse(dateInput);
    if (isNaN(parsed)) return 'Created recently';
    timestamp = parsed;
  }

  const now = Date.now();
  const elapsedMs = now - timestamp;

  // Clock skew or less than 1 minute
  if (elapsedMs < 60 * 1000) {
    return 'Created just now';
  }

  const minutes = Math.floor(elapsedMs / (60 * 1000));
  if (minutes < 60) {
    return `Created ${minutes}m ago`;
  }

  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `Created ${hours}h ago`;
  }

  const days = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  if (days < 30) {
    return `Created ${days}d ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Created ${months}mo ago`;
  }

  const years = Math.floor(days / 365);
  return `Created ${years}y ago`;
}

export interface ImpactCategoryTag {
  label: 'Remote' | 'Auth' | 'Physical' | 'Local' | 'Cloud';
  bg: string;
  text: string;
  border: string;
  dotColor: string;
}

/**
 * Derives a standardized, color-coded impact category tag (e.g. Remote, Auth, Physical, Local, Cloud)
 * from CVSS Attack Vector and vulnerability classification.
 */
export function getImpactCategoryTag(data?: {
  cvssVector?: string;
  vulnerabilityType?: string;
  title?: string;
  cwe?: string;
  tags?: string[];
  businessImpact?: string;
}): ImpactCategoryTag {
  if (!data) {
    return {
      label: 'Remote',
      bg: 'bg-cyan-950/80',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
      dotColor: 'bg-cyan-400'
    };
  }

  const cvss = (data.cvssVector || '').toUpperCase();
  const text = `${data.vulnerabilityType || ''} ${data.title || ''} ${data.cwe || ''} ${(data.tags || []).join(' ')} ${data.businessImpact || ''}`.toLowerCase();

  // 1. Physical Vector
  if (
    cvss.includes('AV:P') || 
    text.includes('physical') || 
    text.includes('hardware') || 
    text.includes('kiosk') || 
    text.includes('usb') || 
    text.includes('smartcard') || 
    text.includes('tamper')
  ) {
    return {
      label: 'Physical',
      bg: 'bg-orange-950/80',
      text: 'text-orange-300',
      border: 'border-orange-500/40',
      dotColor: 'bg-orange-400'
    };
  }

  // 2. Auth / Access Control / Authorization
  if (
    text.includes('auth') ||
    text.includes('idor') ||
    text.includes('bola') ||
    text.includes('bypass') ||
    text.includes('permission') ||
    text.includes('privilege') ||
    text.includes('session') ||
    text.includes('token') ||
    text.includes('jwt') ||
    text.includes('credential') ||
    text.includes('broken access') ||
    text.includes('cwe-287') ||
    text.includes('cwe-306') ||
    text.includes('cwe-862') ||
    text.includes('cwe-863') ||
    text.includes('cwe-639')
  ) {
    return {
      label: 'Auth',
      bg: 'bg-amber-950/80',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
      dotColor: 'bg-amber-400'
    };
  }

  // 3. Local Vector
  if (cvss.includes('AV:L') || text.includes('local privilege') || text.includes('local file')) {
    return {
      label: 'Local',
      bg: 'bg-indigo-950/80',
      text: 'text-indigo-300',
      border: 'border-indigo-500/40',
      dotColor: 'bg-indigo-400'
    };
  }

  // 4. Cloud Vector
  if (
    text.includes('cloud') || 
    text.includes('aws') || 
    text.includes('s3') || 
    text.includes('gcp') || 
    text.includes('azure') || 
    text.includes('imds') || 
    text.includes('kubernetes')
  ) {
    return {
      label: 'Cloud',
      bg: 'bg-sky-950/80',
      text: 'text-sky-300',
      border: 'border-sky-500/40',
      dotColor: 'bg-sky-400'
    };
  }

  // 5. Default / Remote / Network Vector
  return {
    label: 'Remote',
    bg: 'bg-cyan-950/80',
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    dotColor: 'bg-cyan-400'
  };
}
