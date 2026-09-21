export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
  jku?: string;
  jwk?: Record<string, unknown>;
  x5u?: string;
  x5c?: string[];
  [key: string]: unknown;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  roles?: string[];
  role?: string;
  email?: string;
  username?: string;
  isAdmin?: boolean;
  admin?: boolean;
  [key: string]: unknown;
}

export interface JwtFinding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  remediation: string;
  cwe?: string;
}

export interface JwtAuditResult {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
  rawHeader: string;
  rawPayload: string;
  isValidFormat: boolean;
  error?: string;
  findings: JwtFinding[];
  securityScore: number; // 0 to 100
  expirationStatus: 'VALID' | 'EXPIRED' | 'NO_EXP' | 'FUTURE_NOT_BEFORE';
  expirationFormatted?: string;
  issuedAtFormatted?: string;
}

function base64UrlDecode(str: string): string {
  // Replace base64url characters to standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function parseAndAuditJwt(token: string): JwtAuditResult {
  const trimmed = token.trim();
  const parts = trimmed.split('.');

  if (parts.length < 2 || parts.length > 3) {
    return {
      header: {},
      payload: {},
      signature: '',
      rawHeader: '',
      rawPayload: '',
      isValidFormat: false,
      error: 'Formato inválido. Um JWT válido deve conter 3 segmentos separados por ponto (Header.Payload.Signature).',
      findings: [],
      securityScore: 0,
      expirationStatus: 'NO_EXP'
    };
  }

  let header: JwtHeader = {};
  let payload: JwtPayload = {};
  let rawHeader = '';
  let rawPayload = '';
  const signature = parts[2] || '';

  try {
    rawHeader = base64UrlDecode(parts[0]);
    header = JSON.parse(rawHeader);
  } catch (e) {
    return {
      header: {},
      payload: {},
      signature,
      rawHeader: parts[0],
      rawPayload: parts[1],
      isValidFormat: false,
      error: 'Falha ao decodificar o cabeçalho (Header JSON inválido ou Base64 corrompido).',
      findings: [],
      securityScore: 0,
      expirationStatus: 'NO_EXP'
    };
  }

  try {
    rawPayload = base64UrlDecode(parts[1]);
    payload = JSON.parse(rawPayload);
  } catch (e) {
    return {
      header,
      payload: {},
      signature,
      rawHeader,
      rawPayload: parts[1],
      isValidFormat: false,
      error: 'Falha ao decodificar o corpo (Payload JSON inválido ou Base64 corrompido).',
      findings: [],
      securityScore: 0,
      expirationStatus: 'NO_EXP'
    };
  }

  const findings: JwtFinding[] = [];
  let score = 100;

  // 1. Audit Header Algorithm
  const alg = (header.alg || '').toUpperCase();
  if (!header.alg || alg === 'NONE') {
    findings.push({
      id: 'alg-none',
      severity: 'CRITICAL',
      title: 'Algoritmo "none" Ativo / Assinatura Inexistente',
      description: 'O cabeçalho especifica "alg": "none", indicando que o token não possui assinatura criptográfica. Aplicações vulneráveis aceitam payloads forjados sem autenticação.',
      remediation: 'Rejeite terminantemente tokens com alg="none" na validação de backend. Force algoritmos assimétricos (RS256/ES256) ou HMAC seguro.',
      cwe: 'CWE-327: Use of a Broken or Risky Cryptographic Algorithm'
    });
    score -= 40;
  } else if (alg === 'HS256') {
    findings.push({
      id: 'alg-hs256-symmetric',
      severity: 'INFO',
      title: 'Uso de Criptografia Simétrica (HMAC-SHA256)',
      description: 'HS256 compartilha o mesmo segredo para assinatura e verificação. Se o segredo for fraco, pode ser quebrado por força bruta (hashcat) ou sofrer confusão com chave pública (Key Confusion Attack).',
      remediation: 'Utilize segredos de alta entropia (mínimo 256 bits) ou prefira RS256/ES256 para desacoplar emissão e verificação.',
      cwe: 'CWE-326: Inadequate Encryption Strength'
    });
  }

  // 2. Audit Header Injection Vectors
  if (header.jku) {
    findings.push({
      id: 'header-jku',
      severity: 'HIGH',
      title: 'Cabeçalho JKU (JWK Set URL) Presente',
      description: `O token referencia uma URL de chaves públicas externa ("${header.jku}"). Se o backend não validar estritamente a whitelist de domínios, um atacante pode apontar para um JWKS sob seu controle e assinar qualquer token.`,
      remediation: 'Implemente verificação estrita de domínio para o header jku ou desabilite seu processamento dinâmico.',
      cwe: 'CWE-829: Inclusion of Functionality from Untrusted Sphere'
    });
    score -= 20;
  }

  if (header.jwk) {
    findings.push({
      id: 'header-jwk-embedded',
      severity: 'HIGH',
      title: 'Chave Pública Incorporada no Cabeçalho (JWK Injection)',
      description: 'O cabeçalho embute a própria chave pública usada para validar a assinatura. Se o servidor aceitar essa chave sem verificar confiabilidade prévia, qualquer pessoa pode assinar tokens válidos.',
      remediation: 'Desabilite verificação baseada em chaves embutidas no cabeçalho. Utilize apenas chaves locais ou de repositórios confiáveis.',
      cwe: 'CWE-347: Improper Verification of Cryptographic Signature'
    });
    score -= 25;
  }

  if (header.kid) {
    if (header.kid.includes('../') || header.kid.includes('..\\') || header.kid.includes('/') || header.kid.includes("'") || header.kid.includes('"')) {
      findings.push({
        id: 'header-kid-suspicious',
        severity: 'CRITICAL',
        title: 'KID Suspeito de Path Traversal ou Injeção SQL',
        description: `O parâmetro kid contém caracteres perigosos ("${header.kid}"). Se for utilizado diretamente em busca no sistema de arquivos (/dev/null bypass) ou consulta SQL, pode permitir assinatura arbitrária.`,
        remediation: 'Sanitize e parametrize a busca de chaves via kid, rejeitando caracteres de travessia de diretório e aspas.',
        cwe: 'CWE-22: Path Traversal'
      });
      score -= 30;
    }
  }

  // 3. Audit Expiration and Timestamps
  const now = Math.floor(Date.now() / 1000);
  let expirationStatus: 'VALID' | 'EXPIRED' | 'NO_EXP' | 'FUTURE_NOT_BEFORE' = 'VALID';
  let expirationFormatted: string | undefined;
  let issuedAtFormatted: string | undefined;

  if (payload.iat) {
    issuedAtFormatted = new Date(payload.iat * 1000).toLocaleString();
    if (payload.iat > now + 300) {
      findings.push({
        id: 'iat-future',
        severity: 'MEDIUM',
        title: 'Data de Emissão no Futuro (iat anômalo)',
        description: `O claim iat está marcado para ${issuedAtFormatted}, no futuro. Pode indicar descompasso severo de relógio (NTP) ou geração fraudulenta.`,
        remediation: 'Sincronize relógios via NTP e rejeite tokens com iat superior ao relógio atual com tolerância de poucos segundos.',
        cwe: 'CWE-613: Insufficient Session Expiration'
      });
      score -= 10;
    }
  }

  if (payload.nbf && payload.nbf > now) {
    expirationStatus = 'FUTURE_NOT_BEFORE';
    findings.push({
      id: 'nbf-active',
      severity: 'INFO',
      title: 'Token Ainda Não Válido (nbf futuro)',
      description: `O claim "nbf" (Not Before) define início de validade em ${new Date(payload.nbf * 1000).toLocaleString()}.`,
      remediation: 'Aguarde o prazo estipulado antes de utilizar.',
    });
  }

  if (!payload.exp) {
    expirationStatus = 'NO_EXP';
    findings.push({
      id: 'exp-missing',
      severity: 'HIGH',
      title: 'Ausência de Expiração (exp claim)',
      description: 'O token não possui data de expiração (claim "exp"). Tokens permanentes representam alto risco se interceptados, pois nunca expiram por conta própria.',
      remediation: 'Sempre inclua o claim "exp" limitando a vida útil do token (ex: 15 a 60 minutos para Access Tokens).',
      cwe: 'CWE-613: Insufficient Session Expiration'
    });
    score -= 25;
  } else {
    expirationFormatted = new Date(payload.exp * 1000).toLocaleString();
    if (payload.exp < now) {
      expirationStatus = 'EXPIRED';
      findings.push({
        id: 'exp-expired',
        severity: 'LOW',
        title: 'Token Expirado',
        description: `O token expirou em ${expirationFormatted} (${Math.round((now - payload.exp) / 60)} minutos atrás).`,
        remediation: 'Renove o token utilizando um Refresh Token ou realize nova autenticação.',
      });
    } else if (payload.exp - now > 31536000) {
      // More than 1 year
      findings.push({
        id: 'exp-excessive',
        severity: 'MEDIUM',
        title: 'Validade Excessivamente Longa (> 1 ano)',
        description: `O token é válido até ${expirationFormatted}. Tokens de longa duração maximizam a janela de ataque em caso de vazamento.`,
        remediation: 'Reduza a validade de Access Tokens para menos de 24 horas e utilize mecanismos de revogação.',
        cwe: 'CWE-613: Insufficient Session Expiration'
      });
      score -= 10;
    }
  }

  // 4. Audit Audience and Issuer
  if (!payload.aud) {
    findings.push({
      id: 'aud-missing',
      severity: 'LOW',
      title: 'Ausência do Claim de Audiência (aud)',
      description: 'O token não restringe quais serviços ou APIs têm permissão para consumi-lo. Pode facilitar ataques de reutilização em outros microsserviços.',
      remediation: 'Defina o claim "aud" especificando explicitamente os destinatários autorizados.',
    });
    score -= 5;
  }

  if (!payload.iss) {
    findings.push({
      id: 'iss-missing',
      severity: 'LOW',
      title: 'Ausência do Claim de Emissor (iss)',
      description: 'O claim "iss" não está presente para identificar o servidor de autorização emissor.',
      remediation: 'Configure o emissor com URL canônica segura (ex: https://auth.empresa.com).',
    });
    score -= 5;
  }

  // 5. Sensitive Data Inspection in Payload
  const payloadStr = JSON.stringify(payload).toLowerCase();
  const sensitivePatterns = [
    { key: 'password', name: 'Senha em Texto Claro' },
    { key: 'secret', name: 'Chave Secreta ou API Key' },
    { key: 'credit_card', name: 'Dados de Cartão de Crédito' },
    { key: 'cpf', name: 'Documento PII (CPF)' },
    { key: 'ssn', name: 'Documento PII (SSN)' }
  ];

  sensitivePatterns.forEach(pattern => {
    if (payloadStr.includes(`"${pattern.key}"`)) {
      findings.push({
        id: `sensitive-${pattern.key}`,
        severity: 'HIGH',
        title: `Possível Vazamento de Dados: ${pattern.name}`,
        description: `O payload contém um campo sugestivo de dados confidenciais ("${pattern.key}"). JWTs não são criptografados por padrão (apenas assinados) e qualquer pessoa com acesso ao token pode lê-los.`,
        remediation: 'Nunca armazene senhas, chaves privadas ou dados de alta confidencialidade no payload de tokens JWT (prefira tokens opacos ou utilize JWE para criptografia).',
        cwe: 'CWE-312: Cleartext Storage of Sensitive Information'
      });
      score -= 20;
    }
  });

  return {
    header,
    payload,
    signature,
    rawHeader,
    rawPayload,
    isValidFormat: true,
    findings,
    securityScore: Math.max(0, Math.min(100, score)),
    expirationStatus,
    expirationFormatted,
    issuedAtFormatted
  };
}

