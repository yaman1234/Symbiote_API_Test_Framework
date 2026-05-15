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

test.describe('Delete task @tasks', () => {
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

  async function createSeedTask() {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const payload = {
      title: `Delete negative seed ${Date.now()}`,
      description: 'seed task',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks`;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    return { res, body, taskId: body?.data?.taskId };
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
    test.skip(!branchId, 'No branch id for delete negative tests');

    const ids = await resolveTaskCreateIds(client, ownerSession, branchId);
    test.skip(!ids.ok, ids.reason || 'Could not resolve status/priority/assignee for delete negative tests');
    statusId = ids.statusId;
    priorityId = ids.priorityId;
    assigneeId = ids.assigneeId;
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-DELETE-005] : Missing JWT on delete request returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/00000000-0000-0000-0000-000000000003';
    const res = await client.delete(path);
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-unauth',
      response: res,
      loginEmail: null,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expectHttpStatus(res, 401);
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: 401, requireErrorCode: true });
  });

  test('[TASKS-DELETE-006] : Unknown taskId delete returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/00000000-0000-0000-0000-0000000000dd`;
    const res = await client.delete(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-unknown-task',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expect([400, 404].includes(res.status()), `Expected 400 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-DELETE-007] : Cross-branch delete attempt by supervisor returns 403/404', async ({}, testInfo) => {
    const supervisorEmail = env.TASKS_SUPERVISOR_EMAIL || (supervisor && supervisor.email) || '';
    const supervisorPassword = env.TASKS_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD || '';
    test.skip(!supervisorEmail || !supervisorPassword, 'Set supervisor credentials (TASKS_SUPERVISOR_EMAIL and TASKS_SUPERVISOR_PASSWORD or LOGIN_PASSWORD)');

    const supervisorSession = await loginWithOtp(client, {
      email: supervisorEmail,
      password: supervisorPassword,
      otp: env.VERIFY_OTP
    });
    test.skip(!(supervisorSession.ok), supervisorSession.ok ? '' : `Supervisor OTP login failed at ${supervisorSession.step}`);

    const wrongBranchId = env.USER_CREATE_WRONG_BRANCH_ID || '';
    test.skip(!(wrongBranchId), 'Set USER_CREATE_WRONG_BRANCH_ID');
    test.skip(String(wrongBranchId) === String(supervisorSession.branchId || ''), 'Wrong branch id must differ from supervisor branch');

    const seed = await createSeedTask();
    expectHttpOkOrCreated(seed.res);
    const taskId = seed.taskId;
    test.skip(!(taskId), 'No seed task id');

    const path = `orgs/${supervisorSession.orgId}/branches/${wrongBranchId}/tasks/${taskId}`;
    const res = await client.delete(path, {
      headers: { Authorization: `Bearer ${supervisorSession.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-cross-branch-forbidden',
      response: res,
      loginEmail: supervisorSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expect([403, 404].includes(res.status()), `Expected 403 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });

    await client.delete(`orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
  });

  test('[TASKS-DELETE-008] : Second delete attempt on same task returns 404/400', async ({}, testInfo) => {
    const seed = await createSeedTask();
    expectHttpOkOrCreated(seed.res);
    const taskId = seed.taskId;
    test.skip(!(taskId), 'No seed task id');

    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${taskId}`;
    const firstDeleteRes = await client.delete(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const firstDeleteBody = await firstDeleteRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-first',
      response: firstDeleteRes,
      loginEmail: ownerSession.loginEmail,
      status: firstDeleteRes.status(),
      statusText: firstDeleteRes.statusText(),
      body: firstDeleteBody,
      requestPayload: { path }
    });

    const secondDeleteRes = await client.delete(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const secondDeleteBody = await secondDeleteRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/delete-second',
      response: secondDeleteRes,
      loginEmail: ownerSession.loginEmail,
      status: secondDeleteRes.status(),
      statusText: secondDeleteRes.statusText(),
      body: secondDeleteBody,
      requestPayload: { path }
    });
    expect([400, 404].includes(secondDeleteRes.status()), `Expected 400 or 404, got ${secondDeleteRes.status()}`).toBeTruthy();
    expectJsonContentType(secondDeleteRes);
    expectJsonErrorBody(secondDeleteBody, { statusCode: secondDeleteRes.status(), requireErrorCode: true });
  });
});
