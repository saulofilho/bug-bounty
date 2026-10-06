import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUserWithEmail,
  signInWithPopup as fbSignInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseSDKUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, testConnection, isRealFirebaseConfigured } from '../services/firebase';

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
  providerId: 'password' | 'google.com' | 'demo';
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
  isCloudConnected: boolean;
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

const LOCAL_STORAGE_SESSION_KEY = 'firebase_auth_simulated_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<AuthPromptReason>('general');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Test Firestore connection on mount
  useEffect(() => {
    testConnection().then(() => {
      setIsCloudConnected(true);
    }).catch(() => {
      setIsCloudConnected(false);
    });
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseSDKUser | null) => {
      if (fbUser) {
        // Build or fetch user profile
        let userRole: UserRole = fbUser.email === 'oisaulofilho@gmail.com' ? 'admin' : 'researcher';
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.role) userRole = data.role as UserRole;
          } else {
            // Create user document in Firestore
            await setDoc(userDocRef, {
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Hunter',
              role: userRole,
              photoURL: fbUser.photoURL || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('Could not sync user document to Firestore:', e);
        }

        const appUser: FirebaseUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Hunter',
          photoURL: fbUser.photoURL || undefined,
          role: userRole,
          emailVerified: fbUser.emailVerified,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          providerId: fbUser.providerData[0]?.providerId === 'google.com' ? 'google.com' : 'password'
        };

        setCurrentUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(appUser));
      } else {
        // Fallback: check if session in localStorage
        const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (!isRealFirebaseConfigured || parsed.providerId === 'demo') {
              setCurrentUser(parsed);
            } else {
              setCurrentUser(null);
            }
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Sign in with Email and Password (Firebase Auth + Demo Accounts)
  const signInWithEmailAndPassword = async (email: string, password: string): Promise<FirebaseUser> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      throw new Error('Email e senha são obrigatórios.');
    }

    // Check if it's one of the preconfigured demo accounts
    const demo = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === trimmedEmail);
    if (demo) {
      if (demo.password !== password) {
        throw new Error('Senha incorreta para esta conta de demonstração.');
      }
      const demoUser: FirebaseUser = {
        uid: `uid_demo_${demo.role}_${trimmedEmail.replace(/[^a-z0-9]/g, '')}`,
        email: trimmedEmail,
        displayName: demo.displayName,
        role: demo.role,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'demo'
      };
      setCurrentUser(demoUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(demoUser));
      setAuthModalOpen(false);
      executePending();
      return demoUser;
    }

    // If cloud Firebase is not configured with real API key, handle locally
    if (!isRealFirebaseConfigured) {
      const role: UserRole = (trimmedEmail === 'oisaulofilho@gmail.com' || trimmedEmail.includes('admin')) ? 'admin' : 'researcher';
      const localUser: FirebaseUser = {
        uid: `local_user_${trimmedEmail.replace(/[^a-z0-9]/g, '_')}`,
        email: trimmedEmail,
        displayName: trimmedEmail.split('@')[0],
        role,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'password'
      };
      setCurrentUser(localUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(localUser));
      setAuthModalOpen(false);
      executePending();
      return localUser;
    }

    // Attempt Firebase Authentication
    try {
      const cred = await fbSignInWithEmail(auth, trimmedEmail, password);
      const user = cred.user;
      const role: UserRole = trimmedEmail === 'oisaulofilho@gmail.com' ? 'admin' : (trimmedEmail.includes('admin') ? 'admin' : 'researcher');
      const appUser: FirebaseUser = {
        uid: user.uid,
        email: user.email || trimmedEmail,
        displayName: user.displayName || trimmedEmail.split('@')[0],
        role,
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'password'
      };
      setCurrentUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(appUser));
      setAuthModalOpen(false);
      executePending();
      return appUser;
    } catch (fbErr: any) {
      // If user not found or auth fails, throw clear error
      if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
        throw new Error('Credenciais inválidas. Verifique seu e-mail e senha ou clique em "Criar Nova Conta".');
      } else if (fbErr.code === 'auth/wrong-password') {
        throw new Error('Senha incorreta para este usuário.');
      }
      throw new Error(fbErr.message || 'Erro de autenticação no Firebase.');
    }
  };

  // Create User with Email and Password
  const createUserWithEmailAndPassword = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'researcher'
  ): Promise<FirebaseUser> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      throw new Error('Preencha todos os campos obrigatórios.');
    }
    if (password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    if (!isRealFirebaseConfigured) {
      const finalRole: UserRole = trimmedEmail === 'oisaulofilho@gmail.com' || trimmedEmail.includes('admin') ? 'admin' : role;
      const localUser: FirebaseUser = {
        uid: `local_user_${Date.now()}_${trimmedEmail.replace(/[^a-z0-9]/g, '_')}`,
        email: trimmedEmail,
        displayName: displayName.trim() || trimmedEmail.split('@')[0],
        role: finalRole,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'password'
      };
      setCurrentUser(localUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(localUser));
      setAuthModalOpen(false);
      executePending();
      return localUser;
    }

    try {
      const cred = await fbCreateUserWithEmail(auth, trimmedEmail, password);
      const user = cred.user;
      const finalRole: UserRole = trimmedEmail === 'oisaulofilho@gmail.com' ? 'admin' : role;
      const appUser: FirebaseUser = {
        uid: user.uid,
        email: user.email || trimmedEmail,
        displayName: displayName.trim() || trimmedEmail.split('@')[0],
        role: finalRole,
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'password'
      };

      // Save user profile to Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: appUser.email,
          displayName: appUser.displayName,
          role: appUser.role,
          createdAt: appUser.createdAt,
          lastLoginAt: appUser.lastLoginAt
        });
      } catch (err) {
        console.warn('Error saving new user document to Firestore:', err);
      }

      setCurrentUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(appUser));
      setAuthModalOpen(false);
      executePending();
      return appUser;
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error('Este endereço de e-mail já está cadastrado. Tente fazer login.');
      }
      throw new Error(fbErr.message || 'Falha ao criar conta no Firebase.');
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<FirebaseUser> => {
    if (!isRealFirebaseConfigured) {
      const localUser: FirebaseUser = {
        uid: 'google_lead_admin_saulo',
        email: 'oisaulofilho@gmail.com',
        displayName: 'Saulo Filho (Security Lead)',
        role: 'admin',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'google.com'
      };
      setCurrentUser(localUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(localUser));
      setAuthModalOpen(false);
      executePending();
      return localUser;
    }

    try {
      const cred = await fbSignInWithPopup(auth, googleProvider);
      const user = cred.user;
      const role: UserRole = user.email === 'oisaulofilho@gmail.com' ? 'admin' : 'researcher';
      const appUser: FirebaseUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Hunter',
        photoURL: user.photoURL || undefined,
        role,
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        providerId: 'google.com'
      };

      try {
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: appUser.email,
          displayName: appUser.displayName,
          photoURL: appUser.photoURL || '',
          role: appUser.role,
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Error saving Google user to Firestore:', e);
      }

      setCurrentUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(appUser));
      setAuthModalOpen(false);
      executePending();
      return appUser;
    } catch (err: any) {
      throw new Error(err.message || 'Erro na autenticação com Google.');
    }
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    setCurrentUser(null);
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
        isCloudConnected,
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
