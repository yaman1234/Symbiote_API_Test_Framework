/**
 * User management — list, create (POST /orgs/:orgId/users), branch user options.
 * Tune helpers if QA uses different field names.
 */
const { expect } = require('@playwright/test');
const { expectJsonSuccessBody } = require('./assertions');

/** @param {object} body */
function getOrgUsersItems(body) {
  const data = body?.data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.users)) return data.users;
  return [];
}

/** @param {object} item */
function listItemIdentity(item) {
  if (!item || typeof item !== 'object') return undefined;
  return item.orgUserId ?? item.accountId ?? item.account?.id ?? item.id;
}

/** @param {object} item */
function listItemBranchId(item) {
  if (!item || typeof item !== 'object') return undefined;
  return item.branchId ?? item.branch?.id;
}

/**
 * @param {object} body
 * @param {{ exactMessage?: string, requireItems?: boolean }} [opts]
 */
function expectOrgUsersListSuccessBody(body, opts = {}) {
  expectJsonSuccessBody(body, {
    statusCode: 200,
    ...(opts.exactMessage != null ? { message: opts.exactMessage } : {}),
    nonEmptyPaths: []
  });
  expect(body.data && typeof body.data === 'object', 'body.data').toBeTruthy();
  expect(typeof body.pagination.page).toBe('number');
  expect(body.pagination.page).toBeGreaterThanOrEqual(1);
  expect(typeof body.pagination.limit).toBe('number');
  expect(body.pagination.limit).toBeGreaterThan(0);
  const items = getOrgUsersItems(body);
  expect(Array.isArray(items), 'items must be an array').toBeTruthy();
  if (opts.requireItems !== false) {
    expect(items.length, 'expected at least one user row').toBeGreaterThan(0);
  }
  for (const item of items) {
    const id = listItemIdentity(item);
    expect(typeof id === 'string' && id.length > 0, 'each row needs id/orgUserId/account id').toBeTruthy();
  }
}

const OPTIONS_BRANCH_ROLES = ['EMPLOYEE', 'SUPERVISOR'];

/** @param {object} body */
function getOrgUsersOptionsItems(body) {
  const d = body?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.options)) return d.options;
  }
  return [];
}

/**
 * @param {object} body
 * @param {{ exactMessage?: string }} [opts]
 */
function expectOrgUsersOptionsSuccessBody(body, opts = {}) {
  expectJsonSuccessBody(body, {
    statusCode: 200,
    ...(opts.exactMessage != null ? { message: opts.exactMessage } : {}),
    nonEmptyPaths: []
  });
  const items = getOrgUsersOptionsItems(body);
  expect(Array.isArray(items), 'options list must be an array (data or data.items)').toBeTruthy();
  for (const row of items) {
    expect(row && typeof row === 'object').toBeTruthy();
    expect(typeof row.orgUserId === 'string' && row.orgUserId.length > 0, 'orgUserId').toBeTruthy();
    expect(typeof row.fullName === 'string' && row.fullName.length > 0, 'fullName').toBeTruthy();
    expect(typeof row.email === 'string' && row.email.length > 0, 'email').toBeTruthy();
    expect(typeof row.branchRole === 'string' && row.branchRole.length > 0, 'branchRole').toBeTruthy();
    expect(
      OPTIONS_BRANCH_ROLES.includes(row.branchRole),
      `branchRole must be EMPLOYEE or SUPERVISOR, got ${row.branchRole}`
    ).toBeTruthy();
  }
}

/**
 * POST /orgs/:orgId/users — success envelope + new org user id.
 * Accepts Symbiote `body.statusCode` **200** or **201** (HTTP may be 200/201).
 * @param {object} body
 */
function expectOrgUserCreateSuccessBody(body) {
  expect(body && body.success === true).toBeTruthy();
  expect(typeof body.statusCode).toBe('number');
  expect([200, 201].includes(body.statusCode)).toBeTruthy();
  expectJsonSuccessBody(body, {
    statusCode: body.statusCode,
    message: 'User created.',
    nonEmptyPaths: ['data.orgUserId']
  });
}

module.exports = {
  expectOrgUsersListSuccessBody,
  getOrgUsersItems,
  listItemIdentity,
  listItemBranchId,
  getOrgUsersOptionsItems,
  expectOrgUsersOptionsSuccessBody,
  expectOrgUserCreateSuccessBody,
  OPTIONS_BRANCH_ROLES
};
