import { useEffect, useMemo, useState } from 'react';

import type {
  EmptyResponse,
  PopupMessage,
  SecretResponse,
  ServiceResponse,
  StatusResponse,
  VaultResponse,
} from '../shared/types/messages';
import type {
  AccountSummary,
  EnvironmentName,
  ProjectSummary,
  VaultSummary,
} from '../shared/types/vault';

const ENVIRONMENT_OPTIONS: EnvironmentName[] = ['local', 'dev', 'qa', 'staging', 'prod'];

const sendMessage = <T,>(message: PopupMessage): Promise<ServiceResponse<T>> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: ServiceResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || 'Request failed.' });
        return;
      }
      resolve(response);
    });
  });

const filterVault = (vault: VaultSummary, query: string): VaultSummary => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return vault;
  }

  return {
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
              return haystack.includes(trimmed);
            }),
          }))
          .filter((environment) => environment.accounts.length > 0),
      }))
      .filter((project) => project.environments.length > 0),
  };
};

const getProject = (vault: VaultSummary | null, projectId: string | null): ProjectSummary | null => {
  if (!vault || !projectId) {
    return null;
  }
  return vault.projects.find((project) => project.id === projectId) ?? null;
};

const getEnvironment = (
  project: ProjectSummary | null,
  environmentId: string | null,
): ProjectSummary['environments'][number] | null => {
  if (!project || !environmentId) {
    return null;
  }
  return project.environments.find((environment) => environment.id === environmentId) ?? null;
};

