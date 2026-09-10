import * as openpgp from 'openpgp';

export interface PgpKeyPairInfo {
  id: string;
  name: string;
  email: string;
  armoredPublicKey: string;
  armoredPrivateKey: string;
  fingerprint: string;
  keyId: string;
  createdAt: string;
  hasPassphrase: boolean;
}

const STORAGE_KEY = 'bounty_pgp_keypairs_v1';
const ACTIVE_KEY_ID = 'bounty_pgp_active_id_v1';

export function getStoredPgpKeys(): PgpKeyPairInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load PGP keys from localStorage:', err);
    return [];
  }
}

export function saveStoredPgpKeys(keys: PgpKeyPairInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save PGP keys to localStorage:', err);
  }
}

export function getActivePgpKeyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY_ID);
  } catch {
    return null;
  }
}

export function setActivePgpKeyId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY_ID, id);
  } catch (err) {
    console.error('Failed to set active PGP key ID:', err);
  }
}

export function getActivePgpKey(): PgpKeyPairInfo | null {
  const keys = getStoredPgpKeys();
  if (keys.length === 0) return null;
  const activeId = getActivePgpKeyId();
  const found = keys.find(k => k.id === activeId);
  return found || keys[0] || null;
}

export async function generateNewPgpKey(
  name: string,
  email: string,
  passphrase?: string,
  keyAlgorithm: 'curve25519' | 'rsa' = 'curve25519'
): Promise<PgpKeyPairInfo> {
  const { privateKey, publicKey } = await openpgp.generateKey({
    userIDs: [{ name: name.trim(), email: email.trim() }],
    passphrase: passphrase && passphrase.trim().length > 0 ? passphrase.trim() : undefined,
    type: keyAlgorithm === 'rsa' ? 'rsa' : 'curve25519',
    rsaBits: keyAlgorithm === 'rsa' ? 4096 : undefined
  });

  const parsedKey = await openpgp.readKey({ armoredKey: publicKey });
  const fingerprint = parsedKey.getFingerprint().toUpperCase();
  const keyId = parsedKey.getKeyID().toHex().toUpperCase();

  const newKey: PgpKeyPairInfo = {
    id: `pgp-${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    armoredPublicKey: publicKey,
    armoredPrivateKey: privateKey,
    fingerprint,
    keyId,
    createdAt: new Date().toISOString(),
    hasPassphrase: !!(passphrase && passphrase.trim().length > 0)
  };

  const existing = getStoredPgpKeys();
  const updated = [newKey, ...existing];
  saveStoredPgpKeys(updated);
  setActivePgpKeyId(newKey.id);

  return newKey;
}

export async function importExistingPgpKey(
  name: string,
  email: string,
  armoredPrivateKey: string,
  armoredPublicKey?: string,
  passphrase?: string
): Promise<PgpKeyPairInfo> {
  let privKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey.trim() });
  
  if (passphrase && privKey.isDecrypted() === false) {
    privKey = await openpgp.decryptKey({
      privateKey: privKey,
      passphrase: passphrase.trim()
    });
  }

  let pubArmored = armoredPublicKey?.trim();
  if (!pubArmored) {
    pubArmored = privKey.toPublic().armor();
  }

  const pubKey = await openpgp.readKey({ armoredKey: pubArmored });
  const fingerprint = pubKey.getFingerprint().toUpperCase();
  const keyId = pubKey.getKeyID().toHex().toUpperCase();

  const newKey: PgpKeyPairInfo = {
    id: `pgp-${Date.now()}`,
    name: name.trim() || 'Security Researcher',
    email: email.trim() || 'security@researcher.io',
    armoredPublicKey: pubArmored,
    armoredPrivateKey: armoredPrivateKey.trim(),
    fingerprint,
    keyId,
    createdAt: new Date().toISOString(),
    hasPassphrase: !!(passphrase && passphrase.trim().length > 0)
  };

  const existing = getStoredPgpKeys();
  const updated = [newKey, ...existing];
  saveStoredPgpKeys(updated);
  setActivePgpKeyId(newKey.id);

  return newKey;
}

export async function signCleartextReport(
  text: string,
  armoredPrivateKey: string,
  passphrase?: string
): Promise<string> {
  let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey });

  if (!privateKey.isDecrypted()) {
    if (!passphrase) {
      throw new Error('Esta chave privada PGP está protegida por senha. Informe a senha para assinar.');
    }
    privateKey = await openpgp.decryptKey({
      privateKey,
      passphrase
    });
  }

  const message = await openpgp.createCleartextMessage({ text });
  const cleartextSignature = await openpgp.sign({
    message,
    signingKeys: privateKey
  });

  return cleartextSignature as string;
}

export async function signDetachedReport(
  text: string,
  armoredPrivateKey: string,
  passphrase?: string
): Promise<string> {
  let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey });

  if (!privateKey.isDecrypted()) {
    if (!passphrase) {
      throw new Error('Esta chave privada PGP está protegida por senha. Informe a senha para assinar.');
    }
    privateKey = await openpgp.decryptKey({
      privateKey,
      passphrase
    });
  }

  const message = await openpgp.createMessage({ text });
  const detachedSignature = await openpgp.sign({
    message,
    signingKeys: privateKey,
    detached: true,
    format: 'armored'
  });

  return detachedSignature as string;
}

export async function verifyCleartextSignature(
  signedArmoredText: string,
  armoredPublicKey: string
): Promise<{ verified: boolean; signerKeyId?: string; error?: string }> {
  try {
    const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
    const message = await openpgp.readCleartextMessage({ cleartextMessage: signedArmoredText });

    const verificationResult = await openpgp.verify({
      message,
      verificationKeys: publicKey
    });

    const { verified, keyID } = verificationResult.signatures[0];
    await verified; // throws on invalid signature

    return {
      verified: true,
      signerKeyId: keyID.toHex().toUpperCase()
    };
  } catch (err: any) {
    return {
      verified: false,
      error: err.message || 'Falha ao verificar assinatura criptográfica PGP.'
    };
  }
}
