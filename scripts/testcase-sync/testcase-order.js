/**
 * Canonical order for `testCases/*.md` when building Master_TestCases.xlsx.
 * Matches project_docs/Role_Based_Test_Coverage_Review.md: Authentication API → User Management → Task Management.
 * Misc / template last. Any `.md` not listed is appended after these (see generate-master-testcases.js).
 */
const TESTCASE_MD_ORDER = [
  // Authentication
  'Auth_login.md',
  'Auth_send-otp.md',
  'Auth_verify-otp.md',
  'Auth_refresh.md',
  'Auth_forgot-password.md',
  'Auth_password-action-validate.md',
  'Auth_set-password.md',
  // User management
  'Orgs_users.md',
  'Orgs_users-get.md',
  'Orgs_users-options.md',
  'Orgs_users-create.md',
  'Orgs_users-patch.md',
  // Task management
  'Orgs_branches_tasks-list.md',
  'Orgs_branches_tasks-board-negative.md',
  'Orgs_branches_tasks-detail.md',
  'Orgs_branches_tasks-create.md',
  'Orgs_branches_tasks-patch.md',
  'Orgs_branches_tasks-subtasks.md',
  'Orgs_branches_tasks-subtasks-tree.md',
  'Orgs_branches_tasks-move.md',
  'Orgs_branches_tasks-delete.md',
  'Orgs_branches_tasks-analytics.md',
  'Orgs_branches_tasks-analytics-saved-filters.md',
  'Orgs_branches_tasks-comments.md',
  'Orgs_branches_task-notifications.md',
  'Orgs_task-settings-statuses.md',
  // Misc / template
  'Misc_protected-route.md',
  'Template_api.md'
];

module.exports = { TESTCASE_MD_ORDER };
