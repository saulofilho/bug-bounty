import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

export type AppLanguage = 'pt-BR' | 'en-US' | 'es-ES';

export interface LanguageOption {
  code: AppLanguage;
  shortLabel: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'pt-BR', shortLabel: 'PT', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en-US', shortLabel: 'EN', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', shortLabel: 'ES', name: 'Español (ES)', flag: '🇪🇸' }
];

export const LANGUAGE_STORAGE_KEY = 'bbm_app_language';
export const APP_ICON_URL_STORAGE_KEY = 'bbm_app_icon_url';
export const DEFAULT_APP_ICON_URL = '/icon.svg';

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  'pt-BR': {
    'nav.dashboard': 'Dashboard',
    'nav.reports': 'Relatórios',
    'nav.cve': 'CVE-DB',
    'nav.targets': 'Programas',
    'nav.docs': 'Biblioteca',
    'nav.platforms': 'Sites & Ganhos',
    'nav.platformsShort': 'Sites',
    'nav.threatIntel': 'Threat Intel',
    'nav.notifications': 'Notificações',
    'nav.alertsShort': 'Alertas',
    'nav.tools': 'Ferramentas AppSec',
    'header.searchPlaceholder': 'Buscar alvo, CVE...',
    'header.addTarget': 'Novo Alvo',
    'header.signPgp': 'Assinar PGP',
    'header.cvssCalc': 'Calc CVSS',
    'header.mockActive': 'Mock Ativo',
    'header.mockEmpty': 'Plataforma Zerada',
    'header.settings': 'Configurações',
    'header.newReport': 'Novo Relatório',
    'header.newShort': 'Novo',
    'header.themeLight': 'Claro',
    'header.themeDark': 'Escuro',
    'header.bountyBalance': 'Saldo de Bounties',
    'lang.label': 'Idioma',
    'lang.changed': 'Idioma alterado para Português (BR)',
    'icon.label': 'Caminho da URL do Ícone (Icon URL Path)',
    'icon.updated': 'URL do ícone atualizada com sucesso!'
  },
  'en-US': {
    'nav.dashboard': 'Dashboard',
    'nav.reports': 'Reports',
    'nav.cve': 'CVE-DB',
    'nav.targets': 'Programs',
    'nav.docs': 'Library',
    'nav.platforms': 'Platforms & Bounties',
    'nav.platformsShort': 'Platforms',
    'nav.threatIntel': 'Threat Intel',
    'nav.notifications': 'Notifications',
    'nav.alertsShort': 'Alerts',
    'nav.tools': 'AppSec Tools',
    'header.searchPlaceholder': 'Search target, CVE...',
    'header.addTarget': 'Add Target',
    'header.signPgp': 'Sign PGP',
    'header.cvssCalc': 'CVSS Calc',
    'header.mockActive': 'Mock Active',
    'header.mockEmpty': 'Clean Workspace',
    'header.settings': 'Settings',
    'header.newReport': 'New Report',
    'header.newShort': 'New',
    'header.themeLight': 'Light',
    'header.themeDark': 'Dark',
    'header.bountyBalance': 'Bounty Balance',
    'lang.label': 'Language',
    'lang.changed': 'Language switched to English (US)',
    'icon.label': 'Icon URL Path',
    'icon.updated': 'Icon URL path updated successfully!'
  },
  'es-ES': {
    'nav.dashboard': 'Panel',
    'nav.reports': 'Reportes',
    'nav.cve': 'CVE-DB',
    'nav.targets': 'Programas',
    'nav.docs': 'Biblioteca',
    'nav.platforms': 'Sitios y Pagos',
    'nav.platformsShort': 'Sitios',
    'nav.threatIntel': 'Threat Intel',
    'nav.notifications': 'Notificaciones',
    'nav.alertsShort': 'Alertas',
    'nav.tools': 'Herramientas AppSec',
    'header.searchPlaceholder': 'Buscar objetivo, CVE...',
    'header.addTarget': 'Nuevo Objetivo',
    'header.signPgp': 'Firmar PGP',
    'header.cvssCalc': 'Calc CVSS',
    'header.mockActive': 'Mock Activo',
    'header.mockEmpty': 'Entorno Limpio',
    'header.settings': 'Ajustes',
    'header.newReport': 'Nuevo Reporte',
    'header.newShort': 'Nuevo',
    'header.themeLight': 'Claro',
    'header.themeDark': 'Oscuro',
    'header.bountyBalance': 'Balance de Bounties',
    'lang.label': 'Idioma',
    'lang.changed': 'Idioma cambiado a Español (ES)',
    'icon.label': 'Ruta URL del Icono (Icon URL Path)',
    'icon.updated': '¡Ruta del icono actualizada con éxito!'
  }
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  cycleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  appIconUrl: string;
  setAppIconUrl: (url: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage;
      if (saved === 'pt-BR' || saved === 'en-US' || saved === 'es-ES') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'pt-BR';
  });

  const [appIconUrl, setAppIconUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem(APP_ICON_URL_STORAGE_KEY) || DEFAULT_APP_ICON_URL;
    } catch {
      return DEFAULT_APP_ICON_URL;
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const cleanIconUrl = appIconUrl.trim() || DEFAULT_APP_ICON_URL;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = cleanIconUrl;
  }, [appIconUrl]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    toast.success(TRANSLATIONS[lang]['lang.changed'], { duration: 2200 });
  };

  const cycleLanguage = () => {
    const order: AppLanguage[] = ['pt-BR', 'en-US', 'es-ES'];
    const nextIndex = (order.indexOf(language) + 1) % order.length;
    setLanguage(order[nextIndex]);
  };

  const setAppIconUrl = (url: string) => {
    const clean = url.trim() || DEFAULT_APP_ICON_URL;
    setAppIconUrlState(clean);
    try {
      localStorage.setItem(APP_ICON_URL_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['pt-BR']?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        cycleLanguage,
        t,
        appIconUrl,
        setAppIconUrl
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
