const { expect } = require('@playwright/test');
const { expectJsonSuccessBody } = require('./assertions');

/**
 * GET /orgs/:orgId/branches/:branchId/tasks
 * Expects:
 * - Symbiote success envelope (success/statusCode/message)
 * - data object with `items`, `page`, `pageSize`, `total`
 * - each task row contains key list fields for task tables
 */
function expectTasksListSuccessBody(body, opts = {}) {
  expectJsonSuccessBody(body, {
    statusCode: opts.statusCode ?? 200,
    ...(opts.message != null ? { message: opts.message } : {}),
    ...(opts.messageIncludes != null ? { messageIncludes: opts.messageIncludes } : {}),
    nonEmptyPaths: []
  });

  expect(body.data && typeof body.data === 'object' && !Array.isArray(body.data), 'data object').toBeTruthy();
  expect(Array.isArray(body.data.items), 'data.items array').toBeTruthy();
  expect(typeof body.data.page).toBe('number');
  expect(body.data.page).toBeGreaterThanOrEqual(1);
  expect(typeof body.data.pageSize).toBe('number');
  expect(body.data.pageSize).toBeGreaterThan(0);
  expect(body.data.pageSize).toBeLessThanOrEqual(100);
  expect(typeof body.data.total).toBe('number');
  expect(body.data.total).toBeGreaterThanOrEqual(0);

  for (const row of body.data.items) {
    expect(row && typeof row === 'object', 'task row object').toBeTruthy();
    expect(typeof row.id).toBe('string');
    expect(row.id.length).toBeGreaterThan(0);
    expect(typeof row.title).toBe('string');
    expect(row.title.length).toBeGreaterThan(0);
    expect(typeof row.createdAt).toBe('string');
    expect(typeof row.updatedAt).toBe('string');
    expect(typeof row.isRecurring).toBe('boolean');

    expect(row.status && typeof row.status === 'object', 'status object').toBeTruthy();
    expect(typeof row.status.id).toBe('string');
    expect(typeof row.status.name).toBe('string');

    expect(row.priority && typeof row.priority === 'object', 'priority object').toBeTruthy();
    expect(typeof row.priority.id).toBe('string');
    expect(typeof row.priority.name).toBe('string');

    if (row.assignee != null) {
      expect(typeof row.assignee).toBe('object');
      expect(typeof row.assignee.id).toBe('string');
      expect(typeof row.assignee.name).toBe('string');
    }

    expect(row.counts && typeof row.counts === 'object', 'counts object').toBeTruthy();
    expect(typeof row.counts.attachments).toBe('number');
    expect(typeof row.counts.reminders).toBe('number');
    expect(typeof row.counts.comments).toBe('number');
  }

  if (body.meta != null) {
    expect(typeof body.meta).toBe('object');
    if (body.meta.timestamp != null) expect(typeof body.meta.timestamp).toBe('string');
    if (body.meta.path != null) expect(typeof body.meta.path).toBe('string');
    if (body.meta.requestId != null) expect(typeof body.meta.requestId).toBe('string');
  }
}

module.exports = {
  expectTasksListSuccessBody,
 
};
