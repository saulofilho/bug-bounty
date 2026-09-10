import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialization of Gemini API
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Common CVE curated database for fast offline lookup and fallback
const CURATED_CVES = [
  {
    id: "CVE-2024-21413",
    title: "Microsoft Outlook Remote Code Execution Vulnerability (Moniker Link)",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-94",
    description: "Improper control of generation of code in Microsoft Outlook allows an unauthenticated remote attacker to execute arbitrary code via a malicious link.",
    published: "2024-02-13",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-21413", "https://msrc.microsoft.com/update-guide/vulnerability/CVE-2024-21413"]
  },
  {
    id: "CVE-2024-3400",
    title: "Palo Alto Networks PAN-OS Command Injection",
    cvss: 10.0,
    severity: "CRITICAL",
    cwe: "CWE-77",
    description: "A command injection vulnerability in the GlobalProtect feature of Palo Alto Networks PAN-OS software allows an unauthenticated attacker to execute arbitrary code with root privileges.",
    published: "2024-04-12",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-3400"]
  },
  {
    id: "CVE-2023-46805",
    title: "Ivanti Connect Secure Authentication Bypass",
    cvss: 8.2,
    severity: "HIGH",
    cwe: "CWE-287",
    description: "An authentication bypass vulnerability in the web components of Ivanti Connect Secure allows remote attackers to access restricted resources by bypassing control checks.",
    published: "2024-01-11",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-46805"]
  },
  {
    id: "CVE-2023-38606",
    title: "Apple WebKit and Kernel Use-After-Free (Triangulation)",
    cvss: 7.8,
    severity: "HIGH",
    cwe: "CWE-416",
    description: "An app may be able to execute arbitrary code with kernel privileges. Apple addressed this issue with improved state management.",
    published: "2023-07-24",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-38606"]
  },
  {
    id: "CVE-2023-4863",
    title: "libwebp Heap Buffer Overflow Vulnerability",
    cvss: 8.8,
    severity: "HIGH",
    cwe: "CWE-122",
    description: "Heap buffer overflow in libwebp in Google Chrome prior to 116.0.5845.187 allowed a remote attacker to perform out of bounds memory write via a crafted WebP image.",
    published: "2023-09-12",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-4863"]
  },
  {
    id: "CVE-2021-44228",
    title: "Apache Log4j2 JNDI Remote Code Execution (Log4Shell)",
    cvss: 10.0,
    severity: "CRITICAL",
    cwe: "CWE-502",
    description: "Apache Log4j2 JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints.",
    published: "2021-12-10",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-44228"]
  },
  {
    id: "CVE-2022-22965",
    title: "Spring Framework Data Binding RCE (Spring4Shell)",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-94",
    description: "A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution via data binding.",
    published: "2022-04-01",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2022-22965"]
  },
  {
    id: "CVE-2023-22515",
    title: "Atlassian Confluence Broken Access Control",
    cvss: 10.0,
    severity: "CRITICAL",
    cwe: "CWE-284",
    description: "Vulnerability in Confluence Data Center and Server allows an unauthenticated attacker to create unauthorized Confluence administrator accounts.",
    published: "2023-10-04",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-22515"]
  },
  {
    id: "CVE-2023-34362",
    title: "Progress Software MOVEit Transfer SQL Injection",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-89",
    description: "In Progress MOVEit Transfer before 2021.0.6, a SQL injection vulnerability in the MOVEit Transfer web application could allow an unauthenticated attacker to gain access to the database.",
    published: "2023-06-02",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-34362"]
  },
  {
    id: "CVE-2022-26134",
    title: "Atlassian Confluence OGNL Injection RCE",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-917",
    description: "An unauthenticated remote attacker can execute arbitrary code on Confluence Server or Data Center instances via an OGNL injection vulnerability.",
    published: "2022-06-02",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2022-26134"]
  }
];

