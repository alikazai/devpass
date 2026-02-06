import {
  createSalt,
  decryptVault,
  deriveKey,
  encryptVault,
  getDefaultIterations,
} from '../shared/crypto/crypto';
import type {
  AutofillAccountRequest,
  EmptyResponse,
  GetAccountSecretRequest,
  PopupMessage,
  SearchAccountsRequest,
  SecretResponse,
  ServiceResponse,
  StatusResponse,
  VaultResponse,
} from '../shared/types/messages';
import type { Account, Project, Vault } from '../shared/types/vault';
import { createEmptyVault, toVaultSummary } from '../shared/vault/schema';
import { getEncryptedVault, setEncryptedVault } from '../shared/vault/storage';

// Decrypted vault stays in memory only while unlocked.
let unlockedVault: Vault | null = null;
let vaultKey: CryptoKey | null = null;
let vaultSalt: Uint8Array | null = null;
let vaultIterations = getDefaultIterations();

const ensureUnlocked = (): Vault => {
  if (!unlockedVault || !vaultKey || !vaultSalt) {
    throw new Error('Vault is locked.');
  }
  return unlockedVault;
};

const persistVault = async (): Promise<void> => {
  const vault = ensureUnlocked();
  const key = vaultKey;
  const salt = vaultSalt;
  if (!key || !salt) {
    throw new Error('Vault is locked.');
  }
  const encrypted = await encryptVault(vault, key, salt, vaultIterations);
  await setEncryptedVault(encrypted);
};

const findProject = (vault: Vault, projectId: string): Project => {
  const project = vault.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error('Project not found.');
  }
  return project;
};

const findAccount = (
  vault: Vault,
  projectId: string,
  environmentId: string,
  accountId: string,
): Account => {
  const project = findProject(vault, projectId);
  const environment = project.environments.find((item) => item.id === environmentId);
  if (!environment) {
    throw new Error('Environment not found.');
  }
  const account = environment.accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error('Account not found.');
  }
  return account;
};

const handleUnlock = async (masterPassword: string): Promise<VaultResponse> => {
  try {
    const encrypted = await getEncryptedVault();
    if (!encrypted) {
      const salt = createSalt();
      const iterations = getDefaultIterations();
      const key = await deriveKey(masterPassword, salt, iterations);
      const vault = createEmptyVault();
      const payload = await encryptVault(vault, key, salt, iterations);
      await setEncryptedVault(payload);

      unlockedVault = vault;
      vaultKey = key;
      vaultSalt = salt;
      vaultIterations = iterations;
      return { ok: true, data: toVaultSummary(vault) };
    }

    const key = await deriveKey(masterPassword, encrypted.kdf.salt, encrypted.kdf.iterations);
    const vault = await decryptVault(encrypted, key);

    unlockedVault = vault;
    vaultKey = key;
    vaultSalt = encrypted.kdf.salt;
    vaultIterations = encrypted.kdf.iterations;

    return { ok: true, data: toVaultSummary(vault) };
  } catch (error) {
    return { ok: false, error: 'Failed to unlock vault. Check your password.' };
  }
};

const handleStatus = async (): Promise<StatusResponse> => {
  const encrypted = await getEncryptedVault();
  return {
    ok: true,
    data: {
      locked: !unlockedVault,
      hasVault: Boolean(encrypted),
    },
  };
};

const handleGetVault = (): VaultResponse => {
  try {
    const vault = ensureUnlocked();
    return { ok: true, data: toVaultSummary(vault) };
  } catch (error) {
    return { ok: false, error: 'Vault is locked.' };
  }
};

const handleSearch = (request: SearchAccountsRequest): VaultResponse => {
  try {
    const vault = ensureUnlocked();
    const query = request.query.trim().toLowerCase();
    if (!query) {
      return { ok: true, data: toVaultSummary(vault) };
    }

    const filtered: Vault = {
      ...vault,
      projects: vault.projects
        .map((project) => ({
          ...project,
          environments: project.environments
            .map((environment) => ({
              ...environment,
              accounts: environment.accounts.filter((account) => {
                const haystack = [
                  account.name,
                  account.username,
                  account.notes,
                  ...account.tags,
                  ...account.loginUrls,
                ]
                  .join(' ')
                  .toLowerCase();
                return haystack.includes(query);
              }),
            }))
            .filter((environment) => environment.accounts.length > 0),
        }))
        .filter((project) => project.environments.length > 0),
    };

    return { ok: true, data: toVaultSummary(filtered) };
  } catch (error) {
    return { ok: false, error: 'Vault is locked.' };
  }
};

