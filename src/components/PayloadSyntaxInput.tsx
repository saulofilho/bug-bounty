import React, { useState, useRef, useMemo } from 'react';
import { FuzzCategory } from '../utils/payloadFuzzerEngine';
import { validatePayloadSyntax, ValidationResult, SyntaxIssue } from '../utils/payloadSyntaxValidator';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Eye, 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Wrench, 
  ChevronDown, 
  ChevronUp,
  Play
} from 'lucide-react';

export interface PayloadSyntaxInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedVector?: FuzzCategory | 'AUTO';
  onVectorChange?: (vector: FuzzCategory | 'AUTO') => void;
  label?: string;
  sublabel?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  showQuickChips?: boolean;
  onValidate?: (result: ValidationResult) => void;
  onExecuteTest?: (payload: string) => void;
  executeButtonLabel?: string;
}

interface HighlightSpan {
  text: string;
  className?: string;
  title?: string;
}

/**
 * Tokenizes text according to the selected injection vector
 */
function highlightPayloadTokens(text: string, vector: FuzzCategory | 'AUTO'): HighlightSpan[] {
  if (!text) return [];

  // Define patterns based on vector
  // The master regex will capture tokens in priority order
  const patterns: Array<{ regex: RegExp; className: string; title: string }> = [];

  // 1. {FUZZ} marker is universal across all vectors
  patterns.push({
    regex: /\{FUZZ\}/gi,
    className: 'bg-amber-400 text-black font-black px-1.5 py-0.5 rounded shadow-sm',
    title: 'Injection Point Marker ({FUZZ})'
  });

  // 2. Vector-specific patterns
  const isSqli = vector === 'SQLI' || vector === 'AUTO';
  const isXss = vector === 'XSS' || vector === 'AUTO';
  const isCmd = vector === 'COMMAND_INJECTION' || vector === 'AUTO';
  const isLfi = vector === 'PATH_TRAVERSAL' || vector === 'AUTO';
  const isSsrf = vector === 'SSRF' || vector === 'AUTO';
  const isSsti = vector === 'SSTI' || vector === 'AUTO';

  if (isSqli) {
    // SQL Tautologies like OR 1=1, ' OR '1'='1, OR 1=1--
    patterns.push({
      regex: /(?:'|\s)*(?:OR|AND)\s+(?:1\s*=\s*1|'1'\s*=\s*'1'|'x'\s*=\s*'x'|true)(?:\s*--|\s*#|\s*\/\*.*?\*\/)?/gi,
      className: 'bg-red-500/25 text-red-300 border border-red-500/50 font-black px-1 rounded shadow-[0_0_8px_rgba(239,68,68,0.35)]',
      title: 'SQL Tautology / Boolean Bypass (OR 1=1)'
    });

    // SQL Major Keywords like SELECT, UNION, ALL
    patterns.push({
      regex: /\b(UNION\s+SELECT|UNION\s+ALL\s+SELECT|SELECT|UNION|FROM|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|INSERT\s+INTO|VALUES|UPDATE|DELETE|DROP\s+TABLE|ALTER\s+TABLE|EXEC|EXECUTE|DECLARE|CAST|CONVERT)\b/gi,
      className: 'bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/40 px-1 rounded',
      title: 'SQL DML/DQL Keyword'
    });

    // SQL Functions and Meta objects
    patterns.push({
      regex: /\b(SLEEP|BENCHMARK|EXTRACTVALUE|UPDATEXML|GROUP_CONCAT|CONCAT_WS|CONCAT|VERSION|DATABASE|USER|SCHEMA|TABLE_NAME|COLUMN_NAME|INFORMATION_SCHEMA|HEX|UNHEX|CHAR|ASCII|SUBSTRING|SUBSTR|MID|WAITFOR\s+DELAY)\b/gi,
      className: 'text-purple-300 font-bold underline decoration-purple-500/50',
      title: 'SQL Built-in Function / Schema Object'
    });

    // SQL Comments
    patterns.push({
      regex: /(?:--\s*.*|#.*|\/\*[\s\S]*?\*\/)/gi,
      className: 'text-zinc-500 font-mono italic bg-zinc-800/40 px-1 rounded',
      title: 'SQL Comment / Truncator'
    });
  }

  if (isXss) {
    // XSS Tags like <script>, </script>, <img, <svg, <iframe
    patterns.push({
      regex: /<\/?(?:script|img|svg|iframe|body|input|details|audio|video|marquee|link|style|object|embed|a)\b[^>]*\/?>|<\/?script>/gi,
      className: 'bg-rose-500/25 text-rose-300 border border-rose-500/50 font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(244,63,94,0.35)]',
      title: 'XSS HTML Payload Tag (<script>)'
    });

    // XSS Event Handlers like onerror=, onload=, onclick=
    patterns.push({
      regex: /\b(onerror|onload|onclick|onfocus|onmouseover|onblur|onmouseenter|autofocus)\s*=/gi,
      className: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 px-1 rounded',
      title: 'XSS Event Handler Attribute'
    });

    // XSS Functions & Sinks
    patterns.push({
      regex: /\b(alert|confirm|prompt|fetch|eval|setTimeout|Function)\s*\(/gi,
      className: 'text-yellow-300 font-bold bg-yellow-500/10 px-1 rounded',
      title: 'XSS Execution Function'
    });

    patterns.push({
      regex: /\b(document\.cookie|document\.domain|window\.location|location\.href)\b/gi,
      className: 'text-pink-300 font-bold underline decoration-pink-500/50',
      title: 'DOM Source / Sink Property'
    });
  }

  if (isCmd) {
    // Command Injection Operators
    patterns.push({
      regex: /(?:;|&&|\|\||&|\||`|\$\([^)]+\)|>\s*\/dev\/null|2>&1)/g,
      className: 'bg-red-500/20 text-red-300 font-bold border border-red-500/40 px-1 rounded',
      title: 'Command Execution Chaining Operator'
    });

    // Common OS Commands
    patterns.push({
      regex: /\b(cat\s+\/etc\/passwd|whoami|id|uname\s+-a|uname|curl|wget|bash\s+-i|nc\s+-e|ping|nslookup|sleep\s+\d+)\b/gi,
      className: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 px-1 rounded',
      title: 'Operating System Shell Command'
    });
  }

  if (isLfi) {
    // Directory Traversal Encodings & Sequences
    patterns.push({
      regex: /(?:\.\.\/|\.\.\\|\.\.;\/|%2e%2e%2f|%2e%2e\/|\.\.%2f|\.\.\.\.\/\/|\.\.\.\.\\\/|%252e%252e%252f)/gi,
      className: 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40 px-1 rounded',
      title: 'Path Traversal Sequence'
    });

    // Sensitive Target Files & Null-byte
    patterns.push({
      regex: /(?:\/etc\/passwd|windows\/win\.ini|win\.ini|boot\.ini|\/proc\/self\/environ|%00\.png|%00)/gi,
      className: 'bg-cyan-500/15 text-cyan-300 font-mono font-bold px-1 rounded',
      title: 'Target LFI Sensitive File / Null-Byte'
    });
  }

  if (isSsrf) {
    // SSRF Protocols and internal hosts
    patterns.push({
      regex: /\b(gopher:\/\/|dict:\/\/|file:\/\/|http:\/\/169\.254\.169\.254|http:\/\/localhost|http:\/\/127\.0\.0\.1|metadata\.google\.internal)\b/gi,
      className: 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 px-1 rounded',
      title: 'SSRF Cloud Metadata / Loopback URI'
    });
  }

  if (isSsti) {
    // SSTI Delimiters
    patterns.push({
      regex: /(?:\{\{|\}\}|\$\{|\}|<#|#>|<\%|\%>)/g,
      className: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 px-0.5 rounded',
      title: 'Template Injection Expression Delimiter'
    });
  }

  // Tokenize string with combined regex while tracking match positions
  const spans: HighlightSpan[] = [];
  let lastIndex = 0;

  // Build a single mega regex with capture groups
  const combinedRegex = new RegExp(
    patterns.map(p => `(${p.regex.source})`).join('|'),
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = combinedRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];

    // Push plain text before this match
    if (matchIndex > lastIndex) {
      spans.push({
        text: text.slice(lastIndex, matchIndex)
      });
    }

    // Identify which pattern matched
    let matchedPattern = patterns[0];
    for (let i = 0; i < patterns.length; i++) {
      if (match[i + 1] !== undefined) {
        matchedPattern = patterns[i];
        break;
      }
    }

    spans.push({
      text: matchText,
      className: matchedPattern.className,
      title: matchedPattern.title
    });

    lastIndex = matchIndex + matchText.length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    spans.push({
      text: text.slice(lastIndex)
    });
  }

  return spans;
}

export const PayloadSyntaxInput: React.FC<PayloadSyntaxInputProps> = ({
  value,
  onChange,
  selectedVector = 'AUTO',
  onVectorChange,
  label = 'Payload Base / Ponto de Injeção',
  sublabel,
  placeholder = "Ex: https://alvo.com/api?q=' UNION SELECT 1,2,3-- &user=admin",
  rows = 3,
  className = '',
  id = 'payload-syntax-input',
  showQuickChips = true,
  onValidate,
  onExecuteTest,
  executeButtonLabel = 'Executar Teste'
}) => {
  const [internalVector, setInternalVector] = useState<FuzzCategory | 'AUTO'>('AUTO');
  const activeVector = selectedVector || internalVector;

  const handleVectorChange = (v: FuzzCategory | 'AUTO') => {
    if (onVectorChange) {
      onVectorChange(v);
    } else {
      setInternalVector(v);
    }
  };

  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationDrawer, setShowValidationDrawer] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate tokens for syntax preview
  const highlightedTokens = useMemo(() => {
    return highlightPayloadTokens(value, activeVector);
  }, [value, activeVector]);

  // Perform validation check
  const handleRunValidation = () => {
    const res = validatePayloadSyntax(value, activeVector);
    setValidationResult(res);
    setShowValidationDrawer(true);
    if (onValidate) {
      onValidate(res);
    }
  };

  // Apply auto-fix suggestion
  const handleApplyFix = (fix: (orig: string) => string) => {
    const fixed = fix(value);
    onChange(fixed);
    // Re-validate immediately
    const res = validatePayloadSyntax(fixed, activeVector);
    setValidationResult(res);
    if (onValidate) {
      onValidate(res);
    }
  };

  // Insert snippet helper at cursor position or end
  const handleInsertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + snippet);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + snippet + value.slice(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Quick insertion chips per vector
  const quickChips = useMemo(() => {
    switch (activeVector) {
      case 'SQLI':
        return [
          { label: 'UNION SELECT', snippet: "' UNION SELECT 1,2,3-- " },
          { label: 'SELECT', snippet: 'SELECT ' },
          { label: 'OR 1=1', snippet: "' OR 1=1-- " },
          { label: 'AND 1=1', snippet: "' AND 1=1-- " },
          { label: 'SLEEP(5)', snippet: "' OR SLEEP(5)-- " },
          { label: '{FUZZ}', snippet: '{FUZZ}' }
        ];
      case 'XSS':
        return [
          { label: '<script>', snippet: '<script>alert(1)</script>' },
          { label: '<img onerror>', snippet: '<img src=x onerror=alert(document.cookie)>' },
          { label: 'alert(1)', snippet: 'alert(1)' },
          { label: 'document.cookie', snippet: 'document.cookie' },
          { label: '{FUZZ}', snippet: '{FUZZ}' }
        ];
      case 'COMMAND_INJECTION':
        return [
          { label: '; whoami', snippet: '; whoami' },
          { label: '| id', snippet: '| id' },
          { label: '; cat /etc/passwd', snippet: '; cat /etc/passwd' },
          { label: '{FUZZ}', snippet: '{FUZZ}' }
        ];
      case 'PATH_TRAVERSAL':
        return [
          { label: '../../', snippet: '../../../../' },
          { label: '%2e%2e%2f', snippet: '%2e%2e%2f%2e%2e%2f' },
          { label: '/etc/passwd', snippet: '/etc/passwd' },
          { label: '%00.png', snippet: '%00.png' },
          { label: '{FUZZ}', snippet: '{FUZZ}' }
        ];
      case 'SSRF':
        return [
          { label: 'AWS Metadata', snippet: 'http://169.254.169.254/latest/meta-data/' },
          { label: 'localhost:8080', snippet: 'http://127.0.0.1:8080/' },
          { label: 'gopher://', snippet: 'gopher://127.0.0.1:6379/_' },
          { label: '{FUZZ}', snippet: '{FUZZ}' }
        ];
      default:
        return [
          { label: 'SELECT', snippet: 'SELECT ' },
          { label: 'UNION', snippet: 'UNION ' },
          { label: 'OR 1=1', snippet: "' OR 1=1-- " },
          { label: '<script>', snippet: '<script>alert(1)</script>' },
          { label: '{FUZZ}', snippet: '{FUZZ}' }
        ];
    }
  }, [activeVector]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with Title and Vector Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label htmlFor={id} className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>{label}</span>
          </label>
          {sublabel && (
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {sublabel}
            </div>
          )}
        </div>

        {/* Vector selector and Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Vector Selector */}
          <div className="flex items-center gap-1 bg-[#151520] border border-[#262635] p-0.5 rounded-lg">
            <span className="text-[10px] font-mono font-bold text-zinc-500 px-1.5 uppercase">Vetor:</span>
            <select
              value={activeVector}
              onChange={(e) => handleVectorChange(e.target.value as FuzzCategory | 'AUTO')}
              className="bg-[#1a1a26] text-amber-300 font-mono text-[11px] font-bold rounded px-1.5 py-0.5 border border-[#2e2e42] focus:outline-none focus:border-amber-400 cursor-pointer"
              title="Selecione o vetor de injeção para ajustar o realce de sintaxe e as regras de validação"
            >
              <option value="AUTO">Auto (Multi-Vetor)</option>
              <option value="SQLI">SQL Injection (SQLi)</option>
              <option value="XSS">Cross-Site Scripting (XSS)</option>
              <option value="COMMAND_INJECTION">Command Injection</option>
              <option value="PATH_TRAVERSAL">Path Traversal / LFI</option>
              <option value="SSRF">SSRF (Cloud Metadata)</option>
              <option value="SSTI">SSTI (Template Engine)</option>
            </select>
          </div>

          {/* Validation Button */}
          <button
            type="button"
            id={`btn-validate-${id}`}
            onClick={handleRunValidation}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              validationResult?.hasErrors
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : validationResult?.hasWarnings
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : validationResult?.isValid
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/35'
            }`}
            title="Verificar se o payload possui erros sintáticos (aspas não balanceadas, parênteses abertos, tags incompletas, etc.)"
          >
            {validationResult?.hasErrors ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : validationResult?.hasWarnings ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : validationResult?.isValid ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>
              {validationResult?.hasErrors
                ? `Erros (${validationResult.issues.filter(i => i.type === 'ERROR').length})`
                : validationResult?.isValid
                ? 'Sintaxe Válida'
                : 'Validar Sintaxe'}
            </span>
          </button>

          {/* Toggle View Mode */}
          <div className="flex items-center gap-1 bg-[#151520] border border-[#262635] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Alternar entre modo de edição e visualização com realce de sintaxe formatado"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>{viewMode === 'preview' ? 'Preview' : 'Realce'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#202030] transition-colors cursor-pointer"
              title="Copiar payload"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Highlighted Preview Area */}
      <div className={`relative rounded-xl border bg-[#12121a] overflow-hidden focus-within:ring-1 transition-all ${
        validationResult?.hasErrors
          ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/30'
          : validationResult?.isValid
          ? 'border-emerald-500/50 focus-within:border-emerald-500 focus-within:ring-emerald-500/30'
          : 'border-[#2c2c3d] focus-within:border-amber-500 focus-within:ring-amber-500/30'
      }`}>
        {viewMode === 'preview' ? (
          /* Rich Syntax Highlighted Preview Screen */
          <div className="p-3 min-h-[96px] text-xs font-mono whitespace-pre-wrap break-all leading-relaxed bg-[#101016]">
            {value.trim().length === 0 ? (
              <span className="text-zinc-500 italic">{placeholder}</span>
            ) : (
              highlightedTokens.map((span, idx) => (
                <span
                  key={idx}
                  className={span.className || 'text-zinc-300'}
                  title={span.title}
                >
                  {span.text}
                </span>
              ))
            )}
          </div>
        ) : (
          /* Live Synchronized Highlighted Editor */
          <div className="relative">
            {/* Syntax Backdrop Layer */}
            <div
              aria-hidden="true"
              className="absolute inset-0 p-3 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed pointer-events-none select-none overflow-hidden z-0"
            >
              {value.length === 0 ? (
                <span className="text-zinc-600 italic">{placeholder}</span>
              ) : (
                highlightedTokens.map((span, idx) => (
                  <span
                    key={idx}
                    className={span.className || 'text-zinc-300'}
                  >
                    {span.text}
                  </span>
                ))
              )}
            </div>

            {/* Editable Textarea Layer on Top (Caret Visible, Text Transparent) */}
            <textarea
              ref={textareaRef}
              id={id}
              rows={rows}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                // Clear active validation when user edits so it reflects fresh state
                if (validationResult) setValidationResult(null);
              }}
              placeholder=""
              className="relative z-10 w-full p-3 text-xs font-mono leading-relaxed bg-transparent text-transparent caret-amber-400 focus:outline-none resize-y selection:bg-amber-500/30 selection:text-white"
              spellCheck={false}
            />
          </div>
        )}

        {/* Footer Bar with Detected Keywords & Validation Quick Summary */}
        <div className="px-3 py-1.5 bg-[#0e0e14] border-t border-[#1e1e28] flex items-center justify-between text-[11px] font-mono text-zinc-500 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Realce Ativo:</span>
            </span>
            <span className="text-amber-300 font-bold">{activeVector}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">{value.length} caracteres</span>
            {value.includes('{FUZZ}') && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>· Ponto {'{FUZZ}'} configurado</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {validationResult ? (
              <button
                type="button"
                onClick={() => setShowValidationDrawer(!showValidationDrawer)}
                className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{showValidationDrawer ? 'Ocultar Relatório' : 'Ver Diagnóstico'}</span>
                {showValidationDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunValidation}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Checar Sintaxe</span>
              </button>
            )}

            {onExecuteTest && (
              <button
                type="button"
                onClick={() => {
                  const check = validatePayloadSyntax(value, activeVector);
                  setValidationResult(check);
                  if (check.hasErrors) {
                    setShowValidationDrawer(true);
                  }
                  onExecuteTest(value);
                }}
                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Play className="w-2.5 h-2.5" />
                <span>{executeButtonLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Structural Syntax Validation Drawer / Diagnostic Feedback */}
      {showValidationDrawer && validationResult && (
        <div className={`rounded-xl p-3.5 border text-xs font-mono space-y-2.5 transition-all animate-in fade-in duration-200 ${
          validationResult.hasErrors
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            : validationResult.hasWarnings
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        }`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              {validationResult.hasErrors ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : validationResult.hasWarnings ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="font-bold">
                Diagnóstico de Sintaxe Estrutural ({activeVector})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                validationResult.hasErrors
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : validationResult.hasWarnings
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {validationResult.hasErrors ? 'ERRO ESTRUTURAL' : validationResult.hasWarnings ? 'AVISO DE COERÊNCIA' : 'ESTRUTURA VÁLIDA'}
              </span>
              <button
                type="button"
                onClick={() => setShowValidationDrawer(false)}
                className="text-zinc-400 hover:text-white text-[11px] p-0.5 rounded"
                title="Fechar diagnóstico"
              >
                ✕
              </button>
            </div>
          </div>

          {validationResult.issues.length === 0 ? (
            <div className="text-emerald-300 text-[11px] flex items-center gap-2 py-1">
              <span>✓ Todos os pares de aspas, parênteses, chaves e delimitadores estão balanceados e prontos para teste.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {validationResult.issues.map((issue, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded-lg border text-[11px] space-y-1.5 ${
                    issue.type === 'ERROR'
                      ? 'bg-rose-950/40 border-rose-500/30 text-rose-100'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] uppercase mt-0.5 ${
                        issue.type === 'ERROR' ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'
                      }`}>
                        {issue.type}
                      </span>
                      <div>
                        <div className="font-bold text-white">{issue.message}</div>
                        {issue.detail && (
                          <div className="text-zinc-300 text-[10px] mt-0.5 leading-relaxed">
                            {issue.detail}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Fix Button */}
                    {issue.fixSuggestion && (
                      <button
                        type="button"
                        onClick={() => handleApplyFix(issue.fixSuggestion!.applyFix)}
                        className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 hover:text-white border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                        title="Aplicar correção automática estrutural no payload"
                      >
                        <Wrench className="w-3 h-3 text-emerald-400" />
                        <span>{issue.fixSuggestion.label}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Insert Keywords / Attack Primitives Chips */}
      {showQuickChips && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Snippets Rápidos:</span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertSnippet(chip.snippet)}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#181824] hover:bg-[#232336] text-zinc-300 hover:text-white border border-[#2a2a3c] hover:border-amber-500/40 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
              title={`Inserir "${chip.snippet}" no payload`}
            >
              <span className="text-amber-400">+</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
