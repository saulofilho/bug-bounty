import { VulnerabilityReport, TimelineEvent, PlatformName } from '../types';

export type InteractionTone = 
  | 'AGGRESSIVE' 
  | 'FRUSTRATED' 
  | 'DISMISSIVE' 
  | 'CONSTRUCTIVE' 
  | 'NEUTRAL';

export type FrictionLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';

export interface MatchedKeyword {
  word: string;
  category: InteractionTone;
  weight: number;
  snippet?: string;
}

export interface TimelineSentimentResult {
  eventId: string;
  reportId: string;
  reportTitle: string;
  target: string;
  platform: PlatformName;
  date: string;
  title: string;
  notes: string;
  authorRole: 'program_manager' | 'triager' | 'reporter' | 'system';
  tone: InteractionTone;
  frictionLevel: FrictionLevel;
  frictionScore: number; // 0 (calm) to 100 (maximum hostility)
  sentimentScore: number; // -100 (hostile) to +100 (constructive/grateful)
  isFlagged: boolean; // true if aggressive or frustrated
  matchedKeywords: MatchedKeyword[];
  deEscalationAdvice: string;
  actionRecommendation: string;
}

export interface ProgramSentimentMetric {
  target: string;
  displayName: string;
  domain: string;
  platform: PlatformName;
  totalInteractions: number;
  flaggedCount: number;
  aggressiveCount: number;
  frustratedCount: number;
  dismissiveCount: number;
  constructiveCount: number;
  healthScore: number; // 0 to 100
  status: 'HEALTHY' | 'MODERATE_TENSION' | 'HIGH_FRICTION' | 'CRITICAL_RISK';
}

export interface SentimentSummary {
  totalCommunications: number;
  flaggedCount: number;
  aggressiveCount: number;
  frustratedCount: number;
  dismissiveCount: number;
  constructiveCount: number;
  neutralCount: number;
  overallHealthScore: number; // 0 to 100
  frictionRatio: number; // percentage
  programBreakdown: ProgramSentimentMetric[];
  flaggedIncidents: TimelineSentimentResult[];
  allResults: TimelineSentimentResult[];
}

export interface SingleMessageAnalysis {
  text: string;
  tone: InteractionTone;
  frictionLevel: FrictionLevel;
  frictionScore: number;
  sentimentScore: number;
  matchedKeywords: MatchedKeyword[];
  isFlagged: boolean;
  deEscalationAdvice: string;
  tacticalTip: string;
}

