# Test cases by API

Each **`Module_endpoint.md`** file documents coverage for one endpoint.

### Field order (every test block)

1. **TC_ID** — Stable id  
2. **Suite** — Smoke | Negative | Regression  
3. **Spec_File** — Playwright spec path  
4. **Scenario** — Short description  
5. **Expected** — HTTP / outcome  
6. **Checks** — Bullet list of what the test asserts  

### Index

| File | Endpoint |
|------|----------|
| [Auth_login.md](Auth_login.md) | `POST /auth/login` |
| [Auth_send-otp.md](Auth_send-otp.md) | `POST /auth/send-otp` |
| [Auth_verify-otp.md](Auth_verify-otp.md) | `POST /auth/verify-otp` |
| [Auth_refresh.md](Auth_refresh.md) | `POST /auth/refresh` |
| [Auth_forgot-password.md](Auth_forgot-password.md) | `POST /auth/forgot-password` |
| [Auth_password-action-validate.md](Auth_password-action-validate.md) | `POST /auth/password-action/validate` |
| [Auth_set-password.md](Auth_set-password.md) | `POST /auth/set-password` |
| [Orgs_users.md](Orgs_users.md) | `GET /orgs/:orgId/users` |
| [Orgs_users-get.md](Orgs_users-get.md) | `GET /orgs/:orgId/users/:orgUserId` |
| [Orgs_users-options.md](Orgs_users-options.md) | `GET /orgs/:orgId/users/options` |
| [Orgs_users-create.md](Orgs_users-create.md) | `POST /orgs/:orgId/users` |
| [Orgs_users-patch.md](Orgs_users-patch.md) | `PATCH /orgs/:orgId/users/:orgUserId` |
| [Orgs_branches_tasks-list.md](Orgs_branches_tasks-list.md) | `GET /orgs/:orgId/branches/:branchId/tasks` |
| [Misc_protected-route.md](Misc_protected-route.md) | `GET /{PROTECTED_API_PATH}` |

### Excel

Copy blocks into a sheet with columns **TC_ID, Suite, Spec_File, Scenario, Expected, Checks** — merge **Checks** bullets into one cell if needed.
