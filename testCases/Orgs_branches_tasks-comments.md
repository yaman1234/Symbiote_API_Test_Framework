# `GET /orgs/:orgId/branches/:branchId/tasks/:taskId/comments`

Lists paginated, threaded comments for a task.

---

## TASKS-COMMENTS-001

- **TC_ID:** TASKS-COMMENTS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.comments.spec.js`  
- **Scenario:** Authorized user lists comments for a task taken from the board  
- **Expected:** HTTP **2xx**; JSON success envelope with `data` array  
- **Checks:**
  - Resolve `taskId` from `GET .../tasks/board`
  - `GET .../tasks/{taskId}/comments?page=1&limit=20`
  - `expectSuccessStatus`, `expectJsonSuccessBody`, `Array.isArray(body.data)`

---

## TASKS-COMMENTS-002

- **TC_ID:** TASKS-COMMENTS-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.comments.spec.js`  
- **Scenario:** Create task comment with valid content  
- **Expected:** HTTP **2xx**; comment created successfully  
- **Checks:** `POST .../comments` with `content`, success envelope assertion

---

## TASKS-COMMENTS-003

- **TC_ID:** TASKS-COMMENTS-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.comments.spec.js`  
- **Scenario:** Reply to an existing comment  
- **Expected:** HTTP **2xx**; nested reply created  
- **Checks:** `POST .../comments/{parentId}/replies` with content

---

## TASKS-COMMENTS-004

- **TC_ID:** TASKS-COMMENTS-004  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.comments.spec.js`  
- **Scenario:** Update comment content  
- **Expected:** HTTP **2xx**; comment update succeeds  
- **Checks:** `PATCH .../comments/{commentId}` with updated content

---

## TASKS-COMMENTS-005

- **TC_ID:** TASKS-COMMENTS-005  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.comments.spec.js`  
- **Scenario:** Delete comment (soft delete flow)  
- **Expected:** HTTP **2xx**; delete operation succeeds  
- **Checks:** `DELETE .../comments/{commentId}` success contract

---

## TASKS-COMMENTS-006

- **TC_ID:** TASKS-COMMENTS-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.comments.negative.spec.js`  
- **Scenario:** Missing JWT on comments list  
- **Expected:** HTTP **401** auth error envelope  
- **Checks:** unauthorized list request returns 401

---

## TASKS-COMMENTS-007

- **TC_ID:** TASKS-COMMENTS-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.comments.negative.spec.js`  
- **Scenario:** Create comment with missing content  
- **Expected:** HTTP **422/400** validation error  
- **Checks:** invalid payload rejected with JSON error contract

---

## TASKS-COMMENTS-008

- **TC_ID:** TASKS-COMMENTS-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.comments.negative.spec.js`  
- **Scenario:** Reply to unknown parent comment id  
- **Expected:** HTTP **404/400** error envelope  
- **Checks:** unknown parent path handling

---

## TASKS-COMMENTS-009

- **TC_ID:** TASKS-COMMENTS-009  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.comments.negative.spec.js`  
- **Scenario:** Update unknown comment id  
- **Expected:** HTTP **404/400** error envelope  
- **Checks:** unknown comment path handling
