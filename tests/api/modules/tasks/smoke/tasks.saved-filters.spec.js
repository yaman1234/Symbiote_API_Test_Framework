const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Task analytics saved filters @tasks', () => {
  test('[TASKS-FILTERS-001] : List analytics saved filters returns success', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = env.TASKS_BRANCH_ID || session.branchId || '';
      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/analytics/saved-filters`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/analytics-saved-filters',
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
    } finally {
      await client.dispose();
    }
  });
});
