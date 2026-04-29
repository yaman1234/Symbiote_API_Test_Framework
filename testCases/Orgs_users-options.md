# `GET /orgs/:orgId/users/options`

**User options (dropdown data)** — org-scoped list of users for pickers (supervisor selector, department assignment, branch-scoped dropdowns).

## Request

| Part | Value |
|------|--------|
| Method | **GET** |
| Path | `/orgs/:orgId/users/options` |
| Query | **`branchId`** (required for branch-scoped data) |
| Auth | **Bearer** access token after full OTP login (`loginWithOtp`) |

Example (relative to `BASE_URL`):  
`GET orgs/{orgId}/users/options?branchId={uuid}`

## Response rows (each option)

| Field | Description |
|--------|-------------|
| `orgUserId` | Org user identifier |
| `fullName` | Display name |
| `email` | Email |
| `branchRole` | Role in branch context (dropdown contract: **`EMPLOYEE`** \| **`SUPERVISOR`**) |

Payload envelope matches other Symbiote routes (`success`, `statusCode`, `message`, `data` as array or `data.items` / `data.options`).

## Access (who can call, which branch)

| Caller role | Branch scope |
|-------------|----------------|
| **OWNER** | **Any** branch in the org (`branchId` may be any valid branch UUID). |
| **SUPERVISOR** | **Own branch only** — use session `branchId` (or equivalent branch the API bound to that supervisor). |
| **EMPLOYEE** | **Own branch only** — use session `branchId`. |

## Role-based response expectations

| Role | Allowed branch scope | Typical response |
|------|-----------------------|------------------|
| **OWNER** | Any valid org branch | **200** success options list |
| **SUPERVISOR** | Own branch only | **200** success options list |
| **EMPLOYEE** | Own branch only | **200** success options list |
| **Any role without token** | None | **401** error envelope |

If a role attempts a disallowed branch scope, treat expected behavior as role-restricted error (typically **4xx**) and assert error envelope consistency.

## Used for

- Supervisor selector  
- Department assignment UI  
- Other branch-scoped dropdown pickers  

---

## ORGS-OPTS-001

- **TC_ID:** ORGS-OPTS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/users/smoke/users.options.spec.js`  
- **Scenario:** Authorized supervisor gets options for session branchId  
- **Expected:** HTTP **200**  
- **Checks:**
  - `loginWithOtp` (supervisor); session has `branchId`  
  - `expectSuccessStatus`, JSON type  
  - `expectOrgUsersOptionsSuccessBody` — success 200; options array from `data` / `data.items` / `data.options`  
  - Each row: non-empty `orgUserId`, `fullName`, `email`, `branchRole`  
  - Each `branchRole` is **EMPLOYEE** or **SUPERVISOR** only  

---

## ORGS-OPTS-002

- **TC_ID:** ORGS-OPTS-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/users/negative/users.options.negative.spec.js`  
- **Scenario:** Unauthorized request without Authorization  
- **Expected:** HTTP **401**  
- **Checks:** `expectJsonErrorBody` — 401, message contains Authentication, non-empty `error.code` and `error.key`  

---

## ORGS-OPTS-003

- **TC_ID:** ORGS-OPTS-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.options.access.spec.js`  
- **Scenario:** Owner-selected branch options return successfully  
- **Expected:** HTTP **200**  
- **Checks:** Same options body contract as ORGS-OPTS-001  

---

## ORGS-OPTS-004

- **TC_ID:** ORGS-OPTS-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.options.access.spec.js`  
- **Scenario:** Employee own-branch options return successfully  
- **Expected:** HTTP **200**  
- **Checks:** Same options body contract as ORGS-OPTS-001  

---

## ORGS-OPTS-005

- **TC_ID:** ORGS-OPTS-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.options.access.spec.js`  
- **Scenario:** Forbidden employee cross-branch options request is rejected  
- **Expected:** HTTP **4xx**  
- **Checks:** Employee uses non-own `branchId`; response must be JSON error envelope with non-empty `error.code` and `error.key`  

---

## ORGS-OPTS-006

- **TC_ID:** ORGS-OPTS-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.options.access.spec.js`  
- **Scenario:** Forbidden supervisor cross-branch options request is rejected  
- **Expected:** HTTP **4xx**  
- **Checks:** Supervisor uses non-own `branchId`; response must be JSON error envelope with non-empty `error.code` and `error.key`  
