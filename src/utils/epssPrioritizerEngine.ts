export type RemediationPriority = 'P0_IMMEDIATE' | 'P1_HIGH' | 'P2_ELEVATED' | 'P3_STANDARD';

export interface EpssPrioritizationItem {
  id: string;
  cve?: string;
  title: string;
  cvssV4Score: number;
  epssProbability: number; // 0.00 to 1.00 (e.g. 0.35 = 35%)
  epssPercentile: number; // 0.00 to 1.00 (e.g. 0.95 = 95th percentile)
  priority: RemediationPriority;
  priorityLabel: string;
  recommendedSlaDays: number;
  rationale: string;
  tacticalAction: string;
}

export function computeEpssPriority(cvssScore: number, epssProb: number): {
  priority: RemediationPriority;
  label: string;
  slaDays: number;
  rationale: string;
  tacticalAction: string;
} {
  const isHighCvss = cvssScore >= 7.0;
  const isHighEpss = epssProb >= 0.10; // >=10% probability of active in-the-wild exploitation

  if (isHighCvss && isHighEpss) {
    return {
      priority: 'P0_IMMEDIATE',
      label: 'P0 - Ação Imediata (Arma Ativa em Circulação)',
      slaDays: 2,
      rationale: `Severidade severa (CVSS v4 ${cvssScore.toFixed(1)}) aliada a probabilidade iminente de exploração ativa em massa (${(epssProb * 100).toFixed(1)}%). O ativo está no alvo direto de atores de ameaça.`,
      tacticalAction: 'Mobilizar war-room para hotfix imediato, isolamento de rede ou ativação de regra de WAF virtual patching.'
    };
  } else if (isHighCvss && !isHighEpss) {
    return {
      priority: 'P1_HIGH',
      label: 'P1 - Risco Inerente Elevado (Aguardando Exploit Público)',
      slaDays: 7,
      rationale: `Impacto crítico potencial no sistema (CVSS v4 ${cvssScore.toFixed(1)}), mas baixa probabilidade estatística de exploração indiscriminada atual (${(epssProb * 100).toFixed(1)}%).`,
      tacticalAction: 'Incluir no próximo ciclo semanal de patches e monitorar feeds de Threat Intel para armas de PoC.'
    };
  } else if (!isHighCvss && isHighEpss) {
    return {
      priority: 'P2_ELEVATED',
      label: 'P2 - Exploração Oportunista / Campanhas em Larga Escala',
      slaDays: 14,
      rationale: `Severidade moderada/baixa no CVSS v4 (${cvssScore.toFixed(1)}), porém altíssima atividade de escaneamento e ataques automatizados (${(epssProb * 100).toFixed(1)}%). Típico de bots e worms.`,
      tacticalAction: 'Aplicar mitigação nas próximas duas semanas para evitar comprometimento em massa por scanners automatizados.'
    };
  } else {
    return {
      priority: 'P3_STANDARD',
      label: 'P3 - Manutenção Preventiva Padrão',
      slaDays: 30,
      rationale: `Baixo impacto sistêmico e baixa probabilidade de ataque ativo (${(epssProb * 100).toFixed(1)}%).`,
      tacticalAction: 'Corrigir no fluxo normal de releases e sprints de manutenção de engenharia.'
    };
  }
}

