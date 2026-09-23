/**
 * Utility for XOR encryption, Base64 transformation, URL encoding,
 * and multi-stage payload obfuscation & deobfuscation.
 */

export interface XorBruteResult {
  key: number;
  hexKey: string;
  charKey: string;
  decryptedText: string;
  asciiScore: number;
}

export interface ObfuscationPipelineOption {
  useXor: boolean;
  xorKey: string;
  xorKeyType: 'text' | 'hex' | 'byte';
  useBase64: boolean;
  base64Mode: 'standard' | 'url_safe' | 'eval_js';
  useUrlEncode: boolean;
  urlMode: 'standard' | 'double' | 'full' | 'special_only';
}

export interface PipelineStepResult {
  stepName: string;
  technique: 'XOR' | 'BASE64' | 'URL' | 'INPUT';
  output: string;
  byteLength: number;
  description: string;
}

/**
 * Converts string or hex key into byte array
 */
export function parseXorKey(key: string, keyType: 'text' | 'hex' | 'byte'): number[] {
  if (!key || key.length === 0) return [0x5a]; // Default fallback key

  if (keyType === 'byte') {
    const num = parseInt(key, 10);
    return isNaN(num) ? [0x5a] : [num & 0xff];
  }

  if (keyType === 'hex') {
    const cleanHex = key.replace(/0x|\\x|\s+/gi, '');
    if (/^[0-9a-fA-F]+$/.test(cleanHex) && cleanHex.length >= 2) {
      const bytes: number[] = [];
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes.push(parseInt(cleanHex.substr(i, 2), 16));
      }
      return bytes.length > 0 ? bytes : [0x5a];
    }
    return [0x5a];
  }

  // Text string key
  const bytes: number[] = [];
  for (let i = 0; i < key.length; i++) {
    bytes.push(key.charCodeAt(i) & 0xff);
  }
  return bytes.length > 0 ? bytes : [0x5a];
}

/**
 * Performs XOR encryption/decryption on input string with a repeating key
 */
export function xorTransform(input: string, keyBytes: number[]): Uint8Array {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input);
  const result = new Uint8Array(inputBytes.length);

  for (let i = 0; i < inputBytes.length; i++) {
    const k = keyBytes[i % keyBytes.length];
    result[i] = inputBytes[i] ^ k;
  }

  return result;
}

/**
 * Performs XOR on raw Uint8Array bytes
 */
export function xorTransformBytes(inputBytes: Uint8Array, keyBytes: number[]): Uint8Array {
  const result = new Uint8Array(inputBytes.length);
  for (let i = 0; i < inputBytes.length; i++) {
    const k = keyBytes[i % keyBytes.length];
    result[i] = inputBytes[i] ^ k;
  }
  return result;
}

/**
 * Converts Uint8Array to Hex string representation
 */
export function bytesToHex(bytes: Uint8Array, format: 'slashX' | '0x' | 'raw' | 'space' = 'slashX'): string {
  const hexArr: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hexArr.push(bytes[i].toString(16).padStart(2, '0').toLowerCase());
  }

  if (format === 'slashX') return hexArr.map(h => '\\x' + h).join('');
  if (format === '0x') return '0x' + hexArr.join('');
  if (format === 'space') return hexArr.join(' ');
  return hexArr.join('');
}

/**
 * Converts Uint8Array to Base64
 */
export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  if (urlSafe) {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return b64;
}

/**
 * Converts Base64 string back to Uint8Array
 */
