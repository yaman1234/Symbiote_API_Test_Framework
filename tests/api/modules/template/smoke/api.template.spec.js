/**
 * Smoke API template
 * Copy this file, rename it, and replace placeholders.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectSuccessStatus,
  expectJsonContentType,
  expectJsonSuccessBody,
  expectFieldExists,
  expectFieldValue
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

/* COMMENT OUT TO RUN 
test.describe('Template API', () => {
  test('[TEMPLATE-001] : Successful METHOD /your/endpoint returns expected behavior', async ({}, testInfo) => {
    // Pick a seeded user key from tests/data/seededAccounts.js
    const owner = getSeededAccountByKey('t1_owner');
    const email = (owner && owner.email) || env.LOGIN_EMAIL || '';
    const password = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;

    test.skip(!email, 'Seeded account email not found and LOGIN_EMAIL is empty');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD, USER_MGMT_OWNER_PASSWORD, or LOGIN_PASSWORD');

    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      // Update path, query/body, and HTTP method for your API
      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/your-endpoint`;
      const params = {
        // page: 1
      };
      const requestPayload = {
        // name: 'example'
      };

      // Choose one:
      // const response = await client.get(path, { headers: { Authorization: `Bearer ${session.accessToken}` }, params });
      const response = await client.post(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params,
        data: requestPayload
      });

      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'template/api',
        response,
        loginEmail: session.loginEmail,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload: { path, query: params, data: requestPayload }
      });

      // Base assertions from helpers/assertions.js
      expectSuccessStatus(response, body);
      expectJsonContentType(response);
      expectJsonSuccessBody(body, {
        // message: 'Expected success message',
        nonEmptyPaths: [
          // 'data.items'
        ]
      });

      // Optional field-level assertions:
      // expectFieldExists(body, 'data.items.0.id');
      // expectFieldValue(body, 'data.items.0.status', 'OPEN');
    } finally {
      await client.dispose();
    }
  });

  */

