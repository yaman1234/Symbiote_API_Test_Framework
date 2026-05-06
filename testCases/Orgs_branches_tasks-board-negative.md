# `GET /orgs/:orgId/branches/:branchId/tasks/board`

Kanban board endpoint; rejects unauthenticated access.

---

## TASKS-BOARD-001

- **TC_ID:** TASKS-BOARD-001  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.board.negative.spec.js`  
- **Scenario:** Unauthorized board request returns 401  
- **Expected:** HTTP **401**; JSON error envelope  
- **Checks:**
  - `GET orgs/{orgId}/branches/{branchId}/tasks/board` without `Authorization`
  - `expectHttpStatus` 401
  - `expectJsonContentType`
  - `expectJsonErrorBody` with `statusCode=401`, message contains `Authentication`, non-empty `error.code` and `error.key`

---

## TASKS-BOARD-002

- **TC_ID:** TASKS-BOARD-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.boardview.spec.js`  
- **Scenario:** Board view request with all supported query parameters returns successfully  
- **Expected:** HTTP **2xx**; JSON success envelope with board columns  
- **Checks:**
  - Use discovered valid IDs from initial board fetch (`assigneeId`, `priorityId`) and title snippet for `q`
  - `GET orgs/{orgId}/branches/{branchId}/tasks/board` with `q`, `assigneeId`, `priorityId`, `includeSubtasks`
  - `expectSuccessStatus`, `expectJsonContentType`, `expectJsonSuccessBody` with non-empty `data.columns`
