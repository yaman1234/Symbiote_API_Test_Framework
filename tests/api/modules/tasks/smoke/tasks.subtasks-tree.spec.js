const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../../../helpers/assertions');
const { pickSubtaskTreeArray } = require('../../../../../helpers/assertions.tasks');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId, pickOrCreateTaskId } = require('../../../../../helpers/tasksContext');

test.describe('Task subtasks tree @tasks', () => {
  test('[TASKS-SUBTREE-001] : Subtask tree endpoint returns JSON array payload', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    let session = null;
    let branchId = '';
    let createdTaskId;
    try {
      session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');

      const picked = await pickOrCreateTaskId(client, session, branchId);
      test.skip(!picked.ok, picked.reason || 'No task id for subtask tree');
      const { taskId } = picked;
      if (picked.created) createdTaskId = taskId;

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
      const tree = pickSubtaskTreeArray(body);
      expect(
        tree != null && Array.isArray(tree),
        `Expected subtask tree array; data keys: ${body && typeof body === 'object' && body.data && typeof body.data === 'object' ? Object.keys(body.data).join(',') : String(body?.data)}`
      ).toBeTruthy();
    } finally {
      if (client && createdTaskId && session && session.ok && branchId) {
        await client.delete(`orgs/${session.orgId}/branches/${branchId}/tasks/${createdTaskId}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        });
      }
      await client.dispose();
    }
  });
});
