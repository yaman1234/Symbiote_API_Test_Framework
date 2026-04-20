# `GET /orgs/:orgId/branches/:branchId/tasks`

Lists tasks for branch-scoped task boards/report views with pagination and filters.

---

## TASKS-LIST-001

- **TC_ID:** TASKS-LIST-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/tasks.list.spec.js`  
- **Scenario:** Owner lists tasks with pagination, search, and sort query params  
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
- **Spec_File:** `tests/api/negative/tasks.list.negative.spec.js`  
- **Scenario:** List tasks without Authorization token  
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
- **Scenario:** OWNER can list tasks in selected branch  
- **Expected:** HTTP **2xx**  
- **Checks:** `expectTasksListSuccessBody` with owner JWT and `TASKS_BRANCH_ID`

---

## TASKS-LIST-004

- **TC_ID:** TASKS-LIST-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** SUPERVISOR can list tasks in own/specified branch scope  
- **Expected:** HTTP **2xx**  
- **Checks:** `expectTasksListSuccessBody` with supervisor JWT and branch from token (fallback env)

---

## TASKS-LIST-005

- **TC_ID:** TASKS-LIST-005  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/tasks.list.access.spec.js`  
- **Scenario:** EMPLOYEE can list tasks in permitted scope  
- **Expected:** HTTP **2xx**  
- **Checks:** `expectTasksListSuccessBody` with employee JWT and branch from token (fallback env)
