export interface TakeoverServiceSignature {
  id: string;
  name: string;
  category: 'Cloud Storage' | 'Hosting / PaaS' | 'CDN & Edge' | 'Customer Support' | 'Documentation / CMS';
  cnamePatterns: string[];
  responseFingerprints: string[];
  httpStatus?: number[];
  vulnerabilityStatus: 'VULNERABLE' | 'EDGE_CASE' | 'NOT_VULNERABLE';
  takeoverDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  cvssScore: number;
  cwe: string;
  claimProcedure: string;
  verificationCommand: string;
  mitigationSteps: string;
  documentationUrl: string;
}

export const TAKEOVER_SERVICE_DATABASE: TakeoverServiceSignature[] = [
  {
    id: 'aws-s3',
    name: 'Amazon Web Services S3 Bucket',
    category: 'Cloud Storage',
    cnamePatterns: ['.s3.amazonaws.com', '.s3-website', '.s3.dualstack.'],
    responseFingerprints: ['The specified bucket does not exist', 'NoSuchBucket'],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'HIGH',
    cvssScore: 8.2,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Crie um bucket S3 na mesma região com o nome exato do subdomínio alvo e configure como Website Estático.',
    verificationCommand: 'dig CNAME {subdomain} +short && curl -s -I http://{subdomain} | grep -i "NoSuchBucket"',
    mitigationSteps: 'Remova o registro CNAME apontando para o bucket ou recrie o bucket imediatamente na conta AWS da organização.',
    documentationUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html'
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    category: 'Hosting / PaaS',
    cnamePatterns: ['.github.io'],
    responseFingerprints: ["There isn't a GitHub Pages site here", "For root URLs (like http://example.com/) you must provide an index.html file"],
    httpStatus: [404],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'HIGH',
    cvssScore: 7.7,
    cwe: 'CWE-601: URL Redirection to Untrusted Site',
    claimProcedure: 'Crie um repositório público no GitHub, adicione o arquivo CNAME com o subdomínio alvo e ative o GitHub Pages nas configurações.',
    verificationCommand: 'curl -s https://{subdomain} | grep -i "There isn\'t a GitHub Pages site here"',
    mitigationSteps: 'Configure a verificação de domínio no GitHub da sua organização (TXT record _github-pages-challenge) ou delete o CNAME.',
    documentationUrl: 'https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages'
  },
  {
    id: 'heroku',
    name: 'Heroku Application',
    category: 'Hosting / PaaS',
    cnamePatterns: ['.herokuapp.com', '.herokudns.com'],
    responseFingerprints: ['Heroku | No such app', 'There\'s nothing here, yet.', '<title>No such app</title>'],
    httpStatus: [404, 502],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'HIGH',
    cvssScore: 7.5,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Adicione o domínio personalizado à sua aplicação no Heroku CLI: heroku domains:add {subdomain}.',
    verificationCommand: 'curl -s -L http://{subdomain} | grep -i "No such app"',
    mitigationSteps: 'Exclua imediatamente o apontamento DNS CNAME no servidor autoritativo de DNS da sua empresa.',
    documentationUrl: 'https://devcenter.heroku.com/articles/custom-domains'
  },
  {
    id: 'azure-traffic-manager',
    name: 'Microsoft Azure Traffic Manager / App Service',
    category: 'Cloud Storage',
    cnamePatterns: ['.trafficmanager.net', '.azurewebsites.net', '.cloudapp.net'],
    responseFingerprints: ['404 Web Site not found', 'Azure Traffic Manager - Domain not found'],
    httpStatus: [404],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'MEDIUM',
    severity: 'CRITICAL',
    cvssScore: 9.1,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Provisione um Azure App Service ou Traffic Manager Profile com o nome prefixado correspondente.',
    verificationCommand: 'dig CNAME {subdomain} +short && curl -s http://{subdomain} | grep -i "404 Web Site not found"',
    mitigationSteps: 'Delete o registro CNAME no DNS antes de desprovisionar o recurso no Portal Azure.',
    documentationUrl: 'https://learn.microsoft.com/en-us/azure/security/fundamentals/subdomain-takeover'
  },
  {
    id: 'fastly',
    name: 'Fastly CDN',
    category: 'CDN & Edge',
    cnamePatterns: ['.fastly.net', '.fastlylb.net'],
    responseFingerprints: ['Fastly error: unknown domain', 'Details: cache-'],
    httpStatus: [500, 404],
    vulnerabilityStatus: 'EDGE_CASE',
    takeoverDifficulty: 'MEDIUM',
    severity: 'HIGH',
    cvssScore: 7.9,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Crie um novo serviço no Fastly e adicione o domínio. Requer que o domínio não esteja registrado em outra conta ativa.',
    verificationCommand: 'curl -s -I http://{subdomain} | grep -i "Fastly error"',
    mitigationSteps: 'Remova o CNAME Fastly ou ative a validação de propriedade de domínio via TLS da Fastly.',
    documentationUrl: 'https://docs.fastly.com/en/guides/working-with-domains'
  },
  {
    id: 'zendesk',
    name: 'Zendesk Support Desk',
    category: 'Customer Support',
    cnamePatterns: ['.zendesk.com'],
    responseFingerprints: ['Help Center Closed', 'This help center does not exist'],
    httpStatus: [404],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'HIGH',
    cvssScore: 8.1,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Crie uma conta de avaliação no Zendesk com o subdomínio e configure o Host Mapping para o subdomínio alvo.',
    verificationCommand: 'curl -s https://{subdomain} | grep -i "Help Center Closed"',
    mitigationSteps: 'Desative o Host Mapping e remova o CNAME apontando para *.zendesk.com.',
    documentationUrl: 'https://support.zendesk.com'
  },
  {
    id: 'shopify',
    name: 'Shopify Store',
    category: 'Hosting / PaaS',
    cnamePatterns: ['shops.myshopify.com'],
    responseFingerprints: ['Sorry, this shop is currently unavailable', 'Only one step left!'],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'HIGH',
    cvssScore: 7.8,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Crie uma nova loja no Shopify e vincule o domínio personalizado em "Online Store > Domains > Connect existing domain".',
    verificationCommand: 'curl -s https://{subdomain} | grep -i "Sorry, this shop is currently unavailable"',
    mitigationSteps: 'Desvincule o domínio no painel Shopify e delete o CNAME no provedor DNS.',
    documentationUrl: 'https://help.shopify.com/en/manual/domains'
  },
  {
    id: 'surge',
    name: 'Surge.sh Static Hosting',
    category: 'Hosting / PaaS',
    cnamePatterns: ['na-west1.surge.sh'],
    responseFingerprints: ['project not found', 'Repository not found'],
    httpStatus: [404],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'HIGH',
    cvssScore: 7.4,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Execute: surge --domain {subdomain} a partir de um diretório com um index.html de teste.',
    verificationCommand: 'curl -s http://{subdomain} | grep -i "project not found"',
    mitigationSteps: 'Remova o apontamento CNAME para surge.sh.',
    documentationUrl: 'https://surge.sh/help/adding-a-custom-domain'
  },
  {
    id: 'readme-io',
    name: 'Readme.io API Docs',
    category: 'Documentation / CMS',
    cnamePatterns: ['.readme.io'],
    responseFingerprints: ['Project doesnt exist... yet!', 'Project doesn\'t exist... yet!'],
    httpStatus: [404],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'LOW',
    severity: 'MEDIUM',
    cvssScore: 6.8,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Crie um projeto no Readme.io e associe o custom domain nas opções de branding.',
    verificationCommand: 'curl -s https://{subdomain} | grep -i "Project doesn"',
    mitigationSteps: 'Remova o CNAME apontando para readme.io.',
    documentationUrl: 'https://docs.readme.com'
  },
  {
    id: 'pantheon',
    name: 'Pantheon Hosting',
    category: 'Hosting / PaaS',
    cnamePatterns: ['.pantheonsite.io'],
    responseFingerprints: ['The gods are wise, but do not know of the site which you seek', '404 error: Unknown Site'],
    httpStatus: [404],
    vulnerabilityStatus: 'VULNERABLE',
    takeoverDifficulty: 'MEDIUM',
    severity: 'HIGH',
    cvssScore: 7.6,
    cwe: 'CWE-284: Improper Access Control',
    claimProcedure: 'Crie uma aplicação no Pantheon e adicione o domínio customizado.',
    verificationCommand: 'curl -s http://{subdomain} | grep -i "The gods are wise"',
    mitigationSteps: 'Remova o CNAME apontando para *.pantheonsite.io no DNS autoritativo.',
    documentationUrl: 'https://pantheon.io/docs/domains'
  }
];

