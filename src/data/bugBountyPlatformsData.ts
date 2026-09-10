export interface BountyPlatform {
  id: string;
  name: string;
  tagline: string;
  category: 'Global Leader' | 'European Leader' | 'Private Red Team' | 'Web3 & DeFi' | 'Big Tech Direct' | 'Beginner Friendly';
  url: string;
  logoText: string;
  badgeColor: string;
  founded: number;
  headquarters: string;
  payoutMethods: string[];
  currencies: string[];
  minBounty: string;
  maxBounty: string;
  kycRequired: boolean;
  safeHarbor: string;
  triageSpeed: string;
  competitionLevel: string;
  description: string;
  targetFocus: string[];
  pros: string[];
  cons: string[];
  howToStart: string[];
  howToEarnMoneyTips: string[];
  payoutNotes: string;
  headerRequirement?: string;
}

export const BUG_BOUNTY_PLATFORMS: BountyPlatform[] = [
  {
    id: 'hackerone',
    name: 'HackerOne',
    tagline: 'A maior e mais prestigiada plataforma de Bug Bounty do mundo',
    category: 'Global Leader',
    url: 'https://hackerone.com',
    logoText: 'H1',
    badgeColor: 'from-orange-500 to-amber-600',
    founded: 2012,
    headquarters: 'São Francisco, EUA',
    payoutMethods: ['Transferência Bancária (ACH/Wire)', 'PayPal', 'Coinbase (Crypto / USDC)', 'Wise'],
    currencies: ['USD'],
    minBounty: '$100',
    maxBounty: '$100,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Muito Rápido (12-24h)',
    competitionLevel: 'Alta (Pública)',
    description: 'Plataforma pioneira que conecta pesquisadores a gigantes globais como Twitter/X, Uber, Airbnb, Shopify, GitHub, Valve, TikTok, Pentágono (DoD) e centenas de corporações Fortune 500.',
    targetFocus: ['Web Apps', 'APIs REST/GraphQL', 'Mobile (Android/iOS)', 'Infraestrutura Cloud', 'Source Code'],
    pros: [
      'Maior volume de programas públicos e privados do mercado.',
      'Triagem profissional dedicada da equipe HackerOne (rápida validação).',
      'Sistema de reputação (Signal e Impact) que garante convites privados frequentes.',
      'Pagamentos seguros sem retenção indevida e com múltiplos métodos.'
    ],
    cons: [
      'Altíssima concorrência em programas públicos recém-lançados.',
      'Penalização de pontuação (Signal) caso envie relatórios inválidos ou de baixo impacto.',
      'Exige formulário fiscal W-8BEN e verificação de identidade KYC.'
    ],
    howToStart: [
      'Crie sua conta em hackerone.com com nome profissional e e-mail seguro.',
      'Complete o perfil e configure a autenticação de dois fatores (2FA/U2F) obrigatória.',
      'Preencha o formulário fiscal W-8BEN (para residentes no Brasil e fora dos EUA evitarem retenção de 30%).',
      'Configure seu header de teste no Burp Suite: X-Bug-Bounty: hackerone-[seu_usuario].',
      'Participe do Hacker101 (CTF gratuito da H1) para aprender e ganhar convites privados automáticos.'
    ],
    howToEarnMoneyTips: [
      'Foque primeiro em programas VDP sem recompensa para elevar seu Signal acima de 4.0 rapidamente.',
      'Assim que seu Signal subir, você receberá convites privados semanais onde 80% do dinheiro real é pago.',
      'Evite ferramentas automáticas barulhentas (Nuclei/Nmap agressivo) — os triagers da H1 valorizam vulnerabilidades de lógica de negócios (IDOR, Race Condition, SSRF).',
      'Ative notificações no e-mail e seja um dos primeiros a testar programas privados recém-lançados (First Blood).'
    ],
    payoutNotes: 'Pagamento processado imediatamente após a empresa aprovar a recompensa. Sem taxas para transferência bancária direta via ACH ou PayPal.',
    headerRequirement: 'X-Bug-Bounty: hackerone-[username]'
  },
  {
    id: 'bugcrowd',
    name: 'Bugcrowd',
    tagline: 'Criadora da taxonomia VRT e lar de milhares de programas corporativos',
    category: 'Global Leader',
    url: 'https://bugcrowd.com',
    logoText: 'BC',
    badgeColor: 'from-amber-500 to-orange-600',
    founded: 2012,
    headquarters: 'São Francisco, EUA',
    payoutMethods: ['Payoneer', 'PayPal', 'Transferência Internacional'],
    currencies: ['USD'],
    minBounty: '$150',
    maxBounty: '$50,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Rápido (1-3 dias)',
    competitionLevel: 'Alta (Pública)',
    description: 'Plataforma líder que padronizou a indústria com a VRT (Vulnerability Rating Taxonomy - P1 a P5). Abriga programas da Tesla, MasterCard, Netflix, ExpressVPN, Atlassian e HP.',
    targetFocus: ['Web', 'Mobile', 'IoT & Hardware', 'APIs', 'Network Penetration'],
    pros: [
      'Taxonomia VRT clara: você sabe exatamente qual faixa de recompensa (P1 a P5) esperar antes de enviar.',
      'Crowdstream: histórico transparente de atividade e hall da fama.',
      'Bugcrowd University: material educacional gratuito de altíssima qualidade.',
      'Equipe de triagem justa e técnica (ASEs - Application Security Engineers).'
    ],
    cons: [
      'Regras estritas de duplicatas e prioridade temporal.',
      'Exige conta bancária configurada via Payoneer ou PayPal.'
    ],
    howToStart: [
      'Acesse bugcrowd.com e registre-se como Security Researcher.',
      'Leia o documento oficial da VRT (Vulnerability Rating Taxonomy) para entender as prioridades P1 (Crítico) a P5 (Informativo).',
      'Instale a extensão do Bugcrowd ou configure seu header: X-Bug-Bounty: bugcrowd-[username].',
      'Verifique sua identidade (ID Verification) para se tornar elegível a programas privados de alta renda.'
    ],
    howToEarnMoneyTips: [
      'Filtre a lista de programas por "Reward: Cash" e "Type: Private" (quando liberado).',
      'Ataque alvos de escopo amplo (*.target.com): use sublist3r, amass e httpx para encontrar subdomínios esquecidos.',
      'Concentre-se em P1 e P2 (RCE, SQLi, IDOR com modificação de dados) — na Bugcrowd um P1 pode pagar de $5.000 a $25.000.',
      'Submeta relatórios impecáveis com passos reproduzíveis para ganhar pontos de acurácia no ranking.'
    ],
    payoutNotes: 'Pagamentos semanais ou quinzenais creditados via Payoneer ou PayPal após validação pelo cliente.',
    headerRequirement: 'X-Bug-Bounty: bugcrowd-[username]'
  },
  {
    id: 'intigriti',
    name: 'Intigriti',
    tagline: 'A plataforma de Bug Bounty líder na Europa com excelente remuneração',
    category: 'European Leader',
    url: 'https://intigriti.com',
    logoText: 'INT',
    badgeColor: 'from-blue-500 to-indigo-600',
    founded: 2016,
    headquarters: 'Bruxelas, Bélgica',
    payoutMethods: ['Transferência Bancária SEPA / SWIFT', 'Wise', 'PayPal'],
    currencies: ['EUR', 'USD'],
    minBounty: '€150',
    maxBounty: '€50,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Muito Rápido (12-24h)',
    competitionLevel: 'Média (Privada)',
    description: 'Principal plataforma europeia de cibersegurança colaborativa. Conhecida pela comunidade vibrante, desafios mensais (XSS challenges), suporte humano exemplar e programas governamentais da UE.',
    targetFocus: ['Web Apps GDPR-Compliant', 'Mobile Apps', 'APIs Financeiras', 'Infraestrutura Europeia'],
    pros: [
      'Valores pagos em Euros (€), que tem valorização histórica frente a moedas emergentes.',
      'Triagem mais rápida e amigável da Europa, com chat e feedbacks construtivos.',
      'Bônus extras frequentes para relatórios excepcionais ou pesquisadores ativos no trimestre.',
      'Menor saturação de hunters iniciantes em comparação à HackerOne.'
    ],
    cons: [
      'Necessário concluir KYC rigoroso antes do primeiro saque financeiro.',
      'Menos programas públicos totais do que H1, mas com taxa de aproveitamento superior.'
    ],
    howToStart: [
      'Cadastre-se no intigriti.com/researcher e complete o teste introdutório de boas práticas.',
      'Baixe e configure os endpoints e headers solicitados no programa de interesse.',
      'Participe dos 1337 community challenges para ganhar notoriedade e convites automáticos.'
    ],
    howToEarnMoneyTips: [
      'Aproveite a legislação europeia (GDPR): qualquer vazamento de dados pessoais (PII) é considerado de severidade elevada pelas empresas europeias.',
      'Resolva os desafios mensais de XSS da Intigriti para desbloquear convites para programas privados ultrassigilosos.',
      'Foque nas empresas de Fintech e E-commerce europeias que pagam em Euros e possuem menos relatórios duplicados.'
    ],
    payoutNotes: 'Pagamentos via transferência SEPA direta ou SWIFT internacional. Processamento em até 5 dias úteis.',
    headerRequirement: 'X-Bug-Bounty: intigriti-[username]'
  },
  {
    id: 'yeswehack',
    name: 'YesWeHack',
    tagline: 'Plataforma líder com presença massiva na Europa e Ásia-Pacífico',
    category: 'European Leader',
    url: 'https://yeswehack.com',
    logoText: 'YWH',
    badgeColor: 'from-emerald-500 to-teal-600',
    founded: 2013,
    headquarters: 'Paris, França',
    payoutMethods: ['Transferência Bancária Internacional', 'PayPal'],
    currencies: ['EUR', 'USD'],
    minBounty: '€100',
    maxBounty: '€40,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Rápido (24-48h)',
    competitionLevel: 'Média (Privada)',
    description: 'A maior plataforma nascida na França, presente em mais de 40 países com clientes como Decathlon, BlaBlaCar, governos suíço e francês, e telecomunicações.',
    targetFocus: ['Web & Cloud', 'Mobile', 'Smart Contracts', 'Connected Devices / IoT'],
    pros: [
      'Políticas de privacidade de dados estritas e ambiente 100% alinhado com padrões europeus.',
      'Dojo YesWeHack: ambiente de treino interativo para praticar antes de caçar bugs reais.',
      'Alta concentração de programas privados com pouquíssima concorrência de hunters das Américas.'
    ],
    cons: [
      'Interface exige familiaridade com termos técnicos em inglês e ocasionalmente francês em alvos locais.',
      'Verificação documental detalhada.'
    ],
    howToStart: [
      'Registre-se em yeswehack.com como Hunter.',
      'Complete os desafios práticos do YesWeHack Dojo para acumular pontos de ranking inicial.',
      'Leia detalhadamente as regras de escopo e limites de testes das empresas europeias.'
    ],
    howToEarnMoneyTips: [
      'Alvos franceses e suíços frequentemente possuem sistemas próprios de autenticação e SSO onde falhas de lógica passam despercebidas.',
      'Mantenha uma taxa de aceitação de relatórios acima de 85% para entrar no grupo prioritário de convites fechados.',
      'Envie relatórios detalhados com sugestões de correção em código (remediation snippets) para receber bônus voluntários.'
    ],
    payoutNotes: 'Pagamentos automáticos mensalmente ou sob demanda após aprovação do cliente.',
    headerRequirement: 'X-Bug-Bounty: yeswehack-[username]'
  },
  {
    id: 'synack',
    name: 'Synack Red Team (SRT)',
    tagline: 'Plataforma de elite com remuneração por achado e pagamento por hora',
    category: 'Private Red Team',
    url: 'https://synack.com',
    logoText: 'SYN',
    badgeColor: 'from-red-600 to-rose-700',
    founded: 2013,
    headquarters: 'Redwood City, EUA',
    payoutMethods: ['Transferência Bancária Direta', 'PayPal'],
    currencies: ['USD'],
    minBounty: '$200',
    maxBounty: '$30,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Muito Rápido (Poucas horas)',
    competitionLevel: 'Restrita (Exame)',
    description: 'Comunidade fechada de especialistas em segurança ofensiva (Synack Red Team). Para entrar, é necessário passar por um rigoroso processo seletivo técnico com prova prática e background check.',
    targetFocus: ['Red Teaming', 'Governo dos EUA e OTAN', 'Sistemas Bancários', 'Aplicações Críticas'],
    pros: [
      'Paga por vulnerabilidade encontrada E por "Missions" (testes direcionados com valor fixo garantido por hora).',
      'Concorrência baixíssima: apenas membros aprovados do SRT têm acesso aos alvos.',
      'Tráfego 100% roteado por VPN própria (Synack Launchpoint), eliminando qualquer risco de bloqueio de IP.',
      'Ambiente profissional e respeitoso para pesquisadores seniores.'
    ],
    cons: [
      'Processo de admissão difícil com avaliação prática e verificação minuciosa de antecedentes.',
      'Vagas limitadas por região e por perfil de habilidade.'
    ],
    howToStart: [
      'Inscreva-se em synack.com/red-team.',
      'Submeta seu currículo, histórico de CVEs ou perfil comprovado em plataformas de segurança.',
      'Passe no exame prático técnico de 5 fases (web, reversing, network, mobile).',
      'Conclua a verificação de antecedentes internacionais e instale o Launchpoint VPN client.'
    ],
    howToEarnMoneyTips: [
      'As "Missions" são a maneira mais consistente de fazer dinheiro garantido: você recebe $100 a $500 apenas para checar um checklist específico em 1 ou 2 horas, encontrando bugs ou não!',
      'Alvos governamentais e de defesa pagam os maiores bounties com estabilidade financeira mensal previsível.',
      'Ative os alertas de novas missões no celular para garantir vagas antes que encham.'
    ],
    payoutNotes: 'Pagamentos regulares quinzenais sem burocracia para membros ativos do SRT.'
  },
  {
    id: 'immunefi',
    name: 'Immunefi',
    tagline: 'A maior plataforma de Bug Bounty Web3 e Smart Contracts do planeta',
    category: 'Web3 & DeFi',
    url: 'https://immunefi.com',
    logoText: 'IMM',
    badgeColor: 'from-purple-600 to-indigo-700',
    founded: 2020,
    headquarters: 'Global / Remoto',
    payoutMethods: ['USDC / USDT', 'ETH', 'Tokens Nativos do Protocolo'],
    currencies: ['USD (Crypto)'],
    minBounty: '$1,000',
    maxBounty: '$10,000,000',
    kycRequired: false,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Rápido (24-72h)',
    competitionLevel: 'Baixa (Nicho)',
    description: 'A plataforma responsável pelas maiores recompensas da história da tecnologia. Especializada em segurança de contratos inteligentes, finanças descentralizadas (DeFi), pontes cross-chain e blockchains Layer 1/2.',
    targetFocus: ['Smart Contracts (Solidity, Rust, Vyper)', 'Pontes Cross-Chain', 'Infraestrutura DeFi', 'Protocolos Web3'],
    pros: [
      'Recompensas multimilionárias: pagamentos reais de $1.000.000 a $10.000.000 já foram realizados.',
      'Código-fonte dos contratos é 100% aberto e verificável no Etherscan ou GitHub.',
      'Ambiente sem restrições geográficas com pagamento direto na sua carteira cripto.',
      'Demanda gigantesca por auditores qualificados e concorrência proporcionalmente menor.'
    ],
    cons: [
      'Requer conhecimento profundo em programação de Smart Contracts (Solidity/Rust) e lógica DeFi.',
      'Erros de severidade não toleram amadorismo: exige PoC com execução em fork local da blockchain (Foundry/Hardhat).'
    ],
    howToStart: [
      'Acesse immunefi.com e explore os programas de protocolos como MakerDAO, Polygon, Arbitrum, Uniswap e Wormhole.',
      'Aprenda a criar PoCs usando Foundry (forge test) simulando transações com saldo clonado da mainnet.',
      'Leia os relatórios anteriores de bugs divulgados publicamente na Immunefi Medium.'
    ],
    howToEarnMoneyTips: [
      'Foque em falhas de lógica matemática, manipuladores de preço de oráculos (Flash Loan attacks) e reentrancy moderno.',
      'Mesmo vulnerabilidades de severidade Média ou Alta em Web3 pagam de $5.000 a $50.000.',
      'Analise os commits recentes no GitHub dos protocolos: desenvolvedores frequentemente introduzem vulnerabilidades ao adicionar novos recursos de swap ou yield.'
    ],
    payoutNotes: 'Pagamentos pagos diretamente para o endereço Ethereum/Polygon/Solana do pesquisador em stablecoins líquidas (USDC/USDT).'
  },
  {
    id: 'hackenproof',
    name: 'HackenProof',
    tagline: 'Plataforma especializada em Web3, exchanges cripto e fintechs',
    category: 'Web3 & DeFi',
    url: 'https://hackenproof.com',
    logoText: 'HKP',
    badgeColor: 'from-cyan-500 to-blue-600',
    founded: 2017,
    headquarters: 'Tallinn, Estônia',
    payoutMethods: ['USDT / USDC', 'Bitcoin', 'Transferência Bancária'],
    currencies: ['USDT', 'USD'],
    minBounty: '$200',
    maxBounty: '$500,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Rápido (24-48h)',
    competitionLevel: 'Média (Privada)',
    description: 'Plataforma que une segurança de aplicações web tradicionais e protocolos blockchain. Abriga programas de grandes corretoras de criptomoedas, carteiras digitais e ecossistemas descentralizados.',
    targetFocus: ['Exchanges de Criptomoedas', 'Web3 DApps', 'APIs de Pagamento', 'Smart Contracts'],
    pros: [
      'Pagamentos rápidos em stablecoins (USDT/USDC).',
      'Boa mescla de alvos Web tradicionais e alvos blockchain.',
      'Eventos de hacking ao vivo (Live Hacking Events) com bônus acumulados.'
    ],
    cons: [
      'Volume menor de programas gerais não relacionados a finanças e crypto.',
      'Necessário verificar identidade para grandes quantias.'
    ],
    howToStart: [
      'Cadastre-se no hackenproof.com e configure sua carteira de recebimento.',
      'Escolha programas marcados com "Cash Bounty" e leia as políticas de segurança específicas.'
    ],
    howToEarnMoneyTips: [
      'Exchanges de criptomoedas têm APIs complexas de trading: teste endpoints de ordens com Race Conditions ou arredondamento incorreto de taxas.',
      'Procure por vazamento de chaves de API com permissão de saque ou leitura de saldo.'
    ],
    payoutNotes: 'Pagamentos em USDT enviados para a carteira cadastrada em até 48 horas após validação.'
  },
  {
    id: 'google-vrp',
    name: 'Google Vulnerability Reward Program (Bug Hunters)',
    tagline: 'Programa de recompensas direto da maior gigante da tecnologia',
    category: 'Big Tech Direct',
    url: 'https://bughunters.google.com',
    logoText: 'GOOG',
    badgeColor: 'from-red-500 via-yellow-500 to-green-500',
    founded: 2010,
    headquarters: 'Mountain View, EUA',
    payoutMethods: ['Transferência Bancária Internacional', 'Doação em Dobro para Caridade'],
    currencies: ['USD'],
    minBounty: '$500',
    maxBounty: '$313,337+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Rápido (1-2 dias)',
    competitionLevel: 'Alta (Pública)',
    description: 'O lendário programa de Bug Bounty do Google, englobando Google.com, YouTube, Android OS, Google Cloud Platform (GCP), navegador Chrome e projetos open-source.',
    targetFocus: ['Google Cloud (GCP)', 'Android & Kernel', 'Chrome Browser', 'Aplicações Web Google', 'Dispositivos Pixel'],
    pros: [
      'Paga os maiores valores da indústria para sistemas operacionais e navegadores.',
      'Tabela de recompensas 100% pública e transparente.',
      'Opção de doar o bounty para instituições de caridade com o Google dobrando o valor doado.',
      'Reconhecimento máximo no currículo no Google Bug Hunters Hall of Fame.'
    ],
    cons: [
      'Superfície de ataque extremamente segura e auditada por milhares de hackers.',
      'Não aceita falhas puramente teóricas ou problemas de SPF/DMARC.'
    ],
    howToStart: [
      'Acesse bughunters.google.com e faça login com sua conta Google.',
      'Explore as regras do VRP (Vulnerability Reward Program) e a tabela de remuneração oficial.',
      'Submeta relatórios diretamente pelo portal do Bug Hunters.'
    ],
    howToEarnMoneyTips: [
      'Foque nas integrações de APIs do Google Cloud (IAM, Cloud Storage, Kubernetes Engine).',
      'Pesquise bugs de autorização lógica em novas features do Google Workspace (Docs, Sheets, Drive).',
      'Envie relatórios concisos e focados em impacto direto; o Google não exige PoC destrutivo.'
    ],
    payoutNotes: 'Processamento direto por equipe do Google via formulário de fornecedor global.'
  },
  {
    id: 'microsoft-bounty',
    name: 'Microsoft Bug Bounty Program',
    tagline: 'Protegendo o ecossistema Windows, Azure, Office 365 e Edge',
    category: 'Big Tech Direct',
    url: 'https://www.microsoft.com/en-us/msrc/bounty',
    logoText: 'MSFT',
    badgeColor: 'from-blue-600 to-cyan-700',
    founded: 2013,
    headquarters: 'Redmond, EUA',
    payoutMethods: ['Transferência Bancária Direta (Wire/ACH)'],
    currencies: ['USD'],
    minBounty: '$1,000',
    maxBounty: '$250,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Médio (3-5 dias)',
    competitionLevel: 'Alta (Pública)',
    description: 'Programa oficial do MSRC (Microsoft Security Response Center), cobrindo nuvem Azure, ecossistema Microsoft 365, identidade corporativa Entra ID (antigo Azure AD), Windows e Hyper-V.',
    targetFocus: ['Microsoft Azure & Cloud', 'Identidade & Entra ID', 'Windows Kernel & Hyper-V', 'M365 & Teams'],
    pros: [
      'Recompensas massivas para falhas no Azure e quebra de isolamento de tenants na nuvem.',
      'MSRC reconhece os pesquisadores na lista anual dos Top 100 Security Researchers do planeta.',
      'Bônus extras para relatórios com PoC funcional e mitigação técnica sugerida.'
    ],
    cons: [
      'Ciclo de validação pode demorar um pouco mais devido à complexidade do ecossistema corporativo.',
      'Requer ambiente de laboratório para testes em produtos Microsoft.'
    ],
    howToStart: [
      'Acesse msrcreporting.microsoft.com e registre sua conta de pesquisador.',
      'Verifique os programas ativos do Microsoft Bounty Program e seus respectivos multiplicadores de recompensa.'
    ],
    howToEarnMoneyTips: [
      'Vulnerabilidades no Microsoft Azure Cloud pagam de $15.000 a $40.000 para bypass de autenticação entre clientes.',
      'Falhas de autenticação OAuth no Microsoft 365 são frequentes em integrações com apps de terceiros.',
      'Participe dos períodos de "Bounty Multipliers" onde a Microsoft duplica o valor de falhas em produtos específicos.'
    ],
    payoutNotes: 'Pagamento efetuado diretamente na conta bancária do pesquisador através do portal oficial de pagamentos corporativos da Microsoft.'
  },
  {
    id: 'meta-bounty',
    name: 'Meta Bug Bounty (Facebook, Instagram, WhatsApp)',
    tagline: 'Recompensas generosas protegendo mais de 3 bilhões de usuários',
    category: 'Big Tech Direct',
    url: 'https://facebook.com/whitehat',
    logoText: 'META',
    badgeColor: 'from-blue-500 to-indigo-600',
    founded: 2011,
    headquarters: 'Menlo Park, EUA',
    payoutMethods: ['Transferência Bancária Direta', 'Cartão Pré-pago Hacker Card'],
    currencies: ['USD'],
    minBounty: '$500',
    maxBounty: 'Sem limite máximo',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Muito Rápido (24h)',
    competitionLevel: 'Alta (Pública)',
    description: 'Programa pioneiro de Bug Bounty da Meta, cobrindo Facebook, Instagram, WhatsApp, Messenger, Oculus VR e Workplace. Sem teto fixo para bugs de alto impacto.',
    targetFocus: ['Instagram & Facebook Web/Mobile', 'WhatsApp Protocols', 'Graph API', 'Oculus Quest Hardware/Firmware'],
    pros: [
      'Não há limite máximo de pagamento: vulnerabilidades críticas já renderam mais de $80.000 em um único reporte.',
      'Opção do exclusivo "Meta Whitehat Bug Bounty Card" pré-pago para pesquisadores de ponta.',
      'Excelente comunicação e canal direto com a equipe de engenheiros de segurança da Meta.'
    ],
    cons: [
      'Alvos populares e altamente testados por milhões de pesquisadores mundiais.',
      'Regras rígidas sobre privacidade de dados de terceiros durante o teste.'
    ],
    howToStart: [
      'Acesse facebook.com/whitehat e faça login com sua conta.',
      'Crie contas de teste dedicadas (test accounts) disponibilizadas pela Meta para não afetar contas reais.',
      'Submeta relatórios detalhados com passos para reproduzir e vídeos ou capturas de tela demonstrando o impacto.'
    ],
    howToEarnMoneyTips: [
      'A Graph API da Meta é imensa: investigue permissões em chamadas de API do Instagram e Facebook Pages.',
      'Account Takeovers via fluxos de recuperação de senha ou OAuth token leaks pagam em média $10.000 a $30.000.',
      'Teste novas funcionalidades assim que são anunciadas nos apps beta do Instagram ou WhatsApp.'
    ],
    payoutNotes: 'Pagamentos feitos via transferência bancária internacional ou creditados no cartão Black da Meta para hackers frequentes.'
  },
  {
    id: 'apple-security',
    name: 'Apple Security Bounty',
    tagline: 'Recompensas de até US$ 1.000.000 para o ecossistema Apple',
    category: 'Big Tech Direct',
    url: 'https://security.apple.com/bounty',
    logoText: 'APPL',
    badgeColor: 'from-zinc-700 to-zinc-900',
    founded: 2016,
    headquarters: 'Cupertino, EUA',
    payoutMethods: ['Transferência Bancária Internacional'],
    currencies: ['USD'],
    minBounty: '$2,500',
    maxBounty: '$1,000,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Médio (5-10 dias)',
    competitionLevel: 'Restrita (Exame)',
    description: 'Programa oficial da Apple para recompensar pesquisadores que descobrem falhas de segurança críticas no iOS, macOS, watchOS, tvOS, iCloud e dispositivos físicos.',
    targetFocus: ['iOS & iPadOS Kernel', 'macOS Sandbox Bypasses', 'iCloud Account Takeover', 'Apple Silicon / Hardware'],
    pros: [
      'Maior valor individual de recompensa da indústria de tecnologia tradicional (até $1 milhão).',
      'Fornece dispositivos de pesquisa especiais (Apple Security Research Device) para pesquisadores qualificados.',
      'Prestígio técnico incomparável na comunidade global de segurança.'
    ],
    cons: [
      'Barreira técnica altíssima: exige conhecimento aprofundado de engenharia reversa, C/Objective-C/Swift e exploração de kernel.',
      'Ciclo de análise longo.'
    ],
    howToStart: [
      'Acesse security.apple.com e cadastre sua Apple ID.',
      'Leia as categorias de ataque descritas no Apple Security Bounty Guidelines.',
      'Submeta sua análise técnica com PoC determinístico.'
    ],
    howToEarnMoneyTips: [
      'Falhas no iCloud Web e autenticação federada são as mais acessíveis para pesquisadores web ($10.000 a $50.000).',
      'Bypasses de permissões de privacidade no macOS (TCC - Transparency, Consent, and Control) pagam $25.000 a $100.000.',
      'Acompanhe as versões de desenvolvedor (Betas) para testar novidades antes do lançamento ao público.'
    ],
    payoutNotes: 'Pagamentos bancários corporativos em dólares americanos diretamente pela Apple Inc.'
  },
  {
    id: 'open-bug-bounty',
    name: 'Open Bug Bounty',
    tagline: 'A melhor porta de entrada para iniciantes construírem reputação e CVEs',
    category: 'Beginner Friendly',
    url: 'https://openbugbounty.org',
    logoText: 'OBB',
    badgeColor: 'from-emerald-600 to-teal-700',
    founded: 2014,
    headquarters: 'Global / Não-Governamental',
    payoutMethods: ['Bounties Voluntários via PayPal', 'Hall of Fame', 'Certificados de Reconhecimento'],
    currencies: ['USD', 'EUR'],
    minBounty: 'Voluntário ($50 - $500)',
    maxBounty: '$5,000 (Voluntário)',
    kycRequired: false,
    safeHarbor: 'Partial Safe Harbor',
    triageSpeed: 'Muito Rápido (Automático + Verificação)',
    competitionLevel: 'Baixa (Nicho)',
    description: 'Plataforma sem fins lucrativos focada em divulgação responsável de vulnerabilidades da Web (XSS, Open Redirect, CSRF). Excelente para iniciantes que querem praticar em alvos reais sem burocracia.',
    targetFocus: ['Websites Globais', 'XSS (Cross-Site Scripting)', 'Open Redirects', 'CSRF'],
    pros: [
      'Qualquer site que não proíba testes pode ser reportado eticamente.',
      'Não exige KYC ou burocracias complexas.',
      'Excelente para criar portfólio, obter links no Hall da Fama e receber prêmios voluntários de empresas agradecidas.'
    ],
    cons: [
      'O pagamento é voluntário (nem todas as empresas pagam em dinheiro, muitas dão camisetas e certificados).',
      'Aceita apenas tipos específicos de vulnerabilidades web não invasivas.'
    ],
    howToStart: [
      'Crie sua conta em openbugbounty.org.',
      'Encontre um site que não tenha programa de Bug Bounty próprio mas seja receptivo.',
      'Valide que o XSS é puramente não-destrutivo e submeta o relatório com PoC simples.'
    ],
    howToEarnMoneyTips: [
      'Alvos corporativos de médio porte (lojas virtuais, faculdades, SaaS) costumam pagar bonificações de $100 a $500 via PayPal em agradecimento.',
      'Use o seu ranking na Open Bug Bounty como comprovante de habilidade ao se candidatar para plataformas privadas como Synack ou HackerOne.',
      'Foque em subdomínios antigos com parâmetros vulneráveis a XSS refletido.'
    ],
    payoutNotes: 'Os donos dos sites pagam diretamente via PayPal para o pesquisador.'
  },
  {
    id: 'federacy',
    name: 'Federacy',
    tagline: 'Plataforma para startups e empresas ágeis com baixa saturação de hunters',
    category: 'Beginner Friendly',
    url: 'https://federacy.com',
    logoText: 'FED',
    badgeColor: 'from-teal-600 to-cyan-700',
    founded: 2017,
    headquarters: 'São Francisco, EUA',
    payoutMethods: ['Stripe Direct', 'PayPal'],
    currencies: ['USD'],
    minBounty: '$100',
    maxBounty: '$15,000+',
    kycRequired: true,
    safeHarbor: 'Full Safe Harbor',
    triageSpeed: 'Médio (2-4 dias)',
    competitionLevel: 'Baixa (Nicho)',
    description: 'Plataforma focada em conectar startups em crescimento rápido e empresas de tecnologia modernas a pesquisadores éticos. Menos burocrática e com concorrência significativamente menor do que HackerOne.',
    targetFocus: ['SaaS Startups', 'Modern Cloud Stacks', 'APIs REST'],
    pros: [
      'Poucos pesquisadores caçando ao mesmo tempo, reduzindo o risco de duplicatas em 70%.',
      'Contato direto com os fundadores e diretores de tecnologia (CTOs) das startups.',
      'Alvos modernos rodando React, Next.js, Node e Supabase/Firebase.'
    ],
    cons: [
      'Número menor de programas ativos no catálogo.',
      'Valores máximos de recompensa menores do que alvos de grandes multinacionais.'
    ],
    howToStart: [
      'Registre-se no federacy.com e confirme seu perfil de segurança.',
      'Procure por programas recém-adicionados no feed inicial e comece pelos testes de APIs.'
    ],
    howToEarnMoneyTips: [
      'Startups costumam ter falhas de controle de acesso (BOLA/IDOR) em suas APIs novas.',
      'Reporte com agilidade e clareza para se tornar o pesquisador de confiança da startup, garantindo convites exclusivos futuros.'
    ],
    payoutNotes: 'Pagamento rápido processado via Stripe Connect ou PayPal diretamente após aceitação.'
  }
];

