# `DELETE /orgs/:orgId/branches/:branchId/tasks/:taskId`

Hard-deletes a task (and nested subtasks per API behavior).

---

## TASKS-DELETE-001

- **TC_ID:** TASKS-DELETE-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.crud.spec.js`  
- **Scenario:** Authorized user deletes the task created in the same serial suite  
- **Expected:** HTTP **2xx**; JSON success envelope referencing deleted task  
- **Checks:**
  - `DELETE orgs/{orgId}/branches/{branchId}/tasks/{taskId}`
  - `expectSuccessStatus`, `expectJsonSuccessBody` with `messageIncludes` deleted, `data.taskId` present

---

## TASKS-DELETE-002

- **TC_ID:** TASKS-DELETE-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.delete.spec.js`  
- **Scenario:** Delete parent task that has at least one subtask (cascade delete)  
- **Expected:** HTTP **2xx**; success envelope with `deletedCount >= 2`  
- **Checks:** parent + child seed creation, delete parent, validate count and success contract

---

## TASKS-DELETE-003

- **TC_ID:** TASKS-DELETE-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.delete.spec.js`  
- **Scenario:** Deleted task is not retrievable via detail endpoint  
- **Expected:** Delete returns **2xx**, then detail returns **404/400**  
- **Checks:** create → delete → GET detail consistency check

---

## TASKS-DELETE-004

- **TC_ID:** TASKS-DELETE-004  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.delete.spec.js`  
- **Scenario:** Delete recurring template task succeeds  
- **Expected:** HTTP **2xx** delete success envelope  
- **Checks:** gated recurrence seed create and delete flow (`RUN_TASKS_RECURRENCE_TEST=1`)

---

## TASKS-DELETE-005

- **TC_ID:** TASKS-DELETE-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.delete.negative.spec.js`  
- **Scenario:** Missing JWT on delete request  
- **Expected:** HTTP **401**; auth error envelope  
- **Checks:** `expectHttpStatus` 401 + `expectJsonErrorBody`

---

## TASKS-DELETE-006

- **TC_ID:** TASKS-DELETE-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.delete.negative.spec.js`  
- **Scenario:** Unknown taskId delete request  
- **Expected:** HTTP **404** or **400**; error envelope  
- **Checks:** non-existent task id deletion contract

---

## TASKS-DELETE-007

- **TC_ID:** TASKS-DELETE-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.delete.negative.spec.js`  
- **Scenario:** Cross-branch delete attempt by supervisor  
- **Expected:** HTTP **403** or **404**; scope/policy deny  
- **Checks:** wrong-branch path with supervisor token is rejected

---

## TASKS-DELETE-008

- **TC_ID:** TASKS-DELETE-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.delete.negative.spec.js`  
- **Scenario:** Second delete on same task id after successful deletion  
- **Expected:** First delete **2xx**, second delete **404/400**  
- **Checks:** idempotency/consistency behavior after hard delete
