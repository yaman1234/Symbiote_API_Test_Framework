const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId } = require('../../../../../helpers/tasksContext');

test.describe('Task settings @tasks', () => {
  const supervisor = getSeededAccountByKey('t3_supervisor');
  const owner = getSeededAccountByKey('t1_owner');
  const supervisorEmail = env.TASKS_SUPERVISOR_EMAIL || (supervisor && supervisor.email) || '';
  const supervisorPassword = env.TASKS_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD || '';
  const ownerEmail = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const ownerPassword = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let ownerSession;
  let supervisorSession;
  let branchId;

  test.beforeAll(async () => {
    test.skip(!ownerEmail || !ownerPassword, 'Set owner credentials (TASKS_OWNER_EMAIL / TASKS_OWNER_PASSWORD or USER_MGMT_* / LOGIN_PASSWORD)');
    test.skip(!supervisorEmail || !supervisorPassword, 'Set supervisor credentials (TASKS_SUPERVISOR_EMAIL / TASKS_SUPERVISOR_PASSWORD or LOGIN_PASSWORD)');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    ownerSession = await loginWithOtp(client, { email: ownerEmail, password: ownerPassword, otp: env.VERIFY_OTP });
    supervisorSession = await loginWithOtp(client, { email: supervisorEmail, password: supervisorPassword, otp: env.VERIFY_OTP });
    test.skip(!ownerSession.ok, ownerSession.ok ? '' : `Owner OTP login failed at ${ownerSession.step}`);
    test.skip(!supervisorSession.ok, supervisorSession.ok ? '' : `Supervisor OTP login failed at ${supervisorSession.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, ownerSession.branchId);
    test.skip(!branchId, 'No branch id for task settings tests');
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-SETTINGS-011] : Non-owner create status is forbidden (403/401)', async ({}, testInfo) => {
    const path = `orgs/${supervisorSession.orgId}/task-settings/statuses`;
    const payload = { name: `NoOwnerStatus-${Date.now()}`, color: '#2563EB', isDone: false };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${supervisorSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-non-owner-create',
      response: res,
      loginEmail: supervisorSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([401, 403].includes(res.status()), `Expected 401 or 403, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-SETTINGS-012] : Duplicate status name is rejected (422/409/400)', async ({}, testInfo) => {
    const listPath = `orgs/${ownerSession.orgId}/task-settings/statuses`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const listBody = await listRes.json();
    test.skip(!(listRes.ok()), `Status list failed: HTTP ${listRes.status()}`);
    const existing = Array.isArray(listBody?.data) ? listBody.data[0] : null;
    test.skip(!(existing?.name), 'No existing status name found');

    const path = `orgs/${ownerSession.orgId}/task-settings/statuses`;
    const payload = { name: existing.name, color: '#2563EB', isDone: false };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-duplicate-name',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 409, 422].includes(res.status()), `Expected 400/409/422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-SETTINGS-013] : Duplicate order values on statuses reorder are rejected (422/400)', async ({}, testInfo) => {
    const listPath = `orgs/${ownerSession.orgId}/task-settings/statuses`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const listBody = await listRes.json();
    test.skip(!(listRes.ok()), `Status list failed: HTTP ${listRes.status()}`);
    const rows = Array.isArray(listBody?.data) ? listBody.data : [];
    test.skip(!(rows.length >= 2), 'Need at least 2 statuses for reorder-negative');
    const [a, b] = rows;

    const path = `orgs/${ownerSession.orgId}/task-settings/statuses/reorder`;
    const payload = { items: [{ id: a.id, order: 1 }, { id: b.id, order: 1 }] };
    const res = await client.put(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-reorder-duplicate-order',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-SETTINGS-014] : Delete status in use by task is blocked (422/409/400)', async ({}, testInfo) => {
    const statusPath = `orgs/${ownerSession.orgId}/task-settings/statuses`;
    const statusPayload = { name: `InUseStatus-${Date.now()}`, color: '#9333EA', isDone: false };
    const createStatusRes = await client.post(statusPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: statusPayload
    });
    const createStatusBody = await createStatusRes.json();
    test.skip(!(createStatusRes.ok()), `Create status failed: HTTP ${createStatusRes.status()}`);
    const statusId = createStatusBody?.data?.id;
    test.skip(!(statusId), 'No status id from status create');

    const prioritiesRes = await client.get(`orgs/${ownerSession.orgId}/task-settings/priorities`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const prioritiesBody = await prioritiesRes.json();
    test.skip(!(prioritiesRes.ok()), `Priority list failed: HTTP ${prioritiesRes.status()}`);
    const priorityId = Array.isArray(prioritiesBody?.data) ? prioritiesBody.data[0]?.id : undefined;
    test.skip(!(priorityId), 'No priority id available');

    const taskPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks`;
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const taskPayload = {
      title: `Status in-use task ${Date.now()}`,
      description: 'status in use negative',
      statusId,
      priorityId,
      assigneeId: ownerSession.orgUserId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const createTaskRes = await client.post(taskPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: taskPayload
    });
    const createTaskBody = await createTaskRes.json();
    test.skip(!(createTaskRes.ok()), `Create task failed: HTTP ${createTaskRes.status()}`);
    const taskId = createTaskBody?.data?.taskId;
    test.skip(!(taskId), 'No task id from task create');

    const delStatusPath = `orgs/${ownerSession.orgId}/task-settings/statuses/${statusId}`;
    const delStatusRes = await client.delete(delStatusPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const delStatusBody = await delStatusRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-delete-in-use',
      response: delStatusRes,
      loginEmail: ownerSession.loginEmail,
      status: delStatusRes.status(),
      statusText: delStatusRes.statusText(),
      body: delStatusBody,
      requestPayload: { path: delStatusPath }
    });
    expect([400, 409, 422].includes(delStatusRes.status()), `Expected 400/409/422, got ${delStatusRes.status()}`).toBeTruthy();
    expectJsonContentType(delStatusRes);
    expectJsonErrorBody(delStatusBody, { statusCode: delStatusRes.status(), requireErrorCode: true });

    await client.delete(`orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    await client.delete(delStatusPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
  });

  test('[TASKS-SETTINGS-015] : Duplicate priority name is rejected (422/409/400)', async ({}, testInfo) => {
    const listPath = `orgs/${ownerSession.orgId}/task-settings/priorities`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const listBody = await listRes.json();
    test.skip(!(listRes.ok()), `Priority list failed: HTTP ${listRes.status()}`);
    const existing = Array.isArray(listBody?.data) ? listBody.data[0] : null;
    test.skip(!(existing?.name), 'No existing priority name found');

    const path = `orgs/${ownerSession.orgId}/task-settings/priorities`;
    const payload = { name: existing.name, color: '#0EA5E9' };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priority-duplicate-name',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 409, 422].includes(res.status()), `Expected 400/409/422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-SETTINGS-016] : Delete priority in use by task is blocked (422/409/400)', async ({}, testInfo) => {
    const priorityPath = `orgs/${ownerSession.orgId}/task-settings/priorities`;
    const priorityPayload = { name: `InUsePriority-${Date.now()}`, color: '#F97316' };
    const createPriorityRes = await client.post(priorityPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: priorityPayload
    });
    const createPriorityBody = await createPriorityRes.json();
    test.skip(!(createPriorityRes.ok()), `Create priority failed: HTTP ${createPriorityRes.status()}`);
    const priorityId = createPriorityBody?.data?.id;
    test.skip(!(priorityId), 'No priority id from create');

    const statusesRes = await client.get(`orgs/${ownerSession.orgId}/task-settings/statuses`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const statusesBody = await statusesRes.json();
    test.skip(!(statusesRes.ok()), `Status list failed: HTTP ${statusesRes.status()}`);
    const statusId = Array.isArray(statusesBody?.data) ? statusesBody.data[0]?.id : undefined;
    test.skip(!(statusId), 'No status id available');

    const taskPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks`;
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const taskPayload = {
      title: `Priority in-use task ${Date.now()}`,
      description: 'priority in use negative',
      statusId,
      priorityId,
      assigneeId: ownerSession.orgUserId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const createTaskRes = await client.post(taskPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: taskPayload
    });
    const createTaskBody = await createTaskRes.json();
    test.skip(!(createTaskRes.ok()), `Create task failed: HTTP ${createTaskRes.status()}`);
    const taskId = createTaskBody?.data?.taskId;
    test.skip(!(taskId), 'No task id from task create');

    const delPriorityPath = `orgs/${ownerSession.orgId}/task-settings/priorities/${priorityId}`;
    const delPriorityRes = await client.delete(delPriorityPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const delPriorityBody = await delPriorityRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priority-delete-in-use',
      response: delPriorityRes,
      loginEmail: ownerSession.loginEmail,
      status: delPriorityRes.status(),
      statusText: delPriorityRes.statusText(),
      body: delPriorityBody,
      requestPayload: { path: delPriorityPath }
    });
    expect([400, 409, 422].includes(delPriorityRes.status()), `Expected 400/409/422, got ${delPriorityRes.status()}`).toBeTruthy();
    expectJsonContentType(delPriorityRes);
    expectJsonErrorBody(delPriorityBody, { statusCode: delPriorityRes.status(), requireErrorCode: true });

    await client.delete(`orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    await client.delete(delPriorityPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
  });
});
