# `PATCH /orgs/:orgId/branches/:branchId/tasks/:taskId`

Updates task metadata (e.g. title, status, timeline).

---

## TASKS-PATCH-001

- **TC_ID:** TASKS-PATCH-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.crud.spec.js`  
- **Scenario:** Authorized user updates a task created in the same serial suite  
- **Expected:** HTTP **2xx**; JSON success envelope with `data.taskId`  
- **Checks:**
  - `PATCH orgs/{orgId}/branches/{branchId}/tasks/{taskId}` with partial body
  - `expectSuccessStatus`, `expectJsonSuccessBody` with `messageIncludes` updated

---

## TASKS-PATCH-002

- **TC_ID:** TASKS-PATCH-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.update.spec.js`  
- **Scenario:** Update task using all editable fields (`title`, `description`, `statusId`, `priorityId`, `assigneeId`, `startAt`, `endAt`, `reminderOffsetsMinutes`)  
- **Expected:** HTTP **2xx**; JSON success envelope with `data.taskId`  
- **Checks:** `expectSuccessStatus`, `expectJsonSuccessBody` message includes `updated`

---

## TASKS-PATCH-003

- **TC_ID:** TASKS-PATCH-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.update.spec.js`  
- **Scenario:** Reminder replacement flow when `reminderOffsetsMinutes` is provided  
- **Expected:** HTTP **2xx** for patch and detail fetch; detail contains reminders array  
- **Checks:** Patch with new reminder offsets, then GET detail and validate `data.reminders` exists as array

---

## TASKS-PATCH-004

- **TC_ID:** TASKS-PATCH-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.update.negative.spec.js`  
- **Scenario:** Invalid timeline update (`endAt <= startAt`)  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-PATCH-005

- **TC_ID:** TASKS-PATCH-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.update.negative.spec.js`  
- **Scenario:** Subtask timeline update outside parent timeline is blocked  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** Create parent + subtask seed, patch subtask outside parent range, assert error envelope

---

## TASKS-PATCH-006

- **TC_ID:** TASKS-PATCH-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.update.negative.spec.js`  
- **Scenario:** Parent timeline shrink blocked when subtasks would fall outside  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** Create parent + subtask seed, shrink parent end time below child window, assert error envelope

---

## TASKS-PATCH-007

- **TC_ID:** TASKS-PATCH-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.update.negative.spec.js`  
- **Scenario:** Missing JWT on update request  
- **Expected:** HTTP **401**; JSON authentication error envelope  
- **Checks:** `expectHttpStatus` 401 + `expectJsonErrorBody` auth contract

---

## TASKS-PATCH-008

- **TC_ID:** TASKS-PATCH-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.update.negative.spec.js`  
- **Scenario:** Unknown task ID on update  
- **Expected:** HTTP **404**; JSON error envelope  
- **Checks:** `expectHttpStatus` 404 + `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-PATCH-009

- **TC_ID:** TASKS-PATCH-009  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.update.negative.spec.js`  
- **Scenario:** Cross-branch update attempt is rejected  
- **Expected:** HTTP **403** or **404**; JSON error envelope  
- **Checks:** Supervisor token patches task via unauthorized branch path and receives policy/scope rejection
