# `GET /orgs/:orgId/task-settings/statuses`

Returns organization task statuses (ordered).

---

## TASKS-SETTINGS-001

- **TC_ID:** TASKS-SETTINGS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner lists org task statuses  
- **Expected:** HTTP **2xx**; JSON success envelope with `data` array of statuses  
- **Checks:**
  - JWT owner persona
  - `GET orgs/{orgId}/task-settings/statuses`
  - `expectSuccessStatus`, `expectJsonSuccessBody`, `Array.isArray(body.data)`; first row has `id` and `name` strings when non-empty
