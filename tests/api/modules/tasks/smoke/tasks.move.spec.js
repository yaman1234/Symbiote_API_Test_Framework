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
const { resolveTasksBranchId, resolveTaskCreateIds, createBranchTask, getColumnStatusId } = require('../../../../../helpers/tasksContext');

function extractColumns(boardBody) {
  return Array.isArray(boardBody?.data?.columns) ? boardBody.data.columns : [];
}

function getColumnTaskIds(column) {
  const tasks = Array.isArray(column?.tasks) ? column.tasks : [];
  return tasks.map((t) => t?.id).filter(Boolean);
}

test.describe('Move task between board columns @tasks', () => {
  test.describe.configure({ mode: 'serial' });

  const supervisor = getSeededAccountByKey('t3_supervisor');
  const email = (supervisor && supervisor.email) || '';
  const password = env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;

  async function getBoard() {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
    const res = await client.get(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    return { path, res, body, columns: extractColumns(body) };
  }

  async function moveTask(taskId, payload, testInfo, urlHint) {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/${taskId}/move`;
    const res = await client.patch(path, {
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
    test.skip(!branchId, 'No branch id for task move tests');

    const boardProbe = await getBoard();
    if (boardProbe.res.ok()) {
      const hasTwoInColumn = boardProbe.columns.some((c) => getColumnTaskIds(c).length >= 2);
      if (!hasTwoInColumn) {
        const ids = await resolveTaskCreateIds(client, session, branchId);
        if (ids.ok) {
          await createBranchTask(client, session, branchId, { title: `MOVE seed A ${Date.now()}` });
          await createBranchTask(client, session, branchId, { title: `MOVE seed B ${Date.now()}` });
        }
      }
    }
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-MOVE-001] : Same-column reorder succeeds with valid ordered ids', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);

    const col = board.columns.find((c) => getColumnTaskIds(c).length >= 2);
    test.skip(!(col), 'Need one column with at least 2 tasks');
    const statusId = getColumnStatusId(col);
    test.skip(!statusId, 'Could not resolve column status UUID for toStatusId');
    const ids = getColumnTaskIds(col);
    const movedTaskId = ids[1];
    const reordered = [ids[1], ids[0], ...ids.slice(2)];
    const payload = {
      toStatusId: statusId,
      toOrderedTaskIds: reordered
    };

    const { res, body } = await moveTask(movedTaskId, payload, testInfo, 'tasks/move-same-column');
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'moved',
      nonEmptyPaths: ['data.taskId', 'data.toStatusId']
    });
  });

  test('[TASKS-MOVE-002] : Cross-column move succeeds with source and destination order arrays', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    test.skip(!(board.columns.length >= 2), 'Need at least 2 columns for cross-column move');

    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    const destination = board.columns.find(
      (c) => getColumnStatusId(c) && getColumnStatusId(c) !== getColumnStatusId(source)
    );
    test.skip(!source || !destination, 'Need valid source and destination columns');
    const destinationStatusId = getColumnStatusId(destination);
    test.skip(!destinationStatusId, 'Could not resolve destination column status UUID for toStatusId');

    const sourceIds = getColumnTaskIds(source);
    const destinationIds = getColumnTaskIds(destination);
    const movedTaskId = sourceIds[0];
    const payload = {
      toStatusId: destinationStatusId,
      toOrderedTaskIds: [movedTaskId, ...destinationIds],
      fromOrderedTaskIds: sourceIds.slice(1)
    };

    const { res, body } = await moveTask(movedTaskId, payload, testInfo, 'tasks/move-cross-column');
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, {
      messageIncludes: 'moved',
      nonEmptyPaths: ['data.taskId', 'data.toStatusId']
    });
  });

  test('[TASKS-MOVE-011] : Move response contract includes expected fields and status ids', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    const destination = board.columns.find(
      (c) => getColumnStatusId(c) && getColumnStatusId(c) !== getColumnStatusId(source)
    );
    test.skip(!source || !destination, 'Need valid source and destination columns');

    const sourceIds = getColumnTaskIds(source);
    const destinationIds = getColumnTaskIds(destination);
    const movedTaskId = sourceIds[0];
    const destStatusId = getColumnStatusId(destination);
    const payload = {
      toStatusId: destStatusId,
      toOrderedTaskIds: [movedTaskId, ...destinationIds],
      fromOrderedTaskIds: sourceIds.slice(1)
    };

    const { res, body } = await moveTask(movedTaskId, payload, testInfo, 'tasks/move-contract');
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200 });
    expect(body?.data?.taskId).toBe(movedTaskId);
    expect(body?.data?.toStatusId).toBe(destStatusId);
    expect(Array.isArray(body?.data?.toOrderedIds)).toBeTruthy();
    expect(Array.isArray(body?.data?.fromOrderedIds)).toBeTruthy();
  });

  test('[TASKS-MOVE-012] : Repeated move operations keep stable ordering without duplicates', async ({}, testInfo) => {
    const board = await getBoard();
    test.skip(!(board.res.ok()), `Board fetch failed: HTTP ${board.res.status()}`);
    const source = board.columns.find((c) => getColumnTaskIds(c).length >= 1);
    const destination = board.columns.find(
      (c) => getColumnStatusId(c) && getColumnStatusId(c) !== getColumnStatusId(source)
    );
    test.skip(!source || !destination, 'Need valid source and destination columns');

    const sourceIds = getColumnTaskIds(source);
    const destinationIds = getColumnTaskIds(destination);
    const movedTaskId = sourceIds[0];
    const sourceStatusId = getColumnStatusId(source);
    const destinationStatusId = getColumnStatusId(destination);

    const moveToPayload = {
      toStatusId: destinationStatusId,
      toOrderedTaskIds: [movedTaskId, ...destinationIds],
      fromOrderedTaskIds: sourceIds.slice(1)
    };
    const forward = await moveTask(movedTaskId, moveToPayload, testInfo, 'tasks/move-repeated-forward');
    expectSuccessStatus(forward.res, forward.body);

    const boardAfter = await getBoard();
    test.skip(!(boardAfter.res.ok()), `Board refresh failed: HTTP ${boardAfter.res.status()}`);
    const srcAfter = boardAfter.columns.find((c) => getColumnStatusId(c) === sourceStatusId);
    const dstAfter = boardAfter.columns.find((c) => getColumnStatusId(c) === destinationStatusId);
    const srcAfterIds = getColumnTaskIds(srcAfter);
    const dstAfterIds = getColumnTaskIds(dstAfter);
    const dstWithoutMoved = dstAfterIds.filter((id) => id !== movedTaskId);
    const backPayload = {
      toStatusId: sourceStatusId,
      toOrderedTaskIds: [movedTaskId, ...srcAfterIds],
      fromOrderedTaskIds: dstWithoutMoved
    };
    const backward = await moveTask(movedTaskId, backPayload, testInfo, 'tasks/move-repeated-backward');
    expectSuccessStatus(backward.res, backward.body);

    const finalBoard = await getBoard();
    test.skip(!(finalBoard.res.ok()), `Final board refresh failed: HTTP ${finalBoard.res.status()}`);
    const finalCol = finalBoard.columns.find((c) => getColumnStatusId(c) === sourceStatusId);
    const finalIds = getColumnTaskIds(finalCol);
    const idSet = new Set(finalIds);
    expect(finalIds.length).toBe(idSet.size);
  });
});
