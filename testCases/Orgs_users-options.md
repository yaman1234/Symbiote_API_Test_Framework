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

## Used for

- Supervisor selector  
- Department assignment UI  
- Other branch-scoped dropdown pickers  

---

## ORGS-OPTS-001

- **TC_ID:** ORGS-OPTS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/users.options.spec.js`  
- **Scenario:** Supervisor calls options with session `branchId`  
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
- **Spec_File:** `tests/api/negative/users.options.negative.spec.js`  
- **Scenario:** No `Authorization`  
- **Expected:** HTTP **401**  
- **Checks:** `expectJsonErrorBody` — 401, message contains Authentication, non-empty `error.code` and `error.key`  

---

## ORGS-OPTS-003

- **TC_ID:** ORGS-OPTS-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.options.access.spec.js`  
- **Scenario:** Owner calls options for a branch (`session.branchId` or `USER_CREATE_BRANCH_ID`)  
- **Expected:** HTTP **200**  
- **Checks:** Same options body contract as ORGS-OPTS-001  

---

## ORGS-OPTS-004

- **TC_ID:** ORGS-OPTS-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.options.access.spec.js`  
- **Scenario:** Employee calls options with own session `branchId`  
- **Expected:** HTTP **200**  
- **Checks:** Same options body contract as ORGS-OPTS-001  
