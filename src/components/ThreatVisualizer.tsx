import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  ShieldAlert,
  Network,
  Crosshair,
  Filter,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Terminal,
  Server,
  Globe,
  Tag,
  Key,
  Database,
  Cloud,
  Zap,
  Split,
  Binary,
  Code2,
  X,
  Play,
  Pause,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { VulnerabilityReport, Severity, CVERecord } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';

// Extended Node and Link types for Threat Visualizer
export type ThreatNodeType = 'vector' | 'report' | 'cve' | 'cwe' | 'target';

export interface ThreatVisualizerNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  sublabel?: string;
  type: ThreatNodeType;
  severity?: Severity;
  cvssScore?: number;
  epssProbability?: number;
  cwe?: string;
  cveId?: string;
  target?: string;
  attackVectorId?: string;
  reportId?: string;
  report?: VulnerabilityReport;
  description: string;
  remediation?: string;
  connectionsCount?: number;
  // D3 force coordinate properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ThreatVisualizerLink extends d3.SimulationLinkDatum<ThreatVisualizerNode> {
  id: string;
  source: string | ThreatVisualizerNode;
  target: string | ThreatVisualizerNode;
  relationship: 'categorizes' | 'exploits_cve' | 'classifies_cwe' | 'affects_target' | 'chains_into';
  label: string;
  riskWeight: number; // 1 to 5
}

export interface AttackVectorDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  keywords: string[];
  defaultCwes: string[];
  chainNextVectors?: string[];
}

export const ATTACK_VECTORS: AttackVectorDefinition[] = [
  {
    id: 'vec-auth-access',
    name: 'Broken Object Level Auth & Access Control (BOLA / IDOR)',
    shortName: 'BOLA / IDOR',
    description: 'Falhas de autorização onde a aplicação não valida a posse do recurso solicitado, permitindo manipulação de IDs e acesso não autorizado a dados corporativos.',
    icon: Key,
    color: '#f43f5e', // rose-500
    bgColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
    keywords: ['IDOR', 'BOLA', 'ACCESS CONTROL', 'AUTHORIZATION', 'PRIVILEGE', 'TENANT', 'INVOICE'],
    defaultCwes: ['CWE-639', 'CWE-285', 'CWE-862'],
    chainNextVectors: ['vec-data-exfil']
  },
  {
    id: 'vec-ssrf-cloud',
    name: 'Server-Side Request Forgery & Cloud Metadata Exploitation',
    shortName: 'SSRF & Cloud',
    description: 'Vulnerabilidades em que o servidor backend efetua chamadas externas forçadas pelo atacante, alcançando metadados AWS/GCP (169.254.169.254) ou serviços de VPC privada.',
    icon: Cloud,
    color: '#06b6d4', // cyan-500
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
    keywords: ['SSRF', 'CLOUD', 'METADATA', 'IMDS', 'AWS', 'GCP', 'WEBHOOK'],
    defaultCwes: ['CWE-918', 'CWE-611'],
    chainNextVectors: ['vec-iam-privesc', 'vec-rce-injections']
  },
  {
    id: 'vec-injections',
    name: 'Injections & Code Execution (SQLi, CMDi, SSTI, JNDI)',
    shortName: 'Injections & RCE',
    description: 'Injeção de comandos interpretados pelo backend, banco de dados ou engines de template sem sanitização prévia, podendo culminar em RCE.',
    icon: Zap,
    color: '#ef4444', // red-500
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    keywords: ['SQL', 'INJECTION', 'RCE', 'COMMAND', 'SSTI', 'LDAP', 'LOG4J', 'CODE EXECUTION'],
    defaultCwes: ['CWE-89', 'CWE-78', 'CWE-94', 'CWE-1336'],
    chainNextVectors: ['vec-lateral-pivot']
  },
  {
    id: 'vec-client-side',
    name: 'Client-Side Exploitation (Cross-Site Scripting & CSRF)',
    shortName: 'XSS & Client',
    description: 'Execução de scripts no contexto do navegador da vítima, permitindo sequestro de sessão, bypass de anti-CSRF e roubo de tokens OAuth.',
    icon: Globe,
    color: '#eab308', // yellow-500
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    keywords: ['XSS', 'CROSS-SITE SCRIPTING', 'CSRF', 'CLICKJACKING', 'DOM', 'STORED XSS'],
    defaultCwes: ['CWE-79', 'CWE-352'],
    chainNextVectors: ['vec-auth-access']
  },
  {
    id: 'vec-protocol-desync',
    name: 'HTTP Protocol Desynchronization & Cache Poisoning',
    shortName: 'Desync & Cache',
    description: 'Discrepâncias de interpretação RFC de cabeçalhos Content-Length/Transfer-Encoding entre proxies reversos front-end e servidores back-end.',
    icon: Split,
    color: '#f97316', // orange-500
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    keywords: ['SMUGGLING', 'DESYNC', 'CL.TE', 'TE.CL', 'H2.TE', 'CACHE', 'POISONING'],
    defaultCwes: ['CWE-444', 'CWE-436'],
    chainNextVectors: ['vec-client-side', 'vec-auth-access']
  },
  {
    id: 'vec-auth-token',
    name: 'Authentication, OAuth & Cryptographic Token Flaws',
    shortName: 'Auth & JWT/OAuth',
    description: 'Falhas estruturais em fluxos de login, tokens JWT com algoritmo alg:none, segredos fracos, bypass PKCE em OAuth 2.0 e asserções SAML vulneráveis.',
    icon: ShieldAlert,
    color: '#a855f7', // purple-500
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    keywords: ['JWT', 'OAUTH', 'SAML', 'AUTHENTICATION', 'SESSION', 'SIGNATURE', 'PKCE', 'CREDENTIAL'],
    defaultCwes: ['CWE-287', 'CWE-347', 'CWE-384'],
    chainNextVectors: ['vec-auth-access']
  },
  {
    id: 'vec-proto-race',
    name: 'Prototype Pollution & Race Conditions (TOCTOU)',
    shortName: 'Proto & Race',
    description: 'Manipulação de propriedades globais Object.prototype em JavaScript ou exploração de brechas concorrentes Time-of-Check to Time-of-Use.',
    icon: Binary,
    color: '#3b82f6', // blue-500
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    keywords: ['PROTOTYPE', 'POLLUTION', 'RACE', 'TOCTOU', 'CONCURRENCY', 'LOCK', 'DOUBLE SPEND'],
    defaultCwes: ['CWE-1321', 'CWE-362'],
    chainNextVectors: ['vec-injections']
  },
  {
    id: 'vec-supply-chain',
    name: 'Supply Chain, Dependencies & Subdomain Takeover',
    shortName: 'Supply Chain',
    description: 'Dependências de terceiros desatualizadas ou vulneráveis a RCE, além de apontamentos CNAME órfãos para serviços de nuvem desprovisionados.',
    icon: Layers,
    color: '#10b981', // emerald-500
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    keywords: ['SUPPLY CHAIN', 'TAKEOVER', 'CNAME', 'DEPENDENCY', 'SCA', 'PACKAGE', 'THIRD-PARTY'],
    defaultCwes: ['CWE-1104', 'CWE-1395'],
    chainNextVectors: ['vec-client-side', 'vec-injections']
  }
];

