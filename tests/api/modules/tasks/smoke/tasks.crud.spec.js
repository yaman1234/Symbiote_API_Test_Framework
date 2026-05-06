/**
 * POST / PATCH / DELETE branch tasks (serial: create then update then delete).
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectSuccessStatus,
  expectJsonContentType,
  expectJsonSuccessBody,
  expectHttpOkOrCreated
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Tasks CRUD @tasks', () => {
  test.describe.configure({ mode: 'serial' });

  const owner = getSeededAccountByKey('t3_supervisor');
  const email = (owner && owner.email) || '';
  const password = env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;
  /** @type {string | undefined} */
  let createdTaskId;

  test.beforeAll(async () => {
    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
    branchId = env.TASKS_BRANCH_ID || session.branchId || '';
    test.skip(!branchId, 'No branch id for tasks CRUD');
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-POST-001] : Create branch task returns success with taskId', async ({}, testInfo) => {
    const listPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: { page: 1, pageSize: 5, sort: 'createdAt', order: 'desc' }
    });
    const listBody = await listRes.json();
    test.skip(!listRes.ok(), `List tasks failed: HTTP ${listRes.status()}`);

    const first = Array.isArray(listBody?.data?.items) ? listBody.data.items[0] : null;
    test.skip(!first, 'No existing task row to copy status/priority from');

    const statusId = first?.status?.id;
    const priorityId = first?.priority?.id;
    const assigneeId = first?.assignee?.id || session.orgUserId;
    test.skip(!statusId || !priorityId || !assigneeId, 'Missing statusId, priorityId, or assigneeId');

    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const payload = {
      title: `PW task ${Date.now()}`,
      description: 'API test automation',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderOffsetsMinutes: [60, 15]
    };

    const createPath = listPath;
    const res = await client.post(createPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: createPath, body: payload }
    });

    expectHttpOkOrCreated(res);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'created',
      nonEmptyPaths: ['data.taskId']
    });
    createdTaskId = body.data.taskId;
  });

  test('[TASKS-POST-002] : Create recurring task returns success with recurrenceId', async ({}, testInfo) => {
    const listPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: { page: 1, pageSize: 5, sort: 'createdAt', order: 'desc' }
    });
    const listBody = await listRes.json();
    test.skip(!listRes.ok(), `List tasks failed: HTTP ${listRes.status()}`);

    const first = Array.isArray(listBody?.data?.items) ? listBody.data.items[0] : null;
    test.skip(!first, 'No existing task row to copy status/priority from');

    const statusId = first?.status?.id;
    const priorityId = first?.priority?.id;
    const assigneeId = first?.assignee?.id || session.orgUserId;
    test.skip(!statusId || !priorityId || !assigneeId, 'Missing statusId, priorityId, or assigneeId');

    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const recurrenceEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const payload = {
      title: `PW recurring task ${Date.now()}`,
      description: 'API recurring task automation',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderOffsetsMinutes: [60, 15],
      recurrence: {
        frequency: 'WEEKLY',
        executionTime: '09:00',
        endDate: recurrenceEnd.toISOString()
      }
    };

    let recurringTaskId;
    const res = await client.post(listPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-recurrence',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: listPath, body: payload }
    });

    expectHttpOkOrCreated(res);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'created',
      nonEmptyPaths: ['data.taskId', 'data.recurrenceId']
    });
    recurringTaskId = body?.data?.taskId;

    // Keep workspace clean by deleting the recurrence test task immediately.
    if (recurringTaskId) {
      const cleanupRes = await client.delete(`orgs/${session.orgId}/branches/${branchId}/tasks/${recurringTaskId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const cleanupBody = await cleanupRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/create-recurrence-cleanup',
        response: cleanupRes,
        loginEmail: session.loginEmail,
        status: cleanupRes.status(),
        statusText: cleanupRes.statusText(),
        body: cleanupBody,
        requestPayload: { path: `orgs/${session.orgId}/branches/${branchId}/tasks/${recurringTaskId}` }
      });
      expectSuccessStatus(cleanupRes, cleanupBody);
    }
  });

  test('[TASKS-PATCH-001] : Update branch task returns success', async ({}, testInfo) => {
    test.skip(!createdTaskId, 'No createdTaskId from TASKS-POST-001');

    const patchPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${createdTaskId}`;
    const payload = { title: `PW task updated ${Date.now()}` };
    const res = await client.patch(patchPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: patchPath, body: payload }
    });

    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'updated',
      nonEmptyPaths: ['data.taskId']
    });
  });

  test('[TASKS-DELETE-001] : Delete branch task returns success', async ({}, testInfo) => {
    test.skip(!createdTaskId, 'No createdTaskId from TASKS-POST-001');

    const delPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${createdTaskId}`;
    const res = await client.delete(delPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: delPath }
    });

    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'deleted',
      nonEmptyPaths: ['data.taskId']
    });
    createdTaskId = undefined;
  });
});
