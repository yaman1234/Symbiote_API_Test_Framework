const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectSuccessStatus,
  expectJsonContentType,
  expectJsonSuccessBody
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId, pickOrCreateTaskId } = require('../../../../../helpers/tasksContext');

test.describe('Task detail @tasks', () => {
  test('[TASKS-DETAIL-001] : Task detail strict shape contains expected sections → 2XX', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    const email = (supervisor && supervisor.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded supervisor t3_supervisor email not found');
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
      test.skip(!picked.ok, picked.reason || 'No task id for detail');
      const { taskId } = picked;
      if (picked.created) createdTaskId = taskId;

      const detailPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}`;
      const res = await client.get(detailPath, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/detail-strict-shape',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path: detailPath }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectJsonSuccessBody(body, { statusCode: 200 });

      const data = body.data;
      expect(data && typeof data === 'object').toBeTruthy();
      expect(typeof data.id).toBe('string');
      expect(typeof data.title).toBe('string');

      expect(data.status && typeof data.status === 'object', 'status object').toBeTruthy();
      expect(data.priority && typeof data.priority === 'object', 'priority object').toBeTruthy();
      expect(data.assignee && typeof data.assignee === 'object', 'assignee object').toBeTruthy();
      expect(typeof data.startAt).toBe('string');
      expect(typeof data.endAt).toBe('string');

      expect(Array.isArray(data.reminders), 'reminders[]').toBeTruthy();
      expect(
        data.recurrence === null || typeof data.recurrence === 'object',
        'recurrence object or null'
      ).toBeTruthy();
      expect(Array.isArray(data.attachments), 'attachments[]').toBeTruthy();
      expect(Array.isArray(data.subtasks), 'subtasks[]').toBeTruthy();
      expect(Array.isArray(data.comments), 'comments[]').toBeTruthy();
      expect(Array.isArray(data.activityLogs), 'activityLogs[]').toBeTruthy();
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
