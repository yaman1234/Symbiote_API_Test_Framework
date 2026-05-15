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

---

## TASKS-NOTIF-002

- **TC_ID:** TASKS-NOTIF-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.notifications.spec.js`  
- **Scenario:** Mark single notification as read  
- **Expected:** HTTP **2xx**; success envelope  
- **Checks:** `POST .../task-notifications/{id}/read` with valid auth

---

## TASKS-NOTIF-003

- **TC_ID:** TASKS-NOTIF-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.notifications.spec.js`  
- **Scenario:** Mark all notifications as read  
- **Expected:** HTTP **2xx**; success envelope  
- **Checks:** `POST .../task-notifications/read-all` with valid auth

---

## TASKS-NOTIF-004

- **TC_ID:** TASKS-NOTIF-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.notifications.negative.spec.js`  
- **Scenario:** Missing JWT on list notifications request  
- **Expected:** HTTP **401** auth error envelope  
- **Checks:** unauthorized `GET .../task-notifications`

---

## TASKS-NOTIF-005

- **TC_ID:** TASKS-NOTIF-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.notifications.negative.spec.js`  
- **Scenario:** Missing JWT on mark-as-read request  
- **Expected:** HTTP **401** auth error envelope  
- **Checks:** unauthorized `POST .../task-notifications/{id}/read`

---

## TASKS-NOTIF-006

- **TC_ID:** TASKS-NOTIF-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.notifications.negative.spec.js`  
- **Scenario:** Unknown notification id on mark read  
- **Expected:** HTTP **404/400** error envelope  
- **Checks:** invalid id handling for mark-read endpoint
