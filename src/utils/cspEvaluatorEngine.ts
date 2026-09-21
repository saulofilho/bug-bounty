export interface CspDirective {
  name: string;
  values: string[];
  raw: string;
}

export interface CspFinding {
  id: string;
  directive?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'PASS' | 'INFO';
  title: string;
  description: string;
  remediation: string;
}

export interface CspEvaluationResult {
  parsedDirectives: Record<string, string[]>;
  rawPolicy: string;
  rating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  score: number; // 0 - 100
  findings: CspFinding[];
  isEnforcing: boolean;
  generatedConfigs: {
    nginx: string;
    apache: string;
    expressHelmet: string;
    htmlMeta: string;
  };
}

export function parseCspString(csp: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const cleaned = csp.trim().replace(/\r?\n|\r/g, ' ');
  const tokens = cleaned.split(';').map(t => t.trim()).filter(Boolean);

  tokens.forEach(tok => {
    const parts = tok.split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      const dirName = parts[0].toLowerCase();
      const dirValues = parts.slice(1);
      result[dirName] = dirValues;
    }
  });

  return result;
}

export function evaluateCsp(policy: string): CspEvaluationResult {
  const trimmed = policy.trim();
  const directives = parseCspString(trimmed);
  const findings: CspFinding[] = [];
  let score = 100;

  if (!trimmed || Object.keys(directives).length === 0) {
    return {
      parsedDirectives: {},
      rawPolicy: '',
      rating: 'F',
      score: 0,
      isEnforcing: false,
      findings: [
        {
          id: 'no-policy',
          severity: 'CRITICAL',
          title: 'Nenhuma Política de CSP Definida',
          description: 'A aplicação não possui cabeçalho Content-Security-Policy configurado, deixando o navegador sem restrições contra ataques XSS, clickjacking e exfiltração de dados.',
          remediation: 'Implemente uma política com default-src, script-src com hashes/nonces e frame-ancestors.'
        }
      ],
      generatedConfigs: generateCspSnippets("default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self';")
    };
  }

  // 1. Check default-src fallback
  if (!directives['default-src']) {
    findings.push({
      id: 'missing-default-src',
      severity: 'HIGH',
      directive: 'default-src',
      title: 'Ausência da Diretiva default-src',
      description: 'A diretiva default-src serve como fallback de segurança para diretivas ausentes (como connect-src, font-src, media-src).',
      remediation: "Defina default-src 'self' ou default-src 'none'."
    });
    score -= 15;
  }

  // 2. Check script-src
  const scriptSrc = directives['script-src'] || directives['default-src'] || [];
  if (scriptSrc.length === 0) {
    findings.push({
      id: 'no-script-src',
      severity: 'CRITICAL',
      directive: 'script-src',
      title: 'Nenhuma Restrição em script-src',
      description: 'Scripts arbitrários de qualquer origem podem ser injetados e executados no contexto da página.',
      remediation: "Defina script-src 'self' ou adicione nonces/hashes restritivos."
    });
    score -= 35;
  } else {
    // Check unsafe-inline
    if (scriptSrc.includes("'unsafe-inline'")) {
      const hasNonceOrHash = scriptSrc.some(v => v.startsWith("'nonce-") || v.startsWith("'sha256-") || v.startsWith("'sha384-") || v.startsWith("'sha512-"));
      if (!hasNonceOrHash) {
        findings.push({
          id: 'script-unsafe-inline',
          severity: 'CRITICAL',
          directive: 'script-src',
          title: "Uso de 'unsafe-inline' sem Nonce/Hash",
          description: "A política permite execução de scripts inline (<script>alert(1)</script> ou event handlers como onload=), anulando a proteção principal do CSP contra XSS.",
          remediation: "Remova 'unsafe-inline' e adicione nonces dinâmicos (ex: 'nonce-rAnd0m123') ou hashes criptográficos dos scripts permitidos."
        });
        score -= 30;
      } else {
        findings.push({
          id: 'script-unsafe-inline-ignored-by-nonce',
          severity: 'INFO',
          directive: 'script-src',
          title: "'unsafe-inline' com Nonce de Compatibilidade",
          description: "Em navegadores modernos com suporte a CSP2+, 'unsafe-inline' é ignorado quando um nonce/hash está presente (útil como fallback para navegadores antigos).",
          remediation: "Mantenha o nonce dinâmico gerado a cada requisição."
        });
      }
    }

    // Check unsafe-eval
    if (scriptSrc.includes("'unsafe-eval'")) {
      findings.push({
        id: 'script-unsafe-eval',
        severity: 'MEDIUM',
        directive: 'script-src',
        title: "Uso de 'unsafe-eval'",
        description: "Permite a utilização de funções como eval(), setTimeout('string') e new Function(), aumentando a superfície para DOM-based XSS.",
        remediation: "Refatore o código para evitar eval() e bibliotecas legadas que requerem geração dinâmica de código."
      });
      score -= 10;
    }

    // Check wildcards in script-src
    if (scriptSrc.includes('*') || scriptSrc.includes('http:') || scriptSrc.includes('https:')) {
      findings.push({
        id: 'script-wildcard',
        severity: 'CRITICAL',
        directive: 'script-src',
        title: 'Wildcard ou Esquema Amplo em script-src',
        description: "Permite carregar scripts de qualquer servidor HTTP/HTTPS na internet (* ou https:), permitindo que um atacante hospede um script malicioso externamente e o inclua na página.",
        remediation: "Substitua wildcards por domínios específicos e confiáveis (ou 'self')."
      });
      score -= 35;
    }

    // Check data: in script-src
    if (scriptSrc.includes('data:')) {
      findings.push({
        id: 'script-data-scheme',
        severity: 'CRITICAL',
        directive: 'script-src',
        title: "Esquema data: Permitido em script-src",
        description: "Permite carregar scripts codificados via data:text/javascript;base64,..., facilitando bypass imediato de CSP para injeção de XSS.",
        remediation: "Remova data: da diretiva script-src."
      });
      score -= 30;
    }
  }

  // 3. Check object-src
  const objectSrc = directives['object-src'] || directives['default-src'] || [];
  if (objectSrc.length === 0 || !objectSrc.includes("'none'")) {
    findings.push({
      id: 'object-src-not-none',
      severity: 'HIGH',
      directive: 'object-src',
      title: "object-src Não Configurado como 'none'",
      description: "Permite a incorporação de plugins legados (<object>, <embed>, <applet>) que podem contornar políticas de segurança do navegador.",
      remediation: "Defina explicitamente object-src 'none'."
    });
    score -= 15;
  }

  // 4. Check base-uri
  if (!directives['base-uri'] || directives['base-uri'].includes('*')) {
    findings.push({
      id: 'base-uri-missing',
      severity: 'HIGH',
      directive: 'base-uri',
      title: "Ausência ou Wildcard em base-uri",
      description: "Sem restrições em base-uri, um atacante pode injetar uma tag <base href='https://evil.com/'> para sequestrar todas as URLs relativas da página.",
      remediation: "Defina base-uri 'self' ou base-uri 'none'."
    });
    score -= 15;
  }

  // 5. Check frame-ancestors (Clickjacking)
  if (!directives['frame-ancestors']) {
    findings.push({
      id: 'frame-ancestors-missing',
      severity: 'MEDIUM',
      directive: 'frame-ancestors',
      title: 'Ausência de frame-ancestors (Proteção Anti-Clickjacking)',
      description: 'A diretiva frame-ancestors substitui o antigo cabeçalho X-Frame-Options, controlando quem pode embutir esta página em um <iframe>.',
      remediation: "Defina frame-ancestors 'none' (para bloquear totalmente o embedding) ou frame-ancestors 'self'."
    });
    score -= 10;
  }

  // Positive findings if well configured
  if (objectSrc.includes("'none'") && directives['base-uri'] && !scriptSrc.includes("'unsafe-inline'") && !scriptSrc.includes('*')) {
    findings.push({
      id: 'hardened-baseline',
      severity: 'PASS',
      title: 'Hardening Essencial Configurado',
      description: "A política restringe object-src 'none', previne injeção de <base> tag e não utiliza wildcards permissivos.",
      remediation: 'Mantenha a política atualizada e monitore relatórios de violação.'
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  let rating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (finalScore >= 95) rating = 'A+';
  else if (finalScore >= 85) rating = 'A';
  else if (finalScore >= 70) rating = 'B';
  else if (finalScore >= 50) rating = 'C';
  else if (finalScore >= 30) rating = 'D';
  else rating = 'F';

  return {
    parsedDirectives: directives,
    rawPolicy: trimmed,
    rating,
    score: finalScore,
    isEnforcing: true,
    findings,
    generatedConfigs: generateCspSnippets(trimmed)
  };
}

export function generateCspSnippets(policy: string): { nginx: string; apache: string; expressHelmet: string; htmlMeta: string } {
  const oneLine = policy.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    nginx: `# Nginx Configuration\nadd_header Content-Security-Policy "${oneLine}" always;`,
    apache: `# Apache .htaccess Configuration\n<IfModule mod_headers.c>\n    Header set Content-Security-Policy "${oneLine}"\n</IfModule>`,
    expressHelmet: `// Node.js Express with Helmet Middleware\nimport helmet from "helmet";\n\napp.use(\n  helmet.contentSecurityPolicy({\n    directives: {\n      defaultSrc: ["'self'"],\n      scriptSrc: ["'self'", "'nonce-rAnd0mSecret'"],\n      objectSrc: ["'none'"],\n      baseUri: ["'self'"],\n      frameAncestors: ["'none'"]\n    }\n  })\n);`,
    htmlMeta: `<!-- HTML Entry Point Header -->\n<meta http-equiv="Content-Security-Policy" content="${oneLine}">`
  };
}

export const SAMPLE_CSP_POLICIES = [
  {
    name: 'Strict CSP (Recomendado OIDC & SPA)',
    description: 'Política padrão ouro com nonces dinâmicos, sem scripts inline arbitrários.',
    policy: "default-src 'self'; script-src 'self' 'nonce-EDNnf03nceEc1hg9ad'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
  },
  {
    name: 'Vulnerável: Wildcards & unsafe-inline',
    description: 'CSP que não protege contra XSS devido a * em script-src e falta de frame-ancestors.',
    policy: "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data:;"
  },
  {
    name: 'Moderado: SaaS Multi-Origem (API + CDNs)',
    description: 'Política com whitelist de origens conhecidas (Google Analytics, Stripe, CDNs).',
    policy: "default-src 'self'; script-src 'self' https://js.stripe.com https://cdn.jsdelivr.net; connect-src 'self' https://api.stripe.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self';"
  },
  {
    name: 'Inseguro: data: URI em scripts e sem object-src',
    description: 'Permite execução via data: URIs e não bloqueia plugins legados.',
    policy: "script-src 'self' data: https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline';"
  }
];
