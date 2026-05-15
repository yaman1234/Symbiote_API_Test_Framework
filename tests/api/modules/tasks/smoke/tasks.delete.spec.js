const { test, expect } = require('@playwright/test');
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
const { resolveTasksBranchId, resolveTaskCreateIds } = require('../../../../../helpers/tasksContext');

test.describe('Delete task @tasks', () => {
  test.describe.configure({ mode: 'serial' });

  const supervisor = getSeededAccountByKey('t3_supervisor');
  const email = (supervisor && supervisor.email) || '';
  const password = env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;
  let statusId;
  let priorityId;
  let assigneeId;

  async function createTask(payload, testInfo, urlHint) {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint,
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    return { path, res, body, taskId: body?.data?.taskId };
  }

  async function deleteTask(taskId, testInfo, urlHint) {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}`;
    const res = await client.delete(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint,
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    return { path, res, body };
  }

  test.beforeAll(async () => {
    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id for task delete tests');

    const ids = await resolveTaskCreateIds(client, session, branchId);
    test.skip(!ids.ok, ids.reason || 'Could not resolve ids for delete smoke');
    statusId = ids.statusId;
    priorityId = ids.priorityId;
    assigneeId = ids.assigneeId;
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-DELETE-002] : Delete parent task with subtask returns deletedCount >= 2', async ({}, testInfo) => {
    const start = new Date();
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const parentPayload = {
      title: `Delete parent ${Date.now()}`,
      description: 'parent for cascade delete test',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const parent = await createTask(parentPayload, testInfo, 'tasks/delete-parent-seed');
    expectHttpOkOrCreated(parent.res);
    const parentId = parent.taskId;
    test.skip(!(parentId), 'No parent task id returned');

    const subtaskPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${parentId}/subtasks`;
    const subtaskPayload = {
      title: `Delete child ${Date.now()}`,
      description: 'child for cascade delete test',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 60 * 60 * 1000).toISOString()
    };
    const subRes = await client.post(subtaskPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: subtaskPayload
    });
    const subBody = await subRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-child-seed',
      response: subRes,
      loginEmail: session.loginEmail,
      status: subRes.status(),
      statusText: subRes.statusText(),
      body: subBody,
      requestPayload: { path: subtaskPath, body: subtaskPayload }
    });
    test.skip(!(subRes.ok()), `Subtask creation failed: HTTP ${subRes.status()}`);

    const del = await deleteTask(parentId, testInfo, 'tasks/delete-parent-cascade');
    expectSuccessStatus(del.res, del.body);
    expectJsonContentType(del.res);
    expectJsonSuccessBody(del.body, {
      messageIncludes: 'deleted',
      nonEmptyPaths: ['data.taskId']
    });
    expect(Number(del.body?.data?.deletedCount || 0)).toBeGreaterThanOrEqual(2);
  });

  test('[TASKS-DELETE-003] : Deleted task is not retrievable via detail endpoint', async ({}, testInfo) => {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const payload = {
      title: `Delete then detail ${Date.now()}`,
      description: 'delete then fetch detail',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const created = await createTask(payload, testInfo, 'tasks/delete-detail-seed');
    expectHttpOkOrCreated(created.res);
    const taskId = created.taskId;
    test.skip(!(taskId), 'No created task id');

    const del = await deleteTask(taskId, testInfo, 'tasks/delete-detail-delete');
    expectSuccessStatus(del.res, del.body);

    const detailPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}`;
    const detailRes = await client.get(detailPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const detailBody = await detailRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-detail-after-delete',
      response: detailRes,
      loginEmail: session.loginEmail,
      status: detailRes.status(),
      statusText: detailRes.statusText(),
      body: detailBody,
      requestPayload: { path: detailPath }
    });
    expect([400, 404].includes(detailRes.status()), `Expected 400 or 404, got ${detailRes.status()}`).toBeTruthy();
  });

  test('[TASKS-DELETE-004] : Delete recurring template task succeeds', async ({}, testInfo) => {
    test.skip(!(process.env.RUN_TASKS_RECURRENCE_TEST === '1'), 'Enable RUN_TASKS_RECURRENCE_TEST=1 to run recurrence delete test');
    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const recurrenceEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const payload = {
      title: `Delete recurring ${Date.now()}`,
      description: 'delete recurring template flow',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      recurrence: {
        frequency: 'WEEKLY',
        executionTime: '09:00',
        endDate: recurrenceEnd.toISOString()
      }
    };
    const created = await createTask(payload, testInfo, 'tasks/delete-recurrence-seed');
    expectHttpOkOrCreated(created.res);
    const taskId = created.taskId;
    test.skip(!(taskId), 'No recurring task id returned');

    const del = await deleteTask(taskId, testInfo, 'tasks/delete-recurrence-template');
    expectSuccessStatus(del.res, del.body);
    expectJsonContentType(del.res);
    expectJsonSuccessBody(del.body, {
      messageIncludes: 'deleted',
      nonEmptyPaths: ['data.taskId']
    });
  });
});
