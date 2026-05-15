# `Subtasks endpoints`

Subtask operations under task scope:
- `POST /orgs/:orgId/branches/:branchId/tasks/:taskId/subtasks`
- `PATCH /orgs/:orgId/branches/:branchId/tasks/:taskId/reparent`
- `PATCH /orgs/:orgId/branches/:branchId/tasks/:taskId/move-under-parent`
- `GET /orgs/:orgId/branches/:branchId/tasks/:taskId/subtasks/tree`

---

## TASKS-SUBTASK-001

- **TC_ID:** TASKS-SUBTASK-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.subtasks.spec.js`  
- **Scenario:** Create subtask under valid parent task  
- **Expected:** HTTP **200/201**; success envelope with subtask id  
- **Checks:** required fields + parent timeline-compliant schedule

---

## TASKS-SUBTASK-002

- **TC_ID:** TASKS-SUBTASK-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.subtasks.spec.js`  
- **Scenario:** Reparent subtask to top-level (`newParentTaskId: null`)  
- **Expected:** HTTP **2xx**; success envelope  
- **Checks:** reparent operation succeeds without policy/timeline errors

---

## TASKS-SUBTASK-003

- **TC_ID:** TASKS-SUBTASK-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.subtasks.spec.js`  
- **Scenario:** Reparent subtask back under parent task  
- **Expected:** HTTP **2xx**; success envelope  
- **Checks:** valid `newParentTaskId` accepted

---

## TASKS-SUBTASK-004

- **TC_ID:** TASKS-SUBTASK-004  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.subtasks.spec.js`  
- **Scenario:** Move-under-parent reorder within same parent scope  
- **Expected:** HTTP **2xx**; success envelope  
- **Checks:** `toStatusId` + `toOrderedTaskIds` contract accepted

---

## TASKS-SUBTASK-005

- **TC_ID:** TASKS-SUBTASK-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.subtasks.negative.spec.js`  
- **Scenario:** Missing JWT on create subtask  
- **Expected:** HTTP **401**; auth error envelope  
- **Checks:** `expectHttpStatus` 401 + error contract

---

## TASKS-SUBTASK-006

- **TC_ID:** TASKS-SUBTASK-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.subtasks.negative.spec.js`  
- **Scenario:** Subtask timeline outside parent timeline  
- **Expected:** HTTP **422/400**; validation/business-rule error  
- **Checks:** parent window enforcement

---

## TASKS-SUBTASK-007

- **TC_ID:** TASKS-SUBTASK-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.subtasks.negative.spec.js`  
- **Scenario:** Invalid parent task id on create subtask  
- **Expected:** HTTP **404/400**; error envelope  
- **Checks:** unknown parent path handling

---

## TASKS-SUBTASK-008

- **TC_ID:** TASKS-SUBTASK-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.subtasks.negative.spec.js`  
- **Scenario:** Reparent with unknown task id  
- **Expected:** HTTP **404/400**; error envelope  
- **Checks:** unknown task id handling for `/reparent`

---

## TASKS-SUBTASK-009

- **TC_ID:** TASKS-SUBTASK-009  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.subtasks.negative.spec.js`  
- **Scenario:** Move-under-parent invalid ordered ids payload  
- **Expected:** HTTP **422/400**; validation error  
- **Checks:** invalid `toOrderedTaskIds` rejected

---

## TASKS-SUBTASK-010

- **TC_ID:** TASKS-SUBTASK-010  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.subtasks-tree.spec.js`  
- **Scenario:** Get subtask tree returns nested subtask payload  
- **Expected:** HTTP **2xx**; valid JSON tree structure  
- **Checks:** response contains tree-like payload (`array` or nested object structure)
