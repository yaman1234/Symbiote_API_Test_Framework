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

test.describe('Create task @tasks', () => {
  const owner = getSeededAccountByKey('t1_owner');
  const supervisor = getSeededAccountByKey('t3_supervisor');
  const email = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const password = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;
  let validStatusId;
  let validPriorityId;
  let validAssigneeId;

  test.beforeAll(async () => {
    test.skip(!email, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id available for task create tests');

    const ids = await resolveTaskCreateIds(client, session, branchId);
    test.skip(!ids.ok, ids.reason || 'Could not resolve status/priority/assignee for create tests');

    validStatusId = ids.statusId;
    validPriorityId = ids.priorityId;
    validAssigneeId = ids.assigneeId;
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  function buildValidPayload() {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      title: `PW create negative ${Date.now()}`,
      description: 'negative validation payload',
      statusId: validStatusId,
      priorityId: validPriorityId,
      assigneeId: validAssigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderOffsetsMinutes: [60, 15]
    };
  }

  test('[TASKS-POST-003] : Create task without startAt returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const payload = buildValidPayload();
    delete payload.startAt;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-missing-startAt',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });
  });

  test('[TASKS-POST-004] : Create task with endAt not after startAt returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const payload = buildValidPayload();
    payload.endAt = payload.startAt;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-invalid-timeline',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });
  });

  test('[TASKS-POST-005] : Create task with invalid UUID fields returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const payload = buildValidPayload();
    payload.statusId = 'not-a-uuid';
    payload.priorityId = 'still-not-a-uuid';
    payload.assigneeId = 'invalid-assignee';
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-invalid-uuids',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });
  });

  test('[TASKS-POST-006] : Create task with invalid reminder offsets returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const payload = buildValidPayload();
    payload.reminderOffsetsMinutes = [-5, 'foo', 15];
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-invalid-reminders',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true, requireErrorKey: true });
  });

  test('[TASKS-POST-007] : Create task without JWT returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks';
    const payload = {
      title: 'Unauthorized create task',
      description: 'Should fail due to missing token',
      statusId: '11111111-1111-1111-1111-111111111111',
      priorityId: '22222222-2222-2222-2222-222222222222',
      assigneeId: '33333333-3333-3333-3333-333333333333',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
    const res = await client.post(path, { data: payload });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-unauth',
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

  test('[TASKS-POST-008] : Create task in unauthorized branch scope returns 4xx', async ({}, testInfo) => {
    const supervisorEmail = env.TASKS_SUPERVISOR_EMAIL || (supervisor && supervisor.email) || '';
    const supervisorPassword = env.TASKS_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD || '';
    test.skip(!supervisorEmail || !supervisorPassword, 'Set supervisor credentials for branch-scope negative case');

    const supervisorSession = await loginWithOtp(client, {
      email: supervisorEmail,
      password: supervisorPassword,
      otp: env.VERIFY_OTP
    });
    test.skip(!supervisorSession.ok, supervisorSession.ok ? '' : `Supervisor OTP login failed at ${supervisorSession.step}`);

    const wrongBranchId = env.USER_CREATE_WRONG_BRANCH_ID || '';
    test.skip(!wrongBranchId, 'Set USER_CREATE_WRONG_BRANCH_ID for cross-branch scope test');
    test.skip(String(wrongBranchId) === String(supervisorSession.branchId || ''), 'USER_CREATE_WRONG_BRANCH_ID must differ from supervisor branch');

    const path = `orgs/${supervisorSession.orgId}/branches/${wrongBranchId}/tasks`;
    const payload = buildValidPayload();
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${supervisorSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/create-cross-branch-forbidden',
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
  });
});
