# `GET /orgs/:orgId/users/options`

Query **`branchId`**. Requires **Bearer** after full OTP login.

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
