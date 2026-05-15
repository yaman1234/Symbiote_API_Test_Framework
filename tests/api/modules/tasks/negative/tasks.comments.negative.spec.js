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
const { resolveTasksBranchId, pickOrCreateTaskId } = require('../../../../../helpers/tasksContext');

test.describe('Task comments @tasks', () => {
  const owner = getSeededAccountByKey('t1_owner');
  const ownerEmail = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const ownerPassword = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;
  let taskId;
  let commentId;
  let seededTaskId;

  test.beforeAll(async () => {
    test.skip(!ownerEmail, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!ownerPassword, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email: ownerEmail, password: ownerPassword, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `Owner OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id for comments negative tests');

    const picked = await pickOrCreateTaskId(client, session, branchId);
    test.skip(!picked.ok, picked.reason || 'No task id for comments negative tests');
    taskId = picked.taskId;
    if (picked.created) seededTaskId = taskId;

    const seedPath = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/comments`;
    const seedPayload = { content: `Negative seed comment ${Date.now()}` };
    const seedRes = await client.post(seedPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: seedPayload
    });
    const seedBody = await seedRes.json();
    test.skip(!seedRes.ok(), `Comment seed creation failed: HTTP ${seedRes.status()}`);
    commentId = seedBody?.data?.id || seedBody?.data?.commentId;
    test.skip(!commentId, 'No comment id from seed create');
  });

  test.afterAll(async () => {
    if (client && commentId && session && session.ok && branchId && taskId) {
      await client.delete(`orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
    }
    if (client && seededTaskId && session && session.ok && branchId) {
      await client.delete(`orgs/${session.orgId}/branches/${branchId}/tasks/${seededTaskId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
    }
    if (client) await client.dispose();
  });

  test('[TASKS-COMMENTS-006] : Missing JWT on comments list returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/00000000-0000-0000-0000-000000000003/comments';
    const res = await client.get(path, { params: { page: 1, limit: 20 } });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/comments-list-unauth',
      response: res,
      loginEmail: null,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, query: { page: 1, limit: 20 } }
    });
    expectHttpStatus(res, 401);
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: 401, requireErrorCode: true });
  });

  test('[TASKS-COMMENTS-007] : Create comment with missing content returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/comments`;
    const payload = {};
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/comments-create-missing-content',
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

  test('[TASKS-COMMENTS-008] : Reply with unknown parent comment id returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/comments/00000000-0000-0000-0000-0000000000ce/replies`;
    const payload = { content: 'Unknown parent reply' };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/comments-reply-unknown-parent',
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

  test('[TASKS-COMMENTS-009] : Update unknown comment id returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/comments/00000000-0000-0000-0000-0000000000cf`;
    const payload = { content: 'Unknown comment update' };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/comments-update-unknown-comment',
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
});