export function base64ToBytes(b64: string): Uint8Array {
  let sanitized = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (sanitized.length % 4 !== 0) sanitized += '=';
  const binary = atob(sanitized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts Hex string back to Uint8Array
 */
export function hexToBytes(hexStr: string): Uint8Array {
  const clean = hexStr.replace(/0x|\\x|\s+|,/gi, '');
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('Hex inválido ou tamanho ímpar');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Applies URL encoding variation to string
 */
export function applyUrlEncode(input: string, mode: 'standard' | 'double' | 'full' | 'special_only'): string {
  if (mode === 'standard') {
    return encodeURIComponent(input);
  }
  if (mode === 'double') {
    return encodeURIComponent(encodeURIComponent(input));
  }
  if (mode === 'full') {
    return input
      .split('')
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
      .join('');
  }
  // special_only: only encode quotes, tags, spaces, semicolons, brackets
  return input.replace(/[<>'";&|() `$[\]\\]/g, c => encodeURIComponent(c));
}

/**
 * Brute forces single-byte XOR (0x01 - 0xFF) and scores output by ASCII readability
 */
export function bruteForceSingleByteXor(ciphertextBytes: Uint8Array, topN = 8): XorBruteResult[] {
  const results: XorBruteResult[] = [];
  const len = ciphertextBytes.length;

  for (let k = 1; k <= 255; k++) {
    let printableAsciiCount = 0;
    let decodedChars = '';

    for (let i = 0; i < len; i++) {
      const charCode = ciphertextBytes[i] ^ k;
      // printable ASCII: 32 (space) to 126 (~), plus \r, \n, \t
      if ((charCode >= 32 && charCode <= 126) || charCode === 9 || charCode === 10 || charCode === 13) {
        printableAsciiCount++;
        decodedChars += String.fromCharCode(charCode);
      } else {
        decodedChars += '·';
      }
    }

    const score = Math.round((printableAsciiCount / len) * 100);
    // Extra boost if common English / programming words appear
    const lower = decodedChars.toLowerCase();
    let keywordBonus = 0;
    const keywords = ['select', 'union', 'script', 'alert', 'http', 'bash', 'curl', 'admin', 'where', 'from', 'drop', 'exec'];
    for (const kw of keywords) {
      if (lower.includes(kw)) keywordBonus += 15;
    }

    results.push({
      key: k,
      hexKey: '0x' + k.toString(16).padStart(2, '0').toUpperCase(),
      charKey: k >= 32 && k <= 126 ? String.fromCharCode(k) : `(${k})`,
      decryptedText: decodedChars,
      asciiScore: Math.min(100, score + keywordBonus)
    });
  }

  results.sort((a, b) => b.asciiScore - a.asciiScore);
  return results.slice(0, topN);
}

/**
 * Runs a multi-stage combined obfuscation pipeline (e.g. XOR -> Base64 -> URL)
 */
export function runObfuscationPipeline(
  input: string,
  options: ObfuscationPipelineOption
): { finalOutput: string; steps: PipelineStepResult[] } {
  const steps: PipelineStepResult[] = [];

  steps.push({
    stepName: 'Entrada Original',
    technique: 'INPUT',
    output: input,
    byteLength: new TextEncoder().encode(input).length,
    description: 'String bruta fornecida'
  });

  let currentBytes: Uint8Array = new TextEncoder().encode(input);
  let currentString = input;

  // 1. XOR Encryption stage
  if (options.useXor) {
    const keyBytes = parseXorKey(options.xorKey, options.xorKeyType);
    currentBytes = xorTransform(currentString, keyBytes);
    const hexRep = bytesToHex(currentBytes, 'slashX');
    currentString = hexRep;

    steps.push({
      stepName: `XOR Criptografia (Chave: ${options.xorKey || '0x5A'})`,
      technique: 'XOR',
      output: hexRep,
      byteLength: currentBytes.length,
      description: `Mascara os bytes com XOR (${keyBytes.length} byte(s) na chave)`
    });
  }

  // 2. Base64 Encoding stage
  if (options.useBase64) {
    let b64 = '';
    if (options.useXor) {
      // Encode XOR bytes directly to Base64
      b64 = bytesToBase64(currentBytes, options.base64Mode === 'url_safe');
    } else {
      // Standard string Base64
      const utf8Bytes = encodeURIComponent(currentString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      );
      b64 = btoa(utf8Bytes);
      if (options.base64Mode === 'url_safe') {
        b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
    }

    if (options.base64Mode === 'eval_js') {
      b64 = `eval(atob('${b64}'))`;
    }

    currentString = b64;
    steps.push({
      stepName: `Base64 (${options.base64Mode.toUpperCase()})`,
      technique: 'BASE64',
      output: currentString,
      byteLength: new TextEncoder().encode(currentString).length,
      description: 'Converte os bytes mascarados em representação ASCII imprimível'
    });
  }

  // 3. URL Encoding stage
  if (options.useUrlEncode) {
    const urlEncoded = applyUrlEncode(currentString, options.urlMode);
    currentString = urlEncoded;

    steps.push({
      stepName: `URL Encode (${options.urlMode.toUpperCase()})`,
      technique: 'URL',
      output: currentString,
      byteLength: new TextEncoder().encode(currentString).length,
      description: 'Evasão para trânsito via parâmetros GET/POST HTTP'
    });
  }

  return {
    finalOutput: currentString,
    steps
  };
}

/**
 * Generates self-contained self-decrypting runtime stubs for testing/research
 */
export function generateSelfDecryptingStub(
  language: 'python' | 'javascript' | 'bash' | 'powershell',
  payloadRaw: string,
  key: string
): string {
  const safeKey = key || '5A';
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(payloadRaw);
  const keyBytes = parseXorKey(safeKey, 'text');
  const xorBytes = xorTransformBytes(rawBytes, keyBytes);
  const b64Xor = bytesToBase64(xorBytes);
  const hexXor = bytesToHex(xorBytes, 'raw');

  if (language === 'python') {
    return `# Python 3 - XOR Payload Self-Decryptor
import base64

key = "${safeKey}"
cipher = base64.b64decode("${b64Xor}")
decrypted = "".join(chr(b ^ ord(key[i % len(key)])) for i, b in enumerate(cipher))
print(f"[*] Payload Restaurado: {decrypted}")
# exec(decrypted) # Para simulação de execução`;
  }

  if (language === 'javascript') {
    return `// JavaScript / Node.js - XOR Payload Self-Decryptor
const key = "${safeKey}";
const cipher = atob("${b64Xor}");
const decrypted = cipher.split('').map((c, i) => 
  String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
).join('');
console.log("[*] Payload Restaurado:", decrypted);
// eval(decrypted); // Para simulação no console`;
  }

  if (language === 'bash') {
    return `# Linux Bash - XOR Hex Unpacker
key="${safeKey}"
hex_data="${hexXor}"
python3 -c "
k = '$key'
h = bytes.fromhex('$hex_data')
res = bytes([b ^ ord(k[i % len(k)]) for i, b in enumerate(h)]).decode()
print(res)
"`;
  }

  // PowerShell
  return `# PowerShell - XOR Base64 Self-Decryptor
$key = "${safeKey}"
$cipher = [System.Convert]::FromBase64String("${b64Xor}")
$decryptedBytes = New-Object byte[] $cipher.Length
for ($i = 0; $i -lt $cipher.Length; $i++) {
    $decryptedBytes[$i] = $cipher[$i] -bxor [int]$key[$i % $key.Length]
}
$decrypted = [System.Text.Encoding]::UTF8.GetString($decryptedBytes)
Write-Host "[*] Payload Restaurado: $decrypted"`;
}
