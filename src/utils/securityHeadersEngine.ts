export interface SecurityHeaderAudit {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
  currentValue?: string;
  recommendedValue: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  remediation: string;
}

export interface SecurityHeadersAuditResult {
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  headersCount: number;
  passedCount: number;
  warnCount: number;
  failCount: number;
  audits: SecurityHeaderAudit[];
  disclosedServers: string[];
  remediationSnippets: {
    nginx: string;
    apache: string;
    caddy: string;
    expressHelmet: string;
  };
}

export function parseRawHttpHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('HTTP/')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim().toLowerCase();
      const val = trimmed.substring(colonIdx + 1).trim();
      headers[key] = val;
    }
  }

  return headers;
}

export function auditSecurityHeaders(rawHeaders: string): SecurityHeadersAuditResult {
  const headers = parseRawHttpHeaders(rawHeaders);
  const audits: SecurityHeaderAudit[] = [];
  const disclosedServers: string[] = [];
  let score = 100;

  // 1. Strict-Transport-Security (HSTS)
  const hsts = headers['strict-transport-security'];
  if (!hsts) {
    audits.push({
      name: 'Strict-Transport-Security',
      status: 'FAIL',
      recommendedValue: 'max-age=63072000; includeSubDomains; preload',
      importance: 'CRITICAL',
      title: 'HSTS Ausente',
      description: 'Permite ataques de downgrade SSL/TLS (como SSLstrip) e man-in-the-middle na primeira visita do usuário.',
      remediation: 'Adicione Strict-Transport-Security com no mínimo 1 ano (31536000s), includeSubDomains e considere submissão ao HSTS Preload.'
    });
    score -= 20;
  } else {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
    if (maxAge < 15768000) {
      // less than 6 months
      audits.push({
        name: 'Strict-Transport-Security',
        status: 'WARN',
        currentValue: hsts,
        recommendedValue: 'max-age=63072000; includeSubDomains; preload',
        importance: 'HIGH',
        title: 'HSTS com Duração Curta',
        description: `max-age está configurado para ${maxAge} segundos. O recomendado é no mínimo 1 a 2 anos (31536000 a 63072000).`,
        remediation: 'Aumente o max-age para 63072000.'
      });
      score -= 5;
    } else {
      audits.push({
        name: 'Strict-Transport-Security',
        status: 'PASS',
        currentValue: hsts,
        recommendedValue: 'max-age=63072000; includeSubDomains; preload',
        importance: 'CRITICAL',
        title: 'HSTS Configurado Corretamente',
        description: 'Força o navegador a utilizar conexões seguras HTTPS ininterruptamente.',
        remediation: 'Mantenha ativo.'
      });
    }
  }

  // 2. X-Content-Type-Options
  const xcto = headers['x-content-type-options'];
  if (!xcto || xcto.toLowerCase() !== 'nosniff') {
    audits.push({
      name: 'X-Content-Type-Options',
      status: 'FAIL',
      currentValue: xcto,
      recommendedValue: 'nosniff',
      importance: 'HIGH',
      title: 'MIME-Sniffing Não Bloqueado',
      description: 'O navegador pode tentar inferir o tipo MIME do conteúdo (sniffing), transformando uploads de imagens ou textos em vetores de XSS executáveis.',
      remediation: 'Defina X-Content-Type-Options: nosniff.'
    });
    score -= 15;
  } else {
    audits.push({
      name: 'X-Content-Type-Options',
      status: 'PASS',
      currentValue: xcto,
      recommendedValue: 'nosniff',
      importance: 'HIGH',
      title: 'MIME-Sniffing Protegido (nosniff)',
      description: 'Impede o navegador de adivinhar o Content-Type de recursos.',
      remediation: 'Mantenha ativo.'
    });
  }

  // 3. Content-Security-Policy
  const csp = headers['content-security-policy'];
  if (!csp) {
    audits.push({
      name: 'Content-Security-Policy',
      status: 'FAIL',
      recommendedValue: "default-src 'self'; script-src 'self'; object-src 'none';",
      importance: 'CRITICAL',
      title: 'Content-Security-Policy Ausente',
      description: 'Sem restrições de execução de scripts, permitindo execução de código arbitrário em caso de falha de XSS.',
      remediation: "Implemente um CSP com default-src 'self' e object-src 'none'."
    });
    score -= 25;
  } else {
    audits.push({
      name: 'Content-Security-Policy',
      status: 'PASS',
      currentValue: csp.length > 80 ? csp.substring(0, 80) + '...' : csp,
      recommendedValue: "default-src 'self'; object-src 'none';",
      importance: 'CRITICAL',
      title: 'CSP Presente',
      description: 'Política de controle de fontes e origens ativada.',
      remediation: 'Utilize o CSP Studio do BugSentinel para auditar a robustez das diretivas.'
    });
  }

  // 4. X-Frame-Options or frame-ancestors
  const xfo = headers['x-frame-options'];
  if (!xfo && (!csp || !csp.includes('frame-ancestors'))) {
    audits.push({
      name: 'X-Frame-Options / frame-ancestors',
      status: 'FAIL',
      recommendedValue: 'DENY ou SAMEORIGIN',
      importance: 'HIGH',
      title: 'Proteção Anti-Clickjacking Ausente',
      description: 'A página pode ser incorporada em <iframe> por sites externos maliciosos para capturar cliques de usuários autenticados.',
      remediation: "Adicione X-Frame-Options: DENY ou configure frame-ancestors 'none' no CSP."
    });
    score -= 15;
  } else {
    audits.push({
      name: 'X-Frame-Options',
      status: 'PASS',
      currentValue: xfo || 'Mitigado via CSP frame-ancestors',
      recommendedValue: 'DENY',
      importance: 'HIGH',
      title: 'Clickjacking Mitigado',
      description: 'Impede a renderização em iframes de terceiros.',
      remediation: 'Mantenha ativo.'
    });
  }

  // 5. Referrer-Policy
  const refPol = headers['referrer-policy'];
  if (!refPol) {
    audits.push({
      name: 'Referrer-Policy',
      status: 'WARN',
      recommendedValue: 'strict-origin-when-cross-origin',
      importance: 'MEDIUM',
      title: 'Referrer-Policy Não Definido',
      description: 'Pode vazar tokens de sessão ou parâmetros de URL sensíveis no cabeçalho Referer ao navegar para links externos.',
      remediation: 'Configure Referrer-Policy: strict-origin-when-cross-origin ou no-referrer.'
    });
    score -= 10;
  } else {
    audits.push({
      name: 'Referrer-Policy',
      status: 'PASS',
      currentValue: refPol,
      recommendedValue: 'strict-origin-when-cross-origin',
      importance: 'MEDIUM',
      title: 'Referrer-Policy Configurado',
      description: 'Controla a exposição de URLs no cabeçalho Referer.',
      remediation: 'Mantenha ativo.'
    });
  }

  // 6. Permissions-Policy (Feature-Policy)
  const permPol = headers['permissions-policy'];
  if (!permPol) {
    audits.push({
      name: 'Permissions-Policy',
      status: 'WARN',
      recommendedValue: 'camera=(), microphone=(), geolocation=()',
      importance: 'LOW',
      title: 'Permissions-Policy Ausente',
      description: 'Recursos sensíveis do hardware (câmera, microfone, geolocalização) não estão explicitamente restritos.',
      remediation: 'Defina Permissions-Policy desabilitando APIs de hardware desnecessárias.'
    });
    score -= 5;
  } else {
    audits.push({
      name: 'Permissions-Policy',
      status: 'PASS',
      currentValue: permPol,
      recommendedValue: 'camera=(), microphone=(), geolocation=()',
      importance: 'LOW',
      title: 'Permissions-Policy Configurado',
      description: 'APIs restritas adequadamente.',
      remediation: 'Mantenha atualizado com os recursos exigidos.'
    });
  }

  // 7. Leakage of Server & Powered-By
  if (headers['server']) {
    disclosedServers.push(`Server: ${headers['server']}`);
    score -= 5;
  }
  if (headers['x-powered-by']) {
    disclosedServers.push(`X-Powered-By: ${headers['x-powered-by']}`);
    score -= 5;
  }
  if (headers['x-aspnet-version']) {
    disclosedServers.push(`X-AspNet-Version: ${headers['x-aspnet-version']}`);
    score -= 5;
  }

  const finalScore = Math.max(0, Math.min(100, score));
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (finalScore >= 95) grade = 'A+';
  else if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else if (finalScore >= 30) grade = 'D';
  else grade = 'F';

  const passedCount = audits.filter(a => a.status === 'PASS').length;
  const warnCount = audits.filter(a => a.status === 'WARN').length;
  const failCount = audits.filter(a => a.status === 'FAIL').length;

  return {
    score: finalScore,
    grade,
    headersCount: Object.keys(headers).length,
    passedCount,
    warnCount,
    failCount,
    audits,
    disclosedServers,
    remediationSnippets: generateRemediationSnippets()
  };
}

