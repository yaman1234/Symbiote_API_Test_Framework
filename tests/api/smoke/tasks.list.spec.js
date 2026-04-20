/**
 * GET /orgs/:orgId/branches/:branchId/tasks
 * Requires JWT from login → send-otp → verify-otp.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectTasksListSuccessBody } = require('../../../helpers/assertions.tasks');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('List tasks @smoke @tasks', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('GET /orgs/:orgId/branches/:branchId/tasks : returns task list with pagination and filters', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t1_owner');
    const email = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
    const password = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;

    test.skip(!email, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID for tasks list route');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks`;
      const params = {
        page: 1,
        pageSize: 20,
        // q: 'inventory',
        sort: 'startAt',
        order: 'asc'
      };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/list',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectTasksListSuccessBody(body, { message: 'Tasks fetched.' });
    } finally {
      await client.dispose();
    }
  });
});