// Search CVE Endpoint (with CIRCL / NVD fallback)
app.get("/api/cve/search", async (req, res) => {
  const query = ((req.query.q as string) || "").trim().toLowerCase();
  
  if (!query) {
    return res.json({ results: CURATED_CVES, source: "curated" });
  }

  try {
    // Try external public CVE search API if query looks like a specific CVE or tech
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    let externalResults: any[] = [];
    try {
      const response = await fetch(`https://cve.circl.lu/api/search/${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          externalResults = data.slice(0, 10).map((item: any) => ({
            id: item.id || item.cve || "CVE-UNKNOWN",
            title: item.summary ? item.summary.slice(0, 90) + "..." : item.id,
            cvss: item.cvss || 5.0,
            severity: (item.cvss || 0) >= 9.0 ? "CRITICAL" : (item.cvss || 0) >= 7.0 ? "HIGH" : (item.cvss || 0) >= 4.0 ? "MEDIUM" : "LOW",
            cwe: item.cwe || "CWE-Other",
            description: item.summary || "Sem descrição disponível.",
            published: item.Published ? item.Published.split("T")[0] : new Date().toISOString().split("T")[0],
            references: item.references || [`https://nvd.nist.gov/vuln/detail/${item.id}`]
          }));
        }
      }
    } catch (netErr) {
      // CIRCL or external API timed out or unavailable, fallback to curated
    }

    if (externalResults.length > 0) {
      return res.json({ results: externalResults, source: "live_cve_database" });
    }
  } catch (err) {
    console.error("CVE fetch error:", err);
  }

  // Filter curated database
  const filtered = CURATED_CVES.filter(cve => 
    cve.id.toLowerCase().includes(query) ||
    cve.title.toLowerCase().includes(query) ||
    cve.description.toLowerCase().includes(query) ||
    cve.cwe.toLowerCase().includes(query)
  );

  return res.json({ results: filtered, source: "curated_fallback" });
});

