import { FuzzCategory } from './payloadFuzzerEngine';

export interface SyntaxIssue {
  type: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  detail?: string;
  position?: number;
  fixSuggestion?: {
    label: string;
    applyFix: (original: string) => string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  issues: SyntaxIssue[];
  summary: string;
}

/**
 * Validates a payload string for common structural syntax errors:
 * - Unbalanced brackets: (), [], {}
 * - Unbalanced quotes: ', ", `
 * - Unclosed or broken HTML tags (<tag without >)
 * - Truncated URL encodings (%XX)
 * - Trailing command chaining operators without targets (|, &&, ||, ;)
 */
export function validatePayloadSyntax(
  payload: string,
  vector: FuzzCategory | 'AUTO' = 'AUTO'
): ValidationResult {
  const issues: SyntaxIssue[] = [];

  if (!payload || payload.trim().length === 0) {
    return {
      isValid: true,
      hasErrors: false,
      hasWarnings: false,
      issues: [],
      summary: 'Payload vazio.'
    };
  }

  const trimmed = payload.trim();

  // 1. Bracket & Parentheses & Curly Braces Balance Check (Stack-based)
  const stack: Array<{ char: string; index: number }> = [];
  const matchingPairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{'
  };

  for (let i = 0; i < payload.length; i++) {
    const ch = payload[i];

    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push({ char: ch, index: i });
    } else if (ch === ')' || ch === ']' || ch === '}') {
      const expected = matchingPairs[ch];
      if (stack.length === 0) {
        issues.push({
          type: 'ERROR',
          code: 'UNEXPECTED_CLOSING_BRACKET',
          message: `Caractere de fechamento '${ch}' sem abertura correspondente`,
          detail: `Encontrado '${ch}' na posição ${i + 1} sem nenhum '${expected}' anterior.`,
          position: i,
          fixSuggestion: {
            label: `Remover '${ch}' excedente`,
            applyFix: (orig) => orig.slice(0, i) + orig.slice(i + 1)
          }
        });
      } else {
        const top = stack.pop()!;
        if (top.char !== expected) {
          issues.push({
            type: 'ERROR',
            code: 'MISMATCHED_BRACKET',
            message: `Incompatibilidade de pares: '${top.char}' foi fechado com '${ch}'`,
            detail: `Abertura '${top.char}' na pos ${top.index + 1} fechada incorretamente por '${ch}' na pos ${i + 1}.`,
            position: i
          });
        }
      }
    }
  }

