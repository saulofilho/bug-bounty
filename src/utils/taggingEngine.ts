import { AutoTagSuggestion, TechnicalDoc, Severity } from '../types';

interface CWEKnowledge {
  id: string;
  name: string;
  category: string;
  owaspCategory: string;
  keywords: string[];
  recommendedCvssVector: string;
  description: string;
  relatedCves: string[];
}

// Curated comprehensive CWE Taxonomy with attack patterns & keywords
export const CWE_CATALOG: CWEKnowledge[] = [
  {
    id: 'CWE-639',
    name: 'Authorization Bypass Through User-Controlled Key (IDOR / BOLA)',
    category: 'Broken Object Level Authorization',
    owaspCategory: 'API1:2023 - Broken Object Level Authorization',
    keywords: [
      'idor', 'bola', 'object level', 'autorizacao', 'authorization', 'user-controlled',
      'id=', 'user_id', 'account_id', 'profile_id', 'order_id', 'trocar id', 'outro usuario',
      'other user', 'cross-tenant', 'multi-tenant', 'horizontal privilege', 'privilegio horizontal',
      'insecure direct object', 'guid', 'uuid', 'parametro manipulado', 'autorize'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    description: 'O sistema utiliza referências diretas fornecidas pelo cliente (IDs, tokens, chaves) sem verificar se o usuário autenticado tem permissão sobre o objeto solicitado.',
    relatedCves: ['CVE-2023-22515', 'CVE-2021-36749']
  },
  {
    id: 'CWE-918',
    name: 'Server-Side Request Forgery (SSRF)',
    category: 'Server-Side Request Forgery',
    owaspCategory: 'A10:2021 - Server-Side Request Forgery (SSRF)',
    keywords: [
      'ssrf', 'server-side request forgery', '169.254.169.254', 'metadata', 'imds', 'imdsv1', 'imdsv2',
      'webhook', 'url=', 'uri=', 'fetch', 'internal host', 'localhost', '127.0.0.1', 'dns rebinding',
      'cloud metadata', 'aws iam', 'gcp metadata', 'kube-env', 'blind ssrf', 'internal network'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
    description: 'A aplicação web recupera um recurso remoto sem validar a URL especificada pelo usuário, permitindo coerção para requisições a serviços internos ou metadados de nuvem.',
    relatedCves: ['CVE-2021-26855', 'CVE-2024-3400']
  },
  {
    id: 'CWE-89',
    name: 'Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)',
    category: 'Injection',
    owaspCategory: 'A03:2021 - Injection',
    keywords: [
      'sql', 'sqli', 'injection', 'union select', 'or 1=1', 'database error', 'sql syntax',
      'sleep(', 'pg_sleep', 'benchmark', 'information_schema', 'boolean-based', 'time-based',
      'error-based', 'banco de dados', 'query', 'payload sql', 'moveit'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'Entrada de dados não sanitizada é concatenada diretamente em uma instrução SQL interpretada pelo banco de dados, possibilitando extração ou modificação de dados.',
    relatedCves: ['CVE-2023-34362', 'CVE-2022-26134']
  },
  {
    id: 'CWE-79',
    name: 'Improper Neutralization of Input During Web Page Generation (Cross-site Scripting - XSS)',
    category: 'Injection',
    owaspCategory: 'A03:2021 - Injection',
    keywords: [
      'xss', 'cross-site scripting', 'stored xss', 'reflected xss', 'dom xss', '<script>',
      'onerror=', 'onload=', 'alert(', 'javascript:', 'document.cookie', 'sanitize',
      'escape', 'svg onload', 'payload xss', 'html injection'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
    description: 'A aplicação inclui dados não confiáveis em uma página web sem validação ou escape apropriado, permitindo que scripts maliciosos sejam executados no navegador de vítimas.',
    relatedCves: ['CVE-2023-38606']
  },
  {
    id: 'CWE-287',
    name: 'Improper Authentication (Authentication Bypass)',
    category: 'Broken Authentication',
    owaspCategory: 'A07:2021 - Identification and Authentication Failures',
    keywords: [
      'auth bypass', 'authentication', 'login', 'jwt', 'none algorithm', 'token bypass',
      '2fa bypass', 'mfa bypass', 'sessao', 'session fixation', 'sem autenticacao',
      'unauthenticated', 'ivanti', 'senha fraca', 'header bypass'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'Falha nos controles de verificação de identidade permitindo que um atacante obtenha acesso como usuário legítimo ou administrador sem fornecer credenciais válidas.',
    relatedCves: ['CVE-2023-46805', 'CVE-2023-22515']
  },
  {
    id: 'CWE-307',
    name: 'Improper Restriction of Excessive Authentication Attempts (Rate Limit Bypass / Brute Force)',
    category: 'Brute Force & Rate Limiting',
    owaspCategory: 'API4:2023 - Unrestricted Resource Consumption',
    keywords: [
      'rate limit', 'rate-limit', 'brute force', 'forca bruta', 'batching', 'graphql batching',
      'otp', 'sms 2fa', '429 too many requests', 'excessive attempts', 'throttling',
      'tentativas ilimitadas', 'bloqueio ausente', 'flood'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    description: 'Ausência ou bypass de mecanismos de limitação de taxa em endpoints sensíveis (ex: verificação de OTP, login), viabilizando adivinhação automatizada em larga escala.',
    relatedCves: ['CVE-2021-36749']
  },
  {
    id: 'CWE-15',
    name: 'External Control of System or Configuration Setting (Subdomain / DNS Takeover)',
    category: 'DNS & Infrastructure',
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    keywords: [
      'subdomain takeover', 'cname', 'takeover', 'dns', 's3 bucket', 'nosuchbucket',
      'orphaned dns', 'apontamento orfao', 'registro dns', 'aws s3', 'bucket deletado',
      'fastly', 'github pages', 'azure traffic manager'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N',
    description: 'Registro DNS aponta para serviço ou provedor de nuvem de terceiro desativado ou liberado, permitindo que atacantes assumam controle do subdomínio oficial.',
    relatedCves: ['CVE-2021-44228']
  },
  {
    id: 'CWE-502',
    name: 'Deserialization of Untrusted Data (Remote Code Execution)',
    category: 'Remote Code Execution',
    owaspCategory: 'A08:2021 - Software and Data Integrity Failures',
    keywords: [
      'deserialization', 'desserializacao', 'rce', 'remote code execution', 'jndi', 'log4j',
      'log4shell', 'pickle', 'java object', 'gadget chain', 'ysoserial', 'execucao remota de codigo'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    description: 'Processamento de objetos serializados não confiáveis sem verificação rigorosa, resultando em sequestro de fluxo de controle e execução arbitrária de código no servidor.',
    relatedCves: ['CVE-2021-44228', 'CVE-2022-22965']
  },
  {
    id: 'CWE-77',
    name: 'Improper Neutralization of Special Elements used in a Command (Command Injection)',
    category: 'Command Injection',
    owaspCategory: 'A03:2021 - Injection',
    keywords: [
      'command injection', 'injecao de comando', 'shell', 'bash', 'cmd.exe', 'exec(',
      'system(', 'popen', 'whoami', '| id', '; cat /etc/passwd', 'os command'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'Construção insegura de comandos do sistema operacional com dados manipulados pelo usuário, permitindo invocação de comandos no nível do sistema hospedeiro.',
    relatedCves: ['CVE-2024-3400', 'CVE-2022-26134']
  },
  {
    id: 'CWE-200',
    name: 'Exposure of Sensitive Information to an Unauthorized Actor',
    category: 'Information Disclosure',
    owaspCategory: 'A01:2021 - Broken Access Control',
    keywords: [
      'information disclosure', 'exposicao de dados', 'vazamento', 'sensivel', 'pii', 'cpf',
      '.env', '.git', 'swagger.json', 'stacktrace', 'debug mode', 'chaves de api', 'segredos expostos'
    ],
    recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    description: 'A aplicação expõe inadvertidamente informações confidenciais a atores não autorizados via respostas de API, logs, arquivos estáticos ou mensagens de erro.',
    relatedCves: ['CVE-2023-46805']
  }
];

// Curated CVE mapping reference
export const CVE_TAXONOMY_MAP: Record<string, { title: string; cvss: number; severity: Severity; cwe: string; relevance: string }> = {
  'CVE-2023-22515': {
    title: 'Atlassian Confluence Broken Access Control (Admin Creation)',
    cvss: 10.0,
    severity: 'CRITICAL',
    cwe: 'CWE-284',
    relevance: 'Falha crítica de controle de acesso permitindo criar contas privilegiadas sem autorização.'
  },
  'CVE-2024-3400': {
    title: 'Palo Alto PAN-OS GlobalProtect Command Injection',
    cvss: 10.0,
    severity: 'CRITICAL',
    cwe: 'CWE-77',
    relevance: 'Injeção de comandos arbitrários no sistema com privilégios de root.'
  },
  'CVE-2023-46805': {
    title: 'Ivanti Connect Secure Authentication Bypass',
    cvss: 8.2,
    severity: 'HIGH',
    cwe: 'CWE-287',
    relevance: 'Bypass de validação de autenticação em endpoints de gerenciamento web.'
  },
  'CVE-2023-34362': {
    title: 'MOVEit Transfer SQL Injection Vulnerability',
    cvss: 9.8,
    severity: 'CRITICAL',
    cwe: 'CWE-89',
    relevance: 'SQL Injection em aplicação de transferência de dados com acesso irrestrito ao banco.'
  },
  'CVE-2021-44228': {
    title: 'Apache Log4j2 JNDI RCE (Log4Shell)',
    cvss: 10.0,
    severity: 'CRITICAL',
    cwe: 'CWE-502',
    relevance: 'Execução de código remota decorrente de parsing inseguro de strings manipuladas pelo usuário.'
  },
  'CVE-2024-21413': {
    title: 'Microsoft Outlook Moniker Link Remote Code Execution',
    cvss: 9.8,
    severity: 'CRITICAL',
    cwe: 'CWE-94',
    relevance: 'Execução de código através de links maliciosos que burlam validações de segurança.'
  },
  'CVE-2022-22965': {
    title: 'Spring Framework Data Binding RCE (Spring4Shell)',
    cvss: 9.8,
    severity: 'CRITICAL',
    cwe: 'CWE-94',
    relevance: 'Manipulação de propriedades em frameworks MVC levando a comprometimento do servidor.'
  }
};

/**
 * Deterministic local tagging and categorization engine.
 * Cross-references report content with existing documentation and standard CWE/CVE taxonomy.
 */
export function analyzeAndTagReportLocally(params: {
  title?: string;
  summary?: string;
  vulnerabilityType?: string;
  proofOfConcept?: string;
  docs: TechnicalDoc[];
}): AutoTagSuggestion {
  const combinedText = [
    params.title || '',
    params.summary || '',
    params.vulnerabilityType || '',
    params.proofOfConcept || ''
  ].join(' ').toLowerCase();

  const matchedDocsList: AutoTagSuggestion['matchedDocs'] = [];
  const suggestedCwesList: AutoTagSuggestion['suggestedCwes'] = [];
  const suggestedCvesList: AutoTagSuggestion['suggestedCves'] = [];
  const suggestedTagsSet = new Set<string>();

  // 1. Cross-reference with Existing Technical Documentation
  if (params.docs && params.docs.length > 0) {
    for (const doc of params.docs) {
      const docKeywords = [
        ...doc.tags.map(t => t.toLowerCase().replace(/^#/, '')),
        ...doc.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
        doc.category.toLowerCase()
      ];

      const matchedWords: string[] = [];
      let score = 0;

      for (const kw of docKeywords) {
        if (combinedText.includes(kw)) {
          matchedWords.push(kw);
          score += 15;
        }
      }

      // Check title directly
      if (doc.title.toLowerCase().includes(params.vulnerabilityType?.toLowerCase() || '')) {
        score += 30;
      }

      // Check documentation content keywords
      const docSampleLines = doc.content.toLowerCase().split('\n');
      for (const line of docSampleLines.slice(0, 20)) {
        for (const kw of matchedWords) {
          if (line.includes(kw)) {
            score += 2;
          }
        }
      }

      if (score > 10) {
        // Collect tags from matched docs
        doc.tags.forEach(t => suggestedTagsSet.add(t.startsWith('#') ? t : `#${t.toLowerCase().replace(/\s+/g, '-')}`));

        // Extract a relevant snippet from the doc
        let snippet = doc.content.slice(0, 160).replace(/[#*`_]/g, '').trim() + '...';
        for (const line of docSampleLines) {
          if (matchedWords.some(w => line.includes(w)) && line.trim().length > 20) {
            snippet = line.replace(/[#*`_]/g, '').trim();
            break;
          }
        }

        matchedDocsList.push({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          matchScore: Math.min(score, 99),
          matchedKeywords: Array.from(new Set(matchedWords)),
          relevanceSnippet: snippet
        });
      }
    }
  }

  // Sort matched docs by score descending
  matchedDocsList.sort((a, b) => b.matchScore - a.matchScore);

  // 2. Score CWE Catalog based on description and matched doc tags
  for (const cweItem of CWE_CATALOG) {
    let cweScore = 0;
    const matchedKws: string[] = [];

    for (const kw of cweItem.keywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        cweScore += 18;
        matchedKws.push(kw);
      }
    }

    // Check if matched docs tags reinforce this CWE
    matchedDocsList.forEach(doc => {
      doc.matchedKeywords.forEach(mk => {
        if (cweItem.keywords.some(k => k.toLowerCase() === mk)) {
          cweScore += 10;
        }
      });
    });

    if (cweScore > 0) {
      const confidence = Math.min(Math.round((cweScore / 60) * 100) / 100, 0.98);
      const kwSummary = matchedKws.slice(0, 3).join(', ');

      suggestedCwesList.push({
        id: cweItem.id,
        name: cweItem.name,
        description: cweItem.description,
        confidence: Math.max(confidence, 0.45),
        owaspCategory: cweItem.owaspCategory,
        recommendedCvssVector: cweItem.recommendedCvssVector,
        explanation: `Termos-chave identificados: "${kwSummary || cweItem.category}". Relevância direta com a taxonomia ${cweItem.owaspCategory}.`
      });

      // Add tags for this CWE
      suggestedTagsSet.add(`#${cweItem.id.toLowerCase()}`);
      cweItem.keywords.slice(0, 2).forEach(k => {
        if (!k.includes('=')) {
          suggestedTagsSet.add(`#${k.replace(/\s+/g, '-')}`);
        }
      });

      // Add related CVEs if high confidence
      if (confidence >= 0.6) {
        cweItem.relatedCves.forEach(cveId => {
          const cveMeta = CVE_TAXONOMY_MAP[cveId];
          if (cveMeta && !suggestedCvesList.some(c => c.id === cveId)) {
            suggestedCvesList.push({
              id: cveId,
              title: cveMeta.title,
              cvss: cveMeta.cvss,
              severity: cveMeta.severity,
              relevance: `Padrão arquitetural e severidade semelhantes ao achado (${cveMeta.relevance})`,
              cwe: cweItem.id
            });
          }
        });
      }
    }
  }

  // Sort suggested CWEs by confidence descending
  suggestedCwesList.sort((a, b) => b.confidence - a.confidence);

  // Fallback defaults if text is sparse
  if (suggestedCwesList.length === 0) {
    const defaultCwe = CWE_CATALOG[0]; // IDOR/BOLA default for web/api
    suggestedCwesList.push({
      id: defaultCwe.id,
      name: defaultCwe.name,
      description: defaultCwe.description,
      confidence: 0.50,
      owaspCategory: defaultCwe.owaspCategory,
      recommendedCvssVector: defaultCwe.recommendedCvssVector,
      explanation: 'Classificação preliminar sugerida para validação de endpoints web e controle de acesso.'
    });
    suggestedTagsSet.add('#idor');
    suggestedTagsSet.add('#cwe-639');
    suggestedTagsSet.add('#api-security');
  }

  // Format analysis summary
  const topCwe = suggestedCwesList[0];
  const matchedDocCount = matchedDocsList.length;
  let analysisSummary = `Análise concluída com base em ${matchedDocCount} documento(s) técnico(s) da sua biblioteca.`;
  if (topCwe) {
    analysisSummary += ` Classificação primária sugerida: ${topCwe.id} (${topCwe.name}) com ${Math.round(topCwe.confidence * 100)}% de correspondência.`;
  }

  return {
    suggestedTags: Array.from(suggestedTagsSet).slice(0, 8),
    suggestedCwes: suggestedCwesList.slice(0, 4),
    suggestedCves: suggestedCvesList.slice(0, 3),
    matchedDocs: matchedDocsList.slice(0, 3),
    analysisSummary
  };
}

/**
 * Intelligent hybrid tagging: tries server-side Gemini endpoint first,
 * and falls back instantaneously to deterministic local analysis if offline or unconfigured.
 */
export async function fetchAutomatedTags(params: {
  title?: string;
  summary?: string;
  vulnerabilityType?: string;
  proofOfConcept?: string;
  docs: TechnicalDoc[];
}): Promise<AutoTagSuggestion> {
  // Always compute local baseline first
  const localAnalysis = analyzeAndTagReportLocally(params);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch('/api/reports/auto-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        title: params.title,
        description: params.summary,
        vulnerabilityType: params.vulnerabilityType,
        proofOfConcept: params.proofOfConcept,
        existingDocs: params.docs.map(d => ({
          id: d.id,
          title: d.title,
          category: d.category,
          tags: d.tags
        }))
      })
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.suggestion) {
        // Merge with local documentation matches to ensure full context
        return {
          suggestedTags: Array.from(new Set([...(data.suggestion.suggestedTags || []), ...localAnalysis.suggestedTags])).slice(0, 8),
          suggestedCwes: data.suggestion.suggestedCwes && data.suggestion.suggestedCwes.length > 0 ? data.suggestion.suggestedCwes : localAnalysis.suggestedCwes,
          suggestedCves: data.suggestion.suggestedCves && data.suggestion.suggestedCves.length > 0 ? data.suggestion.suggestedCves : localAnalysis.suggestedCves,
          matchedDocs: localAnalysis.matchedDocs,
          analysisSummary: data.suggestion.analysisSummary || localAnalysis.analysisSummary
        };
      }
    }
  } catch (err) {
    // Graceful fallback to local analysis
    console.debug('Automated tagging utilizing local rule-engine fallback:', err);
  }

  return localAnalysis;
}
