import React, { useState, useMemo } from 'react';
import { 
  Cloud, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Lock, 
  Code2, 
  Key,
  Sliders
} from 'lucide-react';

interface EscalationMethod {
  id: string;
  name: string;
  permissionsRequired: string[];
  impact: string;
  mitigation: string;
}

const KNOWN_ESCALATIONS: EscalationMethod[] = [
  {
    id: 'ESC-1',
    name: 'Criação de Versão de Política (iam:CreatePolicyVersion)',
    permissionsRequired: ['iam:CreatePolicyVersion'],
    impact: 'O usuário cria uma nova versão de uma política já anexada à sua conta com permissão Action: "*" e define como padrão (SetAsDefault=true), tornando-se Administrador.',
    mitigation: 'Restrinja CreatePolicyVersion ou impeça a flag --set-as-default via SCP.'
  },
  {
    id: 'ESC-2',
    name: 'Anexar Política Administrativa (iam:AttachUserPolicy)',
    permissionsRequired: ['iam:AttachUserPolicy'],
    impact: 'O usuário anexa diretamente a política gerenciada arn:aws:iam::aws:policy/AdministratorAccess ao seu próprio usuário.',
    mitigation: 'Exija condições estritas (Condition) ou limite anexação apenas a políticas aprovadas.'
  },
  {
    id: 'ESC-3',
    name: 'Injeção de Política Inline (iam:PutUserPolicy)',
    permissionsRequired: ['iam:PutUserPolicy'],
    impact: 'O usuário injeta uma política inline contendo Effect: Allow, Action: * e Resource: * diretamente no seu registro.',
    mitigation: 'Desabilite políticas inline em favor de Managed Policies governadas.'
  },
  {
    id: 'ESC-4',
    name: 'Adicionar Usuário a Grupo Admin (iam:AddUserToGroup)',
    permissionsRequired: ['iam:AddUserToGroup'],
    impact: 'O usuário adiciona a si mesmo a grupos com privilégios de alto nível (ex: Grupo DevOps/Admins).',
    mitigation: 'Restrinja a adição a grupos apenas para administradores centrais.'
  },
  {
    id: 'ESC-5',
    name: 'PassRole com EC2 (iam:PassRole + ec2:RunInstances)',
    permissionsRequired: ['iam:PassRole', 'ec2:RunInstances'],
    impact: 'O usuário inicia uma instância EC2 anexando uma Role administrativa e extrai as credenciais temporárias via IMDS (169.254.169.254).',
    mitigation: 'Exija tags obrigatórias ou restrinja o parâmetro Resource no iam:PassRole a ARNs específicos.'
  },
  {
    id: 'ESC-6',
    name: 'PassRole com AWS Lambda (iam:PassRole + lambda:CreateFunction)',
    permissionsRequired: ['iam:PassRole', 'lambda:CreateFunction', 'lambda:InvokeFunction'],
    impact: 'O usuário cria uma função Lambda com uma Role de alto privilégio e a invoca para executar comandos na conta.',
    mitigation: 'Limite a criação de Lambdas a repositórios CI/CD controlados com Permission Boundaries.'
  }
];

