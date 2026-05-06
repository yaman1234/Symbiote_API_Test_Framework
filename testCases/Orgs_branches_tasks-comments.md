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