  // Any remaining unclosed brackets in the stack
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    const closingChar = unclosed.char === '(' ? ')' : unclosed.char === '[' ? ']' : '}';
    issues.push({
      type: 'ERROR',
      code: 'UNCLOSED_BRACKET',
      message: `Caractere de abertura '${unclosed.char}' não foi fechado`,
      detail: `'${unclosed.char}' na posição ${unclosed.index + 1} precisa de um '${closingChar}' correspondente.`,
      position: unclosed.index,
      fixSuggestion: {
        label: `Adicionar '${closingChar}' no final`,
        applyFix: (orig) => orig + closingChar
      }
    });
  }

  // 2. Quote Balancing Check
  // Count single, double, and backtick quotes (ignoring escaped ones)
  let singleQuoteCount = 0;
  let doubleQuoteCount = 0;
  let backtickCount = 0;

  for (let i = 0; i < payload.length; i++) {
    const prev = i > 0 ? payload[i - 1] : '';
    const ch = payload[i];

    if (prev !== '\\') {
      if (ch === "'") singleQuoteCount++;
      else if (ch === '"') doubleQuoteCount++;
      else if (ch === '`') backtickCount++;
    }
  }

  // For SQL Injection: an odd single quote is only valid if truncated by a SQL comment
  const hasSqlComment = /(?:--|#|\/\*)/.test(payload);
  const isSqli = vector === 'SQLI' || (vector === 'AUTO' && (payload.toUpperCase().includes('SELECT') || payload.toUpperCase().includes('UNION') || payload.toUpperCase().includes('OR') || payload.toUpperCase().includes('AND')));

  if (singleQuoteCount % 2 !== 0) {
    if (isSqli && !hasSqlComment) {
      issues.push({
        type: 'ERROR',
        code: 'UNBALANCED_SINGLE_QUOTE_SQLI',
        message: "Aspas simples (') ímpares sem comentário de terminação SQL (-- ou #)",
        detail: "Injeções de SQL com aspas ímpares que não terminam com '-- ' ou '#' quebram a query do banco sem executar a cláusula desejada.",
        fixSuggestion: {
          label: "Adicionar '-- ' ao final",
          applyFix: (orig) => orig.trimEnd() + " -- "
        }
      });
    } else if (!isSqli) {
      issues.push({
        type: 'ERROR',
        code: 'UNBALANCED_SINGLE_QUOTE',
        message: "Aspas simples (') não balanceadas",
        detail: `Contagem ímpar de aspas simples (${singleQuoteCount}). Certifique-se de fechar a string ou escapar com \\'.`,
        fixSuggestion: {
          label: "Fechar com aspas simples (')",
          applyFix: (orig) => orig + "'"
        }
      });
    }
  }

  if (doubleQuoteCount % 2 !== 0) {
    issues.push({
      type: 'ERROR',
      code: 'UNBALANCED_DOUBLE_QUOTE',
      message: 'Aspas duplas (") não balanceadas',
      detail: `Contagem ímpar de aspas duplas (${doubleQuoteCount}).`,
      fixSuggestion: {
        label: 'Fechar com aspas duplas (")',
        applyFix: (orig) => orig + '"'
      }
    });
  }

  if (backtickCount % 2 !== 0) {
    issues.push({
      type: 'ERROR',
      code: 'UNBALANCED_BACKTICK',
      message: 'Crase / Backtick (`) não balanceada',
      detail: `Contagem ímpar de crases (${backtickCount}) em expressão shell/template literal.`,
      fixSuggestion: {
        label: 'Fechar com crase (`)',
        applyFix: (orig) => orig + '`'
      }
    });
  }

  // 3. HTML / XSS Tag Structure Check
  if (vector === 'XSS' || vector === 'AUTO' || payload.includes('<') || payload.includes('>')) {
    // Check for dangling tag opener: '<' with no '>' after it
    const lastOpenTag = payload.lastIndexOf('<');
    const lastCloseTag = payload.lastIndexOf('>');
    if (lastOpenTag !== -1 && lastOpenTag > lastCloseTag) {
      issues.push({
        type: 'ERROR',
        code: 'UNCLOSED_HTML_TAG',
        message: "Tag HTML incompleta: caractere '<' sem '>' correspondente",
        detail: `Tag aberta na posição ${lastOpenTag + 1} não foi fechada com '>'.`,
        position: lastOpenTag,
        fixSuggestion: {
          label: "Fechar tag com '>'",
          applyFix: (orig) => orig + '>'
        }
      });
    }

    // Check for unclosed <script> tag
    const scriptOpenMatches = payload.match(/<script\b[^>]*>/gi);
    const scriptCloseMatches = payload.match(/<\/script>/gi);
    const openScripts = scriptOpenMatches ? scriptOpenMatches.length : 0;
    const closeScripts = scriptCloseMatches ? scriptCloseMatches.length : 0;

    if (openScripts > closeScripts) {
      issues.push({
        type: 'WARNING',
        code: 'UNCLOSED_SCRIPT_TAG',
        message: "Tag '<script>' aberta sem tag de fechamento '</script>'",
        detail: "Muitos motores e navegadores só executam blocos de script Inline quando a tag de fechamento </script> está presente.",
        fixSuggestion: {
          label: "Adicionar '</script>'",
          applyFix: (orig) => orig + '</script>'
        }
      });
    }

    // Check for unquoted event handler with spaces: e.g. onerror=alert(1) test
    const brokenEventHandler = /\bon\w+=[^\s"'>]+\s+[^\s"'>=]+/i.exec(payload);
    if (brokenEventHandler && !payload.includes('"') && !payload.includes("'")) {
      issues.push({
        type: 'WARNING',
        code: 'UNQUOTED_EVENT_HANDLER_SPACE',
        message: "Espaço sem aspas em atributo de evento HTML",
        detail: `O evento '${brokenEventHandler[0]}' contém espaços sem aspas delimitadoras, o que pode truncar a execução no navegador.`
      });
    }
  }

  // 4. Broken or Truncated URL Encodings Check
  // Matches % followed by end of string or a non-hex character
  const truncatedUrlEncoding = /%(?:$|[0-9a-fA-F]$|[^0-9a-fA-F%])/g;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = truncatedUrlEncoding.exec(payload)) !== null) {
    issues.push({
      type: 'ERROR',
      code: 'TRUNCATED_URL_ENCODING',
      message: `Sequência de codificação URL truncada ou inválida ('${urlMatch[0]}')`,
      detail: `O caractere '%' na posição ${urlMatch.index + 1} precisa ser seguido por exatamente 2 dígitos hexadecimais (ex: %20, %2e, %00).`,
      position: urlMatch.index
    });
  }

  // 5. Shell / Command Chaining Syntax Check
  if (vector === 'COMMAND_INJECTION' || vector === 'AUTO') {
    // Check for trailing chaining operators like '|', '&&', '||', ';'
    const trailingOperator = /(?:\|\||&&|\||;)\s*$/.exec(payload);
    if (trailingOperator && !payload.includes('{FUZZ}')) {
      issues.push({
        type: 'WARNING',
        code: 'TRAILING_COMMAND_OPERATOR',
        message: `Operador de encadeamento terminal pendente ('${trailingOperator[0].trim()}')`,
        detail: `O operador de comando '${trailingOperator[0].trim()}' no fim do payload não possui nenhum comando a ser executado.`,
        fixSuggestion: {
          label: "Adicionar comando de sondagem (ex: ' whoami')",
          applyFix: (orig) => orig.trimEnd() + " whoami"
        }
      });
    }

    // Check for unclosed command substitution $(...
    const commandSubOpen = (payload.match(/\$\(/g) || []).length;
    const commandSubClose = (payload.match(/\)/g) || []).length;
    if (commandSubOpen > 0 && commandSubOpen > commandSubClose) {
      issues.push({
        type: 'ERROR',
        code: 'UNCLOSED_COMMAND_SUBSTITUTION',
        message: "Substituição de comando '$(' não fechada",
        detail: "A sintaxe de execução $(cmd) requer o parêntese de fechamento correspondente.",
        fixSuggestion: {
          label: "Fechar com ')'",
          applyFix: (orig) => orig + ")"
        }
      });
    }
  }

  // 6. SQL Whitespace & Keyword Boundaries
  if (isSqli) {
    if (/\bUNIONSELECT\b/i.test(payload)) {
      issues.push({
        type: 'ERROR',
        code: 'MISSING_WHITESPACE_UNION_SELECT',
        message: "Falta espaço entre 'UNION' e 'SELECT'",
        detail: "'UNIONSELECT' é interpretado como identificador inválido em vez de operação composta.",
        fixSuggestion: {
          label: "Separar como 'UNION SELECT'",
          applyFix: (orig) => orig.replace(/UNIONSELECT/gi, 'UNION SELECT')
        }
      });
    }
  }

  const hasErrors = issues.some(i => i.type === 'ERROR');
  const hasWarnings = issues.some(i => i.type === 'WARNING');
  const isValid = !hasErrors;

  let summary = 'Sintaxe válida e balanceada.';
  if (hasErrors) {
    const errCount = issues.filter(i => i.type === 'ERROR').length;
    summary = `${errCount} erro(s) de sintaxe estrutural detectado(s).`;
  } else if (hasWarnings) {
    const warnCount = issues.filter(i => i.type === 'WARNING').length;
    summary = `Estrutura válida, mas com ${warnCount} aviso(s) de coerência.`;
  }

  return {
    isValid,
    hasErrors,
    hasWarnings,
    issues,
    summary
  };
}
