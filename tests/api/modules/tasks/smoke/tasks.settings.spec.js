const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Task settings @tasks', () => {
  test('[TASKS-SETTINGS-001] : List org task statuses returns success', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t1_owner');
    const email = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
    const password = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const path = `orgs/${session.orgId}/task-settings/statuses`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/settings-statuses',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectJsonSuccessBody(body, { statusCode: 200 });
      expect(Array.isArray(body.data)).toBeTruthy();
      if (body.data.length > 0) {
        const row = body.data[0];
        expect(typeof row.id).toBe('string');
        expect(typeof row.name).toBe('string');
      }
    } finally {
      await client.dispose();
    }
  });
});
