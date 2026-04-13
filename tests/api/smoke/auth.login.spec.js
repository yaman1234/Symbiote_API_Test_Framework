const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody, expectHttpStatus, expectFieldExists, expectFieldValue } = require('../../../helpers/assertions');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

test.describe('Login @smoke', () => {
  test('OTP challenge', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');

    const client = await createApiClient();
    try {
      const requestPayload = { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectSuccessStatus(response, body);
      expectJsonContentType(response);
      expectJsonSuccessBody(body, {
        message: 'OTP required.',
        nonEmptyPaths: [
          'data.loginAttemptId',
          'data.methods',
          'data.methods.0.type',
          'data.expiresInSeconds'
        ]
      });

    } finally {
      await client.dispose();
    }
  });


});
