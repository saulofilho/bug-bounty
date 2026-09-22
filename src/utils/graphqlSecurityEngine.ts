export interface GraphQLSecurityVulnerability {
  id: string;
  name: string;
  category: 'Information Disclosure' | 'Denial of Service' | 'Authentication Bypass / Brute Force' | 'Authorization (BOLA)';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvssScore: number;
  description: string;
  payloadTemplate: string;
  remediationSnippet: string;
  documentationUrl: string;
}

export const GRAPHQL_VULNERABILITIES: GraphQLSecurityVulnerability[] = [
  {
    id: 'introspection-enabled',
    name: 'Introspecção de Schema Habilitada em Produção',
    category: 'Information Disclosure',
    severity: 'MEDIUM',
    cvssScore: 5.3,
    description: 'A API GraphQL permite consultas de introspecção via `__schema`, expondo todos os tipos, queries, mutations, argumentos e campos internos não documentados da aplicação.',
    payloadTemplate: `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args { name type { name kind } }
        type { name kind }
      }
    }
  }
}`,
    remediationSnippet: `// Apollo Server (Desativar Introspecção em Produção)
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production'
});`,
    documentationUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html'
  },
  {
    id: 'query-depth-dos',
    name: 'Exaustão de Recursos por Profundidade Excessiva (Circular Query DoS)',
    category: 'Denial of Service',
    severity: 'HIGH',
    cvssScore: 7.5,
    description: 'Ausência de limitação de profundidade de consulta (Query Depth Limiting). Relacionamentos cíclicos (ex: autor -> posts -> autor -> posts) provocam explosão exponencial de CPU e memória.',
    payloadTemplate: `query DeepCircularExploit {
  user(id: "1") {
    friends {
      friends {
        friends {
          friends {
            friends {
              friends {
                id
                email
              }
            }
          }
        }
      }
    }
  }
}`,
    remediationSnippet: `// Usar plugin graphql-depth-limit
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  schema,
  validationRules: [depthLimit(5)] // Limite máximo de 5 níveis
});`,
    documentationUrl: 'https://github.com/stems/graphql-depth-limit'
  },
  {
    id: 'batching-alias-bruteforce',
    name: 'Bypass de Rate Limiting por Amplificação de Alias (Batching Attack)',
    category: 'Authentication Bypass / Brute Force',
    severity: 'HIGH',
    cvssScore: 8.1,
    description: 'Uma única requisição HTTP POST pode conter centenas de mutations com apelidos (aliases), executando centenas de tentativas de adivinhação de OTP/senha contornando WAFs e rate limiters baseados em IP.',
    payloadTemplate: `mutation BatchingBypassOtp {
  attempt1: verifyOtp(code: "0001") { success token }
  attempt2: verifyOtp(code: "0002") { success token }
  attempt3: verifyOtp(code: "0003") { success token }
  attempt4: verifyOtp(code: "0004") { success token }
  attempt5: verifyOtp(code: "0005") { success token }
}`,
    remediationSnippet: `// Limitar complexidade de consulta (graphql-validation-complexity)
// e desativar batching no middleware express-graphql
app.use('/graphql', graphqlHTTP({
  schema,
  validationRules: [costAnalysis({ maximumCost: 1000 })]
}));`,
    documentationUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html#batching-attacks'
  },
  {
    id: 'field-suggestion-leaks',
    name: 'Vazamento de Campos por Field Suggestions (Did you mean?)',
    category: 'Information Disclosure',
    severity: 'LOW',
    cvssScore: 3.7,
    description: 'Mesmo com introspecção desativada, motores GraphQL padrão sugerem nomes de campos similares em caso de erro de digitação ("Did you mean secretToken?"), permitindo enumeração por dicionário.',
    payloadTemplate: `query ProbeUnknownField {
  user(id: "1") {
    pasword   # Servidor responde: Did you mean "password"?
    adminKey  # Servidor responde: Did you mean "adminToken"?
  }
}`,
    remediationSnippet: `// Apollo Server v4 (Mascarar erros ou ocultar sugestões)
import { createApollo4QueryValidationPlugin } from 'graphql-disable-introspection';
// Usar plugin para mascarar mensagens 'Did you mean'`,
    documentationUrl: 'https://graphql.org/learn/best-practices/'
  }
];

export interface GraphQLEndpointAudit {
  endpoint: string;
  introspectionPayload: string;
  batchingPayload: string;
  dosPayload: string;
  securityChecklist: Array<{ item: string; description: string; status: 'RECOMMENDED' | 'CRITICAL' }>;
}

export function generateGraphQLAuditSuite(targetEndpoint: string = 'https://api.empresa.com/graphql'): GraphQLEndpointAudit {
  return {
    endpoint: targetEndpoint,
    introspectionPayload: GRAPHQL_VULNERABILITIES[0].payloadTemplate,
    dosPayload: GRAPHQL_VULNERABILITIES[1].payloadTemplate,
    batchingPayload: GRAPHQL_VULNERABILITIES[2].payloadTemplate,
    securityChecklist: [
      { item: 'Desativar Introspecção em Produção', description: 'Garante que invasores não consigam baixar o mapa de dados completo via __schema.', status: 'CRITICAL' },
      { item: 'Aplicar Query Depth Limiting (Max 5-7)', description: 'Previne negação de serviço e loops recursivos por queries aninhadas infinitas.', status: 'CRITICAL' },
      { item: 'Análise de Complexidade de Query (Cost Analysis)', description: 'Atribui pontos a cada campo e rejeita queries que excedem o custo máximo computacional.', status: 'CRITICAL' },
      { item: 'Limitar Tamanho do Payload HTTP (max 20KB)', description: 'Bloqueia ataques massivos de amplificação por alias.', status: 'RECOMMENDED' },
      { item: 'Implementar Persisted Queries (APQ / Whitelisting)', description: 'Apenas queries pré-aprovadas pelo frontend em build-time podem ser executadas.', status: 'RECOMMENDED' },
      { item: 'Desativar Field Suggestions em Erros', description: 'Impede vazamento de nomes de campos sensíveis em respostas de erro.', status: 'RECOMMENDED' }
    ]
  };
}