// Gemini AI endpoint for Bug Bounty Report Enhancer & CVSS Calculator
app.post("/api/gemini/enhance-report", async (req, res) => {
  try {
    const { title, target, vulnerabilityType, roughNotes, proofOfConcept } = req.body;

    if (!title && !roughNotes) {
      return res.status(400).json({ error: "Título ou notas preliminares são necessários." });
    }

    const ai = getGeminiClient();

    const prompt = `Você é um especialista sênior em Segurança Ofensiva e Triagem de Bug Bounty (HackerOne, Bugcrowd, Intigriti).
Analise a vulnerabilidade a seguir e produza um relatório técnico de alto nível estruturado em JSON com formatação em Português (e termos técnicos padrão em Inglês onde apropriado).

Dados informados pelo pesquisador:
- Título Provisório: ${title || "Não especificado"}
- Alvo/Programa: ${target || "Ex: api.target.com"}
- Tipo de Vulnerabilidade: ${vulnerabilityType || "Não especificado"}
- Rascunho / Notas do Hunter:
${roughNotes || "N/A"}
- Prova de Conceito / Requisição HTTP:
${proofOfConcept || "N/A"}

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown de código ou texto extra antes/depois) com o seguinte formato:
{
  "polishedTitle": "Título claro e profissional no formato: [Tipo de Falha] em [Componente/Endpoint] resulta em [Impacto Concreto]",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
  "cvssVector": "CVSS:3.1/AV:N/AC:... string de vetor válida",
  "cvssScore": 7.5,
  "cwe": "CWE-ID (ex: CWE-639: Authorization Bypass Through User-Controlled Key)",
  "summary": "Resumo executivo claro e conciso explicando o que foi encontrado e a causa raiz.",
  "businessImpact": "Impacto detalhado no negócio e riscos de confidencialidade/integridade (explicando porque o programa deve recompensar bem este achado).",
  "stepsToReproduce": ["Passo 1: ...", "Passo 2: ...", "Passo 3: ..."],
  "remediation": "Recomendações técnicas diretas e acionáveis para correção pelos desenvolvedores."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    const responseText = response.text || "{}";
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Gemini enhance report error:", error);
    res.status(500).json({ 
      error: "Erro ao consultar o assistente de IA. " + (error?.message || "Verifique as configurações.")
    });
  }
});

// Automated Tagging & CWE/CVE Suggestion Engine
app.post("/api/reports/auto-tag", async (req, res) => {
  try {
    const { title, description, vulnerabilityType, proofOfConcept, existingDocs } = req.body;

    if (!title && !description && !proofOfConcept) {
      return res.status(400).json({ error: "Descrição ou título são necessários para análise." });
    }

    // Try Gemini if configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const docsContext = Array.isArray(existingDocs) 
          ? existingDocs.map((d: any) => `- [${d.id}] ${d.title} (${d.category}): Tags: ${(d.tags || []).join(', ')}`).join('\n')
          : "Nenhum documento adicional.";

        const prompt = `Você é um motor de taxonomia e classificação de vulnerabilidades de segurança (CWE, CVE, OWASP Top 10 e API Security).
Analise a descrição e o contexto do novo relatório de bug bounty e cruze com a biblioteca de documentação técnica do pesquisador:

Contexto do Relatório:
- Título: ${title || "N/A"}
- Tipo Informado: ${vulnerabilityType || "N/A"}
- Descrição / Notas: ${description || "N/A"}
- Prova de Conceito: ${proofOfConcept || "N/A"}

Biblioteca de Documentos Técnicos do Hunter:
${docsContext}

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos markdown adicionais):
{
  "suggestedTags": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "suggestedCwes": [
    {
      "id": "CWE-ID (ex: CWE-639)",
      "name": "Nome oficial da fraqueza",
      "description": "Explicação técnica sucinta da falha",
      "confidence": 0.95,
      "owaspCategory": "Categoria OWASP correspondente",
      "recommendedCvssVector": "Vetor CVSS 3.1 sugerido",
      "explanation": "Por que esta classificação se aplica com base na descrição"
    }
  ],
  "suggestedCves": [
    {
      "id": "CVE-ID relevante",
      "title": "Título da CVE similar",
      "cvss": 8.5,
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "relevance": "Por que esta CVE serve de referência para o relatório",
      "cwe": "CWE relacionado"
    }
  ],
  "analysisSummary": "Resumo em 1 parágrafo da classificação e correspondência com a documentação do hunter."
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { temperature: 0.2 }
        });

        const responseText = response.text || "{}";
        let cleaned = responseText.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
        }

        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, suggestion: parsed, engine: "gemini-3.8-flash" });
      } catch (geminiErr) {
        console.warn("Gemini auto-tag fallback to heuristic:", geminiErr);
      }
    }

    // Heuristic fallback matching against curated CVEs and CWE patterns
    const combined = `${title || ''} ${description || ''} ${vulnerabilityType || ''}`.toLowerCase();
    const suggestedTags: string[] = [];
    const suggestedCwes: any[] = [];
    const suggestedCves: any[] = [];

    if (combined.includes('idor') || combined.includes('bola') || combined.includes('autoriz') || combined.includes('trocar id')) {
      suggestedTags.push('#idor', '#bola', '#cwe-639', '#api-security', '#broken-access');
      suggestedCwes.push({
        id: 'CWE-639',
        name: 'Authorization Bypass Through User-Controlled Key (IDOR)',
        description: 'Ausência de validação de propriedade de objetos em referências diretas de parâmetros.',
        confidence: 0.94,
        owaspCategory: 'API1:2023 - Broken Object Level Authorization',
        recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
        explanation: 'Detectada manipulação de IDs de recurso sem validação de autorização da sessão.'
      });
      suggestedCves.push({
        id: 'CVE-2023-22515',
        title: 'Atlassian Confluence Broken Access Control',
        cvss: 10.0,
        severity: 'CRITICAL',
        relevance: 'Falha clássica de validação de privilégios de acesso a recursos de sistema.',
        cwe: 'CWE-284'
      });
    } else if (combined.includes('ssrf') || combined.includes('metadata') || combined.includes('169.254') || combined.includes('webhook')) {
      suggestedTags.push('#ssrf', '#cloud', '#cwe-918', '#imds', '#metadata');
      suggestedCwes.push({
        id: 'CWE-918',
        name: 'Server-Side Request Forgery (SSRF)',
        description: 'Servidor faz requisições externas não filtradas a endpoints internos ou serviços de metadados.',
        confidence: 0.92,
        owaspCategory: 'A10:2021 - Server-Side Request Forgery',
        recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
        explanation: 'Identificada requisição forjada pelo servidor apontando para metadados ou rede interna.'
      });
    } else {
      suggestedTags.push('#api-security', '#vulnerability', '#web-triage');
      suggestedCwes.push({
        id: 'CWE-284',
        name: 'Improper Access Control',
        description: 'Restrição inadequada de acesso a operações ou recursos restritos.',
        confidence: 0.70,
        owaspCategory: 'A01:2021 - Broken Access Control',
        recommendedCvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
        explanation: 'Classificação genérica de segurança para análise e aprofundamento técnico.'
      });
    }

    res.json({
      success: true,
      suggestion: {
        suggestedTags,
        suggestedCwes,
        suggestedCves,
        analysisSummary: 'Análise taxonômica realizada pelo motor heurístico integrado.'
      },
      engine: "heuristic"
    });
  } catch (err: any) {
    console.error("Auto-tag endpoint error:", err);
    res.status(500).json({ error: err.message || "Erro no processamento de tags automáticas." });
  }
});