export interface MonetizationPhase {
  phase: number;
  title: string;
  subtitle: string;
  timeframe: string;
  expectedEarningsUSD: string;
  expectedEarningsBRL: string;
  keyGoal: string;
  actionSteps: string[];
  mistakesToAvoid: string[];
  proTip: string;
}

export const MONETIZATION_ROADMAP: MonetizationPhase[] = [
  {
    phase: 1,
    title: 'Fase 1: O Batismo no VDP & Construção de Reputação',
    subtitle: 'Do zero absoluto aos primeiros convites privados (Sem cair em duplicatas)',
    timeframe: 'Mês 1 ao Mês 3',
    expectedEarningsUSD: '$0 - $800 / mês',
    expectedEarningsBRL: 'R$ 0 - R$ 4.300 / mês',
    keyGoal: 'Conquistar Signal alto no HackerOne/Bugcrowd e desbloquear convites para programas privados.',
    actionSteps: [
      'Abandone os programas públicos milionários no primeiro mês: programas como Yahoo, Uber e TikTok têm 20.000 hackers testando a mesma coisa.',
      'Filtre alvos "VDP" (Vulnerability Disclosure Programs) que oferecem apenas pontos de reputação e camisetas. A concorrência aqui é 90% menor!',
      'Encontre 5 a 10 falhas válidas (IDOR simples, CSRF com impacto, CORS mal configurado, Information Disclosure de API keys).',
      'Mantenha seu "Signal" no HackerOne acima de 4.0 e taxa de acerto acima de 80%.',
      'Assim que seu score subir, o algoritmo das plataformas começará a te enviar CONVITES PRIVADOS automáticos.'
    ],
    mistakesToAvoid: [
      'Nunca use scanners automáticos ruidosos (Burp Active Scanner, Acunetix) em programas inteiros — você terá seu IP banido e ganhará reputação negativa.',
      'Não reporte problemas puramente teóricos (SPF/DMARC ausente, Clickjacking em páginas sem formulários, banner de versão do Apache).',
      'Não infle a severidade CVSS: classificar um XSS sem impacto como Critical irritará o triager e diminuirá sua reputação.'
    ],
    proTip: 'Um único programa privado pode render 5x mais dinheiro que 10 programas públicos somados, pois lá você compete com apenas 20 a 50 hackers convidados em vez de dezenas de milhares!'
  },
  {
    phase: 2,
    title: 'Fase 2: Conquistando Convites Privados & First Blood',
    subtitle: 'Onde o dinheiro de verdade começa a fluir de forma previsível',
    timeframe: 'Mês 3 ao Mês 6',
    expectedEarningsUSD: '$800 - $3.000 / mês',
    expectedEarningsBRL: 'R$ 4.300 - R$ 16.000 / mês',
    keyGoal: 'Aproveitar programas privados recém-lançados para pegar as primeiras recompensas (First Blood) sem concorrência.',
    actionSteps: [
      'Monitore o e-mail 24/7 com notificações ativas para convites de programas privados.',
      'Quando receber um convite, comece a testar na primeira hora de lançamento ("First Blood Strategy").',
      'Mapeie a superfície do alvo: use ferramentas como sublist3r, amass, subfinder e httpx para descobrir subdomínios ocultos que outros hackers ignoraram.',
      'Analise os arquivos JavaScript (.js) da aplicação: extraia rotas de API não documentadas e endpoints administrativos com ferramentas como LinkFinder e Katana.',
      'Foque em vulnerabilidades de severidade Média e Alta: IDOR em exclusão de dados, Broken Object Level Authorization (BOLA), Race Conditions em cupons.'
    ],
    mistakesToAvoid: [
      'Não demore dias para testar um programa privado novo: as falhas fáceis são reportadas nas primeiras 48 horas.',
      'Não desista se não achar nada em 2 horas: hackers amadores desistem rápido, os pesquisadores profissionais exploram a lógica a fundo.'
    ],
    proTip: 'Crie uma conta com privilégios normais (User A) e outra conta (User B) no alvo. Intercepte no Burp Suite e tente acessar ou alterar os recursos do User A usando o token do User B. IDORs em APIs modernas continuam sendo a maior fonte de renda rápida do Bug Bounty!'
  },
  {
    phase: 3,
    title: 'Fase 3: Especialização em Vulnerabilidades de Alto Impacto (High ROI)',
    subtitle: 'Alcançando bounties de $2.000 a $15.000+ por relatório individual',
    timeframe: 'Mês 6 ao Mês 12',
    expectedEarningsUSD: '$3.000 - $8.000+ / mês',
    expectedEarningsBRL: 'R$ 16.000 - R$ 43.000+ / mês',
    keyGoal: 'Dominar classes complexas de vulnerabilidades que scanners automáticos são incapazes de detectar.',
    actionSteps: [
      'Especialize-se em Lógica de Negócios (Business Logic): falhas em fluxos de checkout, pagamento com valor negativo, manipulação de carrinhos e moedas virtuais.',
      'Domine SSRF em Nuvem: aprenda a exfiltrar metadados da AWS (169.254.169.254/latest/meta-data/) ou Google Cloud através de geradores de PDF, webhooks e uploaders de imagem.',
      'Estude Race Conditions (Condições de Corrida): use a extensão "Turbo Intruder" do Burp Suite com HTTP/2 Single-Packet Attack para resgatar o mesmo cupom ou saldo 10 vezes em paralelo.',
      'Explore fluxos de OAuth e SAML: redirecionamento de authorization code, vazamento de tokens de acesso e Account Takeover completo.',
      'Escreva relatórios com Impacto de Negócio explícito: mostre quanto dinheiro a empresa perderia se um atacante malicioso explorasse a falha.'
    ],
    mistakesToAvoid: [
      'Não perca tempo com vulnerabilidades de $100 se você já domina a lógica — foque seu tempo nas falhas que pagam de $2.000 a $10.000.',
      'Não envie passos confusos: inclua requisições cURL limpas prontas para execução imediata pelo triager.'
    ],
    proTip: 'Ao encontrar uma falha em uma funcionalidade, teste se a mesma falha se repete em todos os outros microserviços e endpoints da empresa. Isso é conhecido como "Horizontal Bug Scaling" e permite transformar um relatório em 4 ou 5 bounties em poucas horas!'
  },
  {
    phase: 4,
    title: 'Fase 4: Reconhecimento Contínuo & Automação Inteligente',
    subtitle: 'Construindo uma máquina de caça automatizada em nuvem (24/7)',
    timeframe: '1 Ano em Diante',
    expectedEarningsUSD: '$8.000 - $25.000+ / mês',
    expectedEarningsBRL: 'R$ 43.000 - R$ 135.000+ / mês',
    keyGoal: 'Receber notificações automáticas no Telegram/Discord no instante em que o alvo publicar código novo ou novos subdomínios.',
    actionSteps: [
      'Monte uma VPS em nuvem (DigitalOcean / AWS / Hetzner) dedicada a monitoramento passivo e contínuo.',
      'Configure scripts de Recon Contínuo: monitore novos certificados SSL emitidos para a empresa via crt.sh e certstream.',
      'Faça download diário dos arquivos JS dos alvos e execute git diff automático para alertar sobre novos endpoints de API que foram lançados no ambiente de produção.',
      'Quando os desenvolvedores do alvo subirem uma feature nova na sexta-feira à noite, você recebe o alerta no Telegram e é o primeiro do mundo a testar.',
      'Crie templates customizados de Nuclei apenas para vulnerabilidades que você mesmo descobriu (zero-days privados e heurísticas próprias).'
    ],
    mistakesToAvoid: [
      'Não rode scans de negação de serviço (DoS) que derrubem o servidor dos alvos.',
      'Nunca compartilhe seus scripts de automação proprietários com a concorrência.'
    ],
    proTip: 'A maioria das grandes empresas tem lançamentos contínuos de código (CI/CD). Quem descobre o endpoint novo nos primeiros 15 minutos tem 99% de chance de pegar a recompensa sozinho sem duplicatas!'
  }
];

