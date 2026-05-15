'use strict';

/**
 * Branch UUID for `orgs/:orgId/branches/:branchId/tasks/*`.
 * Prefer `TASKS_BRANCH_ID` when set; otherwise use branch from verify-otp session when present.
 * @param {string} [envBranchId]
 * @param {string | null | undefined} [sessionBranchId]
 * @returns {string}
 */
function resolveTasksBranchId(envBranchId, sessionBranchId) {
  const a = String(envBranchId || '').trim();
  const b = String(sessionBranchId || '').trim();
  return a || b || '';
}

/** Prefer JWT/session branch (branch-scoped users), then env override. */
function resolveTasksBranchPreferSession(envBranchId, sessionBranchId) {
  const s = String(sessionBranchId || '').trim();
  const e = String(envBranchId || '').trim();
  return s || e || '';
}

/**
 * Status / priority / assignee for POST .../tasks — list rows, then board, then org task-settings.
 */
async function resolveTaskCreateIds(client, session, branchId) {
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const listPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
  const listRes = await client.get(listPath, {
    headers,
    params: { page: 1, pageSize: 50, sort: 'createdAt', order: 'desc' }
  });
  if (listRes.ok()) {
    const listBody = await listRes.json();
    const items = Array.isArray(listBody?.data?.items) ? listBody.data.items : [];
    const row = items.find((t) => t?.status?.id && t?.priority?.id);
    if (row) {
      const assigneeId = String(row?.assignee?.id || session.orgUserId || '');
      if (!assigneeId) {
        return { ok: false, reason: 'Missing assigneeId (task row has no assignee and session has no orgUserId)' };
      }
      return {
        ok: true,
        statusId: row.status.id,
        priorityId: row.priority.id,
        assigneeId
      };
    }
  }

  const boardPath = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
  const boardRes = await client.get(boardPath, { headers });
  const boardBody = await boardRes.json();
  if (boardRes.ok()) {
    const fromBoard = (boardBody?.data?.columns || [])
      .flatMap((col) => (Array.isArray(col?.tasks) ? col.tasks : []))
      .find((t) => t?.status?.id && t?.priority?.id);
    if (fromBoard) {
      const assigneeId = String(fromBoard?.assignee?.id || session.orgUserId || '');
      if (!assigneeId) {
        return { ok: false, reason: 'Missing assigneeId (board task has no assignee and session has no orgUserId)' };
      }
      return {
        ok: true,
        statusId: fromBoard.status.id,
        priorityId: fromBoard.priority.id,
        assigneeId
      };
    }
  } else if (!listRes.ok()) {
    return {
      ok: false,
      reason: `Tasks list failed: HTTP ${listRes.status()}; board failed: HTTP ${boardRes.status()}`
    };
  }

  const stRes = await client.get(`orgs/${session.orgId}/task-settings/statuses`, { headers });
  const prRes = await client.get(`orgs/${session.orgId}/task-settings/priorities`, { headers });
  const stBody = await stRes.json();
  const prBody = await prRes.json();
  if (!stRes.ok() || !prRes.ok()) {
    return {
      ok: false,
      reason: `Task-settings failed (statuses HTTP ${stRes.status()}, priorities HTTP ${prRes.status()})`
    };
  }
  const statusRows = Array.isArray(stBody?.data) ? stBody.data : [];
  const priorityRows = Array.isArray(prBody?.data) ? prBody.data : [];
  const statusId = statusRows.find((r) => r?.id)?.id;
  const priorityId = priorityRows.find((r) => r?.id)?.id;
  const assigneeId = String(session.orgUserId || '');
  if (!statusId || !priorityId || !assigneeId) {
    return {
      ok: false,
      reason:
        'Could not derive statusId/priorityId/assigneeId (empty branch and incomplete task-settings or missing orgUserId)'
    };
  }
  return { ok: true, statusId, priorityId, assigneeId };
}

/**
 * POST a branch task using resolved status/priority/assignee.
 */
async function createBranchTask(client, session, branchId, parts = {}) {
  const ids = await resolveTaskCreateIds(client, session, branchId);
  if (!ids.ok) return { ok: false, reason: ids.reason, taskId: null, res: null, body: null };

  const start = new Date();
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
  const payload = {
    title: parts.title || `PW seed ${Date.now()}`,
    description: parts.description || 'API test seed task',
    statusId: ids.statusId,
    priorityId: ids.priorityId,
    assigneeId: ids.assigneeId,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    ...(parts.extra || {})
  };
  const res = await client.post(path, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: payload
  });
  const body = await res.json();
  const taskId = body?.data?.taskId;
  if (!res.ok || !taskId) {
    return {
      ok: false,
      reason: `Create task failed: HTTP ${res.status()}`,
      taskId: null,
      res,
      body
    };
  }
  return { ok: true, taskId, res, body };
}

/**
 * Any existing task id, or create one when the branch has no tasks but settings allow create.
 * @returns {Promise<{ ok: true, taskId: string, created?: boolean } | { ok: false, reason: string }>}
 */
async function pickOrCreateTaskId(client, session, branchId) {
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const listPath = `orgs/${session.orgId}/branches/${branchId}/tasks`;
  const listRes = await client.get(listPath, {
    headers,
    params: { page: 1, pageSize: 25, sort: 'createdAt', order: 'desc' }
  });
  if (listRes.ok()) {
    const listBody = await listRes.json();
    const items = Array.isArray(listBody?.data?.items) ? listBody.data.items : [];
    const id = items.find((t) => t?.id)?.id;
    if (id) return { ok: true, taskId: id };
  }

  const boardPath = `orgs/${session.orgId}/branches/${branchId}/tasks/board`;
  const boardRes = await client.get(boardPath, { headers });
  const boardBody = await boardRes.json();
  if (boardRes.ok()) {
    const tid = (boardBody?.data?.columns || [])
      .flatMap((col) => (Array.isArray(col?.tasks) ? col.tasks : []))
      .find((t) => t?.id)?.id;
    if (tid) return { ok: true, taskId: tid };
  }

  const created = await createBranchTask(client, session, branchId, {
    title: `PW pickOrCreate ${Date.now()}`,
    description: 'Auto-seeded for API tests'
  });
  if (!created.ok) return { ok: false, reason: created.reason || 'createBranchTask failed' };
  return { ok: true, taskId: created.taskId, created: true };
}

/**
 * Board column workflow status UUID for `PATCH .../move` body `toStatusId`.
 * Columns may expose `status.id`, `statusId`, legacy `id`, or only tasks include `status`.
 * @param {object} [column]
 * @returns {string}
 */
function getColumnStatusId(column) {
  const direct = column?.status?.id ?? column?.statusId ?? column?.id;
  if (direct != null && direct !== '') return String(direct);
  const tasks = Array.isArray(column?.tasks) ? column.tasks : [];
  const sid = tasks.find((t) => t?.status?.id)?.status?.id;
  return sid != null && sid !== '' ? String(sid) : '';
}

module.exports = {
  resolveTasksBranchId,
  resolveTasksBranchPreferSession,
  resolveTaskCreateIds,
  createBranchTask,
  pickOrCreateTaskId,
  getColumnStatusId
};
