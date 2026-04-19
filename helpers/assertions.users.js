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
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.users)) return data.users;
  return [];
}

/**
 * Page/limit from common list shapes: top-level `pagination`, `meta`, or object `data` (non-array).
 * @returns {{ page: number, limit: number, total?: number } | null}
 */
function getOrgUsersListPagination(body) {
  const p = body?.pagination;
  if (p && typeof p === 'object' && typeof p.page === 'number' && typeof p.limit === 'number') {
    return { page: p.page, limit: p.limit, total: p.total };
  }
  const m = body?.meta;
  if (m && typeof m === 'object' && typeof m.page === 'number' && typeof m.limit === 'number') {
    return { page: m.page, limit: m.limit, total: m.total };
  }
  const d = body?.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    if (typeof d.page === 'number' && typeof d.limit === 'number') {
      return { page: d.page, limit: d.limit, total: d.total };
    }
  }
  return null;
}

/** Total row count when API exposes it (object `data`, `pagination`, or `meta`). */
function getOrgUsersListTotal(body) {
  const d = body?.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.total === 'number') return d.total;
  const pag = getOrgUsersListPagination(body);
  if (pag && typeof pag.total === 'number') return pag.total;
  return undefined;
}

/** @param {object} item */
function listItemIdentity(item) {
  if (!item || typeof item !== 'object') return undefined;
  return item.orgUserId ?? item.id ?? item.accountId ?? item.account?.id;
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
  const pagination = getOrgUsersListPagination(body);
  if (pagination) {
    expect(pagination.page, 'list page').toBeGreaterThanOrEqual(1);
    expect(pagination.limit, 'list limit').toBeGreaterThan(0);
  }
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
    messageIncludes: 'User created',
    nonEmptyPaths: ['data.orgUserId']
  });
}

/** Identity on GET /orgs/:orgId/users/:orgUserId detail object */
function orgUserDetailIdentity(data) {
  if (!data || typeof data !== 'object') return undefined;
  return data.orgUserId ?? data.id;
}

/**
 * GET /orgs/:orgId/users/:orgUserId — success envelope + single user object.
 * @param {object} body
 * @param {{ expectedOrgUserId?: string, expectedEmail?: string }} [opts]
 */
function expectOrgUserGetSuccessBody(body, opts = {}) {
  expectJsonSuccessBody(body, {
    statusCode: 200,
    nonEmptyPaths: []
  });
  const d = body.data;
  expect(d && typeof d === 'object' && !Array.isArray(d), 'body.data must be a single object').toBeTruthy();
  const id = orgUserDetailIdentity(d);
  expect(typeof id === 'string' && id.length > 0, 'detail needs orgUserId or id').toBeTruthy();
  if (opts.expectedOrgUserId) {
    expect(id, 'detail orgUserId matches expected').toBe(opts.expectedOrgUserId);
  }
  if (opts.expectedEmail) {
    expect(typeof d.email === 'string' && d.email.length > 0, 'detail email').toBeTruthy();
    expect(d.email.trim().toLowerCase(), 'detail email').toBe(opts.expectedEmail.trim().toLowerCase());
  }
}

/**
 * PATCH /orgs/:orgId/users/:orgUserId — success envelope (JSON `statusCode` **200** or **201**, like create).
 * @param {object} body
 */
function expectOrgUserPatchSuccessBody(body) {
  expect(body && body.success === true).toBeTruthy();
  expect(typeof body.statusCode).toBe('number');
  expect([200, 201].includes(body.statusCode)).toBeTruthy();
  expectJsonSuccessBody(body, {
    statusCode: body.statusCode,
    nonEmptyPaths: []
  });
}

/** @param {unknown} row */
function rowToUuid(row) {
  if (typeof row === 'string') return row;
  if (row && typeof row === 'object' && typeof row.id === 'string') return row.id;
  return undefined;
}

/** @param {unknown} value */
function normalizeUuidList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(rowToUuid).filter(Boolean).sort();
}

/**
 * Branch-scoped role from `branchUsers[].role` / `branchUser.role` (not top-level `data.role`, which may be MEMBER).
 * @param {object} data
 * @param {string} [branchIdHint] — from PATCH `branchId`; pick matching row when multiple branch memberships exist
 * @returns {unknown}
 */
function readBranchRoleFromBranchUsers(data, branchIdHint) {
  const raw = data.branchUsers ?? data.branchUser;
  const matchesBranch = (row) => {
    if (!row || typeof row !== 'object') return false;
    if (!branchIdHint) return true;
    const bid = row.branchId ?? row.branch?.id;
    return bid != null && String(bid) === String(branchIdHint);
  };
  const readRole = (row) => {
    if (!matchesBranch(row)) return undefined;
    if (row.role != null && row.role !== '') return row.role;
    if (row.branchRole != null && row.branchRole !== '') return row.branchRole;
    return undefined;
  };

  if (Array.isArray(raw)) {
    if (branchIdHint) {
      const row = raw.find(matchesBranch);
      const r = row ? readRole(row) : undefined;
      return r != null ? r : undefined;
    }
    for (const row of raw) {
      const r = readRole(row);
      if (r != null) return r;
    }
    return undefined;
  }
  if (raw && typeof raw === 'object') {
    return readRole(raw);
  }
  return undefined;
}

/**
 * Branch-scoped status from `branchUsers[].status` (not top-level `data.status`, which may stay ACTIVE).
 * @param {object} data
 * @param {string} [branchIdHint] — from PATCH `branchId`
 * @returns {unknown}
 */
