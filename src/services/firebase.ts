import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support runtime environment variables with fallback to sanitized config file
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const envApiKey = metaEnv.VITE_FIREBASE_API_KEY || '';
const rawFileKey = firebaseConfig.apiKey || '';
const resolvedApiKey = envApiKey || (rawFileKey !== 'FIREBASE_API_KEY_PLACEHOLDER' && !rawFileKey.includes('PLACEHOLDER') ? rawFileKey : 'FIREBASE_API_KEY_PLACEHOLDER');

export const isRealFirebaseConfigured = Boolean(
  envApiKey || (rawFileKey && rawFileKey !== 'FIREBASE_API_KEY_PLACEHOLDER' && !rawFileKey.includes('PLACEHOLDER'))
);

const resolvedConfig = {
  ...firebaseConfig,
  apiKey: resolvedApiKey,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId || undefined);

// Validate Connection to Firestore on startup
export async function testConnection(): Promise<boolean> {
  if (!isRealFirebaseConfigured) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
    return false;
  }
}

// Error handling conforming to Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
