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

test.describe('Task detail @tasks', () => {
  test('[TASKS-DETAIL-001] : Task detail strict shape contains expected sections → 2XX', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    const email = (supervisor && supervisor.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded supervisor t3_supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID for tasks routes');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const boardPath = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/board`;
      const boardRes = await client.get(boardPath, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const boardBody = await boardRes.json();
      test.skip(!boardRes.ok(), `Board preload failed: HTTP ${boardRes.status()}`);
      const taskId = (boardBody?.data?.columns || [])
        .flatMap((column) => (Array.isArray(column?.tasks) ? column.tasks : []))
        .find((task) => task && task.id)?.id;
      test.skip(!taskId, 'No task id available from board response');

      const detailPath = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/${taskId}`;
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
      await client.dispose();
    }
  });
});