// Keyword & phrase dictionary categorized by tone
const KEYWORD_RULES: Array<{
  category: InteractionTone;
  phrases: string[];
  weight: number;
}> = [
  // 1. AGGRESSIVE (Violations, threats, bans, punitive actions, hostility)
  {
    category: 'AGGRESSIVE',
    weight: 35,
    phrases: [
      // English
      'unacceptable',
      'violation of',
      'violating the policy',
      'code of conduct violation',
      'account banned',
      'will be banned',
      'disqualified from program',
      'disqualify',
      'inappropriate behavior',
      'harassment',
      'harassing',
      'threat',
      'threatening',
      'waste of time',
      'wasting our time',
      'cease and desist',
      'stop contacting',
      'penalty',
      'strike',
      'abusive',
      'unprofessional conduct',
      'spamming our queue',
      'prohibited activity',
      'blacklisted',
      'zero tolerance',
      'malicious intent',
      'legal action',
      // Portuguese
      'inadmissível',
      'inadmissivel',
      'violação de conduta',
      'violacao de conduta',
      'violação dos termos',
      'violacao das regras',
      'bloqueio de conta',
      'será banido',
      'sera banido',
      'desqualificado do programa',
      'desqualificado',
      'comportamento inadequado',
      'desrespeito',
      'não toleramos',
      'nao toleramos',
      'perda de acesso',
      'ameaça',
      'ameaca',
      'abuso das regras',
      'advertência formal',
      'advertencia formal',
      'fora das regras de engajamento',
      'regras de engajamento violadas',
      'má fé',
      'ma fe',
      'penalidade aplicada'
    ]
  },

  // 2. FRUSTRATED (Impatience, exasperation, complaints about repeated messages/pings)
  {
    category: 'FRUSTRATED',
    weight: 22,
    phrases: [
      // English
      'already explained',
      'as stated before',
      'as we told you',
      'as told previously',
      'for the last time',
      'stop asking',
      'stop pinging',
      'do not ping',
      'stop messaging',
      'repeatedly asking',
      'repeated pings',
      'excessive pings',
      'refuse to review',
      'refusing to',
      'not our problem',
      'pointless argument',
      'ridiculous demand',
      'demanding an update',
      'impatience',
      'insisting on',
      'stop opening duplicates',
      'please stop reopening',
      'quit asking',
      'unnecessary messages',
      // Portuguese
      'já explicamos',
      'ja explicamos',
      'como dito anteriormente',
      'como já falamos',
      'como ja falamos',
      'pela última vez',
      'pela ultima vez',
      'pare de perguntar',
      'pare de marcar',
      'pare de pings',
      'não insista',
      'nao insista',
      'insistência desnecessária',
      'insistencia desnecessaria',
      'recusamos revisar',
      'não responderemos mais',
      'nao responderemos mais',
      'já foi avisado',
      'ja foi avisado',
      'sem sentido continuar',
      'inconveniência',
      'inconveniencia',
      'perda de tempo discutir',
      'pare de reabrir'
    ]
  },

  // 3. DISMISSIVE (Brushing off findings, downplaying severity, curt rejections)
  {
    category: 'DISMISSIVE',
    weight: 12,
    phrases: [
      // English
      "won't fix",
      'wontfix',
      'not a bug',
      'not a vulnerability',
      'as intended',
      'by design',
      'works as designed',
      'informational only',
      'no security impact',
      'zero impact',
      'negligible risk',
      'trivial issue',
      'purely hypothetical',
      'theoretical attack',
      'out of scope',
      'not applicable',
      'non-issue',
      'risk accepted',
      'not accepted',
      'closing without fix',
      // Portuguese
      'não é vulnerabilidade',
      'nao e vulnerabilidade',
      'comportamento esperado',
      'como projetado',
      'apenas informativo',
      'sem impacto de segurança',
      'sem impacto pratico',
      'sem impacto prático',
      'risco desprezível',
      'risco desprezivel',
      'puramente teórico',
      'puramente teorico',
      'ataque hipotético',
      'ataque hipotetico',
      'fora de escopo',
      'fora do escopo',
      'não aplicável',
      'nao aplicavel',
      'não corrigiremos',
      'nao corrigiremos',
      'risco aceito pela empresa'
    ]
  },

  // 4. CONSTRUCTIVE / POSITIVE (Gratitude, recognition, constructive collaboration)
  {
    category: 'CONSTRUCTIVE',
    weight: 18,
    phrases: [
      // English
      'thank you',
      'thanks for the report',
      'great catch',
      'appreciate your research',
      'appreciate your help',
      'excellent report',
      'well documented',
      'good job',
      'valuable finding',
      'prompt report',
      'clear report',
      'kudos',
      'impressive find',
      'valid finding',
      'pleasure working with you',
      'well written',
      'clear reproduction steps',
      'rewarded well deserved',
      'collaborative',
      // Portuguese
      'agradecemos o envio',
      'agradecemos',
      'muito obrigado',
      'ótimo achado',
      'otimo achado',
      'parabéns pelo reporte',
      'parabens pelo reporte',
      'excelente relatório',
      'excelente relatorio',
      'muito bem documentado',
      'achado valioso',
      'passos muito claros',
      'recompensa merecida',
      'bom trabalho',
      'ótima contribuição',
      'otima contribuicao',
      'apreciamos a colaboração',
      'apreciamos a colaboracao'
    ]
  }
];

/**
 * Normalizes text for robust keyword matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds all matched keywords/phrases in a text
 */
