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
