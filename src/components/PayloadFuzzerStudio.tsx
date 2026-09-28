import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  RotateCcw, 
  Sliders, 
  Search, 
  Download, 
  Filter, 
  Terminal, 
  FileText, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Sparkles, 
  Eye, 
  ShieldAlert, 
  Layers, 
  ArrowRight,
  Code2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Link2,
  FolderTree,
  FileCode2,
  ShieldCheck,
  Send,
  Play,
  History,
  Wrench,
  AlertCircle,
  ArrowLeftRight,
  Columns
} from 'lucide-react';
import { PayloadSyntaxInput } from './PayloadSyntaxInput';
import { validatePayloadSyntax, ValidationResult } from '../utils/payloadSyntaxValidator';
import { PayloadDiffModal } from './PayloadDiffModal';

export interface FuzzTestHistoryItem {
  id: string;
  payload: string;
  paramName: string;
  targetUrl: string;
  timestamp: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
}
import { 
  FuzzCategory, 
  PlacementMode, 
  MutationType, 
  FuzzSeed, 
  GeneratedFuzzItem, 
  ParsedUrlDetails,
  ParsedUrlParam,
  FUZZ_CATEGORIES, 
  DEFAULT_FUZZ_SEEDS, 
  DEFAULT_MUTATION_OPTIONS, 
  DIRECTORY_TRAVERSAL_ENCODINGS,
  COMMON_TARGET_FILES,
  FUZZ_PRESETS,
  parseUrlParameters,
  reconstructUrlWithParam,
  generateFuzzItems,
  generateUrlParamFuzzItems
} from '../utils/payloadFuzzerEngine';

interface PayloadFuzzerStudioProps {
  initialTarget?: string;
  onSendToPocBuilder?: (url: string, payload: string) => void;
  onNavigateToDefense?: (payload: string) => void;
}

type StudioMode = 'url-param' | 'template-marker';

