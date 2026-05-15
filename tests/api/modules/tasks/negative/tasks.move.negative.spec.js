const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectHttpStatus,
  expectJsonContentType,
  expectJsonErrorBody
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId, getColumnStatusId } = require('../../../../../helpers/tasksContext');

function extractColumns(boardBody) {
  return Array.isArray(boardBody?.data?.columns) ? boardBody.data.columns : [];
}

function getColumnTaskIds(column) {
  const tasks = Array.isArray(column?.tasks) ? column.tasks : [];
  return tasks.map((t) => t?.id).filter(Boolean);
}

test.describe('Move task between board columns @tasks', () => {
  const owner = getSeededAccountByKey('t1_owner');
  const supervisor = getSeededAccountByKey('t3_supervisor');
  const ownerEmail = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const ownerPassword = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let ownerSession;
  let branchId;

  async function getBoard() {
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/board`;
    const res = await client.get(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const body = await res.json();
    return { path, res, body, columns: extractColumns(body) };
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
    test.skip(!branchId, 'No branch id for task move tests');
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-MOVE-003] : Missing JWT on move request returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/00000000-0000-0000-0000-000000000003/move';
    const payload = {
      toStatusId: '11111111-1111-1111-1111-111111111111',
      toOrderedTaskIds: ['00000000-0000-0000-0000-000000000003']
    };
    const res = await client.patch(path, { data: payload });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-unauth',
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

  test('[TASKS-MOVE-004] : Unknown taskId on move returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/00000000-0000-0000-0000-0000000000ab/move`;
    const payload = {
      toStatusId: '11111111-1111-1111-1111-111111111111',
      toOrderedTaskIds: ['00000000-0000-0000-0000-0000000000ab']
    };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-unknown-task',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 404].includes(res.status()), `Expected 400 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-MOVE-005] : toOrderedTaskIds missing moved taskId is rejected (422/400)', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    const destination = board.columns.find(
      (c) => getColumnStatusId(c) && getColumnStatusId(c) !== getColumnStatusId(source)
    );
    test.skip(!source || !destination, 'Need source and destination columns');
    const sourceIds = getColumnTaskIds(source);
    const destinationIds = getColumnTaskIds(destination);
    const movedTaskId = sourceIds[0];
    const payload = {
      toStatusId: getColumnStatusId(destination),
      toOrderedTaskIds: [...destinationIds], // intentionally missing movedTaskId
      fromOrderedTaskIds: sourceIds.slice(1)
    };
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${movedTaskId}/move`;
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-missing-moved-id',
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

  test('[TASKS-MOVE-006] : Cross-column move without fromOrderedTaskIds is rejected (422/400)', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    const destination = board.columns.find(
      (c) => getColumnStatusId(c) && getColumnStatusId(c) !== getColumnStatusId(source)
    );
    test.skip(!source || !destination, 'Need source and destination columns');
    const sourceIds = getColumnTaskIds(source);
    const destinationIds = getColumnTaskIds(destination);
    const movedTaskId = sourceIds[0];
    const payload = {
      toStatusId: getColumnStatusId(destination),
      toOrderedTaskIds: [movedTaskId, ...destinationIds]
    };
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${movedTaskId}/move`;
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-missing-from-order',
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

  test('[TASKS-MOVE-007] : Invalid toStatusId format is rejected (422/400)', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    test.skip(!(source), 'Need one source column with task');
    const movedTaskId = getColumnTaskIds(source)[0];
    const payload = {
      toStatusId: 'not-a-uuid',
      toOrderedTaskIds: [movedTaskId]
    };
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${movedTaskId}/move`;
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-invalid-status-id',
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

  test('[TASKS-MOVE-008] : Invalid ordered ids payload is rejected (422/400)', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    test.skip(!(source), 'Need one source column with task');
    const movedTaskId = getColumnTaskIds(source)[0];
    const payload = {
      toStatusId: getColumnStatusId(source),
      toOrderedTaskIds: [movedTaskId, 'not-a-uuid', movedTaskId]
    };
    const path = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${movedTaskId}/move`;
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-invalid-ordered-ids',
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

  test('[TASKS-MOVE-009] : Cross-branch move attempt by supervisor is rejected (403/404)', async ({}, testInfo) => {
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

    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    test.skip(!(source), 'Need one source column with task');
    const movedTaskId = getColumnTaskIds(source)[0];
    const payload = {
      toStatusId: getColumnStatusId(source),
      toOrderedTaskIds: [movedTaskId]
    };
    const path = `orgs/${supervisorSession.orgId}/branches/${wrongBranchId}/tasks/${movedTaskId}/move`;
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${supervisorSession.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-cross-branch-forbidden',
      response: res,
      loginEmail: supervisorSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([403, 404].includes(res.status()), `Expected 403 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-MOVE-010] : Moving a subtask via top-level move endpoint is rejected (422/400)', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    test.skip(!(source), 'Need one source column with task');
    const parentTaskId = getColumnTaskIds(source)[0];

    const detailPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${parentTaskId}`;
    const detailRes = await client.get(detailPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
    const detailBody = await detailRes.json();
    test.skip(!(detailRes.ok()), `Detail fetch failed: HTTP ${detailRes.status()}`);

    const startAt = detailBody?.data?.startAt;
    const endAt = detailBody?.data?.endAt;
    const statusId = detailBody?.data?.status?.id;
    const priorityId = detailBody?.data?.priority?.id;
    const assigneeId = detailBody?.data?.assignee?.id || ownerSession.orgUserId;
    test.skip(!startAt || !endAt || !statusId || !priorityId || !assigneeId, 'Missing data for subtask seed creation');

    const subtaskPath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${parentTaskId}/subtasks`;
    const subtaskPayload = {
      title: `Move reject subtask ${Date.now()}`,
      description: 'subtask move-negative',
      statusId,
      priorityId,
      assigneeId,
      startAt,
      endAt
    };
    const subtaskRes = await client.post(subtaskPath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: subtaskPayload
    });
    const subtaskBody = await subtaskRes.json();
    test.skip(!(subtaskRes.ok()), `Subtask creation failed: HTTP ${subtaskRes.status()}`);
    const subtaskId = subtaskBody?.data?.taskId || subtaskBody?.data?.id;
    test.skip(!(subtaskId), 'No subtask id returned');

    const movePath = `orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${subtaskId}/move`;
    const movePayload = {
      toStatusId: statusId,
      toOrderedTaskIds: [subtaskId]
    };
    const res = await client.patch(movePath, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
      data: movePayload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/move-subtask-rejected',
      response: res,
      loginEmail: ownerSession.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path: movePath, body: movePayload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });

    await client.delete(`orgs/${ownerSession.orgId}/branches/${branchId}/tasks/${parentTaskId}`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` }
    });
  });
});
