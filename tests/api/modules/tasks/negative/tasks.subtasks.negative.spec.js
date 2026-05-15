const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectHttpStatus,
  expectJsonContentType,
  expectJsonErrorBody,
  expectHttpOkOrCreated
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId, resolveTaskCreateIds } = require('../../../../../helpers/tasksContext');

test.describe('Subtasks @tasks', () => {
  const owner = getSeededAccountByKey('t1_owner');
  const ownerEmail = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const ownerPassword = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;
  let statusId;
  let priorityId;
  let assigneeId;
  let parentTaskId;

  async function authPost(path, data) {
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data
    });
    const body = await res.json();
    return { res, body };
  }

  test.beforeAll(async () => {
    test.skip(!ownerEmail, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!ownerPassword, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email: ownerEmail, password: ownerPassword, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `Owner OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id for subtasks negatives');

    const ids = await resolveTaskCreateIds(client, session, branchId);
    test.skip(!ids.ok, ids.reason || 'Could not resolve ids for subtask negative parent');
    statusId = ids.statusId;
    priorityId = ids.priorityId;
    assigneeId = ids.assigneeId;

    const start = new Date();
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const createParentPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const parentPayload = {
      title: `Subtask negative parent ${Date.now()}`,
      description: 'parent for negatives',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const parent = await authPost(createParentPath, parentPayload);
    test.skip(!(parent.res.ok()), `Parent seed task failed: HTTP ${parent.res.status()}`);
    parentTaskId = parent.body?.data?.taskId;
    test.skip(!(parentTaskId), 'No parent task id');
  });

  test.afterAll(async () => {
    if (client && parentTaskId) {
      await client.delete(`orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
    }
    if (client) await client.dispose();
  });

  test('[TASKS-SUBTASK-005] : Missing JWT on create subtask returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/00000000-0000-0000-0000-000000000003/subtasks';
    const payload = {
      title: 'Unauthorized subtask',
      statusId: '11111111-1111-1111-1111-111111111111',
      priorityId: '22222222-2222-2222-2222-222222222222',
      assigneeId: '33333333-3333-3333-3333-333333333333',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    const res = await client.post(path, { data: payload });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-create-unauth',
      response: res,
      loginEmail: null,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectHttpStatus(res, 401);
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: 401, requireErrorCode: true });
  });

  test('[TASKS-SUBTASK-006] : Create subtask outside parent timeline returns 422/400', async ({}, testInfo) => {
    const detailPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}`;
    const detailRes = await client.get(detailPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const detailBody = await detailRes.json();
    test.skip(!(detailRes.ok()), `Parent detail failed: HTTP ${detailRes.status()}`);
    const parentEnd = detailBody?.data?.endAt;
    test.skip(!(parentEnd), 'Parent endAt missing');

    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}/subtasks`;
    const payload = {
      title: `Out of range child ${Date.now()}`,
      description: 'timeline violation child',
      statusId,
      priorityId,
      assigneeId,
      startAt: new Date(new Date(parentEnd).getTime() + 60 * 1000).toISOString(),
      endAt: new Date(new Date(parentEnd).getTime() + 60 * 60 * 1000).toISOString()
    };
    const out = await authPost(path, payload);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-create-outside-parent',
      response: out.res,
      loginEmail: session.loginEmail,
      status: out.res.status(),
      statusText: out.res.statusText(),
      body: out.body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(out.res.status()), `Expected 400 or 422, got ${out.res.status()}`).toBeTruthy();
    expectJsonContentType(out.res);
    expectJsonErrorBody(out.body, { statusCode: out.res.status(), requireErrorCode: true });
  });

  test('[TASKS-SUBTASK-007] : Invalid parent task id on create returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/00000000-0000-0000-0000-0000000000ac/subtasks`;
    const payload = {
      title: 'Invalid parent child',
      description: 'invalid parent path',
      statusId,
      priorityId,
      assigneeId,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    const out = await authPost(path, payload);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-create-invalid-parent',
      response: out.res,
      loginEmail: session.loginEmail,
      status: out.res.status(),
      statusText: out.res.statusText(),
      body: out.body,
      requestPayload: { path, body: payload }
    });
    expect([400, 404].includes(out.res.status()), `Expected 400 or 404, got ${out.res.status()}`).toBeTruthy();
    expectJsonContentType(out.res);
    expectJsonErrorBody(out.body, { statusCode: out.res.status(), requireErrorCode: true });
  });

  test('[TASKS-SUBTASK-008] : Reparent unknown task id returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/00000000-0000-0000-0000-0000000000ad/reparent`;
    const payload = { newParentTaskId: parentTaskId };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-reparent-unknown-task',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 404].includes(res.status()), `Expected 400 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-SUBTASK-009] : Move-under-parent invalid ordered ids payload returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}/move-under-parent`;
    const payload = {
      parentTaskId,
      toStatusId: statusId,
      toOrderedTaskIds: ['not-a-uuid', 'not-a-uuid']
    };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-move-under-parent-invalid-order',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });
});
