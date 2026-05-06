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
