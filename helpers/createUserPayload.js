function randomDigits(length) {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += Math.floor(Math.random() * 10);
  }
  return value;
}

function makeUniqueSuffix() {
  return `${Date.now()}${randomDigits(4)}`;
}

const OWNER_ONLY_CREATE_FIELDS = [
  'modules',
  'paymentMethod',
  'paymentFrequency',
  'paymentDay',
  'accountName',
  'bankName',
  'bankBranch',
  'currency',
  'baseWage',
  'overtimeRate',
  'wagePeriod',
  'attachmentKey',
  'attachmentName',
  'attachmentMime',
  'attachmentSize'
];

/**
 * Builds dynamic JSON body for POST /orgs/:orgId/users.
 * You can pass only `branchId` and get a unique, valid default payload.
 * @param {{
 *   branchId: string,
 *   email?: string,
 *   fullName?: string,
 *   departmentIds?: string[],
 *   headDepartmentIds?: string[],
 *   overrides?: object
 * }} p
 */
function buildCreateUserPayload({
  branchId,
  email,
  fullName,
  departmentIds = [],
  headDepartmentIds = [],
  overrides = {}
}) {
  const unique = makeUniqueSuffix();
  const resolvedEmail = email || `api.create.${unique}@demo.com`;
  const resolvedFullName = fullName || `API User ${unique}`;

  return {
    branchId,
    email: resolvedEmail,
    fullName: resolvedFullName,
    phoneNumber: `07${randomDigits(9)}`,
    dateOfBirth: '1995-06-12',
    gender: 'MALE',
    addressLine1: '221 Baker Street',
    addressLine2: 'Flat 2',
    town: 'Marylebone',
    city: 'London',
    country: 'UK',
    position: 'Warehouse Operator',
    employeeId: `EMP-${unique}`,
    status: 'ACTIVE',
    branchRole: 'EMPLOYEE',
    departmentIds,
    headDepartmentIds,
    modules: ['INVENTORY'],
    nationalInsuranceNumber: "AB123456C",
    shareCode: "SCODE123",
    taxId: "TAX-998877",
    paymentMethod: 'BANK_TRANSFER',
    paymentFrequency: 'MONTHLY',
    paymentDay: 'END_OF_MONTH',
    accountName: resolvedFullName,
    bankName: 'HSBC',
    bankBranch: 'London Central',
    currency: 'GBP',
    baseWage: '2500.00',
    overtimeRate: '1.50',
    wagePeriod: 'MONTHLY',
    attachmentKey: `uploads/contracts/${unique}.pdf`,
    attachmentName: `employment-contract-${unique}.pdf`,
    attachmentMime: 'application/pdf',
    attachmentSize: 483920,
    ...overrides
  };
}

/**
 * Builds a supervisor-safe create payload by removing Owner-only fields.
 * @param {Parameters<typeof buildCreateUserPayload>[0]} p
 */
function buildSupervisorCreateUserPayload(p) {
  const payload = buildCreateUserPayload(p);
  for (const key of OWNER_ONLY_CREATE_FIELDS) {
    delete payload[key];
  }
  return payload;
}

/**
 * PATCH /orgs/:orgId/users/:orgUserId — mirrors the API’s full user shape (aligned with {@link buildCreateUserPayload}).
 * @param {{
 *   branchId: string,
 *   fullName: string,
 *   phoneNumber?: string,
 *   departmentIds?: string[],
 *   headDepartmentIds?: string[],
 *   employeeId?: string,
 *   overrides?: object
 * }} p
 */
function buildUpdateUserPayload({
  branchId,
  fullName,
  phoneNumber,
  departmentIds = [],
  headDepartmentIds = [],
  employeeId,
  overrides = {}
}) {
  const unique = makeUniqueSuffix();
  return {
    branchId,
    fullName,
    phoneNumber: phoneNumber || `07${randomDigits(9)}`,
    dateOfBirth: '1995-06-12',
    gender: 'MALE',
    addressLine1: '221 Baker Street',
    addressLine2: 'Flat 2',
    town: 'Marylebone',
    city: 'London',
    country: 'UK',
    position: 'Warehouse Operator',
    employeeId: employeeId || `EMP-UPD-${unique}`,
    // GET detail returns branch row `status` ACTIVE after update in QA; PENDING is not persisted for this flow.
    status: 'ACTIVE',
    branchRole: 'EMPLOYEE',
    departmentIds,
    headDepartmentIds,
    nationalInsuranceNumber: 'QQ123456C',
    shareCode: 'SCODE123',
    taxId: 'TAX-998899',
    // Default INVENTORY only; add PAYROLL via overrides if Owner + QA allows it on the user.
    modules: ['INVENTORY'],
    paymentMethod: 'BANK_TRANSFER',
    paymentFrequency: 'MONTHLY',
    paymentDay: 'END_OF_MONTH',
    accountName: 'John Employee',
    bankName: 'HSBC',
    bankBranch: 'London Central',
    currency: 'GBP',
    baseWage: '2500.00',
    overtimeRate: '1.50',
    wagePeriod: 'MONTHLY',
    attachmentKey: 'uploads/contracts/john.pdf',
    attachmentName: 'employment-contract.pdf',
    attachmentMime: 'application/pdf',
    attachmentSize: 483920,
    ...overrides
  };
}

/**
 * Builds a supervisor-safe PATCH payload by removing Owner-only fields (same cluster as create).
 * @param {Parameters<typeof buildUpdateUserPayload>[0]} p
 */
function buildSupervisorUpdateUserPayload(p) {
  const payload = buildUpdateUserPayload(p);
  for (const key of OWNER_ONLY_CREATE_FIELDS) {
    delete payload[key];
  }
  return payload;
}

/** @param {string} [raw] comma-separated UUIDs */
function parseUuidList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = {
  buildCreateUserPayload,
  buildSupervisorCreateUserPayload,
  buildUpdateUserPayload,
  buildSupervisorUpdateUserPayload,
  parseUuidList
};
