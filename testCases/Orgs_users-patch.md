# `PATCH /orgs/:orgId/users/:orgUserId`

Updates an org user. Requires **Bearer** after OTP login. Payload shape matches create (see [`Orgs_users-create.md`](Orgs_users-create.md)); `buildUpdateUserPayload` in `helpers/createUserPayload.js` supplies a full example body (branch row **`status`: `ACTIVE`** to match QA GET after PATCH, default **`modules`: `INVENTORY`**, NI `QQ123456C`, tax `TAX-998899`, bank / wage / attachment fields). Override **`status`** (e.g. `PENDING`) via `overrides` only if your environment persists it on `branchUsers`. The smoke flow adds **`PAYROLL`** via `overrides.modules` when the API allows it for the Owner.

## Role-based access and expected response

| Role | Allowed update scope | Typical response |
|------|-----------------------|------------------|
| **OWNER** | Can update full profile, role, modules, payroll, compliance fields | **200/201** success envelope |
| **SUPERVISOR** | Can update allowed profile/department fields in own branch; restricted for compliance/modules/payroll fields | **200/201** on allowed fields, **4xx** on restricted fields |
| **EMPLOYEE** | No admin update access | **4xx** error envelope |
| **Any role without token** | No access | **401** error envelope |

---

## ORGS-PATCH-001

- **TC_ID:** ORGS-PATCH-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/users/smoke/users.update.flow.spec.js`  
- **Scenario:** Complete owner create-get-patch-get flow validates updates  
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
- **Scenario:** Missing fullName on patch returns 400 or 422  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Error envelope shape with `success=false`, `statusCode`, `error.code`, `error.key`  

---

## ORGS-PATCH-003

- **TC_ID:** ORGS-PATCH-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.inactive-access.spec.js`  
- **Scenario:** Inactive employee status blocks new session login  
- **Expected:** PATCH status change succeeds (200/201); subsequent login fails with error envelope  
- **Checks:** Inactive user cannot obtain a new authenticated session; cleanup restores `ACTIVE` status  

---

## ORGS-PATCH-004

- **TC_ID:** ORGS-PATCH-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Authorized owner updates user in own branch  
- **Expected:** HTTP **200/201**  
- **Checks:** Success envelope for PATCH update  

---

## ORGS-PATCH-005

- **TC_ID:** ORGS-PATCH-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Authorized supervisor updates user in own branch  
- **Expected:** HTTP **200/201**  
- **Checks:** Success envelope for PATCH update  

---

## ORGS-PATCH-006

- **TC_ID:** ORGS-PATCH-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor NI update is rejected  
- **Expected:** HTTP **400/403**  
- **Checks:** Error envelope for forbidden supervisor update  

---

## ORGS-PATCH-007

- **TC_ID:** ORGS-PATCH-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor share code update is rejected  
- **Expected:** HTTP **400/403**  
- **Checks:** Error envelope for forbidden supervisor update  

---

## ORGS-PATCH-008

- **TC_ID:** ORGS-PATCH-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor module permission update is rejected  
- **Expected:** HTTP **400/403**  
- **Checks:** Error envelope for forbidden supervisor update  

---

## ORGS-PATCH-009

- **TC_ID:** ORGS-PATCH-009  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor tax ID update is rejected  
- **Expected:** HTTP **400/403**  
- **Checks:** Error envelope for forbidden supervisor update  

---

## ORGS-PATCH-010

- **TC_ID:** ORGS-PATCH-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor branchRole change is rejected  
- **Expected:** HTTP **400/403**  
- **Checks:** Error envelope for forbidden supervisor update  

---

## ORGS-PATCH-011

- **TC_ID:** ORGS-PATCH-011  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor payroll field update is rejected  
- **Expected:** HTTP **400/403**  
- **Checks:** Error envelope for forbidden supervisor update  