function generateRemediationSnippets() {
  return {
    nginx: `# Hardened Nginx Security Headers Configuration
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'none';" always;
server_tokens off;`,

    apache: `# Apache .htaccess Configuration
<IfModule mod_headers.c>
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Header always set Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'none';"
    Header unset X-Powered-By
</IfModule>
ServerSignature Off`,

    caddy: `# Caddyfile Security Headers Directive
header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'none';"
    -Server
    -X-Powered-By
}`,

    expressHelmet: `// Node.js Express Server with Helmet
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin"
    }
  })
);`
  };
}

export const SAMPLE_HTTP_HEADERS = [
  {
    name: 'Headers Seguros (Nota A+)',
    raw: `HTTP/2 200 OK
content-type: text/html; charset=UTF-8
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
content-security-policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';`
  },
  {
    name: 'Headers Inseguros com Vazamento (Nota F)',
    raw: `HTTP/1.1 200 OK
Date: Mon, 21 Sep 2026 12:00:00 GMT
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Content-Type: text/html; charset=UTF-8`
  },
  {
    name: 'Headers Parciais (Nota C)',
    raw: `HTTP/2 200 OK
content-type: application/json; charset=utf-8
strict-transport-security: max-age=3600
x-content-type-options: nosniff
server: cloudflare`
  }
];
