# `GET /orgs/:orgId/branches/:branchId/tasks`

Lists tasks for branch-scoped task boards/report views with pagination and filters.

## Role-based access and expected response

| Role | Expected task visibility | Typical response |
|------|---------------------------|------------------|
| **OWNER** | Branch tasks for selected branch | **2xx** success list envelope |
| **SUPERVISOR** | Own branch tasks | **2xx** success list envelope |
| **EMPLOYEE** | Scoped tasks per policy | **2xx** success list envelope |
| **Any role without token** | No access | **401** error envelope |

---

## TASKS-LIST-001

- **TC_ID:** TASKS-LIST-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.list.spec.js`  
- **Scenario:** Authorized owner lists tasks with pagination and filters  
- **Expected:** HTTP **2xx**, JSON  
- **Checks:**
  - JWT via `loginWithOtp` (owner persona)
  - `GET orgs/{orgId}/branches/{branchId}/tasks` with `page=1&pageSize=20&q=inventory&sort=startAt&order=asc`
  - `expectTasksListSuccessBody`:
    - `success=true`, `statusCode=200`, string `message`
    - `data` is an array
    - `pagination.type=offset`
    - `pagination.page>=1`, `pagination.limit>0 && <=100`
    - `pagination.total>=0`, `pagination.totalPages>=1`

---

## TASKS-LIST-002

- **TC_ID:** TASKS-LIST-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.list.negative.spec.js`  
- **Scenario:** Unauthorized tasks list request returns 401  
- **Expected:** HTTP **401**  
- **Checks:**
  - `expectHttpStatus` 401
  - JSON `Content-Type`
  - `expectJsonErrorBody`:
    - `statusCode=401`
    - message contains `Authentication`
    - non-empty `error.code` and `error.key`

---

## TASKS-LIST-003

- **TC_ID:** TASKS-LIST-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** Owner branch tasks list returns successfully  
- **Expected:** HTTP **2xx**  
- **Checks:** `expectTasksListSuccessBody` with owner JWT and `TASKS_BRANCH_ID`

---

## TASKS-LIST-004

- **TC_ID:** TASKS-LIST-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** Supervisor branch tasks list returns successfully  
- **Expected:** HTTP **2xx**  
- **Checks:** `expectTasksListSuccessBody` with supervisor JWT and branch from token (fallback env)

---

## TASKS-LIST-005

- **TC_ID:** TASKS-LIST-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** Employee scoped tasks list returns successfully  
- **Expected:** HTTP **2xx**  
- **Checks:** `expectTasksListSuccessBody` with employee JWT and branch from token (fallback env)

---

## TASKS-LIST-006

- **TC_ID:** TASKS-LIST-006  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.boardview.spec.js`  
- **Scenario:** Board view task list returns successfully  
- **Expected:** HTTP **2xx**  
- **Checks:** Board endpoint returns success envelope with task rows

---

## TASKS-LIST-007

- **TC_ID:** TASKS-LIST-007  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.boardview.spec.js`  
- **Scenario:** Filtered board view with assigneeId returns successfully  
- **Expected:** HTTP **2xx**  
- **Checks:** Board endpoint returns filtered rows for assignee query

---

## TASKS-LIST-008

- **TC_ID:** TASKS-LIST-008  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.boardview.spec.js`  
- **Scenario:** Task detail endpoint returns selected task payload  
- **Expected:** HTTP **2xx**  
- **Checks:** Task detail endpoint returns success envelope with selected task

---

## TASKS-LIST-009

- **TC_ID:** TASKS-LIST-009  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** Forbidden supervisor cross-branch task list request is rejected  
- **Expected:** HTTP **4xx**  
- **Checks:** Supervisor token requests another branch tasks; response must be JSON error envelope with non-empty `error.code` and `error.key`  

---

## TASKS-LIST-010

- **TC_ID:** TASKS-LIST-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** Forbidden employee cross-branch task list request is rejected  
- **Expected:** HTTP **4xx**  
- **Checks:** Employee token requests another branch tasks; response must be JSON error envelope with non-empty `error.code` and `error.key`  

---

## TASKS-LIST-011

- **TC_ID:** TASKS-LIST-011  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.list.negative.spec.js`  
- **Scenario:** Tasks list rejects pageSize above API maximum (100)  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:**
  - `GET orgs/{orgId}/branches/{branchId}/tasks` with `pageSize=101`
  - `expectHttpStatus` 422 or 400
  - `expectJsonContentType`
  - `expectJsonErrorBody` with `success=false`, non-empty `error.code`

---

## TASKS-LIST-012

- **TC_ID:** TASKS-LIST-012  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.list.spec.js`  
- **Scenario:** Authorized owner lists tasks with all supported query parameters in one request  
- **Expected:** HTTP **2xx**; JSON success list envelope  
- **Checks:**
  - Preload `GET .../tasks/board` to discover valid `statusId`, `priorityId`, `assigneeId`, and a task `startAt`
  - `GET orgs/{orgId}/branches/{branchId}/tasks` with `q`, `statusId`, `priorityId`, `assigneeId`, `from`, `to`, `page`, `pageSize`, `sort`, `order`
  - `expectSuccessStatus`, `expectJsonContentType`, `expectTasksListSuccessBody`
