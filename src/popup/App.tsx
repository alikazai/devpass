import { useEffect, useMemo, useState } from 'react';

import type {
  EmptyResponse,
  PopupMessage,
  SecretResponse,
  ServiceResponse,
  StatusResponse,
  VaultResponse,
} from '../shared/types/messages';
import type { ProjectSummary, VaultSummary } from '../shared/types/vault';

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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    sendMessage<StatusResponse['data']>({ type: 'vault:status' }).then((response) => {
      if (response.ok) {
        setStatus(response.data);
      }
    });
  }, []);

  useEffect(() => {
    if (status && !status.locked) {
      refreshVault();
    }
  }, [status]);

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

  const handleOpenManager = (): void => {
    chrome.tabs.create({ url: chrome.runtime.getURL('manage.html') });
  };

  const refreshVault = async (): Promise<void> => {
    const response = await sendMessage<VaultResponse['data']>({ type: 'vault:get' });
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
      setNotice('Secret copied to clipboard.');
      setTimeout(() => setNotice(''), 1500);
      return;
    }

    setError(response.error);
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

  if (!status) {
    return (
      <div className="container">
        <h1>DevPass</h1>
        <p className="muted">Loading...</p>
      </div>
    );
  }

  if (status.locked) {
    return (
      <div className="container">
        <h1>DevPass</h1>
        <p className="muted">Vault locked. Open the manager to unlock.</p>
        <p className="error">Locked (manager closed).</p>
        <button type="button" onClick={handleOpenManager}>
          Open manager
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>DevPass</h1>
          <p className="muted">Quick actions</p>
        </div>
        <button type="button" onClick={handleOpenManager}>
          Open manager
        </button>
      </header>

      <p className="notice">Unlocked (manager open).</p>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Quick actions</h2>
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
          <button type="button" onClick={refreshVault}>
            Refresh
          </button>
        </div>
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No accounts yet.</p>
        )}
      </section>
    </div>
  );
};

export default App;
