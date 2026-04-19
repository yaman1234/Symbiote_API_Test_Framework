# `GET /orgs/:orgId/users`

Requires **Bearer** from **login → send-otp → verify-otp** (`loginWithOtp`).

**Single user:** [`Orgs_users-get.md`](Orgs_users-get.md) — `GET /orgs/:orgId/users/:orgUserId`.

**Update user:** [`Orgs_users-patch.md`](Orgs_users-patch.md) — `PATCH /orgs/:orgId/users/:orgUserId`.

---

## ORGS-USERS-001

- **TC_ID:** ORGS-USERS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/users.list.spec.js`  
- **Scenario:** Owner lists users with `page=1`, `limit=20`  
- **Expected:** HTTP **200**  
- **Checks:**
  - After `loginWithOtp` with owner email  
  - `expectSuccessStatus`, JSON type  
  - `expectOrgUsersListSuccessBody` — envelope 200, `data.page` / `data.limit` / `data.total`, non-empty items array, each row has identity  

---

## ORGS-USERS-002

- **TC_ID:** ORGS-USERS-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/users.list.negative.spec.js`  
- **Scenario:** No `Authorization` header  
- **Expected:** HTTP **401**  
- **Checks:** JSON; `expectJsonErrorBody` — 401, `message` contains Authentication, non-empty `error.code` and `error.key`  

---

## ORGS-USERS-003

- **TC_ID:** ORGS-USERS-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Owner — org-wide list (seeded Tier 1)  
- **Expected:** HTTP **200**  
- **Checks:** Same list body as ORGS-USERS-001; **`data.total >= 2`**  

---

## ORGS-USERS-004

- **TC_ID:** ORGS-USERS-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.list.visibility.spec.js`  
- **Scenario:** Employee — only self in list  
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
- **Scenario:** Supervisor — branch alignment or self in list  
- **Expected:** HTTP **200**  
- **Checks:**
  - Same list body helper  
  - If every row has branch id: single branch id equals session `branchId`  
  - Else: listed identities include supervisor `orgUserId`  
