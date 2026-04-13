const SEEDED_ACCOUNTS = [
  {
    key: 'platform_admin',
    tier: 'platform',
    email: 'admin@platform.com',
    platformRole: 'ADMIN',
    orgRole: null,
    expectedAuthContext: 'Platform admin; no seeded org context in this seed section'
  },
  {
    key: 't1_owner',
    tier: 'tier1',
    email: 't1.owner@demo.com',
    platformRole: 'USER',
    orgRole: 'OWNER',
    expectedAuthContext: 'Org-level token; branchId null',
    visibilityProfile: 'owner_org_wide'
  },
  {
    key: 't1_emp1',
    tier: 'tier1',
    email: 't1.emp1@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Default/single branch membership required',
    visibilityProfile: 'employee_self_only'
  },
  {
    key: 't1_emp2',
    tier: 'tier1',
    email: 't1.emp2@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Default/single branch membership required',
    visibilityProfile: 'employee_self_only'
  },
  {
    key: 't2_owner',
    tier: 'tier2',
    email: 't2.owner@demo.com',
    platformRole: 'USER',
    orgRole: 'OWNER',
    expectedAuthContext: 'Org-level token; branchId null',
    visibilityProfile: 'owner_org_wide'
  },
  {
    key: 't2_supervisor',
    tier: 'tier2',
    email: 't2.supervisor@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Branch-scoped token in single/default branch',
    visibilityProfile: 'supervisor_branch_scoped'
  },
  {
    key: 't2_emp1',
    tier: 'tier2',
    email: 't2.emp1@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Branch-scoped token in single/default branch',
    visibilityProfile: 'employee_self_only'
  },
  {
    key: 't2_emp2',
    tier: 'tier2',
    email: 't2.emp2@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Branch-scoped token in single/default branch',
    visibilityProfile: 'employee_self_only'
  },
  {
    key: 't3_owner',
    tier: 'tier3',
    email: 't3.owner@demo.com',
    platformRole: 'USER',
    orgRole: 'OWNER',
    expectedAuthContext: 'Org-level token; branchId null',
    visibilityProfile: 'owner_org_wide'
  },
  {
    key: 't3_supervisor',
    tier: 'tier3',
    email: 't3.supervisor@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Branch-scoped token in branch-1',
    visibilityProfile: 'supervisor_branch_scoped'
  },
  {
    key: 't3_emp1',
    tier: 'tier3',
    email: 't3.emp1@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Branch-scoped token in branch-1',
    visibilityProfile: 'employee_self_only'
  },
  {
    key: 't3_emp2',
    tier: 'tier3',
    email: 't3.emp2@demo.com',
    platformRole: 'USER',
    orgRole: 'MEMBER',
    expectedAuthContext: 'Branch-scoped token in branch-2',
    visibilityProfile: 'employee_self_only'
  }
];

module.exports = { SEEDED_ACCOUNTS };
