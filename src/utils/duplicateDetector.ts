import { VulnerabilityReport } from '../types';

export interface DuplicateDetectionResult {
  report: VulnerabilityReport;
  overallScore: number; // 0 to 100
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  domainScore: number; // 0 to 100
  vulnTypeScore: number; // 0 to 100
  titleScore: number; // 0 to 100
  endpointScore: number; // 0 to 100
  matchReasons: string[];
  differentiationTips: string[];
  sharedDomain: string;
  sharedCategory: string;
  matchingEndpoints: string[];
}

export interface DuplicateAnalysisSummary {
  hasPotentialDuplicates: boolean;
  highestScore: number;
  highestRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  matches: DuplicateDetectionResult[];
  scannedCount: number;
  targetDomainCleaned: string;
  vulnCategoryIdentified: string;
}

// Canonical vulnerability taxonomy clusters
const VULN_TAXONOMY: Record<string, { aliases: string[]; cwes?: string[]; name: string }> = {
  idor: {
    name: 'IDOR / Broken Access Control',
    aliases: [
      'idor', 'bola', 'broken object level authorization', 'insecure direct object reference',
      'authorization bypass', 'horizontal privilege escalation', 'vertical privilege escalation',
      'privilege escalation', 'bac', 'broken access control', 'object access', 'insecure direct object'
    ],
    cwes: ['CWE-639', 'CWE-284', 'CWE-285', 'CWE-862', 'CWE-863']
  },
  xss: {
    name: 'Cross-Site Scripting (XSS)',
    aliases: [
      'xss', 'cross-site scripting', 'cross site scripting', 'reflected xss', 'stored xss',
      'dom xss', 'blind xss', 'mutation xss', 'mxss', 'angular xss', 'script injection'
    ],
    cwes: ['CWE-79', 'CWE-80', 'CWE-83', 'CWE-87']
  },
  ssrf: {
    name: 'Server-Side Request Forgery (SSRF)',
    aliases: [
      'ssrf', 'server-side request forgery', 'server side request forgery', 'blind ssrf',
      'aws metadata', 'imds', 'cloud metadata', 'webhook ssrf', 'pdf ssrf'
    ],
    cwes: ['CWE-918']
  },
  sqli: {
    name: 'SQL / Database Injection',
    aliases: [
      'sqli', 'sql injection', 'blind sqli', 'time-based sqli', 'boolean sqli',
      'error-based sqli', 'nosql injection', 'nosqli', 'orm injection', 'cql injection'
    ],
    cwes: ['CWE-89', 'CWE-943']
  },
  rce: {
    name: 'Remote Code Execution (RCE)',
    aliases: [
      'rce', 'remote code execution', 'command injection', 'os command injection',
      'code injection', 'insecure deserialization', 'ssti', 'server-side template injection',
      'arbitrary code execution', 'yaml deserialization', 'eval injection'
    ],
    cwes: ['CWE-78', 'CWE-94', 'CWE-502', 'CWE-1336']
  },
  auth: {
    name: 'Authentication Bypass / Account Takeover',
    aliases: [
      'auth bypass', 'authentication bypass', 'account takeover', 'ato', 'broken authentication',
      'session hijacking', 'session fixation', 'jwt', 'jwt bypass', 'oauth bypass', 'oauth misconfiguration',
      'mfa bypass', '2fa bypass', 'password reset bypass', 'saml'
    ],
    cwes: ['CWE-287', 'CWE-306', 'CWE-384', 'CWE-613']
  },
  csrf: {
    name: 'Cross-Site Request Forgery (CSRF)',
    aliases: [
      'csrf', 'xsrf', 'cross-site request forgery', 'cross site request forgery',
      'origin bypass', 'samesite bypass', 'state parameter missing'
    ],
    cwes: ['CWE-352']
  },
  cors: {
    name: 'CORS Misconfiguration',
    aliases: [
      'cors', 'cors misconfiguration', 'cross-origin resource sharing',
      'access-control-allow-origin', 'arbitrary origin trust', 'null origin'
    ],
    cwes: ['CWE-942']
  },
  info_disclosure: {
    name: 'Information Disclosure / Secret Leak',
    aliases: [
      'information disclosure', 'info disclosure', 'sensitive data exposure', 'sourcemap',
      'source map', 'pii leak', 'secret leak', 'credential leak', 'api key leak',
      'git exposure', 'heap dump', 'stack trace', 'directory listing'
    ],
    cwes: ['CWE-200', 'CWE-209', 'CWE-548']
  },
  subdomain_takeover: {
    name: 'Subdomain Takeover',
    aliases: [
      'subdomain takeover', 'subdomain take over', 'sto', 'dangling dns', 'cname takeover',
      's3 takeover', 'github pages takeover', 'dangling cname'
    ],
    cwes: ['CWE-284', 'CWE-1059']
  },
  open_redirect: {
    name: 'Open Redirect',
    aliases: [
      'open redirect', 'unvalidated redirect', 'url redirection', 'redirect bypass',
      'header injection redirect'
    ],
    cwes: ['CWE-601']
  },
  rate_limit: {
    name: 'Rate Limiting / DoS',
    aliases: [
      'rate limit', 'rate-limit', 'missing rate limit', 'brute force', 'credential stuffing',
      'dos', 'denial of service', 'resource exhaustion', 'regex dos', 'redos'
    ],
    cwes: ['CWE-307', 'CWE-400', 'CWE-770']
  },
  file_upload: {
    name: 'Arbitrary File Upload / Path Traversal',
    aliases: [
      'file upload', 'arbitrary file upload', 'path traversal', 'directory traversal',
      'lfi', 'local file inclusion', 'rfi', 'remote file inclusion', 'zip slip'
    ],
    cwes: ['CWE-434', 'CWE-22', 'CWE-23']
  },
  business_logic: {
    name: 'Business Logic / Race Condition',
    aliases: [
      'business logic', 'race condition', 'toctou', 'time-of-check', 'price tampering',
      'coupon abuse', 'concurrency bug', 'currency manipulation', 'rounding error'
    ],
    cwes: ['CWE-840', 'CWE-362', 'CWE-367']
  }
};