function findMatchedKeywords(rawText: string): MatchedKeyword[] {
  if (!rawText || !rawText.trim()) return [];

  const normalized = normalizeText(rawText);
  const matches: MatchedKeyword[] = [];
  const seenWords = new Set<string>();

  for (const rule of KEYWORD_RULES) {
    for (const phrase of rule.phrases) {
      const normalizedPhrase = normalizeText(phrase);
      if (!normalizedPhrase) continue;

      // Word boundary checking or phrase inclusion
      const regex = new RegExp(`(^|\\s)${normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i');
      if (regex.test(normalized)) {
        if (!seenWords.has(phrase)) {
          seenWords.add(phrase);
          matches.push({
            word: phrase,
            category: rule.category,
            weight: rule.weight
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Analyzes a standalone text message (e.g. from the Live Message Tester)
 */
export function analyzeMessageTone(rawText: string): SingleMessageAnalysis {
  if (!rawText || !rawText.trim()) {
    return {
      text: '',
      tone: 'NEUTRAL',
      frictionLevel: 'NONE',
      frictionScore: 0,
      sentimentScore: 0,
      matchedKeywords: [],
      isFlagged: false,
      deEscalationAdvice: 'Nenhum texto inserido para análise.',
      tacticalTip: 'Digite ou cole uma mensagem para avaliar o tom.'
    };
  }

  const matches = findMatchedKeywords(rawText);

  let aggressiveWeight = 0;
  let frustratedWeight = 0;
  let dismissiveWeight = 0;
  let constructiveWeight = 0;

  matches.forEach(m => {
    if (m.category === 'AGGRESSIVE') aggressiveWeight += m.weight;
    if (m.category === 'FRUSTRATED') frustratedWeight += m.weight;
    if (m.category === 'DISMISSIVE') dismissiveWeight += m.weight;
    if (m.category === 'CONSTRUCTIVE') constructiveWeight += m.weight;
  });

  // Determine dominant tone and friction score
  let tone: InteractionTone = 'NEUTRAL';
  let frictionLevel: FrictionLevel = 'NONE';

  if (aggressiveWeight > 0) {
    tone = 'AGGRESSIVE';
    frictionLevel = 'CRITICAL';
  } else if (frustratedWeight > 0) {
    tone = 'FRUSTRATED';
    frictionLevel = frustratedWeight >= 40 ? 'HIGH' : 'MODERATE';
  } else if (dismissiveWeight > 0 && constructiveWeight === 0) {
    tone = 'DISMISSIVE';
    frictionLevel = dismissiveWeight >= 24 ? 'MODERATE' : 'LOW';
  } else if (constructiveWeight > 0) {
    tone = 'CONSTRUCTIVE';
    frictionLevel = 'NONE';
  }

  // Calculate friction score 0 to 100
  const rawFriction = (aggressiveWeight * 1.5) + (frustratedWeight * 1.2) + (dismissiveWeight * 0.8) - (constructiveWeight * 0.5);
  const frictionScore = Math.max(0, Math.min(100, Math.round(rawFriction)));

  // Calculate sentiment score -100 to +100
  const rawSentiment = (constructiveWeight * 1.5) - (aggressiveWeight * 1.8) - (frustratedWeight * 1.4) - (dismissiveWeight * 0.9);
  const sentimentScore = Math.max(-100, Math.min(100, Math.round(rawSentiment)));

  const isFlagged = tone === 'AGGRESSIVE' || tone === 'FRUSTRATED';

  // Specific de-escalation advice
  let deEscalationAdvice = '';
  let tacticalTip = '';

  if (tone === 'AGGRESSIVE') {
    deEscalationAdvice = 'Tom hostil ou punitivo identificado. Não responda no calor do momento nem faça acusações. Mantenha tom 100% técnico, cite as regras do programa e, caso haja risco de banimento indevido, solicite intervenção de mediação oficial da plataforma (HackerOne / Bugcrowd / Intigriti).';
    tacticalTip = 'Aguarde pelo menos 2 a 4 horas antes de responder para evitar escalada emocional.';
  } else if (tone === 'FRUSTRATED') {
    deEscalationAdvice = 'O interlocutor demonstra impaciência ou cansaço com pings repetidos. Interrompa comunicações por 5-7 dias úteis. Ao responder, seja extremamente direto e apresente apenas fatos técnicos novos sem cobrança de prazo.';
    tacticalTip = 'Substitua perguntas como "alguma novidade?" por resumos executivos objetivos.';
  } else if (tone === 'DISMISSIVE') {
    deEscalationAdvice = 'Resposta evasiva ou minimizadora ("não é bug" / "comportamento esperado"). Para contestar, foque em demonstrar o impacto comercial prático (Business Impact) e encadeamento com outros vetores em vez de debater definições semânticas.';
    tacticalTip = 'Demonstre um cenário onde um atacante não autenticado cause dano financeiro direto.';
  } else if (tone === 'CONSTRUCTIVE') {
    deEscalationAdvice = 'Excelente relacionamento! Mantenha a cordialidade, agradeça a atenção do time e anote o programa como parceiro confiável para novos testes.';
    tacticalTip = 'Aproveite o canal aberto para perguntar sobre outros ativos no escopo que precisam de atenção.';
  } else {
    deEscalationAdvice = 'Tom neutro e operacional. A comunicação segue o fluxo normal de triagem e reporte.';
    tacticalTip = 'Acompanhe as próximas atualizações de status conforme o SLA do programa.';
  }

  return {
    text: rawText,
    tone,
    frictionLevel,
    frictionScore,
    sentimentScore,
    matchedKeywords: matches,
    isFlagged,
    deEscalationAdvice,
    tacticalTip
  };
}

/**
 * Determines if a timeline event is likely from a Program Manager / Triager
 */
function inferAuthorRole(event: TimelineEvent): 'program_manager' | 'triager' | 'reporter' | 'system' {
  if (event.authorRole) return event.authorRole;

  const combined = ((event.title || '') + ' ' + (event.notes || '')).toLowerCase();

  // If created as creation, usually reporter
  if (event.type === 'creation') {
    return 'reporter';
  }

  // Triage indicators
  if (
    combined.includes('triador') || 
    combined.includes('triager') || 
    combined.includes('triagem') ||
    combined.includes('hackerone triager') ||
    combined.includes('bugcrowd ase')
  ) {
    return 'triager';
  }

  // Program manager / security team indicators
  if (
    combined.includes('equipe de segurança') ||
    combined.includes('program manager') ||
    combined.includes('cliente') ||
    combined.includes('engenharia') ||
    combined.includes('secops') ||
    combined.includes('security team') ||
    event.type === 'bounty' ||
    event.type === 'status_change'
  ) {
    return 'program_manager';
  }

  if (event.type === 'note') {
    return 'program_manager';
  }

  return 'system';
}

/**
 * Extracts domain / program display name
 */
function extractDisplayName(target: string): { displayName: string; domain: string } {
  if (!target) return { displayName: 'Desconhecido', domain: 'unknown' };
  const clean = target.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const parts = clean.split('.');
  const domain = parts.length >= 2 ? parts.slice(-2).join('.') : clean;

  if (domain.includes('finpay')) return { displayName: 'FinPay Global', domain };
  if (domain.includes('cloudmetrics')) return { displayName: 'CloudMetrics IO', domain };
  if (domain.includes('devspace')) return { displayName: 'DevSpace Network', domain };
  if (domain.includes('streamflow')) return { displayName: 'StreamFlow Media', domain };
  if (domain.includes('enterprise-store')) return { displayName: 'Enterprise Store', domain };
  if (domain.includes('globaltravel')) return { displayName: 'GlobalTravel Systems', domain };
  if (domain.includes('uber')) return { displayName: 'Uber Bounty', domain };
  if (domain.includes('shopify')) return { displayName: 'Shopify Security', domain };
  if (domain.includes('gitlab')) return { displayName: 'GitLab Security', domain };

  const first = parts[0];
  const capitalized = first.charAt(0).toUpperCase() + first.slice(1);
  return { displayName: capitalized, domain };
}

/**
 * Analyzes all reports in the workspace to extract sentiment, tone, and friction
 */
export function analyzeReportsSentiment(reports: VulnerabilityReport[]): SentimentSummary {
  const allResults: TimelineSentimentResult[] = [];
  const programMap = new Map<string, {
    target: string;
    displayName: string;
    domain: string;
    platform: PlatformName;
    totalInteractions: number;
    flaggedCount: number;
    aggressiveCount: number;
    frustratedCount: number;
    dismissiveCount: number;
    constructiveCount: number;
    scores: number[];
  }>();

  reports.forEach(report => {
    const { displayName, domain } = extractDisplayName(report.target);
    const progKey = domain;

    if (!programMap.has(progKey)) {
      programMap.set(progKey, {
        target: report.target,
        displayName,
        domain,
        platform: report.platform,
        totalInteractions: 0,
        flaggedCount: 0,
        aggressiveCount: 0,
        frustratedCount: 0,
        dismissiveCount: 0,
        constructiveCount: 0,
        scores: []
      });
    }

    const prog = programMap.get(progKey)!;

    if (!report.timeline || report.timeline.length === 0) return;

    report.timeline.forEach((event, eventIdx) => {
      // Analyze the communication content (notes and title)
      const textToAnalyze = `${event.title || ''}. ${event.notes || ''}`.trim();
      if (!textToAnalyze || textToAnalyze.length < 5) return;

      const analysis = analyzeMessageTone(textToAnalyze);
      const authorRole = inferAuthorRole(event);

      // Only count events that have discernible content
      prog.totalInteractions += 1;
      prog.scores.push(analysis.sentimentScore);

      if (analysis.tone === 'AGGRESSIVE') {
        prog.aggressiveCount += 1;
        prog.flaggedCount += 1;
      } else if (analysis.tone === 'FRUSTRATED') {
        prog.frustratedCount += 1;
        prog.flaggedCount += 1;
      } else if (analysis.tone === 'DISMISSIVE') {
        prog.dismissiveCount += 1;
      } else if (analysis.tone === 'CONSTRUCTIVE') {
        prog.constructiveCount += 1;
      }

      const uniqueEventId = `${report.id}-${event.id || `evt-${eventIdx}`}`;

      allResults.push({
        eventId: uniqueEventId,
        reportId: report.id,
        reportTitle: report.title,
        target: report.target,
        platform: report.platform,
        date: event.date,
        title: event.title,
        notes: event.notes || '',
        authorRole,
        tone: analysis.tone,
        frictionLevel: analysis.frictionLevel,
        frictionScore: analysis.frictionScore,
        sentimentScore: analysis.sentimentScore,
        isFlagged: analysis.isFlagged,
        matchedKeywords: analysis.matchedKeywords,
        deEscalationAdvice: analysis.deEscalationAdvice,
        actionRecommendation: analysis.tacticalTip
      });
    });
  });

  // Sort all results: flagged first, then by date descending
  allResults.sort((a, b) => {
    if (a.isFlagged && !b.isFlagged) return -1;
    if (!a.isFlagged && b.isFlagged) return 1;
    if (b.frictionScore !== a.frictionScore) return b.frictionScore - a.frictionScore;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const flaggedIncidents = allResults.filter(r => r.isFlagged);

  const aggressiveCount = allResults.filter(r => r.tone === 'AGGRESSIVE').length;
  const frustratedCount = allResults.filter(r => r.tone === 'FRUSTRATED').length;
  const dismissiveCount = allResults.filter(r => r.tone === 'DISMISSIVE').length;
  const constructiveCount = allResults.filter(r => r.tone === 'CONSTRUCTIVE').length;
  const neutralCount = allResults.filter(r => r.tone === 'NEUTRAL').length;

  const totalCommunications = allResults.length;
  const frictionRatio = totalCommunications > 0
    ? Math.round(((aggressiveCount + frustratedCount + dismissiveCount) / totalCommunications) * 100)
    : 0;

  // Overall Health Score (0-100)
  // Base 85, minus points for friction, plus points for constructive
  let overallHealth = 85;
  if (totalCommunications > 0) {
    overallHealth = Math.round(
      Math.max(10, Math.min(100, 
        85 
        - (aggressiveCount * 25) 
        - (frustratedCount * 15) 
        - (dismissiveCount * 5) 
        + (constructiveCount * 4)
      ))
    );
  }

  // Prepare program breakdowns
  const programBreakdown: ProgramSentimentMetric[] = Array.from(programMap.values())
    .filter(p => p.totalInteractions > 0)
    .map(p => {
      const pHealth = Math.round(
        Math.max(10, Math.min(100,
          90 
          - (p.aggressiveCount * 35) 
          - (p.frustratedCount * 20) 
          - (p.dismissiveCount * 8) 
          + (p.constructiveCount * 5)
        ))
      );

      let status: 'HEALTHY' | 'MODERATE_TENSION' | 'HIGH_FRICTION' | 'CRITICAL_RISK' = 'HEALTHY';
      if (p.aggressiveCount > 0) status = 'CRITICAL_RISK';
      else if (p.frustratedCount > 0) status = 'HIGH_FRICTION';
      else if (p.dismissiveCount > 0) status = 'MODERATE_TENSION';

      return {
        target: p.target,
        displayName: p.displayName,
        domain: p.domain,
        platform: p.platform,
        totalInteractions: p.totalInteractions,
        flaggedCount: p.flaggedCount,
        aggressiveCount: p.aggressiveCount,
        frustratedCount: p.frustratedCount,
        dismissiveCount: p.dismissiveCount,
        constructiveCount: p.constructiveCount,
        healthScore: pHealth,
        status
      };
    })
    .sort((a, b) => b.flaggedCount - a.flaggedCount || a.healthScore - b.healthScore);

  return {
    totalCommunications,
    flaggedCount: flaggedIncidents.length,
    aggressiveCount,
    frustratedCount,
    dismissiveCount,
    constructiveCount,
    neutralCount,
    overallHealthScore: overallHealth,
    frictionRatio,
    programBreakdown,
    flaggedIncidents,
    allResults
  };
}
