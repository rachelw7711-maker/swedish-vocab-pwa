// Postgres returns rows in no fixed order without ORDER BY, so paging with .range() alone can skip
// or repeat rows between pages (knowledge v2, R10, 2026-11-09): every paged read orders by the key.
const KEYS = { resource_field_status: ["learning_object_id", "field"] };
export const ordered = (query, table) => (KEYS[table] || ["id"]).reduce((q, k) => q.order(k), query);