const SAMPLE_IAM_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreatePolicyVersion",
        "iam:SetDefaultPolicyVersion",
        "iam:PassRole",
        "ec2:RunInstances"
      ],
      "Resource": "*"
    }
  ]
}`;

export const CloudIamEscalationAuditor: React.FC = () => {
  const [policyJson, setPolicyJson] = useState<string>(SAMPLE_IAM_POLICY);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Analysis of IAM Policy
  const audit = useMemo(() => {
    try {
      const parsed = JSON.parse(policyJson);
      const statements = parsed.Statement || [];

      const detectedActions: string[] = [];
      let hasWildcardAction = false;
      let hasWildcardResource = false;

      for (const st of statements) {
        if (st.Effect === 'Allow') {
          const acts = Array.isArray(st.Action) ? st.Action : [st.Action];
          for (const a of acts) {
            if (a === '*' || a === '*:*') hasWildcardAction = true;
            detectedActions.push(a);
          }
          if (st.Resource === '*') hasWildcardResource = true;
        }
      }

      // Check matched escalations
      const matchedEscalations = KNOWN_ESCALATIONS.filter(esc => {
        if (hasWildcardAction) return true;
        return esc.permissionsRequired.every(req => 
          detectedActions.some(da => da.toLowerCase() === req.toLowerCase())
        );
      });

      return {
        validJson: true,
        hasWildcardAction,
        hasWildcardResource,
        matchedEscalations,
        isCritical: matchedEscalations.length > 0 || hasWildcardAction
      };
    } catch {
      return {
        validJson: false,
        hasWildcardAction: false,
        hasWildcardResource: false,
        matchedEscalations: [],
        isCritical: false
      };
    }
  }, [policyJson]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                <span>AWS IAM Privilege Escalation Auditor</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Mapeamento de Escalonamento a Administrador</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Auditor de Escalonamento de Privilégios em Políticas IAM
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Detecte permissões aparentemente inofensivas que permitem a um atacante ou credencial comprometida elevar seus próprios privilégios para Administrador total da conta AWS (ex: <code className="text-cyan-300 font-mono">iam:CreatePolicyVersion</code>, <code className="text-cyan-300 font-mono">iam:PassRole</code> com EC2/Lambda).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-[#161622] border border-[#262638] rounded-xl p-3.5">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Caminhos de Escalonamento</div>
              <div className="text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
                <span className={audit.matchedEscalations.length > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {audit.matchedEscalations.length}
                </span>
                <span className="text-xs text-zinc-500 font-normal">vetores detectados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Policy JSON Editor */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
          <span className="text-zinc-300 font-bold flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>Documento de Política AWS IAM (JSON)</span>
          </span>
          <button
            type="button"
            onClick={() => handleCopy('iam-policy', policyJson)}
            className="text-zinc-400 hover:text-white flex items-center gap-1"
          >
            {copiedKey === 'iam-policy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copiar JSON</span>
          </button>
        </div>

        <textarea
          rows={9}
          value={policyJson}
          onChange={e => setPolicyJson(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
        />
      </div>

      {/* Detected Escalation Vectors */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#22222d] pb-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Vulnerabilidades & Vetores de Escalonamento Encontrados ({audit.matchedEscalations.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audit.matchedEscalations.map(esc => (
            <div key={esc.id} className="bg-[#121218] border border-rose-500/30 rounded-2xl p-4 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">{esc.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  {esc.id}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {esc.permissionsRequired.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-mono text-[10px]">
                    {p}
                  </span>
                ))}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed pt-1">{esc.impact}</p>

              <div className="bg-[#161622] p-2 rounded-lg border border-[#232333] text-[11px] font-mono text-emerald-400">
                <strong>Mitigação:</strong> {esc.mitigation}
              </div>
            </div>
          ))}

          {audit.matchedEscalations.length === 0 && (
            <div className="col-span-2 text-center py-8 bg-[#121218] border border-emerald-500/30 rounded-2xl text-emerald-400 font-mono text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span>Nenhum dos 21 vetores conhecidos de escalonamento IAM foi identificado nesta política!</span>
            </div>
          )}
        </div>
      </div>

      {/* Defense Checklist */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Princípios de Least Privilege e Permission Boundaries</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">1. Permission Boundaries</span>
            <p className="text-zinc-300 text-[11px]">
              Anexe uma Permission Boundary que limite o teto máximo de permissões que um usuário ou role pode conceder, mesmo que possua permissão de criar políticas.
            </p>
          </div>
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">2. Restrição em iam:PassRole</span>
            <p className="text-zinc-300 text-[11px]">
              Nunca permita <code className="text-white">Resource: "*"</code> em ações iam:PassRole. Especifique os ARNs estritos das Roles permitidas para EC2 ou Lambda.
            </p>
          </div>
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">3. SCPs na AWS Organizations</span>
            <p className="text-zinc-300 text-[11px]">
              Implemente Service Control Policies a nível de organização para proibir desativação do GuardDuty, CloudTrail ou criação de usuários IAM fora de SSO.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
