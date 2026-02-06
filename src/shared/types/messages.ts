import type { Account, EnvironmentName, VaultSummary } from './vault';

export type ServiceResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type VaultStatus = {
  locked: boolean;
  hasVault: boolean;
};

export type UnlockRequest = {
  type: 'vault:unlock';
  masterPassword: string;
};

export type LockRequest = {
  type: 'vault:lock';
};

export type StatusRequest = {
  type: 'vault:status';
};

export type GetVaultRequest = {
  type: 'vault:get';
};

export type CreateProjectRequest = {
  type: 'project:create';
  name: string;
};

export type UpdateProjectRequest = {
  type: 'project:update';
  projectId: string;
  name: string;
};

export type DeleteProjectRequest = {
  type: 'project:delete';
  projectId: string;
};

export type CreateEnvironmentRequest = {
  type: 'environment:create';
  projectId: string;
  name: EnvironmentName;
};

export type UpdateEnvironmentRequest = {
  type: 'environment:update';
  projectId: string;
  environmentId: string;
  name: EnvironmentName;
};

export type DeleteEnvironmentRequest = {
  type: 'environment:delete';
  projectId: string;
  environmentId: string;
};

export type CreateAccountRequest = {
  type: 'account:create';
  projectId: string;
  environmentId: string;
  account: Omit<Account, 'id'>;
};

export type UpdateAccountRequest = {
  type: 'account:update';
  projectId: string;
  environmentId: string;
  accountId: string;
  account: Omit<Account, 'id'>;
};

export type DeleteAccountRequest = {
  type: 'account:delete';
  projectId: string;
  environmentId: string;
  accountId: string;
};

export type GetAccountSecretRequest = {
  type: 'account:getSecret';
  projectId: string;
  environmentId: string;
  accountId: string;
};

export type AutofillAccountRequest = {
  type: 'account:autofill';
  projectId: string;
  environmentId: string;
  accountId: string;
};

export type SearchAccountsRequest = {
  type: 'vault:search';
  query: string;
};

export type PopupMessage =
  | StatusRequest
  | UnlockRequest
  | LockRequest
  | GetVaultRequest
  | SearchAccountsRequest
  | CreateProjectRequest
  | UpdateProjectRequest
  | DeleteProjectRequest
  | CreateEnvironmentRequest
  | UpdateEnvironmentRequest
  | DeleteEnvironmentRequest
  | CreateAccountRequest
  | UpdateAccountRequest
  | DeleteAccountRequest
  | GetAccountSecretRequest
  | AutofillAccountRequest;

export type ContentAutofillMessage = {
  type: 'content:autofill';
  username: string;
  secret: string;
  loginUrls: string[];
};

export type VaultResponse = ServiceResponse<VaultSummary>;
export type StatusResponse = ServiceResponse<VaultStatus>;
export type SecretResponse = ServiceResponse<{ secret: string }>;
export type EmptyResponse = ServiceResponse<{ success: true }>;