const App = (): JSX.Element => {
  const [status, setStatus] = useState<{ locked: boolean; hasVault: boolean } | null>(null);
  const [vault, setVault] = useState<VaultSummary | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newEnvironmentName, setNewEnvironmentName] = useState<EnvironmentName>('dev');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountSecret, setNewAccountSecret] = useState('');
  const [newAccountNotes, setNewAccountNotes] = useState('');
  const [newAccountTags, setNewAccountTags] = useState('');
  const [newAccountUrls, setNewAccountUrls] = useState('');

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountUsername, setEditAccountUsername] = useState('');
  const [editAccountSecret, setEditAccountSecret] = useState('');
  const [editAccountNotes, setEditAccountNotes] = useState('');
  const [editAccountTags, setEditAccountTags] = useState('');
  const [editAccountUrls, setEditAccountUrls] = useState('');

  useEffect(() => {
    sendMessage<StatusResponse['data']>({ type: 'vault:status' }).then((response) => {
      if (response.ok) {
        setStatus(response.data);
      }
    });
  }, []);

  useEffect(() => {
    if (!vault) {
      setProjectId(null);
      setEnvironmentId(null);
      return;
    }

    if (!projectId || !vault.projects.find((project) => project.id === projectId)) {
      const firstProject = vault.projects[0];
      setProjectId(firstProject?.id ?? null);
      setEnvironmentId(firstProject?.environments[0]?.id ?? null);
      return;
    }

    const project = vault.projects.find((item) => item.id === projectId);
    if (!environmentId || !project?.environments.find((env) => env.id === environmentId)) {
      setEnvironmentId(project?.environments[0]?.id ?? null);
    }
  }, [vault, projectId, environmentId]);

  const filteredVault = useMemo(() => (vault ? filterVault(vault, search) : null), [vault, search]);
  const selectedProject = getProject(filteredVault ?? vault, projectId);
  const selectedEnvironment = getEnvironment(selectedProject, environmentId);

  const handleUnlock = async (): Promise<void> => {
    setError('');
    const response = await sendMessage<VaultResponse['data']>({
      type: 'vault:unlock',
      masterPassword,
    });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setVault(response.data);
    setStatus({ locked: false, hasVault: true });
    setMasterPassword('');
  };

  const handleLock = async (): Promise<void> => {
    await sendMessage<EmptyResponse['data']>({ type: 'vault:lock' });
    setVault(null);
    setStatus((current) => (current ? { ...current, locked: true } : current));
  };

  const refreshVault = async (): Promise<void> => {
    const response = await sendMessage<VaultResponse['data']>({ type: 'vault:get' });
    if (response.ok) {
      setVault(response.data);
    }
  };

  const handleCreateProject = async (): Promise<void> => {
    const name = newProjectName.trim();
    if (!name) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({ type: 'project:create', name });
    if (response.ok) {
      setVault(response.data);
      setNewProjectName('');
    }
  };

  const handleUpdateProject = async (): Promise<void> => {
    if (!projectId || !newProjectName.trim()) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({
      type: 'project:update',
      projectId,
      name: newProjectName.trim(),
    });
    if (response.ok) {
      setVault(response.data);
      setNewProjectName('');
    }
  };

  const handleDeleteProject = async (): Promise<void> => {
    if (!projectId || !window.confirm('Delete this project and all its data?')) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({
      type: 'project:delete',
      projectId,
    });
    if (response.ok) {
      setVault(response.data);
    }
  };

  const handleCreateEnvironment = async (): Promise<void> => {
    if (!projectId) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({
      type: 'environment:create',
      projectId,
      name: newEnvironmentName,
    });
    if (response.ok) {
      setVault(response.data);
    }
  };

  const handleUpdateEnvironment = async (): Promise<void> => {
    if (!projectId || !environmentId) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({
      type: 'environment:update',
      projectId,
      environmentId,
      name: newEnvironmentName,
    });
    if (response.ok) {
      setVault(response.data);
    }
  };

  const handleDeleteEnvironment = async (): Promise<void> => {
    if (!projectId || !environmentId || !window.confirm('Delete this environment?')) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({
      type: 'environment:delete',
      projectId,
      environmentId,
    });
    if (response.ok) {
      setVault(response.data);
    }
  };

  const handleCreateAccount = async (): Promise<void> => {
    if (!projectId || !environmentId || !newAccountName.trim()) {
      return;
    }

    const response = await sendMessage<VaultResponse['data']>({
      type: 'account:create',
      projectId,
      environmentId,
      account: {
        name: newAccountName.trim(),
        username: newAccountUsername.trim(),
        secret: newAccountSecret,
        notes: newAccountNotes.trim(),
        tags: newAccountTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        loginUrls: newAccountUrls
          .split(',')
          .map((url) => url.trim())
          .filter(Boolean),
      },
    });

    if (response.ok) {
      setVault(response.data);
      setNewAccountName('');
      setNewAccountUsername('');
      setNewAccountSecret('');
      setNewAccountNotes('');
      setNewAccountTags('');
      setNewAccountUrls('');
    }
  };

  const handleEditAccount = async (account: AccountSummary): Promise<void> => {
    if (!projectId || !environmentId) {
      return;
    }
    const response = await sendMessage<SecretResponse['data']>({
      type: 'account:getSecret',
      projectId,
      environmentId,
      accountId: account.id,
    });

    if (!response.ok) {
      setError(response.error);
      return;
    }

    setEditingAccountId(account.id);
    setEditAccountName(account.name);
    setEditAccountUsername(account.username);
    setEditAccountSecret(response.data.secret);
    setEditAccountNotes(account.notes);
    setEditAccountTags(account.tags.join(', '));
    setEditAccountUrls(account.loginUrls.join(', '));
  };

  const handleUpdateAccount = async (): Promise<void> => {
    if (!projectId || !environmentId || !editingAccountId) {
      return;
    }

    const response = await sendMessage<VaultResponse['data']>({
      type: 'account:update',
      projectId,
      environmentId,
      accountId: editingAccountId,
      account: {
        name: editAccountName.trim(),
        username: editAccountUsername.trim(),
        secret: editAccountSecret,
        notes: editAccountNotes.trim(),
        tags: editAccountTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        loginUrls: editAccountUrls
          .split(',')
          .map((url) => url.trim())
          .filter(Boolean),
      },
    });

    if (response.ok) {
      setVault(response.data);
      setEditingAccountId(null);
      setEditAccountName('');
      setEditAccountUsername('');
      setEditAccountSecret('');
      setEditAccountNotes('');
      setEditAccountTags('');
      setEditAccountUrls('');
    }
  };

  const handleDeleteAccount = async (accountId: string): Promise<void> => {
    if (!projectId || !environmentId || !window.confirm('Delete this account?')) {
      return;
    }
    const response = await sendMessage<VaultResponse['data']>({
      type: 'account:delete',
      projectId,
      environmentId,
      accountId,
    });
    if (response.ok) {
      setVault(response.data);
    }
  };

  const handleCopySecret = async (accountId: string): Promise<void> => {
    if (!projectId || !environmentId) {
      return;
    }

    const response = await sendMessage<SecretResponse['data']>({
      type: 'account:getSecret',
      projectId,
      environmentId,
      accountId,
    });

    if (response.ok) {
      await navigator.clipboard.writeText(response.data.secret);
      // Clear any references in UI state after copy.
      setNotice('Secret copied to clipboard.');
      setTimeout(() => setNotice(''), 1500);
    }
  };

  const handleCopyUsername = async (username: string): Promise<void> => {
    await navigator.clipboard.writeText(username);
    setNotice('Username copied to clipboard.');
    setTimeout(() => setNotice(''), 1500);
  };

  const handleAutofill = async (accountId: string): Promise<void> => {
    if (!projectId || !environmentId) {
      return;
    }
    const response = await sendMessage<EmptyResponse['data']>({
      type: 'account:autofill',
      projectId,
      environmentId,
      accountId,
    });

    if (response.ok) {
      setNotice('Autofill sent to active tab.');
      setTimeout(() => setNotice(''), 1500);
    } else {
      setError(response.error);
    }
  };

  if (!status || status.locked) {
    return (
      <div className="container">
        <h1>DevPass</h1>
        <p className="muted">Unlock your local vault.</p>
        <label className="field">
          Master password
          <input
            type="password"
            value={masterPassword}
            onChange={(event) => setMasterPassword(event.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={handleUnlock} disabled={!masterPassword.trim()}>
          {status?.hasVault ? 'Unlock' : 'Create vault'}
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>DevPass</h1>
          <p className="muted">Local-only credential vault.</p>
        </div>
        <button type="button" onClick={handleLock}>
          Lock
        </button>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Projects</h2>
        <div className="row">
          <select value={projectId ?? ''} onChange={(event) => setProjectId(event.target.value)}>
            <option value="" disabled>
              Select a project
            </option>
            {vault?.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={refreshVault}>
            Refresh
          </button>
        </div>
        <div className="row">
          <input
            type="text"
            placeholder="New project name"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
          />
          <button type="button" onClick={handleCreateProject}>
            Add
          </button>
          <button type="button" onClick={handleUpdateProject}>
            Rename
          </button>
          <button type="button" onClick={handleDeleteProject}>
            Delete
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Environments</h2>
        <div className="row">
          <select
            value={environmentId ?? ''}
            onChange={(event) => setEnvironmentId(event.target.value)}
          >
            <option value="" disabled>
              Select an environment
            </option>
            {selectedProject?.environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
          <select
            value={newEnvironmentName}
            onChange={(event) => setNewEnvironmentName(event.target.value as EnvironmentName)}
          >
            {ENVIRONMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button type="button" onClick={handleCreateEnvironment}>
            Add
          </button>
          <button type="button" onClick={handleUpdateEnvironment}>
            Rename
          </button>
          <button type="button" onClick={handleDeleteEnvironment}>
            Delete
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Accounts</h2>
        <input
          type="search"
          placeholder="Quick search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {selectedEnvironment?.accounts.length ? (
          <div className="list">
            {selectedEnvironment.accounts.map((account) => (
              <div key={account.id} className="card">
                <div>
                  <strong>{account.name}</strong>
                  <div className="muted">{account.username}</div>
                  {account.tags.length > 0 && (
                    <div className="tags">{account.tags.join(', ')}</div>
                  )}
                </div>
                <div className="row">
                  <button type="button" onClick={() => handleCopyUsername(account.username)}>
                    Copy user
                  </button>
                  <button type="button" onClick={() => handleCopySecret(account.id)}>
                    Copy secret
                  </button>
                  <button type="button" onClick={() => handleAutofill(account.id)}>
                    Autofill
                  </button>
                  <button type="button" onClick={() => handleEditAccount(account)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDeleteAccount(account.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No accounts yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>{editingAccountId ? 'Edit account' : 'Add account'}</h2>
        <div className="grid">
          <input
            type="text"
            placeholder="Account name"
            value={editingAccountId ? editAccountName : newAccountName}
            onChange={(event) =>
              editingAccountId ? setEditAccountName(event.target.value) : setNewAccountName(event.target.value)
            }
          />
          <input
            type="text"
            placeholder="Username"
            value={editingAccountId ? editAccountUsername : newAccountUsername}
            onChange={(event) =>
              editingAccountId
                ? setEditAccountUsername(event.target.value)
                : setNewAccountUsername(event.target.value)
            }
          />
          <input
            type="password"
            placeholder="Password / Secret"
            value={editingAccountId ? editAccountSecret : newAccountSecret}
            onChange={(event) =>
              editingAccountId ? setEditAccountSecret(event.target.value) : setNewAccountSecret(event.target.value)
            }
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={editingAccountId ? editAccountTags : newAccountTags}
            onChange={(event) =>
              editingAccountId ? setEditAccountTags(event.target.value) : setNewAccountTags(event.target.value)
            }
          />
          <input
            type="text"
            placeholder="Login URLs (comma separated)"
            value={editingAccountId ? editAccountUrls : newAccountUrls}
            onChange={(event) =>
              editingAccountId ? setEditAccountUrls(event.target.value) : setNewAccountUrls(event.target.value)
            }
          />
          <textarea
            placeholder="Notes"
            value={editingAccountId ? editAccountNotes : newAccountNotes}
            onChange={(event) =>
              editingAccountId ? setEditAccountNotes(event.target.value) : setNewAccountNotes(event.target.value)
            }
          />
        </div>
        <div className="row">
          {editingAccountId ? (
            <>
              <button type="button" onClick={handleUpdateAccount}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAccountId(null);
                  setEditAccountName('');
                  setEditAccountUsername('');
                  setEditAccountSecret('');
                  setEditAccountNotes('');
                  setEditAccountTags('');
                  setEditAccountUrls('');
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={handleCreateAccount}>
              Add account
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default App;