// Gemini AI Recon & Checklist Generator for Target
app.post("/api/gemini/target-recon-tips", async (req, res) => {
  try {
    const { targetDomain, targetScope, techStack } = req.body;

    const ai = getGeminiClient();

    const prompt = `Você é um caçador de recompensas (Bug Bounty Hunter) experiente e ético.
Dada a superfície de ataque abaixo, elabore um plano estratégico de caça com foco em vulnerabilidades de alto impacto e boas recompensas (IDOR, Broken Auth, SSRF, Logic Flaws, Race Conditions, Subdomain Takeover).

- Domínio / Alvo: ${targetDomain || "*.empresa.com"}
- Escopo / Notas: ${targetScope || "Web Application & APIs"}
- Tecnologias conhecidas: ${techStack || "GraphQL, REST API, Next.js, AWS S3"}

Retorne EXCLUSIVAMENTE um objeto JSON válido:
{
  "attackSurfaceHighlights": ["Destaque 1...", "Destaque 2..."],
  "highBountyAttackVectors": [
    { "vector": "Nome da técnica", "description": "Como testar eticamente", "priority": "CRITICAL" | "HIGH" | "MEDIUM" }
  ],
  "reconChecklist": [
    { "step": "Subdomain Enumeration & Port Scan", "tools": "amass, subfinder, httpx", "tip": "Dica prática..." },
    { "step": "API & Parameter Discovery", "tools": "arjun, ffuf", "tip": "Dica prática..." },
    { "step": "Auth & Role Matrix Testing", "tools": "Burp Autorize", "tip": "Dica prática..." }
  ],
  "outOfScopeCaution": "Avisos cruciais para não violar os termos do programa ou causar indisponibilidade (DoS/DDoS)."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: { temperature: 0.3 }
    });

    const responseText = response.text || "{}";
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Gemini recon tips error:", error);
    res.status(500).json({ error: error?.message || "Erro ao gerar dicas de reconhecimento." });
  }
});

// Platform Submission Automation / Dispatch simulator
app.post("/api/submissions/dispatch", async (req, res) => {
  const { reportId, platform, title, target, severity, reportMarkdown } = req.body;

  // Simulate automated dispatch to platform (HackerOne / Bugcrowd / Intigriti / Custom Webhook)
  const submissionId = `${platform.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dispatchReceipt = {
    submissionId,
    reportId,
    platform,
    title,
    target,
    severity,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    receiptUrl: `https://${platform.toLowerCase()}.com/reports/${submissionId}`,
    message: `Relatório transmitido com sucesso para a fila de triagem da plataforma parceira ${platform}.`
  };

  res.json({ success: true, receipt: dispatchReceipt });
});

// Gemini Google Search Intel & Advisories for Target Domain and Vulnerability Type
app.post("/api/gemini/target-intel", async (req, res) => {
  const { target = '', vulnerabilityType = '', cwe = '', query = '', mode = 'all' } = req.body || {};

  if (!target && !vulnerabilityType && !query) {
    return res.status(400).json({ error: "Alvo ou tipo de vulnerabilidade são necessários." });
  }

  try {

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: false,
        warning: "GEMINI_API_KEY não configurada no ambiente. Exibindo avisos e fontes de segurança curadas.",
        text: `### ℹ️ Configuração da Chave de API Necessária\nPara habilitar a busca em tempo real no Google Search sobre **${target || "alvo"}** e **${vulnerabilityType || "vulnerabilidade"}**, configure a chave \`GEMINI_API_KEY\` no painel de configurações.\n\n### 🛡️ Fontes e Avisos Recomendados para Investigação:\n- **CVE & NVD Database**: Verifique vulnerabilidades conhecidas para a tecnologia em nvd.nist.gov.\n- **CISA KEV**: Verifique se a fraqueza faz parte do catálogo de exploração ativa em cisa.gov.\n- **HackerOne Hacktivity**: Consulte relatórios públicos desclassificados para ${vulnerabilityType || "este tipo de falha"}.\n- **OWASP Advisories**: Consulte guias de prevenção e casos de teste atualizados.`,
        sources: [
          { title: "CISA Known Exploited Vulnerabilities Catalog", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog" },
          { title: "NIST National Vulnerability Database (NVD)", url: "https://nvd.nist.gov/" },
          { title: "HackerOne Hacktivity & Disclosures", url: "https://hackerone.com/hacktivity" },
          { title: "OWASP API Security Top 10", url: "https://owasp.org/www-project-api-security/" }
        ],
        searchQueries: [
          `${target || ""} security vulnerabilities news`,
          `${vulnerabilityType || ""} CVE advisory disclosure`
        ],
        target: target || "N/A",
        vulnerabilityType: vulnerabilityType || "N/A",
        timestamp: new Date().toISOString()
      });
    }

    const ai = getGeminiClient();

    let searchFocus = "";
    if (mode === "target_news") {
      searchFocus = `Foque especificamente em notícias recentes sobre cibersegurança, vazamentos de dados, auditorias públicas, incidentes e avisos técnicos envolvendo a infraestrutura e o domínio do alvo "${target}".`;
    } else if (mode === "vulnerability_advisories") {
      searchFocus = `Foque especificamente em avisos de segurança recentes (Security Advisories de CISA, NVD, CERTs, fornecedores de software), novas técnicas de exploração e divulgações públicas no HackerOne/Bugcrowd para a vulnerabilidade "${vulnerabilityType}" ${cwe ? `(${cwe})` : ""}.`;
    } else {
      searchFocus = `Realize uma investigação equilibrada abrangendo: 1) notícias recentes de segurança e incidentes cibernéticos envolvendo o alvo "${target}"; 2) avisos de segurança recentes, alertas de CVE e write-ups públicos sobre a classe de vulnerabilidade "${vulnerabilityType}" ${cwe ? `(${cwe})` : ""}.`;
    }

    if (query && query.trim()) {
      searchFocus += ` Adicionalmente, atenda ao termo de busca específico fornecido pelo analista: "${query.trim()}".`;
    }

    const prompt = `Você é um analista sênior de Cyber Threat Intelligence (CTI) e Vulnerability Research especializado em Bug Bounty e AppSec.
Utilize a ferramenta de busca do Google (Google Search) para levantar notícias recentes, avisos de segurança oficiais (Security Advisories), incidentes conhecidos e divulgações públicas sobre:

- Alvo / Domínio Auditado: ${target || "Não especificado"}
- Tipo de Vulnerabilidade: ${vulnerabilityType || "Não especificado"}
${cwe ? `- Fraqueza CWE: ${cwe}` : ""}
- Foco da Investigação: ${searchFocus}

Estruture sua resposta técnica em Português nos tópicos a seguir utilizando formatação Markdown clara:

### 1. 📰 Notícias Recentes & Incidentes Relacionados
Apresente notícias recentes de segurança, incidentes cibernéticos ou divulgações públicas envolvendo a empresa/domínio do alvo ou entidades do mesmo segmento tecnológico.

### 2. 🛡️ Avisos de Segurança & Alertas Oficiais (Security Advisories & CVEs)
Liste avisos e alertas oficiais recentes (ex: CISA, NVD, CVEs recentes, boletins de segurança de fornecedores, advisories de frameworks) relacionados diretamente a este tipo de vulnerabilidade ou à stack comum desse alvo.

### 3. ⚠️ Padrões Atuais de Exploração & Riscos Emergentes
Explique o impacto técnico e de negócio de explorações recentes dessa categoria na vida real (ex: desvios de autorização, vazamentos de chaves, bypass de controles).

### 4. 🎯 Recomendações Estratégicas para o Relatório de Bug Bounty
Oriente o pesquisador de segurança sobre como utilizar esses dados de inteligência para enriquecer a seção de impacto corporativo e facilitar a reprodução e triagem pelos analistas do programa.

Cite as fontes e organizações reais encontradas na busca no Google.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const rawChunks = groundingMetadata?.groundingChunks || [];
    const searchQueries = groundingMetadata?.webSearchQueries || [];

    const sources: Array<{ title: string; url: string }> = [];
    for (const chunk of rawChunks) {
      if (chunk.web && chunk.web.uri) {
        sources.push({
          title: chunk.web.title || "Fonte Oficial / Web",
          url: chunk.web.uri,
        });
      }
    }

    // Deduplicate sources
    const uniqueSources = sources.filter(
      (source, index, self) => index === self.findIndex((s) => s.url === source.url)
    );

    res.json({
      success: true,
      text: response.text || "Nenhuma informação detalhada foi retornada pela busca.",
      sources: uniqueSources,
      searchQueries,
      target,
      vulnerabilityType,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Gemini target intel search error:", error);
    // Extract error details if quota or rate-limit
    const isQuota = error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    const warningMsg = isQuota
      ? "Limite temporário de requisições da chave de API (429 Quota). Exibindo base consolidada de inteligência e avisos oficiais de segurança."
      : "Falha temporária de rede ao consultar Google Search. Exibindo inteligência referencial e fontes de contingência.";

    const fallbackMarkdown = `### 1. 📰 Notícias & Monitoramento Contínuo do Alvo (${target || "Alvo Auditado"})
- Monitoramento de subdomínios, certificados SSL/TLS emitidos recentemente via crt.sh e endpoints de API.
- Recomenda-se acompanhar divulgações recentes de segurança e avisos de incidentes relacionados a ativos em produção para **${target || "o domínio auditado"}**.

### 2. 🛡️ Avisos Oficiais de Segurança & CVEs (${vulnerabilityType || "Classe da Falha"})
- **Catálogo CISA KEV**: Verifique se essa classe de vulnerabilidade possui explorações documentadas no catálogo de falhas ativas do CISA.
- **Base NIST / NVD**: Pesquise CVEs recentes e métricas CVSS 3.1 para o CWE associado ${cwe ? `(${cwe})` : ""}.
- **OWASP Advisories**: Consulte diretrizes de mitigação e vetores de bypass para ${vulnerabilityType || "esta falha"}.

### 3. ⚠️ Padrões de Exploração Recentes & Táticas do Hunter
- Teste de controle de acesso de objeto em endpoints REST e GraphQL (troca de IDs numéricos e UUIDs).
- Validação de cabeçalhos de autorização cruzada entre diferentes níveis de privilégios (usuário comum vs. admin).

### 4. 🎯 Recomendações para Fortalecer seu Relatório de Bug Bounty
- Inclua evidências claras do impacto no negócio e risco à privacidade de dados.
- Cite exemplos de divulgações públicas similares no HackerOne ou Bugcrowd para justificar a severidade perante os triadores.`;

    res.status(200).json({
      success: false,
      warning: warningMsg,
      text: fallbackMarkdown,
      sources: [
        { title: `CISA Known Exploited Vulnerabilities - ${vulnerabilityType || "Vulnerabilidades"}`, url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog" },
        { title: `NIST NVD - Pesquisa de CVEs & CVSS 3.1`, url: "https://nvd.nist.gov/vuln/search" },
        { title: `HackerOne Hacktivity - Divulgações Públicas de ${vulnerabilityType || "Falhas"}`, url: "https://hackerone.com/hacktivity" },
        { title: `OWASP API Security Top 10 - Diretrizes de Mitigação`, url: "https://owasp.org/www-project-api-security/" },
        { title: `Crt.sh - Certificados e Subdomínios de ${target || "Alvo"}`, url: `https://crt.sh/?q=${encodeURIComponent(target || "target")}` }
      ],
      searchQueries: [
        `${target || "target"} security advisories news`,
        `${vulnerabilityType || "vulnerability"} CVE writeup bug bounty`
      ],
      target: target || "N/A",
      vulnerabilityType: vulnerabilityType || "N/A",
      timestamp: new Date().toISOString()
    });
  }
});

// Start Express Server + Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bug Bounty Workbench server running on port ${PORT}`);
  });
}

startServer();
