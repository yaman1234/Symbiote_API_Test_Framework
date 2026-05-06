/**
 * GET /orgs/:orgId/branches/:branchId/tasks
 * Requires JWT from login → send-otp → verify-otp.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../../../helpers/assertions');
const { expectTasksListSuccessBody } = require('../../../../../helpers/assertions.tasks');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('List tasks', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('[TASKS-LIST-001] : Authorized owner lists tasks with pagination and filters → 2XX', async ({}, testInfo) => {
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

  // Uses every supported list query parameter in one request using discovered valid IDs.
  test('[TASKS-LIST-012] : Authorized owner lists tasks using all supported query params → 2XX', async ({}, testInfo) => {
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

      const boardPath = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/board`;
      const boardRes = await client.get(boardPath, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const boardBody = await boardRes.json();
      test.skip(!boardRes.ok(), `Board preload failed: HTTP ${boardRes.status()}`);

      const firstTask = (boardBody?.data?.columns || [])
        .flatMap((column) => (Array.isArray(column?.tasks) ? column.tasks : []))
        .find((task) => task && task.status?.id && task.priority?.id && task.assignee?.id && task.startAt);
      test.skip(!firstTask, 'No task with status/priority/assignee/startAt available for full query test');

      const startAtIso = new Date(firstTask.startAt).toISOString();
      const endAtIso = new Date(new Date(startAtIso).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks`;
      const params = {
        q: String(firstTask.title || '').slice(0, 12),
        statusId: firstTask.status.id,
        priorityId: firstTask.priority.id,
        assigneeId: firstTask.assignee.id,
        from: startAtIso,
        to: endAtIso,
        page: 1,
        pageSize: 20,
        sort: 'startAt',
        order: 'asc'
      };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/list-all-query-params',
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
