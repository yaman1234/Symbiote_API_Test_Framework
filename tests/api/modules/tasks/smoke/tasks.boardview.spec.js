/**
 * GET /orgs/:orgId/branches/:branchId/tasks/board (+ detail)
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
const { resolveTasksBranchId, pickOrCreateTaskId } = require('../../../../../helpers/tasksContext');

let assigneeId;
let priorityId;
let taskTitleSeed;
let taskId;

test.describe('List tasks', () => {
  test.describe.configure({ mode: 'serial' });

  test('[TASKS-LIST-006] : Board view task list returns successfully → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
      const params = {};
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      let firstTaskWithAssignee = (body?.data?.columns || [])
        .flatMap((column) => (Array.isArray(column?.tasks) ? column.tasks : []))
        .find((task) => task?.assignee?.id && task?.priority?.id);

      if (!firstTaskWithAssignee && res.ok()) {
        const picked = await pickOrCreateTaskId(client, session, branchId);
        if (picked.ok) {
          const dpath = `orgs/${session.orgId}/branches/${branchId}/tasks/${picked.taskId}`;
          const dres = await client.get(dpath, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
          });
          const dbody = await dres.json();
          const d = dbody?.data;
          if (d?.assignee?.id && d?.priority?.id) {
            firstTaskWithAssignee = d;
          }
        }
      }

      assigneeId = firstTaskWithAssignee?.assignee?.id;
      priorityId = firstTaskWithAssignee?.priority?.id;
      taskTitleSeed = String(firstTaskWithAssignee?.title || '').slice(0, 12);
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
        nonEmptyPaths: ['data.columns']
      });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-LIST-007] : Filtered board view with assigneeId returns successfully → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');
      test.skip(!assigneeId, 'No assigneeId from prior board test (seed tasks or run LIST-006 first)');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
      const params = { assigneeId };
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
        nonEmptyPaths: ['data.columns']
      });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-LIST-008] : Task detail endpoint returns selected task payload → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!taskId, 'No taskId available from board response');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}`;
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
        nonEmptyPaths: ['data.id', 'data.title']
      });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-BOARD-002] : Board view with all supported query params returns successfully → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_supervisor');
    const email = (owner && owner.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded owner t3_supervisor email not found');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!assigneeId || !priorityId, 'No assigneeId/priorityId available from board response');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
      test.skip(!branchId, 'No branch id (set TASKS_BRANCH_ID or verify-otp session branchId)');

      const path = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
      const params = {
        q: taskTitleSeed || 'task',
        assigneeId,
        priorityId,
        includeSubtasks: 'true'
      };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/board-all-query-params',
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
        nonEmptyPaths: ['data.columns']
      });
    } finally {
      await client.dispose();
    }
  });
});
