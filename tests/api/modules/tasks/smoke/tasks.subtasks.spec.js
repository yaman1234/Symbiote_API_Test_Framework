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

test.describe('Subtasks @tasks', () => {
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
  let parentTaskId;
  let subtaskAId;
  let subtaskBId;

  async function post(path, data) {
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data
    });
    const body = await res.json();
    return { res, body };
  }

  async function patch(path, data) {
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data
    });
    const body = await res.json();
    return { res, body };
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
    test.skip(!branchId, 'No branch id for subtasks tests');

    const ids = await resolveTaskCreateIds(client, session, branchId);
    test.skip(!ids.ok, ids.reason || 'Could not resolve ids for subtasks parent');
    statusId = ids.statusId;
    priorityId = ids.priorityId;
    assigneeId = ids.assigneeId;

    const start = new Date();
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const createParentPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const parentPayload = {
      title: `Subtask parent ${Date.now()}`,
      description: 'parent for subtasks flow',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString()
    };
    const parent = await post(createParentPath, parentPayload);
    test.skip(!parent.res.ok(), `Parent seed task failed: HTTP ${parent.res.status()}`);
    parentTaskId = parent.body?.data?.taskId;
    test.skip(!parentTaskId, 'No parent task id returned');
  });

  test.afterAll(async () => {
    if (client && parentTaskId) {
      await client.delete(`orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
    }
    if (client) await client.dispose();
  });

  test('[TASKS-SUBTASK-001] : Create subtask under parent succeeds', async ({}, testInfo) => {
    const detailPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}`;
    const detailRes = await client.get(detailPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const detailBody = await detailRes.json();
    test.skip(!(detailRes.ok()), `Parent detail fetch failed: HTTP ${detailRes.status()}`);
    const parentStart = detailBody?.data?.startAt;
    const parentEnd = detailBody?.data?.endAt;
    test.skip(!parentStart || !parentEnd, 'Parent timeline unavailable');

    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${parentTaskId}/subtasks`;
    const payloadA = {
      title: `Subtask A ${Date.now()}`,
      description: 'first subtask',
      statusId,
      priorityId,
      assigneeId,
      startAt: parentStart,
      endAt: new Date(new Date(parentStart).getTime() + 60 * 60 * 1000).toISOString(),
      reminderOffsetsMinutes: [30]
    };
    const a = await post(path, payloadA);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-create-a',
      response: a.res,
      loginEmail: session.loginEmail,
      status: a.res.status(),
      statusText: a.res.statusText(),
      body: a.body,
      requestPayload: { path, body: payloadA }
    });
    expectHttpOkOrCreated(a.res);
    expectJsonContentType(a.res);
    expectJsonSuccessBody(a.body, { messageIncludes: 'created' });
    subtaskAId = a.body?.data?.taskId || a.body?.data?.id;
    test.skip(!(subtaskAId), 'No subtask A id returned');

    const payloadB = {
      title: `Subtask B ${Date.now()}`,
      description: 'second subtask',
      statusId,
      priorityId,
      assigneeId,
      startAt: new Date(new Date(parentStart).getTime() + 65 * 60 * 1000).toISOString(),
      endAt: new Date(new Date(parentStart).getTime() + 120 * 60 * 1000).toISOString(),
      reminderOffsetsMinutes: [15]
    };
    const b = await post(path, payloadB);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-create-b',
      response: b.res,
      loginEmail: session.loginEmail,
      status: b.res.status(),
      statusText: b.res.statusText(),
      body: b.body,
      requestPayload: { path, body: payloadB }
    });
    expectHttpOkOrCreated(b.res);
    expectJsonContentType(b.res);
    expectJsonSuccessBody(b.body, { messageIncludes: 'created' });
    subtaskBId = b.body?.data?.taskId || b.body?.data?.id;
    test.skip(!(subtaskBId), 'No subtask B id returned');
  });

  test('[TASKS-SUBTASK-002] : Reparent subtask to top-level succeeds', async ({}, testInfo) => {
    test.skip(!(subtaskAId), 'subtaskAId not available');
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${subtaskAId}/reparent`;
    const payload = { newParentTaskId: null };
    const out = await patch(path, payload);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-reparent-top-level',
      response: out.res,
      loginEmail: session.loginEmail,
      status: out.res.status(),
      statusText: out.res.statusText(),
      body: out.body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(out.res, out.body);
    expectJsonContentType(out.res);
    expectJsonSuccessBody(out.body, { statusCode: 200 });
  });

  test('[TASKS-SUBTASK-003] : Reparent subtask back under parent succeeds', async ({}, testInfo) => {
    test.skip(!subtaskAId || !parentTaskId, 'subtaskAId/parentTaskId not available');
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${subtaskAId}/reparent`;
    const payload = { newParentTaskId: parentTaskId };
    const out = await patch(path, payload);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-reparent-back',
      response: out.res,
      loginEmail: session.loginEmail,
      status: out.res.status(),
      statusText: out.res.statusText(),
      body: out.body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(out.res, out.body);
    expectJsonContentType(out.res);
    expectJsonSuccessBody(out.body, { statusCode: 200 });
  });

  test('[TASKS-SUBTASK-004] : Move-under-parent reorder within same parent scope succeeds', async ({}, testInfo) => {
    test.skip(!subtaskAId || !subtaskBId || !parentTaskId, 'subtask ids/parent id not available');
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${subtaskAId}/move-under-parent`;
    const payload = {
      parentTaskId,
      toStatusId: statusId,
      toOrderedTaskIds: [subtaskBId, subtaskAId]
    };
    const out = await patch(path, payload);
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/subtask-move-under-parent',
      response: out.res,
      loginEmail: session.loginEmail,
      status: out.res.status(),
      statusText: out.res.statusText(),
      body: out.body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(out.res, out.body);
    expectJsonContentType(out.res);
    expectJsonSuccessBody(out.body, { statusCode: 200 });
  });
});
