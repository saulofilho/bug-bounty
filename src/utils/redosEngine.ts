export interface ReDosPatternFinding {
  type: 'EXPONENTIAL' | 'POLYNOMIAL' | 'SAFE' | 'UNKNOWN';
  severity: 'CRITICAL' | 'HIGH' | 'LOW';
  cvssScore: number;
  description: string;
  matchedPattern?: string;
  vulnerableSnippet?: string;
  evilPayloadGenerator: (length: number) => string;
  remediationSnippet: string;
}

export interface ReDosBenchmarkStep {
  inputLength: number;
  timeMs: number;
  stepCount: number;
  status: 'FAST' | 'DEGRADED' | 'TIMEOUT_RISK';
}

export interface ReDosAuditReport {
  regexString: string;
  flags: string;
  finding: ReDosPatternFinding;
  benchmarkSteps: ReDosBenchmarkStep[];
  recommendedRegex: string;
  cwe: string;
  summary: string;
}

/**
 * Common ReDoS Vulnerability Signatures
 */
export const KNOWN_REDOS_PATTERNS = [
  {
    name: 'Nested Repetition (Evil Grouping)',
    regexTest: /\([^)]*(\+|\*)[^)]*\)(\+|\*)/,
    type: 'EXPONENTIAL' as const,
    severity: 'CRITICAL' as const,
    cvssScore: 7.5,
    description: 'Agrupamento contendo quantificadores repetitivos aninhados (ex: `(a+)+` ou `([a-z]+)*`). Causa explosão combinatória exponencial em strings que quase batem mas falham no final.',
    evilPrefix: 'a',
    evilSuffix: '!',
    remediationGuide: 'Elimine quantificadores repetidos aninhados. Desmembre a expressão ou utilize atomic grouping / lookahead capture: `(?=(a+))\\1`.'
  },
  {
    name: 'Overlapping Alternation Repetition',
    regexTest: /\([^|)]+\|[^)]+\)(\+|\*)/,
    type: 'POLYNOMIAL' as const,
    severity: 'HIGH' as const,
    cvssScore: 6.5,
    description: 'Alternância de ramos concorrentes com quantificador repetido (ex: `(a|aa)+$`). O motor testa todas as combinações de 1 vs 2 caracteres.',
    evilPrefix: 'a',
    evilSuffix: '!',
    remediationGuide: 'Torne os ramos mutuamente exclusivos ou una prefixos comuns.'
  },
  {
    name: 'Unanchored Wildcard Runaway',
    regexTest: /.*\.\*.*(\+|\*)/,
    type: 'POLYNOMIAL' as const,
    severity: 'MEDIUM' as const,
    cvssScore: 5.3,
    description: 'Expressão sem âncora estrita (`^` ou `$`) combinada com múltiplos coringas gulosos `.*`. Gera complexidade quadrática em textos longos.',
    evilPrefix: 'xxxx',
    evilSuffix: 'yyyy',
    remediationGuide: 'Ancore a expressão com `^` e `$`, ou restrinja o conjunto de caracteres substituindo `.*` por `[^\\n\\r]+`.'
  }
];

/**
 * Analyzes a regex string for ReDoS vulnerability.
 */
export function analyzeReDosRegex(regexStr: string, flags: string = ''): ReDosAuditReport {
  const cleanRegex = regexStr.trim();
  
  // 1. Identify patterns
  let matchedFinding: ReDosPatternFinding = {
    type: 'SAFE',
    severity: 'LOW',
    cvssScore: 0.0,
    description: 'Nenhum padrão clássico de backtracking exponencial ou catastrófico foi identificado estaticamente.',
    evilPayloadGenerator: (len: number) => 'a'.repeat(len) + '!',
    remediationSnippet: cleanRegex
  };

  // Check nested repetition: e.g. (a+)+ or (\d+)*
  if (/\([^\)]*[\+\*][^\)]*\)[\+\*]/.test(cleanRegex)) {
    matchedFinding = {
      type: 'EXPONENTIAL',
      severity: 'CRITICAL',
      cvssScore: 7.5,
      description: 'Quantificador aninhado detectado: um grupo repetido contém outro quantificador guloso. Complexidade O(2^n).',
      evilPayloadGenerator: (len: number) => 'a'.repeat(len) + '!',
      remediationSnippet: cleanRegex.replace(/\(([^)]+)[\+\*]\)[\+\*]/g, '$1+')
    };
  } else if (/\([^\)\|]+\|[^\)]+\)[\+\*]/.test(cleanRegex)) {
    matchedFinding = {
      type: 'POLYNOMIAL',
      severity: 'HIGH',
      cvssScore: 6.5,
      description: 'Alternância com sobreposição dentro de repetição detectada (ex: `(x|xx)+`). Complexidade polinomial O(n^k).',
      evilPayloadGenerator: (len: number) => 'a'.repeat(len) + '!',
      remediationSnippet: cleanRegex.replace(/\(([^)\|]+)\|[^)]+\)/g, '$1')
    };
  } else if (cleanRegex.includes('.*') && cleanRegex.split('.*').length > 2) {
    matchedFinding = {
      type: 'POLYNOMIAL',
      severity: 'HIGH',
      cvssScore: 5.8,
      description: 'Múltiplos coringas gulosos `.*` em sequência sem ancoragem restritiva.',
      evilPayloadGenerator: (len: number) => 'abc_'.repeat(len) + '!',
      remediationSnippet: cleanRegex.replace(/\.\*/g, '[^\\s]+')
    };
  }

  // 2. Safe Simulation of Backtracking Cycles
  // Simulate step growth without locking the thread
  const testLengths = [10, 18, 24, 28, 32];
  const benchmarkSteps: ReDosBenchmarkStep[] = testLengths.map((len, idx) => {
    let simulatedSteps = len;
    let timeMs = 0.01;

    if (matchedFinding.type === 'EXPONENTIAL') {
      simulatedSteps = Math.min(Math.pow(2, len * 0.7), 50000000);
      timeMs = Math.min(0.001 * Math.pow(1.5, len * 0.5), 12000);
    } else if (matchedFinding.type === 'POLYNOMIAL') {
      simulatedSteps = Math.pow(len, 3);
      timeMs = (simulatedSteps / 1000) * 0.05;
    } else {
      simulatedSteps = len * 2;
      timeMs = 0.05;
    }

    return {
      inputLength: len,
      timeMs: parseFloat(timeMs.toFixed(2)),
      stepCount: Math.round(simulatedSteps),
      status: timeMs > 1000 ? 'TIMEOUT_RISK' : timeMs > 50 ? 'DEGRADED' : 'FAST'
    };
  });

  return {
    regexString: cleanRegex,
    flags,
    finding: matchedFinding,
    benchmarkSteps,
    recommendedRegex: matchedFinding.remediationSnippet || cleanRegex,
    cwe: 'CWE-1333: Inefficient Regular Expression Complexity',
    summary: matchedFinding.type === 'EXPONENTIAL' 
      ? 'Vulnerabilidade Crítica de Negação de Serviço por Regex (ReDoS). Pequenas strings de 30-40 caracteres podem congelar a thread do Node.js/Python por vários minutos.'
      : matchedFinding.type === 'POLYNOMIAL'
      ? 'Risco Alto de degradação de CPU sob carga concorrente. Recomenda-se limite de comprimento e simplificação de tokens.'
      : 'Expressão com comportamento temporal aceitável para entradas comuns.'
  };
}
