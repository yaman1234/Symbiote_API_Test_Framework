# `PATCH /orgs/:orgId/users/:orgUserId`

Updates an org user. Requires **Bearer** after OTP login. Payload shape matches create (see [`Orgs_users-create.md`](Orgs_users-create.md)); `buildUpdateUserPayload` in `helpers/createUserPayload.js` supplies a full example body (branch row **`status`: `ACTIVE`** to match QA GET after PATCH, default **`modules`: `INVENTORY`**, NI `QQ123456C`, tax `TAX-998899`, bank / wage / attachment fields). Override **`status`** (e.g. `PENDING`) via `overrides` only if your environment persists it on `branchUsers`. The smoke flow adds **`PAYROLL`** via `overrides.modules` when the API allows it for the Owner.

---

## ORGS-PATCH-001

- **TC_ID:** ORGS-PATCH-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/users/smoke/users.update.flow.spec.js`  
- **Scenario:** Owner creates user → GET detail (matches create) → PATCH full update shape → GET detail (matches patch)  
- **Expected:** HTTP **2xx** on create, patch, and both GETs; JSON success envelopes  
- **Checks:**
  - `expectOrgUserCreateSuccessBody`  
  - First GET: `expectOrgUserGetSuccessBody`, `data.fullName` equals create payload  
  - `expectOrgUserPatchSuccessBody` — JSON `statusCode` **200** or **201**  
  - Second GET: `expectOrgUserGetSuccessBody`, `expectOrgUserDetailMatchesPatch` on `data` vs patch payload (name, phone, status, employeeId, modules, departments when returned)  
- **Env:** `USER_MGMT_OWNER_EMAIL`, `USER_CREATE_BRANCH_ID`, `USER_CREATE_DEPARTMENT_IDS` (optional comma UUIDs), OTP chain  

---

## ORGS-PATCH-002

- **TC_ID:** ORGS-PATCH-002  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.profile.validation.spec.js`  
- **Scenario:** Reject PATCH when mandatory `fullName` is missing  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Error envelope shape with `success=false`, `statusCode`, `error.code`, `error.key`  

---

## ORGS-PATCH-003

- **TC_ID:** ORGS-PATCH-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.inactive-access.spec.js`  
- **Scenario:** Set employee status to `INACTIVE` then verify fresh login/session is denied  
- **Expected:** PATCH status change succeeds (200/201); subsequent login fails with error envelope  
- **Checks:** Inactive user cannot obtain a new authenticated session; cleanup restores `ACTIVE` status  