export const PayloadFuzzerStudio: React.FC<PayloadFuzzerStudioProps> = ({
  initialTarget,
  onSendToPocBuilder,
  onNavigateToDefense
}) => {
  // --- Studio Operating Mode ---
  const [studioMode, setStudioMode] = useState<StudioMode>('url-param');

  // --- 1. URL Parameter Fuzzing State ---
  const [targetUrl, setTargetUrl] = useState<string>(() => {
    if (initialTarget) {
      return `https://${initialTarget}/api/v1/download?file=report.pdf&user=admin&theme=dark`;
    }
    return 'https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=admin&theme=dark';
  });

  const parsedUrl = useMemo<ParsedUrlDetails>(() => {
    return parseUrlParameters(targetUrl);
  }, [targetUrl]);

  // Selected query parameter to fuzz
  const [selectedParam, setSelectedParam] = useState<string>('file');

  // Auto-sync selected parameter if available in parsed URL
  useEffect(() => {
    if (parsedUrl.params.length > 0) {
      const exists = parsedUrl.params.some(p => p.name === selectedParam);
      if (!exists) {
        setSelectedParam(parsedUrl.params[0].name);
      }
    }
  }, [parsedUrl, selectedParam]);

  // Inline add new parameter
  const [newParamKey, setNewParamKey] = useState<string>('');
  const [newParamVal, setNewParamVal] = useState<string>('');

  // --- Traversal & URL Encoding Specifics ---
  const [traversalDepths, setTraversalDepths] = useState<number[]>([3, 6, 8, 12]);
  const [selectedTraversalEncodings, setSelectedTraversalEncodings] = useState<string[]>([
    'raw',
    'full_url',
    'slash_only',
    'double_url',
    'non_recursive',
    'windows_backslash_url'
  ]);
  const [selectedTargetFiles, setSelectedTargetFiles] = useState<string[]>([
    'linux-passwd',
    'linux-environ',
    'win-ini',
    'app-env',
    'aws-creds',
    'php-filter'
  ]);
  const [includeNullByteSuffix, setIncludeNullByteSuffix] = useState<boolean>(false);
  const [nullByteExtension, setNullByteExtension] = useState<string>('%00');
  const [autoUrlEncodeCommonPayloads, setAutoUrlEncodeCommonPayloads] = useState<boolean>(true);

  // --- 2. Template / Marker Fuzzing State ---
  const [baseString, setBaseString] = useState<string>(
    initialTarget 
      ? `https://${initialTarget}/api/v1/search?q={FUZZ}&limit=20` 
      : 'https://alvo-bugbounty.com/api/v1/search?q={FUZZ}&limit=10'
  );
  const [placementMode, setPlacementMode] = useState<PlacementMode>('MARKER');
  
  // Syntax Highlighting Selected Injection Vector & Custom Param Payload
  const [selectedFuzzVector, setSelectedFuzzVector] = useState<FuzzCategory | 'AUTO'>('SQLI');
  const [customParamPayload, setCustomParamPayload] = useState<string>("' UNION SELECT 1,2,3-- ");
  
  // Active Categories
  const [selectedCategories, setSelectedCategories] = useState<Set<FuzzCategory>>(
    new Set<FuzzCategory>(['PATH_TRAVERSAL', 'SQLI', 'COMMAND_INJECTION'])
  );

  // Active Mutations
  const [selectedMutations, setSelectedMutations] = useState<Set<MutationType>>(
    new Set<MutationType>([
      'raw', 
      'url_encode', 
      'double_url_encode', 
      'traversal_dot_slash_url', 
      'traversal_slash_only_url', 
      'traversal_double_encoded', 
      'null_byte'
    ])
  );

  // Custom User Seeds
  const [customSeeds, setCustomSeeds] = useState<FuzzSeed[]>([]);
  const [showAddSeedModal, setShowAddSeedModal] = useState<boolean>(false);
  const [newSeedName, setNewSeedName] = useState<string>('');
  const [newSeedCategory, setNewSeedCategory] = useState<FuzzCategory>('PATH_TRAVERSAL');
  const [newSeedPayload, setNewSeedPayload] = useState<string>('');
  const [newSeedDesc, setNewSeedDesc] = useState<string>('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // --- Helper to Generate Simulated HTTP Response Bodies for Diffing ---
  const generateSimulatedResponseBody = (payload: string, param: string, statusCode: number, statusText: string): string => {
    const timestamp = new Date().toISOString();
    
    if (statusCode === 200) {
      return JSON.stringify({
        status: "success",
        endpoint: "/api/v1/download",
        data: {
          fileId: 1042,
          filename: "report.pdf",
          mimeType: "application/pdf",
          size: 240819,
          access: "granted",
          echoParam: {
            [param]: payload
          },
          cached: false
        },
        meta: {
          server: "nginx/1.24.0",
          environment: "production",
          wafStatus: "ALLOWED_OR_BYPASS",
          timestamp
        }
      }, null, 2);
    }

    if (statusCode === 400) {
      return JSON.stringify({
        error: "BAD_REQUEST",
        code: 400,
        message: "Directory traversal sequence detected in query parameter",
        details: {
          parameter: param,
          rejectedValue: payload,
          securityRule: "PATH_TRAVERSAL_GUARD_V2",
          canonicalPath: `/var/app/data/${payload}`
        },
        incidentId: `SEC-ERR-${Math.floor(Math.random() * 89999 + 10000)}`,
        timestamp
      }, null, 2);
    }

    if (statusCode === 403) {
      const isCommand = payload.includes(';') || payload.includes('|') || payload.includes('`');
      return JSON.stringify({
        error: "FORBIDDEN",
        code: 403,
        message: "Request blocked by Web Application Firewall (ModSecurity/CRS 3.3.2)",
        waf: {
          ruleId: isCommand ? "932100" : "942100",
          tag: isCommand ? "OWASP_CRS/WEB_ATTACK/COMMAND_INJECTION" : "OWASP_CRS/WEB_ATTACK/SQL_INJECTION",
          matchedString: payload.slice(0, 32),
          action: "DROP_CONNECTION",
          clientIp: "198.51.100.42"
        },
        rayId: Math.random().toString(16).substring(2, 18),
        timestamp
      }, null, 2);
    }

    if (statusCode === 422) {
      return JSON.stringify({
        error: "UNPROCESSABLE_ENTITY",
        code: 422,
        message: "Strict schema validation failed: HTML, script and event tags are strictly prohibited",
        validationErrors: [
          {
            field: param,
            rejectedInput: payload,
            sanitizer: "DOMPurify/HTML-Strip",
            action: "INPUT_REJECTED"
          }
        ],
        timestamp
      }, null, 2);
    }

    return JSON.stringify({
      error: "UNKNOWN_RESPONSE",
      code: statusCode,
      statusText,
      parameter: param,
      payload,
      timestamp
    }, null, 2);
  };

  // --- Internal Test History (Last 10 Payloads Tested) ---
  const [testHistory, setTestHistory] = useState<FuzzTestHistoryItem[]>(() => [
    {
      id: 'hist-1',
      payload: "' OR '1'='1' --",
      paramName: 'user',
      targetUrl: 'https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=%27+OR+%271%27%3D%271%27+--&theme=dark',
      timestamp: '07:12:04',
      statusCode: 403,
      statusText: 'Forbidden (WAF / SQLi Signature Intercepted)',
      latencyMs: 38,
      responseBody: JSON.stringify({
        error: "FORBIDDEN",
        code: 403,
        message: "Request blocked by Web Application Firewall (ModSecurity/CRS 3.3.2)",
        waf: {
          ruleId: "942100",
          tag: "OWASP_CRS/WEB_ATTACK/SQL_INJECTION",
          matchedString: "' OR '1'='1",
          action: "DROP_CONNECTION",
          clientIp: "198.51.100.42"
        },
        rayId: "8c59f21b7a0d49e1",
        timestamp: "2026-09-25T07:12:04Z"
      }, null, 2)
    },
    {
      id: 'hist-2',
      payload: '../../../../etc/passwd',
      paramName: 'file',
      targetUrl: 'https://alvo-bugbounty.com/api/v1/download?file=..%2f..%2f..%2f..%2fetc%2fpasswd&user=admin&theme=dark',
      timestamp: '07:14:21',
      statusCode: 400,
      statusText: 'Bad Request (Directory Traversal Rejected)',
      latencyMs: 24,
      responseBody: JSON.stringify({
        error: "BAD_REQUEST",
        code: 400,
        message: "Directory traversal sequence detected in query parameter",
        details: {
          parameter: "file",
          rejectedValue: "../../../../etc/passwd",
          securityRule: "PATH_TRAVERSAL_GUARD_V2",
          canonicalPath: "/var/app/data/../../../../etc/passwd"
        },
        incidentId: "SEC-ERR-98214",
        timestamp: "2026-09-25T07:14:21Z"
      }, null, 2)
    },
    {
      id: 'hist-3',
      payload: '<script>alert(1)</script>',
      paramName: 'theme',
      targetUrl: 'https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=admin&theme=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
      timestamp: '07:15:50',
      statusCode: 422,
      statusText: 'Unprocessable Entity (Strict Schema Mismatch)',
      latencyMs: 19,
      responseBody: JSON.stringify({
        error: "UNPROCESSABLE_ENTITY",
        code: 422,
        message: "Strict schema validation failed: HTML, script and event tags are strictly prohibited",
        validationErrors: [
          {
            field: "theme",
            rejectedInput: "<script>alert(1)</script>",
            sanitizer: "DOMPurify/HTML-Strip",
            action: "INPUT_REJECTED"
          }
        ],
        timestamp: "2026-09-25T07:15:50Z"
      }, null, 2)
    },
    {
      id: 'hist-4',
      payload: 'report.pdf',
      paramName: 'file',
      targetUrl: 'https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=admin&theme=dark',
      timestamp: '07:16:12',
      statusCode: 200,
      statusText: 'OK (Allowed)',
      latencyMs: 16,
      responseBody: JSON.stringify({
        status: "success",
        endpoint: "/api/v1/download",
        data: {
          fileId: 1042,
          filename: "report.pdf",
          mimeType: "application/pdf",
          size: 240819,
          access: "granted",
          echoParam: {
            file: "report.pdf"
          },
          cached: true
        },
        meta: {
          server: "nginx/1.24.0",
          environment: "production",
          wafStatus: "ALLOWED_OR_BYPASS",
          timestamp: "2026-09-25T07:16:12Z"
        }
      }, null, 2)
    }
  ]);

  // --- Test History Diff State ---
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [diffLeftId, setDiffLeftId] = useState<string | undefined>(undefined);
  const [diffRightId, setDiffRightId] = useState<string | undefined>(undefined);

  const toggleSelectHistory = (id: string) => {
    setSelectedHistoryIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const openDiffModal = (leftId?: string, rightId?: string) => {
    if (leftId && rightId) {
      setDiffLeftId(leftId);
      setDiffRightId(rightId);
    } else if (selectedHistoryIds.length >= 2) {
      setDiffLeftId(selectedHistoryIds[0]);
      setDiffRightId(selectedHistoryIds[1]);
    } else if (leftId) {
      setDiffLeftId(leftId);
      const other = testHistory.find(h => h.id !== leftId);
      setDiffRightId(other?.id || testHistory[0]?.id);
    } else {
      setDiffLeftId(testHistory[1]?.id || testHistory[0]?.id);
      setDiffRightId(testHistory[0]?.id);
    }
    setIsDiffModalOpen(true);
  };

  // Execute payload test and append to history (maintaining max 10 entries)
  const executePayloadTest = (payload: string, param: string, url: string) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];

    let statusCode = 200;
    let statusText = 'OK (Allowed)';

    if (payload.includes('..') || payload.includes('%2e') || payload.includes('/etc/')) {
      statusCode = 400;
      statusText = 'Bad Request (Directory Traversal Rejected)';
    } else if (payload.includes("'") || payload.includes('OR') || payload.includes('SELECT') || payload.includes('UNION')) {
      statusCode = 403;
      statusText = 'Forbidden (WAF / SQLi Signature Intercepted)';
    } else if (payload.includes('<') || payload.includes('script') || payload.includes('onerror')) {
      statusCode = 422;
      statusText = 'Unprocessable Entity (XSS Sanitizer Blocked)';
    } else if (payload.includes(';') || payload.includes('|') || payload.includes('`')) {
      statusCode = 403;
      statusText = 'Forbidden (Command Chaining Blocked)';
    }

    const responseBody = generateSimulatedResponseBody(payload, param, statusCode, statusText);

    const newItem: FuzzTestHistoryItem = {
      id: 'hist-' + Date.now(),
      payload,
      paramName: param,
      targetUrl: url,
      timestamp,
      statusCode,
      statusText,
      latencyMs: Math.floor(Math.random() * 45) + 15,
      responseBody
    };

    setTestHistory(prev => [newItem, ...prev].slice(0, 10));
    showToast(`Teste executado: Status ${statusCode} (${statusText})`);
  };

  // Pre-execution structural syntax check state
  const [pendingTest, setPendingTest] = useState<{
    payload: string;
    param: string;
    url: string;
    validation: ValidationResult;
  } | null>(null);

  // Request test execution with structural syntax validation
  const handleRequestTest = (payload: string, param: string, url: string, skipValidation = false) => {
    if (!skipValidation) {
      const validation = validatePayloadSyntax(payload, selectedFuzzVector);
      if (validation.hasErrors) {
        setPendingTest({
          payload,
          param,
          url,
          validation
        });
        return;
      }
    }
    executePayloadTest(payload, param, url);
  };

  // Inspect syntax for individual payload cards with toast notification
  const handleInspectSyntax = (payloadStr: string) => {
    const result = validatePayloadSyntax(payloadStr, selectedFuzzVector);
    if (result.hasErrors) {
      const errorMsg = result.issues.filter(i => i.type === 'ERROR').map(i => i.message).join('; ');
      showToast(`⚠️ Erro de sintaxe: ${errorMsg}`);
    } else if (result.hasWarnings) {
      showToast(`⚠️ Aviso de sintaxe: ${result.issues[0]?.message}`);
    } else {
      showToast(`✓ Sintaxe balanceada e válida (${payloadStr.length} chars)`);
    }
  };

  // Re-run test from history item
  const handleRerunTest = (item: FuzzTestHistoryItem) => {
    if (item.paramName) {
      setSelectedParam(item.paramName);
    }
    handleRequestTest(item.payload, item.paramName, item.targetUrl);
    showToast(`Re-executando teste para o parâmetro [${item.paramName}]`);
  };

  // Clear test history
  const handleClearHistory = () => {
    setTestHistory([]);
    showToast('Histórico de testes limpo com sucesso.');
  };

  // UI Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle Category
  const toggleCategory = (cat: FuzzCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Toggle Mutation
  const toggleMutation = (mut: MutationType) => {
    setSelectedMutations(prev => {
      const next = new Set(prev);
      if (next.has(mut)) {
        if (next.size > 1) next.delete(mut);
      } else {
        next.add(mut);
      }
      return next;
    });
  };

  // Toggle Traversal Depth
  const toggleDepth = (d: number) => {
    setTraversalDepths(prev => {
      if (prev.includes(d)) {
        if (prev.length > 1) return prev.filter(x => x !== d);
        return prev;
      }
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  // Toggle Traversal Encoding
  const toggleTraversalEncoding = (id: string) => {
    setSelectedTraversalEncodings(prev => {
      if (prev.includes(id)) {
        if (prev.length > 1) return prev.filter(x => x !== id);
        return prev;
      }
      return [...prev, id];
    });
  };

  // Toggle Target File
  const toggleTargetFile = (id: string) => {
    setSelectedTargetFiles(prev => {
      if (prev.includes(id)) {
        if (prev.length > 1) return prev.filter(x => x !== id);
        return prev;
      }
      return [...prev, id];
    });
  };

  // Add parameter to URL helper
  const handleAddParamToUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParamKey.trim()) return;

    const key = newParamKey.trim();
    const val = newParamVal.trim() || 'value';

    const hasQuery = targetUrl.includes('?');
    const separator = hasQuery ? '&' : '?';
    const updatedUrl = `${targetUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    
    setTargetUrl(updatedUrl);
    setSelectedParam(key);
    setNewParamKey('');
    setNewParamVal('');
    showToast(`Parâmetro '${key}' adicionado à URL!`);
  };

  // Quick Preset Handlers for URL Parameters
  const handleApplyUrlParamPreset = (type: 'lfi' | 'waf-bypass' | 'null-byte' | 'sqli' | 'ssrf') => {
    switch (type) {
      case 'lfi':
        setTargetUrl('https://alvo-bugbounty.com/api/v1/download?file=report.pdf&lang=pt-BR');
        setSelectedParam('file');
        setSelectedCategories(new Set<FuzzCategory>(['PATH_TRAVERSAL']));
        setSelectedFuzzVector('PATH_TRAVERSAL');
        setCustomParamPayload('../../../../etc/passwd');
        setSelectedTraversalEncodings(['raw', 'full_url', 'slash_only', 'double_url', 'non_recursive']);
        setTraversalDepths([3, 6, 8, 12]);
        setIncludeNullByteSuffix(false);
        setAutoUrlEncodeCommonPayloads(true);
        showToast('Preset de Directory Traversal & LFI carregado!');
        break;

      case 'waf-bypass':
        setTargetUrl('https://alvo-bugbounty.com/api/v1/view?path=docs/readme.txt');
        setSelectedParam('path');
        setSelectedCategories(new Set<FuzzCategory>(['PATH_TRAVERSAL']));
        setSelectedFuzzVector('PATH_TRAVERSAL');
        setCustomParamPayload('%2e%2e%2f%2e%2e%2fetc/passwd');
        setSelectedTraversalEncodings(['full_url', 'double_url', 'non_recursive', 'utf8_overlong', '16bit_unicode', 'windows_full_url']);
        setTraversalDepths([6, 8, 12]);
        showToast('Preset WAF Evasion & Encodings Especiais ativado!');
        break;

      case 'null-byte':
        setTargetUrl('https://alvo-bugbounty.com/profile/avatar?image=avatar.png');
        setSelectedParam('image');
        setSelectedCategories(new Set<FuzzCategory>(['PATH_TRAVERSAL']));
        setSelectedFuzzVector('PATH_TRAVERSAL');
        setCustomParamPayload('../../../../etc/passwd%00.png');
        setIncludeNullByteSuffix(true);
        setNullByteExtension('%00.png');
        setSelectedTraversalEncodings(['raw', 'full_url', 'slash_only', 'double_url']);
        showToast('Preset de Bypass com Null-Byte (%00.png) ativado!');
        break;

      case 'sqli':
        setTargetUrl('https://alvo-bugbounty.com/api/v1/items?id=1024&category=electronics');
        setSelectedParam('id');
        setSelectedCategories(new Set<FuzzCategory>(['SQLI']));
        setSelectedFuzzVector('SQLI');
        setCustomParamPayload("' UNION SELECT 1,2,3-- ");
        setSelectedMutations(new Set<MutationType>(['raw', 'url_encode', 'double_url_encode', 'whitespace_tamper']));
        setAutoUrlEncodeCommonPayloads(true);
        showToast('Preset de SQLi em Parâmetro de URL carregado!');
        break;

      case 'ssrf':
        setTargetUrl('https://alvo-bugbounty.com/api/integrations/fetch?url=https://cdn.example.com/asset.png');
        setSelectedParam('url');
        setSelectedCategories(new Set<FuzzCategory>(['SSRF']));
        setSelectedFuzzVector('SSRF');
        setCustomParamPayload('http://169.254.169.254/latest/meta-data/');
        setSelectedMutations(new Set<MutationType>(['raw', 'url_encode']));
        setAutoUrlEncodeCommonPayloads(true);
        showToast('Preset de SSRF em Parâmetro de URL carregado!');
        break;
    }
  };

  // Add Custom Seed
  const handleAddCustomSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeedName || !newSeedPayload) return;

    const seed: FuzzSeed = {
      id: `custom-${Date.now()}`,
      category: newSeedCategory,
      name: newSeedName,
      payload: newSeedPayload,
      description: newSeedDesc || 'Custom user-provided fuzz seed',
      targetContext: 'Custom user injection point',
      severity: 'HIGH'
    };

    setCustomSeeds(prev => [...prev, seed]);
    setNewSeedName('');
    setNewSeedPayload('');
    setNewSeedDesc('');
    setShowAddSeedModal(false);
    showToast('Payload customizado adicionado com sucesso!');
  };

  // Remove Custom Seed
  const handleRemoveCustomSeed = (id: string) => {
    setCustomSeeds(prev => prev.filter(s => s.id !== id));
    showToast('Seed customizado removido.');
  };

  // Generate Items based on Active Studio Mode
  const generatedItems = useMemo<GeneratedFuzzItem[]>(() => {
    if (studioMode === 'url-param') {
      return generateUrlParamFuzzItems({
        targetUrl,
        selectedParam,
        traversalDepths,
        selectedTraversalEncodings,
        selectedTargetFiles,
        includeNullByteSuffix,
        nullByteExtension,
        autoUrlEncodeCommonPayloads,
        selectedCategories,
        selectedMutations,
        customSeeds
      });
    }

    return generateFuzzItems(
      baseString,
      placementMode,
      selectedCategories,
      selectedMutations,
      customSeeds
    );
  }, [
    studioMode,
    targetUrl,
    selectedParam,
    traversalDepths,
    selectedTraversalEncodings,
    selectedTargetFiles,
    includeNullByteSuffix,
    nullByteExtension,
    autoUrlEncodeCommonPayloads,
    baseString,
    placementMode,
    selectedCategories,
    selectedMutations,
    customSeeds
  ]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return generatedItems.filter(item => {
      const matchSearch = 
        item.fuzzedString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.techniqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalSeed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mutationLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.parameterName && item.parameterName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
      const matchSeverity = filterSeverity === 'ALL' || item.severity === filterSeverity;

      return matchSearch && matchCategory && matchSeverity;
    });
  }, [generatedItems, searchQuery, filterCategory, filterSeverity]);

  // Export to Text Wordlist (for Burp Intruder / ffuf / wfuzz)
  const handleExportTextWordlist = () => {
    const lines = filteredItems.map(item => item.fuzzedString).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-url-fuzz-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredItems.length} URLs exportadas como Wordlist (.txt)`);
  };

  // Export Raw Payloads Wordlist
  const handleExportRawPayloads = () => {
    const lines = filteredItems.map(item => item.rawPayloadOnly || item.fuzzedString).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-raw-payloads-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredItems.length} payloads brutos exportados como Wordlist (.txt)`);
  };

  // Export to JSON
  const handleExportJson = () => {
    const data = {
      generator: 'BugSentinel URL Parameter Fuzzer & Mutation Engine',
      generatedAt: new Date().toISOString(),
      mode: studioMode,
      targetUrl: studioMode === 'url-param' ? targetUrl : baseString,
      targetParameter: studioMode === 'url-param' ? selectedParam : undefined,
      totalCount: filteredItems.length,
      items: filteredItems.map(item => ({
        category: item.category,
        technique: item.techniqueName,
        mutation: item.mutationLabel,
        assembledUrl: item.fuzzedString,
        parameter: item.parameterName,
        rawPayload: item.rawPayloadOnly,
        originalSeed: item.originalSeed,
        severity: item.severity
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bugsentinel-url-fuzz-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Relatório JSON exportado (${filteredItems.length} itens)!`);
  };

  // Copy All as Wordlist
  const handleCopyAllAsWordlist = () => {
    const lines = filteredItems.map(item => item.fuzzedString).join('\n');
    handleCopy('copy-all-wordlist', lines);
  };

  // Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    generatedItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [generatedItems]);

  // Live URL preview calculation
  const livePreviewUrl = useMemo(() => {
    if (studioMode !== 'url-param' || !parsedUrl.isValidUrl) return null;
    const samplePayload = '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd';
    return reconstructUrlWithParam(parsedUrl, selectedParam, samplePayload);
  }, [studioMode, parsedUrl, selectedParam]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Payload Fuzzer & URL Parameter Engine</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-emerald-400 font-mono text-xs font-bold">
                Auto URL Encoding & Directory Traversal
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">
                {generatedItems.length} URLs Geradas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Fuzzer de Parâmetros de URL & Evasão de Filtros</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Audite parâmetros de consulta HTTP (GET/POST) com injeção seletiva, codificação automática de URL e matriz completa de travessia de diretório (<code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">../</code>, <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">%2e%2e%2f</code>, <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">..%2f</code>, <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded font-mono">....//</code>, Unicode e Null-Bytes).
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#181824] border border-[#272738] rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStudioMode('url-param')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'url-param'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>URL Parameter Fuzzing</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('template-marker')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'template-marker'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Template {`{FUZZ}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Panel */}
      {studioMode === 'url-param' ? (
        /* --- MODE 1: URL PARAMETER FUZZING WORKBENCH --- */
        <div className="space-y-6">
          {/* Target URL & Query Parameter Parser Card */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">1. URL Alvo & Seleção de Parâmetro para Fuzzing</h3>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('lfi')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-all cursor-pointer"
                >
                  📁 LFI / Traversal Pack
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('waf-bypass')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                >
                  🛡️ WAF Evasion (%2e%2e%2f)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('null-byte')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
                >
                  🚫 Null-Byte (%00.png)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('sqli')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-all cursor-pointer"
                >
                  💉 SQLi Param
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUrlParamPreset('ssrf')}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all cursor-pointer"
                >
                  🌐 SSRF Param
                </button>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-300 flex items-center justify-between">
                <span>Insira o Endpoint HTTP com Parâmetros de Consulta:</span>
                <span className="text-[10px] text-zinc-500">Ex: https://alvo.com/download?file=relatorio.pdf&id=42</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://alvo.com/api/v1/download?file=report.pdf&user=admin"
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl pl-3 pr-24 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTargetUrl('https://alvo-bugbounty.com/api/v1/download?file=report.pdf&user=admin&theme=dark');
                    setSelectedParam('file');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-[#20202e] border border-[#2d2d40] cursor-pointer"
                >
                  Restaurar
                </button>
              </div>
            </div>

            {/* Detected Parameters Selection Chips */}
            <div className="p-4 rounded-xl bg-[#171722] border border-[#252536] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Parâmetros Detectados na Query String ({parsedUrl.params.length}):
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    (Clique no parâmetro desejado para definir o alvo de injeção)
                  </span>
                </div>

                {/* Auto URL Encode toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoUrlEncodeCommonPayloads}
                    onChange={(e) => setAutoUrlEncodeCommonPayloads(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-cyan-300">
                    Auto URL Encode para caracteres especiais (%20, %22, %27, %3C, %3E)
                  </span>
                </label>
              </div>

              {parsedUrl.params.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {parsedUrl.params.map(param => {
                    const isSelected = selectedParam === param.name;
                    return (
                      <button
                        key={param.name}
                        type="button"
                        onClick={() => setSelectedParam(param.name)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-md font-bold ring-2 ring-cyan-500/30'
                            : 'bg-[#1b1b28] text-zinc-300 border-[#2a2a3e] hover:bg-[#232334] hover:border-zinc-500'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
                        <span>{param.name}</span>
                        <span className="text-[10px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded border border-zinc-700 truncate max-w-[120px]">
                          {param.value || 'vazio'}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500 text-black font-bold">
                            ALVO
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center justify-between">
                  <span>Nenhum parâmetro detectado na URL. Adicione um parâmetro abaixo para iniciar o fuzzing.</span>
                </div>
              )}

              {/* Add New Parameter Form */}
              <form onSubmit={handleAddParamToUrl} className="flex items-center gap-2 pt-2 border-t border-[#232332] flex-wrap">
                <span className="text-[11px] font-mono text-zinc-400">+ Adicionar Parâmetro:</span>
                <input
                  type="text"
                  placeholder="Nome (ex: file)"
                  value={newParamKey}
                  onChange={(e) => setNewParamKey(e.target.value)}
                  className="bg-[#12121a] border border-[#2d2d3e] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 w-32"
                />
                <span className="text-zinc-600 font-mono">=</span>
                <input
                  type="text"
                  placeholder="Valor padrão"
                  value={newParamVal}
                  onChange={(e) => setNewParamVal(e.target.value)}
                  className="bg-[#12121a] border border-[#2d2d3e] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 w-36"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-[#252536] hover:bg-[#303046] text-zinc-200 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  Adicionar
                </button>
              </form>
            </div>

            {/* Live Assembled URL Preview Box */}
            {livePreviewUrl && (
              <div className="p-3.5 rounded-xl bg-[#0e0e14] border border-[#1e1e2c] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pré-Visualização do Endpoint Fuzzed (Parâmetro Alvo: <code className="text-cyan-400">{selectedParam}</code>):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('live-preview', livePreviewUrl)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar Exemplo</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-300 break-all bg-black/50 p-2.5 rounded-lg border border-[#222230]">
                  <span>{parsedUrl.pathname}?</span>
                  {parsedUrl.params.map((p, idx) => (
                    <React.Fragment key={p.name}>
                      {idx > 0 && <span>&</span>}
                      {p.name === selectedParam ? (
                        <span className="bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40 font-bold">
                          {p.name}=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
                        </span>
                      ) : (
                        <span className="text-zinc-500">{p.name}={p.value}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Parameter Payload Injection with Syntax Highlighting */}
            <div className="pt-3 border-t border-[#1e1e2c]">
              <PayloadSyntaxInput
                value={customParamPayload}
                onChange={setCustomParamPayload}
                selectedVector={selectedFuzzVector}
                onVectorChange={setSelectedFuzzVector}
                label={`Injeção Rápida no Parâmetro '${selectedParam}' com Realce de Sintaxe`}
                sublabel={
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-zinc-400">
                      Realce dinâmico para palavras-chave (SELECT, UNION, OR 1=1, &lt;script&gt;) conforme o vetor.
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = reconstructUrlWithParam(targetUrl, selectedParam, customParamPayload);
                          setTargetUrl(updated);
                          showToast(`Payload injetado no parâmetro '${selectedParam}' da URL!`);
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                      >
                        Injetar na URL Alvo ➔
                      </button>
                      <button
                        type="button"
                        id="btn-validate-and-test-custom-param"
                        onClick={() => {
                          const updatedUrl = reconstructUrlWithParam(targetUrl, selectedParam, customParamPayload);
                          handleRequestTest(customParamPayload, selectedParam, updatedUrl);
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Verificar sintaxe estrutural e executar teste no parâmetro selecionado"
                      >
                        <Play className="w-3 h-3 text-indigo-200" />
                        <span>Validar & Testar</span>
                      </button>
                    </div>
                  </div>
                }
                placeholder="Ex: ' UNION SELECT 1,2,3-- ou <script>alert(1)</script>"
                rows={2}
              />
            </div>
          </div>

          {/* Directory Traversal & Character Encodings Specialty Controls */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">
                  2. Matriz de Directory Traversal & Codificações de Evasão (../, %2e%2e%2f, etc.)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                {selectedTraversalEncodings.length} Encodings Selecionados
              </span>
            </div>

            {/* Traversal Character Encodings Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300">
                  Variações de Codificação de Travessia (Dot-Dot-Slash & Backslash):
                </label>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedTraversalEncodings(DIRECTORY_TRAVERSAL_ENCODINGS.map(e => e.id))}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-zinc-600">/</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTraversalEncodings(['raw', 'full_url', 'slash_only', 'double_url'])}
                    className="text-zinc-400 hover:underline cursor-pointer"
                  >
                    Padrão WAF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {DIRECTORY_TRAVERSAL_ENCODINGS.map(enc => {
                  const isChecked = selectedTraversalEncodings.includes(enc.id);
                  return (
                    <button
                      key={enc.id}
                      type="button"
                      onClick={() => toggleTraversalEncoding(enc.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                        isChecked
                          ? 'bg-orange-500/10 border-orange-500/30 text-zinc-200 ring-1 ring-orange-500/20'
                          : 'bg-[#161622] border-[#222232] text-zinc-500 hover:bg-[#1b1b2a]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-orange-400' : 'bg-zinc-600'}`} />
                          <span className={isChecked ? 'text-white' : 'text-zinc-400'}>{enc.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">{enc.description}</p>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-orange-300 font-bold shrink-0 border border-zinc-700">
                        {enc.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Traversal Depths & Target Files Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-[#1e1e28]">
              {/* Depths Selector */}
              <div className="md:col-span-4 space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 block">
                  Profundidade de Recursão (Saltos):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { depth: 3, label: '3 Níveis (../../../)' },
                    { depth: 6, label: '6 Níveis (Linux Root)' },
                    { depth: 8, label: '8 Níveis (Deep Web)' },
                    { depth: 12, label: '12 Níveis (Chroot Esc)' }
                  ].map(d => {
                    const isChecked = traversalDepths.includes(d.depth);
                    return (
                      <button
                        key={d.depth}
                        type="button"
                        onClick={() => toggleDepth(d.depth)}
                        className={`p-2 rounded-xl text-center border text-xs font-mono transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-orange-500/20 text-orange-200 border-orange-500/40 font-bold'
                            : 'bg-[#161622] text-zinc-500 border-[#222232] hover:bg-[#1c1c2a]'
                        }`}
                      >
                        <div>{d.depth}x</div>
                        <div className="text-[9px] text-zinc-400 truncate">{d.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Null Byte & Suffix Bypass Control */}
                <div className="pt-3 border-t border-[#1e1e28] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeNullByteSuffix}
                      onChange={(e) => setIncludeNullByteSuffix(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      Bypass de Extensão / Null Byte:
                    </span>
                  </label>

                  {includeNullByteSuffix && (
                    <div className="space-y-1.5 pl-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['%00', '%00.png', '%00.jpg', '%2500.pdf'].map(suffix => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => setNullByteExtension(suffix)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                              nullByteExtension === suffix
                                ? 'bg-orange-500 text-black font-bold border-orange-400'
                                : 'bg-black/40 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={nullByteExtension}
                        onChange={(e) => setNullByteExtension(e.target.value)}
                        placeholder="Ex: %00.png ou %2500"
                        className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2 py-1 text-xs font-mono text-orange-300"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Target Files Selector */}
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-zinc-300">
                    Arquivos Alvo Sensíveis ({selectedTargetFiles.length} selecionados):
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedTargetFiles(COMMON_TARGET_FILES.map(f => f.id))}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-zinc-600">/</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTargetFiles(['linux-passwd', 'win-ini', 'app-env'])}
                      className="text-zinc-400 hover:underline cursor-pointer"
                    >
                      Essenciais
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {COMMON_TARGET_FILES.map(file => {
                    const isChecked = selectedTargetFiles.includes(file.id);
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => toggleTargetFile(file.id)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 text-zinc-200'
                            : 'bg-[#161622] border-[#222232] text-zinc-500 hover:bg-[#1b1b2a]'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-mono font-bold text-white truncate">{file.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{file.path}</div>
                        </div>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                          file.os === 'Linux' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          file.os === 'Windows' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {file.os}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Additional Injections: SQLi, CMDi, SSRF in URL Parameter */}
            <div className="pt-3 border-t border-[#1e1e28] space-y-2">
              <label className="text-xs font-mono font-bold text-zinc-300 block">
                Outras Categorias de Injeção em Parâmetros de URL:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {FUZZ_CATEGORIES.map(cat => {
                  const isChecked = selectedCategories.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? `${cat.badgeClass} shadow-sm`
                          : 'bg-[#161622] text-zinc-500 border-[#222232] hover:text-zinc-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-current' : 'bg-zinc-600'}`} />
                      <span>{cat.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* --- MODE 2: CLASSIC TEMPLATE {FUZZ} WORKBENCH --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Base Payload, Placement, Quick Presets */}
          <div className="lg:col-span-7 space-y-5 bg-[#121218] border border-[#22222d] rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">1. Template Base & Posição de Injeção</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBaseString('https://alvo-bugbounty.com/api/v1/search?q={FUZZ}&limit=10');
                  setPlacementMode('MARKER');
                }}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-zinc-400">Presets Rápidos de Teste:</label>
              <div className="flex items-center gap-2 flex-wrap">
                {FUZZ_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBaseString(preset.base);
                      setPlacementMode(preset.mode);
                      setSelectedCategories(new Set(preset.categories));
                      showToast(`Preset "${preset.name}" aplicado!`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#181824] hover:bg-[#222233] border border-[#2a2a3b] text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Base Template Input with Dynamic Syntax Highlighting */}
            <PayloadSyntaxInput
              value={baseString}
              onChange={setBaseString}
              selectedVector={selectedFuzzVector}
              onVectorChange={setSelectedFuzzVector}
              label="Payload Base / URL Alvo com Realce de Sintaxe"
              sublabel={
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400">
                    Insira <code className="text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded">{`{FUZZ}`}</code> para definir o ponto de injeção.
                  </span>
                  {baseString.includes('{FUZZ}') ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                      Marcador {`{FUZZ}`} detectado
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded">
                      Modo {placementMode} ativo
                    </span>
                  )}
                </div>
              }
              placeholder="Ex: https://api.alvo.com/search?q=' UNION SELECT 1,2,3-- {FUZZ}&status=active"
              rows={3}
            />

            {/* Placement Mode Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-zinc-400">Estratégia de Posicionamento:</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                {[
                  { id: 'MARKER', label: '{FUZZ} Marker', desc: 'Substitui o marcador {FUZZ}' },
                  { id: 'SUFFIX', label: 'Suffix (Append)', desc: 'Anexa ao final do texto base' },
                  { id: 'PREFIX', label: 'Prefix (Prepend)', desc: 'Insere antes do texto base' },
                  { id: 'REPLACE', label: 'Raw Only', desc: 'Apenas a injeção pura' },
                  { id: 'QUOTE_WRAP', label: 'Delim Wrap', desc: 'Envolve em aspas/concat' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPlacementMode(mode.id as PlacementMode)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      placementMode === mode.id
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm font-bold'
                        : 'bg-[#161622] text-zinc-400 border-[#232333] hover:bg-[#1d1d2c]'
                    }`}
                  >
                    <span className="text-[11px]">{mode.label}</span>
                    <span className="text-[9px] text-zinc-500 truncate max-w-full">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mutation & Evasion Strategies */}
            <div className="space-y-3 pt-2 border-t border-[#1e1e28]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mutações & Evasões ({selectedMutations.size} ativas):</span>
                </label>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedMutations(new Set(DEFAULT_MUTATION_OPTIONS.map(m => m.id)))}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    Todas
                  </button>
                  <span className="text-zinc-600">/</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMutations(new Set(['raw', 'url_encode', 'traversal_dot_slash_url']))}
                    className="text-zinc-400 hover:underline cursor-pointer"
                  >
                    Essenciais
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEFAULT_MUTATION_OPTIONS.map(mut => {
                  const isChecked = selectedMutations.has(mut.id);
                  return (
                    <button
                      key={mut.id}
                      type="button"
                      onClick={() => toggleMutation(mut.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-200'
                          : 'bg-[#161622] border-[#222232] text-zinc-500 hover:bg-[#1b1b2a]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          <span className={isChecked ? 'text-white' : 'text-zinc-400'}>{mut.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">{mut.description}</p>
                      </div>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                        {mut.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Injection Categories & Custom Seeds */}
          <div className="lg:col-span-5 space-y-5 bg-[#121218] border border-[#22222d] rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">2. Categorias de Vulnerabilidade</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedCategories.size} de {FUZZ_CATEGORIES.length} selecionadas
              </span>
            </div>

            <div className="space-y-2">
              {FUZZ_CATEGORIES.map(cat => {
                const isChecked = selectedCategories.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked
                        ? 'bg-[#171722] border-zinc-600 shadow-sm'
                        : 'bg-[#14141d] border-[#20202d] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isChecked ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                        <span className="text-xs font-bold text-white">{cat.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                          {cat.shortLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{cat.description}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 shrink-0">
                      {DEFAULT_FUZZ_SEEDS.filter(s => s.category === cat.id).length} seeds
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Seeds Section */}
            <div className="pt-3 border-t border-[#1e1e28] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    Seeds Customizados ({customSeeds.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSeedModal(true)}
                  className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo Seed</span>
                </button>
              </div>

              {customSeeds.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {customSeeds.map(seed => (
                    <div
                      key={seed.id}
                      className="p-2 rounded-lg bg-[#181824] border border-[#252538] flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div className="truncate">
                        <span className="text-white font-bold">{seed.name}: </span>
                        <code className="text-amber-300">{seed.payload}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSeed(seed.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#151520] border border-dashed border-[#252535] text-center text-zinc-500 text-[11px] font-mono">
                  Nenhum seed customizado adicionado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generated Workbench & Output Results */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e1e28]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Resultados Gerados ({filteredItems.length} de {generatedItems.length})</span>
            </h3>
            <span className="text-zinc-500">•</span>
            <span className="text-xs font-mono text-zinc-400">
              {studioMode === 'url-param' ? `Alvo: Parâmetro [${selectedParam}]` : 'Modo Template'}
            </span>
          </div>

          {/* Bulk Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAllAsWordlist}
              className="px-3 py-1.5 rounded-xl bg-[#1a1a26] hover:bg-[#232336] border border-[#2c2c40] text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar todas as URLs geradas como wordlist"
            >
              {copiedKey === 'copy-all-wordlist' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar URLs (Wordlist)</span>
            </button>

            <button
              type="button"
              onClick={handleExportRawPayloads}
              className="px-3 py-1.5 rounded-xl bg-[#1a1a26] hover:bg-[#232336] border border-[#2c2c40] text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Exportar apenas os payloads do parâmetro"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Payloads Brutos (.txt)</span>
            </button>

            <button
              type="button"
              onClick={handleExportTextWordlist}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar URLs (.txt)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por URL fuzzed, técnica, encoding (%2e%2e%2f), arquivo alvo..."
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas as Categorias ({generatedItems.length})</option>
              {FUZZ_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({categoryCounts[c.id] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas as Severidades</option>
              <option value="CRITICAL">Apenas Críticas (CRITICAL)</option>
              <option value="HIGH">Apenas Altas (HIGH)</option>
              <option value="MEDIUM">Apenas Médias (MEDIUM)</option>
            </select>
          </div>
        </div>

        {/* Generated Items List */}
        {filteredItems.length > 0 ? (
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredItems.map((item, idx) => {
              const isUrl = item.fuzzedString.startsWith('http://') || item.fuzzedString.startsWith('https://');
              return (
                <div
                  key={item.id}
                  className="bg-[#151520] border border-[#232333] hover:border-zinc-700 rounded-xl p-3.5 transition-all space-y-2.5 group"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        item.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        item.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {item.categoryLabel}
                      </span>

                      {item.parameterName && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          Param: [{item.parameterName}]
                        </span>
                      )}

                      <span className="text-xs font-bold text-white">{item.techniqueName}</span>

                      {item.encodingApplied && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-300 border border-orange-500/25">
                          {item.encodingApplied}
                        </span>
                      )}
                    </div>

                    {/* Actions per item */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">{item.length} chars</span>
                      
                      {/* Copy Assembled URL */}
                      <button
                        type="button"
                        onClick={() => handleCopy(`fuzz-${item.id}`, item.fuzzedString)}
                        className="px-2.5 py-1 rounded-lg bg-[#1f1f2e] hover:bg-[#2a2a3e] text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar URL completa fuzzed"
                      >
                        {copiedKey === `fuzz-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copiar URL</span>
                      </button>

                      {/* Copy Raw Parameter Payload */}
                      {item.rawPayloadOnly && (
                        <button
                          type="button"
                          onClick={() => handleCopy(`raw-${item.id}`, item.rawPayloadOnly!)}
                          className="px-2 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] text-zinc-400 hover:text-zinc-200 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copiar apenas o payload injetado"
                        >
                          {copiedKey === `raw-${item.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Code2 className="w-3 h-3" />
                          )}
                          <span className="hidden md:inline">Payload</span>
                        </button>
                      )}

                      {/* Quick Structural Syntax Inspection Button */}
                      <button
                        type="button"
                        onClick={() => handleInspectSyntax(item.rawPayloadOnly || item.fuzzedString)}
                        className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Verificar sintaxe estrutural (aspas, parênteses, delimitadores)"
                      >
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        <span className="hidden md:inline">Validar</span>
                      </button>

                      {/* Execute Test & Log in History (with Structural Syntax Check) */}
                      <button
                        type="button"
                        onClick={() => handleRequestTest(item.rawPayloadOnly || item.fuzzedString, selectedParam, item.fuzzedString)}
                        className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Executar teste deste payload com validação prévia de sintaxe"
                      >
                        <Play className="w-3 h-3 text-indigo-400" />
                        <span className="hidden md:inline">Testar</span>
                      </button>

                      {/* Send to PoC Builder */}
                      {onSendToPocBuilder && isUrl && (
                        <button
                          type="button"
                          onClick={() => onSendToPocBuilder(item.fuzzedString, '')}
                          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Enviar esta URL para o PoC Request Builder"
                        >
                          <Send className="w-3 h-3 text-amber-400" />
                          <span className="hidden md:inline">PoC</span>
                        </button>
                      )}

                      {/* Audit against Defensive Workbench */}
                      {onNavigateToDefense && (
                        <button
                          type="button"
                          onClick={() => onNavigateToDefense(item.rawPayloadOnly || item.fuzzedString)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Auditar este payload contra filtros defensivos e WAF"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span className="hidden md:inline">Defesa</span>
                        </button>
                      )}

                      {/* Test in Browser */}
                      {isUrl && (
                        <a
                          href={item.fuzzedString}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center gap-1 transition-colors"
                          title="Testar requisição GET no navegador"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Assembled Output Codebox with Highlighted Injection */}
                  <div className="bg-[#0b0b10] border border-[#1b1b26] rounded-lg p-2.5 font-mono text-xs text-amber-300 break-all select-all flex items-start justify-between gap-3">
                    <span>{item.fuzzedString}</span>
                  </div>

                  {/* Description & Seed Meta */}
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between gap-3 pt-0.5">
                    <span className="truncate">{item.description}</span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      Seed base: <code className="text-zinc-400">{item.originalSeed}</code>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#151520] border border-dashed border-[#282838] rounded-xl p-8 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Nenhum payload correspondente encontrado</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Ajuste sua busca textual ou marque mais encodings e arquivos alvo no painel acima.
            </p>
          </div>
        )}
      </div>

      {/* Test History Section (Last 10 Payloads Tested) */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e1e28]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Histórico de Testes Internos ({testHistory.length}/10)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Estado do Componente
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {testHistory.length >= 2 && (
              <button
                type="button"
                id="btn-diff-history-compare"
                onClick={() => openDiffModal()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 active:scale-[0.98] text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Comparar corpo de resposta de dois testes do histórico lado a lado (Side-by-Side Diff)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                <span>Comparar Respostas (Diff)</span>
                {selectedHistoryIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-black text-[9px] font-black">
                    {selectedHistoryIds.length}/2
                  </span>
                )}
              </button>
            )}

            {testHistory.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-2.5 py-1.5 rounded-lg bg-[#181824] hover:bg-[#202030] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
              >
                Limpar Histórico
              </button>
            )}
          </div>
        </div>

        {testHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#161622] border-b border-[#22222f] text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center" title="Selecionar até 2 testes para comparar lado a lado">
                    Diff
                  </th>
                  <th className="py-2.5 px-3">Horário</th>
                  <th className="py-2.5 px-3">Parâmetro / Alvo</th>
                  <th className="py-2.5 px-3">Payload Testado</th>
                  <th className="py-2.5 px-3">Status Code</th>
                  <th className="py-2.5 px-3">Latência</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c28] text-xs font-mono">
                {testHistory.map((item) => {
                  const isBlocked = item.statusCode === 403 || item.statusCode === 400;
                  const isSanitized = item.statusCode === 422;
                  const isOk = item.statusCode === 200;
                  const isChecked = selectedHistoryIds.includes(item.id);

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${
                        isChecked ? 'bg-cyan-950/20' : 'hover:bg-[#161622]'
                      }`}
                    >
                      {/* Diff Selection Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          id={`chk-diff-${item.id}`}
                          checked={isChecked}
                          onChange={() => toggleSelectHistory(item.id)}
                          className="rounded bg-[#181824] border-[#2c2c3e] text-cyan-500 focus:ring-cyan-500/30 cursor-pointer w-3.5 h-3.5"
                          title="Marcar este teste para comparar (escolha até 2)"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#1f1f2e] text-cyan-300 border border-[#2b2b3d] text-[10px] font-bold">
                          ?{item.paramName}=
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px]">
                        <div className="truncate text-amber-300 bg-[#0d0d14] px-2 py-1 rounded border border-[#1e1e2b] text-[11px]">
                          {item.payload}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isBlocked
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isSanitized
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : isOk
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}>
                          <span>HTTP {item.statusCode}</span>
                          <span className="text-[9px] opacity-80">({item.statusText.split(' ')[0]})</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500 text-[11px] whitespace-nowrap">
                        {item.latencyMs}ms
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dedicated Diff Button */}
                          <button
                            type="button"
                            onClick={() => openDiffModal(item.id)}
                            className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Comparar corpo da resposta HTTP deste teste com outro no modo lado a lado (Diff)"
                          >
                            <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                            <span>Diff</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(`hist-copy-${item.id}`, item.payload)}
                            className="p-1 rounded hover:bg-[#202030] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Copiar payload"
                          >
                            {copiedKey === `hist-copy-${item.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRerunTest(item)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Re-executar este teste imediatamente"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-executar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#151520] border border-dashed border-[#282838] rounded-xl p-6 text-center text-zinc-500 text-xs font-mono">
            Nenhum teste executado ainda. Clique em "Testar" em qualquer payload gerado para registrar no histórico.
          </div>
        )}
      </div>

      {/* Add Custom Seed Modal */}
      {showAddSeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151520] border border-[#2a2a3b] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#232332] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Adicionar Seed Customizado</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSeedModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleAddCustomSeed} className="space-y-3">
              <div>
                <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Nome do Vetor / Técnica:</label>
                <input
                  type="text"
                  required
                  value={newSeedName}
                  onChange={(e) => setNewSeedName(e.target.value)}
                  placeholder="Ex: Custom Traversal bypass Nginx"
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Categoria:</label>
                  <select
                    value={newSeedCategory}
                    onChange={(e) => setNewSeedCategory(e.target.value as FuzzCategory)}
                    className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  >
                    {FUZZ_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-zinc-300 block mb-1">Contexto Alvo:</label>
                  <input
                    type="text"
                    value={newSeedDesc}
                    onChange={(e) => setNewSeedDesc(e.target.value)}
                    placeholder="Ex: Parâmetro file de download"
                    className="w-full bg-[#171722] border border-[#2a2a3b] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <PayloadSyntaxInput
                value={newSeedPayload}
                onChange={setNewSeedPayload}
                selectedVector={newSeedCategory}
                onVectorChange={(v) => {
                  if (v !== 'AUTO') setNewSeedCategory(v);
                }}
                label="Payload String com Realce de Sintaxe"
                sublabel={
                  <span className="text-zinc-400">
                    Palavras-chave destacadas para o vetor <strong className="text-amber-300 font-mono">{newSeedCategory}</strong>
                  </span>
                }
                placeholder={
                  newSeedCategory === 'SQLI' ? "' UNION SELECT 1,2,3-- " :
                  newSeedCategory === 'XSS' ? "<script>alert(1)</script>" :
                  newSeedCategory === 'COMMAND_INJECTION' ? "; cat /etc/passwd" :
                  "%2e%2e%2f%2e%2e%2fetc/passwd"
                }
                rows={2}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232332]">
                <button
                  type="button"
                  onClick={() => setShowAddSeedModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Salvar Seed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Execution Structural Syntax Validation Alert Modal */}
      {pendingTest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151520] border border-rose-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#232332] pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Aviso: Erros de Sintaxe Estrutural Detectados
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingTest(null)}
                className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs font-mono text-rose-200 space-y-2.5">
              <p className="text-[11px] text-zinc-300">
                O payload selecionado possui problemas estruturais de sintaxe (como aspas ou delimitadores não balanceados) que podem invalidar ou desvirtuar o teste no servidor alvo:
              </p>

              <div className="bg-[#0b0b12] p-2.5 rounded-lg border border-[#20202e] text-amber-300 break-all select-all font-mono text-[11px]">
                {pendingTest.payload}
              </div>

              <div className="space-y-1.5 pt-1">
                {pendingTest.validation.issues.filter(i => i.type === 'ERROR').map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-300">
                    <span className="font-bold text-rose-400">•</span>
                    <div>
                      <span className="font-bold text-white">{issue.message}</span>
                      {issue.detail && <p className="text-[10px] text-zinc-400 mt-0.5">{issue.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-[#232332]">
              <button
                type="button"
                onClick={() => setPendingTest(null)}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              {pendingTest.validation.issues.some(i => i.fixSuggestion) && (
                <button
                  type="button"
                  onClick={() => {
                    let fixed = pendingTest.payload;
                    pendingTest.validation.issues.forEach(i => {
                      if (i.fixSuggestion) {
                        fixed = i.fixSuggestion.applyFix(fixed);
                      }
                    });
                    const fixedUrl = pendingTest.url.includes(pendingTest.payload)
                      ? pendingTest.url.replace(pendingTest.payload, encodeURIComponent(fixed))
                      : pendingTest.url;
                    const { param } = pendingTest;
                    setPendingTest(null);
                    showToast('Payload corrigido automaticamente e executado!');
                    executePayloadTest(fixed, param, fixedUrl);
                  }}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Corrigir & Executar</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const { payload, param, url } = pendingTest;
                  setPendingTest(null);
                  executePayloadTest(payload, param, url);
                }}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Executar mesmo com erro sintático para testar resiliência ou tratamento de erro do servidor"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Executar Mesmo Assim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side HTTP Response Diff Modal */}
      {isDiffModalOpen && (
        <PayloadDiffModal
          history={testHistory}
          initialLeftId={diffLeftId}
          initialRightId={diffRightId}
          onClose={() => setIsDiffModalOpen(false)}
        />
      )}
    </div>
  );
};
