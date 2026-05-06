# `GET /orgs/:orgId/branches/:branchId/tasks/:taskId`

Loads a single task detail payload for drawers/pages, including related sections.

---

## TASKS-DETAIL-001

- **TC_ID:** TASKS-DETAIL-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.detail.spec.js`  
- **Scenario:** Task detail strict shape validation includes all expected sections  
- **Expected:** HTTP **2xx**; JSON success envelope with expected task detail structure  
- **Checks:**
  - Preload board to pick a valid `taskId`
  - Validate `status`, `priority`, `assignee`, `startAt`, `endAt`
  - Validate `reminders[]`, `recurrence` (object or null), `attachments[]`, `subtasks[]`, `comments[]`, `activityLogs[]`

---

## TASKS-DETAIL-002

- **TC_ID:** TASKS-DETAIL-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.detail.negative.spec.js`  
- **Scenario:** Unknown task id returns 404 not found  
- **Expected:** HTTP **404**; JSON error envelope  
- **Checks:**
  - `GET orgs/{orgId}/branches/{branchId}/tasks/{unknownTaskId}` with valid JWT
  - `expectHttpStatus` 404
  - `expectJsonErrorBody` with non-empty `error.code` and `error.key`

---

## TASKS-DETAIL-003

- **TC_ID:** TASKS-DETAIL-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.detail.negative.spec.js`  
- **Scenario:** Missing JWT on task detail endpoint returns unauthorized  
- **Expected:** HTTP **401**; JSON error envelope  
- **Checks:**
  - `GET orgs/{orgId}/branches/{branchId}/tasks/{taskId}` without `Authorization`
  - `expectHttpStatus` 401
  - `expectJsonErrorBody` with authentication message and non-empty `error.code`/`error.key`