/** @param {object} row */
function readStatusFromBranchUserRow(row) {
  if (!row || typeof row !== 'object') return undefined;
  const keys = ['status', 'memberStatus', 'membershipStatus', 'branchStatus', 'orgUserStatus'];
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function readStatusFromBranchUsers(data, branchIdHint) {
  const raw = data.branchUsers ?? data.branchUser;
  const rowOk = (row) => row && typeof row === 'object';
  const matchesBranch = (row) => {
    if (!branchIdHint) return true;
    if (!rowOk(row)) return false;
    const bid = row.branchId ?? row.branch?.id;
    return bid != null && String(bid) === String(branchIdHint);
  };
  const hasStatus = (row) => rowOk(row) && readStatusFromBranchUserRow(row) != null;

  if (Array.isArray(raw)) {
    if (branchIdHint) {
      const m = raw.find((row) => rowOk(row) && matchesBranch(row) && hasStatus(row));
      return m ? readStatusFromBranchUserRow(m) : undefined;
    }
    const first = raw.find((row) => rowOk(row) && hasStatus(row));
    if (first) return readStatusFromBranchUserRow(first);
    return undefined;
  }
  if (raw && typeof raw === 'object' && hasStatus(raw)) return readStatusFromBranchUserRow(raw);
  return undefined;
}

/**
 * Reads a scalar (or array) from GET-user `data`, including common nests (`userProfile`, `profile`, etc.).
 * For **`branchRole`** / **`status`**, prefers **`branchUsers`** (and optional **`branchIdHint`** from the PATCH payload).
 * @param {object} data
 * @param {string} field
 * @param {string} [branchIdHint] — e.g. `patch.branchId` so expected values align with the branch row PATCH touched
 * @returns {unknown}
 */
function getOrgUserDetailField(data, field, branchIdHint) {
  if (!data || typeof data !== 'object') return undefined;

  if (field === 'branchRole') {
    const fromBranchUsers = readBranchRoleFromBranchUsers(data, branchIdHint);
    if (fromBranchUsers != null) return fromBranchUsers;
  }

  if (field === 'status') {
    const fromBranchUsers = readStatusFromBranchUsers(data, branchIdHint);
    if (fromBranchUsers != null) return fromBranchUsers;
    // When verifying PATCH for a specific branch, do not fall back to org-level `data.status` (often ACTIVE).
    if (branchIdHint) return undefined;
  }

  const top = data[field];
  if (top !== undefined && top !== null) return top;
  const nests = ['userProfile', 'profile', 'employment', 'payroll', 'account', 'branch', 'membership', 'orgBranchUser'];
  for (const n of nests) {
    const sub = data[n];
    if (sub && typeof sub === 'object') {
      const inner = sub[field];
      if (inner !== undefined && inner !== null) return inner;
    }
  }
  if (field === 'branchRole') {
    const b = data.branch;
    if (b && typeof b === 'object') {
      if (b.branchRole != null) return b.branchRole;
      if (b.role != null) return b.role;
    }
  }
  return undefined;
}

/**
 * Asserts GET detail `data` reflects scalar/array fields sent on PATCH (best-effort; skips arrays missing on GET).
 * @param {object} data - `body.data` from GET user
 * @param {object} patch - PATCH JSON body
 */
function expectOrgUserDetailMatchesPatch(data, patch) {
  expect(data && typeof data === 'object').toBeTruthy();
  const branchIdHint = patch.branchId;
  const pairs = [
    ['fullName', patch.fullName],
    ['phoneNumber', patch.phoneNumber],
    ['gender', patch.gender],
    ['country', patch.country],
    ['city', patch.city],
    ['town', patch.town],
    ['addressLine1', patch.addressLine1],
    ['position', patch.position],
    ['employeeId', patch.employeeId],
    ['branchRole', patch.branchRole]
  ];
  for (const [key, expected] of pairs) {
    if (expected == null) continue;
    const actual = getOrgUserDetailField(data, key, branchIdHint);
    expect(actual, key).toBe(expected);
  }
  for (const key of ['nationalInsuranceNumber', 'taxId']) {
    const actual = getOrgUserDetailField(data, key, branchIdHint);
    if (patch[key] != null && actual != null) {
      expect(actual, key).toBe(patch[key]);
    }
  }
  if (patch.status != null) {
    const st = getOrgUserDetailField(data, 'status', branchIdHint);
    if (st != null) {
      expect(String(st).toUpperCase(), 'status').toBe(String(patch.status).toUpperCase());
    }
  }
  const baseWage = getOrgUserDetailField(data, 'baseWage', branchIdHint);
  if (patch.baseWage != null && baseWage != null) {
    expect(parseFloat(String(baseWage).replace(/,/g, '')), 'baseWage').toBe(
      parseFloat(String(patch.baseWage).replace(/,/g, ''))
    );
  }
  const dataModules = getOrgUserDetailField(data, 'modules', branchIdHint);
  if (Array.isArray(patch.modules) && Array.isArray(dataModules)) {
    expect([...dataModules].map(String).sort()).toEqual([...patch.modules].map(String).sort());
  }
  const gotDept = normalizeUuidList(getOrgUserDetailField(data, 'departmentIds', branchIdHint));
  const expDept = normalizeUuidList(patch.departmentIds);
  if (expDept.length > 0 && gotDept.length > 0) {
    expect(gotDept, 'departmentIds').toEqual(expDept);
  }
}

module.exports = {
  expectOrgUsersListSuccessBody,
  getOrgUsersItems,
  getOrgUsersListPagination,
  getOrgUsersListTotal,
  listItemIdentity,
  listItemBranchId,
  getOrgUsersOptionsItems,
  expectOrgUsersOptionsSuccessBody,
  expectOrgUserCreateSuccessBody,
  expectOrgUserGetSuccessBody,
  expectOrgUserPatchSuccessBody,
  expectOrgUserDetailMatchesPatch,
  getOrgUserDetailField,
  orgUserDetailIdentity,
  OPTIONS_BRANCH_ROLES
};
