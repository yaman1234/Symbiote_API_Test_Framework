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

/** @param {string} [raw] comma-separated UUIDs */
function parseUuidList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = { buildCreateUserPayload, parseUuidList };
