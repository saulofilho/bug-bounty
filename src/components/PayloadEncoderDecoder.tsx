import React, { useState, useMemo } from 'react';
import { 
  Binary, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRightLeft, 
  Sparkles, 
  Code,
  FileText
} from 'lucide-react';
import { computeAllEncodings, decodePayload, SAMPLE_ENCODER_PAYLOADS } from '../utils/encoderMultiTool';

export const PayloadEncoderDecoder: React.FC = () => {
  const [inputText, setInputText] = useState<string>(SAMPLE_ENCODER_PAYLOADS[0].payload);
  const [mode, setMode] = useState<'ENCODE' | 'DECODE'>('ENCODE');
  const [decodeFormat, setDecodeFormat] = useState<'url' | 'base64' | 'hex' | 'html' | 'unicode'>('url');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const encodings = useMemo(() => {
    return computeAllEncodings(inputText);
  }, [inputText]);

  const decodedResult = useMemo(() => {
    if (mode !== 'DECODE') return '';
    return decodePayload(inputText, decodeFormat);
  }, [inputText, mode, decodeFormat]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5" />
                <span>Multi-Encoding & Evasion Suite</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Conversão Simultânea Bidirecional</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Canivete Suíço de Codificação & Evasão de WAF</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Transforme texto e payloads em tempo real entre <strong className="text-zinc-200">URL Encode</strong>, <strong className="text-zinc-200">Double URL</strong>, <strong className="text-zinc-200">Base64/URL</strong>, <strong className="text-zinc-200">Hexadecimal (\x41/0x41)</strong>, <strong className="text-zinc-200">HTML Entities</strong>, <strong className="text-zinc-200">Unicode Escapes</strong>, <strong className="text-zinc-200">SQL CHAR()</strong> e <strong className="text-zinc-200">PowerShell Base64</strong>.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap md:flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Payloads Típicos:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_ENCODER_PAYLOADS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`btn-encoder-sample-${idx}`}
                  onClick={() => {
                    setInputText(sample.payload);
                    setMode('ENCODE');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] border border-[#29293c] text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input Area + Mode Selector */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('ENCODE')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                mode === 'ENCODE' ? 'bg-cyan-500 text-black shadow-md' : 'bg-[#181824] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Modo Codificação (1 Entrada → Múltiplos Formatos)
            </button>
            <button
              type="button"
              onClick={() => setMode('DECODE')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                mode === 'DECODE' ? 'bg-cyan-500 text-black shadow-md' : 'bg-[#181824] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Modo Decodificação
            </button>
          </div>

          <div className="flex items-center gap-2">
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
          placeholder={mode === 'ENCODE' ? "Digite ou cole o payload/texto em claro..." : "Cole o payload codificado para descriptografar..."}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
        />

        {mode === 'DECODE' && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-mono text-zinc-400">Formato de Origem:</span>
            {(['url', 'base64', 'hex', 'html', 'unicode'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setDecodeFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  decodeFormat === fmt ? 'bg-cyan-500 text-black' : 'bg-[#181824] text-zinc-400'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Output Results */}
      {mode === 'DECODE' ? (
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span>Resultado Decodificado ({decodeFormat.toUpperCase()} → Texto Claro)</span>
            </h3>
            <button
              type="button"
              onClick={() => handleCopy('decoded-res', decodedResult)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedKey === 'decoded-res' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
            {decodedResult || '<Nenhum dado decodificado>'}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: URL Encodings */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">URL Encode (%20)</span>
              <button
                type="button"
                onClick={() => handleCopy('url-enc', encodings.urlEncode)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'url-enc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.urlEncode}
            </pre>
          </div>

          {/* Card: Double URL Encodings */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">Double URL Encode (%2520)</span>
              <button
                type="button"
                onClick={() => handleCopy('double-url', encodings.doubleUrlEncode)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'double-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-cyan-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.doubleUrlEncode}
            </pre>
          </div>

          {/* Card: Base64 Standard */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">Base64 Standard</span>
              <button
                type="button"
                onClick={() => handleCopy('base64', encodings.base64)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'base64' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-purple-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.base64}
            </pre>
          </div>

          {/* Card: Base64URL Safe */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">Base64URL Safe (- and _)</span>
              <button
                type="button"
                onClick={() => handleCopy('base64url', encodings.base64Url)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'base64url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-purple-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.base64Url}
            </pre>
          </div>

          {/* Card: Hexadecimal \x41 */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">Hexadecimal Escaped (\x41)</span>
              <button
                type="button"
                onClick={() => handleCopy('hex-slash', encodings.hexSlashX)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'hex-slash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-amber-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.hexSlashX}
            </pre>
          </div>

          {/* Card: HTML Entities */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">HTML Entities Decimal (&amp;#60;)</span>
              <button
                type="button"
                onClick={() => handleCopy('html-entity', encodings.htmlEntityDecimal)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'html-entity' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-emerald-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.htmlEntityDecimal}
            </pre>
          </div>

          {/* Card: Unicode Escape */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">Unicode Escape (\u0041)</span>
              <button
                type="button"
                onClick={() => handleCopy('unicode', encodings.unicodeEscape)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'unicode' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-amber-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.unicodeEscape}
            </pre>
          </div>

          {/* Card: SQL CHAR(...) */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">SQL CHAR(...) Function</span>
              <button
                type="button"
                onClick={() => handleCopy('sql-char', encodings.sqlChar)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'sql-char' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-rose-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.sqlChar}
            </pre>
          </div>

          {/* Full width: PowerShell Base64 Encoded Command */}
          <div className="md:col-span-2 bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">PowerShell UTF-16LE Base64 Encoded Command (-Enc)</span>
              <button
                type="button"
                onClick={() => handleCopy('ps-enc', encodings.powershellBase64)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'ps-enc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] text-blue-300 font-mono text-xs overflow-x-auto break-all">
              {encodings.powershellBase64}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
