// DLP (Data Loss Prevention) & Token Sanitizer Engine
// Automatically detects and redacts secrets, credentials, tokens, and PII from reports & PoCs

export interface DetectedSecret {
  type: string;
  label: string;
  matchedText: string;
  redactedText: string;
  startIndex: number;
  endIndex: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface SanitizationResult {
  originalText: string;
  sanitizedText: string;
  secretsCount: number;
  findings: DetectedSecret[];
}

interface SecretPattern {
  name: string;
  label: string;
  regex: RegExp;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  maskFormat: (match: string) => string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'openai_key',
    label: 'OpenAI Secret Key',
    regex: /sk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,64}/g,
    severity: 'CRITICAL',
    maskFormat: (m) => `sk-[REDACTED_OPENAI_KEY_${m.slice(-4)}]`
  },
  {
    name: 'google_api_key',
    label: 'Google API Key',
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    severity: 'CRITICAL',
    maskFormat: (m) => `AIza[REDACTED_GOOGLE_KEY_${m.slice(-4)}]`
  },
  {
    name: 'github_pat',
    label: 'GitHub Personal Access Token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,40}|github_pat_[A-Za-z0-9_]{82}/g,
    severity: 'CRITICAL',
    maskFormat: (m) => `ghp_[REDACTED_GITHUB_TOKEN_${m.slice(-4)}]`
  },
  {
    name: 'aws_access_key',
    label: 'AWS Access Key ID',
    regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
    severity: 'CRITICAL',
    maskFormat: (m) => `${m.slice(0, 4)}[REDACTED_AWS_KEY_${m.slice(-4)}]`
  },
  {
    name: 'jwt_token',
    label: 'JWT / Bearer Token',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: 'HIGH',
    maskFormat: () => 'eyJ[REDACTED_JWT_TOKEN]'
  },
  {
    name: 'bearer_header',
    label: 'Authorization Bearer Header',
    regex: /Authorization:\s*Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi,
    severity: 'HIGH',
    maskFormat: () => 'Authorization: Bearer [REDACTED_AUTH_TOKEN]'
  },
  {
    name: 'slack_token',
    label: 'Slack Bot / User Token',
    regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g,
    severity: 'CRITICAL',
    maskFormat: () => 'xoxb-[REDACTED_SLACK_TOKEN]'
  },
  {
    name: 'private_key',
    label: 'RSA / OpenSSH Private Key',
    regex: /-----BEGIN (?:RSA|OPENSSH|EC|DSA)? PRIVATE KEY-----[^-]+-----END (?:RSA|OPENSSH|EC|DSA)? PRIVATE KEY-----/gs,
    severity: 'CRITICAL',
    maskFormat: () => '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_PAYLOAD]\n-----END PRIVATE KEY-----'
  },
  {
    name: 'brazilian_cpf',
    label: 'CPF (Documento Pessoal)',
    regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    severity: 'MEDIUM',
    maskFormat: () => '***.***.***-**'
  },
  {
    name: 'email_address',
    label: 'E-mail Pessoal',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    severity: 'MEDIUM',
    maskFormat: (m) => {
      const parts = m.split('@');
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
      return `${maskedName}@${domain}`;
    }
  },
  {
    name: 'db_connection_url',
    label: 'Database Connection String with Password',
    regex: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:([^@]+)@[^\/]+/g,
    severity: 'CRITICAL',
    maskFormat: (m) => m.replace(/:([^@]+)@/, ':[REDACTED_PASSWORD]@')
  }
];

export function sanitizeText(text: string): SanitizationResult {
  if (!text) {
    return {
      originalText: '',
      sanitizedText: '',
      secretsCount: 0,
      findings: []
    };
  }

  let sanitized = text;
  const findings: DetectedSecret[] = [];

  for (const pattern of SECRET_PATTERNS) {
    // Reset regex index
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const matchedStr = match[0];
      const redacted = pattern.maskFormat(matchedStr);

      findings.push({
        type: pattern.name,
        label: pattern.label,
        matchedText: matchedStr,
        redactedText: redacted,
        startIndex: match.index,
        endIndex: match.index + matchedStr.length,
        severity: pattern.severity
      });
    }

    // Apply global replace
    pattern.regex.lastIndex = 0;
    sanitized = sanitized.replace(pattern.regex, pattern.maskFormat);
  }

  return {
    originalText: text,
    sanitizedText: sanitized,
    secretsCount: findings.length,
    findings
  };
}
