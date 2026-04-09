const { request } = require('@playwright/test');
const { env } = require('../config/env');

async function createApiClient(extraHeaders = {}) {
  const context = await request.newContext({
    baseURL: env.BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });

  return {
    context,
    async get(path, options = {}) {
      // TODO: Add shared logging, retries, and request tracing.
      return context.get(path, options);
    },
    async post(path, options = {}) {
      // TODO: Add shared payload sanitization and correlation IDs.
      return context.post(path, options);
    },
    async dispose() {
      await context.dispose();
    }
  };
}

module.exports = { createApiClient };
