import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'admin' | 'researcher' | 'analyst';

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  providerId: 'password' | 'google.com';
}

export interface DemoAccount {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  description: string;
  badgeColor: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@bugsentinel.sec',
    password: 'adminPassword123!',
    displayName: 'Alex Thorne (Admin Lead)',
    role: 'admin',
    description: 'Acesso total: visualiza, cria, edita, deleta relatórios e gerencia alvos',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
  },
  {
    email: 'researcher@hackerone.io',
    password: 'hunterPassword123!',
    displayName: 'Sarah Lin (Security Hunter)',
    role: 'researcher',
    description: 'Pesquisadora: descobre falhas, submete PoCs e calcula scores CVSS',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    email: 'analyst@bugcrowd.team',
    password: 'triagePassword123!',
    displayName: 'Carlos Mendes (Triage Analyst)',
    role: 'analyst',
    description: 'Analista: revisa relatórios, valida reprodução e atualiza status de triagem',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  }
];

export type AuthPromptReason = 'view' | 'edit' | 'create' | 'delete' | 'general';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  authModalOpen: boolean;
  authModalReason: AuthPromptReason;
  pendingCallback: (() => void) | null;
  openLoginModal: (reason?: AuthPromptReason, onAuthSuccess?: () => void) => void;
  closeLoginModal: () => void;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<FirebaseUser>;
  createUserWithEmailAndPassword: (email: string, password: string, displayName: string, role?: UserRole) => Promise<FirebaseUser>;
  signInWithGoogle: () => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  switchDemoAccount: (role: UserRole) => Promise<FirebaseUser>;
  canEditReports: boolean;
  canDeleteReports: boolean;
  canViewReports: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'firebase_auth_simulated_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<AuthPromptReason>('general');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Load session from local storage on mount (emulating Firebase Auth persistent state)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user: FirebaseUser = JSON.parse(stored);
        setCurrentUser(user);
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão Firebase Auth:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUserSession = (user: FirebaseUser | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setCurrentUser(user);
  };

  const openLoginModal = useCallback((reason: AuthPromptReason = 'general', onAuthSuccess?: () => void) => {
    setAuthModalReason(reason);
    if (onAuthSuccess) {
      setPendingCallback(() => onAuthSuccess);
    } else {
      setPendingCallback(null);
    }
    setAuthModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setAuthModalOpen(false);
    setPendingCallback(null);
  }, []);

  const executePending = () => {
    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      setTimeout(() => cb(), 100);
    }
  };

  // Emulate Firebase signInWithEmailAndPassword
  const signInWithEmailAndPassword = async (email: string, password: string): Promise<FirebaseUser> => {
    // Artificial micro-latency to simulate network roundtrip to Firebase Auth
    await new Promise(resolve => setTimeout(resolve, 450));

    const trimmedEmail = email.trim().toLowerCase();
    const demo = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === trimmedEmail);

    if (!trimmedEmail || !password) {
      throw new Error('auth/missing-credentials: Email e senha são obrigatórios.');
    }

    if (demo && demo.password !== password) {
      throw new Error('auth/wrong-password: Senha incorreta para esta conta de segurança.');
    }

    const role: UserRole = demo ? demo.role : (trimmedEmail.includes('admin') ? 'admin' : 'researcher');
    const displayName = demo ? demo.displayName : trimmedEmail.split('@')[0].replace('.', ' ').toUpperCase();

    const user: FirebaseUser = {
      uid: demo ? `uid_${demo.role}_${trimmedEmail.replace(/[^a-z0-9]/g, '')}` : `uid_user_${Date.now()}`,
      email: trimmedEmail,
      displayName,
      role,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      providerId: 'password'
    };

    saveUserSession(user);
    setAuthModalOpen(false);
    executePending();
    return user;
  };

  // Emulate Firebase createUserWithEmailAndPassword
  const createUserWithEmailAndPassword = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'researcher'
  ): Promise<FirebaseUser> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      throw new Error('auth/invalid-email-or-password: Preencha todos os campos obrigatórios.');
    }
    if (password.length < 6) {
      throw new Error('auth/weak-password: A senha deve conter no mínimo 6 caracteres.');
    }

    const user: FirebaseUser = {
      uid: `uid_user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: trimmedEmail,
      displayName: displayName.trim() || trimmedEmail.split('@')[0],
      role,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      providerId: 'password'
    };

    saveUserSession(user);
    setAuthModalOpen(false);
    executePending();
    return user;
  };

  // Emulate Firebase Google Auth Provider signInWithPopup
  const signInWithGoogle = async (): Promise<FirebaseUser> => {
    await new Promise(resolve => setTimeout(resolve, 400));

    const user: FirebaseUser = {
      uid: `uid_google_${Date.now()}`,
      email: 'hacker.ethical@gmail.com',
      displayName: 'Ethical Security Researcher',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      role: 'admin',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      providerId: 'google.com'
    };

    saveUserSession(user);
    setAuthModalOpen(false);
    executePending();
    return user;
  };

  // Emulate Firebase signOut
  const signOut = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    saveUserSession(null);
  };

  // Switch demo account directly
  const switchDemoAccount = async (role: UserRole): Promise<FirebaseUser> => {
    const demo = DEMO_ACCOUNTS.find(d => d.role === role) || DEMO_ACCOUNTS[0];
    return signInWithEmailAndPassword(demo.email, demo.password);
  };

  const isAuthenticated = !!currentUser;
  const canEditReports = isAuthenticated && (currentUser?.role === 'admin' || currentUser?.role === 'researcher');
  const canDeleteReports = isAuthenticated && currentUser?.role === 'admin';
  const canViewReports = isAuthenticated;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loading,
        authModalOpen,
        authModalReason,
        pendingCallback,
        openLoginModal,
        closeLoginModal,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signInWithGoogle,
        signOut,
        switchDemoAccount,
        canEditReports,
        canDeleteReports,
        canViewReports
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
