# `POST /orgs/:orgId/branches/:branchId/tasks`

Creates a branch task (title, schedule, status, priority, assignee, optional reminders).

---

## TASKS-POST-001

- **TC_ID:** TASKS-POST-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.crud.spec.js`  
- **Scenario:** Authorized user creates a task and receives taskId  
- **Expected:** HTTP **200** or **201**; JSON success envelope with `data.taskId`  
- **Checks:**
  - JWT via `loginWithOtp`
  - `POST orgs/{orgId}/branches/{branchId}/tasks` with ISO `startAt`/`endAt` and valid UUID references from list row
  - `expectHttpOkOrCreated`, `expectJsonSuccessBody` with `messageIncludes` created, `data.taskId` non-empty

---

## TASKS-POST-002

- **TC_ID:** TASKS-POST-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.crud.spec.js`  
- **Scenario:** Create recurring task returns taskId and recurrenceId  
- **Expected:** HTTP **200** or **201**; JSON success envelope with non-empty `data.taskId` and `data.recurrenceId`  
- **Checks:**
  - `POST orgs/{orgId}/branches/{branchId}/tasks` with valid recurrence object (`frequency`, `executionTime`, `endDate`)
  - `expectHttpOkOrCreated`, `expectJsonSuccessBody` with non-empty `data.taskId` and `data.recurrenceId`
  - Cleanup delete for created recurrence task

---

## TASKS-POST-003

- **TC_ID:** TASKS-POST-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.create.negative.spec.js`  
- **Scenario:** Missing required `startAt` in create payload  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-POST-004

- **TC_ID:** TASKS-POST-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.create.negative.spec.js`  
- **Scenario:** `endAt` not after `startAt` violates timeline rule  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-POST-005

- **TC_ID:** TASKS-POST-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.create.negative.spec.js`  
- **Scenario:** Invalid UUID values for `statusId`, `priorityId`, and `assigneeId`  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-POST-006

- **TC_ID:** TASKS-POST-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.create.negative.spec.js`  
- **Scenario:** Invalid reminder offsets (negative/non-numeric)  
- **Expected:** HTTP **422** or **400**; JSON error envelope  
- **Checks:** `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-POST-007

- **TC_ID:** TASKS-POST-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.create.negative.spec.js`  
- **Scenario:** Missing JWT while creating task  
- **Expected:** HTTP **401**; JSON error envelope  
- **Checks:** `expectHttpStatus` 401 + authentication error contract

---

## TASKS-POST-008

- **TC_ID:** TASKS-POST-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.create.negative.spec.js`  
- **Scenario:** Cross-branch unauthorized create attempt with supervisor token  
- **Expected:** HTTP **403** or **404**; JSON error envelope  
- **Checks:** `expectJsonErrorBody` with non-empty `error.code` and `error.key`
