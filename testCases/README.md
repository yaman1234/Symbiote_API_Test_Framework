# Test cases by API

Each **`Module_endpoint.md`** file documents coverage for one endpoint.

### Field order (every test block)

1. **TC_ID** — Stable id  
2. **Suite** — Smoke | Negative | Regression  
3. **Spec_File** — Playwright spec path  
4. **Scenario** — Short adjective-first description (for example: `Valid login returns OTP challenge`)  
5. **Expected** — HTTP / outcome  
6. **Checks** — Bullet list of what the test asserts  

### Index (project document order)

Order matches [`project_docs/Role_Based_Test_Coverage_Review.md`](../project_docs/Role_Based_Test_Coverage_Review.md) (Authentication → User Management → Task Management). The Excel workbook is generated in this same order; [`scripts/testcase-sync/testcase-order.js`](../scripts/testcase-sync/testcase-order.js) is the single source of truth.

#### Authentication

| File | Endpoint |
|------|----------|
| [Auth_login.md](Auth_login.md) | `POST /auth/login` |
| [Auth_send-otp.md](Auth_send-otp.md) | `POST /auth/send-otp` |
| [Auth_verify-otp.md](Auth_verify-otp.md) | `POST /auth/verify-otp` |
| [Auth_refresh.md](Auth_refresh.md) | `POST /auth/refresh` |
| [Auth_forgot-password.md](Auth_forgot-password.md) | `POST /auth/forgot-password` |
| [Auth_password-action-validate.md](Auth_password-action-validate.md) | `POST /auth/password-action/validate` |
| [Auth_set-password.md](Auth_set-password.md) | `POST /auth/set-password` |

#### User management

| File | Endpoint |
|------|----------|
| [Orgs_users.md](Orgs_users.md) | `GET /orgs/:orgId/users` |
| [Orgs_users-get.md](Orgs_users-get.md) | `GET /orgs/:orgId/users/:orgUserId` |
| [Orgs_users-options.md](Orgs_users-options.md) | `GET /orgs/:orgId/users/options` |
| [Orgs_users-create.md](Orgs_users-create.md) | `POST /orgs/:orgId/users` |
| [Orgs_users-patch.md](Orgs_users-patch.md) | `PATCH /orgs/:orgId/users/:orgUserId` |

#### Task management

| File | Endpoint |
|------|----------|
| [Orgs_branches_tasks-list.md](Orgs_branches_tasks-list.md) | `GET /orgs/:orgId/branches/:branchId/tasks` |
| [Orgs_branches_tasks-board-negative.md](Orgs_branches_tasks-board-negative.md) | `GET /orgs/:orgId/branches/:branchId/tasks/board` (negatives) |
| [Orgs_branches_tasks-detail.md](Orgs_branches_tasks-detail.md) | `GET /orgs/:orgId/branches/:branchId/tasks/:taskId` |
| [Orgs_branches_tasks-create.md](Orgs_branches_tasks-create.md) | `POST /orgs/:orgId/branches/:branchId/tasks` |
| [Orgs_branches_tasks-patch.md](Orgs_branches_tasks-patch.md) | `PATCH /orgs/:orgId/branches/:branchId/tasks/:taskId` |
| [Orgs_branches_tasks-subtasks.md](Orgs_branches_tasks-subtasks.md) | Subtasks under a parent task |
| [Orgs_branches_tasks-subtasks-tree.md](Orgs_branches_tasks-subtasks-tree.md) | `GET .../tasks/:taskId/subtasks/tree` |
| [Orgs_branches_tasks-move.md](Orgs_branches_tasks-move.md) | `PATCH .../tasks/:taskId/move` |
| [Orgs_branches_tasks-delete.md](Orgs_branches_tasks-delete.md) | `DELETE .../tasks/:taskId` |
| [Orgs_branches_tasks-analytics.md](Orgs_branches_tasks-analytics.md) | `GET .../tasks/analytics` |
| [Orgs_branches_tasks-analytics-saved-filters.md](Orgs_branches_tasks-analytics-saved-filters.md) | Analytics saved filters |
| [Orgs_branches_tasks-comments.md](Orgs_branches_tasks-comments.md) | Task comments |
| [Orgs_branches_task-notifications.md](Orgs_branches_task-notifications.md) | Task notifications |
| [Orgs_task-settings-statuses.md](Orgs_task-settings-statuses.md) | Org task settings (statuses / priorities) |

#### Misc

| File | Endpoint |
|------|----------|
| [Misc_protected-route.md](Misc_protected-route.md) | `GET /{PROTECTED_API_PATH}` |
| [Template_api.md](Template_api.md) | Template / placeholder |

### Excel

Run `npm run testcases:generate` to build [`Master_TestCases.xlsx`](../Master_TestCases.xlsx) from these files. Within each module sheet (Auth, Users, Tasks, …), rows are grouped by endpoint in the order above; **one blank row is written after each endpoint group** for readability.
