# `GET /orgs/:orgId/branches/:branchId/task-notifications`

Lists task notifications for the authenticated user (paginated).

---

## TASKS-NOTIF-001

- **TC_ID:** TASKS-NOTIF-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.notifications.spec.js`  
- **Scenario:** Authorized user lists branch task notifications  
- **Expected:** HTTP **2xx**; JSON success envelope with `data` array  
- **Checks:**
  - `GET orgs/{orgId}/branches/{branchId}/task-notifications?page=1&limit=20`
  - `expectSuccessStatus`, `expectJsonSuccessBody`, `Array.isArray(body.data)`
