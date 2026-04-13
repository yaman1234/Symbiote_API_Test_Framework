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
| [Orgs_users.md](Orgs_users.md) | `GET /orgs/:orgId/users` |
| [Orgs_users-options.md](Orgs_users-options.md) | `GET /orgs/:orgId/users/options` |
| [Orgs_users-create.md](Orgs_users-create.md) | `POST /orgs/:orgId/users` |
| [Misc_protected-route.md](Misc_protected-route.md) | `GET /{PROTECTED_API_PATH}` |

### Excel

Copy blocks into a sheet with columns **TC_ID, Suite, Spec_File, Scenario, Expected, Checks** — merge **Checks** bullets into one cell if needed.