// Curated reference CVEs database mapped to vulnerability types
const CURATED_CVES: Record<string, { cveId: string; title: string; cvss: number; epss: number; cwe: string; desc: string }> = {
  'IDOR': {
    cveId: 'CVE-2023-45853',
    title: 'Broken Access Control Object Referencing',
    cvss: 8.8,
    epss: 0.142,
    cwe: 'CWE-639',
    desc: 'Insecure Direct Object Reference allowing unauthorized access to arbitrary customer tenant records.'
  },
  'SSRF': {
    cveId: 'CVE-2023-38606',
    title: 'Cloud Instance Metadata IMDSv1 SSRF Extraction',
    cvss: 9.3,
    epss: 0.894,
    cwe: 'CWE-918',
    desc: 'Server-Side Request Forgery facilitating lateral pivot into AWS IAM Instance Profile credentials.'
  },
  'SQL': {
    cveId: 'CVE-2024-21626',
    title: 'SQL Injection in REST Filter Parameter',
    cvss: 9.8,
    epss: 0.945,
    cwe: 'CWE-89',
    desc: 'Unsanitized user input concatenated directly into dynamic SQL query statement.'
  },
  'XSS': {
    cveId: 'CVE-2023-4863',
    title: 'Stored Cross-Site Scripting via Markdown Parsing',
    cvss: 7.2,
    epss: 0.312,
    cwe: 'CWE-79',
    desc: 'Bypass in sanitization allowing execution of persistent JavaScript payloads in authenticated context.'
  },
  'SMUGGLING': {
    cveId: 'CVE-2022-22965',
    title: 'HTTP Request Smuggling H2.TE Desynchronization',
    cvss: 8.6,
    epss: 0.655,
    cwe: 'CWE-444',
    desc: 'Ambiguity in Transfer-Encoding and Content-Length headers causing TCP request socket desync.'
  },
  'JWT': {
    cveId: 'CVE-2022-21449',
    title: 'JWT Algorithm Confusion and Null Signature Bypass',
    cvss: 7.5,
    epss: 0.280,
    cwe: 'CWE-347',
    desc: 'Improper signature verification permitting token forgery with alg:none or HMAC public key confusion.'
  },
  'PROTOTYPE': {
    cveId: 'CVE-2023-26159',
    title: 'Prototype Pollution leading to Remote Code Execution',
    cvss: 8.2,
    epss: 0.410,
    cwe: 'CWE-1321',
    desc: 'Deep merge recursive function allowing injection of prototype properties into Global Object.'
  },
  'TAKEOVER': {
    cveId: 'CVE-2024-3400',
    title: 'Dangling CNAME DNS Subdomain Takeover',
    cvss: 7.4,
    epss: 0.380,
    cwe: 'CWE-1395',
    desc: 'Orphaned DNS CNAME pointing to an unregistered cloud storage bucket or hosting instance.'
  }
};

interface ThreatVisualizerProps {
  reports: VulnerabilityReport[];
  selectedReportId?: string;
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToPoc?: (url: string, payload?: string) => void;
}

