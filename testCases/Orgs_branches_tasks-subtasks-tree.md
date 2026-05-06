# `GET /orgs/:orgId/branches/:branchId/tasks/:taskId/subtasks/tree`

Returns nested subtasks for a parent task.

---

## TASKS-SUBTREE-001

- **TC_ID:** TASKS-SUBTREE-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.subtasks-tree.spec.js`  
- **Scenario:** Authorized user loads subtask tree for a board task  
- **Expected:** HTTP **2xx**; response is JSON array (envelope `data` or raw array)  
- **Checks:**
  - `GET .../tasks/{taskId}/subtasks/tree`
  - `expectSuccessStatus`, `expectJsonContentType`
  - Parsed tree is `Array.isArray` from `body` or `body.data`
