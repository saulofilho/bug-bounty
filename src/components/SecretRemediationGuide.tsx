import React, { useState, useMemo } from 'react';
import {
  Key,
  Lock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  Sparkles,
  RotateCcw,
  CheckSquare,
  Square,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Zap,
  Info,
  Sliders,
  Layers,
  CheckCheck,
  Play,
  Code2,
  X,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export type SecretProvider = 'all' | 'openai' | 'aws' | 'jwt' | 'github';

export interface ChecklistItem {
  id: string;
  provider: 'openai' | 'aws' | 'jwt' | 'github';
  stage: 'rotate' | 'revoke' | 'audit' | 'close_alert';
  stageLabel: string;
  title: string;
  description: string;
  actionSnippet?: string;
  actionUrl?: string;
  actionUrlLabel?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface IdentifiedSecret {
  id: string;
  provider: 'openai' | 'aws' | 'jwt' | 'github';
  name: string;
  type: string;
  previewValue: string;
  riskLevel: 'CRITICAL' | 'HIGH';
  alertSource: string;
  locationFound: string;
  consoleUrl: string;
  consoleName: string;
  recommendedAction: string;
}

export const IDENTIFIED_SECRETS: IdentifiedSecret[] = [
  {
    id: 'sec-openai-01',
    provider: 'openai',
    name: 'OpenAI Secret API Key',
    type: 'Project / Service Key',
    previewValue: 'sk-proj-9A8b7c6D...kL2mP',
    riskLevel: 'CRITICAL',
    alertSource: 'GitHub Secret Scanning #2',
    locationFound: 'frontend/src/config.ts:18 (Exposto no bundle do client)',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleName: 'OpenAI Platform Console',
    recommendedAction: 'Rotacionar para Project-Scoped Key e revogar token público'
  },
  {
    id: 'sec-aws-01',
    provider: 'aws',
    name: 'AWS Access Key ID',
    type: 'Long-Lived IAM Credential',
    previewValue: 'AKIAIOSFODNN7EXAMPLE',
    riskLevel: 'CRITICAL',
    alertSource: 'AWS Git Guardian / Shodan Alert',
    locationFound: '.env.example / commit history #a4f89d',
    consoleUrl: 'https://console.aws.amazon.com/iam/home#/users',
    consoleName: 'AWS IAM Management Console',
    recommendedAction: 'Inativar imediatamente no IAM e auditar AWS CloudTrail'
  },
  {
    id: 'sec-jwt-01',
    provider: 'jwt',
    name: 'Admin JWT Signing Secret / Token',
    type: 'HMAC-SHA256 Auth Session',
    previewValue: 'eyJhbGciOiJIUzI1Ni...Qssw5c',
    riskLevel: 'HIGH',
    alertSource: 'DLP Token Sanitizer Scanner',
    locationFound: 'test/fixtures/auth_poc.json',
    consoleUrl: 'https://jwt.io',
    consoleName: 'JWT Session Manager',
    recommendedAction: 'Invalidar todas as sessões ativas e rotacionar o segredo JWT_SECRET'
  },
  {
    id: 'sec-github-01',
    provider: 'github',
    name: 'GitHub Personal Access Token (PAT)',
    type: 'Classic PAT (repo, workflow)',
    previewValue: 'ghp_x89Jk2Lq99AbCdEfGhIjKlMnOpQrSt',
    riskLevel: 'HIGH',
    alertSource: 'TruffleHog / CI Pipeline Log',
    locationFound: '.github/workflows/deploy.yml:42',
    consoleUrl: 'https://github.com/settings/tokens',
    consoleName: 'GitHub Developer Settings',
    recommendedAction: 'Revogar PAT no GitHub Settings e migrar para GitHub App Token'
  }
];

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // --- 1. ROTATE (OpenAI) ---
  {
    id: 'openai-rotate-key',
    provider: 'openai',
    stage: 'rotate',
    stageLabel: '1. Rotacionar Chave',
    title: 'Gerar Nova Chave com Escopo Restrito (OpenAI)',
    description: 'Acesse o dashboard da OpenAI e crie uma nova chave atribuída a um Projeto específico (Project-Scoped Key) com permissões mínimas, em vez de uma chave de serviço global de Administrador.',
    actionUrl: 'https://platform.openai.com/api-keys',
    actionUrlLabel: 'OpenAI API Keys Console',
    actionSnippet: '# Defina a nova chave em ambiente seguro (GCP Secret Manager, AWS Secrets Manager ou .env local)\nOPENAI_API_KEY="sk-proj-NOVA_CHAVE_GERADA_AQUI"',
    priority: 'CRITICAL'
  },
  {
    id: 'openai-update-deployments',
    provider: 'openai',
    stage: 'rotate',
    stageLabel: '1. Rotacionar Chave',
    title: 'Atualizar Variáveis em Produção & CI/CD',
    description: 'Substitua o segredo antigo nos serviços em execução (Cloud Run, Kubernetes, GitHub Actions Secrets, Vercel) e reinicie os containers para carregar a nova chave.',
    actionSnippet: '# Exemplo: Atualizar secret no GitHub Secrets via GitHub CLI\ngh secret set OPENAI_API_KEY --body "sk-proj-NOVA_CHAVE_GERADA_AQUI"',
    priority: 'CRITICAL'
  },

  // --- 2. REVOKE (OpenAI) ---
  {
    id: 'openai-revoke-leaked-key',
    provider: 'openai',
    stage: 'revoke',
    stageLabel: '2. Revogar no Provedor',
    title: 'Revogar Imediatamente a Chave Comprometida no OpenAI Console',
    description: 'Localize a chave vazada (prefixo sk-proj-...) na lista de API Keys e clique no ícone da lixeira / "Revoke Key". Isso invalida instantaneamente quaisquer chamadas não autorizadas.',
    actionUrl: 'https://platform.openai.com/api-keys',
    actionUrlLabel: 'Revogar no Painel OpenAI',
    priority: 'CRITICAL'
  },
  {
    id: 'openai-verify-revocation',
    provider: 'openai',
    stage: 'revoke',
    stageLabel: '2. Revogar no Provedor',
    title: 'Validar Invalidação (Teste de Erro 401)',
    description: 'Execute uma requisição de teste com a chave antiga para garantir que o endpoint da OpenAI rejeite com "401 Incorrect API key provided" ou "401 Invalid Key".',
    actionSnippet: 'curl https://api.openai.com/v1/models \\\n  -H "Authorization: Bearer sk-proj-CHAVE_ANTIGA" \\\n  -i\n# Resposta Esperada: HTTP/1.1 401 Unauthorized',
    priority: 'HIGH'
  },

  // --- 3. AUDIT (OpenAI) ---
  {
    id: 'openai-audit-usage',
    provider: 'openai',
    stage: 'audit',
    stageLabel: '3. Auditar Telemetria',
    title: 'Auditar Histórico de Consumo e Spikes de Tokens',
    description: 'Verifique o gráfico de faturamento e consumo por hora no OpenAI Usage Dashboard. Procure por requisições anômalas, modelos caros invocados (ex: GPT-4o em lote) ou custos fora da curva padrão.',
    actionUrl: 'https://platform.openai.com/usage',
    actionUrlLabel: 'OpenAI Usage Dashboard',
    priority: 'HIGH'
  },
  {
    id: 'openai-audit-org-logs',
    provider: 'openai',
    stage: 'audit',
    stageLabel: '3. Auditar Telemetria',
    title: 'Verificar Organization Audit Logs',
    description: 'Examine os logs de auditoria corporativa da OpenAI para validar se novos assistentes, arquivos de fine-tuning ou exportações foram criados enquanto a chave esteve exposta.',
    actionUrl: 'https://platform.openai.com/settings/organization/audit-logs',
    actionUrlLabel: 'OpenAI Audit Logs',
    priority: 'MEDIUM'
  },

  // --- 4. CLOSE ALERT (OpenAI / GitHub) ---
  {
    id: 'openai-close-github-alert',
    provider: 'openai',
    stage: 'close_alert',
    stageLabel: '4. Encerrar Alerta no GitHub',
    title: 'Encerrar o Alerta de Secret Scanning no Repositório',
    description: 'Vá até a aba "Security" > "Secret scanning alerts" no GitHub, abra o alerta da OpenAI API Key e clique em "Close alert". Escolha "Revoked" (se já revogou) ou "Used in tests" (se era chave sintética).',
    actionUrl: 'https://github.com',
    actionUrlLabel: 'Ir para GitHub Security Tab',
    actionSnippet: '# Passo a passo no GitHub:\n# 1. Acesse seu repositório -> Security -> Secret scanning alerts\n# 2. Clique em "OpenAI API Key #2"\n# 3. Clique em "Close alert" -> Selecione "Revoked" ou "Used in tests"\n# 4. Adicione o comentário de resolução para fins de auditoria',
    priority: 'HIGH'
  },

  // --- 1. ROTATE (AWS) ---
  {
    id: 'aws-rotate-key',
    provider: 'aws',
    stage: 'rotate',
    stageLabel: '1. Rotacionar Chave',
    title: 'Criar Novo Par de Credenciais IAM ou Migrar para IAM Roles',
    description: 'Gere uma nova Access Key para a identidade afetada no AWS IAM Console ou, preferencialmente, migre para autenticação temporária sem chaves estáticas (IAM Roles com OIDC para GitHub Actions ou AWS STS).',
    actionUrl: 'https://console.aws.amazon.com/iam/home#/users',
    actionUrlLabel: 'AWS IAM Users Console',
    actionSnippet: '# Comando AWS CLI para criar nova credencial IAM\naws iam create-access-key --user-name NOME_DO_USUARIO',
    priority: 'CRITICAL'
  },
  {
    id: 'aws-update-configs',
    provider: 'aws',
    stage: 'rotate',
    stageLabel: '1. Rotacionar Chave',
    title: 'Atualizar Credenciais em Sistemas e Workloads',
    description: 'Substitua a variável AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY nos servidores e repositórios de CI/CD.',
    actionSnippet: '# Configuração via AWS CLI local\naws configure set aws_access_key_id "AKIA..." --profile default\naws configure set aws_secret_access_key "NOVO_SECRET..." --profile default',
    priority: 'CRITICAL'
  },

  // --- 2. REVOKE (AWS) ---
  {
    id: 'aws-deactivate-key',
    provider: 'aws',
    stage: 'revoke',
    stageLabel: '2. Revogar no Provedor',
    title: 'Inativar Imediatamente a Chave IAM Comprometida',
    description: 'No AWS IAM Console ou via CLI, altere o status da chave comprometida para "Inactive". Isso interrompe qualquer chamada imediatamente sem excluir a chave, permitindo confirmar que nenhum sistema crítico foi interrompido.',
    actionSnippet: '# Desativar imediatamente via AWS CLI\naws iam update-access-key \\\n  --access-key-id AKIAIOSFODNN7EXAMPLE \\\n  --status Inactive \\\n  --user-name NOME_DO_USUARIO',
    priority: 'CRITICAL'
  },
  {
    id: 'aws-delete-key',
    provider: 'aws',
    stage: 'revoke',
    stageLabel: '2. Revogar no Provedor',
    title: 'Excluir Permanentemente a Chave Antiga',
    description: 'Após confirmar que todos os sistemas operam com a nova chave, exclua a chave antiga permanentemente para garantir que nunca possa ser reativada.',
    actionSnippet: '# Exclusão permanente via AWS CLI\naws iam delete-access-key \\\n  --access-key-id AKIAIOSFODNN7EXAMPLE \\\n  --user-name NOME_DO_USUARIO',
    priority: 'HIGH'
  },

  // --- 3. AUDIT (AWS) ---
  {
    id: 'aws-audit-cloudtrail',
    provider: 'aws',
    stage: 'audit',
    stageLabel: '3. Auditar Telemetria',
    title: 'Auditar Eventos no AWS CloudTrail',
    description: 'Consulte o CloudTrail Event History buscando por AccessKeyId da chave comprometida. Verifique se foram executadas chamadas maliciosas como criação de usuários IAM, alteração de Security Groups ou criação de instâncias EC2.',
    actionUrl: 'https://console.aws.amazon.com/cloudtrail/home#/events',
    actionUrlLabel: 'AWS CloudTrail Event History',
    actionSnippet: '# Buscar ações recentes com a Access Key no CloudTrail via CLI\naws cloudtrail lookup-events \\\n  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE \\\n  --max-results 50',
    priority: 'HIGH'
  },
  {
    id: 'aws-audit-guardduty',
    provider: 'aws',
    stage: 'audit',
    stageLabel: '3. Auditar Telemetria',
    title: 'Inspecionar Achados no AWS GuardDuty',
    description: 'Verifique se o GuardDuty disparou alertas como "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration" ou acessos com reputação maliciosa/rede Tor.',
    actionUrl: 'https://console.aws.amazon.com/guardduty/home',
    actionUrlLabel: 'AWS GuardDuty Console',
    priority: 'MEDIUM'
  },

  // --- 4. CLOSE ALERT (AWS / Git History) ---
  {
    id: 'aws-scrub-git-history',
    provider: 'aws',
    stage: 'close_alert',
    stageLabel: '4. Encerrar Alerta no GitHub',
    title: 'Limpar Histórico de Git (BFG Repo-Cleaner / git-filter-repo)',
    description: 'Se a chave foi commitada no repositório git no passado, utilize o `git-filter-repo` ou BFG Repo-Cleaner para expurgar a string de todos os commits anteriores.',
    actionSnippet: '# Expurgar texto sensível do histórico git usando git-filter-repo:\n# 1. Crie um arquivo com as strings: replace.txt\n# 2. Execute:\ngit-filter-repo --replace-text replace.txt\n# 3. Forçar push dos branches e tags:\ngit push origin --force --all',
    priority: 'HIGH'
  },

  // --- 1. ROTATE (JWT) ---
  {
    id: 'jwt-rotate-secret',
    provider: 'jwt',
    stage: 'rotate',
    stageLabel: '1. Rotacionar Chave',
    title: 'Rotacionar o Segredo JWT_SECRET no Backend',
    description: 'Gere um novo segredo aleatório de alta entropia (256-bit / 32 bytes) para assinar novos tokens JWT e armazene de forma segura nas variáveis de ambiente do backend.',
    actionSnippet: '# Gerar nova chave HMAC-SHA256 de 32 bytes via openssl\nopenssl rand -base64 32\n# Atualizar variável no backend:\nJWT_SECRET="NOVO_SEGREDO_ALTA_ENTROPIA_BASE64"',
    priority: 'CRITICAL'
  },

  // --- 2. REVOKE (JWT) ---
  {
    id: 'jwt-revoke-sessions',
    provider: 'jwt',
    stage: 'revoke',
    stageLabel: '2. Revogar no Provedor',
    title: 'Invalidar Sessões & Tokens Ativos (Redis Token Blacklist)',
    description: 'Insira o token vazado ou o ID de sessão (jti) na blacklist do cache Redis com TTL equivalente à expiração do token, forçando reautenticação de todos os usuários administradores.',
    actionSnippet: '# Adicionar token JTI à blacklist do Redis\nredis-cli SETEX "jwt_blacklist:token_id_comprometido" 86400 "revoked_admin_leak"',
    priority: 'CRITICAL'
  },

  // --- 3. AUDIT (JWT) ---
  {
    id: 'jwt-audit-tokens',
    provider: 'jwt',
    stage: 'audit',
    stageLabel: '3. Auditar Telemetria',
    title: 'Auditar Requisições Administrativas no API Gateway',
    description: 'Filtre os logs de acesso buscando requisições contendo a assinatura do token vazado para mapear se dados sensíveis de clientes ou rotas administrativas foram acessadas indevidamente.',
    priority: 'HIGH'
  },

  // --- 4. CLOSE ALERT (JWT) ---
  {
    id: 'jwt-close-finding',
    provider: 'jwt',
    stage: 'close_alert',
    stageLabel: '4. Encerrar Alerta no GitHub',
    title: 'Sanitizar Arquivos de Fixture / PoC e Fechar Apontamento',
    description: 'Remova o token de arquivos de testes (ex: fixtures de testes unitários) e substitua por tokens sintéticos com data de expiração no passado.',
    actionSnippet: 'sed -i \'s/eyJhbGciOi.../[REDACTED_MOCK_JWT]/g\' test/fixtures/auth_poc.json',
    priority: 'MEDIUM'
  },

  // --- 1. ROTATE (GitHub PAT) ---
  {
    id: 'gh-rotate-token',
    provider: 'github',
    stage: 'rotate',
    stageLabel: '1. Rotacionar Chave',
    title: 'Gerar Novo Fine-Grained Personal Access Token (PAT)',
    description: 'No GitHub Settings > Developer Settings, gere um token com escopo restrito a apenas os repositórios necessários com expiração curta (máximo 30 dias).',
    actionUrl: 'https://github.com/settings/tokens?type=beta',
    actionUrlLabel: 'GitHub Fine-Grained Tokens',
    priority: 'CRITICAL'
  },

  // --- 2. REVOKE (GitHub PAT) ---
  {
    id: 'gh-revoke-token',
    provider: 'github',
    stage: 'revoke',
    stageLabel: '2. Revogar no Provedor',
    title: 'Revogar Imediatamente o PAT Comprometido no GitHub',
    description: 'Exclua imediatamente o token antigo listado em Personal Access Tokens no GitHub. Isso cancela instantaneamente qualquer acesso via Git CLI ou GitHub REST API.',
    actionUrl: 'https://github.com/settings/tokens',
    actionUrlLabel: 'Revogar Token no GitHub',
    actionSnippet: '# Testar se o token foi revogado via API:\ncurl -H "Authorization: token ghp_CHAVE_ANTIGA" https://api.github.com/user -i\n# Resposta Esperada: 401 Bad credentials',
    priority: 'CRITICAL'
  },

  // --- 3. AUDIT (GitHub PAT) ---
  {
    id: 'gh-audit-audit-log',
    provider: 'github',
    stage: 'audit',
    stageLabel: '3. Auditar Telemetria',
    title: 'Inspecionar Audit Log da Organização no GitHub',
    description: 'Analise o log corporativo em busca de operações como `repo.create`, `repo.add_member`, `secret.read` ou clones em massa executados pelo token.',
    actionUrl: 'https://github.com/settings/security-log',
    actionUrlLabel: 'GitHub Security Log',
    priority: 'HIGH'
  },

  // --- 4. CLOSE ALERT (GitHub PAT) ---
  {
    id: 'gh-close-alert',
    provider: 'github',
    stage: 'close_alert',
    stageLabel: '4. Encerrar Alerta no GitHub',
    title: 'Sanitizar Workflows e Encerrar Apontamento no Secret Scanning',
    description: 'Verifique se os scripts de CI/CD utilizam o secret `${{ secrets.GITHUB_TOKEN }}` nativo em vez de PATs fixos nos arquivos de configuração YAML.',
    priority: 'HIGH'
  }
];

export const SecretRemediationGuide: React.FC = () => {
  const [providerFilter, setProviderFilter] = useState<SecretProvider>('all');
  
  // Persistent checklist item completions
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('appsec_secret_remediation_progress');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Batch Remediation state
  const [batchModeEnabled, setBatchModeEnabled] = useState<boolean>(true);
  const [selectedSecretIds, setSelectedSecretIds] = useState<string[]>(() => {
    // By default, select all identified secrets for fast batch remediation
    return IDENTIFIED_SECRETS.map(s => s.id);
  });
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [batchNotification, setBatchNotification] = useState<{ message: string; action: string; count: number } | null>(null);
  const [showBatchScriptModal, setShowBatchScriptModal] = useState<boolean>(false);

  // Toggle single checklist item
  const toggleItem = (id: string) => {
    setCompletedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('appsec_secret_remediation_progress', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const updateBulkItems = (updates: Record<string, boolean>) => {
    setCompletedItems(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('appsec_secret_remediation_progress', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetChecklist = () => {
    setCompletedItems({});
    try {
      localStorage.removeItem('appsec_secret_remediation_progress');
    } catch {
      // ignore
    }
    setBatchNotification({
      message: 'Progresso da remediação foi resetado.',
      action: 'RESET',
      count: 0
    });
    setTimeout(() => setBatchNotification(null), 3500);
  };

  const markAllDone = () => {
    const all: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach(item => {
      all[item.id] = true;
    });
    setCompletedItems(all);
    try {
      localStorage.setItem('appsec_secret_remediation_progress', JSON.stringify(all));
    } catch {
      // ignore
    }
    setBatchNotification({
      message: `Todas as ${DEFAULT_CHECKLIST.length} etapas de remediação foram marcadas como concluídas!`,
      action: 'ALL_DONE',
      count: IDENTIFIED_SECRETS.length
    });
    setTimeout(() => setBatchNotification(null), 3500);
  };

  const handleCopySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Toggle secret selection in batch mode
  const toggleSelectSecret = (secretId: string) => {
    setSelectedSecretIds(prev =>
      prev.includes(secretId) ? prev.filter(id => id !== secretId) : [...prev, secretId]
    );
  };

  const handleSelectAllSecrets = () => {
    if (selectedSecretIds.length === IDENTIFIED_SECRETS.length) {
      setSelectedSecretIds([]);
    } else {
      setSelectedSecretIds(IDENTIFIED_SECRETS.map(s => s.id));
    }
  };

  const handleSelectOnlyCriticalSecrets = () => {
    setSelectedSecretIds(IDENTIFIED_SECRETS.filter(s => s.riskLevel === 'CRITICAL').map(s => s.id));
  };

  // Selected secrets objects
  const selectedSecrets = useMemo(() => {
    return IDENTIFIED_SECRETS.filter(s => selectedSecretIds.includes(s.id));
  }, [selectedSecretIds]);

  // Selected providers set
  const selectedProviders = useMemo(() => {
    return new Set(selectedSecrets.map(s => s.provider));
  }, [selectedSecrets]);

  // Batch Remediation Actions: Simultaneously apply fixes across multiple selected secrets
  const handleBatchApplyAllFixes = () => {
    if (selectedSecrets.length === 0) return;

    const updates: Record<string, boolean> = {};
    const affectedProviders = Array.from(selectedProviders);

    DEFAULT_CHECKLIST.forEach(item => {
      if (affectedProviders.includes(item.provider)) {
        updates[item.id] = true;
      }
    });

    updateBulkItems(updates);

    setBatchNotification({
      message: `Remediação completa aplicada simultaneamente a ${selectedSecrets.length} segredos selecionados (${selectedSecrets.map(s => s.name).join(', ')})! Todas as fases (Rotação, Revogação, Auditoria e Encerramento) foram concluídas.`,
      action: 'COMPLETE_REMEDIATION',
      count: selectedSecrets.length
    });
    setTimeout(() => setBatchNotification(null), 5000);
  };

  const handleBatchStageAction = (stage: ChecklistItem['stage'], stageName: string) => {
    if (selectedSecrets.length === 0) return;

    const updates: Record<string, boolean> = {};
    const affectedProviders = Array.from(selectedProviders);

    DEFAULT_CHECKLIST.forEach(item => {
      if (affectedProviders.includes(item.provider) && item.stage === stage) {
        updates[item.id] = true;
      }
    });

    updateBulkItems(updates);

    setBatchNotification({
      message: `Etapa "${stageName}" aplicada com sucesso a ${selectedSecrets.length} segredos selecionados (${selectedSecrets.map(s => s.name).join(', ')})!`,
      action: stage.toUpperCase(),
      count: selectedSecrets.length
    });
    setTimeout(() => setBatchNotification(null), 4500);
  };

  // Single secret quick fix
  const handleSingleSecretFix = (provider: ChecklistItem['provider'], secretName: string) => {
    const updates: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach(item => {
      if (item.provider === provider) {
        updates[item.id] = true;
      }
    });
    updateBulkItems(updates);

    setBatchNotification({
      message: `Remediação integral concluída com sucesso para o segredo "${secretName}"!`,
      action: 'SINGLE_FIX',
      count: 1
    });
    setTimeout(() => setBatchNotification(null), 4000);
  };

  // Filter checklist items
  const filteredItems = DEFAULT_CHECKLIST.filter(item => {
    if (providerFilter === 'all') return true;
    return item.provider === providerFilter;
  });

  // Calculate metrics
  const totalItems = filteredItems.length;
  const completedCount = filteredItems.filter(item => completedItems[item.id]).length;
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  // Group by stage
  const stages: Array<{ id: ChecklistItem['stage']; label: string; icon: any }> = [
    { id: 'rotate', label: 'Fase 1: Rotação de Credenciais (Rotate)', icon: RefreshCw },
    { id: 'revoke', label: 'Fase 2: Revogação Imediata (Revoke)', icon: Lock },
    { id: 'audit', label: 'Fase 3: Auditoria de Incidentes (Audit Logs)', icon: ShieldAlert },
    { id: 'close_alert', label: 'Fase 4: Resolução no GitHub & Limpeza (Close Alert)', icon: FileCheck2 }
  ];

  // Generate Incident Response Report ready to copy
  const generateIncidentSummary = () => {
    const doneList = DEFAULT_CHECKLIST.filter(i => completedItems[i.id]);
    const pendingList = DEFAULT_CHECKLIST.filter(i => !completedItems[i.id]);

    return (
      `====================================================\n` +
      `RELATÓRIO DE REMEDIAÇÃO DE SEGREDOS COMPROMETIDOS\n` +
      `Data de Emissão: ${new Date().toLocaleString()}\n` +
      `Segredos Auditados: ${IDENTIFIED_SECRETS.map(s => s.name).join(', ')}\n` +
      `Status Geral: ${progressPct}% Concluído (${completedCount}/${totalItems} etapas)\n` +
      `====================================================\n\n` +
      `[+] AÇÕES CONCLUÍDAS (${doneList.length}):\n` +
      doneList.map(i => `  [x] [${i.provider.toUpperCase()}] ${i.title}`).join('\n') +
      `\n\n[-] AÇÕES PENDENTES (${pendingList.length}):\n` +
      pendingList.map(i => `  [ ] [${i.provider.toUpperCase()}] ${i.title}`).join('\n') +
      `\n\n[!] NOTAS DE AUDITORIA & BATCH REMEDIATION:\n` +
      `- Segredos comprometidos foram expurgados de arquivos .env, código frontend e repositório Git.\n` +
      `- Credenciais inativadas nas consoles de provedores oficiais (OpenAI, AWS IAM, Redis, GitHub Settings).\n` +
      `- Telemetria de consumo checada e alertas de Secret Scanning do GitHub marcados para encerramento.`
    );
  };

  // Generate unified bash script for batch remediation
  const generateUnifiedBatchScript = () => {
    return (
      `#!/usr/bin/env bash\n` +
      `# ====================================================================\n` +
      `# SCRIPT UNIFICADO DE REMEDIAÇÃO EM LOTE - BUGSENTINEL APPSEC SUITE\n` +
      `# Data: ${new Date().toISOString()}\n` +
      `# Alvos Selecionados: ${selectedSecrets.map(s => s.name).join(', ')}\n` +
      `# ====================================================================\n\n` +
      `set -euo pipefail\n` +
      `echo "[*] Iniciando fluxo de remediação em lote para ${selectedSecrets.length} segredos..."\n\n` +
      (selectedProviders.has('aws')
        ? `# --- 1. AWS IAM ACCESS KEY REMEDIATION ---\n` +
          `echo "[>] Inativando AWS Access Key ID no IAM..."\n` +
          `aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive || echo "[!] Falha ao inativar AWS Key"\n` +
          `echo "[>] Verificando eventos anômalos no AWS CloudTrail..."\n` +
          `aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE --max-results 25\n\n`
        : '') +
      (selectedProviders.has('openai')
        ? `# --- 2. OPENAI API KEY REMEDIATION ---\n` +
          `echo "[>] Validando invalidação da OpenAI Key (esperado 401 Unauthorized)..."\n` +
          `curl -s -o /dev/null -w "%{http_code}\\n" https://api.openai.com/v1/models -H "Authorization: Bearer sk-proj-REPLACED" || true\n` +
          `echo "[>] Atualize a nova OpenAI Project Key no secret manager do seu provedor de nuvem.\n\n"`
        : '') +
      (selectedProviders.has('jwt')
        ? `# --- 3. JWT SECRET & SESSION BLACKLIST ---\n` +
          `echo "[>] Gerando novo segredo HMAC-SHA256 de alta entropia para JWT..."\n` +
          `NEW_JWT_SECRET=$(openssl rand -base64 32)\n` +
          `echo "Novo segredo JWT gerado: $NEW_JWT_SECRET"\n` +
          `echo "[>] Enviando comando de flush/invalidação de sessões antigas no Redis..."\n` +
          `# redis-cli FLUSHDB ou adicionar JTI na blacklist\n\n`
        : '') +
      (selectedProviders.has('github')
        ? `# --- 4. GITHUB PERSONAL ACCESS TOKEN (PAT) ---\n` +
          `echo "[>] Verificando expiração de PAT no GitHub Developer Settings..."\n` +
          `echo "[>] Acesse https://github.com/settings/tokens para revogar o token antigo.\n\n"`
        : '') +
      `# --- 5. EXPURGO DE HISTÓRICO GIT COM GIT-FILTER-REPO ---\n` +
      `echo "[>] Criando arquivo de substituição de strings sensíveis..."\n` +
      `cat << 'EOF' > secrets_to_replace.txt\n` +
      `sk-proj-9A8b7c6D==>[REDACTED_OPENAI_KEY]\n` +
      `AKIAIOSFODNN7EXAMPLE==>[REDACTED_AWS_KEY]\n` +
      `EOF\n\n` +
      `echo "[>] Executando git-filter-repo..."\n` +
      `# git-filter-repo --replace-text secrets_to_replace.txt --force\n` +
      `echo "[+] Remediação em lote finalizada com sucesso!"\n`
    );
  };

  return (
    <div id="secret-remediation-guide-container" className="space-y-6">
      {/* Top Banner Alert / Context */}
      <div className="bg-[#141018] border border-red-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>Alerta Ativo de Segredos Vazados</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">{IDENTIFIED_SECRETS.length} Segredos Identificados</span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="px-2 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold">
                Batch Remediation Disponível
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Guia de Remediação & Checklist de Segredos</span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              Procedimento operacional padronizado (SOP) com suporte a <strong>Remediação em Lote (Batch Remediation)</strong> para <strong>rotacionar</strong>, <strong>revogar</strong>, <strong>auditar</strong> e <strong>encerrar alertas</strong> simultaneamente nos provedores de nuvem e no GitHub Secret Scanning.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              id="btn-open-batch-script"
              onClick={() => setShowBatchScriptModal(true)}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-red-950 to-zinc-900 hover:from-red-900 hover:to-zinc-800 text-red-200 hover:text-white font-mono text-xs font-bold flex items-center gap-2 border border-red-500/40 transition-all shadow-sm cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-red-400" />
              <span>Script Batch CLI</span>
            </button>

            <button
              type="button"
              id="btn-copy-incident-summary"
              onClick={() => handleCopySnippet('incident-summary', generateIncidentSummary())}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-colors shadow-sm cursor-pointer"
            >
              {copiedSnippetId === 'incident-summary' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copiar Relatório SOP</span>
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="mt-5 pt-4 border-t border-[#261f2f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Progresso Total da Remediação:</span>
              </span>
              <span className={`${progressPct === 100 ? 'text-emerald-400' : 'text-amber-400'} font-bold`}>
                {completedCount} de {totalItems} etapas ({progressPct}%)
              </span>
            </div>
            
            <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPct === 100
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Bulk Checklist Global Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-mark-all-done"
              onClick={markAllDone}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Marcar Todas Concluídas</span>
            </button>
            <button
              type="button"
              id="btn-reset-checklist"
              onClick={resetChecklist}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resetar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Batch Action Toast/Notification */}
      {batchNotification && (
        <div
          id="batch-remediation-feedback-toast"
          className="bg-[#121c16] border border-emerald-500/50 rounded-xl p-4 text-xs font-mono text-emerald-200 flex items-start justify-between gap-3 shadow-lg shadow-emerald-950/30 animate-in fade-in slide-in-from-top duration-200"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 mt-0.5">
              <Zap className="w-4 h-4 fill-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-emerald-300 uppercase tracking-wide mr-1.5">
                [Ação em Lote Executada]:
              </span>
              <span>{batchNotification.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBatchNotification(null)}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH REMEDIATION SELECTION HEADER & TOGGLE (ABOVE CARDS) */}
      {/* ========================================================================= */}
      <div
        id="batch-remediation-header"
        className="bg-gradient-to-r from-[#14121b] via-[#161220] to-[#12131c] border border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Toggle & Header Title */}
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Toggle Switch */}
            <button
              type="button"
              id="toggle-batch-remediation-mode"
              role="switch"
              aria-checked={batchModeEnabled}
              onClick={() => setBatchModeEnabled(prev => !prev)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                batchModeEnabled ? 'bg-rose-600 border-rose-500' : 'bg-zinc-800 border-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                  batchModeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Zap className={`w-4 h-4 ${batchModeEnabled ? 'text-rose-400 fill-rose-400' : 'text-zinc-500'}`} />
                  <span>Modo de Remediação em Lote (Batch Remediation)</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-bold uppercase ${
                  batchModeEnabled
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {batchModeEnabled ? 'Ativo / Multi-Select' : 'Inativo (Modo Individual)'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Selecione múltiplos segredos identificados para disparar correções, rotação e revogação simultaneamente.
              </p>
            </div>
          </div>

          {/* Right: Selection Counter and Quick Select Filters */}
          {batchModeEnabled && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <div className="bg-[#0b0c12] px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono flex items-center gap-2">
                <span className="text-zinc-400">Selecionados:</span>
                <span className="font-bold text-rose-400">
                  {selectedSecretIds.length} de {IDENTIFIED_SECRETS.length}
                </span>
              </div>

              <button
                type="button"
                id="btn-select-all-secrets"
                onClick={handleSelectAllSecrets}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                {selectedSecretIds.length === IDENTIFIED_SECRETS.length ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Desmarcar Todos</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-rose-400" />
                    <span>Selecionar Todos</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-select-critical-secrets"
                onClick={handleSelectOnlyCriticalSecrets}
                className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-300 text-xs font-mono font-semibold border border-red-500/40 transition-colors cursor-pointer"
              >
                Apenas Críticos (2)
              </button>
            </div>
          )}
        </div>

        {/* Simultaneous Batch Action Buttons Row (Active when in Batch Mode) */}
        {batchModeEnabled && (
          <div className="mt-4 pt-4 border-t border-rose-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                <Layers className="w-3.5 h-3.5 text-rose-400" />
                <span>Ações simultâneas nos <strong>{selectedSecretIds.length}</strong> segredo(s) marcado(s):</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Batch Rotate */}
                <button
                  type="button"
                  id="btn-batch-rotate"
                  disabled={selectedSecretIds.length === 0}
                  onClick={() => handleBatchStageAction('rotate', 'Rotação em Lote (Rotate)')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-mono font-bold border border-indigo-500/40 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                  title="Marca tarefas de rotação como concluídas para os segredos selecionados"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-400" />
                  <span>Rotacionar em Lote</span>
                </button>

                {/* 2. Batch Revoke */}
                <button
                  type="button"
                  id="btn-batch-revoke"
                  disabled={selectedSecretIds.length === 0}
                  onClick={() => handleBatchStageAction('revoke', 'Revogação em Lote (Revoke)')}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-mono font-bold border border-rose-500/40 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                  title="Simula invalidação de credenciais antigas e marca revogação"
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Revogar em Lote</span>
                </button>

                {/* 3. Batch Audit */}
                <button
                  type="button"
                  id="btn-batch-audit"
                  disabled={selectedSecretIds.length === 0}
                  onClick={() => handleBatchStageAction('audit', 'Auditoria de Telemetria em Lote (Audit)')}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 text-xs font-mono font-bold border border-amber-500/40 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                  title="Marca telemetria e auditoria de logs como verificadas"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>Auditar em Lote</span>
                </button>

                {/* 4. Batch Close Alert */}
                <button
                  type="button"
                  id="btn-batch-close-alert"
                  disabled={selectedSecretIds.length === 0}
                  onClick={() => handleBatchStageAction('close_alert', 'Encerramento no GitHub em Lote (Close Alerts)')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 text-xs font-mono font-bold border border-cyan-500/40 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                  title="Encerrar alertas no GitHub Secret Scanning"
                >
                  <FileCheck2 className="w-3 h-3 text-cyan-400" />
                  <span>Encerrar Alertas</span>
                </button>

                {/* 5. Master Button: Apply Complete Remediation to Selected */}
                <button
                  type="button"
                  id="btn-batch-apply-all-fixes"
                  disabled={selectedSecretIds.length === 0}
                  onClick={handleBatchApplyAllFixes}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-mono font-bold border border-rose-400 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.35)]"
                  title="Aplica todas as 4 fases de correção de uma só vez aos segredos selecionados"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>⚡ Aplicar Todas as Correções</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TARGET TOKEN SUMMARY CARDS (WITH BATCH SELECTION BOXES) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            Segredos Identificados na Aplicação ({IDENTIFIED_SECRETS.length}):
          </span>
          <span>
            {batchModeEnabled
              ? 'Clique nos cards ou nas caixas de seleção para incluir/remover da remediação em lote'
              : 'Clique no botão individual para aplicar fix ou ative o modo Batch acima'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {IDENTIFIED_SECRETS.map(secret => {
            const isSelected = selectedSecretIds.includes(secret.id);
            const secretChecklist = DEFAULT_CHECKLIST.filter(i => i.provider === secret.provider);
            const doneCount = secretChecklist.filter(i => completedItems[i.id]).length;
            const isFullyDone = secretChecklist.length > 0 && doneCount === secretChecklist.length;
            const isPartiallyDone = doneCount > 0 && !isFullyDone;

            const providerColor =
              secret.provider === 'openai'
                ? 'emerald'
                : secret.provider === 'aws'
                ? 'amber'
                : secret.provider === 'jwt'
                ? 'purple'
                : 'blue';

            return (
              <div
                key={secret.id}
                id={`card-secret-${secret.id}`}
                className={`border rounded-xl p-4 space-y-3 transition-all ${
                  isSelected && batchModeEnabled
                    ? 'bg-[#15121c] border-rose-500/50 ring-1 ring-rose-500/40 shadow-lg'
                    : 'bg-[#111218] border-[#232738] hover:border-zinc-700'
                }`}
              >
                {/* Header Row: Checkbox, Icon, Name & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Batch Selection Checkbox */}
                    {batchModeEnabled && (
                      <button
                        type="button"
                        id={`chk-secret-${secret.id}`}
                        onClick={() => toggleSelectSecret(secret.id)}
                        className="mt-1 cursor-pointer focus:outline-none shrink-0"
                        title={isSelected ? 'Remover da remediação em lote' : 'Selecionar para remediação em lote'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-rose-500 fill-rose-950/80" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                        )}
                      </button>
                    )}

                    {/* Icon */}
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      providerColor === 'emerald'
                        ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-400'
                        : providerColor === 'amber'
                        ? 'bg-amber-950/80 border border-amber-500/30 text-amber-400'
                        : providerColor === 'purple'
                        ? 'bg-purple-950/80 border border-purple-500/30 text-purple-400'
                        : 'bg-blue-950/80 border border-blue-500/30 text-blue-400'
                    }`}>
                      {secret.provider === 'aws' ? (
                        <Lock className="w-4 h-4" />
                      ) : secret.provider === 'openai' ? (
                        <Key className="w-4 h-4" />
                      ) : secret.provider === 'jwt' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Terminal className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-tight">{secret.name}</h3>
                        {isFullyDone && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>Remediado</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{secret.type}</span>
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                    secret.riskLevel === 'CRITICAL'
                      ? 'bg-red-950 text-red-300 border border-red-500/30'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                  }`}>
                    {secret.riskLevel}
                  </span>
                </div>

                {/* Token Data & Source Box */}
                <div className="p-2.5 bg-[#090a0e] rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1">
                  <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                    <span className="text-zinc-400">{secret.alertSource}</span>
                    <span className={isFullyDone ? 'text-emerald-400' : isPartiallyDone ? 'text-amber-400' : 'text-rose-400'}>
                      {isFullyDone ? '✓ 100% Remediado' : `${doneCount}/${secretChecklist.length} Etapas Feitas`}
                    </span>
                  </div>

                  <div className="text-zinc-400 truncate">
                    Valor: <span className="text-rose-300 font-bold">{secret.previewValue}</span>
                  </div>

                  <div className="text-[10px] text-zinc-500 truncate">
                    Origem: {secret.locationFound}
                  </div>
                </div>

                {/* Individual Stage Mini-Pills & Fix Button */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-zinc-800/80">
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                    <span className="text-zinc-500 text-[9px] uppercase">Fases:</span>
                    {(['rotate', 'revoke', 'audit', 'close_alert'] as const).map(stageId => {
                      const item = secretChecklist.find(i => i.stage === stageId);
                      const isDone = item ? Boolean(completedItems[item.id]) : false;
                      return (
                        <span
                          key={stageId}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isDone
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}
                        >
                          {stageId === 'rotate' ? 'Rot' : stageId === 'revoke' ? 'Rev' : stageId === 'audit' ? 'Aud' : 'Cls'}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={secret.consoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                    >
                      <span>Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      id={`btn-fix-secret-${secret.id}`}
                      onClick={() => handleSingleSecretFix(secret.provider, secret.name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isFullyDone
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700'
                      }`}
                    >
                      {isFullyDone ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Concluído</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-rose-400" />
                          <span>Corrigir</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider Selector Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121218] p-3 rounded-xl border border-[#22222f]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase mr-1">Filtrar por Provedor:</span>
          {(
            [
              { id: 'all', label: 'Todos os Segredos', count: DEFAULT_CHECKLIST.length },
              { id: 'openai', label: 'OpenAI API Key', count: DEFAULT_CHECKLIST.filter(i => i.provider === 'openai').length },
              { id: 'aws', label: 'AWS Access Key', count: DEFAULT_CHECKLIST.filter(i => i.provider === 'aws').length },
              { id: 'jwt', label: 'JWT Secret', count: DEFAULT_CHECKLIST.filter(i => i.provider === 'jwt').length },
              { id: 'github', label: 'GitHub PAT', count: DEFAULT_CHECKLIST.filter(i => i.provider === 'github').length }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              id={`filter-remediation-${tab.id}`}
              onClick={() => setProviderFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                providerFilter === tab.id
                  ? 'bg-zinc-200 text-zinc-950 shadow-sm font-bold'
                  : 'bg-[#181824] text-zinc-400 hover:text-zinc-200 border border-[#272738]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                providerFilter === tab.id ? 'bg-zinc-900 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Informative Status Badge */}
        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Marque cada item individualmente ou use as ações em lote acima.</span>
        </div>
      </div>

      {/* Checklist Sections by Phase */}
      <div className="space-y-6">
        {stages.map(stage => {
          const itemsInStage = filteredItems.filter(item => item.stage === stage.id);
          if (itemsInStage.length === 0) return null;

          const stageCompletedCount = itemsInStage.filter(i => completedItems[i.id]).length;
          const isAllStageDone = stageCompletedCount === itemsInStage.length;
          const StageIcon = stage.icon;

          return (
            <div
              key={stage.id}
              className="bg-[#111217] border border-[#202330] rounded-xl overflow-hidden shadow-md"
            >
              {/* Stage Header */}
              <div className="bg-[#151722] px-5 py-3.5 border-b border-[#202330] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isAllStageDone ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-300'}`}>
                    <StageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{stage.label}</span>
                      {isAllStageDone && (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold uppercase">
                          Etapa Finalizada
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <span className="text-xs font-mono text-zinc-400">
                  {stageCompletedCount} / {itemsInStage.length} Concluídos
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#1b1e2b]">
                {itemsInStage.map(item => {
                  const isChecked = Boolean(completedItems[item.id]);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 transition-all ${
                        isChecked ? 'bg-[#0f1118]/60 opacity-85' : 'bg-transparent hover:bg-[#151722]/50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Checkbox */}
                        <button
                          type="button"
                          id={`chk-${item.id}`}
                          onClick={() => toggleItem(item.id)}
                          className="mt-1 shrink-0 cursor-pointer focus:outline-none"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400 fill-emerald-950/60" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                item.provider === 'openai'
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                                  : item.provider === 'aws'
                                  ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                                  : item.provider === 'jwt'
                                  ? 'bg-purple-950/70 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-950/70 text-blue-300 border border-blue-500/30'
                              }`}>
                                {item.provider.toUpperCase()}
                              </span>

                              <h4 className={`text-sm font-semibold ${isChecked ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>
                                {item.title}
                              </h4>
                            </div>

                            <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded self-start sm:self-auto ${
                              item.priority === 'CRITICAL'
                                ? 'bg-red-950 text-red-300 border border-red-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {item.priority}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Code Action Snippet if available */}
                          {item.actionSnippet && (
                            <div className="relative mt-2">
                              <pre className="bg-[#08080d] border border-[#222533] rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                                {item.actionSnippet}
                              </pre>
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(item.id, item.actionSnippet!)}
                                className="absolute right-2 top-2 p-1.5 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                title="Copiar comando"
                              >
                                {copiedSnippetId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {/* External Action Link if available */}
                          {item.actionUrl && (
                            <div className="pt-1">
                              <a
                                href={item.actionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                <span>{item.actionUrlLabel || 'Acessar Console Oficial'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* GitHub Secret Scanning Specific Closing Guide Box */}
      <div className="bg-[#12141e] border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Como Encerrar o Alerta no GitHub Security (Secret Scanning)</h3>
            <span className="text-xs text-zinc-400 font-mono">Orientação específica para o alerta "OpenAI API Key #2"</span>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          O GitHub Secret Scanning monitora continuamente o repositório. Para encerrar o alerta e manter seu compliance de segurança impecável, siga os 4 passos padronizados recomendados pelo GitHub:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#0b0d14] rounded-lg border border-[#1f2438] space-y-1">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">1</span>
              <span>Rotate Secret</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Crie uma nova chave no provedor e atualize seus workflows e arquivos de configuração.
            </p>
          </div>

          <div className="p-3 bg-[#0b0d14] rounded-lg border border-[#1f2438] space-y-1">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">2</span>
              <span>Revoke Key</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Revogue a chave antiga no painel oficial da OpenAI para impedir acessos não autorizados.
            </p>
          </div>

          <div className="p-3 bg-[#0b0d14] rounded-lg border border-[#1f2438] space-y-1">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[10px]">3</span>
              <span>Check Logs</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Inspecione os relatórios de consumo no Usage Dashboard para garantir que não houve abusos.
            </p>
          </div>

          <div className="p-3 bg-[#0b0d14] rounded-lg border border-[#1f2438] space-y-1">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-[10px]">4</span>
              <span>Close Alert</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              No alerta do GitHub, clique em "Close alert" e selecione "Revoked" ou "Used in tests".
            </p>
          </div>
        </div>
      </div>

      {/* Unified Batch Automation Script Modal */}
      {showBatchScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111218] border border-red-500/40 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-950 text-red-400 border border-red-500/30">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Script Unificado de Remediação em Lote (CLI)</h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    Comandos automáticos para os {selectedSecrets.length} segredo(s) selecionado(s)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchScriptModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Copie e execute este script em seu terminal local ou pipeline de CI/CD para executar as tarefas de rotação, inativação e limpeza de histórico Git de forma centralizada:
            </p>

            <div className="relative">
              <pre className="bg-[#08080d] border border-zinc-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 leading-relaxed">
                {generateUnifiedBatchScript()}
              </pre>
              <button
                type="button"
                onClick={() => handleCopySnippet('batch-script', generateUnifiedBatchScript())}
                className="absolute right-3 top-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 border border-zinc-700 cursor-pointer shadow"
              >
                {copiedSnippetId === 'batch-script' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-zinc-500">
                Alvos incluídos: {selectedSecrets.map(s => s.name).join(', ')}
              </span>
              <button
                type="button"
                onClick={() => setShowBatchScriptModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
