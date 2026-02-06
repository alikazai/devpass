import type { Vault, VaultSummary } from '../types/vault';

export const VAULT_VERSION = 1 as const;

export const createEmptyVault = (): Vault => ({
  version: VAULT_VERSION,
  projects: [],
});

export const toVaultSummary = (vault: Vault): VaultSummary => ({
  version: vault.version,
  projects: vault.projects.map((project) => ({
    id: project.id,
    name: project.name,
    environments: project.environments.map((environment) => ({
      id: environment.id,
      name: environment.name,
      accounts: environment.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        username: account.username,
        notes: account.notes,
        tags: account.tags,
        loginUrls: account.loginUrls,
      })),
    })),
  })),
});