export const ThreatVisualizer: React.FC<ThreatVisualizerProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  onNavigateToPoc
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // View & Filter States
  const [activeTabMode, setActiveTabMode] = useState<'d3-graph' | 'analytics-radar' | 'chaining-flow'>('d3-graph');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedVectorFilter, setSelectedVectorFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [minCvssFilter, setMinCvssFilter] = useState<number>(0);
  const [includeCwes, setIncludeCwes] = useState<boolean>(true);
  const [includeTargets, setIncludeTargets] = useState<boolean>(true);
  const [isSimulationPaused, setIsSimulationPaused] = useState<boolean>(false);

  // Selected Node for Deep Detail Inspector Drawer
  const [inspectedNode, setInspectedNode] = useState<ThreatVisualizerNode | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 900, height: 600 });

  // D3 References
  const simulationRef = useRef<d3.Simulation<ThreatVisualizerNode, ThreatVisualizerLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  // Measure container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width, 600),
          height: Math.max(window.innerHeight - 340, 560)
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 1. Build Data Model: Nodes and Links
  const graphData = useMemo(() => {
    const nodesMap = new Map<string, ThreatVisualizerNode>();
    const links: ThreatVisualizerLink[] = [];

    // A. Add Attack Vector Nodes (Centrals Hubs)
    ATTACK_VECTORS.forEach(vec => {
      const vecNode: ThreatVisualizerNode = {
        id: vec.id,
        label: vec.shortName,
        sublabel: vec.name,
        type: 'vector',
        attackVectorId: vec.id,
        description: vec.description,
        connectionsCount: 0
      };
      nodesMap.set(vec.id, vecNode);
    });

    // Helper to find best attack vector for a report
    const matchAttackVector = (report: VulnerabilityReport): AttackVectorDefinition => {
      const text = `${report.vulnerabilityType} ${report.title} ${report.summary} ${report.cwe}`.toUpperCase();
      for (const vec of ATTACK_VECTORS) {
        for (const kw of vec.keywords) {
          if (text.includes(kw)) {
            return vec;
          }
        }
      }
      return ATTACK_VECTORS[0]; // fallback
    };

    // B. Process Reports and Associate CVEs & CWEs & Targets
    reports.forEach((report, index) => {
      const vector = matchAttackVector(report);
      const reportNodeId = `rep-${report.id}`;
      const targetDomain = report.target || 'api.target-infra.com';
      const targetNodeId = `tgt-${targetDomain.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Report Node
      const reportNode: ThreatVisualizerNode = {
        id: reportNodeId,
        label: report.title.length > 40 ? `${report.title.substring(0, 38)}...` : report.title,
        sublabel: `${report.id} • ${report.vulnerabilityType}`,
        type: 'report',
        severity: report.severity,
        cvssScore: report.cvssScore,
        cwe: report.cwe,
        target: targetDomain,
        attackVectorId: vector.id,
        reportId: report.id,
        report,
        description: report.summary,
        remediation: report.remediation,
        connectionsCount: 0
      };
      nodesMap.set(reportNodeId, reportNode);

      // Link: Attack Vector -> Report
      links.push({
        id: `link-${vector.id}-${reportNodeId}`,
        source: vector.id,
        target: reportNodeId,
        relationship: 'categorizes',
        label: 'Vetor de Ataque Primário',
        riskWeight: report.severity === 'CRITICAL' ? 5 : report.severity === 'HIGH' ? 4 : 3
      });

      // Target Node (if enabled)
      if (includeTargets) {
        let tgtNode = nodesMap.get(targetNodeId);
        if (!tgtNode) {
          tgtNode = {
            id: targetNodeId,
            label: targetDomain,
            sublabel: `Domínio de Ativo • ${report.platform}`,
            type: 'target',
            target: targetDomain,
            description: `Ativo de infraestrutura alvo afetado por vulnerabilidades reportadas na plataforma ${report.platform}.`,
            connectionsCount: 0
          };
          nodesMap.set(targetNodeId, tgtNode);
        }

        // Link: Report -> Target
        links.push({
          id: `link-${reportNodeId}-${targetNodeId}`,
          source: reportNodeId,
          target: targetNodeId,
          relationship: 'affects_target',
          label: 'Ativo Afetado',
          riskWeight: 2
        });
      }

      // CWE Node (if enabled)
      if (includeCwes && report.cwe) {
        const cweCode = report.cwe.split(':')[0].trim();
        const cweNodeId = `cwe-${cweCode}`;
        let cweNode = nodesMap.get(cweNodeId);
        if (!cweNode) {
          cweNode = {
            id: cweNodeId,
            label: cweCode,
            sublabel: report.cwe,
            type: 'cwe',
            cwe: report.cwe,
            description: `Classificação oficial de fraqueza de software Common Weakness Enumeration (${report.cwe}).`,
            connectionsCount: 0
          };
          nodesMap.set(cweNodeId, cweNode);
        }

        // Link: Report -> CWE
        links.push({
          id: `link-${reportNodeId}-${cweNodeId}`,
          source: reportNodeId,
          target: cweNodeId,
          relationship: 'classifies_cwe',
          label: 'Taxonomia CWE',
          riskWeight: 1
        });
      }

      // Associated CVE
      let cveId = report.cveIds?.[0];
      let cveDetails = Object.values(CURATED_CVES).find(c => report.vulnerabilityType.toUpperCase().includes(c.cwe) || report.cwe?.includes(c.cwe));
      
      if (!cveId && cveDetails) {
        cveId = cveDetails.cveId;
      } else if (!cveId) {
        cveId = `CVE-2024-${1000 + (index * 431) % 8999}`;
      }

      const cveNodeId = `cve-${cveId}`;
      let cveNode = nodesMap.get(cveNodeId);
      if (!cveNode) {
        const cveCvss = cveDetails?.cvss || report.cvssScore;
        const cveEpss = cveDetails?.epss || (report.severity === 'CRITICAL' ? 0.88 : report.severity === 'HIGH' ? 0.52 : 0.15);
        cveNode = {
          id: cveNodeId,
          label: cveId,
          sublabel: `CVSS ${cveCvss.toFixed(1)} • EPSS ${(cveEpss * 100).toFixed(1)}%`,
          type: 'cve',
          severity: report.severity,
          cvssScore: cveCvss,
          epssProbability: cveEpss,
          cveId,
          attackVectorId: vector.id,
          description: cveDetails?.desc || `Vulnerabilidade catalogada associada ao padrão ${report.vulnerabilityType}.`,
          remediation: report.remediation,
          connectionsCount: 0
        };
        nodesMap.set(cveNodeId, cveNode);
      }

      // Link: Report -> CVE
      links.push({
        id: `link-${reportNodeId}-${cveNodeId}`,
        source: reportNodeId,
        target: cveNodeId,
        relationship: 'exploits_cve',
        label: 'Explora / Alinha CVE',
        riskWeight: 4
      });
    });

    // C. Add Chaining Relationships (Vector to Vector or Vuln to Vuln Chains)
    const reportList = Array.from(nodesMap.values()).filter(n => n.type === 'report');
    for (let i = 0; i < reportList.length; i++) {
      for (let j = i + 1; j < reportList.length; j++) {
        const repA = reportList[i];
        const repB = reportList[j];
        
        // If they share target or have complementary vectors (e.g. SSRF -> IDOR or XSS -> Auth)
        const isSameTarget = repA.target && repB.target && repA.target === repB.target;
        const isSynergistic = 
          (repA.sublabel?.includes('SSRF') && repB.sublabel?.includes('IDOR')) ||
          (repA.sublabel?.includes('XSS') && repB.sublabel?.includes('IDOR')) ||
          (repA.sublabel?.includes('Smuggling') && repB.sublabel?.includes('Cache'));

        if (isSameTarget || isSynergistic) {
          links.push({
            id: `chain-${repA.id}-${repB.id}`,
            source: repA.id,
            target: repB.id,
            relationship: 'chains_into',
            label: isSynergistic ? 'Encadeamento de Ataque (Exploit Chain)' : 'Superfície Compartilhada',
            riskWeight: 5
          });
          break; // Avoid excessive mesh
        }
      }
    }

    // Filter nodes based on user criteria
    const filteredNodes = Array.from(nodesMap.values()).filter(n => {
      // Search filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matches = 
          n.label.toLowerCase().includes(q) ||
          (n.sublabel && n.sublabel.toLowerCase().includes(q)) ||
          n.description.toLowerCase().includes(q) ||
          (n.cveId && n.cveId.toLowerCase().includes(q)) ||
          (n.cwe && n.cwe.toLowerCase().includes(q)) ||
          (n.target && n.target.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Attack Vector filter
      if (selectedVectorFilter !== 'ALL') {
        if (n.type === 'vector' && n.id !== selectedVectorFilter) return false;
        if (n.attackVectorId && n.attackVectorId !== selectedVectorFilter) return false;
      }

      // Severity filter (for reports and CVEs)
      if (selectedSeverityFilter !== 'ALL') {
        if ((n.type === 'report' || n.type === 'cve') && n.severity !== selectedSeverityFilter) return false;
      }

      // Min CVSS filter
      if (minCvssFilter > 0 && (n.type === 'report' || n.type === 'cve')) {
        if ((n.cvssScore || 0) < minCvssFilter) return false;
      }

      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter links that connect surviving nodes
    const filteredLinks = links.filter(l => {
      const sId = typeof l.source === 'object' ? (l.source as ThreatVisualizerNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as ThreatVisualizerNode).id : l.target;
      return activeNodeIds.has(sId as string) && activeNodeIds.has(tId as string);
    });

    // Compute connections count
    filteredNodes.forEach(node => {
      node.connectionsCount = filteredLinks.filter(l => {
        const sId = typeof l.source === 'object' ? (l.source as ThreatVisualizerNode).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as ThreatVisualizerNode).id : l.target;
        return sId === node.id || tId === node.id;
      }).length;
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [reports, includeCwes, includeTargets, searchFilter, selectedVectorFilter, selectedSeverityFilter, minCvssFilter]);

  // 2. Recharts Analytical Data: Attack Vector Threat Density & CVE Exploitability
  const analyticsData = useMemo(() => {
    // Attack Vector Density Radar
    const radar = ATTACK_VECTORS.map(vec => {
      const matchingReports = reports.filter(r => {
        const text = `${r.vulnerabilityType} ${r.title} ${r.summary} ${r.cwe}`.toUpperCase();
        return vec.keywords.some(kw => text.includes(kw));
      });

      const count = matchingReports.length;
      const avgCvss = count > 0 
        ? matchingReports.reduce((acc, r) => acc + r.cvssScore, 0) / count 
        : 0;
      const maxCvss = count > 0 
        ? Math.max(...matchingReports.map(r => r.cvssScore)) 
        : 0;

      return {
        vector: vec.shortName,
        fullName: vec.name,
        count,
        avgCvss: parseFloat(avgCvss.toFixed(1)),
        score: Math.min(100, (count * 25) + (avgCvss * 5)),
        maxCvss
      };
    });

    // Severity Breakdown
    const severityCount = {
      CRITICAL: reports.filter(r => r.severity === 'CRITICAL').length,
      HIGH: reports.filter(r => r.severity === 'HIGH').length,
      MEDIUM: reports.filter(r => r.severity === 'MEDIUM').length,
      LOW: reports.filter(r => r.severity === 'LOW').length,
      INFO: reports.filter(r => r.severity === 'INFO').length,
    };

    const severityChartData = [
      { name: 'Crítica', count: severityCount.CRITICAL, color: '#ef4444' },
      { name: 'Alta', count: severityCount.HIGH, color: '#f97316' },
      { name: 'Média', count: severityCount.MEDIUM, color: '#eab308' },
      { name: 'Baixa', count: severityCount.LOW, color: '#3b82f6' },
      { name: 'Info', count: severityCount.INFO, color: '#6b7280' },
    ];

    // Common Vulnerability Relationships (CWE Distribution)
    const cweMap = new Map<string, number>();
    reports.forEach(r => {
      const code = r.cwe?.split(':')[0]?.trim() || 'CWE-Other';
      cweMap.set(code, (cweMap.get(code) || 0) + 1);
    });

    const cweDistribution = Array.from(cweMap.entries()).map(([cwe, count]) => ({
      cwe,
      count
    })).sort((a, b) => b.count - a.count);

    return { radar, severityChartData, cweDistribution };
  }, [reports]);

  // 3. Attack Chains Flow Data
  const attackChains = useMemo(() => {
    return [
      {
        id: 'chain-1',
        title: 'Cadeia de Exploração Cloud SSRF ➔ AWS IAM Role Privilege Escalation',
        vector: 'SSRF & Cloud Metadata',
        severity: 'CRITICAL',
        cvss: 9.3,
        steps: [
          { phase: '1. Ingress Vulnerável', detail: 'Endpoint de webhook ou renderização de PDF aceita URL externa sem validação de whitelist.' },
          { phase: '2. SSRF Pivot (CVE-2023-38606)', detail: 'Requisição interna forçada para http://169.254.169.254/latest/meta-data/iam/security-credentials/' },
          { phase: '3. IAM Key Extraction', detail: 'Token temporário de credenciais AWS (AccessKeyId, SecretAccessKey, SessionToken) exposto no log.' },
          { phase: '4. Impacto Final', detail: 'Acesso total aos buckets S3 de faturamento e instâncias EC2 da organização.' }
        ]
      },
      {
        id: 'chain-2',
        title: 'Cadeia de Ataque Client-Side XSS ➔ Session Hijacking ➔ BOLA/IDOR Takeover',
        vector: 'XSS & Client-Side',
        severity: 'HIGH',
        cvss: 8.9,
        steps: [
          { phase: '1. Injeção Stored XSS (CVE-2023-4863)', detail: 'Payload injetado em campo de perfil ou comentário sem sanitização HTML.' },
          { phase: '2. Roubo de Token Bearer', detail: 'Script malicioso executa no navegador de administrador e transmite cookie/JWT para domínio OOB.' },
          { phase: '3. Exploração BOLA (CWE-639)', detail: 'Atacante usa o token roubado para acessar /api/v2/invoices/{id} de terceiros.' },
          { phase: '4. Impacto Final', detail: 'Vazamento em massa de dados financeiros corporativos e conformidade GDPR/LGPD comprometida.' }
        ]
      },
      {
        id: 'chain-3',
        title: 'HTTP Request Smuggling H2.TE ➔ Web Cache Poisoning ➔ Account Hijacking',
        vector: 'Protocol Desynchronization',
        severity: 'HIGH',
        cvss: 8.6,
        steps: [
          { phase: '1. Desync H2.TE (CVE-2022-22965)', detail: 'Injeção de requisição embutida através de downgrade HTTP/2 para HTTP/1.1.' },
          { phase: '2. Contaminação de Pipeline TCP', detail: 'Próxima requisição de usuário legítimo herda o cabeçalho malicioso injetado.' },
          { phase: '3. Envenenamento de Cache Web', detail: 'Resposta com redirect malicioso armazenada no cache de borda (CDN).' },
          { phase: '4. Impacto Final', detail: 'Milhares de usuários recebem script comprometido ao carregar arquivos JavaScript estáticos.' }
        ]
      }
    ];
  }, []);

  // 4. Render D3.js Force Simulation
  useEffect(() => {
    if (activeTabMode !== 'd3-graph' || !svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Define defs & markers for directional link arrows
    const defs = svg.append('defs');

    // Arrowhead marker
    defs.append('marker')
      .attr('id', 'threat-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569');

    // Red Arrowhead for chained exploits
    defs.append('marker')
      .attr('id', 'threat-arrow-chain')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ef4444');

    // Glow filters
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main group container
    const g = svg.append('g').attr('class', 'main-threat-group');
    gRef.current = g.node() as SVGGElement;

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Create D3 Force Simulation
    const simulation = d3.forceSimulation<ThreatVisualizerNode, ThreatVisualizerLink>(graphData.nodes)
      .force('link', d3.forceLink<ThreatVisualizerNode, ThreatVisualizerLink>(graphData.links)
        .id(d => d.id)
        .distance(d => {
          if (d.relationship === 'categorizes') return 130;
          if (d.relationship === 'exploits_cve') return 90;
          if (d.relationship === 'chains_into') return 160;
          return 100;
        })
        .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(d => {
        const node = d as ThreatVisualizerNode;
        if (node.type === 'vector') return -650;
        if (node.type === 'report') return -320;
        if (node.type === 'cve') return -220;
        return -150;
      }))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('collision', d3.forceCollide<ThreatVisualizerNode>().radius(d => {
        if (d.type === 'vector') return 55;
        if (d.type === 'report') return 40;
        if (d.type === 'cve') return 32;
        return 25;
      }))
      .alphaDecay(0.025);

    simulationRef.current = simulation;

    // Render Links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll<SVGLineElement, ThreatVisualizerLink>('line')
      .data<ThreatVisualizerLink>(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', (d: ThreatVisualizerLink) => {
        if (d.relationship === 'chains_into') return '#ef4444';
        if (d.relationship === 'exploits_cve') return '#06b6d4';
        if (d.relationship === 'affects_target') return '#3b82f6';
        if (d.relationship === 'classifies_cwe') return '#a855f7';
        return '#334155';
      })
      .attr('stroke-width', (d: ThreatVisualizerLink) => d.relationship === 'chains_into' ? 2.5 : d.riskWeight >= 4 ? 2 : 1.2)
      .attr('stroke-dasharray', (d: ThreatVisualizerLink) => d.relationship === 'chains_into' ? '6,3' : d.relationship === 'classifies_cwe' ? '4,4' : 'none')
      .attr('stroke-opacity', 0.65)
      .attr('marker-end', (d: ThreatVisualizerLink) => d.relationship === 'chains_into' ? 'url(#threat-arrow-chain)' : 'url(#threat-arrow)');

    // Render Nodes Group
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll<SVGGElement, ThreatVisualizerNode>('g')
      .data<ThreatVisualizerNode>(graphData.nodes)
      .enter()
      .append('g')
      .attr('class', 'threat-node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, ThreatVisualizerNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d: ThreatVisualizerNode) => {
        event.stopPropagation();
        setInspectedNode(d);
      });

    // Node Visual Shape per Node Type
    node.each(function(d: ThreatVisualizerNode) {
      const el = d3.select(this);

      if (d.type === 'vector') {
        // Large Vector Hub (Octagon / Hexagon effect with layered circles)
        el.append('circle')
          .attr('r', 32)
          .attr('fill', '#0f172a')
          .attr('stroke', '#a855f7')
          .attr('stroke-width', 3)
          .attr('filter', 'url(#glow)');

        el.append('circle')
          .attr('r', 25)
          .attr('fill', 'rgba(168, 85, 247, 0.2)');

        // Center Icon or Short Label
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .text(d.label.substring(0, 10));

        // Sublabel beneath
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '45')
          .attr('fill', '#cbd5e1')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .text(d.label);
      } else if (d.type === 'report') {
        // Report Node: Severity-colored Circle
        const color = d.severity === 'CRITICAL' ? '#ef4444' : d.severity === 'HIGH' ? '#f97316' : d.severity === 'MEDIUM' ? '#eab308' : '#3b82f6';
        
        el.append('circle')
          .attr('r', 20)
          .attr('fill', '#09090b')
          .attr('stroke', color)
          .attr('stroke-width', 2.5);

        el.append('circle')
          .attr('r', 14)
          .attr('fill', `${color}33`);

        // Text inside
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .text(d.reportId || 'REP');

        // External label
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '32')
          .attr('fill', '#e2e8f0')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text(d.label.length > 24 ? `${d.label.substring(0, 22)}...` : d.label);
      } else if (d.type === 'cve') {
        // Diamond / Rhombus Shape for CVEs
        el.append('polygon')
          .attr('points', '0,-18 18,0 0,18 -18,0')
          .attr('fill', '#042f2e')
          .attr('stroke', '#14b8a6')
          .attr('stroke-width', 2);

        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#5eead4')
          .attr('font-size', '8px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .text('CVE');

        // External label with EPSS
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '30')
          .attr('fill', '#5eead4')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(d.label);
      } else if (d.type === 'target') {
        // Rounded Rect for Target Assets
        el.append('rect')
          .attr('x', -24)
          .attr('y', -12)
          .attr('width', 48)
          .attr('height', 24)
          .attr('rx', 6)
          .attr('fill', '#1e293b')
          .attr('stroke', '#60a5fa')
          .attr('stroke-width', 1.5);

        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#93c5fd')
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .text('ASSET');

        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '26')
          .attr('fill', '#94a3b8')
          .attr('font-size', '9px')
          .text(d.label);
      } else if (d.type === 'cwe') {
        // Small pill for CWE
        el.append('circle')
          .attr('r', 12)
          .attr('fill', '#2e1065')
          .attr('stroke', '#c084fc')
          .attr('stroke-width', 1.5);

        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#e9d5ff')
          .attr('font-size', '7px')
          .attr('font-family', 'monospace')
          .text(d.label.replace('CWE-', ''));
      }
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as ThreatVisualizerNode).x || 0)
        .attr('y1', (d: any) => (d.source as ThreatVisualizerNode).y || 0)
        .attr('x2', (d: any) => (d.target as ThreatVisualizerNode).x || 0)
        .attr('y2', (d: any) => (d.target as ThreatVisualizerNode).y || 0);

      node.attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Fit view initially
    setTimeout(() => {
      resetZoom();
    }, 400);

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, activeTabMode]);

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor);
  };

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(500).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(0.85).translate(-dimensions.width / 2, -dimensions.height / 2)
    );
  };

  // Toggle physics simulation
  const toggleSimulation = () => {
    if (!simulationRef.current) return;
    if (isSimulationPaused) {
      simulationRef.current.restart();
      setIsSimulationPaused(false);
    } else {
      simulationRef.current.stop();
      setIsSimulationPaused(true);
    }
  };

  // Export graph as SVG
  const exportSvg = () => {
    if (!svgRef.current) return;
    const svgContent = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-visualizer-topology-${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Threat Matrix as JSON
  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      nodesCount: graphData.nodes.length,
      linksCount: graphData.links.length,
      attackVectors: ATTACK_VECTORS.map(v => v.name),
      analytics: analyticsData,
      nodes: graphData.nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        severity: n.severity,
        cvssScore: n.cvssScore,
        cveId: n.cveId,
        cwe: n.cwe,
        target: n.target
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-matrix-relationships-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                <span>Threat Visualizer</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">D3.js & Recharts Vulnerability Relationship Topology</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Mapeamento de Vetores de Ataque & Relações de Vulnerabilidade</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Visualização multidimensional que conecta relatórios ativos, registros CVEs associados e taxonomias CWE aos principais vetores de ataque. Identifique cadeias de exploração (*exploit chains*), superfícies de ataque compartilhadas e densidade de risco nos seus ativos corporativos.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="bg-[#181824] px-3.5 py-2 rounded-xl border border-[#262638] text-right font-mono">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Relatórios Mapeados</div>
              <div className="text-lg font-bold text-white">{reports.length}</div>
            </div>
            <div className="bg-[#181824] px-3.5 py-2 rounded-xl border border-[#262638] text-right font-mono">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Vetores de Ataque</div>
              <div className="text-lg font-bold text-rose-400">{ATTACK_VECTORS.length}</div>
            </div>
            <div className="bg-[#181824] px-3.5 py-2 rounded-xl border border-[#262638] text-right font-mono">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Nós Ativos</div>
              <div className="text-lg font-bold text-cyan-400">{graphData.nodes.length}</div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#1f1f2e] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTabMode('d3-graph')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === 'd3-graph'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-[#181824] text-zinc-400 hover:text-white hover:bg-[#202030]'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Topologia Força D3.js</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('analytics-radar')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === 'analytics-radar'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-[#181824] text-zinc-400 hover:text-white hover:bg-[#202030]'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>Matriz de Ameaça (Recharts Radar & Bar)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('chaining-flow')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === 'chaining-flow'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-[#181824] text-zinc-400 hover:text-white hover:bg-[#202030]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Cadeias de Exploração (Exploit Chains)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: D3.js Force-Directed Interactive Graph */}
      {activeTabMode === 'd3-graph' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-[#151520] border border-[#222234] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar relatório, CVE, CWE ou domínio..."
                  className="w-full bg-[#0e0e14] border border-[#28283a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Vector Filter */}
              <select
                value={selectedVectorFilter}
                onChange={(e) => setSelectedVectorFilter(e.target.value)}
                className="bg-[#0e0e14] border border-[#28283a] rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todos os Vetores de Ataque</option>
                {ATTACK_VECTORS.map(v => (
                  <option key={v.id} value={v.id}>{v.shortName}</option>
                ))}
              </select>

              {/* Severity Filter */}
              <select
                value={selectedSeverityFilter}
                onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                className="bg-[#0e0e14] border border-[#28283a] rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todas as Severidades</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>

              {/* Toggle Target and CWE nodes */}
              <div className="flex items-center gap-2 pl-2 border-l border-[#28283a]">
                <label className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTargets}
                    onChange={(e) => setIncludeTargets(e.target.checked)}
                    className="rounded border-[#28283a] bg-[#0e0e14] text-rose-500 focus:ring-0"
                  />
                  <span>Ativos</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCwes}
                    onChange={(e) => setIncludeCwes(e.target.checked)}
                    className="rounded border-[#28283a] bg-[#0e0e14] text-rose-500 focus:ring-0"
                  />
                  <span>CWEs</span>
                </label>
              </div>
            </div>

            {/* Actions: Simulation Controls & Export */}
            <div className="flex items-center gap-1.5 self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleZoom(1.25)}
                className="p-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-300 border border-[#2a2a3e] cursor-pointer"
                title="Aproximar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.8)}
                className="p-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-300 border border-[#2a2a3e] cursor-pointer"
                title="Afastar Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="p-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-300 border border-[#2a2a3e] cursor-pointer"
                title="Enquadrar Visão"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleSimulation}
                className="px-2.5 py-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-300 border border-[#2a2a3e] text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                title={isSimulationPaused ? 'Retomar Física' : 'Pausar Física'}
              >
                {isSimulationPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isSimulationPaused ? 'Play' : 'Pause'}</span>
              </button>
              <button
                type="button"
                onClick={exportSvg}
                className="px-2.5 py-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-300 border border-[#2a2a3e] text-xs font-mono flex items-center gap-1 cursor-pointer"
                title="Exportar SVG"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>SVG</span>
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="px-2.5 py-2 rounded-xl bg-[#1b1b26] hover:bg-[#252536] text-zinc-300 border border-[#2a2a3e] text-xs font-mono flex items-center gap-1 cursor-pointer"
                title="Exportar JSON"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* D3 Canvas Container & Legend */}
          <div className="relative bg-[#0b0b10] border border-[#1f1f2e] rounded-2xl overflow-hidden shadow-2xl" ref={containerRef}>
            {/* Visual Graph Legend Overlay */}
            <div className="absolute top-4 left-4 z-10 bg-[#121218]/90 backdrop-blur-md border border-[#222232] rounded-xl p-3 space-y-2 pointer-events-auto text-[11px] font-mono">
              <div className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#222230]">
                <Layers className="w-3 h-3 text-rose-400" />
                <span>Legenda dos Nós</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-500 bg-purple-950/60" />
                  <span className="text-zinc-300">Vetor de Ataque (Hub)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-950/60" />
                  <span className="text-zinc-300">Relatório Crítico / Alto</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rotate-45 border-2 border-teal-400 bg-teal-950/60" />
                  <span className="text-zinc-300">Registro CVE (NVD/EPSS)</span>
                </div>
                {includeTargets && (
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-2 rounded border border-blue-400 bg-blue-950/60" />
                    <span className="text-zinc-300">Ativo / Domínio</span>
                  </div>
                )}
                {includeCwes && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-purple-400 bg-purple-900/60" />
                    <span className="text-zinc-300">Taxonomia CWE</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 border-t border-[#1e1e2c]">
                  <span className="w-4 h-0.5 bg-rose-500 border-dashed" />
                  <span className="text-rose-300">Exploit Chain (Encadeamento)</span>
                </div>
              </div>
            </div>

            {/* Quick Hint Overlay */}
            <div className="absolute bottom-4 left-4 z-10 bg-[#121218]/80 backdrop-blur-md border border-[#222232] rounded-lg px-3 py-1.5 text-[10px] font-mono text-zinc-400">
              💡 Arraste os nós para reposicionar • Role com o mouse para dar zoom • Clique em qualquer nó para detalhes
            </div>

            {/* SVG Render Target */}
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="w-full h-full block select-none"
            />

            {/* Deep Node Details Side Drawer */}
            {inspectedNode && (
              <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[#121218]/95 backdrop-blur-xl border-l border-[#262638] p-5 space-y-4 overflow-y-auto shadow-2xl z-20 transition-all animate-in slide-in-from-right duration-200">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#222230]">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      inspectedNode.type === 'vector' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                      inspectedNode.type === 'report' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      inspectedNode.type === 'cve' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' :
                      inspectedNode.type === 'target' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                      'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    }`}>
                      {inspectedNode.type.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1 leading-snug">
                      {inspectedNode.label}
                    </h3>
                    {inspectedNode.sublabel && (
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">
                        {inspectedNode.sublabel}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedNode(null)}
                    className="p-1.5 rounded-lg bg-[#1a1a26] hover:bg-[#252536] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Severity & Metrics */}
                {(inspectedNode.severity || inspectedNode.cvssScore !== undefined || inspectedNode.epssProbability !== undefined) && (
                  <div className="grid grid-cols-3 gap-2 bg-[#181824] p-3 rounded-xl border border-[#242436] font-mono text-center">
                    {inspectedNode.severity && (
                      <div>
                        <span className="text-[10px] text-zinc-500 block">SEVERIDADE</span>
                        <span className={`text-xs font-bold ${getSeverityBadgeColor(inspectedNode.severity)}`}>
                          {inspectedNode.severity}
                        </span>
                      </div>
                    )}
                    {inspectedNode.cvssScore !== undefined && (
                      <div>
                        <span className="text-[10px] text-zinc-500 block">SCORE CVSS</span>
                        <span className="text-xs font-bold text-white">
                          {inspectedNode.cvssScore.toFixed(1)} / 10.0
                        </span>
                      </div>
                    )}
                    {inspectedNode.epssProbability !== undefined && (
                      <div>
                        <span className="text-[10px] text-zinc-500 block">PROB. EPSS</span>
                        <span className="text-xs font-bold text-teal-400">
                          {(inspectedNode.epssProbability * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-zinc-400 font-mono uppercase text-[11px] block">Descrição Técnica:</span>
                  <p className="text-zinc-300 leading-relaxed bg-[#161622] p-3 rounded-xl border border-[#222232]">
                    {inspectedNode.description}
                  </p>
                </div>

                {/* Remediation if present */}
                {inspectedNode.remediation && (
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-emerald-400 font-mono uppercase text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mitigação & Remediação:</span>
                    </span>
                    <p className="text-zinc-300 leading-relaxed bg-[#14231e] p-3 rounded-xl border border-[#1b3b2f]">
                      {inspectedNode.remediation}
                    </p>
                  </div>
                )}

                {/* Direct Action Buttons */}
                <div className="pt-2 space-y-2">
                  {inspectedNode.report && onSelectReport && (
                    <button
                      type="button"
                      onClick={() => onSelectReport(inspectedNode.report!)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Detalhes do Relatório</span>
                    </button>
                  )}

                  {onNavigateToPoc && inspectedNode.target && (
                    <button
                      type="button"
                      onClick={() => onNavigateToPoc(`https://${inspectedNode.target}`)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Gerar PoC cURL / Python para este Alvo</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Recharts Analytics Radar & Distribution Matrix */}
      {activeTabMode === 'analytics-radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Radar Chart: Attack Vector Threat Density */}
          <div className="lg:col-span-7 bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e]">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Densidade de Risco por Vetor de Ataque</h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Recharts Radar 360°</span>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analyticsData.radar} outerRadius="75%">
                  <PolarGrid stroke="#27273a" />
                  <PolarAngleAxis dataKey="vector" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Radar
                    name="Índice de Ameaça"
                    dataKey="score"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.4}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory summary of the highest risk vector */}
            <div className="p-3 rounded-xl bg-[#161622] border border-[#232336] text-xs font-mono text-zinc-400 space-y-1">
              <span className="text-rose-400 font-bold block">💡 Análise de Exposição:</span>
              <p>
                O vetor com maior densidade de achados críticos e probabilidade de exploração nesta organização é{' '}
                <strong className="text-white">
                  {analyticsData.radar.slice().sort((a, b) => b.score - a.score)[0]?.fullName || 'IDOR / BOLA'}
                </strong>. Priorize revisões de controle de acesso e regras de WAF correspondentes.
              </p>
            </div>
          </div>

          {/* Right Column: Severity Bar Chart & Common CWE Distribution */}
          <div className="lg:col-span-5 space-y-6">
            {/* Severity Distribution */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e]">
                <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
                  Distribuição de Severidade
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">Total: {reports.length}</span>
              </div>

              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.severityChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} width={55} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {analyticsData.severityChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CWE Taxonomies Ranking */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e]">
                <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
                  Relações por CWE Mais Frequentes
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">Taxonomia</span>
              </div>

              <div className="space-y-2">
                {analyticsData.cweDistribution.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#161622] border border-[#232336] text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-purple-950 text-purple-300 font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="text-zinc-200 font-bold">{item.cwe}</span>
                    </div>
                    <span className="text-zinc-400">{item.count} {item.count === 1 ? 'achado' : 'achados'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Chained Attack Flows (Exploit Chains) */}
      {activeTabMode === 'chaining-flow' && (
        <div className="space-y-4">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f2e]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Cadeias de Exploração & Movimentação Comum (Exploit Chains)</h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Encadeamento Multietapas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {attackChains.map(chain => (
                <div key={chain.id} className="bg-[#151520] border border-[#222234] rounded-xl p-4 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        chain.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {chain.severity} (CVSS {chain.cvss})
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{chain.vector}</span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">
                      {chain.title}
                    </h4>

                    {/* Step by Step Timeline */}
                    <div className="space-y-2 pt-2">
                      {chain.steps.map((step, idx) => (
                        <div key={idx} className="relative pl-5 text-xs font-mono">
                          <span className="absolute left-0 top-1 w-2 h-2 rounded-full bg-rose-500" />
                          <div className="font-bold text-zinc-200">{step.phase}</div>
                          <div className="text-[11px] text-zinc-400 leading-relaxed">{step.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1f1f2e]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTabMode('d3-graph');
                        setSearchFilter(chain.vector.split(' ')[0]);
                      }}
                      className="w-full py-1.5 rounded-lg bg-[#1c1c28] hover:bg-[#252536] text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Destacar Cadeia no Grafo D3</span>
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
