function buildPayload(overrides = {}) {
  // TODO: Replace with domain factories as real scenarios are added.
  return {
    id: 'placeholder-id',
    name: 'placeholder-name',
    ...overrides
  };
}

const { SEEDED_ACCOUNTS } = require('../tests/data/seededAccounts');

function getSeededAccountByKey(key) {
  return SEEDED_ACCOUNTS.find((row) => row.key === key) || null;
}

function getSeededAccountsByVisibilityProfile(profile) {
  return SEEDED_ACCOUNTS.filter((row) => row.visibilityProfile === profile);
}

module.exports = {
  buildPayload,
  SEEDED_ACCOUNTS,
  getSeededAccountByKey,
  getSeededAccountsByVisibilityProfile
};