export function forgeModifiedJwt(header: JwtHeader, payload: JwtPayload, signMode: 'NONE' | 'KEEP_SIGNATURE' = 'NONE'): string {
  const modHeader = { ...header };
  if (signMode === 'NONE') {
    modHeader.alg = 'none';
  }
  const hEnc = base64UrlEncode(JSON.stringify(modHeader));
  const pEnc = base64UrlEncode(JSON.stringify(payload));
  return signMode === 'NONE' ? `${hEnc}.${pEnc}.` : `${hEnc}.${pEnc}.modified_sig_demo`;
}

export const SAMPLE_JWTS = [
  {
    name: 'Vulnerável: Algoritmo "none" (Admin Bypass)',
    description: 'Token com alg: none e role: admin para testar validação de assinatura fraca.',
    token: `${base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64UrlEncode(JSON.stringify({ sub: '1234567890', username: 'sec_hunter', role: 'admin', isAdmin: true, iat: Math.floor(Date.now() / 1000) }))}.`
  },
  {
    name: 'Vulnerável: KID Path Traversal Injection',
    description: 'Header com kid contendo ../../../dev/null para teste de assinatura vazia.',
    token: `${base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: '../../../../dev/null' }))}.${base64UrlEncode(JSON.stringify({ sub: '4421', email: 'user@target.corp', role: 'engineer', exp: Math.floor(Date.now() / 1000) + 3600 }))}.dGVzdF9zaWduYXR1cmVfaGVyZQ`
  },
  {
    name: 'Padrão Seguro: RS256 com Expiração e Claims OIDC',
    description: 'Token corporativo robusto com emissor, audiência e expiração calculada.',
    token: `${base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'rsa-key-prod-2026' }))}.${base64UrlEncode(JSON.stringify({ iss: 'https://auth.sentinel.io', aud: 'https://api.sentinel.io/v1', sub: 'usr_883921', email: 'researcher@bugsentinel.org', roles: ['researcher', 'reporter'], iat: Math.floor(Date.now() / 1000) - 300, exp: Math.floor(Date.now() / 1000) + 3600 }))}.Q1NDMjVTaWduYXR1cmVQcm9kU2VjdXJlU2FtcGxl`
  },
  {
    name: 'Expirado: Token Vencido sem Audiência',
    description: 'Token antigo emitido no passado com expiração superada.',
    token: `${base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64UrlEncode(JSON.stringify({ sub: 'user_expired', username: 'guest_user', iat: Math.floor(Date.now() / 1000) - 86400 * 30, exp: Math.floor(Date.now() / 1000) - 86400 * 20 }))}.c2lnbmF0dXJlX2V4cGlyZWRfZGVtbw`
  }
];
