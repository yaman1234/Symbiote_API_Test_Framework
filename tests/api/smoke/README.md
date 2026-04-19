# Smoke specs — API inventory

Smoke specs in this folder. **`PATCH /orgs/:orgId/users/:orgUserId`** is covered by **`users.update.flow.spec.js`** (create → GET → PATCH → GET).

| API (path) | Spec (this folder) |
|------------|-------------------|
| `PATCH /orgs/{orgId}/users/{orgUserId}` | `users.update.flow.spec.js` |
| `GET /orgs/{orgId}/users/{orgUserId}` | `users.get.spec.js` |
| `GET /orgs/{orgId}/users` | `users.list.spec.js` |
| `GET /orgs/{orgId}/users/options` | `users.options.spec.js` |
| `POST /orgs/{orgId}/users` | `users.create.spec.js` |

See root [`README.md`](../../README.md) for auth and the full inventory.
