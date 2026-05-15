const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId } = require('../../../../../helpers/tasksContext');

test.describe('List tasks', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('[TASKS-LIST-002] : Unauthorized tasks list request returns 401 → 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const path = 'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks';
      const params = { page: 1, pageSize: 20 };
      const res = await client.get(path, { params });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/list-unauth',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });
      expectHttpStatus(res, 401);
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: 401,
        messageIncludes: 'Authentication',
        requireErrorCode: true,
        requireErrorKey: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-LIST-011] : Tasks list rejects pageSize above max (101) → 422 or 400', async ({}, testInfo) => {
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

      const branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
      const params = { page: 1, pageSize: 101 };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/list-pagesize-max',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });

      expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true,
        requireErrorKey: true
      });
    } finally {
      await client.dispose();
    }
  });
});
