/**
 * GET /orgs/:orgId/branches/:branchId/tasks
 * Requires JWT from login → send-otp → verify-otp.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

let assigneeId;
let taskId;

test.describe('List tasks', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('[TASKS-LIST-006] : Board view task list returns successfully → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD;

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID for tasks list route');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/board`;
      const params = {

      };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      const firstTaskWithAssignee = (body?.data?.columns || [])
        .flatMap((column) => (Array.isArray(column?.tasks) ? column.tasks : []))
        .find((task) => task?.assignee?.id);
      assigneeId = firstTaskWithAssignee?.assignee?.id;
      taskId = firstTaskWithAssignee?.id;

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
      expectJsonSuccessBody(body, {
        message: 'Task board fetched.',
        nonEmptyPaths: [
          'data.columns'
        ]
      });
    } finally {
      await client.dispose();
    }
  });

  // ADD ANOTHER TEST TO CHECK WITH QUERY PARAMETERS
  test('[TASKS-LIST-007] : Filtered board view with assigneeId returns successfully → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD;

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID for tasks list route');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/board`;
      const params = {
        assigneeId: assigneeId
      };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/board',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectJsonSuccessBody(body, {
        message: 'Task board fetched.',
        nonEmptyPaths: [
          'data.columns'
        ]
      });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-LIST-008] : Task detail endpoint returns selected task payload → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD;

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID for tasks routes');
    test.skip(!taskId, 'No taskId available from board response');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/${taskId}`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/detail',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectJsonSuccessBody(body, {
        nonEmptyPaths: [
          'data.id',
          'data.title'
        ]
      });
    } finally {
      await client.dispose();
    }
  });
});
