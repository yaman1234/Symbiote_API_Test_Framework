# `GET /orgs/:orgId/users`

Requires **Bearer** from **login → send-otp → verify-otp** (`loginWithOtp`).

**Single user:** [`Orgs_users-get.md`](Orgs_users-get.md) — `GET /orgs/:orgId/users/:orgUserId`.

**Update user:** [`Orgs_users-patch.md`](Orgs_users-patch.md) — `PATCH /orgs/:orgId/users/:orgUserId`.

## Role-based access and expected response

| Role | Expected data scope | Typical response |
|------|----------------------|------------------|
| **OWNER** | Organization-wide users | **200** success list with pagination |
| **SUPERVISOR** | Branch-scoped users | **200** success list (branch constrained) |
| **EMPLOYEE** | Self-only visibility | **200** success list where each row is self |
| **Any role without token** | No access | **401** error envelope (`success=false`) |

Use this matrix when adding scenarios so role and response shape are explicit in each test case.

---

## ORGS-USERS-001

- **TC_ID:** ORGS-USERS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/users/smoke/users.list.spec.js`  
- **Scenario:** Authorized owner lists users with page and limit  
- **Expected:** HTTP **200**  
- **Checks:**
  - After `loginWithOtp` with owner email  
  - `expectSuccessStatus`, JSON type  
  - `expectOrgUsersListSuccessBody` — envelope 200, `data.page` / `data.limit` / `data.total`, non-empty items array, each row has identity  

---

## ORGS-USERS-002

- **TC_ID:** ORGS-USERS-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/users/negative/users.list.negative.spec.js`  
- **Scenario:** Unauthorized request without Authorization header  
- **Expected:** HTTP **401**  
- **Checks:** JSON; `expectJsonErrorBody` — 401, `message` contains Authentication, non-empty `error.code` and `error.key`  

---

## ORGS-USERS-003

- **TC_ID:** ORGS-USERS-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Organization-wide owner visibility returns full list  
- **Expected:** HTTP **200**  
- **Checks:** Same list body as ORGS-USERS-001; **`data.total >= 2`**  

---

## ORGS-USERS-004

- **TC_ID:** ORGS-USERS-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Self-only employee visibility returns own record  
- **Expected:** HTTP **200**  
- **Checks:**
  - Same list body helper  
  - Every row `listItemIdentity(row)` equals session `orgUserId`  
  - `data.total ===` number of returned rows  

---

## ORGS-USERS-005

- **TC_ID:** ORGS-USERS-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Branch-scoped supervisor visibility returns branch users  
- **Expected:** HTTP **200**  
- **Checks:**
  - Same list body helper  
  - If every row has branch id: single branch id equals session `branchId`  
  - Else: listed identities include supervisor `orgUserId`  

---

## ORGS-USERS-006

- **TC_ID:** ORGS-USERS-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Protected employee filters do not expose other users  
- **Expected:** HTTP **200** (or role-restricted 4xx)  
- **Checks:** On success, all rows must match employee self identity; otherwise error envelope is returned  

---

## ORGS-USERS-007

- **TC_ID:** ORGS-USERS-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Invalid branchId or departmentId filters return 4xx  
- **Expected:** HTTP **4xx**  
- **Checks:** JSON error envelope with non-empty `error.code`  

---

## ORGS-USERS-008

- **TC_ID:** ORGS-USERS-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Matching search query returns filtered users  
- **Expected:** HTTP **200**  
- **Checks:** List success envelope returned for search/filter query payload  