/**
 * Normalizes a URL or target string into a clean hostname.
 * e.g. "https://api.target.com:8443/v1/orders" -> "api.target.com"
 */
export function extractCleanHostname(targetStr: string): string {
  if (!targetStr) return '';
  let cleaned = targetStr.trim().toLowerCase();

  // Strip protocol
  cleaned = cleaned.replace(/^(https?:\/\/|ftp:\/\/|wss?:\/\/)/i, '');

  // Strip credentials
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[1] || cleaned;
  }

  // Strip path and query/hash
  cleaned = cleaned.split('/')[0] || cleaned;
  cleaned = cleaned.split('?')[0] || cleaned;
  cleaned = cleaned.split('#')[0] || cleaned;

  // Strip port
  cleaned = cleaned.split(':')[0] || cleaned;

  // Strip leading www.
  cleaned = cleaned.replace(/^www\./i, '');

  return cleaned.trim();
}

/**
 * Extracts root domain (e.g. "api.target.com" -> "target.com", "dev.auth.co.uk" -> "auth.co.uk")
 */
export function extractRootDomain(hostname: string): string {
  if (!hostname) return '';
  const host = extractCleanHostname(hostname);
  const parts = host.split('.').filter(Boolean);

  if (parts.length <= 2) {
    return host;
  }

  // Handle multi-part TLDs like .com.br, .co.uk, .gov.br
  const secondLevelTlds = ['com.br', 'co.uk', 'gov.br', 'org.uk', 'net.br', 'com.au', 'co.nz'];
  const lastTwo = parts.slice(-2).join('.');

  if (secondLevelTlds.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Computes Jaccard word token similarity between two strings (0 to 1).
 */
function tokenJaccardSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

  const setA = tokenize(strA);
  const setB = tokenize(strB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  setA.forEach(token => {
    if (setB.has(token)) intersectionCount++;
  });

  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Levenshtein distance similarity (0 to 1).
 */
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length < s2.length ? s1 : s2;
  if (longer.length === 0) return 1.0;

  const editDistance = (a: string, b: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= a.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= b.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (a.charAt(i - 1) !== b.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[b.length] = lastValue;
    }
    return costs[b.length];
  };

  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

/**
 * Extract API endpoints or URL paths from a text.
 * e.g. "/api/v2/invoices/{id}", "/oauth/authorize", "/graphql"
 */
export function extractEndpoints(text: string): string[] {
  if (!text) return [];
  const endpointRegex = /\/(?:api|v[0-9]|oauth|auth|user|admin|graphql|webhook|internal|rest|v[0-9]+\.[0-9]+)\/[a-zA-Z0-9_\-\/{}]*/gi;
  const matches = text.match(endpointRegex) || [];
  
  // Also look for simple route patterns like /users/:id or /login
  const simpleRouteRegex = /\/[a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)+/g;
  const simpleMatches = text.match(simpleRouteRegex) || [];

  const combined = Array.from(new Set([...matches, ...simpleMatches]))
    .map(p => p.toLowerCase().trim())
    .filter(p => p.length > 4 && !p.endsWith('.js') && !p.endsWith('.css') && !p.endsWith('.png'));

  return combined;
}

/**
 * Identifies canonical vulnerability category for a given vulnType, CWE or text.
 */
export function identifyVulnCategory(vulnType: string, cwe?: string, title?: string): { key: string; name: string } {
  const combined = `${vulnType || ''} ${cwe || ''} ${title || ''}`.toLowerCase();

  for (const [key, meta] of Object.entries(VULN_TAXONOMY)) {
    // Check aliases
    for (const alias of meta.aliases) {
      if (combined.includes(alias)) {
        return { key, name: meta.name };
      }
    }
    // Check CWEs
    if (meta.cwes && cwe) {
      for (const knownCwe of meta.cwes) {
        if (cwe.toUpperCase().includes(knownCwe)) {
          return { key, name: meta.name };
        }
      }
    }
  }

  return { key: 'other', name: vulnType || 'Outro / Não Classificado' };
}

/**
 * Computes similarity between two targets.
 */
export function calculateDomainSimilarity(targetA: string, targetB: string): { score: number; reason?: string; rootDomain: string } {
  const hostA = extractCleanHostname(targetA);
  const hostB = extractCleanHostname(targetB);

  if (!hostA || !hostB) return { score: 0, rootDomain: '' };

  // 1. Exact hostname match
  if (hostA === hostB) {
    return {
      score: 100,
      reason: `Mesmo host afetado (${hostA})`,
      rootDomain: extractRootDomain(hostA)
    };
  }

  const rootA = extractRootDomain(hostA);
  const rootB = extractRootDomain(hostB);

  // 2. Same root domain (e.g. api.target.com and auth.target.com)
  if (rootA && rootB && rootA === rootB) {
    // Check if one contains the other
    if (hostA.includes(hostB) || hostB.includes(hostA)) {
      return {
        score: 90,
        reason: `Subdomínio relacionado no mesmo domínio raiz (${rootA})`,
        rootDomain: rootA
      };
    }
    return {
      score: 80,
      reason: `Mesmo domínio raiz da organização (${rootA})`,
      rootDomain: rootA
    };
  }

  // 3. String similarity on hostnames (e.g. typo or similar cluster name)
  const sim = stringSimilarity(hostA, hostB);
  if (sim >= 0.85) {
    return {
      score: Math.round(sim * 75),
      reason: `Nomes de host altamente semelhantes (${hostA} ~ ${hostB})`,
      rootDomain: rootA
    };
  }

  return { score: 0, rootDomain: rootA };
}

/**
 * Computes vulnerability type & taxonomy similarity (0 to 100).
 */
export function calculateVulnTypeSimilarity(
  typeA: string,
  typeB: string,
  cweA?: string,
  cweB?: string,
  titleA?: string,
  titleB?: string
): { score: number; reason?: string; category: string } {
  const normA = (typeA || '').trim().toLowerCase();
  const normB = (typeB || '').trim().toLowerCase();

  // Exact type match
  if (normA && normB && normA === normB) {
    return {
      score: 100,
      reason: `Tipo de vulnerabilidade idêntico ("${typeA}")`,
      category: typeA
    };
  }

  const catA = identifyVulnCategory(typeA, cweA, titleA);
  const catB = identifyVulnCategory(typeB, cweB, titleB);

  // Same taxonomy category
  if (catA.key !== 'other' && catA.key === catB.key) {
    // Check if exact CWE match also
    if (cweA && cweB && cweA.split(':')[0]?.trim() === cweB.split(':')[0]?.trim()) {
      return {
        score: 95,
        reason: `Mesma família técnica (${catA.name}) e CWE idêntico (${cweA.split(':')[0]})`,
        category: catA.name
      };
    }

    return {
      score: 85,
      reason: `Mesma família técnica e vetor de exploração (${catA.name})`,
      category: catA.name
    };
  }

  // CWE prefix match if both have CWE
  if (cweA && cweB) {
    const cweNumA = cweA.match(/CWE-\d+/i)?.[0]?.toUpperCase();
    const cweNumB = cweB.match(/CWE-\d+/i)?.[0]?.toUpperCase();
    if (cweNumA && cweNumB && cweNumA === cweNumB) {
      return {
        score: 90,
        reason: `Mesmo identificador CWE catalogado (${cweNumA})`,
        category: catA.name
      };
    }
  }

  // Token Jaccard similarity on raw strings
  const jaccard = tokenJaccardSimilarity(normA, normB);
  if (jaccard >= 0.5) {
    return {
      score: Math.round(jaccard * 80),
      reason: `Terminologia sobreposta no tipo (${typeA} ~ ${typeB})`,
      category: catA.name
    };
  }

  return { score: 0, category: catA.name };
}

/**
 * Scans a candidate report against an array of existing reports to detect duplicates.
 */
export function detectPotentialDuplicates(
  candidate: {
    id?: string;
    target: string;
    vulnerabilityType: string;
    title?: string;
    cwe?: string;
    proofOfConcept?: string;
    summary?: string;
  },
  existingReports: VulnerabilityReport[]
): DuplicateAnalysisSummary {
  const cleanedTarget = extractCleanHostname(candidate.target);
  const candidateCat = identifyVulnCategory(candidate.vulnerabilityType, candidate.cwe, candidate.title);
  const candidateEndpoints = extractEndpoints(
    `${candidate.title || ''} ${candidate.proofOfConcept || ''} ${candidate.summary || ''}`
  );

  if (!cleanedTarget && !candidate.vulnerabilityType) {
    return {
      hasPotentialDuplicates: false,
      highestScore: 0,
      highestRiskLevel: 'NONE',
      matches: [],
      scannedCount: existingReports.length,
      targetDomainCleaned: '',
      vulnCategoryIdentified: candidateCat.name
    };
  }

  const results: DuplicateDetectionResult[] = [];

  for (const existing of existingReports) {
    // Don't compare against itself when editing an existing report
    if (candidate.id && existing.id === candidate.id) {
      continue;
    }

    const domainSim = calculateDomainSimilarity(candidate.target, existing.target);
    const vulnSim = calculateVulnTypeSimilarity(
      candidate.vulnerabilityType,
      existing.vulnerabilityType,
      candidate.cwe,
      existing.cwe,
      candidate.title,
      existing.title
    );

    // If completely different domain and no root domain overlap, probability of collision is near zero
    if (domainSim.score === 0) {
      continue;
    }

    // Title / Narrative similarity
    const titleSim = candidate.title && existing.title
      ? Math.round(tokenJaccardSimilarity(candidate.title, existing.title) * 100)
      : 0;

    // Endpoint overlap
    const existingEndpoints = extractEndpoints(
      `${existing.title} ${existing.proofOfConcept} ${existing.summary}`
    );
    const sharedEndpoints = candidateEndpoints.filter(ep => existingEndpoints.includes(ep));
    const endpointScore = sharedEndpoints.length > 0 ? 100 : 0;

    // Weighted overall duplicate score
    // Domain: 40%, VulnType: 35%, Title: 15%, Endpoint: 10%
    let overallScore = (domainSim.score * 0.40) + (vulnSim.score * 0.35) + (titleSim * 0.15) + (endpointScore * 0.10);

    // Boost if both exact domain AND exact vuln type / category
    if (domainSim.score >= 90 && vulnSim.score >= 85) {
      overallScore = Math.max(overallScore, 85);
      if (sharedEndpoints.length > 0) {
        overallScore = Math.max(overallScore, 98);
      }
    } else if (domainSim.score >= 80 && vulnSim.score >= 80) {
      overallScore = Math.max(overallScore, 70);
    }

    // Round to integer
    overallScore = Math.min(100, Math.round(overallScore));

    // Filter out low scores that aren't meaningful
    if (overallScore < 30) {
      continue;
    }

    const matchReasons: string[] = [];
    if (domainSim.reason) matchReasons.push(domainSim.reason);
    if (vulnSim.reason) matchReasons.push(vulnSim.reason);
    if (sharedEndpoints.length > 0) {
      matchReasons.push(`Endpoint idêntico detectado no PoC (${sharedEndpoints.slice(0, 2).join(', ')})`);
    }
    if (titleSim >= 40) {
      matchReasons.push(`Título com palavras-chave similares (${titleSim}% de similaridade léxica)`);
    }
    if (existing.status === 'DUPLICATE') {
      matchReasons.push(`Aviso: O relatório anterior já havia sido fechado como DUPLICATE`);
    } else if (existing.status === 'TRIAGED' || existing.status === 'RESOLVED' || existing.status === 'REWARDED') {
      matchReasons.push(`Relatório ativo no programa (Status: ${existing.status})`);
    }

    // Generate actionable differentiation tips for Bug Bounty platforms
    const differentiationTips: string[] = [];
    if (domainSim.score >= 90 && vulnSim.score >= 80) {
      differentiationTips.push(
        'Demonstre um impacto ou privilégio substancialmente diferente (ex: bypass de MFA vs IDOR de leitura simples).'
      );
      differentiationTips.push(
        'Verifique se os parâmetros ou componentes de código responsáveis pelo processamento são independentes.'
      );
    }
    if (sharedEndpoints.length > 0) {
      differentiationTips.push(
        'Mesmo endpoint: Triadores de HackerOne/Bugcrowd fecham automaticamente como duplicata a menos que o vetor contorne o patch existente.'
      );
    } else {
      differentiationTips.push(
        'Destaque no título o sub-caminho ou função específica para diferenciar da submissão anterior.'
      );
    }

    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (overallScore >= 70) riskLevel = 'HIGH';
    else if (overallScore >= 45) riskLevel = 'MEDIUM';

    results.push({
      report: existing,
      overallScore,
      riskLevel,
      domainScore: domainSim.score,
      vulnTypeScore: vulnSim.score,
      titleScore: titleSim,
      endpointScore,
      matchReasons,
      differentiationTips,
      sharedDomain: domainSim.rootDomain,
      sharedCategory: vulnSim.category,
      matchingEndpoints: sharedEndpoints
    });
  }

  // Sort descending by highest score
  results.sort((a, b) => b.overallScore - a.overallScore);

  const highestScore = results[0]?.overallScore || 0;
  let highestRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';
  if (highestScore >= 70) highestRiskLevel = 'HIGH';
  else if (highestScore >= 45) highestRiskLevel = 'MEDIUM';
  else if (highestScore >= 30) highestRiskLevel = 'LOW';

  return {
    hasPotentialDuplicates: results.length > 0,
    highestScore,
    highestRiskLevel,
    matches: results,
    scannedCount: existingReports.length,
    targetDomainCleaned: cleanedTarget,
    vulnCategoryIdentified: candidateCat.name
  };
}
