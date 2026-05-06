const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Task subtasks tree @tasks', () => {
  test('[TASKS-SUBTREE-001] : Subtask tree endpoint returns JSON array payload', async ({}, testInfo) => {
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
      test.skip(!taskId, 'No task id from board for subtask tree');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/subtasks/tree`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/subtasks-tree',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      const tree = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(tree)).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });
});
