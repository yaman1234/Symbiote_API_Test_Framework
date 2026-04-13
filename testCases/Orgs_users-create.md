# `POST /orgs/:orgId/users`

Creates a user under an org + branch. Requires **Bearer** after OTP login.

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

---

## ORGS-CREATE-001

- **TC_ID:** ORGS-CREATE-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/users.create.spec.js`  
- **Scenario:** Owner creates user (minimal body, branch from env)  
- **Expected:** HTTP **2xx**, JSON  
- **Checks:** `expectOrgUserCreateSuccessBody` — `User created.`, `data.orgUserId`  

---

## ORGS-CREATE-002

- **TC_ID:** ORGS-CREATE-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/users.create.negative.spec.js`  
- **Scenario:** No `Authorization`  
- **Expected:** HTTP **401**  
- **Checks:** `expectJsonErrorBody` (Authentication, error code/key)  

---

## ORGS-CREATE-003

- **TC_ID:** ORGS-CREATE-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/users.create.negative.spec.js`  
- **Scenario:** Missing `email`  
- **Expected:** HTTP **422**  
- **Checks:** `expectAuthValidationErrorBody` — field `email`  

---

## ORGS-CREATE-004

- **TC_ID:** ORGS-CREATE-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Employee** must not be allowed to create users  
- **Expected:** HTTP **401** or **403**, `success === false`  
- **Checks:** `loginWithOtp` as employee; POST create; `expectNonSuccess`; status in `{401,403}`  

---

## ORGS-CREATE-005

- **TC_ID:** ORGS-CREATE-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Supervisor** creates **EMPLOYEE** in **own** `branchId`  
- **Expected:** HTTP **2xx**, `User created.`  
- **Checks:** `branchId === session.branchId`; `expectOrgUserCreateSuccessBody`  

---

## ORGS-CREATE-006

- **TC_ID:** ORGS-CREATE-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Supervisor** cannot use **another** branch (`USER_CREATE_WRONG_BRANCH_ID`)  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** Skips if wrong branch equals supervisor branch; `success === false`  

---

## ORGS-CREATE-007

- **TC_ID:** ORGS-CREATE-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Supervisor** cannot set **`branchRole` = SUPERVISOR**  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** `overrides.branchRole = SUPERVISOR`; `success === false`  

---

## ORGS-CREATE-008

- **TC_ID:** ORGS-CREATE-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Duplicate** membership — same `email` POST twice same org/branch  
- **Expected:** First **2xx**; second **400**, **409**, or **422**  
- **Checks:** Second response not OK; `success === false`  

---

## ORGS-CREATE-009

- **TC_ID:** ORGS-CREATE-009  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Invalid** `departmentIds` (not in org/branch)  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Fake UUID in `departmentIds`; `success === false`  

---

## ORGS-CREATE-010

- **TC_ID:** ORGS-CREATE-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Invalid** `supervisorOrgUserId`  
- **Expected:** HTTP **400** or **422**  
- **Checks:** Non-existent UUID; `success === false`  

---

## ORGS-CREATE-011

- **TC_ID:** ORGS-CREATE-011  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Supervisor** must not set **payroll** fields  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** `paymentMethod`, `baseWage` in payload; `success === false`  

---

## ORGS-CREATE-012

- **TC_ID:** ORGS-CREATE-012  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.create.rules.spec.js`  
- **Scenario:** **Supervisor** must not set **`modules`**  
- **Expected:** HTTP **400**, **403**, or **422**  
- **Checks:** `modules: ['INVENTORY','TASKS']`; `success === false`  
