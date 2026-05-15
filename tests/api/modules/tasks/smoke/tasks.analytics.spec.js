const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId } = require('../../../../../helpers/tasksContext');

test.describe('Task analytics @tasks', () => {
  test('[TASKS-ANALYTICS-001] : Task analytics summary returns success', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');
      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/analytics`;
      const params = { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/analytics',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectJsonSuccessBody(body, { statusCode: 200 });
      expect(body.data && typeof body.data === 'object').toBeTruthy();
    } finally {
      await client.dispose();
    }
  });
});
