// Triage Macros and Canned Responses Library
// Provides standard bug bounty & application security communication templates

export interface TriageMacro {
  id: string;
  title: string;
  category: 'REQUEST_INFO' | 'OUT_OF_SCOPE' | 'DUPLICATE' | 'ACCEPTED' | 'FIX_VERIFIED' | 'BOUNTY_PAID' | 'INFORMATIVE';
  suggestedStatus?: 'TRIAGED' | 'FIX_PENDING' | 'RESOLVED' | 'CLOSED';
  shortDescription: string;
  template: string;
  badgeColor: string;
}

export const DEFAULT_TRIAGE_MACROS: TriageMacro[] = [
  {
    id: 'macro-need-more-info',
    title: 'Solicitar Mais Informações / PoC Incompleto',
    category: 'REQUEST_INFO',
    shortDescription: 'Pede ao pesquisador passos adicionais de reprodução, versão afetada ou payload funcional.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    template: `Olá @{{researcher}},

Obrigado pelo envio do relatório **{{reportId}}** sobre o alvo \`{{target}}\`.

Analisamos o caso inicialmente, mas não conseguimos reproduzir o comportamento com as evidências fornecidas. Para prosseguirmos com a triagem e validação da vulnerabilidade, por gentileza nos forneça:

1. Requisição HTTP completa (Raw HTTP) ou comando \`curl\` exato com parâmetros;
2. Versão do navegador/sistema e ambiente em que o teste foi realizado;
3. Se aplicável, um vídeo ou captura de tela demonstrando o impacto de segurança direto.

Ficamos no aguardo para dar continuidade à sua submissão.

Atenciosamente,  
Equipe de Segurança & Bug Bounty`
  },
  {
    id: 'macro-accepted-triaged',
    title: 'Relatório Aceito & Triado com Sucesso',
    category: 'ACCEPTED',
    suggestedStatus: 'TRIAGED',
    shortDescription: 'Confirma a reprodução da vulnerabilidade e informa o encaminhamento ao time de engenharia.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    template: `Olá @{{researcher}},

Validamos e reproduzimos com sucesso a vulnerabilidade reportada em **{{reportId}}** (\`{{target}}\`).

- **Severidade Preliminar:** {{severity}}
- **Vetor CVSS:** {{cvss}}
- **Status:** **TRIAGED (Validado)**

O relatório foi formalmente registrado em nosso sistema e encaminhado à equipe de desenvolvimento responsável pela aplicação para desenvolvimento da correção. Manteremos você informado(a) sobre atualizações de status e deliberação da recompensa (bounty).

Agradecemos pela colaboração com a segurança de nossos serviços!

Atenciosamente,  
Equipe de Segurança da Informação`
  },
  {
    id: 'macro-duplicate',
    title: 'Relatório Duplicado',
    category: 'DUPLICATE',
    suggestedStatus: 'CLOSED',
    shortDescription: 'Informa que a vulnerabilidade já havia sido reportada anteriormente por outro pesquisador.',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    template: `Olá @{{researcher}},

Agradecemos o envio do relatório **{{reportId}}**.

Após minuciosa análise de nossos registros, verificamos que este comportamento no alvo \`{{target}}\` já havia sido identificado e reportado previamente por outro pesquisador em nossa plataforma, estando atualmente com correção em andamento.

De acordo com as diretrizes do nosso programa, relatórios posteriores que abordam o mesmo endpoint e causa raiz são classificados como **Duplicados**.

Incentivamos você a continuar explorando nossos outros ativos listados no escopo.

Atenciosamente,  
Equipe de Bug Bounty`
  },
  {
    id: 'macro-out-of-scope',
    title: 'Fora de Escopo / Não Elegível',
    category: 'OUT_OF_SCOPE',
    suggestedStatus: 'CLOSED',
    shortDescription: 'Informa que o ativo, endpoint ou tipo de achado não qualifica para recompensa segundo as regras.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    template: `Olá @{{researcher}},

Obrigado pelo envio do relatório **{{reportId}}**.

Revisamos detalhadamente a sua submissão e concluímos que o ativo ou a técnica reportada (\`{{target}}\`) encontra-se fora do escopo elegível para o nosso programa de Bug Bounty ou não demonstra impacto de segurança direto (ex.: cabeçalhos informativos, scanners automatizados sem PoC ou domínios de terceiros).

Por esse motivo, estamos encerrando este relatório sem concessão de recompensa.

Recomendamos a leitura atenta da nossa política de escopo para futuras submissões.

Atenciosamente,  
Equipe de Segurança`
  },
  {
    id: 'macro-fix-verified',
    title: 'Correção Aplicada - Solicitação de Reteste',
    category: 'FIX_VERIFIED',
    suggestedStatus: 'FIX_PENDING',
    shortDescription: 'Solicita ao pesquisador confirmar se a correção em produção mitigou completamente a falha.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    template: `Olá @{{researcher}},

A equipe de engenharia finalizou o deploy do patch de correção para a falha reportada em **{{reportId}}** (\`{{target}}\`).

Você poderia, por gentileza, retestar o endpoint em nosso ambiente de produção para verificar se a vulnerabilidade foi completamente mitigada e se não há vetores alternativos de bypass?

Caso tudo esteja normalizado, responderemos com a conclusão formal e encerramento do relatório.

Muito obrigado pelo suporte contínuo!

Atenciosamente,  
Equipe de Segurança`
  },
  {
    id: 'macro-bounty-paid',
    title: 'Recompensa Concedida & Agradecimento',
    category: 'BOUNTY_PAID',
    suggestedStatus: 'RESOLVED',
    shortDescription: 'Comunica o valor da recompensa financeira concedida ao pesquisador com agradecimento formal.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    template: `Parabéns @{{researcher}}! 🎉

Temos o prazer de informar que seu relatório **{{reportId}}** referente a \`{{target}}\` foi avaliado e aprovado para concessão de recompensa financeira!

- **Valor da Recompensa (Bounty):** {{bounty}}
- **Severidade Final:** {{severity}}
- **Impacto Mitigado:** Correção validada com sucesso em nossos ambientes.

A transferência foi processada via plataforma. Seu relatório contribuiu significativamente para a segurança dos nossos usuários e infraestrutura.

Esperamos ver novas submissões suas em breve!

Com estima,  
Equipe de Segurança & Governança`
  }
];

export interface MacroVariables {
  reportId?: string;
  researcher?: string;
  target?: string;
  severity?: string;
  bounty?: string;
  cvss?: string;
}

export function renderMacroTemplate(template: string, variables: MacroVariables): string {
  let result = template;
  result = result.replace(/\{\{reportId\}\}/g, variables.reportId || '#REP-XXXX');
  result = result.replace(/\{\{researcher\}\}/g, variables.researcher || 'pesquisador');
  result = result.replace(/\{\{target\}\}/g, variables.target || 'alvo-afetado.com');
  result = result.replace(/\{\{severity\}\}/g, variables.severity || 'MEDIUM');
  result = result.replace(/\{\{bounty\}\}/g, variables.bounty || '$500 USD');
  result = result.replace(/\{\{cvss\}\}/g, variables.cvss || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N (7.5)');
  return result;
}
