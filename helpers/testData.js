function buildPayload(overrides = {}) {
  // TODO: Replace with domain factories as real scenarios are added.
  return {
    id: 'placeholder-id',
    name: 'placeholder-name',
    ...overrides
  };
}

module.exports = { buildPayload };
