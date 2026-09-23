import React, { useState, useMemo } from 'react';
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
  KeyRound
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
  DetectedEncodingInfo
} from '../utils/encoderMultiTool';

type ToolViewMode = 'ENCODER_MATRIX' | 'DEOBFUSCATOR' | 'PIPELINE_CRAFTER' | 'RECIPES';
type DecoderFormat = 'url' | 'base64' | 'hex' | 'html' | 'unicode' | 'rot13';
type PipelineOp = 
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

export const PayloadEncoderDecoder: React.FC = () => {
  const [viewMode, setViewMode] = useState<ToolViewMode>('ENCODER_MATRIX');
  
  // Matrix Encoder state
  const [inputText, setInputText] = useState<string>(SAMPLE_ENCODER_PAYLOADS[0].payload);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Deobfuscator state
  const [deobfuscatorInput, setDeobfuscatorInput] = useState<string>(
    '%3C%73%76%67%20%6F%6E%6C%6F%61%64%3D%61%6C%65%72%74%28%64%6F%63%75%6D%65%6E%74%2E%64%6F%6D%61%69%6E%29%3E'
  );
  const [manualDecodeFormat, setManualDecodeFormat] = useState<DecoderFormat>('url');

  // Pipeline Crafter state
  const [pipelineInput, setPipelineInput] = useState<string>("1' UNION SELECT username, password FROM users--");
  const [pipelineOps, setPipelineOps] = useState<PipelineOp[]>(['sql_comment', 'base64_std', 'url_encode']);

  // Presets search
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Real-time calculations for Matrix
  const encodings = useMemo(() => {
    return computeAllEncodings(inputText);
  }, [inputText]);

  const inputEntropy = useMemo(() => {
    return calculateShannonEntropy(inputText);
  }, [inputText]);

  const inputByteLength = useMemo(() => {
    return new TextEncoder().encode(inputText).length;
  }, [inputText]);

  // Real-time calculations for Deobfuscator
  const detectedFormats: DetectedEncodingInfo[] = useMemo(() => {
    return detectPayloadEncoding(deobfuscatorInput);
  }, [deobfuscatorInput]);

  const deobfuscatorEntropy = useMemo(() => {
    return calculateShannonEntropy(deobfuscatorInput);
  }, [deobfuscatorInput]);

  const manualDecodedResult = useMemo(() => {
    return decodePayload(deobfuscatorInput, manualDecodeFormat);
  }, [deobfuscatorInput, manualDecodeFormat]);

  const recursiveSteps: DeobfuscationStep[] = useMemo(() => {
    if (!deobfuscatorInput.trim()) return [];
    return recursiveDeobfuscate(deobfuscatorInput, 5);
  }, [deobfuscatorInput]);

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

  // Filtered payloads
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

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getEntropyBadge = (entropy: number) => {
    if (entropy < 3.2) {
      return {
        label: 'Baixa (Legível / Plaintext)',
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      };
    }
    if (entropy <= 4.6) {
      return {
        label: 'Média (Ofuscado / Hex / URL)',
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      };
    }
    return {
      label: 'Alta (Empacotado / Base64 / Cripto)',
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    };
  };

  const currentEntropyInfo = getEntropyBadge(inputEntropy);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5" />
                <span>Base64 • URL • Hex Obfuscation & Evasion Suite</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Conversão em Tempo Real & Engenharia Reversa</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Canivete Suíço de Codificação & Evasão de WAF</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Forje, analise e desofusque payloads de ataque em tempo real. Suporte a variantes com <strong className="text-zinc-200">Base64 (RFC 4648, URL-safe, inline eval JS, Bash pipe)</strong>, <strong className="text-zinc-200">URL Encoding (Standard, Double, Triple, Full %XX)</strong>, <strong className="text-zinc-200">Hexadecimal (\x.., 0x.., SQL literal, continuous)</strong>, cálculo de entropia Shannon e desempacotador recursivo de camadas.
            </p>
          </div>

          {/* Quick Stats / Entropy Badge */}
          <div className="flex items-center gap-3 shrink-0 bg-[#161622] border border-[#262638] rounded-xl p-3">
            <div className="space-y-0.5">
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
            onClick={() => setViewMode('ENCODER_MATRIX')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'ENCODER_MATRIX'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                : 'bg-[#171722] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e] border border-[#242436]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Matriz de Codificação em Tempo Real</span>
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
            <span>Desofuscador & Desempacotador de Camadas</span>
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
            <Layers className="w-3.5 h-3.5" />
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
      {/* MODE 1: REAL-TIME ENCODER MATRIX */}
      {/* ========================================================================= */}
      {viewMode === 'ENCODER_MATRIX' && (
        <div className="space-y-6">
          {/* Input Box with Action Bar */}
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
                    setDeobfuscatorInput(encodings.base64);
                    setViewMode('DEOBFUSCATOR');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#181826] hover:bg-[#202034] text-cyan-300 text-xs font-mono flex items-center gap-1 border border-cyan-500/30 transition-colors cursor-pointer"
                  title="Enviar Base64 para o Desofuscador"
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
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Digite ou cole aqui o payload de ataque, script, comando ou string a ser codificada..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />

            {/* Quick 1-Click Payloads Carousel */}
            <div className="pt-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0">
                Amostras Rápidas:
              </span>
              {SAMPLE_ENCODER_PAYLOADS.slice(0, 6).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(sample.payload)}
                  className="px-2.5 py-1 rounded-lg bg-[#161622] hover:bg-[#202032] border border-[#252536] text-zinc-300 text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Triple-Engine Grid: Base64, URL, Hex */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: BASE64 ENGINE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Base64 Engine</span>
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
                    onClick={() => handleCopy('b64-std', encodings.base64)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'b64-std' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.base64}
                </pre>
              </div>

              {/* Base64 URL-Safe */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Base64URL Safe (- e _)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('b64-url', encodings.base64Url)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'b64-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-purple-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.base64Url}
                </pre>
              </div>

              {/* Inline JS Execution: eval(atob('...')) */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">JavaScript eval(atob(..))</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('b64-eval', encodings.base64EvalJs)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'b64-eval' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.base64EvalJs}
                </pre>
              </div>

              {/* Bash Pipe Execution: echo ... | base64 -d | sh */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Linux Bash Pipeline</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('b64-bash', encodings.base64Bash)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'b64-bash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-rose-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.base64Bash}
                </pre>
              </div>

              {/* Data URI: data:text/html;base64,... */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Data URI (data:text/html)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('b64-uri', encodings.base64DataUri)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'b64-uri' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.base64DataUri}
                </pre>
              </div>

              {/* PHP Filter Wrapper */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">PHP Base64 Filter (LFI)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('b64-php', encodings.phpBase64Filter)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'b64-php' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-indigo-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.phpBase64Filter}
                </pre>
              </div>
            </div>

            {/* COLUMN 2: URL ENGINE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span>URL Encoding Engine</span>
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  WAF Evasion
                </span>
              </div>

              {/* Standard URL Encode */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">URL Encode (%20)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url-std', encodings.urlEncode)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'url-std' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.urlEncode}
                </pre>
              </div>

              {/* Double URL Encode */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Double URL Encode (%2520)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url-double', encodings.doubleUrlEncode)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'url-double' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.doubleUrlEncode}
                </pre>
              </div>

              {/* Triple URL Encode */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Triple URL Encode (%252520)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url-triple', encodings.tripleUrlEncode)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'url-triple' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.tripleUrlEncode}
                </pre>
              </div>

              {/* Full URL Encode (%XX on EVERY character) */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Full URL Encode (Todos os Chars %XX)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url-full', encodings.fullUrlEncode)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'url-full' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.fullUrlEncode}
                </pre>
              </div>

              {/* Path Traversal Evasion */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Path Traversal Bypass (..%2f / %2e%2e%2f)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url-path', encodings.urlPathTraversal)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'url-path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-rose-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.urlPathTraversal}
                </pre>
              </div>

              {/* Whitespace to + */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">URL Plus Spaces (application/x-www-form)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url-plus', encodings.urlPlusSpaces)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'url-plus' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.urlPlusSpaces}
                </pre>
              </div>
            </div>

            {/* COLUMN 3: HEX ENGINE & OBFUSCATION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#222230]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Hex & Obfuscation Engine</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  SQLi & Shellcode
                </span>
              </div>

              {/* Hex Escaped (\x41) */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Hex C-Style Escaped (\x..)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('hex-slash', encodings.hexSlashX)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'hex-slash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.hexSlashX}
                </pre>
              </div>

              {/* SQL Hex Literal (0x414243) */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">SQL Hex Literal (0x..) - No Quotes!</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('hex-sql', encodings.hexSqlLiteral)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'hex-sql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.hexSqlLiteral}
                </pre>
              </div>

              {/* Raw Contiguous Hex */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Raw Contiguous Hex (414243)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('hex-raw', encodings.hexRaw)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'hex-raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-zinc-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.hexRaw}
                </pre>
              </div>

              {/* SQL CHAR(...) function */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">SQL CHAR(...) Function</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('hex-char', encodings.sqlChar)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'hex-char' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-rose-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.sqlChar}
                </pre>
              </div>

              {/* Alternating Case: sElEcT */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Case Randomization (sElEcT)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('case-alt', encodings.caseAlternating)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'case-alt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.caseAlternating}
                </pre>
              </div>

              {/* SQL Comments for Spaces: SELECT /** / 1 */}
              <div className="bg-[#121218] border border-[#22222d] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">SQL Inline Comments (/**/ Space)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('sql-com', encodings.sqlCommentSpaces)}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'sql-com' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0c0c10] border border-[#1e1e28] text-amber-300 font-mono text-xs overflow-x-auto break-all">
                  {encodings.sqlCommentSpaces}
                </pre>
              </div>
            </div>
          </div>

          {/* Full-width Card: PowerShell UTF-16LE Encoded Command (-Enc) */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-mono font-bold text-white">PowerShell UTF-16LE Base64 Encoded Command (-Enc)</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Windows AMSI / Command Injection
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('ps-enc', encodings.powershellBase64)}
                className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202032] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#252538] transition-colors cursor-pointer"
              >
                {copiedKey === 'ps-enc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Comando PowerShell</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1f1f2e] text-blue-300 font-mono text-xs overflow-x-auto break-all leading-relaxed">
              {encodings.powershellBase64}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DEOBFUSCATOR & LAYER PEELER */}
      {/* ========================================================================= */}
      {viewMode === 'DEOBFUSCATOR' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">Entrada Obscurecida / Payload Suspeito</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {deobfuscatorInput.length} chars
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeobfuscatorInput(inputText)}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-300 text-xs font-mono border border-[#262638] transition-colors cursor-pointer"
                >
                  Puxar Entrada da Matriz
                </button>
                <button
                  type="button"
                  onClick={() => setDeobfuscatorInput('')}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={deobfuscatorInput}
              onChange={e => setDeobfuscatorInput(e.target.value)}
              placeholder="Cole aqui a string ofuscada (ex: %3Cscript... ou aGVsbG8= ou \x3c\x73...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />

            {/* Heuristic Detection Analysis Banner */}
            <div className="bg-[#151520] border border-[#242436] rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Diagnóstico de Reconhecimento Automático de Formato:</span>
                </span>
                <span className="text-zinc-500">Entropia: {deobfuscatorEntropy} bits/byte</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {detectedFormats.map((df, idx) => (
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

          {/* Automatic Multi-Layer Peeler (Recursive Unwrapping) */}
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
                          className="text-zinc-400 hover:text-white flex items-center gap-1"
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

          {/* Manual Decoder Tool */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span>Decodificador Manual Forçado</span>
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                {(['url', 'base64', 'hex', 'html', 'unicode', 'rot13'] as DecoderFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setManualDecodeFormat(fmt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      manualDecodeFormat === fmt ? 'bg-cyan-500 text-black shadow-md' : 'bg-[#181824] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Resultado Decodificado ({manualDecodeFormat.toUpperCase()} → Plain Text):</span>
                <button
                  type="button"
                  onClick={() => handleCopy('manual-res', manualDecodedResult)}
                  className="hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'manual-res' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Resultado</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#0c0c12] border border-[#222232] text-cyan-200 font-mono text-xs overflow-x-auto break-all whitespace-pre-wrap">
                {manualDecodedResult || '<Nenhum dado decodificado>'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: SEQUENTIAL PIPELINE CRAFTER */}
      {/* ========================================================================= */}
      {viewMode === 'PIPELINE_CRAFTER' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Construtor Sequencial de Pipeline de Evasão</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Empilhe transformações em cadeia para forjar payloads com múltiplas camadas de evasão contra WAFs e filtros reversos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPipelineOps(['sql_comment', 'base64_std', 'url_encode'])}
                className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202034] text-zinc-300 text-xs font-mono border border-[#262638] transition-colors cursor-pointer"
              >
                Resetar Pipeline Padrão
              </button>
            </div>

            {/* Pipeline Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-300">Payload Base Inicial:</label>
              <textarea
                rows={2}
                value={pipelineInput}
                onChange={e => setPipelineInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
              />
            </div>

            {/* Pipeline Operation Selector Buttons */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Adicionar Operação ao Pipeline:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'url_encode' as PipelineOp, label: '+ URL Encode' },
                  { id: 'double_url' as PipelineOp, label: '+ Double URL' },
                  { id: 'full_url' as PipelineOp, label: '+ Full URL %XX' },
                  { id: 'base64_std' as PipelineOp, label: '+ Base64' },
                  { id: 'base64_url' as PipelineOp, label: '+ Base64URL' },
                  { id: 'hex_slash' as PipelineOp, label: '+ Hex \\x..' },
                  { id: 'hex_sql' as PipelineOp, label: '+ SQL Hex 0x..' },
                  { id: 'sql_comment' as PipelineOp, label: '+ SQL /**/ Spaces' },
                  { id: 'case_alt' as PipelineOp, label: '+ Case sElEcT' },
                  { id: 'rot13' as PipelineOp, label: '+ ROT13' }
                ].map(opBtn => (
                  <button
                    key={opBtn.id}
                    type="button"
                    onClick={() => setPipelineOps(prev => [...prev, opBtn.id])}
                    className="px-2.5 py-1 rounded-lg bg-[#181826] hover:bg-[#222238] border border-[#2a2a3e] text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {opBtn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline Sequential Flow Output */}
          <div className="space-y-3">
            {pipelineStages.map((stage, idx) => (
              <div key={idx} className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-500/30">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white">{stage.label}</span>
                    <span className="text-[10px] text-zinc-400">({stage.result.length} chars • Entropia: {stage.entropy})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(`pipe-step-${idx}`, stage.result)}
                      className="px-2 py-0.5 rounded bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors cursor-pointer"
                    >
                      {copiedKey === `pipe-step-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPipelineOps(prev => prev.filter((_, i) => i !== idx))}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                      title="Remover etapa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <pre className="p-3 rounded-xl bg-[#0c0c12] border border-[#1e1e2a] text-cyan-300 font-mono text-xs overflow-x-auto break-all leading-relaxed">
                  {stage.result}
                </pre>
              </div>
            ))}

            {pipelineStages.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs font-mono bg-[#121218] border border-[#22222d] rounded-2xl">
                Nenhuma operação no pipeline. Adicione passos acima para começar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: PAYLOAD CATALOG & RECIPES */}
      {/* ========================================================================= */}
      {viewMode === 'RECIPES' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Biblioteca de Payloads de Ataque & Evasão WAF</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Modelos consagrados de injeção e desvio de filtros em ambientes corporativos e regras OWASP CRS.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {(['ALL', 'XSS', 'SQLi', 'RCE', 'SSRF', 'LFI', 'SSTI'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedCategory === cat ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={presetSearch}
                onChange={e => setPresetSearch(e.target.value)}
                placeholder="Buscar por técnica, payload, CVE, WAF (Cloudflare, AWS, ModSecurity)..."
                className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>
          </div>

          {/* Payloads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPresets.map(preset => (
              <div key={preset.id} className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 flex flex-col justify-between shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      preset.category === 'RCE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      preset.category === 'SQLi' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      preset.category === 'XSS' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                      'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}>
                      {preset.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{preset.description}</p>

                  <div className="bg-[#151520] p-2.5 rounded-xl border border-[#222232] space-y-1 text-[11px] font-mono">
                    <div className="text-zinc-500">Alvo Típico de WAF: <span className="text-zinc-300 font-bold">{preset.wafTarget}</span></div>
                    <div className="text-zinc-500">Recomendação: <span className="text-cyan-400">{preset.recommendedEvasion}</span></div>
                  </div>

                  <pre className="p-3 rounded-xl bg-[#0a0a0f] border border-[#1e1e2c] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
                    {preset.payload}
                  </pre>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#1e1e28]">
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(preset.payload);
                      setViewMode('ENCODER_MATRIX');
                    }}
                    className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Carregar na Matriz</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(`cat-${preset.id}`, preset.payload)}
                    className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202032] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#252538] transition-colors cursor-pointer"
                  >
                    {copiedKey === `cat-${preset.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
