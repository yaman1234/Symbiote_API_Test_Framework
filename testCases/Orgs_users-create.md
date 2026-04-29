# `POST /orgs/:orgId/users`

Creates a user under an org + branch. Requires **Bearer** after OTP login.

**Update user:** [`Orgs_users-patch.md`](Orgs_users-patch.md) — `PATCH /orgs/:orgId/users/:orgUserId` (smoke flow create → GET → PATCH → GET).

## 4.1 Create rules → coverage

| Rule | Automated | Notes |
|------|-----------|--------|
| Only **Owner** and **Supervisor** can create | Yes | Employee → **ORGS-CREATE-004** |
| **Owner** can create in a **selected** branch | Yes | `USER_CREATE_BRANCH_ID` — **ORGS-CREATE-001** |
| **Supervisor** only in **own** branch | Yes | **ORGS-CREATE-006** (+ **ORGS-CREATE-005** happy path) |
| **Supervisor** only **`branchRole` = EMPLOYEE** | Yes | **ORGS-CREATE-007** |
| **Duplicate** membership same org | Yes | **ORGS-CREATE-008** |
| **Email** exists globally → account **reused** | No | Behaviour-specific; assert manually or add fixture test later |
| **Departments** must belong to org/branch | Yes | **ORGS-CREATE-009** |
| **`supervisorOrgUserId`** must be valid Owner/Supervisor in branch | Yes | **ORGS-CREATE-010** |
| **Payroll** / **modules** only **Owner** | Yes | **ORGS-CREATE-011**, **ORGS-CREATE-012** |

**Env:** `USER_MGMT_OWNER_EMAIL`, `USER_CREATE_BRANCH_ID`, `USER_CREATE_DEPARTMENT_IDS` (comma UUIDs), `USER_CREATE_WRONG_BRANCH_ID` (≠ supervisor branch for ORGS-CREATE-006), OTP chain.

## Role-based access and expected response

| Role | Allowed create behavior | Typical response |
|------|--------------------------|------------------|
| **OWNER** | Can create in selected branch; can set payroll/modules | **2xx** success envelope |
| **SUPERVISOR** | Can create EMPLOYEE in own branch only; cannot set payroll/modules | **2xx** on allowed payload, **4xx** on restricted payload |
| **EMPLOYEE** | Cannot create users | **401/403** error envelope |
| **Any role without token** | No access | **401** error envelope |

---

## ORGS-CREATE-001

- **TC_ID:** ORGS-CREATE-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/users/smoke/users.create.spec.js`  
- **Scenario:** Authorized owner creates user with minimal body  
- **Expected:** HTTP **2xx**, JSON  
- **Checks:** `expectOrgUserCreateSuccessBody` — `message` contains **User created** (e.g. `User created.` or invitation-sent variant), `data.orgUserId`  

---

## ORGS-CREATE-002

- **TC_ID:** ORGS-CREATE-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/users/negative/users.create.negative.spec.js`  
- **Scenario:** Unauthorized create request returns 401  
- **Expected:** HTTP **401**  
- **Checks:** `expectJsonErrorBody` (Authentication, error code/key)  

---

## ORGS-CREATE-003

- **TC_ID:** ORGS-CREATE-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/users/negative/users.create.negative.spec.js`  
- **Scenario:** Missing email on create returns 422 Validation Error  
- **Expected:** HTTP **422**  
- **Checks:** `expectAuthValidationErrorBody` — field `email`  

---

## ORGS-CREATE-004

- **TC_ID:** ORGS-CREATE-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden employee create attempt is blocked  
- **Expected:** HTTP **401** or **403**, `success === false`  
- **Checks:** `loginWithOtp` as employee; POST create; `expectNonSuccess`; status in `{401,403}`  

---

## ORGS-CREATE-005

- **TC_ID:** ORGS-CREATE-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Valid supervisor creates employee in own branch  
- **Expected:** HTTP **2xx**, success message contains **User created**  
- **Checks:** `branchId === session.branchId`; `expectOrgUserCreateSuccessBody`  

---

## ORGS-CREATE-006

- **TC_ID:** ORGS-CREATE-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Invalid supervisor branch override is rejected  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** Skips if wrong branch equals supervisor branch; `success === false`  

---

## ORGS-CREATE-007

- **TC_ID:** ORGS-CREATE-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor-created SUPERVISOR role is rejected  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** `overrides.branchRole = SUPERVISOR`; `success === false`  

---

## ORGS-CREATE-008

- **TC_ID:** ORGS-CREATE-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Duplicate membership in same org/branch is rejected  
- **Expected:** First **2xx**; second **400**, **409**, or **422**  
- **Checks:** Second response not OK; `success === false`  

---

## ORGS-CREATE-009

- **TC_ID:** ORGS-CREATE-009  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Invalid department id is rejected  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Fake UUID in `departmentIds`; `success === false`  

---

## ORGS-CREATE-010

- **TC_ID:** ORGS-CREATE-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Invalid supervisorOrgUserId is rejected  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Non-existent UUID; `success === false`  

---

## ORGS-CREATE-011

- **TC_ID:** ORGS-CREATE-011  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor payroll fields are rejected  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** `paymentMethod`, `baseWage` in payload; `success === false`  

---

## ORGS-CREATE-012

- **TC_ID:** ORGS-CREATE-012  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Forbidden supervisor modules assignment is rejected  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** `modules: ['INVENTORY','TASKS']`; `success === false`  

---

## ORGS-CREATE-013

- **TC_ID:** ORGS-CREATE-013  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.profile.validation.spec.js`  
- **Scenario:** Mandatory create fields are enforced  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Error envelope shape with `success=false`, `statusCode`, `error.code`, `error.key`  

---

## ORGS-CREATE-014

- **TC_ID:** ORGS-CREATE-014  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.profile.validation.spec.js`  
- **Scenario:** Forbidden OWNER branchRole creation is rejected  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** Error envelope shape with `success=false`, `statusCode`, `error.code`, `error.key`  

---

## ORGS-CREATE-015

- **TC_ID:** ORGS-CREATE-015  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.profile.validation.spec.js`  
- **Scenario:** Invalid supervisorOrgUserId for EMPLOYEE target is rejected  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** Error envelope shape with `success=false`, `statusCode`, `error.code`, `error.key`  

---

## ORGS-CREATE-016

- **TC_ID:** ORGS-CREATE-016  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** Missing required create fields return 422 Validation Error  
- **Expected:** HTTP **422**  
- **Checks:** Create request fails when required fields are removed from payload  