export const SAMPLE_EPSS_DATASET: EpssPrioritizationItem[] = [
  {
    id: 'CVE-2021-44228',
    cve: 'CVE-2021-44228',
    title: 'Apache Log4j2 JNDI RCE (Log4Shell)',
    cvssV4Score: 10.0,
    epssProbability: 0.975,
    epssPercentile: 0.999,
    priority: 'P0_IMMEDIATE',
    priorityLabel: 'P0 - Ação Imediata',
    recommendedSlaDays: 1,
    rationale: 'RCE sem autenticação em massa com weaponization universal e scans contínuos na internet global.',
    tacticalAction: 'Patch emergencial para Log4j >= 2.17.1 ou desativação de lookup JNDI.'
  },
  {
    id: 'CVE-2023-34362',
    cve: 'CVE-2023-34362',
    title: 'MOVEit Transfer SQL Injection RCE',
    cvssV4Score: 9.8,
    epssProbability: 0.952,
    epssPercentile: 0.998,
    priority: 'P0_IMMEDIATE',
    priorityLabel: 'P0 - Ação Imediata',
    recommendedSlaDays: 1,
    rationale: 'Explorado massivamente em ataques de ransomware e exfiltração de dados corporativos.',
    tacticalAction: 'Desconectar servidores temporariamente e aplicar patches oficiais de fornecedor.'
  },
  {
    id: 'CVE-2023-4966',
    cve: 'CVE-2023-4966',
    title: 'Citrix Bleed Sensitive Session Token Leak',
    cvssV4Score: 9.4,
    epssProbability: 0.893,
    epssPercentile: 0.992,
    priority: 'P0_IMMEDIATE',
    priorityLabel: 'P0 - Ação Imediata',
    recommendedSlaDays: 2,
    rationale: 'Bypass completo de autenticação e MFA com sequestro de sessão de gateway NetScaler.',
    tacticalAction: 'Terminar todas as sessões ativas (kill active ICA sessions) e atualizar firmware.'
  },
  {
    id: 'CVE-2024-21413',
    cve: 'CVE-2024-21413',
    title: 'Microsoft Outlook Moniker Link RCE',
    cvssV4Score: 9.8,
    epssProbability: 0.684,
    epssPercentile: 0.985,
    priority: 'P0_IMMEDIATE',
    priorityLabel: 'P0 - Ação Imediata',
    recommendedSlaDays: 2,
    rationale: 'Permite vazamento de hash NTLM ou execução de código via link especial #file:///.',
    tacticalAction: 'Implantar patches cumulativos do Microsoft Office e bloquear tráfego SMB de saída.'
  },
  {
    id: 'CVE-2024-0012',
    cve: 'CVE-2024-0012',
    title: 'PAN-OS Management Web Interface Auth Bypass',
    cvssV4Score: 9.3,
    epssProbability: 0.082,
    epssPercentile: 0.820,
    priority: 'P1_HIGH',
    priorityLabel: 'P1 - Risco Inerente Elevado',
    recommendedSlaDays: 7,
    rationale: 'Bypass em interface administrativa, porém mitigado em ambientes onde o acesso à gestão é restrito a rede interna privada.',
    tacticalAction: 'Restringir acesso via ACL ao IP da VPN de gerenciamento e aplicar hotfix.'
  },
  {
    id: 'CVE-2023-2825',
    cve: 'CVE-2023-2825',
    title: 'GitLab CE/EE Path Traversal via Upload',
    cvssV4Score: 7.2,
    epssProbability: 0.320,
    epssPercentile: 0.940,
    priority: 'P0_IMMEDIATE',
    priorityLabel: 'P0 - Ação Imediata',
    recommendedSlaDays: 2,
    rationale: 'Tentativas frequentes de exploração observadas por botnets contra instâncias expostas na internet.',
    tacticalAction: 'Atualizar para versões com patch e auditar diretórios de upload.'
  },
  {
    id: 'CVE-2022-38604',
    cve: 'CVE-2022-38604',
    title: 'WordPress Core Reflected Cross-Site Scripting',
    cvssV4Score: 6.1,
    epssProbability: 0.285,
    epssPercentile: 0.910,
    priority: 'P2_ELEVATED',
    priorityLabel: 'P2 - Exploração Oportunista',
    recommendedSlaDays: 14,
    rationale: 'Baixa severidade técnica direta, porém alto volume de scanners automatizados tentando explorar blogs e portais.',
    tacticalAction: 'Atualizar instalação do WordPress ou bloquear payload via WAF.'
  },
  {
    id: 'CVE-2024-38112',
    cve: 'CVE-2024-38112',
    title: 'Windows MSHTML Platform Spoofing',
    cvssV4Score: 7.5,
    epssProbability: 0.045,
    epssPercentile: 0.740,
    priority: 'P1_HIGH',
    priorityLabel: 'P1 - Risco Inerente Elevado',
    recommendedSlaDays: 7,
    rationale: 'Exploração observada em alvos de APT selecionados, sem difusão em larga escala ainda.',
    tacticalAction: 'Aplicar patch mensal nos endpoints corporativos.'
  }
];