export interface SubdomainAuditResult {
  subdomain: string;
  cnameRecord: string;
  matchedService?: TakeoverServiceSignature;
  isVulnerable: boolean;
  status: 'VULNERABLE' | 'SUSPICIOUS' | 'SAFE' | 'UNKNOWN';
  evidence: string;
  fingerprintFound?: string;
  riskAssessment: {
    cvssScore: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    cookieHijackingRisk: boolean;
    storedCredentialTheftRisk: boolean;
  };
  reproductionCommands: {
    digCheck: string;
    httpProbe: string;
    pocProof: string;
  };
  remediationAdvice: string;
}

/**
 * Analyzes a given subdomain and CNAME target for takeover vulnerability.
 */
export function analyzeSubdomainTakeover(
  subdomain: string,
  cnameTarget: string,
  simulatedResponseBody?: string,
  simulatedStatusCode?: number
): SubdomainAuditResult {
  const cleanSub = subdomain.trim().toLowerCase();
  const cleanCname = cnameTarget.trim().toLowerCase();
  const responseText = simulatedResponseBody || '';

  // Match against signatures
  const matchedService = TAKEOVER_SERVICE_DATABASE.find(service => 
    service.cnamePatterns.some(pattern => cleanCname.includes(pattern.toLowerCase()))
  );

  let isVulnerable = false;
  let status: 'VULNERABLE' | 'SUSPICIOUS' | 'SAFE' | 'UNKNOWN' = 'SAFE';
  let evidence = 'Nenhum padrão conhecido de CNAME órfão foi detectado.';
  let fingerprintFound: string | undefined = undefined;

  if (matchedService) {
    // Check if response text has fingerprints
    if (responseText) {
      const foundFp = matchedService.responseFingerprints.find(fp => 
        responseText.toLowerCase().includes(fp.toLowerCase())
      );

      if (foundFp) {
        isVulnerable = true;
        status = 'VULNERABLE';
        fingerprintFound = foundFp;
        evidence = `Assinatura de orfandade confirmada para ${matchedService.name}: "${foundFp}" detectado no corpo da resposta HTTP.`;
      } else {
        status = 'SUSPICIOUS';
        evidence = `CNAME corresponde a ${matchedService.name}, mas a resposta HTTP não continha a string de erro clássica. Pode estar ativo ou em configuração.`;
      }
    } else {
      // No response body provided yet, flag as suspicious based on CNAME match
      status = 'SUSPICIOUS';
      evidence = `Apontamento CNAME para ${matchedService.name} (${cleanCname}) detectado. Recomenda-se teste de resposta HTTP para verificar orfandade.`;
    }
  } else {
    status = 'UNKNOWN';
    evidence = `O CNAME ${cleanCname} não pertence à lista de provedores suscetíveis conhecidos.`;
  }

  // Assess cookies and blast radius
  const isParentDomainWildcard = cleanSub.split('.').length >= 3;
  const cvssScore = isVulnerable ? (matchedService?.cvssScore || 7.5) : (status === 'SUSPICIOUS' ? 5.0 : 0.0);
  const severity = cvssScore >= 9.0 ? 'CRITICAL' : cvssScore >= 7.0 ? 'HIGH' : cvssScore >= 4.0 ? 'MEDIUM' : 'LOW';

  return {
    subdomain: cleanSub,
    cnameRecord: cleanCname,
    matchedService,
    isVulnerable,
    status,
    evidence,
    fingerprintFound,
    riskAssessment: {
      cvssScore,
      severity,
      cookieHijackingRisk: isParentDomainWildcard,
      storedCredentialTheftRisk: isVulnerable,
    },
    reproductionCommands: {
      digCheck: `dig CNAME ${cleanSub} +noall +answer`,
      httpProbe: `curl -i -s -k "http://${cleanSub}" -H "Host: ${cleanSub}"`,
      pocProof: matchedService ? matchedService.claimProcedure.replace('{subdomain}', cleanSub) : 'N/A'
    },
    remediationAdvice: matchedService 
      ? matchedService.mitigationSteps 
      : 'Remova registros CNAME ou ALIAS apontando para hosts de terceiros que foram descontinuados.'
  };
}
