# Seeded QA demo accounts

Reference only. **Do not commit real secrets.** Use `LOGIN_EMAIL` / `LOGIN_PASSWORD` in local `.env` (see `.env.example`).

All seeded demo accounts use the same password: **`Password@1`**

| Plan / group | Email                 | Platform role | Org role   | Expected auth context                                      |
|--------------|----------------------|---------------|------------|------------------------------------------------------------|
| Platform     | admin@platform.com   | ADMIN         | N/A        | Platform admin; no seeded org context in this seed section |
| Tier 1       | t1.owner@demo.com    | USER          | OWNER      | Org-level token; `branchId` null                           |
| Tier 1       | t1.emp1@demo.com     | USER          | MEMBER     | Default/single branch membership required                  |
| Tier 1       | t1.emp2@demo.com     | USER          | MEMBER     | Default/single branch membership required                  |
| Tier 2       | t2.owner@demo.com    | USER          | OWNER      | Org-level token; `branchId` null                           |
| Tier 2       | t2.supervisor@demo.com | USER        | MEMBER     | Branch-scoped token in single/default branch               |
| Tier 2       | t2.emp1@demo.com     | USER          | MEMBER     | Branch-scoped token in single/default branch               |
| Tier 2       | t2.emp2@demo.com     | USER          | MEMBER     | Branch-scoped token in single/default branch               |
| Tier 3       | t3.owner@demo.com    | USER          | OWNER      | Org-level token; `branchId` null                           |
| Tier 3       | t3.supervisor@demo.com | USER        | MEMBER     | Branch-scoped token in branch-1                            |
| Tier 3       | t3.emp1@demo.com     | USER          | MEMBER     | Branch-scoped token in branch-1                            |
| Tier 3       | t3.emp2@demo.com     | USER          | MEMBER     | Branch-scoped token in branch-2                            |

When adding specs that depend on org/branch shape, pick the row that matches the token context you need.
