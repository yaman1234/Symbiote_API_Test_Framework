const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectSuccessStatus,
  expectJsonContentType,
  expectJsonSuccessBody
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId, resolveTaskCreateIds } = require('../../../../../helpers/tasksContext');

test.describe('Update task @tasks', () => {
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
  let updateTaskId;

  async function createTask(titleSuffix) {
    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const payload = {
      title: `PW update ${titleSuffix} ${Date.now()}`,
      description: 'update test task',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderOffsetsMinutes: [60, 15]
    };
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    return { res, body, path, payload, taskId: body?.data?.taskId };
  }

  test.beforeAll(async () => {
    test.skip(!email, 'Seeded supervisor t3_supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id for update tests');

    const listPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: { page: 1, pageSize: 5, sort: 'createdAt', order: 'desc' }
    });
    const listBody = await listRes.json();
    test.skip(!listRes.ok(), `List tasks failed: HTTP ${listRes.status()}`);
    let first = Array.isArray(listBody?.data?.items) ? listBody.data.items[0] : null;
    if (!first || !first?.status?.id || !first?.priority?.id) {
      const ids = await resolveTaskCreateIds(client, session, branchId);
      test.skip(!ids.ok, ids.reason || 'Could not resolve task create ids');
      statusId = ids.statusId;
      priorityId = ids.priorityId;
      assigneeId = ids.assigneeId;
    } else {
      statusId = first.status.id;
      priorityId = first.priority.id;
      assigneeId = first?.assignee?.id || session.orgUserId;
    }
    test.skip(!statusId || !priorityId || !assigneeId, 'Missing statusId/priorityId/assigneeId');

    const created = await createTask('target');
    test.skip(!created.res.ok(), `Create task for update tests failed: HTTP ${created.res.status()}`);
    updateTaskId = created.taskId;
    test.skip(!updateTaskId, 'No taskId from create response');
  });

  test.afterAll(async () => {
    if (client && updateTaskId) {
      const delPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${updateTaskId}`;
      await client.delete(delPath, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
    }
    if (client) await client.dispose();
  });

  test('[TASKS-PATCH-002] : Update task with full editable fields succeeds', async ({}, testInfo) => {
    test.skip(!updateTaskId, 'No updateTaskId available');
    const start = new Date();
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${updateTaskId}`;
    const payload = {
      title: `PW updated all fields ${Date.now()}`,
      description: 'Updated description from automation',
      statusId,
      priorityId,
      assigneeId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      reminderOffsetsMinutes: [1440, 60, 15]
    };

    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-full-fields',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });

    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'updated',
      nonEmptyPaths: ['data.taskId']
    });
  });

  test('[TASKS-PATCH-003] : Update task reminders replacement flow succeeds', async ({}, testInfo) => {
    test.skip(!updateTaskId, 'No updateTaskId available');
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${updateTaskId}`;
    const patchPayload = { reminderOffsetsMinutes: [30, 10] };
    const patchRes = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: patchPayload
    });
    const patchBody = await patchRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-reminders-replace',
      response: patchRes,
      loginEmail: session.loginEmail,
      status: patchRes.status(),
      statusText: patchRes.statusText(),
      body: patchBody,
      requestPayload: { path, body: patchPayload }
    });

    expectSuccessStatus(patchRes, patchBody);
    expectJsonContentType(patchRes);
    expectJsonSuccessBody(patchBody, {
      messageIncludes: 'updated',
      nonEmptyPaths: ['data.taskId']
    });

    const detailRes = await client.get(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const detailBody = await detailRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/patch-reminders-replace-detail',
      response: detailRes,
      loginEmail: session.loginEmail,
      status: detailRes.status(),
      statusText: detailRes.statusText(),
      body: detailBody,
      requestPayload: { path }
    });

    expectSuccessStatus(detailRes, detailBody);
    expectJsonContentType(detailRes);
    expectJsonSuccessBody(detailBody, { statusCode: 200 });
    expect(Array.isArray(detailBody?.data?.reminders), 'detail reminders array').toBeTruthy();
  });
});
