const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const {
  expectHttpStatus,
  expectJsonContentType,
  expectJsonErrorBody
} = require('../../../../../helpers/assertions');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId, resolveTaskCreateIds } = require('../../../../../helpers/tasksContext');

test.describe('Update task @tasks', () => {
  const owner = getSeededAccountByKey('t1_owner');
  const supervisor = getSeededAccountByKey('t3_supervisor');
  const ownerEmail = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const ownerPassword = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let ownerSession;
  let branchId;
  let statusId;
  let priorityId;
  let assigneeId;

  async function createTask(titleSuffix, hours = 2) {
    const start = new Date();
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    const payload = {
      title: `PW patch negative ${titleSuffix} ${Date.now()}`,
      description: 'negative patch seed',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderOffsetsMinutes: [60, 15]
    };
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks`;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    return { res, body, payload, taskId: body?.data?.taskId };
  }

  async function deleteTask(taskId) {
    if (!taskId) return;
    await client.delete(`orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
  }

  test.beforeAll(async () => {
    test.skip(!ownerEmail, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!ownerPassword, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    ownerSession = await loginWithOtp(client, { email: ownerEmail, password: ownerPassword, otp: env.VERIFY_OTP });
    test.skip(!ownerSession.ok, ownerSession.ok ? '' : `Owner OTP login failed at ${ownerSession.step}`);

    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, ownerSession.branchId);
    test.skip(!branchId, 'No branch id available for patch negative tests');

    const listPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      params: { page: 1, pageSize: 5, sort: 'createdAt', order: 'desc' }
    });
    const listBody = await listRes.json();
    test.skip(!listRes.ok(), `List tasks failed: HTTP ${listRes.status()}`);
    const first = Array.isArray(listBody?.data?.items) ? listBody.data.items[0] : null;
    if (first && first?.status?.id && first?.priority?.id) {
      statusId = first.status.id;
      priorityId = first.priority.id;
      assigneeId = first?.assignee?.id || ownerSession.orgUserId;
    } else {
      const ids = await resolveTaskCreateIds(client, ownerSession, branchId);
      test.skip(!ids.ok, ids.reason || 'Could not resolve task create ids');
      statusId = ids.statusId;
      priorityId = ids.priorityId;
      assigneeId = ids.assigneeId;
    }
    test.skip(!statusId || !priorityId || !assigneeId, 'Missing statusId/priorityId/assigneeId');
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-PATCH-004] : Invalid task timeline update (endAt <= startAt) returns 422/400', async ({}, testInfo) => {
    const seed = await createTask('timeline');
    test.skip(!seed.res.ok() || !seed.taskId, `Failed to create seed task: HTTP ${seed.res.status()}`);

    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${seed.taskId}`;
    const nowIso = new Date().toISOString();
    const payload = { startAt: nowIso, endAt: nowIso };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-invalid-timeline',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });
    await deleteTask(seed.taskId);
  });

  test('[TASKS-PATCH-005] : Subtask update outside parent timeline is blocked (422/400)', async ({}, testInfo) => {
    const parent = await createTask('parent-window', 4);
    test.skip(!parent.res.ok() || !parent.taskId, `Failed to create parent seed task: HTTP ${parent.res.status()}`);

    const subtaskPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${parent.taskId}/subtasks`;
    const subtaskPayload = {
      title: `PW subtask ${Date.now()}`,
      description: 'subtask timeline test',
      statusId,
      priorityId,
      assigneeId,
      startAt: parent.payload.startAt,
      endAt: new Date(new Date(parent.payload.startAt).getTime() + 60 * 60 * 1000).toISOString(),
      reminderOffsetsMinutes: [30]
    };
    const subtaskRes = await client.post(subtaskPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: subtaskPayload
    });
    const subtaskBody = await subtaskRes.json();
    test.skip(!subtaskRes.ok(), `Subtask seed creation failed: HTTP ${subtaskRes.status()}`);
    const subtaskId = subtaskBody?.data?.taskId || subtaskBody?.data?.id;
    test.skip(!subtaskId, 'No subtask id returned by create subtask');

    const patchPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${subtaskId}`;
    const payload = {
      startAt: new Date(new Date(parent.payload.endAt).getTime() + 60 * 1000).toISOString(),
      endAt: new Date(new Date(parent.payload.endAt).getTime() + 60 * 60 * 1000).toISOString()
    };
    const res = await client.patch(patchPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-subtask-outside-parent',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: patchPath, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });

    await deleteTask(parent.taskId);
  });

  test('[TASKS-PATCH-006] : Parent timeline shrink blocked when subtasks would fall outside (422/400)', async ({}, testInfo) => {
    const parent = await createTask('parent-shrink', 4);
    test.skip(!parent.res.ok() || !parent.taskId, `Failed to create parent seed task: HTTP ${parent.res.status()}`);

    const parentStart = new Date(parent.payload.startAt);
    const childStart = new Date(parentStart.getTime() + 2 * 60 * 60 * 1000);
    const childEnd = new Date(parentStart.getTime() + 3 * 60 * 60 * 1000);
    const subtaskPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${parent.taskId}/subtasks`;
    const subtaskPayload = {
      title: `PW subtask child ${Date.now()}`,
      description: 'subtask for parent shrink check',
      statusId,
      priorityId,
      assigneeId,
      startAt: childStart.toISOString(),
      endAt: childEnd.toISOString(),
      reminderOffsetsMinutes: [30]
    };
    const subtaskRes = await client.post(subtaskPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: subtaskPayload
    });
    const subtaskBody = await subtaskRes.json();
    test.skip(!subtaskRes.ok(), `Subtask seed creation failed: HTTP ${subtaskRes.status()}`);
    const subtaskId = subtaskBody?.data?.taskId || subtaskBody?.data?.id;
    test.skip(!subtaskId, 'No subtask id returned by create subtask');

    const patchPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${parent.taskId}`;
    const shrinkPayload = {
      endAt: new Date(parentStart.getTime() + 90 * 60 * 1000).toISOString()
    };
    const res = await client.patch(patchPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: shrinkPayload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-parent-shrink-blocked',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: patchPath, body: shrinkPayload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });

    await deleteTask(parent.taskId);
  });

  test('[TASKS-PATCH-007] : Missing JWT on update request returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/00000000-0000-0000-0000-000000000003';
    const payload = { title: 'unauthorized patch' };
    const res = await client.patch(path, { data: payload });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-unauth',
      response: res,
      loginEmail: null,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectHttpStatus(res, 401);
    expectJsonContentType(res);
    expectJsonErrorBody(body, {
      statusCode: 401,
      messageIncludes: 'Authentication',
      requireErrorCode: true,
      requireErrorKey: true
    });
  });

  test('[TASKS-PATCH-008] : Unknown taskId on update returns 404', async ({}, testInfo) => {
    const unknownTaskId = '00000000-0000-0000-0000-0000000000ee';
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${unknownTaskId}`;
    const payload = { title: 'unknown task update' };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-unknown-task',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectHttpStatus(res, 404);
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: 404, requireErrorCode: true, requireErrorKey: true });
  });

  test('[TASKS-PATCH-009] : Cross-branch update attempt returns 403/404', async ({}, testInfo) => {
    const supervisorEmail = env.TASKS_SUPERVISOR_EMAIL || (supervisor && supervisor.email) || '';
    const supervisorPassword = env.TASKS_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD || '';
    test.skip(!supervisorEmail || !supervisorPassword, 'Set supervisor credentials for cross-branch patch test');

    const supervisorSession = await loginWithOtp(client, {
      email: supervisorEmail,
      password: supervisorPassword,
      otp: env.VERIFY_OTP
    });
    test.skip(!supervisorSession.ok, supervisorSession.ok ? '' : `Supervisor OTP login failed at ${supervisorSession.step}`);

    const wrongBranchId = env.USER_CREATE_WRONG_BRANCH_ID || '';
    test.skip(!wrongBranchId, 'Set USER_CREATE_WRONG_BRANCH_ID for cross-branch patch case');
    test.skip(String(wrongBranchId) === String(supervisorSession.branchId || ''), 'USER_CREATE_WRONG_BRANCH_ID must differ from supervisor branch');

    const seed = await createTask('cross-branch-target');
    test.skip(!seed.res.ok() || !seed.taskId, `Failed to create patch target task: HTTP ${seed.res.status()}`);
    const path = `orgs/${supervisorSession.orgId}/branches/${wrongBranchId}/tasks/${seed.taskId}`;
    const payload = { title: `cross branch update ${Date.now()}` };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${supervisorSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-cross-branch-forbidden',
      response: res,
      loginEmail: supervisorSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([403, 404].includes(res.status()), `Expected 403 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });

    await deleteTask(seed.taskId);
  });
});
