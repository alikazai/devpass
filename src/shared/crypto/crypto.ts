import type { Vault } from '../types/vault';

// PBKDF2 iterations tuned for local unlock latency vs. offline attack cost.
const KDF_ITERATIONS = 210_000;
const KDF_HASH = 'SHA-256';
const CIPHER_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export type EncryptedVault = {
  formatVersion: 1;
  kdf: {
    salt: Uint8Array;
    iterations: number;
    hash: 'SHA-256';
  };
  cipher: {
    iv: Uint8Array;
    alg: 'AES-GCM';
  };
  ciphertext: ArrayBuffer;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const importPassword = async (password: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);

export const deriveKey = async (
  password: string,
  salt: Uint8Array,
  iterations = KDF_ITERATIONS,
): Promise<CryptoKey> => {
  const baseKey = await importPassword(password);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: KDF_HASH,
    },
    baseKey,
    { name: CIPHER_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const encryptVault = async (
  vault: Vault,
  key: CryptoKey,
  salt: Uint8Array,
  iterations = KDF_ITERATIONS,
): Promise<EncryptedVault> => {
  const iv = randomBytes(IV_LENGTH);
  const plaintext = textEncoder.encode(JSON.stringify(vault));
  const ciphertext = await crypto.subtle.encrypt(
    { name: CIPHER_ALGORITHM, iv },
    key,
    plaintext,
  );

  return {
    formatVersion: 1,
    kdf: { salt, iterations, hash: KDF_HASH },
    cipher: { iv, alg: CIPHER_ALGORITHM },
    ciphertext,
  };
};

export const decryptVault = async (
  encrypted: EncryptedVault,
  key: CryptoKey,
): Promise<Vault> => {
  const plaintext = await crypto.subtle.decrypt(
    { name: CIPHER_ALGORITHM, iv: encrypted.cipher.iv },
    key,
    encrypted.ciphertext,
  );
  return JSON.parse(textDecoder.decode(plaintext)) as Vault;
};

export const createSalt = (): Uint8Array => randomBytes(SALT_LENGTH);

export const getDefaultIterations = (): number => KDF_ITERATIONS;
