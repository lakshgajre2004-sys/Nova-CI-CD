module.exports = [
  {
    name: 'Repo 1',
    repo: 'lakshgajre2004-sys/nova-repo-1',
    branches: ['main', 'staging'],
    criticality: 'high',
    deploymentTier: 'production'
  },
  {
    name: 'Repo 2',
    repo: 'lakshgajre2004-sys/nova-repo-2',
    branches: ['main', 'feature/auth'],
    criticality: 'medium',
    deploymentTier: 'staging'
  },
  {
    name: 'Repo 3',
    repo: 'lakshgajre2004-sys/nova-repo-3',
    branches: ['main', 'hotfix/docker'],
    criticality: 'critical',
    deploymentTier: 'production'
  }
];