const handleAutofill = async (request: AutofillAccountRequest): Promise<EmptyResponse> => {
  try {
    const vault = ensureUnlocked();
    const account = findAccount(vault, request.projectId, request.environmentId, request.accountId);

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) {
      return { ok: false, error: 'No active tab available for autofill.' };
    }

    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js'],
    });

    await chrome.tabs.sendMessage(activeTab.id, {
      type: 'content:autofill',
      username: account.username,
      secret: account.secret,
      loginUrls: account.loginUrls,
    });

    return { ok: true, data: { success: true } };
  } catch (error) {
    return { ok: false, error: 'Autofill failed.' };
  }
};

const handleGetSecret = (request: GetAccountSecretRequest): SecretResponse => {
  try {
    const vault = ensureUnlocked();
    const account = findAccount(vault, request.projectId, request.environmentId, request.accountId);
    return { ok: true, data: { secret: account.secret } };
  } catch (error) {
    return { ok: false, error: 'Unable to retrieve secret.' };
  }
};

chrome.runtime.onMessage.addListener((message: PopupMessage, _sender, sendResponse) => {
  const handle = async (): Promise<ServiceResponse<unknown>> => {
    switch (message.type) {
      case 'vault:status':
        return handleStatus();
      case 'vault:unlock':
        return handleUnlock(message.masterPassword);
      case 'vault:lock':
        unlockedVault = null;
        vaultKey = null;
        vaultSalt = null;
        return { ok: true, data: { success: true } };
      case 'vault:get':
        return handleGetVault();
      case 'vault:search':
        return handleSearch(message);
      case 'project:create': {
        const vault = ensureUnlocked();
        const project: Project = {
          id: crypto.randomUUID(),
          name: message.name.trim(),
          environments: [],
        };
        vault.projects.push(project);
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'project:update': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        project.name = message.name.trim();
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'project:delete': {
        const vault = ensureUnlocked();
        vault.projects = vault.projects.filter((item) => item.id !== message.projectId);
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'environment:create': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        project.environments.push({
          id: crypto.randomUUID(),
          name: message.name,
          accounts: [],
        });
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'environment:update': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        const environment = project.environments.find((item) => item.id === message.environmentId);
        if (!environment) {
          throw new Error('Environment not found.');
        }
        environment.name = message.name;
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'environment:delete': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        project.environments = project.environments.filter(
          (item) => item.id !== message.environmentId,
        );
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'account:create': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        const environment = project.environments.find((item) => item.id === message.environmentId);
        if (!environment) {
          throw new Error('Environment not found.');
        }
        environment.accounts.push({
          ...message.account,
          id: crypto.randomUUID(),
        });
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'account:update': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        const environment = project.environments.find((item) => item.id === message.environmentId);
        if (!environment) {
          throw new Error('Environment not found.');
        }
        const account = environment.accounts.find((item) => item.id === message.accountId);
        if (!account) {
          throw new Error('Account not found.');
        }
        Object.assign(account, message.account);
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'account:delete': {
        const vault = ensureUnlocked();
        const project = findProject(vault, message.projectId);
        const environment = project.environments.find((item) => item.id === message.environmentId);
        if (!environment) {
          throw new Error('Environment not found.');
        }
        environment.accounts = environment.accounts.filter((item) => item.id !== message.accountId);
        await persistVault();
        return { ok: true, data: toVaultSummary(vault) };
      }
      case 'account:getSecret':
        return handleGetSecret(message);
      case 'account:autofill':
        return handleAutofill(message);
      default:
        return { ok: false, error: 'Unknown message.' };
    }
  };

  handle()
    .then((response) => sendResponse(response))
    .catch(() => sendResponse({ ok: false, error: 'Unexpected error.' }));

  return true;
});

chrome.runtime.onSuspend.addListener(() => {
  unlockedVault = null;
  vaultKey = null;
  vaultSalt = null;
});
