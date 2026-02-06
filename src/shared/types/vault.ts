export type EnvironmentName = 'local' | 'dev' | 'qa' | 'staging' | 'prod';

export type Account = {
  id: string;
  name: string;
  username: string;
  secret: string;
  notes: string;
  tags: string[];
  loginUrls: string[];
};

export type Environment = {
  id: string;
  name: EnvironmentName;
  accounts: Account[];
};

export type Project = {
  id: string;
  name: string;
  environments: Environment[];
};

export type Vault = {
  version: 1;
  projects: Project[];
};

export type AccountSummary = Omit<Account, 'secret'>;

export type EnvironmentSummary = Omit<Environment, 'accounts'> & {
  accounts: AccountSummary[];
};

export type ProjectSummary = Omit<Project, 'environments'> & {
  environments: EnvironmentSummary[];
};

export type VaultSummary = Omit<Vault, 'projects'> & {
  projects: ProjectSummary[];
};