export interface BugBountyTutorialStep {
  step: number;
  title: string;
  category: 'Cadastro & Fiscal' | 'Ambiente & Ferramentas' | 'Políticas & Escopo' | 'Escrita de Relatório' | 'Triagem & Pagamento';
  summary: string;
  details: string[];
  codeOrTemplate?: string;
  cautionNotice?: string;
}

export const BUG_BOUNTY_TUTORIAL: BugBountyTutorialStep[] = [
  {
    step: 1,
    title: 'Cadastro Profissional e Formulário Fiscal W-8BEN',
    category: 'Cadastro & Fiscal',
    summary: 'Como configurar sua conta para receber em dólares sem pagar 30% de impostos indevidos nos EUA.',
    details: [
      'Escolha um nome de usuário profissional (evite termos vulgares que queimem sua credibilidade perante as empresas).',
      'Ative a autenticação de dois fatores (2FA) via App (Google Authenticator ou chave física YubiKey). A maioria dos programas com bounty exige 2FA ativo para liberar relatórios.',
      'Formulário W-8BEN: Como cidadão não residente fiscal nos EUA (ex: residente no Brasil), você deve preencher o W-8BEN dentro da plataforma (HackerOne, Bugcrowd, etc.).',
      'Esse formulário certifica que você recolherá os tributos no seu país de residência, evitando a retenção na fonte automática de 30% do governo americano (IRS).'
    ],
    cautionNotice: 'Se você não preencher o formulário W-8BEN antes do pagamento, a plataforma pode reter até 30% do seu bounty para o fisco americano!'
  },
  {
    step: 2,
    title: 'Configuração do Burp Suite e Headers Obrigatórios',
    category: 'Ambiente & Ferramentas',
    summary: 'Como se identificar eticamente para não ser bloqueado por WAFs e não sofrer ações legais.',
    details: [
      'Instale o Burp Suite Community ou Pro e configure o certificado CA no seu navegador.',
      'Identificação Obrigatória: Praticamente todos os programas exigem que seu tráfego seja identificado para que o SOC (Security Operations Center) do cliente saiba que você é um hacker ético autorizado.',
      'No Burp Suite, acesse: Proxy -> Options -> Match and Replace.',
      'Adicione uma regra para incluir automaticamente o Header solicitado no escopo em TODAS as suas requisições HTTP:',
      'Exemplo HackerOne: X-Bug-Bounty: hackerone-[seu_usuario]',
      'Exemplo Bugcrowd: X-Bug-Bounty: bugcrowd-[seu_usuario]',
      'Configure também um User-Agent customizado caso o programa exija.'
    ],
    codeOrTemplate: `Match and Replace no Burp Suite:
Tipo: Request Header
Match: (deixe em branco para adicionar)
Replace: X-Bug-Bounty: hackerone-seu_username_aqui`
  },
  {
    step: 3,
    title: 'Leitura Minuciosa do Escopo (In-Scope vs Out-of-Scope)',
    category: 'Políticas & Escopo',
    summary: 'A linha que separa um hacker ético premiado de um criminoso processado judicialmente.',
    details: [
      'O Escopo (Policy) é um contrato legal. Testar fora do escopo anula a proteção de Safe Harbor.',
      'In-Scope (Alvos Permitidos): Verifique a lista de domínios, aplicativos móveis ou blocos IP explicitamente listados.',
      'Out-of-Scope (Proibido): Domínios de terceiros, endpoints de suporte (Zendesk, Salesforce), subdomínios desativados que apontam para serviços externos sem autorização.',
      'Regras Universais Proibidas: Nunca execute ataques de Negação de Serviço (DoS/DDoS), ataques de força bruta massiva que sobrecarreguem servidores, engenharia social ou phishing contra funcionários.',
      'Exfiltração de Dados: Se você encontrou um SQL Injection ou IDOR que expõe dados, pare na PRIMEIRA linha de exemplo. Baixar o banco de dados inteiro viola a política e resultará em banimento e possível processo.'
    ],
    cautionNotice: 'Nunca teste fora do escopo. Mesmo se você achar um RCE crítico, se o domínio estiver em Out-of-Scope, seu relatório será rejeitado como inválido e sua conta poderá ser suspensa.'
  },
  {
    step: 4,
    title: 'Como Escrever um Relatório Perfeito (O Guia da Aprovação Rápida)',
    category: 'Escrita de Relatório',
    summary: 'O triager não executa seu pensamento: o relatório precisa ser 100% reproduzível e claro.',
    details: [
      'Título Claro e Padronizado: Indique o componente, o tipo de vulnerabilidade e o impacto. Exemplo: "[api.alvo.com] IDOR no endpoint /api/v1/user/update permite alteração não autorizada de senhas de outros usuários".',
      'Passos Determinísticos para Reproduzir: Escreva um passo a passo numerado, do login até a exploração final.',
      'Prova de Conceito (PoC) Limpa: Anexe a requisição HTTP pura do Burp Suite e o comando cURL equivalente.',
      'Impacto no Negócio: Explique com frieza técnica o que um atacante do mundo real conseguiria fazer.',
      'Sugestão de Correção (Remediation): Dê dicas objetivas de como os desenvolvedores podem corrigir o código.'
    ],
    codeOrTemplate: `### TÍTULO DO RELATÓRIO
[api.target.com] IDOR em /api/v2/invoices/download expõe dados financeiros de terceiros

### RESUMO EXECUTIVO
Identifiquei uma falha de Broken Object Level Authorization (IDOR) no endpoint de download de faturas. Um usuário autenticado pode alterar o parâmetro "invoice_id" e baixar faturas fiscais de qualquer outro cliente da plataforma contendo dados de pagamento e CPF/CNPJ.

### PASSOS PARA REPRODUZIR
1. Acesse o portal com a conta atacante: https://app.target.com
2. Navegue até https://app.target.com/billing e clique em "Baixar Fatura".
3. Intercepte a requisição no Burp Suite:
   GET /api/v2/invoices/download?invoice_id=98765 HTTP/1.1
   Host: api.target.com
   Authorization: Bearer [TOKEN_ATACANTE]
   X-Bug-Bounty: hackerone-meu_usuario
4. Altere o parâmetro "invoice_id" para o ID da vítima (ex: 98764).
5. O servidor responde com HTTP 200 OK contendo os dados fiscais da vítima.

### COMANDO CURL (PROVA DE CONCEITO)
curl -i -s -k -X $'GET' \\
  -H $'Host: api.target.com' \\
  -H $'Authorization: Bearer TOKEN_DO_ATACANTE' \\
  -H $'X-Bug-Bounty: hackerone-meu_usuario' \\
  $'https://api.target.com/api/v2/invoices/download?invoice_id=98764'

### IMPACTO DE NEGÓCIO
Violação grave de privacidade (LGPD / GDPR). Permite que concorrentes ou atores maliciosos extraiam a base de faturamento inteira da empresa.

### SUGESTÃO DE CORREÇÃO
Validar no backend se o "invoice_id" requisitado pertence ao "user_id" extraído da sessão JWT autenticada antes de retornar o arquivo.`
  },
  {
    step: 5,
    title: 'Comunicação com a Triagem, Disputas e Resgate de Bounties',
    category: 'Triagem & Pagamento',
    summary: 'Como se comportar para manter reputação impecável e receber pagamentos sem atrito.',
    details: [
      'O Triager é seu aliado: Trate o analista de segurança com educação e cordialidade. Eles lidam com centenas de spams por dia e adoram pesquisadores objetivos.',
      'Status "Needs More Info": Se pedirem esclarecimentos, responda prontamente com um vídeo curto ou screenshot adicional.',
      'Como lidar com Duplicatas: É frustrante, mas faz parte da vida de todo hacker. Agradeça educadamente e peça para ser informado quando o bug original for resolvido.',
      'Disputas Justas: Se achar que o triager cometeu um equívoco de avaliação técnica, argumente com calma citando a documentação oficial ou o padrão CVSS sem usar termos agressivos.',
      'Resgate de Fundos: Configure seu método de pagamento preferido (Wise ou PayPal para taxas baixas de conversão para Reais).'
    ],
    cautionNotice: 'Nunca ameace a empresa ou o triager nas mensagens. Comportamento tóxico gera banimento definitivo e inclusão na lista negra de todas as plataformas parceiras.'
  }
];
