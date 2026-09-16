import { ReportTemplate, Severity } from '../types';
import { INITIAL_REPORT_TEMPLATES } from '../data/initialReportTemplates';

const TEMPLATES_STORAGE_KEY = 'bugbounty_report_templates_v2';

/**
 * Retrieves all templates (built-in + custom user-created) from localStorage
 */
export function getReportTemplates(): ReportTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      // Seed with initial templates
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(INITIAL_REPORT_TEMPLATES));
      return INITIAL_REPORT_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_REPORT_TEMPLATES;
  } catch (err) {
    console.error('Error loading report templates from localStorage:', err);
    return INITIAL_REPORT_TEMPLATES;
  }
}

/**
 * Persists the entire list of templates to localStorage
 */
export function saveAllReportTemplates(templates: ReportTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving report templates to localStorage:', err);
  }
}

/**
 * Saves or updates a custom report template
 */
export function saveCustomTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt'> & { id?: string }): ReportTemplate {
  const all = getReportTemplates();
  const now = new Date().toISOString().split('T')[0];

  if (template.id && all.some(t => t.id === template.id)) {
    // Update existing
    const updatedList = all.map(t => {
      if (t.id === template.id) {
        return {
          ...t,
          ...template,
          updatedAt: now
        } as ReportTemplate;
      }
      return t;
    });
    saveAllReportTemplates(updatedList);
    return updatedList.find(t => t.id === template.id)!;
  } else {
    // Create new
    const newTemplate: ReportTemplate = {
      ...template,
      id: template.id || `tpl-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now
    };
    const updatedList = [newTemplate, ...all];
    saveAllReportTemplates(updatedList);
    return newTemplate;
  }
}

/**
 * Deletes a template by ID (custom templates only; built-ins can be hidden or removed)
 */
export function deleteReportTemplate(templateId: string): boolean {
  const all = getReportTemplates();
  const target = all.find(t => t.id === templateId);
  if (!target) return false;

  const filtered = all.filter(t => t.id !== templateId);
  saveAllReportTemplates(filtered);
  return true;
}

/**
 * Resets templates back to the default factory state
 */
export function resetReportTemplatesToDefault(): ReportTemplate[] {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(INITIAL_REPORT_TEMPLATES));
    return INITIAL_REPORT_TEMPLATES;
  } catch (err) {
    console.error('Error resetting report templates:', err);
    return INITIAL_REPORT_TEMPLATES;
  }
}

/**
 * Formats a template's strings replacing `{target}`, `{endpoint}`, `{param}` with contextual inputs
 */
export function interpolateTemplateVariables(
  text: string,
  variables: { target?: string; endpoint?: string; param?: string; resource?: string }
): string {
  if (!text) return '';
  let result = text;
  if (variables.target) {
    result = result.replace(/\{target\}/g, variables.target);
  }
  if (variables.endpoint) {
    result = result.replace(/\{endpoint\}/g, variables.endpoint);
  }
  if (variables.param) {
    result = result.replace(/\{param\}/g, variables.param);
  }
  if (variables.resource) {
    result = result.replace(/\{recurso\}/g, variables.resource);
  }
  return result;
}

/**
 * Exports templates as a formatted JSON string
 */
export function exportTemplatesToJson(): string {
  const templates = getReportTemplates();
  return JSON.stringify(templates, null, 2);
}

/**
 * Imports templates from a JSON string with schema validation
 */
export function importTemplatesFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data)) {
      return { success: false, count: 0, error: 'O arquivo JSON deve conter um array de templates.' };
    }

    const current = getReportTemplates();
    const currentIds = new Set(current.map(t => t.id));
    let importedCount = 0;

    const newItems: ReportTemplate[] = [];

    for (const item of data) {
      if (!item.name || !item.vulnerabilityType || !item.summary) {
        continue;
      }
      const safeId = item.id && !currentIds.has(item.id) 
        ? item.id 
        : `tpl-imported-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      newItems.push({
        id: safeId,
        name: String(item.name).trim(),
        description: String(item.description || ''),
        category: (item.category as any) || 'Custom',
        vulnerabilityType: String(item.vulnerabilityType).trim(),
        cwe: String(item.cwe || 'CWE-200'),
        cvssVector: String(item.cvssVector || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N'),
        cvssScore: Number(item.cvssScore) || 5.0,
        severity: (item.severity as Severity) || 'MEDIUM',
        titlePattern: String(item.titlePattern || item.name),
        summary: String(item.summary || ''),
        stepsToReproduce: Array.isArray(item.stepsToReproduce) ? item.stepsToReproduce : ['1. Identifique o alvo.'],
        proofOfConcept: String(item.proofOfConcept || ''),
        businessImpact: String(item.businessImpact || ''),
        remediation: String(item.remediation || ''),
        tags: Array.isArray(item.tags) ? item.tags : ['#template'],
        isBuiltIn: false,
        createdAt: item.createdAt || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      });
      importedCount++;
    }

    if (importedCount === 0) {
      return { success: false, count: 0, error: 'Nenhum template válido encontrado no JSON.' };
    }

    saveAllReportTemplates([...newItems, ...current]);
    return { success: true, count: importedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Erro ao processar JSON.' };
  }
}
