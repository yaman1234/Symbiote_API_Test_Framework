# `PATCH /orgs/:orgId/branches/:branchId/tasks/:taskId/move`

Moves a top-level task between board columns and persists resulting order arrays.

---

## TASKS-MOVE-001

- **TC_ID:** TASKS-MOVE-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.move.spec.js`  
- **Scenario:** Same-column reorder succeeds with valid ordered IDs  
- **Expected:** HTTP **2xx**; task moved/reordered and success envelope returned  
- **Checks:** `toOrderedTaskIds` includes moved task, `expectJsonSuccessBody` with moved contract

---

## TASKS-MOVE-002

- **TC_ID:** TASKS-MOVE-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.move.spec.js`  
- **Scenario:** Cross-column move succeeds with source and destination arrays  
- **Expected:** HTTP **2xx**; status changes and ordering persists  
- **Checks:** includes `fromOrderedTaskIds` and `toOrderedTaskIds` with moved task

---

## TASKS-MOVE-003

- **TC_ID:** TASKS-MOVE-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Missing JWT on move request  
- **Expected:** HTTP **401**; JSON auth error envelope  
- **Checks:** `expectHttpStatus` 401 and error contract assertion

---

## TASKS-MOVE-004

- **TC_ID:** TASKS-MOVE-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Unknown task id on move request  
- **Expected:** HTTP **404** or **400**; JSON error envelope  
- **Checks:** status in expected range with non-empty `error.code`

---

## TASKS-MOVE-005

- **TC_ID:** TASKS-MOVE-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** `toOrderedTaskIds` does not include moved task ID  
- **Expected:** HTTP **422** or **400** validation error  
- **Checks:** payload rule enforced with JSON error envelope

---

## TASKS-MOVE-006

- **TC_ID:** TASKS-MOVE-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Cross-column move without `fromOrderedTaskIds`  
- **Expected:** HTTP **422** or **400** validation error  
- **Checks:** source ordering requirement enforced

---

## TASKS-MOVE-007

- **TC_ID:** TASKS-MOVE-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Invalid `toStatusId` UUID format  
- **Expected:** HTTP **422** or **400** validation error  
- **Checks:** invalid status identifier rejected

---

## TASKS-MOVE-008

- **TC_ID:** TASKS-MOVE-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Invalid ordered IDs payload (bad/duplicate IDs)  
- **Expected:** HTTP **422** or **400** validation error  
- **Checks:** invalid order array values rejected

---

## TASKS-MOVE-009

- **TC_ID:** TASKS-MOVE-009  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Cross-branch move attempt by supervisor is denied  
- **Expected:** HTTP **403** or **404**; JSON authz/scope error  
- **Checks:** wrong branch move blocked with error envelope

---

## TASKS-MOVE-010

- **TC_ID:** TASKS-MOVE-010  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.move.negative.spec.js`  
- **Scenario:** Move endpoint called with subtask ID (top-level only rule)  
- **Expected:** HTTP **422** or **400** business-rule error  
- **Checks:** subtask rejected by `/move` route

---

## TASKS-MOVE-011

- **TC_ID:** TASKS-MOVE-011  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.move.spec.js`  
- **Scenario:** Move response contract returns expected IDs and arrays  
- **Expected:** HTTP **2xx** with expected response data fields  
- **Checks:** `taskId`, `toStatusId`, `toOrderedIds`, `fromOrderedIds` present and coherent

---

## TASKS-MOVE-012

- **TC_ID:** TASKS-MOVE-012  
- **Suite:** Regression  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.move.spec.js`  
- **Scenario:** Repeated move operations do not create duplicate ordering  
- **Expected:** HTTP **2xx** across repeated operations with stable order integrity  
- **Checks:** final column order has unique IDs and valid state after forward/backward move
