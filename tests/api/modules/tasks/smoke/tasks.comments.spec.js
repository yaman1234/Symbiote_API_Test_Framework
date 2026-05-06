const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Task comments @tasks', () => {
  test('[TASKS-COMMENTS-001] : List task comments returns success', async ({}, testInfo) => {
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
      const boardPath = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
      const boardRes = await client.get(boardPath, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const boardBody = await boardRes.json();
      test.skip(!boardRes.ok(), `Board fetch failed: HTTP ${boardRes.status()}`);

      const taskId = (boardBody?.data?.columns || [])
        .flatMap((col) => (Array.isArray(col?.tasks) ? col.tasks : []))
        .find((t) => t && t.id)?.id;
      test.skip(!taskId, 'No task id from board to list comments');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/comments`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { page: 1, limit: 20 }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/comments-list',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: { page: 1, limit: 20 } }
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
